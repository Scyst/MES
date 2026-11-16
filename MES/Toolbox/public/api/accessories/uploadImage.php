<?php
/**
 * Image receiver endpoint for Python AI Vision node.
 * Authenticated strictly via X-Internal-Key matching ACCESSORIES_CAM_API_KEY in .env
 * (no interactive browser session cookie required).
 */

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');

require_once __DIR__ . '/../../config.php';

/** Emits JSON response and exits cleanly. */
function uploadJsonExit(bool $success, string $message, int $httpCode = 200, array $data = []): void {
    http_response_code($httpCode);
    echo json_encode([
        'success' => $success,
        'data' => $data,
        'message' => $message,
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

if (strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    uploadJsonExit(false, 'Method not allowed', 405);
}

$envKey = trim((string)($_ENV['ACCESSORIES_CAM_API_KEY'] ?? $_SERVER['ACCESSORIES_CAM_API_KEY'] ?? getenv('ACCESSORIES_CAM_API_KEY') ?: ''));
$hdrKey = trim((string)($_SERVER['HTTP_X_INTERNAL_KEY'] ?? ''));

if ($envKey === '' || $hdrKey === '' || !hash_equals($envKey, $hdrKey)) {
    uploadJsonExit(false, 'Unauthorized internal upload key', 403);
}

$name = basename((string)($_SERVER['HTTP_X_IMAGE_NAME'] ?? ''));
if (!preg_match('/^[A-Za-z0-9._-]+\.jpg$/', $name)) {
    uploadJsonExit(false, 'Invalid image filename', 400);
}

$data = file_get_contents('php://input');
$len = ($data !== false) ? strlen($data) : 0;
if ($len === 0 || $len > 12 * 1024 * 1024) {
    uploadJsonExit(false, 'Invalid payload size (must be 1B..12MB)', 400);
}
if (substr($data, 0, 3) !== "\xFF\xD8\xFF") {
    uploadJsonExit(false, 'Invalid JPEG file signature', 400);
}

$dir = __DIR__ . '/../../uploads/accessories_inspection';
if (!is_dir($dir) && !@mkdir($dir, 0775, true)) {
    uploadJsonExit(false, 'Failed to prepare upload directory', 500);
}

if (file_put_contents($dir . '/' . $name, $data, LOCK_EX) === false) {
    uploadJsonExit(false, 'Failed to store uploaded image', 500);
}

uploadJsonExit(true, 'Image uploaded', 200, ['name' => $name, 'bytes' => $len]);
