<?php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../../auth/check_auth.php';
require_once __DIR__ . '/../logger.php';

//-- ป้องกัน CSRF สำหรับ Request ที่ไม่ใช่ GET --
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    if (
        !isset($_SERVER['HTTP_X_CSRF_TOKEN']) ||
        !isset($_SESSION['csrf_token']) ||
        !hash_equals($_SESSION['csrf_token'], $_SERVER['HTTP_X_CSRF_TOKEN'])
    ) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'CSRF token validation failed. Request rejected.']);
        exit;
    }
}

$action = $_REQUEST['action'] ?? 'get_parts';
$input = json_decode(file_get_contents("php://input"), true);
if (empty($input) && !empty($_POST)) {
    $input = $_POST;
}

function findBomComponents($pdo, $part_no, $line, $model) {
    $bomSql = "SELECT component_part_no, quantity_required FROM PRODUCT_BOM WHERE fg_part_no = ? AND line = ? AND model = ?";
    $bomStmt = $pdo->prepare($bomSql);
    $bomStmt->execute([$part_no, $line, $model]);
    return $bomStmt->fetchAll(PDO::FETCH_ASSOC);
}

try {
    $currentUser = $_SESSION['user']; // สมมติว่า 'username' อยู่ใน $_SESSION['user']['username']

    switch ($action) {
        case 'get_parts':
            $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
            $limit = isset($_GET['limit']) ? max(1, intval($_GET['limit'])) : 50;
            $startRow = ($page - 1) * $limit;
            $endRow = $startRow + $limit;
            $conditions = [];
            $params = [];
            if ($currentUser['role'] === 'supervisor') {
                $conditions[] = "line = ?";
                $params[] = $currentUser['line'];
            }
            $all_possible_filters = ['startDate', 'endDate', 'line', 'model', 'part_no', 'count_type', 'lot_no'];
            $allowed_string_filters = ['line', 'model', 'part_no', 'count_type', 'lot_no'];
            foreach ($all_possible_filters as $filter) {
                if (!empty($_GET[$filter])) {
                    $value = $_GET[$filter];
                    if ($filter === 'startDate') {
                        $conditions[] = "log_date >= ?";
                        $params[] = $value;
                    } elseif ($filter === 'endDate') {
                        $conditions[] = "log_date <= ?";
                        $params[] = $value;
                    } elseif (in_array($filter, $allowed_string_filters)) {
                        $conditions[] = "LOWER({$filter}) = LOWER(?)";
                        $params[] = $value;
                    }
                }
            }
            $whereClause = $conditions ? "WHERE " . implode(" AND ", $conditions) : "";
            $totalSql = "SELECT COUNT(*) AS total FROM PARTS $whereClause";
            $totalStmt = $pdo->prepare($totalSql);
            $totalStmt->execute($params);
            $total = (int)$totalStmt->fetch()['total'];
            
            // เพิ่ม start_time เข้ามาใน SELECT statement
            $dataSql = "
                WITH NumberedRows AS (
                    SELECT 
                        id, log_date, start_time, log_time, line, model, part_no, lot_no, count_value, count_type, note, source_transaction_id,
                        ROW_NUMBER() OVER (ORDER BY log_date DESC, log_time DESC, id DESC) AS RowNum
                    FROM PARTS
                    $whereClause
                )
                SELECT id, log_date, start_time, log_time, line, model, part_no, lot_no, count_value, count_type, note, source_transaction_id
                FROM NumberedRows
                WHERE RowNum > ? AND RowNum <= ?
            ";
            $paginationParams = array_merge($params, [$startRow, $endRow]);
            $dataStmt = $pdo->prepare($dataSql);
            $dataStmt->execute($paginationParams);
            $data = $dataStmt->fetchAll();

            $summarySql = "
                SELECT model, part_no, line,
                    SUM(CASE WHEN count_type = 'FG' THEN count_value ELSE 0 END) AS FG,
                    SUM(CASE WHEN count_type = 'NG' THEN count_value ELSE 0 END) AS NG,
                    SUM(CASE WHEN count_type = 'HOLD' THEN count_value ELSE 0 END) AS HOLD,
                    SUM(CASE WHEN count_type = 'REWORK' THEN count_value ELSE 0 END) AS REWORK,
                    SUM(CASE WHEN count_type = 'SCRAP' THEN count_value ELSE 0 END) AS SCRAP,
                    SUM(CASE WHEN count_type = 'ETC.' THEN count_value ELSE 0 END) AS ETC
                FROM PARTS $whereClause 
                GROUP BY model, part_no, line
                ORDER BY model, part_no, line";
            $summaryStmt = $pdo->prepare($summarySql);
            $summaryStmt->execute($params);
            $summary = $summaryStmt->fetchAll();
            $grandSql = "
                SELECT
                    SUM(CASE WHEN count_type = 'FG' THEN count_value ELSE 0 END) AS FG,
                    SUM(CASE WHEN count_type = 'NG' THEN count_value ELSE 0 END) AS NG,
                    SUM(CASE WHEN count_type = 'HOLD' THEN count_value ELSE 0 END) AS HOLD,
                    SUM(CASE WHEN count_type = 'REWORK' THEN count_value ELSE 0 END) AS REWORK,
                    SUM(CASE WHEN count_type = 'SCRAP' THEN count_value ELSE 0 END) AS SCRAP,
                    SUM(CASE WHEN count_type = 'ETC.' THEN count_value ELSE 0 END) AS ETC
                FROM PARTS $whereClause";
            $grandStmt = $pdo->prepare($grandSql);
            $grandStmt->execute($params);
            $grandTotal = $grandStmt->fetch();
            echo json_encode([
                'success' => true, 'page' => $page, 'limit' => $limit, 'total' => $total,
                'data' => $data, 'summary' => $summary, 'grand_total' => $grandTotal
            ]);
            break;

        case 'add_part':
            $pdo->beginTransaction();
            try {
                $required_fields = ['log_date', 'start_time', 'end_time', 'part_no', 'model', 'line', 'count_type', 'count_value', 'lot_no'];
                foreach ($required_fields as $field) {
                    if (empty($input[$field])) throw new Exception("Missing field: " . $field);
                }

                $line = strtoupper(trim($input['line']));
                enforceLinePermission($line);
                $model = strtoupper(trim($input['model']));
                $part_no = strtoupper(trim($input['part_no']));
                $count_type = strtoupper(trim($input['count_type']));
                $log_date = $input['log_date'];
                $start_time = $input['start_time'];
                $end_time = $input['end_time'];
                $fg_qty = (int)$input['count_value'];
                $note_input = isset($input['note']) ? trim($input['note']) : '';
                $base_lot_no = strtoupper(trim($input['lot_no']));

                $fg_lot_no = '';
                if ($count_type === 'FG') {
                    $datePrefix = date('dmy', strtotime($log_date));
                    
                    // ===== ส่วนที่แก้ไข: เพิ่ม Wildcard '%' ใน Query =====
                    $lotCountQuery = "SELECT COUNT(*) FROM PARTS WHERE lot_no LIKE ? AND log_date = ? AND count_type = 'FG'";
                    $countStmt = $pdo->prepare($lotCountQuery);
                    $countStmt->execute([$base_lot_no . '-%', $log_date]); // แก้ไขที่นี่
                    $count = $countStmt->fetchColumn() + 1;
                    
                    $fg_lot_no = $base_lot_no . '-' . $datePrefix . '-' . str_pad($count, 3, '0', STR_PAD_LEFT);
                } else {
                    $fg_lot_no = $base_lot_no;
                }

                $transaction_id = null;
                $components = [];

                if ($count_type === 'FG' && $fg_qty > 0) {
                    $components = findBomComponents($pdo, $part_no, $line, $model);
                    if (!empty($components)) {
                        $transaction_id = uniqid('tran_');
                    }
                }
                
                $insertSql = "INSERT INTO PARTS (log_date, start_time, log_time, model, line, part_no, lot_no, count_type, count_value, note, source_transaction_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
                $pdo->prepare($insertSql)->execute([
                    $log_date, $start_time, $end_time, $model, $line, $part_no, $fg_lot_no,
                    $count_type, $fg_qty, $note_input, $transaction_id
                ]);
                
                if (!empty($components)) {
                    $consumeSql = "INSERT INTO PARTS (log_date, start_time, log_time, model, line, part_no, lot_no, count_type, count_value, note, source_transaction_id) VALUES (?, ?, ?, ?, ?, ?, ?, 'BOM-ISSUE', ?, ?, ?)";
                    $consumeStmt = $pdo->prepare($consumeSql);
                    foreach ($components as $comp) {
                        $qty_to_consume = $fg_qty * (float)$comp['quantity_required'];
                        $note_for_comp = "Auto-issued for FG Lot: " . $fg_lot_no; 

                        // ===== ส่วนที่แก้ไข: เรียงลำดับพารามิเตอร์ให้ถูกต้อง =====
                        $consumeStmt->execute([
                            $log_date, $start_time, $end_time, $model, $line, 
                            $comp['component_part_no'], 
                            $base_lot_no, // lot_no ของ component
                            $qty_to_consume, // count_value
                            $note_for_comp, // note
                            $transaction_id // source_transaction_id
                        ]);
                    }
                }

                $pdo->commit();
                
                $detail = "Model: {$model}, Part No: {$part_no}, Lot No: {$fg_lot_no}, Qty: {$fg_qty}, Type: {$count_type}";
                logAction($pdo, $currentUser['username'], 'ADD_PART', $line, $detail);

                echo json_encode(['success' => true, 'message' => 'Part recorded successfully.', 'lot_no' => $fg_lot_no]);

            } catch (Exception $e) {
                if ($pdo->inTransaction()) $pdo->rollBack();
                throw $e;
            }
            break;

        case 'update_part':
            $id = $input['id'] ?? 0;
            if (!$id) throw new Exception("Missing ID");
            $pdo->beginTransaction();
            try {
                $findSql = "SELECT * FROM PARTS WHERE id = ?";
                $findStmt = $pdo->prepare($findSql);
                $findStmt->execute([$id]);
                $originalPart = $findStmt->fetch();
                if (!$originalPart) throw new Exception("Part not found.");
                
                enforceLinePermission($originalPart['line']);
                if (strtoupper(trim($input['line'])) !== $originalPart['line']) {
                    enforceLinePermission(strtoupper(trim($input['line'])));
                }

                $required_fields = ['log_date', 'start_time', 'end_time', 'part_no', 'model', 'line', 'count_type', 'count_value'];
                foreach ($required_fields as $field) {
                    if (!isset($input[$field])) throw new Exception("Missing required field: " . $field);
                }
                
                $sql = "UPDATE PARTS SET log_date=?, start_time=?, log_time=?, line=?, model=?, part_no=?, count_value=?, count_type=?, note=? WHERE id = ?";
                $pdo->prepare($sql)->execute([
                    $input['log_date'], $input['start_time'], $input['end_time'], strtoupper(trim($input['line'])), 
                    strtoupper(trim($input['model'])), strtoupper(trim($input['part_no'])),
                    (int)$input['count_value'], strtoupper(trim($input['count_type'])),
                    $input['note'], $id
                ]);

                $detail = "Updated Part ID: {$id}, Model: {$input['model']}, Part No: {$input['part_no']}, Qty: {$input['count_value']}";
                logAction($pdo, $currentUser['username'], 'UPDATE_PART', $input['line'], $detail);
                
                $pdo->commit();
                echo json_encode(['success' => true, 'message' => 'Part updated successfully.']);

            } catch (Exception $e) {
                if ($pdo->inTransaction()) $pdo->rollBack();
                throw $e;
            }
            break;

        case 'delete_part':
            $id = $input['id'] ?? 0;
            if (!$id) throw new Exception("Missing ID");
            $pdo->beginTransaction();
            try {
                // ดึงข้อมูล Part ที่จะลบเพื่อใช้ในการบันทึก Log
                $findSql = "SELECT * FROM PARTS WHERE id = ?";
                $findStmt = $pdo->prepare($findSql);
                $findStmt->execute([$id]);
                $part = $findStmt->fetch();

                if (!$part) throw new Exception("Part not found.");
                
                enforceLinePermission($part['line']);
                $transaction_id = $part['source_transaction_id'];

                // ===== สร้าง Detail สำหรับ Log ก่อนที่จะลบข้อมูล =====
                $detail = "Deleted Part ID: {$id} | Model: {$part['model']}, Part No: {$part['part_no']}, Lot No: {$part['lot_no']}, Qty: {$part['count_value']}, Type: {$part['count_type']}";

                if ($transaction_id) {
                    $deleteSql = "DELETE FROM PARTS WHERE source_transaction_id = ?";
                    $deleteStmt = $pdo->prepare($deleteSql);
                    $deleteStmt->execute([$transaction_id]);
                    
                    logAction($pdo, $currentUser['username'], 'DELETE_PART_GROUP', $part['line'], $detail . " | Tran. ID: {$transaction_id}");
                    echo json_encode(['success' => true, 'message' => 'FG and related components deleted successfully.']);

                } else {
                    $deleteSql = "DELETE FROM PARTS WHERE id = ?";
                    $deleteStmt = $pdo->prepare($deleteSql);
                    $deleteStmt->execute([$id]);
                    
                    logAction($pdo, $currentUser['username'], 'DELETE_PART', $part['line'], $detail);
                    echo json_encode(['success' => true, 'message' => 'Part deleted successfully.']);
                }
                $pdo->commit();
            } catch (Exception $e) {
                if ($pdo->inTransaction()) $pdo->rollBack();
                throw $e;
            }
            break;
        
        // ... เคสอื่นๆ ไม่มีการแก้ไข ...
        case 'get_lines':
            $stmt = $pdo->query("SELECT DISTINCT line FROM PARAMETER WHERE line IS NOT NULL AND line != '' ORDER BY line");
            $lines = $stmt->fetchAll(PDO::FETCH_COLUMN);
            echo json_encode(['success' => true, 'data' => $lines]);
            break;
        case 'get_lot_numbers':
            $stmt = $pdo->query("SELECT DISTINCT lot_no FROM PARTS WHERE lot_no IS NOT NULL AND lot_no != '' ORDER BY lot_no");
            $lots = $stmt->fetchAll(PDO::FETCH_COLUMN);
            echo json_encode(['success' => true, 'data' => $lots]);
            break;
        case 'get_models':
            $stmt = $pdo->query("SELECT DISTINCT model FROM PARAMETER WHERE model IS NOT NULL AND model != '' ORDER BY model");
            $data = $stmt->fetchAll(PDO::FETCH_COLUMN);
            echo json_encode(['success' => true, 'data' => $data]);
            break;
        case 'get_part_nos':
            $stmt = $pdo->query("SELECT DISTINCT part_no FROM PARAMETER WHERE part_no IS NOT NULL AND part_no != '' ORDER BY part_no");
            $data = $stmt->fetchAll(PDO::FETCH_COLUMN);
            echo json_encode(['success' => true, 'data' => $data]);
            break;
        case 'get_part_by_id':
            $id = $_GET['id'] ?? null;
            if (!$id || !filter_var($id, FILTER_VALIDATE_INT)) {
                http_response_code(400);
                throw new Exception('Invalid or missing ID');
            }
            $sql = "SELECT * FROM PARTS WHERE id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([(int)$id]);
            $part = $stmt->fetch();
            if (!$part) {
                http_response_code(404);
                throw new Exception('Part not found');
            }
            if (!empty($part['log_date'])) {
                $part['log_date'] = (new DateTime($part['log_date']))->format('Y-m-d');
            }
            if (!empty($part['log_time'])) {
                $part['log_time'] = (new DateTime($part['log_time']))->format('H:i:s');
            }
            echo json_encode(['success' => true, 'data' => $part]);
            break;
        case 'search_lots':
            $term = $_GET['term'] ?? '';
            if (strlen($term) < 3) {
                echo json_encode(['success' => true, 'data' => []]);
                exit;
            }
            $sql = "SELECT DISTINCT TOP (20) lot_no FROM PARTS WHERE lot_no LIKE ? ORDER BY lot_no DESC";
            $stmt = $pdo->prepare($sql);
            $stmt->execute(['%' . $term . '%']);
            $lots = $stmt->fetchAll(PDO::FETCH_COLUMN);
            echo json_encode(['success' => true, 'data' => $lots]);
            break;
        default:
            http_response_code(400);
            throw new Exception("Invalid action specified.");
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    error_log("Error in pdTableManage.php: " . $e->getMessage());
}
?>