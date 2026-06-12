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
    $dealId = isset($_GET['dealId']) && $_GET['dealId'] !== 'null' ? intval($_GET['dealId']) : null;
    $folderId = isset($_GET['folderId']) && $_GET['folderId'] !== 'null' ? intval($_GET['folderId']) : null;
    
    $query = "SELECT doc.*, d.clientName, d.title as dealTitle 
              FROM CRM_DOCUMENTS doc 
              LEFT JOIN CRM_DEALS d ON doc.dealId = d.id 
              WHERE 1=1";
    $params = [];

    if ($dealId !== null) {
        $query .= " AND doc.dealId = :dealId";
        $params['dealId'] = $dealId;
    }

    if ($folderId !== null) {
        $query .= " AND doc.folderId = :folderId";
        $params['folderId'] = $folderId;
    } else {
        $query .= " AND doc.folderId IS NULL";
    }

    $query .= " ORDER BY doc.uploadedAt DESC";
    
    $stmt = $pdo->prepare($query);
    $stmt->execute($params);

    $documents = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'status' => 'success',
        'data' => $documents
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
}
