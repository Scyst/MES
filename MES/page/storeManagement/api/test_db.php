<?php
require_once __DIR__ . '/../../db.php';
$stmt = $pdo->query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'PRODUCTION_JOBS'");
$cols = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo "COLUMNS:\n";
print_r($cols);
?>
