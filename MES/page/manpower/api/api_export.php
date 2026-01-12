<?php
// MES/page/manpower/api/api_export.php

require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../../config/config.php';

// รับค่าวันที่
$date = $_GET['date'] ?? date('Y-m-d');
$filename = "Manpower_Report_" . $date . ".csv";

// ตั้งค่า Header
header('Content-Type: text/csv; charset=utf-8');
header('Content-Disposition: attachment; filename="' . $filename . '"');

// สร้าง Output
$output = fopen('php://output', 'w');
fprintf($output, chr(0xEF).chr(0xBB).chr(0xBF)); // BOM

// Header CSV
fputcsv($output, [
    'Date', 'Employee ID', 'Name', 'Position', 'Line/Section', 
    'Team', 'Shift', 'Time In', 'Time Out', 'Status', 'Remark', 'Updated By'
]);

try {
    // [FIXED] เปลี่ยน :date เป็น :date1 และ :date2 เพื่อแก้ปัญหา SQL Error
    $sql = "SELECT 
                ISNULL(CONVERT(VARCHAR(10), L.log_date, 120), :date1) as log_date, -- <== จุดที่ 1
                E.emp_id, 
                E.name_th, 
                E.position,
                ISNULL(L.actual_line, E.line) as line,
                ISNULL(L.actual_team, E.team_group) as team,
                ISNULL(S.shift_name, '-') as shift_name,
                L.scan_in_time,
                L.scan_out_time,
                ISNULL(L.status, 'WAITING') as status,
                L.remark,
                L.updated_by
            FROM " . MANPOWER_EMPLOYEES_TABLE . " E
            LEFT JOIN " . MANPOWER_DAILY_LOGS_TABLE . " L 
                ON E.emp_id = L.emp_id AND L.log_date = :date2 -- <== จุดที่ 2
            LEFT JOIN " . MANPOWER_SHIFTS_TABLE . " S 
                ON ISNULL(L.shift_id, E.default_shift_id) = S.shift_id
            
            WHERE E.is_active = 1 OR L.log_id IS NOT NULL
            ORDER BY line, team, E.emp_id";

    $stmt = $pdo->prepare($sql);
    
    // [FIXED] ส่งค่าไป 2 ตัว (ค่าเดียวกัน)
    $stmt->execute([
        ':date1' => $date,
        ':date2' => $date
    ]);

    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $in = $row['scan_in_time'] ? substr($row['scan_in_time'], 11, 5) : '-';
        $out = $row['scan_out_time'] ? substr($row['scan_out_time'], 11, 5) : '-';

        fputcsv($output, [
            $row['log_date'],
            $row['emp_id'],
            $row['name_th'],
            $row['position'],
            $row['line'],
            $row['team'],
            $row['shift_name'],
            $in,
            $out,
            $row['status'],
            $row['remark'],
            $row['updated_by']
        ]);
    }

} catch (Exception $e) {
    fputcsv($output, ['ERROR', $e->getMessage()]);
}

fclose($output);
exit;
?>