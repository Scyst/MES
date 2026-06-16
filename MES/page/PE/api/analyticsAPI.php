<?php
// MES/page/PE/api/analyticsAPI.php — Dashboard Analytics
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../components/init.php';


requirePermission(['view_maintenance', 'view_production', 'view_dashboard']);

$input = json_decode(file_get_contents("php://input"), true) ?? $_POST;
$action = $_REQUEST['action'] ?? $input['action'] ?? '';
try {
    $startDate = $_GET['startDate'] ?? date('Y-m-01');
    $endDate = $_GET['endDate'] ?? date('Y-m-d');
    $lineFilter = (!empty($_GET['line']) && $_GET['line'] !== '') ? $_GET['line'] : null;

    $lineCondition = "";
    $baseParams = [$startDate, $endDate];
    if ($lineFilter) {
        $lineCondition = "AND line = ?";
        $baseParams[] = $lineFilter;
    }

    switch ($action) {

        case 'get_kpi_overview':
            // Total downtime
            $dtSql = "SELECT 
                        ISNULL(SUM(ISNULL(duration_min, DATEDIFF(MINUTE, start_time, GETDATE()))), 0) as total_downtime_min,
                        COUNT(*) as total_events,
                        ISNULL(AVG(CAST(ISNULL(duration_min, DATEDIFF(MINUTE, start_time, GETDATE())) AS FLOAT)), 0) as avg_duration
                      FROM " . PE_DOWNTIME_LOG_TABLE . " WITH (NOLOCK)
                      WHERE log_date >= ? AND log_date <= ? $lineCondition";
            $dtStmt = $pdo->prepare($dtSql);
            $dtStmt->execute($baseParams);
            $dtKpi = $dtStmt->fetch(PDO::FETCH_ASSOC);

            // WO stats
            $woSql = "SELECT 
                        COUNT(*) as total_wo,
                        SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completed_wo,
                        ISNULL(AVG(CASE WHEN status = 'Completed' AND repair_minutes > 0 THEN CAST(repair_minutes AS FLOAT) ELSE NULL END), 0) as avg_repair,
                        ISNULL(SUM(total_cost), 0) as total_cost
                      FROM " . PE_WORK_ORDERS_TABLE . " WITH (NOLOCK)
                      WHERE requested_at >= ? AND requested_at < DATEADD(DAY, 1, CAST(? AS DATE)) $lineCondition";
            $woStmt = $pdo->prepare($woSql);
            $woStmt->execute($baseParams);
            $woKpi = $woStmt->fetch(PDO::FETCH_ASSOC);

            // Calculate MTBF & MTTR & Availability
            $totalDowntimeHrs = ($dtKpi['total_downtime_min'] ?? 0) / 60;
            $totalEvents = max(1, $dtKpi['total_events'] ?? 1);
            
            // Assume operating hours: days in range * 24hrs * number of active machines
            $daysDiff = max(1, (strtotime($endDate) - strtotime($startDate)) / 86400 + 1);
            $machineCount = 1;
            $mcSql = "SELECT COUNT(*) FROM " . PE_MACHINES_TABLE . " WITH (NOLOCK) WHERE is_active = 1 AND status = 'Active'";
            if ($lineFilter) {
                $mcSql .= " AND line = ?";
                $mcStmt = $pdo->prepare($mcSql);
                $mcStmt->execute([$lineFilter]);
            } else {
                $mcStmt = $pdo->query($mcSql);
            }
            $machineCount = max(1, (int)$mcStmt->fetchColumn());

            $totalOperatingHrs = $daysDiff * 24 * $machineCount;
            $uptimeHrs = $totalOperatingHrs - $totalDowntimeHrs;

            $mtbf = $totalEvents > 0 ? round($uptimeHrs / $totalEvents, 1) : 0;
            
            // MTTR: Use Work Order avg repair time if available, otherwise fallback to Downtime avg duration
            $mttr = round($woKpi['avg_repair'] ?? 0, 1);
            if ($mttr <= 0) {
                $mttr = round($dtKpi['avg_duration'] ?? 0, 1);
            }

            $availability = $totalOperatingHrs > 0 ? round(($uptimeHrs / $totalOperatingHrs) * 100, 1) : 100;

            echo json_encode([
                'success' => true,
                'data' => [
                    'mtbf' => $mtbf,
                    'mttr' => $mttr,
                    'availability' => min(100, $availability),
                    'total_downtime_hrs' => round($totalDowntimeHrs, 1),
                    'total_cost' => $woKpi['total_cost'] ?? 0,
                    'total_events' => $dtKpi['total_events'],
                    'total_wo' => $woKpi['total_wo'],
                    'completed_wo' => $woKpi['completed_wo']
                ]
            ]);
            break;

        case 'get_downtime_trend':
            $sql = "SELECT log_date, 
                           SUM(ISNULL(duration_min, DATEDIFF(MINUTE, start_time, GETDATE()))) as total_min, 
                           COUNT(*) as event_count
                    FROM " . PE_DOWNTIME_LOG_TABLE . " WITH (NOLOCK)
                    WHERE log_date >= ? AND log_date <= ? $lineCondition
                    GROUP BY log_date ORDER BY log_date ASC";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($baseParams);
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
            break;

        case 'get_downtime_pareto':
            $sql = "SELECT cause_category, 
                           SUM(ISNULL(duration_min, DATEDIFF(MINUTE, start_time, GETDATE()))) as total_min, 
                           COUNT(*) as event_count
                    FROM " . PE_DOWNTIME_LOG_TABLE . " WITH (NOLOCK)
                    WHERE log_date >= ? AND log_date <= ? $lineCondition
                    AND cause_category IS NOT NULL AND cause_category != ''
                    GROUP BY cause_category ORDER BY total_min DESC";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($baseParams);
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
            break;

        case 'get_top_machines':
            $sql = "SELECT TOP 10 
                        D.machine_name, D.line,
                        COUNT(*) as event_count, 
                        SUM(ISNULL(D.duration_min, DATEDIFF(MINUTE, D.start_time, GETDATE()))) as total_min,
                        AVG(CAST(ISNULL(D.duration_min, DATEDIFF(MINUTE, D.start_time, GETDATE())) AS FLOAT)) as avg_min
                    FROM " . PE_DOWNTIME_LOG_TABLE . " D WITH (NOLOCK)
                    WHERE D.log_date >= ? AND D.log_date <= ? $lineCondition
                    AND D.machine_name IS NOT NULL AND D.machine_name != ''
                    GROUP BY D.machine_name, D.line
                    ORDER BY total_min DESC";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($baseParams);
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
            break;

        case 'get_wo_status_dist':
            $sql = "SELECT status, COUNT(*) as count
                    FROM " . PE_WORK_ORDERS_TABLE . " WITH (NOLOCK)
                    WHERE requested_at >= ? AND requested_at < DATEADD(DAY, 1, CAST(? AS DATE)) $lineCondition
                    GROUP BY status";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($baseParams);
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
            break;

        default:
            throw new Exception("Invalid action");
    }
} catch (Throwable $e) {
    handleApiError($e, $pdo ?? null, $_REQUEST);
}
?>
