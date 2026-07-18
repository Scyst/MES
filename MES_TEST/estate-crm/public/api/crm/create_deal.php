<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

require_once __DIR__ . '/../../db.php';

// Handle preflight options
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

try {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($input['title']) || !isset($input['clientId'])) {
        throw new Exception("Missing required fields: title, clientId");
    }

    $title = $input['title'];
    $clientId = $input['clientId'];
    $priority = $input['priority'] ?? 'low';
    $value = isset($input['value']) ? floatval($input['value']) : 0;
    $status = 'lead'; // Default status for new deal

    // Fetch clientName
    $clientStmt = $pdo->prepare("SELECT name FROM CRM_CLIENTS WHERE id = :id");
    $clientStmt->execute([':id' => $clientId]);
    $clientName = $clientStmt->fetchColumn() ?: '';

    $sql = "INSERT INTO CRM_DEALS (title, clientId, clientName, status, priority, value) VALUES (:title, :clientId, :clientName, :status, :priority, :value)";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        'title' => $title,
        'clientId' => $clientId,
        'clientName' => $clientName,
        'status' => $status,
        'priority' => $priority,
        'value' => $value
    ]);

    echo json_encode([
        'status' => 'success',
        'message' => 'Deal created successfully',
        'id' => $pdo->lastInsertId()
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
}
