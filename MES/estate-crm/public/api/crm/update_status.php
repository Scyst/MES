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
    
    if (!isset($input['id']) || !isset($input['status'])) {
        throw new Exception("Missing required fields: id, status");
    }

    $id = intval($input['id']);
    $status = $input['status'];

    $sql = "UPDATE CRM_DEALS SET status = :status, updatedAt = GETDATE() WHERE id = :id";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        'status' => $status,
        'id' => $id
    ]);

    echo json_encode([
        'status' => 'success',
        'message' => 'Status updated successfully'
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
}
