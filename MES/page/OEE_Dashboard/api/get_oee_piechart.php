<?php
// api/OEE_Dashboard/get_oee_piechart.php
header('Content-Type: application/json');

require_once __DIR__ . '/../../db.php';

try {
    $startDate = $_GET['startDate'] ?? date('Y-m-d');
    $endDate   = $_GET['endDate'] ?? date('Y-m-d');
    $line      = !empty($_GET['line']) ? $_GET['line'] : null;
    $model     = !empty($_GET['model']) ? $_GET['model'] : null;

    // --- 1. ดึงข้อมูลสรุปทั้งหมดจาก SP ตัวหลัก (สำหรับ Pie Chart) ---
    $pieSql = "EXEC dbo." . SP_CALC_OEE_PIE . " @StartDate = ?, @EndDate = ?, @Line = ?, @Model = ?";
    
    $pieStmt = $pdo->prepare($pieSql);
    $pieStmt->execute([$startDate, $endDate, $line, $model]);
    $summaryData = $pieStmt->fetch(PDO::FETCH_ASSOC);
    $pieStmt->closeCursor();

    // --- 2. [ลบออก] ไม่ต้องดึงข้อมูล Line Chart จากไฟล์นี้แล้ว ---

    // --- 3. รวบรวมข้อมูลเพื่อส่งกลับ (เฉพาะ Pie Chart) ---
    $output = [
        "success" => true,
        "quality" => round((float)($summaryData['Quality'] ?? 0), 1),
        "availability" => round((float)($summaryData['Availability'] ?? 0), 1),
        "performance" => round((float)($summaryData['Performance'] ?? 0), 1),
        "oee" => round((float)($summaryData['OEE'] ?? 0), 1),
        "fg" => (int)($summaryData['FG'] ?? 0),
        "defects" => (int)($summaryData['Defects'] ?? 0),
        "hold" => (int)($summaryData['Hold'] ?? 0),
        "scrap" => (int)($summaryData['Scrap'] ?? 0),
        "runtime" => (float)($summaryData['Runtime'] ?? 0),
        "planned_time" => (float)($summaryData['PlannedTime'] ?? 0),
        "downtime" => (float)($summaryData['Downtime'] ?? 0),
        "actual_output" => (int)($summaryData['ActualOutput'] ?? 0),
        "total_theoretical_minutes" => round((float)($summaryData['TotalTheoreticalMinutes'] ?? 0), 2)
        // [ลบออก] "sparkline_data"
    ];
    echo json_encode($output);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>