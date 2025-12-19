<?php
// page/manpower/api/update_daily_manpower.php
header('Content-Type: application/json');
require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../../auth/check_auth.php';

if (!hasRole(['admin', 'creator', 'supervisor'])) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Unauthorized access.']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$logId = $input['log_id'] ?? null;
$status = $input['status'] ?? null;
$remark = trim($input['remark'] ?? '');

// [ADDED] รับค่า shift_id จาก Modal ที่ส่งมา
$shiftId = !empty($input['shift_id']) ? intval($input['shift_id']) : null;

$scanInTime = !empty($input['scan_in_time']) ? $input['scan_in_time'] : null;
$scanOutTime = !empty($input['scan_out_time']) ? $input['scan_out_time'] : null;

if (!$logId || !$status) {
    echo json_encode(['success' => false, 'message' => 'Missing required fields.']);
    exit;
}

try {
    $currentUser = $_SESSION['user'];
    $updatedBy = $currentUser['username'];

    // 1. Check Permission (เหมือนเดิม)
    $checkSql = "SELECT L.is_verified, E.line FROM " . MANPOWER_DAILY_LOGS_TABLE . " L JOIN " . MANPOWER_EMPLOYEES_TABLE . " E ON L.emp_id = E.emp_id WHERE L.log_id = ?";
    $stmtCheck = $pdo->prepare($checkSql);
    $stmtCheck->execute([$logId]);
    $log = $stmtCheck->fetch(PDO::FETCH_ASSOC);

    if (!$log) throw new Exception("Log not found.");
    if (hasRole('supervisor')) {
        $userLine = $currentUser['line'] ?? '';
        if ($log['line'] !== $userLine) throw new Exception("Permission Denied.");
    }
    if ($log['is_verified'] == 1 && !hasRole(['admin', 'creator'])) {
        throw new Exception("Locked record.");
    }

    // 2. Update (เพิ่มการบันทึก shift_id ลงไปในประวัติรายวัน)
    // [EDITED] เพิ่ม shift_id ในคำสั่ง UPDATE
    $sql = "UPDATE " . MANPOWER_DAILY_LOGS_TABLE . " 
            SET status = ?, 
                remark = ?, 
                scan_in_time = ?, 
                scan_out_time = ?, 
                shift_id = ?, 
                updated_by = ?, 
                updated_at = GETDATE()
            WHERE log_id = ?";
    
    $stmt = $pdo->prepare($sql);
    // [EDITED] ส่งค่า $shiftId เข้าไปใน Execute array
    $stmt->execute([$status, $remark, $scanInTime, $scanOutTime, $shiftId, $updatedBy, $logId]);

    echo json_encode(['success' => true, 'message' => 'Record updated successfully.']);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>