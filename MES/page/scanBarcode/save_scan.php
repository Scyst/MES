<?php
// ============================================
// API: บันทึกข้อมูลการสแกนเข้า SQL Server
// ============================================
// ปิด error display ป้องกัน PHP warning ปนออกมากับ JSON
ini_set('display_errors', 0);
error_reporting(0);

require_once 'config.php';
setApiHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);

if (!is_array($input)) {
    echo json_encode(['success' => false, 'message' => 'Invalid request body']);
    exit;
}

$barcode         = trim($input['barcode']          ?? '');
$sap             = trim($input['sap']              ?? '');
$lot_ref         = trim($input['lot_ref']          ?? '');
$location_id     = trim($input['location_id']      ?? '');
$location_name   = trim($input['location_name']    ?? '');
$production_type = strtoupper(trim($input['type']  ?? 'FG'));
$notes           = trim($input['notes']            ?? '');

// Validate
$errors = [];
if (empty($barcode))     $errors[] = 'Barcode';
if (empty($lot_ref))     $errors[] = 'Lot/Ref';
if (empty($location_id)) $errors[] = 'Location';

if (!empty($errors)) {
    echo json_encode([
        'success' => false,
        'message' => 'กรุณากรอกข้อมูล: ' . implode(', ', $errors)
    ]);
    exit;
}

if (!in_array($production_type, ['FG', 'HOLD', 'SCRAP'])) {
    $production_type = 'FG';
}

try {
    $pdo = getDBConnection();

    // INSERT ตรงๆ ไม่ใช้ OUTPUT INSERTED เพราะ sqlsrv PDO มีปัญหา result set
    $sql = "INSERT INTO " . TBL_SCAN_LOGS . " (
                " . COL_LOG_BARCODE    . ",
                " . COL_LOG_SAP        . ",
                " . COL_LOG_LOTREF     . ",
                " . COL_LOG_LOC_ID     . ",
                " . COL_LOG_LOC_NAME   . ",
                " . COL_LOG_PROD_TYPE  . ",
                " . COL_LOG_LOGDATE    . ",
                " . COL_LOG_NOTES      . "
            )
            VALUES (:barcode, :sap, :lot_ref, :location_id, :location_name,
                    :production_type, GETDATE(), :notes)";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':barcode'         => $barcode,
        ':sap'             => $sap,
        ':lot_ref'         => $lot_ref,
        ':location_id'     => $location_id,
        ':location_name'   => $location_name,
        ':production_type' => $production_type,
        ':notes'           => $notes,
    ]);

    // ดึงเวลาจาก SQL Server โดยตรง (ไม่ใช้ PHP date() เพราะ timezone ต่างกัน)
    $timeRow = $pdo->query("SELECT CONVERT(varchar(19), GETDATE(), 120) AS now")->fetch();
    $logdate  = $timeRow ? $timeRow['now'] : '';

    echo json_encode([
        'success' => true,
        'message' => 'บันทึกข้อมูลสำเร็จ',
        'data'    => [
            'barcode'         => $barcode,
            'sap'             => $sap,
            'lot_ref'         => $lot_ref,
            'location_id'     => $location_id,
            'location_name'   => $location_name,
            'production_type' => $production_type,
            'logdate'         => $logdate,
            'notes'           => $notes,
        ]
    ]);
} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Error: ' . $e->getMessage()
    ]);
}
