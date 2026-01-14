<?php
// MES/page/manpower/api/api_master_data.php

// 1. ตั้งค่า Header ให้เป็น JSON เสมอ (สำคัญมาก)
header('Content-Type: application/json');

// 2. ปิดการแสดง Error ผ่าน HTML (ให้ส่งเป็น JSON แทนถ้าพัง)
ini_set('display_errors', 0);
error_reporting(E_ALL);

require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../../auth/check_auth.php';
require_once __DIR__ . '/../../../config/config.php';

// ตรวจสอบสิทธิ์
if (!isset($_SESSION['user'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

// รับค่า Action
$input = json_decode(file_get_contents('php://input'), true);
$action = $_GET['action'] ?? ($input['action'] ?? '');

$currentUser = $_SESSION['user'];
$updatedBy = $currentUser['username'];

// เริ่มทำงาน
try {
    
    // ==================================================================================
    // 1. ACTION: read_structure (สำหรับ Dropdown Line/Team)
    // ==================================================================================
    if ($action === 'read_structure') {
        // ดึง Line ทั้งหมด
        $stmtLine = $pdo->query("SELECT DISTINCT line FROM " . MANPOWER_EMPLOYEES_TABLE . " WHERE line IS NOT NULL AND line != '' ORDER BY line ASC");
        $lines = $stmtLine->fetchAll(PDO::FETCH_COLUMN);

        // ดึง Team ทั้งหมด
        $stmtTeam = $pdo->query("SELECT DISTINCT team_group FROM " . MANPOWER_EMPLOYEES_TABLE . " WHERE team_group IS NOT NULL AND team_group != '' ORDER BY team_group ASC");
        $teams = $stmtTeam->fetchAll(PDO::FETCH_COLUMN);

        echo json_encode([
            'success' => true,
            'lines' => $lines,
            'teams' => $teams
        ]);
    }

    // ==================================================================================
    // 2. ACTION: read_employees (แก้ไขเพิ่ม Filter Active)
    // ==================================================================================
    elseif ($action === 'read_employees') {
        // รับค่า filter (ถ้าส่งมาเป็น 'true' คือเอาหมด, ถ้าไม่ส่งเอาแค่ Active)
        $showAll = isset($_GET['show_all']) && $_GET['show_all'] === 'true';

        $sql = "SELECT 
                    E.emp_id, E.name_th, E.position, E.line, E.team_group, 
                    E.default_shift_id, E.is_active,
                    ISNULL(S.shift_name, '-') as shift_name,
                    ISNULL(CM.category_name, 'Other') as emp_type
                FROM " . MANPOWER_EMPLOYEES_TABLE . " E
                LEFT JOIN " . MANPOWER_SHIFTS_TABLE . " S ON E.default_shift_id = S.shift_id
                OUTER APPLY (
                    SELECT TOP 1 category_name 
                    FROM " . MANPOWER_CATEGORY_MAPPING_TABLE . " M 
                    WHERE E.position LIKE '%' + M.keyword + '%' 
                    ORDER BY LEN(M.keyword) DESC
                ) CM";
        
        // 🔥 ถ้าไม่เลือก Show All ให้กรองเอาเฉพาะคน Active
        if (!$showAll) {
            $sql .= " WHERE E.is_active = 1";
        }
                
        $sql .= " ORDER BY E.is_active DESC, E.line ASC, E.emp_id ASC";

        $stmt = $pdo->prepare($sql);
        $stmt->execute();
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode(['success' => true, 'data' => $data]);
    }

    // ==================================================================================
    // 3. ACTION: read_team_shifts (สำหรับ Shift Planner)
    // ==================================================================================
    elseif ($action === 'read_team_shifts') {
        // Group by Line+Team เพื่อดูว่าทีมไหนอยู่กะอะไร
        $sql = "SELECT 
                    line, 
                    team_group, 
                    MAX(default_shift_id) as default_shift_id, 
                    COUNT(emp_id) as member_count
                FROM " . MANPOWER_EMPLOYEES_TABLE . "
                WHERE is_active = 1 AND team_group IS NOT NULL AND team_group != ''
                GROUP BY line, team_group
                ORDER BY line, team_group";

        $stmt = $pdo->prepare($sql);
        $stmt->execute();
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode(['success' => true, 'data' => $data]);
    }

    // ==================================================================================
    // 4. ACTION: update_team_shift (เปลี่ยนกะยกทีม)
    // ==================================================================================
    elseif ($action === 'update_team_shift') {
        if (!hasRole(['admin', 'creator'])) throw new Exception("Unauthorized");

        $line = $input['line'] ?? '';
        $team = $input['team'] ?? '';
        $newShiftId = $input['new_shift_id'] ?? '';

        if (empty($line) || empty($team) || empty($newShiftId)) throw new Exception("Missing parameters");

        // อัปเดตพนักงานทุกคนใน Line/Team นั้น
        $sql = "UPDATE " . MANPOWER_EMPLOYEES_TABLE . " 
                SET default_shift_id = ? 
                WHERE line = ? AND team_group = ? AND is_active = 1";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$newShiftId, $line, $team]);
        
        $count = $stmt->rowCount();

        // Log
        $detail = "Shift Change: $line Team $team -> Shift $newShiftId ($count updated)";
        $stmtLog = $pdo->prepare("INSERT INTO " . USER_LOGS_TABLE . " (action_by, action_type, detail, created_at) VALUES (?, 'SHIFT_PLAN', ?, GETDATE())");
        $stmtLog->execute([$updatedBy, $detail]);

        echo json_encode(['success' => true, 'message' => "Updated $count employees."]);
    }

    // ==================================================================================
    // 5. ACTION: create_employee (เพิ่มพนักงานใหม่)
    // ==================================================================================
    elseif ($action === 'create_employee') {
        if (!hasRole(['admin', 'creator'])) throw new Exception("Unauthorized");

        $empId = trim($input['emp_id']);
        $name = trim($input['name_th']);
        $pos = trim($input['position'] ?? 'Operator');
        $line = trim($input['line']);
        $shift = $input['shift_id'] ?? 1;
        $team = trim($input['team_group'] ?? '-');

        // Check Duplicate
        $stmtCheck = $pdo->prepare("SELECT COUNT(*) FROM " . MANPOWER_EMPLOYEES_TABLE . " WHERE emp_id = ?");
        $stmtCheck->execute([$empId]);
        if ($stmtCheck->fetchColumn() > 0) throw new Exception("Employee ID already exists!");

        $sql = "INSERT INTO " . MANPOWER_EMPLOYEES_TABLE . " 
                (emp_id, name_th, position, line, default_shift_id, team_group, is_active, created_at)
                VALUES (?, ?, ?, ?, ?, ?, 1, GETDATE())";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$empId, $name, $pos, $line, $shift, $team]);

        echo json_encode(['success' => true, 'message' => 'Created successfully']);
    }

    // ==================================================================================
    // 6. ACTION: update_employee (แก้ไขข้อมูลพนักงาน)
    // ==================================================================================
    elseif ($action === 'update_employee') {
        if (!hasRole(['admin', 'creator'])) throw new Exception("Unauthorized");

        $empId = trim($input['emp_id']);
        $name = trim($input['name_th']);
        $pos = trim($input['position']);
        $line = trim($input['line']);
        $shift = $input['shift_id'];
        $team = trim($input['team_group']);
        $active = isset($input['is_active']) ? intval($input['is_active']) : 1;

        $sql = "UPDATE " . MANPOWER_EMPLOYEES_TABLE . " 
                SET name_th = ?, position = ?, line = ?, default_shift_id = ?, team_group = ?, is_active = ?
                WHERE emp_id = ?";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$name, $pos, $line, $shift, $team, $active, $empId]);

        echo json_encode(['success' => true, 'message' => 'Updated successfully']);
    }

    // ==================================================================================
    // 7. MAPPING: read_mappings (ดึงข้อมูล Mapping ที่มีอยู่)
    // ==================================================================================
    elseif ($action === 'read_mappings') {
        // ดึงข้อมูลเรียงตามชื่อกลุ่ม
        $sql = "SELECT * FROM " . MANPOWER_CATEGORY_MAPPING_TABLE . " ORDER BY category_name ASC, keyword ASC";
        $stmt = $pdo->prepare($sql);
        $stmt->execute();
        $categories = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            'success' => true,
            'categories' => $categories
        ]);
    }

    // ==================================================================================
    // 8. MAPPING: save_mappings (บันทึกข้อมูล Mapping)
    // ==================================================================================
    elseif ($action === 'save_mappings') {
        if (!hasRole(['admin', 'creator'])) throw new Exception("Unauthorized.");

        $categories = $input['categories'] ?? [];

        $pdo->beginTransaction();
        
        // 1. ลบของเก่าออกทั้งหมด (ล้างไพ่)
        $pdo->exec("DELETE FROM " . MANPOWER_CATEGORY_MAPPING_TABLE);
        
        // 2. วนลูปใส่ของใหม่เข้าไป
        $stmt = $pdo->prepare("INSERT INTO " . MANPOWER_CATEGORY_MAPPING_TABLE . " (keyword, category_name, hourly_rate, rate_type) VALUES (?, ?, ?, ?)");
        
        foreach ($categories as $cat) {
            // กำหนดค่า Default ถ้าไม่มีส่งมา
            $rate = $cat['hourly_rate'] ?? 0;
            $type = $cat['rate_type'] ?? 'MONTHLY'; // Default ตาม Schema
            
            $stmt->execute([
                trim($cat['keyword']), 
                trim($cat['category_name']), 
                $rate, 
                $type
            ]);
        }

        $pdo->commit();
        echo json_encode(['success' => true, 'message' => 'Mappings saved successfully']);
    }

    // หากไม่เจอ Action
    else {
        throw new Exception("Invalid Action or Method");
    }

} catch (Exception $e) {
    // ถ้ามี Error ให้ส่งเป็น JSON เสมอ
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>