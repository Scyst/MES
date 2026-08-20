<?php
// e:\MES\MES\MES\page\PE\api\safetyAPI.php
require_once __DIR__ . '/../../components/init.php';
requirePermission(['view_maintenance', 'view_production']);

require_once __DIR__ . '/../../db.php';

header('Content-Type: application/json; charset=utf-8');

$action = $_REQUEST['action'] ?? '';

$writeActions = ['update_hazard_status', 'acknowledge_hazard'];
if (in_array($action, $writeActions)) {
    $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? ($_POST['csrf_token'] ?? '');
    if (!hash_equals($_SESSION['csrf_token'] ?? '', $token)) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Invalid CSRF token']);
        exit;
    }
}

try {
    switch ($action) {

        case 'get_hazard_reports':
            $status    = $_GET['status'] ?? 'all';
            $limit     = min((int)($_GET['limit'] ?? 50), 200);
            $days      = min((int)($_GET['days'] ?? 30), 365);

            $sql = "SELECT wo_id, wo_number, wo_type, machine_name, line, priority,
                           requested_by, requested_at, issue_title, issue_detail,
                           image_path, status, assigned_to, completed_at, action_taken AS notes
                    FROM " . PE_WORK_ORDERS_TABLE . "
                    WHERE wo_type = 'Safety/Hazard'
                    AND requested_at >= DATEADD(day, -?, GETDATE())";
            $params = [$days];

            if ($status !== 'all') {
                $sql .= " AND status = ?";
                $params[] = $status;
            }
            $sql .= " ORDER BY
                        CASE status WHEN 'Pending' THEN 1 WHEN 'In Progress' THEN 2 ELSE 3 END,
                        requested_at DESC
                      OFFSET 0 ROWS FETCH NEXT ? ROWS ONLY";
            $params[] = $limit;

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $reports = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // KPI summary
            $kpiSql = "SELECT
                COUNT(*) AS total,
                SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) AS pending,
                SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) AS in_progress,
                SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) AS completed
                FROM " . PE_WORK_ORDERS_TABLE . "
                WHERE wo_type = 'Safety/Hazard'
                AND requested_at >= DATEADD(day, -?, GETDATE())";
            $kpiStmt = $pdo->prepare($kpiSql);
            $kpiStmt->execute([$days]);
            $kpi = $kpiStmt->fetch(PDO::FETCH_ASSOC);

            echo json_encode(['success' => true, 'data' => $reports, 'kpi' => $kpi]);
            break;

        case 'get_employees_for_cards':
            $empStmt = $pdo->query("SELECT emp_id, name_th, department_api, line FROM " . EMPLOYEE_TABLE . " WHERE is_active = 1 ORDER BY name_th");
            $employees = $empStmt->fetchAll(PDO::FETCH_ASSOC);

            $lines = [];
            foreach($employees as $e) {
                $l = $e['line'] ?: $e['department_api'];
                if($l && !in_array($l, $lines)) {
                    $lines[] = $l;
                }
            }
            sort($lines);
            
            echo json_encode(['success' => true, 'data' => ['employees' => $employees, 'lines' => $lines]]);
            break;

        case 'update_hazard_status':
            requirePermission('manage_maintenance');
            $input  = json_decode(file_get_contents('php://input'), true) ?? $_POST;
            $woId   = (int)($input['wo_id'] ?? 0);
            $status = $input['status'] ?? '';
            $notes  = trim($input['notes'] ?? '');

            $allowedStatuses = ['Pending', 'In Progress', 'Completed', 'Cancelled'];
            if (!$woId || !in_array($status, $allowedStatuses)) {
                throw new Exception("Invalid parameters.");
            }

            // Fetch old for audit
            $oldStmt = $pdo->prepare("SELECT status, action_taken AS notes FROM " . PE_WORK_ORDERS_TABLE . " WHERE wo_id = ? AND wo_type = 'Safety/Hazard'");
            $oldStmt->execute([$woId]);
            $old = $oldStmt->fetch(PDO::FETCH_ASSOC);
            if (!$old) throw new Exception("Hazard report not found.");

            $completedAt = ($status === 'Completed') ? date('Y-m-d H:i:s') : null;
            $assignedTo  = $input['assigned_to'] ?? null;

            $pdo->beginTransaction();
            $updSql = "UPDATE " . PE_WORK_ORDERS_TABLE . "
                       SET status = ?, action_taken = ?, assigned_to = ?,
                           completed_at = " . ($completedAt ? "?" : "completed_at") . "
                       WHERE wo_id = ?";
            $updParams = [$status, $notes, $assignedTo];
            if ($completedAt) $updParams[] = $completedAt;
            $updParams[] = $woId;

            $pdo->prepare($updSql)->execute($updParams);

            if (function_exists('writeLog')) {
                writeLog($pdo, 'UPDATE_HAZARD_STATUS', $_SESSION['user']['username'] ?? 'system',
                    $woId,
                    json_encode($old),
                    json_encode(['status' => $status, 'notes' => $notes]),
                    "Hazard WO ID: $woId status -> $status"
                );
            }
            $pdo->commit();

            echo json_encode(['success' => true, 'message' => "Status updated to: $status"]);
            break;

        default:
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => "Unknown action: $action"]);
    }
} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
