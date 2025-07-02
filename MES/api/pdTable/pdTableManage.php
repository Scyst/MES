<?php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../logger.php';
session_start();

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

try {
    $currentUser = $_SESSION['user']['username'] ?? 'system';

    switch ($action) {
        case 'get_parts':
            $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
            $limit = isset($_GET['limit']) ? max(1, intval($_GET['limit'])) : 50;
            $startRow = ($page - 1) * $limit;
            $endRow = $startRow + $limit;

            $conditions = [];
            $params = [];
            
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
                    } 
                    elseif (in_array($filter, $allowed_string_filters)) { 
                        $conditions[] = "LOWER({$filter}) = LOWER(?)";
                        $params[] = $value;
                    }
                }
            }
            
            $whereClause = $conditions ? "WHERE " . implode(" AND ", $conditions) : "";

            $totalSql = "SELECT COUNT(*) AS total FROM IOT_TOOLBOX_PARTS $whereClause";
            $totalStmt = $pdo->prepare($totalSql);
            $totalStmt->execute($params);
            $total = (int)$totalStmt->fetch()['total'];

            $dataSql = "
                WITH NumberedRows AS (
                    SELECT 
                        id, log_date, log_time, line, model, part_no, lot_no, count_value, count_type, note,
                        ROW_NUMBER() OVER (ORDER BY log_date DESC, log_time DESC, id DESC) AS RowNum
                    FROM IOT_TOOLBOX_PARTS
                    $whereClause
                )
                SELECT id, log_date, log_time, line, model, part_no, lot_no, count_value, count_type, note
                FROM NumberedRows
                WHERE RowNum > ? AND RowNum <= ?
            ";
            
            $paginationParams = array_merge($params, [$startRow, $endRow]);
            $dataStmt = $pdo->prepare($dataSql);
            $dataStmt->execute($paginationParams);
            $data = $dataStmt->fetchAll();

            $summarySql = "
                SELECT model, part_no, lot_no,
                    SUM(CASE WHEN count_type = 'FG' THEN count_value ELSE 0 END) AS FG,
                    SUM(CASE WHEN count_type = 'NG' THEN count_value ELSE 0 END) AS NG,
                    SUM(CASE WHEN count_type = 'HOLD' THEN count_value ELSE 0 END) AS HOLD,
                    SUM(CASE WHEN count_type = 'REWORK' THEN count_value ELSE 0 END) AS REWORK,
                    SUM(CASE WHEN count_type = 'SCRAP' THEN count_value ELSE 0 END) AS SCRAP,
                    SUM(CASE WHEN count_type = 'ETC.' THEN count_value ELSE 0 END) AS ETC
                FROM IOT_TOOLBOX_PARTS $whereClause 
                GROUP BY model, part_no, lot_no 
                ORDER BY model, part_no, lot_no";
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
                FROM IOT_TOOLBOX_PARTS $whereClause";
            $grandStmt = $pdo->prepare($grandSql);
            $grandStmt->execute($params);
            $grandTotal = $grandStmt->fetch();

            echo json_encode([
                'success'     => true, 'page' => $page, 'limit' => $limit, 'total' => $total,
                'data' => $data, 'summary' => $summary, 'grand_total' => $grandTotal
            ]);
            break;

        case 'add_part':
            $required_fields = ['log_date', 'log_time', 'part_no', 'model', 'line', 'count_type', 'count_value'];
            foreach ($required_fields as $field) {
                if (empty($input[$field])) {
                    throw new Exception("Missing required field: " . $field);
                }
            }
            
            $valid_types = ['FG', 'NG', 'HOLD', 'REWORK', 'SCRAP', 'ETC.'];
            $count_type = strtoupper(trim($input['count_type']));
            if (!in_array($count_type, $valid_types)) {
                throw new Exception("Invalid count type");
            }

            $line = strtoupper(trim($input['line']));
            $model = strtoupper(trim($input['model']));
            $part_no = strtoupper(trim($input['part_no']));
            $log_date = $input['log_date'];
            $lot_no = $input['lot_no'] ?? '';
            
            if (empty($lot_no)) {
                $sapQuery = "SELECT sap_no FROM IOT_TOOLBOX_PARAMETER WHERE line = ? AND model = ? AND part_no = ?";
                $sapStmt = $pdo->prepare($sapQuery);
                $sapStmt->execute([$line, $model, $part_no]);
                $sapRow = $sapStmt->fetch();

                if (!$sapRow || empty($sapRow['sap_no'])) {
                    throw new Exception("SAP No. not found for the given line/model/part combination.");
                }
                $sap_no = $sapRow['sap_no'];
                $datePrefix = date('Ymd', strtotime($log_date));

                $lotCountQuery = "SELECT COUNT(*) AS lot_count FROM IOT_TOOLBOX_PARTS WHERE part_no = ? AND log_date = ? AND lot_no LIKE ?";
                $likePattern = $sap_no . '-' . $datePrefix . '%';
                $countStmt = $pdo->prepare($lotCountQuery);
                $countStmt->execute([$part_no, $log_date, $likePattern]);
                $countRow = $countStmt->fetch();
                
                $count = ($countRow['lot_count'] ?? 0) + 1;
                $lot_no = $sap_no . '-' . $datePrefix . '-' . str_pad($count, 3, '0', STR_PAD_LEFT);
            }

            $insertSql = "INSERT INTO IOT_TOOLBOX_PARTS (log_date, log_time, model, line, part_no, lot_no, count_type, count_value, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
            $insertStmt = $pdo->prepare($insertSql);
            $success = $insertStmt->execute([
                $log_date, $input['log_time'], $model, $line, $part_no, $lot_no,
                $count_type, (int)$input['count_value'],
                isset($input['note']) ? strtoupper(trim($input['note'])) : null
            ]);

            if ($success) {
                $detail = "{$line}-{$model}-{$part_no}, Qty: {$input['count_value']}, Type: {$count_type}";
                logAction($pdo, $currentUser, 'ADD PART', $lot_no, $detail);
            }

            echo json_encode(['success' => true, 'message' => 'Part inserted successfully.', 'lot_no' => $lot_no]);
            break;

        case 'delete_part':
            $id = $input['id'] ?? null;
            if (!$id || !filter_var($id, FILTER_VALIDATE_INT)) {
                http_response_code(400);
                throw new Exception('Invalid or missing Part ID.');
            }

            $sql = "DELETE FROM IOT_TOOLBOX_PARTS WHERE id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$id]);

            if ($stmt->rowCount() > 0) {
                logAction($pdo, $currentUser, 'DELETE PART', $id);
                echo json_encode(['success' => true, 'message' => 'Part deleted successfully.']);
            } else {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Part not found or already deleted.']);
            }
            break;

        case 'update_part':
            $required_fields = ['id', 'log_date', 'log_time', 'line', 'model', 'part_no', 'count_value', 'count_type'];
            foreach ($required_fields as $field) {
                if (!isset($input[$field])) {
                    throw new Exception('Missing required field: ' . $field);
                }
            }
        
            $id = $input['id'];
            $log_date = $input['log_date'];
        
            if (!filter_var($id, FILTER_VALIDATE_INT)) {
                throw new Exception('Invalid ID format.');
            }
            if (!preg_match("/^\d{4}-\d{2}-\d{2}$/", $log_date)) {
                throw new Exception('Invalid log_date format. Expected YYYY-MM-DD.');
            }
        
            $sql = "UPDATE IOT_TOOLBOX_PARTS SET log_date = ?, log_time = ?, line = ?, model = ?, part_no = ?, lot_no = ?, count_value = ?, count_type = ?, note = ? WHERE id = ?";
            $params = [
                $input['log_date'], $input['log_time'],
                strtoupper(trim($input['line'])), strtoupper(trim($input['model'])),
                strtoupper(trim($input['part_no'])), $input['lot_no'],
                (int)$input['count_value'], strtoupper(trim($input['count_type'])),
                $input['note'], $input['id']
            ];
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
        
            if ($stmt->rowCount() > 0) {
                $detail = "Part No: {$params[4]}, Lot No: {$params[5]}";
                logAction($pdo, $currentUser, 'UPDATE PART', $input['id'], $detail);
                echo json_encode(['success' => true, 'message' => 'Part updated successfully.']);
            } else {
                echo json_encode(['success' => true, 'message' => 'No changes made or part not found.']);
            }
            break;

        case 'get_lines':
            $stmt = $pdo->query("SELECT DISTINCT line FROM IOT_TOOLBOX_PARAMETER WHERE line IS NOT NULL AND line != '' ORDER BY line");
            $lines = $stmt->fetchAll(PDO::FETCH_COLUMN);
            echo json_encode(['success' => true, 'data' => $lines]);
            break;

        case 'get_lot_numbers':
            $stmt = $pdo->query("SELECT DISTINCT lot_no FROM IOT_TOOLBOX_PARTS WHERE lot_no IS NOT NULL AND lot_no != '' ORDER BY lot_no");
            $lots = $stmt->fetchAll(PDO::FETCH_COLUMN);
            echo json_encode(['success' => true, 'data' => $lots]);
            break;

        case 'get_models':
            $stmt = $pdo->query("SELECT DISTINCT model FROM IOT_TOOLBOX_PARAMETER WHERE model IS NOT NULL AND model != '' ORDER BY model");
            $data = $stmt->fetchAll(PDO::FETCH_COLUMN);
            echo json_encode(['success' => true, 'data' => $data]);
            break;

        case 'get_part_nos':
            $stmt = $pdo->query("SELECT DISTINCT part_no FROM IOT_TOOLBOX_PARAMETER WHERE part_no IS NOT NULL AND part_no != '' ORDER BY part_no");
            $data = $stmt->fetchAll(PDO::FETCH_COLUMN);
            echo json_encode(['success' => true, 'data' => $data]);
            break;

        case 'get_part_by_id':
            $id = $_GET['id'] ?? null;
            if (!$id || !filter_var($id, FILTER_VALIDATE_INT)) {
                http_response_code(400);
                throw new Exception('Invalid or missing ID');
            }
            
            $sql = "SELECT * FROM IOT_TOOLBOX_PARTS WHERE id = ?";
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