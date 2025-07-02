<?php
require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../logger.php';
session_start();

//-- ป้องกัน CSRF สำหรับ Request ที่ไม่ใช่ GET --
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    if (!isset($_SERVER['HTTP_X_CSRF_TOKEN']) || !isset($_SESSION['csrf_token']) || !hash_equals($_SESSION['csrf_token'], $_SERVER['HTTP_X_CSRF_TOKEN'])) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'CSRF token validation failed.']);
        exit;
    }
}

//-- รับค่า Action และข้อมูล Input --
$action = $_REQUEST['action'] ?? '';
$input = json_decode(file_get_contents("php://input"), true);
$currentUser = $_SESSION['user']['username'] ?? 'system';

try {
    //-- แยกการทำงานตาม Action ที่ได้รับ --
    switch ($action) {
        //-- บันทึกข้อมูลการนำเข้า WIP (Work-In-Progress) --
        case 'log_wip_entry':
            //-- ตรวจสอบ Field ที่จำเป็น --
            $required_fields = ['line', 'part_no', 'quantity_in'];
            foreach ($required_fields as $field) {
                if (empty($input[$field])) {
                    throw new Exception("Missing required field: " . $field);
                }
            }

            //-- เตรียมข้อมูลและเพิ่มลงในฐานข้อมูล --
            $sql = "INSERT INTO WIP_ENTRIES (line, lot_no, part_no, quantity_in, operator, remark) VALUES (?, ?, ?, ?, ?, ?)";
            $params = [
                $input['line'],
                $input['lot_no'] ?? null,
                $input['part_no'],
                (int)$input['quantity_in'],
                $currentUser,
                $input['remark'] ?? null
            ];
            $stmt = $pdo->prepare($sql);
            $success = $stmt->execute($params);

            //-- บันทึก Log และส่งผลลัพธ์ --
            if ($success) {
                $detail = "Line: {$input['line']}, Part: {$input['part_no']}, Qty: {$input['quantity_in']}";
                logAction($pdo, $currentUser, 'WIP_ENTRY', $input['lot_no'], $detail);
                echo json_encode(['success' => true, 'message' => 'WIP entry logged successfully.']);
            } else {
                throw new Exception("Failed to log WIP entry.");
            }
            break;

        //-- สร้างรายงาน WIP โดยเปรียบเทียบยอดเข้า (IN) กับยอด FG ที่ผลิตเสร็จ (OUT) --
        case 'get_wip_report':
            //-- สร้างเงื่อนไข (WHERE clause) แบบ Dynamic จาก Filter --
            $conditions = [];
            $params = [];
            $allowed_string_filters = ['line', 'part_no', 'lot_no'];

            foreach ($allowed_string_filters as $filter) {
                if (!empty($_GET[$filter])) {
                    $conditions[] = "wip.{$filter} = ?";
                    $params[] = $_GET[$filter];
                }
            }
            if (!empty($_GET['startDate'])) {
                $conditions[] = "CAST(wip.entry_time AS DATE) >= ?";
                $params[] = $_GET['startDate'];
            }
            if (!empty($_GET['endDate'])) {
                $conditions[] = "CAST(wip.entry_time AS DATE) <= ?";
                $params[] = $_GET['endDate'];
            }
            $whereClause = $conditions ? "WHERE " . implode(" AND ", $conditions) : "";

            //-- Query หลักสำหรับสร้างรายงานสรุป WIP --
            $sql = "
                SELECT 
                    wip.lot_no,
                    wip.part_no,
                    wip.line,
                    SUM(wip.quantity_in) AS total_in,
                    ISNULL(prod.total_out, 0) AS total_out,
                    (SUM(wip.quantity_in) - ISNULL(prod.total_out, 0)) AS variance
                FROM 
                    WIP_ENTRIES wip
                -- Join กับ Subquery ที่รวมยอด FG จากตาราง Parts --
                LEFT JOIN 
                    (SELECT lot_no, SUM(count_value) as total_out 
                       FROM IOT_TOOLBOX_PARTS 
                       WHERE count_type = 'FG' 
                       GROUP BY lot_no) prod 
                ON 
                    wip.lot_no = prod.lot_no
                $whereClause
                GROUP BY
                    wip.lot_no, wip.part_no, wip.line, prod.total_out
                ORDER BY
                    MIN(wip.entry_time) DESC;
            ";

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $report_data = $stmt->fetchAll(PDO::FETCH_ASSOC);

            //-- ดึงประวัติการทำรายการ WIP ทั้งหมดตามเงื่อนไข --
            $history_sql = "SELECT * FROM WIP_ENTRIES $whereClause ORDER BY entry_time DESC";
            $history_stmt = $pdo->prepare($history_sql);
            $history_stmt->execute($params);
            $history_data = $history_stmt->fetchAll(PDO::FETCH_ASSOC);

            //-- ส่งข้อมูลรายงานและประวัติกลับไปเป็น JSON --
            echo json_encode([
                'success' => true, 
                'report' => $report_data,
                'history' => $history_data
            ]);
            break;

        //-- กรณีไม่พบ Action ที่ระบุ --
        default:
            http_response_code(400);
            throw new Exception("Invalid action specified.");
    }
} catch (Exception $e) {
    //-- จัดการข้อผิดพลาด --
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    error_log("Error in wipManage.php: " . $e->getMessage());
}
?>