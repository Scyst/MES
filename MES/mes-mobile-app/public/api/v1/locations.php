<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit(0); }

require_once __DIR__ . '/../../db.php';
if (!defined('LOCATIONS_TABLE')) {
    require_once __DIR__ . '/../../config/config.php';
}

try {
    $sql = "SELECT location_id as id, location_name as name, location_type, production_line
            FROM " . LOCATIONS_TABLE . " 
            WHERE is_active = 1 AND location_type != 'STORE' AND location_type != 'WAREHOUSE'
            ORDER BY location_name ASC";
            
    $stmt = $pdo->query($sql);
    $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(['success' => true, 'data' => $data]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
