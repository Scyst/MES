<?php
// transport-system/api/auth/login.php
require_once '../db.php';
require_once 'token_utils.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method !== 'POST') {
    sendResponse(false, null, "Method Not Allowed", 405);
}

$input = getJsonInput();
$empId = $input['empId'] ?? '';

if (empty($empId)) {
    sendResponse(false, null, "กรุณาระบุรหัสพนักงาน", 400);
}

$pdo = getDB();
try {
    // ตรวจสอบในตารางพนักงาน
    $stmt = $pdo->prepare("SELECT emp_id, emp_name, bu_id, is_active FROM TRANSPORT_EMP_SYNC WHERE emp_id = ?");
    $stmt->execute([$empId]);
    $emp = $stmt->fetch();
    
    // Fallback: If not in sync table, we will still allow login but they might need to provide their name later
    $name = $emp ? $emp['emp_name'] : $empId;
    $bu = $emp ? $emp['bu_id'] : '';
    
    if ($emp && !$emp['is_active']) {
        sendResponse(false, null, "พนักงานท่านนี้พ้นสภาพ หรือไม่อยู่ในสถานะ Active", 403);
    }

    $payload = [
        'empId' => $empId,
        'name' => $name,
        'bu' => $bu,
        'iat' => time()
    ];
    
    $token = createSignedToken($payload);
    
    // ตั้งค่า HttpOnly Cookie อายุ 90 วัน
    $cookieOptions = [
        'expires' => time() + (90 * 24 * 60 * 60), // 90 days
        'path' => '/',
        'domain' => '',
        'secure' => isset($_SERVER['HTTPS']), // True in production
        'httponly' => true, // ป้องกัน XSS
        'samesite' => 'Strict'
    ];
    
    setcookie('transport_token', $token, $cookieOptions);
    
    sendResponse(true, $payload, "เข้าสู่ระบบสำเร็จ");
    
} catch (Exception $e) {
    sendResponse(false, null, "ระบบขัดข้อง: " . $e->getMessage(), 500);
}
?>
