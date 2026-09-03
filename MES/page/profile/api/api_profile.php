<?php
/**
 * api_profile.php
 * Self-service Profile API — เฉพาะข้อมูลของ user ที่ login อยู่เท่านั้น
 * Actions: get_my_profile | update_my_info | change_password
 */
ini_set('display_errors', 0);
error_reporting(E_ALL);

require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../../auth/check_auth.php';
require_once __DIR__ . '/../../components/php/logger.php';

header('Content-Type: application/json; charset=utf-8');

// CSRF — ทุก POST ต้องตรวจ
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    if (
        empty($_SERVER['HTTP_X_CSRF_TOKEN'])
        || empty($_SESSION['csrf_token'])
        || !hash_equals($_SESSION['csrf_token'], $_SERVER['HTTP_X_CSRF_TOKEN'])
    ) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'CSRF Token Validation Failed.']);
        exit;
    }
}

$action    = $_REQUEST['action'] ?? '';
$input     = json_decode(file_get_contents('php://input'), true) ?: $_POST;
$currentId = (int)$_SESSION['user']['id'];
$username  = $_SESSION['user']['username'];

try {
    switch ($action) {

        // ─────────────────────────────────────────────
        case 'get_my_profile':
            $stmt = $pdo->prepare("
                SELECT
                    u.id, u.username, u.fullname, u.role, u.line, u.team_group,
                    u.emp_id, u.profile_picture, u.phone, u.bio,
                    u.social_line_id, u.social_facebook,
                    u.commute_method, u.vehicle_registration,
                    u.emergency_contact_name, u.emergency_contact_phone, u.emergency_contact_relation, u.current_address,
                    u.date_of_birth, u.marital_status, u.children_count, u.shirt_size, u.shoe_size,
                    u.last_login, u.pwd_changed_at,
                    u.preferred_lang, u.theme_preference, u.created_at,
                    m.position, m.department_api, m.start_date
                FROM " . USERS_TABLE . " u
                LEFT JOIN " . MANPOWER_EMPLOYEES_TABLE . " m ON u.emp_id = m.emp_id
                WHERE u.id = ?
            ");
            $stmt->execute([$currentId]);
            $profile = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$profile) {
                throw new Exception('ไม่พบข้อมูลผู้ใช้งาน');
            }

            // ไม่ส่ง password hash กลับไปยัง client เด็ดขาด
            unset($profile['password']);

            echo json_encode(['success' => true, 'data' => $profile]);
            break;

        // ─────────────────────────────────────────────
        case 'update_my_info':
            // Basic fields
            $phone     = isset($input['phone'])      ? trim($input['phone'])      : null;
            $bio       = isset($input['bio'])         ? trim($input['bio'])        : null;
            $lang      = isset($input['preferred_lang'])   ? trim($input['preferred_lang'])   : null;
            $theme     = isset($input['theme_preference']) ? trim($input['theme_preference']) : null;
            
            // New fields (Contact & Social)
            $line_id   = isset($input['social_line_id']) ? trim($input['social_line_id']) : null;
            $facebook  = isset($input['social_facebook']) ? trim($input['social_facebook']) : null;
            $commute   = isset($input['commute_method']) ? trim($input['commute_method']) : null;
            $vehicle   = isset($input['vehicle_registration']) ? trim($input['vehicle_registration']) : null;
            $emergName = isset($input['emergency_contact_name']) ? trim($input['emergency_contact_name']) : null;
            $emergPhone= isset($input['emergency_contact_phone']) ? trim($input['emergency_contact_phone']) : null;
            $emergRel  = isset($input['emergency_contact_relation']) ? trim($input['emergency_contact_relation']) : null;
            $address   = isset($input['current_address']) ? trim($input['current_address']) : null;

            // New fields (Personal & Welfare)
            $dob       = !empty($input['date_of_birth']) ? trim($input['date_of_birth']) : null;
            $marital   = isset($input['marital_status']) ? trim($input['marital_status']) : null;
            $children  = isset($input['children_count']) && $input['children_count'] !== '' ? (int)$input['children_count'] : 0;
            $shirt     = isset($input['shirt_size']) ? trim($input['shirt_size']) : null;
            $shoe      = isset($input['shoe_size']) ? trim($input['shoe_size']) : null;

            // Validation
            if ($phone !== null && $phone !== '' && !preg_match('/^[0-9+\-\s()]{7,20}$/', $phone)) {
                throw new Exception('รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง');
            }
            if ($emergPhone !== null && $emergPhone !== '' && !preg_match('/^[0-9+\-\s()]{7,20}$/', $emergPhone)) {
                throw new Exception('รูปแบบเบอร์โทรศัพท์ฉุกเฉินไม่ถูกต้อง');
            }
            if ($lang !== null && !in_array($lang, ['th', 'en'], true)) {
                throw new Exception('ภาษาที่ระบุไม่รองรับ');
            }
            if ($theme !== null && !in_array($theme, ['light', 'dark'], true)) {
                throw new Exception('ธีมที่ระบุไม่รองรับ');
            }
            if ($bio !== null && mb_strlen($bio) > 500) {
                throw new Exception('คำแนะนำตัวต้องไม่เกิน 500 ตัวอักษร');
            }

            // Execute Update via Raw SQL
            $stmt = $pdo->prepare("
                UPDATE " . USERS_TABLE . "
                SET phone = ?, bio = ?, preferred_lang = ?, theme_preference = ?,
                    social_line_id = ?, social_facebook = ?,
                    commute_method = ?, vehicle_registration = ?,
                    emergency_contact_name = ?, emergency_contact_phone = ?, emergency_contact_relation = ?,
                    current_address = ?,
                    date_of_birth = ?, marital_status = ?, children_count = ?, shirt_size = ?, shoe_size = ?
                WHERE id = ?
            ");
            $stmt->execute([
                $phone, $bio, $lang, $theme,
                $line_id, $facebook, $commute, $vehicle,
                $emergName, $emergPhone, $emergRel,
                $address,
                $dob, $marital, $children, $shirt, $shoe,
                $currentId
            ]);

            // อัปเดต session theme เพื่อ sync ทันที
            if ($theme !== null) $_SESSION['user']['theme_preference'] = $theme;
            if ($lang !== null)  $_SESSION['user']['preferred_lang'] = $lang;

            writeLog($pdo, 'UPDATE_PROFILE', 'PROFILE', $username, $currentId, null, 'User updated comprehensive profile info');
            echo json_encode(['success' => true, 'message' => 'บันทึกข้อมูลส่วนตัวสำเร็จ']);
            break;

        // ─────────────────────────────────────────────
        case 'change_password':
            $oldPassword = $input['old_password'] ?? '';
            $newPassword = $input['new_password']  ?? '';
            $confirmPwd  = $input['confirm_password'] ?? '';

            if (empty($oldPassword) || empty($newPassword) || empty($confirmPwd)) {
                throw new Exception('กรุณากรอกข้อมูลให้ครบทุกช่อง');
            }

            if ($newPassword !== $confirmPwd) {
                throw new Exception('รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน');
            }

            if (mb_strlen($newPassword) < 6) {
                throw new Exception('รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
            }

            if ($newPassword === $oldPassword) {
                throw new Exception('รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสผ่านเดิม');
            }

            // ดึง password hash ปัจจุบันจาก DB — ตรวจ old password
            $stmt = $pdo->prepare("SELECT password FROM " . USERS_TABLE . " WHERE id = ?");
            $stmt->execute([$currentId]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$row || !password_verify($oldPassword, $row['password'])) {
                // ดีเลย์เพื่อป้องกัน timing attack
                usleep(300000);
                throw new Exception('รหัสผ่านเดิมไม่ถูกต้อง');
            }

            $newHash = password_hash($newPassword, PASSWORD_DEFAULT);

            $stmtPwd = $pdo->prepare("
                EXEC " . DB_DATABASE . ".dbo.sp_ManageUser
                    @Action       = 'CHANGE_PWD',
                    @UserId       = ?,
                    @PasswordHash = ?,
                    @ActionBy     = ?
            ");
            $stmtPwd->execute([$currentId, $newHash, $username]);

            // อัปเดต session เพื่อ admin ที่ดู userManage จะเห็น status ถูกต้อง
            writeLog($pdo, 'CHANGE_PASSWORD', 'PROFILE', $username, $currentId, null, 'User changed own password via self-service');
            echo json_encode(['success' => true, 'message' => 'เปลี่ยนรหัสผ่านสำเร็จ กรุณาเข้าสู่ระบบใหม่อีกครั้ง']);
            break;

        // ─────────────────────────────────────────────
        case 'get_activity_log':
            $stmt = $pdo->prepare("
                SELECT TOP 20
                    action, module, remark, ip_address, user_agent, created_at
                FROM SYSTEM_LOGS
                WHERE user_id = ? OR username = ?
                ORDER BY created_at DESC
            ");
            $stmt->execute([$currentId, $username]);
            $logs = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(['success' => true, 'data' => $logs]);
            break;

        // ─────────────────────────────────────────────
        default:
            throw new Exception('Invalid action specified.');
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
