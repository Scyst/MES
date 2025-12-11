<?php
// MES/page/QMS/api/get_case_detail.php

header('Content-Type: application/json');
require_once '../../../config/config.php';
require_once '../../db.php';

session_start();
if (!isset($_SESSION['user'])) {
    http_response_code(401);
    exit;
}

$case_id = $_GET['case_id'] ?? null;
if (!$case_id) {
    echo json_encode(['status' => 'error', 'message' => 'Missing Case ID']);
    exit;
}

try {
    // 1. ดึงข้อมูลหลัก (Case + NCR + CAR + Claim)
    // ใช้ LEFT JOIN เพราะบางเคสอาจจะยังไม่มี CAR หรือ Claim
    $sql = "SELECT 
                c.case_id, c.car_no, c.case_date, c.current_status, 
                c.customer_name, c.product_name,
                
                n.defect_type, n.defect_qty, n.defect_description, 
                n.production_date, n.lot_no, n.found_shift,
                
                car.qa_issue_description, car.access_token, car.token_expiry, 
                car.customer_root_cause, car.customer_action_plan, car.customer_respond_date,
                
                cl.disposition, cl.cost_estimation, cl.closed_at
                
            FROM " . QMS_CASES_TABLE . " c
            LEFT JOIN " . QMS_NCR_TABLE . " n ON c.case_id = n.case_id
            LEFT JOIN " . QMS_CAR_TABLE . " car ON c.case_id = car.case_id
            LEFT JOIN " . QMS_CLAIM_TABLE . " cl ON c.case_id = cl.case_id
            WHERE c.case_id = ?";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([$case_id]);
    $data = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$data) throw new Exception("Case not found");

    // 2. ดึงรูปภาพทั้งหมด
    $sqlImg = "SELECT att_id, doc_stage, file_path, file_name 
               FROM " . QMS_FILE_TABLE . " 
               WHERE case_id = ? 
               ORDER BY uploaded_at DESC";
    $stmtImg = $pdo->prepare($sqlImg);
    $stmtImg->execute([$case_id]);
    $images = $stmtImg->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'status' => 'success', 
        'data' => $data, 
        'images' => $images
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
?>