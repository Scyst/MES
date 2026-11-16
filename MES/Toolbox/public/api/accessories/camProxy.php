<?php
/**
 * Self-contained HTTPS -> HTTP reverse proxy for Accessories AI Vision Camera Node.
 * Replaces legacy page/AccessoriesInspection/cam_proxy.php with .env configuration & CSRF gate.
 */

ob_start();
define('ACCESSORIES_SKIP_JSON_HEADER', true);
require_once __DIR__ . '/_common.php';

try {
    $method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
    $path = '/' . ltrim((string)($_GET['p'] ?? '/api/status'), '/');

    // Enforce session + CSRF on POST commands
    [$unusedAction, $unusedInput, $currentUser] = parseAccessoriesRequest('', true);

    // Role gate: only creator/admin/supervisor may issue state-changing commands (except selecting product settings)
    $pathOnly = strtok($path, '?') ?: $path;
    if ($method === 'POST' && !canControlAccessoriesCam() && $pathOnly !== '/api/settings') {
        if (ob_get_level()) {
            ob_end_clean();
        }
        accessoriesJsonError('สิทธิ์ของคุณดูได้อย่างเดียว ไม่สามารถสั่งงานเครื่องกล้องได้', 403, ['read_only' => true]);
    }

    // Strict upstream path whitelist
    if (!preg_match('#^/(stream|api|images)(/|$)#', $pathOnly)) {
        if (ob_get_level()) {
            ob_end_clean();
        }
        accessoriesJsonError('ไม่อนุญาตให้เข้าถึงเส้นทางปลายทางนี้', 403);
    }

    $cfg = getAccessoriesCameraConfig();
    if (!$cfg['configured']) {
        if (ob_get_level()) {
            ob_end_clean();
        }
        accessoriesJsonError(
            'ยังไม่ได้ตั้งค่า ACCESSORIES_CAM_UPSTREAM ในไฟล์ .env (ระบบยังสามารถดูประวัติผลตรวจย้อนหลังจากฐานข้อมูลได้ตามปกติ)',
            503,
            ['configured' => false, 'online' => false]
        );
    }

    if (session_status() === PHP_SESSION_ACTIVE) {
        session_write_close();
    }

    $params = array_intersect_key($_GET, array_flip(['t', 'date', 'limit']));
    $qsFwd = http_build_query($params);
    $upstreamUrl = $cfg['upstream'] . $path . ($qsFwd !== '' ? (strpos($path, '?') !== false ? '&' : '?') . $qsFwd : '');

    // 1. MJPEG Stream passthrough
    if ($pathOnly === '/stream' || strpos($pathOnly, '/stream') === 0) {
        set_time_limit(0);
        header('Content-Type: multipart/x-mixed-replace; boundary=frame');
        header('Cache-Control: no-cache, no-store, must-revalidate');
        header('X-Accel-Buffering: no');
        if (ob_get_level()) {
            ob_end_clean();
        }

        $ch = curl_init($upstreamUrl);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => false,
            CURLOPT_TIMEOUT => 0,
            CURLOPT_CONNECTTIMEOUT => 5,
            CURLOPT_WRITEFUNCTION => static function ($ch, $data) {
                if (connection_status() !== CONNECTION_NORMAL) {
                    return -1;
                }
                echo $data;
                flush();
                return strlen($data);
            },
        ]);
        if ($cfg['api_key'] !== '') {
            curl_setopt($ch, CURLOPT_HTTPHEADER, ['X-Internal-Key: ' . $cfg['api_key']]);
        }

        $ok = curl_exec($ch);
        if (!$ok && curl_errno($ch) !== CURLE_WRITE_ERROR) {
            http_response_code(502);
        }
        curl_close($ch);
        exit;
    }

    // 2. JSON API or JPEG image proxy
    $postBody = ($method === 'POST') ? (file_get_contents('php://input') ?: '') : null;
    $hdrs = ['Accept: application/json'];
    if ($method === 'POST') {
        $hdrs[] = 'Content-Type: application/json';
        writeLog($pdo, 'COMMAND', 'ACCESSORIES_CAM', $pathOnly, null, ['user' => $currentUser['username'] ?? 'unknown'], 'Forwarded control request to AI camera node');
    }
    if ($cfg['api_key'] !== '') {
        $hdrs[] = 'X-Internal-Key: ' . $cfg['api_key'];
    }

    $maxTry = ($method === 'GET') ? 2 : 1;
    $resp = false;
    $code = 0;
    $ctype = '';
    $err = '';
    $errno = 0;

    for ($i = 0; $i < $maxTry; $i++) {
        $ch = curl_init($upstreamUrl);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 5,
            CURLOPT_CONNECTTIMEOUT => 3,
            CURLOPT_HTTPHEADER => $hdrs,
        ]);
        if ($method === 'POST') {
            curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'POST');
            curl_setopt($ch, CURLOPT_POSTFIELDS, $postBody);
        }
        $resp = curl_exec($ch);
        $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $ctype = (string)curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
        $err = curl_error($ch);
        $errno = curl_errno($ch);
        curl_close($ch);

        if ($resp !== false && $code !== 0) {
            break;
        }
        if ($i + 1 < $maxTry) {
            usleep(200000);
        }
    }

    if (ob_get_level()) {
        ob_end_clean();
    }

    if (strpos($pathOnly, '/images/') === 0) {
        if ($resp === false || $code !== 200) {
            accessoriesJsonError('ไม่พบรูปภาพจากเครื่องกล้องหน้าไลน์', 404);
        }
        http_response_code($code);
        header('Content-Type: ' . ($ctype !== '' ? $ctype : 'image/jpeg'));
        header('Cache-Control: max-age=86400, private');
        header('Content-Length: ' . (string)strlen($resp));
        echo $resp;
        exit;
    }

    if ($resp === false || $resp === '') {
        accessoriesJsonError('ไม่สามารถเชื่อมต่อเครื่อง AI Vision หน้าไลน์ได้ (' . ($err !== '' ? $err : 'connection failed') . ')', 502, [
            'configured' => true,
            'online' => false,
            'errno' => $errno,
        ]);
    }

    $decoded = json_decode($resp, true);
    if (is_array($decoded)) {
        http_response_code($code ?: 200);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            'success' => (bool)($decoded['ok'] ?? $decoded['success'] ?? ($code >= 200 && $code < 300)),
            'data' => $decoded,
            'message' => $decoded['message'] ?? $decoded['error'] ?? ($decoded['reason'] ?? 'OK'),
        ], JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
        exit;
    }

    http_response_code($code ?: 502);
    header('Content-Type: application/json; charset=utf-8');
    echo $resp;
    exit;
} catch (Throwable $e) {
    if (ob_get_level()) {
        ob_end_clean();
    }
    writeErrorLog($pdo ?? null, 'ACCESSORIES_PROXY', $e->getMessage(), ['path' => $_GET['p'] ?? '']);
    accessoriesJsonError('เกิดข้อผิดพลาดในการเชื่อมต่อกล้อง AI Vision', 500);
}
