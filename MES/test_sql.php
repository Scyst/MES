<?php
require __DIR__ . '/page/db.php';
$stmt = $pdo->query("SELECT ISNULL((SELECT MAX(TRY_CAST(RIGHT(transfer_uuid, CHARINDEX('-', REVERSE(transfer_uuid)) - 1) AS INT)) FROM dbo.STOCK_TRANSFER_ORDERS WHERE transfer_uuid LIKE '73347-0526-312-%'), 0)");
print_r($stmt->fetchColumn());
echo "\n";
$stmt2 = $pdo->query("SELECT last_serial FROM dbo.LOT_SERIALS WHERE parent_lot = '73347-0526-312'");
print_r($stmt2->fetchColumn());
echo "\n";
