<?php
/**
 * Shared configuration, security, authentication, and env helpers
 * for self-contained Toolbox Accessories Inspection APIs & camera proxy.
 */

if (!defined('ACCESSORIES_SKIP_JSON_HEADER')) {
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

/** Reads an environment variable reliably without exposing fallback secrets in source code. */
function accessoriesEnv(string $key, string $default = ''): string {
    $val = $_ENV[$key] ?? $_SERVER[$key] ?? getenv($key);
    if ($val === false || $val === null) {
        return $default;
    }
    return trim((string)$val);
}

/** Emits standard JSON success response and terminates execution. */
function accessoriesJsonSuccess($data = null, string $message = 'OK', array $extra = []): void {
    echo json_encode(array_merge([
        'success' => true,
        'data' => $data,
        'message' => $message,
    ], $extra), JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

/** Emits standard JSON error response and terminates execution. */
function accessoriesJsonError(string $message, int $httpCode = 400, $data = null): void {
    http_response_code($httpCode);
    echo json_encode([
        'success' => false,
        'data' => $data,
        'message' => $message,
    ], JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

/** Authenticates user session and validates CSRF token for non-GET mutations. */
function parseAccessoriesRequest(string $defaultAction = '', bool $enforceCsrf = true): array {
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

    if ($enforceCsrf && $method !== 'GET' && $method !== 'HEAD' && $method !== 'OPTIONS') {
        $headerToken = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? ($_POST['csrf_token'] ?? '');
        $sessionToken = $_SESSION['csrf_token'] ?? '';
        if ($headerToken === '' || $sessionToken === '' || !hash_equals($sessionToken, $headerToken)) {
            accessoriesJsonError('การตรวจสอบความปลอดภัย (CSRF Token) ไม่ถูกต้อง กรุณารีเฟรชหน้าจอ', 403);
        }
    }

    $currentUser = $_SESSION['user'] ?? [];
    if (empty($currentUser['id'])) {
        accessoriesJsonError('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่', 401);
    }

    $action = trim((string)($input['action'] ?? $defaultAction));
    return [$action, $input, $currentUser];
}

/** Returns whether user may control AI camera station (start/capture/model/exposure). */
function canControlAccessoriesCam(): bool {
    return hasRole(['creator', 'admin', 'supervisor']) || hasPermission('manage_qms');
}

/** Masks upstream URL host for non-admin status diagnostics. */
function getAccessoriesCameraConfig(): array {
    $upstream = rtrim(accessoriesEnv('ACCESSORIES_CAM_UPSTREAM'), '/');
    $apiKey = accessoriesEnv('ACCESSORIES_CAM_API_KEY');
    $valid = ($upstream !== '' && filter_var($upstream, FILTER_VALIDATE_URL) !== false);

    return [
        'configured' => $valid,
        'upstream' => $valid ? $upstream : '',
        'api_key' => $apiKey,
    ];
}
