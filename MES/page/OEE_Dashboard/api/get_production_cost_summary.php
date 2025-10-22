<?php
// Use absolute paths for consistency and reliability
require_once __DIR__ . '/../../db.php'; // Correct path to db.php

// Allow GET requests
header('Content-Type: application/json');

// --- Get Filter Parameters (similar to OEE APIs) ---
$startDate = $_GET['startDate'] ?? date('Y-m-d', strtotime('-6 days')); // Default to last 7 days
$endDate = $_GET['endDate'] ?? date('Y-m-d');
$line = (!empty($_GET['line']) && $_GET['line'] !== 'All') ? $_GET['line'] : null;
$model = (!empty($_GET['model']) && $_GET['model'] !== 'All') ? $_GET['model'] : null;

try {
    // --- Determine which Stored Procedure to call based on IS_DEVELOPMENT ---
    $spName = IS_DEVELOPMENT === true // Use the constant directly
        ? '[dbo].[sp_CalculateProductionCostSummary_TEST]'
        : '[dbo].[sp_CalculateProductionCostSummary]';

    // --- Prepare and Execute Stored Procedure ---
    $stmt = $pdo->prepare("EXEC {$spName} @StartDate = ?, @EndDate = ?, @Line = ?, @Model = ?");
    $stmt->bindParam(1, $startDate, PDO::PARAM_STR);
    $stmt->bindParam(2, $endDate, PDO::PARAM_STR);
    $stmt->bindParam(3, $line, $line === null ? PDO::PARAM_NULL : PDO::PARAM_STR);
    $stmt->bindParam(4, $model, $model === null ? PDO::PARAM_NULL : PDO::PARAM_STR);
    
    $stmt->execute();

    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    $stmt->closeCursor();

    if ($result) {
        foreach ($result as $key => $value) {
           // Ensure values that should be numbers are treated as such
           if (is_numeric($value) && $value !== null) { // Check for null explicitly
               $result[$key] = floatval($value);
           } elseif ($value === null) {
               // Decide how to handle nulls, maybe keep them as null or default to 0
               $result[$key] = 0; // Defaulting nulls to 0
           }
        }
        echo json_encode(['success' => true, 'data' => $result]);
    } else {
        // Return a default structure with zeros if SP returns no row or empty result
        $defaultData = [
            "TotalMatCost" => 0, "TotalDLCost" => 0, "TotalOHCost" => 0,
            "TotalStdCost" => 0, "TotalStdRevenue" => 0, "PercentRM" => 0,
            "PercentDL" => 0, "PercentOH" => 0, "PercentGPStd" => 0
        ];
        echo json_encode(['success' => true, 'data' => $defaultData, 'message' => 'No production data found for the selected filters.']);
    }

} catch (PDOException $e) {
    http_response_code(500);
    error_log("Database Error in get_production_cost_summary.php: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Database error occurred while calculating cost summary.']);
} catch (Exception $e) {
    http_response_code(500);
    error_log("General Error in get_production_cost_summary.php: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'An unexpected error occurred.']);
}

?>