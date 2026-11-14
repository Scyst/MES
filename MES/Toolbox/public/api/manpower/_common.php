<?php
/**
 * Shared security, request parsing, validation, permission, and scan-window helpers
 * for self-contained Toolbox Manpower APIs.
 */

if (!defined('MP_SKIP_JSON_HEADER')) {
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

/**
 * Emits standard JSON success envelope and terminates execution.
 */
function mpJsonSuccess($data = null, string $message = 'OK', array $extra = []): void {
    $payload = array_merge([
        'success' => true,
        'data' => $data,
        'message' => $message,
    ], $extra);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

/**
 * Emits standard JSON error envelope and terminates execution.
 */
function mpJsonError(string $message, int $httpCode = 400, $data = null): void {
    http_response_code($httpCode);
    echo json_encode([
        'success' => false,
        'data' => $data,
        'message' => $message,
    ], JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

/**
 * Parses GET/POST/JSON body, authenticates session, enforces CSRF on mutations,
 * and returns [$action, $input, $currentUser].
 */
function parseMpRequest(string $defaultAction = ''): array {
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
            mpJsonError('การตรวจสอบความปลอดภัย (CSRF Token) ไม่ถูกต้อง กรุณารีเฟรชหน้าจอ', 403);
        }
    }

    $currentUser = $_SESSION['user'] ?? [];
    if (empty($currentUser['id'])) {
        mpJsonError('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่', 401);
    }

    $action = trim((string)($input['action'] ?? $defaultAction));
    return [$action, $input, $currentUser];
}

/**
 * Verifies manpower authorization tier.
 * - Base operational view: view_manpower, manage_manpower, view_production, manage_production or manager/supervisor/admin/creator/hr/planner.
 * - Manage mutations: manage_manpower permission or admin/creator/manager/supervisor.
 * - Confidential 4D grading: strictly creator/admin/manager + manage_manpower permission.
 */
function requireMpAccess(bool $requireManage = false, bool $requireGrading = false): void {
    if ($requireGrading) {
        if (!hasRole(['creator', 'admin', 'manager']) || !hasPermission('manage_manpower')) {
            mpJsonError('ข้อมูลการประเมินเกรดพนักงานสงวนสิทธิ์เฉพาะระดับ Admin / Manager เท่านั้น', 403);
        }
        return;
    }

    if ($requireManage) {
        if (hasPermission('manage_manpower') || hasRole(['creator', 'admin', 'manager', 'supervisor'])) {
            return;
        }
        mpJsonError('คุณไม่มีสิทธิ์แก้ไขข้อมูลกำลังคน (manage_manpower)', 403);
    }

    if (hasRole(['creator', 'admin', 'manager', 'supervisor', 'hr', 'planner'])) {
        return;
    }
    foreach (['view_manpower', 'manage_manpower', 'view_production', 'manage_production'] as $perm) {
        if (hasPermission($perm)) {
            return;
        }
    }
    mpJsonError('คุณไม่มีสิทธิ์เข้าถึงระบบบริหารจัดการกำลังคน', 403);
}

/**
 * Validates and normalizes YYYY-MM-DD date input.
 */
function parseMpDate(?string $rawDate, ?string $default = null, string $label = 'วันที่'): ?string {
    $trimmed = trim((string)$rawDate);
    if ($trimmed === '') {
        return $default;
    }
    $dt = DateTime::createFromFormat('Y-m-d', $trimmed);
    if (!$dt || $dt->format('Y-m-d') !== $trimmed) {
        throw new InvalidArgumentException("รูปแบบ{$label}ไม่ถูกต้อง (ต้องเป็น YYYY-MM-DD)");
    }
    return $trimmed;
}

/**
 * Validates YYYY-MM or YYYY-MM-DD or YYYY-MM-DD_YYYY-MM-DD grading period format.
 */
function parseMpPeriod(string $rawPeriod): array {
    $period = trim($rawPeriod);
    if ($period === '') {
        $period = date('Y-m');
    }

    if (preg_match('/^(\d{4}-\d{2}-\d{2})_(\d{4}-\d{2}-\d{2})$/', $period, $m)) {
        $start = parseMpDate($m[1], null, 'วันเริ่มต้น');
        $endInclusive = parseMpDate($m[2], null, 'วันสิ้นสุด');
        return [
            'period' => $period,
            'start_date' => $start,
            'end_date' => date('Y-m-d', strtotime($endInclusive . ' +1 day')),
        ];
    }

    if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $period)) {
        $start = parseMpDate($period, null, 'วันที่ประเมิน');
        return [
            'period' => $period,
            'start_date' => $start,
            'end_date' => date('Y-m-d', strtotime($start . ' +1 day')),
        ];
    }

    if (preg_match('/^\d{4}-\d{2}$/', $period)) {
        $start = $period . '-01';
        $dt = DateTime::createFromFormat('Y-m-d', $start);
        if (!$dt || $dt->format('Y-m-d') !== $start) {
            throw new InvalidArgumentException('รูปแบบเดือนไม่ถูกต้อง (YYYY-MM)');
        }
        return [
            'period' => $period,
            'start_date' => $start,
            'end_date' => date('Y-m-d', strtotime($start . ' +1 month')),
        ];
    }

    throw new InvalidArgumentException('รูปแบบช่วงเวลาประเมินไม่ถูกต้อง');
}

/**
 * Resolves external facial/badge scan API URL via environment configuration.
 */
function resolveMpScanApiBaseUrl(): string {
    $envUrl = $_ENV['MANPOWER_SCAN_API_URL'] ?? getenv('MANPOWER_SCAN_API_URL');
    $url = is_string($envUrl) && trim($envUrl) !== ''
        ? trim($envUrl)
        : 'https://oem.sncformer.com/oem-calendar/oem-web-link/api/api.php?router=/man-power-painting';
    return $url;
}

/**
 * Fetches central attendance scans safely with explicit timeout.
 */
function fetchCentralScanRows(string $startDate, string $endDate): array {
    $baseUrl = resolveMpScanApiBaseUrl();
    $sep = strpos($baseUrl, '?') !== false ? '&' : '?';
    $apiUrl = $baseUrl . $sep . 'sdate=' . urlencode($startDate) . '&edate=' . urlencode($endDate);

    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => $apiUrl,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_TIMEOUT => 30,
        CURLOPT_SSL_VERIFYPEER => !(defined('IS_DEVELOPMENT') && IS_DEVELOPMENT),
    ]);
    $raw = curl_exec($ch);
    $curlErr = curl_error($ch);
    $httpCode = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($raw === false || $httpCode >= 400) {
        throw new RuntimeException('ไม่สามารถเชื่อมต่อเครื่องสแกนกลางได้' . ($curlErr ? ": {$curlErr}" : " (HTTP {$httpCode})"));
    }

    $decoded = json_decode($raw, true);
    if (!is_array($decoded)) {
        throw new RuntimeException('ข้อมูลที่ได้รับจากเครื่องสแกนกลางไม่อยู่ในรูปแบบ JSON ที่ถูกต้อง');
    }
    return $decoded;
}

/**
 * Resolves IN/OUT timestamps and status for an employee/date/shift using standardized shift-window pairing.
 */
function pairShiftWindowScans(array $empScans, string $dateStr, string $startTime): array {
    $sh = 8;
    if (preg_match('/(?:T| )(\d{2}):/', $startTime, $m)) {
        $sh = (int)$m[1];
    } elseif (preg_match('/^(\d{2}):/', $startTime, $m)) {
        $sh = (int)$m[1];
    }
    $isNight = ($sh >= 15 || $sh < 3);

    if (!$isNight) {
        $inWinStart = strtotime("{$dateStr} 05:00:00");
        $inWinEnd = strtotime("{$dateStr} 12:59:59");
        $outWinStart = strtotime("{$dateStr} 13:00:00");
        $outWinEnd = strtotime("{$dateStr} 23:59:59");
    } else {
        $inWinStart = strtotime("{$dateStr} 15:00:00");
        $inWinEnd = strtotime("{$dateStr} 23:59:59");
        $nextDate = date('Y-m-d', strtotime('+1 day', strtotime($dateStr)));
        $outWinStart = strtotime("{$nextDate} 00:00:00");
        $outWinEnd = strtotime("{$nextDate} 12:59:59");
    }

    $scanIn = null;
    $scanOut = null;
    foreach ($empScans as $ts) {
        if ($ts > $inWinEnd) {
            break;
        }
        if ($ts >= $inWinStart) {
            $scanIn = $ts;
            break;
        }
    }
    foreach ($empScans as $ts) {
        if ($ts > $outWinEnd) {
            break;
        }
        if ($ts >= $outWinStart) {
            $scanOut = $ts;
        }
    }

    if ($isNight && $scanIn === null && $scanOut !== null && (int)date('H', $scanOut) >= 5) {
        $scanOut = null;
    }

    $inStr = $scanIn ? date('Y-m-d H:i:s', $scanIn) : null;
    $outStr = $scanOut ? date('Y-m-d H:i:s', $scanOut) : null;

    $status = 'WAITING';
    if ($scanIn !== null) {
        $cleanStart = preg_replace('/^.*\s/', '', trim($startTime));
        if (strlen($cleanStart) > 8) {
            $cleanStart = substr($cleanStart, 0, 8);
        }
        $shiftStartTs = strtotime("{$dateStr} {$cleanStart}");
        $status = ($shiftStartTs && $scanIn > $shiftStartTs) ? 'LATE' : 'PRESENT';
    } elseif ($scanOut !== null) {
        $status = 'PRESENT';
    } elseif ($dateStr < date('Y-m-d')) {
        $status = 'ABSENT';
    }

    return [
        'scan_in_time' => $inStr,
        'scan_out_time' => $outStr,
        'status' => $status,
        'is_night' => $isNight,
    ];
}

/**
 * Safely runs sp_CalculateDailyCost for a date range after log or shift changes.
 */
function recalculateManpowerDailyCost(PDO $pdo, string $startDate, string $endDate): void {
    $stmt = $pdo->prepare('EXEC dbo.sp_CalculateDailyCost @StartDate = ?, @EndDate = ?');
    $stmt->execute([$startDate, $endDate]);
    while ($stmt->nextRowset()) {
        // Consume any trailing rowsets to prevent driver state issues
    }
}

/**
 * Handles uncaught exceptions with transaction rollback, SYSTEM_LOGS error logging, and clean JSON error.
 */
function handleMpException(PDO $pdo, string $module, Throwable $e, $payload = null): void {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    $msg = $e->getMessage();
    writeErrorLog($pdo, $module, $msg, $payload);

    $httpCode = 400;
    if ($e instanceof RuntimeException) {
        $httpCode = 502;
    } elseif (!($e instanceof InvalidArgumentException)) {
        $msg = strpos($msg, '[SQL Server]') !== false
            ? 'เกิดข้อผิดพลาดในการประมวลผลฐานข้อมูลกำลังคน'
            : $msg;
    }
    mpJsonError($msg, $httpCode);
}
