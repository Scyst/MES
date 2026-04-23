<?php
require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../../config/config.php';
header('Content-Type: application/json; charset=utf-8');

$response = ['success' => false, 'data' => null, 'message' => ''];
$action = $_GET['action'] ?? '';
$startDate = $_GET['startDate'] ?? date('Y-m-d');
$endDate = $_GET['endDate'] ?? date('Y-m-d');
$line = (!empty($_GET['line']) && $_GET['line'] !== 'All') ? $_GET['line'] : null;
$model = (!empty($_GET['model']) && $_GET['model'] !== 'All') ? $_GET['model'] : null;

try {
    switch ($action) {
        case 'getFilters':
            $lineSql = "SELECT DISTINCT RTRIM(LTRIM(line)) as line FROM " . ROUTES_TABLE . " WITH (NOLOCK) WHERE line IS NOT NULL AND line != '' ORDER BY line ASC";
            $lines = $pdo->query($lineSql)->fetchAll(PDO::FETCH_COLUMN);
            
            $modelSql = "SELECT DISTINCT RTRIM(LTRIM(model)) as model FROM " . ROUTES_TABLE . " WITH (NOLOCK) WHERE model IS NOT NULL AND model != '' ORDER BY model ASC";
            $models = $pdo->query($modelSql)->fetchAll(PDO::FETCH_COLUMN);
            
            $response['data'] = ['lines' => $lines, 'models' => $models];
            $response['success'] = true;
            break;

        case 'getPieChart':
            $stmt = $pdo->prepare("EXEC dbo." . SP_CALC_OEE_PIE . " @StartDate = ?, @EndDate = ?, @Line = ?, @Model = ?");
            $stmt->execute([$startDate, $endDate, $line, $model]);
            $res = $stmt->fetch(PDO::FETCH_ASSOC);
            
            $response['data'] = [
                "quality" => round((float)($res['Quality'] ?? 0), 1),
                "availability" => round((float)($res['Availability'] ?? 0), 1),
                "performance" => round((float)($res['Performance'] ?? 0), 1),
                "oee" => round((float)($res['OEE'] ?? 0), 1),
                "fg" => (int)($res['FG'] ?? 0),
                "defects" => (int)($res['Defects'] ?? 0),
                "hold" => (int)($res['Hold'] ?? 0),
                "scrap" => (int)($res['Scrap'] ?? 0),
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

            $stmt = $pdo->prepare("EXEC dbo." . SP_CALC_OEE_LINE . " @StartDate = ?, @EndDate = ?, @Line = ?, @Model = ?");
            $stmt->execute([$targetStartDate, $targetEndDate, $line, $model]);
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
            $stmt = $pdo->prepare("EXEC dbo." . SP_CALC_OEE_HOURLY . " @TargetDate = ?, @Line = ?, @Model = ?");
            $stmt->execute([$endDate, $line, $model]);
            $response['data'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $response['success'] = true;
            break;

        case 'getBarCharts':
            $actualStartDate = $startDate . ' 08:00:00';
            $actualEndDate = date('Y-m-d H:i:s', strtotime($endDate . ' +1 day 8 hours'));
            $stopCauseGroupBy = $_GET['stopCauseGroupBy'] ?? 'cause'; 
            
            // ============================================================================
            // --- Query 1: Downtime จากระบบแจ้งซ่อม (MAINTENANCE_REQUESTS) ---
            // ============================================================================
            $stopCond = ["m.request_date >= ?", "m.request_date < ?"];
            $stopParams = [$actualStartDate, $actualEndDate];
            
            // กรองตาม Line ถ้ามีการเลือก Filter
            if ($line) { 
                $stopCond[] = "m.line = ?"; 
                $stopParams[] = $line; 
            }
            
            $stopWhere = "WHERE " . implode(" AND ", $stopCond);
            
            // ถ้าเลือก By Cause ให้กรองตาม "เครื่องจักร (machine)", ถ้าเลือก By Line ให้กรองตาม "ไลน์ (line)"
            $colGroup = ($stopCauseGroupBy === 'line') ? 'm.line' : 'm.machine';
            
            // สูตรคำนวณ Downtime: 
            // 1. ใช้ actual_repair_minutes ถ้ามีค่า
            // 2. ถ้าไม่มี (NULL) ให้เอา resolved_at ลบด้วย request_date (แปลงเป็นนาที)
            // 3. ถ้ายังซ่อมไม่เสร็จ (resolved_at เป็น NULL) ให้ใช้เวลาปัจจุบัน GETDATE() แทน
            $stopSql = "SELECT ISNULL({$colGroup}, 'Unspecified') as label, 
                               SUM(ISNULL(m.actual_repair_minutes, DATEDIFF(MINUTE, m.request_date, ISNULL(m.resolved_at, GETDATE())))) as total_minutes 
                        FROM MAINTENANCE_REQUESTS m WITH (NOLOCK) 
                        {$stopWhere} 
                        GROUP BY ISNULL({$colGroup}, 'Unspecified') 
                        HAVING SUM(ISNULL(m.actual_repair_minutes, DATEDIFF(MINUTE, m.request_date, ISNULL(m.resolved_at, GETDATE())))) > 0
                        ORDER BY total_minutes DESC";
            
            $stmt = $pdo->prepare($stopSql);
            $stmt->execute($stopParams);
            $stopResults = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // ============================================================================
            // --- Query 2: Parts Production ---
            // ============================================================================
            $partCond = ["t.transaction_timestamp >= ?", "t.transaction_timestamp < ?"];
            $partParams = [$actualStartDate, $actualEndDate];
            
            // บังคับให้ดึงเฉพาะ Transaction การผลิต
            $partCond[] = "t.transaction_type LIKE 'PRODUCTION_%'";

            if ($line) { $partCond[] = "l.production_line = ?"; $partParams[] = $line; }
            if ($model) { $partCond[] = "r.model = ?"; $partParams[] = $model; }
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
                        LEFT JOIN " . ROUTES_TABLE . " r WITH (NOLOCK) ON t.parameter_id = r.item_id AND l.production_line = r.line
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
            $stmt = $pdo->prepare("EXEC dbo." . SP_GET_DAILY_PROD . " @StartDate=?, @EndDate=?, @Line=?, @Model=?");
            $stmt->execute([$startDate, $endDate, $line, $model]);
            $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
            foreach ($results as &$r) {
                if (isset($r['TotalQuantity'])) $r['TotalQuantity'] = (float)$r['TotalQuantity'];
                if (isset($r['ProductionDate'])) $r['ProductionDate'] = (new DateTime($r['ProductionDate']))->format('Y-m-d');
            }
            $response['data'] = $results;
            $response['success'] = true;
            break;

        case 'getCostSummary':
            $stmtStd = $pdo->prepare("EXEC dbo." . SP_CALC_STD_COST . " @StartDate=:sd, @EndDate=:ed, @Line=:ln, @Model=:md");
            $stmtStd->bindValue(':sd', $startDate);
            $stmtStd->bindValue(':ed', $endDate);
            $stmtStd->bindValue(':ln', empty($line) ? null : $line, PDO::PARAM_STR);
            $stmtStd->bindValue(':md', empty($model) ? null : $model, PDO::PARAM_STR);
            $stmtStd->execute();
            $stdRes = $stmtStd->fetch(PDO::FETCH_ASSOC);
            
            if ($stdRes) {
                $actualStartDate = $startDate . ' 08:00:00';
                $actualEndDate = date('Y-m-d H:i:s', strtotime($endDate . ' +1 day 8 hours'));
                
                $partCond = ["t.transaction_timestamp >= ?", "t.transaction_timestamp < ?", "t.transaction_type LIKE 'PRODUCTION_%'"];
                $partParams = [$actualStartDate, $actualEndDate];
                
                if (!empty($line) && $line !== 'All') { $partCond[] = "l.production_line = ?"; $partParams[] = $line; }
                if (!empty($model) && $model !== 'All') { $partCond[] = "r.model = ?"; $partParams[] = $model; }
                $partWhere = "WHERE " . implode(" AND ", $partCond);

                $qtySql = "
                    SELECT 
                        SUM(CASE WHEN t.transaction_type = 'PRODUCTION_FG' THEN t.quantity ELSE 0 END) as FG,
                        SUM(CASE WHEN t.transaction_type = 'PRODUCTION_SCRAP' THEN t.quantity ELSE 0 END) as Scrap
                    FROM " . TRANSACTIONS_TABLE . " t WITH (NOLOCK)
                    LEFT JOIN " . LOCATIONS_TABLE . " l WITH (NOLOCK) ON t.to_location_id = l.location_id
                    LEFT JOIN " . ROUTES_TABLE . " r WITH (NOLOCK) ON t.parameter_id = r.item_id AND l.production_line = r.line
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
                
                $stmtAct = $pdo->prepare("EXEC dbo." . SP_CALC_ACTUAL_COST . " @StartDate=:sd, @EndDate=:ed, @Line=:ln");
                $stmtAct->bindValue(':sd', $startDate);
                $stmtAct->bindValue(':ed', $endDate);
                
                if (empty($line) || $line === 'All' || strtoupper($line) === 'ASSEMBLY') {
                    $stmtAct->bindValue(':ln', null, PDO::PARAM_NULL);
                } else {
                    $stmtAct->bindValue(':ln', $line, PDO::PARAM_STR);
                }
                
                $stmtAct->execute();
                $actRes = $stmtAct->fetch(PDO::FETCH_ASSOC);

                $stdRes['isActualDLCost'] = false;
                if ($actRes && isset($actRes['TotalActualDLOT'])) {
                    $stdRes['TotalDLCost'] = (float)$actRes['TotalActualDLOT'];
                    $stdRes['TotalActualDL'] = (float)($actRes['TotalActualDL'] ?? 0);
                    $stdRes['TotalActualOT'] = (float)($actRes['TotalActualOT'] ?? 0);
                    $stdRes['isActualDLCost'] = true;
                    
                    $rev = $stdRes['TotalStdRevenue'] ?? 0;
                    $stdRes['PercentDL'] = ($rev > 0) ? ($stdRes['TotalDLCost'] / $rev) * 100 : 0;
                    $stdRes['PercentOH'] = ($rev > 0) ? (($stdRes['TotalOHCost'] ?? 0) / $rev) * 100 : 0;
                    
                    $stdRes['TotalStdCost'] = ($stdRes['TotalMatCost'] ?? 0) + $stdRes['TotalDLCost'] + ($stdRes['TotalOHCost'] ?? 0);
                    $stdRes['PercentGPStd'] = ($rev > 0) ? (($rev - $stdRes['TotalStdCost']) / $rev) * 100 : 0;
                    
                    $totalCost = $stdRes['TotalStdCost'];
                    $revenue = $stdRes['TotalStdRevenue'];
                    $laborCost = $stdRes['TotalDLCost'];
                    $stdRes['CostPerUnit'] = ($totalFG > 0) ? ($totalCost / $totalFG) : 0;
                    $matCostPerUnit = ($totalFG > 0) ? ($stdRes['TotalMatCost'] / $totalFG) : 0;
                    $stdRes['ScrapCostValue'] = $scrapQty * $matCostPerUnit;
                    $stdRes['LaborEfficiency'] = ($laborCost > 0) ? ($revenue / $laborCost) : 0;
                }
                
                $response['data'] = $stdRes;
                $response['success'] = true;
            } else {
                $response['success'] = true;
                $response['message'] = 'No production data found.';
                $response['data'] = [
                    "TotalMatCost"=>0, "TotalDLCost"=>0, "TotalOHCost"=>0, "TotalStdCost"=>0, 
                    "TotalStdRevenue"=>0, "PercentRM"=>0, "PercentDL"=>0, "PercentOH"=>0, "PercentGPStd"=>0, 
                    "isActualDLCost"=>false, "CostPerUnit"=>0, "ScrapCostValue"=>0, "LaborEfficiency"=>0
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