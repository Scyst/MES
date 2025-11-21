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

// กำหนดชื่อตาราง Mapping (เผื่อยังไม่ได้ใส่ใน Config)
$mappingTable = IS_DEVELOPMENT ? 'MANPOWER_DEPARTMENT_MAPPING_TEST' : 'MANPOWER_DEPARTMENT_MAPPING';

$action = $_REQUEST['action'] ?? 'read';

try {
    if ($action === 'read') {
        // --- 1. ดึงรายชื่อพนักงาน (เหมือนเดิม) ---
        $sql = "SELECT 
                    E.id, E.emp_id, E.name_th, E.position, E.line, E.department_api, E.is_active,
                    E.default_shift_id, S.shift_name
                FROM " . MANPOWER_EMPLOYEES_TABLE . " E
                LEFT JOIN " . MANPOWER_SHIFTS_TABLE . " S ON E.default_shift_id = S.shift_id
                ORDER BY 
                    CASE WHEN E.line LIKE '%POOL%' THEN 0 ELSE 1 END, 
                    E.line ASC, E.emp_id ASC";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute();
        $employees = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // --- 2. ดึงข้อมูลกะ (เหมือนเดิม) ---
        $stmtShift = $pdo->query("SELECT shift_id, shift_name, start_time, end_time FROM " . MANPOWER_SHIFTS_TABLE . " WHERE is_active = 1");
        $shifts = $stmtShift->fetchAll(PDO::FETCH_ASSOC);

        // --- 3. ★★★ NEW: ดึงรายชื่อ Line จากระบบ (System + Mapping) ★★★ ---
        $lines = [];

        // 3.1 จากตาราง ROUTES (ไลน์ผลิตจริงในระบบ)
        // (ใช้ try-catch เผื่อตารางนี้ไม่มีในบาง Environment)
        try {
            $sqlRoutes = "SELECT DISTINCT line FROM " . ROUTES_TABLE . " WHERE line IS NOT NULL AND line != ''";
            $stmtRoutes = $pdo->query($sqlRoutes);
            while ($row = $stmtRoutes->fetch(PDO::FETCH_COLUMN)) {
                $lines[] = trim($row);
            }
        } catch (Exception $e) { /* Ignore if route table missing */ }

        // 3.2 จากตาราง Mapping (กลุ่มพิเศษที่ Manpower ตั้งไว้)
        try {
            $sqlMap = "SELECT DISTINCT target_line FROM " . $mappingTable . " WHERE is_active = 1";
            $stmtMap = $pdo->query($sqlMap);
            while ($row = $stmtMap->fetch(PDO::FETCH_COLUMN)) {
                $lines[] = trim($row);
            }
        } catch (Exception $e) { /* Ignore */ }

        // 3.3 เพิ่มค่า Default ที่ต้องมีเสมอ
        $lines[] = 'TOOLBOX_POOL';
        $lines[] = 'OFFICE';

        // 3.4 ลบตัวซ้ำ + เรียงตามตัวอักษร
        $lines = array_unique($lines);
        sort($lines);

        echo json_encode([
            'success' => true,
            'data' => $employees,
            'shifts' => $shifts,
            'lines' => array_values($lines) // ส่ง list ที่เรียงแล้วกลับไป
        ]);

    } elseif ($action === 'update') {
        // ... (ส่วน Update เหมือนเดิม ไม่ต้องแก้) ...
        $input = json_decode(file_get_contents('php://input'), true);
        $empId = $input['emp_id'] ?? '';
        $line = $input['line'] ?? null;
        $shiftId = $input['shift_id'] ?? null;
        $isActive = $input['is_active'] ?? 1;

        if (empty($empId)) throw new Exception("Employee ID is required.");
        
        $sql = "UPDATE " . MANPOWER_EMPLOYEES_TABLE . " 
                SET line = ?, default_shift_id = ?, is_active = ?, last_sync_at = GETDATE()
                WHERE emp_id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$line, $shiftId, $isActive, $empId]);

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