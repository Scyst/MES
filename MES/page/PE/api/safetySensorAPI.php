<?php
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../../db.php';
// Skip init.php to allow Node-RED to POST without a user session.
// In production, add a secret token check here.

$input = json_decode(file_get_contents('php://input'), true);

if (!$input) {
    echo json_encode(['success' => false, 'message' => 'Invalid JSON']);
    exit;
}

$machine_id = $input['machine_id'] ?? null;
$sensor_name = $input['sensor_name'] ?? 'Unknown Sensor';
$status = $input['status'] ?? 'alert'; // 'alert' or 'normal'
$description = $input['description'] ?? 'ตรวจพบความผิดปกติจากเซนเซอร์ความปลอดภัย';

if (!$machine_id) {
    echo json_encode(['success' => false, 'message' => 'machine_id is required']);
    exit;
}

try {
    if ($status === 'alert') {
        $title = "🚨 SAFETY ALERT: $machine_id";
        $msg = "Sensor [ $sensor_name ]: $description";
        
        $stmt = $pdo->prepare("INSERT INTO dbo.PE_NOTIFICATIONS (module, ref_id, title, message, alert_level) VALUES ('SAFETY', ?, ?, ?, 'danger')");
        $stmt->execute([$machine_id, $title, $msg]);
        
    } else if ($status === 'normal') {
        $stmt = $pdo->prepare("UPDATE dbo.PE_NOTIFICATIONS SET is_active = 0 WHERE module = 'SAFETY' AND ref_id = ?");
        $stmt->execute([$machine_id]);
    }
    
    echo json_encode(['success' => true, 'message' => 'Safety event recorded']);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
