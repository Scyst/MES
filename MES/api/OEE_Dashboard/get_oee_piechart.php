<?php
require_once __DIR__ . '/../db.php';

try {
    // รับค่า Filter และกำหนดค่าเริ่มต้นหากไม่ได้ส่งมา
    $startDate = $_GET['startDate'] ?? date('Y-m-d');
    $endDate   = $_GET['endDate'] ?? date('Y-m-d');
    $line      = !empty($_GET['line']) ? $_GET['line'] : null;
    $model     = !empty($_GET['model']) ? $_GET['model'] : null;

    // เตรียมและเรียกใช้งาน Stored Procedure
    $sql = "EXEC dbo.sp_CalculateOEE_PieChart @StartDate = ?, @EndDate = ?, @Line = ?, @Model = ?";
    $stmt = $pdo->prepare($sql);

    // กำหนดค่าพารามิเตอร์แต่ละตัวสำหรับ Stored Procedure
    $stmt->bindParam(1, $startDate, PDO::PARAM_STR);
    $stmt->bindParam(2, $endDate, PDO::PARAM_STR);
    $stmt->bindParam(3, $line, PDO::PARAM_STR);
    $stmt->bindParam(4, $model, PDO::PARAM_STR);

    // สั่งประมวลผล Stored Procedure
    $stmt->execute();

    // ดึงข้อมูลผลลัพธ์ที่คาดว่าจะมีเพียงแถวเดียว
    $result = $stmt->fetch(PDO::FETCH_ASSOC);

    // ตรวจสอบว่ามีข้อมูลส่งกลับมาหรือไม่
    if ($result) {
        // จัดรูปแบบข้อมูลผลลัพธ์ให้อยู่ในโครงสร้างที่ต้องการและแปลงชนิดข้อมูล
        $output = [
            "success" => true,
            "quality" => (float)$result['Quality'],
            "availability" => (float)$result['Availability'],
            "performance" => (float)$result['Performance'],
            "oee" => (float)$result['OEE'],
            "fg" => (int)$result['FG'],
            "defects" => (int)$result['Defects'],
            "ng" => (int)($result['NG'] ?? 0),
            "rework" => (int)($result['Rework'] ?? 0),
            "hold" => (int)($result['Hold'] ?? 0),
            "scrap" => (int)($result['Scrap'] ?? 0),
            "etc" => (int)($result['Etc'] ?? 0),
            "runtime" => (int)$result['Runtime'],
            "planned_time" => (int)$result['PlannedTime'],
            "downtime" => (int)$result['Downtime'],
            "actual_output" => (int)$result['ActualOutput'],
            "debug_info" => [
                "total_theoretical_minutes" => round((float)$result['TotalTheoreticalMinutes'], 2)
            ]
        ];
        // ส่งข้อมูลกลับไปเป็น JSON
        echo json_encode($output);
    } else {
        // หาก Stored Procedure ไม่คืนค่ากลับมา ให้สร้าง Exception
        throw new Exception("Stored procedure did not return a result.");
    }

} catch (Exception $e) {
    // กรณีเกิดข้อผิดพลาด: ตอบกลับด้วยสถานะ 500 และบันทึก log
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'An error occurred: ' . $e->getMessage()]);
    error_log("Error in get_oee_piechart.php: " . $e->getMessage());
}
?>