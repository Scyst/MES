<?php
header('Content-Type: application/json');
require_once __DIR__ . '/../../../config/config.php';
require_once __DIR__ . '/../../db.php';

$action = isset($_POST['action']) ? $_POST['action'] : '';

try {
    switch ($action) {
        case 'search':
            $keyword = isset($_POST['keyword']) ? trim($_POST['keyword']) : '';
            if (empty($keyword)) {
                throw new Exception("Empty keyword");
            }

            $sql = "SELECT TOP 10 
                        r.id as report_id, s.po_number, s.snc_ci_no, r.container_no, r.loading_start_time
                    FROM " . LOADING_REPORTS_TABLE . " r WITH (NOLOCK)
                    JOIN " . SALES_ORDERS_TABLE . " s WITH (NOLOCK) ON r.sales_order_id = s.id
                    WHERE r.status = 'COMPLETED'
                      AND (s.po_number = ? OR s.snc_ci_no = ? OR s.booking_no = ? OR r.container_no = ?)
                    ORDER BY r.loading_start_time DESC";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$keyword, $keyword, $keyword, $keyword]);
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode(['success' => true, 'data' => $data]);
            break;

        default:
            echo json_encode(['success' => false, 'message' => 'Invalid action']);
            break;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Server Error: ' . $e->getMessage()]);
}
?>