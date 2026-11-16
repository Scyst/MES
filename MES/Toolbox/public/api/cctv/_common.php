<?php
/**
 * Shared security, request parsing, .env configuration, and path helpers
 * for self-contained Toolbox CCTV Downloader APIs.
 */

if (!defined('CCTV_SKIP_JSON_HEADER')) {
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
}
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: strict-origin-when-cross-origin');

date_default_timezone_set('Asia/Bangkok');

require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../utils/check_auth.php';
require_once __DIR__ . '/../../utils/logger.php';

/** Reads an environment variable cleanly without fallback credentials in code. */
function cctvEnv(string $key, string $default = ''): string {
    $val = $_ENV[$key] ?? $_SERVER[$key] ?? getenv($key);
    if ($val === false || $val === null) {
        return $default;
    }
    return trim((string)$val);
}

/** Emits standard JSON success response and terminates execution. */
function cctvJsonSuccess($data = null, string $message = 'OK', array $extra = []): void {
    echo json_encode(array_merge([
        'success' => true,
        'data' => $data,
        'message' => $message,
    ], $extra), JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

/** Emits standard JSON error response and terminates execution. */
function cctvJsonError(string $message, int $httpCode = 400, $data = null): void {
    http_response_code($httpCode);
    echo json_encode([
        'success' => false,
        'data' => $data,
        'message' => $message,
    ], JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

/** Authenticates user session and enforces CSRF token on mutations. */
function parseCctvRequest(string $defaultAction = ''): array {
    $rawBody = file_get_contents('php://input');
    $jsonBody = [];
    if ($rawBody !== false && trim($rawBody) !== '') {
        $decoded = json_decode($rawBody, true);
        if (is_array($decoded)) {
            $jsonBody = $decoded;
        }
    }

    $input = array_merge($_GET, $_POST, $jsonBody);
    $method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

    if ($method !== 'GET' && $method !== 'HEAD' && $method !== 'OPTIONS') {
        $headerToken = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? ($_POST['csrf_token'] ?? '');
        $sessionToken = $_SESSION['csrf_token'] ?? '';
        if ($headerToken === '' || $sessionToken === '' || !hash_equals($sessionToken, $headerToken)) {
            cctvJsonError('การตรวจสอบความปลอดภัย (CSRF Token) ไม่ถูกต้อง กรุณารีเฟรชหน้าจอ', 403);
        }
    }

    $currentUser = $_SESSION['user'] ?? [];
    if (empty($currentUser['id'])) {
        cctvJsonError('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่', 401);
    }

    $action = trim((string)($input['action'] ?? $defaultAction));
    return [$action, $input, $currentUser];
}

/** Enforces CCTV module authorization (Admin/Creator/Manager/Supervisor or logistics/loading viewer). */
function requireCctvAccess(bool $requireMutation = false): void {
    if (hasRole(['creator', 'admin', 'manager', 'supervisor']) || hasPermission('view_cctv')) {
        return;
    }
    if (!$requireMutation && hasPermission('view_loading')) {
        return;
    }
    cctvJsonError('คุณไม่มีสิทธิ์เข้าใช้งานระบบ CCTV Downloader', 403);
}

/** Returns and prepares the local CCTV downloads directory with hardened .htaccess. */
function getCctvDownloadsDir(): string {
    $envDir = cctvEnv('CCTV_DOWNLOADS_DIR');
    if ($envDir !== '') {
        $dir = rtrim($envDir, '/\\');
    } else {
        $legacyDir = __DIR__ . '/../../../page/cctv_downloader/downloads';
        $toolboxDir = __DIR__ . '/../../uploads/cctv_downloads';
        $dir = is_dir($legacyDir) ? $legacyDir : $toolboxDir;
    }

    if (!is_dir($dir)) {
        @mkdir($dir, 0775, true);
    }
    $htaccessPath = $dir . '/.htaccess';
    if (is_dir($dir) && is_writable($dir) && !is_file($htaccessPath)) {
        @file_put_contents(
            $htaccessPath,
            "Options -Indexes\n<FilesMatch \"\\.(log|queued|info|downloading|meta|json|vbs)$\">\n  Require all denied\n</FilesMatch>\n"
        );
    }
    return $dir;
}

/** Reads Hikvision/NVR camera credentials from .env cleanly (never hardcoded). */
function getCctvCameraCredentials(): array {
    $user = cctvEnv('CCTV_CAM_USER');
    $pass = cctvEnv('CCTV_CAM_PASS');
    return [
        'configured' => ($user !== '' && $pass !== ''),
        'user' => $user,
        'pass' => $pass,
    ];
}

/** Detects usable FFmpeg binary path from .env or server install. */
function resolveCctvFfmpegPath(): array {
    $envPath = cctvEnv('CCTV_FFMPEG_PATH');
    if ($envPath !== '' && is_file($envPath)) {
        return ['available' => true, 'path' => $envPath];
    }

    $candidates = [
        __DIR__ . '/ffmpeg.exe',
        __DIR__ . '/../../../page/cctv_downloader/api/ffmpeg.exe',
        __DIR__ . '/../../../MES/MES/page/cctv_downloader/api/ffmpeg.exe',
    ];
    foreach ($candidates as $path) {
        if (is_file($path)) {
            return ['available' => true, 'path' => $path];
        }
    }

    $whichCmd = (PHP_OS_FAMILY === 'Windows') ? 'where ffmpeg 2>nul' : 'command -v ffmpeg 2>/dev/null';
    $out = [];
    @exec($whichCmd, $out, $code);
    if ($code === 0 && !empty($out[0]) && is_file(trim($out[0]))) {
        return ['available' => true, 'path' => trim($out[0])];
    }

    return ['available' => false, 'path' => ''];
}

/** Validates IPv4 format strictly to prevent SSRF or shell injection. */
function normalizeCctvIp($rawIp): string {
    $ip = trim((string)($rawIp ?? ''));
    if ($ip === '' || !filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
        cctvJsonError('รูปแบบ IP Address ของกล้องไม่ถูกต้อง (ต้องเป็น IPv4 เช่น 10.1.48.131)', 400);
    }
    return $ip;
}

/** Validates YYYY-MM-DD date string strictly. */
function normalizeCctvDate($rawDate, string $fallback): string {
    $val = trim((string)($rawDate ?? ''));
    if ($val === '') {
        return $fallback;
    }
    $dt = DateTime::createFromFormat('Y-m-d', $val);
    if (!$dt || $dt->format('Y-m-d') !== $val) {
        cctvJsonError("รูปแบบวันที่ไม่ถูกต้อง ({$val})", 400);
    }
    return $val;
}
