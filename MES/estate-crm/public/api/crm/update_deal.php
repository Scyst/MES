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
    
    if (!isset($input['id']) || !isset($input['title']) || !isset($input['clientName']) || !isset($input['priority'])) {
        throw new Exception("Missing required fields");
    }

    $id = intval($input['id']);
    $title = $input['title'];
    $clientName = $input['clientName'];
    $priority = $input['priority'];
    $value = isset($input['value']) ? floatval($input['value']) : 0;

    $sql = "UPDATE CRM_DEALS SET title = :title, clientName = :clientName, priority = :priority, value = :value, updatedAt = GETDATE() WHERE id = :id";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        'title' => $title,
        'clientName' => $clientName,
        'priority' => $priority,
        'value' => $value,
        'id' => $id
    ]);

    echo json_encode([
        'status' => 'success',
        'message' => 'Deal updated successfully'
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
}
