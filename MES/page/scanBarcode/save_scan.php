<?php
// ============================================
// API: บันทึกข้อมูลการสแกนเข้า SQL Server
// ============================================
require_once 'config.php';
setApiHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);

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
if (empty($sap))         $errors[] = 'SAP';
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
            OUTPUT INSERTED.transaction_id
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

    $insertId = $stmt->fetchColumn();

    $sql = "SELECT
                transaction_id,
                " . COL_LOG_BARCODE   . " AS barcode,
                " . COL_LOG_SAP       . " AS sap,
                " . COL_LOG_LOTREF    . " AS lot_ref,
                " . COL_LOG_LOC_ID    . " AS location_id,
                " . COL_LOG_LOC_NAME  . " AS location_name,
                " . COL_LOG_PROD_TYPE . " AS production_type,
                CONVERT(varchar(19), " . COL_LOG_LOGDATE . ", 120) AS logdate,
                " . COL_LOG_NOTES     . " AS notes,
                CONVERT(varchar(19), created_at, 120) AS created_at
            FROM " . TBL_SCAN_LOGS . "
            WHERE transaction_id = :id";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([':id' => $insertId]);
    $saved = $stmt->fetch();

    echo json_encode([
        'success' => true,
        'message' => 'บันทึกข้อมูลสำเร็จ',
        'data'    => $saved
    ]);
} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Error: ' . $e->getMessage()
    ]);
}
