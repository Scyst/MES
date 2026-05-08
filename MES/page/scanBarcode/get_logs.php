<?php

require_once 'config.php';
setApiHeaders();

try {
    $pdo = getDBConnection();

    $sql = "SELECT TOP 50
                transaction_id,
                " . COL_LOG_BARCODE   . " AS barcode,
                " . COL_LOG_SAP       . " AS sap_no,
                " . COL_LOG_LOTREF    . " AS lot_ref,
                " . COL_LOG_LOC_ID    . " AS location_id,
                " . COL_LOG_LOC_NAME  . " AS location_name,
                " . COL_LOG_PROD_TYPE . " AS production_type,
                CONVERT(varchar(19), " . COL_LOG_LOGDATE . ", 120) AS logdate,
                " . COL_LOG_NOTES     . " AS notes,
                CONVERT(varchar(19), created_at, 120) AS created_at
            FROM " . TBL_SCAN_LOGS . "
            ORDER BY transaction_id DESC";

    $stmt = $pdo->query($sql);
    $logs = $stmt->fetchAll();

    echo json_encode([
        'success' => true,
        'data'    => $logs
    ]);
} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Error: ' . $e->getMessage()
    ]);
}
