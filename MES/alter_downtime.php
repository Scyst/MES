<?php
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/config/config.php';

try {
    $sql = "ALTER TABLE " . PE_DOWNTIME_LOG_TABLE . " ALTER COLUMN end_time DATETIME NULL";
    $pdo->exec($sql);
    echo "Successfully altered end_time to allow NULL in " . PE_DOWNTIME_LOG_TABLE . "\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
