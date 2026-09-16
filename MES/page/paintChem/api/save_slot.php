<?php
// MES/page/paintChem/api/save_slot.php
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

$clientToken = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? $_POST['csrf_token'] ?? '';
$serverToken = $_SESSION['csrf_token'] ?? '';
if (empty($clientToken) || empty($serverToken) || !hash_equals($serverToken, $clientToken)) {
    http_response_code(403);
    echo json_encode(['success' => false, 'data' => null, 'message' => 'Security Error: CSRF Token mismatch']);
    exit;
}

const PARAM_STANDARDS = [
    'F_Al'         => ['min' => 10.0,  'max' => 12.0],
    'Temperature'  => ['min' => 25.0,  'max' => 35.0],
    'Pressure'     => ['min' => 0.4,   'max' => 0.8],
    'Conta_WR1'    => ['min' => null,  'max' => 8.0],
    'Conta_WR2'    => ['min' => null,  'max' => 1.0],
    'pH'           => ['min' => 9.0,   'max' => 11.0],
    'TC'           => ['min' => 2.0,   'max' => 4.0],
    'FA'           => ['min' => 0.3,   'max' => 0.5],
    'TA'           => ['min' => 23.0,  'max' => 25.0],
    'AC'           => ['min' => 2.0,   'max' => 4.0],
    'Conta_WR3'    => ['min' => null,  'max' => 5.0],
    'Conta_WR4'    => ['min' => null,  'max' => 0.5],
    'EC'           => ['min' => null,  'max' => 10.0],
    'FlowRate'     => ['min' => 1.5,   'max' => null],
];

function isOutOfRange(string $paramKey, ?float $value): bool {
    if ($value === null) return false;
    if (!array_key_exists($paramKey, PARAM_STANDARDS)) return false;
    ['min' => $min, 'max' => $max] = PARAM_STANDARDS[$paramKey];
    if ($min !== null && $value < $min) return true;
    if ($max !== null && $value > $max) return true;
    return false;
}

$logDate        = trim($_POST['log_date']    ?? '');
$shift          = strtoupper(trim($_POST['shift'] ?? ''));
$timeSlot       = trim($_POST['time_slot']   ?? '');
$stationNo      = intval($_POST['station_no'] ?? 0);
$paramKey       = trim($_POST['parameter_key'] ?? '');
$beforeValue    = isset($_POST['before_value']) && $_POST['before_value'] !== '' ? floatval($_POST['before_value']) : null;
$afterValue     = isset($_POST['after_value'])  && $_POST['after_value']  !== '' ? floatval($_POST['after_value'])  : null;
$chemAddedKg    = isset($_POST['chemical_added_kg']) && $_POST['chemical_added_kg'] !== '' ? floatval($_POST['chemical_added_kg']) : null;
$isOverflow     = isset($_POST['is_overflow']) ? (bool)(int)$_POST['is_overflow'] : null;
$noteEntry      = htmlspecialchars(trim($_POST['note'] ?? ''), ENT_QUOTES, 'UTF-8');
$userId = $_SESSION['user']['id'];
$validShifts    = ['DAY', 'NIGHT'];
$validSlotsByShift = [
    'DAY'   => ['08:00-09:00','10:00-11:00','13:00-14:00','15:00-16:00','17:30-18:30','19:30-20:30'],
    'NIGHT' => ['20:00-22:00','22:00-00:00','01:00-03:00','03:00-05:00','05:30-07:00','07:00-08:00'],
];

$errors = [];
if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $logDate)) $errors[] = 'Invalid date';
if (!in_array($shift, $validShifts))                  $errors[] = 'Invalid shift';
if ($shift && !in_array($timeSlot, $validSlotsByShift[$shift] ?? [])) $errors[] = 'Invalid time slot';
if ($stationNo < 0 || $stationNo > 9)                 $errors[] = 'Invalid station';
if (empty($paramKey))                                  $errors[] = 'Invalid param';

if (!empty($errors)) {
    http_response_code(422);
    echo json_encode(['success' => false, 'data' => null, 'message' => implode(', ', $errors)]);
    exit;
}
$oor = isOutOfRange($paramKey, $beforeValue) ? 1 : 0;

try {
    $pdo->beginTransaction();
    $stmtH = $pdo->prepare("
        MERGE dbo.PAINT_CHEM_SHEET_HEADER AS target
        USING (SELECT ? AS log_date, ? AS shift) AS src
            ON target.log_date = src.log_date AND target.shift = src.shift
        WHEN NOT MATCHED THEN
            INSERT (log_date, shift, status) VALUES (src.log_date, src.shift, 'DRAFT');
    ");
    $stmtH->execute([$logDate, $shift]);

    $stmtId = $pdo->prepare("SELECT header_id FROM dbo.PAINT_CHEM_SHEET_HEADER WHERE log_date = ? AND shift = ?");
    $stmtId->execute([$logDate, $shift]);
    $headerId = $stmtId->fetchColumn();

    $stmtStatus = $pdo->prepare("SELECT status FROM dbo.PAINT_CHEM_SHEET_HEADER WHERE header_id = ?");
    $stmtStatus->execute([$headerId]);
    $currentStatus = $stmtStatus->fetchColumn();
    if ($currentStatus === 'APPROVED') {
        $pdo->rollBack();
        http_response_code(403);
        echo json_encode(['success' => false, 'data' => null, 'message' => 'Approved sheets cannot be edited']);
        exit;
    }

    if ($stationNo === 0) {
        $headerMap = ['conveyorSpeed' => 'conveyor_speed', 'bakeOven' => 'bake_oven_temp', 'dryOven' => 'dry_oven_temp'];
        if (array_key_exists($paramKey, $headerMap)) {
            $dbCol = $headerMap[$paramKey];
            $stmtUpdateH = $pdo->prepare("UPDATE dbo.PAINT_CHEM_SHEET_HEADER SET {$dbCol} = ? WHERE header_id = ?");
            $stmtUpdateH->execute([$beforeValue !== null ? $beforeValue : null, $headerId]);
        }
    } else {
        $stmtLog = $pdo->prepare("
            MERGE dbo.PAINT_CHEM_LOG AS target
            USING (
                SELECT ? AS header_id, ? AS time_slot, ? AS station_no, ? AS parameter_key
            ) AS src
                ON  target.header_id    = src.header_id
                AND target.time_slot    = src.time_slot
                AND target.station_no   = src.station_no
                AND target.parameter_key = src.parameter_key
            WHEN MATCHED THEN
                UPDATE SET
                    before_value       = ?,
                    after_value        = ?,
                    chemical_added_kg  = ?,
                    is_overflow        = ?,
                    is_out_of_range    = ?,
                    recorded_by        = ?,
                    recorded_at        = GETDATE(),
                    note               = ?
            WHEN NOT MATCHED THEN
                INSERT (header_id, time_slot, station_no, parameter_key,
                        before_value, after_value, chemical_added_kg,
                        is_overflow, is_out_of_range, recorded_by, note)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        ");
        $stmtLog->execute([
            $headerId, $timeSlot, $stationNo, $paramKey,
            $beforeValue, $afterValue, $chemAddedKg, $isOverflow, $oor, $userId, $noteEntry,
            $headerId, $timeSlot, $stationNo, $paramKey,
            $beforeValue, $afterValue, $chemAddedKg, $isOverflow, $oor, $userId, $noteEntry,
        ]);
    }

    $stmtTouch = $pdo->prepare("UPDATE dbo.PAINT_CHEM_SHEET_HEADER SET updated_at = GETDATE() WHERE header_id = ?");
    $stmtTouch->execute([$headerId]);
    $pdo->commit();
    echo json_encode([
        'success' => true,
        'data'    => ['header_id' => $headerId, 'is_out_of_range' => (bool)$oor],
        'message' => 'Saved',
    ]);
} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['success' => false, 'data' => null, 'message' => $e->getMessage() . ' on line ' . $e->getLine()]);
}
