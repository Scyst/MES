<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once __DIR__ . '/../../db.php';

try {
    // Fetch clients and count their active deals
    $sql = "
        SELECT 
            c.id, c.name, c.phone, c.email, c.lineId, c.address, c.createdAt,
            (SELECT COUNT(*) FROM CRM_DEALS d WHERE d.clientId = c.id) as totalDeals,
            (SELECT COUNT(*) FROM CRM_DEALS d WHERE d.clientId = c.id AND d.status != 'post-sale') as activeDeals
        FROM CRM_CLIENTS c
        ORDER BY c.name ASC
    ";
    
    $stmt = $pdo->query($sql);
    $clients = $stmt->fetchAll();

    echo json_encode([
        'status' => 'success',
        'data' => $clients
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
