<?php
// MES/api/finance/api_get_invoice_history.php
require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../../auth/check_auth.php';
require_once __DIR__ . '/../../../config/config.php';
header('Content-Type: application/json; charset=utf-8');

try {
    global $pdo;
    // ดึงข้อมูล Group ตาม Invoice No. โดยแสดง Version ล่าสุดอยู่บนสุด
    $sql = "SELECT 
                id, invoice_no, version, total_amount, 
                is_active, created_at, remark
            FROM dbo.FINANCE_INVOICES WITH (NOLOCK)
            ORDER BY invoice_no ASC, version DESC";
            
    $stmt = $pdo->query($sql);
    $invoices = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(["success" => true, "data" => $invoices]);

} catch (Exception $e) {
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
?>