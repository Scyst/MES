<?php
require_once __DIR__ . '/page/db.php';

try {
    $pdo->beginTransaction();

    echo "Truncating TEST tables...\n";
    $pdo->exec('TRUNCATE TABLE dbo.MANPOWER_EMPLOYEES_TEST');
    $pdo->exec('TRUNCATE TABLE dbo.MANPOWER_DAILY_LOG_TEST');
    $pdo->exec('TRUNCATE TABLE dbo.MANPOWER_TEAM_SETTINGS_TEST');

    echo "Copying Employees...\n";
    $pdo->exec('INSERT INTO dbo.MANPOWER_EMPLOYEES_TEST SELECT * FROM dbo.MANPOWER_EMPLOYEES');

    echo "Copying Daily Logs (Last 30 Days)...\n";
    $pdo->exec('INSERT INTO dbo.MANPOWER_DAILY_LOG_TEST SELECT * FROM dbo.MANPOWER_DAILY_LOG WHERE log_date >= DATEADD(day, -30, GETDATE())');

    echo "Populating Team Settings...\n";
    $pdo->exec("
        INSERT INTO dbo.MANPOWER_TEAM_SETTINGS_TEST (line_name, team_group, hc_group)
        SELECT DISTINCT line, team_group, 'MAIN'
        FROM dbo.MANPOWER_EMPLOYEES_TEST
        WHERE line IS NOT NULL AND team_group IS NOT NULL AND is_active = 1
    ");

    $pdo->commit();
    echo "\nData copied successfully.\n";
} catch (Exception $e) {
    $pdo->rollBack();
    echo "\nError: " . $e->getMessage() . "\n";
}
