<?php
// MES/page/manpower/api/get_daily_manpower.php

header('Content-Type: application/json');
require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../../auth/check_auth.php';
require_once __DIR__ . '/../../../config/config.php';

// 1. Security Check
if (!isset($_SESSION['user'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

// ปิด Session เพื่อลด Load
session_write_close();

try {
    $currentUser = $_SESSION['user'];
    $userRole = $currentUser['role'];
    $userLine = $currentUser['line'] ?? null;

    // รับค่าวันที่ (Start - End)
    $startDate = $_GET['startDate'] ?? ($_GET['date'] ?? date('Y-m-d'));
    $endDate   = $_GET['endDate']   ?? $startDate; 
    $filterLine = $_GET['line'] ?? ''; 

    // 2. Query ข้อมูล (ไม่มี Switch Case Action ใดๆ ทั้งสิ้น!)
    $sql = "SELECT 
                L.log_id, L.log_date, 
                -- แปลงเวลาเป็น String เพื่อกัน Error 500 ใน JSON
                CONVERT(VARCHAR(19), L.scan_in_time, 120) as scan_in_time, 
                CONVERT(VARCHAR(19), L.scan_out_time, 120) as scan_out_time,
                L.status, L.remark, L.is_verified, 
                CONVERT(VARCHAR(19), L.updated_at, 120) as updated_at,
                E.emp_id, E.name_th, E.position, 
                E.line, E.team_group, E.department_api,
                S.shift_name, 
                CONVERT(VARCHAR(5), S.start_time, 108) as shift_start
            FROM " . MANPOWER_DAILY_LOGS_TABLE . " L WITH (NOLOCK)
            JOIN " . MANPOWER_EMPLOYEES_TABLE . " E WITH (NOLOCK) ON L.emp_id = E.emp_id
            LEFT JOIN " . MANPOWER_SHIFTS_TABLE . " S WITH (NOLOCK) ON L.shift_id = S.shift_id
            WHERE L.log_date BETWEEN :start AND :end ";

    $params = [':start' => $startDate, ':end' => $endDate];

    // Filter ตามสิทธิ์
    if ($userRole === 'supervisor' && !empty($userLine)) {
        $sql .= " AND E.line = :userLine";
        $params[':userLine'] = $userLine;
    } elseif (!empty($filterLine) && $filterLine !== 'ALL') {
        $sql .= " AND E.line = :filterLine";
        $params[':filterLine'] = $filterLine;
    }

    $sql .= " ORDER BY L.log_date DESC, E.line ASC, E.emp_id ASC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 3. สรุปยอด KPI (Summary)
    $summary = [
        'total' => count($data), 'present' => 0, 'absent' => 0, 
        'late' => 0, 'leave' => 0, 'other' => 0, 'other_total' => 0
    ];
    
    $maxUpdateTimestamp = null;

    foreach ($data as &$row) {
        $row['scan_time_display'] = $row['scan_in_time'] ? date('H:i', strtotime($row['scan_in_time'])) : '-';
        
        $st = strtoupper($row['status']);
        if ($st === 'PRESENT') $summary['present']++;
        elseif ($st === 'ABSENT') $summary['absent']++;
        elseif ($st === 'LATE') $summary['late']++;
        elseif (strpos($st, 'LEAVE') !== false) $summary['leave']++;
        else $summary['other']++;

        if (!empty($row['updated_at'])) {
            $ts = strtotime($row['updated_at']);
            if ($maxUpdateTimestamp === null || $ts > $maxUpdateTimestamp) {
                $maxUpdateTimestamp = $ts;
            }
        }
    }

    $summary['other_total'] = $summary['late'] + $summary['leave'] + $summary['other'];
    $lastUpdateStr = $maxUpdateTimestamp ? date('d/m/Y H:i', $maxUpdateTimestamp) : '-';

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