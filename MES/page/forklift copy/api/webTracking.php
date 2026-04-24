<?php
// api/webTracking.php (สำหรับหน้าเว็บ เรียกผ่าน JavaScript)
header('Content-Type: application/json; charset=utf-8');

// 1. ป้องกัน check_auth.php เด้งไปหน้า HTML
define('ALLOW_GUEST_ACCESS', true);

require_once __DIR__ . '/../../db.php'; 
require_once __DIR__ . '/../../../auth/check_auth.php';

// 2. ถ้าไม่มี Session เตะออกทันที (ไม่มีข้อยกเว้น)
if (!isset($_SESSION['user'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized: Session Expired']);
    exit;
}

$action = $_GET['action'] ?? $_POST['action'] ?? '';

try {
    switch ($action) {
        // ------------------------------------------------
        // 🗺️ ดึงข้อมูลรถล่าสุด (Real-time Map)
        // ------------------------------------------------
        case 'get_realtime':
            $sql = "SELECT id, code, name, status, current_battery, last_location, location_type, indoor_x, indoor_y, last_updated,
                    CASE WHEN DATEDIFF(MINUTE, last_updated, GETDATE()) > 3 THEN 1 ELSE 0 END as is_offline
                    FROM dbo.FORKLIFTS WITH (NOLOCK) WHERE is_active = 1";
            echo json_encode(['success' => true, 'data' => $pdo->query($sql)->fetchAll()]);
            break;

        // ------------------------------------------------
        // 🐌 ดึงประวัติเส้นทาง (Snail Trail / Playback)
        // ------------------------------------------------
        case 'get_history':
            if (empty($_GET['code'])) throw new Exception('Missing forklift code');
            $code = $_GET['code'];
            $minutes = isset($_GET['mins']) ? (int)$_GET['mins'] : 60; 

            $sql = "SELECT h.location_type, h.lat, h.lng, h.indoor_x, h.indoor_y, h.recorded_at, h.last_location
                    FROM dbo.FORKLIFT_HISTORY_LOGS h JOIN dbo.FORKLIFTS f ON h.forklift_id = f.id
                    WHERE f.code = :code AND h.recorded_at >= DATEADD(minute, :mins, GETDATE()) AND (h.lat IS NOT NULL OR h.indoor_x IS NOT NULL)
                    ORDER BY h.recorded_at ASC"; 
            $stmt = $pdo->prepare($sql);
            $stmt->bindValue(':code', $code, PDO::PARAM_STR);
            $stmt->bindValue(':mins', -$minutes, PDO::PARAM_INT);
            $stmt->execute();
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
            break;

        // ------------------------------------------------
        // 🔥 ดึงข้อมูลจุดความร้อน (Heatmap)
        // ------------------------------------------------
        case 'get_heatmap':
            $hours = isset($_GET['hours']) ? (int)$_GET['hours'] : 24; 
            $sql = "SELECT location_type, lat, lng, indoor_x, indoor_y FROM dbo.FORKLIFT_HISTORY_LOGS
                    WHERE recorded_at >= DATEADD(hour, :hrs, GETDATE()) AND (lat IS NOT NULL OR indoor_x IS NOT NULL)"; 
            $stmt = $pdo->prepare($sql);
            $stmt->bindValue(':hrs', -$hours, PDO::PARAM_INT);
            $stmt->execute();
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
            break;

        // ------------------------------------------------
        // 📍 โหลดข้อมูล Zone (Site Survey)
        // ------------------------------------------------
        case 'get_zones':
            $data = $pdo->query("SELECT * FROM dbo.WIFI_AP_ZONES WITH(NOLOCK) WHERE is_active = 1")->fetchAll();
            echo json_encode(['success' => true, 'data' => $data]);
            break;

        // ------------------------------------------------
        // 💾 บันทึกข้อมูล Zone (Site Survey)
        // ------------------------------------------------
        case 'save_zone':
            $b1 = strtoupper(trim($_POST['bssid_1'] ?? '')); $r1 = (int)$_POST['rssi_1'];
            $b2 = !empty(trim($_POST['bssid_2'])) ? strtoupper(trim($_POST['bssid_2'])) : null; $r2 = !empty($_POST['rssi_2']) ? (int)$_POST['rssi_2'] : null;
            $b3 = !empty(trim($_POST['bssid_3'])) ? strtoupper(trim($_POST['bssid_3'])) : null; $r3 = !empty($_POST['rssi_3']) ? (int)$_POST['rssi_3'] : null;
            $zone_name = trim($_POST['zone_name']);
            $svg_x = (int)$_POST['svg_x']; 
            $svg_y = (int)$_POST['svg_y'];

            if (empty($b1) || empty($zone_name)) throw new Exception("BSSID #1 และ Zone Name ห้ามว่าง");
            
            $sql = "MERGE INTO dbo.WIFI_AP_ZONES AS Target USING (SELECT :zone AS zone_name) AS Source ON (Target.zone_name = Source.zone_name)
                    WHEN MATCHED THEN UPDATE SET bssid_1=:b1, rssi_1=:r1, bssid_2=:b2, rssi_2=:r2, bssid_3=:b3, rssi_3=:r3, svg_x=:x, svg_y=:y, is_active=1
                    WHEN NOT MATCHED THEN INSERT (zone_name, svg_x, svg_y, bssid_1, rssi_1, bssid_2, rssi_2, bssid_3, rssi_3, is_active)
                    VALUES (:zone2, :x2, :y2, :b1_i, :r1_i, :b2_i, :r2_i, :b3_i, :r3_i, 1);";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([':zone'=>$zone_name, ':b1'=>$b1, ':r1'=>$r1, ':b2'=>$b2, ':r2'=>$r2, ':b3'=>$b3, ':r3'=>$r3, ':x'=>$svg_x, ':y'=>$svg_y,
                            ':zone2'=>$zone_name, ':x2'=>$svg_x, ':y2'=>$svg_y, ':b1_i'=>$b1, ':r1_i'=>$r1, ':b2_i'=>$b2, ':r2_i'=>$r2, ':b3_i'=>$b3, ':r3_i'=>$r3]);
            echo json_encode(['success' => true, 'message' => 'บันทึก True Fingerprint สำเร็จ']);
            break;

        default:
            throw new Exception('Invalid Action');
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>