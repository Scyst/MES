<?php
// MES/page/manpower/api/api_master_data.php

// 1. Header & Error Handling
header('Content-Type: application/json');
ini_set('display_errors', 0);
error_reporting(E_ALL);

require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../../auth/check_auth.php';
require_once __DIR__ . '/../../../config/config.php';

// 2. Auth Check
if (!isset($_SESSION['user'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

$currentUser = $_SESSION['user'];
$updatedBy = $currentUser['username'];

// 3. Input Handling
$input = json_decode(file_get_contents('php://input'), true);
$action = $_GET['action'] ?? ($input['action'] ?? '');

// 4. Performance (Unlock Session)
session_write_close();

try {
    switch ($action) {

        // ======================================================================
        // CASE: read_structure (Dropdown Line/Team)
        // ======================================================================
        case 'read_structure':
            // Lines
            $stmtLine = $pdo->query("SELECT DISTINCT line FROM " . MANPOWER_EMPLOYEES_TABLE . " WHERE line IS NOT NULL AND line != '' ORDER BY line ASC");
            $lines = $stmtLine->fetchAll(PDO::FETCH_COLUMN);

            // Teams
            $stmtTeam = $pdo->query("SELECT DISTINCT team_group FROM " . MANPOWER_EMPLOYEES_TABLE . " WHERE team_group IS NOT NULL AND team_group != '' ORDER BY team_group ASC");
            $teams = $stmtTeam->fetchAll(PDO::FETCH_COLUMN);

            echo json_encode(['success' => true, 'lines' => $lines, 'teams' => $teams]);
            break;

        // ======================================================================
        // [FIX] 1. อ่านข้อมูลพนักงานรายคน (Fetch Fresh Data)
        // ======================================================================
        case 'read_single_employee':
            $empId = $_GET['emp_id'] ?? '';
            if (!$empId) throw new Exception("Employee ID is required.");

            // ✅ [UPDATED] เพิ่ม start_date, resign_date ในการดึงข้อมูล
            $sql = "SELECT emp_id, name_th, position, line, team_group, 
                           default_shift_id, is_active, start_date, resign_date 
                    FROM " . MANPOWER_EMPLOYEES_TABLE . " 
                    WHERE emp_id = ?";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$empId]);
            $data = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$data) throw new Exception("Employee not found in DB.");

            echo json_encode(['success' => true, 'data' => $data]);
            break;

        // ======================================================================
        // CASE: read_employees (List View)
        // ======================================================================
        case 'read_employees':
            $showAll = filter_var($_GET['show_all'] ?? false, FILTER_VALIDATE_BOOLEAN);
            
            // ✅ แก้ไข SQL: เพิ่ม start_date และ resign_date
            $sql = "SELECT 
                        E.emp_id, 
                        E.name_th, 
                        E.position, 
                        E.line, 
                        E.team_group, 
                        E.default_shift_id, 
                        E.is_active, 
                        CM.rate_type as emp_type,
                        S.shift_name,
                        CONVERT(VARCHAR(10), E.start_date, 120) as start_date,
                        CONVERT(VARCHAR(10), E.resign_date, 120) as resign_date

                    FROM " . MANPOWER_EMPLOYEES_TABLE . " E
                    LEFT JOIN " . MANPOWER_SHIFTS_TABLE . " S ON E.default_shift_id = S.shift_id
                    OUTER APPLY (
                        SELECT TOP 1 rate_type 
                        FROM " . MANPOWER_CATEGORY_MAPPING_TABLE . " M 
                        WHERE E.position LIKE '%' + M.keyword + '%' 
                        ORDER BY LEN(M.keyword) DESC
                    ) CM ";

            if (!$showAll) {
                $sql .= " WHERE E.is_active = 1";
            }
            
            $sql .= " ORDER BY E.emp_id ASC";

            $stmt = $pdo->query($sql);
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode(['success' => true, 'data' => $data]);
            break;

        // ======================================================================
        // CASE: read_team_shifts (Shift Planner)
        // ======================================================================
        case 'read_team_shifts':
            $sql = "SELECT line, team_group, MAX(default_shift_id) as default_shift_id, COUNT(emp_id) as member_count
                    FROM " . MANPOWER_EMPLOYEES_TABLE . "
                    WHERE is_active = 1 AND team_group IS NOT NULL AND team_group != ''
                    GROUP BY line, team_group
                    ORDER BY line, team_group";

            $stmt = $pdo->prepare($sql);
            $stmt->execute();
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
            break;

        // ======================================================================
        // CASE: update_team_shift (Bulk Update)
        // ======================================================================
        case 'update_team_shift':
            if (!hasRole(['admin', 'creator'])) throw new Exception("Unauthorized");

            $line = $input['line'] ?? '';
            $team = $input['team'] ?? '';
            $newShiftId = $input['new_shift_id'] ?? '';

            if (empty($line) || empty($team) || empty($newShiftId)) throw new Exception("Missing parameters");

            $sql = "UPDATE " . MANPOWER_EMPLOYEES_TABLE . " SET default_shift_id = ? WHERE line = ? AND team_group = ? AND is_active = 1";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$newShiftId, $line, $team]);
            
            $count = $stmt->rowCount();

            // Log
            $pdo->prepare("INSERT INTO " . USER_LOGS_TABLE . " (action_by, action_type, detail, created_at) VALUES (?, 'SHIFT_PLAN', ?, GETDATE())")
                ->execute([$updatedBy, "Shift Change: $line Team $team -> Shift $newShiftId ($count updated)"]);

            echo json_encode(['success' => true, 'message' => "Updated $count employees."]);
            break;

        // ======================================================================
        // CASE: create_employee
        // ======================================================================
        case 'create_employee':
            if (!hasRole(['admin', 'creator'])) throw new Exception("Unauthorized");

            $empId = trim($input['emp_id']);
            $name = trim($input['name_th']);
            $pos = trim($input['position'] ?? 'Operator');
            $line = trim($input['line']);
            $shift = $input['shift_id'] ?? 1;
            $team = trim($input['team_group'] ?? '-');
            
            // ✅ [UPDATED] รับค่า start_date
            $startDate = !empty($input['start_date']) ? $input['start_date'] : date('Y-m-d');

            // Duplicate Check
            $stmtCheck = $pdo->prepare("SELECT COUNT(*) FROM " . MANPOWER_EMPLOYEES_TABLE . " WHERE emp_id = ?");
            $stmtCheck->execute([$empId]);
            if ($stmtCheck->fetchColumn() > 0) throw new Exception("Employee ID already exists!");

            // ✅ [UPDATED] เพิ่ม start_date ลงใน Insert
            $sql = "INSERT INTO " . MANPOWER_EMPLOYEES_TABLE . " 
                    (emp_id, name_th, position, line, default_shift_id, team_group, is_active, created_at, start_date)
                    VALUES (?, ?, ?, ?, ?, ?, 1, GETDATE(), ?)";
            
            $pdo->prepare($sql)->execute([$empId, $name, $pos, $line, $shift, $team, $startDate]);
            echo json_encode(['success' => true, 'message' => 'Created successfully']);
            break;

        // ======================================================================
        // [FINAL & SECURE] 2. บันทึกแก้ไขข้อมูลพนักงาน (Update Logic + Retroactive)
        // ======================================================================
        case 'update_employee':
            if (!hasRole(['admin', 'creator'])) throw new Exception("Unauthorized");

            // 1. ประกาศตัวแปร updatedBy ให้ชัดเจน
            $updatedBy = $_SESSION['user']['username'] ?? 'SYSTEM'; 

            $empId      = trim($input['emp_id'] ?? '');
            $name       = trim($input['name_th'] ?? '');
            $pos        = trim($input['position'] ?? '');
            $line       = trim($input['line'] ?? '');
            $shift      = $input['shift_id'] ?? ($input['default_shift_id'] ?? null);
            $team       = trim($input['team_group'] ?? '-');
            $active     = isset($input['is_active']) ? intval($input['is_active']) : 1;
            
            // รับค่าวันที่ (จากที่คุณเขียนเพิ่มมา)
            $startDate  = !empty($input['start_date']) ? $input['start_date'] : null;
            $resignDate = !empty($input['resign_date']) ? $input['resign_date'] : null;

            if (empty($empId)) throw new Exception("Employee ID is missing.");

            $pdo->beginTransaction();

            try {
                // 2.1 Update Master Data
                $sql = "UPDATE " . MANPOWER_EMPLOYEES_TABLE . " 
                        SET name_th = ?, position = ?, line = ?, default_shift_id = ?, team_group = ?, is_active = ?, last_sync_at = GETDATE(),
                        start_date = ?, resign_date = ? 
                        WHERE emp_id = ?";
                
                $pdo->prepare($sql)->execute([$name, $pos, $line, $shift, $team, $active, $startDate, $resignDate, $empId]);

                // 2.2 Retroactive Log Update (อัปเดตย้อนหลัง)
                if (!empty($input['update_logs']) && !empty($input['effective_date'])) {
                    $effDate = $input['effective_date'];
                    
                    $sqlRetro = "UPDATE " . MANPOWER_DAILY_LOGS_TABLE . "
                                 SET actual_line = ?,
                                     actual_team = ?,
                                     shift_id = ?,
                                     updated_at = GETDATE(),
                                     updated_by = ?
                                 WHERE emp_id = ? 
                                   AND log_date >= ?
                                   AND (is_verified = 0 OR is_verified IS NULL)"; // Handle NULL

                    $pdo->prepare($sqlRetro)->execute([$line, $team, $shift, $updatedBy, $empId, $effDate]);
                }

                // 2.3 Cleanup Logic (ถ้าปิดการใช้งาน)
                if ($active === 0) {
                    $sqlCleanLog = "DELETE FROM " . MANPOWER_DAILY_LOGS_TABLE . " 
                                    WHERE emp_id = ? 
                                      AND log_date >= CAST(GETDATE() AS DATE) 
                                      AND (is_verified = 0 OR is_verified IS NULL)";
                    $pdo->prepare($sqlCleanLog)->execute([$empId]);
                }

                $pdo->commit();
                echo json_encode(['success' => true, 'message' => 'Updated successfully']);

            } catch (Exception $e) {
                $pdo->rollBack();
                throw $e;
            }
            break;

        // ======================================================================
        // [FINAL & SECURE] CASE: terminate_employee (ลาออก)
        // ======================================================================
        case 'terminate_employee':
            if (!hasRole(['admin', 'creator'])) throw new Exception("Unauthorized");
            
            $updatedBy = $_SESSION['user']['username'] ?? 'SYSTEM'; // ประกาศตัวแปร
            $empId = $input['emp_id'] ?? '';
            $resignDate = $input['resign_date'] ?? date('Y-m-d');

            if (empty($empId)) throw new Exception("Missing Employee ID");

            $pdo->beginTransaction();

            try {
                // 1. Deactivate & Set Resign Date
                $pdo->prepare("UPDATE " . MANPOWER_EMPLOYEES_TABLE . " 
                               SET is_active = 0, last_sync_at = GETDATE(), resign_date = ? 
                               WHERE emp_id = ?")
                    ->execute([$resignDate, $empId]);
                
                // 2. ปรับปรุงสถานะ Log ในวันที่ลาออก (ใช้ $resignDate ไม่ใช่ GETDATE())
                $stmtUpdate = $pdo->prepare("UPDATE " . MANPOWER_DAILY_LOGS_TABLE . " 
                                             SET status = 'RESIGNED', updated_at = GETDATE(), updated_by = ? 
                                             WHERE emp_id = ? AND log_date = ?");
                $stmtUpdate->execute([$updatedBy, $empId, $resignDate]);

                // 3. ลบ Log อนาคตหลังจากวันที่ลาออก
                $stmtDelete = $pdo->prepare("DELETE FROM " . MANPOWER_DAILY_LOGS_TABLE . " 
                                             WHERE emp_id = ? AND log_date > ? AND (is_verified = 0 OR is_verified IS NULL)");
                $stmtDelete->execute([$empId, $resignDate]);
                
                $pdo->commit();
                echo json_encode(['success' => true, 'message' => 'Staff termination processed successfully']);

            } catch (Exception $e) {
                $pdo->rollBack();
                throw $e;
            }
            break;

        // ======================================================================
        // CASE: read_mappings
        // ======================================================================
        case 'read_mappings':
            $stmt = $pdo->prepare("SELECT * FROM " . MANPOWER_CATEGORY_MAPPING_TABLE . " ORDER BY category_name ASC, keyword ASC");
            $stmt->execute();
            echo json_encode(['success' => true, 'categories' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
            break;

        // ======================================================================
        // CASE: save_mappings (Bulk Save)
        // ======================================================================
        case 'save_mappings':
            if (!hasRole(['admin', 'creator'])) throw new Exception("Unauthorized.");

            $categories = $input['categories'] ?? [];

            $pdo->beginTransaction();
            
            // 1. Clear Old
            $pdo->exec("DELETE FROM " . MANPOWER_CATEGORY_MAPPING_TABLE);
            
            // 2. Insert New
            $stmt = $pdo->prepare("INSERT INTO " . MANPOWER_CATEGORY_MAPPING_TABLE . " (keyword, category_name, hourly_rate, rate_type) VALUES (?, ?, ?, ?)");
            
            foreach ($categories as $cat) {
                $rate = $cat['hourly_rate'] ?? 0;
                $type = $cat['rate_type'] ?? 'MONTHLY';
                $stmt->execute([trim($cat['keyword']), trim($cat['category_name']), $rate, $type]);
            }

            $pdo->commit();
            echo json_encode(['success' => true, 'message' => 'Mappings saved successfully']);
            break;

        // ======================================================================
        // DEFAULT
        // ======================================================================
        default:
            throw new Exception("Invalid Action or Method");
    }

} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>