<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit(0); }

require_once __DIR__ . '/../../db.php';
if (!defined('TRANSACTIONS_TABLE')) {
    require_once __DIR__ . '/../../config/config.php';
}

$action = $_GET['action'] ?? $_POST['action'] ?? '';
$machineId = $_GET['machine_id'] ?? $_POST['machine_id'] ?? null;

try {
    if (!$machineId && !in_array($action, ['team_history', 'global_history', 'void', 'edit'])) {
        throw new Exception("Machine ID is required");
    }

    // 1. Fetch History
    if ($action === 'history') {
        // Fetch recent transactions for this machine today
        // Assuming location_id or another field stores machine_id. Let's use reference_no or notes to store machine_id temporarily if not explicit.
        // Wait, what column in STOCK_TRANSACTIONS maps to machine? Usually parameter_id is Item.
        // I will use `notes` like '[MACHINE:123]' for now unless there is a machine_id column.
        $sql = "SELECT t.transaction_id, t.transaction_type, t.quantity, t.transaction_timestamp, 
                ISNULL(NULLIF(u.fullname, ''), u.username) AS user_name, t.notes, t.reference_id as job_no 
                FROM " . TRANSACTIONS_TABLE . " t
                LEFT JOIN " . USERS_TABLE . " u ON t.created_by_user_id = u.id
                WHERE t.machine_id = ? 
                AND t.transaction_type IN ('PRODUCTION_FG', 'PRODUCTION_HOLD', 'PRODUCTION_SCRAP')
                AND CAST(t.transaction_timestamp AS DATE) = CAST(GETDATE() AS DATE)
                ORDER BY t.transaction_timestamp DESC";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$machineId]);
        $history = $stmt->fetchAll();
        
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
        $history = $stmt->fetchAll();
        
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
        $history = $stmt->fetchAll();
        
        echo json_encode(['success' => true, 'data' => $history]);
    }
    
    // 2. Insert Log
    else if ($action === 'log') {
        $type = $_POST['type'] ?? 'FG'; // FG, SCRAP, or HOLD
        $qty = (float)($_POST['qty'] ?? 0);
        $userId = $_POST['user_id'] ?? 1; // Default to 1 if no auth
        $jobId = $_POST['job_id'] ?? null;
        $locationId = $_POST['location_id'] ?? null;

        if ($qty <= 0) throw new Exception("Quantity must be greater than 0");

        if ($jobId) {
            // New Flow: Log against a specific Job Order
            // Fetch Job details
            $stmt = $pdo->prepare("SELECT job_no, item_id, location_id, start_time FROM PRODUCTION_JOBS WITH (NOLOCK) WHERE job_id = ?");
            $stmt->execute([$jobId]);
            $job = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$job) throw new Exception("Job not found");

            $add_actual = $type === 'FG' ? $qty : 0;
            $add_hold = $type === 'HOLD' ? $qty : 0;
            $add_scrap = $type === 'SCRAP' ? $qty : 0;

            // Update Job Quantities
            $sql = "UPDATE PRODUCTION_JOBS SET actual_qty = ISNULL(actual_qty, 0) + ?, hold_qty = ISNULL(hold_qty, 0) + ?, scrap_qty = ISNULL(scrap_qty, 0) + ? WHERE job_id = ?";
            $pdo->prepare($sql)->execute([$add_actual, $add_hold, $add_scrap, $jobId]);

            // Execute Production SP to deduct BOM & Update Stock
            $spProd = $pdo->prepare("EXEC dbo.sp_ExecuteProduction @item_id = ?, @location_id = ?, @quantity = ?, @count_type = ?, @lot_no = ?, @notes = ?, @timestamp = ?, @start_time = ?, @end_time = ?, @user_id = ?, @username = ?");
            $ts = date('Y-m-d H:i:s');
            $st = $job['start_time'] ? date('H:i:s', strtotime($job['start_time'])) : date('H:i:s');
            $et = date('H:i:s');
            $note = "[MACHINE:" . ($machineId ?: '') . "] Mobile App " . time();
            $locToUse = $locationId ?: $job['location_id'];

            if ($add_actual > 0) $spProd->execute([$job['item_id'], $locToUse, $add_actual, 'FG', $job['job_no'], $note, $ts, $st, $et, $userId, 'Mobile']);
            if ($add_hold > 0)   $spProd->execute([$job['item_id'], $locToUse, $add_hold, 'HOLD', $job['job_no'], $note, $ts, $st, $et, $userId, 'Mobile']);
            if ($add_scrap > 0)  $spProd->execute([$job['item_id'], $locToUse, $add_scrap, 'SCRAP', $job['job_no'], $note, $ts, $st, $et, $userId, 'Mobile']);

            // Update machine_id since SP doesn't take it
            if ($machineId) {
                $pdo->prepare("UPDATE " . TRANSACTIONS_TABLE . " SET machine_id = ? WHERE notes = ?")
                    ->execute([$machineId, $note]);
            }

        } else {
            // Old Flow: Direct insert without Job
            $transType = 'PRODUCTION_FG';
            if ($type === 'SCRAP') $transType = 'PRODUCTION_SCRAP';
            else if ($type === 'HOLD') $transType = 'PRODUCTION_HOLD';

            $note = "Mobile App Entry";
            $sql = "INSERT INTO " . TRANSACTIONS_TABLE . " 
                    (transaction_type, quantity, created_by_user_id, notes, transaction_timestamp, machine_id, to_location_id)
                    VALUES (?, ?, ?, ?, GETDATE(), ?, ?)";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$transType, $qty, $userId, $note, $machineId, $locationId]);
        }

        echo json_encode(['success' => true, 'message' => "Logged $qty $type"]);
    }

    // 3. Void Log
    else if ($action === 'void') {
        $transactionId = $_POST['transaction_id'] ?? null;
        if (!$transactionId) throw new Exception("Transaction ID required");

        // Check if transaction has a Job No
        $stmt = $pdo->prepare("SELECT reference_id FROM " . TRANSACTIONS_TABLE . " WHERE transaction_id = ?");
        $stmt->execute([$transactionId]);
        $jobNo = $stmt->fetchColumn();

        if ($jobNo && str_starts_with($jobNo, 'WK-')) {
            // Get Job ID from Job No
            $stmt = $pdo->prepare("SELECT job_id FROM PRODUCTION_JOBS WHERE job_no = ?");
            $stmt->execute([$jobNo]);
            $jobId = $stmt->fetchColumn();

            if ($jobId) {
                $stmt = $pdo->prepare("EXEC dbo.sp_Job_DeleteTransaction @txn_id = ?, @job_id = ?, @user_id = ?");
                $stmt->execute([$transactionId, $jobId, 1]); // Assume user 1 for now
            } else {
                $pdo->prepare("DELETE FROM " . TRANSACTIONS_TABLE . " WHERE transaction_id = ?")->execute([$transactionId]);
            }
        } else {
            $pdo->prepare("DELETE FROM " . TRANSACTIONS_TABLE . " WHERE transaction_id = ?")->execute([$transactionId]);
        }

        echo json_encode(['success' => true, 'message' => "Record voided"]);
    }

    // 4. Edit Log
    else if ($action === 'edit') {
        $transactionId = $_POST['transaction_id'] ?? null;
        $newQty = (float)($_POST['qty'] ?? 0);
        if (!$transactionId || $newQty <= 0) throw new Exception("Invalid parameters");

        // Simple approach: Delete old transaction (void) and insert new one
        // Check if transaction has a Job No
        $stmt = $pdo->prepare("SELECT reference_id, transaction_type, notes FROM " . TRANSACTIONS_TABLE . " WHERE transaction_id = ?");
        $stmt->execute([$transactionId]);
        $oldTxn = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$oldTxn) throw new Exception("Transaction not found");
        
        $jobNo = $oldTxn['reference_id'];
        $typeStr = str_replace('PRODUCTION_', '', $oldTxn['transaction_type']); // FG, HOLD, SCRAP

        // Step 1: Void Old
        if ($jobNo && str_starts_with($jobNo, 'WK-')) {
            $stmt = $pdo->prepare("SELECT job_id FROM PRODUCTION_JOBS WHERE job_no = ?");
            $stmt->execute([$jobNo]);
            $jobId = $stmt->fetchColumn();

            if ($jobId) {
                $stmt = $pdo->prepare("EXEC dbo.sp_Job_DeleteTransaction @txn_id = ?, @job_id = ?, @user_id = ?");
                $stmt->execute([$transactionId, $jobId, 1]);
            } else {
                $pdo->prepare("DELETE FROM " . TRANSACTIONS_TABLE . " WHERE transaction_id = ?")->execute([$transactionId]);
            }
        } else {
            $pdo->prepare("DELETE FROM " . TRANSACTIONS_TABLE . " WHERE transaction_id = ?")->execute([$transactionId]);
        }

        // Step 2: Insert New (using the same logic as 'log')
        if ($jobNo && str_starts_with($jobNo, 'WK-')) {
            $stmt = $pdo->prepare("SELECT job_id, item_id, location_id, start_time FROM PRODUCTION_JOBS WITH (NOLOCK) WHERE job_no = ?");
            $stmt->execute([$jobNo]);
            $job = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($job) {
                $add_actual = $typeStr === 'FG' ? $newQty : 0;
                $add_hold = $typeStr === 'HOLD' ? $newQty : 0;
                $add_scrap = $typeStr === 'SCRAP' ? $newQty : 0;

                $sql = "UPDATE PRODUCTION_JOBS SET actual_qty = ISNULL(actual_qty, 0) + ?, hold_qty = ISNULL(hold_qty, 0) + ?, scrap_qty = ISNULL(scrap_qty, 0) + ? WHERE job_id = ?";
                $pdo->prepare($sql)->execute([$add_actual, $add_hold, $add_scrap, $job['job_id']]);

                $spProd = $pdo->prepare("EXEC dbo.sp_ExecuteProduction @item_id = ?, @location_id = ?, @quantity = ?, @count_type = ?, @lot_no = ?, @notes = ?, @timestamp = ?, @start_time = ?, @end_time = ?, @user_id = ?, @username = ?");
                $ts = date('Y-m-d H:i:s');
                $st = $job['start_time'] ? date('H:i:s', strtotime($job['start_time'])) : date('H:i:s');
                $et = date('H:i:s');
                $note = $oldTxn['notes'] . " (Edited)";
                $locToUse = $locationId ?: $job['location_id'];

                if ($add_actual > 0) $spProd->execute([$job['item_id'], $locToUse, $add_actual, 'FG', $job['job_no'], $note, $ts, $st, $et, $userId, 'Mobile']);
                if ($add_hold > 0)   $spProd->execute([$job['item_id'], $locToUse, $add_hold, 'HOLD', $job['job_no'], $note, $ts, $st, $et, $userId, 'Mobile']);
                if ($add_scrap > 0)  $spProd->execute([$job['item_id'], $locToUse, $add_scrap, 'SCRAP', $job['job_no'], $note, $ts, $st, $et, $userId, 'Mobile']);

                if ($machineId) {
                    $pdo->prepare("UPDATE " . TRANSACTIONS_TABLE . " SET machine_id = ? WHERE notes = ?")
                        ->execute([$machineId, $note]);
                }
            }
        } else {
            $note = $oldTxn['notes'] . " (Edited)";
            $sql = "INSERT INTO " . TRANSACTIONS_TABLE . " 
                    (transaction_type, quantity, created_by_user_id, notes, transaction_timestamp, machine_id, to_location_id)
                    VALUES (?, ?, ?, ?, GETDATE(), ?, ?)";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$oldTxn['transaction_type'], $newQty, $userId, $note, $machineId, $locationId]);
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
