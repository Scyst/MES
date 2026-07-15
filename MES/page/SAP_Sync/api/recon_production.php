<?php
// e:/MES/MES/MES/page/SAP_Sync/api/recon_production.php
require_once __DIR__ . '/../../db.php'; // MES DB
require_once __DIR__ . '/../../sap_db.php'; // SAP DB
require_once __DIR__ . '/../../components/init.php';

header('Content-Type: application/json; charset=utf-8');

try {
    // 1. Fetch SAP Operation Slips
    $sapQuery = "SELECT Order_ID, Mat_No, TargetQty, CONFIRMYIELD FROM View_OperationSlip_1820";
    $sapStmt = $sapPdo->query($sapQuery);
    $sapOpsRaw = $sapStmt->fetchAll(PDO::FETCH_ASSOC);
    
    $sapOps = [];
    foreach ($sapOpsRaw as $row) {
        $orderId = trim($row['Order_ID']);
        $sapOps[$orderId] = [
            'Mat_No' => trim($row['Mat_No']),
            'TargetQty' => (float)$row['TargetQty'],
            'CONFIRMYIELD' => (float)$row['CONFIRMYIELD']
        ];
    }

    // 2. Fetch MES Production Jobs
    $mesQuery = "
        SELECT 
            j.job_no,
            i.sap_no,
            j.target_qty,
            ISNULL(j.actual_qty, 0) as MES_Actual_Qty,
            j.status
        FROM dbo.PRODUCTION_JOBS j
        JOIN dbo.ITEMS i ON j.item_id = i.id
        WHERE j.job_no IS NOT NULL AND j.job_no != ''
    ";
    $mesStmt = $pdo->query($mesQuery);
    $mesJobsRaw = $mesStmt->fetchAll(PDO::FETCH_ASSOC);

    $reconciliation = [];
    
    foreach ($mesJobsRaw as $row) {
        $jobNo = trim($row['job_no']);
        
        // Match with SAP Order_ID
        if (isset($sapOps[$jobNo])) {
            $sapData = $sapOps[$jobNo];
            
            $mesActual = (float)$row['MES_Actual_Qty'];
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
                    'Order_ID' => $jobNo,
                    'Mat_No' => $sapData['Mat_No'],
                    'MES_Target_Qty' => (float)$row['target_qty'],
                    'SAP_Target_Qty' => $sapData['TargetQty'],
                    'MES_Actual_Qty' => $mesActual,
                    'SAP_Confirm_Yield' => $sapConfirm,
                    'Diff' => $diff,
                    'Status' => $status,
                    'MES_Job_Status' => $row['status']
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
