<?php
// page/sales/api/auth_guest.php
define('ALLOW_GUEST_ACCESS', true); 
require_once __DIR__ . '/../../components/init.php';

header('Content-Type: application/json');

$input = json_decode(file_get_contents('php://input'), true);

// [NEW] เพิ่ม Logic Logout
if (isset($_GET['action']) && $_GET['action'] === 'logout') {
    // ลบเฉพาะ Session ของ Guest
    unset($_SESSION['guest_access']);
    unset($_SESSION['user']);
    echo json_encode(['success' => true]);
    exit;
}

$passcode = $input['passcode'] ?? '';
$CORRECT_PASSCODE = "SHIPPING2026"; // กำหนดรหัสผ่านที่ถูกต้อง

if ($passcode === $CORRECT_PASSCODE) {
    $_SESSION['guest_access'] = true;
    $_SESSION['user'] = [
        'role' => 'CUSTOMER',
        'username' => 'Guest Visitor'
    ];
    echo json_encode(['success' => true]);
} else {
    echo json_encode(['success' => false, 'message' => 'รหัสผ่านไม่ถูกต้อง']);
}
?>