<?php
/**
 * Shared security, request parsing, validation, and permission helpers
 * for self-contained Toolbox Management (Executive Overview & Production Planning) APIs.
 */

if (!defined('MGMT_SKIP_JSON_HEADER')) {
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
function mgmtJsonSuccess($data = null, string $message = 'OK', array $extra = []): void {
    echo json_encode(array_merge([
        'success' => true,
        'data' => $data,
        'message' => $message,
    ], $extra), JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

/** Emits standard JSON error response and stops execution. */
function mgmtJsonError(string $message, int $httpCode = 400, $data = null): void {
    http_response_code($httpCode);
    echo json_encode([
        'success' => false,
        'data' => $data,
        'message' => $message,
    ], JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

/** Parses GET/POST/JSON body, authenticates session, and validates CSRF on mutations. */
function parseMgmtRequest(string $defaultAction = ''): array {
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
            mgmtJsonError('การตรวจสอบความปลอดภัย (CSRF Token) ไม่ถูกต้อง กรุณารีเฟรชหน้าจอ', 403);
        }
    }

    $currentUser = $_SESSION['user'] ?? [];
    if (empty($currentUser['id'])) {
        mgmtJsonError('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่', 401);
    }

    $action = trim((string)($input['action'] ?? $defaultAction));
    return [$action, $input, $currentUser];
}

/** Validates Executive Overview view/sync authorization. */
function requireMgmtExecutiveAccess(): void {
    if (hasPermission('view_executive') || hasRole(['creator', 'admin', 'manager'])) {
        return;
    }
    mgmtJsonError('คุณไม่มีสิทธิ์เข้าถึงข้อมูลภาพรวมผู้บริหาร (view_executive)', 403);
}

/** Validates Production Planning read or write authorization. */
function requireMgmtPlanningAccess(bool $requireManage = false, bool $requireDestructiveAdmin = false): void {
    if ($requireDestructiveAdmin) {
        if (hasRole(['creator', 'admin'])) {
            return;
        }
        mgmtJsonError('คำสั่งล้างแผนทั้งหมดสงวนสิทธิ์เฉพาะ Admin / Creator เท่านั้น', 403);
    }

    if ($requireManage) {
        if (hasPermission('manage_planning') || hasPermission('view_planning') || hasPermission('manage_production') || hasRole(['creator', 'admin', 'manager', 'planner', 'supervisor'])) {
            return;
        }
        mgmtJsonError('คุณไม่มีสิทธิ์แก้ไขแผนการผลิต (view_planning)', 403);
    }

    if (hasPermission('view_planning') || hasPermission('view_executive') || hasPermission('view_production') || hasRole(['creator', 'admin', 'manager', 'planner', 'supervisor'])) {
        return;
    }
    mgmtJsonError('คุณไม่มีสิทธิ์เข้าดูข้อมูลแผนการผลิต (view_planning)', 403);
}

/** Validates Y-m-d date format strictly. */
function normalizeMgmtDate($rawDate, string $fallback = ''): string {
    $val = trim((string)($rawDate ?? ''));
    if ($val === '') {
        return $fallback;
    }
    $dt = DateTime::createFromFormat('Y-m-d', $val);
    if (!$dt || $dt->format('Y-m-d') !== $val) {
        mgmtJsonError("รูปแบบวันที่ไม่ถูกต้อง ({$val}) กรุณาใช้ YYYY-MM-DD", 400);
    }
    return $val;
}
