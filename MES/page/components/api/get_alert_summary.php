<?php
require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../../auth/check_auth.php';

// ★★★ เพิ่มการกำหนดชื่อตาราง job_orders (ถ้ายังไม่มีใน db.php) ★★★
if (!defined('JOB_ORDERS_TABLE')) {
    define('JOB_ORDERS_TABLE', 'job_orders');
}

try {
    // --- 1. นับสต็อกที่ต่ำกว่า Min Stock --- (เหมือนเดิม)
    $onhandSql = "
        SELECT 
            i.item_id, i.min_stock, SUM(ISNULL(h.quantity, 0)) as total_onhand
        FROM " . ITEMS_TABLE . " i
        LEFT JOIN " . ONHAND_TABLE . " h ON i.item_id = h.parameter_id
        WHERE i.is_active = 1 AND i.min_stock > 0
        GROUP BY i.item_id, i.min_stock
    ";
    $alertSql = "SELECT COUNT(*) FROM ({$onhandSql}) AS Summary WHERE total_onhand < min_stock";
    $stmt = $pdo->query($alertSql);
    $lowStockCount = (int)$stmt->fetchColumn();

    // --- 2. นับใบสั่งงาน (★★★★★★ ส่วนที่แก้ไข ★★★★★★) ---
    // เปลี่ยนจากการกำหนดค่าเป็น 0 มาเป็นการ query จากฐานข้อมูลจริง
    $jobOrderSql = "SELECT COUNT(*) FROM " . JOB_ORDERS_TABLE . " WHERE status IN ('PENDING', 'IN_PROGRESS')";
    $stmt = $pdo->query($jobOrderSql);
    $jobOrderCount = (int)$stmt->fetchColumn();

    // --- 3. รวบรวมข้อมูลทั้งหมด --- (เหมือนเดิม)
    $totalAlerts = $lowStockCount + $jobOrderCount;

    $summary = [
        'total_alerts' => $totalAlerts,
        'categories' => [
            [
                'id' => 'low_stock',
                'name' => 'สต็อกใกล้หมด',
                'count' => $lowStockCount,
                'icon' => 'bi-box-seam-fill'
            ],
            [
                'id' => 'job_orders',
                'name' => 'ใบสั่งงานใหม่',
                'count' => $jobOrderCount,
                'icon' => 'bi-list-check'
            ]
        ]
    ];

    echo json_encode(['success' => true, 'summary' => $summary]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>