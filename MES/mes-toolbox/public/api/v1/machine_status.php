<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../core/init.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit(0); }

if (!defined('PE_MACHINES_TABLE')) {
    
}

$machineId = $_POST['machine_id'] ?? null;
$status = $_POST['status'] ?? null; // e.g. 'Active', 'Hold', 'Inactive'

try {
    if (!$machineId || !$status) {
        throw new Exception("Machine ID and Status are required");
    }

    $sql = "UPDATE " . PE_MACHINES_TABLE . " SET status = ?, updated_at = GETDATE() WHERE machine_id = ?";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$status, $machineId]);

    // Optionally log this into PE_MACHINE_HISTORY_TABLE if needed
    // We will assume the frontend just wants the machine status toggled for now

    echo json_encode(['success' => true, 'message' => "Machine $machineId status changed to $status"]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
