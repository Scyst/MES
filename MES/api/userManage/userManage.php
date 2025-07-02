<?php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../../auth/check_auth.php';
require_once __DIR__ . '/../logger.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    if (
        !isset($_SERVER['HTTP_X_CSRF_TOKEN']) ||
        !isset($_SESSION['csrf_token']) ||
        !hash_equals($_SESSION['csrf_token'], $_SERVER['HTTP_X_CSRF_TOKEN'])
    ) {
        http_response_code(403); // Forbidden
        echo json_encode(['success' => false, 'message' => 'CSRF token validation failed. Request rejected.']);
        exit;
    }
}

$action = $_REQUEST['action'] ?? '';
$input = json_decode(file_get_contents("php://input"), true);

if (!hasRole(['admin', 'creator'])) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

try {
    $currentUser = $_SESSION['user'];

    switch ($action) {
        case 'read':
            $stmt = $pdo->query("SELECT id, username, role, created_at FROM IOT_TOOLBOX_USERS WHERE role != 'creator' ORDER BY id ASC");
            $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
            foreach ($users as &$user) {
                if ($user['created_at']) $user['created_at'] = (new DateTime($user['created_at']))->format('Y-m-d H:i:s');
            }
            echo json_encode(['success' => true, 'data' => $users]);
            break;

        case 'create':
            if (!hasRole(['admin', 'creator'])) {
                throw new Exception("Permission denied.");
            }
            $username = trim($input['username'] ?? '');
            $password = trim($input['password'] ?? '');
            $role = trim($input['role'] ?? '');

            if (empty($username) || empty($password) || empty($role)) {
                throw new Exception("Username, password, and role are required.");
            }
            if ($role === 'creator') {
                throw new Exception("Cannot create a user with the 'creator' role.");
            }
            if ($role === 'admin' && !hasRole('creator')) {
                throw new Exception("Only creators can create admin users.");
            }

            $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
            $sql = "INSERT INTO IOT_TOOLBOX_USERS (username, password, role) VALUES (?, ?, ?)";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$username, $hashedPassword, $role]);

            logAction($pdo, $currentUser['username'], 'CREATE USER', $username, "Role: $role");
            echo json_encode(['success' => true, 'message' => 'User created successfully.']);
            break;

        case 'update':
            $targetId = (int)($input['id'] ?? 0);
            if (!$targetId) throw new Exception("Target user ID is required.");

            $stmt = $pdo->prepare("SELECT id, username, role FROM IOT_TOOLBOX_USERS WHERE id = ?");
            $stmt->execute([$targetId]);
            $targetUser = $stmt->fetch();
            if (!$targetUser) throw new Exception("Target user not found.");

            if ($targetUser['role'] === 'creator') throw new Exception("Creator accounts cannot be modified.");

            $isEditingSelf = ($targetId === (int)$currentUser['id']);
            
            if (hasRole('admin') && !hasRole('creator')) {
                if (!$isEditingSelf && $targetUser['role'] === 'admin') {
                    throw new Exception("Admins cannot modify other admins.");
                }
            }

            $updateFields = [];
            $params = [];
            $logDetails = [];

            if (!$isEditingSelf || hasRole('creator')) {
                if (isset($input['username']) && $input['username'] !== $targetUser['username']) {
                    $updateFields[] = "username = ?";
                    $params[] = trim($input['username']);
                    $logDetails[] = "username to " . trim($input['username']);
                }
                if (isset($input['role']) && $input['role'] !== $targetUser['role']) {
                    if ($input['role'] === 'admin' && !hasRole('creator')) {
                         throw new Exception("Only creators can promote users to admin.");
                    }
                    $updateFields[] = "role = ?";
                    $params[] = trim($input['role']);
                    $logDetails[] = "role to " . trim($input['role']);
                }
            }

            if (!empty($input['password'])) {
                $updateFields[] = "password = ?";
                $params[] = password_hash(trim($input['password']), PASSWORD_DEFAULT);
                $logDetails[] = "password changed";
            }
            
            if (empty($updateFields)) {
                echo json_encode(['success' => true, 'message' => 'No changes were made.']);
                break;
            }

            $sql = "UPDATE IOT_TOOLBOX_USERS SET " . implode(', ', $updateFields) . " WHERE id = ?";
            $params[] = $targetId;

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            
            logAction($pdo, $currentUser['username'], 'UPDATE USER', $targetUser['username'], implode(', ', $logDetails));
            echo json_encode(['success' => true, 'message' => 'User updated successfully.']);
            break;
            
        case 'delete':
            $targetId = (int)($_GET['id'] ?? 0);
            if (!$targetId) throw new Exception("Missing user ID.");

            if ($targetId === (int)$currentUser['id']) {
                throw new Exception("You cannot delete your own account.");
            }

            $stmt = $pdo->prepare("SELECT username, role FROM IOT_TOOLBOX_USERS WHERE id = ?");
            $stmt->execute([$targetId]);
            $targetUser = $stmt->fetch();
            if (!$targetUser) throw new Exception("User not found.");

            if ($targetUser['role'] === 'creator') {
                throw new Exception("Creator accounts cannot be deleted."); 
            }
            if ($targetUser['role'] === 'admin' && !hasRole('creator')) {
                throw new Exception("Permission denied. Only creators can delete other admins.");
            }

            $deleteStmt = $pdo->prepare("DELETE FROM IOT_TOOLBOX_USERS WHERE id = ?");
            $deleteStmt->execute([$targetId]);

            logAction($pdo, $currentUser['username'], 'DELETE USER', $targetUser['username']);
            echo json_encode(['success' => true, 'message' => 'User deleted successfully.']);
            break;
            
        case 'logs':
            $stmt = $pdo->query("SELECT TOP 500 * FROM IOT_TOOLBOX_USER_LOGS ORDER BY created_at DESC");
            $logs = $stmt->fetchAll(PDO::FETCH_ASSOC);
            foreach ($logs as &$log) {
                if ($log['created_at']) $log['created_at'] = (new DateTime($log['created_at']))->format('Y-m-d H:i:s');
            }
            echo json_encode(['success' => true, 'data' => $logs]);
            break;

        default:
            http_response_code(400);
            throw new Exception("Invalid action specified for User Management.");
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    error_log("Error in userManage.php: " . $e->getMessage());
}
?>