<?php
require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../../config/config.php';
header('Content-Type: application/json; charset=utf-8');

$response = ['success' => false, 'data' => null, 'message' => ''];
$action = $_GET['action'] ?? '';
$startDate = isset($_GET['startDate']) ? trim($_GET['startDate']) : date('Y-m-d');
$endDate = isset($_GET['endDate']) ? trim($_GET['endDate']) : date('Y-m-d');
$line = (!empty($_GET['line']) && trim($_GET['line']) !== 'All') ? trim($_GET['line']) : null;
$model = (!empty($_GET['model']) && trim($_GET['model']) !== 'All') ? trim($_GET['model']) : null;
$machine = (!empty($_GET['machine']) && trim($_GET['machine']) !== 'All') ? trim($_GET['machine']) : null;
$team = (!empty($_GET['team']) && trim($_GET['team']) !== 'All') ? trim($_GET['team']) : null;
$laborView = isset($_GET['laborView']) ? trim(strtolower($_GET['laborView'])) : 'actual';

try {
    switch ($action) {
        case 'getFilters':
            $lineSql = "SELECT DISTINCT RTRIM(LTRIM(line)) as line FROM " . ROUTES_TABLE . " WITH (NOLOCK) WHERE line IS NOT NULL AND line != '' ORDER BY line ASC";
            $lines = $pdo->query($lineSql)->fetchAll(PDO::FETCH_COLUMN);
            
            $modelSql = "SELECT DISTINCT RTRIM(LTRIM(model)) as model FROM " . ROUTES_TABLE . " WITH (NOLOCK) WHERE model IS NOT NULL AND model != '' ORDER BY model ASC";
            $models = $pdo->query($modelSql)->fetchAll(PDO::FETCH_COLUMN);
            
            $machineSql = "SELECT machine_id, machine_name, ISNULL(line, '') as line FROM dbo.PE_MACHINES WITH (NOLOCK) WHERE status = 'Active' ORDER BY machine_name ASC";
            $machines = $pdo->query($machineSql)->fetchAll(PDO::FETCH_ASSOC);

            $teamSql = "SELECT DISTINCT team_group FROM " . USERS_TABLE . " WITH (NOLOCK) WHERE team_group IS NOT NULL AND team_group != '' ORDER BY team_group ASC";
            $teams = $pdo->query($teamSql)->fetchAll(PDO::FETCH_COLUMN);

            $response['data'] = ['lines' => $lines, 'models' => $models, 'machines' => $machines, 'teams' => $teams];
            $response['success'] = true;
            break;

        case 'getPieChart':
            $stmt = $pdo->prepare("EXEC dbo." . SP_CALC_OEE_PIE . " @StartDate = ?, @EndDate = ?, @Line = ?, @Model = ?, @MachineId = ?, @Team = ?");
            $stmt->execute([$startDate, $endDate, $line, $model, $machine, $team]);
            $res = $stmt->fetch(PDO::FETCH_ASSOC);
            
            // Calculate SAP Scrap Cost
            $sapScrapCost = 0;
            $actualStartDate = $startDate . ' 08:00:00';
            $actualEndDate = date('Y-m-d H:i:s', strtotime($endDate . ' +1 day 8 hours'));
            
            $partCond = ["t.transaction_timestamp >= ?", "t.transaction_timestamp < ?", "t.transaction_type = 'PRODUCTION_SCRAP'"];
            $partParams = [$actualStartDate, $actualEndDate];
            if (!empty($line) && $line !== 'All') { $partCond[] = "l.production_line = ?"; $partParams[] = $line; }
            if (!empty($model) && $model !== 'All') { $partCond[] = "r.model = ?"; $partParams[] = $model; }
            if (!empty($machine) && $machine !== 'All') { $partCond[] = "t.machine_id = ?"; $partParams[] = $machine; }
            if (!empty($team) && $team !== 'All') { 
                $partCond[] = "(u.team_group = ? OR t.notes LIKE ?)"; 
                $partParams[] = $team; 
                $partParams[] = '%[[]TEAM_OVERRIDE: ' . $team . ']%'; 
            }
            $partWhere = "WHERE " . implode(" AND ", $partCond);

            $scrapSql = "
                SELECT i.sap_no, SUM(t.quantity) as scrap_qty
                FROM " . TRANSACTIONS_TABLE . " t WITH (NOLOCK)
                JOIN " . ITEMS_TABLE . " i WITH (NOLOCK) ON t.parameter_id = i.item_id
                LEFT JOIN " . LOCATIONS_TABLE . " l WITH (NOLOCK) ON t.to_location_id = l.location_id
                LEFT JOIN " . ROUTES_TABLE . " r WITH (NOLOCK) ON t.parameter_id = r.item_id AND l.production_line = r.line
                LEFT JOIN " . USERS_TABLE . " u WITH (NOLOCK) ON t.created_by_user_id = u.id
                {$partWhere}
                GROUP BY i.sap_no
            ";
            $scrapStmt = $pdo->prepare($scrapSql);
            $scrapStmt->execute($partParams);
            $scrapItems = $scrapStmt->fetchAll(PDO::FETCH_ASSOC);

            if (count($scrapItems) > 0) {
                require_once __DIR__ . '/../../sap_db.php';
                foreach ($scrapItems as $sItem) {
                    $matNo = trim($sItem['sap_no']);
                    $sq = (float)$sItem['scrap_qty'];
                    if (empty($matNo) || $sq <= 0) continue;
                    
                    $sapPriceStmt = $pdo_sap->prepare("SELECT TOP 1 STD_Cost FROM View_OperationSlip_1820 WHERE Mat_No = ? AND STD_Cost > 0");
                    $sapPriceStmt->execute([$matNo]);
                    $stdCost = (float)$sapPriceStmt->fetchColumn();
                    $sapScrapCost += ($sq * $stdCost);
                }
            }

            $response['data'] = [
                "quality" => round((float)($res['Quality'] ?? 0), 1),
                "availability" => round((float)($res['Availability'] ?? 0), 1),
                "performance" => round((float)($res['Performance'] ?? 0), 1),
                "oee" => round((float)($res['OEE'] ?? 0), 1),
                "fg" => (int)($res['FG'] ?? 0),
                "defects" => (int)($res['Defects'] ?? 0),
                "hold" => (int)($res['Hold'] ?? 0),
                "scrap" => (int)($res['Scrap'] ?? 0),
                "sap_scrap_cost" => $sapScrapCost,
                "runtime" => (float)($res['Runtime'] ?? 0),
                "planned_time" => (float)($res['PlannedTime'] ?? 0),
                "downtime" => (float)($res['Downtime'] ?? 0),
                "actual_output" => (int)($res['ActualOutput'] ?? 0),
                "total_theoretical_minutes" => round((float)($res['TotalTheoreticalMinutes'] ?? 0), 2),
                "TargetQty" => (float)($res['TargetQty'] ?? 0)
            ];
            $response['success'] = true;
            break;

        case 'getLineChart':
            $viewType = $_GET['viewType'] ?? 'daily';
            
            if ($viewType === 'daily') {
                $targetEndDate = $endDate;
                $targetStartDate = date('Y-m-d', strtotime($targetEndDate . ' -30 days'));
            } else {
                $targetStartDate = $startDate;
                $targetEndDate = $endDate;
            }

            $stmt = $pdo->prepare("EXEC dbo." . SP_CALC_OEE_LINE . " @StartDate = ?, @EndDate = ?, @Line = ?, @Model = ?, @MachineId = ?, @Team = ?");
            $stmt->execute([$targetStartDate, $targetEndDate, $line, $model, $machine, $team]);
            $records = $stmt->fetchAll(PDO::FETCH_ASSOC);
            foreach ($records as &$row) {
                if (isset($row['date'])) {
                    $row['date'] = (new DateTime($row['date']))->format('d-m-y');
                }
            }
            $response['data'] = $records;
            $response['success'] = true;
            break;

        case 'getHourlySparklines':
            $stmt = $pdo->prepare("EXEC dbo." . SP_CALC_OEE_HOURLY . " @TargetDate = ?, @Line = ?, @Model = ?, @MachineId = ?, @Team = ?");
            $stmt->execute([$endDate, $line, $model, $machine, $team]);
            $response['data'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $response['success'] = true;
            break;

        case 'getBarCharts':
            $actualStartDate = $startDate . ' 08:00:00';
            $actualEndDate = date('Y-m-d H:i:s', strtotime($endDate . ' +1 day 8 hours'));
            $stopCauseGroupBy = $_GET['stopCauseGroupBy'] ?? 'cause';

            // ============================================================================
            // --- Query 1: Downtime จากระบบแจ้งซ่อม PE (PE_WORK_ORDERS + PE_DOWNTIME_LOG) ---
            // ============================================================================
            $woCond = [
                "w.is_active = 1",
                "ISNULL(w.status, '') <> 'Cancelled'",
                "COALESCE(w.started_at, w.requested_at) >= ?",
                "COALESCE(w.started_at, w.requested_at) < ?",
                "NOT EXISTS (SELECT 1 FROM PE_DOWNTIME_LOG dl WITH (NOLOCK) WHERE dl.wo_id = w.wo_id)"
            ];
            $dtCond = [
                "COALESCE(d.start_time, CAST(d.log_date AS DATETIME)) >= ?",
                "COALESCE(d.start_time, CAST(d.log_date AS DATETIME)) < ?"
            ];
            $woParams = [$actualStartDate, $actualEndDate];
            $dtParams = [$actualStartDate, $actualEndDate];

            if ($line) {
                $woCond[] = "COALESCE(NULLIF(LTRIM(RTRIM(w.line)), ''), NULLIF(LTRIM(RTRIM(pm.line)), '')) = ?";
                $woParams[] = $line;
                $dtCond[] = "COALESCE(NULLIF(LTRIM(RTRIM(d.line)), ''), NULLIF(LTRIM(RTRIM(pm.line)), '')) = ?";
                $dtParams[] = $line;
            }
            if ($machine) {
                $woCond[] = "w.machine_id = ?";
                $woParams[] = (int)$machine;
                $dtCond[] = "d.machine_id = ?";
                $dtParams[] = (int)$machine;
            }

            $woWhere = implode(" AND ", $woCond);
            $dtWhere = implode(" AND ", $dtCond);
            $woGroupExpr = ($stopCauseGroupBy === 'line')
                ? "COALESCE(NULLIF(LTRIM(RTRIM(w.line)), ''), NULLIF(LTRIM(RTRIM(pm.line)), ''), 'Unspecified')"
                : "COALESCE(NULLIF(LTRIM(RTRIM(pm.machine_name)), ''), NULLIF(LTRIM(RTRIM(w.machine_name)), ''), 'Unspecified')";
            $dtGroupExpr = ($stopCauseGroupBy === 'line')
                ? "COALESCE(NULLIF(LTRIM(RTRIM(d.line)), ''), NULLIF(LTRIM(RTRIM(pm.line)), ''), 'Unspecified')"
                : "COALESCE(NULLIF(LTRIM(RTRIM(pm.machine_name)), ''), NULLIF(LTRIM(RTRIM(d.machine_name)), ''), NULLIF(LTRIM(RTRIM(d.cause_category)), ''), 'Unspecified')";

            $stopSql = "SELECT TOP 25 label, SUM(total_minutes) AS total_minutes
                        FROM (
                            SELECT
                                {$woGroupExpr} AS label,
                                CASE
                                    WHEN w.repair_minutes IS NOT NULL AND w.repair_minutes > 0 THEN w.repair_minutes
                                    WHEN w.completed_at IS NOT NULL THEN DATEDIFF(MINUTE, COALESCE(w.started_at, w.requested_at), w.completed_at)
                                    WHEN w.status = 'In Progress' THEN DATEDIFF(MINUTE, COALESCE(w.started_at, w.requested_at), CASE WHEN GETDATE() < ? THEN GETDATE() ELSE ? END)
                                    ELSE 0
                                END AS total_minutes
                            FROM PE_WORK_ORDERS w WITH (NOLOCK)
                            LEFT JOIN PE_MACHINES pm WITH (NOLOCK) ON w.machine_id = pm.machine_id
                            WHERE {$woWhere}

                            UNION ALL

                            SELECT
                                {$dtGroupExpr} AS label,
                                CASE
                                    WHEN d.duration_min IS NOT NULL AND d.duration_min > 0 THEN d.duration_min
                                    WHEN d.end_time IS NOT NULL AND d.start_time IS NOT NULL THEN DATEDIFF(MINUTE, d.start_time, d.end_time)
                                    ELSE 0
                                END AS total_minutes
                            FROM PE_DOWNTIME_LOG d WITH (NOLOCK)
                            LEFT JOIN PE_MACHINES pm WITH (NOLOCK) ON d.machine_id = pm.machine_id
                            WHERE {$dtWhere}
                        ) combined
                        WHERE total_minutes > 0
                        GROUP BY label
                        ORDER BY total_minutes DESC";

            $stopParams = array_merge([$actualEndDate, $actualEndDate], $woParams, $dtParams);
            $stmt = $pdo->prepare($stopSql);
            $stmt->execute($stopParams);
            $stopResults = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // ============================================================================
            // --- Query 2: Parts Production ---
            // ============================================================================
            $partCond = ["t.transaction_timestamp >= ?", "t.transaction_timestamp < ?"];
            
            $partParams = [];
            $modelFilter = "";
            if ($model) { 
                $modelFilter = "AND r2.model = ?"; 
                $partParams[] = $model; 
            }
            $partParams[] = $actualStartDate;
            $partParams[] = $actualEndDate;
            
            // บังคับให้ดึงเฉพาะ Transaction การผลิต
            $partCond[] = "t.transaction_type LIKE 'PRODUCTION_%'";

            if ($line) { $partCond[] = "l.production_line = ?"; $partParams[] = $line; }
            if ($model) { $partCond[] = "r.model IS NOT NULL"; }
            if ($machine) { $partCond[] = "t.machine_id = ?"; $partParams[] = $machine; }
            if ($team) { 
                $partCond[] = "(u.team_group = ? OR t.notes LIKE ?)"; 
                $partParams[] = $team; 
                $partParams[] = '%[[]TEAM_OVERRIDE: ' . $team . ']%'; 
            }
            $partWhere = "WHERE " . implode(" AND ", $partCond);

            $partSql = "SELECT 
                            i.part_no, 
                            ISNULL(l.production_line, 'N/A') as production_line, 
                            ISNULL(r.model, 'N/A') as model,
                            CAST(SUM(CASE WHEN t.transaction_type = 'PRODUCTION_FG' THEN t.quantity ELSE 0 END) AS INT) as FG,
                            CAST(SUM(CASE WHEN t.transaction_type = 'PRODUCTION_HOLD' THEN t.quantity ELSE 0 END) AS INT) as HOLD,
                            CAST(SUM(CASE WHEN t.transaction_type = 'PRODUCTION_SCRAP' THEN t.quantity ELSE 0 END) AS INT) as SCRAP
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
                        {$partWhere} 
                        AND t.quantity > 0
                        GROUP BY i.part_no, ISNULL(l.production_line, 'N/A'), ISNULL(r.model, 'N/A')
                        HAVING SUM(t.quantity) >= 0.01 
                        ORDER BY i.part_no, production_line, model ASC";
            
            $stmt = $pdo->prepare($partSql);
            $stmt->execute($partParams);
            
            $response['data'] = [
                "partResults" => $stmt->fetchAll(PDO::FETCH_ASSOC),
                "stopCause" => [
                    "labels" => array_column($stopResults, 'label'),
                    "datasets" => [["label" => "Downtime (min)", "data" => array_column($stopResults, 'total_minutes')]]
                ]
            ];
            $response['success'] = true;
            break;

        case 'getDailyProduction':
            $stmt = $pdo->prepare("EXEC dbo." . SP_GET_DAILY_PROD . " @StartDate=?, @EndDate=?, @Line=?, @Model=?, @MachineId=?, @Team=?");
            $stmt->execute([$startDate, $endDate, $line, $model, $machine, $team]);
            $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
            foreach ($results as &$r) {
                if (isset($r['TotalQuantity'])) $r['TotalQuantity'] = (float)$r['TotalQuantity'];
                if (isset($r['ProductionDate'])) $r['ProductionDate'] = (new DateTime($r['ProductionDate']))->format('Y-m-d');
            }
            $response['data'] = $results;
            $response['success'] = true;
            break;

        case 'getCostSummary':
            $stmtStd = $pdo->prepare("EXEC dbo." . SP_CALC_STD_COST . " @StartDate=:sd, @EndDate=:ed, @Line=:ln, @Model=:md, @Team=:tm");
            $stmtStd->bindValue(':sd', $startDate);
            $stmtStd->bindValue(':ed', $endDate);
            $stmtStd->bindValue(':ln', empty($line) ? null : $line, PDO::PARAM_STR);
            $stmtStd->bindValue(':md', empty($model) ? null : $model, PDO::PARAM_STR);
            $stmtStd->bindValue(':tm', empty($team) ? null : $team, PDO::PARAM_STR);
            $stmtStd->execute();
            $stdRes = $stmtStd->fetch(PDO::FETCH_ASSOC);
            
            if ($stdRes) {
                $actualStartDate = $startDate . ' 08:00:00';
                $actualEndDate = date('Y-m-d H:i:s', strtotime($endDate . ' +1 day 8 hours'));
                
                $partCond = ["t.transaction_timestamp >= ?", "t.transaction_timestamp < ?", "t.transaction_type LIKE 'PRODUCTION_%'"];
                $partParams = [$actualStartDate, $actualEndDate];
                
                if (!empty($line) && $line !== 'All') { $partCond[] = "l.production_line = ?"; $partParams[] = $line; }
                if (!empty($model) && $model !== 'All') { $partCond[] = "r.model = ?"; $partParams[] = $model; }
                if (!empty($machine) && $machine !== 'All') { $partCond[] = "t.machine_id = ?"; $partParams[] = $machine; }
                if (!empty($team) && $team !== 'All') { 
                    $partCond[] = "(u.team_group = ? OR t.notes LIKE ?)"; 
                    $partParams[] = $team; 
                    $partParams[] = '%[[]TEAM_OVERRIDE: ' . $team . ']%'; 
                }
                $partWhere = "WHERE " . implode(" AND ", $partCond);

                $qtySql = "
                    SELECT 
                        SUM(CASE WHEN t.transaction_type = 'PRODUCTION_FG' THEN t.quantity ELSE 0 END) as FG,
                        SUM(CASE WHEN t.transaction_type = 'PRODUCTION_SCRAP' THEN t.quantity ELSE 0 END) as Scrap
                    FROM " . TRANSACTIONS_TABLE . " t WITH (NOLOCK)
                    LEFT JOIN " . LOCATIONS_TABLE . " l WITH (NOLOCK) ON t.to_location_id = l.location_id
                    LEFT JOIN " . ROUTES_TABLE . " r WITH (NOLOCK) ON t.parameter_id = r.item_id AND l.production_line = r.line
                    LEFT JOIN " . USERS_TABLE . " u WITH (NOLOCK) ON t.created_by_user_id = u.id
                    {$partWhere}
                ";
                $qtyStmt = $pdo->prepare($qtySql);
                $qtyStmt->execute($partParams);
                $qtyData = $qtyStmt->fetch(PDO::FETCH_ASSOC);
                
                $totalFG = (float)($qtyData['FG'] ?? 0);
                $scrapQty = (float)($qtyData['Scrap'] ?? 0);

                foreach ($stdRes as $k => $v) {
                    if (is_numeric($v)) $stdRes[$k] = (float)$v;
                }
                
                // Preserve Standard Direct Labor Cost from BOM Snapshot
                $stdDLCost = (float)($stdRes['TotalDLCost'] ?? 0);
                $stdRes['TotalStdDLCost'] = $stdDLCost;

                // Fetch actual labor cost from fn_GetManpowerSummary_V2 via SP_CALC_ACTUAL_COST
                $stmtAct = $pdo->prepare("EXEC dbo." . SP_CALC_ACTUAL_COST . " @StartDate=:sd, @EndDate=:ed, @Line=:ln, @Team=:tm");
                $stmtAct->bindValue(':sd', $startDate);
                $stmtAct->bindValue(':ed', $endDate);
                $stmtAct->bindValue(':ln', empty($line) ? null : $line, PDO::PARAM_STR);
                $stmtAct->bindValue(':tm', empty($team) ? null : $team, PDO::PARAM_STR);
                $stmtAct->execute();
                $actRes = $stmtAct->fetch(PDO::FETCH_ASSOC);

                $actualDL = (float)($actRes['TotalActualDL'] ?? 0);
                $actualOT = (float)($actRes['TotalActualOT'] ?? 0);
                $actualDLOT = (float)($actRes['TotalActualDLOT'] ?? 0);
                $actualHeadcount = (int)($actRes['TotalHeadcount'] ?? 0);

                $stdRes['TotalActualDL'] = $actualDL;
                $stdRes['TotalActualOT'] = $actualOT;
                $stdRes['TotalActualDLOT'] = $actualDLOT;
                $stdRes['TotalActualHeadcount'] = $actualHeadcount;
                $stdRes['DailyActualDL'] = (float)($actRes['DailyActualDL'] ?? 0);
                $stdRes['MonthlyActualDL'] = (float)($actRes['MonthlyActualDL'] ?? 0);

                $rev = (float)($stdRes['TotalStdRevenue'] ?? 0);
                $matCost = (float)($stdRes['TotalMatCost'] ?? 0);
                $ohCost = (float)($stdRes['TotalOHCost'] ?? 0);

                // Scenario 1: Standard BOM View
                $stdTotalCost = $matCost + $stdDLCost + $ohCost;
                $stdGP = $rev - $stdTotalCost;
                $stdPercentGP = ($rev > 0) ? ($stdGP / $rev) * 100 : 0;
                $stdLaborEfficiency = ($stdDLCost > 0) ? ($rev / $stdDLCost) : 0;
                $stdCostPerUnit = ($totalFG > 0) ? ($stdTotalCost / $totalFG) : 0;

                // Scenario 2: Actual Cost View (Default, matches Manpower & Morning Brief)
                $actualTotalCost = $matCost + $actualDLOT + $ohCost;
                $actualGP = $rev - $actualTotalCost;
                $actualPercentGP = ($rev > 0) ? ($actualGP / $rev) * 100 : 0;
                $actualLaborEfficiency = ($actualDLOT > 0) ? ($rev / $actualDLOT) : 0;
                $actualCostPerUnit = ($totalFG > 0) ? ($actualTotalCost / $totalFG) : 0;

                // Dual view metrics dictionary for instantaneous client-side toggling
                $stdRes['dualViews'] = [
                    'actual' => [
                        'laborCost' => $actualDLOT,
                        'totalDL' => $actualDL,
                        'totalOT' => $actualOT,
                        'headcount' => $actualHeadcount,
                        'totalCost' => $actualTotalCost,
                        'grossProfit' => $actualGP,
                        'percentGP' => $actualPercentGP,
                        'laborEfficiency' => $actualLaborEfficiency,
                        'costPerUnit' => $actualCostPerUnit,
                        'percentDL' => ($rev > 0) ? ($actualDLOT / $rev) * 100 : 0
                    ],
                    'bom' => [
                        'laborCost' => $stdDLCost,
                        'totalDL' => $stdDLCost,
                        'totalOT' => 0,
                        'headcount' => 0,
                        'totalCost' => $stdTotalCost,
                        'grossProfit' => $stdGP,
                        'percentGP' => $stdPercentGP,
                        'laborEfficiency' => $stdLaborEfficiency,
                        'costPerUnit' => $stdCostPerUnit,
                        'percentDL' => ($rev > 0) ? ($stdDLCost / $rev) * 100 : 0
                    ]
                ];

                $stdRes['laborView'] = $laborView;
                $isActual = ($laborView !== 'bom' && $laborView !== 'std');
                $stdRes['isActualDLCost'] = $isActual;

                if ($isActual) {
                    $stdRes['TotalDLCost'] = $actualDLOT;
                    $stdRes['TotalStdCost'] = $actualTotalCost;
                    $stdRes['PercentGPStd'] = $actualPercentGP;
                    $stdRes['LaborEfficiency'] = $actualLaborEfficiency;
                    $stdRes['CostPerUnit'] = $actualCostPerUnit;
                    $stdRes['PercentDL'] = ($rev > 0) ? ($actualDLOT / $rev) * 100 : 0;
                } else {
                    $stdRes['TotalDLCost'] = $stdDLCost;
                    $stdRes['TotalStdCost'] = $stdTotalCost;
                    $stdRes['PercentGPStd'] = $stdPercentGP;
                    $stdRes['LaborEfficiency'] = $stdLaborEfficiency;
                    $stdRes['CostPerUnit'] = $stdCostPerUnit;
                    $stdRes['PercentDL'] = ($rev > 0) ? ($stdDLCost / $rev) * 100 : 0;
                }

                $stdRes['PercentOH'] = ($rev > 0) ? ($ohCost / $rev) * 100 : 0;
                $matCostPerUnit = ($totalFG > 0) ? ($matCost / $totalFG) : 0;
                $stdRes['ScrapCostValue'] = $scrapQty * $matCostPerUnit;
                
                $response['data'] = $stdRes;
                $response['success'] = true;
            } else {
                $response['success'] = true;
                $response['message'] = 'No production data found.';
                $response['data'] = [
                    "TotalMatCost"=>0, "TotalDLCost"=>0, "TotalOHCost"=>0, "TotalStdCost"=>0, 
                    "TotalStdRevenue"=>0, "PercentRM"=>0, "PercentDL"=>0, "PercentOH"=>0, "PercentGPStd"=>0, 
                    "isActualDLCost"=>false, "CostPerUnit"=>0, "ScrapCostValue"=>0, "LaborEfficiency"=>0,
                    "TotalStdDLCost"=>0, "TotalActualDL"=>0, "TotalActualOT"=>0, "TotalActualDLOT"=>0
                ];
            }
            break;

        default:
            throw new Exception("Invalid action provided.");
    }
} catch (Exception $e) {
    error_log("OEE Dashboard API Error: " . $e->getMessage());
    $response['success'] = false;
    $response['message'] = 'Server Error: ' . $e->getMessage();
}

echo json_encode($response);
exit;
?>