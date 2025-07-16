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
    $currentUser = $_SESSION['user'];

    switch ($action) {
        case 'get_parts':
            // ... ไม่มีการแก้ไข ...
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
            $dataSql = "
                WITH NumberedRows AS (
                    SELECT 
                        id, log_date, log_time, line, model, part_no, lot_no, count_value, count_type, note, source_transaction_id,
                        ROW_NUMBER() OVER (ORDER BY log_date DESC, log_time DESC, id DESC) AS RowNum
                    FROM PARTS
                    $whereClause
                )
                SELECT id, log_date, log_time, line, model, part_no, lot_no, count_value, count_type, note, source_transaction_id
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
                $required_fields = ['log_date', 'log_time', 'part_no', 'model', 'line', 'count_type', 'count_value'];
                foreach ($required_fields as $field) {
                    if (empty($input[$field])) throw new Exception("Missing field: " . $field);
                }

                $line = strtoupper(trim($input['line']));
                enforceLinePermission($line);
                $model = strtoupper(trim($input['model']));
                $part_no = strtoupper(trim($input['part_no']));
                $count_type = strtoupper(trim($input['count_type']));
                $log_date = $input['log_date'];
                $log_time = $input['log_time'];
                $fg_qty = (int)$input['count_value'];
                $note_input = isset($input['note']) ? strtoupper(trim($input['note'])) : null;
                $lot_no = $input['lot_no'] ?? '';
                
                if (empty($lot_no) && $count_type === 'FG') {
                    $sapQuery = "SELECT sap_no FROM PARAMETER WHERE line=? AND model=? AND part_no=?";
                    $sapStmt = $pdo->prepare($sapQuery);
                    $sapStmt->execute([$line, $model, $part_no]);
                    $sap_no = $sapStmt->fetchColumn();
                    if (!$sap_no) throw new Exception("SAP No. not found to generate Lot No.");
                    $datePrefix = date('dmy', strtotime($log_date));
                    $lotCountQuery = "SELECT COUNT(*) FROM PARTS WHERE part_no=? AND log_date=?";
                    $countStmt = $pdo->prepare($lotCountQuery);
                    $countStmt->execute([$part_no, $log_date]);
                    $count = $countStmt->fetchColumn() + 1;
                    $lot_no = $sap_no . '-' . $datePrefix . '-' . str_pad($count, 3, '0', STR_PAD_LEFT);
                }

                $transaction_id = null;
                $components = [];
                if ($count_type === 'FG' && $fg_qty > 0) {
                    $components = findBomComponents($pdo, $part_no, $line, $model);
                    if (!empty($components)) {
                        $transaction_id = uniqid('tran_');
                    }
                }
                
                $insertSql = "INSERT INTO PARTS (log_date, log_time, model, line, part_no, lot_no, count_type, count_value, note, source_transaction_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
                $pdo->prepare($insertSql)->execute([
                    $log_date, $log_time, $model, $line, $part_no, strtoupper(trim($lot_no)),
                    $count_type, $fg_qty, $note_input,
                    $transaction_id
                ]);
                
                if (!empty($components)) {
                    $consumeSql = "INSERT INTO PARTS (log_date, log_time, model, line, part_no, lot_no, count_type, count_value, note, source_transaction_id) VALUES (?, ?, ?, ?, ?, ?, 'BOM-ISSUE', ?, ?, ?)";
                    $consumeStmt = $pdo->prepare($consumeSql);
                    foreach ($components as $comp) {
                        $qty_to_consume = $fg_qty * (float)$comp['quantity_required'];
                        // === การแก้ไข ===
                        // เปลี่ยน Note ให้อ้างอิงจาก Lot No. ของ FG
                        $note_for_comp = "Auto-issued for Lot No.: " . strtoupper(trim($lot_no)); 
                        $consumeStmt->execute([
                            $log_date, $log_time, $model, $line, 
                            $comp['component_part_no'], strtoupper(trim($lot_no)), 
                            $qty_to_consume, $note_for_comp,
                            $transaction_id
                        ]);
                    }
                }

                $pdo->commit();
                logAction($pdo, $currentUser['username'], 'ADD PART', $lot_no, "{$line}-{$model}-{$part_no}");
                echo json_encode(['success' => true, 'message' => 'Part recorded successfully.', 'lot_no' => $lot_no]);

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
                $findSql = "SELECT line, source_transaction_id FROM PARTS WHERE id = ?";
                $findStmt = $pdo->prepare($findSql);
                $findStmt->execute([$id]);
                $originalPart = $findStmt->fetch();
                if (!$originalPart) throw new Exception("Part not found.");
                
                enforceLinePermission($originalPart['line']);
                if (strtoupper(trim($input['line'])) !== $originalPart['line']) {
                    enforceLinePermission(strtoupper(trim($input['line'])));
                }
                $transaction_id = $originalPart['source_transaction_id'];

                if ($transaction_id) {
                    $deleteSql = "DELETE FROM PARTS WHERE source_transaction_id = ?";
                    $pdo->prepare($deleteSql)->execute([$transaction_id]);
                    
                    // Re-add Logic (เหมือน add_part)
                    $required_fields = ['log_date', 'log_time', 'part_no', 'model', 'line', 'count_type', 'count_value'];
                    foreach ($required_fields as $field) {
                        if (empty($input[$field])) throw new Exception("Missing field: " . $field);
                    }
                    $line = strtoupper(trim($input['line']));
                    $model = strtoupper(trim($input['model']));
                    $part_no = strtoupper(trim($input['part_no']));
                    $log_date = $input['log_date'];
                    $count_type = strtoupper(trim($input['count_type']));
                    $fg_qty = (int)$input['count_value'];
                    $lot_no = $input['lot_no'] ?? '';
                    
                    $new_transaction_id = null;
                    $components = [];
                    if ($count_type === 'FG' && $fg_qty > 0) {
                        $components = findBomComponents($pdo, $part_no, $line, $model);
                        if (!empty($components)) {
                            $new_transaction_id = uniqid('tran_');
                        }
                    }
                    
                    $insertSql = "INSERT INTO PARTS (log_date, log_time, model, line, part_no, lot_no, count_type, count_value, note, source_transaction_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
                    $pdo->prepare($insertSql)->execute([
                        $log_date, $input['log_time'], $model, $line, $part_no, strtoupper(trim($lot_no)),
                        $count_type, $fg_qty,
                        isset($input['note']) ? strtoupper(trim($input['note'])) : null,
                        $new_transaction_id
                    ]);
                    
                    if (!empty($components)) {
                        $consumeSql = "INSERT INTO PARTS (log_date, log_time, model, line, part_no, lot_no, count_type, count_value, note, source_transaction_id) VALUES (?, ?, ?, ?, ?, ?, 'BOM-ISSUE', ?, ?, ?)";
                        $consumeStmt = $pdo->prepare($consumeSql);
                        foreach ($components as $comp) {
                            $qty_to_consume = $fg_qty * (float)$comp['quantity_required'];
                            // === การแก้ไข ===
                            // เปลี่ยน Note ให้อ้างอิงจาก Lot No. ของ FG
                            $note_for_comp = "Auto-issued for Lot No.: " . strtoupper(trim($lot_no)); 
                            $consumeStmt->execute([
                                $log_date, $input['log_time'], $model, $line, 
                                $comp['component_part_no'], strtoupper(trim($lot_no)), 
                                $qty_to_consume, $note_for_comp, $new_transaction_id
                            ]);
                        }
                    }
                    logAction($pdo, $currentUser['username'], 'REBUILD PART', $id, "Rebuilt part data.");
                    echo json_encode(['success' => true, 'message' => 'Part and components updated successfully.']);
                
                } else {
                    $sql = "UPDATE PARTS SET log_date=?, log_time=?, line=?, model=?, part_no=?, count_value=?, count_type=?, note=? WHERE id = ?";
                    $pdo->prepare($sql)->execute([
                        $input['log_date'], $input['log_time'], strtoupper(trim($input['line'])), 
                        strtoupper(trim($input['model'])), strtoupper(trim($input['part_no'])),
                        (int)$input['count_value'], strtoupper(trim($input['count_type'])),
                        $input['note'], $id
                    ]);
                    logAction($pdo, $currentUser['username'], 'UPDATE PART', $id);
                    echo json_encode(['success' => true, 'message' => 'Part updated successfully.']);
                }
                $pdo->commit();
            } catch (Exception $e) {
                if ($pdo->inTransaction()) $pdo->rollBack();
                throw $e;
            }
            break;

        case 'delete_part':
            // ... ไม่มีการแก้ไข ...
            $id = $input['id'] ?? 0;
            if (!$id) throw new Exception("Missing ID");
            $pdo->beginTransaction();
            try {
                $findSql = "SELECT line, source_transaction_id FROM PARTS WHERE id = ?";
                $findStmt = $pdo->prepare($findSql);
                $findStmt->execute([$id]);
                $part = $findStmt->fetch();
                if (!$part) throw new Exception("Part not found.");
                
                enforceLinePermission($part['line']);
                $transaction_id = $part['source_transaction_id'];

                if ($transaction_id) {
                    $deleteSql = "DELETE FROM PARTS WHERE source_transaction_id = ?";
                    $deleteStmt = $pdo->prepare($deleteSql);
                    $deleteStmt->execute([$transaction_id]);
                    $rowCount = $deleteStmt->rowCount();
                    logAction($pdo, $currentUser['username'], 'DELETE PART GROUP', $id, "Deleted $rowCount rows with transaction_id: $transaction_id");
                    echo json_encode(['success' => true, 'message' => 'FG and related components deleted successfully.']);
                } else {
                    $deleteSql = "DELETE FROM PARTS WHERE id = ?";
                    $deleteStmt = $pdo->prepare($deleteSql);
                    $deleteStmt->execute([$id]);
                    logAction($pdo, $currentUser['username'], 'DELETE PART', $id);
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