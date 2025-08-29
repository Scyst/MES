<?php
require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../../auth/check_auth.php';
require_once __DIR__ . '/../../logger.php';

// session_start() is already called in check_auth.php

//-- CSRF Protection for non-GET requests --
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    if (!isset($_SERVER['HTTP_X_CSRF_TOKEN']) || !isset($_SESSION['csrf_token']) || !hash_equals($_SESSION['csrf_token'], $_SERVER['HTTP_X_CSRF_TOKEN'])) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'CSRF token validation failed. Request rejected.']);
        exit;
    }
}

$action = $_REQUEST['action'] ?? '';
$input = json_decode(file_get_contents("php://input"), true);
if (empty($input) && !empty($_POST)) {
    $input = $_POST;
}

try {
    $currentUser = $_SESSION['user'];

    switch ($action) {
        case 'get_stops':
            $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
            $limit = isset($_GET['limit']) ? max(1, intval($_GET['limit'])) : 50;
            $startRow = ($page - 1) * $limit;
            $conditions = [];
            $params = [];
            if ($currentUser['role'] === 'supervisor') {
                $conditions[] = "line = ?";
                $params[] = $currentUser['line'];
            }
            if (!empty($_GET['cause'])) { $conditions[] = "LOWER(cause) LIKE LOWER(?)"; $params[] = '%' . $_GET['cause'] . '%'; }
            if (!empty($_GET['line'])) { $conditions[] = "LOWER(line) = LOWER(?)"; $params[] = $_GET['line']; }
            if (!empty($_GET['machine'])) { $conditions[] = "LOWER(machine) = LOWER(?)"; $params[] = $_GET['machine']; }
            if (!empty($_GET['startDate'])) { $conditions[] = "log_date >= ?"; $params[] = $_GET['startDate']; }
            if (!empty($_GET['endDate'])) { $conditions[] = "log_date <= ?"; $params[] = $_GET['endDate']; }
            $whereClause = $conditions ? "WHERE " . implode(" AND ", $conditions) : "";
            
            // *** แก้ไข: เปลี่ยนมาใช้ค่าคงที่ STOP_CAUSES_TABLE ***
            $totalSql = "SELECT COUNT(*) AS total FROM " . STOP_CAUSES_TABLE . " $whereClause";
            $totalStmt = $pdo->prepare($totalSql);
            $totalStmt->execute($params);
            $total = (int)$totalStmt->fetch()['total'];

            // *** แก้ไข: เปลี่ยนมาใช้ค่าคงที่ STOP_CAUSES_TABLE ***
            $dataSql = "WITH NumberedRows AS (SELECT *, ROW_NUMBER() OVER (ORDER BY stop_begin DESC, id DESC) AS RowNum FROM " . STOP_CAUSES_TABLE . " $whereClause) SELECT * FROM NumberedRows WHERE RowNum > ? AND RowNum <= ?";
            $dataStmt = $pdo->prepare($dataSql);
            $dataStmt->execute(array_merge($params, [$startRow, $startRow + $limit]));
            $data = $dataStmt->fetchAll(PDO::FETCH_ASSOC);

            // *** แก้ไข: เปลี่ยนมาใช้ค่าคงที่ STOP_CAUSES_TABLE ***
            $summarySql = "SELECT line, COUNT(*) AS count, SUM(duration) AS total_minutes FROM " . STOP_CAUSES_TABLE . " $whereClause GROUP BY line ORDER BY total_minutes DESC";
            $summaryStmt = $pdo->prepare($summarySql);
            $summaryStmt->execute($params);
            $summary = $summaryStmt->fetchAll(PDO::FETCH_ASSOC);
            $totalMinutes = array_sum(array_column($summary, 'total_minutes'));
            echo json_encode(['success' => true, 'page' => $page, 'limit' => $limit, 'total' => $total, 'data' => $data, 'summary' => $summary, 'grand_total_minutes' => $totalMinutes]);
            break;

        case 'get_stop_by_id':
            if (!isset($_GET['id']) || !filter_var($_GET['id'], FILTER_VALIDATE_INT)) {
                http_response_code(400);
                throw new Exception('Invalid or missing ID for editing.');
            }
            $id = $_GET['id'];
            // *** แก้ไข: เปลี่ยนมาใช้ค่าคงที่ STOP_CAUSES_TABLE ***
            $stmt = $pdo->prepare("SELECT * FROM " . STOP_CAUSES_TABLE . " WHERE id = ?");
            $stmt->execute([$id]);
            $stop = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($stop) {
                enforceLinePermission($stop['line']);
                $stop['stop_begin'] = (new DateTime($stop['stop_begin']))->format('H:i:s');
                $stop['stop_end'] = (new DateTime($stop['stop_end']))->format('H:i:s');
                echo json_encode(['success' => true, 'data' => $stop]);
            } else {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Record not found.']);
            }
            break;

        case 'add_stop':
            $required_fields = ['log_date', 'stop_begin', 'stop_end', 'line', 'machine', 'cause', 'recovered_by'];
            foreach ($required_fields as $field) {
                if (empty($input[$field])) throw new Exception("Missing required field: " . $field);
            }

            $line = strtoupper(trim($input['line']));
            enforceLinePermission($line);
            
            $stop_begin_dt = new DateTime($input['log_date'] . ' ' . $input['stop_begin']);
            $stop_end_dt = new DateTime($input['log_date'] . ' ' . $input['stop_end']);
            if ($stop_end_dt < $stop_begin_dt) {
                $stop_end_dt->modify('+1 day');
            }
            
            // *** แก้ไข: เปลี่ยนมาใช้ค่าคงที่ STOP_CAUSES_TABLE ***
            $sql = "INSERT INTO " . STOP_CAUSES_TABLE . " (log_date, stop_begin, stop_end, line, machine, cause, recovered_by, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
            $params = [$input['log_date'], $stop_begin_dt->format('Y-m-d H:i:s'), $stop_end_dt->format('Y-m-d H:i:s'), $line, $input['machine'], $input['cause'], $input['recovered_by'], $input['note'] ?? null];
            $stmt = $pdo->prepare($sql);

            if ($stmt->execute($params)) {
                $duration = ($stop_end_dt->getTimestamp() - $stop_begin_dt->getTimestamp()) / 60;
                $detail = "Machine: {$input['machine']}, Cause: {$input['cause']}, Duration: " . round($duration, 2) . " mins";
                logAction($pdo, $currentUser['username'], 'ADD_STOP', $line, $detail);
                echo json_encode(['success' => true, 'message' => 'Stop cause added successfully.']);
            } else {
                throw new Exception("Failed to add stop cause.");
            }
            break;
            
        case 'update_stop':
            $required_fields = ['id', 'log_date', 'stop_begin', 'stop_end', 'line', 'machine', 'cause', 'recovered_by'];
            foreach ($required_fields as $field) {
                if (!isset($input[$field])) throw new Exception('Missing required field: ' . $field);
            }
            $id = $input['id'];
            if (!filter_var($id, FILTER_VALIDATE_INT)) throw new Exception('Invalid ID format.');

            // *** แก้ไข: เปลี่ยนมาใช้ค่าคงที่ STOP_CAUSES_TABLE ***
            $stmt = $pdo->prepare("SELECT line FROM " . STOP_CAUSES_TABLE . " WHERE id = ?");
            $stmt->execute([$id]);
            $stop = $stmt->fetch();
            if ($stop) {
                enforceLinePermission($stop['line']);
                if ($input['line'] !== $stop['line']) {
                    enforceLinePermission($input['line']);
                }
            } else {
                throw new Exception("Stop Cause record not found.");
            }
            
            $line = strtoupper(trim($input['line']));
            $log_date = $input['log_date'];
            if (!preg_match("/^\d{4}-\d{2}-\d{2}$/", $log_date)) {
                throw new Exception('Invalid log_date format. Expected YYYY-MM-DD.');
            }
            $stop_begin_dt = new DateTime($log_date . ' ' . $input['stop_begin']);
            $stop_end_dt = new DateTime($log_date . ' ' . $input['stop_end']);
            if ($stop_end_dt < $stop_begin_dt) {
                $stop_end_dt->modify('+1 day');
            }
            
            // *** แก้ไข: เปลี่ยนมาใช้ค่าคงที่ STOP_CAUSES_TABLE ***
            $sql = "UPDATE " . STOP_CAUSES_TABLE . " SET log_date = ?, stop_begin = ?, stop_end = ?, line = ?, machine = ?, cause = ?, recovered_by = ?, note = ? WHERE id = ?";
            $params = [$log_date, $stop_begin_dt->format('Y-m-d H:i:s'), $stop_end_dt->format('Y-m-d H:i:s'), $line, $input['machine'], $input['cause'], $input['recovered_by'], $input['note'] ?? null, $id];
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
    
            if ($stmt->rowCount() > 0) {
                $duration = ($stop_end_dt->getTimestamp() - $stop_begin_dt->getTimestamp()) / 60;
                $detail = "ID: {$id}, Machine: {$input['machine']}, Cause: {$input['cause']}, Duration: " . round($duration, 2) . " mins";
                logAction($pdo, $currentUser['username'], 'UPDATE_STOP', $line, $detail);
                echo json_encode(['success' => true, 'message' => 'Stop Cause updated successfully.']);
            } else {
                echo json_encode(['success' => true, 'message' => 'No changes made or data not found.']);
            }
            break;

        case 'delete_stop':
            $id = $input['id'] ?? $_REQUEST['id'] ?? null;
            if (!$id || !filter_var($id, FILTER_VALIDATE_INT)) {
                http_response_code(400);
                throw new Exception('Invalid or missing Stop Cause ID.');
            }
            // *** แก้ไข: เปลี่ยนมาใช้ค่าคงที่ STOP_CAUSES_TABLE ***
            $stmt = $pdo->prepare("SELECT * FROM " . STOP_CAUSES_TABLE . " WHERE id = ?");
            $stmt->execute([$id]);
            $stopToDelete = $stmt->fetch();
            if ($stopToDelete) {
                enforceLinePermission($stopToDelete['line']);
            } else {
                throw new Exception("Stop Cause record not found.");
            }
            // *** แก้ไข: เปลี่ยนมาใช้ค่าคงที่ STOP_CAUSES_TABLE ***
            $deleteStmt = $pdo->prepare("DELETE FROM " . STOP_CAUSES_TABLE . " WHERE id = ?");
            $deleteStmt->execute([$id]);
            if ($deleteStmt->rowCount() > 0) {
                $detail = "Deleted ID: {$id} | Machine: {$stopToDelete['machine']}, Cause: {$stopToDelete['cause']}, Duration: " . round($stopToDelete['duration'], 2) . " mins";
                logAction($pdo, $currentUser['username'], 'DELETE_STOP', $stopToDelete['line'], $detail);
                echo json_encode(['success' => true, 'message' => 'Stop Cause data deleted successfully.']);
            } else {
                echo json_encode(['success' => false, 'message' => 'Record not found or already deleted.']);
            }
            break;

        case 'get_lines':
            if ($currentUser['role'] === 'supervisor') {
                echo json_encode(['success' => true, 'data' => [$currentUser['line']]]);
            } else {
                // *** แก้ไข: เปลี่ยนมาใช้ค่าคงที่ STOP_CAUSES_TABLE ***
                $stmt = $pdo->query("SELECT DISTINCT line FROM " . STOP_CAUSES_TABLE . " WHERE line IS NOT NULL ORDER BY line");
                echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_COLUMN)]);
            }
            break;
        case 'get_machines':
            // *** แก้ไข: เปลี่ยนมาใช้ค่าคงที่ STOP_CAUSES_TABLE ***
            $stmt = $pdo->query("SELECT DISTINCT machine FROM " . STOP_CAUSES_TABLE . " WHERE machine IS NOT NULL AND machine != '' ORDER BY machine");
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_COLUMN)]);
            break;
        case 'get_causes':
            // *** แก้ไข: เปลี่ยนมาใช้ค่าคงที่ STOP_CAUSES_TABLE ***
            $stmt = $pdo->query("SELECT DISTINCT cause FROM " . STOP_CAUSES_TABLE . " WHERE cause IS NOT NULL AND cause != '' ORDER BY cause");
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_COLUMN)]);
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