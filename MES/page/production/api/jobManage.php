<?php
// MES/page/production/api/jobManage.php
require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../components/init.php';

header('Content-Type: application/json; charset=utf-8');

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
        
        case 'get_locations':
            $sql = "SELECT location_id, location_name, location_type 
                    FROM LOCATIONS 
                    WHERE is_active = 1 AND location_type != 'STORE'
                    ORDER BY location_name ASC";
            $stmt = $pdo->query($sql);
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(['success' => true, 'data' => $data]);
            break;

        case 'get_active_jobs':
            $location_id = $_GET['location_id'];
            $sql = "SELECT j.*, i.part_no, i.part_description as part_name, l.location_name,
                           DATEDIFF(MINUTE, j.start_time, GETDATE()) as minutes_running 
                    FROM PRODUCTION_JOBS j
                    JOIN ITEMS i ON j.item_id = i.item_id
                    JOIN LOCATIONS l ON j.location_id = l.location_id
                    WHERE j.location_id = ? AND j.status IN ('PENDING', 'RUNNING')
                    ORDER BY CASE WHEN j.status = 'RUNNING' THEN 1 ELSE 2 END, j.created_at ASC";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$location_id]);
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(['success' => true, 'data' => $data]);
            break;

        case 'start_job':
            $job_id = $input['job_id'];
            $stmt = $pdo->prepare("SELECT job_no FROM PRODUCTION_JOBS WHERE job_id = ?");
            $stmt->execute([$job_id]);
            $jobNo = $stmt->fetchColumn();

            $sql = "UPDATE PRODUCTION_JOBS SET status = 'RUNNING', start_time = GETDATE() WHERE job_id = ? AND status = 'PENDING'";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$job_id]);

            if ($stmt->rowCount() > 0) {
                writeLog($pdo, 'START_JOB', 'PRODUCTION_JOBS', $jobNo, null, null, "Started job execution");
                echo json_encode(['success' => true, 'message' => "เริ่มดำเนินการผลิตสำเร็จ"]);
            } else {
                throw new Exception("ไม่สามารถเริ่ม Job ได้ (อาจถูกเริ่มไปแล้ว หรือถูกยกเลิก)");
            }
            break;

        case 'record_output':
            $job_id = $input['job_id'];
            $add_actual = (float)($input['actual_qty'] ?? 0);
            $add_hold = (float)($input['hold_qty'] ?? 0);
            $add_scrap = (float)($input['scrap_qty'] ?? 0);

            if ($add_actual <= 0 && $add_hold <= 0 && $add_scrap <= 0) {
                throw new Exception("กรุณาระบุยอดอย่างน้อย 1 ประเภทที่มากกว่า 0");
            }

            $pdo->beginTransaction();

            $stmt = $pdo->prepare("SELECT * FROM PRODUCTION_JOBS WHERE job_id = ? AND status = 'RUNNING' WITH (UPDLOCK)");
            $stmt->execute([$job_id]);
            $job = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$job) throw new Exception("ไม่สามารถบันทึกยอดได้ (Job อาจถูกปิดไปแล้ว หรือยังไม่กด Start)");

            $sql = "UPDATE PRODUCTION_JOBS 
                    SET actual_qty = ISNULL(actual_qty, 0) + ?, 
                        hold_qty = ISNULL(hold_qty, 0) + ?, 
                        scrap_qty = ISNULL(scrap_qty, 0) + ?
                    WHERE job_id = ?";
            $pdo->prepare($sql)->execute([$add_actual, $add_hold, $add_scrap, $job_id]);

            if ($add_hold > 0) {
                $holdPrefix = $job['job_no'] . '-QA';
                $stmtHold = $pdo->prepare("SELECT COUNT(*) FROM PRODUCTION_JOBS WHERE job_no LIKE ?");
                $stmtHold->execute([$holdPrefix . '%']);
                $holdCount = $stmtHold->fetchColumn() + 1;
                
                $newHoldJobNo = $holdPrefix . '-' . $holdCount;
                
                $sqlHold = "INSERT INTO PRODUCTION_JOBS (job_no, location_id, item_id, target_qty, status, created_by, created_at)
                            VALUES (?, ?, ?, ?, 'PENDING', ?, GETDATE())";
                $pdo->prepare($sqlHold)->execute([
                    $newHoldJobNo, $job['location_id'], $job['item_id'], $add_hold, $currentUser['id']
                ]);
                writeLog($pdo, 'AUTO_CREATE_QA_JOB', 'PRODUCTION_JOBS', $newHoldJobNo, null, ['target_qty' => $add_hold], "Auto generated from hold qty of " . $job['job_no']);
            }

            $pdo->commit();
            writeLog($pdo, 'RECORD_OUTPUT', 'PRODUCTION_JOBS', $job['job_no'], null, ['add_fg' => $add_actual, 'add_hold' => $add_hold, 'add_scrap' => $add_scrap], "Recorded incremental output");
            
            echo json_encode(['success' => true, 'message' => "บันทึกยอดสะสมเรียบร้อยแล้ว"]);
            break;

        case 'close_job':
            $job_id = $input['job_id'];

            $stmt = $pdo->prepare("SELECT job_no FROM PRODUCTION_JOBS WHERE job_id = ?");
            $stmt->execute([$job_id]);
            $jobNo = $stmt->fetchColumn();

            $sql = "UPDATE PRODUCTION_JOBS SET status = 'COMPLETED', end_time = GETDATE() WHERE job_id = ? AND status = 'RUNNING'";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$job_id]);
            
            if ($stmt->rowCount() > 0) {
                writeLog($pdo, 'CLOSE_JOB', 'PRODUCTION_JOBS', $jobNo, null, null, "Completed job execution");
                echo json_encode(['success' => true, 'message' => "ปิดจ๊อบการผลิตเรียบร้อยแล้ว"]);
            } else {
                throw new Exception("ไม่สามารถปิดจ๊อบได้ (อาจถูกปิดไปแล้ว)");
            }
            break;

        case 'edit_job':
            $job_id = $input['job_id'];
            $target_qty = $input['target_qty'];
            $stmt = $pdo->prepare("SELECT job_no, target_qty FROM PRODUCTION_JOBS WHERE job_id = ?");
            $stmt->execute([$job_id]);
            $oldJob = $stmt->fetch(PDO::FETCH_ASSOC);

            $sql = "UPDATE PRODUCTION_JOBS SET target_qty = ? WHERE job_id = ? AND status IN ('PENDING', 'RUNNING')";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$target_qty, $job_id]);
            
            if ($stmt->rowCount() > 0) {
                writeLog($pdo, 'EDIT_JOB', 'PRODUCTION_JOBS', $oldJob['job_no'], ['target_qty' => $oldJob['target_qty']], ['target_qty' => $target_qty], "Updated target quantity");
                echo json_encode(['success' => true, 'message' => "อัปเดตเป้าหมายการผลิตสำเร็จ"]);
            } else {
                throw new Exception("ไม่สามารถแก้ไขได้ (อาจถูกปิดจ๊อบไปแล้ว)");
            }
            break;

        case 'delete_job':
            $job_id = $input['job_id'];
            
            $stmt = $pdo->prepare("SELECT status, job_no FROM PRODUCTION_JOBS WHERE job_id = ?");
            $stmt->execute([$job_id]);
            $job = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$job) throw new Exception("ไม่พบข้อมูล Job นี้");

            if ($job['status'] === 'PENDING') {
                $pdo->prepare("DELETE FROM PRODUCTION_JOBS WHERE job_id = ?")->execute([$job_id]);
                writeLog($pdo, 'DELETE_JOB', 'PRODUCTION_JOBS', $job['job_no'], $job, null, "Permanently deleted pending job");
                echo json_encode(['success' => true, 'message' => "ลบใบสั่งผลิต {$job['job_no']} เรียบร้อยแล้ว"]);
            } else if ($job['status'] === 'RUNNING') {
                $pdo->prepare("UPDATE PRODUCTION_JOBS SET status = 'CANCELLED', end_time = GETDATE() WHERE job_id = ?")->execute([$job_id]);
                writeLog($pdo, 'CANCEL_JOB', 'PRODUCTION_JOBS', $job['job_no'], ['status' => 'RUNNING'], ['status' => 'CANCELLED'], "Cancelled running job");
                echo json_encode(['success' => true, 'message' => "ยกเลิกใบสั่งผลิต {$job['job_no']} กลางคันเรียบร้อยแล้ว"]);
            } else {
                throw new Exception("ไม่สามารถลบ/ยกเลิก Job ที่ดำเนินการเสร็จสิ้นแล้วได้");
            }
            break;

        case 'get_items':
            $sql = "SELECT item_id, sap_no, part_no, part_description 
                    FROM ITEMS 
                    WHERE is_active = 1 
                    ORDER BY part_no ASC";
            $data = $pdo->query($sql)->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(['success' => true, 'data' => $data]);
            break;

        case 'create_job':
            $location_id = $input['location_id'];
            $item_id = $input['item_id'];
            $target_qty = $input['target_qty'];

            $pdo->beginTransaction();

            $prefix = "WK-" . date('ym') . "-";
            $stmt = $pdo->prepare("SELECT TOP 1 job_no FROM PRODUCTION_JOBS WHERE job_no LIKE ? WITH (UPDLOCK) ORDER BY job_id DESC");
            $stmt->execute([$prefix . '%']);
            $lastJob = $stmt->fetchColumn();

            $nextSeq = 1;
            if ($lastJob) {
                $nextSeq = (int)substr($lastJob, -4) + 1;
            }
            $job_no = $prefix . str_pad($nextSeq, 4, '0', STR_PAD_LEFT);

            $sql = "INSERT INTO PRODUCTION_JOBS (job_no, location_id, item_id, target_qty, status, created_by, created_at)
                    VALUES (?, ?, ?, ?, 'PENDING', ?, GETDATE())";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$job_no, $location_id, $item_id, $target_qty, $currentUser['id']]);
            $pdo->commit();

            writeLog($pdo, 'CREATE_JOB', 'PRODUCTION_JOBS', $job_no, null, ['location_id' => $location_id, 'item_id' => $item_id, 'target_qty' => $target_qty], "Created new production job");

            echo json_encode(['success' => true, 'message' => "สร้างใบสั่งผลิต {$job_no} สำเร็จ"]);
            break;

        case 'get_all_jobs':
            $sql = "SELECT j.*, i.part_no, l.location_name, u.fullname as creator_name
                    FROM PRODUCTION_JOBS j
                    JOIN ITEMS i ON j.item_id = i.item_id
                    JOIN LOCATIONS l ON j.location_id = l.location_id
                    LEFT JOIN USERS u ON j.created_by = u.id
                    ORDER BY j.created_at DESC";
            $data = $pdo->query($sql)->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(['success' => true, 'data' => $data]);
            break;

        default:
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => "Action '{$action}' is not handled."]);
            break;
    }
} catch (Throwable $e) {
    handleApiError($e, $pdo, $input);
}
?>