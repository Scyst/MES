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
    
    if (!isset($input['id'])) {
        throw new Exception("Document ID is required");
    }

    $id = intval($input['id']);
    $folderId = isset($input['folderId']) && $input['folderId'] !== 'null' ? intval($input['folderId']) : null;

    $sql = "UPDATE CRM_DOCUMENTS SET folderId = :folderId WHERE id = :id";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        'folderId' => $folderId,
        'id' => $id
    ]);

    echo json_encode([
        'status' => 'success',
        'message' => 'Document moved successfully'
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
}
