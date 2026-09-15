<?php
require_once __DIR__ . '/../../../auth/check_auth.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Method not allowed']);
    exit;
}

$filename = $_POST['filename'] ?? '';

if (empty($filename)) {
    echo json_encode(['status' => 'error', 'message' => 'ไม่มีการระบุชื่อไฟล์']);
    exit;
}

// ป้องกัน Directory Traversal
$filename = basename($filename);
$downloads_dir = __DIR__ . '/../downloads';
$target_file = $downloads_dir . '/' . $filename;
$marker_file = $downloads_dir . '/' . $filename . '.downloading';
$queued_file = $downloads_dir . '/' . $filename . '.queued';
$queued_info_file = $downloads_dir . '/' . $filename . '.queued.info';
$basename_without_ext = pathinfo($filename, PATHINFO_FILENAME);
$log_file = $downloads_dir . '/' . $basename_without_ext . '.log';
$dav_file = $downloads_dir . '/' . $basename_without_ext . '.dav';

$deleted_any = false;

// C-5: ถ้ากำลังดาวน์โหลดอยู่ (marker มีอยู่) ต้อง Kill FFmpeg ก่อนลบไฟล์
// เพื่อป้องกัน Ghost Connection บนกล้อง
if (file_exists($marker_file)) {
    // หา Process FFmpeg ที่กำลังเขียนไฟล์นี้อยู่แล้ว Kill ทิ้ง
    $safe_target = escapeshellarg($target_file);
    if (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN') {
        // Windows: ค้นหา PID ของ FFmpeg ที่มี output ตรงกับไฟล์นี้
        $wmic_cmd = 'wmic process where "name=\'ffmpeg.exe\'" get CommandLine,ProcessId /format:csv 2>nul';
        $proc_output = [];
        exec($wmic_cmd, $proc_output);
        foreach ($proc_output as $line) {
            if (stripos($line, $basename_without_ext) !== false) {
                // ดึง PID จากท้ายบรรทัด CSV (Node,CommandLine,ProcessId)
                $parts = explode(',', trim($line));
                $pid = end($parts);
                if (is_numeric($pid)) {
                    exec('taskkill /F /PID ' . (int)$pid . ' 2>nul');
                }
            }
        }
    } else {
        // Linux: pkill -f เพื่อ Kill FFmpeg ที่ command line มีชื่อไฟล์นี้
        $safe_pattern = escapeshellarg('ffmpeg.*' . $basename_without_ext);
        exec('pkill -f ' . $safe_pattern . ' 2>/dev/null');
    }
    // รอให้ FFmpeg ปล่อยไฟล์ (Windows อาจล็อกไฟล์ชั่วขณะหลัง Kill)
    usleep(500000); // 0.5 วินาที
}

if (file_exists($target_file)) {
    @unlink($target_file);
    $deleted_any = true;
}
if (file_exists($marker_file)) {
    @unlink($marker_file);
    $deleted_any = true;
}
if (file_exists($queued_file)) {
    @unlink($queued_file);
    $deleted_any = true;
}
if (file_exists($queued_info_file)) {
    @unlink($queued_info_file);
    $deleted_any = true;
}
if (file_exists($log_file)) {
    @unlink($log_file);
    $deleted_any = true;
}
if (file_exists($dav_file)) {
    @unlink($dav_file);
    $deleted_any = true;
}

if ($deleted_any) {
    echo json_encode(['status' => 'success', 'message' => 'ลบไฟล์สำเร็จ']);
} else {
    echo json_encode(['status' => 'error', 'message' => 'ไม่พบไฟล์นี้ในระบบ']);
}
