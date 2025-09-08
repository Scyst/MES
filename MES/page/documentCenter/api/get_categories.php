<?php
// MES/page/documentCenter/api/get_categories.php

header('Content-Type: application/json');
error_reporting(0);
ini_set('display_errors', 0);

require_once __DIR__ . '/../../../auth/check_auth.php';
require_once __DIR__ . '/../../db.php';

try {
    // ดึงรายชื่อ category ทั้งหมดที่ไม่ซ้ำกัน และไม่เป็นค่าว่าง
    $sql = "SELECT DISTINCT category FROM dbo.DOCUMENTS WHERE category IS NOT NULL AND category != '' ORDER BY category ASC";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute();
    
    // ใช้ fetchAll(PDO::FETCH_COLUMN, 0) เพื่อให้ได้ผลลัพธ์เป็น Array ของ string โดยตรง
    // เช่น ["Drawing/MachineA", "SOP/Assembly"]
    $categories = $stmt->fetchAll(PDO::FETCH_COLUMN, 0);

    echo json_encode(['success' => true, 'data' => $categories]);

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'An internal server error occurred.',
        'debug_message' => $e->getMessage()
    ]);
}
?>