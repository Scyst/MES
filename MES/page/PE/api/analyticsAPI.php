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

            // 1. Get Shift Hours
            $shiftSql = "SELECT ISNULL(SUM(DATEDIFF(MINUTE, start_time, end_time)), 24*60) / 60.0 FROM MANPOWER_SHIFTS WITH (NOLOCK) WHERE is_active = 1";
            $shiftStmt = $pdo->query($shiftSql);
            $hoursPerDay = (float)$shiftStmt->fetchColumn();
            if ($hoursPerDay <= 0) $hoursPerDay = 24;

            // 2. WO stats with dynamic labor rate
            $woSql = "SELECT 
                        COUNT(*) as total_wo,
                        SUM(CASE WHEN W.status = 'Completed' THEN 1 ELSE 0 END) as completed_wo,
                        ISNULL(AVG(CASE WHEN W.status = 'Completed' AND W.repair_minutes > 0 THEN CAST(W.repair_minutes AS FLOAT) ELSE NULL END), 0) as avg_repair,
                        ISNULL(SUM(W.total_cost), 0) as parts_cost,
                        ISNULL(SUM((ISNULL(W.repair_minutes, 0) / 60.0) * ISNULL(RateData.HourlyRate, 200.0)), 0) as labor_cost
                      FROM " . PE_WORK_ORDERS_TABLE . " W WITH (NOLOCK)
                      OUTER APPLY (
                          SELECT TOP 1 
                              CASE 
                                  WHEN R.rate_type = 'DAILY' THEN CAST(R.daily_rate AS FLOAT) / 8.0 
                                  WHEN R.rate_type = 'MONTHLY' THEN (CAST(R.daily_rate AS FLOAT) / 30.0) / 8.0 
                                  ELSE 200.0 
                              END as HourlyRate
                          FROM MANPOWER_EMPLOYEES E WITH (NOLOCK)
                          LEFT JOIN MANPOWER_POSITION_RATES R WITH (NOLOCK) 
                              ON E.position LIKE '%' + R.position_keyword + '%' 
                          WHERE (E.emp_id = W.assigned_to OR E.name_th = W.assigned_to)
                      ) RateData
                      WHERE W.requested_at >= ? AND W.requested_at < DATEADD(DAY, 1, CAST(? AS DATE))";
            if ($lineFilter) {
                $woSql .= " AND W.line = ?";
            }
            $woStmt = $pdo->prepare($woSql);
            $woStmt->execute($baseParams);
            $woKpi = $woStmt->fetch(PDO::FETCH_ASSOC);
            
            $woKpi['total_cost'] = $woKpi['parts_cost'] + $woKpi['labor_cost'];

            // Calculate MTBF & MTTR & Availability
            $totalDowntimeHrs = ($dtKpi['total_downtime_min'] ?? 0) / 60;
            $totalEvents = max(1, $dtKpi['total_events'] ?? 1);
            
            // Assume operating hours: days in range * Shift Hours * number of active machines
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

            $totalOperatingHrs = $daysDiff * $hoursPerDay * $machineCount;
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
                    'parts_cost' => $woKpi['parts_cost'] ?? 0,
                    'labor_cost' => $woKpi['labor_cost'] ?? 0,
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
            $causeCategory = (!empty($_GET['causeCategory']) && $_GET['causeCategory'] !== '') ? $_GET['causeCategory'] : null;
            $causeCondition = "";
            $params = $baseParams;
            if ($causeCategory) {
                $causeCondition = "AND D.cause_category = ?";
                $params[] = $causeCategory;
            }
            
            $sql = "SELECT TOP 10 
                        D.machine_name, D.line,
                        COUNT(*) as event_count, 
                        SUM(ISNULL(D.duration_min, DATEDIFF(MINUTE, D.start_time, GETDATE()))) as total_min,
                        AVG(CAST(ISNULL(D.duration_min, DATEDIFF(MINUTE, D.start_time, GETDATE())) AS FLOAT)) as avg_min
                    FROM " . PE_DOWNTIME_LOG_TABLE . " D WITH (NOLOCK)
                    WHERE D.log_date >= ? AND D.log_date <= ? $lineCondition $causeCondition
                    AND D.machine_name IS NOT NULL AND D.machine_name != ''
                    GROUP BY D.machine_name, D.line
                    ORDER BY total_min DESC";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
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

        case 'get_cost_drivers':
            $sql = "SELECT TOP 10
                        W.machine_name,
                        ISNULL(SUM(W.total_cost), 0) as parts_cost,
                        ISNULL(SUM((ISNULL(W.repair_minutes, 0) / 60.0) * ISNULL(RateData.HourlyRate, 200.0)), 0) as labor_cost
                    FROM " . PE_WORK_ORDERS_TABLE . " W WITH (NOLOCK)
                    OUTER APPLY (
                        SELECT TOP 1 
                            CASE 
                                WHEN R.rate_type = 'DAILY' THEN CAST(R.daily_rate AS FLOAT) / 8.0 
                                WHEN R.rate_type = 'MONTHLY' THEN (CAST(R.daily_rate AS FLOAT) / 30.0) / 8.0 
                                ELSE 200.0 
                            END as HourlyRate
                        FROM MANPOWER_EMPLOYEES E WITH (NOLOCK)
                        LEFT JOIN MANPOWER_POSITION_RATES R WITH (NOLOCK) 
                            ON E.position LIKE '%' + R.position_keyword + '%' 
                        WHERE (E.emp_id = W.assigned_to OR E.name_th = W.assigned_to)
                    ) RateData
                    WHERE W.requested_at >= ? AND W.requested_at < DATEADD(DAY, 1, CAST(? AS DATE)) 
                    AND W.machine_name IS NOT NULL AND W.machine_name != '' $lineCondition
                    GROUP BY W.machine_name
                    ORDER BY (ISNULL(SUM(W.total_cost), 0) + ISNULL(SUM((ISNULL(W.repair_minutes, 0) / 60.0) * ISNULL(RateData.HourlyRate, 200.0)), 0)) DESC";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($baseParams);
            
            $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
            foreach($results as &$row) {
                $row['total_cost'] = round($row['parts_cost'] + $row['labor_cost'], 2);
                $row['parts_cost'] = round($row['parts_cost'], 2);
                $row['labor_cost'] = round($row['labor_cost'], 2);
            }
            echo json_encode(['success' => true, 'data' => $results]);
            break;

        case 'get_technician_performance':
            $sql = "SELECT TOP 10
                        assigned_to as tech_name,
                        COUNT(*) as total_wo,
                        SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completed_wo,
                        ISNULL(AVG(CASE WHEN status = 'Completed' AND repair_minutes > 0 THEN CAST(repair_minutes AS FLOAT) ELSE NULL END), 0) as avg_repair
                    FROM " . PE_WORK_ORDERS_TABLE . " WITH (NOLOCK)
                    WHERE requested_at >= ? AND requested_at < DATEADD(DAY, 1, CAST(? AS DATE)) 
                    AND assigned_to IS NOT NULL AND assigned_to != '' $lineCondition
                    GROUP BY assigned_to
                    ORDER BY completed_wo DESC, total_wo DESC";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($baseParams);
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
            break;

        case 'get_predictive_risk':
            $sql = "SELECT TOP 5
                        machine_name, line,
                        COUNT(*) as event_count,
                        SUM(ISNULL(duration_min, DATEDIFF(MINUTE, start_time, GETDATE()))) as total_min,
                        MAX(start_time) as last_breakdown
                    FROM " . PE_DOWNTIME_LOG_TABLE . " WITH (NOLOCK)
                    WHERE log_date >= ? AND log_date <= ? $lineCondition
                    AND machine_name IS NOT NULL AND machine_name != ''
                    GROUP BY machine_name, line
                    HAVING COUNT(*) >= 2
                    ORDER BY event_count DESC, total_min DESC";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($baseParams);
            
            $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
            foreach($results as &$row) {
                // Calculate risk score: 10 points per event, 1 point per 10 mins of downtime
                $score = ($row['event_count'] * 10) + ($row['total_min'] / 10);
                $row['risk_score'] = round($score);
                if ($score > 100) $row['risk_level'] = 'Critical';
                else if ($score > 50) $row['risk_level'] = 'High';
                else $row['risk_level'] = 'Medium';
            }
            echo json_encode(['success' => true, 'data' => $results]);
            break;

        default:
            throw new Exception("Invalid action");
    }
} catch (Throwable $e) {
    handleApiError($e, $pdo ?? null, $_REQUEST);
}
?>
