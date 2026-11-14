<?php
/**
 * Shared helpers for self-contained Toolbox Planning (Daily Command Center) APIs.
 */

if (!defined('PLANNING_SKIP_JSON_HEADER')) {
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

function planJsonSuccess($data = null, string $message = 'OK', array $extra = []): void {
    $payload = array_merge([
        'success' => true,
        'data' => $data,
        'message' => $message,
    ], $extra);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

function planJsonError(string $message, int $httpCode = 400, $data = null): void {
    http_response_code($httpCode);
    echo json_encode([
        'success' => false,
        'data' => $data,
        'message' => $message,
    ], JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

function parsePlanningRequest(string $defaultAction = 'get_meeting'): array {
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
            planJsonError('การตรวจสอบความปลอดภัย (CSRF Token) ไม่ถูกต้อง กรุณารีเฟรชหน้าจอ', 403);
        }
    }

    $currentUser = $_SESSION['user'] ?? [];
    if (empty($currentUser['id'])) {
        planJsonError('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่', 401);
    }

    $action = trim((string)($input['action'] ?? $defaultAction));
    return [$action, $input, $currentUser];
}

function requirePlanningAccess(bool $requireWrite = false): void {
    if ($requireWrite) {
        if (hasRole(['creator', 'admin', 'manager', 'supervisor', 'planner']) || hasPermission('manage_production') || hasPermission('manage_manpower')) {
            return;
        }
        planJsonError('คุณไม่มีสิทธิ์บันทึกข้อมูลแผนการผลิตและประชุมเช้า', 403);
    }
    if (hasRole(['creator', 'admin', 'manager', 'supervisor', 'planner', 'qa', 'qc', 'store', 'operator'])) {
        return;
    }
    foreach (['view_production', 'manage_production', 'view_manpower', 'manage_manpower'] as $perm) {
        if (hasPermission($perm)) {
            return;
        }
    }
    planJsonError('คุณไม่มีสิทธิ์เข้าถึงศูนย์สั่งการและวางแผนประจำวัน', 403);
}

function parsePlanningDate(?string $raw, string $default): string {
    $trimmed = trim((string)$raw);
    if ($trimmed === '') {
        return $default;
    }
    $dt = DateTime::createFromFormat('Y-m-d', $trimmed);
    if (!$dt || $dt->format('Y-m-d') !== $trimmed) {
        throw new InvalidArgumentException('รูปแบบวันที่ไม่ถูกต้อง (YYYY-MM-DD)');
    }
    return $trimmed;
}
