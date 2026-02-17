<?php
// MES/page/autoInvoice/api/api_invoice.php

// 1. Header & Error Handling
header('Content-Type: application/json; charset=utf-8');
ini_set('display_errors', 0);
error_reporting(E_ALL);

require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../../auth/check_auth.php';
require_once __DIR__ . '/../../../config/config.php';

// 2. Auth Check
if (!isset($_SESSION['user'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

$currentUser = $_SESSION['user'];
$updatedBy = $currentUser['username'];
$userId = $currentUser['id'] ?? 0;

// 3. Input Handling
$input = json_decode(file_get_contents('php://input'), true);
$action = $_GET['action'] ?? ($input['action'] ?? '');

// 4. Performance (Unlock Session)
session_write_close();

try {
    global $pdo; // อ้างอิงตัวแปร Database Connection

    switch ($action) {

        // ======================================================================
        // CASE: get_history (ดึงประวัติ Invoice ไปโชว์ที่ตาราง)
        // ======================================================================
        case 'get_history':
            $sql = "SELECT 
                        id, invoice_no, version, total_amount, 
                        is_active, created_at, remark
                    FROM dbo.FINANCE_INVOICES WITH (NOLOCK)
                    ORDER BY invoice_no ASC, version DESC";
                    
            $stmt = $pdo->query($sql);
            $invoices = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode(['success' => true, 'data' => $invoices]);
            break;

        // ======================================================================
        // CASE: import_invoice (รับ JSON จาก Client-side JS ไปบันทึกลง DB)
        // ======================================================================
        case 'import_invoice':
            if (!hasRole(['admin', 'creator', 'supervisor'])) {
                throw new Exception("คุณไม่มีสิทธิ์นำเข้าข้อมูล Invoice");
            }

            if (empty($input['invoices'])) {
                throw new Exception("ไม่มีข้อมูลที่ถูกส่งมา (Payload ว่างเปล่า)");
            }

            $reportId = (int)($input['report_id'] ?? 0);
            $remark = trim($input['remark'] ?? 'Bulk Import via Browser');

            // เตรียม Execute Stored Procedure
            $sql = "EXEC dbo.sp_Finance_ImportInvoice ?, ?, ?, ?, ?, ?, ?";
            $stmt = $pdo->prepare($sql);

            $successCount = 0;
            $processedInvoices = [];

            // 🔥 บังคับเปิด Transaction ระดับ PHP ควบคุม Bulk Insert
            $pdo->beginTransaction(); 

            foreach ($input['invoices'] as $invNo => $invData) {
                $stmt->execute([
                    $invNo,
                    $reportId,
                    json_encode($invData['customerData'], JSON_UNESCAPED_UNICODE),
                    json_encode($invData['shippingData'], JSON_UNESCAPED_UNICODE),
                    json_encode($invData['details'], JSON_UNESCAPED_UNICODE),
                    $userId,
                    $remark
                ]);

                $result = $stmt->fetch(PDO::FETCH_ASSOC);
                if ($result && $result['success'] == 1) {
                    $successCount++;
                    $processedInvoices[] = $invNo . " (v" . $result['current_version'] . ")";
                } else {
                    // ถ้ามีบิลไหนพัง ให้โยน Error ไปเข้า Catch เพื่อ Rollback ทั้งยวงทันที
                    throw new Exception("เกิดข้อผิดพลาดในการนำเข้าบิล: " . $invNo);
                }
            }

            $pdo->commit(); // ถ้าผ่านทุกลูปถึงจะ Save ลง DB จริงๆ

            if ($successCount > 0) {
                echo json_encode([
                    "success" => true,
                    "message" => "นำเข้าสำเร็จ $successCount บิล ได้แก่: " . implode(", ", $processedInvoices)
                ]);
            }
            break;

        // ======================================================================
        // DEFAULT: กรณีเรียก Action ผิด
        // ======================================================================
        default:
            throw new Exception("Invalid Action or Method");
    }

} catch (Exception $e) {
    // Error Handling ตามมาตรฐาน
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>