<?php

require_once __DIR__ . '/../db.php';

try {
    $sql = "SELECT DISTINCT line FROM IOT_TOOLBOX_PARAMETER WHERE line IS NOT NULL ORDER BY line";
    $stmt = $pdo->query($sql);
    $lines = $stmt->fetchAll(PDO::FETCH_COLUMN);

    echo json_encode(['success' => true, 'data' => $lines]);

} catch (PDOException $e) {
    http_response_code(500); // Internal Server Error
    echo json_encode(['success' => false, 'message' => 'Failed to fetch lines.']);
    
    error_log("Error in get_lines.php: " . $e->getMessage());
}
?>