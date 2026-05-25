<?php
require_once __DIR__ . '/../../db.php';
$stmt = $pdo->query("UPDATE STOCK_TRANSFER_ORDERS SET transfer_uuid = LEFT(transfer_uuid, 35) + '-C' + CAST(transfer_id AS VARCHAR) WHERE status = 'CANCELLED' AND transfer_uuid NOT LIKE '%-C%'");
echo 'Updated ' . $stmt->rowCount() . ' rows.';
