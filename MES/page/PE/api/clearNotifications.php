<?php
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../components/init.php';

requirePermission(['view_dashboard']);

try {
    // Mark all active notifications as inactive (read)
    $stmt = $pdo->prepare("UPDATE dbo.PE_NOTIFICATIONS SET is_active = 0 WHERE is_active = 1");
    $stmt->execute();
    
    echo json_encode(['success' => true]);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
