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
        case 'get_valuation':
            // Query staging tables synced from SAP to avoid long queries on the linked server.
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
                    ISNULL(i.material_type, 'UNREGISTERED') AS MES_Category
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
            ";
            
            $stmt = $pdo->query($sql);
            $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $summary = [
                'RM' => ['qty' => 0, 'value' => 0],
                'PKG' => ['qty' => 0, 'value' => 0],
                'WIP' => ['qty' => 0, 'value' => 0],
                'FG' => ['qty' => 0, 'value' => 0],
            ];
            
            $processedItems = [];
            
            foreach ($items as $row) {
                $matNo = $row['Mat_No'];
                $prefix = substr($matNo, 0, 2);
                $qty = (float)$row['Quantity'];
                
                $sapCost = (float)$row['SAP_Cost'];
                $mesCost = (float)$row['MES_Cost'];
                
                // Use SAP cost if available, otherwise fallback to MES cost for summary
                $effectiveCost = $sapCost > 0 ? $sapCost : $mesCost;
                $effectiveValue = $qty * $effectiveCost;
                
                if ($prefix === '10') {
                    $summary['RM']['qty'] += $qty;
                    $summary['RM']['value'] += $effectiveValue;
                } else if ($prefix === '20') {
                    $summary['PKG']['qty'] += $qty;
                    $summary['PKG']['value'] += $effectiveValue;
                } else if ($prefix === '30') {
                    $summary['WIP']['qty'] += $qty;
                    $summary['WIP']['value'] += $effectiveValue;
                } else if ($prefix === '40') {
                    $summary['FG']['qty'] += $qty;
                    $summary['FG']['value'] += $effectiveValue;
                }
                
                $row['Category'] = $prefix === '10' ? 'RM' : ($prefix === '20' ? 'PKG' : ($prefix === '30' ? 'WIP' : ($prefix === '40' ? 'FG' : 'OTHER')));
                $row['Effective_Value'] = $effectiveValue;
                $processedItems[] = $row;
            }
            
            echo json_encode([
                'success' => true,
                'summary' => $summary,
                'items' => $processedItems
            ]);
            break;

        case 'sync_costs':
            $input = json_decode(file_get_contents('php://input'), true);
            $sap_nos = $input['sap_nos'] ?? [];
            if (!is_array($sap_nos) || empty($sap_nos)) {
                echo json_encode(['success' => false, 'message' => 'No SAP numbers provided']);
                break;
            }
            
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

