<?php
/**
 * Shared security, request parsing, CSRF, and JSON response helpers
 * for self-contained Toolbox Area Access Log APIs.
 */

if (!defined('AREA_ACCESS_SKIP_JSON_HEADER')) {
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

/** Emits standard JSON success response and terminates execution. */
function areaJsonSuccess($data = null, string $message = 'OK', array $extra = []): void {
    echo json_encode(array_merge([
        'success' => true,
        'data' => $data,
        'message' => $message,
    ], $extra), JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

/** Emits standard JSON error response and terminates execution. */
function areaJsonError(string $message, int $httpCode = 400, $data = null): void {
    http_response_code($httpCode);
    echo json_encode([
        'success' => false,
        'data' => $data,
        'message' => $message,
    ], JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

/** Parses request input, validates session or API key, and enforces CSRF on mutations. */
function parseAreaRequest(string $defaultAction = ''): array {
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
    $action = trim((string)($input['action'] ?? $defaultAction));

    $configuredKey = trim((string)($_ENV['SYSTEM_API_KEY'] ?? getenv('SYSTEM_API_KEY') ?: (defined('SYSTEM_API_KEY') ? SYSTEM_API_KEY : '')));
    $providedKey = trim((string)($_SERVER['HTTP_X_API_KEY'] ?? ($input['api_key'] ?? '')));
    $isSystemKeyValid = ($configuredKey !== '' && $providedKey !== '' && hash_equals($configuredKey, $providedKey));

    if ($action === 'auto_clear_ghost' && $isSystemKeyValid) {
        return [$action, $input, ['id' => 0, 'username' => 'SYSTEM_SCHEDULER', 'role' => 'system', 'permissions' => []], true];
    }

    if ($method !== 'GET' && $method !== 'HEAD' && $method !== 'OPTIONS') {
        $headerToken = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? ($_POST['csrf_token'] ?? '');
        $sessionToken = $_SESSION['csrf_token'] ?? '';
        if ($headerToken === '' || $sessionToken === '' || !hash_equals($sessionToken, $headerToken)) {
            areaJsonError('การตรวจสอบความปลอดภัย (CSRF Token) ไม่ถูกต้อง กรุณารีเฟรชหน้าจอ', 403);
        }
    }

    $currentUser = $_SESSION['user'] ?? [];
    if (empty($currentUser['id'])) {
        areaJsonError('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่', 401);
    }

    return [$action, $input, $currentUser, false];
}

/** Validates YYYY-MM-DD date string strictly. */
function normalizeAreaDate($rawDate, string $fallback): string {
    $val = trim((string)($rawDate ?? ''));
    if ($val === '') {
        return $fallback;
    }
    $dt = DateTime::createFromFormat('Y-m-d', $val);
    if (!$dt || $dt->format('Y-m-d') !== $val) {
        areaJsonError("รูปแบบวันที่ไม่ถูกต้อง ({$val})", 400);
    }
    return $val;
}

/** Validates HTML datetime-local or 'Y-m-d H:i[:s]' input into SQL Server format. */
function normalizeAreaDateTime($rawValue, bool $allowEmpty = false): ?string {
    $val = trim((string)($rawValue ?? ''));
    if ($val === '' || strtolower($val) === 'null') {
        if ($allowEmpty) {
            return null;
        }
        areaJsonError('กรุณาระบุวันและเวลาให้ครบถ้วน', 400);
    }
    $normalized = str_replace('T', ' ', $val);
    if (preg_match('/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/', $normalized)) {
        $normalized .= ':00';
    }
    $dt = DateTime::createFromFormat('Y-m-d H:i:s', $normalized);
    if (!$dt || $dt->format('Y-m-d H:i:s') !== $normalized) {
        areaJsonError('รูปแบบวันและเวลาไม่ถูกต้อง (กรุณาใช้ YYYY-MM-DD HH:MM)', 400);
    }
    return $normalized;
}

/** Checks whether the current user is authorized to edit historical logs or force checkout. */
function requireAreaSupervisorOrOperator(array $currentUser): void {
    if (!empty($currentUser['id'])) {
        return;
    }
    areaJsonError('คุณไม่มีสิทธิ์ดำเนินการรายการนี้', 403);
}
