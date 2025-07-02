<?php
// เริ่ม Session และเรียกใช้ไฟล์เชื่อมต่อฐานข้อมูล PDO
session_start();
require_once __DIR__ . '/../api/db.php';

// ตั้งค่า Header ให้ตอบกลับเป็น JSON
header('Content-Type: application/json');

// อ่านข้อมูลที่ถูกส่งมาแบบ JSON
$input = json_decode(file_get_contents("php://input"), true);
$username = $input['username'] ?? '';
$password = $input['password'] ?? '';

if (empty($username) || empty($password)) {
    echo json_encode(['success' => false, 'message' => 'Username and password are required.']);
    exit;
}

try {
    $sql = "SELECT id, username, password, role FROM IOT_TOOLBOX_USERS WHERE username = ?";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$username]);
    $user = $stmt->fetch();

    if ($user && password_verify($password, $user['password'])) {
        session_regenerate_id(true);
        
        $_SESSION['user'] = [
            'id' => $user['id'],
            'username' => $user['username'],
            'role' => $user['role']
        ];

        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        
        echo json_encode(['success' => true, 'message' => 'Login successful.']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Invalid username or password.']);
    }

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'A database error occurred.']);
    error_log("Login Error: " . $e->getMessage());
}
?>