<?php
// Use absolute paths for consistency and reliability
require_once __DIR__ . '/../../db.php'; // Correct path to db.php which includes config.php
require_once __DIR__ . '/../../../auth/check_auth.php';

if (!isset($_SESSION['user']) && !isset($_SESSION['username'])) {
    http_response_code(403); // Forbidden
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

// Allow GET requests
header('Content-Type: application/json');

// --- Get Filter Parameters ---
$startDate = $_GET['startDate'] ?? date('Y-m-d', strtotime('-6 days'));
$endDate = $_GET['endDate'] ?? date('Y-m-d');
$line = (!empty($_GET['line']) && $_GET['line'] !== 'All') ? $_GET['line'] : null;
$model = (!empty($_GET['model']) && $_GET['model'] !== 'All') ? $_GET['model'] : null;

try {
    if (!defined('SP_CALC_STD_COST')) {
        throw new Exception("Configuration Error: SP_CALC_STD_COST is not defined.");
    }
    $spStdName = '[dbo].[' . SP_CALC_STD_COST . ']';

    $stmtStd = $pdo->prepare("EXEC {$spStdName} @StartDate = ?, @EndDate = ?, @Line = ?, @Model = ?");
    $stmtStd->bindParam(1, $startDate, PDO::PARAM_STR);
    $stmtStd->bindParam(2, $endDate, PDO::PARAM_STR);
    $stmtStd->bindParam(3, $line, $line === null ? PDO::PARAM_NULL : PDO::PARAM_STR);
    $stmtStd->bindParam(4, $model, $model === null ? PDO::PARAM_NULL : PDO::PARAM_STR);
    $stmtStd->execute();
    $standardResult = $stmtStd->fetch(PDO::FETCH_ASSOC);
    $stmtStd->closeCursor();

    $actualResult = null; 
    if (defined('SP_CALC_ACTUAL_COST')) {
        $spActualName = '[dbo].[' . SP_CALC_ACTUAL_COST . ']';
        try {
            $stmtActual = $pdo->prepare("EXEC {$spActualName} @StartDate = ?, @EndDate = ?, @Line = ?");
            
            $stmtActual->bindParam(1, $startDate, PDO::PARAM_STR);
            $stmtActual->bindParam(2, $endDate, PDO::PARAM_STR);
            
            $forceLineAll = null; 
            $stmtActual->bindParam(3, $forceLineAll, PDO::PARAM_NULL); 

            $stmtActual->execute();
            $actualResult = $stmtActual->fetch(PDO::FETCH_ASSOC);
            $stmtActual->closeCursor();
        } catch (PDOException $e) {
            error_log("Database Error fetching actual DLOT: " . $e->getMessage());
        }
    } else {
        error_log("Warning: SP_CALC_ACTUAL_COST constant is not defined.");
    }

    if ($standardResult) {
        foreach ($standardResult as $key => $value) {
            if (is_numeric($value)) $standardResult[$key] = floatval($value);
        } 

        $isActualCostUsed = false; 

        // [แก้ไข] ดึงข้อมูล DL และ OT แยกกัน
        if ($actualResult && isset($actualResult['TotalActualDLOT']) && is_numeric($actualResult['TotalActualDLOT'])) {
            $actualDLOT = floatval($actualResult['TotalActualDLOT']);

            $standardResult['TotalDLCost'] = $actualDLOT;
            
            // เพิ่ม 2 บรรทัดนี้เพื่อส่งค่าแยก
            $standardResult['TotalActualDL'] = floatval($actualResult['TotalActualDL'] ?? 0);
            $standardResult['TotalActualOT'] = floatval($actualResult['TotalActualOT'] ?? 0);
            
            $isActualCostUsed = true; 

            $totalRevenue = $standardResult['TotalStdRevenue'] ?? 0;
            $matCost = $standardResult['TotalMatCost'] ?? 0;
            $ohCost = $standardResult['TotalOHCost'] ?? 0;

            $standardResult['PercentDL'] = ($totalRevenue > 0) ? ($standardResult['TotalDLCost'] / $totalRevenue) * 100.0 : 0;
            $standardResult['TotalStdCost'] = $matCost + $standardResult['TotalDLCost'] + $ohCost;
            $standardResult['PercentGPStd'] = ($totalRevenue > 0) ? (($totalRevenue - $standardResult['TotalStdCost']) / $totalRevenue) * 100.0 : 0;
        }

        $standardResult['isActualDLCost'] = $isActualCostUsed;
        echo json_encode(['success' => true, 'data' => $standardResult]);

    } else {
        // Return a default structure with zeros if Standard SP returns no row
        $defaultData = [
            "TotalMatCost" => 0, "TotalDLCost" => 0, "TotalOHCost" => 0,
            "TotalStdCost" => 0, "TotalStdRevenue" => 0, "PercentRM" => 0,
            "PercentDL" => 0, "PercentOH" => 0, "PercentGPStd" => 0,
            "isActualDLCost" => false // Default flag
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
    echo json_encode(['success' => false, 'message' => 'An unexpected error occurred: ' . $e->getMessage()]);
}

?>