<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once __DIR__ . '/../../db.php';

try {
    $data = json_decode(file_get_contents("php://input"), true);
    
    $name = $data['name'] ?? '';
    $phone = $data['phone'] ?? '';
    $email = $data['email'] ?? '';
    $lineId = $data['lineId'] ?? '';
    $address = $data['address'] ?? '';

    if (empty($name)) {
        throw new Exception("Client name is required");
    }

    $sql = "INSERT INTO CRM_CLIENTS (name, phone, email, lineId, address) 
            VALUES (:name, :phone, :email, :lineId, :address)";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':name' => $name,
        ':phone' => $phone,
        ':email' => $email,
        ':lineId' => $lineId,
        ':address' => $address
    ]);

    $clientId = $pdo->lastInsertId();

    echo json_encode([
        'status' => 'success',
        'message' => 'Client created successfully',
        'data' => [
            'id' => $clientId,
            'name' => $name
        ]
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
