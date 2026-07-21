<?php
// e:\MES\MES\MES_TEST\page\systemSettings\api\cron_sync_sap_staging.php
// This script is meant to be run via Windows Task Scheduler or Cron Job periodically.
// It pulls data from SAP and stages it locally.

// Allow unlimited execution time for syncing
set_time_limit(0);
ini_set('memory_limit', '512M');

require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../sap_db.php';

header('Content-Type: application/json; charset=utf-8');

try {
    $startTime = microtime(true);
    
    // ========================================================
    // 1. SYNC SAP_STG_ALL_STOCK
    // ========================================================
    $pdo->exec("TRUNCATE TABLE SAP_STG_ALL_STOCK");
    
    $sapStockQuery = "SELECT Plant, Mat_No, MatDesc, Storage_Location, Batch, Quantity, Unit, Logdate FROM View_SAP_ALL_STOCK_1820 WHERE Mat_No IS NOT NULL AND Mat_No != ''";
    $sapStockStmt = $pdo_sap->query($sapStockQuery);
    
    $insertStockStmt = $pdo->prepare("INSERT INTO SAP_STG_ALL_STOCK (Plant, Mat_No, MatDesc, Storage_Location, Batch, Quantity, Unit, Logdate) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    
    $pdo->beginTransaction();
    $stockCount = 0;
    while ($row = $sapStockStmt->fetch(PDO::FETCH_ASSOC)) {
        $insertStockStmt->execute([
            $row['Plant'] ?? null,
            $row['Mat_No'] ?? null,
            $row['MatDesc'] ?? null,
            $row['Storage_Location'] ?? null,
            $row['Batch'] ?? null,
            $row['Quantity'] ?? 0,
            $row['Unit'] ?? null,
            $row['Logdate'] ?? null
        ]);
        $stockCount++;
    }
    $pdo->commit();

    // ========================================================
    // 2. SYNC SAP_STG_OPERATION_SLIP
    // ========================================================
    $pdo->exec("TRUNCATE TABLE SAP_STG_OPERATION_SLIP");
    
    $sapOpsQuery = "SELECT 
        Plant, Order_ID, Mat_No, MatDesc, BS_StartDate, BS_FinishDate, TargetQty, ScrapQty, Unit, 
        MRP_Controller, ProdSup, Opt_task_list_no, CounterNo, SequenceNo, TaskListNode, GrpRounting, 
        GrpCounter, Activity, OptShortText, ObjectID, WorkCenter, SetTime1, SetTime2, SetTime3, 
        Lot, PlanCT, PlanActualTime, PlanTargetDay, STD_Cost, Identify_Order_Seq_ACt, LogDate, 
        OperationQty, CONFIRMYIELD, CONFIRM_NG, Status_order 
        FROM View_OperationSlip_1820 WHERE Mat_No IS NOT NULL AND Mat_No != ''";
    $sapOpsStmt = $pdo_sap->query($sapOpsQuery);
    
    $insertOpsStmt = $pdo->prepare("INSERT INTO SAP_STG_OPERATION_SLIP (
        Plant, Order_ID, Mat_No, MatDesc, BS_StartDate, BS_FinishDate, TargetQty, ScrapQty, Unit, 
        MRP_Controller, ProdSup, Opt_task_list_no, CounterNo, SequenceNo, TaskListNode, GrpRounting, 
        GrpCounter, Activity, OptShortText, ObjectID, WorkCenter, SetTime1, SetTime2, SetTime3, 
        Lot, PlanCT, PlanActualTime, PlanTargetDay, STD_Cost, Identify_Order_Seq_ACt, LogDate, 
        OperationQty, CONFIRMYIELD, CONFIRM_NG, Status_order
    ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )");
    
    $pdo->beginTransaction();
    $opsCount = 0;
    while ($row = $sapOpsStmt->fetch(PDO::FETCH_ASSOC)) {
        $insertOpsStmt->execute([
            $row['Plant'] ?? null,
            $row['Order_ID'] ?? null,
            $row['Mat_No'] ?? null,
            $row['MatDesc'] ?? null,
            $row['BS_StartDate'] ?? null,
            $row['BS_FinishDate'] ?? null,
            $row['TargetQty'] ?? 0,
            $row['ScrapQty'] ?? 0,
            $row['Unit'] ?? null,
            $row['MRP_Controller'] ?? null,
            $row['ProdSup'] ?? null,
            $row['Opt_task_list_no'] ?? null,
            $row['CounterNo'] ?? null,
            $row['SequenceNo'] ?? null,
            $row['TaskListNode'] ?? null,
            $row['GrpRounting'] ?? null,
            $row['GrpCounter'] ?? null,
            $row['Activity'] ?? null,
            $row['OptShortText'] ?? null,
            $row['ObjectID'] ?? null,
            $row['WorkCenter'] ?? null,
            $row['SetTime1'] ?? 0,
            $row['SetTime2'] ?? 0,
            $row['SetTime3'] ?? 0,
            $row['Lot'] ?? 0,
            $row['PlanCT'] ?? 0,
            $row['PlanActualTime'] ?? 0,
            $row['PlanTargetDay'] ?? 0,
            $row['STD_Cost'] ?? 0,
            $row['Identify_Order_Seq_ACt'] ?? null,
            $row['LogDate'] ?? null,
            $row['OperationQty'] ?? 0,
            $row['CONFIRMYIELD'] ?? 0,
            $row['CONFIRM_NG'] ?? 0,
            $row['Status_order'] ?? null
        ]);
        $opsCount++;
    }
    $pdo->commit();
    
    $duration = round(microtime(true) - $startTime, 2);

    echo json_encode([
        'success' => true,
        'message' => 'Staging tables updated successfully.',
        'data' => [
            'stock_rows_synced' => $stockCount,
            'operation_rows_synced' => $opsCount,
            'duration_seconds' => $duration
        ]
    ]);

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Cron Sync Failed: ' . $e->getMessage()
    ]);
}
?>
