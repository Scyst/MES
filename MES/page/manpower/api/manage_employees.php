<?php
// page/manpower/api/manage_employees.php

header('Content-Type: application/json');
require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../../auth/check_auth.php';

if (!hasRole(['admin', 'creator', 'supervisor'])) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Unauthorized access.']);
    exit;
}

// ชื่อตาราง Mapping (ใช้ตัวแปรจาก Config ถ้ามี หรือกำหนดตรงนี้)
$mappingTable = defined('MANPOWER_DEPARTMENT_MAPPING_TABLE') ? MANPOWER_DEPARTMENT_MAPPING_TABLE : (IS_DEVELOPMENT ? 'MANPOWER_DEPARTMENT_MAPPING_TEST' : 'MANPOWER_DEPARTMENT_MAPPING');

$action = $_REQUEST['action'] ?? 'read';

try {
    if ($action === 'read') {
        // --- 1. ดึงรายชื่อพนักงาน (เพิ่ม E.team_group) ---
        $sql = "SELECT 
                    E.id, E.emp_id, E.name_th, E.position, E.line, E.department_api, E.is_active,
                    E.default_shift_id, E.team_group, -- [NEW] เพิ่ม team_group
                    S.shift_name
                FROM " . MANPOWER_EMPLOYEES_TABLE . " E
                LEFT JOIN " . MANPOWER_SHIFTS_TABLE . " S ON E.default_shift_id = S.shift_id
                ORDER BY 
                    CASE WHEN E.line LIKE '%POOL%' THEN 0 ELSE 1 END, 
                    E.line ASC, E.team_group ASC, E.emp_id ASC"; // เรียงตามทีมด้วย
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute();
        $employees = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // --- 2. ดึงข้อมูลกะ ---
        $stmtShift = $pdo->query("SELECT shift_id, shift_name, start_time, end_time FROM " . MANPOWER_SHIFTS_TABLE . " WHERE is_active = 1");
        $shifts = $stmtShift->fetchAll(PDO::FETCH_ASSOC);

        // --- 3. ดึงรายชื่อ Line ---
        $lines = [];
        try {
            $sqlRoutes = "SELECT DISTINCT line FROM " . ROUTES_TABLE . " WHERE line IS NOT NULL AND line != ''";
            $stmtRoutes = $pdo->query($sqlRoutes);
            while ($row = $stmtRoutes->fetch(PDO::FETCH_COLUMN)) { $lines[] = trim($row); }
        } catch (Exception $e) {}

        try {
            $sqlMap = "SELECT DISTINCT target_line FROM " . $mappingTable . " WHERE is_active = 1";
            $stmtMap = $pdo->query($sqlMap);
            while ($row = $stmtMap->fetch(PDO::FETCH_COLUMN)) { $lines[] = trim($row); }
        } catch (Exception $e) {}

        $lines[] = 'TOOLBOX_POOL';
        $lines[] = 'OFFICE';
        $lines = array_unique($lines);
        sort($lines);

        echo json_encode([
            'success' => true,
            'data' => $employees,
            'shifts' => $shifts,
            'lines' => array_values($lines)
        ]);

    } elseif ($action === 'update') {
        $input = json_decode(file_get_contents('php://input'), true);
        $empId = $input['emp_id'] ?? '';
        $line = $input['line'] ?? null;
        $shiftId = $input['shift_id'] ?? null;
        $teamGroup = $input['team_group'] ?? null; // [NEW] รับค่า Team
        $isActive = $input['is_active'] ?? 1;

        if (empty($empId)) throw new Exception("Employee ID is required.");
        
        // [NEW] เพิ่ม team_group ในการ Update
        $sql = "UPDATE " . MANPOWER_EMPLOYEES_TABLE . " 
                SET line = ?, default_shift_id = ?, team_group = ?, is_active = ?, last_sync_at = GETDATE()
                WHERE emp_id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$line, $shiftId, $teamGroup, $isActive, $empId]);

        // อัปเดต User Table ด้วย (เฉพาะ Line)
        if ($line) {
            $sqlUser = "UPDATE " . USERS_TABLE . " SET line = ? WHERE emp_id = ?";
            $pdo->prepare($sqlUser)->execute([$line, $empId]);
        }
        echo json_encode(['success' => true, 'message' => 'Employee updated successfully.']);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>