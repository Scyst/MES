<?php
/**
 * Shared security, request parsing, validation, and transaction helpers
 * for self-contained Toolbox Production & Scan Barcode APIs.
 */

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: strict-origin-when-cross-origin');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

date_default_timezone_set('Asia/Bangkok');

require_once __DIR__ . '/../../db.php';
if (!defined('ITEMS_TABLE')) {
    require_once __DIR__ . '/../../config.php';
}
require_once __DIR__ . '/../../utils/check_auth.php';
require_once __DIR__ . '/../../utils/logger.php';

/**
 * Emits standard JSON success response and terminates execution.
 */
function prodJsonSuccess($data = null, string $message = 'OK', array $extra = []): void {
    $payload = array_merge([
        'success' => true,
        'data' => $data,
        'message' => $message,
    ], $extra);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Emits standard JSON error response and terminates execution.
 */
function prodJsonError(string $message, int $httpCode = 400, $data = null): void {
    http_response_code($httpCode);
    echo json_encode([
        'success' => false,
        'data' => $data,
        'message' => $message,
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Parses GET/POST/JSON payload, enforces CSRF token on mutating requests,
 * and returns [$action, $input, $currentUser].
 */
function parseProductionRequest(): array {
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
        if (empty($headerToken) || empty($sessionToken) || !hash_equals($sessionToken, $headerToken)) {
            prodJsonError('การตรวจสอบความปลอดภัย (CSRF Token) ไม่ถูกต้อง กรุณารีเฟรชหน้าจอ', 403);
        }
    }

    $action = trim((string)($input['action'] ?? ''));
    $currentUser = $_SESSION['user'] ?? [];
    if (empty($currentUser['id'])) {
        prodJsonError('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่', 401);
    }

    return [$action, $input, $currentUser];
}

/**
 * Validates and parses a positive numeric quantity/value within safe manufacturing bounds.
 */
function parsePositiveQty($value, string $fieldLabel = 'จำนวน'): float {
    if ($value === null || $value === '' || !is_numeric($value)) {
        throw new InvalidArgumentException("{$fieldLabel} ต้องเป็นตัวเลขที่ถูกต้อง");
    }
    $num = (float)$value;
    if (!is_finite($num) || $num <= 0) {
        throw new InvalidArgumentException("{$fieldLabel} ต้องมากกว่า 0");
    }
    if ($num > 10000000) {
        throw new InvalidArgumentException("{$fieldLabel} เกินขอบเขตสูงสุดที่ระบบรองรับ");
    }
    return round($num, 3);
}

/**
 * Validates and parses a positive integer ID.
 */
function parsePositiveInt($value, string $fieldLabel = 'รหัสอ้างอิง'): int {
    $intVal = filter_var($value, FILTER_VALIDATE_INT);
    if ($intVal === false || $intVal <= 0) {
        throw new InvalidArgumentException("กรุณาระบุ {$fieldLabel} ที่ถูกต้อง");
    }
    return (int)$intVal;
}

/**
 * Sanitizes a date string (YYYY-MM-DD) or falls back to today.
 */
function parseDateOrDefault(?string $dateStr, string $fallback = ''): string {
    $trimmed = trim((string)$dateStr);
    if ($trimmed === '') {
        return $fallback !== '' ? $fallback : date('Y-m-d');
    }
    $dt = DateTime::createFromFormat('Y-m-d', $trimmed);
    if (!$dt || $dt->format('Y-m-d') !== $trimmed) {
        throw new InvalidArgumentException('รูปแบบวันที่ไม่ถูกต้อง (ต้องเป็น YYYY-MM-DD)');
    }
    return $trimmed;
}

/**
 * Resolves and sanitizes comma-separated or array team user IDs.
 */
function resolveTeamUserIdsCsv($teamUserIds, int $fallbackUserId): string {
    $ids = [];
    if (is_array($teamUserIds)) {
        foreach ($teamUserIds as $rawId) {
            $parsed = filter_var($rawId, FILTER_VALIDATE_INT);
            if ($parsed !== false && $parsed > 0) {
                $ids[] = (int)$parsed;
            }
        }
    } elseif (is_string($teamUserIds) && trim($teamUserIds) !== '') {
        foreach (explode(',', $teamUserIds) as $part) {
            $parsed = filter_var(trim($part), FILTER_VALIDATE_INT);
            if ($parsed !== false && $parsed > 0) {
                $ids[] = (int)$parsed;
            }
        }
    }

    $ids = array_values(array_unique($ids));
    if (empty($ids)) {
        return (string)$fallbackUserId;
    }
    return implode(',', $ids);
}

/**
 * Finds the Store source location_id dynamically (no hardcoded magic ID).
 */
function getStoreSourceLocationId(PDO $pdo): int {
    $stmt = $pdo->query("SELECT TOP 1 location_id FROM " . LOCATIONS_TABLE . " WITH (NOLOCK) WHERE is_active = 1 AND (location_name = 'Store' OR location_type = 'STORE') ORDER BY location_id ASC");
    $locId = (int)$stmt->fetchColumn();
    return $locId > 0 ? $locId : 1;
}

/**
 * Generates Store replacement requisition (REQ-*) when SCRAP output is recorded.
 */
function buildScrapRequisition(PDO $pdo, int $fgItemId, float $scrapQty, int $lineLocationId, int $userId, string $remark = '', ?int $txnId = null): array {
    if ($scrapQty <= 0) {
        return [];
    }

    $storeLocId = getStoreSourceLocationId($pdo);
    $bomStmt = $pdo->prepare("SELECT component_item_id, quantity_required FROM " . BOM_TABLE . " WITH (NOLOCK) WHERE fg_item_id = ? AND ISNULL(bom_status, 'ACTIVE') != 'INACTIVE'");
    $bomStmt->execute([$fgItemId]);
    $bomRows = $bomStmt->fetchAll(PDO::FETCH_ASSOC);

    $requests = [];
    if (!empty($bomRows)) {
        foreach ($bomRows as $comp) {
            $reqQty = round($scrapQty * (float)$comp['quantity_required'], 3);
            if ($reqQty > 0) {
                $requests[] = ['item_id' => (int)$comp['component_item_id'], 'qty' => $reqQty];
            }
        }
    } else {
        $requests[] = ['item_id' => $fgItemId, 'qty' => $scrapQty];
    }

    $createdUuids = [];
    $insertStmt = $pdo->prepare(
        "INSERT INTO " . TRANSFER_ORDERS_TABLE . " (transfer_uuid, item_id, quantity, from_location_id, to_location_id, status, created_by_user_id, created_at, notes)
         VALUES (?, ?, ?, ?, ?, 'PENDING', ?, GETDATE(), ?)"
    );

    foreach ($requests as $req) {
        $uuid = 'REQ-' . strtoupper(substr(bin2hex(random_bytes(8)), 0, 13));
        $fullNote = trim($remark !== '' ? $remark : 'Replacement: Scrap');
        if ($txnId !== null && $txnId > 0) {
            $fullNote .= " [TXN:{$txnId}]";
        }
        $insertStmt->execute([
            $uuid,
            $req['item_id'],
            $req['qty'],
            $storeLocId,
            $lineLocationId,
            $userId,
            mb_substr($fullNote, 0, 480)
        ]);
        $createdUuids[] = $uuid;
    }

    return $createdUuids;
}
