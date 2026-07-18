<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once __DIR__ . '/../../db.php';

try {
    $data = json_decode(file_get_contents("php://input"), true);
    
    $dealId = $data['dealId'] ?? null;
    $type = $data['type'] ?? 'comment';
    $note = $data['note'] ?? '';

    if (!$dealId || empty($note)) {
        throw new Exception("Deal ID and Note are required");
    }

    $sql = "INSERT INTO CRM_ACTIVITY_LOGS (dealId, type, note) VALUES (:dealId, :type, :note)";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':dealId' => $dealId,
        ':type' => $type,
        ':note' => $note
    ]);

    // Update Deal's updatedAt timestamp
    $pdo->prepare("UPDATE CRM_DEALS SET updatedAt = GETDATE() WHERE id = :dealId")
        ->execute([':dealId' => $dealId]);

    echo json_encode([
        'status' => 'success',
        'message' => 'Activity logged successfully'
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
