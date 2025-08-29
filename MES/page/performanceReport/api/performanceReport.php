<?php
require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../../auth/check_auth.php';
require_once __DIR__ . '/../../logger.php';

// ป้องกัน CSRF
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    if (!isset($_SERVER['HTTP_X_CSRF_TOKEN']) || !isset($_SESSION['csrf_token']) || !hash_equals($_SESSION['csrf_token'], $_SERVER['HTTP_X_CSRF_TOKEN'])) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'CSRF token validation failed.']);
        exit;
    }
}

// =================================================================
// DEVELOPMENT SWITCH (ส่วนนี้ถูกลบออก)
// =================================================================

$action = $_GET['action'] ?? '';

try {
    switch ($action) {
        case 'get_performance_data':
            $startDate = $_GET['startDate'] ?? null;
            $endDate = $_GET['endDate'] ?? null;
            $operatorName = $_GET['operatorName'] ?? '';

            if (!$startDate || !$endDate) {
                throw new Exception("Start date and end date are required.");
            }

            $params = [$startDate, $endDate];
            $where_clauses = ["p.log_date BETWEEN ? AND ?", "p.operator_id IS NOT NULL"];

            if (!empty($operatorName)) {
                $where_clauses[] = "u.username LIKE ?";
                $params[] = '%' . $operatorName . '%';
            }

            $where_sql = "WHERE " . implode(" AND ", $where_clauses);

            // *** แก้ไข: เปลี่ยนมาใช้ค่าคงที่ทั้งหมด (PARTS_TABLE, USERS_TABLE, PARAMETER_TABLE) ***
            $sql = "
                SELECT
                    u.id AS operator_id,
                    u.username AS operator_name,
                    SUM(CASE WHEN p.count_type = 'FG' THEN p.count_value ELSE 0 END) AS total_fg,
                    SUM(CASE WHEN p.count_type = 'NG' THEN p.count_value ELSE 0 END) AS total_ng,
                    SUM(p.count_value * ISNULL(param.part_value, 0)) AS total_value
                FROM
                    " . PARTS_TABLE . " p
                JOIN
                    " . USERS_TABLE . " u ON p.operator_id = u.id
                LEFT JOIN
                    " . PARAMETER_TABLE . " param ON p.line = param.line AND p.model = param.model AND p.part_no = param.part_no
                {$where_sql}
                GROUP BY
                    u.id, u.username
                ORDER BY
                    total_value DESC;
            ";

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode(['success' => true, 'data' => $data]);
            break;

        case 'get_operator_details':
            $startDate = $_GET['startDate'] ?? null;
            $endDate = $_GET['endDate'] ?? null;
            $operatorId = $_GET['operatorId'] ?? null;

            if (!$startDate || !$endDate || !$operatorId) {
                throw new Exception("Start date, end date, and operator ID are required.");
            }

            // *** แก้ไข: เปลี่ยนมาใช้ค่าคงที่ทั้งหมด (PARTS_TABLE, PARAMETER_TABLE) ***
            $sql = "
                SELECT 
                    p.log_date,
                    p.part_no,
                    p.model,
                    p.count_type,
                    p.count_value,
                    (p.count_value * ISNULL(param.part_value, 0)) as value
                FROM " . PARTS_TABLE . " p
                LEFT JOIN " . PARAMETER_TABLE . " param ON p.line = param.line AND p.model = param.model AND p.part_no = param.part_no
                WHERE p.operator_id = ? AND p.log_date BETWEEN ? AND ?
                ORDER BY p.log_date DESC, p.log_time DESC;
            ";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$operatorId, $startDate, $endDate]);
            $details = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode(['success' => true, 'data' => $details]);
            break;

        default:
            http_response_code(400);
            throw new Exception("Invalid action specified.");
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
    error_log("Error in performanceReport.php: " . $e->getMessage());
}
?>