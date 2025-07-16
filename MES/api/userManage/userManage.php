<?php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../../auth/check_auth.php';
require_once __DIR__ . '/../logger.php';

//-- ป้องกัน CSRF สำหรับ Request ที่ไม่ใช่ GET --
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

//-- รับค่า Action และข้อมูล Input --
$action = $_REQUEST['action'] ?? '';
$input = json_decode(file_get_contents("php://input"), true);

//-- ตรวจสอบสิทธิ์การเข้าถึงระดับไฟล์ (ต้องเป็น admin หรือ creator) --
if (!hasRole(['admin', 'creator'])) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

try {
    //-- กำหนดผู้ใช้งานปัจจุบันสำหรับตรวจสอบสิทธิ์และบันทึก Log --
    $currentUser = $_SESSION['user'];

    //-- แยกการทำงานตาม Action ที่ได้รับ --
    switch ($action) {
        //-- อ่านข้อมูลผู้ใช้ทั้งหมด (ยกเว้น creator) --
        case 'read':
            $stmt = $pdo->query("SELECT id, username, role, created_at, line FROM USERS WHERE role != 'creator' ORDER BY id ASC");
            $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
            // จัดรูปแบบวันที่
            foreach ($users as &$user) {
                if ($user['created_at']) $user['created_at'] = (new DateTime($user['created_at']))->format('Y-m-d H:i:s');
            }
            echo json_encode(['success' => true, 'data' => $users]);
            break;

        //-- สร้างผู้ใช้ใหม่พร้อมตรวจสอบสิทธิ์ --
        case 'create':
            // ตรวจสอบสิทธิ์ซ้ำอีกครั้งเพื่อความปลอดภัย
            if (!hasRole(['admin', 'creator'])) {
                throw new Exception("Permission denied.");
            }
            $username = trim($input['username'] ?? '');
            $password = trim($input['password'] ?? '');
            $role = trim($input['role'] ?? '');
            // รับค่า line เข้ามา
            $line = ($role === 'supervisor') ? strtoupper(trim($input['line'] ?? '')) : null;

            if (empty($username) || empty($password) || empty($role)) {
                throw new Exception("Username, password, and role are required.");
            }
            if ($role === 'supervisor' && empty($line)) {
                throw new Exception("Line is required for supervisor role.");
            }
            // ตรวจสอบเงื่อนไขการสร้าง Role
            if ($role === 'creator') {
                throw new Exception("Cannot create a user with the 'creator' role.");
            }
            if ($role === 'admin' && !hasRole('creator')) {
                throw new Exception("Only creators can create admin users.");
            }

            // เข้ารหัสรหัสผ่านและบันทึกลง DB
            $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
            $sql = "INSERT INTO USERS (username, password, role, line) VALUES (?, ?, ?, ?)";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$username, $hashedPassword, $role, $line]);

            logAction($pdo, $currentUser['username'], 'CREATE USER', $username, "Role: $role, Line: $line");
            echo json_encode(['success' => true, 'message' => 'User created successfully.']);
            break;

        //-- อัปเดตข้อมูลผู้ใช้พร้อมเงื่อนไขสิทธิ์ที่ซับซ้อน --
        case 'update':
            $targetId = (int)($input['id'] ?? 0);
            if (!$targetId) throw new Exception("Target user ID is required.");

            // ดึงข้อมูลผู้ใช้เป้าหมาย
            $stmt = $pdo->prepare("SELECT id, username, role FROM USERS WHERE id = ?");
            $stmt->execute([$targetId]);
            $targetUser = $stmt->fetch();
            if (!$targetUser) throw new Exception("Target user not found.");

            //-- ตรวจสอบสิทธิ์ในการแก้ไข --
            if ($targetUser['role'] === 'creator') throw new Exception("Creator accounts cannot be modified.");
            
            $isEditingSelf = ($targetId === (int)$currentUser['id']);
            
            // Admin ทั่วไปไม่สามารถแก้ไข Admin คนอื่นได้
            if (hasRole('admin') && !hasRole('creator')) {
                if (!$isEditingSelf && $targetUser['role'] === 'admin') {
                    throw new Exception("Admins cannot modify other admins.");
                }
            }

            //-- สร้าง Query แบบ Dynamic ตามข้อมูลที่ส่งมา --
            $updateFields = [];
            $params = [];
            $logDetails = [];

            // ตรวจสอบเงื่อนไขการเปลี่ยน Username และ Role
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

            if (isset($input['role']) && $input['role'] === 'supervisor') {
                $line = strtoupper(trim($input['line'] ?? ''));
                 if (empty($line)) {
                    throw new Exception("Line is required for supervisor role.");
                }
                $updateFields[] = "line = ?";
                $params[] = $line;
                $logDetails[] = "line to " . $line;
            } elseif (isset($input['role']) && $input['role'] !== 'supervisor') {
                // ถ้าเปลี่ยน role เป็นอย่างอื่น ให้ล้างค่า line
                $updateFields[] = "line = NULL";
                $logDetails[] = "line cleared";
            }

            // ตรวจสอบการเปลี่ยนรหัสผ่าน (ทำได้เสมอ)
            if (!empty($input['password'])) {
                $updateFields[] = "password = ?";
                $params[] = password_hash(trim($input['password']), PASSWORD_DEFAULT);
                $logDetails[] = "password changed";
            }
            
            // ถ้าไม่มีอะไรเปลี่ยนแปลง ให้จบการทำงาน
            if (empty($updateFields)) {
                echo json_encode(['success' => true, 'message' => 'No changes were made.']);
                break;
            }

            // ประมวลผลการอัปเดตและบันทึก Log
            $sql = "UPDATE USERS SET " . implode(', ', $updateFields) . " WHERE id = ?";
            $params[] = $targetId;
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            
            logAction($pdo, $currentUser['username'], 'UPDATE USER', $targetUser['username'], implode(', ', $logDetails));
            echo json_encode(['success' => true, 'message' => 'User updated successfully.']);
            break;
            
        //-- ลบผู้ใช้พร้อมตรวจสอบสิทธิ์ --
        case 'delete':
            $targetId = (int)($_GET['id'] ?? 0);
            if (!$targetId) throw new Exception("Missing user ID.");

            //-- ตรวจสอบเงื่อนไขการลบ --
            if ($targetId === (int)$currentUser['id']) {
                throw new Exception("You cannot delete your own account.");
            }

            // ดึงข้อมูลผู้ใช้เป้าหมายเพื่อตรวจสอบ Role
            $stmt = $pdo->prepare("SELECT username, role FROM USERS WHERE id = ?");
            $stmt->execute([$targetId]);
            $targetUser = $stmt->fetch();
            if (!$targetUser) throw new Exception("User not found.");

            if ($targetUser['role'] === 'creator') {
                throw new Exception("Creator accounts cannot be deleted."); 
            }
            if ($targetUser['role'] === 'admin' && !hasRole('creator')) {
                throw new Exception("Permission denied. Only creators can delete other admins.");
            }

            // ประมวลผลการลบและบันทึก Log
            $deleteStmt = $pdo->prepare("DELETE FROM USERS WHERE id = ?");
            $deleteStmt->execute([$targetId]);

            logAction($pdo, $currentUser['username'], 'DELETE USER', $targetUser['username']);
            echo json_encode(['success' => true, 'message' => 'User deleted successfully.']);
            break;
            
        //-- อ่าน Log การกระทำของผู้ใช้ 500 รายการล่าสุด --
        case 'logs':
            $stmt = $pdo->query("SELECT TOP 500 * FROM USER_LOGS ORDER BY created_at DESC");
            $logs = $stmt->fetchAll(PDO::FETCH_ASSOC);
            foreach ($logs as &$log) {
                if ($log['created_at']) $log['created_at'] = (new DateTime($log['created_at']))->format('Y-m-d H:i:s');
            }
            echo json_encode(['success' => true, 'data' => $logs]);
            break;

        //-- กรณีไม่พบ Action ที่ระบุ --
        default:
            http_response_code(400);
            throw new Exception("Invalid action specified for User Management.");
    }
} catch (Exception $e) {
    //-- จัดการข้อผิดพลาด --
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    error_log("Error in userManage.php: " . $e->getMessage());
}
?>