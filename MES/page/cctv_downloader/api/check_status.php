<?php
// กำหนดที่อยู่ของไฟล์ auth 
require_once __DIR__ . '/../../../auth/check_auth.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Method not allowed']);
    exit;
}

$camera_ip = $_POST['camera_ip'] ?? '';
$cam_port = 554; // RTSP Default Port

if (empty($camera_ip)) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'IP Address is required']);
    exit;
}

// ใช้ fsockopen เพื่อลองเปิดพอร์ตแบบเร็วๆ (Timeout 2 วินาที)
// Security: ตรวจสอบ IP Address รูปแบบ IPv4 เท่านั้น ป้องกัน SSRF
if (!filter_var($camera_ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'รูปแบบ IP Address ไม่ถูกต้อง']);
    exit;
}

$connection = @fsockopen($camera_ip, $cam_port, $errno, $errstr, 2.0);

if (is_resource($connection)) {
    fclose($connection);
    echo json_encode([
        'status' => 'online',
        'message' => 'Camera is online'
    ]);
} else {
    echo json_encode([
        'status' => 'offline',
        'message' => 'Camera is unreachable or offline'
    ]);
}
