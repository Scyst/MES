<?php
header('Content-Type: application/json; charset=utf-8');
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../utils/check_auth.php';
require_once __DIR__ . '/../../utils/logger.php';

// Hybrid Auth: checks granular permission or fallback to administrative roles
if (!hasPermission('manage_sap_sync') && !hasPermission('manage_system_settings') && !hasRole(['admin', 'creator', 'supervisor', 'manager'])) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Unauthorized Access.']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    if (empty($_SERVER['HTTP_X_CSRF_TOKEN']) || empty($_SESSION['csrf_token']) || !hash_equals($_SESSION['csrf_token'], $_SERVER['HTTP_X_CSRF_TOKEN'])) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'CSRF token validation failed.']);
        exit;
    }
}

$action = $_POST['action'] ?? $_GET['action'] ?? '';

try {
    switch ($action) {
        case 'read':
        case 'get_valuation':
            // 1. Get latest sync date from staging table
            $lastSyncStmt = $pdo->query("SELECT MAX(Logdate) as last_synced FROM SAP_STG_ALL_STOCK WITH (NOLOCK)");
            $lastSynced = $lastSyncStmt->fetchColumn();
            if ($lastSynced) {
                $lastSyncedFormatted = date('d/m/Y H:i', strtotime($lastSynced));
            } else {
                $lastSyncedFormatted = date('d/m/Y H:i');
            }

            // 2. Query staging tables synced from SAP joined with MES Items
            $sql = "
                SELECT 
                    s.Mat_No,
                    s.MatDesc,
                    s.Storage_Location,
                    s.Quantity,
                    s.Unit,
                    ISNULL(o.STD_Cost, 0) AS SAP_Cost,
                    (s.Quantity * ISNULL(o.STD_Cost, 0)) AS SAP_Value,
                    ISNULL(i.Cost_Total, 0) AS MES_Cost,
                    (s.Quantity * ISNULL(i.Cost_Total, 0)) AS MES_Value,
                    ISNULL(i.material_type, 'UNREGISTERED') AS MES_Category,
                    i.part_no,
                    i.item_id
                FROM SAP_STG_ALL_STOCK s WITH (NOLOCK)
                LEFT JOIN (
                    -- Get the latest STD_Cost for each Material from Operation Slip
                    SELECT Mat_No, STD_Cost,
                           ROW_NUMBER() OVER(PARTITION BY Mat_No ORDER BY LogDate DESC) as rn
                    FROM SAP_STG_OPERATION_SLIP WITH (NOLOCK)
                    WHERE STD_Cost > 0
                ) o ON o.Mat_No = s.Mat_No AND o.rn = 1
                LEFT JOIN " . ITEMS_TABLE . " i WITH (NOLOCK) ON i.sap_no = s.Mat_No COLLATE database_default
                WHERE s.Mat_No IS NOT NULL AND s.Mat_No != ''
                ORDER BY s.Mat_No ASC
            ";
            
            $stmt = $pdo->query($sql);
            $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $summaryGroups = [
                'RM' => ['qty' => 0, 'sap_value' => 0, 'mes_value' => 0, 'variance' => 0, 'items_count' => 0],
                'PKG' => ['qty' => 0, 'sap_value' => 0, 'mes_value' => 0, 'variance' => 0, 'items_count' => 0],
                'WIP' => ['qty' => 0, 'sap_value' => 0, 'mes_value' => 0, 'variance' => 0, 'items_count' => 0],
                'FG' => ['qty' => 0, 'sap_value' => 0, 'mes_value' => 0, 'variance' => 0, 'items_count' => 0],
                'OTHER' => ['qty' => 0, 'sap_value' => 0, 'mes_value' => 0, 'variance' => 0, 'items_count' => 0],
            ];
            
            $totalSapVal = 0;
            $totalMesVal = 0;
            $totalQty = 0;
            $processedItems = [];
            $mismatchCount = 0;
            
            foreach ($items as $row) {
                $matNo = trim((string)$row['Mat_No']);
                $matDesc = trim((string)$row['MatDesc']);
                $prefix = substr($matNo, 0, 2);
                $qty = (float)$row['Quantity'];
                $sapCost = (float)$row['SAP_Cost'];
                $mesCost = (float)$row['MES_Cost'];
                $sapValue = (float)$row['SAP_Value'];
                $mesValue = (float)$row['MES_Value'];
                $mesCategory = trim((string)$row['MES_Category']);
                
                // Group identification
                $categoryGroup = 'OTHER';
                if ($prefix === '10') {
                    $categoryGroup = 'RM';
                } else if ($prefix === '20') {
                    $categoryGroup = 'PKG';
                } else if ($prefix === '30') {
                    $categoryGroup = 'WIP';
                } else if ($prefix === '40') {
                    $categoryGroup = 'FG';
                }
                
                // Health status determination
                $variance = round($sapValue - $mesValue, 2);
                $costDiff = abs($sapCost - $mesCost);
                
                if ($mesCategory === 'UNREGISTERED') {
                    $healthStatus = 'UNREGISTERED';
                    $mismatchCount++;
                } else if ($sapCost <= 0) {
                    $healthStatus = 'MISSING_SAP';
                    $mismatchCount++;
                } else if ($mesCost <= 0) {
                    $healthStatus = 'MISSING_MES';
                    $mismatchCount++;
                } else if ($costDiff > 0.001) {
                    $healthStatus = 'VARIANCE';
                    $mismatchCount++;
                } else {
                    $healthStatus = 'MATCH';
                }
                
                // Summary accumulation
                $summaryGroups[$categoryGroup]['qty'] += $qty;
                $summaryGroups[$categoryGroup]['sap_value'] += $sapValue;
                $summaryGroups[$categoryGroup]['mes_value'] += $mesValue;
                $summaryGroups[$categoryGroup]['variance'] += $variance;
                $summaryGroups[$categoryGroup]['items_count']++;
                
                $totalSapVal += $sapValue;
                $totalMesVal += $mesValue;
                $totalQty += $qty;
                
                $processedItem = [
                    // Standard keys expected by React SapValuationTab
                    'sap_no' => $matNo,
                    'description' => $matDesc,
                    'part_no' => $row['part_no'] ?: $matNo,
                    'item_id' => $row['item_id'],
                    'category_group' => $categoryGroup,
                    'storage_location' => $row['Storage_Location'],
                    'staging_stock' => $qty,
                    'unit' => $row['Unit'],
                    'sap_unit_cost' => $sapCost,
                    'mes_unit_cost' => $mesCost,
                    'sap_total_value' => $sapValue,
                    'mes_total_value' => $mesValue,
                    'variance' => $variance,
                    'health_status' => $healthStatus,
                    
                    // Legacy SQL keys for backward compatibility
                    'Mat_No' => $matNo,
                    'MatDesc' => $matDesc,
                    'Storage_Location' => $row['Storage_Location'],
                    'Quantity' => $qty,
                    'Unit' => $row['Unit'],
                    'SAP_Cost' => $sapCost,
                    'SAP_Value' => $sapValue,
                    'MES_Cost' => $mesCost,
                    'MES_Value' => $mesValue,
                    'MES_Category' => $mesCategory,
                    'Category' => $categoryGroup,
                    'Effective_Value' => ($sapCost > 0 ? $sapCost : $mesCost) * $qty
                ];
                
                $processedItems[] = $processedItem;
            }
            
            $overallVariance = round($totalSapVal - $totalMesVal, 2);
            $variancePct = $totalMesVal > 0 ? round(($overallVariance / $totalMesVal) * 100, 2) : 0;
            
            $summary = [
                'total_sap_value' => round($totalSapVal, 2),
                'total_mes_value' => round($totalMesVal, 2),
                'variance' => $overallVariance,
                'variance_pct' => $variancePct,
                'total_items' => count($processedItems),
                'total_qty' => $totalQty,
                'sync_required_count' => $mismatchCount,
                'groups' => $summaryGroups,
                // Legacy compatibility keys
                'RM' => ['qty' => $summaryGroups['RM']['qty'], 'value' => $summaryGroups['RM']['sap_value']],
                'PKG' => ['qty' => $summaryGroups['PKG']['qty'], 'value' => $summaryGroups['PKG']['sap_value']],
                'WIP' => ['qty' => $summaryGroups['WIP']['qty'], 'value' => $summaryGroups['WIP']['sap_value']],
                'FG' => ['qty' => $summaryGroups['FG']['qty'], 'value' => $summaryGroups['FG']['sap_value']],
            ];
            
            $categories = [
                ['key' => 'RM', 'label' => 'Raw Material (10-xx)', 'count' => $summaryGroups['RM']['items_count'], 'sap_value' => $summaryGroups['RM']['sap_value'], 'mes_value' => $summaryGroups['RM']['mes_value'], 'variance' => $summaryGroups['RM']['variance']],
                ['key' => 'PKG', 'label' => 'Packaging (20-xx)', 'count' => $summaryGroups['PKG']['items_count'], 'sap_value' => $summaryGroups['PKG']['sap_value'], 'mes_value' => $summaryGroups['PKG']['mes_value'], 'variance' => $summaryGroups['PKG']['variance']],
                ['key' => 'WIP', 'label' => 'Work in Process (30-xx)', 'count' => $summaryGroups['WIP']['items_count'], 'sap_value' => $summaryGroups['WIP']['sap_value'], 'mes_value' => $summaryGroups['WIP']['mes_value'], 'variance' => $summaryGroups['WIP']['variance']],
                ['key' => 'FG', 'label' => 'Finished Goods (40-xx)', 'count' => $summaryGroups['FG']['items_count'], 'sap_value' => $summaryGroups['FG']['sap_value'], 'mes_value' => $summaryGroups['FG']['mes_value'], 'variance' => $summaryGroups['FG']['variance']],
            ];

            $responsePayload = [
                'success' => true,
                'data' => [
                    'summary' => $summary,
                    'categories' => $categories,
                    'items' => $processedItems,
                    'last_synced' => $lastSynced,
                    'last_synced_formatted' => $lastSyncedFormatted,
                    'total_rows' => count($processedItems)
                ],
                'summary' => $summary,
                'categories' => $categories,
                'items' => $processedItems,
                'last_synced' => $lastSynced,
                'last_synced_formatted' => $lastSyncedFormatted,
                'total_rows' => count($processedItems)
            ];

            echo json_encode($responsePayload);
            break;

        case 'sync':
        case 'sync_costs':
            $input = json_decode(file_get_contents('php://input'), true);
            $sap_nos = $input['sap_nos'] ?? [];
            if (!is_array($sap_nos) || empty($sap_nos)) {
                // If empty array, sync all items that have a cost in SAP Staging
                $sql = "
                    UPDATE i
                    SET i.Cost_Total = o.STD_Cost,
                        i.updated_at = GETDATE()
                    FROM " . ITEMS_TABLE . " i
                    INNER JOIN (
                        SELECT Mat_No, STD_Cost,
                               ROW_NUMBER() OVER(PARTITION BY Mat_No ORDER BY LogDate DESC) as rn
                        FROM SAP_STG_OPERATION_SLIP WITH (NOLOCK)
                        WHERE STD_Cost > 0
                    ) o ON o.Mat_No = i.sap_no COLLATE database_default AND o.rn = 1
                ";
                $stmt = $pdo->prepare($sql);
                $stmt->execute();
                $count = $stmt->rowCount();
            } else {
                $placeholders = implode(',', array_fill(0, count($sap_nos), '?'));
                $sql = "
                    UPDATE i
                    SET i.Cost_Total = o.STD_Cost,
                        i.updated_at = GETDATE()
                    FROM " . ITEMS_TABLE . " i
                    INNER JOIN (
                        SELECT Mat_No, STD_Cost,
                               ROW_NUMBER() OVER(PARTITION BY Mat_No ORDER BY LogDate DESC) as rn
                        FROM SAP_STG_OPERATION_SLIP WITH (NOLOCK)
                        WHERE STD_Cost > 0
                    ) o ON o.Mat_No = i.sap_no COLLATE database_default AND o.rn = 1
                    WHERE i.sap_no COLLATE database_default IN ($placeholders)
                ";
                $stmt = $pdo->prepare($sql);
                $stmt->execute($sap_nos);
                $count = $stmt->rowCount();
            }
            
            writeLog($pdo, 'SYNC_SAP_COSTS', 'SYSTEM_SETTINGS', 0, null, ['count' => $count], "Synced costs for {$count} items");
            echo json_encode(['success' => true, 'message' => "Successfully synced costs for $count items."]);
            break;
            
        default:
            echo json_encode(['success' => false, 'message' => 'Invalid action requested']);
            break;
    }
} catch (Throwable $e) {
    handleApiError($e, $pdo ?? null, $_REQUEST);
}
?>
