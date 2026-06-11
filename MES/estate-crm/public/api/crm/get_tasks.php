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
    $dealId = isset($_GET['dealId']) ? intval($_GET['dealId']) : 0;
    
    if (!$dealId) {
        throw new Exception("Missing dealId parameter");
    }

    $sql = "SELECT id, title, dealId, assignee, isCompleted, createdAt FROM CRM_TASKS WHERE dealId = :dealId ORDER BY createdAt ASC";
    $stmt = $pdo->prepare($sql);
    $stmt->execute(['dealId' => $dealId]);
    $tasks = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'status' => 'success',
        'data' => $tasks
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
}
