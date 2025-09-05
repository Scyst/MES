<?php
require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../../auth/check_auth.php';

try {
    // --- 1. นับสต็อกที่ต่ำกว่า Min Stock ---
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

    // --- 2. นับใบสั่งงาน (สำหรับอนาคต) ---
    // (ตอนนี้จะใส่เป็น 0 ไปก่อน)
    $jobOrderCount = 0;

    // --- 3. รวบรวมข้อมูลทั้งหมด ---
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