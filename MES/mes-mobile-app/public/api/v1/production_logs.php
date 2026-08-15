<?php
session_start();
$origin = $_SERVER['HTTP_ORIGIN'] ?? '*';
$allowed_origins = ['http://localhost:5173', 'http://127.0.0.1:5173'];
if (in_array($origin, $allowed_origins) || true) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Access-Control-Allow-Credentials: true');
}
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-CSRF-Token');
header('Content-Type: application/json; charset=utf-8');


if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit(0); }

// Ensure User is Authenticated
if (!isset($_SESSION['user'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized: Please login']);
    exit;
}
$user = $_SESSION['user'];
$userId = $user['id'];

// CSRF Check for POST requests
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $headers = getallheaders();
    $clientToken = $headers['X-CSRF-Token'] ?? $_POST['csrf_token'] ?? '';
    if (empty($_SESSION['csrf_token']) || !hash_equals($_SESSION['csrf_token'], $clientToken)) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'CSRF Token Validation Failed']);
        exit;
    }
}


require_once __DIR__ . '/../../db.php';
if (!defined('TRANSACTIONS_TABLE')) {
    require_once __DIR__ . '/../../config/config.php';
}

function attachTeamUsers($pdo, $data) {
    if (count($data) === 0) return $data;
    $txnIds = array_column($data, 'transaction_id');
    $inClause = implode(',', array_fill(0, count($txnIds), '?'));
    $tuStmt = $pdo->prepare("SELECT stu.transaction_id, ISNULL(NULLIF(tu.fullname, ''), tu.username) AS name
                             FROM dbo.STOCK_TRANSACTION_USERS stu
                             INNER JOIN USERS tu ON stu.user_id = tu.id
                             WHERE stu.transaction_id IN ($inClause)");
    $tuStmt->execute($txnIds);
    $tuData = $tuStmt->fetchAll(PDO::FETCH_ASSOC);
    $tuMap = [];
    foreach ($tuData as $tu) {
        $tuMap[$tu['transaction_id']][] = ['name' => $tu['name']];
    }
    foreach ($data as &$row) {
        $tid = $row['transaction_id'];
        $row['team_users'] = isset($tuMap[$tid]) ? json_encode($tuMap[$tid]) : null;
    }
    return $data;
}

$action = $_GET['action'] ?? $_POST['action'] ?? '';
$machineId = $_GET['machine_id'] ?? $_POST['machine_id'] ?? null;
$locationId = $_GET['location_id'] ?? $_POST['location_id'] ?? null;

try {
    if (!$machineId && !$locationId && !in_array($action, ['team_history', 'global_history', 'void', 'edit'])) {
        throw new Exception("Machine ID or Location ID is required");
    }

    // 1. Fetch History
    if ($action === 'history') {
        // Fetch recent transactions for this machine today
        // Fetch recent transactions for this machine today
        $sql = "SELECT t.transaction_id, t.transaction_type, t.quantity, t.transaction_timestamp, 
                ISNULL(NULLIF(u.fullname, ''), u.username) AS user_name, t.notes, t.reference_id as job_no 
                FROM " . TRANSACTIONS_TABLE . " t
                LEFT JOIN " . USERS_TABLE . " u ON t.created_by_user_id = u.id
                WHERE " . ($machineId ? "t.machine_id = ?" : "t.to_location_id = ?") . " 
                AND t.transaction_type IN ('PRODUCTION_FG', 'PRODUCTION_HOLD', 'PRODUCTION_SCRAP')
                AND CAST(t.transaction_timestamp AS DATE) = CAST(GETDATE() AS DATE)
                ORDER BY t.transaction_timestamp DESC";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$machineId ?: $locationId]);
        $history = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $history = attachTeamUsers($pdo, $history);
        
        echo json_encode(['success' => true, 'data' => $history]);
    }

    // 1.5 Fetch Team History (across all machines)
    else if ($action === 'team_history') {
        $userIds = $_GET['user_ids'] ?? $_POST['user_ids'] ?? '';
        if (!$userIds) {
            echo json_encode(['success' => true, 'data' => []]);
            exit;
        }

        $idArray = array_filter(array_map('intval', explode(',', $userIds)));
        if (empty($idArray)) {
            echo json_encode(['success' => true, 'data' => []]);
            exit;
        }

        $placeholders = implode(',', array_fill(0, count($idArray), '?'));
        
        $sql = "SELECT TOP 50 t.transaction_id, t.transaction_type, t.quantity, t.transaction_timestamp, t.created_by_user_id, t.notes, t.reference_id as job_no, m.machine_name, l.location_name
                FROM " . TRANSACTIONS_TABLE . " t
                LEFT JOIN " . PE_MACHINES_TABLE . " m ON t.machine_id = m.machine_id
                LEFT JOIN " . LOCATIONS_TABLE . " l ON t.to_location_id = l.location_id
                WHERE t.created_by_user_id IN ($placeholders)
                AND t.transaction_type IN ('PRODUCTION_FG', 'PRODUCTION_HOLD', 'PRODUCTION_SCRAP')
                ORDER BY t.transaction_timestamp DESC";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($idArray);
        $history = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $history = attachTeamUsers($pdo, $history);
        
        echo json_encode(['success' => true, 'data' => $history]);
    }

    // 1.6 Fetch Global History (All transactions for current working day 08:00-08:00)
    else if ($action === 'global_history') {
        $sql = "SELECT t.transaction_id, t.transaction_type, t.quantity, t.transaction_timestamp, t.created_by_user_id, t.notes, t.reference_id as job_no, m.machine_name, l.location_name, ISNULL(NULLIF(u.fullname, ''), u.username) as user_name
                FROM " . TRANSACTIONS_TABLE . " t
                LEFT JOIN " . PE_MACHINES_TABLE . " m ON t.machine_id = m.machine_id
                LEFT JOIN " . LOCATIONS_TABLE . " l ON t.to_location_id = l.location_id
                LEFT JOIN USERS u ON t.created_by_user_id = u.id
                WHERE t.transaction_type IN ('PRODUCTION_FG', 'PRODUCTION_HOLD', 'PRODUCTION_SCRAP')
                AND CAST(DATEADD(HOUR, -8, t.transaction_timestamp) AS DATE) = CAST(DATEADD(HOUR, -8, GETDATE()) AS DATE)
                ORDER BY t.transaction_timestamp DESC";
        $stmt = $pdo->query($sql);
        $history = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $history = attachTeamUsers($pdo, $history);
        
        echo json_encode(['success' => true, 'data' => $history]);
    }
    
    // 2. Insert Log
    else if ($action === 'log') {
        $type = $_POST['type'] ?? 'FG'; // FG, SCRAP, or HOLD
        $qty = round((float)($_POST['qty'] ?? 0), 3);
        $jobId = $_POST['job_id'] ?? null;
        $locationId = $_POST['location_id'] ?? null;
        
        // NEW FIELDS
        $lotNo = $_POST['lot_no'] ?? null;
        $timeSlot = $_POST['time_slot'] ?? null; // format: "08:00:00|08:59:59"
        $sapNo = $_POST['sap_no'] ?? null;
        $customNotes = $_POST['notes'] ?? '';
        $teamUserIds = $_POST['team_user_ids'] ?? null;

        if ($qty <= 0) throw new Exception("Quantity must be greater than 0");

        if ($jobId) {
            // New Flow: Log against a specific Job Order
            // Fetch Job details
            $stmt = $pdo->prepare("SELECT job_no, item_id, location_id, start_time, status, target_qty, actual_qty FROM PRODUCTION_JOBS WITH (NOLOCK) WHERE job_id = ?");
            $stmt->execute([$jobId]);
            $job = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$job) throw new Exception("Job not found");
            if (in_array(strtoupper($job['status']), ['COMPLETED', 'CLOSED'])) {
                throw new Exception("Cannot log transaction for a closed/completed Job.");
            }

            if ($type === 'FG') {
                $current_actual = (float)($job['actual_qty'] ?? 0);
                $target = (float)($job['target_qty'] ?? 0);
                if (($current_actual + $qty) > $target) {
                    throw new Exception("Over-production detected. Target: {$target}, Current Actual: {$current_actual}, Attempted: {$qty}. Cannot exceed target quantity.");
                }
            }

            $add_actual = $type === 'FG' ? $qty : 0;
            $add_hold = $type === 'HOLD' ? $qty : 0;
            $add_scrap = $type === 'SCRAP' ? $qty : 0;

            // Update Job Quantities
            $sql = "UPDATE PRODUCTION_JOBS SET actual_qty = ISNULL(actual_qty, 0) + ?, hold_qty = ISNULL(hold_qty, 0) + ?, scrap_qty = ISNULL(scrap_qty, 0) + ? WHERE job_id = ?";
            $pdo->prepare($sql)->execute([$add_actual, $add_hold, $add_scrap, $jobId]);

            // Execute Production SP to deduct BOM & Update Stock
            $spProd = $pdo->prepare("EXEC dbo.sp_ExecuteProduction @item_id = ?, @location_id = ?, @quantity = ?, @count_type = ?, @lot_no = ?, @notes = ?, @timestamp = ?, @start_time = ?, @end_time = ?, @user_id = ?, @username = ?, @machine_id = ?, @team_user_ids = ?");
            $ts = date('Y-m-d H:i:s');
            
            // Parse timeSlot if provided
            $st = $job['start_time'] ? date('H:i:s', strtotime($job['start_time'])) : date('H:i:s');
            $et = date('H:i:s');
            if ($timeSlot && strpos($timeSlot, '|') !== false) {
                list($st, $et) = explode('|', $timeSlot);
            }

            $note = $customNotes ?: '';
            
            $locToUse = $locationId ?: $job['location_id'];
            $lotToUse = $lotNo ?: $job['job_no'];

            if ($add_actual > 0) $spProd->execute([$job['item_id'], $locToUse, $add_actual, 'FG', $lotToUse, $note, $ts, $st, $et, $userId, 'Mobile', $machineId, $teamUserIds]);
            if ($add_hold > 0)   $spProd->execute([$job['item_id'], $locToUse, $add_hold, 'HOLD', $lotToUse, $note, $ts, $st, $et, $userId, 'Mobile', $machineId, $teamUserIds]);
            if ($add_scrap > 0)  $spProd->execute([$job['item_id'], $locToUse, $add_scrap, 'SCRAP', $lotToUse, $note, $ts, $st, $et, $userId, 'Mobile', $machineId, $teamUserIds]);

        } else {
            // Old Flow: Direct insert without Job
            $transType = 'PRODUCTION_FG';
            if ($type === 'SCRAP') $transType = 'PRODUCTION_SCRAP';
            else if ($type === 'HOLD') $transType = 'PRODUCTION_HOLD';

            $note = $customNotes ?: '';
            if ($timeSlot) $note .= ($note ? " | " : "") . "[TIME: $timeSlot]";
            
            // Resolve SAP No to Item ID if provided
            $itemId = null;
            if ($sapNo) {
                $itemStmt = $pdo->prepare("SELECT item_id FROM " . ITEMS_TABLE . " WHERE sap_no = ?");
                $itemStmt->execute([$sapNo]);
                $itemId = $itemStmt->fetchColumn();
            }

            $sql = "INSERT INTO " . TRANSACTIONS_TABLE . " 
                    (transaction_type, quantity, created_by_user_id, notes, transaction_timestamp, machine_id, to_location_id, reference_id, parameter_id)
                    VALUES (?, ?, ?, ?, GETDATE(), ?, ?, ?, ?)";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$transType, $qty, $userId, $note, $machineId, $locationId, $lotNo, $itemId]);
            $newTxnId = $pdo->lastInsertId();
            
            if ($teamUserIds && trim($teamUserIds) !== '') {
                $ids = array_filter(explode(',', $teamUserIds));
                $teamSize = count($ids);
                if ($teamSize > 0) {
                    $ratio = 1.0 / $teamSize;
                    $teamStmt = $pdo->prepare("INSERT INTO STOCK_TRANSACTION_USERS (transaction_id, user_id, head_count_ratio) VALUES (?, ?, ?)");
                    foreach ($ids as $tid) {
                        $teamStmt->execute([$newTxnId, trim($tid), $ratio]);
                    }
                }
            } else {
                $pdo->prepare("INSERT INTO STOCK_TRANSACTION_USERS (transaction_id, user_id, head_count_ratio) VALUES (?, ?, ?)")->execute([$newTxnId, $userId, 1.0]);
            }
        }

        echo json_encode(['success' => true, 'message' => "Logged $qty $type"]);
    }

    // 3. Void Log
    else if ($action === 'void') {
        $transactionId = $_POST['transaction_id'] ?? null;
        if (!$transactionId) throw new Exception("Transaction ID required");

        // Verify Ownership or Role
        $stmt = $pdo->prepare("SELECT created_by_user_id FROM " . TRANSACTIONS_TABLE . " WHERE transaction_id = ?");
        $stmt->execute([$transactionId]);
        $ownerId = $stmt->fetchColumn();
        if ($ownerId != $userId && !in_array($user['role'], ['admin', 'supervisor'])) {
            throw new Exception("Unauthorized to void this transaction");
        }


        // Check if transaction has a Job No
        $stmt = $pdo->prepare("SELECT reference_id FROM " . TRANSACTIONS_TABLE . " WHERE transaction_id = ?");
        $stmt->execute([$transactionId]);
        $jobNo = $stmt->fetchColumn();

        $jobId = null;
        if ($jobNo) {
            $stmt = $pdo->prepare("SELECT job_id, status FROM PRODUCTION_JOBS WHERE job_no = ?");
            $stmt->execute([$jobNo]);
            $jobData = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($jobData) {
                if (in_array(strtoupper($jobData['status']), ['COMPLETED', 'CLOSED'])) {
                    throw new Exception("Cannot void transaction for a closed/completed Job.");
                }
                $jobId = $jobData['job_id'];
            }
        }

        $stmt = $pdo->prepare("EXEC dbo.sp_Job_DeleteTransaction @txn_id = ?, @job_id = ?, @user_id = ?");
        $stmt->execute([$transactionId, $jobId, $userId]);

        echo json_encode(['success' => true, 'message' => "Record voided"]);
    }

    // 4. Edit Log
    else if ($action === 'edit') {
        $transactionId = $_POST['transaction_id'] ?? null;
        $newQty = (float)($_POST['qty'] ?? 0);
        $teamUserIds = $_POST['team_user_ids'] ?? null;
        if (!$transactionId || $newQty <= 0) throw new Exception("Invalid parameters");

        // Simple approach: Delete old transaction (void) and insert new one
        $stmt = $pdo->prepare("SELECT * FROM " . TRANSACTIONS_TABLE . " WHERE transaction_id = ?");
        $stmt->execute([$transactionId]);
        $oldTxn = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$oldTxn) throw new Exception("Transaction not found");

        if ($oldTxn['created_by_user_id'] != $userId && !in_array($user['role'], ['admin', 'supervisor'])) {
            throw new Exception("Unauthorized to edit this transaction");
        }

        
        $jobNo = $oldTxn['reference_id'];
        $typeStr = str_replace('PRODUCTION_', '', $oldTxn['transaction_type']); // FG, HOLD, SCRAP

        // Step 1: Fetch old team users to preserve them
        $stmt = $pdo->prepare("SELECT user_id FROM STOCK_TRANSACTION_USERS WHERE transaction_id = ?");
        $stmt->execute([$transactionId]);
        $oldTeamIds = $stmt->fetchAll(PDO::FETCH_COLUMN);
        $preservedTeamUserIds = implode(',', $oldTeamIds);

        // Step 2: Void Old
        $jobId = null;
        if ($jobNo) {
            $stmt = $pdo->prepare("SELECT job_id, status FROM PRODUCTION_JOBS WHERE job_no = ?");
            $stmt->execute([$jobNo]);
            $jobData = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($jobData) {
                if (in_array(strtoupper($jobData['status']), ['COMPLETED', 'CLOSED'])) {
                    throw new Exception("Cannot edit transaction for a closed/completed Job.");
                }
                $jobId = $jobData['job_id'];
            }
        }

        $stmt = $pdo->prepare("EXEC dbo.sp_Job_DeleteTransaction @txn_id = ?, @job_id = ?, @user_id = ?");
        $stmt->execute([$transactionId, $jobId, $userId]);

        // Step 3: Insert New (using the same logic as 'log')
        $job = null;
        if ($jobNo) {
            $stmt = $pdo->prepare("SELECT job_id, item_id, location_id, start_time, job_no, target_qty, actual_qty FROM PRODUCTION_JOBS WITH (NOLOCK) WHERE job_no = ?");
            $stmt->execute([$jobNo]);
            $job = $stmt->fetch(PDO::FETCH_ASSOC);
        }

        $oldTimestamp = date('Y-m-d H:i:s', strtotime($oldTxn['transaction_timestamp']));

        if ($job) {
            if ($typeStr === 'FG') {
                $current_actual = (float)($job['actual_qty'] ?? 0);
                $target = (float)($job['target_qty'] ?? 0);
                if (($current_actual + $newQty) > $target) {
                    throw new Exception("Over-production detected. Target: {$target}, Current Actual: {$current_actual}, Attempted: {$newQty}. Cannot exceed target quantity.");
                }
            }

            $add_actual = $typeStr === 'FG' ? $newQty : 0;
            $add_hold = $typeStr === 'HOLD' ? $newQty : 0;
            $add_scrap = $typeStr === 'SCRAP' ? $newQty : 0;

            $sql = "UPDATE PRODUCTION_JOBS SET actual_qty = ISNULL(actual_qty, 0) + ?, hold_qty = ISNULL(hold_qty, 0) + ?, scrap_qty = ISNULL(scrap_qty, 0) + ? WHERE job_id = ?";
            $pdo->prepare($sql)->execute([$add_actual, $add_hold, $add_scrap, $job['job_id']]);

            $spProd = $pdo->prepare("EXEC dbo.sp_ExecuteProduction @item_id = ?, @location_id = ?, @quantity = ?, @count_type = ?, @lot_no = ?, @notes = ?, @timestamp = ?, @start_time = ?, @end_time = ?, @user_id = ?, @username = ?, @machine_id = ?, @team_user_ids = ?");
            $st = $job['start_time'] ? date('H:i:s', strtotime($job['start_time'])) : date('H:i:s');
            $et = date('H:i:s', strtotime($oldTxn['transaction_timestamp']));
            $note = $oldTxn['notes'] . " (Edited)";
            $locToUse = $locationId ?: $oldTxn['to_location_id'];
            $macToUse = $machineId ?: $oldTxn['machine_id'];

            if ($add_actual > 0) $spProd->execute([$job['item_id'], $locToUse, $add_actual, 'FG', $job['job_no'], $note, $oldTimestamp, $st, $et, $userId, 'Mobile', $macToUse, $preservedTeamUserIds]);
            if ($add_hold > 0)   $spProd->execute([$job['item_id'], $locToUse, $add_hold, 'HOLD', $job['job_no'], $note, $oldTimestamp, $st, $et, $userId, 'Mobile', $macToUse, $preservedTeamUserIds]);
            if ($add_scrap > 0)  $spProd->execute([$job['item_id'], $locToUse, $add_scrap, 'SCRAP', $job['job_no'], $note, $oldTimestamp, $st, $et, $userId, 'Mobile', $macToUse, $preservedTeamUserIds]);
        } else {
            $note = $oldTxn['notes'] . " (Edited)";
            $macToUse = $machineId ?: $oldTxn['machine_id'];
            $locToUse = $locationId ?: $oldTxn['to_location_id'];
            
            $sql = "INSERT INTO " . TRANSACTIONS_TABLE . " 
                    (transaction_type, quantity, created_by_user_id, notes, transaction_timestamp, machine_id, from_location_id, to_location_id, reference_id, parameter_id)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                $oldTxn['transaction_type'], 
                $newQty, 
                $userId, 
                $note, 
                $oldTimestamp, 
                $macToUse, 
                $oldTxn['from_location_id'], 
                $locToUse, 
                $oldTxn['reference_id'], 
                $oldTxn['parameter_id']
            ]);
            $newTxnId = $pdo->lastInsertId();

            if ($preservedTeamUserIds && trim($preservedTeamUserIds) !== '') {
                $ids = array_filter(explode(',', $preservedTeamUserIds));
                $teamSize = count($ids);
                if ($teamSize > 0) {
                    $ratio = 1.0 / $teamSize;
                    $teamStmt = $pdo->prepare("INSERT INTO STOCK_TRANSACTION_USERS (transaction_id, user_id, head_count_ratio) VALUES (?, ?, ?)");
                    foreach ($ids as $tid) {
                        $teamStmt->execute([$newTxnId, trim($tid), $ratio]);
                    }
                }
            } else {
                $pdo->prepare("INSERT INTO STOCK_TRANSACTION_USERS (transaction_id, user_id, head_count_ratio) VALUES (?, ?, ?)")->execute([$newTxnId, $userId, 1.0]);
            }
        }

        echo json_encode(['success' => true, 'message' => "Record edited"]);
    }

    else {
        throw new Exception("Invalid action");
    }

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
