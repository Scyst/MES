<?php
// --- 1. SETUP & INITIALIZATION ---
require_once __DIR__ . '/../db.php'; // เรียกไฟล์เชื่อมต่อฐานข้อมูล
require_once __DIR__ . '/../logger.php'; // เรียกไฟล์สำหรับ Logger
session_start();

// --- 2. INPUT VALIDATION ---
// รับค่า lot_no จาก query string และป้องกันค่าว่าง
$lot_no = trim($_GET['lot_no'] ?? '');
if (empty($lot_no)) {
    http_response_code(400); // Bad Request
    echo json_encode(['success' => false, 'message' => 'Lot number is required.']);
    exit;
}

try {
    // --- 3. CORE DATA FETCHING ---
    // Mảngสำหรับเก็บผลลัพธ์ทั้งหมด
    $data = [
        'summary' => null,
        'production_history' => [],
        'downtime_history' => [],
        'wip_history' => [],
        'bom_info' => []
    ];

    // -- QUERY 1: ดึงข้อมูลสรุปของ Lot และหาระยะเวลาการผลิต --
    $summarySql = "
        SELECT TOP 1
            part_no, line, model,
            MIN(CAST(log_date AS DATETIME) + CAST(log_time AS DATETIME)) as first_event_time,
            MAX(CAST(log_date AS DATETIME) + CAST(log_time AS DATETIME)) as last_event_time,
            SUM(CASE WHEN count_type = 'FG' THEN count_value ELSE 0 END) as total_fg
        FROM IOT_TOOLBOX_PARTS
        WHERE lot_no = ?
        GROUP BY part_no, line, model;
    ";
    $summaryStmt = $pdo->prepare($summarySql);
    $summaryStmt->execute([$lot_no]);
    $summary = $summaryStmt->fetch(PDO::FETCH_ASSOC);

    // หากไม่พบข้อมูล Lot นี้ ให้ส่งค่าว่างกลับไป
    if (!$summary) {
        echo json_encode(['success' => true, 'data' => $data, 'message' => 'Lot number not found.']);
        exit;
    }
    $data['summary'] = $summary;

    // เตรียมตัวแปรสำหรับใช้ใน Query ต่อๆ ไป
    $part_no = $summary['part_no'];
    $line = $summary['line'];
    // เพิ่มบัฟเฟอร์ 1 ชั่วโมงก่อนและหลังเพื่อความครอบคลุมของ Downtime
    $startTime = (new DateTime($summary['first_event_time']))->modify('-1 hour')->format('Y-m-d H:i:s');
    $endTime = (new DateTime($summary['last_event_time']))->modify('+1 hour')->format('Y-m-d H:i:s');

    // -- QUERY 2: ดึงประวัติการผลิตทั้งหมดของ Lot นี้ --
    $productionSql = "
        SELECT log_date, log_time, count_type, count_value, note
        FROM IOT_TOOLBOX_PARTS
        WHERE lot_no = ?
        ORDER BY log_date, log_time;
    ";
    $productionStmt = $pdo->prepare($productionSql);
    $productionStmt->execute([$lot_no]);
    $data['production_history'] = $productionStmt->fetchAll(PDO::FETCH_ASSOC);

    // -- QUERY 3: ดึงประวัติ Downtime ที่เกิดขึ้นในช่วงเวลาที่ผลิต Lot นี้ --
    $downtimeSql = "
        SELECT stop_begin, stop_end, duration, machine, cause, recovered_by, note
        FROM IOT_TOOLBOX_STOP_CAUSES
        WHERE line = ? AND stop_begin BETWEEN ? AND ?
        ORDER BY stop_begin;
    ";
    $downtimeStmt = $pdo->prepare($downtimeSql);
    $downtimeStmt->execute([$line, $startTime, $endTime]);
    $data['downtime_history'] = $downtimeStmt->fetchAll(PDO::FETCH_ASSOC);

    // -- QUERY 4: ดึงประวัติการนำเข้าวัตถุดิบ (WIP) --
    $wipSql = "
        SELECT entry_time, quantity_in, operator, remark
        FROM WIP_ENTRIES
        WHERE lot_no = ?
        ORDER BY entry_time;
    ";
    $wipStmt = $pdo->prepare($wipSql);
    $wipStmt->execute([$lot_no]);
    $data['wip_history'] = $wipStmt->fetchAll(PDO::FETCH_ASSOC);

    // -- QUERY 5: ดึงข้อมูลสูตรการผลิต (BOM) --
    $bomSql = "
        SELECT component_part_no, quantity_required
        FROM PRODUCT_BOM
        WHERE fg_part_no = ?;
    ";
    $bomStmt = $pdo->prepare($bomSql);
    $bomStmt->execute([$part_no]);
    $data['bom_info'] = $bomStmt->fetchAll(PDO::FETCH_ASSOC);


    // --- 4. FINAL OUTPUT ---
    // ส่งข้อมูลทั้งหมดกลับไปในรูปแบบ JSON
    echo json_encode(['success' => true, 'data' => $data]);

} catch (PDOException $e) {
    // --- 5. ERROR HANDLING ---
    // กรณีเกิดข้อผิดพลาดในการเชื่อมต่อหรือ Query
    http_response_code(500); // Internal Server Error
    echo json_encode(['success' => false, 'message' => 'Database query failed: ' . $e->getMessage()]);
    // บันทึก Log ข้อผิดพลาดไว้ในฝั่ง Server
    error_log("Traceability API Error for Lot: {$lot_no} - " . $e->getMessage());
}
?>