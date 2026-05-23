<?php
require_once __DIR__ . '/../../page/db.php';

try {
    $stmt = $pdo->query("EXEC sp_GetManpowerDashboardData_TEST @StartDate='2026-05-17', @EndDate='2026-05-17', @UseNewFormula=1");
    $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
    if (count($data) > 0) {
        print_r(array_keys($data[0]));
    } else {
        echo "No data returned";
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
