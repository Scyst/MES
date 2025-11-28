<?php
// MES/auth/login.php
session_start();
require_once __DIR__ . '/../page/db.php';

header('Content-Type: application/json');

$input = json_decode(file_get_contents("php://input"), true);
$username = $input['username'] ?? '';
$password = $input['password'] ?? '';

if (empty($username) || empty($password)) {
    echo json_encode(['success' => false, 'message' => 'Username and password are required.']);
    exit;
}

try {
    // ★★★ แก้ไข SQL: เพิ่ม m.position เข้ามาด้วย ★★★
    $sql = "SELECT u.id, u.username, u.password, u.role, u.line, u.emp_id, m.name_th, m.position 
            FROM " . USERS_TABLE . " u
            LEFT JOIN " . MANPOWER_EMPLOYEES_TABLE . " m ON u.emp_id = m.emp_id
            WHERE u.username = ?";
            
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$username]);
    $user = $stmt->fetch();

    if ($user && password_verify($password, $user['password'])) {
        session_regenerate_id(true);
        
        $displayName = !empty($user['name_th']) ? $user['name_th'] : $user['username'];
        
        // ★★★ Logic เลือกตำแหน่ง: ถ้ามีตำแหน่งจริงให้ใช้ ถ้าไม่มีให้ใช้ Role ระบบแทน
        $displayPosition = !empty($user['position']) ? $user['position'] : $user['role'];

        $_SESSION['user'] = [
            'id' => $user['id'],
            'username' => $user['username'],
            'fullname' => $displayName,
            'role' => $user['role'],       // Role ระบบ (ใช้เช็คสิทธิ์)
            'position' => $displayPosition, // ตำแหน่งจริง (ใช้แสดงผล)
            'line' => $user['line'],
            'emp_id' => $user['emp_id']
        ];

        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        echo json_encode(['success' => true, 'message' => 'Login successful.']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Invalid username or password.']);
    }

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database error.']);
    error_log("Login Error: " . $e->getMessage());
}
?>