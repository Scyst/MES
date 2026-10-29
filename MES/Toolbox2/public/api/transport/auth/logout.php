<?php
// transport-system/api/auth/logout.php
require_once '../db.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method !== 'POST') {
    sendResponse(false, null, "Method Not Allowed", 405);
}

// Clear the transport cookie
setcookie('transport_token', '', [
    'expires' => time() - 3600,
    'path' => '/',
    'domain' => '',
    'secure' => isset($_SERVER['HTTPS']),
    'httponly' => true,
    'samesite' => 'Strict'
]);

sendResponse(true, null, "ออกจากระบบสำเร็จ");
?>
