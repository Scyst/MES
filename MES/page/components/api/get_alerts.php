<?php
require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../../auth/check_auth.php';

try {
    $onhandSql = "
        SELECT 
            i.item_id, i.sap_no, i.part_no, i.min_stock, i.is_tracking,
            SUM(ISNULL(h.quantity, 0)) as total_onhand
        FROM " . ITEMS_TABLE . " i
        LEFT JOIN " . ONHAND_TABLE . " h ON i.item_id = h.parameter_id
        LEFT JOIN " . LOCATIONS_TABLE . " l ON h.location_id = l.location_id
        WHERE i.is_active = 1 
          AND (l.location_name NOT LIKE '%WAREHOUSE%' OR l.location_name IS NULL)
        GROUP BY i.item_id, i.sap_no, i.part_no, i.min_stock, i.is_tracking
    ";

    // ★★★ แก้ไข CASE statement ให้มี 3 สถานะ ★★★
    $alertSql = "
        SELECT 
            *,
            CASE 
                WHEN total_onhand <= 0 THEN 'EMPTY'
                WHEN total_onhand < min_stock THEN 'LOW'
                ELSE 'OK'
            END AS stock_status,
            CASE
                WHEN total_onhand <= 0 THEN 1
                WHEN total_onhand < min_stock THEN 2
                ELSE 3
            END AS sort_priority
        FROM ({$onhandSql}) AS OnhandSummary
        WHERE is_tracking = 1
        ORDER BY 
            sort_priority ASC,
            sap_no ASC
    ";

    $stmt = $pdo->query($alertSql);
    $tracked_items = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(['success' => true, 'alerts' => $tracked_items]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>