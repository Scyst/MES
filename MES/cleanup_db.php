<?php
require __DIR__ . '/page/db.php';

try {
    $pdo->beginTransaction();

    // Delete all cancelled tags that were left over by the old bug
    $delStmt = $pdo->exec("DELETE FROM dbo.STOCK_TRANSFER_ORDERS WHERE status = 'CANCELLED'");
    echo "Deleted $delStmt cancelled tags.\n";

    // Recalculate last_serial for all lots
    $updateStmt = $pdo->exec("
        UPDATE ls
        SET ls.last_serial = ISNULL((
            SELECT MAX(TRY_CAST(RIGHT(t.transfer_uuid, CHARINDEX('-', REVERSE(t.transfer_uuid)) - 1) AS INT))
            FROM dbo.STOCK_TRANSFER_ORDERS t WITH (NOLOCK)
            WHERE t.transfer_uuid LIKE ls.parent_lot + '-%'
        ), 0)
        FROM dbo.LOT_SERIALS ls
    ");
    echo "Recalculated $updateStmt LOT_SERIALS.\n";

    $pdo->commit();
    echo "Cleanup completed successfully.\n";

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    echo "Error: " . $e->getMessage() . "\n";
}
