<?php
/**
 * Shared security, request parsing, validation, and permission helpers
 * for self-contained Toolbox Daily P&L APIs.
 */

if (!defined('PL_SKIP_JSON_HEADER')) {
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

/** Emits standard JSON success response and stops execution. */
function plJsonSuccess($data = null, string $message = 'OK', array $extra = []): void {
    echo json_encode(array_merge([
        'success' => true,
        'data' => $data,
        'message' => $message,
    ], $extra), JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

/** Emits standard JSON error response and stops execution. */
function plJsonError(string $message, int $httpCode = 400, $data = null): void {
    http_response_code($httpCode);
    echo json_encode([
        'success' => false,
        'data' => $data,
        'message' => $message,
    ], JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

/** Parses GET/POST/JSON body, checks session auth, and enforces CSRF token on mutations. */
function parsePlRequest(string $defaultAction = ''): array {
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
            plJsonError('การตรวจสอบความปลอดภัย (CSRF Token) ไม่ถูกต้อง กรุณารีเฟรชหน้าจอ', 403);
        }
    }

    $currentUser = $_SESSION['user'] ?? [];
    if (empty($currentUser['id'])) {
        plJsonError('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่', 401);
    }

    $action = trim((string)($input['action'] ?? $defaultAction));
    return [$action, $input, $currentUser];
}

/** Enforces Daily P&L read/write permissions. */
function requirePlAccess(bool $requireManage = false): void {
    if ($requireManage) {
        if (hasPermission('manage_pl') || hasRole(['creator', 'admin'])) {
            return;
        }
        plJsonError('คุณไม่มีสิทธิ์แก้ไขข้อมูลงบกำไรขาดทุน (manage_pl)', 403);
    }

    if (hasPermission('view_pl') || hasPermission('manage_pl') || hasPermission('view_executive') || hasRole(['creator', 'admin', 'manager'])) {
        return;
    }
    plJsonError('คุณไม่มีสิทธิ์เข้าดูข้อมูลงบกำไรขาดทุน (view_pl)', 403);
}

/** Validates Y-m-d date strictly. */
function normalizePlDate($rawDate, string $fallback = ''): string {
    $val = trim((string)($rawDate ?? ''));
    if ($val === '') {
        return $fallback;
    }
    $dt = DateTime::createFromFormat('Y-m-d', $val);
    if (!$dt || $dt->format('Y-m-d') !== $val) {
        plJsonError("รูปแบบวันที่ไม่ถูกต้อง ({$val}) กรุณาใช้ YYYY-MM-DD", 400);
    }
    return $val;
}

/** Validates P&L formula characters strictly against injection. */
function isValidPlFormula(string $formula): bool {
    if ($formula === '') {
        return true;
    }
    if (strpos($formula, '--') !== false || strpos($formula, '/*') !== false) {
        return false;
    }
    if (substr_count($formula, '[') !== substr_count($formula, ']')) {
        return false;
    }
    return preg_match('/^[A-Z0-9_\[\]\+\-\*\/\(\)\.\s]+$/i', $formula) === 1;
}
