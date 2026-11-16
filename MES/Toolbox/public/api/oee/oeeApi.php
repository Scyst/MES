<?php
/**
 * Self-contained OEE Executive & Shopfloor Real-time Monitoring API.
 * Replaces legacy page/OEE_Dashboard/api/oeeDashboardApi.php & oeeShopfloorApi.php.
 */

require_once __DIR__ . '/_common.php';

$action = '';
$input = [];
try {
    [$action, $input, $currentUser] = parseOeeRequest('getFilters');
    $canViewFinancials = canViewOeeExecutiveFinancials($currentUser);

    $today = date('Y-m-d');
    $startDate = normalizeOeeDate($input['startDate'] ?? $today, $today);
    $endDate = normalizeOeeDate($input['endDate'] ?? $today, $today);
    if ($startDate > $endDate) {
        oeeJsonError('วันที่เริ่มต้นต้องไม่มากกว่าวันที่สิ้นสุด', 400);
    }

    $line = normalizeOeeFilter($input['line'] ?? null);
    $model = normalizeOeeFilter($input['model'] ?? null);
    $machine = normalizeOeeFilter($input['machine'] ?? null);
    $team = normalizeOeeFilter($input['team'] ?? null);
    $laborView = strtolower(trim((string)($input['laborView'] ?? 'actual')));
    $mode = strtolower(trim((string)($input['mode'] ?? 'executive')));

    switch ($action) {
        case 'getFilters': {
            $lines = $pdo->query("
                SELECT DISTINCT RTRIM(LTRIM(line)) AS line
                FROM " . ROUTES_TABLE . " WITH (NOLOCK)
                WHERE line IS NOT NULL AND line <> ''
                ORDER BY line ASC
            ")->fetchAll(PDO::FETCH_COLUMN) ?: [];

            $models = $pdo->query("
                SELECT DISTINCT RTRIM(LTRIM(model)) AS model
                FROM " . ROUTES_TABLE . " WITH (NOLOCK)
                WHERE model IS NOT NULL AND model <> ''
                ORDER BY model ASC
            ")->fetchAll(PDO::FETCH_COLUMN) ?: [];

            $machines = $pdo->query("
                SELECT machine_id, machine_name, ISNULL(line, '') AS line
                FROM " . PE_MACHINES_TABLE . " WITH (NOLOCK)
                WHERE status = 'Active'
                ORDER BY machine_name ASC
            ")->fetchAll(PDO::FETCH_ASSOC) ?: [];

            $teams = $pdo->query("
                SELECT DISTINCT team_group
                FROM " . USERS_TABLE . " WITH (NOLOCK)
                WHERE team_group IS NOT NULL AND team_group <> ''
                ORDER BY team_group ASC
            ")->fetchAll(PDO::FETCH_COLUMN) ?: [];

            oeeJsonSuccess([
                'lines' => $lines,
                'models' => $models,
                'machines' => $machines,
                'teams' => $teams,
                'can_view_financials' => $canViewFinancials,
            ], 'OEE filters loaded');
            break;
        }

        case 'getPieChart': {
            $stmt = $pdo->prepare("EXEC dbo." . SP_CALC_OEE_PIE . " @StartDate = ?, @EndDate = ?, @Line = ?, @Model = ?, @MachineId = ?, @Team = ?");
            $stmt->execute([$startDate, $endDate, $line, $model, $machine, $team]);
            $res = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];

            $sapScrapCost = 0.0;
            if ($canViewFinancials && $mode !== 'shopfloor') {
                $actualStart = $startDate . ' 08:00:00';
                $actualEnd = date('Y-m-d H:i:s', strtotime($endDate . ' +1 day 8 hours'));

                $partCond = ["t.transaction_timestamp >= ?", "t.transaction_timestamp < ?", "t.transaction_type = 'PRODUCTION_SCRAP'"];
                $partParams = [$actualStart, $actualEnd];
                if ($line !== null) {
                    $partCond[] = "l.production_line = ?";
                    $partParams[] = $line;
                }
                if ($model !== null) {
                    $partCond[] = "r.model = ?";
                    $partParams[] = $model;
                }
                if ($machine !== null) {
                    $partCond[] = "t.machine_id = ?";
                    $partParams[] = $machine;
                }
                if ($team !== null) {
                    $partCond[] = "(u.team_group = ? OR t.notes LIKE ?)";
                    $partParams[] = $team;
                    $partParams[] = '%[[]TEAM_OVERRIDE: ' . $team . ']%';
                }

                $scrapSql = "
                    SELECT i.sap_no, SUM(t.quantity) AS scrap_qty
                    FROM " . TRANSACTIONS_TABLE . " t WITH (NOLOCK)
                    JOIN " . ITEMS_TABLE . " i WITH (NOLOCK) ON t.parameter_id = i.item_id
                    LEFT JOIN " . LOCATIONS_TABLE . " l WITH (NOLOCK) ON t.to_location_id = l.location_id
                    LEFT JOIN " . ROUTES_TABLE . " r WITH (NOLOCK) ON t.parameter_id = r.item_id AND l.production_line = r.line
                    LEFT JOIN " . USERS_TABLE . " u WITH (NOLOCK) ON t.created_by_user_id = u.id
                    WHERE " . implode(' AND ', $partCond) . "
                    GROUP BY i.sap_no
                ";
                $scrapStmt = $pdo->prepare($scrapSql);
                $scrapStmt->execute($partParams);
                $scrapItems = $scrapStmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
                $sapScrapCost = lookupSapScrapUnitCost($pdo, $scrapItems);
            }

            oeeJsonSuccess([
                'quality' => round((float)($res['Quality'] ?? 0), 1),
                'availability' => round((float)($res['Availability'] ?? 0), 1),
                'performance' => round((float)($res['Performance'] ?? 0), 1),
                'oee' => round((float)($res['OEE'] ?? 0), 1),
                'fg' => (int)($res['FG'] ?? 0),
                'defects' => (int)($res['Defects'] ?? 0),
                'hold' => (int)($res['Hold'] ?? 0),
                'scrap' => (int)($res['Scrap'] ?? 0),
                'sap_scrap_cost' => $sapScrapCost,
                'runtime' => (float)($res['Runtime'] ?? 0),
                'planned_time' => (float)($res['PlannedTime'] ?? 0),
                'downtime' => (float)($res['Downtime'] ?? 0),
                'actual_output' => (int)($res['ActualOutput'] ?? 0),
                'total_theoretical_minutes' => round((float)($res['TotalTheoreticalMinutes'] ?? 0), 2),
                'TargetQty' => (float)($res['TargetQty'] ?? 0),
            ], 'OEE gauges loaded');
            break;
        }

        case 'getLineChart': {
            $viewType = trim((string)($input['viewType'] ?? 'daily'));
            if ($viewType === 'daily') {
                $targetEndDate = $endDate;
                $targetStartDate = date('Y-m-d', strtotime($targetEndDate . ' -30 days'));
            } else {
                $targetStartDate = $startDate;
                $targetEndDate = $endDate;
            }

            $stmt = $pdo->prepare("EXEC dbo." . SP_CALC_OEE_LINE . " @StartDate = ?, @EndDate = ?, @Line = ?, @Model = ?, @MachineId = ?, @Team = ?");
            $stmt->execute([$targetStartDate, $targetEndDate, $line, $model, $machine, $team]);
            $records = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
            foreach ($records as &$row) {
                if (!empty($row['date'])) {
                    $row['date'] = (new DateTime($row['date']))->format('d-m-y');
                }
                foreach (['OEE', 'Availability', 'Performance', 'Quality', 'oee', 'availability', 'performance', 'quality'] as $metricKey) {
                    if (isset($row[$metricKey])) {
                        $row[$metricKey] = round((float)$row[$metricKey], 1);
                    }
                }
            }
            unset($row);

            oeeJsonSuccess($records, 'OEE trend loaded');
            break;
        }

        case 'getHourlySparklines': {
            $stmt = $pdo->prepare("EXEC dbo." . SP_CALC_OEE_HOURLY . " @TargetDate = ?, @Line = ?, @Model = ?, @MachineId = ?, @Team = ?");
            $stmt->execute([$endDate, $line, $model, $machine, $team]);
            $records = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
            oeeJsonSuccess($records, 'Hourly OEE trend loaded');
            break;
        }

        case 'getBarCharts': {
            $actualStart = $startDate . ' 08:00:00';
            $actualEnd = date('Y-m-d H:i:s', strtotime($endDate . ' +1 day 8 hours'));
            $stopCauseGroupBy = trim((string)($input['stopCauseGroupBy'] ?? 'cause'));

            $stopCond = ["m.request_date >= ?", "m.request_date < ?"];
            $stopParams = [$actualStart, $actualEnd];
            if ($line !== null) {
                $stopCond[] = "m.line = ?";
                $stopParams[] = $line;
            }
            if ($machine !== null) {
                $macStmt = $pdo->prepare("SELECT TOP 1 machine_name FROM " . PE_MACHINES_TABLE . " WITH (NOLOCK) WHERE machine_id = ?");
                $macStmt->execute([$machine]);
                $macName = $macStmt->fetchColumn();
                if ($macName) {
                    $stopCond[] = "m.machine = ?";
                    $stopParams[] = $macName;
                }
            }

            $colGroup = ($stopCauseGroupBy === 'line') ? 'm.line' : 'm.machine';
            $stopSql = "
                SELECT TOP 25
                    ISNULL({$colGroup}, 'Unspecified') AS label,
                    SUM(ISNULL(m.actual_repair_minutes, DATEDIFF(MINUTE, m.request_date, ISNULL(m.resolved_at, GETDATE())))) AS total_minutes
                FROM " . MAINTENANCE_REQUESTS_TABLE . " m WITH (NOLOCK)
                WHERE " . implode(' AND ', $stopCond) . "
                GROUP BY ISNULL({$colGroup}, 'Unspecified')
                HAVING SUM(ISNULL(m.actual_repair_minutes, DATEDIFF(MINUTE, m.request_date, ISNULL(m.resolved_at, GETDATE())))) > 0
                ORDER BY total_minutes DESC
            ";
            $stmtStop = $pdo->prepare($stopSql);
            $stmtStop->execute($stopParams);
            $stopResults = $stmtStop->fetchAll(PDO::FETCH_ASSOC) ?: [];

            $partCond = ["t.transaction_timestamp >= ?", "t.transaction_timestamp < ?", "t.transaction_type LIKE 'PRODUCTION_%'"];
            $partParams = [];
            $modelFilter = '';
            if ($model !== null) {
                $modelFilter = "AND r2.model = ?";
                $partParams[] = $model;
            }
            $partParams[] = $actualStart;
            $partParams[] = $actualEnd;

            if ($line !== null) {
                $partCond[] = "l.production_line = ?";
                $partParams[] = $line;
            }
            if ($model !== null) {
                $partCond[] = "r.model IS NOT NULL";
            }
            if ($machine !== null) {
                $partCond[] = "t.machine_id = ?";
                $partParams[] = $machine;
            }
            if ($team !== null) {
                $partCond[] = "(u.team_group = ? OR t.notes LIKE ?)";
                $partParams[] = $team;
                $partParams[] = '%[[]TEAM_OVERRIDE: ' . $team . ']%';
            }

            $partSql = "
                SELECT TOP 200
                    i.part_no,
                    ISNULL(l.production_line, 'N/A') AS production_line,
                    ISNULL(r.model, 'N/A') AS model,
                    CAST(SUM(CASE WHEN t.transaction_type = 'PRODUCTION_FG' THEN t.quantity ELSE 0 END) AS INT) AS FG,
                    CAST(SUM(CASE WHEN t.transaction_type = 'PRODUCTION_HOLD' THEN t.quantity ELSE 0 END) AS INT) AS HOLD,
                    CAST(SUM(CASE WHEN t.transaction_type = 'PRODUCTION_SCRAP' THEN t.quantity ELSE 0 END) AS INT) AS SCRAP
                FROM " . TRANSACTIONS_TABLE . " t WITH (NOLOCK)
                JOIN " . ITEMS_TABLE . " i WITH (NOLOCK) ON t.parameter_id = i.item_id
                LEFT JOIN " . LOCATIONS_TABLE . " l WITH (NOLOCK) ON t.to_location_id = l.location_id
                OUTER APPLY (
                    SELECT TOP 1 r2.model
                    FROM " . ROUTES_TABLE . " r2 WITH (NOLOCK)
                    WHERE r2.item_id = t.parameter_id AND r2.line = l.production_line
                    {$modelFilter}
                ) r
                LEFT JOIN " . USERS_TABLE . " u WITH (NOLOCK) ON t.created_by_user_id = u.id
                WHERE " . implode(' AND ', $partCond) . " AND t.quantity > 0
                GROUP BY i.part_no, ISNULL(l.production_line, 'N/A'), ISNULL(r.model, 'N/A')
                HAVING SUM(t.quantity) >= 0.01
                ORDER BY FG DESC, i.part_no ASC
            ";
            $stmtPart = $pdo->prepare($partSql);
            $stmtPart->execute($partParams);
            $partResults = $stmtPart->fetchAll(PDO::FETCH_ASSOC) ?: [];

            oeeJsonSuccess([
                'partResults' => $partResults,
                'stopCause' => [
                    'labels' => array_column($stopResults, 'label'),
                    'values' => array_map('floatval', array_column($stopResults, 'total_minutes')),
                ],
            ], 'Downtime & part output loaded');
            break;
        }

        case 'getDailyProduction': {
            $stmt = $pdo->prepare("EXEC dbo." . SP_GET_DAILY_PROD . " @StartDate = ?, @EndDate = ?, @Line = ?, @Model = ?, @MachineId = ?, @Team = ?");
            $stmt->execute([$startDate, $endDate, $line, $model, $machine, $team]);
            $results = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
            foreach ($results as &$r) {
                if (isset($r['TotalQuantity'])) {
                    $r['TotalQuantity'] = (float)$r['TotalQuantity'];
                }
                if (!empty($r['ProductionDate'])) {
                    $r['ProductionDate'] = (new DateTime($r['ProductionDate']))->format('Y-m-d');
                }
            }
            unset($r);
            oeeJsonSuccess($results, 'Daily production loaded');
            break;
        }

        case 'getCostSummary': {
            $stmtStd = $pdo->prepare("EXEC dbo." . SP_CALC_STD_COST . " @StartDate = :sd, @EndDate = :ed, @Line = :ln, @Model = :md, @Team = :tm");
            $stmtStd->bindValue(':sd', $startDate);
            $stmtStd->bindValue(':ed', $endDate);
            $stmtStd->bindValue(':ln', $line, $line === null ? PDO::PARAM_NULL : PDO::PARAM_STR);
            $stmtStd->bindValue(':md', $model, $model === null ? PDO::PARAM_NULL : PDO::PARAM_STR);
            $stmtStd->bindValue(':tm', $team, $team === null ? PDO::PARAM_NULL : PDO::PARAM_STR);
            $stmtStd->execute();
            $stdRes = $stmtStd->fetch(PDO::FETCH_ASSOC);

            if (!$stdRes) {
                oeeJsonSuccess([
                    'TotalStdRevenue' => 0, 'TotalMatCost' => 0, 'TotalDLCost' => 0, 'TotalOHCost' => 0, 'TotalStdCost' => 0,
                    'PercentRM' => 0, 'PercentDL' => 0, 'PercentOH' => 0, 'PercentGPStd' => 0,
                    'isActualDLCost' => false, 'CostPerUnit' => 0, 'ScrapCostValue' => 0, 'LaborEfficiency' => 0,
                    'TotalStdDLCost' => 0, 'TotalActualDL' => 0, 'TotalActualOT' => 0, 'TotalActualDLOT' => 0,
                    'can_view_financials' => $canViewFinancials,
                ], 'No production data found');
            }

            if (!$canViewFinancials || $mode === 'shopfloor') {
                oeeJsonSuccess([
                    'TotalStdRevenue' => (float)($stdRes['TotalStdRevenue'] ?? 0),
                    'TotalMatCost' => 0, 'TotalDLCost' => 0, 'TotalOHCost' => 0, 'TotalStdCost' => 0,
                    'PercentRM' => 0, 'PercentDL' => 0, 'PercentOH' => 0, 'PercentGPStd' => 0,
                    'isActualDLCost' => false, 'CostPerUnit' => 0, 'ScrapCostValue' => 0, 'LaborEfficiency' => 0,
                    'can_view_financials' => false,
                ], 'Shopfloor revenue loaded');
            }

            $actualStart = $startDate . ' 08:00:00';
            $actualEnd = date('Y-m-d H:i:s', strtotime($endDate . ' +1 day 8 hours'));
            $partCond = ["t.transaction_timestamp >= ?", "t.transaction_timestamp < ?", "t.transaction_type LIKE 'PRODUCTION_%'"];
            $partParams = [$actualStart, $actualEnd];
            if ($line !== null) {
                $partCond[] = "l.production_line = ?";
                $partParams[] = $line;
            }
            if ($model !== null) {
                $partCond[] = "r.model = ?";
                $partParams[] = $model;
            }
            if ($machine !== null) {
                $partCond[] = "t.machine_id = ?";
                $partParams[] = $machine;
            }
            if ($team !== null) {
                $partCond[] = "(u.team_group = ? OR t.notes LIKE ?)";
                $partParams[] = $team;
                $partParams[] = '%[[]TEAM_OVERRIDE: ' . $team . ']%';
            }

            $qtySql = "
                SELECT
                    SUM(CASE WHEN t.transaction_type = 'PRODUCTION_FG' THEN t.quantity ELSE 0 END) AS FG,
                    SUM(CASE WHEN t.transaction_type = 'PRODUCTION_SCRAP' THEN t.quantity ELSE 0 END) AS Scrap
                FROM " . TRANSACTIONS_TABLE . " t WITH (NOLOCK)
                LEFT JOIN " . LOCATIONS_TABLE . " l WITH (NOLOCK) ON t.to_location_id = l.location_id
                LEFT JOIN " . ROUTES_TABLE . " r WITH (NOLOCK) ON t.parameter_id = r.item_id AND l.production_line = r.line
                LEFT JOIN " . USERS_TABLE . " u WITH (NOLOCK) ON t.created_by_user_id = u.id
                WHERE " . implode(' AND ', $partCond) . "
            ";
            $qtyStmt = $pdo->prepare($qtySql);
            $qtyStmt->execute($partParams);
            $qtyData = $qtyStmt->fetch(PDO::FETCH_ASSOC) ?: [];
            $totalFg = (float)($qtyData['FG'] ?? 0);
            $scrapQty = (float)($qtyData['Scrap'] ?? 0);

            foreach ($stdRes as $k => $v) {
                if (is_numeric($v)) {
                    $stdRes[$k] = (float)$v;
                }
            }

            $stdDlCost = (float)($stdRes['TotalDLCost'] ?? 0);
            $stdRes['TotalStdDLCost'] = $stdDlCost;

            $stmtAct = $pdo->prepare("EXEC dbo." . SP_CALC_ACTUAL_COST . " @StartDate = :sd, @EndDate = :ed, @Line = :ln, @Team = :tm");
            $stmtAct->bindValue(':sd', $startDate);
            $stmtAct->bindValue(':ed', $endDate);
            $stmtAct->bindValue(':ln', $line, $line === null ? PDO::PARAM_NULL : PDO::PARAM_STR);
            $stmtAct->bindValue(':tm', $team, $team === null ? PDO::PARAM_NULL : PDO::PARAM_STR);
            $stmtAct->execute();
            $actRes = $stmtAct->fetch(PDO::FETCH_ASSOC) ?: [];

            $actualDl = (float)($actRes['TotalActualDL'] ?? 0);
            $actualOt = (float)($actRes['TotalActualOT'] ?? 0);
            $actualDlot = (float)($actRes['TotalActualDLOT'] ?? 0);
            $actualHc = (int)($actRes['TotalHeadcount'] ?? 0);

            $stdRes['TotalActualDL'] = $actualDl;
            $stdRes['TotalActualOT'] = $actualOt;
            $stdRes['TotalActualDLOT'] = $actualDlot;
            $stdRes['TotalActualHeadcount'] = $actualHc;
            $stdRes['DailyActualDL'] = (float)($actRes['DailyActualDL'] ?? 0);
            $stdRes['MonthlyActualDL'] = (float)($actRes['MonthlyActualDL'] ?? 0);

            $rev = (float)($stdRes['TotalStdRevenue'] ?? 0);
            $matCost = (float)($stdRes['TotalMatCost'] ?? 0);
            $ohCost = (float)($stdRes['TotalOHCost'] ?? 0);

            $stdTotalCost = $matCost + $stdDlCost + $ohCost;
            $stdGp = $rev - $stdTotalCost;
            $stdPercentGp = ($rev > 0) ? ($stdGp / $rev) * 100 : 0;
            $stdLaborEff = ($stdDlCost > 0) ? ($rev / $stdDlCost) : 0;
            $stdCpu = ($totalFg > 0) ? ($stdTotalCost / $totalFg) : 0;

            $actualTotalCost = $matCost + $actualDlot + $ohCost;
            $actualGp = $rev - $actualTotalCost;
            $actualPercentGp = ($rev > 0) ? ($actualGp / $rev) * 100 : 0;
            $actualLaborEff = ($actualDlot > 0) ? ($rev / $actualDlot) : 0;
            $actualCpu = ($totalFg > 0) ? ($actualTotalCost / $totalFg) : 0;

            $stdRes['dualViews'] = [
                'actual' => [
                    'laborCost' => $actualDlot,
                    'totalDL' => $actualDl,
                    'totalOT' => $actualOt,
                    'headcount' => $actualHc,
                    'totalCost' => $actualTotalCost,
                    'grossProfit' => $actualGp,
                    'percentGP' => $actualPercentGp,
                    'laborEfficiency' => $actualLaborEff,
                    'costPerUnit' => $actualCpu,
                    'percentDL' => ($rev > 0) ? ($actualDlot / $rev) * 100 : 0,
                ],
                'bom' => [
                    'laborCost' => $stdDlCost,
                    'totalDL' => $stdDlCost,
                    'totalOT' => 0,
                    'headcount' => 0,
                    'totalCost' => $stdTotalCost,
                    'grossProfit' => $stdGp,
                    'percentGP' => $stdPercentGp,
                    'laborEfficiency' => $stdLaborEff,
                    'costPerUnit' => $stdCpu,
                    'percentDL' => ($rev > 0) ? ($stdDlCost / $rev) * 100 : 0,
                ],
            ];

            $isActual = ($laborView !== 'bom' && $laborView !== 'std');
            $stdRes['laborView'] = $isActual ? 'actual' : 'bom';
            $stdRes['isActualDLCost'] = $isActual;
            $stdRes['TotalDLCost'] = $isActual ? $actualDlot : $stdDlCost;
            $stdRes['TotalStdCost'] = $isActual ? $actualTotalCost : $stdTotalCost;
            $stdRes['PercentGPStd'] = $isActual ? $actualPercentGp : $stdPercentGp;
            $stdRes['LaborEfficiency'] = $isActual ? $actualLaborEff : $stdLaborEff;
            $stdRes['CostPerUnit'] = $isActual ? $actualCpu : $stdCpu;
            $stdRes['PercentDL'] = ($rev > 0) ? (($isActual ? $actualDlot : $stdDlCost) / $rev) * 100 : 0;
            $stdRes['PercentOH'] = ($rev > 0) ? ($ohCost / $rev) * 100 : 0;

            $matCostPerUnit = ($totalFg > 0) ? ($matCost / $totalFg) : 0;
            $stdRes['ScrapCostValue'] = $scrapQty * $matCostPerUnit;
            $stdRes['can_view_financials'] = true;

            oeeJsonSuccess($stdRes, 'OEE financial cost summary loaded');
            break;
        }

        default:
            oeeJsonError("Invalid action: {$action}", 400);
    }
} catch (Throwable $e) {
    writeErrorLog($pdo ?? null, 'OEE_DASHBOARD', $e->getMessage(), ['action' => $action]);
    oeeJsonError('ไม่สามารถประมวลผลข้อมูล OEE ได้ กรุณาลองใหม่อีกครั้ง', 500);
}
