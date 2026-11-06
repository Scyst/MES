<?php
// Toolbox/public/api/learning/trackView.php
// Enterprise Course Telemetry & View Analytics (Audited in dbo.SYSTEM_LOGS)

ini_set('display_errors', 0);
error_reporting(0);

require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../utils/logger.php';

header('Content-Type: application/json; charset=utf-8');
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$courseId = substr(trim($input['course_id'] ?? ''), 0, 50);
$isGuest = !empty($input['is_guest']);

if (!empty($courseId) && isset($pdo)) {
    try {
        $ip = function_exists('getClientIpAddress') ? getClientIpAddress() : ($_SERVER['REMOTE_ADDR'] ?? 'UNKNOWN');
        $user = $_SESSION['user'] ?? null;
        $username = $user['username'] ?? ($isGuest ? 'GUEST_STUDENT' : 'OPEN_ACCESS');
        $role = $user['role'] ?? 'guest';
        $userId = (string)($user['id'] ?? '0');

        $stmt = $pdo->prepare("
            INSERT INTO dbo.SYSTEM_LOGS 
                (user_id, username, role, action, module, ref_id, remark, ip_address, created_at)
            VALUES (?, ?, ?, 'COURSE_VIEW', 'LEARNING', ?, ?, ?, GETDATE())
        ");
        $stmt->execute([
            $userId,
            $username,
            $role,
            $courseId,
            $isGuest ? 'ศึกษาด้วยตนเอง (Open Access Self-Study)' : 'พนักงานเข้าศึกษา (Corporate Employee Study)',
            $ip
        ]);

        echo json_encode(['success' => true]);
        exit;
    } catch (Throwable $e) {}
}

echo json_encode(['success' => false]);
?>
