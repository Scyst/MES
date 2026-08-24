<?php
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../components/init.php';

requirePermission(['view_dashboard']);

try {
    // Fetch active notifications
    $stmt = $pdo->prepare("
        SELECT id, module, ref_id, title, message, alert_level, created_at 
        FROM dbo.PE_NOTIFICATIONS 
        WHERE is_active = 1 
        ORDER BY created_at DESC
    ");
    $stmt->execute();
    $notifications = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'data' => $notifications,
        'count' => count($notifications)
    ]);

} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
