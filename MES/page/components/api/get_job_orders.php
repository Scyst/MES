<?php
require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../../auth/check_auth.php';

// กำหนดชื่อตาราง (ถ้ายังไม่มีใน db.php)
if (!defined('JOB_ORDERS_TABLE')) {
    define('JOB_ORDERS_TABLE', 'job_orders');
}

try {
    $sql = "
        SELECT 
            jo.job_order_id,
            jo.job_order_number,
            jo.quantity_required,
            jo.due_date,
            jo.status,
            i.part_no
        FROM 
            " . JOB_ORDERS_TABLE . " jo
        LEFT JOIN 
            " . ITEMS_TABLE . " i ON jo.item_id = i.item_id
        WHERE 
            jo.status IN ('PENDING', 'IN_PROGRESS')
        ORDER BY 
            jo.due_date ASC, jo.created_at ASC
    ";
    
    $stmt = $pdo->query($sql);
    $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // ส่งข้อมูลกลับไปเป็น JSON
    echo json_encode(['success' => true, 'orders' => $orders]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>