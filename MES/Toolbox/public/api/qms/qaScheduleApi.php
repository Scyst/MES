<?php
/**
 * Self-contained QA/QC Schedule & Planner Calendar API (dbo.SALES_ORDERS + dbo.QMS_PO_INSPECTION_HISTORY).
 * Enforces explicit columns, TOP limits, CSRF tokens, multi-round history preservation,
 * FAIL-first status precedence, strict Read-Only guards on archived rounds, and SYSTEM_LOGS audit trail.
 */

require_once __DIR__ . '/_common.php';

/**
 * Checks whether a PO/round has reached a completed inspection state.
 */
function qaSchedIsCompleted(?string $status, ?string $result): bool {
    $st = strtoupper(trim((string)$status));
    $res = strtoupper(trim((string)$result));
    return in_array($res, ['PASS', 'FAIL'], true) || in_array($st, ['DONE', 'PASS'], true);
}

/**
 * Fetches explicit PO columns from dbo.SALES_ORDERS.
 */
function qaSchedFetchOrder(PDO $pdo, int $poId): ?array {
    $stmt = $pdo->prepare(
        "SELECT id, po_number, sku, description, color, quantity, dc_location, loading_date, loading_week,
                inspection_date, actual_inspection_date, inspection_status, inspection_result,
                is_confirmed, inspection_remark, qa_inspector, ticket_number, inspect_type
         FROM dbo.SALES_ORDERS WITH (NOLOCK)
         WHERE id = ?"
    );
    $stmt->execute([$poId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    return $row ?: null;
}

/**
 * Ensures an active (is_latest = 1) row exists in dbo.QMS_PO_INSPECTION_HISTORY for the PO.
 */
function qaSchedEnsureLatestHistory(PDO $pdo, array $soRow, string $sourceAction, string $actor): int {
    $soId = (int)$soRow['id'];
    $stmtLatest = $pdo->prepare(
        "SELECT TOP (1) id
         FROM dbo.QMS_PO_INSPECTION_HISTORY
         WHERE sales_order_id = ? AND is_latest = 1
         ORDER BY round_no DESC, id DESC"
    );
    $stmtLatest->execute([$soId]);
    $existingId = $stmtLatest->fetchColumn();
    if ($existingId !== false && (int)$existingId > 0) {
        return (int)$existingId;
    }

    $stmtMax = $pdo->prepare("SELECT ISNULL(MAX(round_no), 0) FROM dbo.QMS_PO_INSPECTION_HISTORY WHERE sales_order_id = ?");
    $stmtMax->execute([$soId]);
    $nextRound = ((int)$stmtMax->fetchColumn()) + 1;

    $schedDate = !empty($soRow['inspection_date']) ? substr((string)$soRow['inspection_date'], 0, 10) : null;
    $actualDate = !empty($soRow['actual_inspection_date']) ? substr((string)$soRow['actual_inspection_date'], 0, 10) : null;
    $status = trim((string)($soRow['inspection_status'] ?? ''));

    $pdo->prepare(
        "INSERT INTO dbo.QMS_PO_INSPECTION_HISTORY (
            sales_order_id, po_number, round_no, ticket_number, scheduled_date,
            actual_inspection_date, inspection_status, inspection_result, inspect_type,
            qa_inspector, inspection_remark, is_latest, source_action, created_by, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, GETDATE(), GETDATE())"
    )->execute([
        $soId,
        $soRow['po_number'],
        $nextRound,
        ($soRow['ticket_number'] ?? '') !== '' ? $soRow['ticket_number'] : null,
        $schedDate,
        $actualDate,
        $status !== '' ? $status : 'WAITING',
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
 * Archives current active round (is_latest = 0) and opens Round N+1 in WAITING state.
 */
function qaSchedArchiveAndStartNewRound(
    PDO $pdo,
    array $soRow,
    ?string $newSchedDate,
    array $overrides,
    string $sourceAction,
    string $actor
): array {
    $soId = (int)$soRow['id'];
    $hasPriorData = !empty($soRow['inspection_date'])
        || !empty($soRow['actual_inspection_date'])
        || trim((string)($soRow['ticket_number'] ?? '')) !== ''
        || qaSchedIsCompleted($soRow['inspection_status'] ?? null, $soRow['inspection_result'] ?? null);

    $stmtCount = $pdo->prepare("SELECT COUNT(*) FROM dbo.QMS_PO_INSPECTION_HISTORY WHERE sales_order_id = ?");
    $stmtCount->execute([$soId]);
    if ((int)$stmtCount->fetchColumn() === 0 && $hasPriorData) {
        qaSchedEnsureLatestHistory($pdo, $soRow, 'AUTO_ARCHIVE_PRIOR', $actor);
    }

    $pdo->prepare("UPDATE dbo.QMS_PO_INSPECTION_HISTORY SET is_latest = 0, updated_at = GETDATE() WHERE sales_order_id = ? AND is_latest = 1")
        ->execute([$soId]);

    $stmtMax = $pdo->prepare("SELECT ISNULL(MAX(round_no), 0) FROM dbo.QMS_PO_INSPECTION_HISTORY WHERE sales_order_id = ?");
    $stmtMax->execute([$soId]);
    $nextRound = ((int)$stmtMax->fetchColumn()) + 1;

    $ticket = array_key_exists('ticket_number', $overrides) ? trim((string)$overrides['ticket_number']) : '';
    $inspector = array_key_exists('qa_inspector', $overrides) ? trim((string)$overrides['qa_inspector']) : '';
    $inspectType = array_key_exists('inspect_type', $overrides)
        ? trim((string)$overrides['inspect_type'])
        : trim((string)($soRow['inspect_type'] ?? ''));
    $remark = $overrides['inspection_remark'] ?? null;

    $pdo->prepare(
        "INSERT INTO dbo.QMS_PO_INSPECTION_HISTORY (
            sales_order_id, po_number, round_no, ticket_number, scheduled_date,
            actual_inspection_date, inspection_status, inspection_result, inspect_type,
            qa_inspector, inspection_remark, is_latest, source_action, created_by, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, NULL, 'WAITING', NULL, ?, ?, ?, 1, ?, ?, GETDATE(), GETDATE())"
    )->execute([
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

    $pdo->prepare(
        "UPDATE dbo.SALES_ORDERS
         SET inspection_date = ?, actual_inspection_date = NULL, inspection_status = 'WAITING',
             inspection_result = NULL, ticket_number = ?, qa_inspector = ?, inspect_type = ?,
             inspection_remark = ?, updated_at = GETDATE()
         WHERE id = ?"
    )->execute([
        $newSchedDate,
        $ticket !== '' ? $ticket : null,
        $inspector !== '' ? $inspector : null,
        $inspectType !== '' ? $inspectType : null,
        $remark,
        $soId,
    ]);

    return [
        'id' => $soId,
        'history_id' => $historyId,
        'round_no' => $nextRound,
        'scheduled_date' => $newSchedDate,
    ];
}

try {
    [$action, $input, $currentUser] = parseQmsRequest();
    requireQmsAccess();

    $actorName = resolveQmsActorName($pdo, $currentUser);

    switch ($action) {
        case 'get_schedule':
            $startDate = parseQmsDateOrNull($input['start_date'] ?? date('Y-m-d')) ?? date('Y-m-d');
            $endDate = parseQmsDateOrNull($input['end_date'] ?? date('Y-m-d')) ?? date('Y-m-d');
            $range = trim((string)($input['range'] ?? 'date'));

            if ($range === 'today') {
                $startDate = date('Y-m-d');
                $endDate = date('Y-m-d');
            } elseif ($range === 'this_week') {
                $startDate = date('Y-m-d', strtotime('monday this week'));
                $endDate = date('Y-m-d', strtotime('sunday this week'));
            } elseif ($range === 'this_month') {
                $startDate = date('Y-m-01');
                $endDate = date('Y-m-t');
            } elseif ($range === 'last_month') {
                $startDate = date('Y-m-01', strtotime('first day of last month'));
                $endDate = date('Y-m-t', strtotime('last day of last month'));
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
            $stmt->execute([$startDate, $endDate, $startDate, $endDate]);
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $stats = [
                'total' => count($data),
                'waiting' => 0,
                'in_progress' => 0,
                'passed' => 0,
                'failed' => 0,
            ];
            foreach ($data as $row) {
                $st = strtoupper(trim((string)($row['inspection_status'] ?? '')));
                $res = strtoupper(trim((string)($row['inspection_result'] ?? '')));
                // Evaluate FAIL before PASS/DONE so corrupted legacy 'Pass' + FAIL rows never miscount as passed.
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

            qmsJsonSuccess(['rows' => $data, 'stats' => $stats, 'start_date' => $startDate, 'end_date' => $endDate]);
            break;

        case 'get_po_history':
            $poId = parseQmsPositiveInt($input['id'] ?? null, 'รหัส PO');
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
            qmsJsonSuccess($stmt->fetchAll(PDO::FETCH_ASSOC));
            break;

        case 'get_pending_jobs':
            $search = trim((string)($input['search'] ?? ''));
            $where = "(inspection_date IS NULL OR inspection_status = 'WAITING' OR inspection_status IS NULL OR inspection_status = 'No')
                      AND UPPER(LTRIM(RTRIM(ISNULL(inspection_result, '')))) NOT IN ('PASS', 'FAIL')";
            $params = [];
            if ($search !== '') {
                $where .= ' AND (po_number LIKE ? OR sku LIKE ? OR description LIKE ?)';
                $like = '%' . $search . '%';
                array_push($params, $like, $like, $like);
            }

            $sql = "
                SELECT TOP (100)
                    id, po_number, sku, description, color, quantity, dc_location, loading_date, loading_week,
                    inspection_date, inspection_status, inspection_result, ticket_number
                FROM dbo.SALES_ORDERS WITH (NOLOCK)
                WHERE {$where}
                ORDER BY loading_date ASC, id DESC
            ";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            qmsJsonSuccess($stmt->fetchAll(PDO::FETCH_ASSOC));
            break;

        case 'search_po':
            $search = trim((string)($input['search'] ?? ''));
            if ($search === '') {
                qmsJsonSuccess([]);
            }
            $sql = "
                SELECT TOP (30)
                    id, po_number, sku, description, color, quantity, dc_location, loading_date,
                    inspection_date, actual_inspection_date, inspection_status, inspection_result,
                    ticket_number, inspect_type, qa_inspector,
                    (SELECT COUNT(*) FROM dbo.QMS_PO_INSPECTION_HISTORY h WITH (NOLOCK) WHERE h.sales_order_id = dbo.SALES_ORDERS.id) AS total_rounds
                FROM dbo.SALES_ORDERS WITH (NOLOCK)
                WHERE po_number LIKE ? OR sku LIKE ?
                ORDER BY loading_date DESC, id DESC
            ";
            $stmt = $pdo->prepare($sql);
            $like = '%' . $search . '%';
            $stmt->execute([$like, $like]);
            qmsJsonSuccess($stmt->fetchAll(PDO::FETCH_ASSOC));
            break;

        case 'get_qc_users':
            $sql = "
                SELECT u.id,
                       COALESCE(NULLIF(m.name_th, ''), NULLIF(u.fullname, ''), u.username) AS fullname,
                       u.username,
                       u.aka
                FROM dbo.USERS u WITH (NOLOCK)
                LEFT JOIN dbo.MANPOWER_EMPLOYEES m WITH (NOLOCK) ON u.username = m.emp_id
                WHERE u.role IN ('qc', 'qa') AND u.is_active = 1
                  AND COALESCE(NULLIF(m.name_th, ''), NULLIF(u.fullname, ''), u.username) IS NOT NULL
                ORDER BY fullname ASC
            ";
            $users = $pdo->query($sql)->fetchAll(PDO::FETCH_ASSOC);
            qmsJsonSuccess($users);
            break;

        case 'schedule_po':
            $poId = parseQmsPositiveInt($input['id'] ?? null, 'รหัส PO');
            $scheduleDate = parseQmsDateOrNull($input['schedule_date'] ?? null);
            if ($scheduleDate === null) {
                throw new InvalidArgumentException('กรุณาระบุวันที่กำหนดตรวจ (Schedule Date)');
            }

            $pdo->beginTransaction();
            $soRow = qaSchedFetchOrder($pdo, $poId);
            if (!$soRow) {
                $pdo->rollBack();
                qmsJsonError('ไม่พบข้อมูล PO ที่ระบุ', 404);
            }

            $oldDate = !empty($soRow['inspection_date']) ? substr((string)$soRow['inspection_date'], 0, 10) : null;
            $isCompleted = qaSchedIsCompleted($soRow['inspection_status'] ?? null, $soRow['inspection_result'] ?? null);

            if ($isCompleted && $oldDate !== $scheduleDate) {
                $roundInfo = qaSchedArchiveAndStartNewRound($pdo, $soRow, $scheduleDate, [], 'RESCHEDULE_NEW_ROUND', $actorName);
                $pdo->commit();
                writeLog($pdo, 'REOPEN', 'QMS_QA_SCHEDULE', $poId, $soRow, $roundInfo, "Auto-opened Round {$roundInfo['round_no']} for PO {$soRow['po_number']} on {$scheduleDate}");
                qmsJsonSuccess($roundInfo, 'บันทึกประวัติรอบเดิมไว้แล้ว และเปิดตรวจรอบใหม่เรียบร้อย', ['new_round' => true]);
            }

            $histId = qaSchedEnsureLatestHistory($pdo, $soRow, 'SCHEDULE_PO', $actorName);
            $pdo->prepare("UPDATE dbo.SALES_ORDERS SET inspection_date = ?, updated_at = GETDATE() WHERE id = ?")
                ->execute([$scheduleDate, $poId]);
            $pdo->prepare("UPDATE dbo.QMS_PO_INSPECTION_HISTORY SET scheduled_date = ?, updated_at = GETDATE() WHERE id = ?")
                ->execute([$scheduleDate, $histId]);
            $pdo->commit();

            writeLog($pdo, 'RESCHEDULE', 'QMS_QA_SCHEDULE', $poId, ['inspection_date' => $oldDate], ['inspection_date' => $scheduleDate], "Scheduled PO {$soRow['po_number']} to {$scheduleDate}");
            qmsJsonSuccess(['id' => $poId, 'inspection_date' => $scheduleDate], 'จัดตารางตรวจ QA/QC เรียบร้อยแล้ว');
            break;

        case 'reopen_inspection':
            $poId = parseQmsPositiveInt($input['id'] ?? null, 'รหัส PO');
            $scheduleDate = parseQmsDateOrNull($input['schedule_date'] ?? null) ?? date('Y-m-d');
            $inspectType = trim((string)($input['inspect_type'] ?? ''));
            if ($inspectType !== '' && !in_array($inspectType, ['Remote', 'On-site'], true)) {
                throw new InvalidArgumentException('รูปแบบการตรวจต้องเป็น Remote หรือ On-site');
            }

            $pdo->beginTransaction();
            $soRow = qaSchedFetchOrder($pdo, $poId);
            if (!$soRow) {
                $pdo->rollBack();
                qmsJsonError('ไม่พบข้อมูล PO ที่ระบุ', 404);
            }

            $overrides = [
                'ticket_number' => trim((string)($input['ticket_number'] ?? '')),
                'qa_inspector' => trim((string)($input['qa_inspector'] ?? '')),
                'inspect_type' => $inspectType !== '' ? $inspectType : ($soRow['inspect_type'] ?? ''),
                'inspection_remark' => trim((string)($input['remark'] ?? '')) ?: null,
            ];
            $roundInfo = qaSchedArchiveAndStartNewRound($pdo, $soRow, $scheduleDate, $overrides, 'REOPEN_INSPECTION', $actorName);
            $pdo->commit();

            writeLog($pdo, 'REOPEN', 'QMS_QA_SCHEDULE', $poId, $soRow, $roundInfo, "Manually reopened Round {$roundInfo['round_no']} for PO {$soRow['po_number']} on {$scheduleDate}");
            qmsJsonSuccess($roundInfo, "เปิดตรวจรอบที่ {$roundInfo['round_no']} เรียบร้อยแล้ว (เก็บประวัติรอบเดิมไว้ครบถ้วน)");
            break;

        case 'update_result':
            $poId = parseQmsPositiveInt($input['id'] ?? null, 'รหัส PO');
            $historyId = !empty($input['history_id']) ? (int)$input['history_id'] : 0;
            $inspectionStatus = strtoupper(trim((string)($input['inspection_status'] ?? '')));
            $inspectionResult = strtoupper(trim((string)($input['inspection_result'] ?? '')));
            if ($inspectionResult === 'PENDING' || $inspectionResult === '') {
                $inspectionResult = null;
            }
            if (!in_array($inspectionStatus, ['WAITING', 'IN_PROGRESS', 'DONE'], true)) {
                throw new InvalidArgumentException('สถานะการตรวจไม่ถูกต้อง (ต้องเป็น WAITING, IN_PROGRESS หรือ DONE)');
            }
            if ($inspectionResult !== null && !in_array($inspectionResult, ['PASS', 'FAIL'], true)) {
                throw new InvalidArgumentException('ผลการตรวจไม่ถูกต้อง (ต้องเป็น PASS หรือ FAIL)');
            }

            $remark = trim((string)($input['remark'] ?? ''));
            $ticketNumber = trim((string)($input['ticket_number'] ?? '')) ?: null;
            $qaInspector = trim((string)($input['qa_inspector'] ?? '')) ?: null;
            $inspectType = trim((string)($input['inspect_type'] ?? '')) ?: null;
            if ($inspectType !== null && !in_array($inspectType, ['Remote', 'On-site'], true)) {
                throw new InvalidArgumentException('รูปแบบการตรวจต้องเป็น Remote หรือ On-site');
            }
            $actualDate = parseQmsDateOrNull($input['actual_inspection_date'] ?? null);

            if (in_array($inspectionResult, ['PASS', 'FAIL'], true)) {
                $inspectionStatus = 'DONE';
                if ($actualDate === null) {
                    $actualDate = date('Y-m-d');
                }
            } elseif ($inspectionStatus === 'DONE' && $inspectionResult === null) {
                $inspectionResult = 'PASS';
                if ($actualDate === null) {
                    $actualDate = date('Y-m-d');
                }
            } elseif ($inspectionStatus === 'WAITING') {
                $inspectionResult = null;
            }

            $pdo->beginTransaction();
            if ($historyId > 0) {
                $stmtH = $pdo->prepare("SELECT id, is_latest FROM dbo.QMS_PO_INSPECTION_HISTORY WHERE id = ?");
                $stmtH->execute([$historyId]);
                $histRow = $stmtH->fetch(PDO::FETCH_ASSOC);
                if ($histRow && (int)$histRow['is_latest'] !== 1) {
                    $pdo->rollBack();
                    throw new InvalidArgumentException('รายการนี้เป็นประวัติการตรวจรอบเก่า (Read-Only) หากต้องการตรวจซ้ำกรุณากด "เปิดตรวจรอบใหม่"');
                }
            }

            $soRow = qaSchedFetchOrder($pdo, $poId);
            if (!$soRow) {
                $pdo->rollBack();
                qmsJsonError('ไม่พบข้อมูล PO ที่ระบุ', 404);
            }

            $activeHistId = qaSchedEnsureLatestHistory($pdo, $soRow, 'UPDATE_RESULT', $actorName);

            $pdo->prepare("
                UPDATE dbo.SALES_ORDERS
                SET inspection_status = ?, inspection_result = ?, inspection_remark = ?,
                    ticket_number = ?, qa_inspector = ?, inspect_type = ?, actual_inspection_date = ?, updated_at = GETDATE()
                WHERE id = ?
            ")->execute([
                $inspectionStatus, $inspectionResult, $remark,
                $ticketNumber, $qaInspector, $inspectType, $actualDate, $poId,
            ]);

            $pdo->prepare("
                UPDATE dbo.QMS_PO_INSPECTION_HISTORY
                SET inspection_status = ?, inspection_result = ?, inspection_remark = ?,
                    ticket_number = ?, qa_inspector = ?, inspect_type = ?, actual_inspection_date = ?, updated_at = GETDATE()
                WHERE id = ?
            ")->execute([
                $inspectionStatus, $inspectionResult, $remark,
                $ticketNumber, $qaInspector, $inspectType, $actualDate, $activeHistId,
            ]);
            $pdo->commit();

            $newData = [
                'inspection_status' => $inspectionStatus,
                'inspection_result' => $inspectionResult,
                'inspection_remark' => $remark,
                'ticket_number' => $ticketNumber,
                'qa_inspector' => $qaInspector,
                'inspect_type' => $inspectType,
                'actual_inspection_date' => $actualDate,
            ];
            writeLog($pdo, 'UPDATE', 'QMS_QA_SCHEDULE', $poId, $soRow, $newData, "Updated QA inspection {$soRow['po_number']}");
            qmsJsonSuccess(['id' => $poId], 'อัปเดตผลการตรวจ QA/QC เรียบร้อยแล้ว');
            break;

        case 'remove_schedule':
            $poId = parseQmsPositiveInt($input['id'] ?? null, 'รหัส PO');
            $historyId = !empty($input['history_id']) ? (int)$input['history_id'] : 0;
            $force = (string)($input['force'] ?? '0');

            $pdo->beginTransaction();
            if ($historyId > 0) {
                $stmtH = $pdo->prepare("SELECT id, is_latest FROM dbo.QMS_PO_INSPECTION_HISTORY WHERE id = ?");
                $stmtH->execute([$historyId]);
                $histRow = $stmtH->fetch(PDO::FETCH_ASSOC);
                if ($histRow && (int)$histRow['is_latest'] !== 1) {
                    $pdo->rollBack();
                    throw new InvalidArgumentException('ไม่สามารถลบประวัติการตรวจรอบเก่าได้');
                }
            }

            $soRow = qaSchedFetchOrder($pdo, $poId);
            if (!$soRow) {
                $pdo->rollBack();
                qmsJsonError('ไม่พบข้อมูล PO ที่ระบุ', 404);
            }

            $status = strtoupper(trim((string)($soRow['inspection_status'] ?? 'WAITING')));
            $result = strtoupper(trim((string)($soRow['inspection_result'] ?? '')));
            if (($status === 'IN_PROGRESS' || $status === 'DONE' || $status === 'PASS' || in_array($result, ['PASS', 'FAIL'], true)) && $force !== '1') {
                $pdo->rollBack();
                qmsJsonSuccess(['require_force' => true], 'รายการนี้อยู่ระหว่างดำเนินการหรือตรวจเสร็จแล้ว กรุณายืนยันการนำออกจากตาราง', ['require_force' => true]);
            }

            $pdo->prepare("DELETE FROM dbo.QMS_PO_INSPECTION_HISTORY WHERE sales_order_id = ? AND is_latest = 1")
                ->execute([$poId]);

            $stmtPrev = $pdo->prepare(
                "SELECT TOP (1) id, ticket_number, scheduled_date, actual_inspection_date, inspection_status,
                        inspection_result, inspect_type, qa_inspector, inspection_remark
                 FROM dbo.QMS_PO_INSPECTION_HISTORY
                 WHERE sales_order_id = ?
                 ORDER BY round_no DESC, id DESC"
            );
            $stmtPrev->execute([$poId]);
            $prevRound = $stmtPrev->fetch(PDO::FETCH_ASSOC);

            if ($prevRound) {
                $pdo->prepare("UPDATE dbo.QMS_PO_INSPECTION_HISTORY SET is_latest = 1, updated_at = GETDATE() WHERE id = ?")
                    ->execute([$prevRound['id']]);
                $pdo->prepare(
                    "UPDATE dbo.SALES_ORDERS
                     SET inspection_date = ?, actual_inspection_date = ?, inspection_status = ?, inspection_result = ?,
                         inspection_remark = ?, qa_inspector = ?, ticket_number = ?, inspect_type = ?, updated_at = GETDATE()
                     WHERE id = ?"
                )->execute([
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
                $pdo->prepare(
                    "UPDATE dbo.SALES_ORDERS
                     SET inspection_date = NULL, actual_inspection_date = NULL, inspection_status = 'WAITING',
                         inspection_result = NULL, inspection_remark = NULL, qa_inspector = NULL, updated_at = GETDATE()
                     WHERE id = ?"
                )->execute([$poId]);
                $msg = 'นำรายการออกจากตารางตรวจและรีเซ็ตสถานะเรียบร้อยแล้ว';
            }
            $pdo->commit();

            writeLog($pdo, 'DELETE', 'QMS_QA_SCHEDULE', $poId, $soRow, ['restored_previous_round' => (bool)$prevRound], "Removed PO {$soRow['po_number']} from QA schedule");
            qmsJsonSuccess(['id' => $poId, 'restored_previous_round' => (bool)$prevRound], $msg);
            break;

        case 'assign_inspector':
            $poId = parseQmsPositiveInt($input['id'] ?? null, 'รหัส PO');
            $inspector = trim((string)($input['qa_inspector'] ?? '')) ?: $actorName;

            $pdo->beginTransaction();
            $soRow = qaSchedFetchOrder($pdo, $poId);
            if (!$soRow) {
                $pdo->rollBack();
                qmsJsonError('ไม่พบข้อมูล PO ที่ระบุ', 404);
            }

            $histId = qaSchedEnsureLatestHistory($pdo, $soRow, 'ASSIGN_INSPECTOR', $actorName);
            $pdo->prepare("UPDATE dbo.SALES_ORDERS SET qa_inspector = ?, updated_at = GETDATE() WHERE id = ?")
                ->execute([$inspector, $poId]);
            $pdo->prepare("UPDATE dbo.QMS_PO_INSPECTION_HISTORY SET qa_inspector = ?, updated_at = GETDATE() WHERE id = ?")
                ->execute([$inspector, $histId]);
            $pdo->commit();

            writeLog($pdo, 'UPDATE', 'QMS_QA_SCHEDULE', $poId, ['qa_inspector' => $soRow['qa_inspector']], ['qa_inspector' => $inspector], "Assigned inspector {$inspector} to {$soRow['po_number']}");
            qmsJsonSuccess(['id' => $poId, 'qa_inspector' => $inspector], 'มอบหมายผู้ตรวจสอบเรียบร้อยแล้ว');
            break;

        case 'bulk_update_ticket':
            $rawIds = $input['po_ids'] ?? [];
            if (is_string($rawIds)) {
                $rawIds = json_decode($rawIds, true) ?: [];
            }
            $poIds = array_values(array_unique(array_filter(array_map('intval', is_array($rawIds) ? $rawIds : []), static fn ($v) => $v > 0)));
            if (empty($poIds)) {
                throw new InvalidArgumentException('กรุณาเลือก PO อย่างน้อย 1 รายการ');
            }

            $ticketNumber = trim((string)($input['ticket_number'] ?? ''));
            $qaInspector = trim((string)($input['qa_inspector'] ?? ''));
            $inspectType = trim((string)($input['inspect_type'] ?? ''));
            if ($inspectType !== '' && !in_array($inspectType, ['Remote', 'On-site'], true)) {
                throw new InvalidArgumentException('รูปแบบการตรวจต้องเป็น Remote หรือ On-site');
            }
            $inspectionDate = parseQmsDateOrNull($input['inspection_date'] ?? null);

            $pdo->beginTransaction();
            $reopenedCount = 0;
            foreach ($poIds as $poId) {
                $soRow = qaSchedFetchOrder($pdo, $poId);
                if (!$soRow) {
                    continue;
                }
                $oldDate = !empty($soRow['inspection_date']) ? substr((string)$soRow['inspection_date'], 0, 10) : null;
                $oldTicket = trim((string)($soRow['ticket_number'] ?? ''));
                $isCompleted = qaSchedIsCompleted($soRow['inspection_status'] ?? null, $soRow['inspection_result'] ?? null);
                $dateChanged = ($inspectionDate !== null && $oldDate !== $inspectionDate);
                $ticketChanged = ($ticketNumber !== '' && $oldTicket !== '' && $oldTicket !== $ticketNumber && $oldDate !== null);

                if ($isCompleted && ($dateChanged || $ticketChanged)) {
                    qaSchedArchiveAndStartNewRound($pdo, $soRow, $inspectionDate ?? $oldDate, [
                        'ticket_number' => $ticketNumber,
                        'qa_inspector' => $qaInspector,
                        'inspect_type' => $inspectType,
                    ], 'BULK_NEW_ROUND', $actorName);
                    $reopenedCount++;
                } else {
                    $histId = qaSchedEnsureLatestHistory($pdo, $soRow, 'BULK_TICKET', $actorName);
                    $newTicket = $ticketNumber !== '' ? $ticketNumber : $oldTicket;
                    $newInspector = $qaInspector !== '' ? $qaInspector : ($soRow['qa_inspector'] ?? null);
                    $newType = $inspectType !== '' ? $inspectType : ($soRow['inspect_type'] ?? null);
                    $newDate = $inspectionDate ?? $oldDate;

                    $pdo->prepare(
                        "UPDATE dbo.SALES_ORDERS
                         SET ticket_number = ?, qa_inspector = ?, inspect_type = ?, inspection_date = ?, updated_at = GETDATE()
                         WHERE id = ?"
                    )->execute([
                        $newTicket !== '' ? $newTicket : null,
                        $newInspector !== '' ? $newInspector : null,
                        $newType !== '' ? $newType : null,
                        $newDate,
                        $poId,
                    ]);
                    $pdo->prepare(
                        "UPDATE dbo.QMS_PO_INSPECTION_HISTORY
                         SET ticket_number = ?, qa_inspector = ?, inspect_type = ?, scheduled_date = ?, updated_at = GETDATE()
                         WHERE id = ?"
                    )->execute([
                        $newTicket !== '' ? $newTicket : null,
                        $newInspector !== '' ? $newInspector : null,
                        $newType !== '' ? $newType : null,
                        $newDate,
                        $histId,
                    ]);
                }
            }
            $pdo->commit();

            writeLog($pdo, 'UPDATE', 'QMS_QA_SCHEDULE', implode(',', $poIds), null, [
                'po_count' => count($poIds),
                'reopened_count' => $reopenedCount,
                'ticket_number' => $ticketNumber,
                'qa_inspector' => $qaInspector,
                'inspect_type' => $inspectType,
                'inspection_date' => $inspectionDate,
            ], 'Bulk updated QA schedule ticket');

            $msg = 'อัปเดต Ticket สำหรับ ' . count($poIds) . ' PO เรียบร้อยแล้ว'
                . ($reopenedCount > 0 ? " (เปิดรอบตรวจใหม่พร้อมเก็บประวัติเดิม {$reopenedCount} รายการ)" : '');
            qmsJsonSuccess(['updated_count' => count($poIds), 'reopened_count' => $reopenedCount], $msg);
            break;

        case 'update_po_details':
            $poId = parseQmsPositiveInt($input['po_id'] ?? ($input['id'] ?? null), 'รหัส PO');
            $poNumber = trim((string)($input['po_number'] ?? ''));
            if ($poNumber === '') {
                throw new InvalidArgumentException('กรุณาระบุเลขที่ PO Number');
            }
            $sku = trim((string)($input['sku'] ?? ''));
            $description = trim((string)($input['description'] ?? ''));
            $color = trim((string)($input['color'] ?? ''));
            $quantity = parseQmsBoundedFloat($input['quantity'] ?? null, 'จำนวนสินค้า', 0, 99999999, true);
            $dcLocation = trim((string)($input['dc_location'] ?? ''));
            $loadingDate = parseQmsDateOrNull($input['loading_date'] ?? null);
            $loadingWeek = trim((string)($input['loading_week'] ?? ''));

            $stmtOld = $pdo->prepare(
                "SELECT po_number, sku, description, color, quantity, dc_location, loading_date, loading_week
                 FROM dbo.SALES_ORDERS WITH (NOLOCK) WHERE id = ?"
            );
            $stmtOld->execute([$poId]);
            $oldData = $stmtOld->fetch(PDO::FETCH_ASSOC);
            if (!$oldData) {
                qmsJsonError('ไม่พบข้อมูล PO ที่ต้องการแก้ไข', 404);
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
                SET po_number = ?, sku = ?, description = ?, color = ?, quantity = ?,
                    dc_location = ?, loading_date = ?, loading_week = ?, updated_at = GETDATE()
                WHERE id = ?
            ")->execute([
                $poNumber, $sku, $description, $color, $quantity,
                $dcLocation, $loadingDate, $loadingWeek, $poId,
            ]);
            $pdo->prepare("UPDATE dbo.QMS_PO_INSPECTION_HISTORY SET po_number = ?, updated_at = GETDATE() WHERE sales_order_id = ?")
                ->execute([$poNumber, $poId]);
            $pdo->commit();

            writeLog($pdo, 'UPDATE', 'QMS_QA_SCHEDULE', $poId, $oldData, $newData, "Updated PO details {$poNumber}");
            qmsJsonSuccess(['id' => $poId], 'อัปเดตข้อมูล PO เรียบร้อยแล้ว');
            break;

        default:
            qmsJsonError('ไม่พบ Action ที่ระบุ', 400);
    }
} catch (InvalidArgumentException $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    qmsJsonError($e->getMessage(), 400);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    if (isset($pdo)) {
        writeErrorLog($pdo, 'QMS_QA_SCHEDULE', $e->getMessage(), $input ?? null);
    }
    qmsJsonError('เกิดข้อผิดพลาดในระบบตารางตรวจ QA/QC กรุณาลองใหม่อีกครั้ง', 500);
}
