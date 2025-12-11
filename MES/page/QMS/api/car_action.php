<?php
// MES/page/QMS/api/car_action.php

header('Content-Type: application/json');
require_once '../../../config/config.php';
require_once '../../db.php';

session_start();
if (!isset($_SESSION['user'])) {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Unauthorized']);
    exit;
}

$action = $_POST['action'] ?? '';

if ($action === 'issue_car') {
    try {
        $pdo->beginTransaction();

        $case_id = $_POST['case_id'];
        $qa_desc = $_POST['qa_issue_description'];

        // 1. สร้าง Token ลับ (สุ่มตัวอักษร 32 ตัว)
        $token = bin2hex(random_bytes(16));
        
        // 2. ตั้งวันหมดอายุ (เช่น 7 วัน)
        $expiry = date('Y-m-d H:i:s', strtotime('+7 days'));

        // 3. บันทึก/อัปเดต ตาราง QMS_CAR
        // ใช้ MERGE (เผื่อ QC กดซ้ำ หรือแก้คำพูด จะได้ไม่ออก CAR ซ้อน)
        $sqlCAR = "
            MERGE INTO " . QMS_CAR_TABLE . " AS target
            USING (SELECT ? AS case_id) AS source
            ON (target.case_id = source.case_id)
            WHEN MATCHED THEN
                UPDATE SET 
                    qa_issue_description = ?, 
                    access_token = ?, 
                    token_expiry = ?
            WHEN NOT MATCHED THEN
                INSERT (case_id, qa_issue_description, access_token, token_expiry)
                VALUES (?, ?, ?, ?);
        ";

        $stmt = $pdo->prepare($sqlCAR);
        // Parameter ต้องเรียงตามลำดับเครื่องหมาย ? ใน SQL
        $stmt->execute([
            $case_id,           // source.case_id
            $qa_desc, $token, $expiry, // UPDATE SET
            $case_id, $qa_desc, $token, $expiry // INSERT VALUES
        ]);

        // 4. อัปเดตสถานะเคสหลัก
        $sqlCase = "UPDATE " . QMS_CASES_TABLE . " 
                    SET current_status = 'SENT_TO_CUSTOMER', updated_at = GETDATE() 
                    WHERE case_id = ?";
        $stmtCase = $pdo->prepare($sqlCase);
        $stmtCase->execute([$case_id]);

        $pdo->commit();

        echo json_encode([
            'status' => 'success', 
            'message' => 'สร้าง CAR สำเร็จ',
            'token' => $token
        ]);

    } catch (Exception $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
    }
}
?>