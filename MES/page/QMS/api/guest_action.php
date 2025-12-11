<?php
// MES/page/QMS/api/guest_action.php

header('Content-Type: application/json');
require_once '../../../config/config.php';
require_once '../../db.php';

// *ไม่ต้อง check_auth เพราะลูกค้าไม่มี session*

$action = $_POST['action'] ?? '';

if ($action === 'customer_reply') {
    try {
        $token = $_POST['token'] ?? '';
        $root_cause = $_POST['root_cause'] ?? '';
        $action_plan = $_POST['action_plan'] ?? '';

        if (empty($token)) throw new Exception("Invalid Token");

        // 1. ตรวจสอบ Token อีกครั้งเพื่อความชัวร์
        $sqlCheck = "SELECT case_id FROM " . QMS_CAR_TABLE . " WHERE access_token = ? AND token_expiry > GETDATE()";
        $stmtCheck = $pdo->prepare($sqlCheck);
        $stmtCheck->execute([$token]);
        $car = $stmtCheck->fetch(PDO::FETCH_ASSOC);

        if (!$car) throw new Exception("Invalid or Expired Token");

        $case_id = $car['case_id'];

        $pdo->beginTransaction();

        // รับค่าใหม่
        $containment = $_POST['containment_action'] ?? '';
        $rc_type = $_POST['root_cause_category'] ?? '';
        $leak = $_POST['leak_cause'] ?? '';

        // อัปเดตข้อมูล (เพิ่มฟิลด์ใหม่ลงไป)
        $sqlUpdateCAR = "UPDATE " . QMS_CAR_TABLE . " 
                        SET customer_root_cause = ?, 
                            customer_action_plan = ?,
                            containment_action = ?,
                            root_cause_category = ?,
                            leak_cause = ?,
                            customer_respond_date = GETDATE()
                        WHERE access_token = ?";
        $stmtUpdate = $pdo->prepare($sqlUpdateCAR);
        $stmtUpdate->execute([$root_cause, $action_plan, $containment, $rc_type, $leak, $token]);
        
        // 3. อัปเดตสถานะเคสหลัก เป็น 'CUSTOMER_REPLIED'
        $sqlUpdateCase = "UPDATE " . QMS_CASES_TABLE . " 
                          SET current_status = 'CUSTOMER_REPLIED', updated_at = GETDATE()
                          WHERE case_id = ?";
        $stmtCase = $pdo->prepare($sqlUpdateCase);
        $stmtCase->execute([$case_id]);

        $pdo->commit();

        echo json_encode(['status' => 'success', 'message' => 'Response saved']);

    } catch (Exception $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        http_response_code(400); // Bad Request
        echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
    }
}
?>