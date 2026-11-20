<?php
/**
 * Self-contained HTTPS -> HTTP reverse proxy for Accessories AI Vision Camera Node.
 * Replaces legacy page/AccessoriesInspection/cam_proxy.php with .env configuration & CSRF gate.
 */

ob_start();
define('ACCESSORIES_SKIP_JSON_HEADER', true);
require_once __DIR__ . '/_common.php';

/** Translates Python camera node or cURL failure strings into actionable Thai messages. */
function translateCameraUpstreamError(string $rawCodeOrMsg, int $curlErrno = 0): string {
    $trimmed = trim($rawCodeOrMsg);
    $key = strtolower($trimmed);

    $reasonMap = [
        'camera_not_connected' => 'กล้องไม่ได้เชื่อมต่อ — กรุณาตรวจสอบสาย LAN และโปรแกรม main.py',
        'model_not_loaded' => 'ยังไม่ได้โหลด Model — กรุณาเลือก Model แล้วกดปุ่มโหลด Model ก่อนสั่งเริ่มงาน',
        'product_not_selected' => 'ยังไม่ได้เลือกรุ่นงาน (Product) — กรุณาเลือกรุ่นงานก่อนกด START',
        'already_armed' => 'ระบบกำลังทำงานตรวจจับอยู่แล้ว',
        'already_running' => 'ระบบกำลังทำงานตรวจจับอยู่แล้ว',
        'capture_failed' => 'ไม่สามารถบันทึกภาพได้ เนื่องจากยังไม่ได้รับภาพจากกล้อง',
        'no_frame' => 'ยังไม่ได้รับภาพจากกล้อง กรุณาตรวจสอบสัญญาณภาพ',
        'model_not_found' => 'ไม่พบไฟล์ Model ที่เลือกบนเครื่อง AI Vision',
        'read_only' => 'สิทธิ์ของคุณดูได้อย่างเดียว ไม่สามารถสั่งงานเครื่องกล้องได้',
        'forbidden path' => 'ไม่อนุญาตให้เข้าถึงเส้นทางปลายทางนี้',
    ];
    if (isset($reasonMap[$key])) {
        return $reasonMap[$key];
    }

    if ($curlErrno === 28 || preg_match('/timed?\s*out/i', $trimmed)) {
        return 'เครื่อง AI Vision หน้าไลน์ตอบสนองช้าเกินกำหนด — กรุณาตรวจสอบสถานะเครื่องหรือการเชื่อมต่อเครือข่าย';
    }
    if (in_array($curlErrno, [6, 7], true) || preg_match('/could not resolve|failed to connect|connection refused/i', $trimmed)) {
        return 'ไม่สามารถเชื่อมต่อเครื่อง AI Vision หน้าไลน์ได้ — กรุณาตรวจสอบสาย LAN และตรวจว่าโปรแกรม main.py กำลังทำงานอยู่';
    }
    if ($trimmed !== '' && preg_match('/[\x{0E00}-\x{0E7F}]/u', $trimmed)) {
        return $trimmed;
    }
    if ($curlErrno !== 0) {
        return 'ไม่สามารถติดต่อเครื่อง AI Vision หน้าไลน์ได้ กรุณาตรวจสอบสาย LAN และโปรแกรม main.py แล้วลองใหม่';
    }
    return 'ไม่สามารถสั่งงานเครื่องกล้องได้ กรุณาตรวจสอบสถานะเครื่อง AI Vision และลองใหม่อีกครั้ง';
}

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
        writeErrorLog(
            $pdo ?? null,
            'ACCESSORIES_PROXY',
            "cURL({$errno}): " . ($err !== '' ? $err : 'empty response'),
            ['path' => $pathOnly]
        );
        accessoriesJsonError(translateCameraUpstreamError($err, $errno), 502, [
            'configured' => true,
            'online' => false,
            'errno' => $errno,
        ]);
    }

    $decoded = json_decode($resp, true);
    if (is_array($decoded)) {
        $isOk = (bool)($decoded['ok'] ?? $decoded['success'] ?? ($code >= 200 && $code < 300));
        $rawMsg = (string)($decoded['message'] ?? $decoded['error'] ?? ($decoded['reason'] ?? ''));
        $friendlyMsg = $isOk
            ? ($rawMsg !== '' ? $rawMsg : 'OK')
            : translateCameraUpstreamError($rawMsg);
        if (!$isOk && empty($decoded['message'])) {
            $decoded['message'] = $friendlyMsg;
        }
        http_response_code($code ?: 200);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            'success' => $isOk,
            'data' => $decoded,
            'message' => $friendlyMsg,
        ], JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
        exit;
    }

    writeErrorLog($pdo ?? null, 'ACCESSORIES_PROXY', "Non-JSON upstream reply (HTTP {$code}): " . substr(trim($resp), 0, 200), ['path' => $pathOnly]);
    accessoriesJsonError('เครื่อง AI Vision ส่งข้อมูลผิดรูปแบบหรือไม่พร้อมใช้งานชั่วคราว', ($code >= 400 ? $code : 502));
} catch (Throwable $e) {
    if (ob_get_level()) {
        ob_end_clean();
    }
    writeErrorLog($pdo ?? null, 'ACCESSORIES_PROXY', $e->getMessage(), ['path' => $_GET['p'] ?? '']);
    accessoriesJsonError('เกิดข้อผิดพลาดในการเชื่อมต่อกล้อง AI Vision', 500);
}
