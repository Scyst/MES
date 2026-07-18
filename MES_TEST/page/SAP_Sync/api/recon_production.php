<?php
// e:/MES/MES/MES/page/SAP_Sync/api/recon_production.php
require_once __DIR__ . '/../../db.php'; // MES DB
require_once __DIR__ . '/../../sap_db.php'; // SAP DB
require_once __DIR__ . '/../../components/init.php';

header('Content-Type: application/json; charset=utf-8');

try {
    // 1. Fetch SAP Operation Slips (Grouped by Mat_No)
    $sapQuery = "SELECT Mat_No, SUM(TargetQty) as TotalTargetQty, SUM(CONFIRMYIELD) as TotalConfirmYield FROM View_OperationSlip_1820 GROUP BY Mat_No";
    $sapStmt = $pdo_sap->query($sapQuery);
    $sapOpsRaw = $sapStmt->fetchAll(PDO::FETCH_ASSOC);
    
    $sapOps = [];
    foreach ($sapOpsRaw as $row) {
        $matNo = trim($row['Mat_No']);
        $sapOps[$matNo] = [
            'TargetQty' => (float)$row['TotalTargetQty'],
            'CONFIRMYIELD' => (float)$row['TotalConfirmYield']
        ];
    }

    // 2. Fetch MES Production Jobs (Grouped by sap_no)
    $mesQuery = "
        SELECT 
            i.sap_no,
            MAX(i.part_description) as part_description,
            SUM(j.target_qty) as MES_Total_Target,
            SUM(ISNULL(j.actual_qty, 0)) as MES_Total_Actual
        FROM dbo.PRODUCTION_JOBS j
        JOIN dbo.ITEMS i ON j.item_id = i.item_id
        WHERE i.sap_no IS NOT NULL AND i.sap_no != ''
        GROUP BY i.sap_no
    ";
    $mesStmt = $pdo->query($mesQuery);
    $mesJobsRaw = $mesStmt->fetchAll(PDO::FETCH_ASSOC);

    $reconciliation = [];
    
    foreach ($mesJobsRaw as $row) {
        $matNo = trim($row['sap_no']);
        
        // Match with SAP Mat_No
        if (isset($sapOps[$matNo])) {
            $sapData = $sapOps[$matNo];
            
            $mesActual = (float)$row['MES_Total_Actual'];
            $sapConfirm = $sapData['CONFIRMYIELD'];
            
            $diff = $mesActual - $sapConfirm;
            
            $status = 'MATCH';
            if ($diff > 0) {
                $status = 'UNCONFIRMED_YIELD'; // MES has more produced than SAP confirmed
            } elseif ($diff < 0) {
                $status = 'SAP_AHEAD'; // Rare: SAP has more than MES
            }

            if ($status !== 'MATCH' || isset($_GET['show_all'])) {
                $reconciliation[] = [
                    'Mat_No' => $matNo,
                    'Description' => $row['part_description'],
                    'MES_Target_Qty' => (float)$row['MES_Total_Target'],
                    'SAP_Target_Qty' => $sapData['TargetQty'],
                    'MES_Actual_Qty' => $mesActual,
                    'SAP_Confirm_Yield' => $sapConfirm,
                    'Diff' => $diff,
                    'Status' => $status
                ];
            }
        }
    }

    echo json_encode([
        'success' => true,
        'data' => $reconciliation,
        'count' => count($reconciliation)
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error: ' . $e->getMessage()
    ]);
}
