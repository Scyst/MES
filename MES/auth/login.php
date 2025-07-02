<?php
//-- เริ่ม Session และเรียกใช้ไฟล์ที่จำเป็น --
session_start();
require_once __DIR__ . '/../api/db.php';

//-- ตั้งค่า Header ให้ตอบกลับเป็น JSON --
header('Content-Type: application/json');

//-- อ่านข้อมูล Username และ Password จาก Request Body --
$input = json_decode(file_get_contents("php://input"), true);
$username = $input['username'] ?? '';
$password = $input['password'] ?? '';

//-- ตรวจสอบว่ามีการส่งข้อมูลมาครบถ้วนหรือไม่ --
if (empty($username) || empty($password)) {
    echo json_encode(['success' => false, 'message' => 'Username and password are required.']);
    exit;
}

try {
    //-- ค้นหาผู้ใช้จาก Username ในฐานข้อมูล --
    $sql = "SELECT id, username, password, role FROM IOT_TOOLBOX_USERS WHERE username = ?";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$username]);
    $user = $stmt->fetch();

    //-- ตรวจสอบว่าพบผู้ใช้และรหัสผ่านถูกต้องหรือไม่ --
    if ($user && password_verify($password, $user['password'])) {
        //-- หากถูกต้อง ให้สร้าง Session ID ใหม่เพื่อความปลอดภัย --
        session_regenerate_id(true);
        
        //-- เก็บข้อมูลผู้ใช้ลงใน Session --
        $_SESSION['user'] = [
            'id' => $user['id'],
            'username' => $user['username'],
            'role' => $user['role']
        ];

        //-- สร้าง CSRF Token สำหรับป้องกันการโจมตี --
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        
        //-- ส่งผลลัพธ์ว่าล็อกอินสำเร็จ --
        echo json_encode(['success' => true, 'message' => 'Login successful.']);
    } else {
        //-- หากไม่พบผู้ใช้หรือรหัสผ่านไม่ถูกต้อง --
        echo json_encode(['success' => false, 'message' => 'Invalid username or password.']);
    }

} catch (PDOException $e) {
    //-- กรณีเกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล --
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'A database error occurred.']);
    error_log("Login Error: " . $e->getMessage());
}
?>