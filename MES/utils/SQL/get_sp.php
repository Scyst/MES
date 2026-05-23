<?php
require_once __DIR__ . '/../../page/db.php';
try {
    $stmt = $pdo->query("EXEC sp_helptext 'sp_GetManpowerDashboardData_TEST'");
    $lines = $stmt->fetchAll(PDO::FETCH_COLUMN);
    $text = implode("", $lines);
    file_put_contents(__DIR__ . '/sp_output.sql', $text);
    echo "Saved to sp_output.sql";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
