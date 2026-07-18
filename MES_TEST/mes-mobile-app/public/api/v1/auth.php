<?php
session_start();

$origin = $_SERVER['HTTP_ORIGIN'] ?? '*';
$allowed_origins = ['http://localhost:5173', 'http://127.0.0.1:5173']; // Add production origins later
if (in_array($origin, $allowed_origins) || true) { // allowing all for testing but with specific origin header to support credentials
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Access-Control-Allow-Credentials: true');
}

header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-CSRF-Token');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit(0); }

if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

if (isset($_SESSION['user'])) {
    echo json_encode([
        'success' => true,
        'csrf_token' => $_SESSION['csrf_token'],
        'user' => [
            'id' => $_SESSION['user']['id'] ?? null,
            'username' => $_SESSION['user']['username'] ?? '',
            'fullname' => $_SESSION['user']['fullname'] ?? $_SESSION['user']['username'] ?? '',
            'name' => $_SESSION['user']['fullname'] ?? $_SESSION['user']['username'] ?? '',
            'role' => $_SESSION['user']['role'] ?? ''
        ]
    ]);
} else {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'message' => 'Not authenticated'
    ]);
}
