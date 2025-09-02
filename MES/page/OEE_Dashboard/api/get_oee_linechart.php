<?php
header('Content-Type: application/json');

ini_set('display_errors', 1);
error_reporting(E_ALL);

require_once __DIR__ . '/../../db.php';

try {
    $startDateStr = $_GET['startDate'] ?? date('Y-m-d', strtotime('-29 days'));
    $endDateStr   = $_GET['endDate'] ?? date('Y-m-d');
    $line         = !empty($_GET['line']) ? $_GET['line'] : null;
    $model        = !empty($_GET['model']) ? $_GET['model'] : null;
    $sql = "EXEC dbo.sp_CalculateOEE_Dashboard_LineChart @StartDate = ?, @EndDate = ?, @Line = ?, @Model = ?";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$startDateStr, $endDateStr, $line, $model]);

    $records = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $formattedRecords = array_map(function($row) {
        $row['date'] = date('d-m-y', strtotime($row['date']));
        return $row;
    }, $records);
    
    echo json_encode(["success" => true, "records" => $formattedRecords]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false, 
        'message' => 'An error occurred in get_oee_linechart.php', 
        'error' => $e->getMessage()
    ]);
}
?>