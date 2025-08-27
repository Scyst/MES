<?php
// api/OEE_Dashboard/get_oee_linechart.php
header('Content-Type: application/json');

ini_set('display_errors', 1);
error_reporting(E_ALL);

require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../../config/config.php';

try {
    $startDateStr = $_GET['startDate'] ?? date('Y-m-d', strtotime('-29 days'));
    $endDateStr   = $_GET['endDate'] ?? date('Y-m-d');
    $line      = !empty($_GET['line']) ? $_GET['line'] : null;
    $model     = !empty($_GET['model']) ? $_GET['model'] : null;

    $startDateObj = new DateTime($startDateStr);
    $endDateObj   = new DateTime($endDateStr);
    
    $dayDifference = $startDateObj->diff($endDateObj)->days;
    
    if ($dayDifference < 29) {
        $startDateObj = (clone $endDateObj)->modify('-29 days');
        $startDateStr = $startDateObj->format('Y-m-d');
    }

    if (defined('USE_NEW_OEE_CALCULATION') && USE_NEW_OEE_CALCULATION === true) {
        
        // =============================================================
        // START: LOGIC การคำนวณ OEE LINE CHART (เวอร์ชันแก้ไข Parameter)
        // =============================================================

        $lineCondition = $line ? "AND l.production_line = :line_prod" : "";
        $lineConditionStop = $line ? "AND line = :line_stop" : "";

        $sql = "
            WITH DateSeries AS (
                SELECT TOP (DATEDIFF(day, :startDate1, :endDate1) + 1) 
                    CAST(DATEADD(day, ROW_NUMBER() OVER(ORDER BY a.object_id) - 1, :startDate2) AS DATE) AS ProductionDate
                FROM sys.all_objects a
            ),
            DailyProduction AS (
                SELECT
                    CAST(t.transaction_timestamp AS DATE) as ProductionDate,
                    l.production_line,
                    SUM(CASE WHEN t.transaction_type = 'PRODUCTION_FG' THEN t.quantity ELSE 0 END) AS FG,
                    SUM(CASE WHEN t.transaction_type = 'PRODUCTION_HOLD' THEN t.quantity ELSE 0 END) AS Hold,
                    SUM(CASE WHEN t.transaction_type = 'PRODUCTION_SCRAP' THEN t.quantity ELSE 0 END) AS Scrap,
                    SUM(t.quantity * (60.0 / NULLIF(i.planned_output, 0))) as TotalTheoreticalMinutes
                FROM " . TRANSACTIONS_TABLE . " t
                JOIN " . ITEMS_TABLE . " i ON t.parameter_id = i.item_id
                JOIN " . LOCATIONS_TABLE . " l ON t.to_location_id = l.location_id
                WHERE t.transaction_timestamp BETWEEN :startDate3 AND DATEADD(day, 1, :endDate2)
                  AND t.transaction_type LIKE 'PRODUCTION_%' AND i.planned_output > 0
                  {$lineCondition}
                GROUP BY CAST(t.transaction_timestamp AS DATE), l.production_line
            ),
            DailySchedules AS (
                SELECT line, 
                       ISNULL(SUM(
                           CASE
                               WHEN end_time >= start_time THEN DATEDIFF(MINUTE, start_time, end_time)
                               ELSE DATEDIFF(MINUTE, start_time, end_time) + 1440
                           END - planned_break_minutes
                       ), 0) as DailyMinutes
                FROM " . SCHEDULES_TABLE . "
                WHERE is_active = 1
                GROUP BY line
            ),
            DailyDowntime AS (
                SELECT log_date, line, ISNULL(SUM(DATEDIFF(MINUTE, stop_begin, stop_end)), 0) as DowntimeMinutes
                FROM " . STOP_CAUSES_TABLE . "
                WHERE log_date BETWEEN :startDate4 AND :endDate3
                {$lineConditionStop}
                GROUP BY log_date, line
            ),
            CombinedData AS (
                SELECT
                    ds.ProductionDate,
                    ISNULL(sch.DailyMinutes, 0) as PlannedTime,
                    ISNULL(dt.DowntimeMinutes, 0) as Downtime,
                    ISNULL(dp.FG, 0) as FG,
                    ISNULL(dp.Hold, 0) as Hold,
                    ISNULL(dp.Scrap, 0) as Scrap,
                    ISNULL(dp.TotalTheoreticalMinutes, 0) as TheoreticalMinutes
                FROM DateSeries ds
                LEFT JOIN DailyProduction dp ON ds.ProductionDate = dp.ProductionDate
                LEFT JOIN DailySchedules sch ON dp.production_line = sch.line
                LEFT JOIN DailyDowntime dt ON ds.ProductionDate = dt.log_date AND dp.production_line = dt.line
            )
            SELECT
                ProductionDate,
                PlannedTime,
                Downtime,
                (PlannedTime - Downtime) as Runtime,
                FG, Hold, Scrap,
                (FG + Hold + Scrap) as ActualOutput,
                TheoreticalMinutes
            FROM CombinedData
            ORDER BY ProductionDate ASC;
        ";

        // --- สร้าง Array ของ Parameters ให้ตรงกับชื่อที่ไม่ซ้ำกัน ---
        $params = [
            ':startDate1' => $startDateStr, // ใช้ค่าที่อาจถูกปรับแก้แล้ว
            ':endDate1' => $endDateStr,
            ':startDate2' => $startDateStr, // ใช้ค่าที่อาจถูกปรับแก้แล้ว
            ':startDate3' => $startDateStr, // ใช้ค่าที่อาจถูกปรับแก้แล้ว
            ':endDate2' => $endDateStr,
            ':startDate4' => $startDateStr, // ใช้ค่าที่อาจถูกปรับแก้แล้ว
            ':endDate3' => $endDateStr
        ];
        if ($line) {
            $params[':line_prod'] = $line;
            $params[':line_stop'] = $line;
        }
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $dailyData = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // (ส่วนคำนวณและจัดรูปแบบข้อมูลเหมือนเดิม)
        $records = [];
        foreach ($dailyData as $row) {
            $runtime = max(0, (int)$row['Runtime']);
            $availability = ($row['PlannedTime'] > 0) ? ($runtime * 100.0 / $row['PlannedTime']) : 0;
            $performanceRaw = ($runtime > 0) ? ((float)$row['TheoreticalMinutes'] * 100.0 / $runtime) : 0;
            $performance = $performanceRaw > 100 ? 100.0 : $performanceRaw;
            $quality = ($row['ActualOutput'] > 0) ? ((int)$row['FG'] * 100.0 / (int)$row['ActualOutput']) : 0;
            $oee = ($availability / 100.0) * ($performance / 100.0) * ($quality / 100.0) * 100.0;
            
            $records[] = [
                "date" => date('d-m-y', strtotime($row['ProductionDate'])),
                "availability" => round($availability, 1),
                "performance"  => round($performance, 1),
                "quality"      => round($quality, 1),
                "oee"          => round($oee, 1)
            ];
        }
        
        echo json_encode(["success" => true, "records" => $records]);

    } else {
        // =============================================================
        // LOGIC การคำนวณชุดเก่า (OLD LOGIC - Stored Procedure)
        // =============================================================
        
        $stmt = $pdo->prepare("EXEC dbo.sp_CalculateOEE_LineChart @StartDate = ?, @EndDate = ?, @Line = ?, @Model = ?");
        // ส่งค่าที่อาจถูกปรับแก้แล้วเข้าไป
        $stmt->execute([$startDateStr, $endDateStr, $line, $model]);
        
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $stmt->closeCursor();

        $records = [];
        foreach ($results as $row) {
            $dateObj = new DateTime($row['date']);
            $records[] = [
                "date"         => $dateObj->format('d-m-y'),
                "availability" => (float)$row['availability'],
                "performance"  => (float)$row['performance'],
                "quality"      => (float)$row['quality'],
                "oee"          => (float)$row['oee']
            ];
        }
        echo json_encode(["success" => true, "records" => $records]);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'An error occurred in get_oee_linechart.php', 'error' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
}
?>