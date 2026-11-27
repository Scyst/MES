<?php
/**
 * Legacy SAP Staging Sync Endpoint (Hardened).
 * Security: Requires CLI execution, valid X-CRON-SECRET header, or authenticated admin session.
 */
set_time_limit(0);
ini_set('memory_limit', '512M');

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../sap_db.php';

// Authentication Guard
$isAuthorized = false;
if (PHP_SAPI === 'cli') {
    $isAuthorized = true;
} else {
    $expectedSecret = getenv('CRON_SYNC_SECRET') ?: '';
    $providedSecret = $_SERVER['HTTP_X_CRON_SECRET'] ?? '';
    if ($expectedSecret !== '' && $providedSecret !== '' && hash_equals($expectedSecret, $providedSecret)) {
        $isAuthorized = true;
    } else {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
        $role = $_SESSION['user']['role'] ?? '';
        if (in_array($role, ['admin', 'creator'], true)) {
            if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
                $headerToken = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
                $sessionToken = $_SESSION['csrf_token'] ?? '';
                if (empty($headerToken) || empty($sessionToken) || !hash_equals($sessionToken, $headerToken)) {
                    http_response_code(403);
                    echo json_encode(['success' => false, 'data' => null, 'message' => 'CSRF token validation failed.']);
                    exit;
                }
            }
            $isAuthorized = true;
        }
    }
}

if (!$isAuthorized) {
    http_response_code(401);
    echo json_encode(['success' => false, 'data' => null, 'message' => 'Unauthorized: Valid CLI, Cron Secret, or Admin session required.']);
    exit;
}

try {
    $startTime = microtime(true);

    $sapStockQuery = "SELECT Plant, Mat_No, MatDesc, Storage_Location, Batch, Quantity, Unit, Logdate FROM View_SAP_ALL_STOCK_1820 WHERE Mat_No IS NOT NULL AND Mat_No != ''";
    $stockRows = $pdo_sap->query($sapStockQuery)->fetchAll(PDO::FETCH_ASSOC);
    $stockCount = count($stockRows);
    $stockSkipped = false;

    if ($stockCount > 0) {
        $insertStockStmt = $pdo->prepare("INSERT INTO SAP_STG_ALL_STOCK (Plant, Mat_No, MatDesc, Storage_Location, Batch, Quantity, Unit, Logdate) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
        $pdo->beginTransaction();
        $pdo->exec("DELETE FROM SAP_STG_ALL_STOCK");
        foreach ($stockRows as $row) {
            $insertStockStmt->execute([
                $row['Plant'] ?? null,
                $row['Mat_No'] ?? null,
                $row['MatDesc'] ?? null,
                $row['Storage_Location'] ?? null,
                $row['Batch'] ?? null,
                $row['Quantity'] ?? 0,
                $row['Unit'] ?? null,
                $row['Logdate'] ?? null,
            ]);
        }
        $pdo->commit();
    } else {
        $stockSkipped = true;
    }

    $sapOpsQuery = "SELECT
        Plant, Order_ID, Mat_No, MatDesc, BS_StartDate, BS_FinishDate, TargetQty, ScrapQty, Unit,
        MRP_Controller, ProdSup, Opt_task_list_no, CounterNo, SequenceNo, TaskListNode, GrpRounting,
        GrpCounter, Activity, OptShortText, ObjectID, WorkCenter, SetTime1, SetTime2, SetTime3,
        Lot, PlanCT, PlanActualTime, PlanTargetDay, STD_Cost, Identify_Order_Seq_ACt, LogDate,
        OperationQty, CONFIRMYIELD, CONFIRM_NG, Status_order
        FROM View_OperationSlip_1820 WHERE Mat_No IS NOT NULL AND Mat_No != ''";
    $opsRows = $pdo_sap->query($sapOpsQuery)->fetchAll(PDO::FETCH_ASSOC);
    $opsCount = count($opsRows);
    $opsSkipped = false;

    if ($opsCount > 0) {
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
        $pdo->exec("DELETE FROM SAP_STG_OPERATION_SLIP");
        foreach ($opsRows as $row) {
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
                $row['Lot'] ?? null,
                $row['PlanCT'] ?? 0,
                $row['PlanActualTime'] ?? 0,
                $row['PlanTargetDay'] ?? 0,
                $row['STD_Cost'] ?? 0,
                $row['Identify_Order_Seq_ACt'] ?? null,
                $row['LogDate'] ?? null,
                $row['OperationQty'] ?? 0,
                $row['CONFIRMYIELD'] ?? 0,
                $row['CONFIRM_NG'] ?? 0,
                $row['Status_order'] ?? null,
            ]);
        }
        $pdo->commit();
    } else {
        $opsSkipped = true;
    }

    $duration = round(microtime(true) - $startTime, 2);
    $warning = ($stockSkipped || $opsSkipped)
        ? 'WARNING: Upstream SAP view returned 0 rows — preserved existing staging table data (no wipe).'
        : 'Staging tables updated successfully.';

    echo json_encode([
        'success' => true,
        'message' => $warning,
        'data' => [
            'stock_rows_synced' => $stockCount,
            'stock_preserved_old' => $stockSkipped,
            'operation_rows_synced' => $opsCount,
            'operation_preserved_old' => $opsSkipped,
            'duration_seconds' => $duration,
        ],
    ], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log('[LEGACY_SAP_STAGING_SYNC_ERROR] ' . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'data' => null,
        'message' => 'การซิงค์ข้อมูล SAP Staging ล้มเหลว กรุณาตรวจสอบ System Error Log',
    ], JSON_UNESCAPED_UNICODE);
}
