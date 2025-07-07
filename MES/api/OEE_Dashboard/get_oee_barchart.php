<?php
require_once __DIR__ . '/../db.php';

// ฟังก์ชันสำหรับแปลงนาทีเป็นรูปแบบ "Xh XXm"
function formatMinutes($minutes) {
    $h = floor($minutes / 60);
    $m = round($minutes % 60);
    return sprintf("%dh %02dm", $h, $m);
}

try {
    // --- 1. รับค่า Filter และเตรียมเงื่อนไขสำหรับ SQL ---

    // รับค่าจาก GET parameter, หากไม่มีให้ใช้วันที่ปัจจุบัน
    $startDate = $_GET['startDate'] ?? date('Y-m-d');
    $endDate = $_GET['endDate'] ?? date('Y-m-d');
    $line = $_GET['line'] ?? null;
    $model = $_GET['model'] ?? null;

    // เตรียมเงื่อนไข WHERE และพารามิเตอร์สำหรับ Query ข้อมูล Stop Causes
    $stopConditions = ["log_date BETWEEN ? AND ?"];
    $stopParams = [$startDate, $endDate];
    // เตรียมเงื่อนไข WHERE และพารามิเตอร์สำหรับ Query ข้อมูล Parts
    $partConditions = ["log_date BETWEEN ? AND ?"];
    $partParams = [$startDate, $endDate];

    // เพิ่มเงื่อนไข Line ถ้ามีค่าส่งมา
    if (!empty($line)) {
        $stopConditions[] = "LOWER(line) = LOWER(?)";
        $stopParams[] = $line;
        $partConditions[] = "LOWER(line) = LOWER(?)";
        $partParams[] = $line;
    }
    // เพิ่มเงื่อนไข Model ถ้ามีค่าส่งมา (เฉพาะข้อมูล Parts)
    if (!empty($model)) {
        $partConditions[] = "LOWER(model) = LOWER(?)";
        $partParams[] = $model;
    }

    // รวมเงื่อนไขทั้งหมดเข้าด้วยกันเป็น String สำหรับ WHERE clause
    $stopWhere = "WHERE " . implode(" AND ", $stopConditions);
    $partWhere = "WHERE " . implode(" AND ", $partConditions);

    // --- 2. Query และประมวลผลข้อมูล Stop Causes ---

    // SQL สำหรับรวมระยะเวลาที่เครื่องจักรหยุดทำงาน โดยจัดกลุ่มตามสาเหตุและไลน์ผลิต
    $stopSql = "
        SELECT cause, line, SUM(DATEDIFF(SECOND, stop_begin, stop_end)) AS total_seconds
        FROM STOP_CAUSES
        $stopWhere
        GROUP BY cause, line
    ";

    // ประมวลผล SQL
    $stopStmt = $pdo->prepare($stopSql);
    $stopStmt->execute($stopParams);
    $stopResults = $stopStmt->fetchAll();

    // สร้าง Map เพื่อจัดเก็บข้อมูลและคำนวณผลรวม
    $causeMap = []; // [cause][line] => total_minutes
    $lineTotals = []; // [line] => total_minutes
    $lineSet = []; // เก็บชื่อ Line ที่ไม่ซ้ำกัน

    // วนลูปผลลัพธ์เพื่อจัดรูปแบบข้อมูลใหม่
    foreach ($stopResults as $row) {
        $cause = $row['cause'];
        $line = $row['line'];
        $minutes = round(($row['total_seconds'] ?? 0) / 60, 1);

        $causeMap[$cause][$line] = $minutes;
        $lineTotals[$line] = ($lineTotals[$line] ?? 0) + $minutes;
        $lineSet[$line] = true;
    }
    
    // --- 3. จัดเรียงข้อมูลและเตรียมสำหรับ Chart ---

    // ดึงรายชื่อ Line ทั้งหมดและเรียงลำดับตามยอดรวมเวลานานที่สุดไปน้อยที่สุด
    $lineList = array_keys($lineSet);
    usort($lineList, fn($a, $b) => ($lineTotals[$b] ?? 0) <=> ($lineTotals[$a] ?? 0));
    
    // เตรียมชุดข้อมูล (Datasets) สำหรับ Bar Chart ของ Stop Causes
    $colorPalette = ["#42a5f5", "#66bb6a", "#ff7043", "#ab47bc", "#ffa726", "#26c6da", "#d4e157", "#8d6e63", "#78909c", "#ec407a"];
    $stopDatasets = [];
    $colorIndex = 0;

    // วนลูปตาม Cause เพื่อสร้างแต่ละแท่งของข้อมูลในกราฟ
    foreach ($causeMap as $causeName => $lineData) {
        $dataset = [
            "label" => $causeName,
            "data" => [],
            "backgroundColor" => $colorPalette[$colorIndex++ % count($colorPalette)],
            "borderRadius" => 4
        ];
        // วนลูปตามรายชื่อ Line ที่เรียงลำดับไว้ เพื่อให้ข้อมูลในกราฟตรงกัน
        foreach ($lineList as $lineName) {
            $dataset["data"][] = $lineData[$lineName] ?? 0;
        }
        $stopDatasets[] = $dataset;
    }

    // เตรียมข้อมูล Tooltip ที่จะแสดงผลรวมเวลาของแต่ละ Line
    $lineTooltipInfo = [];
    foreach ($lineList as $lineName) {
        $lineTooltipInfo[$lineName] = formatMinutes($lineTotals[$lineName] ?? 0);
    }
    
    // --- 4. Query และประมวลผลข้อมูล Parts ---

    // SQL สำหรับรวมจำนวน Parts ประเภทต่างๆ โดยจัดกลุ่มตาม Part Number และแสดง 50 อันดับแรก
    $partSql = "
        SELECT TOP 50 part_no,
            SUM(CASE WHEN count_type = 'FG' THEN ISNULL(count_value, 0) ELSE 0 END) AS FG,
            SUM(CASE WHEN count_type = 'NG' THEN ISNULL(count_value, 0) ELSE 0 END) AS NG,
            SUM(CASE WHEN count_type = 'HOLD' THEN ISNULL(count_value, 0) ELSE 0 END) AS HOLD,
            SUM(CASE WHEN count_type = 'REWORK' THEN ISNULL(count_value, 0) ELSE 0 END) AS REWORK,
            SUM(CASE WHEN count_type = 'SCRAP' THEN ISNULL(count_value, 0) ELSE 0 END) AS SCRAP,
            SUM(CASE WHEN count_type = 'ETC.' THEN ISNULL(count_value, 0) ELSE 0 END) AS ETC
        FROM PARTS
        $partWhere
        GROUP BY part_no
        ORDER BY SUM(ISNULL(count_value, 0)) DESC
    ";

    // ประมวลผล SQL
    $partStmt = $pdo->prepare($partSql);
    $partStmt->execute($partParams);
    $partResults = $partStmt->fetchAll();
    
    // เตรียม Array สำหรับเก็บข้อมูลแต่ละประเภทของ Part
    $partLabels = [];
    $FG = [];
    $NG = [];
    $HOLD = [];
    $REWORK = [];
    $SCRAP = [];
    $ETC = [];

    // วนลูปเพื่อแยกข้อมูลแต่ละประเภทออกจากผลลัพธ์
    foreach ($partResults as $row) {
        $partLabels[] = $row['part_no'];
        $FG[] = (int) $row['FG'];
        $NG[] = (int) $row['NG'];
        $HOLD[] = (int) $row['HOLD'];
        $REWORK[] = (int) $row['REWORK'];
        $SCRAP[] = (int) $row['SCRAP'];
        $ETC[] = (int) $row['ETC'];
    }
    
    // --- 5. รวบรวมข้อมูลทั้งหมดและส่งออกเป็น JSON ---

    // จัดโครงสร้างข้อมูลสุดท้ายที่จะส่งกลับไปให้ Frontend
    $finalData = [
        "stopCause" => [
            "labels" => $lineList,
            "datasets" => $stopDatasets,
            "tooltipInfo" => $lineTooltipInfo
        ],
        "parts" => [
            "labels"   => $partLabels,
            "FG"       => $FG,
            "NG"       => $NG,
            "HOLD"     => $HOLD,
            "REWORK"   => $REWORK,
            "SCRAP"    => $SCRAP,
            "ETC"      => $ETC
        ]
    ];
    
    // ส่งข้อมูลกลับในรูปแบบ JSON
    echo json_encode(['success' => true, 'data' => $finalData]);

} catch (PDOException $e) {
    // กรณีเกิดข้อผิดพลาด: ตอบกลับด้วยสถานะ 500 และบันทึก log
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Query failed: ' . $e->getMessage()]);
    error_log("Error in get_oee_barchart.php: " . $e->getMessage());
}
?>