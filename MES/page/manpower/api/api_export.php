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

// 1. เขียน Header CSV (เพิ่ม Cost แล้ว)
fputcsv($output, [
    'Date', 
    'Emp ID', 
    'Name', 
    'Position', 
    'Line', 
    'Team', 
    'Shift', 
    'Time In', 
    'Time Out', 
    'Status', 
    'Cost (THB)', // <--- เพิ่มช่องนี้
    'Remark', 
    'Updated By'
]);

try {
    // 2. SQL Query (เพิ่ม Logic คำนวณเงิน)
    $sql = "SELECT 
                ISNULL(CONVERT(VARCHAR(10), L.log_date, 120), :date1) as log_date,
                E.emp_id, 
                E.name_th, 
                ISNULL(CM.category_name, 'Other') as position_display,
                ISNULL(L.actual_line, E.line) as line,
                ISNULL(L.actual_team, E.team_group) as team,
                ISNULL(S.shift_name, '-') as shift_name,
                L.scan_in_time,
                L.scan_out_time,
                ISNULL(L.status, 'WAITING') as status,
                L.remark,
                L.updated_by,

                -- 🔥 สูตรคำนวณเงินรายคน (Estimated Cost)
                CAST(
                    CASE 
                        -- [A] มาทำงาน (PRESENT / LATE)
                        WHEN L.status IN ('PRESENT', 'LATE') THEN 
                            -- 1. ค่าแรงรายวัน (หรือฐานเงินเดือน/30)
                            (CASE WHEN CM.rate_type LIKE 'MONTHLY%' THEN (CM.hourly_rate / 30.0) ELSE (COALESCE(CM.hourly_rate,0) * Rate.Work_Multiplier) END)
                            +
                            -- 2. ค่า OT (ถ้าลืมรูดออก OT=0)
                            (Final_OT.OT_Capped * Rate.Hourly_Base * Rate.OT_Multiplier)

                        -- [B] ลาป่วย/พักร้อน (SICK/VACATION) -> คิด 8 ชม. (รายเดือนได้ปกติอยู่แล้ว)
                        WHEN L.status IN ('SICK', 'VACATION') THEN
                            (CASE WHEN CM.rate_type LIKE 'MONTHLY%' THEN (CM.hourly_rate / 30.0) ELSE (Rate.Hourly_Base * 8.0) END)

                        -- [C] ลากิจ (BUSINESS) -> รายวัน 0 บาท, รายเดือนได้ปกติ
                        WHEN L.status = 'BUSINESS' THEN
                            (CASE WHEN CM.rate_type LIKE 'MONTHLY%' THEN (CM.hourly_rate / 30.0) ELSE 0 END)

                        -- [D] อื่นๆ/ขาดงาน (ABSENT) -> รายเดือนระบบหารให้เห็นยอดต่อวัน, รายวัน 0 บาท
                        ELSE 
                            (CASE WHEN CM.rate_type LIKE 'MONTHLY%' THEN (CM.hourly_rate / 30.0) ELSE 0 END)
                    END
                AS DECIMAL(10,2)) as calculated_cost

            FROM " . MANPOWER_EMPLOYEES_TABLE . " E
            LEFT JOIN " . MANPOWER_DAILY_LOGS_TABLE . " L 
                ON E.emp_id = L.emp_id AND L.log_date = :date2
            LEFT JOIN " . MANPOWER_SHIFTS_TABLE . " S 
                ON ISNULL(L.shift_id, E.default_shift_id) = S.shift_id
            LEFT JOIN dbo.MANPOWER_CALENDAR Cal 
                ON (L.log_date = Cal.calendar_date OR Cal.calendar_date = :date3)
            
            -- ดึง Rate
            OUTER APPLY (
                SELECT TOP 1 * FROM " . MANPOWER_CATEGORY_MAPPING_TABLE . " M 
                WHERE E.position LIKE '%' + M.keyword + '%' 
                ORDER BY LEN(M.keyword) DESC
            ) CM

            -- ตัวคูณ Rate & Holiday
            CROSS APPLY (
                SELECT 
                    CASE WHEN CM.rate_type='MONTHLY_NO_OT' THEN 0.0 WHEN Cal.day_type='HOLIDAY' THEN 3.0 ELSE 1.5 END AS OT_Multiplier, 
                    CASE WHEN CM.rate_type LIKE 'MONTHLY%' THEN 0.0 WHEN Cal.day_type='HOLIDAY' THEN 2.0 ELSE 1.0 END AS Work_Multiplier, 
                    CASE WHEN CM.rate_type LIKE 'MONTHLY%' THEN COALESCE(CM.hourly_rate, 0)/30.0/8.0 WHEN CM.rate_type='DAILY' THEN COALESCE(CM.hourly_rate,0)/8.0 ELSE COALESCE(CM.hourly_rate,0) END AS Hourly_Base
            ) AS Rate

            -- คำนวณเวลา (Shift Start / End)
            CROSS APPLY (SELECT CAST(CONCAT(ISNULL(L.log_date, :date4), ' ', S.start_time) AS DATETIME) AS Shift_Start) AS T0
            CROSS APPLY (
                SELECT CASE 
                    WHEN L.scan_out_time IS NOT NULL THEN L.scan_out_time 
                    WHEN L.log_date < CAST(GETDATE() AS DATE) THEN T0.Shift_Start -- อดีตและลืมรูด = ตัด OT ทิ้ง
                    ELSE GETDATE() 
                END AS Calc_End_Time
            ) AS T1
            
            -- คำนวณนาทีทำงาน -> แปลงเป็นชั่วโมง OT
            CROSS APPLY (SELECT DATEDIFF(MINUTE, T0.Shift_Start, T1.Calc_End_Time) AS Total_Minutes) AS T2
            CROSS APPLY (SELECT CASE WHEN T2.Total_Minutes > 570 THEN FLOOR((T2.Total_Minutes - 570) / 30.0) * 0.5 ELSE 0 END AS OT_Hours) AS Step_OT
            CROSS APPLY (SELECT CASE WHEN L.log_date < CAST(GETDATE() AS DATE) AND L.scan_out_time IS NULL THEN 0 WHEN Step_OT.OT_Hours > 6 THEN 6 ELSE Step_OT.OT_Hours END AS OT_Capped) AS Final_OT
            
            WHERE E.is_active = 1 OR L.log_id IS NOT NULL
            ORDER BY line, team, position_display, E.emp_id";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':date1' => $date,
        ':date2' => $date,
        ':date3' => $date,
        ':date4' => $date
    ]);

    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        // Format Data
        $in = $row['scan_in_time'] ? date('H:i', strtotime($row['scan_in_time'])) : '-';
        $out = $row['scan_out_time'] ? date('H:i', strtotime($row['scan_out_time'])) : '-';
        
        // Format Cost (ใส่ลูกน้ำ)
        $cost = number_format($row['calculated_cost'], 2);

        // เขียนลง CSV
        fputcsv($output, [
            $row['log_date'],
            " " . $row['emp_id'], // เคาะวรรคกัน Excel เพี้ยน
            $row['name_th'],
            $row['position_display'],
            $row['line'],
            $row['team'],
            $row['shift_name'],
            $in,
            $out,
            $row['status'],
            $cost, // <--- ยอดเงินมาแล้ว!
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