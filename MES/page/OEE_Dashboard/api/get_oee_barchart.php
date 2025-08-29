<?php
// api/OEE_Dashboard/get_oee_barchart.php
header('Content-Type: application/json');

ini_set('display_errors', 1);
error_reporting(E_ALL);

require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../../config/config.php';

try {
    $startDate = $_GET['startDate'] ?? date('Y-m-d');
    $endDate = $_GET['endDate'] ?? date('Y-m-d');
    $line = !empty($_GET['line']) ? $_GET['line'] : null;
    $model = !empty($_GET['model']) ? $_GET['model'] : null; // ยังคงรับค่ามาเผื่ออนาคต

    // =============================================================
    // START: LOGIC การคำนวณ BAR CHART (NEW LOGIC)
    // =============================================================

    // --- 1. ดึงข้อมูล Stop Causes ---
    $stopConditions = ["log_date BETWEEN ? AND ?"];
    $stopParams = [$startDate, $endDate];
    if ($line) {
        $stopConditions[] = "line = ?";
        $stopParams[] = $line;
    }
    $stopWhereClause = "WHERE " . implode(" AND ", $stopConditions);
    $stopSql = "SELECT cause, SUM(DATEDIFF(MINUTE, stop_begin, stop_end)) as total_minutes FROM " . STOP_CAUSES_TABLE . " {$stopWhereClause} GROUP BY cause ORDER BY total_minutes DESC";
    $stopStmt = $pdo->prepare($stopSql);
    $stopStmt->execute($stopParams);
    $stopResults = $stopStmt->fetchAll(PDO::FETCH_ASSOC);

    // --- 2. ดึงข้อมูล Production Results จากระบบใหม่ ---
    $partConditions = ["t.transaction_timestamp BETWEEN ? AND DATEADD(day, 1, ?)"];
    $partParams = [$startDate, $endDate];
    if ($line) {
        $partConditions[] = "l.production_line = ?";
        $partParams[] = $line;
    }
    $partWhereClause = "WHERE " . implode(" AND ", $partConditions);

    $partSql = "
        SELECT 
            l.production_line as group_label,
            SUM(CASE WHEN t.transaction_type = 'PRODUCTION_FG' THEN t.quantity ELSE 0 END) as FG,
            SUM(CASE WHEN t.transaction_type = 'PRODUCTION_HOLD' THEN t.quantity ELSE 0 END) as HOLD,
            SUM(CASE WHEN t.transaction_type = 'PRODUCTION_SCRAP' THEN t.quantity ELSE 0 END) as SCRAP
        FROM " . TRANSACTIONS_TABLE . " t
        JOIN " . LOCATIONS_TABLE . " l ON t.to_location_id = l.location_id
        {$partWhereClause} AND l.production_line IS NOT NULL
        GROUP BY l.production_line
        ORDER BY l.production_line
    ";
    $partStmt = $pdo->prepare($partSql);
    $partStmt->execute($partParams);
    $partResults = $partStmt->fetchAll(PDO::FETCH_ASSOC);

    // --- 3. จัดรูปแบบข้อมูลสำหรับ Frontend ---
    $stopCauseLabels = array_column($stopResults, 'cause');
    $stopCauseData = array_column($stopResults, 'total_minutes');
    
    $partLabels = array_column($partResults, 'group_label');
    $FG = array_column($partResults, 'FG');
    $HOLD = array_column($partResults, 'HOLD');
    $SCRAP = array_column($partResults, 'SCRAP');

    // --- 4. ส่งข้อมูลกลับ ---
    echo json_encode([
        "success" => true,
        "data" => [
            "parts" => [
                "labels"   => $partLabels,
                "FG"       => $FG,
                "HOLD"     => $HOLD,
                "SCRAP"    => $SCRAP,
                // เพิ่ม Key ที่ขาดไปเพื่อให้โครงสร้างสมบูรณ์
                "NG"       => [], 
                "REWORK"   => [],
                "ETC"      => []
            ],
            "stopCause" => [
                "labels" => $stopCauseLabels,
                "datasets" => [
                    ["label" => "Downtime (min)", "data" => $stopCauseData]
                ],
                "tooltipInfo" => [] // เพิ่ม Key ที่ขาดไป
            ]
        ]
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
}
?>