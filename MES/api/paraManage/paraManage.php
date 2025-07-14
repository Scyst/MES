<?php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../../auth/check_auth.php'; // เพิ่ม: เรียกใช้ check_auth.php
require_once __DIR__ . '/../logger.php';

// session_start() ถูกเรียกแล้วใน check_auth.php

//-- ป้องกัน CSRF สำหรับ Request ที่ไม่ใช่ GET --
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    if (!isset($_SERVER['HTTP_X_CSRF_TOKEN']) || !isset($_SESSION['csrf_token']) || !hash_equals($_SESSION['csrf_token'], $_SERVER['HTTP_X_CSRF_TOKEN'])) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'CSRF token validation failed.']);
        exit;
    }
}

$action = $_REQUEST['action'] ?? '';
$input = json_decode(file_get_contents("php://input"), true);
$currentUser = $_SESSION['user'];

try {
    switch ($action) {
        //-- อ่านข้อมูล Parameter ทั้งหมด (พร้อมกรองสำหรับ Supervisor) --
        case 'read':
            $sql = "SELECT * FROM PARAMETER";
            $params = [];
            if ($currentUser['role'] === 'supervisor') {
                $sql .= " WHERE line = ?";
                $params[] = $currentUser['line'];
            }
            $sql .= " ORDER BY updated_at DESC";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            foreach ($rows as &$row) {
                if ($row['updated_at']) {
                    $row['updated_at'] = (new DateTime($row['updated_at']))->format('Y-m-d H:i:s');
                }
            }
            echo json_encode(['success' => true, 'data' => $rows]);
            break;

        //-- สร้าง Parameter ใหม่ (พร้อมตรวจสอบสิทธิ์) --
        case 'create':
            $line = strtoupper($input['line']);
            enforceLinePermission($line);

            $sql = "INSERT INTO PARAMETER (line, model, part_no, sap_no, planned_output, updated_at) VALUES (?, ?, ?, ?, ?, GETDATE())";
            $params = [$line, strtoupper($input['model']), strtoupper($input['part_no']), strtoupper($input['sap_no'] ?? ''), (int)$input['planned_output']];
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            
            logAction($pdo, $currentUser['username'], 'CREATE PARAMETER', null, "{$params[0]}-{$params[1]}-{$params[2]}");
            echo json_encode(['success' => true, 'message' => 'Parameter created.']);
            break;

        //-- อัปเดตข้อมูล Parameter ที่มีอยู่ (พร้อมตรวจสอบสิทธิ์) --
        case 'update':
            $id = $input['id'] ?? null;
            if (!$id) throw new Exception("Missing ID");
            
            $stmt = $pdo->prepare("SELECT line FROM PARAMETER WHERE id = ?");
            $stmt->execute([$id]);
            $param = $stmt->fetch();
            if ($param) {
                enforceLinePermission($param['line']);
                if ($input['line'] !== $param['line']) {
                    enforceLinePermission($input['line']);
                }
            } else {
                throw new Exception("Parameter not found.");
            }
            
            $line = strtoupper($input['line']);
            $updateSql = "UPDATE PARAMETER SET line = ?, model = ?, part_no = ?, sap_no = ?, planned_output = ?, updated_at = GETDATE() WHERE id = ?";
            $params = [$line, strtoupper($input['model']), strtoupper($input['part_no']), strtoupper($input['sap_no']), (int)$input['planned_output'], $id];
            $stmt = $pdo->prepare($updateSql);
            $stmt->execute($params);

            logAction($pdo, $currentUser['username'], 'UPDATE PARAMETER', $id, "Data updated for ID: $id");
            echo json_encode(["success" => true, 'message' => 'Parameter updated.']);
            break;

        //-- ลบข้อมูล Parameter (พร้อมตรวจสอบสิทธิ์) --
        case 'delete':
            $id = $input['id'] ?? 0;
            if (!$id) throw new Exception("Missing ID");
            
            $stmt = $pdo->prepare("SELECT line FROM PARAMETER WHERE id = ?");
            $stmt->execute([$id]);
            $param = $stmt->fetch();
            if ($param) {
                enforceLinePermission($param['line']);
            } else {
                throw new Exception("Parameter not found.");
            }

            $deleteStmt = $pdo->prepare("DELETE FROM PARAMETER WHERE id = ?");
            $deleteStmt->execute([(int)$id]);

            if ($deleteStmt->rowCount() > 0) {
                 logAction($pdo, $currentUser['username'], 'DELETE PARAMETER', $id);
            }
            echo json_encode(["success" => true, 'message' => 'Parameter deleted.']);
            break;
            
        //-- นำเข้าข้อมูล Parameter จำนวนมาก (Bulk Import) --
        case 'bulk_import':
            if (!is_array($input) || empty($input)) throw new Exception("Invalid data");
            
            $pdo->beginTransaction();
            
            $checkSql = "SELECT id FROM PARAMETER WHERE line = ? AND model = ? AND part_no = ?";
            $checkStmt = $pdo->prepare($checkSql);
            $updateSql = "UPDATE PARAMETER SET sap_no = ?, planned_output = ?, updated_at = GETDATE() WHERE id = ?";
            $updateStmt = $pdo->prepare($updateSql);
            $insertSql = "INSERT INTO PARAMETER (line, model, part_no, sap_no, planned_output, updated_at) VALUES (?, ?, ?, ?, ?, GETDATE())";
            $insertStmt = $pdo->prepare($insertSql);

            $imported = 0;
            foreach ($input as $row) {
                $line = strtoupper(trim($row['line'] ?? ''));
                if (empty($line)) continue;

                // --- เพิ่ม: ตรวจสอบสิทธิ์สำหรับทุกแถวในไฟล์ Import ---
                enforceLinePermission($line);

                $model = strtoupper(trim($row['model'] ?? ''));
                $part_no = strtoupper(trim($row['part_no'] ?? ''));
                if (empty($model) || empty($part_no)) continue;
                
                $sap_no = strtoupper(trim($row['sap_no'] ?? ''));
                $planned_output = (int)($row['planned_output'] ?? 0);

                $checkStmt->execute([$line, $model, $part_no]);
                $existing = $checkStmt->fetch();

                if ($existing) {
                    $updateStmt->execute([$sap_no, $planned_output, $existing['id']]);
                } else {
                    $insertStmt->execute([$line, $model, $part_no, $sap_no, $planned_output]);
                }
                $imported++;
            }

            $pdo->commit();
            logAction($pdo, $currentUser['username'], 'BULK IMPORT PARAMETER', null, "Imported $imported rows");
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
            try {
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

                if ($success) {
                    $actionType = ($input['id'] ?? 0) > 0 ? 'UPDATE SCHEDULE' : 'CREATE SCHEDULE';
                    // แก้ไข: ส่ง $currentUser['username'] แทน object ทั้งหมด
                    logAction($pdo, $currentUser['username'], $actionType, $input['id'] ?? null, "{$input['line']}-{$input['shift_name']}");
                    echo json_encode(['success' => true, 'message' => 'Schedule saved successfully.']);
                } else {
                    throw new Exception("The stored procedure did not execute successfully, but did not throw an error.");
                }

            } catch (PDOException $e) {
                // ตรวจสอบรหัส Error ของ SQL Server ถ้าเป็น 23000 คือข้อมูลซ้ำ
                if ($e->getCode() == '23000') {
                    http_response_code(409); // 409 Conflict เป็นสถานะที่เหมาะสมสำหรับข้อมูลซ้ำ
                    echo json_encode(['success' => false, 'message' => "Schedule for this Line and Shift already exists. Please choose a different combination."]);
                } else {
                    // หากเป็น Error อื่นๆ ให้โยนออกไปให้ catch ตัวนอกจัดการ
                    throw $e;
                }
            }
            break;

        //-- ลบข้อมูล Schedule --
        case 'delete_schedule':
            $id = $input['id'] ?? 0;
            if (!$id) throw new Exception("Missing Schedule ID");
            $stmt = $pdo->prepare("EXEC dbo.sp_DeleteSchedule @id=?");
            $success = $stmt->execute([(int)$id]);
            // บันทึก Log การทำงาน
            if ($success && $stmt->rowCount() > 0) {
                 logAction($pdo, $currentUser['username'], 'DELETE SCHEDULE', $id);
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
            $model = trim($input['model'] ?? '');
            $part_no = trim($input['part_no'] ?? '');
            $line = trim($input['line'] ?? '');

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

        case 'get_lines':
            // --- เพิ่ม: การกรองข้อมูลตามสิทธิ์ของ Supervisor ---
            if ($currentUser['role'] === 'supervisor') {
                echo json_encode(['success' => true, 'data' => [$currentUser['line']]]);
            } else {
                $stmt = $pdo->query("SELECT DISTINCT line FROM PARAMETER WHERE line IS NOT NULL AND line != '' ORDER BY line");
                $lines = $stmt->fetchAll(PDO::FETCH_COLUMN);
                echo json_encode(['success' => true, 'data' => $lines]);
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