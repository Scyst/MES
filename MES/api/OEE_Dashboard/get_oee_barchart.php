<?php
require_once __DIR__ . '/../db.php';

function formatMinutes($minutes) {
    $h = floor($minutes / 60);
    $m = round($minutes % 60);
    return sprintf("%dh %02dm", $h, $m);
}

try {
    $startDate = $_GET['startDate'] ?? date('Y-m-d');
    $endDate = $_GET['endDate'] ?? date('Y-m-d');
    $line = $_GET['line'] ?? null;
    $model = $_GET['model'] ?? null;

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
        SELECT cause, line, SUM(DATEDIFF(SECOND, stop_begin, stop_end)) AS total_seconds
        FROM IOT_TOOLBOX_STOP_CAUSES
        $stopWhere
        GROUP BY cause, line
    ";

    $stopStmt = $pdo->prepare($stopSql);
    $stopStmt->execute($stopParams);
    $stopResults = $stopStmt->fetchAll();

    $causeMap = [];
    $lineTotals = [];
    $lineSet = [];

    foreach ($stopResults as $row) {
        $cause = $row['cause'];
        $line = $row['line'];
        $minutes = round(($row['total_seconds'] ?? 0) / 60, 1);

        $causeMap[$cause][$line] = $minutes;
        $lineTotals[$line] = ($lineTotals[$line] ?? 0) + $minutes;
        $lineSet[$line] = true;
    }

    $lineList = array_keys($lineSet);
    usort($lineList, fn($a, $b) => ($lineTotals[$b] ?? 0) <=> ($lineTotals[$a] ?? 0));

    $colorPalette = ["#42a5f5", "#66bb6a", "#ff7043", "#ab47bc", "#ffa726", "#26c6da", "#d4e157", "#8d6e63", "#78909c", "#ec407a"];
    $stopDatasets = [];
    $colorIndex = 0;

    foreach ($causeMap as $causeName => $lineData) {
        $dataset = [
            "label" => $causeName,
            "data" => [],
            "backgroundColor" => $colorPalette[$colorIndex++ % count($colorPalette)],
            "borderRadius" => 4
        ];
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
        SELECT TOP 50 part_no,
            SUM(CASE WHEN count_type = 'FG' THEN ISNULL(count_value, 0) ELSE 0 END) AS FG,
            SUM(CASE WHEN count_type = 'NG' THEN ISNULL(count_value, 0) ELSE 0 END) AS NG,
            SUM(CASE WHEN count_type = 'HOLD' THEN ISNULL(count_value, 0) ELSE 0 END) AS HOLD,
            SUM(CASE WHEN count_type = 'REWORK' THEN ISNULL(count_value, 0) ELSE 0 END) AS REWORK,
            SUM(CASE WHEN count_type = 'SCRAP' THEN ISNULL(count_value, 0) ELSE 0 END) AS SCRAP,
            SUM(CASE WHEN count_type = 'ETC.' THEN ISNULL(count_value, 0) ELSE 0 END) AS ETC
        FROM IOT_TOOLBOX_PARTS
        $partWhere
        GROUP BY part_no
        ORDER BY SUM(ISNULL(count_value, 0)) DESC
    ";

    $partStmt = $pdo->prepare($partSql);
    $partStmt->execute($partParams);
    $partResults = $partStmt->fetchAll();

    $partLabels = [];
    $FG = [];
    $NG = [];
    $HOLD = [];
    $REWORK = [];
    $SCRAP = [];
    $ETC = [];

    foreach ($partResults as $row) {
        $partLabels[] = $row['part_no'];
        $FG[] = (int) $row['FG'];
        $NG[] = (int) $row['NG'];
        $HOLD[] = (int) $row['HOLD'];
        $REWORK[] = (int) $row['REWORK'];
        $SCRAP[] = (int) $row['SCRAP'];
        $ETC[] = (int) $row['ETC'];
    }

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
    
    echo json_encode(['success' => true, 'data' => $finalData]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Query failed: ' . $e->getMessage()]);
    error_log("Error in get_oee_barchart.php: " . $e->getMessage());
}
?>