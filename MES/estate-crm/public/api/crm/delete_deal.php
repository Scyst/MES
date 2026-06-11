<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

require_once __DIR__ . '/../../db.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

try {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($input['id'])) {
        throw new Exception("Missing deal ID");
    }

    $id = intval($input['id']);

    // First delete associated tasks
    $sqlTasks = "DELETE FROM CRM_TASKS WHERE dealId = :id";
    $stmtTasks = $pdo->prepare($sqlTasks);
    $stmtTasks->execute(['id' => $id]);

    // Then delete the deal
    $sql = "DELETE FROM CRM_DEALS WHERE id = :id";
    $stmt = $pdo->prepare($sql);
    $stmt->execute(['id' => $id]);

    echo json_encode([
        'status' => 'success',
        'message' => 'Deal deleted successfully'
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
}
