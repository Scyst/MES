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
    $stopCauseGroupBy = $_GET['stopCauseGroupBy'] ?? 'cause'; // รับค่า, ถ้าไม่มีให้ใช้ 'cause' เป็น default

    $stopConditions = ["log_date BETWEEN ? AND ?"];
    $stopParams = [$startDate, $endDate];
    if ($line) {
        $stopConditions[] = "line = ?";
        $stopParams[] = $line;
    }
    $stopWhereClause = "WHERE " . implode(" AND ", $stopConditions);

    // ✅ ใช้ if-else เพื่อสร้าง Query ตาม GroupBy ที่เลือก
    if ($stopCauseGroupBy === 'line') {
        $stopSql = "SELECT line as label, SUM(DATEDIFF(MINUTE, stop_begin, stop_end)) as total_minutes 
                    FROM " . STOP_CAUSES_TABLE . " {$stopWhereClause} 
                    GROUP BY line ORDER BY total_minutes DESC";
    } else { // Default to 'cause'
        $stopSql = "SELECT cause as label, SUM(DATEDIFF(MINUTE, stop_begin, stop_end)) as total_minutes 
                    FROM " . STOP_CAUSES_TABLE . " {$stopWhereClause} 
                    GROUP BY cause ORDER BY total_minutes DESC";
    }

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
    if ($model) {
        $partConditions[] = "r.model = ?";
        $partParams[] = $model;
    }
    $partWhereClause = "WHERE " . implode(" AND ", $partConditions);

    $partSql = "
        SELECT 
            i.part_no,
            l.production_line,
            r.model,
            SUM(CASE WHEN t.transaction_type = 'PRODUCTION_FG' THEN t.quantity ELSE 0 END) as FG,
            SUM(CASE WHEN t.transaction_type = 'PRODUCTION_HOLD' THEN t.quantity ELSE 0 END) as HOLD,
            SUM(CASE WHEN t.transaction_type = 'PRODUCTION_SCRAP' THEN t.quantity ELSE 0 END) as SCRAP
        FROM " . TRANSACTIONS_TABLE . " t
        JOIN " . LOCATIONS_TABLE . " l ON t.to_location_id = l.location_id
        JOIN " . ITEMS_TABLE . " i ON t.parameter_id = i.item_id
        JOIN " . ROUTES_TABLE . " r ON t.parameter_id = r.item_id AND l.production_line = r.line
        {$partWhereClause} AND l.production_line IS NOT NULL
        GROUP BY i.part_no, l.production_line, r.model -- ✅ จัดกลุ่มให้ละเอียดขึ้น
        HAVING SUM(t.quantity) > 0 -- ✅ แสดงเฉพาะรายการที่มีการผลิต
        ORDER BY i.part_no, l.production_line, r.model ASC
    ";

    $partStmt = $pdo->prepare($partSql);
    $partStmt->execute($partParams);
    $partResults = $partStmt->fetchAll(PDO::FETCH_ASSOC);

    // --- 3. จัดรูปแบบข้อมูลสำหรับ Frontend (ส่วนของ Stop Causes) ---
    $stopCauseLabels = array_column($stopResults, 'label');
    $stopCauseData = array_column($stopResults, 'total_minutes');

    // --- 4. ส่งข้อมูลกลับ (ส่ง partResults ไปทั้งก้อน) ---
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