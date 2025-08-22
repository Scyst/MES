<?php
require_once __DIR__ . '/../../db.php';

try {
    $startDate = $_GET['startDate'] ?? date('Y-m-d');
    $endDate   = $_GET['endDate'] ?? date('Y-m-d');
    $line      = !empty($_GET['line']) ? $_GET['line'] : null;
    $model     = !empty($_GET['model']) ? $_GET['model'] : null;

    // --- 1. ดึงข้อมูลหลักสำหรับ Pie Chart (เหมือนเดิม) ---
    $mainSql = "EXEC dbo.sp_CalculateOEE_PieChart @StartDate = ?, @EndDate = ?, @Line = ?, @Model = ?";
    $mainStmt = $pdo->prepare($mainSql);
    $mainStmt->execute([$startDate, $endDate, $line, $model]);
    $mainResult = $mainStmt->fetch(PDO::FETCH_ASSOC);

    if (!$mainResult) {
        throw new Exception("Main stored procedure did not return a result.");
    }

    // --- 2. เพิ่ม: ดึงข้อมูลย้อนหลัง 7 วันสำหรับ Sparkline ---
    $sparklineStartDate = date('Y-m-d', strtotime($endDate . ' -6 days'));

    $sparklineSql = "EXEC dbo.sp_CalculateOEE_LineChart @StartDate = ?, @EndDate = ?, @Line = ?, @Model = ?";
    $sparklineStmt = $pdo->prepare($sparklineSql);
    $sparklineStmt->execute([$sparklineStartDate, $endDate, $line, $model]);
    $sparklineResult = $sparklineStmt->fetchAll(PDO::FETCH_ASSOC);

    // --- 3. รวมผลลัพธ์ทั้งหมดแล้วส่งกลับ ---
    $output = [
        "success" => true,
        // ข้อมูลหลัก
        "quality" => (float)$mainResult['Quality'],
        "availability" => (float)$mainResult['Availability'],
        "performance" => (float)$mainResult['Performance'],
        "oee" => (float)$mainResult['OEE'],
        "fg" => (int)$mainResult['FG'],
        "ng" => (int)($mainResult['NG'] ?? 0),
        "rework" => (int)($mainResult['Rework'] ?? 0),
        "hold" => (int)($mainResult['Hold'] ?? 0),
        "scrap" => (int)($mainResult['Scrap'] ?? 0),
        "etc" => (int)($mainResult['Etc'] ?? 0),
        "runtime" => (int)$mainResult['Runtime'],
        "planned_time" => (int)$mainResult['PlannedTime'],
        "downtime" => (int)$mainResult['Downtime'],
        "actual_output" => (int)$mainResult['ActualOutput'],
        "debug_info" => [
            "total_theoretical_minutes" => round((float)$mainResult['TotalTheoreticalMinutes'], 2)
        ],
        // ข้อมูล Sparkline
        "sparkline_data" => $sparklineResult
    ];

    echo json_encode($output);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'An error occurred: ' . $e->getMessage()]);
    error_log("Error in get_oee_piechart.php: " . $e->getMessage());
}
?>