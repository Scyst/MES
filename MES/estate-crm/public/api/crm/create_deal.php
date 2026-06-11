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
    
    if (!isset($input['title']) || !isset($input['clientName'])) {
        throw new Exception("Missing required fields: title, clientName");
    }

    $title = $input['title'];
    $clientName = $input['clientName'];
    $priority = $input['priority'] ?? 'low';
    $value = isset($input['value']) ? floatval($input['value']) : 0;
    $status = 'lead'; // Default status for new deal

    $sql = "INSERT INTO CRM_DEALS (title, clientName, status, priority, value) VALUES (:title, :clientName, :status, :priority, :value)";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        'title' => $title,
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
