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
        http_response_code(403); // Forbidden
        echo json_encode(['success' => false, 'message' => 'CSRF token validation failed. Request rejected.']);
        exit;
    }
}

$action = $_REQUEST['action'] ?? 'get_stop';

$input = json_decode(file_get_contents("php://input"), true);
if (empty($input) && !empty($_POST)) {
    $input = $_POST;
}

try {
    $currentUser = $_SESSION['user']['username'] ?? 'system'; 

    switch ($action) {
       case 'get_stop':
            $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
            $limit = isset($_GET['limit']) ? max(1, intval($_GET['limit'])) : 50;
            $startRow = ($page - 1) * $limit;
            $endRow = $startRow + $limit;

            $conditions = [];
            $params = [];
            $filters = ['startDate', 'endDate', 'line', 'machine', 'cause'];
            $allowedFilters = ['line', 'machine', 'cause'];

            foreach ($filters as $filter) {
                if (!empty($_GET[$filter])) {
                    $value = $_GET[$filter];
                    if ($filter === 'startDate') {
                        $conditions[] = "log_date >= ?";
                    } elseif ($filter === 'endDate') {
                        $conditions[] = "log_date <= ?";
                    } elseif (in_array($filter, $allowedFilters)) {
                        $conditions[] = "LOWER({$filter}) = LOWER(?)";
                    }
                    $params[] = $value;
                }
            }
            $whereClause = $conditions ? "WHERE " . implode(" AND ", $conditions) : "";

            $totalSql = "SELECT COUNT(*) AS total FROM IOT_TOOLBOX_STOP_CAUSES $whereClause";
            $totalStmt = $pdo->prepare($totalSql);
            $totalStmt->execute($params);
            $total = (int)$totalStmt->fetch()['total'];
            
            $dataSql = "
                WITH NumberedRows AS (
                    SELECT 
                        id, log_date, stop_begin, stop_end, line, machine, cause, recovered_by, note, duration,
                        ROW_NUMBER() OVER (ORDER BY log_date DESC, stop_begin DESC, id DESC) AS RowNum
                    FROM IOT_TOOLBOX_STOP_CAUSES
                    $whereClause
                )
                SELECT id, log_date, stop_begin, stop_end, line, machine, cause, recovered_by, note, duration
                FROM NumberedRows
                WHERE RowNum > ? AND RowNum <= ?
            ";
            
            $paginationParams = array_merge($params, [$startRow, $endRow]);
            $dataStmt = $pdo->prepare($dataSql);
            $dataStmt->execute($paginationParams);
            $data = $dataStmt->fetchAll(PDO::FETCH_ASSOC);
  
            foreach ($data as &$row) {
                if ($row['log_date']) $row['log_date'] = (new DateTime($row['log_date']))->format('Y-m-d');
                if ($row['stop_begin']) $row['stop_begin'] = (new DateTime($row['stop_begin']))->format('H:i:s');
                if ($row['stop_end']) $row['stop_end'] = (new DateTime($row['stop_end']))->format('H:i:s');
            }

            $summarySql = "SELECT line, COUNT(*) AS count, SUM(duration) AS total_minutes
                           FROM IOT_TOOLBOX_STOP_CAUSES $whereClause
                           GROUP BY line ORDER BY total_minutes DESC";
            $summaryStmt = $pdo->prepare($summarySql);
            $summaryStmt->execute($params);
            $summary = $summaryStmt->fetchAll(PDO::FETCH_ASSOC);

            $totalMinutes = array_sum(array_column($summary, 'total_minutes'));

            echo json_encode([
                'success' => true, 'page' => $page, 'limit' => $limit, 'total' => $total,
                'data' => $data, 'summary' => $summary, 'grand_total_minutes' => $totalMinutes
            ]);
            break;

        case 'add_stop':
            $required_fields = ['log_date', 'stop_begin', 'stop_end', 'line', 'machine', 'cause', 'recovered_by'];
            foreach ($required_fields as $field) {
                if (empty($input[$field])) {
                    throw new Exception("Missing required field: " . $field);
                }
            }
            
            $stop_begin_dt = new DateTime($input['log_date'] . ' ' . $input['stop_begin']);
            $stop_end_dt = new DateTime($input['log_date'] . ' ' . $input['stop_end']);

            if ($stop_end_dt < $stop_begin_dt) {
                $stop_end_dt->modify('+1 day');
            }

             $sql = "INSERT INTO IOT_TOOLBOX_STOP_CAUSES (log_date, stop_begin, stop_end, line, machine, cause, recovered_by, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
            
            $params = [
                $input['log_date'],
                $stop_begin_dt->format('Y-m-d H:i:s'),
                $stop_end_dt->format('Y-m-d H:i:s'),
                $input['line'],
                $input['machine'],
                $input['cause'],
                $input['recovered_by'],
                $input['note'] ?? null
            ];

            $stmt = $pdo->prepare($sql);
            $success = $stmt->execute($params);

            if ($success) {
                $lastId = $pdo->lastInsertId();
                $detail = "Line: {$input['line']}, Cause: {$input['cause']}";
                logAction($pdo, $currentUser, 'ADD STOP_CAUSE', $lastId, $detail);
            }

            echo json_encode(['success' => true, 'message' => 'Stop cause added successfully.']);
            break;
        
         case 'update_stop':
            $required_fields = ['id', 'log_date', 'stop_begin', 'stop_end', 'line', 'machine', 'cause', 'recovered_by'];
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

            $stop_begin_dt = new DateTime($log_date . ' ' . $input['stop_begin']);
            $stop_end_dt = new DateTime($log_date . ' ' . $input['stop_end']);

            if ($stop_end_dt < $stop_begin_dt) {
                $stop_end_dt->modify('+1 day');
            }
        
            $sql = "UPDATE IOT_TOOLBOX_STOP_CAUSES SET log_date = ?, stop_begin = ?, stop_end = ?, line = ?, machine = ?, cause = ?, recovered_by = ?, note = ? WHERE id = ?";
            
            $params = [
                $log_date,
                $stop_begin_dt->format('Y-m-d H:i:s'),
                $stop_end_dt->format('Y-m-d H:i:s'),
                $input['line'],
                $input['machine'],
                $input['cause'],
                $input['recovered_by'],
                $input['note'] ?? null,
                $id
            ];
        
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
        
            if ($stmt->rowCount() > 0) {
                $detail = "Line: {$input['line']}, Cause: {$input['cause']}";
                logAction($pdo, $currentUser, 'UPDATE STOP_CAUSE', $input['id'], $detail);
                echo json_encode(['success' => true, 'message' => 'Stop Cause updated successfully.']);
            } else {
                echo json_encode(['success' => true, 'message' => 'No changes made or data not found.']);
            }
            break;

        case 'delete_stop':
            $id = $_GET['id'] ?? null;
            if (!$id || !filter_var($id, FILTER_VALIDATE_INT)) {
                http_response_code(400);
                throw new Exception('Invalid or missing Stop Cause ID.');
            }

            $sql = "DELETE FROM IOT_TOOLBOX_STOP_CAUSES WHERE id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$id]);

            if ($stmt->rowCount() > 0) {
                logAction($pdo, $currentUser, 'DELETE STOP_CAUSE', $id);
                echo json_encode(['success' => true, 'message' => 'Stop Cause data deleted successfully.']);
            } else {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Data not found or already deleted.']);
            }
            break;

        case 'get_stop_by_id':
            $id = $_GET['id'] ?? null;
            if (!$id || !filter_var($id, FILTER_VALIDATE_INT)) {
                http_response_code(400);
                throw new Exception('Invalid or missing ID');
            }
            
            $sql = "SELECT * FROM IOT_TOOLBOX_STOP_CAUSES WHERE id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([(int)$id]);
            $stop_data = $stmt->fetch();
            
            if (!$stop_data) {
                http_response_code(404);
                throw new Exception('Stop Cause data not found');
            }
            
            if (!empty($stop_data['log_date'])) {
                $stop_data['log_date'] = (new DateTime($stop_data['log_date']))->format('Y-m-d');
            }
            if (!empty($stop_data['stop_begin'])) {
                $stop_data['stop_begin'] = (new DateTime($stop_data['stop_begin']))->format('H:i:s');
            }
            if (!empty($stop_data['stop_end'])) {
                $stop_data['stop_end'] = (new DateTime($stop_data['stop_end']))->format('H:i:s');
            }

            echo json_encode(['success' => true, 'data' => $stop_data]);
            break;

        case 'get_causes':
        case 'get_lines':
        case 'get_machines':
        case 'get_recovered_by':
            $columns = [
                'get_causes' => 'cause', 'get_lines' => 'line',
                'get_machines' => 'machine', 'get_recovered_by' => 'recovered_by'
            ];
            $column = $columns[$action];
            $table = ($action === 'get_lines') ? 'IOT_TOOLBOX_PARAMETER' : 'IOT_TOOLBOX_STOP_CAUSES';

            $stmt = $pdo->query("SELECT DISTINCT {$column} FROM {$table} WHERE {$column} IS NOT NULL AND {$column} != '' ORDER BY {$column}");
            $data = $stmt->fetchAll(PDO::FETCH_COLUMN);
            echo json_encode(['success' => true, 'data' => $data]);
            break;
        
        default:
            http_response_code(400);
            throw new Exception('Invalid action specified for Stop Cause.');
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    error_log("Error in stopCauseManage.php: " . $e->getMessage());
}
?>