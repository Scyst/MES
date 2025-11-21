<?php
// page/manpower/api/get_daily_manpower.php

header('Content-Type: application/json');
require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../../auth/check_auth.php';

if (!isset($_SESSION['user'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

try {
    $currentUser = $_SESSION['user'];
    $userRole = $currentUser['role'];
    $userLine = $currentUser['line'] ?? null;

    // 1. รับค่าแบบช่วงเวลา (Start - End)
    // ถ้าส่งมาแค่ date ให้ start=end
    $startDate = $_GET['startDate'] ?? ($_GET['date'] ?? date('Y-m-d'));
    $endDate   = $_GET['endDate']   ?? $startDate; 

    // 2. สร้าง Query (ใช้ BETWEEN)
    $sql = "SELECT 
                L.log_id, 
                L.log_date, 
                L.scan_in_time, 
                L.status, 
                L.remark,
                L.is_verified,
                E.emp_id, 
                E.name_th, 
                E.position, 
                E.line,
                E.department_api
            FROM " . MANPOWER_DAILY_LOGS_TABLE . " L
            JOIN " . MANPOWER_EMPLOYEES_TABLE . " E ON L.emp_id = E.emp_id
            WHERE L.log_date BETWEEN :startDate AND :endDate";

    $params = [
        ':startDate' => $startDate,
        ':endDate'   => $endDate
    ];

    // 3. กรองสิทธิ์ (Supervisor เห็นแค่ไลน์ตัวเอง)
    if ($userRole === 'supervisor') {
        if (!empty($userLine)) {
            $sql .= " AND E.line = :line";
            $params[':line'] = $userLine;
        } else {
            $sql .= " AND 1=0"; 
        }
    }

    $sql .= " ORDER BY L.log_date DESC, E.line ASC, E.emp_id ASC"; // เรียงวันที่ล่าสุดก่อน

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 4. สรุปยอด (KPI)
    $summary = [
        'total' => count($data),
        'present' => 0,
        'absent' => 0,
        'late' => 0,
        'leave' => 0,
        'other' => 0
    ];

    foreach ($data as &$row) {
        if ($row['scan_in_time']) {
            $row['scan_time_display'] = date('H:i', strtotime($row['scan_in_time']));
        } else {
            $row['scan_time_display'] = '-';
        }

        $st = strtoupper($row['status']);
        if ($st === 'PRESENT') $summary['present']++;
        elseif ($st === 'ABSENT') $summary['absent']++;
        elseif ($st === 'LATE') $summary['late']++;
        elseif (strpos($st, 'LEAVE') !== false) $summary['leave']++;
        else $summary['other']++;
    }
    $summary['other_total'] = $summary['late'] + $summary['leave'] + $summary['other'];

    echo json_encode([
        'success' => true,
        'data' => $data,
        'summary' => $summary
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>