<?php
// MES/page/paintChem/api/approve_sheet.php
// Supervisor: sets checked_by or approved_by, transitions status accordingly.

header('Content-Type: application/json; charset=utf-8');
$origin = <?php
// MES/page/paintChem/api/approve_sheet.php
// Supervisor: sets checked_by or approved_by, transitions status accordingly.

header('Content-Type: application/json; charset=utf-8');
$origin = $_SERVER['HTTP_ORIGIN'] ?? 'https://oem.sncformer.com';
header("Access-Control-Allow-Origin: $origin");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, X-CSRF-TOKEN");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}
require_once '../../db.php';
require_once '../../../auth/check_auth.php';
requireLogin();

// CSRF guard
$clientToken = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? $_POST['csrf_token'] ?? '';
$serverToken = $_SESSION['csrf_token'] ?? '';
if (empty($clientToken) || empty($serverToken) || !hash_equals($serverToken, $clientToken)) {
    http_response_code(403);
    echo json_encode(['success' => false, 'data' => null, 'message' => 'Security Error: CSRF Token ไม่ถูกต้อง']);
    exit;
}

// Role check — supervisor and above only
$allowedRoles = ['supervisor', 'manager', 'admin', 'superadmin'];
$userRole = strtolower($_SESSION['user']['role'] ?? '');
if (!in_array($userRole, $allowedRoles)) {
    http_response_code(403);
    echo json_encode(['success' => false, 'data' => null, 'message' => 'ไม่มีสิทธิ์ดำเนินการนี้']);
    exit;
}

$headerId = intval($_POST['header_id'] ?? 0);
$action   = trim($_POST['action'] ?? '');  // 'check' | 'approve'
$userId   = $_SESSION['user']['id'];

if ($headerId <= 0 || !in_array($action, ['check', 'approve'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'data' => null, 'message' => 'ข้อมูลไม่ครบถ้วน']);
    exit;
}

try {
    $pdo->beginTransaction();

    $stmt = $pdo->prepare("SELECT status FROM dbo.PAINT_CHEM_SHEET_HEADER WHERE header_id = ?");
    $stmt->execute([$headerId]);
    $currentStatus = $stmt->fetchColumn();

    if ($currentStatus === false) {
        $pdo->rollBack();
        http_response_code(404);
        echo json_encode(['success' => false, 'data' => null, 'message' => 'ไม่พบใบบันทึก']);
        exit;
    }

    $allowedTransitions = [
        'check'   => 'SUBMITTED',
        'approve' => 'SUBMITTED',
    ];

    if ($currentStatus !== $allowedTransitions[$action]) {
        $pdo->rollBack();
        http_response_code(409);
        echo json_encode(['success' => false, 'data' => null, 'message' => 'สถานะใบบันทึกไม่อนุญาตให้ดำเนินการนี้']);
        exit;
    }

    if ($action === 'check') {
        $stmtUpd = $pdo->prepare("
            UPDATE dbo.PAINT_CHEM_SHEET_HEADER
            SET checked_by = ?, updated_at = GETDATE()
            WHERE header_id = ?
        ");
        $stmtUpd->execute([$userId, $headerId]);
        $msg = 'ตรวจสอบเรียบร้อยแล้ว';
    } else {
        $stmtUpd = $pdo->prepare("
            UPDATE dbo.PAINT_CHEM_SHEET_HEADER
            SET approved_by = ?, status = 'APPROVED', updated_at = GETDATE()
            WHERE header_id = ?
        ");
        $stmtUpd->execute([$userId, $headerId]);
        $msg = 'อนุมัติใบบันทึกเรียบร้อยแล้ว';
    }

    $pdo->commit();
    echo json_encode(['success' => true, 'data' => null, 'message' => $msg]);

} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['success' => false, 'data' => null, 'message' => 'เกิดข้อผิดพลาดภายในระบบ']);
}

SERVER['HTTP_ORIGIN'] ?? '*';
header("Access-Control-Allow-Origin: $origin");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, X-CSRF-TOKEN");
if (<?php
// MES/page/paintChem/api/approve_sheet.php
// Supervisor: sets checked_by or approved_by, transitions status accordingly.

header('Content-Type: application/json; charset=utf-8');
$origin = $_SERVER['HTTP_ORIGIN'] ?? 'https://oem.sncformer.com';
header("Access-Control-Allow-Origin: $origin");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, X-CSRF-TOKEN");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}
require_once '../../db.php';
require_once '../../../auth/check_auth.php';
requireLogin();

// CSRF guard
$clientToken = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? $_POST['csrf_token'] ?? '';
$serverToken = $_SESSION['csrf_token'] ?? '';
if (empty($clientToken) || empty($serverToken) || !hash_equals($serverToken, $clientToken)) {
    http_response_code(403);
    echo json_encode(['success' => false, 'data' => null, 'message' => 'Security Error: CSRF Token ไม่ถูกต้อง']);
    exit;
}

// Role check — supervisor and above only
$allowedRoles = ['supervisor', 'manager', 'admin', 'superadmin'];
$userRole = strtolower($_SESSION['user']['role'] ?? '');
if (!in_array($userRole, $allowedRoles)) {
    http_response_code(403);
    echo json_encode(['success' => false, 'data' => null, 'message' => 'ไม่มีสิทธิ์ดำเนินการนี้']);
    exit;
}

$headerId = intval($_POST['header_id'] ?? 0);
$action   = trim($_POST['action'] ?? '');  // 'check' | 'approve'
$userId   = $_SESSION['user']['id'];

if ($headerId <= 0 || !in_array($action, ['check', 'approve'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'data' => null, 'message' => 'ข้อมูลไม่ครบถ้วน']);
    exit;
}

try {
    $pdo->beginTransaction();

    $stmt = $pdo->prepare("SELECT status FROM dbo.PAINT_CHEM_SHEET_HEADER WHERE header_id = ?");
    $stmt->execute([$headerId]);
    $currentStatus = $stmt->fetchColumn();

    if ($currentStatus === false) {
        $pdo->rollBack();
        http_response_code(404);
        echo json_encode(['success' => false, 'data' => null, 'message' => 'ไม่พบใบบันทึก']);
        exit;
    }

    $allowedTransitions = [
        'check'   => 'SUBMITTED',
        'approve' => 'SUBMITTED',
    ];

    if ($currentStatus !== $allowedTransitions[$action]) {
        $pdo->rollBack();
        http_response_code(409);
        echo json_encode(['success' => false, 'data' => null, 'message' => 'สถานะใบบันทึกไม่อนุญาตให้ดำเนินการนี้']);
        exit;
    }

    if ($action === 'check') {
        $stmtUpd = $pdo->prepare("
            UPDATE dbo.PAINT_CHEM_SHEET_HEADER
            SET checked_by = ?, updated_at = GETDATE()
            WHERE header_id = ?
        ");
        $stmtUpd->execute([$userId, $headerId]);
        $msg = 'ตรวจสอบเรียบร้อยแล้ว';
    } else {
        $stmtUpd = $pdo->prepare("
            UPDATE dbo.PAINT_CHEM_SHEET_HEADER
            SET approved_by = ?, status = 'APPROVED', updated_at = GETDATE()
            WHERE header_id = ?
        ");
        $stmtUpd->execute([$userId, $headerId]);
        $msg = 'อนุมัติใบบันทึกเรียบร้อยแล้ว';
    }

    $pdo->commit();
    echo json_encode(['success' => true, 'data' => null, 'message' => $msg]);

} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['success' => false, 'data' => null, 'message' => 'เกิดข้อผิดพลาดภายในระบบ']);
}

SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}
require_once '../../db.php';
require_once '../../../auth/check_auth.php';
requireLogin();

// CSRF guard
$clientToken = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? $_POST['csrf_token'] ?? '';
$serverToken = $_SESSION['csrf_token'] ?? '';
if (empty($clientToken) || empty($serverToken) || !hash_equals($serverToken, $clientToken)) {
    http_response_code(403);
    echo json_encode(['success' => false, 'data' => null, 'message' => 'Security Error: CSRF Token ไม่ถูกต้อง']);
    exit;
}

// Role check — supervisor and above only
$allowedRoles = ['supervisor', 'manager', 'admin', 'superadmin'];
$userRole = strtolower($_SESSION['user']['role'] ?? '');
if (!in_array($userRole, $allowedRoles)) {
    http_response_code(403);
    echo json_encode(['success' => false, 'data' => null, 'message' => 'ไม่มีสิทธิ์ดำเนินการนี้']);
    exit;
}

$headerId = intval($_POST['header_id'] ?? 0);
$action   = trim($_POST['action'] ?? '');  // 'check' | 'approve'
$userId   = $_SESSION['user']['id'];

if ($headerId <= 0 || !in_array($action, ['check', 'approve'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'data' => null, 'message' => 'ข้อมูลไม่ครบถ้วน']);
    exit;
}

try {
    $pdo->beginTransaction();

    $stmt = $pdo->prepare("SELECT status FROM dbo.PAINT_CHEM_SHEET_HEADER WHERE header_id = ?");
    $stmt->execute([$headerId]);
    $currentStatus = $stmt->fetchColumn();

    if ($currentStatus === false) {
        $pdo->rollBack();
        http_response_code(404);
        echo json_encode(['success' => false, 'data' => null, 'message' => 'ไม่พบใบบันทึก']);
        exit;
    }

    $allowedTransitions = [
        'check'   => 'SUBMITTED',
        'approve' => 'SUBMITTED',
    ];

    if ($currentStatus !== $allowedTransitions[$action]) {
        $pdo->rollBack();
        http_response_code(409);
        echo json_encode(['success' => false, 'data' => null, 'message' => 'สถานะใบบันทึกไม่อนุญาตให้ดำเนินการนี้']);
        exit;
    }

    if ($action === 'check') {
        $stmtUpd = $pdo->prepare("
            UPDATE dbo.PAINT_CHEM_SHEET_HEADER
            SET checked_by = ?, updated_at = GETDATE()
            WHERE header_id = ?
        ");
        $stmtUpd->execute([$userId, $headerId]);
        $msg = 'ตรวจสอบเรียบร้อยแล้ว';
    } else {
        $stmtUpd = $pdo->prepare("
            UPDATE dbo.PAINT_CHEM_SHEET_HEADER
            SET approved_by = ?, status = 'APPROVED', updated_at = GETDATE()
            WHERE header_id = ?
        ");
        $stmtUpd->execute([$userId, $headerId]);
        $msg = 'อนุมัติใบบันทึกเรียบร้อยแล้ว';
    }

    $pdo->commit();
    echo json_encode(['success' => true, 'data' => null, 'message' => $msg]);

} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['success' => false, 'data' => null, 'message' => 'เกิดข้อผิดพลาดภายในระบบ']);
}



