<?php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../logger.php';
session_start();

//-- ป้องกัน CSRF สำหรับ Request ที่ไม่ใช่ GET --
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

//-- รับค่า Action และข้อมูล Input (รองรับ GET, JSON และ Form data) --
$action = $_REQUEST['action'] ?? 'get_stop';

$input = json_decode(file_get_contents("php://input"), true);
if (empty($input) && !empty($_POST)) {
    $input = $_POST;
}

try {
    //-- กำหนดผู้ใช้งานปัจจุบันสำหรับบันทึก Log --
    $currentUser = $_SESSION['user']['username'] ?? 'system';

    //-- แยกการทำงานตาม Action ที่ได้รับ --
    switch ($action) {
       case 'get_stop':
            //-- จัดการ Pagination --
            $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
            $limit = isset($_GET['limit']) ? max(1, intval($_GET['limit'])) : 50;
            $startRow = ($page - 1) * $limit;
            $endRow = $startRow + $limit;

            //-- สร้างเงื่อนไข (WHERE clause) แบบ Dynamic จาก Filter --
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

            //-- Query เพื่อนับจำนวนข้อมูลทั้งหมด (สำหรับ Pagination) --
            $totalSql = "SELECT COUNT(*) AS total FROM STOP_CAUSES $whereClause";
            $totalStmt = $pdo->prepare($totalSql);
            $totalStmt->execute($params);
            $total = (int)$totalStmt->fetch()['total'];
            
            //-- Query หลักเพื่อดึงข้อมูลตามหน้า (Pagination) โดยใช้ CTE --
            $dataSql = "
                WITH NumberedRows AS (
                    SELECT 
                        id, log_date, stop_begin, stop_end, line, machine, cause, recovered_by, note, duration,
                        ROW_NUMBER() OVER (ORDER BY log_date DESC, stop_begin DESC, id DESC) AS RowNum
                    FROM STOP_CAUSES
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
 
            //-- จัดรูปแบบ Date/Time เพื่อแสดงผล --
            foreach ($data as &$row) {
                if ($row['log_date']) $row['log_date'] = (new DateTime($row['log_date']))->format('Y-m-d');
                if ($row['stop_begin']) $row['stop_begin'] = (new DateTime($row['stop_begin']))->format('H:i:s');
                if ($row['stop_end']) $row['stop_end'] = (new DateTime($row['stop_end']))->format('H:i:s');
            }

            //-- Query สรุปยอดรวมเวลาและจำนวนครั้งที่หยุด ตามไลน์ผลิต --
            $summarySql = "SELECT line, COUNT(*) AS count, SUM(duration) AS total_minutes
                               FROM STOP_CAUSES $whereClause
                               GROUP BY line ORDER BY total_minutes DESC";
            $summaryStmt = $pdo->prepare($summarySql);
            $summaryStmt->execute($params);
            $summary = $summaryStmt->fetchAll(PDO::FETCH_ASSOC);

            //-- คำนวณยอดรวมเวลานาทีทั้งหมด --
            $totalMinutes = array_sum(array_column($summary, 'total_minutes'));

            //-- ส่งข้อมูลทั้งหมดกลับไปเป็น JSON --
            echo json_encode([
                'success' => true, 'page' => $page, 'limit' => $limit, 'total' => $total,
                'data' => $data, 'summary' => $summary, 'grand_total_minutes' => $totalMinutes
            ]);
            break;

       case 'add_stop':
            //-- ตรวจสอบ Field ที่จำเป็น --
            $required_fields = ['log_date', 'stop_begin', 'stop_end', 'line', 'machine', 'cause', 'recovered_by'];
            foreach ($required_fields as $field) {
                if (empty($input[$field])) {
                    throw new Exception("Missing required field: " . $field);
                }
            }
            
            //-- คำนวณเวลาสิ้นสุดและเริ่มต้น (รองรับกรณีข้ามวัน) --
            $stop_begin_dt = new DateTime($input['log_date'] . ' ' . $input['stop_begin']);
            $stop_end_dt = new DateTime($input['log_date'] . ' ' . $input['stop_end']);
            if ($stop_end_dt < $stop_begin_dt) {
                $stop_end_dt->modify('+1 day');
            }

            //-- เพิ่มข้อมูล Stop Cause ใหม่ลงในฐานข้อมูล --
            $sql = "INSERT INTO STOP_CAUSES (log_date, stop_begin, stop_end, line, machine, cause, recovered_by, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
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

            //-- บันทึก Log และส่งผลลัพธ์ --
            if ($success) {
                $lastId = $pdo->lastInsertId();
                $detail = "Line: {$input['line']}, Cause: {$input['cause']}";
                logAction($pdo, $currentUser, 'ADD STOP_CAUSE', $lastId, $detail);
            }
            echo json_encode(['success' => true, 'message' => 'Stop cause added successfully.']);
            break;
        
       case 'update_stop':
            //-- ตรวจสอบ Field ที่จำเป็นและความถูกต้องของข้อมูล --
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

            //-- คำนวณเวลาสิ้นสุดและเริ่มต้น (รองรับกรณีข้ามวัน) --
            $stop_begin_dt = new DateTime($log_date . ' ' . $input['stop_begin']);
            $stop_end_dt = new DateTime($log_date . ' ' . $input['stop_end']);
            if ($stop_end_dt < $stop_begin_dt) {
                $stop_end_dt->modify('+1 day');
            }
        
            //-- เตรียมข้อมูลและรันคำสั่ง UPDATE --
            $sql = "UPDATE STOP_CAUSES SET log_date = ?, stop_begin = ?, stop_end = ?, line = ?, machine = ?, cause = ?, recovered_by = ?, note = ? WHERE id = ?";
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
        
            //-- ตรวจสอบว่ามีการอัปเดตข้อมูลจริงหรือไม่ก่อน Log --
            if ($stmt->rowCount() > 0) {
                $detail = "Line: {$input['line']}, Cause: {$input['cause']}";
                logAction($pdo, $currentUser, 'UPDATE STOP_CAUSE', $input['id'], $detail);
                echo json_encode(['success' => true, 'message' => 'Stop Cause updated successfully.']);
            } else {
                echo json_encode(['success' => true, 'message' => 'No changes made or data not found.']);
            }
            break;

       case 'delete_stop':
            //-- ตรวจสอบความถูกต้องของ ID ที่รับมา --
            $id = $_GET['id'] ?? null;
            if (!$id || !filter_var($id, FILTER_VALIDATE_INT)) {
                http_response_code(400);
                throw new Exception('Invalid or missing Stop Cause ID.');
            }

            //-- สั่งลบข้อมูล --
            $sql = "DELETE FROM STOP_CAUSES WHERE id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$id]);

            //-- ตรวจสอบว่ามีการลบข้อมูลจริงหรือไม่ก่อน Log --
            if ($stmt->rowCount() > 0) {
                logAction($pdo, $currentUser, 'DELETE STOP_CAUSE', $id);
                echo json_encode(['success' => true, 'message' => 'Stop Cause data deleted successfully.']);
            } else {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Data not found or already deleted.']);
            }
            break;

       case 'get_stop_by_id':
            //-- ตรวจสอบความถูกต้องของ ID ที่รับมา --
            $id = $_GET['id'] ?? null;
            if (!$id || !filter_var($id, FILTER_VALIDATE_INT)) {
                http_response_code(400);
                throw new Exception('Invalid or missing ID');
            }
            
            //-- ดึงข้อมูลรายการเดียวด้วย ID --
            $sql = "SELECT * FROM STOP_CAUSES WHERE id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([(int)$id]);
            $stop_data = $stmt->fetch();
            
            if (!$stop_data) {
                http_response_code(404);
                throw new Exception('Stop Cause data not found');
            }
            
            //-- จัดรูปแบบ Date/Time เพื่อแสดงผล --
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

        //-- ดึงข้อมูลสำหรับ Dropdown (cause, line, machine, recovered_by) --
       case 'get_causes':
       case 'get_lines':
       case 'get_machines':
       case 'get_recovered_by':
            //-- ลดการเขียนโค้ดซ้ำซ้อนโดยการ map action กับ column --
            $columns = [
                'get_causes' => 'cause', 'get_lines' => 'line',
                'get_machines' => 'machine', 'get_recovered_by' => 'recovered_by'
            ];
            $column = $columns[$action];
            $table = ($action === 'get_lines') ? 'PARAMETER' : 'STOP_CAUSES';

            //-- ดึงข้อมูลที่ไม่ซ้ำกันจาก Column ที่กำหนด --
            $stmt = $pdo->query("SELECT DISTINCT {$column} FROM {$table} WHERE {$column} IS NOT NULL AND {$column} != '' ORDER BY {$column}");
            $data = $stmt->fetchAll(PDO::FETCH_COLUMN);
            echo json_encode(['success' => true, 'data' => $data]);
            break;
        
       default:
            http_response_code(400);
            throw new Exception('Invalid action specified for Stop Cause.');
    }
} catch (Exception $e) {
    //-- จัดการข้อผิดพลาด --
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    error_log("Error in stopCauseManage.php: " . $e->getMessage());
}
?>