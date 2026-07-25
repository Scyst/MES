<?php
session_start();

ini_set('display_errors', 0);
error_reporting(E_ALL);

require_once __DIR__ . '/db.php';

header('Content-Type: application/json; charset=utf-8');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$input = json_decode(file_get_contents("php://input"), true);
$username = $input['username'] ?? '';
$password = $input['password'] ?? '';

if (empty($username) || empty($password)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Username and password are required.']);
    exit;
}

try {
    $sql = "SELECT u.id, u.username, u.password, u.role, u.line, u.emp_id, u.fullname, u.team_group, m.position 
            FROM " . USERS_TABLE . " u
            LEFT JOIN " . MANPOWER_EMPLOYEES_TABLE . " m ON u.emp_id = m.emp_id
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
        $rolePermissions = $permStmt->fetchAll(PDO::FETCH_COLUMN); 
        
        $userPermStmt = $pdo->prepare("SELECT perm_code FROM dbo.SYS_USER_PERMISSIONS WHERE user_id = ?");
        $userPermStmt->execute([$user['id']]);
        $userPermissions = $userPermStmt->fetchAll(PDO::FETCH_COLUMN);
        
        $permissions = array_values(array_unique(array_merge($rolePermissions, $userPermissions)));

        $_SESSION['user'] = [
            'id' => $user['id'],
            'username' => $user['username'],
            'fullname' => $displayName,
            'role' => $user['role'],       
            'position' => $displayPosition, 
            'line' => $user['line'],
            'emp_id' => $user['emp_id'],
            'team_group' => $user['team_group'],
            'permissions' => $permissions
        ];

        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        
        try {
            $logStmt = $pdo->prepare("INSERT INTO dbo.SYSTEM_LOGS (username, role, action, module, ref_id, ip_address, user_agent, created_at) VALUES (?, ?, 'LOGIN', 'MES_V2', ?, ?, ?, GETDATE())");
            $logStmt->execute([$user['username'], $user['role'], $user['id'], $_SERVER['REMOTE_ADDR'], $_SERVER['HTTP_USER_AGENT']]);
        } catch (Exception $e) {}

        echo json_encode([
            'success' => true, 
            'message' => 'Login successful.',
            'user' => $_SESSION['user']
        ]);
    } else {
        usleep(500000); 
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Invalid username/password or account disabled.']);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database error occurred.']);
}
?>
