<?php
require_once __DIR__ . '/../db.php';

try {
    // เตรียม SQL ดึงรายชื่อ model ที่ไม่ซ้ำกัน
    $sql = "SELECT DISTINCT model FROM PARAMETER WHERE model IS NOT NULL ORDER BY model";
    $stmt = $pdo->query($sql);
    $models = $stmt->fetchAll(PDO::FETCH_COLUMN);

    // ส่งผลลัพธ์กลับเป็น JSON
    echo json_encode(['success' => true, 'data' => $models]);

} catch (PDOException $e) {
    // กรณีเกิดข้อผิดพลาด: ตอบกลับด้วยสถานะ 500 และบันทึก log
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Failed to fetch models.']);
    
    error_log("Error in get_models.php: " . $e->getMessage());
}
?>