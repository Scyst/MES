<?php
require_once __DIR__ . '/page/db.php';
$stmt = $pdo->query("SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'MT_ITEMS'");
$cols = $stmt->fetchAll(PDO::FETCH_ASSOC);
print_r($cols);
