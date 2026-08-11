<?php
// transport-system/api/auth/check_auth.php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/token_utils.php';

function checkAuth() {
    $token = $_COOKIE['transport_token'] ?? '';
    
    if (empty($token)) {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
        if (isset($_SESSION['user']) && isset($_SESSION['user']['username'])) {
            $mesUser = $_SESSION['user'];
            return [
                'empId' => $mesUser['username'],
                'name' => $mesUser['username'],
                'bu' => $mesUser['department'] ?? '',
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

// Ensure the token is valid for all scripts requiring this file
$currentPassenger = checkAuth();
?>
