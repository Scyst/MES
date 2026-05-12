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
            $location_id = $_GET['location_id'];
            $sql = "SELECT j.*, i.part_no, i.part_description as part_name, l.location_name,
                           (ISNULL(j.total_running_minutes, 0) + 
                            CASE WHEN j.status = 'RUNNING' AND j.start_time IS NOT NULL 
                                 THEN DATEDIFF(MINUTE, j.start_time, GETDATE()) 
                                 ELSE 0 END) as minutes_running 
                    FROM PRODUCTION_JOBS j
                    JOIN " . ITEMS_TABLE . " i ON j.item_id = i.item_id
                    JOIN " . LOCATIONS_TABLE . " l ON j.location_id = l.location_id
                    WHERE j.location_id = ? AND j.status IN ('PENDING', 'RUNNING', 'PAUSED')
                    ORDER BY CASE WHEN j.status = 'RUNNING' THEN 0 WHEN j.status = 'PAUSED' THEN 1 ELSE 2 END, 
                             j.queue_order ASC, j.created_at ASC";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$location_id]);
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
            break;

        case 'move_queue':
            $job_id = $input['job_id'];
            $direction = $input['direction'];
            
            $pdo->beginTransaction();
            $stmt = $pdo->prepare("SELECT queue_order, location_id FROM PRODUCTION_JOBS WITH (UPDLOCK) WHERE job_id = ?");
            $stmt->execute([$job_id]);
            $curr = $stmt->fetch(PDO::FETCH_ASSOC);
            
            $targetOrder = ($direction === 'up') ? $curr['queue_order'] - 1 : $curr['queue_order'] + 1;
            
            $pdo->prepare("UPDATE PRODUCTION_JOBS SET queue_order = ? WHERE location_id = ? AND queue_order = ?")->execute([$curr['queue_order'], $curr['location_id'], $targetOrder]);
            $pdo->prepare("UPDATE PRODUCTION_JOBS SET queue_order = ? WHERE job_id = ?")->execute([$targetOrder, $job_id]);
            
            $pdo->commit();
            echo json_encode(['success' => true]);
            break;

        case 'create_job':
            $location_id = $input['location_id'];
            $item_id = $input['item_id'];
            $target_qty = $input['target_qty'];

            $pdo->beginTransaction();
            $prefix = "WK-" . date('ym') . "-";
            $stmt = $pdo->prepare("SELECT TOP 1 job_no FROM PRODUCTION_JOBS WITH (UPDLOCK) WHERE job_no LIKE ? ORDER BY job_id DESC");
            $stmt->execute([$prefix . '%']);
            $lastJob = $stmt->fetchColumn();

            $nextSeq = $lastJob ? (int)substr($lastJob, -4) + 1 : 1;
            $job_no = $prefix . str_pad($nextSeq, 4, '0', STR_PAD_LEFT);

            $qStmt = $pdo->prepare("SELECT ISNULL(MAX(queue_order), 0) + 1 FROM PRODUCTION_JOBS WHERE location_id = ? AND status = 'PENDING'");
            $qStmt->execute([$location_id]);
            $nextQueue = $qStmt->fetchColumn();

            $sql = "INSERT INTO PRODUCTION_JOBS (job_no, location_id, item_id, target_qty, status, queue_order, created_by, created_at)
                    VALUES (?, ?, ?, ?, 'PENDING', ?, ?, GETDATE())";
            $pdo->prepare($sql)->execute([$job_no, $location_id, $item_id, $target_qty, $nextQueue, $currentUser['id']]);

            $pdo->commit();
            writeLog($pdo, 'CREATE_JOB', 'PRODUCTION_JOBS', $job_no, null, ['location_id' => $location_id, 'item_id' => $item_id, 'target_qty' => $target_qty], "Created new production job");

            echo json_encode(['success' => true, 'message' => "สร้างใบสั่งผลิต {$job_no} สำเร็จ"]);
            break;

        case 'start_job':
            $job_id = $input['job_id'];
            $stmt = $pdo->prepare("SELECT job_no FROM PRODUCTION_JOBS WHERE job_id = ?");
            $stmt->execute([$job_id]);
            $jobNo = $stmt->fetchColumn();

            $sql = "UPDATE PRODUCTION_JOBS SET status = 'RUNNING', start_time = GETDATE() WHERE job_id = ? AND status IN ('PENDING', 'PAUSED')";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$job_id]);

            if ($stmt->rowCount() > 0) {
                writeLog($pdo, 'START_JOB', 'PRODUCTION_JOBS', $jobNo, null, null, "Started or Resumed job");
                echo json_encode(['success' => true, 'message' => "เริ่ม/ทำงานต่อสำเร็จ"]);
            } else { throw new Exception("ไม่สามารถเริ่ม Job ได้"); }
            break;

        case 'pause_job':
            $job_id = $input['job_id'];
            $pdo->beginTransaction();

            $stmt = $pdo->prepare("SELECT job_no, start_time FROM PRODUCTION_JOBS WITH (UPDLOCK) WHERE job_id = ? AND status = 'RUNNING'");
            $stmt->execute([$job_id]);
            $job = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($job && $job['start_time']) {
                $sql = "UPDATE PRODUCTION_JOBS 
                        SET status = 'PAUSED', 
                            total_running_minutes = ISNULL(total_running_minutes, 0) + DATEDIFF(MINUTE, start_time, GETDATE()), 
                            start_time = NULL 
                        WHERE job_id = ?";
                $pdo->prepare($sql)->execute([$job_id]);
                
                $pdo->commit();
                writeLog($pdo, 'PAUSE_JOB', 'PRODUCTION_JOBS', $job['job_no'], null, null, "Paused job");
                echo json_encode(['success' => true, 'message' => "พักการผลิตชั่วคราวแล้ว"]);
            } else {
                $pdo->rollBack();
                throw new Exception("ไม่สามารถพัก Job ได้ (อาจไม่ได้กำลังทำงานอยู่)");
            }
            break;

        case 'record_output':
            $job_id = $input['job_id'];
            $add_actual = (float)($input['actual_qty'] ?? 0);
            $add_hold = (float)($input['hold_qty'] ?? 0);
            $add_scrap = (float)($input['scrap_qty'] ?? 0);

            if ($add_actual <= 0 && $add_hold <= 0 && $add_scrap <= 0) {
                throw new Exception("กรุณาระบุยอดอย่างน้อย 1 ประเภท");
            }

            $pdo->beginTransaction();
            $stmt = $pdo->prepare("SELECT * FROM PRODUCTION_JOBS WITH (UPDLOCK) WHERE job_id = ? AND status IN ('RUNNING', 'PAUSED')");
            $stmt->execute([$job_id]);
            $job = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$job) throw new Exception("ไม่สามารถบันทึกยอดได้");

            $sql = "UPDATE PRODUCTION_JOBS SET actual_qty = ISNULL(actual_qty, 0) + ?, hold_qty = ISNULL(hold_qty, 0) + ?, scrap_qty = ISNULL(scrap_qty, 0) + ? WHERE job_id = ?";
            $pdo->prepare($sql)->execute([$add_actual, $add_hold, $add_scrap, $job_id]);

            $spProd = $pdo->prepare("EXEC dbo.sp_ExecuteProduction @item_id = ?, @location_id = ?, @quantity = ?, @count_type = ?, @lot_no = ?, @notes = ?, @timestamp = ?, @start_time = ?, @end_time = ?, @user_id = ?, @username = ?");
            $timestamp = date('Y-m-d H:i:s');
            $start_time = $job['start_time'] ? date('H:i:s', strtotime($job['start_time'])) : date('H:i:s');
            
            if ($add_actual > 0) $spProd->execute([$job['item_id'], $job['location_id'], $add_actual, 'FG', $job['job_no'], 'Job Output', $timestamp, $start_time, date('H:i:s'), $currentUser['id'], $currentUser['username']]);
            if ($add_hold > 0)   $spProd->execute([$job['item_id'], $job['location_id'], $add_hold, 'HOLD', $job['job_no'], 'Job Hold Output', $timestamp, $start_time, date('H:i:s'), $currentUser['id'], $currentUser['username']]);
            if ($add_scrap > 0)  $spProd->execute([$job['item_id'], $job['location_id'], $add_scrap, 'SCRAP', $job['job_no'], 'Job Scrap Output', $timestamp, $start_time, date('H:i:s'), $currentUser['id'], $currentUser['username']]);

            if ($add_hold > 0) {
                $qaJobNo = $job['job_no'] . '-QA';
                $stmtQA = $pdo->prepare("SELECT job_id FROM PRODUCTION_JOBS WHERE job_no = ? AND status != 'COMPLETED'");
                $stmtQA->execute([$qaJobNo]);
                $existingQA = $stmtQA->fetchColumn();

                if ($existingQA) {
                    $pdo->prepare("UPDATE PRODUCTION_JOBS SET target_qty = target_qty + ? WHERE job_id = ?")->execute([$add_hold, $existingQA]);
                } else {
                    $sqlHold = "INSERT INTO PRODUCTION_JOBS (job_no, location_id, item_id, target_qty, status, queue_order, created_by, created_at) VALUES (?, ?, ?, ?, 'PENDING', 999, ?, GETDATE())";
                    $pdo->prepare($sqlHold)->execute([$qaJobNo, $job['location_id'], $job['item_id'], $add_hold, $currentUser['id']]);
                }
            }

            $pdo->commit();
            writeLog($pdo, 'RECORD_OUTPUT', 'PRODUCTION_JOBS', $job['job_no'], null, $input, "Recorded output");
            echo json_encode(['success' => true, 'message' => "บันทึกยอดพร้อมตัดสต็อกเรียบร้อยแล้ว"]);
            break;

        case 'get_job_logs':
            $job_no = $_GET['job_no'];
            $sql = "SELECT transaction_id as txn_id, FORMAT(transaction_timestamp, 'HH:mm:ss') as txn_time, 
                           REPLACE(transaction_type, 'PRODUCTION_', '') as txn_type, quantity as qty 
                    FROM " . TRANSACTIONS_TABLE . " 
                    WHERE reference_id = ? AND transaction_type LIKE 'PRODUCTION_%' 
                    ORDER BY transaction_id DESC";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$job_no]);
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
            break;

        case 'delete_txn':
            $txn_id = $input['txn_id'];
            $pdo->beginTransaction();
            
            $stmt = $pdo->prepare("SELECT * FROM " . TRANSACTIONS_TABLE . " WITH (UPDLOCK) WHERE transaction_id = ?");
            $stmt->execute([$txn_id]);
            $txn = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$txn) throw new Exception("Transaction not found.");

            $spStock = $pdo->prepare("EXEC dbo." . SP_UPDATE_ONHAND . " @item_id = ?, @location_id = ?, @quantity_to_change = ?");
            $spStock->execute([$txn['parameter_id'], $txn['to_location_id'], -$txn['quantity']]);

            $note_to_find = "Auto-consumed for production ID: " . $txn_id;
            $getConsumeStmt = $pdo->prepare("SELECT parameter_id, quantity, from_location_id FROM " . TRANSACTIONS_TABLE . " WHERE notes = ?");
            $getConsumeStmt->execute([$note_to_find]);
            foreach ($getConsumeStmt->fetchAll(PDO::FETCH_ASSOC) as $item) {
                $loc = $item['from_location_id'] ?: $txn['to_location_id'];
                $spStock->execute([$item['parameter_id'], $loc, -$item['quantity']]);
            }
            $pdo->prepare("DELETE FROM " . TRANSACTIONS_TABLE . " WHERE notes = ?")->execute([$note_to_find]);

            $cType = str_replace('PRODUCTION_', '', $txn['transaction_type']);
            $field = ($cType === 'FG') ? 'actual_qty' : (($cType === 'HOLD') ? 'hold_qty' : 'scrap_qty');
            $pdo->prepare("UPDATE PRODUCTION_JOBS SET $field = CASE WHEN ISNULL($field,0) - ? < 0 THEN 0 ELSE ISNULL($field,0) - ? END WHERE job_no = ?")->execute([$txn['quantity'], $txn['quantity'], $txn['reference_id']]);

            if ($cType === 'HOLD') {
                $pdo->prepare("UPDATE PRODUCTION_JOBS SET target_qty = CASE WHEN target_qty - ? < 0 THEN 0 ELSE target_qty - ? END WHERE job_no = ? AND status != 'COMPLETED'")->execute([$txn['quantity'], $txn['quantity'], $txn['reference_id'].'-QA']);
            }

            $pdo->prepare("DELETE FROM " . TRANSACTIONS_TABLE . " WHERE transaction_id = ?")->execute([$txn_id]);
            $pdo->commit();
            writeLog($pdo, 'DELETE_TXN', 'INVENTORY_API', $txn_id, null, null, "Deleted job transaction");
            echo json_encode(['success' => true, 'message' => "ลบรายการและคืนสต็อกสำเร็จ"]);
            break;

        case 'close_job':
            $job_id = $input['job_id'];
            $sql = "UPDATE PRODUCTION_JOBS SET status = 'COMPLETED', end_time = GETDATE() WHERE job_id = ? AND status = 'RUNNING'";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$job_id]);
            if ($stmt->rowCount() > 0) {
                echo json_encode(['success' => true, 'message' => "ปิดจ๊อบการผลิตเรียบร้อยแล้ว"]);
            } else { throw new Exception("ไม่สามารถปิดจ๊อบได้"); }
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
            $stmt = $pdo->prepare("SELECT status, job_no FROM PRODUCTION_JOBS WHERE job_id = ?");
            $stmt->execute([$job_id]);
            $job = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$job) throw new Exception("ไม่พบข้อมูล Job");

            if ($job['status'] === 'PENDING') {
                $pdo->prepare("DELETE FROM PRODUCTION_JOBS WHERE job_id = ?")->execute([$job_id]);
                echo json_encode(['success' => true, 'message' => "ลบสำเร็จ"]);
            } else if ($job['status'] === 'RUNNING') {
                $pdo->prepare("UPDATE PRODUCTION_JOBS SET status = 'CANCELLED', end_time = GETDATE() WHERE job_id = ?")->execute([$job_id]);
                echo json_encode(['success' => true, 'message' => "ยกเลิกกลางคันสำเร็จ"]);
            } else { throw new Exception("ไม่สามารถลบจ๊อบที่ปิดแล้วได้"); }
            break;

        case 'get_all_jobs':
            $sql = "SELECT j.*, i.part_no, l.location_name, u.fullname as creator_name
                    FROM PRODUCTION_JOBS j
                    JOIN " . ITEMS_TABLE . " i ON j.item_id = i.item_id
                    JOIN " . LOCATIONS_TABLE . " l ON j.location_id = l.location_id
                    LEFT JOIN " . USERS_TABLE . " u ON j.created_by = u.id
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