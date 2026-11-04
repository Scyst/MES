<?php
// MES/Toolbox/public/api/paintChem/submit_sheet.php
// Changes sheet status DRAFT -> SUBMITTED and sets prepared_by.

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

$headerId = intval($_POST['header_id'] ?? 0);
$userId   = $_SESSION['user']['id'];

if ($headerId <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'data' => null, 'message' => 'header_id ไม่ถูกต้อง']);
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
    if ($headerRow['status'] !== 'DRAFT') {
        $pdo->rollBack();
        http_response_code(409);
        echo json_encode(['success' => false, 'data' => null, 'message' => 'ใบบันทึกนี้ถูกส่งหรืออนุมัติแล้ว']);
        exit;
    }

    $stmtUpd = $pdo->prepare("
        UPDATE dbo.PAINT_CHEM_SHEET_HEADER
        SET status         = 'SUBMITTED',
            prepared_by    = ?,
            updated_at     = GETDATE()
        WHERE header_id = ?
    ");
    $stmtUpd->execute([$userId, $headerId]);

    writeLog(
        $pdo,
        'SUBMIT_PAINT_SHEET',
        'PAINT_CHEM',
        (string)$headerId,
        ['status' => 'DRAFT'],
        ['status' => 'SUBMITTED', 'prepared_by' => $userId],
        "User submitted paint chem sheet #{$headerId} ({$headerRow['log_date']} {$headerRow['shift']})"
    );

    $pdo->commit();
    echo json_encode(['success' => true, 'data' => null, 'message' => 'ส่งใบบันทึกเรียบร้อย รอการตรวจสอบ']);

} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['success' => false, 'data' => null, 'message' => 'เกิดข้อผิดพลาดในระบบ']);
}