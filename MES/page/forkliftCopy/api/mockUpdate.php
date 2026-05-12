<?php
// api/mockUpdate.php
define('ALLOW_GUEST_ACCESS', true);

// แก้ Path ให้ถอยกลับ 3 ชั้นสำหรับ config
require_once __DIR__ . '/../../../config/config.php';
// แก้ Path ให้ถอยกลับ 2 ชั้นสำหรับ db
require_once __DIR__ . '/../../db.php';

// รับค่าพิกัด X, Y จาก Node-RED
$x = $_POST['x'] ?? 0;
$y = $_POST['y'] ?? 0;
$zone = $_POST['zone'] ?? 'MOCK ZONE';

// บังคับอัปเดตตำแหน่งรถคันที่เราจะใช้พรีเซนต์ลง Database โดยตรง
$stmt = $pdo->prepare("UPDATE dbo.FORKLIFTS 
                       SET indoor_x = :x, indoor_y = :y, last_location = :zone, 
                           location_type = 'INDOOR', last_updated = GETDATE() 
                       WHERE code = 'BYD 2.5 (PRD)'");
$stmt->execute([':x' => $x, ':y' => $y, ':zone' => $zone]);

echo json_encode(['success' => true, 'message' => 'Mock updated']);
?>