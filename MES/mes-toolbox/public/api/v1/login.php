<?php
require_once __DIR__ . '/../core/init.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit(0); }

// Allow login attempts from anywhere but recommend POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method Not Allowed']);
    exit;
}

$input = json_decode(file_get_contents("php://input"), true);
$username = $input['username'] ?? '';
$password = $input['password'] ?? '';

if (empty($username) || empty($password)) {
    echo json_encode(['success' => false, 'message' => 'Username and password are required.']);
    exit;
}

try {
    $sql = "SELECT u.id, u.username, u.password, u.role, u.line, u.emp_id, u.fullname, u.team_group, m.position 
            FROM USERS u
            LEFT JOIN MANPOWER_EMPLOYEES m ON u.emp_id = m.emp_id
            WHERE u.username = ? AND u.is_active = 1";
            
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$username]);
    $user = $stmt->fetch();

    if ($user && password_verify($password, $user['password'])) {
        session_regenerate_id(true);
        
        $displayName = !empty($user['fullname']) ? $user['fullname'] : $user['username'];
        $displayPosition = !empty($user['position']) ? $user['position'] : $user['role'];

        $permStmt = $pdo->prepare("SELECT perm_code FROM dbo.SYS_ROLE_PERMISSIONS WHERE role_code = ?");
        $permStmt->execute([$user['role']]);
        $permissions = $permStmt->fetchAll(PDO::FETCH_COLUMN); 

        $_SESSION['user'] = [
            'id' => $user['id'],
            'username' => $user['username'],
            'fullname' => $displayName,
            'role' => $user['role'],
            'line' => $user['line'],
            'emp_id' => $user['emp_id'],
            'team_group' => $user['team_group'],
            'position' => $displayPosition,
            'permissions' => $permissions 
        ];

        if (empty($_SESSION['csrf_token'])) {
            $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        }

        echo json_encode([
            'success' => true, 
            'message' => 'Login successful', 
            'user' => $_SESSION['user'],
            'csrf_token' => $_SESSION['csrf_token']
        ]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Invalid username or password.']);
    }

} catch (Exception $e) {
    if (defined('IS_DEVELOPMENT') && IS_DEVELOPMENT) {
        echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
    } else {
        echo json_encode(['success' => false, 'message' => 'An internal server error occurred.']);
    }
}
