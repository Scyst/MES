<?php
// /page/manpower/api/api_my_performance.php
session_start();

// ป้องกัน PHP พ่น Error เป็น HTML ทำให้ฝั่ง JS พัง
ini_set('display_errors', 0);
error_reporting(E_ALL);

header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../../db.php';

// Validate User Login
if (!isset($_SESSION['user']) || empty($_SESSION['user']['emp_id'])) {
    echo json_encode(['success' => false, 'message' => 'Unauthorized or missing employee ID']);
    exit;
}

$emp_id = $_SESSION['user']['emp_id'];

// Default to current month
$currentPeriod = date('Y-m');

try {
    $sql = "SELECT income_per_head, income_ratio, total_wage, system_grade, manual_grade, criteria_snapshot 
            FROM dbo.EMPLOYEE_GRADES 
            WHERE emp_id = ? AND evaluation_period = ? AND period_type = 'monthly'";
            
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$emp_id, $currentPeriod]);
    $data = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($data) {
        // Return valid data
        $finalGrade = !empty($data['manual_grade']) ? $data['manual_grade'] : (!empty($data['system_grade']) ? $data['system_grade'] : '-');
        
        echo json_encode([
            'success' => true,
            'data' => [
                'has_data' => true,
                'grade' => $finalGrade,
                'income_per_head' => floatval($data['income_per_head']),
                'total_wage' => floatval($data['total_wage']),
                'income_ratio' => floatval($data['income_ratio'])
            ]
        ]);
    } else {
        // No data yet for this month
        echo json_encode([
            'success' => true,
            'data' => [
                'has_data' => false,
                'grade' => '-',
                'income_per_head' => 0,
                'total_wage' => 0,
                'income_ratio' => 0
            ]
        ]);
    }

} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Database error', 'error' => $e->getMessage()]);
}
?>
