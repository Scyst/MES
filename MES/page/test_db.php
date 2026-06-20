<?php
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/components/init.php';

$startDate = '2026-06-01';
$endDate = '2026-06-30';

$sql = "SELECT log_date, 
               SUM(ISNULL(duration_min, DATEDIFF(MINUTE, start_time, GETDATE()))) as total_min, 
               COUNT(*) as event_count
        FROM " . PE_DOWNTIME_LOG_TABLE . " WITH (NOLOCK)
        WHERE log_date >= ? AND log_date <= ?
        GROUP BY log_date ORDER BY log_date ASC";
$stmt = $pdo->prepare($sql);
$stmt->execute([$startDate, $endDate]);
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
?>
