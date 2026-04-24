<?php
// api/api_hardware.php (สำหรับ ESP32 ยิงเข้ามาเท่านั้น)
header('Content-Type: application/json; charset=utf-8');

// เรียกใช้แค่ Database Connection
require_once __DIR__ . '/../../db.php'; 

try {
    // รับค่า JSON จาก ESP32
    $jsonInput = file_get_contents('php://input');
    $data = json_decode($jsonInput, true);

    if (!$data || empty($data['forklift_code'])) {
        throw new Exception('Invalid JSON Payload or Missing Forklift Code');
    }

    $code = $data['forklift_code'];
    $lat = !empty($data['lat']) ? $data['lat'] : null;
    $lng = !empty($data['lng']) ? $data['lng'] : null;
    $b1 = !empty($data['bssid_1']) ? strtoupper($data['bssid_1']) : null; $r1 = $data['rssi_1'] ?? -100;
    $b2 = !empty($data['bssid_2']) ? strtoupper($data['bssid_2']) : null; $r2 = $data['rssi_2'] ?? -100;
    $b3 = !empty($data['bssid_3']) ? strtoupper($data['bssid_3']) : null; $r3 = $data['rssi_3'] ?? -100;
    $battery = $data['battery'] ?? null;

    $stmt = $pdo->prepare("EXEC dbo.sp_UpdateForkliftLocation_WiFi 
        @ForkliftCode=:code, @BSSID_1=:b1, @RSSI_1=:r1, @BSSID_2=:b2, @RSSI_2=:r2, @BSSID_3=:b3, @RSSI_3=:r3, @Lat=:lat, @Lng=:lng, @BatteryLevel=:bat");
    
    $stmt->execute([
        ':code'=>$code, ':b1'=>$b1, ':r1'=>$r1, ':b2'=>$b2, ':r2'=>$r2, ':b3'=>$b3, ':r3'=>$r3, ':lat'=>$lat, ':lng'=>$lng, ':bat'=>$battery
    ]);

    echo json_encode(['success' => true, 'message' => 'Location Updated']);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>