<?php
// MES/page/documentCenter/api/update_document.php

header('Content-Type: application/json');
error_reporting(0);
ini_set('display_errors', 0);

require_once __DIR__ . '/../../../auth/check_auth.php';
require_once __DIR__ . '/../../db.php';

// Check if user has permission to manage documents
if (!hasRole(['admin', 'creator'])) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Permission denied.']);
    exit();
}

try {
    $input = json_decode(file_get_contents('php://input'), true);
    
    $documentId = $input['document_id'] ?? null;
    $description = $input['description'] ?? null;
    $category = $input['category'] ?? null;

    if (!$documentId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Document ID is required.']);
        exit();
    }

    // Prepare SQL update statement
    $sql = "UPDATE dbo.DOCUMENTS SET file_description = ?, category = ? WHERE id = ?";
    $stmt = $pdo->prepare($sql);
    
    // Execute the update
    $stmt->execute([$description, $category, $documentId]);

    echo json_encode(['success' => true, 'message' => 'Document updated successfully.']);

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'An internal server error occurred.',
        'debug_message' => $e->getMessage()
    ]);
}
?>