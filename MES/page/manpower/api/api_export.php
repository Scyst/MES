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
fprintf($output, chr(0xEF).chr(0xBB).chr(0xBF)); // BOM สำหรับภาษาไทย

// Header CSV (ใช้ชื่อ Position แต่ไส้ในจะเป็น Type)
fputcsv($output, [
    'Date', 
    'Emp ID', 
    'Name', 
    'Position', // <--- ชื่อหัวข้อคือ Position
    'Line', 
    'Team', 
    'Shift', 
    'Time In', 
    'Time Out', 
    'Status', 
    'Remark', 
    'Updated By'
]);

try {
    $sql = "SELECT 
                ISNULL(CONVERT(VARCHAR(10), L.log_date, 120), :date1) as log_date,
                E.emp_id, 
                E.name_th, 
                
                -- 🔥 เอาค่า Type มาแสดงเป็น Position เลย (เพราะ Position เดิมมันมั่ว)
                ISNULL(CM.category_name, 'Other') as position_display,

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
                ON E.emp_id = L.emp_id AND L.log_date = :date2
            LEFT JOIN " . MANPOWER_SHIFTS_TABLE . " S 
                ON ISNULL(L.shift_id, E.default_shift_id) = S.shift_id
            
            -- Logic หา Type จาก Keyword
            OUTER APPLY (
                SELECT TOP 1 category_name 
                FROM " . MANPOWER_CATEGORY_MAPPING_TABLE . " M 
                WHERE E.position LIKE '%' + M.keyword + '%' 
                ORDER BY LEN(M.keyword) DESC
            ) CM
            
            WHERE E.is_active = 1 OR L.log_id IS NOT NULL
            ORDER BY line, team, position_display, E.emp_id";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':date1' => $date,
        ':date2' => $date
    ]);

    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        // Format เวลาให้สวยงาม (ตัดวินาทีออก)
        $in = $row['scan_in_time'] ? date('H:i', strtotime($row['scan_in_time'])) : '-';
        $out = $row['scan_out_time'] ? date('H:i', strtotime($row['scan_out_time'])) : '-';

        fputcsv($output, [
            $row['log_date'],
            " " . $row['emp_id'], // เคาะวรรคกัน Excel แปลงเป็น Scientific Notation
            $row['name_th'],
            $row['position_display'], // <--- ใส่ค่า Type ลงไปในช่อง Position
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