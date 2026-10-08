<?php
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../components/init.php';

requirePermission(['view_dashboard']);

try {
    // Fetch top 10 notifications for the dropdown
    $stmt = $pdo->prepare("
        SELECT TOP 10 id, module, ref_id, title, message, alert_level, created_at, is_active 
        FROM dbo.PE_NOTIFICATIONS 
        ORDER BY created_at DESC
    ");
    $stmt->execute();
    $notifications = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Fetch total unread count
    $stmtCount = $pdo->query("SELECT COUNT(*) FROM dbo.PE_NOTIFICATIONS WHERE is_active = 1");
    $unreadCount = $stmtCount->fetchColumn();

    echo json_encode([
        'success' => true,
        'data' => $notifications,
        'count' => count($notifications),
        'unreadCount' => (int)$unreadCount
    ]);

} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
