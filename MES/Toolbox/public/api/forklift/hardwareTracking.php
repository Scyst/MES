<?php
/**
 * hardwareTracking.php
 * Self-Contained ESP32 / IoT Telemetry Ingestion Endpoint for Forklift Tracking
 * MES & IIoT Toolbox - SNC Former (B9 & B10)
 */

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: strict-origin-when-cross-origin');
error_reporting(0);
ini_set('display_errors', 0);

require_once __DIR__ . '/../../config.php';
require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../utils/logger.php';

function sendHardwareJson(bool $success, $data = null, string $message = '', int $statusCode = 200): void {
    http_response_code($statusCode);
    echo json_encode([
        'success' => $success,
        'data' => $data,
        'message' => $message
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

function parseOptionalBoundedFloat($raw, float $minVal, float $maxVal, string $label): ?float {
    if ($raw === null || $raw === '' || $raw === 0 || $raw === '0') {
        return null;
    }
    if (!is_numeric($raw)) {
        throw new InvalidArgumentException("Invalid numeric {$label}");
    }
    $val = (float)$raw;
    if (!is_finite($val) || $val < $minVal || $val > $maxVal) {
        throw new InvalidArgumentException("{$label} out of valid range ({$minVal}..{$maxVal})");
    }
    if ($val === 0.0) {
        return null;
    }
    return $val;
}

function parseOptionalBssid($raw): ?string {
    if ($raw === null) {
        return null;
    }
    $clean = trim((string)$raw);
    if ($clean === '') {
        return null;
    }
    return substr($clean, 0, 20);
}

function parseOptionalRssi($raw): int {
    if ($raw === null || $raw === '' || !is_numeric($raw)) {
        return -100;
    }
    $rssi = (int)round((float)$raw);
    return max(-120, min(0, $rssi));
}

function parseOptionalBattery($raw): ?int {
    if ($raw === null || $raw === '') {
        return null;
    }
    if (!is_numeric($raw)) {
        throw new InvalidArgumentException('Invalid battery level');
    }
    $batt = (int)round((float)$raw);
    if ($batt < 0 || $batt > 100) {
        throw new InvalidArgumentException('Battery level must be between 0 and 100');
    }
    return $batt;
}

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        sendHardwareJson(false, null, 'Method not allowed. Use POST.', 405);
    }

    // Optional hardware API key enforcement when configured in .env
    $configuredKey = getenv('FORKLIFT_IOT_API_KEY') ?: '';
    if ($configuredKey !== '') {
        $providedKey = $_SERVER['HTTP_X_API_KEY'] ?? '';
        if ($providedKey === '' || !hash_equals($configuredKey, $providedKey)) {
            sendHardwareJson(false, null, 'Unauthorized hardware telemetry key', 401);
        }
    }

    $rawBody = file_get_contents('php://input');
    $payload = [];
    if ($rawBody !== false && trim($rawBody) !== '') {
        $decoded = json_decode($rawBody, true);
        if (!is_array($decoded)) {
            sendHardwareJson(false, null, 'Invalid JSON payload', 400);
        }
        $payload = $decoded;
    } elseif (!empty($_POST)) {
        $payload = $_POST;
    }

    if (empty($payload)) {
        sendHardwareJson(false, null, 'Empty telemetry payload', 400);
    }

    $forkliftCodeInput = trim((string)($payload['forklift_code'] ?? ''));
    if ($forkliftCodeInput === '' || strlen($forkliftCodeInput) > 50) {
        sendHardwareJson(false, null, 'Invalid or missing forklift_code', 400);
    }

    $normalizedLookup = trim(str_replace("\t", '', $forkliftCodeInput));
    $lookupStmt = $pdo->prepare(
        "SELECT TOP 1 id, code
         FROM dbo.FORKLIFTS
         WHERE (is_active = 1 OR is_active IS NULL)
           AND (code = ? OR REPLACE(LTRIM(RTRIM(code)), CHAR(9), '') = ?)"
    );
    $lookupStmt->execute([$forkliftCodeInput, $normalizedLookup]);
    $vehicle = $lookupStmt->fetch(PDO::FETCH_ASSOC);

    if (!$vehicle) {
        sendHardwareJson(false, null, 'Forklift code not registered or inactive', 404);
    }

    $lat = parseOptionalBoundedFloat($payload['lat'] ?? null, -90.0, 90.0, 'latitude');
    $lng = parseOptionalBoundedFloat($payload['lng'] ?? null, -180.0, 180.0, 'longitude');
    $bssid1 = parseOptionalBssid($payload['bssid_1'] ?? null);
    $rssi1 = parseOptionalRssi($payload['rssi_1'] ?? null);
    $bssid2 = parseOptionalBssid($payload['bssid_2'] ?? null);
    $rssi2 = parseOptionalRssi($payload['rssi_2'] ?? null);
    $bssid3 = parseOptionalBssid($payload['bssid_3'] ?? null);
    $rssi3 = parseOptionalRssi($payload['rssi_3'] ?? null);
    $battery = parseOptionalBattery($payload['battery'] ?? null);

    $sql = "EXEC dbo.sp_UpdateForkliftLocation_WiFi ?, ?, ?, ?, ?, ?, ?, ?, ?, ?";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        $vehicle['code'],
        $bssid1,
        $rssi1,
        $bssid2,
        $rssi2,
        $bssid3,
        $rssi3,
        $lat,
        $lng,
        $battery
    ]);

    sendHardwareJson(true, [
        'forklift_id' => (int)$vehicle['id'],
        'forklift_code' => $normalizedLookup,
        'mode' => ($lat !== null && $lng !== null) ? 'OUTDOOR' : 'INDOOR',
        'battery' => $battery
    ], 'Telemetry updated via Toolbox IoT gateway');
} catch (InvalidArgumentException $e) {
    sendHardwareJson(false, null, $e->getMessage(), 400);
} catch (Throwable $e) {
    writeErrorLog($pdo ?? null, 'FORKLIFT_HARDWARE', $e->getMessage(), $payload ?? []);
    sendHardwareJson(false, null, 'Internal telemetry processing error', 500);
}
?>
