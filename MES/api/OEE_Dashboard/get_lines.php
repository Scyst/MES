<?php
require_once __DIR__ . '/../db.php';

try {
    // เตรียม SQL ดึงรายชื่อ line ที่ไม่ซ้ำกัน
    $sql = "SELECT DISTINCT line FROM IOT_TOOLBOX_PARAMETER WHERE line IS NOT NULL ORDER BY line";
    $stmt = $pdo->query($sql);
    $lines = $stmt->fetchAll(PDO::FETCH_COLUMN);

    // ส่งผลลัพธ์กลับเป็น JSON
    echo json_encode(['success' => true, 'data' => $lines]);

} catch (PDOException $e) {
    // กรณีเกิดข้อผิดพลาด: ตอบกลับด้วยสถานะ 500 และบันทึก log
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Failed to fetch lines.']);
    error_log("Error in get_lines.php: " . $e->getMessage());
}
?>