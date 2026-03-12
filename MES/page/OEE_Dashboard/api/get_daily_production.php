<?php
require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../../config/config.php';
header('Content-Type: application/json');

$startDate = $_GET['startDate'] ?? date('Y-m-d', strtotime('-6 days'));
$endDate = $_GET['endDate'] ?? date('Y-m-d');
$line = (!empty($_GET['line']) && $_GET['line'] !== 'All') ? $_GET['line'] : null;
$model = (!empty($_GET['model']) && $_GET['model'] !== 'All') ? $_GET['model'] : null;

try {
    $spNameWithSchema = 'dbo.' . SP_GET_DAILY_PROD;
    $stmt = $pdo->prepare("EXEC {$spNameWithSchema} @StartDate = ?, @EndDate = ?, @Line = ?, @Model = ?");
    $stmt->bindParam(1, $startDate, PDO::PARAM_STR);
    $stmt->bindParam(2, $endDate, PDO::PARAM_STR);
    $stmt->bindParam(3, $line, $line === null ? PDO::PARAM_NULL : PDO::PARAM_STR);
    $stmt->bindParam(4, $model, $model === null ? PDO::PARAM_NULL : PDO::PARAM_STR);
    $stmt->execute();
    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $stmt->closeCursor();

    foreach ($results as &$row) {
        if (isset($row['TotalQuantity']) && is_numeric($row['TotalQuantity'])) {
            $row['TotalQuantity'] = floatval($row['TotalQuantity']);
        }
        if (isset($row['ProductionDate'])) {
            try {
                 $dateObj = new DateTime($row['ProductionDate']);
                 $row['ProductionDate'] = $dateObj->format('Y-m-d');
            } catch (Exception $e) {
                 error_log("Date format issue in get_daily_production.php: " . $row['ProductionDate']);
            }
        }
    }
    unset($row);

    echo json_encode(['success' => true, 'data' => $results]);

} catch (PDOException $e) {
    http_response_code(500);
    error_log("Database Error in get_daily_production.php: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Database error occurred while fetching daily production data.']);
} catch (Exception $e) {
    http_response_code(500);
    error_log("General Error in get_daily_production.php: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'An unexpected error occurred.']);
}

?>