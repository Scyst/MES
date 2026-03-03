<?php
// api/manage_wifi_zones.php
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../../../config/config.php';
require_once __DIR__ . '/../../../auth/check_auth.php'; 

// [FIX] รับค่า action ทั้งจาก GET (ตอนโหลดหน้าเว็บ) และ POST (ตอนกด Save)
$action = $_POST['action'] ?? $_GET['action'] ?? '';

try {
    $dsn = "sqlsrv:Server=" . DB_HOST . ";Database=" . DB_DATABASE;
    $pdo = new PDO($dsn, DB_USER, DB_PASSWORD);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // ========================================================
    // 1. ดึงข้อมูล Zone ทั้งหมดไปไฮไลต์สีบนหน้าเว็บ
    // ========================================================
    if ($action === 'get_all') {
        $stmt = $pdo->query("SELECT * FROM dbo.WIFI_AP_ZONES WITH(NOLOCK) WHERE is_active = 1");
        echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
        exit;
    }

    // ========================================================
    // 2. บันทึก/อัปเดตข้อมูล True Fingerprint
    // ========================================================
    if ($action === 'save_zone') {
        $b1 = strtoupper(trim($_POST['bssid_1'] ?? '')); $r1 = (int)$_POST['rssi_1'];
        $b2 = !empty(trim($_POST['bssid_2'])) ? strtoupper(trim($_POST['bssid_2'])) : null; $r2 = !empty($_POST['rssi_2']) ? (int)$_POST['rssi_2'] : null;
        $b3 = !empty(trim($_POST['bssid_3'])) ? strtoupper(trim($_POST['bssid_3'])) : null; $r3 = !empty($_POST['rssi_3']) ? (int)$_POST['rssi_3'] : null;
        
        $zone_name = trim($_POST['zone_name']);
        $svg_x = (int)$_POST['svg_x']; 
        $svg_y = (int)$_POST['svg_y'];

        if (empty($b1) || empty($zone_name)) {
            throw new Exception("BSSID #1 และ Zone Name ห้ามว่าง");
        }

        $sql = "
            MERGE INTO dbo.WIFI_AP_ZONES AS Target
            USING (SELECT :zone AS zone_name) AS Source
            ON (Target.zone_name = Source.zone_name)
            WHEN MATCHED THEN
                UPDATE SET 
                    bssid_1=:b1, rssi_1=:r1, 
                    bssid_2=:b2, rssi_2=:r2, 
                    bssid_3=:b3, rssi_3=:r3, 
                    svg_x=:x, svg_y=:y, is_active=1
            WHEN NOT MATCHED THEN
                INSERT (zone_name, svg_x, svg_y, bssid_1, rssi_1, bssid_2, rssi_2, bssid_3, rssi_3, is_active)
                VALUES (:zone2, :x2, :y2, :b1_i, :r1_i, :b2_i, :r2_i, :b3_i, :r3_i, 1);
        ";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            ':zone'=>$zone_name, ':b1'=>$b1, ':r1'=>$r1, ':b2'=>$b2, ':r2'=>$r2, ':b3'=>$b3, ':r3'=>$r3, ':x'=>$svg_x, ':y'=>$svg_y,
            ':zone2'=>$zone_name, ':x2'=>$svg_x, ':y2'=>$svg_y, ':b1_i'=>$b1, ':r1_i'=>$r1, ':b2_i'=>$b2, ':r2_i'=>$r2, ':b3_i'=>$b3, ':r3_i'=>$r3
        ]);
        
        echo json_encode(['success' => true, 'message' => 'บันทึก True Fingerprint สำเร็จ']);
        exit;
    }

    throw new Exception("Invalid Action");

} catch (Exception $e) {
    http_response_code(500); 
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>