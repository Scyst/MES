<?php
// MES/auth/login.php
session_start();

// ป้องกัน PHP พ่น Error เป็น HTML ทำให้ฝั่ง JS พัง
ini_set('display_errors', 0);
error_reporting(E_ALL);

require_once __DIR__ . '/../page/db.php';

header('Content-Type: application/json; charset=utf-8');

$input = json_decode(file_get_contents("php://input"), true);
$username = trim($input['username'] ?? '');
$password = $input['password'] ?? '';

if (empty($username) || empty($password)) {
    echo json_encode(['success' => false, 'message' => 'Username and password are required.']);
    exit;
}

function getLegacyAuthClientIp() {
    if (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
        $ips = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR']);
        return trim($ips[0]);
    }
    if (!empty($_SERVER['HTTP_CLIENT_IP'])) {
        return $_SERVER['HTTP_CLIENT_IP'];
    }
    return $_SERVER['REMOTE_ADDR'] ?? 'UNKNOWN';
}

try {
    $clientIp = getLegacyAuthClientIp();
    $userAgent = substr($_SERVER['HTTP_USER_AGENT'] ?? 'UNKNOWN', 0, 255);

    $failCount = 0;
    try {
        $failStmt = $pdo->prepare("
            SELECT COUNT(*) 
            FROM dbo.SYSTEM_LOGS WITH (NOLOCK)
            WHERE module = 'AUTH' 
              AND action IN ('LOGIN_FAILED', 'LOGIN_BLOCKED')
              AND username = ?
              AND created_at >= DATEADD(MINUTE, -15, GETDATE())
        ");
        $failStmt->execute([$username]);
        $failCount = (int)$failStmt->fetchColumn();
    } catch (Throwable $e) {}

    $sql = "SELECT u.id, u.username, u.password, u.role, u.line, u.emp_id, u.fullname, u.team_group,
                   u.profile_picture, u.theme_preference, u.preferred_lang, u.is_active, m.position 
            FROM " . USERS_TABLE . " u
            LEFT JOIN " . MANPOWER_EMPLOYEES_TABLE . " m ON u.emp_id = m.emp_id
            WHERE u.username = ?";
            
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$username]);
    $user = $stmt->fetch();

    if ($user && (int)($user['is_active'] ?? 1) === 1 && password_verify($password, $user['password'])) {
        // ป้องกัน Session Fixation
        session_regenerate_id(true);
        
        $displayName = !empty($user['fullname']) ? $user['fullname'] : $user['username'];
        $displayPosition = !empty($user['position']) ? $user['position'] : $user['role'];

        // 🔥 [NEW PBAC] ดึง Permission ของ Role นี้จากฐานข้อมูล
        $permStmt = $pdo->prepare("SELECT perm_code FROM dbo.SYS_ROLE_PERMISSIONS WHERE role_code = ?");
        $permStmt->execute([$user['role']]);
        $rolePermissions = $permStmt->fetchAll(PDO::FETCH_COLUMN); 
        
        // ดึง Permission แบบรายบุคคล
        $userPermStmt = $pdo->prepare("SELECT perm_code FROM dbo.SYS_USER_PERMISSIONS WHERE user_id = ?");
        $userPermStmt->execute([$user['id']]);
        $userPermissions = $userPermStmt->fetchAll(PDO::FETCH_COLUMN);
        
        // รวม Permission ทั้งหมดเข้าด้วยกัน (ตัดตัวซ้ำ)
        $permissions = array_values(array_unique(array_merge($rolePermissions, $userPermissions)));

        // สร้างข้อมูลผู้ใช้ใน Session
        $_SESSION['user'] = [
            'id'               => $user['id'],
            'username'         => $user['username'],
            'fullname'         => $displayName,
            'role'             => $user['role'],
            'position'         => $displayPosition,
            'line'             => $user['line'],
            'emp_id'           => $user['emp_id'],
            'team_group'       => $user['team_group'],
            'profile_picture'  => $user['profile_picture'] ?? null,
            'theme_preference' => $user['theme_preference'] ?? 'light',
            'preferred_lang'   => $user['preferred_lang']   ?? 'th',
            'permissions'      => $permissions,
        ];

        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        
        // เขียน Log การเข้าสู่ระบบ + อัปเดต last_login
        try {
            $logStmt = $pdo->prepare("INSERT INTO dbo.SYSTEM_LOGS (user_id, username, role, action, module, ref_id, remark, ip_address, user_agent, created_at) VALUES (?, ?, ?, 'LOGIN', 'AUTH', ?, ?, ?, ?, GETDATE())");
            $logStmt->execute([(string)$user['id'], $user['username'], $user['role'], (string)$user['id'], 'เข้าสู่ระบบสำเร็จ (Legacy Login)', $clientIp, $userAgent]);

            // บันทึก last_login timestamp
            $lastLoginStmt = $pdo->prepare("EXEC " . DB_DATABASE . ".dbo.sp_ManageUser @Action='UPDATE_LAST_LOGIN', @UserId=?, @ActionBy=?");
            $lastLoginStmt->execute([$user['id'], $user['username']]);
        } catch (Exception $e) {}

        echo json_encode(['success' => true, 'message' => 'Login successful.']);
    } else {
        try {
            $attemptNo = $failCount + 1;
            $failReasonCode = 'INVALID_PASSWORD';
            $failReasonText = 'รหัสผ่านไม่ถูกต้อง (Invalid Password)';

            if (!$user) {
                $failReasonCode = 'UNKNOWN_USERNAME';
                $failReasonText = 'ไม่พบบัญชีผู้ใช้งานนี้ในระบบ (Unknown Username)';
            } elseif ((int)($user['is_active'] ?? 1) !== 1) {
                $failReasonCode = 'ACCOUNT_DISABLED';
                $failReasonText = 'บัญชีถูกระงับการใช้งาน (Account Disabled)';
            }

            $actionType = ($attemptNo >= 5) ? 'LOGIN_BLOCKED' : 'LOGIN_FAILED';
            $remarkPrefix = ($attemptNo >= 5) 
                ? "⚠️ แจ้งเตือนล็อกอินผิดซ้ำครั้งที่ {$attemptNo} (ใน 15 นาที): " 
                : "ล็อกอินล้มเหลว (ครั้งที่ {$attemptNo} ใน 15 นาที): ";

            $newJson = json_encode([
                'attempted_username' => $username,
                'reason_code' => $failReasonCode,
                'reason' => $failReasonText,
                'attempt_count_15m' => $attemptNo,
                'ip_address' => $clientIp,
                'user_agent' => $userAgent
            ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

            $logStmt = $pdo->prepare("INSERT INTO dbo.SYSTEM_LOGS (user_id, username, role, action, module, ref_id, new_value, remark, ip_address, user_agent, created_at) VALUES (?, ?, ?, ?, 'AUTH', ?, ?, ?, ?, ?, GETDATE())");
            $logStmt->execute([
                (string)($user['id'] ?? '0'),
                substr($username, 0, 100),
                substr((string)($user['role'] ?? 'UNKNOWN'), 0, 50),
                $actionType,
                (string)($user['id'] ?? '0'),
                $newJson,
                substr($remarkPrefix . $failReasonText, 0, 255),
                $clientIp,
                $userAgent
            ]);
        } catch (Throwable $e) {}

        // ดีเลย์เล็กน้อยเพื่อป้องกัน Brute-force Attack
        usleep(500000); 
        echo json_encode(['success' => false, 'message' => 'Invalid username/password or account disabled.']);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database error occurred.']);
}
?>
