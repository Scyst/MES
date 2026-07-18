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
    
    if (!isset($input['dealId']) || !isset($input['title'])) {
        throw new Exception("Missing required fields");
    }

    $dealId = intval($input['dealId']);
    $title = $input['title'];

    $sql = "INSERT INTO CRM_TASKS (dealId, title, isCompleted) VALUES (:dealId, :title, 0)";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        'dealId' => $dealId,
        'title' => $title
    ]);

    echo json_encode([
        'status' => 'success',
        'message' => 'Task created successfully',
        'id' => $pdo->lastInsertId()
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
}
