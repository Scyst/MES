<?php
/**
 * upload_image.php — รับรูปผลตรวจจากเครื่อง Python มาเก็บที่ web server
 *
 * เครื่อง Python (db.py → image_uploader.py) จะ POST รูป JPEG มาที่นี่หลังตรวจเสร็จ
 * เพื่อให้หน้าเว็บแสดงรูปได้แม้เครื่อง Python จะออฟไลน์
 * วางไฟล์นี้ไว้โฟลเดอร์เดียวกับ accessoriesInspectionUI.php — รูปจะถูกเก็บใน img/
 *
 * Protocol (ตรงกับ image_uploader.py):
 *   POST  (raw body = JPEG bytes)
 *   Headers:
 *     X-Internal-Key : <key>           — ต้องตรงกับ CAM_API_KEY ใน cam_config.php
 *     X-Image-Name   : <filename.jpg>  — ชื่อไฟล์ปลายทาง (sanitize ที่นี่)
 *
 * Security:
 *   - ต้องมี X-Internal-Key ตรงกับ CAM_API_KEY (shared secret) — ไม่มี key = ปฏิเสธ
 *   - ชื่อไฟล์ผ่าน whitelist [A-Za-z0-9._-] + .jpg เท่านั้น (กัน path traversal)
 *   - ตรวจ JPEG magic bytes + จำกัดขนาด 12 MB (กันอัปโหลดไฟล์อื่น)
 */

require_once __DIR__ . '/cam_config.php';
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'method_not_allowed']);
    exit;
}

// ── auth: shared secret กับ api_key ใน config.json ของ Python ────────────────
$key = $_SERVER['HTTP_X_INTERNAL_KEY'] ?? '';
if (!defined('CAM_API_KEY') || CAM_API_KEY === '' || !hash_equals(CAM_API_KEY, $key)) {
    http_response_code(403);
    echo json_encode(['ok' => false, 'error' => 'unauthorized']);
    exit;
}

// ── ชื่อไฟล์: รับจาก header, sanitize เข้ม ────────────────────────────────────
$name = basename($_SERVER['HTTP_X_IMAGE_NAME'] ?? '');
if (!preg_match('/^[A-Za-z0-9._-]+\.jpg$/', $name)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'bad_filename']);
    exit;
}

// ── body = raw JPEG ──────────────────────────────────────────────────────────
$data = file_get_contents('php://input');
$len  = strlen($data);
if ($len === 0 || $len > 12 * 1024 * 1024) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'bad_size']);
    exit;
}
// JPEG magic bytes (FF D8 FF) — ปฏิเสธไฟล์ที่ไม่ใช่รูป JPEG
if (substr($data, 0, 3) !== "\xFF\xD8\xFF") {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'not_jpeg']);
    exit;
}

// ── เขียนลง img/ ─────────────────────────────────────────────────────────────
$dir = __DIR__ . '/img';
if (!is_dir($dir) && !@mkdir($dir, 0775, true)) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'mkdir_failed']);
    exit;
}

if (file_put_contents($dir . '/' . $name, $data, LOCK_EX) === false) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'write_failed']);
    exit;
}

echo json_encode(['ok' => true, 'name' => $name, 'bytes' => $len]);
