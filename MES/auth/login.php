<?php
// MES/auth/login.php
session_start();

// ป้องกัน PHP พ่น Error เป็น HTML ทำให้ฝั่ง JS พัง
ini_set('display_errors', 0);
error_reporting(E_ALL);

require_once __DIR__ . '/../page/db.php';

header('Content-Type: application/json; charset=utf-8');

$input = json_decode(file_get_contents("php://input"), true);
$username = $input['username'] ?? '';
$password = $input['password'] ?? '';

if (empty($username) || empty($password)) {
    echo json_encode(['success' => false, 'message' => 'Username and password are required.']);
    exit;
}

try {
    // 1. แก้ไข SQL: เพิ่ม u.is_active = 1 (บล็อคคนโดน Disable)
    // 2. ดึง u.fullname และ u.team_group เพิ่มเข้ามา
    $sql = "SELECT u.id, u.username, u.password, u.role, u.line, u.emp_id, u.fullname, u.team_group, m.position 
            FROM " . USERS_TABLE . " u
            LEFT JOIN " . MANPOWER_EMPLOYEES_TABLE . " m ON u.emp_id = m.emp_id
            WHERE u.username = ? AND u.is_active = 1";
            
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$username]);
    $user = $stmt->fetch();

    if ($user && password_verify($password, $user['password'])) {
        // ป้องกัน Session Fixation
        session_regenerate_id(true);
        
        $displayName = !empty($user['fullname']) ? $user['fullname'] : $user['username'];
        $displayPosition = !empty($user['position']) ? $user['position'] : $user['role'];

        // 🔥 [NEW PBAC] ดึง Permission ของ Role นี้จากฐานข้อมูล
        $permStmt = $pdo->prepare("SELECT perm_code FROM dbo.SYS_ROLE_PERMISSIONS WHERE role_code = ?");
        $permStmt->execute([$user['role']]);
        $permissions = $permStmt->fetchAll(PDO::FETCH_COLUMN); 

        // สร้างข้อมูลผู้ใช้ใน Session
        $_SESSION['user'] = [
            'id' => $user['id'],
            'username' => $user['username'],
            'fullname' => $displayName,
            'role' => $user['role'],       
            'position' => $displayPosition, 
            'line' => $user['line'],
            'emp_id' => $user['emp_id'],
            'team_group' => $user['team_group'],
            'permissions' => $permissions // <-- ยัด Permission Array ลง Session
        ];

        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        
        // เขียน Log การเข้าสู่ระบบแบบเงียบๆ (ไม่จับ Error ถ้า Insert ไม่ผ่าน)
        try {
            $logStmt = $pdo->prepare("INSERT INTO dbo.SYSTEM_LOGS (username, role, action, module, ref_id, ip_address, user_agent, created_at) VALUES (?, ?, 'LOGIN', 'AUTH', ?, ?, ?, GETDATE())");
            $logStmt->execute([$user['username'], $user['role'], $user['id'], $_SERVER['REMOTE_ADDR'], $_SERVER['HTTP_USER_AGENT']]);
        } catch (Exception $e) {}

        echo json_encode(['success' => true, 'message' => 'Login successful.']);
    } else {
        // ดีเลย์เล็กน้อยเพื่อป้องกัน Brute-force Attack
        usleep(500000); 
        echo json_encode(['success' => false, 'message' => 'Invalid username/password or account disabled.']);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database error occurred.']);
}
?>