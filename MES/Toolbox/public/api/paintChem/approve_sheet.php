<?php
// MES/Toolbox/public/api/paintChem/approve_sheet.php
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

require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../utils/check_auth.php';
require_once __DIR__ . '/../../utils/logger.php';

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
    echo json_encode(['success' => false, 'data' => null, 'message' => 'คุณไม่มีสิทธิ์ดำเนินการนี้']);
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

    $stmt = $pdo->prepare("SELECT status, log_date, shift FROM dbo.PAINT_CHEM_SHEET_HEADER WHERE header_id = ?");
    $stmt->execute([$headerId]);
    $headerRow = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$headerRow) {
        $pdo->rollBack();
        http_response_code(404);
        echo json_encode(['success' => false, 'data' => null, 'message' => 'ไม่พบใบบันทึก']);
        exit;
    }

    $currentStatus = $headerRow['status'];
    $allowedTransitions = [
        'check'   => 'SUBMITTED',
        'approve' => 'SUBMITTED',
    ];

    if ($currentStatus !== $allowedTransitions[$action]) {
        $pdo->rollBack();
        http_response_code(409);
        echo json_encode(['success' => false, 'data' => null, 'message' => 'สถานะใบบันทึกไม่อนุญาตให้ดำเนินการ']);
        exit;
    }

    if ($action === 'check') {
        $stmtUpd = $pdo->prepare("
            UPDATE dbo.PAINT_CHEM_SHEET_HEADER
            SET checked_by = ?, updated_at = GETDATE()
            WHERE header_id = ?
        ");
        $stmtUpd->execute([$userId, $headerId]);
        $newStatus = $currentStatus;
        $msg = 'ตรวจสอบเรียบร้อย';
    } else {
        $stmtUpd = $pdo->prepare("
            UPDATE dbo.PAINT_CHEM_SHEET_HEADER
            SET approved_by = ?, status = 'APPROVED', updated_at = GETDATE()
            WHERE header_id = ?
        ");
        $stmtUpd->execute([$userId, $headerId]);
        $newStatus = 'APPROVED';
        $msg = 'อนุมัติใบบันทึกเรียบร้อย';
    }

    $logAction = ($action === 'check') ? 'CHECK_PAINT_SHEET' : 'APPROVE_PAINT_SHEET';
    writeLog(
        $pdo,
        $logAction,
        'PAINT_CHEM',
        (string)$headerId,
        ['status' => $currentStatus, 'checked_by' => $headerRow['checked_by'] ?? null],
        ['status' => $newStatus, 'approved_by' => $userId],
        "Supervisor {$action}ed paint chem sheet #{$headerId} ({$headerRow['log_date']} {$headerRow['shift']})"
    );

    $pdo->commit();
    echo json_encode(['success' => true, 'data' => null, 'message' => $msg]);

} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['success' => false, 'data' => null, 'message' => 'เกิดข้อผิดพลาดในระบบ']);
}