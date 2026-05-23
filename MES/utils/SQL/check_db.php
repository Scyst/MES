<?php
require_once __DIR__ . '/../../db.php';

try {
    $stmt = $pdo->query("SELECT TOP 10 emp_id, log_date, status, is_verified FROM dbo.MANPOWER_DAILY_LOGS_TEST WHERE log_date = '2026-05-17'");
    $logs = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo "Logs for 2026-05-17: \n";
    print_r($logs);
    
    $stmt2 = $pdo->query("SELECT DATENAME(dw, '2026-05-17') as dw");
    print_r($stmt2->fetchAll(PDO::FETCH_ASSOC));
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
