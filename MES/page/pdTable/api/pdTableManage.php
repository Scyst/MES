<?php
// api/pdTable/pdTableManage.php

require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../../auth/check_auth.php';
require_once __DIR__ . '/../../logger.php';
require_once __DIR__ . '/../../helpers/inventory_helper.php';

// ส่วนของ CSRF Token Check (เหมือนเดิม)
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

// ไม่มีการประกาศ $is_development หรือชื่อตารางที่นี่อีกต่อไป

$action = $_REQUEST['action'] ?? '';
$input = json_decode(file_get_contents("php://input"), true);
if (empty($input) && !empty($_POST)) {
    $input = $_POST;
}
$currentUser = $_SESSION['user'];

// ฟังก์ชัน findBomComponents ที่อัปเดตแล้ว
function findBomComponents($pdo, $part_no, $line, $model) {
    $bomSql = "SELECT component_part_no, quantity_required FROM " . LEGACY_BOM_TABLE . " WHERE fg_part_no = ? AND line = ? AND model = ?";
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
            
            $totalSql = "SELECT COUNT(*) AS total FROM " . PARTS_TABLE . " p $whereClause";
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
                    FROM " . PARTS_TABLE . " p
                    LEFT JOIN " . USERS_TABLE . " u ON p.operator_id = u.id
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
                FROM " . PARTS_TABLE . " p $whereClause 
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
                FROM " . PARTS_TABLE . " p $whereClause";
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
                    $lotCountQuery = "SELECT COUNT(*) FROM " . PARTS_TABLE . " WHERE lot_no LIKE ? AND log_date = ? AND count_type = 'FG'";
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
                
                $insertSql = "INSERT INTO " . PARTS_TABLE . " (log_date, start_time, log_time, model, line, part_no, lot_no, count_type, count_value, note, source_transaction_id, operator_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
                $pdo->prepare($insertSql)->execute([
                    $log_date, $start_time, $end_time, $model, $line, $part_no, $fg_lot_no,
                    $count_type, $fg_qty, $note_input, $transaction_id,
                    $operator_id
                ]);

                if ($count_type === 'FG' && $fg_qty > 0) {
                    $itemId = getItemId($pdo, $part_no, $line, $model);
                    $locationId = getLocationId($pdo, $line);
                    updateOnhandBalance($pdo, $itemId, $locationId, $fg_qty);
                }
                
                if (!empty($components)) {
                    $consumeSql = "INSERT INTO " . PARTS_TABLE . " (log_date, start_time, log_time, model, line, part_no, lot_no, count_type, count_value, note, source_transaction_id, operator_id) VALUES (?, ?, ?, ?, ?, ?, ?, 'BOM-ISSUE', ?, ?, ?, ?)";
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
                        $componentId = getItemId($pdo, $comp['component_part_no'], $line, $model);
                        $locationId = getLocationId($pdo, $line);
                        $quantityChange = - (float)$qty_to_consume;
                        updateOnhandBalance($pdo, $componentId, $locationId, $quantityChange);
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
            
            enforceRecordPermission($pdo, PARTS_TABLE, $id, 'id', 'operator_id');
            
            $pdo->beginTransaction();
            try {
                $findSql = "SELECT * FROM " . PARTS_TABLE . " WHERE id = ?";
                $findStmt = $pdo->prepare($findSql);
                $findStmt->execute([$id]);
                $originalPart = $findStmt->fetch(PDO::FETCH_ASSOC);
                if (!$originalPart) throw new Exception("Part not found.");
                
                if (strtoupper(trim($input['line'])) !== $originalPart['line']) {
                    enforceLinePermission(strtoupper(trim($input['line'])));
                }

                $sql = "UPDATE " . PARTS_TABLE . " SET log_date=?, start_time=?, log_time=?, line=?, model=?, part_no=?, count_value=?, count_type=?, note=? WHERE id = ?";
                $pdo->prepare($sql)->execute([
                    $input['log_date'], $input['start_time'], $input['end_time'], strtoupper(trim($input['line'])), 
                    strtoupper(trim($input['model'])), strtoupper(trim($input['part_no'])),
                    (int)$input['count_value'], strtoupper(trim($input['count_type'])),
                    $input['note'], 
                    $id
                ]);

                if ($originalPart['count_type'] === 'FG' || $originalPart['count_type'] === 'BOM-ISSUE') {
                    $oldQuantityChange = ($originalPart['count_type'] === 'FG') ? -(float)$originalPart['count_value'] : (float)$originalPart['count_value'];
                    $oldItemId = getItemId($pdo, $originalPart['part_no'], $originalPart['line'], $originalPart['model']);
                    $oldLocationId = getLocationId($pdo, $originalPart['line']);
                    updateOnhandBalance($pdo, $oldItemId, $oldLocationId, $oldQuantityChange);

                    $newQuantityChange = ($input['count_type'] === 'FG') ? (float)$input['count_value'] : -(float)$input['count_value'];
                    if ($input['count_type'] === 'FG' || $input['count_type'] === 'BOM-ISSUE') {
                        $newItemId = getItemId($pdo, $input['part_no'], $input['line'], $input['model']);
                        $newLocationId = getLocationId($pdo, $input['line']);
                        updateOnhandBalance($pdo, $newItemId, $newLocationId, $newQuantityChange);
                    }
                }

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

            enforceRecordPermission($pdo, PARTS_TABLE, $id, 'id', 'operator_id');

            $pdo->beginTransaction();
            try {
                $findSql = "SELECT * FROM " . PARTS_TABLE . " WHERE id = ?";
                $findStmt = $pdo->prepare($findSql);
                $findStmt->execute([$id]);
                $partToDelete = $findStmt->fetch(PDO::FETCH_ASSOC);

                if (!$partToDelete) {
                    throw new Exception("Part not found.");
                }

                $recordsToRevert = [$partToDelete];
                if ($partToDelete['source_transaction_id']) {
                    $bomStmt = $pdo->prepare("SELECT * FROM " . PARTS_TABLE . " WHERE source_transaction_id = ? AND count_type = 'BOM-ISSUE'");
                    $bomStmt->execute([$partToDelete['source_transaction_id']]);
                    $bomRecords = $bomStmt->fetchAll(PDO::FETCH_ASSOC);
                    $recordsToRevert = array_merge($recordsToRevert, $bomRecords);
                }

                $transaction_id = $partToDelete['source_transaction_id'];
                if ($transaction_id) {
                    $deleteSql = "DELETE FROM " . PARTS_TABLE . " WHERE source_transaction_id = ?";
                    $pdo->prepare($deleteSql)->execute([$transaction_id]);
                } else {
                    $deleteSql = "DELETE FROM " . PARTS_TABLE . " WHERE id = ?";
                    $pdo->prepare($deleteSql)->execute([$id]);
                }

                foreach ($recordsToRevert as $record) {
                    $quantityChange = 0;
                    if ($record['count_type'] === 'FG') {
                        $quantityChange = - (float)$record['count_value'];
                    } 
                    else if ($record['count_type'] === 'BOM-ISSUE') {
                        $quantityChange = (float)$record['count_value'];
                    }

                    if ($quantityChange != 0) {
                        $itemId = getItemId($pdo, $record['part_no'], $record['line'], $record['model']);
                        $locationId = getLocationId($pdo, $record['line']);
                        updateOnhandBalance($pdo, $itemId, $locationId, $quantityChange);
                    }
                }

                $detail = "Deleted Part ID: {$id} | Model: {$partToDelete['model']}, Part No: {$partToDelete['part_no']}";
                logAction($pdo, $currentUser['username'], 'DELETE_PART', $partToDelete['line'], $detail);
                
                $pdo->commit();
                echo json_encode(['success' => true, 'message' => 'Part and related components deleted successfully.']);

            } catch (Exception $e) {
                if ($pdo->inTransaction()) $pdo->rollBack();
                throw $e;
            }
            break;
        
        case 'get_lines':
            $stmt = $pdo->query("SELECT DISTINCT line FROM " . LEGACY_PARAMETER_TABLE . " WHERE line IS NOT NULL AND line != '' ORDER BY line");
            $lines = $stmt->fetchAll(PDO::FETCH_COLUMN);
            echo json_encode(['success' => true, 'data' => $lines]);
            break;

        case 'get_lot_numbers':
            $stmt = $pdo->query("SELECT DISTINCT lot_no FROM " . PARTS_TABLE . " WHERE lot_no IS NOT NULL AND lot_no != '' ORDER BY lot_no");
            $lots = $stmt->fetchAll(PDO::FETCH_COLUMN);
            echo json_encode(['success' => true, 'data' => $lots]);
            break;

        case 'get_models':
            $stmt = $pdo->query("SELECT DISTINCT model FROM " . LEGACY_PARAMETER_TABLE . " WHERE model IS NOT NULL AND model != '' ORDER BY model");
            $data = $stmt->fetchAll(PDO::FETCH_COLUMN);
            echo json_encode(['success' => true, 'data' => $data]);
            break;

        case 'get_part_nos':
            $stmt = $pdo->query("SELECT DISTINCT part_no FROM " . LEGACY_PARAMETER_TABLE . " WHERE part_no IS NOT NULL AND part_no != '' ORDER BY part_no");
            $data = $stmt->fetchAll(PDO::FETCH_COLUMN);
            echo json_encode(['success' => true, 'data' => $data]);
            break;

        case 'get_part_by_id':
            $id = $_GET['id'] ?? null;
            if (!$id || !filter_var($id, FILTER_VALIDATE_INT)) {
                http_response_code(400);
                throw new Exception('Invalid or missing ID');
            }
            $sql = "SELECT * FROM " . PARTS_TABLE . " WHERE id = ?";
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
            $sql = "SELECT DISTINCT TOP (20) lot_no FROM " . PARTS_TABLE . " WHERE lot_no LIKE ? ORDER BY lot_no DESC";
            $stmt = $pdo->prepare($sql);
            $stmt->execute(['%' . $term . '%']);
            $lots = $stmt->fetchAll(PDO::FETCH_COLUMN);
            echo json_encode(['success' => true, 'data' => $lots]);
            break;

        case 'get_datalist_options':
            $lineSql = "SELECT DISTINCT line FROM " . LEGACY_PARAMETER_TABLE . " WHERE line IS NOT NULL AND line != '' ORDER BY line";
            $modelSql = "SELECT DISTINCT model FROM " . LEGACY_PARAMETER_TABLE . " WHERE model IS NOT NULL AND model != '' ORDER BY model";
            $partNoSql = "SELECT DISTINCT part_no FROM " . LEGACY_PARAMETER_TABLE . " WHERE part_no IS NOT NULL AND part_no != '' ORDER BY part_no";

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
            $sql = "SELECT DISTINCT model FROM " . LEGACY_PARAMETER_TABLE . " WHERE line = ? ORDER BY model";
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
            $sql = "SELECT DISTINCT part_no FROM " . LEGACY_PARAMETER_TABLE . " WHERE model = ?";
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
            
            $sql = "SELECT COUNT(*) FROM " . LEGACY_PARAMETER_TABLE . " WHERE line = ? AND model = ? AND part_no = ?";
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
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>