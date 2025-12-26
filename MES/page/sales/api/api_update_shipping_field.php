<?php
require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $id = $_POST['id'];
    $field = $_POST['field'];
    $value = $_POST['value'];

    // Whitelist field เพื่อความปลอดภัย (ป้องกัน SQL Injection)
    $allowed_fields = ['is_production_done', 'is_loading_done', 'pickup_date', 'return_date', 'remark'];
    
    if (in_array($field, $allowed_fields)) {
        
        // ถ้าเป็นวันที่ว่างเปล่า ให้ส่ง NULL เข้า DB
        if (($field == 'pickup_date' || $field == 'return_date') && empty($value)) {
            $sql = "UPDATE SALES_ORDERS SET $field = NULL, updated_at = GETDATE() WHERE id = ?";
            $params = array($id);
        } else {
            $sql = "UPDATE SALES_ORDERS SET $field = ?, updated_at = GETDATE() WHERE id = ?";
            $params = array($value, $id);
        }

        $stmt = sqlsrv_query($conn, $sql, $params);
        
        if ($stmt) {
            echo json_encode(['status' => 'success']);
        } else {
            echo json_encode(['status' => 'error']);
        }
    }
}
?>