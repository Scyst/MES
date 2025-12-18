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

    // เตรียมช่วงเวลาสำหรับ Index Seek (SARGable)
    $startDT = $date . ' 08:00:00';
    $endDT = date('Y-m-d', strtotime($date . ' +1 day')) . ' 08:00:00';

    // 1. Hourly Production (ยอดผลิตรายชั่วโมง)
    $sqlHourly = "
        SELECT 
            DATEPART(HOUR, transaction_timestamp) as hr,
            SUM(quantity) as qty
        FROM " . TRANSACTIONS_TABLE . " t
        JOIN " . LOCATIONS_TABLE . " l ON t.to_location_id = l.location_id
        WHERE l.production_line = :line
          AND t.transaction_type = 'PRODUCTION_FG'
          AND t.transaction_timestamp >= :start AND t.transaction_timestamp < :end
        GROUP BY DATEPART(HOUR, transaction_timestamp)
        ORDER BY hr
    ";
    $stmt = $pdo->prepare($sqlHourly);
    $stmt->execute([':line' => $line, ':start' => $startDT, ':end' => $endDT]);
    $hourlyData = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 2. Downtime (เวลาเครื่องจักรหยุด)
    // หมายเหตุ: ตรงนี้ถ้าคุณมีตาราง DOWNTIME_LOGS ให้ใช้โครงสร้างคล้ายกัน
    $downtimeData = []; 

    // 3. Scrap Details (รายละเอียดงานเสีย)
    $sqlScrap = "
        SELECT 
            i.part_no, 
            i.part_description,
            SUM(t.quantity) as qty,
            SUM(t.quantity * ISNULL(i.Cost_Total, 0)) as lost_val
        FROM " . TRANSACTIONS_TABLE . " t
        JOIN " . ITEMS_TABLE . " i ON t.parameter_id = i.item_id
        LEFT JOIN " . LOCATIONS_TABLE . " l ON t.from_location_id = l.location_id
        WHERE l.production_line = :line
          AND t.transaction_type = 'PRODUCTION_SCRAP'
          AND t.transaction_timestamp >= :start AND t.transaction_timestamp < :end
        GROUP BY i.part_no, i.part_description
        ORDER BY lost_val DESC
    ";
    $stmt = $pdo->prepare($sqlScrap);
    $stmt->execute([':line' => $line, ':start' => $startDT, ':end' => $endDT]);
    $scrapData = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 4. Manpower (รายชื่อพนักงานที่เข้าทำงาน)
    $sqlMan = "
        SELECT e.emp_id, e.name_th, e.position, 
               CONVERT(varchar(5), l.scan_in_time, 108) as check_in
        FROM " . MANPOWER_DAILY_LOGS_TABLE . " l
        JOIN " . MANPOWER_EMPLOYEES_TABLE . " e ON l.emp_id = e.emp_id
        WHERE e.line = :line
          AND l.log_date = :date 
          AND l.status IN ('PRESENT', 'LATE')
        ORDER BY l.scan_in_time
    ";
    $stmt = $pdo->prepare($sqlMan);
    $stmt->execute([':line' => $line, ':date' => $date]);
    $manpowerData = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'hourly' => $hourlyData,
        'downtime' => $downtimeData,
        'scrap' => $scrapData,
        'manpower' => $manpowerData
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>