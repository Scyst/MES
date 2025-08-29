<?php
// api/OEE_Dashboard/get_oee_piechart.php
header('Content-Type: application/json');

ini_set('display_errors', 1);
error_reporting(E_ALL);

require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../../config/config.php';

try {
    $startDate = $_GET['startDate'] ?? date('Y-m-d');
    $endDate   = $_GET['endDate'] ?? date('Y-m-d');
    $line      = !empty($_GET['line']) ? $_GET['line'] : null;
    $model     = !empty($_GET['model']) ? $_GET['model'] : null;

    // =============================================================
    // START: OEE CALCULATION LOGIC (NEW SYSTEM)
    // =============================================================
    
    // --- 1. คำนวณ Planned Time และ Downtime ---
    $lineCondition = $line ? "AND l.production_line = ?" : "";
    $lineConditionForSchedule = $line ? "AND line = ?" : "";

    // 1.1 ดึงข้อมูลวันและไลน์ที่มีการผลิตทั้งหมด
    $prodDaysSql = "
        SELECT DISTINCT 
            CAST(t.transaction_timestamp AS DATE) as ProductionDate, 
            l.production_line as ProductionLine
        FROM " . TRANSACTIONS_TABLE . " t
        JOIN " . LOCATIONS_TABLE . " l ON t.to_location_id = l.location_id
        WHERE t.transaction_timestamp BETWEEN ? AND DATEADD(day, 1, ?)
          AND t.transaction_type LIKE 'PRODUCTION_%'
          AND l.production_line IS NOT NULL
          {$lineCondition}
    ";
    $prodDaysStmt = $pdo->prepare($prodDaysSql);
    $prodDaysParams = [$startDate, $endDate];
    if ($line) $prodDaysParams[] = $line;
    $prodDaysStmt->execute($prodDaysParams);
    $productionDays = $prodDaysStmt->fetchAll(PDO::FETCH_ASSOC);
    $prodDaysStmt->closeCursor();

    // 1.2 ดึงตารางเวลางานของทุก Line
    $scheduleSql = "
        SELECT line, 
               ISNULL(SUM(
                   CASE
                       WHEN end_time >= start_time THEN DATEDIFF(MINUTE, start_time, end_time)
                       ELSE DATEDIFF(MINUTE, start_time, end_time) + 1440
                   END - planned_break_minutes
               ), 0) as DailyMinutes
        FROM " . SCHEDULES_TABLE . "
        WHERE is_active = 1 {$lineConditionForSchedule}
        GROUP BY line
    ";
    $scheduleStmt = $pdo->prepare($scheduleSql);
    $scheduleParams = [];
    if ($line) $scheduleParams[] = $line;
    $scheduleStmt->execute($scheduleParams);
    $schedules = $scheduleStmt->fetchAll(PDO::FETCH_KEY_PAIR);
    $scheduleStmt->closeCursor();

    // 1.3 คำนวณ Planned Time ทั้งหมด
    $totalPlannedMinutes = 0;
    foreach ($productionDays as $day) {
        if (isset($schedules[$day['ProductionLine']])) {
            $totalPlannedMinutes += $schedules[$day['ProductionLine']];
        }
    }
    
    // 1.4 ดึง Downtime ทั้งหมด
    $downtimeSql = "SELECT ISNULL(SUM(DATEDIFF(MINUTE, stop_begin, stop_end)), 0) FROM " . STOP_CAUSES_TABLE . " WHERE log_date BETWEEN ? AND ? {$lineConditionForSchedule}";
    $downtimeStmt = $pdo->prepare($downtimeSql);
    $downtimeParams = [$startDate, $endDate];
    if ($line) $downtimeParams[] = $line;
    $downtimeStmt->execute($downtimeParams);
    $totalDowntimeMinutes = (int)$downtimeStmt->fetchColumn();
    $downtimeStmt->closeCursor();
    
    $totalRuntimeMinutes = $totalPlannedMinutes > $totalDowntimeMinutes ? $totalPlannedMinutes - $totalDowntimeMinutes : 0;
    
    // --- 2. ดึงข้อมูลการผลิต ---
    $mainSql = "
        SELECT
            SUM(CASE WHEN t.transaction_type = 'PRODUCTION_FG' THEN t.quantity ELSE 0 END) AS FG,
            SUM(CASE WHEN t.transaction_type = 'PRODUCTION_HOLD' THEN t.quantity ELSE 0 END) AS Hold,
            SUM(CASE WHEN t.transaction_type = 'PRODUCTION_SCRAP' THEN t.quantity ELSE 0 END) AS Scrap,
            SUM(t.quantity * (60.0 / NULLIF(i.planned_output, 0))) as TotalTheoreticalMinutes
        FROM " . TRANSACTIONS_TABLE . " t
        JOIN " . ITEMS_TABLE . " i ON t.parameter_id = i.item_id
        JOIN " . LOCATIONS_TABLE . " l ON t.to_location_id = l.location_id
        WHERE t.transaction_timestamp BETWEEN ? AND DATEADD(day, 1, ?)
          AND t.transaction_type LIKE 'PRODUCTION_%'
          AND i.planned_output > 0
          {$lineCondition}
    ";
    $mainStmt = $pdo->prepare($mainSql);
    $mainParams = [$startDate, $endDate];
    if ($line) $mainParams[] = $line;
    $mainStmt->execute($mainParams);
    $mainResult = $mainStmt->fetch(PDO::FETCH_ASSOC);
    $mainStmt->closeCursor();

    // --- 3. คำนวณและส่งผลลัพธ์ ---
    $totalFG = (int)($mainResult['FG'] ?? 0);
    $totalHold = (int)($mainResult['Hold'] ?? 0);
    $totalScrap = (int)($mainResult['Scrap'] ?? 0);
    $totalTheoreticalMinutes = (float)($mainResult['TotalTheoreticalMinutes'] ?? 0.0);
    $totalDefects = $totalHold + $totalScrap;
    $totalActualOutput = $totalFG + $totalDefects;
    
    $availability = ($totalPlannedMinutes > 0) ? ($totalRuntimeMinutes * 100.0 / $totalPlannedMinutes) : 0;
    $performanceRaw = ($totalRuntimeMinutes > 0) ? ($totalTheoreticalMinutes * 100.0 / $totalRuntimeMinutes) : 0;
    $performance = $performanceRaw > 100 ? 100.0 : $performanceRaw;
    $quality = ($totalActualOutput > 0) ? ($totalFG * 100.0 / $totalActualOutput) : 0;
    $oee = ($availability / 100.0) * ($performance / 100.0) * ($quality / 100.0) * 100.0;

    $plannedTimeBreakdown = [];
    if (!$line && !empty($productionDays) && !empty($schedules)) {
        foreach ($productionDays as $day) {
            $lineName = $day['ProductionLine'];
            if (isset($schedules[$lineName])) {
                $found = false;
                foreach ($plannedTimeBreakdown as &$item) {
                    if ($item['line'] === $lineName) {
                        $item['minutes'] += $schedules[$lineName];
                        $found = true;
                        break;
                    }
                }
                if (!$found) {
                    $plannedTimeBreakdown[] = ['line' => $lineName, 'minutes' => $schedules[$lineName]];
                }
            }
        }
    }

    $output = [
        "success" => true,
        "quality" => round($quality, 1),
        "availability" => round($availability, 1),
        "performance" => round($performance, 1),
        "oee" => round($oee, 1),
        "fg" => $totalFG,
        "defects" => $totalDefects,
        "hold" => $totalHold,
        "scrap" => $totalScrap,
        "runtime" => $totalRuntimeMinutes,
        "planned_time" => $totalPlannedMinutes,
        "downtime" => $totalDowntimeMinutes,
        "actual_output" => $totalActualOutput,
        "total_theoretical_minutes" => round($totalTheoreticalMinutes, 2),
        "sparkline_data" => [], // Can be implemented later if needed
        "planned_time_breakdown" => $plannedTimeBreakdown
    ];
    echo json_encode($output);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
}
?>