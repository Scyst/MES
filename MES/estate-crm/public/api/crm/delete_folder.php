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
        throw new Exception("Folder ID is required");
    }

    $pin = isset($input['pin']) ? trim($input['pin']) : '';
    if ($pin !== '123456') {
        throw new Exception("Invalid Security PIN");
    }

    $id = intval($input['id']);

    // Check if folder contains documents
    $sqlDocs = "SELECT COUNT(*) as count FROM CRM_DOCUMENTS WHERE folderId = :id";
    $stmtDocs = $pdo->prepare($sqlDocs);
    $stmtDocs->execute(['id' => $id]);
    $docsCount = $stmtDocs->fetch(PDO::FETCH_ASSOC)['count'];

    if ($docsCount > 0) {
        throw new Exception("Cannot delete folder because it is not empty. Please delete all documents inside it first.");
    }

    // Check if folder contains subfolders
    $sqlSub = "SELECT COUNT(*) as count FROM CRM_FOLDERS WHERE parentId = :id";
    $stmtSub = $pdo->prepare($sqlSub);
    $stmtSub->execute(['id' => $id]);
    $subCount = $stmtSub->fetch(PDO::FETCH_ASSOC)['count'];

    if ($subCount > 0) {
        throw new Exception("Cannot delete folder because it contains sub-folders.");
    }

    $sql = "DELETE FROM CRM_FOLDERS WHERE id = :id";
    $stmt = $pdo->prepare($sql);
    $stmt->execute(['id' => $id]);

    echo json_encode([
        'status' => 'success',
        'message' => 'Folder deleted successfully'
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
}
