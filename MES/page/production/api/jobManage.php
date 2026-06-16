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

if (!hasPermission('add_production') && !hasPermission('manage_production')) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Permission Denied']);
    exit;
}

$action = $_REQUEST['action'] ?? '';
$input = json_decode(file_get_contents("php://input"), true);
$currentUser = $_SESSION['user'];

try {
    switch ($action) {
        
        case 'get_locations':
            $sql = "SELECT location_id, location_name, location_type 
                    FROM " . LOCATIONS_TABLE . " 
                    WHERE is_active = 1 AND location_type != 'STORE'
                    ORDER BY location_name ASC";
            $data = $pdo->query($sql)->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(['success' => true, 'data' => $data]);
            break;

        case 'get_items':
            $sql = "SELECT item_id, sap_no, part_no, part_description 
                    FROM " . ITEMS_TABLE . " 
                    WHERE is_active = 1 
                    ORDER BY part_no ASC";
            $data = $pdo->query($sql)->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(['success' => true, 'data' => $data]);
            break;

        case 'get_active_jobs':
            $location_id = $_GET['location_id'] ?? '';
            $params = [];
            $locFilter = "";
            
            // 🟢 ปรับให้ถ้าไม่ได้เลือกไลน์ (ค่าว่าง) จะแสดงของทุกไลน์
            if ($location_id !== '') {
                $locFilter = "AND j.location_id = ?";
                $params[] = $location_id;
            }

            $sql = "SELECT j.*, i.part_no, i.part_description as part_name, l.location_name, u.fullname as creator_name,
                           (ISNULL(j.total_running_minutes, 0) + 
                            CASE WHEN j.status = 'RUNNING' AND j.start_time IS NOT NULL 
                                 THEN DATEDIFF(MINUTE, j.start_time, GETDATE()) 
                                 ELSE 0 END) as minutes_running 
                    FROM PRODUCTION_JOBS j WITH (NOLOCK)
                    JOIN " . ITEMS_TABLE . " i ON j.item_id = i.item_id
                    JOIN " . LOCATIONS_TABLE . " l ON j.location_id = l.location_id
                    LEFT JOIN " . USERS_TABLE . " u ON j.created_by = u.id
                    WHERE j.status IN ('PENDING', 'RUNNING', 'PAUSED') $locFilter
                    ORDER BY j.location_id ASC, CASE WHEN j.status = 'RUNNING' THEN 0 WHEN j.status = 'PAUSED' THEN 1 ELSE 2 END, 
                             j.queue_order ASC, j.created_at ASC";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
            break;

        case 'reorder_queue':
            $location_id = $input['location_id'];
            $job_ids = $input['job_ids'];
            
            $pdo->beginTransaction();
            try {
                foreach ($job_ids as $index => $jid) {
                    $qOrder = $index + 1;
                    $pdo->prepare("UPDATE PRODUCTION_JOBS SET queue_order = ? WHERE job_id = ? AND location_id = ?")
                        ->execute([$qOrder, $jid, $location_id]);
                }
                $pdo->commit();
                echo json_encode(['success' => true]);
            } catch (Exception $e) {
                $pdo->rollBack();
                throw $e;
            }
            break;

        case 'create_job':
            $location_id = $input['location_id'];
            $item_id = $input['item_id'];
            $target_qty = $input['target_qty'];
            $lot_no = isset($input['lot_no']) && trim($input['lot_no']) !== '' ? trim($input['lot_no']) : null;

            $pdo->beginTransaction();
            $prefix = "JOB-" . date('ym') . "-";
            $stmt = $pdo->prepare("SELECT TOP 1 job_no FROM PRODUCTION_JOBS WITH (UPDLOCK) WHERE job_no LIKE ? ORDER BY job_no DESC");
            $stmt->execute([$prefix . '%']);
            $lastJob = $stmt->fetchColumn();

            $nextSeq = $lastJob ? (int)substr($lastJob, -4) + 1 : 1;
            $job_no = $prefix . str_pad($nextSeq, 4, '0', STR_PAD_LEFT);

            // 🟢 แก้ไขบัคคิว 1000: หาค่า MAX คิวที่น้อยกว่า 900 (เพื่อกันไปชนกับคิว QA ที่ตั้งไว้ 999)
            $qStmt = $pdo->prepare("SELECT ISNULL(MAX(queue_order), 0) + 1 FROM PRODUCTION_JOBS WHERE location_id = ? AND status != 'COMPLETED' AND queue_order < 900");
            $qStmt->execute([$location_id]);
            $nextQueue = $qStmt->fetchColumn();

            $sql = "INSERT INTO PRODUCTION_JOBS (job_no, location_id, item_id, target_qty, status, queue_order, created_by, created_at, lot_no)
                    VALUES (?, ?, ?, ?, 'PENDING', ?, ?, GETDATE(), ?)";
            $pdo->prepare($sql)->execute([$job_no, $location_id, $item_id, $target_qty, $nextQueue, $currentUser['id'], $lot_no]);

            $pdo->commit();
            writeLog($pdo, 'CREATE_JOB', 'PRODUCTION_JOBS', $job_no, null, $input, "Created job: $job_no");
            echo json_encode(['success' => true, 'message' => "สร้างใบสั่งผลิต {$job_no} สำเร็จ"]);
            break;

        case 'start_job':
            $job_id = $input['job_id'];
            $sql = "UPDATE PRODUCTION_JOBS SET status = 'RUNNING', start_time = GETDATE() WHERE job_id = ? AND status IN ('PENDING', 'PAUSED')";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$job_id]);

            if ($stmt->rowCount() > 0) {
                echo json_encode(['success' => true, 'message' => "เริ่มงานสำเร็จ"]);
            } else { throw new Exception("ไม่สามารถเริ่ม Job ได้"); }
            break;

        case 'pause_job':
            $job_id = $input['job_id'];
            $pdo->beginTransaction();
            $stmt = $pdo->prepare("SELECT start_time FROM PRODUCTION_JOBS WITH (UPDLOCK) WHERE job_id = ? AND status = 'RUNNING'");
            $stmt->execute([$job_id]);
            $startTime = $stmt->fetchColumn();

            if ($startTime) {
                $pdo->prepare("UPDATE PRODUCTION_JOBS 
                               SET status = 'PAUSED', 
                                   total_running_minutes = ISNULL(total_running_minutes, 0) + DATEDIFF(MINUTE, start_time, GETDATE()), 
                                   start_time = NULL 
                               WHERE job_id = ?")->execute([$job_id]);
                $pdo->commit();
                echo json_encode(['success' => true, 'message' => "พักงานชั่วคราว"]);
            } else { throw new Exception("Job ไม่ได้อยู่ในสถานะ RUNNING"); }
            break;

        case 'record_output':
            $job_id = $input['job_id'];
            $add_actual = (float)($input['actual_qty'] ?? 0);
            $add_hold = (float)($input['hold_qty'] ?? 0);
            $add_scrap = (float)($input['scrap_qty'] ?? 0);

            $pdo->beginTransaction();
            $stmt = $pdo->prepare("SELECT * FROM PRODUCTION_JOBS WITH (UPDLOCK) WHERE job_id = ? AND status IN ('RUNNING', 'PAUSED')");
            $stmt->execute([$job_id]);
            $job = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$job) throw new Exception("ไม่สามารถบันทึกยอดได้ (Job Status Error)");

            $sql = "UPDATE PRODUCTION_JOBS SET actual_qty = ISNULL(actual_qty, 0) + ?, hold_qty = ISNULL(hold_qty, 0) + ?, scrap_qty = ISNULL(scrap_qty, 0) + ? WHERE job_id = ?";
            $pdo->prepare($sql)->execute([$add_actual, $add_hold, $add_scrap, $job_id]);

            $spProd = $pdo->prepare("EXEC dbo.sp_ExecuteProduction @item_id = ?, @location_id = ?, @quantity = ?, @count_type = ?, @lot_no = ?, @notes = ?, @timestamp = ?, @start_time = ?, @end_time = ?, @user_id = ?, @username = ?");
            $ts = date('Y-m-d H:i:s');
            $st = $job['start_time'] ? date('H:i:s', strtotime($job['start_time'])) : date('H:i:s');
            $et = date('H:i:s');
            
            // ใช้ lot_no ถ้ามีการระบุไว้ตอนสร้างงาน ถ้าไม่มีให้ใช้ job_no เป็นค่าอ้างอิงแทน
            $transactionLot = !empty($job['lot_no']) ? $job['lot_no'] : $job['job_no'];
            
            if ($add_actual > 0) $spProd->execute([$job['item_id'], $job['location_id'], $add_actual, 'FG', $transactionLot, 'Output [Job: ' . $job['job_no'] . ']', $ts, $st, $et, $currentUser['id'], $currentUser['username']]);
            if ($add_hold > 0)   $spProd->execute([$job['item_id'], $job['location_id'], $add_hold, 'HOLD', $transactionLot, 'Hold [Job: ' . $job['job_no'] . ']', $ts, $st, $et, $currentUser['id'], $currentUser['username']]);
            if ($add_scrap > 0)  $spProd->execute([$job['item_id'], $job['location_id'], $add_scrap, 'SCRAP', $transactionLot, 'Scrap [Job: ' . $job['job_no'] . ']', $ts, $st, $et, $currentUser['id'], $currentUser['username']]);

            if ($add_hold > 0) {
                $qaJobNo = $job['job_no'] . '-QA';
                $existingQA = $pdo->prepare("SELECT job_id FROM PRODUCTION_JOBS WHERE job_no = ? AND status != 'COMPLETED'");
                $existingQA->execute([$qaJobNo]);
                $qaId = $existingQA->fetchColumn();

                if ($qaId) {
                    $pdo->prepare("UPDATE PRODUCTION_JOBS SET target_qty = target_qty + ? WHERE job_id = ?")->execute([$add_hold, $qaId]);
                } else {
                    // 🟢 QA Job ยังคงให้ใช้คิวที่ 999 เพื่อให้อยู่ท้ายสุดเสมอ
                    $pdo->prepare("INSERT INTO PRODUCTION_JOBS (job_no, location_id, item_id, target_qty, status, queue_order, created_by, created_at, lot_no) VALUES (?, ?, ?, ?, 'PENDING', 999, ?, GETDATE(), ?)")
                        ->execute([$qaJobNo, $job['location_id'], $job['item_id'], $add_hold, $currentUser['id'], $job['lot_no']]);
                }
            }

            $pdo->commit();
            echo json_encode(['success' => true, 'message' => "บันทึกและตัดสต็อกเรียบร้อย"]);
            break;

        case 'delete_txn':
            $txn_id = $input['txn_id'];
            $job_id = $input['job_id'];

            $stmt = $pdo->prepare("EXEC dbo.sp_Job_DeleteTransaction @txn_id = ?, @job_id = ?, @user_id = ?");
            $stmt->execute([$txn_id, $job_id, $currentUser['id']]);
            
            echo json_encode(['success' => true, 'message' => "ลบรายการและคืนสต็อกสำเร็จ"]);
            break;

        case 'close_job':
            $job_id = $input['job_id'];
            $pdo->beginTransaction();
            
            $stmt = $pdo->prepare("SELECT status FROM PRODUCTION_JOBS WITH (UPDLOCK) WHERE job_id = ?");
            $stmt->execute([$job_id]);
            $status = $stmt->fetchColumn();
            
            if (!$status) {
                $pdo->rollBack();
                throw new Exception("ไม่พบงานนี้ในระบบ");
            }
            
            $pdo->prepare("UPDATE PRODUCTION_JOBS 
                           SET status = 'COMPLETED', 
                               total_running_minutes = ISNULL(total_running_minutes, 0) + 
                                                      CASE WHEN status = 'RUNNING' THEN DATEDIFF(MINUTE, start_time, GETDATE()) ELSE 0 END,
                               end_time = GETDATE() 
                           WHERE job_id = ?")->execute([$job_id]);
            $pdo->commit();
            writeLog($pdo, 'CLOSE_JOB', 'PRODUCTION_JOBS', $job_id, null, null, "Closed job manually");
            echo json_encode(['success' => true, 'message' => "ปิดจ๊อบแล้ว"]);
            break;

        case 'edit_job':
            $job_id = $input['job_id'];
            $target_qty = $input['target_qty'];
            $sql = "UPDATE PRODUCTION_JOBS SET target_qty = ? WHERE job_id = ? AND status IN ('PENDING', 'RUNNING')";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$target_qty, $job_id]);
            if ($stmt->rowCount() > 0) { echo json_encode(['success' => true, 'message' => "อัปเดตสำเร็จ"]);
            } else { throw new Exception("ไม่สามารถแก้ไขได้"); }
            break;

        case 'delete_job':
            $job_id = $input['job_id'];
            $pdo->beginTransaction();
            $stmt = $pdo->prepare("SELECT status FROM PRODUCTION_JOBS WITH (UPDLOCK) WHERE job_id = ?");
            $stmt->execute([$job_id]);
            $status = $stmt->fetchColumn();

            if (!$status) {
                $pdo->rollBack();
                throw new Exception("ไม่พบงานนี้ในระบบ");
            }

            if ($status === 'PENDING') {
                $pdo->prepare("DELETE FROM PRODUCTION_JOBS WHERE job_id = ?")->execute([$job_id]);
                $pdo->commit();
                writeLog($pdo, 'DELETE_JOB', 'PRODUCTION_JOBS', $job_id, null, null, "Deleted pending job");
                echo json_encode(['success' => true, 'message' => "ลบสำเร็จ"]);
            } else {
                $pdo->prepare("UPDATE PRODUCTION_JOBS SET status = 'CANCELLED', end_time = GETDATE() WHERE job_id = ?")->execute([$job_id]);
                $pdo->commit();
                writeLog($pdo, 'CANCEL_JOB', 'PRODUCTION_JOBS', $job_id, null, null, "Cancelled running/paused job");
                echo json_encode(['success' => true, 'message' => "ยกเลิกงานแล้ว"]);
            }
            break;

        case 'get_job_logs':
            $job_no = $_GET['job_no'];
            
            // Get lot_no, start_time, end_time, and item_id for this job to accurately filter past transactions
            $jobStmt = $pdo->prepare("SELECT lot_no, ISNULL(start_time, created_at) as baseline_time, ISNULL(end_time, '2099-12-31 23:59:59') as end_time, item_id FROM PRODUCTION_JOBS WHERE job_no = ?");
            $jobStmt->execute([$job_no]);
            $jobData = $jobStmt->fetch(PDO::FETCH_ASSOC);
            $lot_no = $jobData ? $jobData['lot_no'] : null;
            $baseline_time = ($jobData && $jobData['baseline_time']) ? $jobData['baseline_time'] : '2000-01-01 00:00:00';
            $end_time = ($jobData && $jobData['end_time']) ? $jobData['end_time'] : '2099-12-31 23:59:59';
            $item_id = $jobData ? $jobData['item_id'] : null;

            $sql = "SELECT t.transaction_id as txn_id, FORMAT(t.transaction_timestamp, 'HH:mm:ss') as txn_time, 
                           REPLACE(t.transaction_type, 'PRODUCTION_', '') as txn_type, t.quantity as qty,
                           u.fullname as creator_name, t.notes
                    FROM " . TRANSACTIONS_TABLE . " t
                    LEFT JOIN " . USERS_TABLE . " u ON t.created_by_user_id = u.id
                    WHERE t.transaction_type LIKE 'PRODUCTION_%' 
                      AND (
                           t.reference_id = ? 
                           OR (t.reference_id = ? AND (CHARINDEX(?, t.notes) > 0 OR (CHARINDEX('[Job:', t.notes) = 0 AND t.transaction_timestamp >= CAST(? AS DATETIME) AND t.transaction_timestamp <= CAST(? AS DATETIME) AND t.parameter_id = ?)))
                      )
                    ORDER BY t.transaction_timestamp DESC, t.transaction_id DESC";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$job_no, $lot_no ?: $job_no, "[Job: $job_no]", $baseline_time, $end_time, $item_id]);
            
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
            break;

        case 'get_all_jobs':
            $sql = "SELECT j.*, i.part_no, l.location_name, u.fullname as creator_name
                    FROM PRODUCTION_JOBS j WITH (NOLOCK)
                    JOIN " . ITEMS_TABLE . " i ON j.item_id = i.item_id
                    JOIN " . LOCATIONS_TABLE . " l ON j.location_id = l.location_id
                    LEFT JOIN " . USERS_TABLE . " u ON j.created_by = u.id
                    ORDER BY j.created_at DESC";
            $data = $pdo->query($sql)->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(['success' => true, 'data' => $data]);
            break;

        default:
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => "Action unknown."]);
            break;
    }
} catch (Throwable $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>