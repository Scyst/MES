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
    
    if (!isset($input['name']) || trim($input['name']) === '') {
        throw new Exception("Folder name is required");
    }

    $name = trim($input['name']);
    $parentId = isset($input['parentId']) && $input['parentId'] !== 'null' ? intval($input['parentId']) : null;

    $sql = "INSERT INTO CRM_FOLDERS (name, parentId) VALUES (:name, :parentId)";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        'name' => $name,
        'parentId' => $parentId
    ]);

    echo json_encode([
        'status' => 'success',
        'message' => 'Folder created successfully',
        'id' => $pdo->lastInsertId()
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
}
