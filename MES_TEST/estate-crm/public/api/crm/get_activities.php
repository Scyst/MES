<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once __DIR__ . '/../../db.php';

try {
    $dealId = $_GET['dealId'] ?? null;

    if (!$dealId) {
        throw new Exception("Deal ID is required");
    }

    $sql = "SELECT * FROM CRM_ACTIVITY_LOGS WHERE dealId = :dealId ORDER BY createdAt DESC";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([':dealId' => $dealId]);
    $activities = $stmt->fetchAll();

    echo json_encode([
        'status' => 'success',
        'data' => $activities
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
