<?php
// transport-system/api/auth/me.php
require_once '../db.php';
require_once 'token_utils.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method !== 'GET') {
    sendResponse(false, null, "Method Not Allowed", 405);
}

// เช็ค Cookie
$token = $_COOKIE['transport_token'] ?? '';

if (empty($token)) {
    // If no transport token, try fallback to global MES session (if they logged in via main portal)
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    if (isset($_SESSION['user']) && isset($_SESSION['user']['username'])) {
        $mesUser = $_SESSION['user'];
        $payload = [
            'empId' => $mesUser['username'],
            'name' => $mesUser['username'], // Name might not be strictly available depending on MES shape
            'bu' => $mesUser['department'] ?? ''
        ];
        sendResponse(true, $payload, "ดึงข้อมูลจาก MES Session สำเร็จ");
    }

    sendResponse(false, null, "Unauthorized", 401);
}

$payload = verifySignedToken($token);

if ($payload) {
    sendResponse(true, $payload, "ดึงข้อมูล Profile สำเร็จ");
} else {
    // Token is invalid or tampered
    setcookie('transport_token', '', time() - 3600, '/');
    sendResponse(false, null, "Unauthorized (Invalid Token)", 401);
}
?>
