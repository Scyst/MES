<?php
// Toolbox2/public/api/transport/auth/me.php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/token_utils.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method !== 'GET') {
    sendResponse(false, null, "Method Not Allowed", 405);
}

$token = $_COOKIE['transport_token'] ?? '';

if (empty($token)) {
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    if (isset($_SESSION['user']) && isset($_SESSION['user']['username'])) {
        $mesUser = $_SESSION['user'];
        $payload = [
            'empId' => $mesUser['emp_id'] ?? $mesUser['username'],
            'name' => $mesUser['fullname'] ?? $mesUser['username'],
            'bu' => $mesUser['team_group'] ?? $mesUser['department'] ?? $mesUser['line'] ?? '',
            'isVerified' => true
        ];
        sendResponse(true, $payload, "ดึงข้อมูลจาก MES Session สำเร็จ");
    }

    sendResponse(false, null, "Unauthorized", 401);
}

$payload = verifySignedToken($token);

if ($payload) {
    sendResponse(true, $payload, "ดึงข้อมูล Profile สำเร็จ");
} else {
    setcookie('transport_token', '', time() - 3600, '/');
    sendResponse(false, null, "Unauthorized (Invalid Token)", 401);
}
?>
