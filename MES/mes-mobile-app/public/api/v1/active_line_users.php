<?php
session_start();
$origin = $_SERVER['HTTP_ORIGIN'] ?? '*';
$allowed_origins = ['http://localhost:5173', 'http://127.0.0.1:5173'];
if (in_array($origin, $allowed_origins) || true) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Access-Control-Allow-Credentials: true');
}
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-CSRF-Token');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit(0); }

require_once __DIR__ . '/../../db.php';
if (!defined('LOCATIONS_TABLE')) {
    require_once __DIR__ . '/../../config/config.php';
}

try {
    $location_id = intval($_GET['location_id'] ?? 0);
    $line_param   = trim($_GET['line'] ?? '');

    $production_line = '';

    if ($location_id) {
        // Resolve production_line from location_id
        $locStmt = $pdo->prepare("SELECT production_line FROM " . LOCATIONS_TABLE . " WHERE location_id = ? AND is_active = 1");
        $locStmt->execute([$location_id]);
        $production_line = $locStmt->fetchColumn() ?: '';
        if (!$production_line) {
            echo json_encode(['success' => false, 'message' => 'สถานที่นี้ยังไม่ได้ผูกกับไลน์ผลิต']);
            exit;
        }
    } elseif ($line_param) {
        // Use line name directly (e.g. from machine.line field)
        $production_line = $line_param;
    } else {
        echo json_encode(['success' => false, 'message' => 'กรุณาระบุ location_id หรือ line']);
        exit;
    }

    // Get active workers in this production line (present, not yet scanned out)
    $sql = "SELECT
                u.id,
                u.username,
                ISNULL(NULLIF(emp.name_th, ''), ISNULL(NULLIF(u.fullname, ''), u.username)) AS name,
                emp.position
            FROM dbo.MANPOWER_DAILY_LOGS dl
            JOIN dbo.MANPOWER_EMPLOYEES emp ON dl.emp_id = emp.emp_id
            JOIN " . USERS_TABLE . " u ON emp.emp_id = u.emp_id COLLATE Thai_CI_AS
            WHERE dl.log_date >= CAST(DATEADD(day, -1, GETDATE()) AS DATE)
            AND dl.actual_line = ?
            AND dl.status = 'PRESENT'
            AND dl.scan_out_time IS NULL
            AND u.is_active = 1
            ORDER BY emp.name_th";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([$production_line]);
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(['success' => true, 'users' => $users, 'line' => $production_line]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
