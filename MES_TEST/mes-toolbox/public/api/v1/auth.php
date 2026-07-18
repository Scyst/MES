<?php
session_start();
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit(0); }

if (isset($_SESSION['user'])) {
    echo json_encode([
        'success' => true,
        'user' => [
            'id' => $_SESSION['user']['id'] ?? null,
            'username' => $_SESSION['user']['username'] ?? '',
            'fullname' => $_SESSION['user']['fullname'] ?? $_SESSION['user']['username'] ?? '',
            'name' => $_SESSION['user']['fullname'] ?? $_SESSION['user']['username'] ?? '',
            'role' => $_SESSION['user']['role'] ?? ''
        ]
    ]);
} else {
    echo json_encode([
        'success' => false,
        'message' => 'Not authenticated'
    ]);
}
