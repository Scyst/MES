<?php
// กำหนดที่อยู่ของไฟล์ auth 
require_once __DIR__ . '/../../../auth/check_auth.php';

header('Content-Type: application/json');

ignore_user_abort(true);
set_time_limit(0);
date_default_timezone_set('Asia/Bangkok');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Method not allowed']);
    exit;
}

$camera_ip = $_POST['camera_ip'] ?? '';
$channel   = (string)(int)($_POST['channel'] ?? '1');
$start_time = $_POST['start_time'] ?? '';
$end_time   = $_POST['end_time'] ?? '';
$filename   = $_POST['filename'] ?? 'video_' . time();

if (empty($camera_ip) || empty($start_time) || empty($end_time)) {
    echo json_encode(['status' => 'error', 'message' => 'กรุณาระบุ IP, เวลาเริ่มต้น และเวลาสิ้นสุด']);
    exit;
}

// Security: ตรวจสอบ IP Address รูปแบบ IPv4 เท่านั้น ป้องกัน Command Injection
if (!filter_var($camera_ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
    echo json_encode(['status' => 'error', 'message' => 'รูปแบบ IP Address ไม่ถูกต้อง']);
    exit;
}

$cam_user = 'admin';
$cam_pass = 'abcd@1234';

// Sanitize filename
$filename = preg_replace('/[^a-zA-Z0-9_-]/', '_', $filename);
$output_dir = __DIR__ . '/../downloads';
if (!is_dir($output_dir)) {
    mkdir($output_dir, 0755, true);
}

// Validate: ตรวจสอบว่ารูปแบบเวลาถูกต้องและแปลงได้
$ts_start = strtotime($start_time);
$ts_end   = strtotime($end_time);
if ($ts_start === false || $ts_end === false) {
    echo json_encode(['status' => 'error', 'message' => 'รูปแบบวันเวลาไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง']);
    exit;
}

// Validate: เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น
$duration = $ts_end - $ts_start;
if ($duration <= 0) {
    echo json_encode(['status' => 'error', 'message' => 'เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น']);
    exit;
}

$base_url = "http://{$camera_ip}";
$output_file = $output_dir . '/' . $filename . '.mp4';
$marker_file = $output_file . '.downloading';

// 1. ตรวจสอบการโหลดซ้ำ (Duplicate Check)
if (file_exists($marker_file)) {
    echo json_encode(['status' => 'error', 'message' => 'ช่วงเวลานี้กำลังถูกดาวน์โหลดอยู่ โปรดรอสักครู่']);
    exit;
}

if (file_exists($output_file)) {
    echo json_encode(['status' => 'error', 'message' => 'ช่วงเวลานี้ถูกดาวน์โหลดเสร็จแล้ว (มีไฟล์ mp4 อยู่ในระบบแล้ว)']);
    exit;
}

// 2. ตรวจสอบโควต้าการโหลดพร้อมกัน (Concurrency Limit) และล้างคิวค้าง (Auto-cleanup)
$active_downloads = glob($output_dir . '/*.downloading');
$now = time();
$active_count = 0;

foreach ($active_downloads as $dl_file) {
    if (is_file($dl_file)) {
        $log_file_check = str_replace('.mp4.downloading', '.log', $dl_file);
        $time_to_check = file_exists($log_file_check) ? filemtime($log_file_check) : filemtime($dl_file);
        
        if ($now - $time_to_check >= 900) { // 15 นาที = 900 วินาที (ถ้า Log ไม่อัปเดต 15 นาที ถือว่าค้าง)
            @unlink($dl_file); // ลบ Marker ผีทิ้ง
        } else {
            $active_count++;
        }
    }
}

$log_file = $output_dir . '/' . $filename . '.log';

// ส่ง Payload ให้ background_worker.php
$worker_script = __DIR__ . '/background_worker.php';

// หา path ของ php.exe (เปลี่ยนเป็น php-win.exe เพื่อไม่ให้มีหน้าต่างดำเด้ง)
$php_exe = 'php';
if (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN') {
    $php_path = dirname(ini_get('extension_dir'));
    if (file_exists($php_path . '/php-win.exe')) {
        $php_exe = $php_path . '/php-win.exe';
    } else {
        $php_exe = $php_path . '/php.exe';
    }
}

// เข้ารหัสข้อมูล Payload
$payload = base64_encode(json_encode([
    'marker' => $marker_file,
    'log' => $log_file,
    'php_exe' => $php_exe,
    'worker_script' => $worker_script,
    'meta' => [
        'method' => 'http_smart',
        'camera_ip' => $camera_ip,
        'cam_user' => $cam_user,
        'cam_pass' => $cam_pass,
        'channel' => $channel,
        'start_time' => $start_time,
        'end_time' => $end_time,
        'filename' => $filename,
        'duration' => $duration
    ]
]));

if ($active_count >= 2) {
    // ---- โหมดเข้าคิว (QUEUE) ----
    $queued_file = $output_file . '.queued';
    
    // เขียนข้อมูล payload สำหรับ worker ตัวถัดไป
    file_put_contents($queued_file, $payload);
    
    // เขียนข้อมูล meta ให้อ่านง่ายสำหรับหน้าเว็บ (เอาไว้แสดงในหน้าจอ)
    $queue_info = date('Y-m-d H:i:s') . ' | ' . $filename . '.mp4 | HTTP (Queued) | ' . $duration;
    file_put_contents($queued_file . '.info', $queue_info);
    
    echo json_encode([
        'status' => 'fallback', 
        'method' => 'http_queue',
        'message' => 'เพิ่มไฟล์ลงในคิวแล้ว ระบบจะรันอัตโนมัติเมื่อคิวปัจจุบันเสร็จสิ้น'
    ]);
    exit;
} else {
    // ---- โหมดรันทันที (IMMEDIATE) ----
    file_put_contents($marker_file, date('Y-m-d H:i:s') . ' | ' . $filename . '.mp4 | HTTP (Smart) | ' . $duration);
    
    // รันแบบ background และไม่บล็อค
    if (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN') {
        // ใช้ VBScript ผ่าน wscript.exe เพื่อสั่งรัน background process แบบซ่อนหน้าต่าง 100% (SW_HIDE) และ Non-blocking
        // wscript.exe ไม่มีหน้าต่าง console ในตัวเอง ทำให้ไม่มีแม้แต่หน้าต่างดำกระพริบตอนสั่งรัน
        $vbs_file = __DIR__ . '/run_hidden_' . uniqid() . '.vbs';
        // สร้าง string คำสั่งแบบใส่ double quote คลุมแต่ละ parameter และรันผ่าน cmd.exe /c
        // การครอบ cmd.exe อีกชั้นช่วยแก้บั๊ก WScript.Shell.Run รัน php.exe ตรงๆ แล้วเงียบหาย
        $vbs_cmd = 'cmd.exe /c ""' . $php_exe . '" "' . $worker_script . '" "' . $payload . '""';
        // ใน VBScript การ escape เครื่องหมาย " ใน string ให้พิมพ์เบิ้ลเป็น ""
        $vbs_cmd_escaped = str_replace('"', '""', $vbs_cmd);
        $vbs_code = 'CreateObject("WScript.Shell").Run "' . $vbs_cmd_escaped . '", 0, False';
        file_put_contents($vbs_file, $vbs_code);
        
        $bg_cmd = 'wscript.exe //nologo ' . escapeshellarg($vbs_file);
        $descriptorspec = [0 => ['pipe', 'r'], 1 => ['pipe', 'w'], 2 => ['pipe', 'w']];
        $proc = proc_open($bg_cmd, $descriptorspec, $pipes, null, null, ['bypass_shell' => true, 'create_no_window' => true]);
        if (is_resource($proc)) {
            fclose($pipes[0]);
            fclose($pipes[1]);
            fclose($pipes[2]);
            proc_close($proc);
            @unlink($vbs_file); // ลบไฟล์ vbs หลังจากรันเสร็จ
        }
    } else {
        $bg_cmd = escapeshellarg($php_exe) . ' ' . escapeshellarg($worker_script) . ' ' . escapeshellarg($payload) . ' > /dev/null 2>&1 &';
        exec($bg_cmd);
    }
    
    echo json_encode([
        'status' => 'fallback', 
        'method' => 'http_smart',
        'message' => 'สั่งดาวน์โหลดไฟล์วิดีโอ (Smart Download) เรียบร้อยแล้ว'
    ]);
    exit;
}
