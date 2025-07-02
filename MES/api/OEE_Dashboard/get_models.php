<?php

require_once __DIR__ . '/../db.php';

try {
    $sql = "SELECT DISTINCT model FROM IOT_TOOLBOX_PARAMETER WHERE model IS NOT NULL ORDER BY model";
    $stmt = $pdo->query($sql);
    $models = $stmt->fetchAll(PDO::FETCH_COLUMN);

    echo json_encode(['success' => true, 'data' => $models]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Failed to fetch models.']);
    
    error_log("Error in get_models.php: " . $e->getMessage());
}
?>