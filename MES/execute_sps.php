<?php
require_once __DIR__ . '/page/components/init.php';
require_once __DIR__ . '/db.php';

$spDirectory = __DIR__ . '/page/PE/sql/stored_procedures/';
$files = [
    'sp_CalculateOEE_Dashboard_PieChart.sql',
    'sp_CalculateOEE_Dashboard_LineChart.sql',
    'sp_CalculateOEE_Hourly_Trend.sql',
    'sp_GetDailyProductionSummary.sql'
];

foreach ($files as $file) {
    $filePath = $spDirectory . $file;
    if (file_exists($filePath)) {
        $sql = file_get_contents($filePath);
        try {
            $pdo->exec($sql);
            echo "Successfully deployed $file\n";
        } catch (PDOException $e) {
            echo "Error deploying $file: " . $e->getMessage() . "\n";
        }
    } else {
        echo "Stored procedure file not found: $filePath\n";
    }
}
?>
