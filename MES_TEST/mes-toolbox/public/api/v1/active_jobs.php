<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../core/init.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit(0); }

$location_id = $_GET['location_id'] ?? '';

try {
    $params = [];
    $locFilter = "";
    
    if ($location_id !== '') {
        $locFilter = "AND j.location_id = ?";
        $params[] = $location_id;
    }

    $sql = "SELECT j.job_id, j.job_no, j.item_id, j.target_qty, j.actual_qty, j.status, 
                   i.part_no, i.part_description as part_name
            FROM PRODUCTION_JOBS j WITH (NOLOCK)
            JOIN " . ITEMS_TABLE . " i ON j.item_id = i.item_id
            WHERE j.status IN ('PENDING', 'RUNNING', 'PAUSED') $locFilter
            ORDER BY j.queue_order ASC, j.created_at ASC";
            
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(['success' => true, 'data' => $data]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}

