<?php
// MES/page/QMS/api/claim_action.php

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

if ($action === 'close_claim') {
    try {
        $pdo->beginTransaction();

        $case_id = $_POST['case_id'];
        $disposition = $_POST['disposition'];
        $final_qty = $_POST['final_qty'] ?? 0;
        $cost = $_POST['cost_estimation'] ?? 0;
        $user_id = $_SESSION['user']['id'];

        // 1. บันทึก/อัปเดต ตาราง QMS_CLAIM
        $sqlClaim = "
            MERGE INTO " . QMS_CLAIM_TABLE . " AS target
            USING (SELECT ? AS case_id) AS source
            ON (target.case_id = source.case_id)
            WHEN MATCHED THEN
                UPDATE SET 
                    disposition = ?, final_qty = ?, cost_estimation = ?, 
                    approved_by = ?, closed_at = GETDATE()
            WHEN NOT MATCHED THEN
                INSERT (case_id, disposition, final_qty, cost_estimation, approved_by, closed_at)
                VALUES (?, ?, ?, ?, ?, GETDATE());
        ";

        $stmt = $pdo->prepare($sqlClaim);
        $stmt->execute([
            $case_id,
            $disposition, $final_qty, $cost, $user_id, // UPDATE
            $case_id, $disposition, $final_qty, $cost, $user_id // INSERT
        ]);

        // 2. อัปเดตสถานะเคสหลัก เป็น 'CLOSED'
        $sqlCase = "UPDATE " . QMS_CASES_TABLE . " 
                    SET current_status = 'CLOSED', updated_at = GETDATE() 
                    WHERE case_id = ?";
        $stmtCase = $pdo->prepare($sqlCase);
        $stmtCase->execute([$case_id]);

        $pdo->commit();

        echo json_encode(['status' => 'success', 'message' => 'ปิดงานเคลมเรียบร้อยแล้ว']);

    } catch (Exception $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
    }
}
?>