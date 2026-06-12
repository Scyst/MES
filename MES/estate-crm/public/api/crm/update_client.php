<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once __DIR__ . '/../../db.php';

try {
    $data = json_decode(file_get_contents("php://input"), true);
    
    $id = $data['id'] ?? null;
    $name = $data['name'] ?? '';
    $phone = $data['phone'] ?? '';
    $email = $data['email'] ?? '';
    $lineId = $data['lineId'] ?? '';
    $address = $data['address'] ?? '';

    if (!$id || empty($name)) {
        throw new Exception("Client ID and name are required");
    }

    $sql = "UPDATE CRM_CLIENTS 
            SET name = :name, phone = :phone, email = :email, lineId = :lineId, address = :address, updatedAt = GETDATE()
            WHERE id = :id";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':id' => $id,
        ':name' => $name,
        ':phone' => $phone,
        ':email' => $email,
        ':lineId' => $lineId,
        ':address' => $address
    ]);

    echo json_encode([
        'status' => 'success',
        'message' => 'Client updated successfully'
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
