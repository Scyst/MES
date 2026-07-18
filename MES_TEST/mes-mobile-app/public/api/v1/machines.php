<?php
// Handle CORS for frontend requests
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

// Require db connection (db.php is bundled in public root)
require_once __DIR__ . '/../../db.php';

// If PE_MACHINES_TABLE is not defined, require config
if (!defined('PE_MACHINES_TABLE')) {
    require_once __DIR__ . '/../../config/config.php';
}

try {
    $sql = "
        SELECT 
            m.machine_id as id,
            m.machine_name as name,
            m.machine_code,
            m.line,
            m.is_active,
            m.status,
            m.image_path,
            l.location_id
        FROM " . PE_MACHINES_TABLE . " m
        LEFT JOIN " . LOCATIONS_TABLE . " l ON m.line = l.location_name
        WHERE m.is_active = 1
        ORDER BY m.line, m.machine_name
    ";

    $stmt = $pdo->query($sql);
    $machines = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($machines as &$machine) {
        if (empty($machine['status'])) {
            $machine['status'] = 'idle';
        }
    }

    echo json_encode([
        'success' => true,
        'data' => $machines
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Database error: ' . $e->getMessage()
    ]);
}
