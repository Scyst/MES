<?php
// MES/page/management/api/get_executive_dashboard.php

include_once("../../../auth/check_auth.php");
include_once("../../db.php");
include_once("../../../config/config.php");

header('Content-Type: application/json');

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

    // =========================================================================================
    // 1. ดึงยอดผลิต & ต้นทุนมาตรฐาน (แยก 2 ขา: All vs FG-Only) - [เหมือนเดิม]
    // =========================================================================================
    $sqlProd = "
        SELECT 
            l.production_line AS line,
            SUM(t.quantity) as total_units,
            
            -- [A] ยอดสำหรับแสดงรายบรรทัด (All Items)
            SUM(t.quantity * ISNULL(i.Price_USD, 0)) as sale_usd_all,
            SUM(t.quantity * ISNULL(i.StandardPrice, 0)) as sale_thb_all, 
            SUM(t.quantity * (ISNULL(i.Cost_RM, 0) + ISNULL(i.Cost_PKG, 0) + ISNULL(i.Cost_SUB, 0))) as cost_rm_all,
            SUM(t.quantity * ISNULL(i.Cost_DL, 0)) as cost_std_dl_all,
            SUM(t.quantity * (
                ISNULL(i.Cost_OH_Machine, 0) + ISNULL(i.Cost_OH_Utilities, 0) + ISNULL(i.Cost_OH_Indirect, 0) + 
                ISNULL(i.Cost_OH_Staff, 0) + ISNULL(i.Cost_OH_Accessory, 0) + ISNULL(i.Cost_OH_Others, 0)
            )) as cost_oh_all,

            -- [B] ยอดสำหรับรวม Summary (FG Only - รหัส 40...) กันยอดเบิ้ล
            SUM(CASE WHEN i.sap_no LIKE '40%' THEN t.quantity * ISNULL(i.Price_USD, 0) ELSE 0 END) as sale_usd_fg,
            SUM(CASE WHEN i.sap_no LIKE '40%' THEN t.quantity * ISNULL(i.StandardPrice, 0) ELSE 0 END) as sale_thb_fg,
            SUM(CASE WHEN i.sap_no LIKE '40%' THEN t.quantity * (ISNULL(i.Cost_RM, 0) + ISNULL(i.Cost_PKG, 0) + ISNULL(i.Cost_SUB, 0)) ELSE 0 END) as cost_rm_fg,
            SUM(CASE WHEN i.sap_no LIKE '40%' THEN t.quantity * ISNULL(i.Cost_DL, 0) ELSE 0 END) as cost_std_dl_fg,
            SUM(CASE WHEN i.sap_no LIKE '40%' THEN t.quantity * (
                ISNULL(i.Cost_OH_Machine, 0) + ISNULL(i.Cost_OH_Utilities, 0) + ISNULL(i.Cost_OH_Indirect, 0) + 
                ISNULL(i.Cost_OH_Staff, 0) + ISNULL(i.Cost_OH_Accessory, 0) + ISNULL(i.Cost_OH_Others, 0)
            ) ELSE 0 END) as cost_oh_fg

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

    // =========================================================================================
    // 2. ดึง Scrap (🔥 UPDATE: เปลี่ยน Logic ให้เหมือน P&L)
    // =========================================================================================
    // - เปลี่ยน transaction_type เป็น 'SCRAP'
    // - ใช้ ABS() เพราะยอดมาเป็นลบ
    // - กรอง User Team2 ออก
    $sqlScrap = "
        SELECT 
            l.production_line AS line,
            ABS(SUM(t.quantity * ISNULL(i.Cost_Total, 0))) as scrap_cost
        FROM " . TRANSACTIONS_TABLE . " t
        JOIN " . ITEMS_TABLE . " i ON t.parameter_id = i.item_id
        LEFT JOIN " . LOCATIONS_TABLE . " l ON t.from_location_id = l.location_id
        LEFT JOIN " . USERS_TABLE . " u ON t.created_by_user_id = u.id -- 🔥 Join User
        WHERE t.transaction_type = 'SCRAP' -- 🔥 เปลี่ยนจาก PRODUCTION_SCRAP
          AND t.transaction_timestamp >= :qStart 
          AND t.transaction_timestamp < :qEnd
          AND l.production_line IS NOT NULL
          -- 🔥 กรอง Team2 ทิ้ง (Firewall)
          AND (u.line NOT LIKE '%Team2%' OR u.line IS NULL)
          AND (u.username NOT LIKE '%Team2%' OR u.username IS NULL)
          AND (l.production_line NOT LIKE '%Team2%')
    ";
    $paramsScrap = [':qStart' => $queryStart, ':qEnd' => $queryEnd];
    if ($userLine) { $sqlScrap .= " AND l.production_line = :line"; $paramsScrap[':line'] = $userLine; }
    $sqlScrap .= " GROUP BY l.production_line";
    $stmtScrap = $pdo->prepare($sqlScrap);
    $stmtScrap->execute($paramsScrap);
    $rawScrapData = $stmtScrap->fetchAll(PDO::FETCH_ASSOC);

    // 3. Headcount [เหมือนเดิม]
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

    // 4. Actual Labor [เหมือนเดิม]
    $sqlLabor = "
        SELECT 
            line,
            SUM(cost_value) as actual_labor_cost
        FROM " . MANUAL_COSTS_TABLE . "
        WHERE entry_date BETWEEN :start AND :end
          AND cost_type IN ('DIRECT_LABOR', 'OVERTIME')
          AND line NOT LIKE '%Team2%' -- กันเหนียว
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
        'rm' => 0, 'dlot' => 0, 'std_dl' => 0, 
        'oh' => 0, 'scrap' => 0, 
        'total_units' => 0, 'headcount' => 0, 'active_lines' => 0
    ];
    $lines = [];

    foreach ($allActiveLines as $lineName) {
        $p = $prodMap[$lineName] ?? [
            'total_units' => 0, 
            'sale_usd_all' => 0, 'sale_thb_all' => 0, 'cost_rm_all' => 0, 'cost_std_dl_all' => 0, 'cost_oh_all' => 0,
            'sale_usd_fg' => 0,  'sale_thb_fg' => 0,  'cost_rm_fg' => 0,  'cost_std_dl_fg' => 0,  'cost_oh_fg' => 0
        ];

        // --- 1. Line Level Data (แสดงทุกยอด ไม่กรอง) ---
        $saleVal   = ($p['sale_usd_all'] > 0) ? ($p['sale_usd_all'] * $exchangeRate) : $p['sale_thb_all'];
        $rmCost    = $p['cost_rm_all'];
        $ohCost    = $p['cost_oh_all'];
        $stdDLCost = $p['cost_std_dl_all']; 
        
        $laborCost = $laborMap[$lineName] ?? 0; // Actual Labor
        $scrapVal  = $scrapMap[$lineName] ?? 0;
        $avgHC     = $peopleMap[$lineName] ?? 0;

        $totalCost = $rmCost + $laborCost + $ohCost + $scrapVal;    // Actual Total for Line
        $totalStd  = $rmCost + $stdDLCost + $ohCost + $scrapVal;    // Standard Total for Line

        $lines[$lineName] = [
            'name' => $lineName,
            'sale' => $saleVal,
            'cost' => $totalCost,
            'std_cost' => $totalStd,
            'gp'   => $saleVal - $totalCost,
            'gp_percent' => ($saleVal > 0) ? (($saleVal - $totalCost) / $saleVal * 100) : 0,
            'rm'    => $rmCost,
            'dlot'  => $laborCost,
            'std_dl' => $stdDLCost,
            'oh'    => $ohCost,
            'scrap' => $scrapVal,
            'units' => $p['total_units'],
            'headcount' => round($avgHC, 1)
        ];

        // --- 2. Summary Level Data (กรอง FG Only เพื่อกันเบิ้ล) ---
        $saleVal_FG   = ($p['sale_usd_fg'] > 0) ? ($p['sale_usd_fg'] * $exchangeRate) : $p['sale_thb_fg'];
        $rmCost_FG    = $p['cost_rm_fg'];
        $ohCost_FG    = $p['cost_oh_fg'];
        $stdDLCost_FG = $p['cost_std_dl_fg'];

        // ยอดรวม (Actual Labor + Scrap นับเต็ม เพราะจ่ายจริงเสียจริง)
        // ส่วน RM, Revenue, OH นับเฉพาะ FG เพื่อไม่ให้เบิ้ล
        $summary['sale']        += $saleVal_FG;
        $summary['rm']          += $rmCost_FG;
        $summary['oh']          += $ohCost_FG;
        $summary['std_dl']      += $stdDLCost_FG; 
        
        $summary['dlot']        += $laborCost; // รวม Actual
        $summary['scrap']       += $scrapVal;  // รวม Actual Scrap
        
        // Cost Actual รวม = (RM ของ FG) + (OH ของ FG) + (ค่าแรงจริงรวม) + (Scrap รวม)
        $summary['cost']        += ($rmCost_FG + $ohCost_FG + $laborCost + $scrapVal);
        
        // Cost Standard รวม = (RM ของ FG) + (OH ของ FG) + (Std DL ของ FG) + (Scrap รวม)
        $summary['std_cost']    += ($rmCost_FG + $ohCost_FG + $stdDLCost_FG + $scrapVal);

        $summary['total_units'] += $p['total_units'];
        $summary['headcount']   += $avgHC;
    }

    $summary['gp']           = $summary['sale'] - $summary['cost'];
    $summary['active_lines'] = count($lines);
    $summary['headcount']    = round($summary['headcount'], 0);

    // --- Trend Data Processing ---
    $trendData = [];
    $period = new DatePeriod(new DateTime($startDate), new DateInterval('P1D'), (new DateTime($endDate))->modify('+1 day'));
    foreach ($period as $dt) {
        $dateKey = $dt->format('Y-m-d');
        $trendData[$dateKey] = ['date' => $dateKey, 'sale' => 0, 'cost' => 0, 'profit' => 0];
    }

    // [Trend] Revenue & Cost (FG Only)
    $sqlDailyProd = "
        SELECT 
            CAST(DATEADD(HOUR, -8, t.transaction_timestamp) AS DATE) as log_date,
            SUM(CASE WHEN i.sap_no LIKE '40%' THEN t.quantity * ISNULL(i.Price_USD, 0) ELSE 0 END) as sale_usd,
            SUM(CASE WHEN i.sap_no LIKE '40%' THEN t.quantity * ISNULL(i.StandardPrice, 0) ELSE 0 END) as sale_thb_std,
            SUM(CASE WHEN i.sap_no LIKE '40%' THEN t.quantity * (
                ISNULL(i.Cost_RM, 0) + ISNULL(i.Cost_PKG, 0) + ISNULL(i.Cost_SUB, 0) + 
                ISNULL(i.Cost_OH_Machine, 0) + ISNULL(i.Cost_OH_Utilities, 0) + ISNULL(i.Cost_OH_Indirect, 0) + 
                ISNULL(i.Cost_OH_Staff, 0) + ISNULL(i.Cost_OH_Accessory, 0) + ISNULL(i.Cost_OH_Others, 0)
            ) ELSE 0 END) as cost_prod_no_dl
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

    // [Trend] Labor (Actual)
    $sqlDailyLabor = "
        SELECT entry_date, SUM(cost_value) as labor_val 
        FROM " . MANUAL_COSTS_TABLE . "
        WHERE entry_date BETWEEN :start AND :end
          AND cost_type IN ('DIRECT_LABOR', 'OVERTIME')
          AND line IS NOT NULL AND line NOT IN ('UNKNOWN', 'ALL')
          AND line NOT LIKE '%Team2%'
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

    // [Trend] Scrap (🔥 UPDATE: แก้ให้ดึงจาก 'SCRAP' + Filter Team2)
    $sqlDailyScrap = "
        SELECT 
            CAST(DATEADD(HOUR, -8, t.transaction_timestamp) AS DATE) as log_date,
            ABS(SUM(t.quantity * ISNULL(i.Cost_Total, 0))) as scrap_val
        FROM " . TRANSACTIONS_TABLE . " t
        JOIN " . ITEMS_TABLE . " i ON t.parameter_id = i.item_id
        LEFT JOIN " . LOCATIONS_TABLE . " l ON t.from_location_id = l.location_id
        LEFT JOIN " . USERS_TABLE . " u ON t.created_by_user_id = u.id -- 🔥 Join User
        WHERE t.transaction_type = 'SCRAP' -- 🔥 แก้เป็น SCRAP
          AND t.transaction_timestamp >= :qStart 
          AND t.transaction_timestamp < :qEnd
          AND l.production_line IS NOT NULL
          AND (u.line NOT LIKE '%Team2%' OR u.line IS NULL) -- 🔥 Filter User
          AND (u.username NOT LIKE '%Team2%' OR u.username IS NULL)
          AND (l.production_line NOT LIKE '%Team2%')
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