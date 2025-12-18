<?php
// MES/page/management/api/get_executive_dashboard.php

include_once("../../../auth/check_auth.php");
include_once("../../db.php");
include_once("../../../config/config.php");

header('Content-Type: application/json');

if (!hasRole(['admin', 'creator', 'planner', 'viewer', 'supervisor'])) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

try {
    $startDate = $_GET['startDate'] ?? date('Y-m-d');
    $endDate = $_GET['endDate'] ?? date('Y-m-d');
    $exchangeRate = isset($_GET['exchangeRate']) ? floatval($_GET['exchangeRate']) : 34.0;
    $userLine = ($_SESSION['user']['role'] === 'supervisor') ? $_SESSION['user']['line'] : null;

    // --- 1. Production (FG/Sales/Cost) ---
    $sqlProd = "
        SELECT 
            l.production_line AS line,
            SUM(t.quantity) as total_units,
            SUM(t.quantity * ISNULL(i.Price_USD, 0)) as sale_usd,
            SUM(t.quantity * ISNULL(i.StandardPrice, 0)) as sale_thb_std, 
            SUM(t.quantity * ISNULL(i.Cost_Total, 0)) as total_std_cost,
            SUM(t.quantity * (ISNULL(i.Cost_RM, 0) + ISNULL(i.Cost_PKG, 0) + ISNULL(i.Cost_SUB, 0))) as cost_rm,
            SUM(t.quantity * (
                ISNULL(i.Cost_OH_Machine, 0) + ISNULL(i.Cost_OH_Utilities, 0) + ISNULL(i.Cost_OH_Indirect, 0) + 
                ISNULL(i.Cost_OH_Staff, 0) + ISNULL(i.Cost_OH_Accessory, 0) + ISNULL(i.Cost_OH_Others, 0)
            )) as cost_oh
        FROM " . TRANSACTIONS_TABLE . " t
        JOIN " . ITEMS_TABLE . " i ON t.parameter_id = i.item_id
        JOIN " . LOCATIONS_TABLE . " l ON t.to_location_id = l.location_id
        WHERE t.transaction_type = 'PRODUCTION_FG'
          AND CAST(DATEADD(HOUR, -8, t.transaction_timestamp) AS DATE) BETWEEN :start AND :end
          AND l.production_line IS NOT NULL
    ";
    $paramsProd = [':start' => $startDate, ':end' => $endDate];
    if ($userLine) { $sqlProd .= " AND l.production_line = :line"; $paramsProd[':line'] = $userLine; }
    $sqlProd .= " GROUP BY l.production_line";
    
    $stmtProd = $pdo->prepare($sqlProd);
    $stmtProd->execute($paramsProd);
    $rawProdData = $stmtProd->fetchAll(PDO::FETCH_ASSOC);

    // --- 2. Scrap ---
    $sqlScrap = "
        SELECT 
            l.production_line AS line,
            SUM(t.quantity * ISNULL(i.Cost_Total, 0)) as scrap_cost
        FROM " . TRANSACTIONS_TABLE . " t
        JOIN " . ITEMS_TABLE . " i ON t.parameter_id = i.item_id
        LEFT JOIN " . LOCATIONS_TABLE . " l ON t.from_location_id = l.location_id
        WHERE t.transaction_type = 'PRODUCTION_SCRAP'
          AND CAST(DATEADD(HOUR, -8, t.transaction_timestamp) AS DATE) BETWEEN :start AND :end
          AND l.production_line IS NOT NULL
    ";
    $paramsScrap = [':start' => $startDate, ':end' => $endDate];
    if ($userLine) { $sqlScrap .= " AND l.production_line = :line"; $paramsScrap[':line'] = $userLine; }
    $sqlScrap .= " GROUP BY l.production_line";
    $stmtScrap = $pdo->prepare($sqlScrap);
    $stmtScrap->execute($paramsScrap);
    $rawScrapData = $stmtScrap->fetchAll(PDO::FETCH_ASSOC);

    // --- 3. Manpower (Headcount) ---
    $sqlPeople = "
        SELECT 
            e.line,
            COUNT(DISTINCT l.emp_id) as headcount
        FROM " . MANPOWER_DAILY_LOGS_TABLE . " l
        JOIN " . MANPOWER_EMPLOYEES_TABLE . " e ON l.emp_id = e.emp_id
        WHERE l.log_date BETWEEN :start AND :end
          AND l.status IN ('PRESENT', 'LATE')
    ";
    $paramsPeople = [':start' => $startDate, ':end' => $endDate];
    if ($userLine) { $sqlPeople .= " AND e.line = :line"; $paramsPeople[':line'] = $userLine; }
    $sqlPeople .= " GROUP BY e.line";
    $stmtPeople = $pdo->prepare($sqlPeople);
    $stmtPeople->execute($paramsPeople);
    $rawPeopleData = $stmtPeople->fetchAll(PDO::FETCH_ASSOC);

    // --- 4. Actual Labor Cost (DLOT) [ROBUST FETCH] ---
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
    
    // --- Helper: Normalize Data Map (แก้ปัญหา Case Sensitive) ---
    function normalizeMap($rawData, $keyField, $valField) {
        $map = [];
        foreach ($rawData as $row) {
            // แปลง Key ของ Array ผลลัพธ์ให้เป็นตัวเล็กทั้งหมดก่อนดึง (แก้ปัญหา LINE vs line)
            $row = array_change_key_case($row, CASE_LOWER);
            
            // สร้าง Key สำหรับ Map (Trim + Uppercase)
            $cleanKey = isset($row[$keyField]) ? strtoupper(trim($row[$keyField])) : 'UNKNOWN';
            
            // ดึงค่า
            $val = isset($row[$valField]) ? (float)$row[$valField] : 0;
            
            $map[$cleanKey] = $val;
        }
        return $map;
    }

    // สร้าง Map ข้อมูลแต่ละส่วน
    // หมายเหตุ: เราใช้ 'line' เป็นตัวเชื่อม แต่ใน array_change_key_case มันจะเป็น 'line' เสมอ
    $laborMap = normalizeMap($rawLaborData, 'line', 'actual_labor_cost');
    $scrapMap = normalizeMap($rawScrapData, 'line', 'scrap_cost');
    $peopleMap = normalizeMap($rawPeopleData, 'line', 'headcount');
    
    // Production ต้อง Map หลาย field, ทำ Manual
    $prodMap = [];
    foreach ($rawProdData as $row) {
        $row = array_change_key_case($row, CASE_LOWER);
        $cleanKey = strtoupper(trim($row['line']));
        $prodMap[$cleanKey] = $row;
    }

    // --- CONSOLIDATION ---
    $allActiveLines = array_unique(array_merge(
        array_keys($prodMap),
        array_keys($scrapMap),
        array_keys($peopleMap),
        array_keys($laborMap)
    ));
    $allActiveLines = array_filter($allActiveLines, function($v) { return !empty($v) && $v !== 'ALL' && $v !== 'UNKNOWN'; });
    sort($allActiveLines);

    $summary = ['sale' => 0, 'cost' => 0, 'gp' => 0, 'rm' => 0, 'dlot' => 0, 'oh' => 0, 'scrap' => 0, 'total_units' => 0, 'headcount' => 0, 'active_lines' => 0];
    $lines = [];

    foreach ($allActiveLines as $lineName) { // $lineName is already Upper & Trimmed
        
        $p = $prodMap[$lineName] ?? ['total_units' => 0, 'sale_usd' => 0, 'sale_thb_std' => 0, 'cost_rm' => 0, 'cost_oh' => 0];

        $saleVal = ($p['sale_usd'] > 0) ? ($p['sale_usd'] * $exchangeRate) : $p['sale_thb_std'];
        $rmCost = $p['cost_rm'];
        $ohCost = $p['cost_oh'];
        
        // ดึงข้อมูลจาก Map ที่ทำความสะอาดแล้ว
        $laborCost = $laborMap[$lineName] ?? 0;
        $scrapVal = $scrapMap[$lineName] ?? 0;
        $headCount = $peopleMap[$lineName] ?? 0;

        $totalCost = $rmCost + $laborCost + $ohCost + $scrapVal;

        $lines[$lineName] = [
            'name' => $lineName,
            'sale' => $saleVal,
            'cost' => $totalCost,
            'gp' => $saleVal - $totalCost,
            'gp_percent' => ($saleVal > 0) ? (($saleVal - $totalCost) / $saleVal * 100) : 0,
            'rm' => $rmCost,
            'dlot' => $laborCost,
            'oh' => $ohCost,
            'scrap' => $scrapVal,
            'units' => $p['total_units'],
            'headcount' => $headCount
        ];

        $summary['sale'] += $saleVal;
        $summary['cost'] += $totalCost;
        $summary['rm'] += $rmCost;
        $summary['dlot'] += $laborCost;
        $summary['oh'] += $ohCost;
        $summary['scrap'] += $scrapVal;
        $summary['total_units'] += $p['total_units'];
        $summary['headcount'] += $headCount;
    }

    // รวมค่าแรงกองกลาง (ALL)
    /* if (isset($laborMap['ALL'])) {
        $summary['dlot'] += $laborMap['ALL'];
        $summary['cost'] += $laborMap['ALL'];
    }
    */

    $summary['gp'] = $summary['sale'] - $summary['cost'];
    $summary['active_lines'] = count($lines);

    // [DEBUGGING INFO] - ถ้าอยากเห็นว่ามีไลน์ไหนบ้างใน Labor Map ให้เปิดดูใน Network Tab
    // $summary['_debug_labor_keys'] = array_keys($laborMap);

    echo json_encode(['success' => true, 'summary' => $summary, 'lines' => array_values($lines)]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>