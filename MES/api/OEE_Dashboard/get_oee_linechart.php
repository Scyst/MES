<?php
require_once __DIR__ . '/../db.php';

try {
    // 1. Get and validate input parameters
    $startDateStr = $_GET['startDate'] ?? date('Y-m-d', strtotime('-29 days'));
    $endDateStr   = $_GET['endDate'] ?? date('Y-m-d');
    $line         = !empty($_GET['line']) ? $_GET['line'] : null;
    $model        = !empty($_GET['model']) ? $_GET['model'] : null;

    $startDate = new DateTime($startDateStr);
    $endDate   = new DateTime($endDateStr);
    
    // Ensure the date range is at least 15 days for a meaningful chart, up to a max of maybe 60 days
    $dayDifference = $startDate->diff($endDate)->days;
    if ($dayDifference < 14) {
        $startDate = (clone $endDate)->modify('-14 days');
    }

    // 2. Call the Stored Procedure which now contains all the correct logic
    $sql = "EXEC dbo.sp_CalculateOEE_LineChart @StartDate = ?, @EndDate = ?, @Line = ?, @Model = ?";
    $stmt = $pdo->prepare($sql);
    
    $stmt->execute([
        $startDate->format('Y-m-d'),
        $endDate->format('Y-m-d'),
        $line,
        $model
    ]);

    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $records = [];

    // 3. Format the results for the frontend
    foreach ($results as $row) {
        $dateObj = new DateTime($row['date']);
        $records[] = [
            "date"         => $dateObj->format('d-m-y'),
            "availability" => (float)$row['availability'],
            "performance"  => (float)$row['performance'],
            "quality"      => (float)$row['quality'],
            "oee"          => (float)$row['oee']
        ];
    }

    echo json_encode(["success" => true, "records" => $records]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'An error occurred: ' . $e->getMessage()]);
    error_log("Error in get_oee_linechart.php: " . $e->getMessage());
}
?>
