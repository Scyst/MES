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
    $model = !empty($_GET['model']) ? $_GET['model'] : null;

    // =============================================================
    // START: LOGIC การคำนวณ BAR CHART
    // =============================================================

    // --- 1. ดึงข้อมูล Stop Causes (ส่วนนี้แก้ไขแล้วจากครั้งก่อน) ---
    $stopCauseGroupBy = $_GET['stopCauseGroupBy'] ?? 'cause'; 
    
    $stopConditions = ["CAST(DATEADD(HOUR, -8, stop_begin) AS DATE) BETWEEN ? AND ?"];
    $stopParams = [$startDate, $endDate];
    if ($line) {
        $stopConditions[] = "line = ?";
        $stopParams[] = $line;
    }
    $stopWhereClause = "WHERE " . implode(" AND ", $stopConditions);

    if ($stopCauseGroupBy === 'line') {
        $stopSql = "SELECT line as label, SUM(DATEDIFF(MINUTE, stop_begin, stop_end)) as total_minutes 
                    FROM " . STOP_CAUSES_TABLE . " {$stopWhereClause} 
                    GROUP BY line ORDER BY total_minutes DESC";
    } else {
        $stopSql = "SELECT cause as label, SUM(DATEDIFF(MINUTE, stop_begin, stop_end)) as total_minutes 
                    FROM " . STOP_CAUSES_TABLE . " {$stopWhereClause} 
                    GROUP BY cause ORDER BY total_minutes DESC";
    }

    $stopStmt = $pdo->prepare($stopSql);
    $stopStmt->execute($stopParams);
    $stopResults = $stopStmt->fetchAll(PDO::FETCH_ASSOC);

    // --- 2. ดึงข้อมูล Production Results (ส่วนนี้คือที่แก้ไข) ---
    
    // (ใช้ Logic 8-Hour Shift ที่เราแก้ไปครั้งที่แล้ว)
    $partConditions = ["CAST(DATEADD(HOUR, -8, t.transaction_timestamp) AS DATE) BETWEEN ? AND ?"];
    $partParams = [$startDate, $endDate];
    
    if ($line) {
        $partConditions[] = "l.production_line = ?";
        $partParams[] = $line;
    }
    if ($model) {
        $partConditions[] = "r.model = ?";
        $partParams[] = $model;
    }
    $partWhereClause = "WHERE " . implode(" AND ", $partConditions);

    // ✅ [แก้ไข] เปลี่ยน JOIN เป็น LEFT JOIN และเพิ่ม ISNULL
    $partSql = "
        SELECT 
            i.part_no,
            ISNULL(l.production_line, 'N/A') as production_line,
            ISNULL(r.model, 'N/A') as model,
            SUM(CASE WHEN t.transaction_type = 'PRODUCTION_FG' THEN t.quantity ELSE 0 END) as FG,
            SUM(CASE WHEN t.transaction_type = 'PRODUCTION_HOLD' THEN t.quantity ELSE 0 END) as HOLD,
            SUM(CASE WHEN t.transaction_type = 'PRODUCTION_SCRAP' THEN t.quantity ELSE 0 END) as SCRAP
        FROM " . TRANSACTIONS_TABLE . " t
        
        -- ✅ [แก้ไข] Item ต้องมีเสมอ (ใช้ INNER JOIN ถูกต้อง)
        JOIN " . ITEMS_TABLE . " i ON t.parameter_id = i.item_id
        
        -- ✅ [แก้ไข] Location อาจไม่มี (ใช้ LEFT JOIN)
        LEFT JOIN " . LOCATIONS_TABLE . " l ON t.to_location_id = l.location_id
        
        -- ✅ [แก้ไข] Route อาจยังไม่ถูกตั้งค่า (ใช้ LEFT JOIN)
        LEFT JOIN " . ROUTES_TABLE . " r ON t.parameter_id = r.item_id AND l.production_line = r.line
        
        {$partWhereClause} 
        -- 🔴 [ลบออก] ลบ AND l.production_line IS NOT NULL (เพราะจะทำให้ LEFT JOIN กลายเป็น INNER JOIN)
        
        -- ✅ [แก้ไข] เพิ่ม ISNULL ใน GROUP BY เพื่อรองรับค่าว่าง
        GROUP BY i.part_no, ISNULL(l.production_line, 'N/A'), ISNULL(r.model, 'N/A')
        
        HAVING SUM(t.quantity) > 0 
        ORDER BY i.part_no, production_line, model ASC
    ";

    $partStmt = $pdo->prepare($partSql);
    $partStmt->execute($partParams);
    $partResults = $partStmt->fetchAll(PDO::FETCH_ASSOC);

    // --- 3. จัดรูปแบบข้อมูลสำหรับ Frontend (ส่วนของ Stop Causes) ---
    $stopCauseLabels = array_column($stopResults, 'label');
    $stopCauseData = array_column($stopResults, 'total_minutes');

    // --- 4. ส่งข้อมูลกลับ ---
    echo json_encode([
        "success" => true,
        "data" => [
            "partResults" => $partResults,
            "stopCause" => [
                "labels" => $stopCauseLabels,
                "datasets" => [
                    ["label" => "Downtime (min)", "data" => $stopCauseData]
                ]
            ]
        ]
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
}
?>