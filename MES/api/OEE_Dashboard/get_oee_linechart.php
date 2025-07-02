<?php
require_once __DIR__ . '/../db.php';

try {
    // รับค่า Filter และกำหนดค่าเริ่มต้นหากไม่ได้ส่งมา
    $startDateStr = $_GET['startDate'] ?? date('Y-m-d', strtotime('-29 days'));
    $endDateStr   = $_GET['endDate'] ?? date('Y-m-d');
    $line         = !empty($_GET['line']) ? $_GET['line'] : null;
    $model        = !empty($_GET['model']) ? $_GET['model'] : null;

    // แปลง String เป็น DateTime Object เพื่อคำนวณ
    $startDate = new DateTime($startDateStr);
    $endDate   = new DateTime($endDateStr);
    
    // ตรวจสอบและปรับช่วงวันที่ขั้นต่ำให้เป็น 14 วันเพื่อให้กราฟมีความหมาย
    $dayDifference = $startDate->diff($endDate)->days;
    if ($dayDifference < 14) {
        $startDate = (clone $endDate)->modify('-14 days');
    }

    // เรียกใช้งาน Stored Procedure พร้อมกับส่งค่าพารามิเตอร์
    $sql = "EXEC dbo.sp_CalculateOEE_LineChart @StartDate = ?, @EndDate = ?, @Line = ?, @Model = ?";
    $stmt = $pdo->prepare($sql);
    
    $stmt->execute([
        $startDate->format('Y-m-d'),
        $endDate->format('Y-m-d'),
        $line,
        $model
    ]);

    // ดึงข้อมูลทั้งหมดที่ได้จากการประมวลผล
    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $records = [];

    // จัดรูปแบบผลลัพธ์แต่ละแถวให้เหมาะกับการใช้งานใน Frontend
    foreach ($results as $row) {
        $dateObj = new DateTime($row['date']);
        $records[] = [
            "date"         => $dateObj->format('d-m-y'),
            "availability" => (float)$row['availability'],
            "performance"  => (float)$row['performance'],
            "quality"      => (float)$row['quality'],
            "oee"          => (float)$row['oee']
        ];
    }

    // ส่งข้อมูลที่จัดรูปแบบแล้วกลับไปเป็น JSON
    echo json_encode(["success" => true, "records" => $records]);

} catch (Exception $e) {
    // กรณีเกิดข้อผิดพลาด: ตอบกลับด้วยสถานะ 500 และบันทึก log
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'An error occurred: ' . $e->getMessage()]);
    error_log("Error in get_oee_linechart.php: " . $e->getMessage());
}
?>