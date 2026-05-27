<?php
require_once 'page/db.php';
$stmt = $pdo->query('SELECT TOP 1 * FROM ' . TRANSACTIONS_TABLE);
$row = $stmt->fetch(PDO::FETCH_ASSOC);
if ($row) {
    print_r(array_keys($row));
} else {
    echo "No rows found, fetching schema...";
    $stmt = $pdo->query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '" . TRANSACTIONS_TABLE . "'");
    print_r($stmt->fetchAll(PDO::FETCH_COLUMN));
}
?>
