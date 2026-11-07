<?php
session_start();

ini_set('display_errors', 0);
error_reporting(E_ALL);

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/utils/logger.php';

header('Content-Type: application/json; charset=utf-8');
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$input = json_decode(file_get_contents("php://input"), true);
$username = trim($input['username'] ?? '');
$password = $input['password'] ?? '';

if (empty($username) || empty($password)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'กรุณากรอกชื่อผู้ใช้งานและรหัสผ่าน']);
    exit;
}

function recordAuthAuditLog($pdo, $username, $role, $userId, $action, $remark, $extraData = null) {
    try {
        $ip = function_exists('getClientIpAddress') ? getClientIpAddress() : ($_SERVER['REMOTE_ADDR'] ?? 'UNKNOWN');
        $ua = substr($_SERVER['HTTP_USER_AGENT'] ?? 'UNKNOWN', 0, 255);
        $safeUsername = substr((string)$username, 0, 100);
        $safeRole = substr((string)($role ?: 'UNKNOWN'), 0, 50);
        $safeUserId = substr((string)($userId ?: '0'), 0, 50);
        $safeRemark = substr((string)$remark, 0, 255);
        $newJson = $extraData ? json_encode($extraData, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) : null;

        $logStmt = $pdo->prepare("
            INSERT INTO dbo.SYSTEM_LOGS 
                (user_id, username, role, action, module, ref_id, new_value, remark, ip_address, user_agent, created_at) 
            VALUES (?, ?, ?, ?, 'AUTH', ?, ?, ?, ?, ?, GETDATE())
        ");
        $logStmt->execute([$safeUserId, $safeUsername, $safeRole, $action, $safeUserId, $newJson, $safeRemark, $ip, $ua]);
    } catch (Throwable $e) {
        error_log("[AUTH_LOG_ERROR] " . $e->getMessage());
    }
}

try {
    $clientIp = function_exists('getClientIpAddress') ? getClientIpAddress() : ($_SERVER['REMOTE_ADDR'] ?? 'UNKNOWN');

    // Check recent failed login attempts in the last 15 minutes
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
                   u.profile_picture, u.theme_preference, u.preferred_lang,
                   u.account_type, u.approval_status, u.expires_at, u.company_name, u.is_active, m.position 
            FROM " . USERS_TABLE . " u
            LEFT JOIN " . MANPOWER_EMPLOYEES_TABLE . " m ON u.emp_id = m.emp_id
            WHERE u.username = ?";
            
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$username]);
    $user = $stmt->fetch();

    if ($user && (int)($user['is_active'] ?? 1) === 1 && password_verify($password, $user['password'])) {
        // 1. Check Approval Status
        if (!empty($user['approval_status']) && $user['approval_status'] === 'pending') {
            recordAuthAuditLog($pdo, $user['username'], $user['role'], $user['id'], 'LOGIN_BLOCKED', 'พยายามเข้าสู่ระบบขณะบัญชียังรออนุมัติ (Pending Approval)', [
                'reason' => 'PENDING_APPROVAL',
                'ip' => $clientIp
            ]);
            http_response_code(403);
            echo json_encode([
                'success' => false, 
                'message' => 'บัญชีของท่านอยู่ระหว่างรอการอนุมัติจากผู้ดูแลระบบ กรุณารอการตรวจสอบ'
            ]);
            exit;
        }

        if (!empty($user['approval_status']) && $user['approval_status'] === 'rejected') {
            recordAuthAuditLog($pdo, $user['username'], $user['role'], $user['id'], 'LOGIN_BLOCKED', 'พยายามเข้าสู่ระบบด้วยบัญชีที่ไม่อนุมัติ (Rejected)', [
                'reason' => 'REJECTED_ACCOUNT',
                'ip' => $clientIp
            ]);
            http_response_code(403);
            echo json_encode([
                'success' => false, 
                'message' => 'คำขอเปิดใช้งานบัญชีนี้ไม่ได้รับการอนุมัติ กรุณาติดต่อผู้ดูแลระบบ'
            ]);
            exit;
        }

        // 2. Check Expiration Date
        if (!empty($user['expires_at']) && strtotime($user['expires_at']) < time()) {
            $expiredDate = date('d/m/Y H:i', strtotime($user['expires_at']));
            recordAuthAuditLog($pdo, $user['username'], $user['role'], $user['id'], 'LOGIN_BLOCKED', "พยายามเข้าสู่ระบบด้วยบัญชีที่หมดอายุเมื่อ {$expiredDate}", [
                'reason' => 'ACCOUNT_EXPIRED',
                'expires_at' => $user['expires_at'],
                'ip' => $clientIp
            ]);
            http_response_code(403);
            echo json_encode([
                'success' => false, 
                'message' => "บัญชีผู้ใช้นี้หมดอายุการใช้งานแล้วเมื่อ {$expiredDate} กรุณาติดต่อผู้ดูแลระบบหรือผู้สอน"
            ]);
            exit;
        }

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
            'account_type'     => $user['account_type']     ?? 'employee',
            'approval_status'  => $user['approval_status']  ?? 'approved',
            'is_kiosk'         => !empty($input['is_kiosk']) || in_array($user['role'], ['display', 'kiosk']) || ($user['account_type'] ?? '') === 'kiosk',
            'expires_at'       => $user['expires_at']       ?? null,
            'company_name'     => $user['company_name']     ?? null,
            'permissions'      => $permissions
        ];

        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        
        recordAuthAuditLog($pdo, $user['username'], $user['role'], $user['id'], 'LOGIN', 'เข้าสู่ระบบสำเร็จ (Login Successful)', [
            'ip' => $clientIp,
            'account_type' => $user['account_type'] ?? 'employee'
        ]);

        try {
            if (defined('DB_DATABASE')) {
                $lastLoginStmt = $pdo->prepare("EXEC " . DB_DATABASE . ".dbo.sp_ManageUser @Action='UPDATE_LAST_LOGIN', @UserId=?, @ActionBy=?");
                $lastLoginStmt->execute([$user['id'], $user['username']]);
            }
        } catch (Exception $e) {}

        echo json_encode([
            'success' => true, 
            'message' => 'Login successful.',
            'user' => $_SESSION['user'],
            'csrf_token' => $_SESSION['csrf_token']
        ]);
    } else {
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

        recordAuthAuditLog(
            $pdo,
            $username,
            $user['role'] ?? 'UNKNOWN',
            $user['id'] ?? '0',
            $actionType,
            $remarkPrefix . $failReasonText,
            [
                'attempted_username' => $username,
                'reason_code' => $failReasonCode,
                'reason' => $failReasonText,
                'attempt_count_15m' => $attemptNo,
                'ip_address' => $clientIp,
                'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'UNKNOWN'
            ]
        );

        usleep(500000); 
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง หรือบัญชีถูกระงับการใช้งาน']);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database error occurred.']);
}
?>
