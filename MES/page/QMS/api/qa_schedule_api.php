<?php
// page/QMS/api/qa_schedule_api.php
header('Content-Type: application/json; charset=utf-8');
ini_set('display_errors', 0);
error_reporting(E_ALL);

require_once '../../db.php';
require_once '../../../auth/check_auth.php';
require_once __DIR__ . '/../../components/php/logger.php';

if (!isset($_SESSION['user'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'data' => null, 'message' => 'Unauthorized session.'], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $clientToken = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? $_POST['csrf_token'] ?? '';
    $sessionToken = $_SESSION['csrf_token'] ?? '';
    if (empty($sessionToken) || !hash_equals($sessionToken, $clientToken)) {
        http_response_code(403);
        echo json_encode(['success' => false, 'data' => null, 'message' => 'CSRF token validation failed.'], JSON_UNESCAPED_UNICODE);
        exit;
    }
}

/**
 * Send structured JSON response matching MES contract.
 */
function qmsApiResponse(bool $success, $data = null, string $message = '', array $extra = [], int $statusCode = 200): void
{
    if ($statusCode !== 200) {
        http_response_code($statusCode);
    }
    $payload = array_merge([
        'success' => $success,
        'data' => $data,
        'message' => $message,
    ], $extra);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Parse and validate YYYY-MM-DD date string or return null.
 */
function qmsParseDate(?string $val): ?string
{
    $trimmed = trim((string)($val ?? ''));
    if ($trimmed === '') {
        return null;
    }
    if (preg_match('/^\d{4}-\d{2}-\d{2}/', $trimmed, $m)) {
        return $m[0];
    }
    $ts = strtotime($trimmed);
    return $ts !== false ? date('Y-m-d', $ts) : null;
}

/**
 * Resolve display name of active authenticated user.
 */
function qmsGetActorName(): string
{
    return trim((string)($_SESSION['user']['fullname'] ?? $_SESSION['user']['username'] ?? 'QA Staff')) ?: 'QA Staff';
}

/**
 * Fetch explicit QA/Order columns from SALES_ORDERS for state/history decisions.
 */
function qmsFetchSalesOrderRow(PDO $pdo, int $poId): ?array
{
    $stmt = $pdo->prepare("
        SELECT id, po_number, sku, description, color, quantity, dc_location, loading_date, loading_week,
               inspection_date, actual_inspection_date, inspection_status, inspection_result,
               is_confirmed, inspection_remark, qa_inspector, ticket_number, inspect_type
        FROM dbo.SALES_ORDERS WITH (NOLOCK)
        WHERE id = ?
    ");
    $stmt->execute([$poId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    return $row ?: null;
}

/**
 * Determine whether a PO or round already finished inspection.
 */
function qmsIsCompletedState(?string $status, ?string $result): bool
{
    $st = strtoupper(trim((string)$status));
    $res = strtoupper(trim((string)$result));
    return in_array($res, ['PASS', 'FAIL'], true) || in_array($st, ['DONE', 'PASS'], true);
}

/**
 * Ensure an active (is_latest = 1) history record exists for the SALES_ORDERS row.
 */
function qmsEnsureLatestHistoryRow(PDO $pdo, array $soRow, string $sourceAction, string $actor): int
{
    $soId = (int)$soRow['id'];
    $stmtLatest = $pdo->prepare("
        SELECT TOP (1) id, round_no
        FROM dbo.QMS_PO_INSPECTION_HISTORY
        WHERE sales_order_id = ? AND is_latest = 1
        ORDER BY round_no DESC, id DESC
    ");
    $stmtLatest->execute([$soId]);
    $latest = $stmtLatest->fetch(PDO::FETCH_ASSOC);
    if ($latest) {
        return (int)$latest['id'];
    }

    $stmtMax = $pdo->prepare("SELECT ISNULL(MAX(round_no), 0) FROM dbo.QMS_PO_INSPECTION_HISTORY WHERE sales_order_id = ?");
    $stmtMax->execute([$soId]);
    $nextRound = ((int)$stmtMax->fetchColumn()) + 1;

    $stmtIns = $pdo->prepare("
        INSERT INTO dbo.QMS_PO_INSPECTION_HISTORY (
            sales_order_id, po_number, round_no, ticket_number, scheduled_date,
            actual_inspection_date, inspection_status, inspection_result, inspect_type,
            qa_inspector, inspection_remark, is_latest, source_action, created_by, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, GETDATE(), GETDATE())
    ");
    $stmtIns->execute([
        $soId,
        $soRow['po_number'],
        $nextRound,
        ($soRow['ticket_number'] ?? '') !== '' ? $soRow['ticket_number'] : null,
        qmsParseDate($soRow['inspection_date'] ?? null),
        qmsParseDate($soRow['actual_inspection_date'] ?? null),
        ($soRow['inspection_status'] ?? '') !== '' ? $soRow['inspection_status'] : 'WAITING',
        ($soRow['inspection_result'] ?? '') !== '' ? $soRow['inspection_result'] : null,
        ($soRow['inspect_type'] ?? '') !== '' ? $soRow['inspect_type'] : null,
        ($soRow['qa_inspector'] ?? '') !== '' ? $soRow['qa_inspector'] : null,
        $soRow['inspection_remark'] ?? null,
        $sourceAction,
        $actor,
    ]);
    return (int)$pdo->lastInsertId();
}

/**
 * Archive any prior active round cleanly and open Round N+1 in QMS_PO_INSPECTION_HISTORY & SALES_ORDERS.
 */
function qmsArchiveAndStartNewRound(
    PDO $pdo,
    array $soRow,
    ?string $newSchedDate,
    array $overrides,
    string $sourceAction,
    string $actor
): array {
    $soId = (int)$soRow['id'];
    $hasAnyPriorData = !empty($soRow['inspection_date'])
        || !empty($soRow['actual_inspection_date'])
        || trim((string)($soRow['ticket_number'] ?? '')) !== ''
        || qmsIsCompletedState($soRow['inspection_status'] ?? null, $soRow['inspection_result'] ?? null);

    $stmtAny = $pdo->prepare("SELECT COUNT(*) FROM dbo.QMS_PO_INSPECTION_HISTORY WHERE sales_order_id = ?");
    $stmtAny->execute([$soId]);
    $histCount = (int)$stmtAny->fetchColumn();

    if ($histCount === 0 && $hasAnyPriorData) {
        qmsEnsureLatestHistoryRow($pdo, $soRow, 'AUTO_ARCHIVE_PRIOR', $actor);
    }

    $pdo->prepare("UPDATE dbo.QMS_PO_INSPECTION_HISTORY SET is_latest = 0, updated_at = GETDATE() WHERE sales_order_id = ? AND is_latest = 1")
        ->execute([$soId]);

    $stmtMax = $pdo->prepare("SELECT ISNULL(MAX(round_no), 0) FROM dbo.QMS_PO_INSPECTION_HISTORY WHERE sales_order_id = ?");
    $stmtMax->execute([$soId]);
    $nextRound = ((int)$stmtMax->fetchColumn()) + 1;

    $ticket = array_key_exists('ticket_number', $overrides) ? $overrides['ticket_number'] : null;
    $inspector = array_key_exists('qa_inspector', $overrides) ? $overrides['qa_inspector'] : null;
    $inspectType = array_key_exists('inspect_type', $overrides)
        ? $overrides['inspect_type']
        : (($soRow['inspect_type'] ?? '') !== '' ? $soRow['inspect_type'] : null);
    $remark = $overrides['inspection_remark'] ?? null;

    $stmtIns = $pdo->prepare("
        INSERT INTO dbo.QMS_PO_INSPECTION_HISTORY (
            sales_order_id, po_number, round_no, ticket_number, scheduled_date,
            actual_inspection_date, inspection_status, inspection_result, inspect_type,
            qa_inspector, inspection_remark, is_latest, source_action, created_by, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, NULL, 'WAITING', NULL, ?, ?, ?, 1, ?, ?, GETDATE(), GETDATE())
    ");
    $stmtIns->execute([
        $soId,
        $soRow['po_number'],
        $nextRound,
        $ticket !== '' ? $ticket : null,
        $newSchedDate,
        $inspectType !== '' ? $inspectType : null,
        $inspector !== '' ? $inspector : null,
        $remark,
        $sourceAction,
        $actor,
    ]);
    $historyId = (int)$pdo->lastInsertId();

    $pdo->prepare("
        UPDATE dbo.SALES_ORDERS
        SET inspection_date = ?,
            actual_inspection_date = NULL,
            inspection_status = 'WAITING',
            inspection_result = NULL,
            ticket_number = ?,
            qa_inspector = ?,
            inspect_type = ?,
            inspection_remark = ?,
            updated_at = GETDATE()
        WHERE id = ?
    ")->execute([
        $newSchedDate,
        $ticket !== '' ? $ticket : null,
        $inspector !== '' ? $inspector : null,
        $inspectType !== '' ? $inspectType : null,
        $remark,
        $soId,
    ]);

    return [
        'history_id' => $historyId,
        'round_no' => $nextRound,
        'scheduled_date' => $newSchedDate,
    ];
}

$action = $_REQUEST['action'] ?? '';
$actorName = qmsGetActorName();

try {
    if ($action === 'get_schedule') {
        $date = qmsParseDate($_GET['date'] ?? null) ?? date('Y-m-d');
        $startDate = qmsParseDate($_GET['start_date'] ?? null) ?? date('Y-m-d');
        $endDate = qmsParseDate($_GET['end_date'] ?? null) ?? date('Y-m-d');
        $range = $_GET['range'] ?? '';

        if ($range === 'this_week') {
            $start = date('Y-m-d', strtotime('monday this week'));
            $end = date('Y-m-d', strtotime('sunday this week'));
        } elseif ($range === 'this_month') {
            $start = date('Y-m-01');
            $end = date('Y-m-t');
        } elseif ($range === 'last_month') {
            $start = date('Y-m-01', strtotime('first day of last month'));
            $end = date('Y-m-t', strtotime('last day of last month'));
        } elseif ($range === 'custom_range') {
            $start = $startDate;
            $end = $endDate;
        } else {
            $start = $date;
            $end = $date;
        }

        $sql = "
            SELECT TOP (500) *
            FROM (
                SELECT
                    so.id,
                    h.id AS history_id,
                    h.round_no,
                    h.is_latest,
                    (SELECT COUNT(*) FROM dbo.QMS_PO_INSPECTION_HISTORY hc WITH (NOLOCK) WHERE hc.sales_order_id = so.id) AS total_rounds,
                    so.po_number, so.sku, so.description, so.color, so.quantity, so.dc_location,
                    so.loading_date, so.loading_week,
                    h.scheduled_date AS inspection_date,
                    h.actual_inspection_date,
                    h.inspection_status,
                    h.inspection_result,
                    so.is_confirmed,
                    h.inspection_remark,
                    h.qa_inspector,
                    h.ticket_number,
                    h.inspect_type
                FROM dbo.QMS_PO_INSPECTION_HISTORY h WITH (NOLOCK)
                INNER JOIN dbo.SALES_ORDERS so WITH (NOLOCK) ON so.id = h.sales_order_id
                WHERE h.scheduled_date >= ? AND h.scheduled_date <= ?

                UNION ALL

                SELECT
                    so.id,
                    CAST(NULL AS INT) AS history_id,
                    1 AS round_no,
                    CAST(1 AS BIT) AS is_latest,
                    1 AS total_rounds,
                    so.po_number, so.sku, so.description, so.color, so.quantity, so.dc_location,
                    so.loading_date, so.loading_week,
                    so.inspection_date,
                    so.actual_inspection_date,
                    so.inspection_status,
                    so.inspection_result,
                    so.is_confirmed,
                    so.inspection_remark,
                    so.qa_inspector,
                    so.ticket_number,
                    so.inspect_type
                FROM dbo.SALES_ORDERS so WITH (NOLOCK)
                WHERE CAST(so.inspection_date AS DATE) >= ? AND CAST(so.inspection_date AS DATE) <= ?
                  AND NOT EXISTS (
                      SELECT 1 FROM dbo.QMS_PO_INSPECTION_HISTORY h2 WITH (NOLOCK) WHERE h2.sales_order_id = so.id
                  )
            ) merged
            ORDER BY inspection_date ASC, loading_date ASC, po_number ASC, round_no ASC
        ";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$start, $end, $start, $end]);
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $stats = [
            'total' => count($data),
            'waiting' => 0,
            'in_progress' => 0,
            'passed' => 0,
            'failed' => 0,
        ];

        foreach ($data as $row) {
            $res = strtoupper(trim((string)($row['inspection_result'] ?? '')));
            $st = strtoupper(trim((string)($row['inspection_status'] ?? '')));
            if ($res === 'FAIL') {
                $stats['failed']++;
            } elseif ($res === 'PASS' || $st === 'PASS' || $st === 'DONE') {
                $stats['passed']++;
            } elseif ($st === 'IN_PROGRESS') {
                $stats['in_progress']++;
            } else {
                $stats['waiting']++;
            }
        }

        qmsApiResponse(true, $data, 'Schedule loaded', ['stats' => $stats]);
    } elseif ($action === 'get_po_history') {
        $poId = intval($_GET['id'] ?? 0);
        if ($poId <= 0) {
            qmsApiResponse(false, null, 'Missing PO ID.', [], 400);
        }

        $stmt = $pdo->prepare("
            SELECT TOP (50)
                id AS history_id, sales_order_id, po_number, round_no, ticket_number,
                scheduled_date, actual_inspection_date, inspection_status, inspection_result,
                inspect_type, qa_inspector, inspection_remark, is_latest, source_action,
                created_by, created_at, updated_at
            FROM dbo.QMS_PO_INSPECTION_HISTORY WITH (NOLOCK)
            WHERE sales_order_id = ?
            ORDER BY round_no DESC, id DESC
        ");
        $stmt->execute([$poId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        qmsApiResponse(true, $rows, 'History loaded');
    } elseif ($action === 'get_pending_jobs') {
        $search = trim((string)($_GET['search'] ?? ''));
        $sql = "SELECT TOP (100) id, po_number, sku, description, quantity, loading_date, inspection_date, inspection_status, inspection_result, ticket_number
                FROM dbo.SALES_ORDERS WITH (NOLOCK)
                WHERE (
                    inspection_date IS NULL
                    OR inspection_status = 'WAITING'
                    OR inspection_status IS NULL
                    OR inspection_status = 'No'
                )
                  AND UPPER(LTRIM(RTRIM(ISNULL(inspection_result, '')))) NOT IN ('PASS', 'FAIL')";
        $params = [];
        if ($search !== '') {
            $sql .= " AND (po_number LIKE ? OR sku LIKE ?)";
            $like = "%$search%";
            array_push($params, $like, $like);
        }
        $sql .= " ORDER BY loading_date DESC, id DESC";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        qmsApiResponse(true, $stmt->fetchAll(PDO::FETCH_ASSOC), 'Pending jobs loaded');
    } elseif ($action === 'search_po') {
        $search = trim((string)($_GET['search'] ?? ''));
        if ($search === '') {
            qmsApiResponse(true, [], 'Empty search');
        }

        $sql = "SELECT TOP (50) id, po_number, sku, description, quantity, loading_date, inspection_date,
                       actual_inspection_date, inspection_status, inspection_result, ticket_number, inspect_type, qa_inspector,
                       (SELECT COUNT(*) FROM dbo.QMS_PO_INSPECTION_HISTORY h WITH (NOLOCK) WHERE h.sales_order_id = dbo.SALES_ORDERS.id) AS total_rounds
                FROM dbo.SALES_ORDERS WITH (NOLOCK)
                WHERE po_number LIKE ? OR sku LIKE ?
                ORDER BY loading_date DESC, id DESC";
        $stmt = $pdo->prepare($sql);
        $like = "%$search%";
        $stmt->execute([$like, $like]);
        qmsApiResponse(true, $stmt->fetchAll(PDO::FETCH_ASSOC), 'Search complete');
    } elseif ($action === 'schedule_po') {
        $poId = intval($_POST['id'] ?? 0);
        $scheduleDate = qmsParseDate($_POST['schedule_date'] ?? null);
        if ($poId <= 0 || $scheduleDate === null) {
            qmsApiResponse(false, null, 'Missing parameters.', [], 400);
        }

        $pdo->beginTransaction();
        $soRow = qmsFetchSalesOrderRow($pdo, $poId);
        if (!$soRow) {
            $pdo->rollBack();
            qmsApiResponse(false, null, 'PO not found.', [], 404);
        }

        $oldDate = qmsParseDate($soRow['inspection_date'] ?? null);
        $isCompleted = qmsIsCompletedState($soRow['inspection_status'] ?? null, $soRow['inspection_result'] ?? null);

        if ($isCompleted && $oldDate !== $scheduleDate) {
            $roundInfo = qmsArchiveAndStartNewRound($pdo, $soRow, $scheduleDate, [], 'RESCHEDULE_NEW_ROUND', $actorName);
            $pdo->commit();
            if (function_exists('writeLog')) {
                writeLog($pdo, 'REOPEN', 'QMS_QA_SCHEDULE', $poId, $soRow, $roundInfo, "Auto-opened Round {$roundInfo['round_no']} for PO {$soRow['po_number']} on {$scheduleDate} (preserved prior round on {$oldDate})");
            }
            qmsApiResponse(true, $roundInfo, 'บันทึกประวัติรอบเดิมไว้แล้ว และเปิดตรวจรอบใหม่เรียบร้อย', ['new_round' => true]);
        }

        $histId = qmsEnsureLatestHistoryRow($pdo, $soRow, 'SCHEDULE_PO', $actorName);
        $pdo->prepare("UPDATE dbo.SALES_ORDERS SET inspection_date = ?, updated_at = GETDATE() WHERE id = ?")
            ->execute([$scheduleDate, $poId]);
        $pdo->prepare("UPDATE dbo.QMS_PO_INSPECTION_HISTORY SET scheduled_date = ?, updated_at = GETDATE() WHERE id = ?")
            ->execute([$scheduleDate, $histId]);
        $pdo->commit();

        if (function_exists('writeLog')) {
            writeLog($pdo, 'SCHEDULE', 'QMS_QA_SCHEDULE', $poId, ['inspection_date' => $oldDate], ['inspection_date' => $scheduleDate], "Scheduled PO {$soRow['po_number']} to {$scheduleDate}");
        }
        qmsApiResponse(true, ['id' => $poId, 'inspection_date' => $scheduleDate], 'Scheduled successfully.');
    } elseif ($action === 'reopen_inspection') {
        $poId = intval($_POST['id'] ?? 0);
        $scheduleDate = qmsParseDate($_POST['schedule_date'] ?? null) ?? date('Y-m-d');
        if ($poId <= 0) {
            qmsApiResponse(false, null, 'Missing PO ID.', [], 400);
        }

        $pdo->beginTransaction();
        $soRow = qmsFetchSalesOrderRow($pdo, $poId);
        if (!$soRow) {
            $pdo->rollBack();
            qmsApiResponse(false, null, 'PO not found.', [], 404);
        }

        $overrides = [
            'ticket_number' => trim((string)($_POST['ticket_number'] ?? '')),
            'qa_inspector' => trim((string)($_POST['qa_inspector'] ?? '')),
            'inspect_type' => trim((string)($_POST['inspect_type'] ?? ($soRow['inspect_type'] ?? ''))),
            'inspection_remark' => trim((string)($_POST['remark'] ?? '')) ?: null,
        ];
        $roundInfo = qmsArchiveAndStartNewRound($pdo, $soRow, $scheduleDate, $overrides, 'REOPEN_INSPECTION', $actorName);
        $pdo->commit();

        if (function_exists('writeLog')) {
            writeLog($pdo, 'REOPEN', 'QMS_QA_SCHEDULE', $poId, $soRow, $roundInfo, "Manually reopened Round {$roundInfo['round_no']} for PO {$soRow['po_number']} on {$scheduleDate}");
        }
        qmsApiResponse(true, $roundInfo, "เปิดตรวจรอบที่ {$roundInfo['round_no']} เรียบร้อย (เก็บประวัติรอบเดิมไว้ครบถ้วน)");
    } elseif ($action === 'update_result') {
        $poId = intval($_POST['id'] ?? 0);
        $historyId = intval($_POST['history_id'] ?? 0);
        $inspectionStatus = strtoupper(trim((string)($_POST['inspection_status'] ?? '')));
        $inspectionResult = strtoupper(trim((string)($_POST['inspection_result'] ?? '')));
        if ($inspectionResult === 'PENDING' || $inspectionResult === '') {
            $inspectionResult = null;
        }
        if ($inspectionResult !== null && !in_array($inspectionResult, ['PASS', 'FAIL'], true)) {
            qmsApiResponse(false, null, 'Invalid inspection result.', [], 400);
        }
        if (!in_array($inspectionStatus, ['WAITING', 'IN_PROGRESS', 'DONE'], true)) {
            qmsApiResponse(false, null, 'Invalid inspection status.', [], 400);
        }

        $remark = trim((string)($_POST['remark'] ?? ''));
        $ticketNumber = trim((string)($_POST['ticket_number'] ?? '')) ?: null;
        $qaInspector = trim((string)($_POST['qa_inspector'] ?? '')) ?: null;
        $inspectType = trim((string)($_POST['inspect_type'] ?? '')) ?: null;
        $actualInspectionDate = qmsParseDate($_POST['actual_inspection_date'] ?? null);

        if (in_array($inspectionResult, ['PASS', 'FAIL'], true)) {
            $inspectionStatus = 'DONE';
            if ($actualInspectionDate === null) {
                $actualInspectionDate = date('Y-m-d');
            }
        } elseif ($inspectionStatus === 'DONE' && $inspectionResult === null) {
            $inspectionResult = 'PASS';
            if ($actualInspectionDate === null) {
                $actualInspectionDate = date('Y-m-d');
            }
        } elseif ($inspectionStatus === 'WAITING') {
            $inspectionResult = null;
        }

        if ($poId <= 0) {
            qmsApiResponse(false, null, 'Missing required fields.', [], 400);
        }

        $pdo->beginTransaction();
        if ($historyId > 0) {
            $stmtH = $pdo->prepare("SELECT id, sales_order_id, is_latest, round_no FROM dbo.QMS_PO_INSPECTION_HISTORY WHERE id = ?");
            $stmtH->execute([$historyId]);
            $histRow = $stmtH->fetch(PDO::FETCH_ASSOC);
            if ($histRow && (int)$histRow['is_latest'] !== 1) {
                $pdo->rollBack();
                qmsApiResponse(false, null, 'รายการนี้เป็นประวัติการตรวจรอบเก่า (Read-Only) หากต้องการตรวจซ้ำกรุณากด "เปิดตรวจรอบใหม่"', [], 400);
            }
        }

        $soRow = qmsFetchSalesOrderRow($pdo, $poId);
        if (!$soRow) {
            $pdo->rollBack();
            qmsApiResponse(false, null, 'PO not found.', [], 404);
        }

        $activeHistId = qmsEnsureLatestHistoryRow($pdo, $soRow, 'UPDATE_RESULT', $actorName);

        $pdo->prepare("
            UPDATE dbo.SALES_ORDERS
            SET inspection_status = ?, inspection_result = ?, inspection_remark = ?,
                ticket_number = ?, qa_inspector = ?, inspect_type = ?, actual_inspection_date = ?, updated_at = GETDATE()
            WHERE id = ?
        ")->execute([$inspectionStatus, $inspectionResult, $remark, $ticketNumber, $qaInspector, $inspectType, $actualInspectionDate, $poId]);

        $pdo->prepare("
            UPDATE dbo.QMS_PO_INSPECTION_HISTORY
            SET inspection_status = ?, inspection_result = ?, inspection_remark = ?,
                ticket_number = ?, qa_inspector = ?, inspect_type = ?, actual_inspection_date = ?, updated_at = GETDATE()
            WHERE id = ?
        ")->execute([$inspectionStatus, $inspectionResult, $remark, $ticketNumber, $qaInspector, $inspectType, $actualInspectionDate, $activeHistId]);

        $pdo->commit();

        $newData = [
            'inspection_status' => $inspectionStatus,
            'inspection_result' => $inspectionResult,
            'inspection_remark' => $remark,
            'ticket_number' => $ticketNumber,
            'qa_inspector' => $qaInspector,
            'inspect_type' => $inspectType,
            'actual_inspection_date' => $actualInspectionDate,
        ];
        if (function_exists('writeLog')) {
            writeLog($pdo, 'UPDATE', 'QMS_QA_SCHEDULE', $poId, $soRow, $newData, "Updated QA inspection {$soRow['po_number']}");
        }
        qmsApiResponse(true, $newData, 'Inspection updated successfully.');
    } elseif ($action === 'remove_schedule') {
        $poId = intval($_POST['id'] ?? 0);
        $historyId = intval($_POST['history_id'] ?? 0);
        if ($poId <= 0) {
            qmsApiResponse(false, null, 'Missing PO ID.', [], 400);
        }

        $pdo->beginTransaction();
        if ($historyId > 0) {
            $stmtH = $pdo->prepare("SELECT id, is_latest FROM dbo.QMS_PO_INSPECTION_HISTORY WHERE id = ?");
            $stmtH->execute([$historyId]);
            $histRow = $stmtH->fetch(PDO::FETCH_ASSOC);
            if ($histRow && (int)$histRow['is_latest'] !== 1) {
                $pdo->rollBack();
                qmsApiResponse(false, null, 'ไม่สามารถลบประวัติการตรวจรอบเก่าได้', [], 400);
            }
        }

        $soRow = qmsFetchSalesOrderRow($pdo, $poId);
        if (!$soRow) {
            $pdo->rollBack();
            qmsApiResponse(false, null, 'PO not found.', [], 404);
        }

        $status = strtoupper(trim((string)($soRow['inspection_status'] ?? 'WAITING')));
        $result = strtoupper(trim((string)($soRow['inspection_result'] ?? '')));
        $force = (string)($_POST['force'] ?? '0');
        if (($status === 'IN_PROGRESS' || $status === 'DONE' || $status === 'PASS' || in_array($result, ['PASS', 'FAIL'], true)) && $force === '0') {
            $pdo->rollBack();
            qmsApiResponse(false, ['require_force' => true], 'Confirmation required.', ['require_force' => true]);
        }

        $pdo->prepare("DELETE FROM dbo.QMS_PO_INSPECTION_HISTORY WHERE sales_order_id = ? AND is_latest = 1")->execute([$poId]);

        $stmtPrev = $pdo->prepare("
            SELECT TOP (1) id, ticket_number, scheduled_date, actual_inspection_date, inspection_status, inspection_result, inspect_type, qa_inspector, inspection_remark
            FROM dbo.QMS_PO_INSPECTION_HISTORY
            WHERE sales_order_id = ?
            ORDER BY round_no DESC, id DESC
        ");
        $stmtPrev->execute([$poId]);
        $prevRound = $stmtPrev->fetch(PDO::FETCH_ASSOC);

        if ($prevRound) {
            $pdo->prepare("UPDATE dbo.QMS_PO_INSPECTION_HISTORY SET is_latest = 1, updated_at = GETDATE() WHERE id = ?")->execute([$prevRound['id']]);
            $pdo->prepare("
                UPDATE dbo.SALES_ORDERS
                SET inspection_date = ?, actual_inspection_date = ?, inspection_status = ?, inspection_result = ?,
                    inspection_remark = ?, qa_inspector = ?, ticket_number = ?, inspect_type = ?, updated_at = GETDATE()
                WHERE id = ?
            ")->execute([
                $prevRound['scheduled_date'],
                $prevRound['actual_inspection_date'],
                $prevRound['inspection_status'],
                $prevRound['inspection_result'],
                $prevRound['inspection_remark'],
                $prevRound['qa_inspector'],
                $prevRound['ticket_number'],
                $prevRound['inspect_type'],
                $poId,
            ]);
            $msg = 'ยกเลิกรอบล่าสุดและกู้คืนข้อมูลรอบก่อนหน้าเรียบร้อยแล้ว';
        } else {
            $pdo->prepare("
                UPDATE dbo.SALES_ORDERS
                SET inspection_date = NULL, actual_inspection_date = NULL, inspection_status = 'WAITING',
                    inspection_result = NULL, inspection_remark = NULL, qa_inspector = NULL, updated_at = GETDATE()
                WHERE id = ?
            ")->execute([$poId]);
            $msg = 'Removed from schedule and reset.';
        }

        $pdo->commit();
        if (function_exists('writeLog')) {
            writeLog($pdo, 'DELETE', 'QMS_QA_SCHEDULE', $poId, $soRow, ['restored_previous_round' => (bool)$prevRound], "Removed latest schedule on PO {$soRow['po_number']}");
        }
        qmsApiResponse(true, ['id' => $poId, 'restored_previous_round' => (bool)$prevRound], $msg);
    } elseif ($action === 'assign_inspector') {
        $poId = intval($_POST['id'] ?? 0);
        $inspector = trim((string)($_POST['qa_inspector'] ?? '')) ?: $actorName;
        if ($poId <= 0) {
            qmsApiResponse(false, null, 'Missing PO ID.', [], 400);
        }

        $pdo->beginTransaction();
        $soRow = qmsFetchSalesOrderRow($pdo, $poId);
        if (!$soRow) {
            $pdo->rollBack();
            qmsApiResponse(false, null, 'PO not found.', [], 404);
        }

        $histId = qmsEnsureLatestHistoryRow($pdo, $soRow, 'ASSIGN_INSPECTOR', $actorName);
        $pdo->prepare("UPDATE dbo.SALES_ORDERS SET qa_inspector = ?, updated_at = GETDATE() WHERE id = ?")->execute([$inspector, $poId]);
        $pdo->prepare("UPDATE dbo.QMS_PO_INSPECTION_HISTORY SET qa_inspector = ?, updated_at = GETDATE() WHERE id = ?")->execute([$inspector, $histId]);
        $pdo->commit();

        if (function_exists('writeLog')) {
            writeLog($pdo, 'UPDATE', 'QMS_QA_SCHEDULE', $poId, ['qa_inspector' => $soRow['qa_inspector']], ['qa_inspector' => $inspector], "Assigned inspector {$inspector} to PO {$soRow['po_number']}");
        }
        qmsApiResponse(true, ['id' => $poId, 'qa_inspector' => $inspector], 'Inspector assigned successfully.');
    } elseif ($action === 'get_qc_users') {
        $sql = "SELECT id, COALESCE(NULLIF(fullname, ''), username) AS fullname, username, aka
                FROM dbo.USERS WITH (NOLOCK)
                WHERE role IN ('qc', 'qa') AND is_active = 1
                  AND COALESCE(NULLIF(fullname, ''), username) IS NOT NULL
                ORDER BY fullname ASC";
        $users = $pdo->query($sql)->fetchAll(PDO::FETCH_ASSOC);
        qmsApiResponse(true, $users, 'QC users loaded');
    } elseif ($action === 'bulk_update_ticket') {
        $rawIds = json_decode($_POST['po_ids'] ?? '[]', true);
        $poIds = array_values(array_unique(array_filter(array_map('intval', is_array($rawIds) ? $rawIds : []), static fn ($v) => $v > 0)));
        $ticketNumber = trim((string)($_POST['ticket_number'] ?? ''));
        $qaInspector = trim((string)($_POST['qa_inspector'] ?? ''));
        $inspectType = trim((string)($_POST['inspect_type'] ?? ''));
        $inspectionDate = qmsParseDate($_POST['inspection_date'] ?? null);

        if (empty($poIds)) {
            qmsApiResponse(false, null, 'No POs selected.', [], 400);
        }

        $pdo->beginTransaction();
        $reopenedCount = 0;
        foreach ($poIds as $poId) {
            $soRow = qmsFetchSalesOrderRow($pdo, $poId);
            if (!$soRow) {
                continue;
            }
            $oldDate = qmsParseDate($soRow['inspection_date'] ?? null);
            $oldTicket = trim((string)($soRow['ticket_number'] ?? ''));
            $isCompleted = qmsIsCompletedState($soRow['inspection_status'] ?? null, $soRow['inspection_result'] ?? null);
            $dateChanged = ($inspectionDate !== null && $oldDate !== $inspectionDate);
            $ticketChanged = ($ticketNumber !== '' && $oldTicket !== '' && $oldTicket !== $ticketNumber && $oldDate !== null);

            if ($isCompleted && ($dateChanged || $ticketChanged)) {
                qmsArchiveAndStartNewRound($pdo, $soRow, $inspectionDate ?? $oldDate, [
                    'ticket_number' => $ticketNumber,
                    'qa_inspector' => $qaInspector,
                    'inspect_type' => $inspectType,
                ], 'BULK_NEW_ROUND', $actorName);
                $reopenedCount++;
            } else {
                $histId = qmsEnsureLatestHistoryRow($pdo, $soRow, 'BULK_TICKET', $actorName);
                $newTicket = $ticketNumber !== '' ? $ticketNumber : $oldTicket;
                $newInspector = $qaInspector !== '' ? $qaInspector : ($soRow['qa_inspector'] ?? null);
                $newType = $inspectType !== '' ? $inspectType : ($soRow['inspect_type'] ?? null);
                $newDate = $inspectionDate ?? $oldDate;

                $pdo->prepare("
                    UPDATE dbo.SALES_ORDERS
                    SET ticket_number = ?, qa_inspector = ?, inspect_type = ?, inspection_date = ?, updated_at = GETDATE()
                    WHERE id = ?
                ")->execute([
                    $newTicket !== '' ? $newTicket : null,
                    $newInspector !== '' ? $newInspector : null,
                    $newType !== '' ? $newType : null,
                    $newDate,
                    $poId,
                ]);
                $pdo->prepare("
                    UPDATE dbo.QMS_PO_INSPECTION_HISTORY
                    SET ticket_number = ?, qa_inspector = ?, inspect_type = ?, scheduled_date = ?, updated_at = GETDATE()
                    WHERE id = ?
                ")->execute([
                    $newTicket !== '' ? $newTicket : null,
                    $newInspector !== '' ? $newInspector : null,
                    $newType !== '' ? $newType : null,
                    $newDate,
                    $histId,
                ]);
            }
        }
        $pdo->commit();

        if (function_exists('writeLog')) {
            writeLog($pdo, 'BULK_TICKET', 'QMS_QA_SCHEDULE', implode(',', $poIds), null, [
                'po_count' => count($poIds),
                'reopened_count' => $reopenedCount,
                'ticket_number' => $ticketNumber,
                'qa_inspector' => $qaInspector,
                'inspect_type' => $inspectType,
                'inspection_date' => $inspectionDate,
            ], 'Bulk updated QA schedule ticket');
        }
        $msg = count($poIds) . ' PO(s) updated successfully.' . ($reopenedCount > 0 ? " (Auto-opened new round for {$reopenedCount} completed PO(s))" : '');
        qmsApiResponse(true, ['updated_count' => count($poIds), 'reopened_count' => $reopenedCount], $msg);
    } elseif ($action === 'update_po_details') {
        $poId = intval($_POST['po_id'] ?? 0);
        if ($poId <= 0) {
            qmsApiResponse(false, null, 'Missing PO ID.', [], 400);
        }

        $poNumber = trim((string)($_POST['po_number'] ?? ''));
        $sku = trim((string)($_POST['sku'] ?? ''));
        $description = trim((string)($_POST['description'] ?? ''));
        $color = trim((string)($_POST['color'] ?? ''));
        $quantity = isset($_POST['quantity']) && $_POST['quantity'] !== '' ? floatval($_POST['quantity']) : null;
        $dcLocation = trim((string)($_POST['dc_location'] ?? ''));
        $loadingDate = qmsParseDate($_POST['loading_date'] ?? null);
        $loadingWeek = trim((string)($_POST['loading_week'] ?? ''));

        $oldStmt = $pdo->prepare("SELECT po_number, sku, description, color, quantity, dc_location, loading_date, loading_week FROM dbo.SALES_ORDERS WITH (NOLOCK) WHERE id = ?");
        $oldStmt->execute([$poId]);
        $oldData = $oldStmt->fetch(PDO::FETCH_ASSOC);
        if (!$oldData) {
            qmsApiResponse(false, null, 'PO not found.', [], 404);
        }

        $newData = [
            'po_number' => $poNumber,
            'sku' => $sku,
            'description' => $description,
            'color' => $color,
            'quantity' => $quantity,
            'dc_location' => $dcLocation,
            'loading_date' => $loadingDate,
            'loading_week' => $loadingWeek,
        ];

        $pdo->beginTransaction();
        $pdo->prepare("
            UPDATE dbo.SALES_ORDERS
            SET po_number = ?, sku = ?, description = ?, color = ?, quantity = ?, dc_location = ?, loading_date = ?, loading_week = ?, updated_at = GETDATE()
            WHERE id = ?
        ")->execute([$poNumber, $sku, $description, $color, $quantity, $dcLocation, $loadingDate, $loadingWeek, $poId]);
        $pdo->prepare("UPDATE dbo.QMS_PO_INSPECTION_HISTORY SET po_number = ?, updated_at = GETDATE() WHERE sales_order_id = ?")
            ->execute([$poNumber, $poId]);
        $pdo->commit();

        if (function_exists('writeLog')) {
            writeLog($pdo, 'UPDATE', 'QMS_QA_SCHEDULE', $poId, $oldData, $newData, 'User edited PO details');
        }
        qmsApiResponse(true, $newData, 'PO Details updated successfully.');
    } else {
        qmsApiResponse(false, null, 'Invalid action specified.', [], 400);
    }
} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    if (isset($pdo) && function_exists('writeErrorLog')) {
        writeErrorLog($pdo, 'QMS_QA_SCHEDULE', $e->getMessage(), ['action' => $action ?? '']);
    }
    qmsApiResponse(false, null, $e->getMessage(), [], 500);
}
?>
