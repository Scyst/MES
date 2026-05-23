<?php
require_once __DIR__ . '/../../page/db.php';

try {
    $sql = "UPDATE dbo.MANPOWER_DAILY_LOGS_TEST 
            SET status = 'HOLIDAY' 
            WHERE status = 'ABSENT' 
            AND (DATEPART(dw, log_date) = 1 OR log_date IN (SELECT calendar_date FROM dbo.MANPOWER_CALENDAR WHERE day_type = 'HOLIDAY'))";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute();
    $msg = "Updated " . $stmt->rowCount() . " rows to HOLIDAY.";
    file_put_contents(__DIR__ . '/fix_log.txt', $msg);
    echo $msg;
} catch (Exception $e) {
    file_put_contents(__DIR__ . '/fix_log.txt', "Error: " . $e->getMessage());
    echo "Error: " . $e->getMessage();
}
