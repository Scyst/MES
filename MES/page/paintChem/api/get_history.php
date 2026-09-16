<?php
// MES/page/paintChem/api/get_history.php
// Returns paginated list of sheet headers with OOR summary counts.

header('Content-Type: application/json; charset=utf-8');
require_once '../../db.php';
require_once '../../../auth/check_auth.php';
requireLogin();

$dateFrom = $_GET['date_from'] ?? date('Y-m-d', strtotime('-30 days'));
$dateTo   = $_GET['date_to']   ?? date('Y-m-d');
$shift    = strtoupper($_GET['shift'] ?? '');
$page     = max(1, intval($_GET['page'] ?? 1));
$pageSize = 20;
$offset   = ($page - 1) * $pageSize;

if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $dateFrom) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $dateTo)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'data' => null, 'message' => 'รูปแบบวันที่ไม่ถูกต้อง']);
    exit;
}
if (!empty($shift) && !in_array($shift, ['DAY', 'NIGHT'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'data' => null, 'message' => 'กะต้องเป็น DAY หรือ NIGHT']);
    exit;
}

try {
    $shiftFilter = !empty($shift) ? "AND h.shift = ?" : "";
    $params = [$dateFrom, $dateTo];
    if (!empty($shift)) $params[] = $shift;

    // Count total
    $stmtCount = $pdo->prepare("
        SELECT COUNT(*) FROM dbo.PAINT_CHEM_SHEET_HEADER h
        WHERE h.log_date BETWEEN ? AND ? $shiftFilter
    ");
    $stmtCount->execute($params);
    $total = (int)$stmtCount->fetchColumn();

    // Fetch rows
    $paginatedParams = array_merge($params, [$offset, $pageSize]);
    $stmtRows = $pdo->prepare("
        SELECT
            h.header_id,
            h.log_date,
            h.shift,
            h.status,
            h.conveyor_speed,
            h.bake_oven_temp,
            h.dry_oven_temp,
            h.updated_at,
            up.fullname AS prepared_by_name,
            uc.fullname AS checked_by_name,
            ua.fullname AS approved_by_name,
            (SELECT COUNT(*) FROM dbo.PAINT_CHEM_LOG l
             WHERE l.header_id = h.header_id AND l.is_out_of_range = 1) AS oor_count,
            (SELECT COUNT(*) FROM dbo.PAINT_CHEM_LOG l
             WHERE l.header_id = h.header_id) AS total_entries
        FROM dbo.PAINT_CHEM_SHEET_HEADER h
        LEFT JOIN dbo.USERS up ON up.id = h.prepared_by
        LEFT JOIN dbo.USERS uc ON uc.id = h.checked_by
        LEFT JOIN dbo.USERS ua ON ua.id = h.approved_by
        WHERE h.log_date BETWEEN ? AND ? $shiftFilter
        ORDER BY h.log_date DESC, h.shift
        OFFSET ? ROWS FETCH NEXT ? ROWS ONLY
    ");
    $stmtRows->execute($paginatedParams);
    $rows = $stmtRows->fetchAll();

    echo json_encode([
        'success' => true,
        'data'    => [
            'items'       => $rows,
            'total'       => $total,
            'page'        => $page,
            'page_size'   => $pageSize,
            'total_pages' => (int)ceil($total / $pageSize),
        ],
        'message' => 'OK',
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'data' => null, 'message' => 'เกิดข้อผิดพลาดภายในระบบ']);
}
