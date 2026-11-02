<?php
session_start();

ini_set('display_errors', 0);
error_reporting(E_ALL);

header('Content-Type: application/json; charset=utf-8');
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method Not Allowed']);
    exit;
}

require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../utils/logger.php';

// Valid Class Codes for Trainee Fast-Track (Auto-Approved)
$VALID_CLASS_CODES = [
    'SNC-B9',
    'SNC-LEARN',
    'SNC-LEARNING',
    'SNC-2026',
    'LEARN-B9',
    'SNC-ACADEMY'
];

$input = json_decode(file_get_contents("php://input"), true) ?: $_POST;

$username = trim($input['username'] ?? '');
$password = $input['password'] ?? '';
$fullname = trim($input['fullname'] ?? '');
$phone = trim($input['phone'] ?? '');
$accountType = trim($input['account_type'] ?? 'employee');
$role = trim($input['role'] ?? 'operator');
$line = trim($input['line'] ?? '');
$empId = trim($input['emp_id'] ?? '');
$companyName = trim($input['company_name'] ?? '');
$classCode = strtoupper(trim($input['class_code'] ?? ''));
$requestReason = trim($input['request_reason'] ?? '');
$requestedPerms = isset($input['requested_permissions']) && is_array($input['requested_permissions']) 
    ? $input['requested_permissions'] 
    : [];

// Input Validation
if (empty($username) || strlen($username) < 3) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'ชื่อผู้ใช้งาน (Username) ต้องมีความยาวอย่างน้อย 3 ตัวอักษร']);
    exit;
}

if (empty($password) || strlen($password) < 6) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'รหัสผ่าน (Password) ต้องมีความยาวอย่างน้อย 6 ตัวอักษร']);
    exit;
}

if (empty($fullname)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'กรุณากรอกชื่อ-นามสกุลจริง']);
    exit;
}

try {
    // 1. Check duplicate username
    $checkStmt = $pdo->prepare("SELECT COUNT(*) FROM dbo.USERS WHERE username = ?");
    $checkStmt->execute([$username]);
    if ($checkStmt->fetchColumn() > 0) {
        http_response_code(409);
        echo json_encode(['success' => false, 'message' => 'ชื่อผู้ใช้งานนี้มีอยู่ในระบบแล้ว กรุณาเลือกชื่อผู้ใช้งานอื่น']);
        exit;
    }

    // 2. Determine Approval Status and Expiry
    $isAutoApproved = false;
    $approvalStatus = 'pending';
    $assignedRole = $role;
    $expiresAt = null;

    if ($accountType === 'trainee') {
        $assignedRole = 'trainee';
        // Check if class code is valid
        if (!empty($classCode) && in_array($classCode, $VALID_CLASS_CODES)) {
            $isAutoApproved = true;
            $approvalStatus = 'approved';
            // Default 30-day access for class trainees
            $expiresAt = date('Y-m-d H:i:s', strtotime('+30 days'));
            $requestReason = "Auto-approved via Class Code: {$classCode}";
        } else {
            $approvalStatus = 'pending';
            $requestReason = !empty($classCode) ? "รหัสคลาสไม่ตรง: {$classCode} (รอตรวจสอบ)" : "ไม่ได้ระบุรหัสคลาส (รออนุมัติ)";
        }
    } else {
        // Factory employees / Contractors / Customers / Executives require Admin Approval
        $approvalStatus = 'pending';
        // Format request reason with requested permissions if any
        if (!empty($requestedPerms)) {
            $permsList = implode(', ', array_map('htmlspecialchars', $requestedPerms));
            $requestReason = "[ขอสิทธิ์เพิ่ม: {$permsList}] " . $requestReason;
        }
    }

    $passwordHash = password_hash($password, PASSWORD_DEFAULT);

    // 3. Insert into dbo.USERS
    $insertSql = "INSERT INTO dbo.USERS (
        username, password, fullname, role, line, emp_id, phone,
        account_type, approval_status, expires_at, company_name, request_reason,
        is_active, is_auto_generated, created_at, approved_at, approved_by
    ) VALUES (
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        1, 0, GETDATE(), ?, ?
    )";

    $approvedAt = $isAutoApproved ? date('Y-m-d H:i:s') : null;
    $approvedBy = $isAutoApproved ? 'SYSTEM_FAST_TRACK' : null;

    $insertStmt = $pdo->prepare($insertSql);
    $insertStmt->execute([
        $username,
        $passwordHash,
        $fullname,
        $assignedRole,
        $line ?: null,
        $empId ?: null,
        $phone ?: null,
        $accountType,
        $approvalStatus,
        $expiresAt,
        $companyName ?: null,
        $requestReason ?: null,
        $approvedAt,
        $approvedBy
    ]);

    $newUserId = (int)$pdo->lastInsertId();

    // 4. If Trainee auto-approved, ensure trainee permissions are mapped
    if ($isAutoApproved && $newUserId) {
        // SYS_ROLE_PERMISSIONS already maps role 'trainee' to view_learning_hub & take_exam_learning_hub
        // But we can also insert explicit user permissions if requested
    }

    // 5. Audit Log
    try {
        $logAction = $isAutoApproved ? 'REGISTER_AUTO_APPROVED' : 'REGISTER_PENDING';
        $logStmt = $pdo->prepare("INSERT INTO dbo.SYSTEM_LOGS (username, role, action, module, ref_id, ip_address, user_agent, remark, created_at) VALUES (?, ?, ?, 'AUTH', ?, ?, ?, ?, GETDATE())");
        $logStmt->execute([
            $username,
            $assignedRole,
            $logAction,
            $newUserId,
            $_SERVER['REMOTE_ADDR'] ?? 'UNKNOWN',
            $_SERVER['HTTP_USER_AGENT'] ?? 'UNKNOWN',
            "Registration type: {$accountType}, status: {$approvalStatus}"
        ]);
    } catch (Exception $e) {}

    // 6. Response
    if ($isAutoApproved) {
        echo json_encode([
            'success' => true,
            'auto_approved' => true,
            'message' => 'ลงทะเบียนสำเร็จ! รหัสห้องเรียนถูกต้อง คุณสามารถเข้าสู่ระบบเพื่อเริ่มเรียนได้ทันที',
            'username' => $username,
            'account_type' => $accountType,
            'expires_at' => $expiresAt
        ]);
    } else {
        echo json_encode([
            'success' => true,
            'auto_approved' => false,
            'message' => 'ส่งคำขอลงทะเบียนเรียบร้อยแล้ว บัญชีของท่านอยู่ระหว่างรอการอนุมัติจากผู้ดูแลระบบ',
            'username' => $username,
            'account_type' => $accountType
        ]);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'เกิดข้อผิดพลาดในการบันทึกข้อมูล: ' . $e->getMessage()]);
}
