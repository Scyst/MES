<?php
// MES/page/manpower/api/api_master_data.php
// รวม: manage_employees, batch_shift_update, manage_mapping, generate_calendar, team_shift_manager

/* * =================================================================================
 * [REMINDER] วิธีสร้างปฏิทินวันหยุดประจำปี (Auto Generate Holiday)
 * =================================================================================
 * ให้ Login เข้าระบบ แล้วเปิดลิงก์นี้ใน Browser ปีละ 1 ครั้ง:
 * * ปี 2025:
 * https://oem.sncformer.com/iot-toolbox/sandbox-b9/Clone/MES/page/manpower/api/api_master_data.php?action=generate_calendar&year=2025
 * * ปี 2026:
 * https://oem.sncformer.com/iot-toolbox/sandbox-b9/Clone/MES/page/manpower/api/api_master_data.php?action=generate_calendar&year=2026
 * * (ระบบจะสร้างวันอาทิตย์เป็นวันหยุด และดึงวันหยุดราชการจาก API มาใส่ตาราง MANPOWER_CALENDAR ให้เอง)
 * =================================================================================
 */

header('Content-Type: application/json');
require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../../auth/check_auth.php';
require_once __DIR__ . '/../../../config/config.php';

// อนุญาตเฉพาะ Admin / Creator / Supervisor
if (!hasRole(['admin', 'creator', 'supervisor'])) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

// รับค่า action รองรับทั้ง GET และ POST
$input = json_decode(file_get_contents('php://input'), true);
$action = $_GET['action'] ?? ($input['action'] ?? 'read_employees');

try {
    // ==================================================================================
    // 1. Employee: read_employees 
    // (ดึงข้อมูลพนักงาน + Dropdown Line/Shift)
    // ==================================================================================
    if ($action === 'read_employees') {
        $sql = "SELECT 
                    E.id, E.emp_id, E.name_th, E.position, E.line, E.department_api, E.is_active,
                    E.default_shift_id, E.team_group,
                    S.shift_name
                FROM " . MANPOWER_EMPLOYEES_TABLE . " E WITH (NOLOCK)
                LEFT JOIN " . MANPOWER_SHIFTS_TABLE . " S ON E.default_shift_id = S.shift_id
                ORDER BY CASE WHEN E.line = 'TOOLBOX_POOL' THEN 0 ELSE 1 END, E.line, E.emp_id";
        
        $stmt = $pdo->query($sql);
        $employees = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // ดึงตัวเลือก Shifts
        $stmtShifts = $pdo->query("SELECT shift_id, shift_name, start_time, end_time FROM " . MANPOWER_SHIFTS_TABLE . " WHERE is_active = 1 ORDER BY start_time");
        $shifts = $stmtShifts->fetchAll(PDO::FETCH_ASSOC);

        // ดึงตัวเลือก Lines จากที่มีอยู่จริง + Default
        $stmtLines = $pdo->query("SELECT DISTINCT line FROM " . MANPOWER_EMPLOYEES_TABLE . " WHERE line IS NOT NULL ORDER BY line");
        $lines = $stmtLines->fetchAll(PDO::FETCH_COLUMN);

        $defaultLines = ["ASSEMBLY", "BEND", "PAINT", "PRESS", "SPOT", "ST/WH", "QA/QC", "MT/PE", "OFFICE", "TOOLBOX_POOL"];
        $lines = array_unique(array_merge($lines, $defaultLines));
        sort($lines);

        echo json_encode([
            'success' => true,
            'data' => $employees,
            'shifts' => $shifts,
            'lines' => $lines
        ]);

    // ==================================================================================
    // 2. Employee: update_employee 
    // (แก้ไขรายคน - Logic เดิมจาก manage_employees.php)
    // ==================================================================================
    } elseif ($action === 'update_employee') {
        $empId  = $input['emp_id'] ?? '';
        $line   = $input['line'] ?? null;
        $shift  = $input['shift_id'] ?? null;
        $team   = $input['team_group'] ?? null;
        $active = $input['is_active'] ?? 1;

        if (empty($empId)) throw new Exception("Employee ID is required.");
        if (empty($line)) throw new Exception("Line is required.");

        $sql = "UPDATE " . MANPOWER_EMPLOYEES_TABLE . " 
                SET line = ?, default_shift_id = ?, team_group = ?, is_active = ?, last_sync_at = GETDATE()
                WHERE emp_id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$line, $shift, $team, $active, $empId]);

        echo json_encode(['success' => true, 'message' => 'Employee updated successfully']);

    // ==================================================================================
    // 3. Employee: update_team_shift_legacy (Logic เดิม)
    // (เปลี่ยนกะแบบระบุ Shift A -> X, Shift B -> Y)
    // ==================================================================================
    } elseif ($action === 'update_team_shift_legacy') {
        $line   = $input['line'] ?? '';
        $shiftA = $input['shift_a'] ?? null; 
        $shiftB = $input['shift_b'] ?? null;
        
        if (empty($line)) throw new Exception("Line is required.");

        $pdo->beginTransaction();
        $updateCount = 0;

        // Update Team A
        if (!empty($shiftA)) {
            $sqlA = "UPDATE " . MANPOWER_EMPLOYEES_TABLE . " 
                     SET default_shift_id = ?, last_sync_at = GETDATE()
                     WHERE line = ? AND team_group = 'A' AND is_active = 1";
            $stmtA = $pdo->prepare($sqlA);
            $stmtA->execute([$shiftA, $line]);
            $updateCount += $stmtA->rowCount();
        }

        // Update Team B
        if (!empty($shiftB)) {
            $sqlB = "UPDATE " . MANPOWER_EMPLOYEES_TABLE . " 
                     SET default_shift_id = ?, last_sync_at = GETDATE()
                     WHERE line = ? AND team_group = 'B' AND is_active = 1";
            $stmtB = $pdo->prepare($sqlB);
            $stmtB->execute([$shiftB, $line]);
            $updateCount += $stmtB->rowCount();
        }

        $pdo->commit();
        
        if ($updateCount === 0) {
            echo json_encode(['success' => true, 'message' => "No employees updated (Check Team Assignment)."]);
        } else {
            echo json_encode(['success' => true, 'message' => "Success! Updated $updateCount employees."]);
        }

    // ==================================================================================
    // 4. Mapping: read_mappings 
    // (ดึงข้อมูล Mapping)
    // ==================================================================================
    } elseif ($action === 'read_mappings') {
        $sqlSec = "SELECT * FROM " . MANPOWER_SECTION_MAPPING_TABLE . " ORDER BY display_section";
        $stmtSec = $pdo->query($sqlSec);
        $sections = $stmtSec->fetchAll(PDO::FETCH_ASSOC);

        $sqlCat = "SELECT * FROM " . MANPOWER_CATEGORY_MAPPING_TABLE . " ORDER BY category_name";
        $stmtCat = $pdo->query($sqlCat);
        $categories = $stmtCat->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            'success' => true,
            'sections' => $sections,
            'categories' => $categories
        ]);

    // ==================================================================================
    // 5. Mapping: save_mappings 
    // (บันทึก Mapping)
    // ==================================================================================
    } elseif ($action === 'save_mappings') {
        if (!hasRole(['admin', 'creator'])) throw new Exception("Unauthorized to edit mappings.");

        $pdo->beginTransaction();

        // 5.1 Save Sections
        if (isset($input['sections'])) {
            $pdo->exec("DELETE FROM " . MANPOWER_SECTION_MAPPING_TABLE);
            $stmtSec = $pdo->prepare("INSERT INTO " . MANPOWER_SECTION_MAPPING_TABLE . " (api_department, display_section, is_production) VALUES (?, ?, ?)");
            foreach ($input['sections'] as $sec) {
                $stmtSec->execute([$sec['api_department'], $sec['display_section'], $sec['is_production']]);
            }
        }

        // 5.2 Save Categories
        if (isset($input['categories'])) {
            $pdo->exec("DELETE FROM " . MANPOWER_CATEGORY_MAPPING_TABLE);
            
            $stmtCat = $pdo->prepare("INSERT INTO " . MANPOWER_CATEGORY_MAPPING_TABLE . " (keyword, category_name, hourly_rate, rate_type) VALUES (?, ?, ?, ?)");
            
            foreach ($input['categories'] as $cat) {
                $keyword = $cat['api_position'] ?? $cat['keyword'];
                $rate = $cat['hourly_rate'] ?? 0;
                $type = $cat['rate_type'] ?? 'HOURLY'; // Default Value
                
                $stmtCat->execute([$keyword, $cat['category_name'], $rate, $type]);
            }
        }

        $pdo->commit();
        echo json_encode(['success' => true, 'message' => 'Mapping saved successfully']);

    // ==================================================================================
    // 6. Calendar: generate_calendar 
    // (สร้างปฏิทินวันหยุดประจำปีอัตโนมัติ)
    // ==================================================================================
    } elseif ($action === 'generate_calendar') {
        if (!hasRole(['admin', 'creator'])) throw new Exception("Unauthorized.");

        $year = $_GET['year'] ?? date('Y', strtotime('+1 year')); 
        
        $pdo->beginTransaction();

        // 6.1 ล้างข้อมูลเก่าของปีนั้น
        $stmtDel = $pdo->prepare("DELETE FROM MANPOWER_CALENDAR WHERE YEAR(calendar_date) = ?");
        $stmtDel->execute([$year]);

        // 6.2 วนลูปสร้างวันอาทิตย์ (Sunday Loop)
        $startDate = new DateTime("$year-01-01");
        $endDate   = new DateTime("$year-12-31");
        
        $stmtInsert = $pdo->prepare("INSERT INTO MANPOWER_CALENDAR 
            (calendar_date, day_type, description, work_rate_holiday, ot_rate_holiday) 
            VALUES (?, ?, ?, ?, ?)");

        while ($startDate <= $endDate) {
            if ($startDate->format('w') == 0) { // 0 = Sunday
                $stmtInsert->execute([
                    $startDate->format('Y-m-d'),
                    'HOLIDAY',
                    'Sunday',
                    2.0, 
                    3.0  
                ]);
            }
            $startDate->modify('+1 day');
        }

        // 6.3 ดึงวันหยุดราชการจาก API
        $apiUrl = "https://date.nager.at/api/v3/PublicHolidays/$year/TH";
        $context = stream_context_create(["http" => ["header" => "User-Agent: Mozilla/5.0"]]);
        $json = @file_get_contents($apiUrl, false, $context);
        
        if ($json) {
            $holidays = json_decode($json, true);
            foreach ($holidays as $h) {
                $hDate = $h['date'];
                $hName = $h['localName'] ?? $h['name'];

                // เช็คว่ามีใน DB หรือยัง (เช่น ตรงกับวันอาทิตย์)
                $check = $pdo->prepare("SELECT COUNT(*) FROM MANPOWER_CALENDAR WHERE calendar_date = ?");
                $check->execute([$hDate]);
                
                if ($check->fetchColumn() > 0) {
                    $upd = $pdo->prepare("UPDATE MANPOWER_CALENDAR SET description = ? WHERE calendar_date = ?");
                    $upd->execute([$hName, $hDate]);
                } else {
                    $stmtInsert->execute([$hDate, 'HOLIDAY', $hName, 2.0, 3.0]);
                }
            }
        }

        $pdo->commit();
        echo json_encode(['success' => true, 'message' => "Generated calendar for year $year successfully."]);

    // ==================================================================================
    // 7. [NEW] Team Shift: read_team_shifts (ดูภาพรวมกะของแต่ละทีม)
    // ==================================================================================
    } elseif ($action === 'read_team_shifts') {
        // ดึงข้อมูล Line + Team และดูว่าคนส่วนใหญ่อยู่กะไหน (Majority Rule)
        $sql = "SELECT 
                    line, 
                    ISNULL(team_group, '-') as team_group,
                    default_shift_id,
                    COUNT(emp_id) as member_count,
                    ISNULL(S.shift_name, 'Unknown') as shift_name
                FROM " . MANPOWER_EMPLOYEES_TABLE . " E
                LEFT JOIN " . MANPOWER_SHIFTS_TABLE . " S ON E.default_shift_id = S.shift_id
                WHERE E.is_active = 1
                GROUP BY line, team_group, default_shift_id, S.shift_name
                ORDER BY line, team_group";

        $stmt = $pdo->query($sql);
        $raw = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Grouping ให้เหลือบรรทัดเดียวต่อทีม (กรณีทีมเดียวกันแต่มีคนหลุดกะไปบ้าง ให้ยึดเสียงส่วนใหญ่)
        $teams = [];
        foreach ($raw as $r) {
            $key = $r['line'] . '|' . $r['team_group'];
            if (!isset($teams[$key])) {
                $teams[$key] = $r;
            } else {
                if ($r['member_count'] > $teams[$key]['member_count']) {
                    $teams[$key] = $r;
                }
            }
        }

        echo json_encode(['success' => true, 'data' => array_values($teams)]);

    // ==================================================================================
    // 8. [NEW] Team Shift: update_team_shift (สลับกะยกทีม)
    // ==================================================================================
    } elseif ($action === 'update_team_shift') {
        if (!hasRole(['admin', 'creator', 'supervisor'])) throw new Exception("Unauthorized");

        $line = $input['line'] ?? '';
        $team = $input['team'] ?? '';
        $newShiftId = $input['new_shift_id'] ?? '';

        if (empty($line) || empty($newShiftId)) throw new Exception("Missing parameters.");

        $pdo->beginTransaction();

        // [FIXED] เปลี่ยน updated_at เป็น last_sync_at
        $sql = "UPDATE " . MANPOWER_EMPLOYEES_TABLE . "
                SET default_shift_id = ?, last_sync_at = GETDATE()
                WHERE line = ? AND is_active = 1";
        
        $params = [$newShiftId, $line];

        // ถ้าระบุ Team (และไม่ใช่ขีด) ให้กรองด้วย
        if (!empty($team) && $team !== '-') {
            $sql .= " AND team_group = ?";
            $params[] = $team;
        }

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $count = $stmt->rowCount();

        $pdo->commit();
        echo json_encode(['success' => true, 'message' => "Updated $count employees to new shift."]);

    } else {
        throw new Exception("Invalid Action");
    }

} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>