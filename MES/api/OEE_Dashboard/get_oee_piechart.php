<?php
require_once __DIR__ . '/../db.php';

try {
    // 1. Get request parameters
    $startDate = $_GET['startDate'] ?? date('Y-m-d');
    $endDate   = $_GET['endDate'] ?? date('Y-m-d');
    $line      = !empty($_GET['line']) ? $_GET['line'] : null;
    $model     = !empty($_GET['model']) ? $_GET['model'] : null;

    // 2. Prepare and execute the stored procedure
    $sql = "EXEC dbo.sp_CalculateOEE_PieChart @StartDate = ?, @EndDate = ?, @Line = ?, @Model = ?";
    $stmt = $pdo->prepare($sql);

    $stmt->bindParam(1, $startDate, PDO::PARAM_STR);
    $stmt->bindParam(2, $endDate, PDO::PARAM_STR);
    $stmt->bindParam(3, $line, PDO::PARAM_STR);
    $stmt->bindParam(4, $model, PDO::PARAM_STR);

    $stmt->execute();

    // 3. Fetch the single row result
    $result = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($result) {
        // 4. Format the final output with new defect fields
        $output = [
            "success" => true,
            "quality" => (float)$result['Quality'],
            "availability" => (float)$result['Availability'],
            "performance" => (float)$result['Performance'],
            "oee" => (float)$result['OEE'],
            "fg" => (int)$result['FG'],
            "defects" => (int)$result['Defects'],
            "ng" => (int)($result['NG'] ?? 0),
            "rework" => (int)($result['Rework'] ?? 0),
            "hold" => (int)($result['Hold'] ?? 0),
            "scrap" => (int)($result['Scrap'] ?? 0),
            "etc" => (int)($result['Etc'] ?? 0),
            "runtime" => (int)$result['Runtime'],
            "planned_time" => (int)$result['PlannedTime'],
            "downtime" => (int)$result['Downtime'],
            "actual_output" => (int)$result['ActualOutput'],
            "debug_info" => [
                "total_theoretical_minutes" => round((float)$result['TotalTheoreticalMinutes'], 2)
            ]
        ];
        echo json_encode($output);
    } else {
        throw new Exception("Stored procedure did not return a result.");
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'An error occurred: ' . $e->getMessage()]);
    error_log("Error in get_oee_piechart.php: " . $e->getMessage());
}
?>
