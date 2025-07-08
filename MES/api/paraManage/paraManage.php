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

//-- รับค่า Action และข้อมูล Input --
$action = $_GET['action'] ?? '';
$input = json_decode(file_get_contents("php://input"), true);

try {
    //-- กำหนดผู้ใช้งานปัจจุบันสำหรับบันทึก Log --
    $currentUser = $_SESSION['user']['username'] ?? 'system';

    //-- แยกการทำงานตาม Action ที่ได้รับ --
    switch ($action) {
        //-- อ่านข้อมูล Parameter ทั้งหมด --
        case 'read':
            $stmt = $pdo->query("SELECT * FROM PARAMETER ORDER BY updated_at DESC");
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            // จัดรูปแบบวันที่ให้อ่านง่าย
            foreach ($rows as &$row) {
                if ($row['updated_at']) {
                    $row['updated_at'] = (new DateTime($row['updated_at']))->format('Y-m-d H:i:s');
                }
            }
            echo json_encode(['success' => true, 'data' => $rows]);
            break;

        //-- สร้าง Parameter ใหม่ --
        case 'create':
            $sql = "INSERT INTO PARAMETER (line, model, part_no, sap_no, planned_output, updated_at) VALUES (?, ?, ?, ?, ?, GETDATE())";
            $params = [
                strtoupper($input['line']),
                strtoupper($input['model']),
                strtoupper($input['part_no']),
                strtoupper($input['sap_no'] ?? ''),
                (int)$input['planned_output']
            ];
            $stmt = $pdo->prepare($sql);
            $success = $stmt->execute($params);
            // บันทึก Log การทำงาน
            if ($success) {
                $detail = "{$params[0]}-{$params[1]}-{$params[2]}";
                logAction($pdo, $currentUser, 'CREATE PARAMETER', null, $detail);
            }
            echo json_encode(['success' => $success, 'message' => 'Parameter created.']);
            break;

        //-- อัปเดตข้อมูล Parameter ที่มีอยู่ --
        case 'update':
            $id = $input['id'] ?? null;
            if (!$id) throw new Exception("Missing ID");
            
            // ดึงข้อมูลเก่าเพื่อใช้เป็นค่าเริ่มต้น
            $stmt = $pdo->prepare("SELECT * FROM PARAMETER WHERE id = ?");
            $stmt->execute([$id]);
            $row = $stmt->fetch();
            if (!$row) throw new Exception("Parameter not found");

            // เตรียมข้อมูลใหม่ โดยใช้ข้อมูลเก่าหากไม่มีการส่งค่าใหม่มา
            $line = strtoupper($input['line'] ?? $row['line']);
            $model = strtoupper($input['model'] ?? $row['model']);
            $part_no = strtoupper($input['part_no'] ?? $row['part_no']);
            $sap_no = strtoupper($input['sap_no'] ?? $row['sap_no']);
            $planned_output = isset($input['planned_output']) ? (int)$input['planned_output'] : (int)$row['planned_output'];

            $updateSql = "UPDATE PARAMETER SET line = ?, model = ?, part_no = ?, sap_no = ?, planned_output = ?, updated_at = GETDATE() WHERE id = ?";
            $params = [$line, $model, $part_no, $sap_no, $planned_output, $id];
            $stmt = $pdo->prepare($updateSql);
            $success = $stmt->execute($params);
            // บันทึก Log การทำงาน
            if ($success) {
                $detail = "ID: $id, Data: {$line}-{$model}-{$part_no}";
                logAction($pdo, $currentUser, 'UPDATE PARAMETER', $id, $detail);
            }
            echo json_encode(["success" => $success, 'message' => 'Parameter updated.']);
            break;

        //-- ลบข้อมูล Parameter --
        case 'delete':
            $id = $input['id'] ?? 0;
            if (!$id) throw new Exception("Missing ID");
            $stmt = $pdo->prepare("DELETE FROM PARAMETER WHERE id = ?");
            $success = $stmt->execute([(int)$id]);
            // บันทึก Log การทำงานหากมีการลบเกิดขึ้นจริง
            if ($success && $stmt->rowCount() > 0) {
                 logAction($pdo, $currentUser, 'DELETE PARAMETER', $id);
            }
            echo json_encode(["success" => $success, 'message' => 'Parameter deleted.']);
            break;

        //-- นำเข้าข้อมูล Parameter จำนวนมาก (Bulk Import) --
        case 'bulk_import':
            if (!is_array($input) || empty($input)) throw new Exception("Invalid data");
            
            // เริ่มต้น Transaction เพื่อความปลอดภัยของข้อมูล
            $pdo->beginTransaction();
            
            // เตรียม SQL Statements ไว้ล่วงหน้าเพื่อประสิทธิภาพ
            $checkSql = "SELECT id FROM PARAMETER WHERE line = ? AND model = ? AND part_no = ?";
            $checkStmt = $pdo->prepare($checkSql);
            $updateSql = "UPDATE PARAMETER SET sap_no = ?, planned_output = ?, updated_at = GETDATE() WHERE id = ?";
            $updateStmt = $pdo->prepare($updateSql);
            $insertSql = "INSERT INTO PARAMETER (line, model, part_no, sap_no, planned_output, updated_at) VALUES (?, ?, ?, ?, ?, GETDATE())";
            $insertStmt = $pdo->prepare($insertSql);

            $imported = 0;
            // วนลูปเพื่อตรวจสอบและเพิ่ม/อัปเดตข้อมูล (Upsert Logic)
            foreach ($input as $row) {
                $line = strtoupper(trim($row['line'] ?? ''));
                $model = strtoupper(trim($row['model'] ?? ''));
                $part_no = strtoupper(trim($row['part_no'] ?? ''));
                $sap_no = strtoupper(trim($row['sap_no'] ?? ''));
                $planned_output = (int)($row['planned_output'] ?? 0);

                if (empty($line) || empty($model) || empty($part_no)) continue;

                $checkStmt->execute([$line, $model, $part_no]);
                $existing = $checkStmt->fetch();

                if ($existing) { // ถ้ามีข้อมูลอยู่แล้ว ให้อัปเดต
                    $updateStmt->execute([$sap_no, $planned_output, $existing['id']]);
                } else { // ถ้าไม่มี ให้เพิ่มใหม่
                    $insertStmt->execute([$line, $model, $part_no, $sap_no, $planned_output]);
                }
                $imported++;
            }

            // ยืนยันการทำรายการทั้งหมด
            $pdo->commit();
            logAction($pdo, $currentUser, 'BULK IMPORT PARAMETER', null, "Imported $imported rows");
            echo json_encode(["success" => true, "imported" => $imported, "message" => "Imported $imported row(s) successfully."]);
            break;

        //-- อ่านข้อมูล Schedule ทั้งหมด --
        case 'read_schedules':
            $stmt = $pdo->prepare("EXEC dbo.sp_GetSchedules");
            $stmt->execute();
            $schedules = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(['success' => true, 'data' => $schedules]);
            break;

        //-- บันทึกข้อมูล Schedule (สร้าง/อัปเดต) --
        case 'save_schedule':
            $stmt = $pdo->prepare("EXEC dbo.sp_SaveSchedule @id=?, @line=?, @shift_name=?, @start_time=?, @end_time=?, @planned_break_minutes=?, @is_active=?");
            $success = $stmt->execute([
                $input['id'] ?? 0,
                $input['line'],
                $input['shift_name'],
                $input['start_time'],
                $input['end_time'],
                $input['planned_break_minutes'],
                $input['is_active']
            ]);
            // บันทึก Log การทำงาน
            if ($success) {
                $actionType = ($input['id'] ?? 0) > 0 ? 'UPDATE SCHEDULE' : 'CREATE SCHEDULE';
                logAction($pdo, $currentUser, $actionType, $input['id'] ?? null, "{$input['line']}-{$input['shift_name']}");
            }
            echo json_encode(['success' => $success, 'message' => 'Schedule saved successfully.']);
            break;

        //-- ลบข้อมูล Schedule --
        case 'delete_schedule':
            $id = $input['id'] ?? 0;
            if (!$id) throw new Exception("Missing Schedule ID");
            $stmt = $pdo->prepare("EXEC dbo.sp_DeleteSchedule @id=?");
            $success = $stmt->execute([(int)$id]);
            // บันทึก Log การทำงาน
            if ($success && $stmt->rowCount() > 0) {
                 logAction($pdo, $currentUser, 'DELETE SCHEDULE', $id);
            }
            echo json_encode(['success' => $success, 'message' => 'Schedule deleted.']);
            break;
            
        //-- ตรวจสอบข้อมูล Parameter ที่ขาดหายไป --
        case 'health_check_parameters':
            $stmt = $pdo->prepare("EXEC dbo.sp_GetMissingParameters");
            $stmt->execute();
            $missingParams = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(['success' => true, 'data' => $missingParams]);
            break;

        // ** NEW ACTION 1: ค้นหา Parameter เพื่อนำไปสร้าง BOM **
        case 'find_parameter_for_bom':
            $sap_no = trim($input['sap_no'] ?? '');
            $line = trim($input['line'] ?? '');
            $model = trim($input['model'] ?? '');
            $part_no = trim($input['part_no'] ?? '');

            $sql = "SELECT * FROM PARAMETER WHERE ";
            $params = [];

            if (!empty($sap_no)) {
                // ค้นหาด้วย SAP No. เป็นหลัก
                $sql .= "sap_no = ?";
                $params[] = $sap_no;
            } elseif (!empty($line) && !empty($model) && !empty($part_no)) {
                // ถ้าไม่มี SAP No. ให้ค้นหาด้วย 3 field หลัก
                $sql .= "line = ? AND model = ? AND part_no = ?";
                $params[] = $line;
                $params[] = $model;
                $params[] = $part_no;
            } else {
                // ถ้าข้อมูลไม่เพียงพอ ให้โยน Exception
                throw new Exception("Insufficient data provided. Please provide SAP No. or Line/Model/Part No. combination.");
            }

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $parameter = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($parameter) {
                echo json_encode(['success' => true, 'data' => $parameter]);
            } else {
                echo json_encode(['success' => false, 'message' => 'Parameter not found with the specified criteria.']);
            }
            break;

        // ** NEW ACTION 2: ดึงรายการ Part No. ทั้งหมดที่อยู่ใน Model ที่กำหนด **
        case 'get_parts_by_model':
            $model = trim($_GET['model'] ?? '');
            if (empty($model)) {
                echo json_encode(['success' => true, 'data' => []]);
                exit;
            }

            $sql = "SELECT DISTINCT part_no FROM PARAMETER WHERE model = ? ORDER BY part_no";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$model]);
            $parts = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(['success' => true, 'data' => $parts]);
            break;

        // In paraManage.php, inside the switch statement
        case 'get_parameter_by_key':
            // รับค่าจาก GET request
            $sap_no = trim($_GET['sap_no'] ?? '');
            $line = trim($_GET['line'] ?? '');
            $model = trim($_GET['model'] ?? '');
            $part_no = trim($_GET['part_no'] ?? '');

            $sql = "SELECT * FROM PARAMETER WHERE ";
            $params = [];

            if (!empty($sap_no)) {
                $sql .= "sap_no = ?";
                $params[] = $sap_no;
            } elseif (!empty($line) && !empty($model) && !empty($part_no)) {
                $sql .= "line = ? AND model = ? AND part_no = ?";
                $params[] = $line;
                $params[] = $model;
                $params[] = $part_no;
            } else {
                // ถ้าไม่มี key ที่ถูกต้องส่งมา ก็ไม่ต้องทำอะไร
                echo json_encode(['success' => false, 'message' => 'Insufficient keys.']);
                exit;
            }

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $parameter = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($parameter) {
                echo json_encode(['success' => true, 'data' => $parameter]);
            } else {
                echo json_encode(['success' => false, 'data' => null]);
            }
            break;

        //-- กรณีไม่พบ Action ที่ระบุ --
        default:
            http_response_code(400);
            throw new Exception("Invalid action specified.");
    }
} catch (Exception $e) {
    //-- จัดการข้อผิดพลาด และยกเลิก Transaction หากยังค้างอยู่ --
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
    error_log("Error in paraManage.php (Unified API): " . $e->getMessage());
}
?>