<?php
// page/manpower/api/update_daily_manpower.php
header('Content-Type: application/json');
require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../../auth/check_auth.php';

// ตรวจสอบสิทธิ์ (Supervisor แก้ได้, Admin แก้ได้)
if (!hasRole(['admin', 'creator', 'supervisor'])) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Unauthorized access.']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$logId = $input['log_id'] ?? null;
$status = $input['status'] ?? null;
$remark = trim($input['remark'] ?? '');
$scanTime = !empty($input['scan_time']) ? $input['scan_time'] : null; // รับค่าเวลาที่แก้มา (ถ้ามี)

if (!$logId || !$status) {
    echo json_encode(['success' => false, 'message' => 'Missing required fields.']);
    exit;
}

try {
    $currentUser = $_SESSION['user'];
    $updatedBy = $currentUser['username'];

    // 1. ตรวจสอบสิทธิ์ความเป็นเจ้าของ (Supervisor ต้องแก้ลูกน้องในไลน์ตัวเองเท่านั้น)
    // และตรวจสอบว่าถูก Verify (Lock) ไปหรือยัง
    $checkSql = "SELECT L.is_verified, E.line 
                 FROM " . MANPOWER_DAILY_LOGS_TABLE . " L
                 JOIN " . MANPOWER_EMPLOYEES_TABLE . " E ON L.emp_id = E.emp_id
                 WHERE L.log_id = ?";
    $stmtCheck = $pdo->prepare($checkSql);
    $stmtCheck->execute([$logId]);
    $log = $stmtCheck->fetch(PDO::FETCH_ASSOC);

    if (!$log) {
        throw new Exception("Log not found.");
    }

    // ถ้าเป็น Supervisor ต้องเช็ค Line
    if (hasRole('supervisor')) {
        $userLine = $currentUser['line'] ?? '';
        if ($log['line'] !== $userLine) {
            throw new Exception("Permission Denied: You can only edit employees in your line.");
        }
    }

    // ถ้าถูก Verify (Lock) แล้ว ห้ามแก้ (ยกเว้น Admin/Creator)
    if ($log['is_verified'] == 1 && !hasRole(['admin', 'creator'])) {
        throw new Exception("This record is verified and locked. Contact Admin to unlock.");
    }

    // 2. อัปเดตข้อมูล
    // เราจะเก็บประวัติว่าใครแก้ (Updated_By) และเวลาที่แก้ (Updated_At)
    $sql = "UPDATE " . MANPOWER_DAILY_LOGS_TABLE . " 
            SET status = ?, remark = ?, scan_in_time = ?, updated_by = ?, updated_at = GETDATE()
            WHERE log_id = ?";
    
    $stmt = $pdo->prepare($sql);
    
    // ถ้า scanTime ส่งมาเป็น 'HH:mm' เราต้องเอาวันที่ของ Log เดิมมาแปะ
    // (ในที่นี้สมมติว่า Front-end ส่งมาเป็น Datetime String หรือเราจัดการใน Front-end แล้ว)
    // เพื่อความง่าย เราจะอัปเดตค่าตามที่ส่งมาเลย
    
    $stmt->execute([$status, $remark, $scanTime, $updatedBy, $logId]);

    // 3. (Optional) บันทึก Audit Log ลงตาราง USER_LOGS_TABLE ได้ตรงนี้

    echo json_encode(['success' => true, 'message' => 'Record updated successfully.']);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>