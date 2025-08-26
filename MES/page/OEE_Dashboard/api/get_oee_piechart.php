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
    $model     = !empty($_GET['model']) ? $_GET['model'] : null; // Model ยังคงรับค่ามา แต่ไม่ได้ใช้ในการคำนวณหลักแล้ว

    if (defined('USE_NEW_OEE_CALCULATION') && USE_NEW_OEE_CALCULATION === true) {
        
        // =============================================================
        // START: LOGIC การคำนวณ OEE ชุดใหม่ (สถาปัตยกรรมใหม่)
        // =============================================================
        
        // (ส่วนการคำนวณ Planned Time และ Downtime ยังคงเหมือนเดิม)
        $totalPlannedMinutes = 0; // Placeholder
        $totalDowntimeMinutes = 0; // Placeholder
        $totalRuntimeMinutes = 0; // Placeholder
        
        // --- ดึงข้อมูลการผลิต (เรียบง่ายและแม่นยำขึ้นมาก) ---
        $mainSql = "
            SELECT
                SUM(CASE WHEN t.transaction_type = 'PRODUCTION_FG' THEN t.quantity ELSE 0 END) AS FG,
                SUM(CASE WHEN t.transaction_type = 'PRODUCTION_HOLD' THEN t.quantity ELSE 0 END) AS Hold,
                SUM(CASE WHEN t.transaction_type = 'PRODUCTION_SCRAP' THEN t.quantity ELSE 0 END) AS Scrap,
                -- << ดึง planned_output จากตาราง ITEMS โดยตรง >>
                SUM(t.quantity * (60.0 / NULLIF(i.planned_output, 0))) as TotalTheoreticalMinutes
            FROM " . TRANSACTIONS_TABLE . " t
            -- << JOIN แค่ตารางเดียวจบ! >>
            JOIN " . ITEMS_TABLE . " i ON t.parameter_id = i.item_id
            JOIN " . LOCATIONS_TABLE . " l ON t.to_location_id = l.location_id
            WHERE t.transaction_timestamp BETWEEN ? AND DATEADD(day, 1, ?)
              AND t.transaction_type LIKE 'PRODUCTION_%'
              AND i.planned_output > 0 -- คำนวณเฉพาะรายการที่มีมาตรฐานการผลิต
              " . ($line ? "AND l.location_name = ?" : "") . "
        ";
        $mainStmt = $pdo->prepare($mainSql);
        $mainParams = [$startDate, $endDate];
        if ($line) $mainParams[] = $line;
        $mainStmt->execute($mainParams);
        $mainResult = $mainStmt->fetch(PDO::FETCH_ASSOC);
        $mainStmt->closeCursor();

        // (ส่วนการคำนวณ OEE และจัดรูปแบบผลลัพธ์เหมือนเดิม)
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
        
        // --- 4. ดึงข้อมูล Sparkline (ยังคงเป็น Placeholder) ---
        $sparklineResult = [];

        // --- 5. รวมผลลัพธ์ทั้งหมดในโครงสร้างที่ถูกต้อง ---
        $output = [
            "success" => true,
            "quality" => round($quality, 1),
            "availability" => round($availability, 1),
            "performance" => round($performance, 1),
            "oee" => round($oee, 1),
            "fg" => $totalFG,
            "defects" => $totalDefects,
            "hold" => $totalHold, // << เพิ่มค่า Hold
            "scrap" => $totalScrap, // << เพิ่มค่า Scrap
            "runtime" => $totalRuntimeMinutes,
            "planned_time" => $totalPlannedMinutes,
            "downtime" => $totalDowntimeMinutes,
            "actual_output" => $totalActualOutput,
            "total_theoretical_minutes" => round($totalTheoreticalMinutes, 2),
            "sparkline_data" => $sparklineResult
        ];
        echo json_encode($output);

    } else {
        // =============================================================
        // START: ยกเครื่อง LOGIC การคำนวณชุดเก่า (OLD LOGIC) ใหม่
        // =============================================================
        
        // --- 1. ดึงข้อมูลหลักสำหรับ Pie Chart ---
        $mainStmt = $pdo->prepare("EXEC dbo.sp_CalculateOEE_PieChart @StartDate = ?, @EndDate = ?, @Line = ?, @Model = ?");
        $mainStmt->execute([$startDate, $endDate, $line, $model]);
        $mainResult = $mainStmt->fetch(PDO::FETCH_ASSOC);

        if (!$mainResult) {
            throw new Exception("Stored Procedure sp_CalculateOEE_PieChart did not return a result.");
        }
        // ปิด cursor เพื่อให้สามารถรัน query ต่อไปได้
        $mainStmt->closeCursor(); 

        // --- 2. ดึงข้อมูลย้อนหลัง 7 วันสำหรับ Sparkline ---
        $sparklineStartDate = date('Y-m-d', strtotime($endDate . ' -6 days'));
        $sparklineStmt = $pdo->prepare("EXEC dbo.sp_CalculateOEE_LineChart @StartDate = ?, @EndDate = ?, @Line = ?, @Model = ?");
        $sparklineStmt->execute([$sparklineStartDate, $endDate, $line, $model]);
        $sparklineResult = $sparklineStmt->fetchAll(PDO::FETCH_ASSOC);

        // --- 3. รวมผลลัพธ์ทั้งหมดแล้วส่งกลับในโครงสร้างที่ถูกต้อง ---
        $output = [
            "success" => true,
            // ข้อมูลหลัก
            "quality" => (float)$mainResult['Quality'],
            "availability" => (float)$mainResult['Availability'],
            "performance" => (float)$mainResult['Performance'],
            "oee" => (float)$mainResult['OEE'],
            "fg" => (int)$mainResult['FG'],
            "defects" => (int)$mainResult['Defects'],
            "ng" => (int)($mainResult['NG'] ?? 0),
            "rework" => (int)($mainResult['Rework'] ?? 0),
            "hold" => (int)($mainResult['Hold'] ?? 0),
            "scrap" => (int)($mainResult['Scrap'] ?? 0),
            "etc" => (int)($mainResult['Etc'] ?? 0),
            "runtime" => (int)$mainResult['Runtime'],
            "planned_time" => (int)$mainResult['PlannedTime'],
            "downtime" => (int)$mainResult['Downtime'],
            "actual_output" => (int)$mainResult['ActualOutput'],
            "total_theoretical_minutes" => round((float)$mainResult['TotalTheoreticalMinutes'], 2),
             // ข้อมูล Sparkline
            "sparkline_data" => $sparklineResult
        ];

        echo json_encode($output);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
}
?>