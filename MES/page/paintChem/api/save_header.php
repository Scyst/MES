<?php
// MES/page/paintChem/api/save_header.php
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

$clientToken = $_POST['csrf_token'] ?? '';
$serverToken = $_SESSION['csrf_token'] ?? '';
if (empty($clientToken) || empty($serverToken) || !hash_equals($serverToken, $clientToken)) {
    http_response_code(403);
    echo json_encode(['success' => false, 'data' => null, 'message' => 'Security Error: CSRF Token ไม่ถูกต้อง']);
    exit;
}

$headerId = intval($_POST['header_id'] ?? 0);
$conveyorSpeed = isset($_POST['conveyor_speed']) && $_POST['conveyor_speed'] !== '' ? floatval($_POST['conveyor_speed']) : null;
$bakeOvenTemp  = isset($_POST['bake_oven_temp']) && $_POST['bake_oven_temp'] !== '' ? floatval($_POST['bake_oven_temp']) : null;
$dryOvenTemp   = isset($_POST['dry_oven_temp']) && $_POST['dry_oven_temp'] !== '' ? floatval($_POST['dry_oven_temp']) : null;
$note          = htmlspecialchars(trim($_POST['note'] ?? ''), ENT_QUOTES, 'UTF-8');

if ($headerId <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'data' => null, 'message' => 'header_id ไม่ถูกต้อง']);
    exit;
}

try {
    $stmt = $pdo->prepare("SELECT status FROM dbo.PAINT_CHEM_SHEET_HEADER WHERE header_id = ?");
    $stmt->execute([$headerId]);
    $current = $stmt->fetchColumn();

    if ($current === false) {
        http_response_code(404);
        echo json_encode(['success' => false, 'data' => null, 'message' => 'ไม่พบใบบันทึก']);
        exit;
    }
    // We can allow saving note even if SUBMITTED? Usually submitted means locked.
    // The user said "แก้ไขได้ทั้งวัน" -> mostly DRAFT. If submitted, they shouldn't edit unless approved.
    if ($current !== 'DRAFT') {
        http_response_code(409);
        echo json_encode(['success' => false, 'data' => null, 'message' => 'ใบบันทึกถูกส่งไปแล้ว ไม่สามารถแก้ไขได้']);
        exit;
    }

    $stmtUpd = $pdo->prepare("
        UPDATE dbo.PAINT_CHEM_SHEET_HEADER
        SET conveyor_speed = ?,
            bake_oven_temp = ?,
            dry_oven_temp  = ?,
            note           = ?,
            updated_at     = GETDATE()
        WHERE header_id = ?
    ");
    $stmtUpd->execute([$conveyorSpeed, $bakeOvenTemp, $dryOvenTemp, $note, $headerId]);

    echo json_encode(['success' => true, 'data' => null, 'message' => 'บันทึกข้อมูลส่วนหัวสำเร็จ']);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'data' => null, 'message' => 'System Error']);
}
