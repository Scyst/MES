<?php
// Toolbox/public/api/transport/auth/check_auth.php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/token_utils.php';

function checkAuth() {
    $token = $_COOKIE['transport_token'] ?? '';
    
    if (empty($token)) {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
        $mesUser = $_SESSION['user'] ?? null;
        if (session_status() === PHP_SESSION_ACTIVE && !defined('KEEP_SESSION_LOCK')) {
            session_write_close();
        }
        if ($mesUser && isset($mesUser['username'])) {
            return [
                'empId' => $mesUser['emp_id'] ?? $mesUser['username'],
                'name' => $mesUser['fullname'] ?? $mesUser['username'],
                'bu' => $mesUser['team_group'] ?? $mesUser['department'] ?? $mesUser['line'] ?? '',
                'isVerified' => true
            ];
        }
        sendResponse(false, null, "Session expired. Please log in again.", 401);
    }
    
    $payload = verifySignedToken($token);
    
    if (!$payload) {
        setcookie('transport_token', '', time() - 3600, '/');
        sendResponse(false, null, "Unauthorized (Invalid Token)", 401);
    }
    
    return $payload;
}

$currentPassenger = checkAuth();
?>
