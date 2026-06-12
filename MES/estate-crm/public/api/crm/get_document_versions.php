<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

require_once __DIR__ . '/../../db.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

try {
    if (!isset($_GET['documentId'])) {
        throw new Exception("documentId is required");
    }

    $documentId = intval($_GET['documentId']);

    $sql = "SELECT * FROM CRM_DOCUMENT_VERSIONS 
            WHERE documentId = :documentId 
            ORDER BY version DESC";
    $stmt = $pdo->prepare($sql);
    $stmt->execute(['documentId' => $documentId]);

    $versions = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'status' => 'success',
        'data' => $versions
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
}
