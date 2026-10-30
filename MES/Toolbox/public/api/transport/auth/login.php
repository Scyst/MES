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
$empName = $input['name'] ?? '';

if (empty($empId)) {
    sendResponse(false, null, "กรุณาระบุรหัสพนักงาน", 400);
}

$pdo = getDB();
try {
    // ตรวจสอบในตารางพนักงาน
    $stmt = $pdo->prepare("SELECT emp_id, emp_name, bu_id, is_active FROM TRANSPORT_EMP_SYNC WHERE emp_id = ?");
    $stmt->execute([$empId]);
    $emp = $stmt->fetch();
    
    $isVerified = false;
    $finalName = "";
    $bu = "";

    if ($emp) {
        if (!$emp['is_active']) {
            sendResponse(false, null, "พนักงานท่านนี้พ้นสภาพ หรือไม่อยู่ในสถานะ Active", 403);
        }
        $isVerified = true;
        $finalName = $emp['emp_name'];
        $bu = $emp['bu_id'];
    } else {
        // Fallback: Grace Period (Soft Verification)
        if (preg_match('/^[0-9]{5,7}$/', $empId)) {
            $isVerified = false;
            $finalName = !empty($empName) ? $empName : "Pending Verification";
            $bu = "Unknown";
        } else {
            sendResponse(false, null, "รูปแบบรหัสพนักงานไม่ถูกต้อง", 401);
        }
    }

    $payload = [
        'empId' => $empId,
        'name' => $finalName,
        'bu' => $bu,
        'isVerified' => $isVerified,
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
