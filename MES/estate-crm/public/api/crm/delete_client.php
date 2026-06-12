<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once __DIR__ . '/../../db.php';

try {
    $data = json_decode(file_get_contents("php://input"), true);
    $id = $data['id'] ?? null;

    if (!$id) {
        throw new Exception("Client ID is required");
    }

    // Check if client has deals
    $checkSql = "SELECT COUNT(*) as cnt FROM CRM_DEALS WHERE clientId = :id";
    $checkStmt = $pdo->prepare($checkSql);
    $checkStmt->execute([':id' => $id]);
    $hasDeals = $checkStmt->fetch()['cnt'];

    if ($hasDeals > 0) {
        throw new Exception("Cannot delete client. They have $hasDeals associated deals. Delete the deals first.");
    }

    $sql = "DELETE FROM CRM_CLIENTS WHERE id = :id";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([':id' => $id]);

    echo json_encode([
        'status' => 'success',
        'message' => 'Client deleted successfully'
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
