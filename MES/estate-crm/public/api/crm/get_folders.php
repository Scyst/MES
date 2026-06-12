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
    $parentId = isset($_GET['parentId']) && $_GET['parentId'] !== 'null' ? intval($_GET['parentId']) : null;
    
    if ($parentId !== null) {
        $sql = "SELECT * FROM CRM_FOLDERS WHERE parentId = :parentId ORDER BY name ASC";
        $stmt = $pdo->prepare($sql);
        $stmt->execute(['parentId' => $parentId]);
    } else {
        $sql = "SELECT * FROM CRM_FOLDERS WHERE parentId IS NULL ORDER BY name ASC";
        $stmt = $pdo->prepare($sql);
        $stmt->execute();
    }

    $folders = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'status' => 'success',
        'data' => $folders
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
}
