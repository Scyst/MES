<?php
// MES/page/manpower/api/get_manpower_summary.php

header('Content-Type: application/json');
require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../../auth/check_auth.php';
require_once __DIR__ . '/../../../config/config.php';

session_write_close();

$date = $_GET['date'] ?? date('Y-m-d');
$shift = $_GET['shift'] ?? 'ALL'; // เผื่อเลือกดูเฉพาะกะ

try {
    // -----------------------------------------------------------
    // โจทย์ข้อที่ 1: จำนวนคนแต่ละไลน์ผลิต (Headcount by Line)
    // -----------------------------------------------------------
    $sqlLine = "SELECT 
                    COALESCE(E.line, 'Unassigned') AS line_name,
                    COUNT(DISTINCT L.emp_id) AS total_people
                FROM " . MANPOWER_DAILY_LOGS_TABLE . " L
                JOIN " . MANPOWER_EMPLOYEES_TABLE . " E ON L.emp_id = E.emp_id
                WHERE L.log_date = :date 
                  AND L.status IN ('PRESENT', 'LATE') -- นับเฉพาะคนมา
                GROUP BY E.line
                ORDER BY E.line";
    
    $stmtLine = $pdo->prepare($sqlLine);
    $stmtLine->execute([':date' => $date]);
    $tableByLine = $stmtLine->fetchAll(PDO::FETCH_ASSOC);

    // -----------------------------------------------------------
    // โจทย์ข้อที่ 2: สรุปแยกเป็นกะ และทีม A/B (Shift & Team)
    // -----------------------------------------------------------
    $sqlShiftTeam = "SELECT 
                        S.shift_name,
                        COALESCE(E.team_group, 'No Team') AS team_name,
                        COUNT(DISTINCT L.emp_id) AS total_people
                     FROM " . MANPOWER_DAILY_LOGS_TABLE . " L
                     JOIN " . MANPOWER_EMPLOYEES_TABLE . " E ON L.emp_id = E.emp_id
                     LEFT JOIN " . MANPOWER_SHIFTS_TABLE . " S ON L.shift_id = S.shift_id
                     WHERE L.log_date = :date
                       AND L.status IN ('PRESENT', 'LATE')
                     GROUP BY S.shift_name, E.team_group
                     ORDER BY S.shift_name, E.team_group";

    $stmtShiftTeam = $pdo->prepare($sqlShiftTeam);
    $stmtShiftTeam->execute([':date' => $date]);
    $tableByShiftTeam = $stmtShiftTeam->fetchAll(PDO::FETCH_ASSOC);

    // -----------------------------------------------------------
    // โจทย์ข้อที่ 3: แยกประเภทพนักงาน (Employee Type)
    // ใช้ตาราง Mapping ที่เรามี หรือจัดกลุ่มง่ายๆ จากชื่อตำแหน่ง
    // -----------------------------------------------------------
    $sqlType = "SELECT 
                    CASE 
                        WHEN CM.category_name IS NOT NULL THEN CM.category_name
                        WHEN E.position LIKE '%นักศึกษา%' THEN 'Student'
                        WHEN E.position LIKE '%สัญญาจ้าง%' THEN 'Contract'
                        WHEN E.position LIKE '%ประจำ%' THEN 'Permanent'
                        ELSE 'Other' 
                    END AS emp_type,
                    COUNT(DISTINCT L.emp_id) AS total_people
                FROM " . MANPOWER_DAILY_LOGS_TABLE . " L
                JOIN " . MANPOWER_EMPLOYEES_TABLE . " E ON L.emp_id = E.emp_id
                -- Join กับ Mapping Category ที่เราแก้ไว้ใน sync เพื่อใช้ประโยชน์
                LEFT JOIN " . MANPOWER_CATEGORY_MAPPING_TABLE . " CM ON E.position LIKE '%' + CM.keyword + '%'
                WHERE L.log_date = :date
                  AND L.status IN ('PRESENT', 'LATE')
                GROUP BY 
                    CASE 
                        WHEN CM.category_name IS NOT NULL THEN CM.category_name
                        WHEN E.position LIKE '%นักศึกษา%' THEN 'Student'
                        WHEN E.position LIKE '%สัญญาจ้าง%' THEN 'Contract'
                        WHEN E.position LIKE '%ประจำ%' THEN 'Permanent'
                        ELSE 'Other' 
                    END";

    $stmtType = $pdo->prepare($sqlType);
    $stmtType->execute([':date' => $date]);
    $tableByType = $stmtType->fetchAll(PDO::FETCH_ASSOC);

    // ส่งผลลัพธ์กลับไปให้หน้าเว็บ
    echo json_encode([
        'success' => true,
        'summary_by_line' => $tableByLine,
        'summary_by_shift_team' => $tableByShiftTeam,
        'summary_by_type' => $tableByType
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>