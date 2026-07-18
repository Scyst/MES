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

// รับ path จาก ?p= parameter (ทำงานได้ทุก nginx/apache โดยไม่ต้องแก้ config)
$path   = '/' . ltrim($_GET['p'] ?? '/', '/');

// ── Role gate: เฉพาะ creator/admin/supervisor สั่งงานได้ ─────────────────────
// อนุญาตให้ทุก Role สามารถส่ง POST ไปที่ /api/settings ได้ (เพื่อเปลี่ยนรุ่นงาน)
// ทุกคำสั่งอื่นที่เปลี่ยนสถานะ (start/stop/load_model/capture) เป็น POST ยังคงบล็อกสำหรับ role ที่ไม่มีสิทธิ์
// ส่วนการดู (GET: stream/status/models/images) เปิดให้ทุก user ที่ล็อกอินแล้ว
// hasRole() นิยามใน check_auth.php
if ($_SERVER['REQUEST_METHOD'] === 'POST'
        && !hasRole(['creator', 'admin', 'supervisor'])
        && $path !== '/api/settings') {
    if (ob_get_level()) ob_end_clean();
    http_response_code(403);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['ok' => false, 'error' => 'read_only',
                      'message' => 'สิทธิ์ของคุณดูได้อย่างเดียว ไม่สามารถสั่งงานได้']);
    exit;
}

// ปล่อย PHP session lock ทันที — ไม่ให้ block request อื่นในขณะที่ proxy ทำงาน
if (session_status() === PHP_SESSION_ACTIVE) session_write_close();

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

// CONNECTTIMEOUT 3s (was 1s — too tight across subnets: a connect that takes
// >1s was turning into a 502 even though the Python server was healthy).
$build = function () use ($url, $hdrs, $method, $post_body) {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 5,
        CURLOPT_CONNECTTIMEOUT => 3,
        CURLOPT_HTTPHEADER     => $hdrs,
    ]);
    if ($method === 'POST') {
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'POST');
        curl_setopt($ch, CURLOPT_POSTFIELDS, $post_body);
    }
    return $ch;
};

// One automatic retry — but only for safe GET requests. A POST
// (start/stop/settings/capture/load_model) must never be replayed or a single
// transient hiccup could fire the command twice.
$max_try = ($method === 'GET') ? 2 : 1;
$resp = false; $code = 0; $ctype = ''; $err = '';
for ($i = 0; $i < $max_try; $i++) {
    $ch    = $build();
    $resp  = curl_exec($ch);
    $code  = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $ctype = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
    $err   = curl_error($ch);
    $errno = curl_errno($ch);
    curl_close($ch);
    if ($resp !== false && $code !== 0) break;   // got a real HTTP reply → stop
    if ($i + 1 < $max_try) usleep(200000);        // 0.2s breather before retry
}

// Discard any stray output buffered by auth/framework includes
if (ob_get_level()) ob_end_clean();

http_response_code($code ?: 502);

if (strpos($path, '/images/') === 0) {
    $body = $resp;
    header('Content-Type: ' . ($ctype ?: 'image/jpeg'));
    header('Cache-Control: max-age=86400, private');
} else {
    // errno makes the failure self-diagnosing in the browser Network tab:
    //   7  = connection refused (Python/main.py not running on that port)
    //   28 = timed out (firewall dropping packets, or upstream overloaded)
    //   6/7 with resolve = wrong host/IP in cam_config.php
    $body = ($resp !== false && $resp !== '')
        ? $resp
        : json_encode(['ok' => false, 'error' => $err ?: 'upstream unreachable',
                       'errno' => $errno ?? 0, 'upstream' => UPSTREAM]);
    header('Content-Type: application/json');
}

// Content-Length tells the browser exactly how many bytes to read —
// shutdown-function hooks that append noise are ignored by the client.
header('Content-Length: ' . strlen($body));
echo $body;
exit;
