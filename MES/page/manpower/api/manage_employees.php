<?php
// page/manpower/api/manage_employees.php

header('Content-Type: application/json');
require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../../auth/check_auth.php';
require_once __DIR__ . '/../../../config/config.php';

// อนุญาตเฉพาะ Admin/Supervisor/Creator
if (!hasRole(['admin', 'creator', 'supervisor'])) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Unauthorized access.']);
    exit;
}

$action = $_REQUEST['action'] ?? 'read';

try {
    if ($action === 'read') {
        // 1. ดึงรายชื่อพนักงานทั้งหมดจาก DB ของเรา
        // เรียงตาม Line เพื่อให้ดูง่ายว่าใครอยู่ไหน
        $sql = "SELECT 
                    E.id, E.emp_id, E.name_th, E.position, E.line, E.department_api, E.is_active,
                    E.default_shift_id, E.team_group,
                    S.shift_name
                FROM " . MANPOWER_EMPLOYEES_TABLE . " E WITH (NOLOCK)
                LEFT JOIN " . MANPOWER_SHIFTS_TABLE . " S ON E.default_shift_id = S.shift_id
                ORDER BY CASE WHEN E.line = 'TOOLBOX_POOL' THEN 0 ELSE 1 END, E.line, E.emp_id";
        
        $stmt = $pdo->query($sql);
        $employees = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // 2. ดึงตัวเลือกกะ (Shift Options)
        $shifts = $pdo->query("SELECT shift_id, shift_name, start_time, end_time FROM " . MANPOWER_SHIFTS_TABLE . " WHERE is_active = 1")->fetchAll(PDO::FETCH_ASSOC);

        // 3. ส่งรายชื่อ Line ที่มีอยู่จริงกลับไป (เพื่อให้ Dropdown หน้าเว็บถูกต้อง)
        // Hardcode ไว้ตามที่คุณให้มาใน JSON เพื่อความชัวร์ หรือจะดึง DISTINCT จาก DB ก็ได้
        $lines = [
            "ASSEMBLY", "BEND", "PAINT", "PRESS", "SPOT", "ST/WH", "QA/QC", "MT/PE", "OFFICE", "TOOLBOX_POOL"
        ];

        echo json_encode([
            'success' => true,
            'data' => $employees,
            'shifts' => $shifts,
            'lines' => $lines
        ]);

    } elseif ($action === 'update') {
        // --- ส่วนอัปเดตข้อมูล (Admin เป็นคนทำ) ---
        $input = json_decode(file_get_contents('php://input'), true);
        
        $empId = $input['emp_id'] ?? '';
        $line  = $input['line'] ?? null;
        $shift = $input['shift_id'] ?? null;
        $team  = $input['team_group'] ?? null;
        $active = $input['is_active'] ?? 1;

        if (empty($empId)) throw new Exception("Employee ID is required.");
        if (empty($line)) throw new Exception("Line is required.");

        // อัปเดตข้อมูลลงฐานข้อมูลโดยตรง
        $sql = "UPDATE " . MANPOWER_EMPLOYEES_TABLE . " 
                SET line = ?, 
                    default_shift_id = ?, 
                    team_group = ?, 
                    is_active = ?,
                    last_sync_at = GETDATE()
                WHERE emp_id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$line, $shift, $team, $active, $empId]);

        echo json_encode(['success' => true, 'message' => 'Employee updated successfully']);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>