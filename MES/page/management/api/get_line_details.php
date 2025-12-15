<?php
// MES/page/management/api/get_line_details.php
include_once("../../../auth/check_auth.php");
include_once("../../db.php");
include_once("../../../config/config.php");

header('Content-Type: application/json');

if (!hasRole(['admin', 'creator', 'planner', 'viewer', 'supervisor'])) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

try {
    $line = $_GET['line'] ?? '';
    $date = $_GET['date'] ?? date('Y-m-d');
    
    if (empty($line)) throw new Exception("Line name is required");

    // 1. Hourly Production (ตัดรอบ 8 โมง)
    $sqlHourly = "
        SELECT 
            DATEPART(HOUR, transaction_timestamp) as hr,
            SUM(quantity) as qty
        FROM " . TRANSACTIONS_TABLE . " t
        JOIN " . LOCATIONS_TABLE . " l ON t.to_location_id = l.location_id
        WHERE l.production_line = :line
          AND t.transaction_type = 'PRODUCTION_FG'
          -- [FIXED] ใช้ DATEADD -8 ชั่วโมง เพื่อเช็ควันที่ตามกะผลิต
          AND CAST(DATEADD(HOUR, -8, transaction_timestamp) AS DATE) = :date
        GROUP BY DATEPART(HOUR, transaction_timestamp)
        ORDER BY hr
    ";
    $stmt = $pdo->prepare($sqlHourly);
    $stmt->execute([':line' => $line, ':date' => $date]);
    $hourlyData = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 2. Machine Downtime (ตัดรอบ 8 โมง)
    $sqlStop = "
        SELECT machine, cause, duration, 
               CONVERT(varchar(5), stop_begin, 108) as start_time,
               CONVERT(varchar(5), stop_end, 108) as end_time
        FROM " . STOP_CAUSES_TABLE . "
        WHERE line = :line 
          -- [FIXED] ใช้ DATEADD -8 ชั่วโมง
          AND CAST(DATEADD(HOUR, -8, stop_begin) AS DATE) = :date
        ORDER BY stop_begin DESC
    ";
    $stmt = $pdo->prepare($sqlStop);
    $stmt->execute([':line' => $line, ':date' => $date]);
    $stopData = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 3. Scrap Analysis (ตัดรอบ 8 โมง)
    $sqlScrap = "
        SELECT i.part_no, i.part_description, 
               SUM(t.quantity) as qty,
               SUM(t.quantity * i.Cost_Total) as lost_val
        FROM " . TRANSACTIONS_TABLE . " t
        JOIN " . ITEMS_TABLE . " i ON t.parameter_id = i.item_id
        JOIN " . LOCATIONS_TABLE . " l ON t.from_location_id = l.location_id
        WHERE l.production_line = :line
          AND t.transaction_type = 'PRODUCTION_SCRAP'
          -- [FIXED] ใช้ DATEADD -8 ชั่วโมง
          AND CAST(DATEADD(HOUR, -8, t.transaction_timestamp) AS DATE) = :date
        GROUP BY i.part_no, i.part_description
        ORDER BY lost_val DESC
    ";
    $stmt = $pdo->prepare($sqlScrap);
    $stmt->execute([':line' => $line, ':date' => $date]);
    $scrapData = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 4. Manpower List
    // (Manpower มักลง LogDate ตรงวันอยู่แล้ว แต่ถ้าต้องการตัดรอบจาก ScanTime ก็แก้ได้ครับ 
    //  ในที่นี้อิงตาม LogDate ที่ระบบ Manpower ส่งมา)
    $sqlMan = "
        SELECT e.emp_id, e.name_th, e.position, 
               CONVERT(varchar(5), l.scan_in_time, 108) as check_in
        FROM " . MANPOWER_DAILY_LOGS_TABLE . " l
        JOIN " . MANPOWER_EMPLOYEES_TABLE . " e ON l.emp_id = e.emp_id
        WHERE e.line = :line
          AND l.log_date = :date 
          AND l.status IN ('PRESENT', 'LATE')
        ORDER BY e.position, l.scan_in_time
    ";
    $stmt = $pdo->prepare($sqlMan);
    $stmt->execute([':line' => $line, ':date' => $date]);
    $manpowerData = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'hourly' => $hourlyData,
        'downtime' => $stopData,
        'scrap' => $scrapData,
        'manpower' => $manpowerData
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>