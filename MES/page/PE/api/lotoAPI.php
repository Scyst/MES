<?php
// MES/page/PE/api/lotoAPI.php
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../components/init.php';

requirePermission(['view_maintenance', 'view_production', 'view_dashboard']);

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    if (!isset($_SERVER['HTTP_X_CSRF_TOKEN']) || !isset($_SESSION['csrf_token']) || !hash_equals($_SESSION['csrf_token'], $_SERVER['HTTP_X_CSRF_TOKEN'])) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'CSRF token validation failed.']);
        exit;
    }
}

$input = json_decode(file_get_contents("php://input"), true) ?? $_POST;
$action = $_REQUEST['action'] ?? $input['action'] ?? '';

try {
    switch ($action) {
        case 'lock':
            $machine_id = $input['machine_id'] ?? null;
            $wo_id = $input['wo_id'] ?? null;
            $locked_by = trim($input['locked_by'] ?? '');
            $reason = trim($input['reason'] ?? '');

            if (!$machine_id || !$locked_by) {
                echo json_encode(['success' => false, 'message' => 'Missing machine or technician name']);
                exit;
            }

            $pdo->beginTransaction();

            // Check if already locked
            $stmt = $pdo->prepare("SELECT is_loto FROM " . PE_MACHINES_TABLE . " WHERE machine_id = ?");
            $stmt->execute([$machine_id]);
            $is_locked = $stmt->fetchColumn();

            if ($is_locked) {
                $pdo->rollBack();
                echo json_encode(['success' => false, 'message' => 'Machine is already locked out!']);
                exit;
            }

            // Update machine status
            $stmt = $pdo->prepare("UPDATE " . PE_MACHINES_TABLE . " SET is_loto = 1, loto_reason = ? WHERE machine_id = ?");
            $stmt->execute([$reason, $machine_id]);

            // Create Log
            $stmt = $pdo->prepare("INSERT INTO dbo.PE_LOTO_LOGS (machine_id, wo_id, locked_by, status) VALUES (?, ?, ?, 'Locked')");
            $stmt->execute([$machine_id, $wo_id ?: null, $locked_by]);

            // Check criticality for Line Notify
            $stmt = $pdo->prepare("SELECT machine_name, criticality, area FROM " . PE_MACHINES_TABLE . " WHERE machine_id = ?");
            $stmt->execute([$machine_id]);
            $machine_info = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($machine_info && in_array($machine_info['criticality'], ['High', 'Critical'])) {
                // Insert into In-App Notification Center
                $title = "⚠️ LOTO ALERT: " . $machine_info['machine_name'];
                $msg = "เครื่องจักรสำคัญถูก Lock Out โดย $locked_by\nเหตุผล: $reason";
                
                $stmt = $pdo->prepare("INSERT INTO dbo.PE_NOTIFICATIONS (module, ref_id, title, message, alert_level) VALUES ('LOTO', ?, ?, ?, 'danger')");
                $stmt->execute([$machine_id, $title, $msg]);
            }

            writeLog('LOTO_LOCK', "Machine $machine_id locked by $locked_by. Reason: $reason", null, $input);
            $pdo->commit();

            echo json_encode(['success' => true, 'message' => 'LOTO applied successfully']);
            break;

        case 'unlock':
            $machine_id = $input['machine_id'] ?? null;
            $unlocked_by = trim($input['unlocked_by'] ?? '');
            $unlocked_pin = trim($input['unlocked_pin'] ?? '');
            
            if (!$machine_id || !$unlocked_by || !$unlocked_pin) {
                echo json_encode(['success' => false, 'message' => 'Missing machine, supervisor name, or PIN']);
                exit;
            }

            // Verify PIN against USERS table
            $stmt = $pdo->prepare("SELECT password FROM USERS WHERE username = ? AND is_active = 1");
            $stmt->execute([$unlocked_by]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$user || !password_verify($unlocked_pin, $user['password'])) {
                echo json_encode(['success' => false, 'message' => 'Invalid username or PIN']);
                exit;
            }

            $pdo->beginTransaction();

            $stmt = $pdo->prepare("UPDATE " . PE_MACHINES_TABLE . " SET is_loto = 0, loto_reason = NULL WHERE machine_id = ?");
            $stmt->execute([$machine_id]);

            // Update latest active log
            $stmt = $pdo->prepare("
                UPDATE dbo.PE_LOTO_LOGS 
                SET unlocked_by = ?, unlocked_at = GETDATE(), status = 'Unlocked', updated_at = GETDATE()
                WHERE machine_id = ? AND status = 'Locked'
            ");
            $stmt->execute([$unlocked_by, $machine_id]);

            // Check criticality for Line Notify
            $stmt = $pdo->prepare("SELECT machine_name, criticality, area FROM " . PE_MACHINES_TABLE . " WHERE machine_id = ?");
            $stmt->execute([$machine_id]);
            $machine_info = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($machine_info && in_array($machine_info['criticality'], ['High', 'Critical'])) {
                // Clear the active notification
                $stmt = $pdo->prepare("UPDATE dbo.PE_NOTIFICATIONS SET is_active = 0 WHERE module = 'LOTO' AND ref_id = ?");
                $stmt->execute([$machine_id]);
                
                // Insert a success notification (optional, maybe auto-clear is enough)
                // For now, let's just clear it to keep the bell clean.
            }

            writeLog('LOTO_UNLOCK', "Machine $machine_id unlocked by $unlocked_by", null, $input);
            $pdo->commit();

            echo json_encode(['success' => true, 'message' => 'LOTO removed successfully']);
            break;

        case 'status':
            $machine_id = $_GET['machine_id'] ?? null;
            if (!$machine_id) {
                echo json_encode(['success' => false, 'message' => 'Missing machine_id']);
                exit;
            }

            $stmt = $pdo->prepare("
                SELECT M.is_loto, M.loto_reason, L.locked_by, L.locked_at, L.wo_id 
                FROM " . PE_MACHINES_TABLE . " M
                LEFT JOIN dbo.PE_LOTO_LOGS L ON M.machine_id = L.machine_id AND L.status = 'Locked'
                WHERE M.machine_id = ?
            ");
            $stmt->execute([$machine_id]);
            $data = $stmt->fetch(PDO::FETCH_ASSOC);

            echo json_encode(['success' => true, 'data' => $data]);
            break;

        default:
            echo json_encode(['success' => false, 'message' => 'Invalid action']);
            break;
    }
} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    writeErrorLog(, 'lotoAPI', $e->getMessage(), $input);
    echo json_encode(['success' => false, 'message' => 'Internal server error: ' . $e->getMessage()]);
}
