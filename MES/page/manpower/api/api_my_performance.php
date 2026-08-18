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
    $sql = "
        SELECT 
            G.grade,
            ISNULL(INC.income_per_head, 0) AS income_per_head,
            ISNULL(WAGE.total_wage, 350.0) AS total_wage
        FROM dbo.MANPOWER_EMPLOYEES E WITH (NOLOCK)
        LEFT JOIN (
            SELECT 
                stu.emp_id,
                SUM(
                    stu.head_count_ratio * (t.quantity * (
                        ISNULL(t.std_cost_dl_snapshot, ISNULL(i.Cost_DL, 0)) + 
                        ISNULL(t.std_cost_oh_snapshot, (ISNULL(i.Cost_OH_Machine, 0) + ISNULL(i.Cost_OH_Utilities, 0) + ISNULL(i.Cost_OH_Indirect, 0) + ISNULL(i.Cost_OH_Staff, 0) + ISNULL(i.Cost_OH_Accessory, 0) + ISNULL(i.Cost_OH_Others, 0)))
                    ))
                ) AS income_per_head
            FROM dbo.STOCK_TRANSACTION_USERS stu WITH (NOLOCK)
            INNER JOIN dbo.STOCK_TRANSACTIONS t WITH (NOLOCK) ON stu.transaction_id = t.transaction_id
            LEFT JOIN dbo.ITEMS i WITH (NOLOCK) ON t.parameter_id = i.item_id
            WHERE CONVERT(VARCHAR(7), t.transaction_timestamp, 120) = :period1
              AND t.transaction_type LIKE 'PRODUCTION_%'
            GROUP BY stu.emp_id
        ) INC ON INC.emp_id = E.emp_id COLLATE Thai_CI_AS
        LEFT JOIN (
            SELECT 
                ml.emp_id,
                SUM(
                    COALESCE(
                        CASE WHEN cm.rate_type LIKE 'MONTHLY%' THEN cm.hourly_rate / 30.0 ELSE cm.hourly_rate END,
                        350.0
                    )
                    +
                    (
                        CASE WHEN ml.scan_out_time IS NOT NULL AND ms.start_time IS NOT NULL 
                        THEN 
                            CASE WHEN DATEDIFF(MINUTE, CAST(CONCAT(ml.log_date, ' ', ms.start_time) AS DATETIME), ml.scan_out_time) > 570 
                            THEN FLOOR((DATEDIFF(MINUTE, CAST(CONCAT(ml.log_date, ' ', ms.start_time) AS DATETIME), ml.scan_out_time) - 570) / 30.0) * 0.5 
                            ELSE 0 END
                        ELSE 0 END
                    )
                    * 
                    (COALESCE(CASE WHEN cm.rate_type LIKE 'MONTHLY%' THEN (cm.hourly_rate / 30.0) / 8.0 ELSE cm.hourly_rate / 8.0 END, 350.0 / 8.0) * 1.5)
                ) AS total_wage
            FROM dbo.MANPOWER_DAILY_LOGS ml WITH (NOLOCK)
            LEFT JOIN dbo.MANPOWER_EMPLOYEES emp WITH (NOLOCK) ON ml.emp_id = emp.emp_id COLLATE Thai_CI_AS
            LEFT JOIN dbo.MANPOWER_SHIFTS ms WITH (NOLOCK) ON ms.shift_id = ISNULL(ml.shift_id, emp.default_shift_id)
            OUTER APPLY (
                SELECT TOP 1 * FROM dbo.MANPOWER_CATEGORY_MAPPING WITH (NOLOCK) 
                WHERE emp.position LIKE '%' + keyword + '%' COLLATE Thai_CI_AS 
                ORDER BY display_order DESC
            ) cm
            WHERE CONVERT(VARCHAR(7), ml.log_date, 120) = :period2
              AND ml.status IN ('PRESENT', 'LATE')
            GROUP BY ml.emp_id
        ) WAGE ON WAGE.emp_id = E.emp_id COLLATE Thai_CI_AS
        LEFT JOIN dbo.EMPLOYEE_GRADES G WITH (NOLOCK) 
            ON E.emp_id = G.emp_id AND G.evaluation_period = :period3
        WHERE E.emp_id = :empId3
    ";
            
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':period1' => $currentPeriod,
        ':period2' => $currentPeriod,
        ':period3' => $currentPeriod,
        ':empId3' => $emp_id
    ]);
    $data = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($data) {
        $income = (float)$data['income_per_head'];
        $wage = (float)$data['total_wage'];
        $ratio = $wage > 0 ? ($income / $wage) * 100 : 0;

        echo json_encode([
            'success' => true,
            'data' => [
                'has_data' => true,
                'grade' => !empty($data['grade']) ? $data['grade'] : '-',
                'income_per_head' => $income,
                'total_wage' => $wage,
                'income_ratio' => $ratio
            ]
        ]);
    } else {
        $errorInfo = $stmt->errorInfo();
        // No data yet for this month
        echo json_encode([
            'success' => true,
            'data' => [
                'has_data' => false,
                'grade' => '-',
                'income_per_head' => 0,
                'total_wage' => 0,
                'income_ratio' => 0,
                'debug_error' => $errorInfo,
                'debug_emp_id' => $emp_id
            ]
        ]);
    }

} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Database error', 'error' => $e->getMessage()]);
}
?>
