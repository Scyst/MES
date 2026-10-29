<?php
// transport-system/api/me.php
require_once '../../auth/check_auth.php';

header('Content-Type: application/json; charset=utf-8');

if (!isset($_SESSION['user'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

echo json_encode([
    'success' => true,
    'data' => $_SESSION['user'],
    'message' => 'User profile fetched successfully'
]);
exit;
?>
