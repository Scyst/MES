<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

require_once __DIR__ . '/../../db.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

try {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($input['items']) || !is_array($input['items'])) {
        throw new Exception("Missing or invalid items array");
    }

    $pdo->beginTransaction();

    $sql = "UPDATE CRM_DEALS SET status = :status, orderIndex = :orderIndex, updatedAt = GETDATE() WHERE id = :id";
    $stmt = $pdo->prepare($sql);

    foreach ($input['items'] as $item) {
        if (isset($item['id']) && isset($item['status']) && isset($item['orderIndex'])) {
            $stmt->execute([
                'status' => $item['status'],
                'orderIndex' => $item['orderIndex'],
                'id' => $item['id']
            ]);
        }
    }

    $pdo->commit();

    echo json_encode([
        'status' => 'success',
        'message' => 'Order updated successfully'
    ]);

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
}
