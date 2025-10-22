<?php
require_once __DIR__ . '/../../db.php';

// กำหนด Content Type เป็น JSON
header('Content-Type: application/json');

// --- รับค่า Filter Parameters ---
$startDate = $_GET['startDate'] ?? date('Y-m-d', strtotime('-6 days'));
$endDate = $_GET['endDate'] ?? date('Y-m-d');
$line = (!empty($_GET['line']) && $_GET['line'] !== 'All') ? $_GET['line'] : null;
$model = (!empty($_GET['model']) && $_GET['model'] !== 'All') ? $_GET['model'] : null;

try {
    // --- เลือก Stored Procedure ตาม Environment ---
    $spName = IS_DEVELOPMENT === true
        ? '[dbo].[sp_GetDailyProductionSummary_TEST]'
        : '[dbo].[sp_GetDailyProductionSummary]';

    // --- เตรียมและ Execute Stored Procedure ---
    $stmt = $pdo->prepare("EXEC {$spName} @StartDate = ?, @EndDate = ?, @Line = ?, @Model = ?");
    $stmt->bindParam(1, $startDate, PDO::PARAM_STR);
    $stmt->bindParam(2, $endDate, PDO::PARAM_STR);
    $stmt->bindParam(3, $line, $line === null ? PDO::PARAM_NULL : PDO::PARAM_STR);
    $stmt->bindParam(4, $model, $model === null ? PDO::PARAM_NULL : PDO::PARAM_STR);

    $stmt->execute();

    // ดึงข้อมูลทั้งหมดที่ได้จาก SP (อาจมีหลายแถว)
    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $stmt->closeCursor();

    // แปลงค่า Quantity เป็นตัวเลข Float
    foreach ($results as &$row) {
        if (isset($row['TotalQuantity']) && is_numeric($row['TotalQuantity'])) {
            $row['TotalQuantity'] = floatval($row['TotalQuantity']);
        }
        // แปลง ProductionDate ให้เป็น Format ที่ JavaScript / Chart.js มักใช้ (YYYY-MM-DD)
        if (isset($row['ProductionDate'])) {
             // PDO for SQL Server often returns DateTime objects or strings in a specific format
             // Ensure it's consistently YYYY-MM-DD string for JS
            try {
                 $dateObj = new DateTime($row['ProductionDate']);
                 $row['ProductionDate'] = $dateObj->format('Y-m-d');
            } catch (Exception $e) {
                 // Handle potential date format issues, maybe keep original or log error
                 error_log("Date format issue in get_daily_production.php: " . $row['ProductionDate']);
            }
        }
    }
    unset($row); // ทำลาย reference

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