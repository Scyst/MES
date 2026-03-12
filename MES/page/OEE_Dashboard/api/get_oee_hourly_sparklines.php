<?php
header('Content-Type: application/json');

ini_set('display_errors', 1);
error_reporting(E_ALL);

require_once __DIR__ . '/../../db.php';

try {
    $targetDate = $_GET['endDate'] ?? date('Y-m-d'); 
    $line       = !empty($_GET['line']) ? $_GET['line'] : null;
    $model      = !empty($_GET['model']) ? $_GET['model'] : null;
    $sql = "EXEC dbo." . SP_CALC_OEE_HOURLY . " @TargetDate = ?, @Line = ?, @Model = ?";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$targetDate, $line, $model]);
    $records = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode(["success" => true, "records" => $records]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'An error occurred in get_oee_hourly_sparklines.php',
        'error' => $e->getMessage()
    ]);
}
?>