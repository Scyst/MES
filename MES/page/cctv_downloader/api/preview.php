<?php
// กำหนดที่อยู่ของไฟล์ auth 
require_once __DIR__ . '/../../../auth/check_auth.php';

header('Content-Type: application/json');

// ป้องกันเบราว์เซอร์ตัดการเชื่อมต่อแล้วทำให้ FFmpeg โดน Force Kill (ซึ่งจะทำให้กล้องเกิดเซสชันค้าง)
ignore_user_abort(true);
set_time_limit(60);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Method not allowed']);
    exit;
}

$camera_ip = $_POST['camera_ip'] ?? '';

if (empty($camera_ip)) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'IP Address is required']);
    exit;
}

// Security: ตรวจสอบ IP Address รูปแบบ IPv4 เท่านั้น ป้องกัน Command Injection
if (!filter_var($camera_ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'รูปแบบ IP Address ไม่ถูกต้อง']);
    exit;
}

$cam_user = 'admin';
$cam_pass = 'abcd@1234';
$cam_port = '554';

// URL ดึงภาพนิ่งผ่าน ISAPI (ดึงผ่าน HTTP เร็วกว่า RTSP มาก)
$isapi_url = "http://{$cam_user}:{$cam_pass}@{$camera_ip}/ISAPI/Streaming/channels/101/picture";

session_write_close(); // ปลดล็อค Session ป้องกันการบล็อคเบราว์เซอร์

// ดึงภาพผ่าน HTTP ด้วย file_get_contents
$context = stream_context_create([
    'http' => [
        'timeout' => 5 // รอสูงสุด 5 วินาที
    ]
]);

// ใช้ @ เพื่อระงับ Warning กรณีเชื่อมต่อไม่ได้
$img_data_raw = @file_get_contents($isapi_url, false, $context);

if ($img_data_raw !== false) {
    // อ่านภาพแปลงเป็น base64
    $img_data = base64_encode($img_data_raw);
    
    echo json_encode([
        'status' => 'success',
        'image' => 'data:image/jpeg;base64,' . $img_data
    ]);
} else {
    // หาความผิดพลาด
    $error = error_get_last();
    $error_msg = $error ? $error['message'] : 'ไม่ทราบสาเหตุ';
    
    echo json_encode([
        'status' => 'error',
        'message' => 'ไม่สามารถเชื่อมต่อกล้องหรือดึงภาพได้ (อาจจะยังไม่ได้เปิด ISAPI หรือติดปัญหา Network)',
        'log' => "Error: {$error_msg}\nURL: http://***:***@{$camera_ip}/ISAPI/..."
    ]);
}
