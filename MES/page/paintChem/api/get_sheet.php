<?php
// MES/page/paintChem/api/get_sheet.php
// Returns the sheet header + all parameter logs for a given date & shift.

header('Content-Type: application/json; charset=utf-8');
require_once '../../db.php';
require_once '../../../auth/check_auth.php';
requireLogin();

$logDate = $_GET['date'] ?? date('Y-m-d');
$shift   = strtoupper($_GET['shift'] ?? '');

if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $logDate)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'data' => null, 'message' => 'รูปแบบวันที่ไม่ถูกต้อง']);
    exit;
}
if (!in_array($shift, ['DAY', 'NIGHT'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'data' => null, 'message' => 'กะต้องเป็น DAY หรือ NIGHT เท่านั้น']);
    exit;
}

try {
    $stmtHeader = $pdo->prepare("
        SELECT
            h.header_id,
            h.log_date,
            h.shift,
            h.conveyor_speed,
            h.bake_oven_temp,
            h.dry_oven_temp,
            h.note,
            h.status,
            h.prepared_by,
            h.checked_by,
            h.approved_by,
            h.created_at,
            h.updated_at,
            up.fullname AS prepared_by_name,
            uc.fullname AS checked_by_name,
            ua.fullname AS approved_by_name
        FROM dbo.PAINT_CHEM_SHEET_HEADER h
        LEFT JOIN dbo.USERS up ON up.id = h.prepared_by
        LEFT JOIN dbo.USERS uc ON uc.id = h.checked_by
        LEFT JOIN dbo.USERS ua ON ua.id = h.approved_by
        WHERE h.log_date = ? AND h.shift = ?
    ");
    $stmtHeader->execute([$logDate, $shift]);
    $header = $stmtHeader->fetch();

    $logs = [];
    if ($header) {
        $stmtLogs = $pdo->prepare("
            SELECT
                l.log_id,
                l.time_slot,
                l.station_no,
                l.parameter_key,
                l.before_value,
                l.after_value,
                l.chemical_added_kg,
                l.is_overflow,
                l.is_out_of_range,
                l.note,
                l.recorded_at,
                u.fullname AS recorded_by_name
            FROM dbo.PAINT_CHEM_LOG l
            JOIN dbo.USERS u ON u.id = l.recorded_by
            WHERE l.header_id = ?
            ORDER BY l.station_no, l.time_slot, l.parameter_key
        ");
        $stmtLogs->execute([$header['header_id']]);
        $logs = $stmtLogs->fetchAll();
    }

    echo json_encode([
        'success' => true,
        'data'    => [
            'header' => $header ?: null,
            'logs'   => $logs,
        ],
        'message' => 'OK',
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'data' => null, 'message' => 'เกิดข้อผิดพลาดภายในระบบ']);
}
