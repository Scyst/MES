<?php
// MES/page/paintChem/api/submit_sheet.php
// Changes sheet status DRAFT -> SUBMITTED and sets prepared_by.

header('Content-Type: application/json; charset=utf-8');
$origin = <?php
// MES/page/paintChem/api/submit_sheet.php
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

$headerId = intval($_POST['header_id'] ?? 0);
$conveyorSpeed = isset($_POST['conveyor_speed']) && $_POST['conveyor_speed'] !== '' ? floatval($_POST['conveyor_speed']) : null;
$bakeOvenTemp  = isset($_POST['bake_oven_temp'])  && $_POST['bake_oven_temp']  !== '' ? floatval($_POST['bake_oven_temp'])  : null;
$dryOvenTemp   = isset($_POST['dry_oven_temp'])   && $_POST['dry_oven_temp']   !== '' ? floatval($_POST['dry_oven_temp'])   : null;
$note          = htmlspecialchars(trim($_POST['note'] ?? ''), ENT_QUOTES, 'UTF-8');
$userId        = $_SESSION['user']['id'];

if ($headerId <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'data' => null, 'message' => 'header_id ไม่ถูกต้อง']);
    exit;
}

// Validate Painting Condition ranges
$errors = [];
if ($conveyorSpeed !== null && ($conveyorSpeed < 2.5 || $conveyorSpeed > 5.0)) $errors[] = 'Speed Conveyor ต้องอยู่ระหว่าง 2.5–5.0 m/min';
if ($bakeOvenTemp  !== null && ($bakeOvenTemp  < 175  || $bakeOvenTemp  > 220)) $errors[] = 'Bake Oven Temp ต้องอยู่ระหว่าง 175–220 °C';
if ($dryOvenTemp   !== null && ($dryOvenTemp   < 140  || $dryOvenTemp   > 160)) $errors[] = 'Dry Oven Temp ต้องอยู่ระหว่าง 140–160 °C';
if (!empty($errors)) {
    http_response_code(422);
    echo json_encode(['success' => false, 'data' => null, 'message' => implode(', ', $errors)]);
    exit;
}

try {
    $pdo->beginTransaction();

    $stmt = $pdo->prepare("SELECT status FROM dbo.PAINT_CHEM_SHEET_HEADER WHERE header_id = ?");
    $stmt->execute([$headerId]);
    $current = $stmt->fetchColumn();

    if ($current === false) {
        $pdo->rollBack();
        http_response_code(404);
        echo json_encode(['success' => false, 'data' => null, 'message' => 'ไม่พบใบบันทึกนี้']);
        exit;
    }
    if ($current !== 'DRAFT') {
        $pdo->rollBack();
        http_response_code(409);
        echo json_encode(['success' => false, 'data' => null, 'message' => 'ใบนี้ถูกส่งหรืออนุมัติแล้ว']);
        exit;
    }

    $stmtUpd = $pdo->prepare("
        UPDATE dbo.PAINT_CHEM_SHEET_HEADER
        SET status         = 'SUBMITTED',
            prepared_by    = ?,
            conveyor_speed = ?,
            bake_oven_temp = ?,
            dry_oven_temp  = ?,
            note           = ?,
            updated_at     = GETDATE()
        WHERE header_id = ?
    ");
    $stmtUpd->execute([$userId, $conveyorSpeed, $bakeOvenTemp, $dryOvenTemp, $note, $headerId]);

    $pdo->commit();
    echo json_encode(['success' => true, 'data' => null, 'message' => 'ส่งใบบันทึกเรียบร้อย รอการตรวจสอบ']);

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
// MES/page/paintChem/api/submit_sheet.php
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

$headerId = intval($_POST['header_id'] ?? 0);
$conveyorSpeed = isset($_POST['conveyor_speed']) && $_POST['conveyor_speed'] !== '' ? floatval($_POST['conveyor_speed']) : null;
$bakeOvenTemp  = isset($_POST['bake_oven_temp'])  && $_POST['bake_oven_temp']  !== '' ? floatval($_POST['bake_oven_temp'])  : null;
$dryOvenTemp   = isset($_POST['dry_oven_temp'])   && $_POST['dry_oven_temp']   !== '' ? floatval($_POST['dry_oven_temp'])   : null;
$note          = htmlspecialchars(trim($_POST['note'] ?? ''), ENT_QUOTES, 'UTF-8');
$userId        = $_SESSION['user']['id'];

if ($headerId <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'data' => null, 'message' => 'header_id ไม่ถูกต้อง']);
    exit;
}

// Validate Painting Condition ranges
$errors = [];
if ($conveyorSpeed !== null && ($conveyorSpeed < 2.5 || $conveyorSpeed > 5.0)) $errors[] = 'Speed Conveyor ต้องอยู่ระหว่าง 2.5–5.0 m/min';
if ($bakeOvenTemp  !== null && ($bakeOvenTemp  < 175  || $bakeOvenTemp  > 220)) $errors[] = 'Bake Oven Temp ต้องอยู่ระหว่าง 175–220 °C';
if ($dryOvenTemp   !== null && ($dryOvenTemp   < 140  || $dryOvenTemp   > 160)) $errors[] = 'Dry Oven Temp ต้องอยู่ระหว่าง 140–160 °C';
if (!empty($errors)) {
    http_response_code(422);
    echo json_encode(['success' => false, 'data' => null, 'message' => implode(', ', $errors)]);
    exit;
}

try {
    $pdo->beginTransaction();

    $stmt = $pdo->prepare("SELECT status FROM dbo.PAINT_CHEM_SHEET_HEADER WHERE header_id = ?");
    $stmt->execute([$headerId]);
    $current = $stmt->fetchColumn();

    if ($current === false) {
        $pdo->rollBack();
        http_response_code(404);
        echo json_encode(['success' => false, 'data' => null, 'message' => 'ไม่พบใบบันทึกนี้']);
        exit;
    }
    if ($current !== 'DRAFT') {
        $pdo->rollBack();
        http_response_code(409);
        echo json_encode(['success' => false, 'data' => null, 'message' => 'ใบนี้ถูกส่งหรืออนุมัติแล้ว']);
        exit;
    }

    $stmtUpd = $pdo->prepare("
        UPDATE dbo.PAINT_CHEM_SHEET_HEADER
        SET status         = 'SUBMITTED',
            prepared_by    = ?,
            conveyor_speed = ?,
            bake_oven_temp = ?,
            dry_oven_temp  = ?,
            note           = ?,
            updated_at     = GETDATE()
        WHERE header_id = ?
    ");
    $stmtUpd->execute([$userId, $conveyorSpeed, $bakeOvenTemp, $dryOvenTemp, $note, $headerId]);

    $pdo->commit();
    echo json_encode(['success' => true, 'data' => null, 'message' => 'ส่งใบบันทึกเรียบร้อย รอการตรวจสอบ']);

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

$headerId = intval($_POST['header_id'] ?? 0);
$conveyorSpeed = isset($_POST['conveyor_speed']) && $_POST['conveyor_speed'] !== '' ? floatval($_POST['conveyor_speed']) : null;
$bakeOvenTemp  = isset($_POST['bake_oven_temp'])  && $_POST['bake_oven_temp']  !== '' ? floatval($_POST['bake_oven_temp'])  : null;
$dryOvenTemp   = isset($_POST['dry_oven_temp'])   && $_POST['dry_oven_temp']   !== '' ? floatval($_POST['dry_oven_temp'])   : null;
$note          = htmlspecialchars(trim($_POST['note'] ?? ''), ENT_QUOTES, 'UTF-8');
$userId        = $_SESSION['user']['id'];

if ($headerId <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'data' => null, 'message' => 'header_id ไม่ถูกต้อง']);
    exit;
}

// Validate Painting Condition ranges
$errors = [];
if ($conveyorSpeed !== null && ($conveyorSpeed < 2.5 || $conveyorSpeed > 5.0)) $errors[] = 'Speed Conveyor ต้องอยู่ระหว่าง 2.5–5.0 m/min';
if ($bakeOvenTemp  !== null && ($bakeOvenTemp  < 175  || $bakeOvenTemp  > 220)) $errors[] = 'Bake Oven Temp ต้องอยู่ระหว่าง 175–220 °C';
if ($dryOvenTemp   !== null && ($dryOvenTemp   < 140  || $dryOvenTemp   > 160)) $errors[] = 'Dry Oven Temp ต้องอยู่ระหว่าง 140–160 °C';
if (!empty($errors)) {
    http_response_code(422);
    echo json_encode(['success' => false, 'data' => null, 'message' => implode(', ', $errors)]);
    exit;
}

try {
    $pdo->beginTransaction();

    $stmt = $pdo->prepare("SELECT status FROM dbo.PAINT_CHEM_SHEET_HEADER WHERE header_id = ?");
    $stmt->execute([$headerId]);
    $current = $stmt->fetchColumn();

    if ($current === false) {
        $pdo->rollBack();
        http_response_code(404);
        echo json_encode(['success' => false, 'data' => null, 'message' => 'ไม่พบใบบันทึกนี้']);
        exit;
    }
    if ($current !== 'DRAFT') {
        $pdo->rollBack();
        http_response_code(409);
        echo json_encode(['success' => false, 'data' => null, 'message' => 'ใบนี้ถูกส่งหรืออนุมัติแล้ว']);
        exit;
    }

    $stmtUpd = $pdo->prepare("
        UPDATE dbo.PAINT_CHEM_SHEET_HEADER
        SET status         = 'SUBMITTED',
            prepared_by    = ?,
            conveyor_speed = ?,
            bake_oven_temp = ?,
            dry_oven_temp  = ?,
            note           = ?,
            updated_at     = GETDATE()
        WHERE header_id = ?
    ");
    $stmtUpd->execute([$userId, $conveyorSpeed, $bakeOvenTemp, $dryOvenTemp, $note, $headerId]);

    $pdo->commit();
    echo json_encode(['success' => true, 'data' => null, 'message' => 'ส่งใบบันทึกเรียบร้อย รอการตรวจสอบ']);

} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['success' => false, 'data' => null, 'message' => 'เกิดข้อผิดพลาดภายในระบบ']);
}



