<?php
// MES/page/PE/api/downtimeAPI.php
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

try {
    switch ($action) {

        case 'get_downtime':
            $page = max(1, intval($_GET['page'] ?? 1));
            $limit = max(1, intval($_GET['limit'] ?? 50));
            $offset = ($page - 1) * $limit;

            $conditions = [];
            $params = [];

            if (!empty($_GET['line'])) {
                $conditions[] = "D.line = ?";
                $params[] = $_GET['line'];
            }
            if (!empty($_GET['cause_category'])) {
                $conditions[] = "D.cause_category = ?";
                $params[] = $_GET['cause_category'];
            }
            if (!empty($_GET['startDate'])) {
                $conditions[] = "D.log_date >= ?";
                $params[] = $_GET['startDate'];
            }
            if (!empty($_GET['endDate'])) {
                $conditions[] = "D.log_date <= ?";
                $params[] = $_GET['endDate'];
            }

            $where = $conditions ? "WHERE " . implode(" AND ", $conditions) : "";

            // Total count
            $countSql = "SELECT COUNT(*) FROM " . PE_DOWNTIME_LOG_TABLE . " D $where";
            $countStmt = $pdo->prepare($countSql);
            $countStmt->execute($params);
            $total = (int)$countStmt->fetchColumn();

            // Data with pagination
            $dataSql = "SELECT D.*, M.machine_code
                        FROM " . PE_DOWNTIME_LOG_TABLE . " D WITH (NOLOCK)
                        LEFT JOIN " . PE_MACHINES_TABLE . " M WITH (NOLOCK) ON D.machine_id = M.machine_id
                        $where
                        ORDER BY D.start_time DESC
                        OFFSET $offset ROWS FETCH NEXT $limit ROWS ONLY";
            $dataStmt = $pdo->prepare($dataSql);
            $dataStmt->execute($params);
            $data = $dataStmt->fetchAll(PDO::FETCH_ASSOC);

            // Summary by line
            $summSql = "SELECT D.line, COUNT(*) AS event_count, SUM(D.duration_min) AS total_minutes
                        FROM " . PE_DOWNTIME_LOG_TABLE . " D WITH (NOLOCK)
                        $where
                        GROUP BY D.line ORDER BY total_minutes DESC";
            $summStmt = $pdo->prepare($summSql);
            $summStmt->execute($params);
            $lineSummary = $summStmt->fetchAll(PDO::FETCH_ASSOC);

            // KPI
            $kpiSql = "SELECT 
                            ISNULL(SUM(D.duration_min), 0) as total_downtime,
                            COUNT(*) as total_events,
                            ISNULL(AVG(CAST(D.duration_min AS FLOAT)), 0) as avg_duration
                        FROM " . PE_DOWNTIME_LOG_TABLE . " D WITH (NOLOCK) $where";
            $kpiStmt = $pdo->prepare($kpiSql);
            $kpiStmt->execute($params);
            $kpi = $kpiStmt->fetch(PDO::FETCH_ASSOC);

            // Top cause
            $topCauseSql = "SELECT TOP 1 D.cause_category, COUNT(*) as cnt
                            FROM " . PE_DOWNTIME_LOG_TABLE . " D WITH (NOLOCK)
                            $where
                            AND D.cause_category IS NOT NULL AND D.cause_category != ''
                            GROUP BY D.cause_category ORDER BY cnt DESC";
            $topStmt = $pdo->prepare($topCauseSql);
            $topStmt->execute($params);
            $topCause = $topStmt->fetch(PDO::FETCH_ASSOC);

            echo json_encode([
                'success' => true,
                'data' => $data,
                'total' => $total,
                'page' => $page,
                'limit' => $limit,
                'line_summary' => $lineSummary,
                'kpi' => $kpi,
                'top_cause' => $topCause ? $topCause['cause_category'] : '-'
            ]);
            break;

        case 'add_downtime':
            $machineId = !empty($input['machine_id']) ? (int)$input['machine_id'] : null;
            $logDate = $input['log_date'] ?? '';
            $startTime = $input['start_time'] ?? '';
            $endTime = $input['end_time'] ?? '';
            $causeCategory = $input['cause_category'] ?? '';
            $causeDetail = trim($input['cause_detail'] ?? '');

            if (empty($logDate) || empty($startTime) || empty($endTime) || empty($causeCategory) || empty($causeDetail)) {
                throw new Exception("กรุณากรอกข้อมูลให้ครบถ้วน (Date, Start, End, Cause Category, Cause Detail)");
            }

            $startDt = $logDate . ' ' . $startTime;
            $endDt = $logDate . ' ' . $endTime;

            // Handle overnight
            $startTs = strtotime($startDt);
            $endTs = strtotime($endDt);
            if ($endTs < $startTs) {
                $endDt = date('Y-m-d', strtotime($logDate . ' +1 day')) . ' ' . $endTime;
            }

            // Get machine info
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

            $pdo->beginTransaction();
            try {
                $sql = "INSERT INTO " . PE_DOWNTIME_LOG_TABLE . " 
                        (machine_id, machine_name, line, log_date, start_time, end_time, cause_category, cause_detail, recovered_by, notes, created_by)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([
                    $machineId, $machineName, $line, $logDate, $startDt, $endDt,
                    $causeCategory, $causeDetail,
                    trim($input['recovered_by'] ?? ''),
                    trim($input['notes'] ?? ''),
                    $currentUser['username']
                ]);

                $newId = $pdo->lastInsertId();

                // Create WO if requested
                $woNumber = null;
                if (!empty($input['create_wo'])) {
                    $woNumber = "WO-" . date('Ymd') . "-" . str_pad(rand(1, 999), 3, '0', STR_PAD_LEFT);
                    $woSql = "INSERT INTO " . PE_WORK_ORDERS_TABLE . " 
                              (wo_number, wo_type, machine_id, machine_name, line, priority, requested_by, issue_title, issue_detail)
                              VALUES (?, 'Corrective', ?, ?, ?, 'Normal', ?, ?, ?)";
                    $pdo->prepare($woSql)->execute([
                        $woNumber, $machineId, $machineName, $line, $currentUser['username'],
                        "Downtime: $causeCategory - $causeDetail",
                        "Auto-generated from downtime event #$newId"
                    ]);
                    $woId = $pdo->lastInsertId();
                    $pdo->prepare("UPDATE " . PE_DOWNTIME_LOG_TABLE . " SET wo_id = ? WHERE downtime_id = ?")->execute([$woId, $newId]);
                }

                writeLog($pdo, 'ADD_DOWNTIME', 'PE_DT_API', $newId, null, null, "Machine: $machineName, Cause: $causeCategory");

                $pdo->commit();
                $msg = "Downtime recorded successfully";
                if ($woNumber) $msg .= " + Work Order $woNumber created";
                echo json_encode(['success' => true, 'message' => $msg]);
            } catch (Exception $e) {
                $pdo->rollBack();
                throw $e;
            }
            break;

        case 'update_downtime':
            $id = $input['downtime_id'] ?? null;
            if (!$id) throw new Exception("Downtime ID is required");

            $logDate = $input['log_date'] ?? '';
            $startTime = $input['start_time'] ?? '';
            $endTime = $input['end_time'] ?? '';

            $startDt = $logDate . ' ' . $startTime;
            $endDt = $logDate . ' ' . $endTime;
            if (strtotime($endDt) < strtotime($startDt)) {
                $endDt = date('Y-m-d', strtotime($logDate . ' +1 day')) . ' ' . $endTime;
            }

            $sql = "UPDATE " . PE_DOWNTIME_LOG_TABLE . " SET 
                        machine_id = ?, machine_name = ?, line = ?, log_date = ?, start_time = ?, end_time = ?,
                        cause_category = ?, cause_detail = ?, recovered_by = ?, notes = ?
                    WHERE downtime_id = ?";
            $pdo->prepare($sql)->execute([
                !empty($input['machine_id']) ? (int)$input['machine_id'] : null,
                $input['machine_name'] ?? '',
                $input['line'] ?? '',
                $logDate, $startDt, $endDt,
                $input['cause_category'] ?? '',
                trim($input['cause_detail'] ?? ''),
                trim($input['recovered_by'] ?? ''),
                trim($input['notes'] ?? ''),
                $id
            ]);

            echo json_encode(['success' => true, 'message' => 'Downtime updated']);
            break;

        case 'delete_downtime':
            $id = $input['downtime_id'] ?? null;
            if (!$id) throw new Exception("Downtime ID is required");

            $pdo->prepare("DELETE FROM " . PE_DOWNTIME_LOG_TABLE . " WHERE downtime_id = ?")->execute([$id]);
            writeLog($pdo, 'DELETE_DOWNTIME', 'PE_DT_API', $id, null, null, "Deleted by " . $currentUser['username']);
            echo json_encode(['success' => true, 'message' => 'Downtime deleted']);
            break;

        default:
            throw new Exception("Invalid action");
    }
} catch (Throwable $e) {
    handleApiError($e, $pdo ?? null, $input ?? $_REQUEST);
}
?>
