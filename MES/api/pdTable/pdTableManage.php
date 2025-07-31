<?php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../../auth/check_auth.php';
require_once __DIR__ . '/../logger.php';

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

// =================================================================
// DEVELOPMENT SWITCH
$is_development = true; // <-- ตั้งค่าที่นี่: true เพื่อใช้ตาราง Test, false เพื่อใช้ตารางจริง
$parts_table = $is_development ? 'PARTS_TEST' : 'PARTS';
$param_table = $is_development ? 'PARAMETER_TEST' : 'PARAMETER';
$bom_table = $is_development ? 'PRODUCT_BOM_TEST' : 'PRODUCT_BOM';
$users_table = $is_development ? 'USERS_TEST' : 'USERS'; // ** NEW **
// =================================================================


$action = $_REQUEST['action'] ?? 'get_parts';
$input = json_decode(file_get_contents("php://input"), true);
if (empty($input) && !empty($_POST)) {
    $input = $_POST;
}

function findBomComponents($pdo, $part_no, $line, $model) {
    global $bom_table;
    $bomSql = "SELECT component_part_no, quantity_required FROM {$bom_table} WHERE fg_part_no = ? AND line = ? AND model = ?";
    $bomStmt = $pdo->prepare($bomSql);
    $bomStmt->execute([$part_no, $line, $model]);
    return $bomStmt->fetchAll(PDO::FETCH_ASSOC);
}

try {
    $currentUser = $_SESSION['user'];

    switch ($action) {
        case 'get_parts':
            $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
            $limit = isset($_GET['limit']) ? max(1, intval($_GET['limit'])) : 50;
            $startRow = ($page - 1) * $limit;
            $endRow = $startRow + $limit;
            
            $conditions = [];
            $params = [];
            
            if ($currentUser['role'] === 'supervisor') {
                $conditions[] = "p.line = ?";
                $params[] = $currentUser['line'];
            }
            
            $all_possible_filters = ['startDate', 'endDate', 'line', 'model', 'part_no', 'count_type', 'lot_no'];
            $allowed_string_filters = ['line', 'model', 'part_no', 'count_type', 'lot_no'];
            
            foreach ($all_possible_filters as $filter) {
                if (!empty($_GET[$filter])) {
                    $value = $_GET[$filter];
                    if ($filter === 'startDate') {
                        $conditions[] = "p.log_date >= ?";
                        $params[] = $value;
                    } elseif ($filter === 'endDate') {
                        $conditions[] = "p.log_date <= ?";
                        $params[] = $value;
                    } elseif (in_array($filter, $allowed_string_filters)) {
                        $conditions[] = "LOWER(p.{$filter}) = LOWER(?)";
                        $params[] = $value;
                    }
                }
            }
            
            $whereClause = $conditions ? "WHERE " . implode(" AND ", $conditions) : "";
            
            $totalSql = "SELECT COUNT(*) AS total FROM {$parts_table} p $whereClause";
            $totalStmt = $pdo->prepare($totalSql);
            $totalStmt->execute($params);
            $total = (int)$totalStmt->fetch()['total'];

            $dataSql = "
                WITH NumberedRows AS (
                    SELECT 
                        p.id, p.log_date, p.start_time, p.log_time, p.line, p.model, p.part_no, p.lot_no, 
                        p.count_value, p.count_type, p.note, p.source_transaction_id,
                        u.username as operator_name,
                        ROW_NUMBER() OVER (ORDER BY p.log_date DESC, p.log_time DESC, p.id DESC) AS RowNum
                    FROM {$parts_table} p
                    LEFT JOIN {$users_table} u ON p.operator_id = u.id
                    $whereClause
                )
                SELECT id, log_date, start_time, log_time, line, model, part_no, lot_no, count_value, count_type, note, source_transaction_id, operator_name
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
                FROM {$parts_table} p $whereClause 
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
                FROM {$parts_table} p $whereClause";
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

                $operator_id = $currentUser['id'] ?? null;

                $fg_lot_no = '';
                if ($count_type === 'FG') {
                    $lotCountQuery = "SELECT COUNT(*) FROM {$parts_table} WHERE lot_no LIKE ? AND log_date = ? AND count_type = 'FG'";
                    $countStmt = $pdo->prepare($lotCountQuery);
                    $countStmt->execute([$base_lot_no . '-%', $log_date]);
                    $count = $countStmt->fetchColumn() + 1;
                    $fg_lot_no = $base_lot_no . '-' . date('dmy', strtotime($log_date)) . '-' . str_pad($count, 3, '0', STR_PAD_LEFT);
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
                
                $insertSql = "INSERT INTO {$parts_table} (log_date, start_time, log_time, model, line, part_no, lot_no, count_type, count_value, note, source_transaction_id, operator_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
                $pdo->prepare($insertSql)->execute([
                    $log_date, $start_time, $end_time, $model, $line, $part_no, $fg_lot_no,
                    $count_type, $fg_qty, $note_input, $transaction_id,
                    $operator_id
                ]);
                
                if (!empty($components)) {
                    $consumeSql = "INSERT INTO {$parts_table} (log_date, start_time, log_time, model, line, part_no, lot_no, count_type, count_value, note, source_transaction_id, operator_id) VALUES (?, ?, ?, ?, ?, ?, ?, 'BOM-ISSUE', ?, ?, ?, ?)";
                    $consumeStmt = $pdo->prepare($consumeSql);
                    foreach ($components as $comp) {
                        $qty_to_consume = $fg_qty * (float)$comp['quantity_required'];
                        $note_for_comp = "Auto-issued for FG Lot: " . $fg_lot_no; 
                        $consumeStmt->execute([
                            $log_date, $start_time, $end_time, $model, $line, 
                            $comp['component_part_no'], 
                            $base_lot_no,
                            $qty_to_consume,
                            $note_for_comp,
                            $transaction_id,
                            $operator_id
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
            
            enforceRecordPermission($pdo, $parts_table, $id, 'id', 'operator_id');
            
            $pdo->beginTransaction();
            try {
                $findSql = "SELECT * FROM {$parts_table} WHERE id = ?";
                $findStmt = $pdo->prepare($findSql);
                $findStmt->execute([$id]);
                $originalPart = $findStmt->fetch();
                if (!$originalPart) throw new Exception("Part not found.");
                
                if (strtoupper(trim($input['line'])) !== $originalPart['line']) {
                    enforceLinePermission(strtoupper(trim($input['line'])));
                }

                $required_fields = ['log_date', 'start_time', 'end_time', 'part_no', 'model', 'line', 'count_type', 'count_value'];
                foreach ($required_fields as $field) {
                    if (!isset($input[$field])) throw new Exception("Missing required field: " . $field);
                }
                
                $sql = "UPDATE {$parts_table} SET log_date=?, start_time=?, log_time=?, line=?, model=?, part_no=?, count_value=?, count_type=?, note=? WHERE id = ?";
                $pdo->prepare($sql)->execute([
                    $input['log_date'], $input['start_time'], $input['end_time'], strtoupper(trim($input['line'])), 
                    strtoupper(trim($input['model'])), strtoupper(trim($input['part_no'])),
                    (int)$input['count_value'], strtoupper(trim($input['count_type'])),
                    $input['note'], 
                    $id
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

            enforceRecordPermission($pdo, $parts_table, $id, 'id', 'operator_id');

            $pdo->beginTransaction();
            try {
                $findSql = "SELECT * FROM {$parts_table} WHERE id = ?";
                $findStmt = $pdo->prepare($findSql);
                $findStmt->execute([$id]);
                $part = $findStmt->fetch();

                if (!$part) throw new Exception("Part not found.");
                
                $transaction_id = $part['source_transaction_id'];
                $detail = "Deleted Part ID: {$id} | Model: {$part['model']}, Part No: {$part['part_no']}, Lot No: {$part['lot_no']}, Qty: {$part['count_value']}, Type: {$part['count_type']}";

                if ($transaction_id) {
                    $deleteSql = "DELETE FROM {$parts_table} WHERE source_transaction_id = ?";
                    $pdo->prepare($deleteSql)->execute([$transaction_id]);
                } else {
                    $deleteSql = "DELETE FROM {$parts_table} WHERE id = ?";
                    $pdo->prepare($deleteSql)->execute([$id]);
                }
                
                logAction($pdo, $currentUser['username'], 'DELETE_PART', $part['line'], $detail);
                $pdo->commit();
                echo json_encode(['success' => true, 'message' => 'Part and related components deleted successfully.']);

            } catch (Exception $e) {
                if ($pdo->inTransaction()) $pdo->rollBack();
                throw $e;
            }
            break;
        
        case 'get_lines':
            $stmt = $pdo->query("SELECT DISTINCT line FROM {$param_table} WHERE line IS NOT NULL AND line != '' ORDER BY line");
            $lines = $stmt->fetchAll(PDO::FETCH_COLUMN);
            echo json_encode(['success' => true, 'data' => $lines]);
            break;
        case 'get_lot_numbers':
            $stmt = $pdo->query("SELECT DISTINCT lot_no FROM {$parts_table} WHERE lot_no IS NOT NULL AND lot_no != '' ORDER BY lot_no");
            $lots = $stmt->fetchAll(PDO::FETCH_COLUMN);
            echo json_encode(['success' => true, 'data' => $lots]);
            break;
        case 'get_models':
            $stmt = $pdo->query("SELECT DISTINCT model FROM {$param_table} WHERE model IS NOT NULL AND model != '' ORDER BY model");
            $data = $stmt->fetchAll(PDO::FETCH_COLUMN);
            echo json_encode(['success' => true, 'data' => $data]);
            break;
        case 'get_part_nos':
            $stmt = $pdo->query("SELECT DISTINCT part_no FROM {$param_table} WHERE part_no IS NOT NULL AND part_no != '' ORDER BY part_no");
            $data = $stmt->fetchAll(PDO::FETCH_COLUMN);
            echo json_encode(['success' => true, 'data' => $data]);
            break;
        case 'get_part_by_id':
            $id = $_GET['id'] ?? null;
            if (!$id || !filter_var($id, FILTER_VALIDATE_INT)) {
                http_response_code(400);
                throw new Exception('Invalid or missing ID');
            }
            $sql = "SELECT * FROM {$parts_table} WHERE id = ?";
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
            $sql = "SELECT DISTINCT TOP (20) lot_no FROM {$parts_table} WHERE lot_no LIKE ? ORDER BY lot_no DESC";
            $stmt = $pdo->prepare($sql);
            $stmt->execute(['%' . $term . '%']);
            $lots = $stmt->fetchAll(PDO::FETCH_COLUMN);
            echo json_encode(['success' => true, 'data' => $lots]);
            break;

        case 'get_datalist_options':
            $lineSql = "SELECT DISTINCT line FROM {$param_table} WHERE line IS NOT NULL AND line != '' ORDER BY line";
            $modelSql = "SELECT DISTINCT model FROM {$param_table} WHERE model IS NOT NULL AND model != '' ORDER BY model";
            $partNoSql = "SELECT DISTINCT part_no FROM {$param_table} WHERE part_no IS NOT NULL AND part_no != '' ORDER BY part_no";

            $lines = $pdo->query($lineSql)->fetchAll(PDO::FETCH_COLUMN);
            $models = $pdo->query($modelSql)->fetchAll(PDO::FETCH_COLUMN);
            $partNos = $pdo->query($partNoSql)->fetchAll(PDO::FETCH_COLUMN);

            echo json_encode([
                'success' => true,
                'lines' => $lines,
                'models' => $models,
                'partNos' => $partNos
            ]);
            break;

        case 'get_models_by_line':
            $line = $_GET['line'] ?? '';
            if (empty($line)) {
                echo json_encode(['success' => true, 'data' => []]);
                exit;
            }
            $sql = "SELECT DISTINCT model FROM {$param_table} WHERE line = ? ORDER BY model";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$line]);
            $models = $stmt->fetchAll(PDO::FETCH_COLUMN);
            echo json_encode(['success' => true, 'data' => $models]);
            break;

        case 'get_parts_by_model':
            $line = $_GET['line'] ?? '';
            $model = $_GET['model'] ?? '';
            if (empty($model)) {
                echo json_encode(['success' => true, 'data' => []]);
                exit;
            }
            $sql = "SELECT DISTINCT part_no FROM {$param_table} WHERE model = ?";
            $params = [$model];
            if (!empty($line)) {
                $sql .= " AND line = ?";
                $params[] = $line;
            }
            $sql .= " ORDER BY part_no";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $parts = $stmt->fetchAll(PDO::FETCH_COLUMN);
            echo json_encode(['success' => true, 'data' => $parts]);
            break;

        case 'validate_part_no':
            $line = $_GET['line'] ?? '';
            $model = $_GET['model'] ?? '';
            $part_no = $_GET['part_no'] ?? '';

            if (empty($line) || empty($model) || empty($part_no)) {
                echo json_encode(['success' => true, 'exists' => false, 'message' => 'Incomplete data for validation.']);
                exit;
            }
            
            $sql = "SELECT COUNT(*) FROM {$param_table} WHERE line = ? AND model = ? AND part_no = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$line, $model, $part_no]);
            
            $exists = $stmt->fetchColumn() > 0;
            
            echo json_encode(['success' => true, 'exists' => $exists]);
            break;
        
        default:
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => "Action '{$action}' is not handled in this modified script."]);
            break;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    error_log("Error in pdTableManage.php: " . $e->getMessage());
}
?>