<?php
require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../components/init.php';

// Only allow admins to run this
requirePermission(['admin']);

header('Content-Type: text/plain');

echo "Starting Index Migration...\n";

$indexes = [
    [
        'table' => 'PE_IIOT_STATE_LOG',
        'name' => 'IX_PE_IIOT_STATE_LOG_StartEnd',
        'sql' => "CREATE NONCLUSTERED INDEX IX_PE_IIOT_STATE_LOG_StartEnd ON PE_IIOT_STATE_LOG (start_time, end_time, machine_code)"
    ],
    [
        'table' => 'PE_IIOT_TELEMETRY_HISTORY',
        'name' => 'IX_PE_IIOT_TEL_HIST_Snap',
        'sql' => "CREATE NONCLUSTERED INDEX IX_PE_IIOT_TEL_HIST_Snap ON PE_IIOT_TELEMETRY_HISTORY (snapshot_time, machine_code)"
    ],
    [
        'table' => 'STOCK_TRANSACTIONS',
        'name' => 'IX_STOCK_TRANS_Time',
        'sql' => "CREATE NONCLUSTERED INDEX IX_STOCK_TRANS_Time ON STOCK_TRANSACTIONS (transaction_timestamp, transaction_type)"
    ],
    [
        'table' => 'PE_WORK_ORDERS',
        'name' => 'IX_PE_WO_Machine',
        'sql' => "CREATE NONCLUSTERED INDEX IX_PE_WO_Machine ON PE_WORK_ORDERS (machine_id, requested_at)"
    ]
];

foreach ($indexes as $idx) {
    try {
        // Check if index exists
        $checkSql = "SELECT count(*) FROM sys.indexes WHERE name = ? AND object_id = OBJECT_ID(?)";
        $stmt = $pdo->prepare($checkSql);
        $stmt->execute([$idx['name'], $idx['table']]);
        
        if ($stmt->fetchColumn() > 0) {
            echo "Index {$idx['name']} already exists on {$idx['table']}.\n";
        } else {
            echo "Creating index {$idx['name']} on {$idx['table']}...\n";
            $pdo->exec($idx['sql']);
            echo "Successfully created {$idx['name']}.\n";
        }
    } catch (Exception $e) {
        echo "Error creating {$idx['name']}: " . $e->getMessage() . "\n";
    }
}

echo "Migration Complete.\n";
