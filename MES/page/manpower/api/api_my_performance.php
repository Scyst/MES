<?php
// /page/manpower/api/api_my_performance.php
session_start();

// ป้องกัน PHP พ่น Error เป็น HTML ทำให้ฝั่ง JS พัง
ini_set('display_errors', 0);
error_reporting(E_ALL);

header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../../db.php';

// Validate User Login
if (!isset($_SESSION['user'])) {
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

if (empty($_SESSION['user']['emp_id'])) {
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
    exit;
}

$emp_id = $_SESSION['user']['emp_id'];

// Default to current month
$currentPeriod = date('Y-m');

try {
    $sql = "SELECT grade 
            FROM dbo.EMPLOYEE_GRADES 
            WHERE emp_id = ? AND evaluation_period = ?";
            
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$emp_id, $currentPeriod]);
    $data = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($data) {
        // Return valid data (mocking income for now since tables don't exist)
        echo json_encode([
            'success' => true,
            'data' => [
                'has_data' => true,
                'grade' => !empty($data['grade']) ? $data['grade'] : '-',
                'income_per_head' => 0,
                'total_wage' => 0,
                'income_ratio' => 0
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
