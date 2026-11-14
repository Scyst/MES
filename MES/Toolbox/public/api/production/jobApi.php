<?php
/**
 * Self-contained Toolbox API for Live Production Job Queue (KDS).
 * Enforces state transitions, BOM readiness checks, and atomic transaction logging.
 */

require_once __DIR__ . '/_common.php';

[$action, $input, $currentUser] = parseProductionRequest();

try {
    switch ($action) {
        case 'get_locations':
            handleJobLocations($pdo);
            break;

        case 'get_items':
            handleJobItems($pdo);
            break;

        case 'get_active_jobs':
            handleGetActiveJobs($pdo, $input);
            break;

        case 'get_all_jobs':
            handleGetAllJobs($pdo, $input);
            break;

        case 'create_job':
            handleCreateJob($pdo, $input, $currentUser);
            break;

        case 'start_job':
            handleStartJob($pdo, $input, $currentUser);
            break;

        case 'pause_job':
            handlePauseJob($pdo, $input, $currentUser);
            break;

        case 'record_output':
            handleRecordJobOutput($pdo, $input, $currentUser);
            break;

        case 'delete_txn':
            handleDeleteJobTxn($pdo, $input, $currentUser);
            break;

        case 'close_job':
            handleCloseJob($pdo, $input, $currentUser);
            break;

        case 'edit_job':
            handleEditJob($pdo, $input, $currentUser);
            break;

        case 'delete_job':
            handleDeleteJob($pdo, $input, $currentUser);
            break;

        case 'reopen_job':
            handleReopenJob($pdo, $input, $currentUser);
            break;

        case 'reorder_queue':
            handleReorderQueue($pdo, $input, $currentUser);
            break;

        case 'get_job_logs':
            handleGetJobLogs($pdo, $input);
            break;

        default:
            prodJsonError("ไม่พบ Action '{$action}' ในระบบ Job API", 400);
    }
} catch (Throwable $e) {
    handleApiError($e, $pdo ?? null, $input ?? $_REQUEST);
}

function handleJobLocations(PDO $pdo): void {
    $stmt = $pdo->query("
        SELECT location_id, location_name, location_description, location_type, production_line
        FROM " . LOCATIONS_TABLE . " WITH (NOLOCK)
        WHERE is_active = 1
          AND location_type IN ('WIP', 'FG')
        ORDER BY location_name ASC
    ");
    prodJsonSuccess($stmt->fetchAll(PDO::FETCH_ASSOC), 'Loaded job queue locations');
}

function handleJobItems(PDO $pdo): void {
    $stmt = $pdo->query("
        SELECT TOP 3000 item_id, sap_no, part_no, part_description, material_type, planned_output, sku, CTN
        FROM " . ITEMS_TABLE . " WITH (NOLOCK)
        WHERE is_active = 1
        ORDER BY sap_no ASC
    ");
    prodJsonSuccess($stmt->fetchAll(PDO::FETCH_ASSOC), 'Loaded items');
}

function handleGetActiveJobs(PDO $pdo, array $input): void {
    $conditions = ["j.status IN ('PENDING', 'RUNNING', 'PAUSED', 'PLANNED', 'IN_PROGRESS')"];
    $params = [];
    if (!empty($input['location_id']) && $input['location_id'] !== 'ALL') {
        $conditions[] = "j.location_id = ?";
        $params[] = (int)$input['location_id'];
    }
    $whereSql = 'WHERE ' . implode(' AND ', $conditions);

    $sql = "
        SELECT TOP 300
            j.job_id, j.job_no, j.location_id, j.item_id, j.target_qty, j.actual_qty, j.hold_qty, j.scrap_qty,
            j.status, j.start_time, j.end_time, j.created_by, j.created_at, j.queue_order, j.total_running_minutes, j.lot_no,
            i.sap_no, i.part_no, i.part_description, i.planned_output,
            l.location_name, l.location_type, l.production_line,
            COALESCE(NULLIF(u.fullname, ''), u.username) AS created_by_name
        FROM dbo.PRODUCTION_JOBS j WITH (NOLOCK)
        JOIN " . ITEMS_TABLE . " i WITH (NOLOCK) ON j.item_id = i.item_id
        JOIN " . LOCATIONS_TABLE . " l WITH (NOLOCK) ON j.location_id = l.location_id
        LEFT JOIN " . USERS_TABLE . " u WITH (NOLOCK) ON j.created_by = u.id
        {$whereSql}
        ORDER BY j.location_id ASC,
                 CASE WHEN j.status = 'RUNNING' THEN 0 WHEN j.status = 'PAUSED' THEN 1 ELSE 2 END ASC,
                 ISNULL(j.queue_order, 999999) ASC,
                 j.created_at ASC
    ";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    prodJsonSuccess($stmt->fetchAll(PDO::FETCH_ASSOC), 'Loaded active jobs');
}

function handleGetAllJobs(PDO $pdo, array $input): void {
    $page = max(1, (int)($input['page'] ?? 1));
    $limit = max(1, min(100, (int)($input['limit'] ?? 50)));
    $offset = ($page - 1) * $limit;

    $conditions = ["1=1"];
    $params = [];
    if (!empty($input['location_id']) && $input['location_id'] !== 'ALL') {
        $conditions[] = "j.location_id = ?";
        $params[] = (int)$input['location_id'];
    }
    if (!empty($input['status']) && $input['status'] !== 'ALL') {
        $conditions[] = "j.status = ?";
        $params[] = trim((string)$input['status']);
    }
    if (!empty($input['search'])) {
        $term = '%' . trim((string)$input['search']) . '%';
        $conditions[] = "(j.job_no LIKE ? OR j.lot_no LIKE ? OR i.sap_no LIKE ? OR i.part_no LIKE ?)";
        array_push($params, $term, $term, $term, $term);
    }
    $whereSql = 'WHERE ' . implode(' AND ', $conditions);

    $cntStmt = $pdo->prepare("
        SELECT COUNT(*)
        FROM dbo.PRODUCTION_JOBS j WITH (NOLOCK)
        JOIN " . ITEMS_TABLE . " i WITH (NOLOCK) ON j.item_id = i.item_id
        {$whereSql}
    ");
    $cntStmt->execute($params);
    $total = (int)$cntStmt->fetchColumn();

    $sql = "
        SELECT
            j.job_id, j.job_no, j.location_id, j.item_id, j.target_qty, j.actual_qty, j.hold_qty, j.scrap_qty,
            j.status, j.start_time, j.end_time, j.created_at, j.queue_order, j.total_running_minutes, j.lot_no,
            i.sap_no, i.part_no, i.part_description,
            l.location_name,
            COALESCE(NULLIF(u.fullname, ''), u.username) AS created_by_name
        FROM dbo.PRODUCTION_JOBS j WITH (NOLOCK)
        JOIN " . ITEMS_TABLE . " i WITH (NOLOCK) ON j.item_id = i.item_id
        JOIN " . LOCATIONS_TABLE . " l WITH (NOLOCK) ON j.location_id = l.location_id
        LEFT JOIN " . USERS_TABLE . " u WITH (NOLOCK) ON j.created_by = u.id
        {$whereSql}
        ORDER BY j.created_at DESC, j.job_id DESC
        OFFSET ? ROWS FETCH NEXT ? ROWS ONLY
    ";
    $stmt = $pdo->prepare($sql);
    $idx = 1;
    foreach ($params as $val) $stmt->bindValue($idx++, $val);
    $stmt->bindValue($idx++, $offset, PDO::PARAM_INT);
    $stmt->bindValue($idx++, $limit, PDO::PARAM_INT);
    $stmt->execute();

    prodJsonSuccess([
        'rows' => $stmt->fetchAll(PDO::FETCH_ASSOC),
        'pagination' => [
            'page' => $page,
            'limit' => $limit,
            'total' => $total,
            'total_pages' => max(1, (int)ceil($total / $limit)),
        ],
    ], 'Loaded job history');
}

function generateNextJobNumber(PDO $pdo): string {
    $prefix = 'JOB-' . date('ym') . '-';
    $stmt = $pdo->prepare("SELECT TOP 1 job_no FROM dbo.PRODUCTION_JOBS WITH (NOLOCK) WHERE job_no LIKE ? ORDER BY job_no DESC");
    $stmt->execute([$prefix . '%']);
    $lastNo = (string)($stmt->fetchColumn() ?: '');
    $seq = 1;
    if ($lastNo !== '' && preg_match('/-(\d+)$/', $lastNo, $m)) {
        $seq = (int)$m[1] + 1;
    }
    return $prefix . str_pad((string)$seq, 4, '0', STR_PAD_LEFT);
}

function handleCreateJob(PDO $pdo, array $input, array $currentUser): void {
    $locationId = parsePositiveInt($input['location_id'] ?? 0, 'ไลน์ผลิต / สถานี');
    $itemId = parsePositiveInt($input['item_id'] ?? 0, 'สินค้า');
    $targetQty = parsePositiveQty($input['target_qty'] ?? 0, 'เป้าหมายผลิต');
    $lotNo = trim((string)($input['lot_no'] ?? ''));

    $pdo->beginTransaction();
    try {
        $jobNo = generateNextJobNumber($pdo);
        $maxOrderStmt = $pdo->prepare("SELECT ISNULL(MAX(queue_order), 0) FROM dbo.PRODUCTION_JOBS WITH (UPDLOCK) WHERE location_id = ? AND status IN ('PENDING', 'RUNNING', 'PAUSED')");
        $maxOrderStmt->execute([$locationId]);
        $nextOrder = (int)$maxOrderStmt->fetchColumn() + 1;

        $ins = $pdo->prepare("
            INSERT INTO dbo.PRODUCTION_JOBS (job_no, location_id, item_id, target_qty, actual_qty, hold_qty, scrap_qty, status, queue_order, lot_no, created_by, created_at)
            VALUES (?, ?, ?, ?, 0, 0, 0, 'PENDING', ?, ?, ?, GETDATE())
        ");
        $ins->execute([$jobNo, $locationId, $itemId, $targetQty, $nextOrder, $lotNo !== '' ? $lotNo : null, (int)$currentUser['id']]);
        $jobId = (int)$pdo->lastInsertId();

        writeLog($pdo, 'CREATE_JOB', 'JOB_API', (string)$jobId, null, [
            'job_no' => $jobNo, 'location_id' => $locationId, 'item_id' => $itemId, 'target_qty' => $targetQty
        ], 'Created job queue');
        $pdo->commit();
        prodJsonSuccess(['job_id' => $jobId, 'job_no' => $jobNo], "สร้างคิวงาน {$jobNo} เรียบร้อยแล้ว");
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $e;
    }
}

/**
 * Checks BOM component readiness against SAP staging stock in SQL Server.
 * Never fatally crashes the API if staging data is absent.
 */
function inspectSapBomShortages(PDO $pdo, int $itemId, float $targetQty): array {
    $sql = "
        SELECT
            b.component_item_id,
            i.sap_no,
            i.part_no,
            i.part_description,
            b.quantity_required,
            (? * b.quantity_required) AS required_qty,
            ISNULL(stg.sap_stock, 0) AS available_qty
        FROM " . BOM_TABLE . " b WITH (NOLOCK)
        JOIN " . ITEMS_TABLE . " i WITH (NOLOCK) ON b.component_item_id = i.item_id
        OUTER APPLY (
            SELECT SUM(s.Quantity) AS sap_stock
            FROM dbo.SAP_STG_ALL_STOCK s WITH (NOLOCK)
            WHERE s.Mat_No = i.sap_no
        ) stg
        WHERE b.fg_item_id = ?
          AND ISNULL(b.bom_status, 'ACTIVE') != 'INACTIVE'
    ";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$targetQty, $itemId]);
    $components = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (empty($components)) {
        return [];
    }

    // Skip warning if SAP_STG_ALL_STOCK table has never been populated
    $hasStageData = (int)$pdo->query("SELECT CASE WHEN EXISTS (SELECT 1 FROM dbo.SAP_STG_ALL_STOCK WITH (NOLOCK)) THEN 1 ELSE 0 END")->fetchColumn();
    if ($hasStageData === 0) {
        return [];
    }

    $shortages = [];
    foreach ($components as $comp) {
        $req = (float)$comp['required_qty'];
        $avail = (float)$comp['available_qty'];
        if ($avail < $req) {
            $shortages[] = [
                'sap_no' => $comp['sap_no'],
                'part_no' => $comp['part_no'],
                'part_description' => $comp['part_description'],
                'required_qty' => round($req, 3),
                'available_qty' => round($avail, 3),
                'shortage_qty' => round($req - $avail, 3),
            ];
        }
    }
    return $shortages;
}

function handleStartJob(PDO $pdo, array $input, array $currentUser): void {
    $jobId = parsePositiveInt($input['job_id'] ?? 0, 'Job ID');
    $ignoreSapWarning = !empty($input['ignore_sap_warning']);

    $stmt = $pdo->prepare("SELECT job_id, job_no, item_id, target_qty, actual_qty, status FROM dbo.PRODUCTION_JOBS WITH (UPDLOCK) WHERE job_id = ?");
    $stmt->execute([$jobId]);
    $job = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$job) {
        prodJsonError('ไม่พบใบงานที่ระบุ', 404);
    }
    if (!in_array($job['status'], ['PENDING', 'PAUSED'], true)) {
        prodJsonError("ไม่สามารถเริ่มงานจากสถานะ {$job['status']} ได้", 400);
    }

    if (!$ignoreSapWarning && $job['status'] === 'PENDING') {
        $remainingTarget = max(0.0, (float)$job['target_qty'] - (float)$job['actual_qty']);
        $shortages = inspectSapBomShortages($pdo, (int)$job['item_id'], $remainingTarget > 0 ? $remainingTarget : (float)$job['target_qty']);
        if (!empty($shortages)) {
            prodJsonSuccess([
                'started' => false,
                'sap_warning' => true,
                'shortages' => $shortages,
            ], 'พบรายการวัตถุดิบในคลัง SAP ไม่เพียงพอตามสูตร BOM');
        }
    }

    $pdo->beginTransaction();
    try {
        $upd = $pdo->prepare("
            UPDATE dbo.PRODUCTION_JOBS
            SET status = 'RUNNING',
                start_time = CASE WHEN start_time IS NULL THEN GETDATE() ELSE start_time END
            WHERE job_id = ?
        ");
        $upd->execute([$jobId]);
        writeLog($pdo, 'START_JOB', 'JOB_API', (string)$jobId, $job, ['status' => 'RUNNING'], 'Started production job');
        $pdo->commit();
        prodJsonSuccess(['started' => true, 'job_id' => $jobId, 'status' => 'RUNNING'], "เริ่มผลิตใบงาน {$job['job_no']} แล้ว");
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $e;
    }
}

function handlePauseJob(PDO $pdo, array $input, array $currentUser): void {
    $jobId = parsePositiveInt($input['job_id'] ?? 0, 'Job ID');
    $stmt = $pdo->prepare("SELECT job_id, job_no, status, start_time, total_running_minutes FROM dbo.PRODUCTION_JOBS WITH (UPDLOCK) WHERE job_id = ?");
    $stmt->execute([$jobId]);
    $job = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$job) {
        prodJsonError('ไม่พบใบงานที่ระบุ', 404);
    }
    if ($job['status'] !== 'RUNNING') {
        prodJsonError("สามารถหยุดพักได้เฉพาะงานที่กำลังทำงาน (RUNNING) เท่านั้น สถานะปัจจุบัน: {$job['status']}", 400);
    }

    $pdo->beginTransaction();
    try {
        $upd = $pdo->prepare("
            UPDATE dbo.PRODUCTION_JOBS
            SET status = 'PAUSED',
                total_running_minutes = ISNULL(total_running_minutes, 0) + CASE WHEN start_time IS NOT NULL THEN DATEDIFF(MINUTE, start_time, GETDATE()) ELSE 0 END,
                start_time = NULL
            WHERE job_id = ?
        ");
        $upd->execute([$jobId]);
        writeLog($pdo, 'PAUSE_JOB', 'JOB_API', (string)$jobId, $job, ['status' => 'PAUSED'], 'Paused production job');
        $pdo->commit();
        prodJsonSuccess(['job_id' => $jobId, 'status' => 'PAUSED'], "หยุดพักใบงาน {$job['job_no']} แล้ว");
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $e;
    }
}

function handleRecordJobOutput(PDO $pdo, array $input, array $currentUser): void {
    $jobId = parsePositiveInt($input['job_id'] ?? 0, 'Job ID');
    $stmt = $pdo->prepare("SELECT job_id, job_no, location_id, item_id, status, lot_no, actual_qty, hold_qty, scrap_qty FROM dbo.PRODUCTION_JOBS WITH (UPDLOCK) WHERE job_id = ?");
    $stmt->execute([$jobId]);
    $job = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$job) {
        prodJsonError('ไม่พบใบงานที่ระบุ', 404);
    }
    if ($job['status'] !== 'RUNNING') {
        prodJsonError("ไม่สามารถบันทึกผลผลิตได้ เนื่องจากใบงานอยู่ในสถานะ {$job['status']} (ต้องกด Start ก่อน)", 400);
    }

    $fgQty = max(0.0, (float)($input['actual_qty'] ?? $input['fg_qty'] ?? 0));
    $holdQty = max(0.0, (float)($input['hold_qty'] ?? 0));
    $scrapQty = max(0.0, (float)($input['scrap_qty'] ?? 0));
    if ($fgQty <= 0 && $holdQty <= 0 && $scrapQty <= 0) {
        throw new InvalidArgumentException('กรุณาระบุยอด FG, Hold หรือ Scrap อย่างน้อย 1 รายการมากกว่า 0');
    }

    $logDate = parseDateOrDefault($input['log_date'] ?? null);
    $startTime = trim((string)($input['start_time'] ?? date('H:00:00')));
    $endTime = trim((string)($input['end_time'] ?? date('H:59:59')));
    $scrapReason = trim((string)($input['scrap_reason'] ?? ''));
    $machineId = !empty($input['machine_id']) ? (int)$input['machine_id'] : null;
    $teamCsv = resolveTeamUserIdsCsv($input['team_user_ids'] ?? '', (int)$currentUser['id']);
    $timestamp = $logDate . ' ' . $endTime;

    $batches = [];
    if ($fgQty > 0) $batches[] = ['type' => 'FG', 'qty' => parsePositiveQty($fgQty, 'ยอดงานดี (FG)')];
    if ($holdQty > 0) $batches[] = ['type' => 'HOLD', 'qty' => parsePositiveQty($holdQty, 'ยอด Hold')];
    if ($scrapQty > 0) $batches[] = ['type' => 'SCRAP', 'qty' => parsePositiveQty($scrapQty, 'ยอด Scrap')];

    $spStmt = $pdo->prepare(
        "EXEC " . SP_EXECUTE_PRODUCTION . "
            @item_id = ?, @location_id = ?, @quantity = ?, @count_type = ?,
            @lot_no = ?, @notes = ?, @timestamp = ?, @start_time = ?, @end_time = ?,
            @user_id = ?, @username = ?, @machine_id = ?, @team_user_ids = ?"
    );

    $createdTxns = [];
    $reqUuids = [];
    foreach ($batches as $batch) {
        $note = "Output [Job: {$job['job_no']}]";
        if ($batch['type'] === 'SCRAP' && $scrapReason !== '') {
            $note .= " | Reason: {$scrapReason}";
        }
        $spStmt->execute([
            (int)$job['item_id'],
            (int)$job['location_id'],
            $batch['qty'],
            $batch['type'],
            (string)($job['lot_no'] ?? $job['job_no']),
            mb_substr($note, 0, 490),
            $timestamp,
            $startTime,
            $endTime,
            (int)$currentUser['id'],
            $currentUser['username'],
            $machineId,
            $teamCsv,
        ]);
        $spStmt->closeCursor();

        $findIdStmt = $pdo->prepare(
            "SELECT TOP 1 transaction_id FROM " . TRANSACTIONS_TABLE . " WITH (NOLOCK)
             WHERE parameter_id = ? AND to_location_id = ? AND created_by_user_id = ?
             ORDER BY transaction_id DESC"
        );
        $findIdStmt->execute([(int)$job['item_id'], (int)$job['location_id'], (int)$currentUser['id']]);
        $txnId = (int)$findIdStmt->fetchColumn();
        if ($txnId > 0) {
            $createdTxns[] = $txnId;
        }

        if ($batch['type'] === 'SCRAP') {
            $createdReqs = buildScrapRequisition(
                $pdo,
                (int)$job['item_id'],
                $batch['qty'],
                (int)$job['location_id'],
                (int)$currentUser['id'],
                "Replacement: Job {$job['job_no']} " . $scrapReason,
                $txnId ?: null
            );
            $reqUuids = array_merge($reqUuids, $createdReqs);
        }
    }

    $updJob = $pdo->prepare("
        UPDATE dbo.PRODUCTION_JOBS
        SET actual_qty = ISNULL(actual_qty, 0) + ?,
            hold_qty = ISNULL(hold_qty, 0) + ?,
            scrap_qty = ISNULL(scrap_qty, 0) + ?
        WHERE job_id = ?
    ");
    $updJob->execute([$fgQty, $holdQty, $scrapQty, $jobId]);

    writeLog($pdo, 'RECORD_JOB_OUTPUT', 'JOB_API', (string)$jobId, $job, [
        'fg_added' => $fgQty, 'hold_added' => $holdQty, 'scrap_added' => $scrapQty, 'txns' => $createdTxns
    ], "Recorded output for {$job['job_no']}");

    prodJsonSuccess([
        'job_id' => $jobId,
        'transaction_ids' => $createdTxns,
        'req_uuids' => $reqUuids,
    ], "บันทึกยอดผลิตใบงาน {$job['job_no']} สำเร็จ");
}

function handleDeleteJobTxn(PDO $pdo, array $input, array $currentUser): void {
    $txnId = parsePositiveInt($input['txn_id'] ?? $input['transaction_id'] ?? 0, 'Transaction ID');
    $jobId = !empty($input['job_id']) ? (int)$input['job_id'] : null;

    $oldStmt = $pdo->prepare("SELECT transaction_id, parameter_id, quantity, transaction_type, created_by_user_id FROM " . TRANSACTIONS_TABLE . " WITH (NOLOCK) WHERE transaction_id = ?");
    $oldStmt->execute([$txnId]);
    $oldTxn = $oldStmt->fetch(PDO::FETCH_ASSOC);
    if (!$oldTxn) {
        prodJsonError('ไม่พบรายการผลิตที่ต้องการลบ', 404);
    }

    if (!hasPermission('manage_production') && !hasRole(['admin', 'creator', 'supervisor']) && (int)$oldTxn['created_by_user_id'] !== (int)$currentUser['id']) {
        prodJsonError('คุณไม่มีสิทธิ์ลบรายการที่ผู้อื่นเป็นผู้บันทึก', 403);
    }

    $sp = $pdo->prepare("EXEC dbo.sp_Job_DeleteTransaction @txn_id = ?, @job_id = ?, @user_id = ?");
    $sp->execute([$txnId, $jobId, (int)$currentUser['id']]);
    $sp->closeCursor();

    writeLog($pdo, 'DELETE_JOB_TXN', 'JOB_API', (string)$txnId, $oldTxn, null, "Deleted job transaction");
    prodJsonSuccess(['txn_id' => $txnId, 'job_id' => $jobId], 'ลบยอดผลิตและคืนสต็อกเรียบร้อยแล้ว');
}

function handleCloseJob(PDO $pdo, array $input, array $currentUser): void {
    $jobId = parsePositiveInt($input['job_id'] ?? 0, 'Job ID');
    $stmt = $pdo->prepare("SELECT job_id, job_no, status, start_time FROM dbo.PRODUCTION_JOBS WITH (UPDLOCK) WHERE job_id = ?");
    $stmt->execute([$jobId]);
    $job = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$job) {
        prodJsonError('ไม่พบใบงานที่ระบุ', 404);
    }
    if (!in_array($job['status'], ['RUNNING', 'PAUSED'], true)) {
        prodJsonError("ไม่สามารถปิดงานจากสถานะ {$job['status']} ได้", 400);
    }

    $pdo->beginTransaction();
    try {
        $upd = $pdo->prepare("
            UPDATE dbo.PRODUCTION_JOBS
            SET status = 'COMPLETED',
                end_time = GETDATE(),
                total_running_minutes = ISNULL(total_running_minutes, 0) + CASE WHEN status = 'RUNNING' AND start_time IS NOT NULL THEN DATEDIFF(MINUTE, start_time, GETDATE()) ELSE 0 END
            WHERE job_id = ?
        ");
        $upd->execute([$jobId]);
        writeLog($pdo, 'CLOSE_JOB', 'JOB_API', (string)$jobId, $job, ['status' => 'COMPLETED'], "Closed job {$job['job_no']}");
        $pdo->commit();
        prodJsonSuccess(['job_id' => $jobId, 'status' => 'COMPLETED'], "ปิดใบงาน {$job['job_no']} เรียบร้อยแล้ว");
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $e;
    }
}

function handleEditJob(PDO $pdo, array $input, array $currentUser): void {
    $jobId = parsePositiveInt($input['job_id'] ?? 0, 'Job ID');
    $targetQty = parsePositiveQty($input['target_qty'] ?? 0, 'เป้าหมายผลิต');
    $lotNo = trim((string)($input['lot_no'] ?? ''));

    $stmt = $pdo->prepare("SELECT job_id, job_no, target_qty, lot_no, status, created_by FROM dbo.PRODUCTION_JOBS WITH (UPDLOCK) WHERE job_id = ?");
    $stmt->execute([$jobId]);
    $oldJob = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$oldJob) {
        prodJsonError('ไม่พบใบงานที่ระบุ', 404);
    }
    if (in_array($oldJob['status'], ['COMPLETED', 'CANCELLED'], true)) {
        prodJsonError('ไม่สามารถแก้ไขใบงานที่ปิดแล้วได้', 400);
    }

    $pdo->beginTransaction();
    try {
        $upd = $pdo->prepare("UPDATE dbo.PRODUCTION_JOBS SET target_qty = ?, lot_no = ? WHERE job_id = ?");
        $upd->execute([$targetQty, $lotNo !== '' ? $lotNo : null, $jobId]);
        writeLog($pdo, 'EDIT_JOB', 'JOB_API', (string)$jobId, $oldJob, ['target_qty' => $targetQty, 'lot_no' => $lotNo], "Edited job {$oldJob['job_no']}");
        $pdo->commit();
        prodJsonSuccess(['job_id' => $jobId], "แก้ไขใบงาน {$oldJob['job_no']} สำเร็จ");
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $e;
    }
}

function handleDeleteJob(PDO $pdo, array $input, array $currentUser): void {
    $jobId = parsePositiveInt($input['job_id'] ?? 0, 'Job ID');
    $stmt = $pdo->prepare("SELECT job_id, job_no, status, actual_qty, hold_qty, scrap_qty FROM dbo.PRODUCTION_JOBS WITH (UPDLOCK) WHERE job_id = ?");
    $stmt->execute([$jobId]);
    $job = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$job) {
        prodJsonError('ไม่พบใบงานที่ระบุ', 404);
    }

    $hasOutput = ((float)$job['actual_qty'] > 0 || (float)$job['hold_qty'] > 0 || (float)$job['scrap_qty'] > 0);
    if ($hasOutput && !hasPermission('manage_production') && !hasRole(['admin', 'creator', 'supervisor'])) {
        prodJsonError('ใบงานนี้มีการบันทึกยอดผลิตแล้ว ต้องให้ผู้ดูแลระบบหรือหัวหน้างานเป็นผู้ยกเลิก', 403);
    }

    $pdo->beginTransaction();
    try {
        if ($job['status'] === 'PENDING' && !$hasOutput) {
            $pdo->prepare("DELETE FROM dbo.PRODUCTION_JOBS WHERE job_id = ?")->execute([$jobId]);
        } else {
            $pdo->prepare("UPDATE dbo.PRODUCTION_JOBS SET status = 'CANCELLED', end_time = GETDATE() WHERE job_id = ?")->execute([$jobId]);
        }
        writeLog($pdo, 'CANCEL_JOB', 'JOB_API', (string)$jobId, $job, ['status' => 'CANCELLED'], "Cancelled/Deleted job {$job['job_no']}");
        $pdo->commit();
        prodJsonSuccess(['job_id' => $jobId], "ยกเลิกใบงาน {$job['job_no']} เรียบร้อยแล้ว");
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $e;
    }
}

function handleReopenJob(PDO $pdo, array $input, array $currentUser): void {
    if (!hasPermission('manage_production') && !hasRole(['admin', 'creator', 'supervisor'])) {
        prodJsonError('คุณไม่มีสิทธิ์เปิดงานที่ปิดแล้วใหม่ (ต้องมีสิทธิ์ manage_production)', 403);
    }

    $jobId = parsePositiveInt($input['job_id'] ?? 0, 'Job ID');
    $stmt = $pdo->prepare("SELECT job_id, job_no, status FROM dbo.PRODUCTION_JOBS WITH (UPDLOCK) WHERE job_id = ?");
    $stmt->execute([$jobId]);
    $job = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$job) {
        prodJsonError('ไม่พบใบงานที่ระบุ', 404);
    }
    if (!in_array($job['status'], ['COMPLETED', 'CANCELLED'], true)) {
        prodJsonError("ใบงานอยู่ในสถานะ {$job['status']} ไม่จำเป็นต้อง Reopen", 400);
    }

    $pdo->beginTransaction();
    try {
        $pdo->prepare("UPDATE dbo.PRODUCTION_JOBS SET status = 'PAUSED', end_time = NULL WHERE job_id = ?")->execute([$jobId]);
        writeLog($pdo, 'REOPEN_JOB', 'JOB_API', (string)$jobId, $job, ['status' => 'PAUSED'], "Reopened job {$job['job_no']}");
        $pdo->commit();
        prodJsonSuccess(['job_id' => $jobId, 'status' => 'PAUSED'], "เปิดใบงาน {$job['job_no']} ใหม่สำเร็จ (สถานะ PAUSED)");
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $e;
    }
}

function handleReorderQueue(PDO $pdo, array $input, array $currentUser): void {
    $jobIds = $input['job_ids'] ?? [];
    if (!is_array($jobIds) || empty($jobIds)) {
        throw new InvalidArgumentException('ไม่พบลำดับใบงานสำหรับจัดเรียง');
    }

    $pdo->beginTransaction();
    try {
        $upd = $pdo->prepare("UPDATE dbo.PRODUCTION_JOBS SET queue_order = ? WHERE job_id = ?");
        $order = 1;
        foreach ($jobIds as $rawId) {
            $jid = (int)$rawId;
            if ($jid > 0) {
                $upd->execute([$order++, $jid]);
            }
        }
        $pdo->commit();
        prodJsonSuccess(['reordered' => count($jobIds)], 'บันทึกลำดับคิวงานสำเร็จ');
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $e;
    }
}

function handleGetJobLogs(PDO $pdo, array $input): void {
    $jobNo = trim((string)($input['job_no'] ?? ''));
    if ($jobNo === '') {
        throw new InvalidArgumentException('กรุณาระบุเลขที่ใบงาน (Job No.)');
    }

    $stmt = $pdo->prepare("
        SELECT TOP 200
            t.transaction_id, t.transaction_type, t.quantity, t.transaction_timestamp,
            t.start_time, t.end_time, t.reference_id, t.notes, t.created_by_user_id,
            COALESCE(NULLIF(u.fullname, ''), u.username) AS created_by_name,
            STUFF((
                SELECT ', ' + COALESCE(NULLIF(u2.fullname, ''), u2.username)
                FROM dbo.STOCK_TRANSACTION_USERS stu WITH (NOLOCK)
                JOIN " . USERS_TABLE . " u2 WITH (NOLOCK) ON stu.user_id = u2.id
                WHERE stu.transaction_id = t.transaction_id
                FOR XML PATH(''), TYPE
            ).value('.', 'NVARCHAR(MAX)'), 1, 2, '') AS team_member_names
        FROM " . TRANSACTIONS_TABLE . " t WITH (NOLOCK)
        LEFT JOIN " . USERS_TABLE . " u WITH (NOLOCK) ON t.created_by_user_id = u.id
        WHERE t.transaction_type IN ('PRODUCTION_FG', 'PRODUCTION_HOLD', 'PRODUCTION_SCRAP')
          AND (t.reference_id = ? OR t.notes LIKE ?)
        ORDER BY t.transaction_timestamp DESC, t.transaction_id DESC
    ");
    $stmt->execute([$jobNo, '%[Job: ' . $jobNo . ']%']);
    prodJsonSuccess($stmt->fetchAll(PDO::FETCH_ASSOC), 'Loaded job logs');
}
