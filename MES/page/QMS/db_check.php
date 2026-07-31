<?php
require_once '../../db.php';
try {
    $stmt = $pdo->query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'SALES_ORDERS'");
    $cols = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode($cols);
} catch (Exception $e) {
    echo $e->getMessage();
}
