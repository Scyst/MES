<?php
/**
 * cam_proxy.php — HTTPS → HTTP reverse proxy for camera stream server
 *
 * วางไฟล์นี้ไว้ในโฟลเดอร์เดียวกับ accessoriesInspectionUI.php
 * Browser (HTTPS) จะคุยกับไฟล์นี้แทน แล้วไฟล์นี้จะ forward ไป HTTP ของ Python
 *
 * CONFIGURE: แก้ที่ cam_config.php (ไม่ต้องแตะไฟล์นี้)
 */
// Capture any stray output from auth/framework before we send our own response
ob_start();

require_once __DIR__ . '/cam_config.php';
require_once __DIR__ . '/../../auth/check_auth.php';
define('UPSTREAM', CAM_UPSTREAM);

// ปล่อย PHP session lock ทันที — ไม่ให้ block request อื่นในขณะที่ proxy ทำงาน
if (session_status() === PHP_SESSION_ACTIVE) session_write_close();

// รับ path จาก ?p= parameter (ทำงานได้ทุก nginx/apache โดยไม่ต้องแก้ config)
$path   = '/' . ltrim($_GET['p'] ?? '/', '/');

// whitelist: only allow /stream, /api/*, /images/* — block arbitrary upstream access
if (!preg_match('#^/(stream|api|images)(/|$)#', $path)) {
    http_response_code(403);
    echo json_encode(['ok' => false, 'error' => 'forbidden path']);
    exit;
}

$params = array_intersect_key($_GET, array_flip(['t', 'date', 'limit']));   // whitelist: cache-buster + log filter
$qs_fwd = http_build_query($params);
// $path may already contain a query string (e.g. /api/history?date=...&limit=...)
// so append cache-buster with & if ? already present, otherwise with ?
$url    = UPSTREAM . $path . ($qs_fwd ? (strpos($path, '?') !== false ? '&' : '?') . $qs_fwd : '');

// ── MJPEG stream proxy (cURL — ไม่พึ่ง allow_url_fopen) ─────────────────────
if ($path === '/stream' || strpos($path, '/stream') === 0) {
    set_time_limit(0);
    header('Content-Type: multipart/x-mixed-replace; boundary=frame');
    header('Cache-Control: no-cache, no-store, must-revalidate');
    header('X-Accel-Buffering: no');
    if (ob_get_level()) ob_end_clean();

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => false,
        CURLOPT_TIMEOUT        => 0,
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_WRITEFUNCTION  => function ($ch, $data) {
            if (connection_status() !== CONNECTION_NORMAL) return -1;
            echo $data;
            flush();
            return strlen($data);
        },
    ]);
    if (defined('CAM_API_KEY') && CAM_API_KEY !== '') {
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['X-Internal-Key: ' . CAM_API_KEY]);
    }

    $ok = curl_exec($ch);
    if (!$ok && curl_errno($ch) !== CURLE_WRITE_ERROR) {
        // CURLE_WRITE_ERROR (23) = client disconnected — ปกติ ไม่ใช่ error จริง
        http_response_code(502);
    }
    curl_close($ch);
    exit;
}

// ── JSON API proxy ────────────────────────────────────────────────────────────
$method    = $_SERVER['REQUEST_METHOD'];
$post_body = ($method === 'POST') ? (file_get_contents('php://input') ?: '') : null;
$hdrs      = ['Accept: application/json'];
if ($method === 'POST') {
    $hdrs[] = 'Content-Type: application/json';
}
if (defined('CAM_API_KEY') && CAM_API_KEY !== '') {
    $hdrs[] = 'X-Internal-Key: ' . CAM_API_KEY;
}

$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => 4,
    CURLOPT_CONNECTTIMEOUT => 1,
    CURLOPT_HTTPHEADER     => $hdrs,
]);
if ($method === 'POST') {
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'POST');
    curl_setopt($ch, CURLOPT_POSTFIELDS, $post_body);
}

$resp     = curl_exec($ch);
$code     = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$ctype    = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
$err      = curl_error($ch);
curl_close($ch);

// Discard any stray output buffered by auth/framework includes
if (ob_get_level()) ob_end_clean();

http_response_code($code ?: 502);

if (strpos($path, '/images/') === 0) {
    $body = $resp;
    header('Content-Type: ' . ($ctype ?: 'image/jpeg'));
    header('Cache-Control: max-age=86400, private');
} else {
    $body = ($resp !== false && $resp !== '')
        ? $resp
        : json_encode(['ok' => false, 'error' => $err ?: 'upstream unreachable']);
    header('Content-Type: application/json');
}

// Content-Length tells the browser exactly how many bytes to read —
// shutdown-function hooks that append noise are ignored by the client.
header('Content-Length: ' . strlen($body));
echo $body;
exit;
