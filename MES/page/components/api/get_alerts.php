<?php
require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../../auth/check_auth.php';

try {
    // รวมยอดสต็อกคงเหลือทั้งหมดของแต่ละ item จากทุกคลัง (ยกเว้น Warehouse)
    $onhandSql = "
        SELECT 
            i.item_id,
            i.sap_no,
            i.part_no,
            i.min_stock,
            SUM(ISNULL(h.quantity, 0)) as total_onhand
        FROM " . ITEMS_TABLE . " i
        LEFT JOIN " . ONHAND_TABLE . " h ON i.item_id = h.parameter_id
        LEFT JOIN " . LOCATIONS_TABLE . " l ON h.location_id = l.location_id
        WHERE i.is_active = 1 
          AND i.min_stock > 0
          AND (l.location_name NOT LIKE '%WAREHOUSE%' OR l.location_name IS NULL)
        GROUP BY i.item_id, i.sap_no, i.part_no, i.min_stock
    ";

    // ค้นหารายการที่ยอดรวมต่ำกว่า min_stock
    $alertSql = "
        SELECT * FROM ({$onhandSql}) AS OnhandSummary
        WHERE total_onhand < min_stock
        ORDER BY sap_no
    ";
    
    $stmt = $pdo->query($alertSql);
    $alerts = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(['success' => true, 'alerts' => $alerts]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>