<?php
/**
 * Shared security, request parsing, validation, permission, and image storage
 * helpers for self-contained Toolbox PE Enterprise & Maintenance APIs.
 */

if (!defined('PE_SKIP_JSON_HEADER')) {
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
}
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: strict-origin-when-cross-origin');

date_default_timezone_set('Asia/Bangkok');

require_once __DIR__ . '/../../db.php';
if (!defined('PE_WORK_ORDERS_TABLE')) {
    require_once __DIR__ . '/../../config.php';
}
require_once __DIR__ . '/../../utils/check_auth.php';
require_once __DIR__ . '/../../utils/logger.php';

/**
 * Emits standard API JSON success payload and stops execution.
 */
function peJsonSuccess($data = null, string $message = 'OK', array $extra = []): void {
    $payload = array_merge([
        'success' => true,
        'data' => $data,
        'message' => $message,
    ], $extra);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

/**
 * Emits standard API JSON error payload and stops execution.
 */
function peJsonError(string $message, int $httpCode = 400, $data = null): void {
    http_response_code($httpCode);
    echo json_encode([
        'success' => false,
        'data' => $data,
        'message' => $message,
    ], JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

/**
 * Parses GET/POST/JSON inputs, authenticates user, enforces CSRF on mutating calls,
 * and returns [$action, $input, $currentUser].
 */
function parsePeRequest(): array {
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
        $headerToken = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
        $sessionToken = $_SESSION['csrf_token'] ?? '';
        if ($headerToken === '' || $sessionToken === '' || !hash_equals($sessionToken, $headerToken)) {
            peJsonError('การตรวจสอบความปลอดภัย (CSRF Token) ไม่ถูกต้อง กรุณารีเฟรชหน้าจอ', 403);
        }
    }

    $currentUser = $_SESSION['user'] ?? [];
    if (empty($currentUser['id'])) {
        peJsonError('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่', 401);
    }

    $action = trim((string)($input['action'] ?? ''));
    return [$action, $input, $currentUser];
}

/**
 * Checks permission codes or authorized maintenance/admin roles.
 */
function requirePeAccess(array $permissions = ['view_maintenance', 'manage_maintenance', 'view_production', 'view_dashboard'], array $roles = ['admin', 'creator', 'manager', 'maintenance', 'engineer']): void {
    if (hasRole($roles)) {
        return;
    }
    foreach ($permissions as $perm) {
        if (hasPermission($perm)) {
            return;
        }
    }
    peJsonError('คุณไม่มีสิทธิ์ดำเนินการในระบบงานซ่อมบำรุง (PE)', 403);
}

/**
 * Validates positive integer ID.
 */
function parsePePositiveInt($value, string $label = 'รหัสอ้างอิง'): int {
    $intVal = filter_var($value, FILTER_VALIDATE_INT);
    if ($intVal === false || $intVal <= 0) {
        throw new InvalidArgumentException("กรุณาระบุ {$label} ที่ถูกต้อง");
    }
    return (int)$intVal;
}

/**
 * Parses a YYYY-MM-DD date string or throws on invalid input.
 */
function parsePeDateOrNull(?string $rawDate): ?string {
    $trimmed = trim((string)$rawDate);
    if ($trimmed === '') {
        return null;
    }
    $dt = DateTime::createFromFormat('Y-m-d', $trimmed);
    if (!$dt || $dt->format('Y-m-d') !== $trimmed) {
        throw new InvalidArgumentException('รูปแบบวันที่ไม่ถูกต้อง (ต้องเป็น YYYY-MM-DD)');
    }
    return $trimmed;
}

/**
 * Parses a DATETIME-compatible string (ISO/T or space separated) cleanly.
 */
function parsePeDateTimeOrNull(?string $raw): ?string {
    $trimmed = trim((string)$raw);
    if ($trimmed === '') {
        return null;
    }
    $normalized = str_replace('T', ' ', $trimmed);
    if (preg_match('/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/', $normalized)) {
        $normalized .= ':00';
    }
    $ts = strtotime($normalized);
    if ($ts === false) {
        throw new InvalidArgumentException('รูปแบบวันเวลาไม่ถูกต้อง');
    }
    return date('Y-m-d H:i:s', $ts);
}

/**
 * Parses numeric amount bounded safely for DECIMAL storage.
 */
function parsePeBoundedFloat($value, string $label, float $min = 0, float $max = 9999999.999): float {
    if ($value === null || $value === '' || !is_numeric($value)) {
        throw new InvalidArgumentException("{$label} ต้องเป็นตัวเลขที่ถูกต้อง");
    }
    $num = round((float)$value, 3);
    if (!is_finite($num) || $num < $min || $num > $max) {
        throw new InvalidArgumentException("{$label} ต้องอยู่ระหว่าง {$min} ถึง {$max}");
    }
    return $num;
}

/**
 * Resolves the shared MES uploads root directory outside Toolbox SPA root so
 * images uploaded in Toolbox or Legacy PE remain mutually accessible.
 */
function resolvePeUploadsBaseDir(): string {
    $candidates = [
        dirname(__DIR__, 3) . '/MES/MES/uploads', // FTP webroot layout (/MES/MES/uploads)
        dirname(__DIR__, 4) . '/MES/MES/uploads',
        dirname(__DIR__, 4) . '/uploads',         // Local workspace layout (E:\MES\MES\MES\uploads)
        dirname(__DIR__, 3) . '/uploads',
        dirname(__DIR__, 2) . '/uploads',
    ];

    foreach ($candidates as $dir) {
        if (is_dir($dir)) {
            $real = realpath($dir);
            return $real !== false ? $real : $dir;
        }
    }

    $fallback = dirname(__DIR__, 4) . '/uploads';
    if (!is_dir($fallback)) {
        @mkdir($fallback, 0755, true);
    }
    $real = realpath($fallback);
    return $real !== false ? $real : $fallback;
}

/**
 * Resolves candidate upload root directories when locating existing legacy files.
 */
function resolvePeUploadSearchDirs(): array {
    $dirs = [];
    $candidates = [
        resolvePeUploadsBaseDir(),
        dirname(__DIR__, 3) . '/MES/MES/uploads',
        dirname(__DIR__, 4) . '/MES/MES/uploads',
        dirname(__DIR__, 4) . '/uploads',
        dirname(__DIR__, 3) . '/uploads',
        dirname(__DIR__, 2) . '/uploads',
    ];
    foreach ($candidates as $c) {
        $real = realpath($c);
        if ($real !== false && is_dir($real) && !in_array($real, $dirs, true)) {
            $dirs[] = $real;
        }
    }
    return $dirs;
}

/**
 * Validates and persists a base64-encoded image safely outside webroot when possible.
 * Returns normalized DB relative path such as "uploads/pe_images/pe_xxx.jpg".
 */
function savePeBase64Image(string $base64Input, string $subFolder = 'pe_images', string $prefix = 'PE_'): ?string {
    $trimmed = trim($base64Input);
    if ($trimmed === '') {
        return null;
    }

    $allowedFolders = ['pe_images', 'spare_parts'];
    if (!in_array($subFolder, $allowedFolders, true)) {
        $subFolder = 'pe_images';
    }

    if (preg_match('/^data:image\/([a-zA-Z0-9]+);base64,(.*)$/s', $trimmed, $matches)) {
        $rawData = base64_decode($matches[2], true);
    } else {
        $rawData = base64_decode($trimmed, true);
    }

    if ($rawData === false || strlen($rawData) === 0) {
        throw new InvalidArgumentException('ข้อมูลรูปภาพ Base64 ไม่ถูกต้อง');
    }
    if (strlen($rawData) > 5 * 1024 * 1024) {
        throw new InvalidArgumentException('ขนาดรูปภาพต้องไม่เกิน 5 MB');
    }

    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mime = $finfo->buffer($rawData);
    $extMap = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
    ];
    if (!isset($extMap[$mime])) {
        throw new InvalidArgumentException('รองรับเฉพาะไฟล์ภาพ JPG, PNG หรือ WebP เท่านั้น');
    }

    $baseUploads = resolvePeUploadsBaseDir();
    $targetDir = $baseUploads . DIRECTORY_SEPARATOR . $subFolder;
    if (!is_dir($targetDir) && !mkdir($targetDir, 0755, true)) {
        throw new RuntimeException('ไม่สามารถสร้างโฟลเดอร์จัดเก็บรูปภาพได้');
    }

    $safePrefix = preg_replace('/[^A-Za-z0-9_-]/', '_', $prefix);
    $filename = $safePrefix . time() . '_' . bin2hex(random_bytes(4)) . '.' . $extMap[$mime];
    $destPath = $targetDir . DIRECTORY_SEPARATOR . $filename;

    if (file_put_contents($destPath, $rawData) === false) {
        throw new RuntimeException('ไม่สามารถบันทึกรูปภาพลงเซิร์ฟเวอร์ได้');
    }

    return 'uploads/' . $subFolder . '/' . $filename;
}

/**
 * Resolves the actor display name cleanly from session user data.
 */
function getPeActorName(array $currentUser): string {
    $full = trim((string)($currentUser['fullname'] ?? ''));
    if ($full !== '') {
        return $full;
    }
    return trim((string)($currentUser['username'] ?? 'SYSTEM'));
}

/**
 * Emits a unique WO-YYYYMMDD-NNNN work order number safely.
 */
function generatePeWoNumber(PDO $pdo): string {
    $dateStr = date('Ymd');
    $prefix = "WO-{$dateStr}-";
    $stmt = $pdo->prepare("SELECT TOP 1 wo_number FROM " . PE_WORK_ORDERS_TABLE . " WITH (UPDLOCK) WHERE wo_number LIKE ? ORDER BY wo_id DESC");
    $stmt->execute([$prefix . '%']);
    $last = (string)$stmt->fetchColumn();

    $seq = 1;
    if ($last !== '' && preg_match('/-(\d+)$/', $last, $m)) {
        $seq = (int)$m[1] + 1;
    }
    return $prefix . str_pad((string)$seq, 4, '0', STR_PAD_LEFT);
}
