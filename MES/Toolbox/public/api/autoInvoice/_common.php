<?php
/**
 * Shared helpers, authentication, CSRF enforcement, and input validation
 * for self-contained Toolbox Auto Invoice APIs.
 */

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: strict-origin-when-cross-origin');

date_default_timezone_set('Asia/Bangkok');

require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../utils/check_auth.php';
require_once __DIR__ . '/../../utils/logger.php';

/** Emits standard JSON success payload and stops execution. */
function invJsonSuccess($data = null, string $message = 'OK', array $extra = []): void {
    echo json_encode(array_merge([
        'success' => true,
        'data' => $data,
        'message' => $message,
    ], $extra), JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

/** Emits standard JSON error payload and stops execution. */
function invJsonError(string $message, int $httpCode = 400, $data = null): void {
    http_response_code($httpCode);
    echo json_encode([
        'success' => false,
        'data' => $data,
        'message' => $message,
    ], JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

/** Parses GET/POST/JSON body, authenticates session, and validates CSRF on mutations. */
function parseInvRequest(string $defaultAction = ''): array {
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
            invJsonError('การตรวจสอบความปลอดภัย (CSRF Token) ไม่ถูกต้อง กรุณารีเฟรชหน้าจอ', 403);
        }
    }

    $currentUser = $_SESSION['user'] ?? [];
    if (empty($currentUser['id'])) {
        invJsonError('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่', 401);
    }

    $action = trim((string)($input['action'] ?? $defaultAction));
    return [$action, $input, $currentUser];
}

/** Enforces manage_invoice or planner/manager/admin/creator role check. */
function requireInvoiceAccess(): void {
    if (hasPermission('manage_invoice') || hasRole(['creator', 'admin', 'manager', 'planner'])) {
        return;
    }
    invJsonError('คุณไม่มีสิทธิ์เข้าใช้งานระบบจัดการ Invoice (manage_invoice)', 403);
}

/** Clamps decimal precision settings between 0 and 6. */
function clampInvoiceDecimals($value, int $defaultVal): int {
    if ($value === null || $value === '') {
        return $defaultVal;
    }
    $intVal = filter_var($value, FILTER_VALIDATE_INT);
    if ($intVal === false || $intVal < 0 || $intVal > 6) {
        throw new InvalidArgumentException('ค่าทศนิยมต้องเป็นจำนวนเต็มระหว่าง 0 ถึง 6 เท่านั้น');
    }
    return (int)$intVal;
}
