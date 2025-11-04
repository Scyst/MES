<?php
header('Content-Type: application/json');

ini_set('display_errors', 1);
error_reporting(E_ALL);

require_once __DIR__ . '/../../db.php';

// ✅ [แก้ไข 1/2] เพิ่มการเรียก config.php โดยตรงเพื่อให้รู้จัก SP_CALC_OEE_LINE
require_once __DIR__ . '/../../../config/config.php';

try {
    $startDateStr = $_GET['startDate'] ?? date('Y-m-d', strtotime('-29 days'));
    $endDateStr   = $_GET['endDate'] ?? date('Y-m-d');
    $line         = !empty($_GET['line']) ? $_GET['line'] : null;
    $model        = !empty($_GET['model']) ? $_GET['model'] : null;

    // ✅ [แก้ไข 2/2] เปลี่ยนจาก Hardcode เป็นการใช้ค่าคงที่
    $sql = "EXEC dbo." . SP_CALC_OEE_LINE . " @StartDate = ?, @EndDate = ?, @Line = ?, @Model = ?";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([$startDateStr, $endDateStr, $line, $model]);

    $records = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $formattedRecords = array_map(function($row) {
        // (ส่วนการจัดรูปแบบวันที่เหมือนเดิม)
        if (isset($row['date'])) {
             try {
                 $dateObj = new DateTime($row['date']);
                 $row['date'] = $dateObj->format('d-m-y'); // d-m-y ตามที่ JS คาดหวัง
             } catch (Exception $e) {
                 // ป้องกัน Error หาก Date Format ผิดพลาด
                 $row['date'] = 'Invalid Date';
             }
        }
        return $row;
    }, $records);
    
    echo json_encode(["success" => true, "records" => $formattedRecords]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false, 
        'message' => 'An error occurred in get_oee_linechart.php', 
        'error' => $e->getMessage()
    ]);
}
?>