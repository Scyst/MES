<?php
session_start();
header('Content-Type: application/json; charset=utf-8');
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");

if (isset($_SESSION['user'])) {
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }

    // Auto-recover permissions if missing from an older session
    if (empty($_SESSION['user']['permissions']) || !is_array($_SESSION['user']['permissions'])) {
        try {
            require_once __DIR__ . '/db.php';
            if (isset($pdo) && !empty($_SESSION['user']['role']) && !empty($_SESSION['user']['id'])) {
                $role = $_SESSION['user']['role'];
                $userId = $_SESSION['user']['id'];

                $permStmt = $pdo->prepare("SELECT perm_code FROM dbo.SYS_ROLE_PERMISSIONS WHERE role_code = ?");
                $permStmt->execute([$role]);
                $rolePermissions = $permStmt->fetchAll(PDO::FETCH_COLUMN);

                $userPermStmt = $pdo->prepare("SELECT perm_code FROM dbo.SYS_USER_PERMISSIONS WHERE user_id = ?");
                $userPermStmt->execute([$userId]);
                $userPermissions = $userPermStmt->fetchAll(PDO::FETCH_COLUMN);

                $_SESSION['user']['permissions'] = array_values(array_unique(array_merge($rolePermissions, $userPermissions)));
            }
        } catch (Exception $e) {}
    }

    echo json_encode([
        'success' => true,
        'authenticated' => true,
        'user' => $_SESSION['user'],
        'csrf_token' => $_SESSION['csrf_token']
    ]);
} else {
    if (isset($_GET['silent'])) {
        echo json_encode([
            'success' => false,
            'authenticated' => false,
            'is_expired' => true,
            'message' => 'Not authenticated'
        ]);
        exit;
    }
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'authenticated' => false,
        'is_expired' => true,
        'message' => 'Not authenticated'
    ]);
}
?>
