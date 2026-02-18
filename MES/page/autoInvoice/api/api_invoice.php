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
    global $pdo;

    switch ($action) {

        case 'get_history':
            $startDate = $_GET['start'] ?? '';
            $endDate = $_GET['end'] ?? '';

            $whereSql = "is_active = 1";
            $params = [];
            $topLimit = "TOP 100";

            if ($startDate && $endDate) {
                $whereSql .= " AND CAST(created_at AS DATE) BETWEEN ? AND ?";
                $params[] = $startDate;
                $params[] = $endDate;
                $topLimit = ""; 
            }

            $sql = "SELECT $topLimit 
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
                    'total_amount' => number_format((float)$row['total_amount'], 2),
                    'created_at' => date('d/m/Y H:i', strtotime($row['created_at']))
                ];
            }, $invoices);

            echo json_encode(['success' => true, 'data' => $data]);
            break;

        case 'import_invoice':
            if (!hasRole(['admin', 'creator', 'supervisor'])) {
                throw new Exception("คุณไม่มีสิทธิ์นำเข้าข้อมูล Invoice");
            }

            if (empty($input['invoices'])) {
                throw new Exception("ไม่มีข้อมูลที่ถูกส่งมา (Payload ว่างเปล่า)");
            }

            $reportId = (int)($input['report_id'] ?? 0);
            $remark = trim($input['remark'] ?? 'Bulk Import via Browser');

            $sql = "EXEC dbo.sp_Finance_ImportInvoice ?, ?, ?, ?, ?, ?, ?";
            $stmt = $pdo->prepare($sql);

            $successCount = 0;
            $processedInvoices = [];

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
                    throw new Exception("เกิดข้อผิดพลาดจาก Stored Procedure ระหว่างนำเข้าบิล: " . $invNo);
                }
            }

            $pdo->commit(); 

            if ($successCount > 0) {
                echo json_encode([
                    "success" => true,
                    "message" => "นำเข้าสำเร็จ $successCount บิล ได้แก่: " . implode(", ", $processedInvoices)
                ]);
            }
            break;

        case 'get_versions':
            $invoice_no = $_GET['invoice_no'] ?? ($input['invoice_no'] ?? '');
            if (!$invoice_no) throw new Exception("ระบุเลข Invoice ไม่ถูกต้อง");

            $sql = "SELECT 
                        id, invoice_no, version, total_amount, is_active, 
                        created_at, remark, doc_status, void_reason
                    FROM dbo.FINANCE_INVOICES WITH (NOLOCK) 
                    WHERE invoice_no = ? 
                    ORDER BY version DESC";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$invoice_no]);
            $versions = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $data = array_map(function($row) {
                return [
                    'id' => $row['id'],
                    'invoice_no' => $row['invoice_no'],
                    'version' => $row['version'],
                    'doc_status' => $row['doc_status'] ?? 'Pending',
                    'total_amount' => number_format((float)$row['total_amount'], 2),
                    'is_active' => $row['is_active'],
                    'created_at' => date('d/m/Y H:i', strtotime($row['created_at'])),
                    'remark' => $row['remark'] ? $row['remark'] : '-',
                    'void_reason' => $row['void_reason'] ? $row['void_reason'] : ''
                ];
            }, $versions);

            echo json_encode(['success' => true, 'data' => $data]);
            break;

        case 'get_invoice_detail':
            $id = (int)($_GET['id'] ?? 0);
            if (!$id) throw new Exception("ไม่พบรหัส Invoice");

            $stmt = $pdo->prepare("SELECT * FROM dbo.FINANCE_INVOICES WITH (NOLOCK) WHERE id = ?");
            $stmt->execute([$id]);
            $header = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$header) throw new Exception("ไม่พบข้อมูล Invoice ในระบบ");

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

        case 'update_status':
            $invoice_no = $input['invoice_no'] ?? '';
            $status = $input['status'] ?? '';
            $remark = trim($input['remark'] ?? ''); // สำหรับ void_reason
            
            if (!$invoice_no || !$status) throw new Exception("ข้อมูลไม่ครบถ้วน");

            if ($status === 'Voided') {
                if (!$remark) throw new Exception("ต้องระบุเหตุผลการยกเลิกบิล");
                // อัปเดต Column void_reason ตรงๆ ตาม Structure ใหม่
                $sql = "UPDATE dbo.FINANCE_INVOICES 
                        SET doc_status = ?, void_reason = ?
                        WHERE invoice_no = ? AND is_active = 1";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$status, $remark, $invoice_no]);
            } else {
                $sql = "UPDATE dbo.FINANCE_INVOICES SET doc_status = ? WHERE invoice_no = ? AND is_active = 1";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$status, $invoice_no]);
            }

            echo json_encode(['success' => true, 'message' => "อัปเดตสถานะเป็น $status สำเร็จ"]);
            break;

        case 'restore_invoice':
            $invoice_no = $input['invoice_no'] ?? '';
            if (!$invoice_no) throw new Exception("ข้อมูลไม่ครบถ้วน");

            // เคลียร์ void_reason ทิ้ง และปรับ Status เป็น Pending
            $updateSql = "UPDATE dbo.FINANCE_INVOICES 
                          SET doc_status = 'Pending', void_reason = NULL 
                          WHERE invoice_no = ? AND is_active = 1";
            $pdo->prepare($updateSql)->execute([$invoice_no]);

            echo json_encode(['success' => true, 'message' => "กู้คืนบิล $invoice_no สำเร็จ!"]);
            break;

        default:
            throw new Exception("Invalid Action or Method");
    }

} catch (Exception $e) {
    if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>