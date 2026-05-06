<?php
// api/hardwareTracking.php
define('ALLOW_GUEST_ACCESS', true);

require_once __DIR__ . '/../../db.php'; 
require_once __DIR__ . '/../../components/init.php';

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'POST Method Required']);
    exit;
}

$headers = getallheaders();
$headers = array_change_key_case($headers, CASE_UPPER);
$apiKey = $headers['X-API-KEY'] ?? '';

if ($apiKey !== 'MESKey2026') {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized API Key']);
    exit;
}

try {
    $jsonInput = file_get_contents('php://input');
    $data = json_decode($jsonInput, true);

    if (!$data || empty($data['forklift_code'])) {
        throw new InvalidArgumentException('Invalid JSON Payload or Missing Forklift Code');
    }

    $code = trim($data['forklift_code']);
    $lat = isset($data['lat']) && is_numeric($data['lat']) ? (float)$data['lat'] : null;
    $lng = isset($data['lng']) && is_numeric($data['lng']) ? (float)$data['lng'] : null;
    
    $b1 = !empty($data['bssid_1']) ? strtoupper(trim($data['bssid_1'])) : null; 
    $r1 = isset($data['rssi_1']) ? (int)$data['rssi_1'] : -100;
    
    $b2 = !empty($data['bssid_2']) ? strtoupper(trim($data['bssid_2'])) : null; 
    $r2 = isset($data['rssi_2']) ? (int)$data['rssi_2'] : -100;
    
    $b3 = !empty($data['bssid_3']) ? strtoupper(trim($data['bssid_3'])) : null; 
    $r3 = isset($data['rssi_3']) ? (int)$data['rssi_3'] : -100;
    
    $battery = isset($data['battery']) ? (int)$data['battery'] : null;

    $stmt = $pdo->prepare("EXEC dbo.sp_UpdateForkliftLocation_WiFi 
        @ForkliftCode=:code, @BSSID_1=:b1, @RSSI_1=:r1, @BSSID_2=:b2, @RSSI_2=:r2, 
        @BSSID_3=:b3, @RSSI_3=:r3, @Lat=:lat, @Lng=:lng, @BatteryLevel=:bat");
    
    $stmt->execute([
        ':code'=>$code, ':b1'=>$b1, ':r1'=>$r1, ':b2'=>$b2, ':r2'=>$r2, 
        ':b3'=>$b3, ':r3'=>$r3, ':lat'=>$lat, ':lng'=>$lng, ':bat'=>$battery
    ]);

    $stmtFetch = $pdo->prepare("SELECT id, code, name, status, current_battery, last_location, location_type, indoor_x, indoor_y, last_updated, CASE WHEN DATEDIFF(MINUTE, last_updated, GETDATE()) > 3 THEN 1 ELSE 0 END as is_offline 
                                FROM dbo.FORKLIFTS WITH (NOLOCK) WHERE code = :code");
    $stmtFetch->execute([':code' => $code]);
    $flData = $stmtFetch->fetch(PDO::FETCH_ASSOC);

    if (!$flData) {
        throw new Exception("Forklift code '{$code}' not found in database.");
    }

    echo json_encode(['success' => true, 'message' => 'Location Updated', 'data' => $flData]);

} catch (InvalidArgumentException $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
} catch (Throwable $e) {
    writeErrorLog($pdo, 'FORKLIFT_HW_API', $e->getMessage(), $data ?? null);
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Internal Server Error occurred while processing location data.']);
}
exit;
?>