<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

require_once __DIR__ . '/../../db.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

try {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($input['id']) || !isset($input['isCompleted'])) {
        throw new Exception("Missing required fields");
    }

    $id = intval($input['id']);
    $isCompleted = $input['isCompleted'] ? 1 : 0;

    $sql = "UPDATE CRM_TASKS SET isCompleted = :isCompleted, updatedAt = GETDATE() WHERE id = :id";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        'isCompleted' => $isCompleted,
        'id' => $id
    ]);

    echo json_encode([
        'status' => 'success',
        'message' => 'Task toggled successfully'
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
}
