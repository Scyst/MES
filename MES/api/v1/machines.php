<?php
// E:\MES\MES\MES\api\v1\machines.php

// Handle CORS for local Vite development
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json; charset=utf-8');

// Handle Preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Require db connection
require_once __DIR__ . '/../../db.php';
// if PE_MACHINES_TABLE is not defined, require config
if (!defined('PE_MACHINES_TABLE')) {
    require_once __DIR__ . '/../../config/config.php';
}

try {
    // Query machines
    $sql = "
        SELECT 
            machine_id as id,
            machine_name as name,
            machine_code,
            line,
            is_active,
            status
        FROM " . PE_MACHINES_TABLE . "
        WHERE is_active = 1
        ORDER BY line, machine_name
    ";

    $stmt = $pdo->query($sql);
    $machines = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Default status if missing
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
