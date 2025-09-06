<?php
require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../../auth/check_auth.php';

if (!defined('JOB_ORDERS_TABLE')) {
    define('JOB_ORDERS_TABLE', 'JOB_ORDERS');
}

try {
    // --- 1. นับสต็อกที่ต่ำกว่า Min Stock ---
    $onhandSql = "
        SELECT 
            i.item_id, i.min_stock, SUM(ISNULL(h.quantity, 0)) as total_onhand
        FROM " . ITEMS_TABLE . " i
        LEFT JOIN " . ONHAND_TABLE . " h ON i.item_id = h.parameter_id
        WHERE i.is_active = 1 AND i.min_stock > 0 AND i.is_tracking = 1
        GROUP BY i.item_id, i.min_stock
    ";
    $alertSql = "SELECT COUNT(*) FROM ({$onhandSql}) AS Summary WHERE total_onhand < min_stock";
    $stmt = $pdo->query($alertSql);
    $lowStockCount = (int)$stmt->fetchColumn();

    // --- 2. นับใบสั่งงาน ---
    $jobOrderSql = "SELECT COUNT(*) FROM " . JOB_ORDERS_TABLE . " WHERE status IN ('PENDING', 'IN_PROGRESS')";
    $stmt = $pdo->query($jobOrderSql);
    $jobOrderCount = (int)$stmt->fetchColumn();

    // --- 3. รวบรวมข้อมูลทั้งหมด ---
    $totalAlerts = $lowStockCount + $jobOrderCount;

    // 3.1 สร้างข้อมูลสำหรับ "รายการแจ้งเตือน" (ที่มี Badge)
    $notification_categories = [
        [
            'id' => 'stock_management', 
            'name' => 'จัดการสต็อก',
            'count' => $lowStockCount,
            'icon' => 'fas fa-box',
            'type' => 'notification'
        ],
        [
            'id' => 'job_order_management', 
            'name' => 'จัดการใบสั่งงาน',
            'count' => $jobOrderCount,
            'icon' => 'fas fa-tasks',
            'type' => 'notification'
        ]
    ];

    // 3.2 ตอนนี้เราไม่มี Action แยกแล้ว
    $actions = [];

    // 3.3 รวมข้อมูล (ตอนนี้มีแค่ notifications)
    $all_categories = array_merge($notification_categories, $actions);

    $summary = [
        'total_alerts' => $totalAlerts,
        'categories' => $all_categories
    ];

    echo json_encode(['success' => true, 'summary' => $summary]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>