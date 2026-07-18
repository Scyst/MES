<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../core/init.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit(0); }

if (!defined('MANPOWER_EMPLOYEES_TABLE')) {
    
}

try {
    $sql = "SELECT id, emp_id as employee_id, name_th as name, position 
            FROM " . MANPOWER_EMPLOYEES_TABLE . " 
            WHERE is_active = 1
            ORDER BY name_th ASC";
            
    $stmt = $pdo->query($sql);
    $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(['success' => true, 'data' => $data]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}

