<?php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../../auth/check_auth.php'; // เพิ่ม: เรียกใช้ check_auth.php
require_once __DIR__ . '/../logger.php';

// session_start() ถูกเรียกแล้วใน check_auth.php

//-- ป้องกัน CSRF สำหรับ Request ที่ไม่ใช่ GET --
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
    $currentUser = $_SESSION['user']; // เปลี่ยนมาใช้ข้อมูลจาก Session โดยตรง

    switch ($action) {
        // แก้ไข: เปลี่ยนชื่อ Action เป็น get_stops
        case 'get_stops':
            $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
            $limit = isset($_GET['limit']) ? max(1, intval($_GET['limit'])) : 50;
            $startRow = ($page - 1) * $limit;
            
            $conditions = [];
            $params = [];

            // --- 1. เพิ่มการกรองข้อมูลตามสิทธิ์ของ Supervisor ---
            if ($currentUser['role'] === 'supervisor') {
                $conditions[] = "line = ?";
                $params[] = $currentUser['line'];
            }

            // 2. สร้างเงื่อนไขจาก Filter อื่นๆ
            if (!empty($_GET['cause'])) { $conditions[] = "LOWER(cause) LIKE LOWER(?)"; $params[] = '%' . $_GET['cause'] . '%'; }
            if (!empty($_GET['line'])) { $conditions[] = "LOWER(line) = LOWER(?)"; $params[] = $_GET['line']; }
            if (!empty($_GET['machine'])) { $conditions[] = "LOWER(machine) = LOWER(?)"; $params[] = $_GET['machine']; }
            if (!empty($_GET['startDate'])) { $conditions[] = "log_date >= ?"; $params[] = $_GET['startDate']; }
            if (!empty($_GET['endDate'])) { $conditions[] = "log_date <= ?"; $params[] = $_GET['endDate']; }
            
            $whereClause = $conditions ? "WHERE " . implode(" AND ", $conditions) : "";

            // --- ส่วนที่เหลือของโค้ดเหมือนเดิมทั้งหมด ---
            $totalSql = "SELECT COUNT(*) AS total FROM STOP_CAUSES $whereClause";
            $totalStmt = $pdo->prepare($totalSql);
            $totalStmt->execute($params);
            $total = (int)$totalStmt->fetch()['total'];
            
            $dataSql = "WITH NumberedRows AS (SELECT *, ROW_NUMBER() OVER (ORDER BY stop_begin DESC, id DESC) AS RowNum FROM STOP_CAUSES $whereClause) SELECT * FROM NumberedRows WHERE RowNum > ? AND RowNum <= ?";
            $dataStmt = $pdo->prepare($dataSql);
            $dataStmt->execute(array_merge($params, [$startRow, $startRow + $limit]));
            $data = $dataStmt->fetchAll(PDO::FETCH_ASSOC);
            
            $summarySql = "SELECT line, COUNT(*) AS count, SUM(duration) AS total_minutes FROM STOP_CAUSES $whereClause GROUP BY line ORDER BY total_minutes DESC";
            $summaryStmt = $pdo->prepare($summarySql);
            $summaryStmt->execute($params);
            $summary = $summaryStmt->fetchAll(PDO::FETCH_ASSOC);
            $totalMinutes = array_sum(array_column($summary, 'total_minutes'));

            echo json_encode(['success' => true, 'page' => $page, 'limit' => $limit, 'total' => $total, 'data' => $data, 'summary' => $summary, 'grand_total_minutes' => $totalMinutes]);
            break;

        case 'add_stop':
            $required_fields = ['log_date', 'stop_begin', 'stop_end', 'line', 'machine', 'cause', 'recovered_by'];
            foreach ($required_fields as $field) {
                if (empty($input[$field])) throw new Exception("Missing required field: " . $field);
            }

            // --- เพิ่ม: ตรวจสอบสิทธิ์ก่อนสร้างข้อมูล ---
            enforceLinePermission($input['line']);
            
            $stop_begin_dt = new DateTime($input['log_date'] . ' ' . $input['stop_begin']);
            $stop_end_dt = new DateTime($input['log_date'] . ' ' . $input['stop_end']);
            if ($stop_end_dt < $stop_begin_dt) {
                $stop_end_dt->modify('+1 day');
            }

            $sql = "INSERT INTO STOP_CAUSES (log_date, stop_begin, stop_end, line, machine, cause, recovered_by, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
            $params = [$input['log_date'], $stop_begin_dt->format('Y-m-d H:i:s'), $stop_end_dt->format('Y-m-d H:i:s'), $input['line'], $input['machine'], $input['cause'], $input['recovered_by'], $input['note'] ?? null];
            $stmt = $pdo->prepare($sql);
            if ($stmt->execute($params)) {
                $lastId = $pdo->lastInsertId();
                $detail = "Line: {$input['line']}, Cause: {$input['cause']}";
                logAction($pdo, $currentUser['username'], 'ADD STOP_CAUSE', $lastId, $detail);
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

            // --- เพิ่ม: ตรวจสอบสิทธิ์ก่อนแก้ไข ---
            $stmt = $pdo->prepare("SELECT line FROM STOP_CAUSES WHERE id = ?");
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
            
            $log_date = $input['log_date'];
            if (!preg_match("/^\d{4}-\d{2}-\d{2}$/", $log_date)) {
                throw new Exception('Invalid log_date format. Expected YYYY-MM-DD.');
            }
            $stop_begin_dt = new DateTime($log_date . ' ' . $input['stop_begin']);
            $stop_end_dt = new DateTime($log_date . ' ' . $input['stop_end']);
            if ($stop_end_dt < $stop_begin_dt) {
                $stop_end_dt->modify('+1 day');
            }

            $sql = "UPDATE STOP_CAUSES SET log_date = ?, stop_begin = ?, stop_end = ?, line = ?, machine = ?, cause = ?, recovered_by = ?, note = ? WHERE id = ?";
            $params = [$log_date, $stop_begin_dt->format('Y-m-d H:i:s'), $stop_end_dt->format('Y-m-d H:i:s'), $input['line'], $input['machine'], $input['cause'], $input['recovered_by'], $input['note'] ?? null, $id];
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
        
            if ($stmt->rowCount() > 0) {
                $detail = "Line: {$input['line']}, Cause: {$input['cause']}";
                logAction($pdo, $currentUser['username'], 'UPDATE STOP_CAUSE', $input['id'], $detail);
                echo json_encode(['success' => true, 'message' => 'Stop Cause updated successfully.']);
            } else {
                echo json_encode(['success' => true, 'message' => 'No changes made or data not found.']);
            }
            break;

        case 'delete_stop':
            // แก้ไข: รับค่าจาก $input
            $id = $input['id'] ?? null;
            if (!$id || !filter_var($id, FILTER_VALIDATE_INT)) {
                http_response_code(400);
                throw new Exception('Invalid or missing Stop Cause ID.');
            }

            // --- เพิ่ม: ตรวจสอบสิทธิ์ก่อนลบ ---
            $stmt = $pdo->prepare("SELECT line FROM STOP_CAUSES WHERE id = ?");
            $stmt->execute([$id]);
            $stop = $stmt->fetch();
            if ($stop) {
                enforceLinePermission($stop['line']);
            } else {
                throw new Exception("Stop Cause record not found.");
            }
            
            $deleteStmt = $pdo->prepare("DELETE FROM STOP_CAUSES WHERE id = ?");
            $deleteStmt->execute([$id]);
            if ($deleteStmt->rowCount() > 0) {
                logAction($pdo, $currentUser['username'], 'DELETE STOP_CAUSE', $id);
                echo json_encode(['success' => true, 'message' => 'Stop Cause data deleted successfully.']);
            } else {
                echo json_encode(['success' => false, 'message' => 'Record not found or already deleted.']);
            }
            break;

        case 'get_lines':
            // --- เพิ่ม: การกรองข้อมูลตามสิทธิ์ของ Supervisor ---
            if ($currentUser['role'] === 'supervisor') {
                echo json_encode(['success' => true, 'data' => [$currentUser['line']]]);
            } else {
                $stmt = $pdo->query("SELECT DISTINCT line FROM STOP_CAUSES WHERE line IS NOT NULL ORDER BY line");
                echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_COLUMN)]);
            }
            break;

        case 'get_machines':
            $stmt = $pdo->query("SELECT DISTINCT machine FROM STOP_CAUSES WHERE machine IS NOT NULL AND machine != '' ORDER BY machine");
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_COLUMN)]);
            break;

        case 'get_causes':
            $stmt = $pdo->query("SELECT DISTINCT cause FROM STOP_CAUSES WHERE cause IS NOT NULL AND cause != '' ORDER BY cause");
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