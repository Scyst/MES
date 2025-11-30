<?php
// page/manpower/api/batch_shift_update.php
header('Content-Type: application/json');
require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../../auth/check_auth.php';

if (!hasRole(['admin', 'creator', 'supervisor'])) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

// 1. รองรับ JSON Input
$input = json_decode(file_get_contents('php://input'), true);
$action = $input['action'] ?? '';
// 2. รองรับ GET Parameter
if (empty($action)) {
    $action = $_GET['action'] ?? $_REQUEST['action'] ?? '';
}

try {
    // Action 1: ดึงตัวเลือก + สถานะปัจจุบัน (Current Shift Assignments)
    if ($action === 'get_options') {
        // 1.1 ดึงรายการกะ
        $stmtShift = $pdo->query("SELECT shift_id, shift_name, start_time, end_time FROM " . MANPOWER_SHIFTS_TABLE . " WHERE is_active = 1 ORDER BY start_time");
        $shifts = $stmtShift->fetchAll(PDO::FETCH_ASSOC);

        // 1.2 ดึงรายชื่อ Line ที่มีอยู่จริง
        $stmtLine = $pdo->query("SELECT DISTINCT line FROM " . MANPOWER_EMPLOYEES_TABLE . " WHERE line IS NOT NULL AND line != '' ORDER BY line");
        $lines = $stmtLine->fetchAll(PDO::FETCH_COLUMN);

        // 1.3 [NEW] หาว่าตอนนี้แต่ละทีมอยู่กะไหน (หาจากค่าที่มีคนใช้เยอะที่สุดในทีมนั้น)
        // ใช้ Window Function: ROW_NUMBER() แบ่งกลุ่มตาม Line+Team แล้วเรียงตามจำนวนคนใช้มากสุด
        $sqlCurrent = "
            WITH RankedShifts AS (
                SELECT 
                    line, 
                    team_group, 
                    default_shift_id, 
                    COUNT(*) as emp_count,
                    ROW_NUMBER() OVER(PARTITION BY line, team_group ORDER BY COUNT(*) DESC) as rn
                FROM " . MANPOWER_EMPLOYEES_TABLE . "
                WHERE team_group IN ('A', 'B') 
                  AND is_active = 1 
                  AND default_shift_id IS NOT NULL
                GROUP BY line, team_group, default_shift_id
            )
            SELECT line, team_group, default_shift_id
            FROM RankedShifts
            WHERE rn = 1
        ";
        $stmtCurrent = $pdo->query($sqlCurrent);
        $currentMap = [];
        while ($row = $stmtCurrent->fetch(PDO::FETCH_ASSOC)) {
            // Output format: ['ASSEMBLY' => ['A' => 1, 'B' => 2]]
            $currentMap[$row['line']][$row['team_group']] = $row['default_shift_id'];
        }

        echo json_encode([
            'success' => true, 
            'shifts' => $shifts, 
            'lines' => $lines,
            'current_assignments' => $currentMap // ส่งค่าปัจจุบันกลับไปด้วย
        ]);
        exit;
    }

    // Action 2: บันทึกการเปลี่ยนกะ (เหมือนเดิม)
    if ($action === 'update_team_shift') {
        $line = $input['line'] ?? '';
        $shiftA = $input['shift_a'] ?? null; 
        $shiftB = $input['shift_b'] ?? null; 
        
        if (empty($line)) throw new Exception("Line is required.");

        $pdo->beginTransaction();
        $updateCount = 0;

        if (!empty($shiftA)) {
            $sqlA = "UPDATE " . MANPOWER_EMPLOYEES_TABLE . " 
                     SET default_shift_id = ?, last_sync_at = GETDATE()
                     WHERE line = ? AND team_group = 'A' AND is_active = 1";
            $stmtA = $pdo->prepare($sqlA);
            $stmtA->execute([$shiftA, $line]);
            $updateCount += $stmtA->rowCount();
        }

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
        exit;
    }

} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>