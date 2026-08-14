<?php
session_start();
$origin = $_SERVER['HTTP_ORIGIN'] ?? '*';
$allowed_origins = ['http://localhost:5173', 'http://127.0.0.1:5173'];
if (in_array($origin, $allowed_origins) || true) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Access-Control-Allow-Credentials: true');
}
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-CSRF-Token');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit(0); }

require_once __DIR__ . '/../../db.php';
if (!defined('MANPOWER_EMPLOYEES_TABLE')) {
    require_once __DIR__ . '/../../config/config.php';
}

try {
    $sql = "SELECT 
            u.id, 
            emp.emp_id as employee_id, 
            ISNULL(NULLIF(emp.name_th, ''), ISNULL(NULLIF(u.fullname, ''), u.username)) AS name, 
            emp.position 
        FROM " . USERS_TABLE . " u
        LEFT JOIN " . MANPOWER_EMPLOYEES_TABLE . " emp ON u.emp_id = emp.emp_id COLLATE Thai_CI_AS
        WHERE u.is_active = 1 AND emp.emp_id IS NOT NULL
        ORDER BY ISNULL(NULLIF(emp.name_th, ''), ISNULL(NULLIF(u.fullname, ''), u.username)) ASC";
            
    $stmt = $pdo->query($sql);
    $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(['success' => true, 'data' => $data]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
