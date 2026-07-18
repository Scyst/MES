<?php
require_once 'e:\MES\MES\MES\db.php';
$tables = ['MT_ITEMS', 'STOP_CAUSES', 'MAINTENANCE_REQUESTS'];
foreach ($tables as $t) {
    echo "--- $t ---\n";
    $stmt = $pdo->query("SELECT TOP 1 * FROM $t");
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($row) {
        foreach ($row as $k => $v) {
            echo "$k, ";
        }
    } else {
        echo "No data or table doesn't exist.";
    }
    echo "\n\n";
}
?>
