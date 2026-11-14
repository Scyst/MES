<?php
/**
 * Shared helpers, authentication, CSRF enforcement, date normalization,
 * and QA FAIL-precedence safeguards for self-contained Toolbox Sales & Shipping APIs.
 */

if (!defined('SALES_SKIP_JSON_HEADER')) {
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
function salesJsonSuccess($data = null, string $message = 'OK', array $extra = []): void {
    echo json_encode(array_merge([
        'success' => true,
        'data' => $data,
        'message' => $message,
    ], $extra), JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

/** Emits standard JSON error response and stops execution. */
function salesJsonError(string $message, int $httpCode = 400, $data = null): void {
    http_response_code($httpCode);
    echo json_encode([
        'success' => false,
        'data' => $data,
        'message' => $message,
    ], JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

/** Parses GET/POST/JSON body, verifies auth session, and enforces CSRF on mutations. */
function parseSalesRequest(string $defaultAction = 'read'): array {
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
            salesJsonError('การตรวจสอบความปลอดภัย (CSRF Token) ไม่ถูกต้อง กรุณารีเฟรชหน้าจอ', 403);
        }
    }

    $currentUser = $_SESSION['user'] ?? [];
    if (empty($currentUser['id'])) {
        salesJsonError('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่', 401);
    }

    $action = trim((string)($input['action'] ?? $defaultAction));
    return [$action, $input, $currentUser];
}

/** Checks Sales / Shipping authorization tier; blocks customer role from mutations. */
function requireSalesAccess(bool $requireManage = false): void {
    $roleLower = strtolower(trim((string)($_SESSION['user']['role'] ?? '')));
    if ($requireManage && $roleLower === 'customer') {
        salesJsonError('สิทธิ์ผู้เยี่ยมชม/ลูกค้าสามารถดูข้อมูลได้อย่างเดียว (Read Only)', 403);
    }

    if ($requireManage) {
        if (hasPermission('manage_shipment') || hasPermission('manage_production') || hasRole(['creator', 'admin', 'manager', 'planner', 'supervisor'])) {
            return;
        }
        salesJsonError('คุณไม่มีสิทธิ์แก้ไขข้อมูลคำสั่งซื้อและการจัดส่ง', 403);
    }

    if (hasPermission('view_sales') || hasPermission('view_production') || hasPermission('manage_shipment') || hasRole(['creator', 'admin', 'manager', 'planner', 'supervisor', 'qc', 'customer'])) {
        return;
    }
    salesJsonError('คุณไม่มีสิทธิ์เข้าดูข้อมูลคำสั่งซื้อและการจัดส่ง', 403);
}

/** Parses ISO / DD-MM-YYYY / US M/D/Y / Excel serial dates safely to Y-m-d or null. */
function normalizeSalesDate($val): ?string {
    if ($val === null || $val === '' || $val === 'null' || $val === 'NULL') {
        return null;
    }
    $clean = trim((string)$val);
    $clean = preg_replace('/[\x00-\x1F\x7F\xC2\xA0]/u', '', $clean);
    $clean = explode(' ', $clean)[0];
    if ($clean === '' || $clean === '0000-00-00' || $clean === '-') {
        return null;
    }

    if (is_numeric($clean)) {
        $num = (float)$clean;
        if ($num > 40000 && $num < 60000) {
            $unix = (round($num) - 25569) * 86400;
            return gmdate('Y-m-d', (int)$unix);
        }
        return null;
    }

    if (preg_match('/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/', $clean, $m)) {
        $year = (int)$m[1];
        $month = (int)$m[2];
        $day = (int)$m[3];
        if ($year >= 20 && $year <= 35) {
            $year += 2000;
        } elseif ($year >= 1920 && $year <= 1935) {
            $year += 100;
        } elseif (($year === 2004 || $year === 2005) && $day === 26 && $month >= 1 && $month <= 31) {
            $realDay = $month;
            $realMonth = $year - 2000;
            $year = 2026;
            $month = $realMonth;
            $day = $realDay;
        }
        if ($month > 12 && $day >= 1 && $day <= 12) {
            $tmp = $month;
            $month = $day;
            $day = $tmp;
        }
        if ($year >= 2020 && $year <= 2035 && checkdate($month, $day, $year)) {
            return sprintf('%04d-%02d-%02d', $year, $month, $day);
        }
        return null;
    }

    if (preg_match('/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/', $clean, $m)) {
        $p1 = (int)$m[1];
        $p2 = (int)$m[2];
        $year = (int)$m[3];
        if ($year < 100) {
            $year += ($year < 50) ? 2000 : 1900;
        } elseif ($year >= 1920 && $year <= 1935) {
            $year += 100;
        }
        if ($p2 > 12 && $p1 >= 1 && $p1 <= 12) {
            $month = $p1;
            $day = $p2;
        } else {
            $day = $p1;
            $month = $p2;
        }
        if ($year >= 2020 && $year <= 2035 && checkdate($month, $day, $year)) {
            return sprintf('%04d-%02d-%02d', $year, $month, $day);
        }
        return null;
    }

    if (preg_match('/^(\d{1,2})[\-\/\s]([A-Za-z]{3,9})[\-\/\s](\d{2,4})$/', $clean, $m)) {
        $day = (int)$m[1];
        $monStr = ucfirst(strtolower(substr($m[2], 0, 3)));
        $year = (int)$m[3];
        if ($year < 100) {
            $year += ($year < 50) ? 2000 : 1900;
        }
        $dt = DateTime::createFromFormat('!j-M-Y', "{$day}-{$monStr}-{$year}");
        if ($dt && (int)$dt->format('Y') >= 2020 && (int)$dt->format('Y') <= 2035) {
            return $dt->format('Y-m-d');
        }
    }

    return null;
}

/** Parses bounded float/decimal safely without overflow. */
function parseSalesFloat($val, string $label, float $min = 0.0, float $max = 99999999.999, bool $nullable = true): ?float {
    $trimmed = is_string($val) ? trim(str_replace(',', '', $val)) : $val;
    if ($trimmed === null || $trimmed === '') {
        return $nullable ? null : throw new InvalidArgumentException("{$label} ต้องระบุเป็นตัวเลข");
    }
    if (!is_numeric($trimmed)) {
        throw new InvalidArgumentException("{$label} ต้องเป็นตัวเลขที่ถูกต้อง");
    }
    $num = round((float)$trimmed, 3);
    if (!is_finite($num) || $num < $min || $num > $max) {
        throw new InvalidArgumentException("{$label} ต้องมีค่าระหว่าง {$min} ถึง {$max}");
    }
    return $num;
}

/** Fetches latest FAIL-precedence inspection record from QMS_PO_INSPECTION_HISTORY. */
function fetchLatestQaHistory(PDO $pdo, int $salesOrderId): ?array {
    try {
        $stmt = $pdo->prepare(
            "SELECT TOP (1) id, inspection_result, inspection_status, scheduled_date, ticket_number
             FROM dbo.QMS_PO_INSPECTION_HISTORY WITH (NOLOCK)
             WHERE sales_order_id = ? AND is_latest = 1
             ORDER BY round_no DESC, id DESC"
        );
        $stmt->execute([$salesOrderId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    } catch (Throwable $e) {
        return null;
    }
}
