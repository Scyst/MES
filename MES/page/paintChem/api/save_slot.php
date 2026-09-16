<?php
// MES/page/paintChem/api/save_slot.php
// UPSERT one time-slot entry for a station parameter. Computes is_out_of_range server-side.

header('Content-Type: application/json; charset=utf-8');
require_once '../../db.php';
require_once '../../../auth/check_auth.php';
requireLogin();

// CSRF guard
$clientToken = $_POST['csrf_token'] ?? '';
$serverToken = $_SESSION['csrf_token'] ?? '';
if (empty($clientToken) || empty($serverToken) || !hash_equals($serverToken, $clientToken)) {
    http_response_code(403);
    echo json_encode(['success' => false, 'data' => null, 'message' => 'Security Error: CSRF Token ไม่ถูกต้อง']);
    exit;
}

// ==========================================
// OOR Standard Table (parameter_key => [min, max])
// null = no numeric bound (use is_overflow flag instead)
// ==========================================
const PARAM_STANDARDS = [
    // Station 1 & 2 — Degreasing
    'F_Al'         => ['min' => 10.0,  'max' => 12.0],
    'Temperature'  => ['min' => 25.0,  'max' => 35.0],
    'Pressure'     => ['min' => 0.4,   'max' => 0.8],
    // Station 3 — Water Rinse 1
    'Conta_WR1'    => ['min' => null,  'max' => 8.0],
    // Station 4 — Water Rinse 2
    'Conta_WR2'    => ['min' => null,  'max' => 1.0],
    // Station 5 — Surface Cond.
    'pH'           => ['min' => 9.0,   'max' => 11.0],
    'TC'           => ['min' => 2.0,   'max' => 4.0],
    // Station 6 — Zinc Phosphase
    'FA'           => ['min' => 0.3,   'max' => 0.5],
    'TA'           => ['min' => 23.0,  'max' => 25.0],
    'AC'           => ['min' => 2.0,   'max' => 4.0],
    // Station 7 — Water Rinse 3
    'Conta_WR3'    => ['min' => null,  'max' => 5.0],
    // Station 8 — Water Rinse 4
    'Conta_WR4'    => ['min' => null,  'max' => 0.5],
    // Station 9 — DI Water Rinse
    'EC'           => ['min' => null,  'max' => 10.0],
    'FlowRate'     => ['min' => 1.5,   'max' => null],
];

/**
 * Determine if a numeric value is outside allowed range.
 */
function isOutOfRange(string $paramKey, ?float $value): bool {
    if ($value === null) return false;
    if (!array_key_exists($paramKey, PARAM_STANDARDS)) return false;
    ['min' => $min, 'max' => $max] = PARAM_STANDARDS[$paramKey];
    if ($min !== null && $value < $min) return true;
    if ($max !== null && $value > $max) return true;
    return false;
}

// ==========================================
// Input collection & validation
// ==========================================
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
if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $logDate)) $errors[] = 'รูปแบบวันที่ไม่ถูกต้อง';
if (!in_array($shift, $validShifts))                  $errors[] = 'กะไม่ถูกต้อง (DAY หรือ NIGHT)';
if ($shift && !in_array($timeSlot, $validSlotsByShift[$shift] ?? [])) $errors[] = 'Time Slot ไม่ถูกต้องสำหรับกะนี้';
if ($stationNo < 1 || $stationNo > 9)                 $errors[] = 'Station ต้องอยู่ระหว่าง 1-9';
if (empty($paramKey))                                  $errors[] = 'กรุณาระบุ Parameter';
if ($chemAddedKg !== null && $chemAddedKg < 0)         $errors[] = 'ปริมาณสารเคมีต้องไม่ติดลบ';

if (!empty($errors)) {
    http_response_code(422);
    echo json_encode(['success' => false, 'data' => null, 'message' => implode(', ', $errors)]);
    exit;
}

// Compute OOR using before_value (measurement before adjustment)
$oor = isOutOfRange($paramKey, $beforeValue) ? 1 : 0;

try {
    $pdo->beginTransaction();

    // Ensure header exists (auto-create DRAFT)
    $stmtH = $pdo->prepare("
        MERGE dbo.PAINT_CHEM_SHEET_HEADER AS target
        USING (SELECT ? AS log_date, ? AS shift) AS src
            ON target.log_date = src.log_date AND target.shift = src.shift
        WHEN NOT MATCHED THEN
            INSERT (log_date, shift, status) VALUES (src.log_date, src.shift, 'DRAFT');
    ");
    $stmtH->execute([$logDate, $shift]);

    // Retrieve header_id
    $stmtId = $pdo->prepare("SELECT header_id FROM dbo.PAINT_CHEM_SHEET_HEADER WHERE log_date = ? AND shift = ?");
    $stmtId->execute([$logDate, $shift]);
    $headerId = $stmtId->fetchColumn();

    // Block edits on APPROVED sheets
    $stmtStatus = $pdo->prepare("SELECT status FROM dbo.PAINT_CHEM_SHEET_HEADER WHERE header_id = ?");
    $stmtStatus->execute([$headerId]);
    $currentStatus = $stmtStatus->fetchColumn();
    if ($currentStatus === 'APPROVED') {
        $pdo->rollBack();
        http_response_code(403);
        echo json_encode(['success' => false, 'data' => null, 'message' => 'ใบนี้อนุมัติแล้ว ไม่สามารถแก้ไขได้']);
        exit;
    }

    // UPSERT log entry
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
        // USING source keys
        $headerId, $timeSlot, $stationNo, $paramKey,
        // UPDATE SET values
        $beforeValue, $afterValue, $chemAddedKg, $isOverflow, $oor, $userId, $noteEntry,
        // INSERT values
        $headerId, $timeSlot, $stationNo, $paramKey,
        $beforeValue, $afterValue, $chemAddedKg, $isOverflow, $oor, $userId, $noteEntry,
    ]);

    // Touch updated_at on header
    $stmtTouch = $pdo->prepare("UPDATE dbo.PAINT_CHEM_SHEET_HEADER SET updated_at = GETDATE() WHERE header_id = ?");
    $stmtTouch->execute([$headerId]);

    $pdo->commit();

    echo json_encode([
        'success' => true,
        'data'    => ['header_id' => $headerId, 'is_out_of_range' => (bool)$oor],
        'message' => 'บันทึกข้อมูลสำเร็จ',
    ]);

} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['success' => false, 'data' => null, 'message' => 'เกิดข้อผิดพลาดภายในระบบ']);
}
