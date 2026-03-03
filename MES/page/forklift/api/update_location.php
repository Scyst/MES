<?php
// api/forklift/update_location.php
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../../config/config.php';

try {
    $jsonInput = file_get_contents('php://input');
    $data = json_decode($jsonInput, true);

    if (!$data || !isset($data['forklift_code'])) {
        throw new Exception('Invalid JSON Payload');
    }

    $forklift_code = $data['forklift_code'];
    // รับค่า Top 3 BSSID
    $b1 = isset($data['bssid_1']) ? strtoupper($data['bssid_1']) : null;
    $b2 = isset($data['bssid_2']) ? strtoupper($data['bssid_2']) : null;
    $b3 = isset($data['bssid_3']) ? strtoupper($data['bssid_3']) : null;
    $lat = isset($data['lat']) ? $data['lat'] : null;
    $lng = isset($data['lng']) ? $data['lng'] : null;

    $dsn = "sqlsrv:Server=" . DB_HOST . ";Database=" . DB_DATABASE;
    $pdo = new PDO($dsn, DB_USER, DB_PASSWORD);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $stmt = $pdo->prepare("EXEC dbo.sp_UpdateForkliftLocation_WiFi 
        @ForkliftCode = :code, @BSSID_1 = :b1, @BSSID_2 = :b2, @BSSID_3 = :b3, 
        @Lat = :lat, @Lng = :lng, @BatteryLevel = NULL"
    );

    $stmt->execute([
        ':code' => $forklift_code, ':b1' => $b1, ':b2' => $b2, ':b3' => $b3,
        ':lat' => $lat, ':lng' => $lng
    ]);

    echo json_encode(['success' => true]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>