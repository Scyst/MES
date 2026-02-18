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
        // CASE: get_history (ดึงประวัติ Invoice ไปโชว์ที่ตารางหน้า Dashboard)
        // ======================================================================
        case 'get_history':
            $startDate = $_GET['start'] ?? '';
            $endDate = $_GET['end'] ?? '';

            $whereSql = "is_active = 1"; // โชว์เฉพาะเวอร์ชันล่าสุด
            $params = [];

            // ถ้ามีการส่งช่วงวันที่มา ให้ต่อ SQL WHERE เข้าไป
            if ($startDate && $endDate) {
                $whereSql .= " AND CAST(created_at AS DATE) BETWEEN ? AND ?";
                $params[] = $startDate;
                $params[] = $endDate;
            }

            // เพิ่ม doc_status เข้ามาใน SELECT
            $sql = "SELECT TOP 100 
                        id, invoice_no, version, total_amount, created_at, 
                        customer_data_json, shipping_data_json, 
                        ISNULL(doc_status, 'Pending') AS doc_status
                    FROM dbo.FINANCE_INVOICES WITH (NOLOCK) 
                    WHERE $whereSql 
                    ORDER BY created_at DESC";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $invoices = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $data = array_map(function($row) {
                $customer = json_decode($row['customer_data_json'], true) ?: [];
                $shipping = json_decode($row['shipping_data_json'], true) ?: [];
                return [
                    'id' => $row['id'],
                    'invoice_no' => $row['invoice_no'],
                    'version' => $row['version'],
                    'doc_status' => $row['doc_status'],
                    'customer_name' => $customer['name'] ?? '-',
                    'container_no' => $shipping['container_no'] ?? '-',
                    'vessel' => $shipping['feeder_vessel'] ?? '-',
                    'etd_date' => $shipping['etd_date'] ?? '-',
                    'eta_date' => $shipping['eta_date'] ?? '-',
                    'total_amount' => number_format($row['total_amount'], 2),
                    'created_at' => date('d/m/Y H:i', strtotime($row['created_at']))
                ];
            }, $invoices);

            echo json_encode(['success' => true, 'data' => $data]);
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
        // CASE: get_versions (ดึงประวัติทุกเวอร์ชันของ Invoice ที่เลือก)
        // ======================================================================
        case 'get_versions':
            $invoice_no = $_GET['invoice_no'] ?? ($input['invoice_no'] ?? '');
            if (!$invoice_no) {
                throw new Exception("ระบุเลข Invoice ไม่ถูกต้อง");
            }

            $sql = "SELECT 
                        id, 
                        invoice_no, 
                        version, 
                        total_amount, 
                        is_active, 
                        created_at, 
                        remark 
                    FROM dbo.FINANCE_INVOICES WITH (NOLOCK) 
                    WHERE invoice_no = ? 
                    ORDER BY version DESC";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$invoice_no]);
            $versions = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Format ข้อมูลก่อนส่งกลับให้ Frontend
            $data = array_map(function($row) {
                return [
                    'id' => $row['id'],
                    'invoice_no' => $row['invoice_no'],
                    'version' => $row['version'],
                    'total_amount' => number_format($row['total_amount'], 2),
                    'is_active' => $row['is_active'],
                    'created_at' => date('d/m/Y H:i', strtotime($row['created_at'])),
                    'remark' => $row['remark'] ? $row['remark'] : '-'
                ];
            }, $versions);

            echo json_encode(['success' => true, 'data' => $data]);
            break;

        // ======================================================================
        // CASE: get_invoice_detail (ดึงข้อมูลบิล 1 ใบแบบเต็มรูปแบบเพื่อนำไป Edit)
        // ======================================================================
        case 'get_invoice_detail':
            $id = $_GET['id'] ?? 0;
            if (!$id) throw new Exception("ไม่พบรหัส Invoice");

            // 1. ดึง Header (ข้อมูลลูกค้า + ข้อมูลขนส่ง)
            $stmt = $pdo->prepare("SELECT * FROM dbo.FINANCE_INVOICES WITH (NOLOCK) WHERE id = ?");
            $stmt->execute([$id]);
            $header = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$header) throw new Exception("ไม่พบข้อมูล Invoice ในระบบ");

            // 2. ดึง Details (รายการสินค้าทั้งหมด)
            $stmtDet = $pdo->prepare("SELECT * FROM dbo.FINANCE_INVOICE_DETAILS WITH (NOLOCK) WHERE invoice_id = ? ORDER BY detail_id ASC");
            $stmtDet->execute([$id]);
            $details = $stmtDet->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode([
                'success' => true,
                'header' => $header,
                'customer' => json_decode($header['customer_data_json'], true) ?: [],
                'shipping' => json_decode($header['shipping_data_json'], true) ?: [],
                'details' => $details
            ]);
            break;

        // ======================================================================
        // CASE: update_status (เปลี่ยนสถานะ หรือ ยกเลิกบิล)
        // ======================================================================
        case 'update_status':
            $invoice_no = $input['invoice_no'] ?? '';
            $status = $input['status'] ?? '';
            $remark = $input['remark'] ?? ''; // เหตุผลที่ยกเลิก
            
            if (!$invoice_no || !$status) throw new Exception("ข้อมูลไม่ครบถ้วน");

            $sql = "UPDATE dbo.FINANCE_INVOICES SET doc_status = ? WHERE invoice_no = ? AND is_active = 1";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$status, $invoice_no]);

            // ถ้ายกเลิกบิล (Voided) ให้ใส่เหตุผลลงไปใน Remark ด้วย
            if ($status === 'Voided' && $remark) {
                 $sqlRem = "UPDATE dbo.FINANCE_INVOICES SET remark = CONCAT('[VOID] ', ?, ' | ', ISNULL(remark,'')) WHERE invoice_no = ? AND is_active = 1";
                 $pdo->prepare($sqlRem)->execute([$remark, $invoice_no]);
            }

            echo json_encode(['success' => true, 'message' => "อัปเดตสถานะเป็น $status สำเร็จ"]);
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