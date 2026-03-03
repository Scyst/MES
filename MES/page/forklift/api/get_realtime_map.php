<?php
// บังคับ Header เป็น JSON
header('Content-Type: application/json; charset=utf-8');

// ถอย 3 ชั้น (api -> forklift -> page -> MES Root)
require_once __DIR__ . '/../../../config/config.php';
require_once __DIR__ . '/../../../auth/check_auth.php'; 

try {
    $dsn = "sqlsrv:Server=" . DB_HOST . ";Database=" . DB_DATABASE;
    $pdo = new PDO($dsn, DB_USER, DB_PASSWORD);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // ดึงข้อมูลรถโฟล์คลิฟต์ทั้งหมดที่ Active
    $sql = "
        SELECT 
            id, code, name, status, current_battery, 
            last_location, location_type, indoor_x, indoor_y, 
            last_updated,
            CASE 
                WHEN DATEDIFF(MINUTE, last_updated, GETDATE()) > 3 THEN 1 
                ELSE 0 
            END as is_offline
        FROM dbo.FORKLIFTS WITH (NOLOCK)
        WHERE is_active = 1
    ";
    $stmt = $pdo->query($sql);
    $forklifts = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'data' => $forklifts
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error: ' . $e->getMessage()
    ]);
}
?>