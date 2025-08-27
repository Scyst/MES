<?php
// api/OEE_Dashboard/get_oee_barchart.php
header('Content-Type: application/json');

ini_set('display_errors', 1);
error_reporting(E_ALL);

require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../../config/config.php';

// ฟังก์ชันสำหรับแปลงนาทีเป็นรูปแบบ "Xh XXm" (ยังคงใช้เหมือนเดิม)
function formatMinutes($minutes) {
    $h = floor($minutes / 60);
    $m = round($minutes % 60);
    return sprintf("%dh %02dm", $h, $m);
}

try {
    $startDate = $_GET['startDate'] ?? date('Y-m-d');
    $endDate = $_GET['endDate'] ?? date('Y-m-d');
    $line = !empty($_GET['line']) ? $_GET['line'] : null;
    $model = !empty($_GET['model']) ? $_GET['model'] : null;

    if (defined('USE_NEW_OEE_CALCULATION') && USE_NEW_OEE_CALCULATION === true) {

        // =============================================================
        // START: LOGIC การคำนวณ BAR CHART (NEW LOGIC)
        // =============================================================

        // --- 1. ดึงข้อมูล Stop Causes (ส่วนนี้เหมือนเดิม เพราะใช้ตารางเดียวกัน) ---
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
            "data" => [ // << เพิ่ม "กล่อง" data ครอบทั้งหมด
                "parts" => [ // << เปลี่ยนชื่อจาก "parts_production" เป็น "parts"
                    "labels"   => $partLabels,
                    "FG"       => $FG,
                    "HOLD"     => $HOLD,
                    "SCRAP"    => $SCRAP,
                    // เพิ่ม Key ที่ขาดไปเพื่อให้โครงสร้างสมบูรณ์
                    "NG"       => [], 
                    "REWORK"   => [],
                    "ETC"      => []
                ],
                "stopCause" => [ // << เปลี่ยนชื่อจาก "stop_causes" เป็น "stopCause"
                    "labels" => $stopCauseLabels,
                    "datasets" => [
                        ["label" => "Downtime (min)", "data" => $stopCauseData]
                    ],
                    "tooltipInfo" => [] // เพิ่ม Key ที่ขาดไป
                ]
            ]
        ]);

    } else {
        // =============================================================
        // START: LOGIC การคำนวณชุดเก่า (OLD LOGIC - ฉบับสมบูรณ์)
        // =============================================================
        
        $stopConditions = ["log_date BETWEEN ? AND ?"];
        $stopParams = [$startDate, $endDate];
        $partConditions = ["log_date BETWEEN ? AND ?"];
        $partParams = [$startDate, $endDate];

        if (!empty($line)) {
            $stopConditions[] = "LOWER(line) = LOWER(?)";
            $stopParams[] = $line;
            $partConditions[] = "LOWER(line) = LOWER(?)";
            $partParams[] = $line;
        }
        if (!empty($model)) {
            $partConditions[] = "LOWER(model) = LOWER(?)";
            $partParams[] = $model;
        }
        
        $stopWhere = "WHERE " . implode(" AND ", $stopConditions);
        $partWhere = "WHERE " . implode(" AND ", $partConditions);

        $stopSql = "
            SELECT cause, line, SUM(DATEDIFF(SECOND, stop_begin, stop_end)) as total_seconds
            FROM " . STOP_CAUSES_TABLE . " {$stopWhere}
            GROUP BY cause, line ORDER BY cause, line
        ";
        $stopStmt = $pdo->prepare($stopSql);
        $stopStmt->execute($stopParams);
        $stopResults = $stopStmt->fetchAll(PDO::FETCH_ASSOC);

        $causeMap = []; $lineTotals = []; $lineSet = [];
        foreach ($stopResults as $row) {
            $cause = $row['cause'];
            $lineName = $row['line'];
            $minutes = round(($row['total_seconds'] ?? 0) / 60, 1);
            $causeMap[$cause][$lineName] = $minutes;
            $lineTotals[$lineName] = ($lineTotals[$lineName] ?? 0) + $minutes;
            $lineSet[$lineName] = true;
        }
        
        $lineList = array_keys($lineSet);
        usort($lineList, fn($a, $b) => ($lineTotals[$b] ?? 0) <=> ($lineTotals[$a] ?? 0));
        
        $colorPalette = ["#42a5f5", "#66bb6a", "#ff7043", "#ab47bc", "#ffa726", "#26c6da", "#d4e157", "#8d6e63", "#78909c", "#ec407a"];
        $stopDatasets = [];
        $colorIndex = 0;
        foreach ($causeMap as $causeName => $lineData) {
            $dataset = ["label" => $causeName, "data" => [], "backgroundColor" => $colorPalette[$colorIndex++ % count($colorPalette)], "borderRadius" => 4];
            foreach ($lineList as $lineName) {
                $dataset["data"][] = $lineData[$lineName] ?? 0;
            }
            $stopDatasets[] = $dataset;
        }

        $lineTooltipInfo = [];
        foreach ($lineList as $lineName) {
            $lineTooltipInfo[$lineName] = formatMinutes($lineTotals[$lineName] ?? 0);
        }
        
        $partSql = "
            SELECT TOP 50 
                part_no + ' (' + model + ' / ' + line + ')' AS group_label,
                SUM(CASE WHEN count_type = 'FG' THEN ISNULL(count_value, 0) ELSE 0 END) AS FG,
                SUM(CASE WHEN count_type = 'NG' THEN ISNULL(count_value, 0) ELSE 0 END) AS NG,
                SUM(CASE WHEN count_type = 'HOLD' THEN ISNULL(count_value, 0) ELSE 0 END) AS HOLD,
                SUM(CASE WHEN count_type = 'REWORK' THEN ISNULL(count_value, 0) ELSE 0 END) AS REWORK,
                SUM(CASE WHEN count_type = 'SCRAP' THEN ISNULL(count_value, 0) ELSE 0 END) AS SCRAP,
                SUM(CASE WHEN count_type = 'ETC.' THEN ISNULL(count_value, 0) ELSE 0 END) AS ETC
            FROM " . PARTS_TABLE . "
            {$partWhere}
            GROUP BY line, model, part_no
            ORDER BY SUM(ISNULL(count_value, 0)) DESC
        ";
        $partStmt = $pdo->prepare($partSql);
        $partStmt->execute($partParams);
        $partResults = $partStmt->fetchAll(PDO::FETCH_ASSOC);

        $partLabels = array_column($partResults, 'group_label');
        $FG = array_column($partResults, 'FG');
        $NG = array_column($partResults, 'NG');
        $HOLD = array_column($partResults, 'HOLD');
        $REWORK = array_column($partResults, 'REWORK');
        $SCRAP = array_column($partResults, 'SCRAP');
        $ETC = array_column($partResults, 'ETC');

        $finalData = [
            "stopCause" => ["labels" => $lineList, "datasets" => $stopDatasets, "tooltipInfo" => $lineTooltipInfo],
            "parts" => [
                "labels"   => $partLabels, "FG" => $FG, "NG" => $NG, "HOLD" => $HOLD,
                "REWORK" => $REWORK, "SCRAP" => $SCRAP, "ETC" => $ETC
            ]
        ];
            
        echo json_encode(['success' => true, 'data' => $finalData]);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
}
?>