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
        throw new Exception("Missing document ID");
    }

    $pin = isset($input['pin']) ? trim($input['pin']) : '';
    if ($pin !== '123456') {
        throw new Exception("Invalid Security PIN");
    }

    $id = intval($input['id']);

    // First fetch all file paths to delete from the server
    $sqlFiles = "SELECT filePath FROM CRM_DOCUMENTS WHERE id = :id 
                 UNION 
                 SELECT filePath FROM CRM_DOCUMENT_VERSIONS WHERE documentId = :id";
    $stmtFiles = $pdo->prepare($sqlFiles);
    $stmtFiles->execute(['id' => $id]);
    $filesToDelete = $stmtFiles->fetchAll(PDO::FETCH_ASSOC);

    foreach ($filesToDelete as $f) {
        $fullPath = __DIR__ . '/../../' . $f['filePath'];
        if (file_exists($fullPath)) {
            unlink($fullPath);
        }
    }

    // Delete record
    $sqlDelete = "DELETE FROM CRM_DOCUMENTS WHERE id = :id";
    $stmtDelete = $pdo->prepare($sqlDelete);
    $stmtDelete->execute(['id' => $id]);

    echo json_encode([
        'status' => 'success',
        'message' => 'Document deleted successfully'
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
}
