<?php
session_start();

if (isset($_SESSION['user'])) {
    try {
        require_once __DIR__ . '/db.php';
        if (isset($pdo)) {
            $logStmt = $pdo->prepare("INSERT INTO dbo.SYSTEM_LOGS (username, role, action, module, ref_id, ip_address, user_agent, created_at) VALUES (?, ?, 'LOGOUT', 'AUTH', ?, ?, ?, GETDATE())");
            $logStmt->execute([
                $_SESSION['user']['username'] ?? 'UNKNOWN',
                $_SESSION['user']['role'] ?? 'UNKNOWN',
                $_SESSION['user']['id'] ?? 0,
                $_SERVER['REMOTE_ADDR'] ?? 'UNKNOWN',
                $_SERVER['HTTP_USER_AGENT'] ?? 'UNKNOWN'
            ]);
        }
    } catch (Exception $e) {}
}

$_SESSION = [];

if (ini_get("session.use_cookies")) {
    $params = session_get_cookie_params();
    setcookie(session_name(), '', time() - 42000,
        $params["path"], $params["domain"],
        $params["secure"], $params["httponly"]
    );
}

session_destroy();

header('Content-Type: application/json; charset=utf-8');
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
echo json_encode(['success' => true, 'message' => 'Logged out successfully']);
?>
