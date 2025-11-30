<?php
// page/manpower/api/get_daily_manpower.php

header('Content-Type: application/json');
require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../../auth/check_auth.php';

// 1. ตรวจสอบ Session เบื้องต้น
if (!isset($_SESSION['user'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

try {
    $currentUser = $_SESSION['user'];
    $userRole = $currentUser['role'];
    $userLine = $currentUser['line'] ?? null;

    // 2. รับค่าช่วงเวลา
    $startDate = $_GET['startDate'] ?? ($_GET['date'] ?? date('Y-m-d'));
    $endDate   = $_GET['endDate']   ?? $startDate; 

    // 3. สร้าง Query
    // Join 3 ตาราง: Daily Logs + Employees + Shifts
    // เพื่อดึงข้อมูลให้ครบถ้วน (รวมถึง Team Group และ Shift Name)
    $sql = "SELECT 
                L.log_id, 
                L.log_date, 
                L.scan_in_time,
                L.scan_out_time,
                L.status, 
                L.remark,
                L.is_verified,
                L.updated_at,
                E.emp_id, 
                E.name_th, 
                E.position, 
                E.line,
                E.team_group,
                E.department_api,
                S.shift_name, 
                S.start_time as shift_start
            FROM " . MANPOWER_DAILY_LOGS_TABLE . " L
            JOIN " . MANPOWER_EMPLOYEES_TABLE . " E ON L.emp_id = E.emp_id
            LEFT JOIN " . MANPOWER_SHIFTS_TABLE . " S ON E.default_shift_id = S.shift_id
            WHERE L.log_date BETWEEN :startDate AND :endDate";

    $params = [
        ':startDate' => $startDate,
        ':endDate'   => $endDate
    ];

    // 4. กรองสิทธิ์ (Supervisor เห็นแค่ไลน์ตัวเอง Admin เห็นหมด)
    if ($userRole === 'supervisor') {
        if (!empty($userLine)) {
            $sql .= " AND E.line = :line";
            $params[':line'] = $userLine;
        } else {
            // ถ้าเป็น Supervisor แต่ไม่มี Line สังกัด -> ไม่ให้เห็นข้อมูล
            $sql .= " AND 1=0"; 
        }
    }

    // 5. เรียงลำดับข้อมูล: วันที่ -> ไลน์ -> ทีม -> ชื่อ
    $sql .= " ORDER BY L.log_date DESC, E.line ASC, E.team_group ASC, E.name_th ASC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 6. ประมวลผลข้อมูล (Summary & Formatting)
    $summary = [
        'total' => count($data),
        'present' => 0,
        'absent' => 0,
        'late' => 0,
        'leave' => 0,
        'other' => 0
    ];

    $maxUpdateTimestamp = null; // ตัวแปรหาเวลาอัปเดตล่าสุด

    foreach ($data as &$row) {
        // A. จัดรูปแบบเวลา Scan ให้สวยงาม (HH:mm)
        if ($row['scan_in_time']) {
            $row['scan_time_display'] = date('H:i', strtotime($row['scan_in_time']));
        } else {
            $row['scan_time_display'] = '-';
        }
        
        // B. นับยอด KPI ตามสถานะ
        $st = strtoupper($row['status']);
        if ($st === 'PRESENT') {
            $summary['present']++;
        } elseif ($st === 'ABSENT') {
            $summary['absent']++;
        } elseif ($st === 'LATE') {
            $summary['late']++;
        } elseif (strpos($st, 'LEAVE') !== false) { // ครอบคลุม SICK_LEAVE, ANNUAL_LEAVE ฯลฯ
            $summary['leave']++;
        } else {
            $summary['other']++;
        }

        // C. หาเวลาอัปเดตล่าสุด (Last Update)
        if (!empty($row['updated_at'])) {
            $ts = strtotime($row['updated_at']);
            if ($maxUpdateTimestamp === null || $ts > $maxUpdateTimestamp) {
                $maxUpdateTimestamp = $ts;
            }
        }
    }

    // รวมยอด Other + Late + Leave ไว้ในกลุ่มเดียวกันสำหรับ KPI Card ใบขวาสุด
    $summary['other_total'] = $summary['late'] + $summary['leave'] + $summary['other'];

    // แปลง Timestamp เป็น String (เช่น 30/11/2025 08:30)
    $lastUpdateStr = $maxUpdateTimestamp ? date('d/m/Y H:i', $maxUpdateTimestamp) : null;

    // 7. ส่งผลลัพธ์กลับ
    echo json_encode([
        'success' => true,
        'data' => $data,
        'summary' => $summary,
        'last_update' => $lastUpdateStr
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>