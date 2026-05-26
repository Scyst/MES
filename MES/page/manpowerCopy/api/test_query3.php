<?php
require_once __DIR__ . '/../../db.php';

try {
    // Check records in May 2026
    $stmt = $pdo->query("SELECT TOP 5 calendar_date, day_type, description FROM dbo.MANPOWER_CALENDAR WHERE calendar_date >= '2026-05-01' ORDER BY calendar_date ASC");
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo "Found " . count($rows) . " rows for May 2026.\n";
    print_r($rows);

    // Check start and end parse
    $startRaw = '2026-04-26T00:00:00+07:00';
    echo "Parsed start: " . date('Y-m-d', strtotime($startRaw)) . "\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
