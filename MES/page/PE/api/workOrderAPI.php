<?php
// MES/page/PE/api/workOrderAPI.php
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
$currentUser = $_SESSION['user'];

function generateWONumber($pdo) {
    $dateStr = date('Ymd');
    $prefix = "WO-$dateStr-";
    $sql = "SELECT TOP 1 wo_number FROM " . PE_WORK_ORDERS_TABLE . " WHERE wo_number LIKE ? ORDER BY wo_id DESC";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$prefix . '%']);
    $last = $stmt->fetchColumn();
    
    if ($last) {
        $seq = (int)substr($last, -3) + 1;
    } else {
        $seq = 1;
    }
    return $prefix . str_pad($seq, 3, '0', STR_PAD_LEFT);
}

try {
    switch ($action) {

        case 'get_work_orders':
            $isDeleted = (!empty($_GET['status']) && $_GET['status'] === 'Deleted');
            $conditions = [$isDeleted ? "W.is_active = 0" : "W.is_active = 1"];
            $params = [];

            if (!empty($_GET['status']) && $_GET['status'] !== 'All' && !$isDeleted) {
                if ($_GET['status'] === 'Active') {
                    $conditions[] = "W.status IN ('Open', 'Pending', 'Assigned', 'In Progress')";
                } else {
                    $conditions[] = "W.status = ?";
                    $params[] = $_GET['status'];
                }
            }
            if (!empty($_GET['priority'])) {
                $conditions[] = "W.priority = ?";
                $params[] = $_GET['priority'];
            }
            if (!empty($_GET['line'])) {
                $conditions[] = "W.line = ?";
                $params[] = $_GET['line'];
            }
            if (!empty($_GET['startDate'])) {
                $conditions[] = "W.requested_at >= ?";
                $params[] = $_GET['startDate'];
            }
            if (!empty($_GET['endDate'])) {
                $conditions[] = "W.requested_at < DATEADD(DAY, 1, CAST(? AS DATE))";
                $params[] = $_GET['endDate'];
            }

            $where = $conditions ? "WHERE " . implode(" AND ", $conditions) : "";

            $sql = "SELECT W.*, M.machine_code, M.machine_name AS machine_display_name
                    FROM " . PE_WORK_ORDERS_TABLE . " W WITH (NOLOCK)
                    LEFT JOIN " . PE_MACHINES_TABLE . " M WITH (NOLOCK) ON W.machine_id = M.machine_id
                    $where
                    ORDER BY 
                        CASE W.priority WHEN 'Critical' THEN 1 WHEN 'High' THEN 2 WHEN 'Normal' THEN 3 ELSE 4 END,
                        CASE W.status WHEN 'Open' THEN 1 WHEN 'Assigned' THEN 2 WHEN 'In Progress' THEN 3 ELSE 4 END,
                        W.requested_at DESC";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Summary
            $summaryParams = $params;
            $summSql = "SELECT 
                            COUNT(*) as total,
                            SUM(CASE WHEN W.status IN ('Open','Assigned','In Progress') THEN 1 ELSE 0 END) as open_count,
                            SUM(CASE WHEN W.status = 'Completed' THEN 1 ELSE 0 END) as completed_count,
                            ISNULL(AVG(CASE WHEN W.status = 'Completed' AND W.repair_minutes IS NOT NULL THEN W.repair_minutes ELSE NULL END), 0) as avg_repair
                        FROM " . PE_WORK_ORDERS_TABLE . " W WITH (NOLOCK) $where";
            $summStmt = $pdo->prepare($summSql);
            $summStmt->execute($summaryParams);
            $summary = $summStmt->fetch(PDO::FETCH_ASSOC);

            echo json_encode(['success' => true, 'data' => $data, 'summary' => $summary]);
            break;

        case 'create_wo':
            $machineId = !empty($input['machine_id']) ? (int)$input['machine_id'] : null;
            $title = trim($input['issue_title'] ?? '');

            if (empty($title)) throw new Exception("Issue title is required");

            $woNumber = generateWONumber($pdo);

            // Get machine info if selected
            $machineName = $input['machine_name'] ?? '';
            $line = $input['line'] ?? '';
            if ($machineId) {
                $mStmt = $pdo->prepare("SELECT machine_name, line FROM " . PE_MACHINES_TABLE . " WHERE machine_id = ?");
                $mStmt->execute([$machineId]);
                $mData = $mStmt->fetch(PDO::FETCH_ASSOC);
                if ($mData) {
                    $machineName = $mData['machine_name'];
                    if (empty($line)) $line = $mData['line'];
                }
            }

            $requestedAt = !empty($input['requested_at']) ? str_replace('T', ' ', $input['requested_at']) : date('Y-m-d H:i:s');

            $imagePath = $input['image_path'] ?? null;
            $pdo->beginTransaction();
            try {
                $sql = "INSERT INTO " . PE_WORK_ORDERS_TABLE . " 
                        (wo_number, wo_type, machine_id, machine_name, line, priority, requested_by, requested_at, issue_title, issue_detail, image_path)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([
                    $woNumber,
                    $input['wo_type'] ?? 'Corrective',
                    $machineId,
                    $machineName,
                    $line,
                    $input['priority'] ?? 'Normal',
                    !empty($input['requested_by']) ? $input['requested_by'] : ($currentUser['fullname'] ?? $currentUser['username']),
                    $requestedAt,
                    $title,
                    $input['issue_detail'] ?? '',
                    $imagePath
                ]);

                $newId = $pdo->lastInsertId();
                writeLog($pdo, 'CREATE_WO', 'PE_WO_API', $newId, null, null, "WO: $woNumber, Machine: $machineName");

                $pdo->commit();
                echo json_encode(['success' => true, 'message' => "Work Order $woNumber created", 'wo_number' => $woNumber]);
            } catch (Exception $e) {
                $pdo->rollBack();
                throw $e;
            }
            break;

        case 'update_wo':
            $id = $input['wo_id'] ?? null;
            if (!$id) throw new Exception("Work Order ID is required");

            $pdo->beginTransaction();
            try {
                $fields = [];
                $params = [];

                $updatableFields = [
                    'status', 'priority', 'assigned_to', 'wo_type',
                    'issue_title', 'issue_detail', 'root_cause', 'action_taken',
                    'line', 'image_path', 'photo_after'
                ];

                foreach ($updatableFields as $f) {
                    if (isset($input[$f])) {
                        $fields[] = "$f = ?";
                        $params[] = $input[$f];
                    }
                }

                if (!empty($input['assigned_to']) && empty($input['assigned_at'])) {
                    $fields[] = "assigned_at = GETDATE()";
                }
                if (!empty($input['assigned_at'])) {
                    $fields[] = "assigned_at = ?";
                    $params[] = str_replace('T', ' ', $input['assigned_at']);
                }
                if (!empty($input['started_at'])) {
                    $fields[] = "started_at = ?";
                    $params[] = str_replace('T', ' ', $input['started_at']);
                }
                if (!empty($input['completed_at'])) {
                    $fields[] = "completed_at = ?";
                    $params[] = str_replace('T', ' ', $input['completed_at']);
                }
                if (isset($input['repair_minutes']) && $input['repair_minutes'] !== '') {
                    $fields[] = "repair_minutes = ?";
                    $params[] = (int)$input['repair_minutes'];
                }

                // Auto-set completed_at and repair_minutes when status = Completed
                $isCompleted = ($input['status'] ?? '') === 'Completed';
                if ($isCompleted) {
                    if (empty($input['completed_at'])) {
                        $fields[] = "completed_at = GETDATE()";
                    }
                }

                $fields[] = "updated_at = GETDATE()";
                $params[] = $id;

                $sql = "UPDATE " . PE_WORK_ORDERS_TABLE . " SET " . implode(", ", $fields) . " WHERE wo_id = ?";
                $stmt = $pdo->prepare($sql);
                $stmt->execute($params);

                // Auto-close associated Downtime if this WO is completed
                if ($isCompleted) {
                    $dtStmt = $pdo->prepare("SELECT downtime_id FROM " . PE_DOWNTIME_LOG_TABLE . " WHERE wo_id = ? AND end_time IS NULL");
                    $dtStmt->execute([$id]);
                    $dtRecord = $dtStmt->fetch(PDO::FETCH_ASSOC);
                    if ($dtRecord) {
                        $completedAt = !empty($input['completed_at']) ? str_replace('T', ' ', $input['completed_at']) : date('Y-m-d H:i:s');
                        $pdo->prepare("UPDATE " . PE_DOWNTIME_LOG_TABLE . " SET end_time = ? WHERE downtime_id = ?")
                            ->execute([$completedAt, $dtRecord['downtime_id']]);
                        writeLog($pdo, 'END_DOWNTIME', 'PE_DT_API', $dtRecord['downtime_id'], null, null, "Auto-closed via Work Order #$id completion");
                    }
                }

                writeLog($pdo, 'UPDATE_WO', 'PE_WO_API', $id, null, null, "Status: " . ($input['status'] ?? 'N/A'));

                $pdo->commit();
                echo json_encode(['success' => true, 'message' => 'Work Order updated']);
            } catch (Exception $e) {
                $pdo->rollBack();
                throw $e;
            }
            break;

        case 'quick_accept':
            $id = $input['wo_id'] ?? null;
            if (!$id) throw new Exception("Work Order ID is required");

            $pdo->beginTransaction();
            try {
                // If it doesn't have an assigned_to yet, we can optionally assign it to the current user.
                // Assuming $currentUserForJS holds the username if we want to, but for now just update status.
                $stmt = $pdo->prepare("UPDATE " . PE_WORK_ORDERS_TABLE . " 
                    SET status = 'In Progress', started_at = GETDATE(), updated_at = GETDATE() 
                    WHERE wo_id = ?");
                $stmt->execute([$id]);
                
                writeLog($pdo, 'QUICK_ACCEPT_WO', 'PE_WO_API', $id, null, null, "Accepted job (In Progress)");
                $pdo->commit();
                echo json_encode(['status' => 'success', 'message' => 'Job accepted']);
            } catch (Exception $e) {
                $pdo->rollBack();
                throw $e;
            }
            break;

        case 'quick_close':
            $id = $input['wo_id'] ?? null;
            if (!$id) throw new Exception("Work Order ID is required");

            $pdo->beginTransaction();
            try {
                $photo_after = $input['photo_after'] ?? null;
                $action_taken = $input['action_taken'] ?? '';
                $root_cause = $input['root_cause'] ?? '';

                $stmt = $pdo->prepare("UPDATE " . PE_WORK_ORDERS_TABLE . " 
                    SET status = 'Completed', 
                        completed_at = GETDATE(), 
                        updated_at = GETDATE(),
                        photo_after = ?,
                        action_taken = ?,
                        root_cause = ?,
                        repair_minutes = DATEDIFF(MINUTE, started_at, GETDATE())
                    WHERE wo_id = ?");
                $stmt->execute([$photo_after, $action_taken, $root_cause, $id]);
                
                writeLog($pdo, 'QUICK_CLOSE_WO', 'PE_WO_API', $id, null, null, "Closed job (Completed)");
                $pdo->commit();
                echo json_encode(['status' => 'success', 'message' => 'Job closed']);
            } catch (Exception $e) {
                $pdo->rollBack();
                throw $e;
            }
            break;

        case 'delete_wo':
            $id = $input['wo_id'] ?? null;
            if (!$id) throw new Exception("Work Order ID is required");

            $pdo->beginTransaction();
            try {
                // Soft delete
                $sql = "UPDATE " . PE_WORK_ORDERS_TABLE . " SET is_active = 0, updated_at = GETDATE() WHERE wo_id = ?";
                $pdo->prepare($sql)->execute([$id]);

                writeLog($pdo, 'DELETE_WO', 'PE_WO_API', $id, null, null, "Soft deleted");

                $pdo->commit();
                echo json_encode(['success' => true, 'message' => 'Work Order deleted successfully']);
            } catch (Exception $e) {
                $pdo->rollBack();
                throw $e;
            }
            break;

        case 'restore_wo':
            $id = $input['wo_id'] ?? null;
            if (!$id) throw new Exception("Work Order ID is required");

            $pdo->beginTransaction();
            try {
                // Restore logic
                $sql = "UPDATE " . PE_WORK_ORDERS_TABLE . " SET is_active = 1, updated_at = GETDATE() WHERE wo_id = ?";
                $pdo->prepare($sql)->execute([$id]);

                writeLog($pdo, 'RESTORE_WO', 'PE_WO_API', $id, null, null, "Restored Work Order");
                
                $pdo->commit();
                echo json_encode(['success' => true, 'message' => 'Work Order restored successfully']);
            } catch (Exception $e) {
                $pdo->rollBack();
                throw $e;
            }
            break;

        case 'get_machines_list':
            $sql = "SELECT machine_id, machine_code, machine_name, line FROM " . PE_MACHINES_TABLE . " WITH (NOLOCK) WHERE is_active = 1 AND status != 'Inactive' ORDER BY machine_code";
            $data = $pdo->query($sql)->fetchAll(PDO::FETCH_ASSOC);

            // Fetch unique technicians from MANPOWER_EMPLOYEES (priority to MT/PE line)
            $techSql = "
                SELECT name_th AS tech_name 
                FROM " . MANPOWER_EMPLOYEES_TABLE . " WITH (NOLOCK) 
                WHERE is_active = 1 AND name_th IS NOT NULL AND name_th != ''
                ORDER BY 
                    CASE 
                        WHEN line = 'MT/PE' THEN 1 
                        WHEN line LIKE '%ENGINEER%' THEN 2
                        WHEN line LIKE '%Retrofit%' THEN 3
                        WHEN line LIKE '%Toolbox%' THEN 4
                        ELSE 5 
                    END,
                    name_th
            ";
            $technicians = $pdo->query($techSql)->fetchAll(PDO::FETCH_COLUMN);

            // Fetch unique lines
            $lineSql = "SELECT DISTINCT line FROM " . PE_MACHINES_TABLE . " WITH (NOLOCK) WHERE is_active = 1 AND line IS NOT NULL AND line != '' ORDER BY line";
            $lines = $pdo->query($lineSql)->fetchAll(PDO::FETCH_COLUMN);

            echo json_encode(['success' => true, 'data' => $data, 'technicians' => $technicians, 'lines' => $lines]);
            break;

        default:
            throw new Exception("Invalid action");
    }
} catch (Throwable $e) {
    handleApiError($e, $pdo ?? null, $input ?? $_REQUEST);
}
?>
