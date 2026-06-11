<?php
require_once __DIR__ . '/page/components/init.php';
require_once __DIR__ . '/db.php';

$files = [
    'alter_sp_CalculateOEE_Dashboard_PieChart.sql',
    'alter_sp_CalculateOEE_Dashboard_LineChart.sql',
    'alter_sp_CalculateOEE_Hourly_Trend.sql',
    'alter_sp_GetDailyProductionSummary.sql'
];

foreach ($files as $file) {
    if (file_exists($file)) {
        $sql = file_get_contents($file);
        try {
            $pdo->exec($sql);
            echo "Successfully executed $file\n";
        } catch (PDOException $e) {
            echo "Error executing $file: " . $e->getMessage() . "\n";
        }
    } else {
        echo "File not found: $file\n";
    }
}
?>
