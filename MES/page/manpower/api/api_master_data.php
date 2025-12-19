<?php
// MES/page/manpower/api/api_master_data.php
// รวม: manage_employees, batch_shift_update, manage_mapping

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
    // 3. Employee: update_team_shift 
    // (เปลี่ยนกะยกทีม - Logic เดิมจาก batch_shift_update.php)
    // *แก้ไข: กลับมารับค่า shift_a, shift_b แบบเดิม*
    // ==================================================================================
    } elseif ($action === 'update_team_shift') {
        $line   = $input['line'] ?? '';
        $shiftA = $input['shift_a'] ?? null; // รับค่าตรงๆ แบบเดิม
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
    // (ดึงข้อมูล Mapping - Logic เดิมจาก manage_mapping.php)
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
    // (บันทึก Mapping - Logic เดิม ลบแล้วลงใหม่)
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
            $stmtCat = $pdo->prepare("INSERT INTO " . MANPOWER_CATEGORY_MAPPING_TABLE . " (keyword, category_name, hourly_rate) VALUES (?, ?, ?)");
            foreach ($input['categories'] as $cat) {
                // รองรับชื่อ Key แบบเดิมจาก manage_mapping.php
                $keyword = $cat['api_position'] ?? ($cat['keyword'] ?? '');
                $rate = $cat['hourly_rate'] ?? 0;
                $stmtCat->execute([$keyword, $cat['category_name'], $rate]);
            }
        }

        $pdo->commit();
        echo json_encode(['success' => true, 'message' => 'Mapping saved successfully']);

    } else {
        throw new Exception("Invalid Action");
    }

} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>