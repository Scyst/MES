<?php
require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../sap_db.php';

$stmt = $pdo_sap->query("SELECT TOP 1 * FROM View_SAP_ALL_STOCK_1820");
$row = $stmt->fetch(PDO::FETCH_ASSOC);

print_r($row);
print_r(array_keys($row));
