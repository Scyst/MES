<?php
require_once __DIR__ . '/../../../config/config.php';
require_once __DIR__ . '/../../db.php';

try {
    $stmt = $pdo->query("SELECT COUNT(*) FROM dbo.MANPOWER_CALENDAR WHERE calendar_date BETWEEN '2026-05-01' AND '2026-05-31'");
    echo "Count for May 2026: " . $stmt->fetchColumn() . "\n";
    
    $stmt = $pdo->query("SELECT TOP 5 calendar_date, description, day_type FROM dbo.MANPOWER_CALENDAR ORDER BY calendar_date DESC");
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    print_r($rows);
} catch (Exception $e) {
    echo $e->getMessage();
}
