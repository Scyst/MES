<?php
// MES/page/QMS/api/get_cases.php

header('Content-Type: application/json');
require_once '../../../config/config.php';
require_once '../../db.php';

session_start();
if (!isset($_SESSION['user'])) {
    http_response_code(401);
    exit;
}

try {
    $search = $_GET['search'] ?? '';
    
    // Query เชื่อมตาราง CASES (หลัก) + NCR (รายละเอียดเบื้องต้น) + USERS
    $sql = "SELECT 
                c.case_id, 
                c.car_no, 
                c.case_date, 
                c.customer_name, 
                c.product_name, 
                c.current_status,
                n.defect_type, 
                n.defect_qty,
                u.username as created_by_name
            FROM " . QMS_CASES_TABLE . " c
            LEFT JOIN " . QMS_NCR_TABLE . " n ON c.case_id = n.case_id
            LEFT JOIN " . USERS_TABLE . " u ON c.created_by = u.id
            WHERE 1=1 ";

    $params = [];

    // ระบบค้นหา
    if (!empty($search)) {
        $sql .= " AND (c.car_no LIKE ? OR c.customer_name LIKE ? OR c.product_name LIKE ?) ";
        $term = "%$search%";
        $params[] = $term; $params[] = $term; $params[] = $term;
    }

    $sql .= " ORDER BY c.case_id DESC"; // ใหม่สุดขึ้นก่อน

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // คำนวณ Stats (สรุปยอด)
    $sqlStats = "SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN current_status = 'NCR_CREATED' THEN 1 ELSE 0 END) as ncr_count,
                    SUM(CASE WHEN current_status = 'SENT_TO_CUSTOMER' THEN 1 ELSE 0 END) as car_count,
                    SUM(CASE WHEN current_status = 'CUSTOMER_REPLIED' THEN 1 ELSE 0 END) as reply_count,
                    SUM(CASE WHEN current_status = 'CLOSED' THEN 1 ELSE 0 END) as closed_count
                 FROM " . QMS_CASES_TABLE;
    $stats = $pdo->query($sqlStats)->fetch(PDO::FETCH_ASSOC);

    echo json_encode(['status' => 'success', 'data' => $data, 'stats' => $stats]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
?>