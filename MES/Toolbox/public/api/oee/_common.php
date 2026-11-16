<?php
/**
 * Shared security, request parsing, validation, and SAP fallback helpers
 * for self-contained Toolbox OEE & Cost Monitoring APIs.
 */

if (!defined('OEE_SKIP_JSON_HEADER')) {
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
function oeeJsonSuccess($data = null, string $message = 'OK', array $extra = []): void {
    echo json_encode(array_merge([
        'success' => true,
        'data' => $data,
        'message' => $message,
    ], $extra), JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

/** Emits standard JSON error response and terminates execution. */
function oeeJsonError(string $message, int $httpCode = 400, $data = null): void {
    http_response_code($httpCode);
    echo json_encode([
        'success' => false,
        'data' => $data,
        'message' => $message,
    ], JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

/** Authenticates user session (or configured shopfloor API key on read-only actions). */
function parseOeeRequest(string $defaultAction = ''): array {
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
            oeeJsonError('การตรวจสอบความปลอดภัย (CSRF Token) ไม่ถูกต้อง กรุณารีเฟรชหน้าจอ', 403);
        }
    }

    $currentUser = $_SESSION['user'] ?? [];
    if (empty($currentUser['id'])) {
        $configuredKey = getenv('OEE_SHOPFLOOR_API_KEY') ?: (defined('SYSTEM_API_KEY') ? SYSTEM_API_KEY : '');
        $providedKey = trim((string)($input['key'] ?? ($_SERVER['HTTP_X_API_KEY'] ?? '')));
        if ($method === 'GET' && $configuredKey !== '' && $providedKey !== '' && hash_equals($configuredKey, $providedKey)) {
            $currentUser = ['id' => 0, 'username' => 'SHOPFLOOR_TV', 'role' => 'kiosk', 'permissions' => []];
        } else {
            oeeJsonError('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่', 401);
        }
    }

    $action = trim((string)($input['action'] ?? $defaultAction));
    return [$action, $input, $currentUser];
}

/** Returns whether user may inspect full Executive COGS/Labor/Profit breakdown. */
function canViewOeeExecutiveFinancials(array $currentUser): bool {
    if (($currentUser['role'] ?? '') === 'kiosk') {
        return false;
    }
    return hasPermission('view_executive') || hasRole(['creator', 'admin', 'manager']);
}

/** Validates Y-m-d date strictly. */
function normalizeOeeDate($rawDate, string $fallback): string {
    $val = trim((string)($rawDate ?? ''));
    if ($val === '') {
        return $fallback;
    }
    $dt = DateTime::createFromFormat('Y-m-d', $val);
    if (!$dt || $dt->format('Y-m-d') !== $val) {
        oeeJsonError("รูปแบบวันที่ไม่ถูกต้อง ({$val})", 400);
    }
    return $val;
}

/** Optional nullable filter string normalizer. */
function normalizeOeeFilter($val): ?string {
    $clean = trim((string)($val ?? ''));
    return ($clean === '' || strcasecmp($clean, 'All') === 0) ? null : $clean;
}

/** Looks up optional SAP live standard cost with local staging/ITEMS fallback. */
function lookupSapScrapUnitCost(PDO $pdo, array $scrapItems): float {
    if (empty($scrapItems)) {
        return 0.0;
    }

    $sapCostMap = [];
    $sapHost = getenv('SAP_DB_SERVER') ?: '';
    $sapDb = getenv('SAP_DB_DATABASE') ?: 'SNC-SAP';
    $sapUser = getenv('SAP_DB_USER') ?: '';
    $sapPass = getenv('SAP_DB_PASSWORD') ?: '';

    if ($sapHost !== '' && $sapUser !== '' && $sapPass !== '') {
        try {
            $pdoSap = new PDO(
                "sqlsrv:server={$sapHost};database={$sapDb};TrustServerCertificate=true;LoginTimeout=2",
                $sapUser,
                $sapPass,
                [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                ]
            );
            $stmtSap = $pdoSap->prepare("SELECT TOP 1 STD_Cost FROM View_OperationSlip_1820 WHERE Mat_No = ? AND STD_Cost > 0");
            foreach ($scrapItems as $item) {
                $matNo = trim((string)($item['sap_no'] ?? ''));
                if ($matNo === '' || isset($sapCostMap[$matNo])) {
                    continue;
                }
                $stmtSap->execute([$matNo]);
                $val = $stmtSap->fetchColumn();
                if ($val !== false && (float)$val > 0) {
                    $sapCostMap[$matNo] = (float)$val;
                }
            }
        } catch (Throwable $ignored) {
            // Fall through silently to local staging / ITEMS Cost_Total
        }
    }

    $stmtStg = $pdo->prepare("SELECT TOP 1 std_cost FROM dbo.SAP_STG_OPERATION_SLIP WITH (NOLOCK) WHERE mat_no = ? AND std_cost > 0");
    $stmtItemCost = $pdo->prepare("SELECT TOP 1 Cost_Total FROM " . ITEMS_TABLE . " WITH (NOLOCK) WHERE sap_no = ? AND Cost_Total > 0");

    $totalScrapCost = 0.0;
    foreach ($scrapItems as $item) {
        $matNo = trim((string)($item['sap_no'] ?? ''));
        $scrapQty = (float)($item['scrap_qty'] ?? 0);
        if ($matNo === '' || $scrapQty <= 0) {
            continue;
        }
        $unitCost = $sapCostMap[$matNo] ?? null;
        if ($unitCost === null) {
            $stmtStg->execute([$matNo]);
            $stgVal = $stmtStg->fetchColumn();
            if ($stgVal !== false && (float)$stgVal > 0) {
                $unitCost = (float)$stgVal;
            }
        }
        if ($unitCost === null) {
            $stmtItemCost->execute([$matNo]);
            $itemVal = $stmtItemCost->fetchColumn();
            $unitCost = ($itemVal !== false && (float)$itemVal > 0) ? (float)$itemVal : 0.0;
        }
        $sapCostMap[$matNo] = $unitCost;
        $totalScrapCost += ($scrapQty * $unitCost);
    }

    return round($totalScrapCost, 2);
}
