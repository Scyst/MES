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

// 1. ปลดล็อค Session ทันที เพื่อให้หน้าอื่นโหลดได้
session_write_close(); 

try {
    $currentUser = $_SESSION['user']; // อ่านค่าจาก RAM ได้แม้ปิด Session แล้ว
    $userRole = $currentUser['role'];
    $userLine = $currentUser['line'] ?? null;

    $startDate = $_GET['startDate'] ?? ($_GET['date'] ?? date('Y-m-d'));
    $endDate   = $_GET['endDate']   ?? $startDate; 

    // 2. ใช้ WITH (NOLOCK) เพื่ออ่านข้อมูลทะลุ Lock ขณะ Sync
    $sql = "SELECT 
                L.log_id, L.log_date, L.scan_in_time, L.scan_out_time,
                L.status, L.remark, L.is_verified, L.updated_at,
                E.emp_id, E.name_th, E.position, E.line,
                E.team_group, E.department_api,
                S.shift_name, S.start_time as shift_start
            FROM " . MANPOWER_DAILY_LOGS_TABLE . " L WITH (NOLOCK) 
            JOIN " . MANPOWER_EMPLOYEES_TABLE . " E WITH (NOLOCK) ON L.emp_id = E.emp_id
            LEFT JOIN " . MANPOWER_SHIFTS_TABLE . " S WITH (NOLOCK) ON E.default_shift_id = S.shift_id
            WHERE L.log_date BETWEEN :startDate AND :endDate";

    $params = [ ':startDate' => $startDate, ':endDate' => $endDate ];

    if ($userRole === 'supervisor') {
        if (!empty($userLine)) {
            $sql .= " AND E.line = :line";
            $params[':line'] = $userLine;
        } else {
            $sql .= " AND 1=0"; 
        }
    }

    $sql .= " ORDER BY L.log_date DESC, E.line ASC, E.team_group ASC, E.name_th ASC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 3. คำนวณ Summary
    $summary = ['total' => count($data), 'present' => 0, 'absent' => 0, 'late' => 0, 'leave' => 0, 'other' => 0];
    $maxUpdateTimestamp = null;

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

        if (!empty($row['updated_at'])) {
            $ts = strtotime($row['updated_at']);
            if ($maxUpdateTimestamp === null || $ts > $maxUpdateTimestamp) {
                $maxUpdateTimestamp = $ts;
            }
        }
    }

    $summary['other_total'] = $summary['late'] + $summary['leave'] + $summary['other'];
    $lastUpdateStr = $maxUpdateTimestamp ? date('d/m/Y H:i', $maxUpdateTimestamp) : null;

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