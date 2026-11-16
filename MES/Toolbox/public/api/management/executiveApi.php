<?php
/**
 * Self-contained Executive Overview & Line Performance Drilldown API.
 * Replaces legacy page/management/api/get_executive_dashboard.php & get_line_details.php.
 */

require_once __DIR__ . '/_common.php';

/** Normalizes SQL aggregation rows into uppercase key => float lookup map. */
function buildLineMetricMap(array $rows, string $keyField, string $valueField): array {
    $map = [];
    foreach ($rows as $row) {
        $lower = array_change_key_case($row, CASE_LOWER);
        $lineKey = isset($lower[$keyField]) ? strtoupper(trim((string)$lower[$keyField])) : 'UNKNOWN';
        $map[$lineKey] = isset($lower[$valueField]) ? (float)$lower[$valueField] : 0.0;
    }
    return $map;
}

$action = '';
$input = [];
try {
    [$action, $input, $currentUser] = parseMgmtRequest('get_dashboard');
    requireMgmtExecutiveAccess();

    $userRole = strtolower(trim((string)($currentUser['role'] ?? '')));
    $userLine = ($userRole === 'supervisor' && !empty($currentUser['line']))
        ? trim((string)$currentUser['line'])
        : null;

    switch ($action) {
        case 'get_dashboard': {
            $today = date('Y-m-d');
            $defaultStart = date('Y-m-d', strtotime('-30 days'));
            $startDate = normalizeMgmtDate($input['startDate'] ?? $defaultStart, $defaultStart);
            $endDate = normalizeMgmtDate($input['endDate'] ?? $today, $today);
            if ($startDate > $endDate) {
                mgmtJsonError('วันที่เริ่มต้นต้องไม่มากกว่าวันที่สิ้นสุด', 400);
            }

            $exchangeRate = isset($input['exchangeRate']) ? (float)$input['exchangeRate'] : 32.0;
            if ($exchangeRate <= 0 || $exchangeRate > 200) {
                $exchangeRate = 32.0;
            }

            $queryStart = $startDate . ' 08:00:00';
            $queryEnd = date('Y-m-d', strtotime($endDate . ' +1 day')) . ' 08:00:00';

            $sqlProd = "
                SELECT
                    l.production_line AS line,
                    SUM(t.quantity) AS total_units,
                    SUM(t.quantity * ISNULL(i.Price_USD, 0)) AS sale_usd_all,
                    SUM(t.quantity * ISNULL(i.StandardPrice, 0)) AS sale_thb_all,
                    SUM(t.quantity * (ISNULL(i.Cost_RM, 0) + ISNULL(i.Cost_PKG, 0) + ISNULL(i.Cost_SUB, 0))) AS cost_rm_all,
                    SUM(t.quantity * ISNULL(i.Cost_DL, 0)) AS cost_std_dl_all,
                    SUM(t.quantity * (
                        ISNULL(i.Cost_OH_Machine, 0) + ISNULL(i.Cost_OH_Utilities, 0) + ISNULL(i.Cost_OH_Indirect, 0) +
                        ISNULL(i.Cost_OH_Staff, 0) + ISNULL(i.Cost_OH_Accessory, 0) + ISNULL(i.Cost_OH_Others, 0)
                    )) AS cost_oh_all,
                    SUM(CASE WHEN i.sap_no LIKE '40%' THEN t.quantity * ISNULL(i.Price_USD, 0) ELSE 0 END) AS sale_usd_fg,
                    SUM(CASE WHEN i.sap_no LIKE '40%' THEN t.quantity * ISNULL(i.StandardPrice, 0) ELSE 0 END) AS sale_thb_fg,
                    SUM(CASE WHEN i.sap_no LIKE '40%' THEN t.quantity * (ISNULL(i.Cost_RM, 0) + ISNULL(i.Cost_PKG, 0) + ISNULL(i.Cost_SUB, 0)) ELSE 0 END) AS cost_rm_fg,
                    SUM(CASE WHEN i.sap_no LIKE '40%' THEN t.quantity * ISNULL(i.Cost_DL, 0) ELSE 0 END) AS cost_std_dl_fg,
                    SUM(CASE WHEN i.sap_no LIKE '40%' THEN t.quantity * (
                        ISNULL(i.Cost_OH_Machine, 0) + ISNULL(i.Cost_OH_Utilities, 0) + ISNULL(i.Cost_OH_Indirect, 0) +
                        ISNULL(i.Cost_OH_Staff, 0) + ISNULL(i.Cost_OH_Accessory, 0) + ISNULL(i.Cost_OH_Others, 0)
                    ) ELSE 0 END) AS cost_oh_fg
                FROM " . TRANSACTIONS_TABLE . " t WITH (NOLOCK)
                JOIN " . ITEMS_TABLE . " i WITH (NOLOCK) ON t.parameter_id = i.item_id
                JOIN " . LOCATIONS_TABLE . " l WITH (NOLOCK) ON t.to_location_id = l.location_id
                WHERE t.transaction_type = 'PRODUCTION_FG'
                  AND t.transaction_timestamp >= :qStart
                  AND t.transaction_timestamp < :qEnd
                  AND l.production_line IS NOT NULL
            ";
            $paramsProd = [':qStart' => $queryStart, ':qEnd' => $queryEnd];
            if ($userLine !== null) {
                $sqlProd .= " AND l.production_line = :line";
                $paramsProd[':line'] = $userLine;
            }
            $sqlProd .= " GROUP BY l.production_line";
            $stmtProd = $pdo->prepare($sqlProd);
            $stmtProd->execute($paramsProd);
            $rawProdData = $stmtProd->fetchAll(PDO::FETCH_ASSOC);

            $sqlScrap = "
                SELECT
                    l.production_line AS line,
                    ABS(SUM(t.quantity * ISNULL(i.Cost_Total, 0))) AS scrap_cost
                FROM " . TRANSACTIONS_TABLE . " t WITH (NOLOCK)
                JOIN " . ITEMS_TABLE . " i WITH (NOLOCK) ON t.parameter_id = i.item_id
                LEFT JOIN " . LOCATIONS_TABLE . " l WITH (NOLOCK) ON t.from_location_id = l.location_id
                LEFT JOIN " . USERS_TABLE . " u WITH (NOLOCK) ON t.created_by_user_id = u.id
                WHERE t.transaction_type = 'SCRAP'
                  AND t.transaction_timestamp >= :qStart
                  AND t.transaction_timestamp < :qEnd
                  AND l.production_line IS NOT NULL
                  AND (u.line NOT LIKE '%Team2%' OR u.line IS NULL)
                  AND (u.username NOT LIKE '%Team2%' OR u.username IS NULL)
                  AND (l.production_line NOT LIKE '%Team2%')
            ";
            $paramsScrap = [':qStart' => $queryStart, ':qEnd' => $queryEnd];
            if ($userLine !== null) {
                $sqlScrap .= " AND l.production_line = :line";
                $paramsScrap[':line'] = $userLine;
            }
            $sqlScrap .= " GROUP BY l.production_line";
            $stmtScrap = $pdo->prepare($sqlScrap);
            $stmtScrap->execute($paramsScrap);
            $rawScrapData = $stmtScrap->fetchAll(PDO::FETCH_ASSOC);

            $sqlPeople = "
                SELECT line, AVG(CAST(daily_count AS FLOAT)) AS avg_headcount
                FROM (
                    SELECT e.line, l.log_date, COUNT(DISTINCT l.emp_id) AS daily_count
                    FROM " . MANPOWER_DAILY_LOGS_TABLE . " l WITH (NOLOCK)
                    JOIN " . MANPOWER_EMPLOYEES_TABLE . " e WITH (NOLOCK) ON l.emp_id = e.emp_id
                    WHERE l.log_date BETWEEN :start AND :end
                      AND l.status IN ('PRESENT', 'LATE')
                    GROUP BY e.line, l.log_date
                ) AS DailySummary
                WHERE line IS NOT NULL
            ";
            $paramsPeople = [':start' => $startDate, ':end' => $endDate];
            if ($userLine !== null) {
                $sqlPeople .= " AND line = :line";
                $paramsPeople[':line'] = $userLine;
            }
            $sqlPeople .= " GROUP BY line";
            $stmtPeople = $pdo->prepare($sqlPeople);
            $stmtPeople->execute($paramsPeople);
            $rawPeopleData = $stmtPeople->fetchAll(PDO::FETCH_ASSOC);

            $sqlLabor = "
                SELECT line, SUM(cost_value) AS actual_labor_cost
                FROM " . MANUAL_COSTS_TABLE . " WITH (NOLOCK)
                WHERE entry_date BETWEEN :start AND :end
                  AND cost_type IN ('DIRECT_LABOR', 'OVERTIME')
                  AND line NOT LIKE '%Team2%'
            ";
            $paramsLabor = [':start' => $startDate, ':end' => $endDate];
            if ($userLine !== null) {
                $sqlLabor .= " AND line = :line";
                $paramsLabor[':line'] = $userLine;
            }
            $sqlLabor .= " GROUP BY line";
            $stmtLabor = $pdo->prepare($sqlLabor);
            $stmtLabor->execute($paramsLabor);
            $rawLaborData = $stmtLabor->fetchAll(PDO::FETCH_ASSOC);

            $laborMap = buildLineMetricMap($rawLaborData, 'line', 'actual_labor_cost');
            $scrapMap = buildLineMetricMap($rawScrapData, 'line', 'scrap_cost');
            $peopleMap = buildLineMetricMap($rawPeopleData, 'line', 'avg_headcount');

            $prodMap = [];
            foreach ($rawProdData as $row) {
                $lower = array_change_key_case($row, CASE_LOWER);
                $lineKey = strtoupper(trim((string)($lower['line'] ?? '')));
                if ($lineKey !== '') {
                    $prodMap[$lineKey] = $lower;
                }
            }

            $allLines = array_unique(array_merge(
                array_keys($prodMap),
                array_keys($scrapMap),
                array_keys($peopleMap),
                array_keys($laborMap)
            ));
            $allLines = array_filter($allLines, static fn($v) => $v !== '' && $v !== 'ALL' && $v !== 'UNKNOWN');
            sort($allLines);

            $summary = [
                'sale' => 0.0,
                'cost' => 0.0,
                'std_cost' => 0.0,
                'gp' => 0.0,
                'rm' => 0.0,
                'dlot' => 0.0,
                'std_dl' => 0.0,
                'oh' => 0.0,
                'scrap' => 0.0,
                'total_units' => 0.0,
                'headcount' => 0.0,
                'active_lines' => 0,
            ];
            $lines = [];

            foreach ($allLines as $lineName) {
                $p = $prodMap[$lineName] ?? [
                    'total_units' => 0,
                    'sale_usd_all' => 0, 'sale_thb_all' => 0, 'cost_rm_all' => 0, 'cost_std_dl_all' => 0, 'cost_oh_all' => 0,
                    'sale_usd_fg' => 0, 'sale_thb_fg' => 0, 'cost_rm_fg' => 0, 'cost_std_dl_fg' => 0, 'cost_oh_fg' => 0,
                ];

                $saleUsdAll = (float)($p['sale_usd_all'] ?? 0);
                $saleThbAll = (float)($p['sale_thb_all'] ?? 0);
                $saleVal = ($saleUsdAll > 0) ? ($saleUsdAll * $exchangeRate) : $saleThbAll;
                $rmCost = (float)($p['cost_rm_all'] ?? 0);
                $ohCost = (float)($p['cost_oh_all'] ?? 0);
                $stdDlCost = (float)($p['cost_std_dl_all'] ?? 0);
                $laborCost = (float)($laborMap[$lineName] ?? 0);
                $scrapVal = (float)($scrapMap[$lineName] ?? 0);
                $avgHc = (float)($peopleMap[$lineName] ?? 0);
                $totalCost = $rmCost + $laborCost + $ohCost + $scrapVal;
                $totalStd = $rmCost + $stdDlCost + $ohCost + $scrapVal;
                $gp = $saleVal - $totalCost;

                $lines[] = [
                    'name' => $lineName,
                    'sale' => $saleVal,
                    'cost' => $totalCost,
                    'std_cost' => $totalStd,
                    'gp' => $gp,
                    'gp_percent' => ($saleVal > 0) ? ($gp / $saleVal * 100.0) : 0.0,
                    'rm' => $rmCost,
                    'dlot' => $laborCost,
                    'std_dl' => $stdDlCost,
                    'oh' => $ohCost,
                    'scrap' => $scrapVal,
                    'units' => (float)($p['total_units'] ?? 0),
                    'headcount' => round($avgHc, 1),
                ];

                $saleUsdFg = (float)($p['sale_usd_fg'] ?? 0);
                $saleThbFg = (float)($p['sale_thb_fg'] ?? 0);
                $saleValFg = ($saleUsdFg > 0) ? ($saleUsdFg * $exchangeRate) : $saleThbFg;
                $rmCostFg = (float)($p['cost_rm_fg'] ?? 0);
                $ohCostFg = (float)($p['cost_oh_fg'] ?? 0);
                $stdDlCostFg = (float)($p['cost_std_dl_fg'] ?? 0);

                $summary['sale'] += $saleValFg;
                $summary['rm'] += $rmCostFg;
                $summary['oh'] += $ohCostFg;
                $summary['std_dl'] += $stdDlCostFg;
                $summary['dlot'] += $laborCost;
                $summary['scrap'] += $scrapVal;
                $summary['cost'] += ($rmCostFg + $ohCostFg + $laborCost + $scrapVal);
                $summary['std_cost'] += ($rmCostFg + $ohCostFg + $stdDlCostFg + $scrapVal);
                $summary['total_units'] += (float)($p['total_units'] ?? 0);
                $summary['headcount'] += $avgHc;
            }

            $summary['gp'] = $summary['sale'] - $summary['cost'];
            $summary['active_lines'] = count($lines);
            $summary['headcount'] = (int)round($summary['headcount'], 0);

            $trendData = [];
            $period = new DatePeriod(
                new DateTime($startDate),
                new DateInterval('P1D'),
                (new DateTime($endDate))->modify('+1 day')
            );
            foreach ($period as $dt) {
                $dateKey = $dt->format('Y-m-d');
                $trendData[$dateKey] = ['date' => $dateKey, 'sale' => 0.0, 'cost' => 0.0, 'profit' => 0.0];
            }

            $sqlDailyProd = "
                SELECT
                    CONVERT(VARCHAR(10), CAST(DATEADD(HOUR, -8, t.transaction_timestamp) AS DATE), 23) AS log_date,
                    SUM(CASE WHEN i.sap_no LIKE '40%' THEN t.quantity * ISNULL(i.Price_USD, 0) ELSE 0 END) AS sale_usd,
                    SUM(CASE WHEN i.sap_no LIKE '40%' THEN t.quantity * ISNULL(i.StandardPrice, 0) ELSE 0 END) AS sale_thb_std,
                    SUM(CASE WHEN i.sap_no LIKE '40%' THEN t.quantity * (
                        ISNULL(i.Cost_RM, 0) + ISNULL(i.Cost_PKG, 0) + ISNULL(i.Cost_SUB, 0) +
                        ISNULL(i.Cost_OH_Machine, 0) + ISNULL(i.Cost_OH_Utilities, 0) + ISNULL(i.Cost_OH_Indirect, 0) +
                        ISNULL(i.Cost_OH_Staff, 0) + ISNULL(i.Cost_OH_Accessory, 0) + ISNULL(i.Cost_OH_Others, 0)
                    ) ELSE 0 END) AS cost_prod_no_dl
                FROM " . TRANSACTIONS_TABLE . " t WITH (NOLOCK)
                JOIN " . ITEMS_TABLE . " i WITH (NOLOCK) ON t.parameter_id = i.item_id
                JOIN " . LOCATIONS_TABLE . " l WITH (NOLOCK) ON t.to_location_id = l.location_id
                WHERE t.transaction_type = 'PRODUCTION_FG'
                  AND t.transaction_timestamp >= :qStart
                  AND t.transaction_timestamp < :qEnd
                  AND l.production_line IS NOT NULL
                  " . ($userLine !== null ? "AND l.production_line = :line" : "") . "
                GROUP BY CAST(DATEADD(HOUR, -8, t.transaction_timestamp) AS DATE)
            ";
            $stmtDaily = $pdo->prepare($sqlDailyProd);
            $stmtDaily->execute($paramsProd);
            while ($row = $stmtDaily->fetch(PDO::FETCH_ASSOC)) {
                $d = $row['log_date'];
                if (isset($trendData[$d])) {
                    $saleUsd = (float)($row['sale_usd'] ?? 0);
                    $saleThb = (float)($row['sale_thb_std'] ?? 0);
                    $trendData[$d]['sale'] += ($saleUsd > 0) ? ($saleUsd * $exchangeRate) : $saleThb;
                    $trendData[$d]['cost'] += (float)($row['cost_prod_no_dl'] ?? 0);
                }
            }

            $sqlDailyLabor = "
                SELECT CONVERT(VARCHAR(10), entry_date, 23) AS entry_date, SUM(cost_value) AS labor_val
                FROM " . MANUAL_COSTS_TABLE . " WITH (NOLOCK)
                WHERE entry_date BETWEEN :start AND :end
                  AND cost_type IN ('DIRECT_LABOR', 'OVERTIME')
                  AND line IS NOT NULL AND line NOT IN ('UNKNOWN', 'ALL')
                  AND line NOT LIKE '%Team2%'
                  " . ($userLine !== null ? "AND line = :line" : "") . "
                GROUP BY entry_date
            ";
            $stmtDl = $pdo->prepare($sqlDailyLabor);
            $stmtDl->execute($paramsLabor);
            while ($row = $stmtDl->fetch(PDO::FETCH_ASSOC)) {
                $d = $row['entry_date'];
                if (isset($trendData[$d])) {
                    $trendData[$d]['cost'] += (float)($row['labor_val'] ?? 0);
                }
            }

            $sqlDailyScrap = "
                SELECT
                    CONVERT(VARCHAR(10), CAST(DATEADD(HOUR, -8, t.transaction_timestamp) AS DATE), 23) AS log_date,
                    ABS(SUM(t.quantity * ISNULL(i.Cost_Total, 0))) AS scrap_val
                FROM " . TRANSACTIONS_TABLE . " t WITH (NOLOCK)
                JOIN " . ITEMS_TABLE . " i WITH (NOLOCK) ON t.parameter_id = i.item_id
                LEFT JOIN " . LOCATIONS_TABLE . " l WITH (NOLOCK) ON t.from_location_id = l.location_id
                LEFT JOIN " . USERS_TABLE . " u WITH (NOLOCK) ON t.created_by_user_id = u.id
                WHERE t.transaction_type = 'SCRAP'
                  AND t.transaction_timestamp >= :qStart
                  AND t.transaction_timestamp < :qEnd
                  AND l.production_line IS NOT NULL
                  AND (u.line NOT LIKE '%Team2%' OR u.line IS NULL)
                  AND (u.username NOT LIKE '%Team2%' OR u.username IS NULL)
                  AND (l.production_line NOT LIKE '%Team2%')
                  " . ($userLine !== null ? "AND l.production_line = :line" : "") . "
                GROUP BY CAST(DATEADD(HOUR, -8, t.transaction_timestamp) AS DATE)
            ";
            $stmtScrapDaily = $pdo->prepare($sqlDailyScrap);
            $stmtScrapDaily->execute($paramsScrap);
            while ($row = $stmtScrapDaily->fetch(PDO::FETCH_ASSOC)) {
                $d = $row['log_date'];
                if (isset($trendData[$d])) {
                    $trendData[$d]['cost'] += (float)($row['scrap_val'] ?? 0);
                }
            }

            foreach ($trendData as &$day) {
                $day['profit'] = $day['sale'] - $day['cost'];
            }
            unset($day);

            mgmtJsonSuccess([
                'summary' => $summary,
                'lines' => array_values($lines),
                'trend' => array_values($trendData),
            ], 'Executive dashboard loaded');
            break;
        }

        case 'get_line_details': {
            $line = trim((string)($input['line'] ?? ''));
            if ($line === '') {
                mgmtJsonError('กรุณาระบุไลน์ผลิตที่ต้องการดูรายละเอียด', 400);
            }
            if ($userLine !== null && strcasecmp($userLine, $line) !== 0) {
                mgmtJsonError('คุณสามารถดูรายละเอียดได้เฉพาะไลน์ผลิตที่รับผิดชอบเท่านั้น', 403);
            }

            $date = normalizeMgmtDate($input['date'] ?? date('Y-m-d'), date('Y-m-d'));
            $startDt = $date . ' 08:00:00';
            $endDt = date('Y-m-d', strtotime($date . ' +1 day')) . ' 08:00:00';

            $stmtHourly = $pdo->prepare("
                SELECT DATEPART(HOUR, t.transaction_timestamp) AS hr, SUM(t.quantity) AS qty
                FROM " . TRANSACTIONS_TABLE . " t WITH (NOLOCK)
                JOIN " . LOCATIONS_TABLE . " l WITH (NOLOCK) ON t.to_location_id = l.location_id
                WHERE l.production_line = :line
                  AND t.transaction_type = 'PRODUCTION_FG'
                  AND t.transaction_timestamp >= :startDt AND t.transaction_timestamp < :endDt
                GROUP BY DATEPART(HOUR, t.transaction_timestamp)
                ORDER BY hr
            ");
            $stmtHourly->execute([':line' => $line, ':startDt' => $startDt, ':endDt' => $endDt]);
            $hourlyData = $stmtHourly->fetchAll(PDO::FETCH_ASSOC);

            $stmtDowntime = $pdo->prepare("
                SELECT TOP 50
                    CONVERT(VARCHAR(5), start_time, 108) AS start_time,
                    CONVERT(VARCHAR(5), end_time, 108) AS end_time,
                    ISNULL(machine_name, '-') AS machine,
                    ISNULL(cause_detail, cause_category) AS cause,
                    ISNULL(duration_min, DATEDIFF(MINUTE, start_time, ISNULL(end_time, GETDATE()))) AS duration
                FROM dbo.PE_DOWNTIME_LOG WITH (NOLOCK)
                WHERE line = :line AND log_date = :dt
                ORDER BY start_time DESC
            ");
            $stmtDowntime->execute([':line' => $line, ':dt' => $date]);
            $downtimeData = $stmtDowntime->fetchAll(PDO::FETCH_ASSOC);

            if (empty($downtimeData)) {
                $stmtReq = $pdo->prepare("
                    SELECT TOP 50
                        CONVERT(VARCHAR(5), request_date, 108) AS start_time,
                        CONVERT(VARCHAR(5), ISNULL(resolved_at, GETDATE()), 108) AS end_time,
                        ISNULL(machine, '-') AS machine,
                        ISNULL(issue_description, priority) AS cause,
                        ISNULL(actual_repair_minutes, DATEDIFF(MINUTE, request_date, ISNULL(resolved_at, GETDATE()))) AS duration
                    FROM dbo.MAINTENANCE_REQUESTS WITH (NOLOCK)
                    WHERE line = :line AND request_date >= :startDt AND request_date < :endDt
                    ORDER BY request_date DESC
                ");
                $stmtReq->execute([':line' => $line, ':startDt' => $startDt, ':endDt' => $endDt]);
                $downtimeData = $stmtReq->fetchAll(PDO::FETCH_ASSOC);
            }

            $stmtScrap = $pdo->prepare("
                SELECT TOP 50
                    i.part_no,
                    i.part_description,
                    SUM(t.quantity) AS qty,
                    SUM(t.quantity * ISNULL(i.Cost_Total, 0)) AS lost_val
                FROM " . TRANSACTIONS_TABLE . " t WITH (NOLOCK)
                JOIN " . ITEMS_TABLE . " i WITH (NOLOCK) ON t.parameter_id = i.item_id
                LEFT JOIN " . LOCATIONS_TABLE . " l WITH (NOLOCK) ON t.from_location_id = l.location_id
                WHERE l.production_line = :line
                  AND t.transaction_type IN ('PRODUCTION_SCRAP', 'SCRAP')
                  AND t.transaction_timestamp >= :startDt AND t.transaction_timestamp < :endDt
                GROUP BY i.part_no, i.part_description
                ORDER BY lost_val DESC
            ");
            $stmtScrap->execute([':line' => $line, ':startDt' => $startDt, ':endDt' => $endDt]);
            $scrapData = $stmtScrap->fetchAll(PDO::FETCH_ASSOC);

            $stmtMan = $pdo->prepare("
                SELECT TOP 150
                    e.emp_id, e.name_th, e.position,
                    CONVERT(VARCHAR(5), l.scan_in_time, 108) AS check_in
                FROM " . MANPOWER_DAILY_LOGS_TABLE . " l WITH (NOLOCK)
                JOIN " . MANPOWER_EMPLOYEES_TABLE . " e WITH (NOLOCK) ON l.emp_id = e.emp_id
                WHERE e.line = :line
                  AND l.log_date = :dt
                  AND l.status IN ('PRESENT', 'LATE')
                ORDER BY l.scan_in_time
            ");
            $stmtMan->execute([':line' => $line, ':dt' => $date]);
            $manpowerData = $stmtMan->fetchAll(PDO::FETCH_ASSOC);

            mgmtJsonSuccess([
                'hourly' => $hourlyData,
                'downtime' => $downtimeData,
                'scrap' => $scrapData,
                'manpower' => $manpowerData,
            ], 'Line details loaded');
            break;
        }

        default:
            mgmtJsonError("Invalid action: {$action}", 400);
    }
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    writeErrorLog($pdo ?? null, 'MGMT_EXECUTIVE', $e->getMessage(), ['action' => $action]);
    mgmtJsonError('ไม่สามารถประมวลผลข้อมูลภาพรวมผู้บริหารได้ กรุณาลองใหม่อีกครั้ง', 500);
}
