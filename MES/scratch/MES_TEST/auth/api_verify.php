<?php
// MES/auth/api_verify.php
// This endpoint is called by the Node.js backend to verify the PHP session

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

header('Content-Type: application/json; charset=utf-8');

if (!isset($_SESSION['user'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

echo json_encode([
    'success' => true,
    'user' => $_SESSION['user']
]);
exit;
?>
