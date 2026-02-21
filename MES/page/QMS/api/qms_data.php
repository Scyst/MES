<?php
// MES/page/QMS/api/qms_data.php

header('Content-Type: application/json; charset=utf-8');
require_once '../../../config/config.php';
require_once '../../db.php';

session_start();
if (!isset($_SESSION['user'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'data' => null, 'message' => 'Unauthorized']);
    exit;
}

$action = $_GET['action'] ?? 'list';

try {
    if ($action === 'list') {
        $search = $_GET['search'] ?? '';
        
        $sql = "SELECT 
                    c.case_id, c.car_no, c.case_date, c.customer_name, 
                    c.product_name, c.current_status,
                    n.defect_type, n.defect_qty,
                    u.username as created_by_name
                FROM QMS_CASES c WITH (NOLOCK)
                LEFT JOIN QMS_NCR n WITH (NOLOCK) ON c.case_id = n.case_id
                LEFT JOIN USERS u WITH (NOLOCK) ON c.created_by = u.id
                WHERE 1=1 ";
        $params = [];

        if (!empty($search)) {
            $sql .= " AND (c.car_no LIKE ? OR c.customer_name LIKE ? OR c.product_name LIKE ?) ";
            $term = "%$search%";
            array_push($params, $term, $term, $term);
        }
        $sql .= " ORDER BY c.case_id DESC";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $list = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $sqlStats = "SELECT 
                        COUNT(*) as total,
                        SUM(CASE WHEN current_status = 'NCR_CREATED' THEN 1 ELSE 0 END) as ncr_count,
                        SUM(CASE WHEN current_status = 'SENT_TO_CUSTOMER' THEN 1 ELSE 0 END) as car_count,
                        SUM(CASE WHEN current_status = 'CUSTOMER_REPLIED' THEN 1 ELSE 0 END) as reply_count,
                        SUM(CASE WHEN current_status = 'CLOSED' THEN 1 ELSE 0 END) as closed_count
                     FROM QMS_CASES WITH (NOLOCK)";
        $stmtStats = $pdo->query($sqlStats);
        $stats = $stmtStats->fetch(PDO::FETCH_ASSOC);

        echo json_encode(['success' => true, 'data' => ['list' => $list, 'stats' => $stats], 'message' => 'OK']);

    } elseif ($action === 'detail') {
        $case_id = $_GET['case_id'] ?? null;
        if (!$case_id) throw new Exception("Missing Case ID");

        $sql = "SELECT 
                    c.case_id, c.car_no, c.case_date, c.current_status, c.customer_name, c.product_name,
                    n.defect_type, n.defect_qty, n.defect_description, n.production_date, n.lot_no, n.found_shift,
                    car.qa_issue_description, car.access_token, car.token_expiry, car.customer_root_cause, 
                    car.customer_action_plan, car.customer_respond_date, car.containment_action, 
                    car.root_cause_category, car.leak_cause,
                    car.return_container_no, car.expected_return_qty,
                    cl.disposition, cl.cost_estimation, cl.closed_at, cl.final_qty,
                    cl.actual_received_qty
                FROM QMS_CASES c WITH (NOLOCK)
                LEFT JOIN QMS_NCR n WITH (NOLOCK) ON c.case_id = n.case_id
                LEFT JOIN QMS_CAR car WITH (NOLOCK) ON c.case_id = car.case_id
                LEFT JOIN QMS_CLAIM cl WITH (NOLOCK) ON c.case_id = cl.case_id
                WHERE c.case_id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$case_id]);
        $data = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$data) throw new Exception("Case not found");

        $sqlImg = "SELECT att_id, doc_stage, file_path, file_name FROM QMS_FILE WITH (NOLOCK) WHERE case_id = ? ORDER BY uploaded_at DESC";
        $stmtImg = $pdo->prepare($sqlImg);
        $stmtImg->execute([$case_id]);
        $data['images'] = $stmtImg->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode(['success' => true, 'data' => $data, 'message' => 'OK']);

    } elseif ($action === 'master_data') {
        // ดึงรายการ Line ผลิตที่ Active
        $sqlLine = "SELECT DISTINCT location_name as line_name FROM LOCATIONS WITH (NOLOCK) WHERE is_active = 1 AND location_type = 'WIP' ORDER BY location_name";
        $lines = $pdo->query($sqlLine)->fetchAll(PDO::FETCH_ASSOC);

        // ดึงรายการสินค้าที่มี (Part No & Name) เพื่อทำ Auto-complete
        $sqlItem = "SELECT part_no, part_description as name FROM ITEMS WITH (NOLOCK) WHERE is_active = 1 ORDER BY part_no";
        $items = $pdo->query($sqlItem)->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode(['success' => true, 'data' => ['lines' => $lines, 'items' => $items], 'message' => 'OK']);
        
    } else {
        throw new Exception("Invalid Action");
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'data' => null, 'message' => $e->getMessage()]);
}
?>