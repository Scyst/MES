<?php
// MES/Toolbox/public/api/paintChem/unlock_sheet.php
// Changes sheet status SUBMITTED -> DRAFT.

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

// Check Permissions
$role = $_SESSION['user']['role'] ?? '';
$isAllowed = hasPermission('unlock_paint_chem') || in_array(strtolower($role), ['admin', 'creator', 'superadmin']);

if (!$isAllowed) {
    http_response_code(403);
    echo json_encode(['success' => false, 'data' => null, 'message' => 'คุณไม่มีสิทธิ์ปลดล็อกเอกสาร']);
    exit;
}

// CSRF guard
$clientToken = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? $_POST['csrf_token'] ?? '';
$serverToken = $_SESSION['csrf_token'] ?? '';
if (empty($clientToken) || empty($serverToken) || !hash_equals($serverToken, $clientToken)) {
    http_response_code(403);
    echo json_encode(['success' => false, 'data' => null, 'message' => 'Security Error: Invalid CSRF Token']);
    exit;
}

$headerId = intval($_POST['header_id'] ?? 0);
$userId = $_SESSION['user']['id'];

if ($headerId <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'data' => null, 'message' => 'Invalid header_id']);
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
        echo json_encode(['success' => false, 'data' => null, 'message' => 'Sheet not found']);
        exit;
    }
    if ($headerRow['status'] === 'APPROVED') {
        $pdo->rollBack();
        http_response_code(409);
        echo json_encode(['success' => false, 'data' => null, 'message' => 'Approved sheet cannot be unlocked']);
        exit;
    }

    $oldStatus = $headerRow['status'];

    $stmtUpd = $pdo->prepare("
        UPDATE dbo.PAINT_CHEM_SHEET_HEADER
        SET status         = 'DRAFT',
            updated_at     = GETDATE()
        WHERE header_id = ?
    ");
    $stmtUpd->execute([$headerId]);

    writeLog(
        $pdo,
        'UNLOCK_PAINT_SHEET',
        'PAINT_CHEM',
        (string)$headerId,
        ['status' => $oldStatus],
        ['status' => 'DRAFT'],
        "Supervisor unlocked paint chem sheet #{$headerId} ({$headerRow['log_date']} {$headerRow['shift']})"
    );

    $pdo->commit();
    echo json_encode(['success' => true, 'data' => null, 'message' => 'Sheet unlocked']);

} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['success' => false, 'data' => null, 'message' => 'Server Error: ' . $e->getMessage()]);
}