<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); // Allow local Vite to connect
require_once __DIR__ . '/../../db.php'; // Updated relative path to local db.php

try {
    // We want to fetch all deals and their associated tasks count
    // In a real scenario we might join the tasks or do a secondary query.
    // Let's do a JOIN to get the deal and aggregate the tasks.
    
    $sql = "SELECT 
                d.id, d.title, c.name as clientName, d.clientId, d.value, d.status, d.priority, d.orderIndex, d.createdAt,
                (SELECT COUNT(*) FROM CRM_TASKS t WHERE t.dealId = d.id AND (t.isCompleted = 0 OR t.isCompleted IS NULL)) as taskCount
            FROM CRM_DEALS d
            LEFT JOIN CRM_CLIENTS c ON d.clientId = c.id
            ORDER BY d.orderIndex ASC";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute();
    $deals = $stmt->fetchAll();

    echo json_encode([
        'status' => 'success',
        'data' => $deals
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
}
