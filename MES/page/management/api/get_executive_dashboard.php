<?php
// MES/page/management/api/get_executive_dashboard.php

include_once("../../../auth/check_auth.php");
include_once("../../db.php");
include_once("../../../config/config.php");

header('Content-Type: application/json');

// ปิด Error Report หน้าบ้าน (แต่ยัง log หลังบ้านได้) เพื่อกัน JSON พัง
error_reporting(E_ALL); 
ini_set('display_errors', 0);

if (!hasRole(['admin', 'creator', 'planner'])) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

try {
    $startDate = $_GET['startDate'] ?? date('Y-m-d');
    $endDate   = $_GET['endDate']   ?? date('Y-m-d');
    $exchangeRate = isset($_GET['exchangeRate']) ? floatval($_GET['exchangeRate']) : 32.0;
    $userLine = ($_SESSION['user']['role'] === 'supervisor') ? $_SESSION['user']['line'] : null;

    $queryStart = $startDate . ' 08:00:00';
    $queryEnd = date('Y-m-d', strtotime($endDate . ' +1 day')) . ' 08:00:00';

    // 1. ดึงยอดผลิตและต้นทุนมาตรฐาน (เพิ่ม cost_std_dl)
    $sqlProd = "
        SELECT 
            l.production_line AS line,
            SUM(t.quantity) as total_units,
            SUM(t.quantity * ISNULL(i.Price_USD, 0)) as sale_usd,
            SUM(t.quantity * ISNULL(i.StandardPrice, 0)) as sale_thb_std, 
            SUM(t.quantity * (ISNULL(i.Cost_RM, 0) + ISNULL(i.Cost_PKG, 0) + ISNULL(i.Cost_SUB, 0))) as cost_rm,
            SUM(t.quantity * ISNULL(i.Cost_DL, 0)) as cost_std_dl, -- ★ เพิ่มบรรทัดนี้: Standard DL
            SUM(t.quantity * (
                ISNULL(i.Cost_OH_Machine, 0) + ISNULL(i.Cost_OH_Utilities, 0) + ISNULL(i.Cost_OH_Indirect, 0) + 
                ISNULL(i.Cost_OH_Staff, 0) + ISNULL(i.Cost_OH_Accessory, 0) + ISNULL(i.Cost_OH_Others, 0)
            )) as cost_oh
        FROM " . TRANSACTIONS_TABLE . " t
        JOIN " . ITEMS_TABLE . " i ON t.parameter_id = i.item_id
        JOIN " . LOCATIONS_TABLE . " l ON t.to_location_id = l.location_id
        WHERE t.transaction_type = 'PRODUCTION_FG'
          AND t.transaction_timestamp >= :qStart 
          AND t.transaction_timestamp < :qEnd
          AND l.production_line IS NOT NULL
    ";
    
    $paramsProd = [':qStart' => $queryStart, ':qEnd' => $queryEnd];
    if ($userLine) { $sqlProd .= " AND l.production_line = :line"; $paramsProd[':line'] = $userLine; }
    $sqlProd .= " GROUP BY l.production_line";
    
    $stmtProd = $pdo->prepare($sqlProd);
    $stmtProd->execute($paramsProd);
    $rawProdData = $stmtProd->fetchAll(PDO::FETCH_ASSOC);

    // 2. ดึงต้นทุนงานเสีย (Scrap)
    $sqlScrap = "
        SELECT 
            l.production_line AS line,
            SUM(t.quantity * ISNULL(i.Cost_Total, 0)) as scrap_cost
        FROM " . TRANSACTIONS_TABLE . " t
        JOIN " . ITEMS_TABLE . " i ON t.parameter_id = i.item_id
        LEFT JOIN " . LOCATIONS_TABLE . " l ON t.from_location_id = l.location_id
        WHERE t.transaction_type = 'PRODUCTION_SCRAP'
          AND t.transaction_timestamp >= :qStart 
          AND t.transaction_timestamp < :qEnd
          AND l.production_line IS NOT NULL
    ";
    $paramsScrap = [':qStart' => $queryStart, ':qEnd' => $queryEnd];
    if ($userLine) { $sqlScrap .= " AND l.production_line = :line"; $paramsScrap[':line'] = $userLine; }
    $sqlScrap .= " GROUP BY l.production_line";
    $stmtScrap = $pdo->prepare($sqlScrap);
    $stmtScrap->execute($paramsScrap);
    $rawScrapData = $stmtScrap->fetchAll(PDO::FETCH_ASSOC);

    // 3. ดึง Headcount
    $sqlPeople = "
        SELECT 
            line,
            AVG(CAST(daily_count AS FLOAT)) as avg_headcount
        FROM (
            SELECT 
                e.line,
                l.log_date,
                COUNT(DISTINCT l.emp_id) as daily_count
            FROM " . MANPOWER_DAILY_LOGS_TABLE . " l
            JOIN " . MANPOWER_EMPLOYEES_TABLE . " e ON l.emp_id = e.emp_id
            WHERE l.log_date BETWEEN :start AND :end
              AND l.status IN ('PRESENT', 'LATE')
            GROUP BY e.line, l.log_date
        ) AS DailySummary
        WHERE line IS NOT NULL
    ";
    $paramsPeople = [':start' => $startDate, ':end' => $endDate];
    if ($userLine) { $sqlPeople .= " AND line = :line"; $paramsPeople[':line'] = $userLine; }
    $sqlPeople .= " GROUP BY line";
    $stmtPeople = $pdo->prepare($sqlPeople);
    $stmtPeople->execute($paramsPeople);
    $rawPeopleData = $stmtPeople->fetchAll(PDO::FETCH_ASSOC);

    // 4. ดึงค่าแรงจริง (DL + OT)
    $sqlLabor = "
        SELECT 
            line,
            SUM(cost_value) as actual_labor_cost
        FROM " . MANUAL_COSTS_TABLE . "
        WHERE entry_date BETWEEN :start AND :end
          AND cost_type IN ('DIRECT_LABOR', 'OVERTIME')
    ";
    $paramsLabor = [':start' => $startDate, ':end' => $endDate];
    if ($userLine) { $sqlLabor .= " AND line = :line"; $paramsLabor[':line'] = $userLine; }
    $sqlLabor .= " GROUP BY line";

    $stmtLabor = $pdo->prepare($sqlLabor);
    $stmtLabor->execute($paramsLabor);
    $rawLaborData = $stmtLabor->fetchAll(PDO::FETCH_ASSOC);
    
    // --- Data Normalization ---
    function normalizeMap($rawData, $keyField, $valField) {
        $map = [];
        foreach ($rawData as $row) {
            $row = array_change_key_case($row, CASE_LOWER);
            $cleanKey = isset($row[$keyField]) ? strtoupper(trim($row[$keyField])) : 'UNKNOWN';
            $val = isset($row[$valField]) ? (float)$row[$valField] : 0;
            $map[$cleanKey] = $val;
        }
        return $map;
    }

    $laborMap  = normalizeMap($rawLaborData, 'line', 'actual_labor_cost');
    $scrapMap  = normalizeMap($rawScrapData, 'line', 'scrap_cost');
    $peopleMap = normalizeMap($rawPeopleData, 'line', 'avg_headcount');
    
    $prodMap = [];
    foreach ($rawProdData as $row) {
        $row = array_change_key_case($row, CASE_LOWER);
        $cleanKey = strtoupper(trim($row['line']));
        $prodMap[$cleanKey] = $row;
    }

    $allActiveLines = array_unique(array_merge(
        array_keys($prodMap),
        array_keys($scrapMap),
        array_keys($peopleMap),
        array_keys($laborMap)
    ));
    $allActiveLines = array_filter($allActiveLines, function($v) { return !empty($v) && $v !== 'ALL' && $v !== 'UNKNOWN'; });
    sort($allActiveLines);

    // --- Final Calculation Loop ---
    $summary = [
        'sale' => 0, 'cost' => 0, 'gp' => 0, 
        'rm' => 0, 'dlot' => 0, 'std_dl' => 0, // ★ เพิ่ม std_dl ใน summary
        'oh' => 0, 'scrap' => 0, 
        'total_units' => 0, 'headcount' => 0, 'active_lines' => 0
    ];
    $lines = [];

    foreach ($allActiveLines as $lineName) {
        $p = $prodMap[$lineName] ?? ['total_units' => 0, 'sale_usd' => 0, 'sale_thb_std' => 0, 'cost_rm' => 0, 'cost_std_dl' => 0, 'cost_oh' => 0];

        $saleVal   = ($p['sale_usd'] > 0) ? ($p['sale_usd'] * $exchangeRate) : $p['sale_thb_std'];
        $rmCost    = $p['cost_rm'];
        $ohCost    = $p['cost_oh'];
        $stdDLCost = $p['cost_std_dl']; // Standard DL
        $laborCost = $laborMap[$lineName] ?? 0; // Actual DL+OT
        $scrapVal  = $scrapMap[$lineName] ?? 0;
        $avgHC     = $peopleMap[$lineName] ?? 0;

        $totalCost = $rmCost + $laborCost + $ohCost + $scrapVal;

        $lines[$lineName] = [
            'name' => $lineName,
            'sale' => $saleVal,
            'cost' => $totalCost,
            'gp'   => $saleVal - $totalCost,
            'gp_percent' => ($saleVal > 0) ? (($saleVal - $totalCost) / $saleVal * 100) : 0,
            'rm'    => $rmCost,
            'dlot'  => $laborCost,
            'std_dl' => $stdDLCost, // ส่งค่า Standard DL ไปด้วย
            'oh'    => $ohCost,
            'scrap' => $scrapVal,
            'units' => $p['total_units'],
            'headcount' => round($avgHC, 1)
        ];

        $summary['sale']        += $saleVal;
        $summary['cost']        += $totalCost;
        $summary['rm']          += $rmCost;
        $summary['dlot']        += $laborCost; // Actual Sum
        $summary['std_dl']      += $stdDLCost; // ★ Standard Sum
        $summary['oh']          += $ohCost;
        $summary['scrap']       += $scrapVal;
        $summary['total_units'] += $p['total_units'];
        $summary['headcount']   += $avgHC;
    }

    $summary['gp']           = $summary['sale'] - $summary['cost'];
    $summary['active_lines'] = count($lines);
    $summary['headcount']    = round($summary['headcount'], 0);

    // --- Trend Data Processing ---
    // (ส่วน Trend Code คงเดิม ไม่ต้องแก้ เพราะเน้นยอดรวม Actual)
    $trendData = [];
    $period = new DatePeriod(new DateTime($startDate), new DateInterval('P1D'), (new DateTime($endDate))->modify('+1 day'));
    foreach ($period as $dt) {
        $dateKey = $dt->format('Y-m-d');
        $trendData[$dateKey] = ['date' => $dateKey, 'sale' => 0, 'cost' => 0, 'profit' => 0];
    }

    // Daily Production Trend
    $sqlDailyProd = "
        SELECT 
            CAST(DATEADD(HOUR, -8, t.transaction_timestamp) AS DATE) as log_date,
            SUM(t.quantity * ISNULL(i.Price_USD, 0)) as sale_usd,
            SUM(t.quantity * ISNULL(i.StandardPrice, 0)) as sale_thb_std,
            SUM(t.quantity * (ISNULL(i.Cost_RM, 0) + ISNULL(i.Cost_PKG, 0) + ISNULL(i.Cost_SUB, 0) + 
                ISNULL(i.Cost_OH_Machine, 0) + ISNULL(i.Cost_OH_Utilities, 0) + ISNULL(i.Cost_OH_Indirect, 0) + 
                ISNULL(i.Cost_OH_Staff, 0) + ISNULL(i.Cost_OH_Accessory, 0) + ISNULL(i.Cost_OH_Others, 0))) as cost_prod_no_dl
        FROM " . TRANSACTIONS_TABLE . " t
        JOIN " . ITEMS_TABLE . " i ON t.parameter_id = i.item_id
        JOIN " . LOCATIONS_TABLE . " l ON t.to_location_id = l.location_id
        WHERE t.transaction_type = 'PRODUCTION_FG'
          AND t.transaction_timestamp >= :qStart 
          AND t.transaction_timestamp < :qEnd
          AND l.production_line IS NOT NULL
          " . ($userLine ? "AND l.production_line = :line" : "") . "
        GROUP BY CAST(DATEADD(HOUR, -8, t.transaction_timestamp) AS DATE)
    ";
    $stmtDaily = $pdo->prepare($sqlDailyProd);
    $stmtDaily->execute($paramsProd);
    while ($row = $stmtDaily->fetch(PDO::FETCH_ASSOC)) {
        $d = $row['log_date'];
        if (isset($trendData[$d])) {
            $sale = ($row['sale_usd'] > 0) ? ($row['sale_usd'] * $exchangeRate) : $row['sale_thb_std'];
            $trendData[$d]['sale'] += $sale;
            $trendData[$d]['cost'] += $row['cost_prod_no_dl']; 
        }
    }

    // [Daily Labor]
    $sqlDailyLabor = "
        SELECT entry_date, SUM(cost_value) as labor_val 
        FROM " . MANUAL_COSTS_TABLE . "
        WHERE entry_date BETWEEN :start AND :end
          AND cost_type IN ('DIRECT_LABOR', 'OVERTIME')
          AND line IS NOT NULL AND line NOT IN ('UNKNOWN', 'ALL')
          " . ($userLine ? "AND line = :line" : "") . "
        GROUP BY entry_date
    ";
    $stmtDL = $pdo->prepare($sqlDailyLabor);
    $stmtDL->execute($paramsLabor);
    while ($row = $stmtDL->fetch(PDO::FETCH_ASSOC)) {
        $d = $row['entry_date'];
        if (isset($trendData[$d])) {
            $trendData[$d]['cost'] += $row['labor_val']; 
        }
    }

    // [Daily Scrap]
    $sqlDailyScrap = "
        SELECT 
            CAST(DATEADD(HOUR, -8, t.transaction_timestamp) AS DATE) as log_date,
            SUM(t.quantity * ISNULL(i.Cost_Total, 0)) as scrap_val
        FROM " . TRANSACTIONS_TABLE . " t
        JOIN " . ITEMS_TABLE . " i ON t.parameter_id = i.item_id
        LEFT JOIN " . LOCATIONS_TABLE . " l ON t.from_location_id = l.location_id
        WHERE t.transaction_type = 'PRODUCTION_SCRAP'
          AND t.transaction_timestamp >= :qStart 
          AND t.transaction_timestamp < :qEnd
          AND l.production_line IS NOT NULL
          " . ($userLine ? "AND l.production_line = :line" : "") . "
        GROUP BY CAST(DATEADD(HOUR, -8, t.transaction_timestamp) AS DATE)
    ";
    $stmtScrapDaily = $pdo->prepare($sqlDailyScrap);
    $stmtScrapDaily->execute($paramsScrap);
    while ($row = $stmtScrapDaily->fetch(PDO::FETCH_ASSOC)) {
        $d = $row['log_date'];
        if (isset($trendData[$d])) {
            $trendData[$d]['cost'] += $row['scrap_val'];
        }
    }

    foreach ($trendData as &$day) {
        $day['profit'] = $day['sale'] - $day['cost'];
    }

    echo json_encode([
        'success' => true, 
        'summary' => $summary, 
        'lines'   => array_values($lines),
        'trend'   => array_values($trendData)
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>