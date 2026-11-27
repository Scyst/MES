<?php
/**
 * Self-contained Toolbox API for Production Execution, Inventory Logs,
 * WIP/Variance/Stock Reports, and Operator Attribution.
 */

require_once __DIR__ . '/_common.php';

[$action, $input, $currentUser] = parseProductionRequest();

try {
    switch ($action) {
        case 'get_initial_data':
            handleGetInitialData($pdo, $currentUser);
            break;

        case 'execute_production':
            handleExecuteProduction($pdo, $input, $currentUser);
            break;

        case 'execute_receipt':
            handleExecuteReceipt($pdo, $input, $currentUser);
            break;

        case 'get_production_history':
        case 'get_receipt_history':
        case 'get_all_transactions':
            handleGetTransactionHistory($pdo, $action, $input);
            break;

        case 'get_production_summary':
        case 'get_receipt_history_summary':
            handleGetTransactionSummary($pdo, $action, $input);
            break;

        case 'get_production_hourly_counts':
            handleGetHourlyCounts($pdo, $input);
            break;

        case 'get_transaction_details':
            handleGetTransactionDetails($pdo, $input);
            break;

        case 'update_transaction':
            handleUpdateTransaction($pdo, $input, $currentUser);
            break;

        case 'reverse_transaction':
        case 'delete_transaction':
            handleReverseTransaction($pdo, $input, $currentUser);
            break;

        case 'get_wip_onhand_report':
            handleGetWipOnhandReport($pdo, $input);
            break;

        case 'get_wip_report_by_lot':
            handleGetWipReportByLot($pdo, $input);
            break;

        case 'get_production_variance_report':
            handleGetProductionVarianceReport($pdo, $input);
            break;

        case 'get_variance_details':
            handleGetVarianceDetails($pdo, $input);
            break;

        case 'get_stock_inventory_report':
            handleGetStockInventoryReport($pdo, $input);
            break;

        case 'get_stock_details_by_item':
            handleGetStockDetailsByItem($pdo, $input);
            break;

        case 'adjust_single_stock':
            handleAdjustSingleStock($pdo, $input, $currentUser);
            break;

        case 'get_stock_onhand':
            handleGetStockOnhand($pdo, $input);
            break;

        case 'get_employee_daily_summary':
            handleGetEmployeeDailySummary($pdo, $input);
            break;

        case 'get_team_users':
            handleGetTeamUsers($pdo, $currentUser);
            break;

        case 'get_active_line_users':
            handleGetActiveLineUsers($pdo, $input, $currentUser);
            break;

        default:
            prodJsonError("ไม่พบ Action '{$action}' ในระบบ Production API", 400);
    }
} catch (InvalidArgumentException $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    prodJsonError($e->getMessage(), 400);
} catch (Throwable $e) {
    handleApiError($e, $pdo ?? null, $input ?? $_REQUEST);
}

function canViewProductionCosts(): bool {
    return hasPermission('view_executive')
        || hasPermission('manage_production')
        || hasRole(['admin', 'creator', 'manager', 'executive', 'supervisor', 'planner']);
}

function handleGetInitialData(PDO $pdo, array $currentUser): void {
    $canViewCost = canViewProductionCosts();
    $canManage = hasPermission('manage_production') || hasRole(['admin', 'creator', 'supervisor']);

    $locStmt = $pdo->query("
        SELECT location_id, location_name, location_description, location_type, production_line, zone_name
        FROM " . LOCATIONS_TABLE . " WITH (NOLOCK)
        WHERE is_active = 1
        ORDER BY location_name ASC
    ");
    $locations = $locStmt->fetchAll(PDO::FETCH_ASSOC);

    $costSelect = $canViewCost ? ', Cost_Total' : '';
    $itemStmt = $pdo->query("
        SELECT TOP 3000 item_id, sap_no, part_no, part_description, material_type, material_sub_type, sku, CTN, barcode{$costSelect}, planned_output
        FROM " . ITEMS_TABLE . " WITH (NOLOCK)
        WHERE is_active = 1
        ORDER BY sap_no ASC
    ");
    $items = $itemStmt->fetchAll(PDO::FETCH_ASSOC);

    $machStmt = $pdo->query("
        SELECT machine_id, machine_code, machine_name, line, status
        FROM " . PE_MACHINES_TABLE . " WITH (NOLOCK)
        WHERE is_active = 1
        ORDER BY line ASC, machine_name ASC
    ");
    $machines = $machStmt->fetchAll(PDO::FETCH_ASSOC);

    $teamStmt = $pdo->query("
        SELECT DISTINCT team_group
        FROM " . USERS_TABLE . " WITH (NOLOCK)
        WHERE is_active = 1 AND team_group IS NOT NULL AND LTRIM(RTRIM(team_group)) != ''
        ORDER BY team_group ASC
    ");
    $teamGroups = $teamStmt->fetchAll(PDO::FETCH_COLUMN);

    prodJsonSuccess([
        'locations' => $locations,
        'items' => $items,
        'machines' => $machines,
        'team_groups' => $teamGroups,
        'current_user' => [
            'id' => (int)$currentUser['id'],
            'username' => $currentUser['username'] ?? '',
            'fullname' => $currentUser['fullname'] ?? ($currentUser['username'] ?? ''),
            'role' => $currentUser['role'] ?? '',
            'line' => $currentUser['line'] ?? '',
            'team_group' => $currentUser['team_group'] ?? '',
            'can_manage' => $canManage,
            'can_view_cost' => $canViewCost,
        ],
    ], 'Loaded production metadata');
}

function handleExecuteProduction(PDO $pdo, array $input, array $currentUser): void {
    requireProductionEntryPermission();

    $itemId = parsePositiveInt($input['item_id'] ?? 0, 'สินค้า (Item)');
    $locationId = parsePositiveInt($input['location_id'] ?? 0, 'ไลน์ผลิต / สถานที่ (Location)');
    $logDate = parseDateOrDefault($input['log_date'] ?? null);
    $startTime = trim((string)($input['start_time'] ?? date('H:00:00')));
    $endTime = trim((string)($input['end_time'] ?? date('H:59:59')));
    $lotNo = trim((string)($input['lot_no'] ?? ''));
    $notes = trim((string)($input['notes'] ?? ''));
    $scrapReason = trim((string)($input['scrap_reason'] ?? ''));
    $machineId = !empty($input['machine_id']) ? (int)$input['machine_id'] : null;
    $jobId = !empty($input['job_id']) ? (int)$input['job_id'] : null;
    $teamCsv = resolveTeamUserIdsCsv($input['team_user_ids'] ?? '', (int)$currentUser['id']);

    $fgQty = (float)($input['fg_qty'] ?? $input['quantity'] ?? 0);
    $holdQty = (float)($input['hold_qty'] ?? 0);
    $scrapQty = (float)($input['scrap_qty'] ?? 0);

    // Support either unified count_type+quantity or split FG/HOLD/SCRAP inputs
    $entries = [];
    if (!empty($input['count_type']) && isset($input['quantity'])) {
        $type = strtoupper(trim((string)$input['count_type']));
        if (!in_array($type, ['FG', 'HOLD', 'SCRAP'], true)) {
            throw new InvalidArgumentException('ประเภทผลผลิตไม่ถูกต้อง (ต้องเป็น FG, HOLD หรือ SCRAP)');
        }
        $qty = parsePositiveQty($input['quantity'], 'จำนวนผลิต');
        $entries[] = ['type' => $type, 'qty' => $qty];
    } else {
        if ($fgQty > 0) $entries[] = ['type' => 'FG', 'qty' => parsePositiveQty($fgQty, 'ยอดงานดี (FG)')];
        if ($holdQty > 0) $entries[] = ['type' => 'HOLD', 'qty' => parsePositiveQty($holdQty, 'ยอดรอตรวจสอบ (Hold)')];
        if ($scrapQty > 0) $entries[] = ['type' => 'SCRAP', 'qty' => parsePositiveQty($scrapQty, 'ยอดของเสีย (Scrap)')];
    }

    if (empty($entries)) {
        throw new InvalidArgumentException('กรุณาระบุจำนวนผลิตอย่างน้อย 1 ประเภท (FG, Hold หรือ Scrap) มากกว่า 0');
    }

    $timestamp = $logDate . ' ' . $endTime;
    $createdIds = [];
    $reqUuids = [];

    $pdo->beginTransaction();
    try {
        $spStmt = $pdo->prepare(
            "EXEC " . SP_EXECUTE_PRODUCTION . "
                @item_id = ?, @location_id = ?, @quantity = ?, @count_type = ?,
                @lot_no = ?, @notes = ?, @timestamp = ?, @start_time = ?, @end_time = ?,
                @user_id = ?, @username = ?, @machine_id = ?, @team_user_ids = ?, @job_id = ?"
        );

        foreach ($entries as $entry) {
            $entryNotes = $notes;
            if ($entry['type'] === 'SCRAP' && $scrapReason !== '') {
                $entryNotes = trim(($notes !== '' ? $notes . ' | ' : '') . "Scrap Reason: {$scrapReason}");
            }

            $spStmt->execute([
                $itemId,
                $locationId,
                $entry['qty'],
                $entry['type'],
                mb_substr($lotNo, 0, 250),
                mb_substr($entryNotes, 0, 490),
                $timestamp,
                $startTime,
                $endTime,
                (int)$currentUser['id'],
                $currentUser['username'],
                $machineId,
                $teamCsv,
                $jobId,
            ]);
            $txnId = (int)$spStmt->fetchColumn();
            $spStmt->closeCursor();

            if ($txnId > 0) {
                $createdIds[] = $txnId;
            }

            if ($entry['type'] === 'SCRAP') {
                $reqNote = 'Replacement: ' . ($scrapReason !== '' ? $scrapReason : 'Scrap');
                $createdReqs = buildScrapRequisition($pdo, $itemId, $entry['qty'], $locationId, (int)$currentUser['id'], $reqNote, $txnId ?: null);
                $reqUuids = array_merge($reqUuids, $createdReqs);
            }
        }

        writeLog($pdo, 'EXECUTE_PRODUCTION', 'PRODUCTION_API', implode(',', $createdIds), null, [
            'item_id' => $itemId,
            'location_id' => $locationId,
            'machine_id' => $machineId,
            'job_id' => $jobId,
            'entries' => $entries,
            'lot_no' => $lotNo,
            'req_uuids' => $reqUuids,
        ], 'Recorded production execution');

        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $e;
    }

    prodJsonSuccess([
        'transaction_ids' => $createdIds,
        'req_uuids' => $reqUuids,
    ], 'บันทึกผลผลิตเรียบร้อยแล้ว');
}

function handleExecuteReceipt(PDO $pdo, array $input, array $currentUser): void {
    if (
        !hasPermission('manage_production')
        && !hasPermission('manage_warehouse')
        && !hasRole(['admin', 'creator', 'supervisor', 'planner', 'store'])
    ) {
        prodJsonError('คุณไม่มีสิทธิ์บันทึกรับเข้า/โอนย้ายสต็อก (ต้องมีสิทธิ์ manage_production)', 403);
    }

    $txnType = strtoupper(trim((string)($input['transaction_type'] ?? 'RECEIPT')));
    if (!in_array($txnType, ['RECEIPT', 'TRANSFER'], true)) {
        throw new InvalidArgumentException('ประเภท Transaction ต้องเป็น RECEIPT หรือ TRANSFER');
    }

    $itemId = parsePositiveInt($input['item_id'] ?? 0, 'สินค้า (Item)');
    $qty = parsePositiveQty($input['quantity'] ?? 0, 'จำนวน');
    $logDate = parseDateOrDefault($input['log_date'] ?? null);
    $logTime = trim((string)($input['log_time'] ?? date('H:i:s')));
    $lotNo = trim((string)($input['lot_no'] ?? ''));
    $notes = trim((string)($input['notes'] ?? ''));

    $toLocationId = parsePositiveInt($input['to_location_id'] ?? $input['location_id'] ?? 0, 'คลังปลายทาง');
    $fromLocationId = $txnType === 'TRANSFER' ? parsePositiveInt($input['from_location_id'] ?? 0, 'คลังต้นทาง') : null;
    if ($txnType === 'TRANSFER' && $fromLocationId === $toLocationId) {
        throw new InvalidArgumentException('คลังต้นทางและคลังปลายทางต้องไม่ซ้ำกัน');
    }

    $itemStmt = $pdo->prepare(
        "SELECT item_id, Cost_RM, Cost_PKG, Cost_SUB, Cost_DL,
                Cost_OH_Machine, Cost_OH_Utilities, Cost_OH_Indirect, Cost_OH_Staff, Cost_OH_Accessory, Cost_OH_Others
         FROM " . ITEMS_TABLE . " WITH (NOLOCK) WHERE item_id = ?"
    );
    $itemStmt->execute([$itemId]);
    $itemRow = $itemStmt->fetch(PDO::FETCH_ASSOC);
    if (!$itemRow) {
        throw new InvalidArgumentException('ไม่พบข้อมูลสินค้าในระบบ');
    }

    $costMat = (float)$itemRow['Cost_RM'] + (float)$itemRow['Cost_PKG'] + (float)$itemRow['Cost_SUB'];
    $costOh = (float)$itemRow['Cost_OH_Machine'] + (float)$itemRow['Cost_OH_Utilities']
        + (float)$itemRow['Cost_OH_Indirect'] + (float)$itemRow['Cost_OH_Staff']
        + (float)$itemRow['Cost_OH_Accessory'] + (float)$itemRow['Cost_OH_Others'];
    $timestamp = $logDate . ' ' . $logTime;

    $pdo->beginTransaction();
    try {
        $spStock = $pdo->prepare("EXEC " . SP_UPDATE_ONHAND . " @item_id = ?, @location_id = ?, @quantity_to_change = ?");
        if ($txnType === 'TRANSFER') {
            $spStock->execute([$itemId, $fromLocationId, -$qty]);
            $spStock->closeCursor();
        }
        $spStock->execute([$itemId, $toLocationId, $qty]);
        $spStock->closeCursor();

        $insStmt = $pdo->prepare(
            "INSERT INTO " . TRANSACTIONS_TABLE . "
                (parameter_id, quantity, transaction_type, transaction_timestamp, from_location_id, to_location_id,
                 reference_id, notes, created_by_user_id, std_cost_mat_snapshot, std_cost_dl_snapshot, std_cost_oh_snapshot)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        );
        $insStmt->execute([
            $itemId, $qty, $txnType, $timestamp, $fromLocationId, $toLocationId,
            $lotNo !== '' ? $lotNo : null, $notes !== '' ? $notes : null, (int)$currentUser['id'],
            $costMat, (float)$itemRow['Cost_DL'], $costOh
        ]);
        $txnId = (int)$pdo->lastInsertId();

        writeLog($pdo, 'EXECUTE_' . $txnType, 'PRODUCTION_API', (string)$txnId, null, [
            'item_id' => $itemId, 'qty' => $qty, 'from_location_id' => $fromLocationId, 'to_location_id' => $toLocationId
        ], "Recorded {$txnType}");

        $pdo->commit();
        prodJsonSuccess(['transaction_id' => $txnId], 'บันทึกรายการรับ/โอนย้ายสต็อกเรียบร้อยแล้ว');
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $e;
    }
}

function buildTransactionWhereClause(string $action, array $input, array &$params, bool $activeOnly = false): string {
    $conditions = [];

    if ($action === 'get_production_history') {
        $conditions[] = $activeOnly
            ? "t.transaction_type IN ('PRODUCTION_FG', 'PRODUCTION_HOLD', 'PRODUCTION_SCRAP')"
            : "(t.transaction_type IN ('PRODUCTION_FG', 'PRODUCTION_HOLD', 'PRODUCTION_SCRAP') OR t.transaction_type LIKE 'REVERSAL_PRODUCTION_%')";
    } elseif ($action === 'get_receipt_history') {
        $conditions[] = $activeOnly
            ? "t.transaction_type IN ('RECEIPT', 'TRANSFER', 'INTERNAL_TRANSFER')"
            : "(t.transaction_type IN ('RECEIPT', 'TRANSFER', 'INTERNAL_TRANSFER', 'REVERSAL_RECEIPT', 'REVERSAL_TRANSFER', 'TRANSFER_REVERSAL'))";
    }

    if ($activeOnly) {
        $conditions[] = SQL_ACTIVE_TXN_FILTER;
    }

    if (!empty($input['transaction_type']) && $input['transaction_type'] !== 'ALL') {
        $conditions[] = "t.transaction_type = ?";
        $params[] = trim((string)$input['transaction_type']);
    }

    if (!empty($input['start_date'])) {
        $conditions[] = "CAST(t.transaction_timestamp AS DATE) >= ?";
        $params[] = parseDateOrDefault($input['start_date']);
    }
    if (!empty($input['end_date'])) {
        $conditions[] = "CAST(t.transaction_timestamp AS DATE) <= ?";
        $params[] = parseDateOrDefault($input['end_date']);
    }
    if (!empty($input['location_id']) && $input['location_id'] !== 'ALL') {
        $locId = (int)$input['location_id'];
        $conditions[] = "(t.to_location_id = ? OR t.from_location_id = ?)";
        $params[] = $locId;
        $params[] = $locId;
    }
    if (!empty($input['user_id']) && $input['user_id'] !== 'ALL') {
        $uid = (int)$input['user_id'];
        $conditions[] = "(t.created_by_user_id = ? OR EXISTS (SELECT 1 FROM dbo.STOCK_TRANSACTION_USERS tu2 WITH (NOLOCK) WHERE tu2.transaction_id = t.transaction_id AND tu2.user_id = ?))";
        $params[] = $uid;
        $params[] = $uid;
    }
    if (!empty($input['search'])) {
        $term = '%' . trim((string)$input['search']) . '%';
        $conditions[] = "(i.sap_no LIKE ? OR i.part_no LIKE ? OR i.part_description LIKE ? OR t.reference_id LIKE ? OR t.notes LIKE ?)";
        array_push($params, $term, $term, $term, $term, $term);
    }

    return empty($conditions) ? '' : 'WHERE ' . implode(' AND ', $conditions);
}

function handleGetTransactionHistory(PDO $pdo, string $action, array $input): void {
    $page = max(1, (int)($input['page'] ?? 1));
    $limit = max(1, min(200, (int)($input['limit'] ?? 50)));
    $offset = ($page - 1) * $limit;

    $params = [];
    $whereSql = buildTransactionWhereClause($action, $input, $params);

    $baseFrom = "
        FROM " . TRANSACTIONS_TABLE . " t WITH (NOLOCK)
        JOIN " . ITEMS_TABLE . " i WITH (NOLOCK) ON t.parameter_id = i.item_id
        LEFT JOIN " . LOCATIONS_TABLE . " lf WITH (NOLOCK) ON t.from_location_id = lf.location_id
        LEFT JOIN " . LOCATIONS_TABLE . " lt WITH (NOLOCK) ON t.to_location_id = lt.location_id
        LEFT JOIN " . USERS_TABLE . " u WITH (NOLOCK) ON t.created_by_user_id = u.id
        LEFT JOIN " . PE_MACHINES_TABLE . " m WITH (NOLOCK) ON t.machine_id = m.machine_id
    ";

    $countStmt = $pdo->prepare("SELECT COUNT(*) {$baseFrom} {$whereSql}");
    $countStmt->execute($params);
    $total = (int)$countStmt->fetchColumn();

    $dataSql = "
        SELECT
            t.transaction_id, t.parameter_id AS item_id, t.quantity, t.transaction_type,
            ISNULL(t.stock_type, 'UNRESTRICTED') AS stock_type,
            ISNULL(t.is_reversed, 0) AS is_reversed,
            t.reversal_of_tx_id, t.reversal_reason, t.reversed_at,
            t.transaction_timestamp, t.from_location_id, t.to_location_id,
            t.reference_id, t.notes, t.start_time, t.end_time, t.created_by_user_id, t.machine_id, t.job_id,
            i.sap_no, i.part_no, i.part_description, i.material_type,
            lf.location_name AS from_location_name,
            lt.location_name AS to_location_name,
            u.username AS created_by_username,
            COALESCE(NULLIF(u.fullname, ''), u.username) AS created_by_name,
            m.machine_code, m.machine_name,
            STUFF((
                SELECT ', ' + COALESCE(NULLIF(u2.fullname, ''), u2.username)
                FROM dbo.STOCK_TRANSACTION_USERS stu WITH (NOLOCK)
                JOIN " . USERS_TABLE . " u2 WITH (NOLOCK) ON stu.user_id = u2.id
                WHERE stu.transaction_id = t.transaction_id
                FOR XML PATH(''), TYPE
            ).value('.', 'NVARCHAR(MAX)'), 1, 2, '') AS team_member_names
        {$baseFrom}
        {$whereSql}
        ORDER BY t.transaction_timestamp DESC, t.transaction_id DESC
        OFFSET ? ROWS FETCH NEXT ? ROWS ONLY
    ";

    $stmt = $pdo->prepare($dataSql);
    $idx = 1;
    foreach ($params as $val) {
        $stmt->bindValue($idx++, $val);
    }
    $stmt->bindValue($idx++, $offset, PDO::PARAM_INT);
    $stmt->bindValue($idx++, $limit, PDO::PARAM_INT);
    $stmt->execute();
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    prodJsonSuccess([
        'rows' => $rows,
        'pagination' => [
            'page' => $page,
            'limit' => $limit,
            'total' => $total,
            'total_pages' => max(1, (int)ceil($total / $limit)),
        ],
    ], 'Loaded transaction history');
}

function handleGetTransactionSummary(PDO $pdo, string $action, array $input): void {
    $mappedAction = $action === 'get_receipt_history_summary' ? 'get_receipt_history' : 'get_production_history';
    $params = [];
    $whereSql = buildTransactionWhereClause($mappedAction, $input, $params, true);

    $sql = "
        SELECT
            ISNULL(SUM(CASE WHEN t.transaction_type = 'PRODUCTION_FG' THEN t.quantity ELSE 0 END), 0) AS total_fg,
            ISNULL(SUM(CASE WHEN t.transaction_type = 'PRODUCTION_HOLD' THEN t.quantity ELSE 0 END), 0) AS total_hold,
            ISNULL(SUM(CASE WHEN t.transaction_type = 'PRODUCTION_SCRAP' THEN t.quantity ELSE 0 END), 0) AS total_scrap,
            ISNULL(SUM(CASE WHEN t.transaction_type = 'RECEIPT' THEN t.quantity ELSE 0 END), 0) AS total_receipt,
            ISNULL(SUM(CASE WHEN t.transaction_type IN ('TRANSFER', 'INTERNAL_TRANSFER') THEN t.quantity ELSE 0 END), 0) AS total_transfer,
            COUNT(*) AS total_transactions
        FROM " . TRANSACTIONS_TABLE . " t WITH (NOLOCK)
        JOIN " . ITEMS_TABLE . " i WITH (NOLOCK) ON t.parameter_id = i.item_id
        {$whereSql}
    ";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $summary = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];

    prodJsonSuccess($summary, 'Loaded summary');
}

function handleGetHourlyCounts(PDO $pdo, array $input): void {
    $params = [];
    $whereSql = buildTransactionWhereClause('get_production_history', $input, $params, true);
    $sql = "
        SELECT
            DATEPART(HOUR, COALESCE(CAST(t.start_time AS DATETIME), t.transaction_timestamp)) AS prod_hour,
            ISNULL(SUM(CASE WHEN t.transaction_type = 'PRODUCTION_FG' THEN t.quantity ELSE 0 END), 0) AS fg_qty,
            ISNULL(SUM(CASE WHEN t.transaction_type = 'PRODUCTION_HOLD' THEN t.quantity ELSE 0 END), 0) AS hold_qty,
            ISNULL(SUM(CASE WHEN t.transaction_type = 'PRODUCTION_SCRAP' THEN t.quantity ELSE 0 END), 0) AS scrap_qty
        FROM " . TRANSACTIONS_TABLE . " t WITH (NOLOCK)
        JOIN " . ITEMS_TABLE . " i WITH (NOLOCK) ON t.parameter_id = i.item_id
        {$whereSql}
        GROUP BY DATEPART(HOUR, COALESCE(CAST(t.start_time AS DATETIME), t.transaction_timestamp))
        ORDER BY prod_hour ASC
    ";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    prodJsonSuccess($stmt->fetchAll(PDO::FETCH_ASSOC), 'Loaded hourly counts');
}

function handleGetTransactionDetails(PDO $pdo, array $input): void {
    $txnId = parsePositiveInt($input['transaction_id'] ?? 0, 'Transaction ID');
    $stmt = $pdo->prepare("
        SELECT
            t.transaction_id, t.parameter_id AS item_id, t.quantity, t.transaction_type,
            t.transaction_timestamp, t.from_location_id, t.to_location_id,
            t.reference_id, t.notes, t.start_time, t.end_time, t.created_by_user_id, t.machine_id,
            i.sap_no, i.part_no, i.part_description,
            lf.location_name AS from_location_name,
            lt.location_name AS to_location_name
        FROM " . TRANSACTIONS_TABLE . " t WITH (NOLOCK)
        JOIN " . ITEMS_TABLE . " i WITH (NOLOCK) ON t.parameter_id = i.item_id
        LEFT JOIN " . LOCATIONS_TABLE . " lf WITH (NOLOCK) ON t.from_location_id = lf.location_id
        LEFT JOIN " . LOCATIONS_TABLE . " lt WITH (NOLOCK) ON t.to_location_id = lt.location_id
        WHERE t.transaction_id = ?
    ");
    $stmt->execute([$txnId]);
    $txn = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$txn) {
        prodJsonError('ไม่พบรายการที่ระบุ', 404);
    }

    $userStmt = $pdo->prepare("SELECT user_id FROM dbo.STOCK_TRANSACTION_USERS WITH (NOLOCK) WHERE transaction_id = ?");
    $userStmt->execute([$txnId]);
    $txn['team_user_ids'] = array_map('intval', $userStmt->fetchAll(PDO::FETCH_COLUMN));

    prodJsonSuccess($txn, 'Loaded transaction details');
}

function assertTransactionEditPermission(array $oldTxn, array $currentUser): void {
    requireProductionManagePermission('คุณไม่มีสิทธิ์แก้ไขหรือกลับรายการธุรกรรมสต็อก (ต้องมีสิทธิ์ manage_production ระดับหัวหน้างานขึ้นไป)');
}

function handleUpdateTransaction(PDO $pdo, array $input, array $currentUser): void {
    requireProductionManagePermission('คุณไม่มีสิทธิ์แก้ไขข้อมูลรายการผลิต/สต็อก (ต้องมีสิทธิ์ manage_production)');

    $txnId = parsePositiveInt($input['transaction_id'] ?? 0, 'Transaction ID');
    $lotNo = trim((string)($input['lot_no'] ?? ''));
    $notes = trim((string)($input['notes'] ?? ''));

    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare(
            "SELECT transaction_id, parameter_id, quantity, transaction_type, from_location_id, to_location_id,
                    reference_id, notes, created_by_user_id, ISNULL(is_reversed, 0) AS is_reversed, reversal_of_tx_id
             FROM " . TRANSACTIONS_TABLE . " WITH (UPDLOCK, HOLDLOCK) WHERE transaction_id = ?"
        );
        $stmt->execute([$txnId]);
        $oldTxn = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$oldTxn) {
            $pdo->rollBack();
            prodJsonError('ไม่พบ Transaction ที่ต้องการแก้ไข', 404);
        }
        if ((int)$oldTxn['is_reversed'] === 1 || !empty($oldTxn['reversal_of_tx_id'])) {
            $pdo->rollBack();
            prodJsonError('ไม่สามารถแก้ไขรายการที่ถูกกลับรายการ (Reversed) หรือรายการกลับยอดได้', 400);
        }

        // Audit Policy (Immutable Ledger): Block in-place quantity/location mutation on posted transactions.
        if (isset($input['quantity']) && abs((float)$input['quantity'] - (float)$oldTxn['quantity']) > 0.0001) {
            $pdo->rollBack();
            prodJsonError('ไม่อนุญาตให้แก้ไขจำนวนย้อนหลังโดยตรงตามมาตรฐาน Audit กรุณาใช้คำสั่ง "กลับรายการ (Reverse)" แล้วบันทึกยอดใหม่', 400);
        }
        if (!empty($input['location_id']) && !empty($oldTxn['to_location_id']) && (int)$input['location_id'] !== (int)$oldTxn['to_location_id']) {
            $pdo->rollBack();
            prodJsonError('ไม่อนุญาตให้เปลี่ยนคลัง/ไลน์ผลิตย้อนหลังโดยตรง กรุณาใช้คำสั่ง "กลับรายการ (Reverse)" แล้วบันทึกใหม่', 400);
        }

        $updMain = $pdo->prepare(
            "UPDATE " . TRANSACTIONS_TABLE . "
             SET reference_id = ?, notes = ?
             WHERE transaction_id = ?"
        );
        $updMain->execute([
            $lotNo !== '' ? mb_substr($lotNo, 0, 250) : null,
            $notes !== '' ? mb_substr($notes, 0, 490) : null,
            $txnId,
        ]);

        writeLog($pdo, 'UPDATE_TXN_META', 'PRODUCTION_API', (string)$txnId, [
            'reference_id' => $oldTxn['reference_id'],
            'notes' => $oldTxn['notes'],
        ], [
            'reference_id' => $lotNo,
            'notes' => $notes,
        ], 'Updated transaction metadata (lot/notes only)');

        $pdo->commit();
        prodJsonSuccess(['transaction_id' => $txnId], 'อัปเดตหมายเหตุ/เลข Lot เรียบร้อยแล้ว');
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $e;
    }
}

function handleReverseTransaction(PDO $pdo, array $input, array $currentUser): void {
    requireProductionManagePermission('คุณไม่มีสิทธิ์กลับรายการ (Reverse) ธุรกรรมสต็อก ต้องให้หัวหน้างานหรือผู้ดูแลระบบดำเนินการ');

    $txnId = parsePositiveInt($input['transaction_id'] ?? $input['txn_id'] ?? 0, 'Transaction ID');
    $reason = parseReversalReason($input['reason'] ?? $input['reversal_reason'] ?? '');

    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare(
            "SELECT transaction_id, parameter_id, quantity, transaction_type, ISNULL(stock_type, 'UNRESTRICTED') AS stock_type,
                    from_location_id, to_location_id, created_by_user_id, reference_id, job_id, machine_id,
                    ISNULL(is_reversed, 0) AS is_reversed, reversal_of_tx_id
             FROM " . TRANSACTIONS_TABLE . " WITH (UPDLOCK, HOLDLOCK) WHERE transaction_id = ?"
        );
        $stmt->execute([$txnId]);
        $oldTxn = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$oldTxn) {
            $pdo->rollBack();
            prodJsonError('ไม่พบรายการที่ต้องการกลับรายการ', 404);
        }
        if ((int)$oldTxn['is_reversed'] === 1) {
            $pdo->rollBack();
            prodJsonError('รายการนี้ถูกกลับรายการ (Reversed) ไปแล้ว ไม่สามารถทำซ้ำได้', 400);
        }
        if (!empty($oldTxn['reversal_of_tx_id']) || str_starts_with((string)$oldTxn['transaction_type'], 'REVERSAL_')) {
            $pdo->rollBack();
            prodJsonError('ไม่สามารถกลับรายการของรายการ Reversal ได้', 400);
        }

        if (str_starts_with((string)$oldTxn['transaction_type'], 'PRODUCTION_')) {
            $jobId = !empty($input['job_id']) ? (int)$input['job_id'] : (!empty($oldTxn['job_id']) ? (int)$oldTxn['job_id'] : null);
            $spStmt = $pdo->prepare("EXEC dbo.sp_ReverseProductionTransaction @txn_id = ?, @job_id = ?, @user_id = ?, @reason = ?");
            $spStmt->execute([$txnId, $jobId, (int)$currentUser['id'], $reason]);
            $revTxnId = (int)$spStmt->fetchColumn();
            $spStmt->closeCursor();

            writeLog($pdo, 'REVERSE_TXN', 'PRODUCTION_API', (string)$txnId, $oldTxn, [
                'reversal_transaction_id' => $revTxnId,
                'reason' => $reason,
            ], 'Reversed production transaction (immutable ledger)');

            $pdo->commit();
            prodJsonSuccess([
                'transaction_id' => $txnId,
                'reversal_transaction_id' => $revTxnId,
            ], 'กลับรายการผลิตและคืนยอดสต็อกเรียบร้อยแล้ว');
        }

        // Non-production transactions (RECEIPT, TRANSFER, ADJUSTMENT): Immutable Reversal
        $qty = (float)$oldTxn['quantity'];
        $itemId = (int)$oldTxn['parameter_id'];
        $stockType = (string)$oldTxn['stock_type'];
        $spStock = $pdo->prepare("EXEC " . SP_UPDATE_ONHAND . " @item_id = ?, @location_id = ?, @quantity_to_change = ?, @stock_type = ?");

        if (!empty($oldTxn['to_location_id'])) {
            $spStock->execute([$itemId, (int)$oldTxn['to_location_id'], -$qty, $stockType]);
            $spStock->closeCursor();
        }
        if (!empty($oldTxn['from_location_id'])) {
            $spStock->execute([$itemId, (int)$oldTxn['from_location_id'], abs($qty), $stockType]);
            $spStock->closeCursor();
        }

        $pdo->prepare("
            UPDATE " . TRANSACTIONS_TABLE . "
            SET is_reversed = 1, reversed_by_user_id = ?, reversed_at = GETDATE(), reversal_reason = ?
            WHERE transaction_id = ?
        ")->execute([(int)$currentUser['id'], $reason, $txnId]);

        $revType = 'REVERSAL_' . substr((string)$oldTxn['transaction_type'], 0, 40);
        $insRev = $pdo->prepare("
            INSERT INTO " . TRANSACTIONS_TABLE . "
                (parameter_id, quantity, transaction_type, stock_type, from_location_id, to_location_id,
                 reference_id, created_by_user_id, notes, transaction_timestamp, reversal_of_tx_id, reversal_reason)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, GETDATE(), ?, ?)
        ");
        $insRev->execute([
            $itemId, -$qty, $revType, $stockType, $oldTxn['from_location_id'], $oldTxn['to_location_id'],
            $oldTxn['reference_id'], (int)$currentUser['id'], "Reversal of TXN #{$txnId}: {$reason}", $txnId, $reason
        ]);
        $revTxnId = (int)$pdo->lastInsertId();

        writeLog($pdo, 'REVERSE_TXN', 'PRODUCTION_API', (string)$txnId, $oldTxn, [
            'reversal_transaction_id' => $revTxnId,
            'reason' => $reason,
        ], 'Reversed inventory transaction (immutable ledger)');

        $pdo->commit();
        prodJsonSuccess([
            'transaction_id' => $txnId,
            'reversal_transaction_id' => $revTxnId,
        ], 'กลับรายการสต็อกเรียบร้อยแล้ว');
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $e;
    }
}

function handleGetWipOnhandReport(PDO $pdo, array $input): void {
    $conditions = ["ISNULL(oh.quantity, 0) != 0"];
    $params = [];

    if (!empty($input['location_id']) && $input['location_id'] !== 'ALL') {
        $conditions[] = "oh.location_id = ?";
        $params[] = (int)$input['location_id'];
    } else {
        $conditions[] = "l.location_type IN ('WIP', 'FG')";
    }

    if (!empty($input['search'])) {
        $term = '%' . trim((string)$input['search']) . '%';
        $conditions[] = "(i.sap_no LIKE ? OR i.part_no LIKE ? OR i.part_description LIKE ?)";
        array_push($params, $term, $term, $term);
    }

    $whereSql = 'WHERE ' . implode(' AND ', $conditions);
    $costCols = canViewProductionCosts()
        ? ', i.Cost_Total, (oh.quantity * ISNULL(i.Cost_Total, 0)) AS total_value'
        : '';
    $sql = "
        SELECT TOP 500
            oh.onhand_id, oh.parameter_id AS item_id, oh.location_id,
            ISNULL(oh.stock_type, 'UNRESTRICTED') AS stock_type,
            oh.quantity AS onhand_qty, oh.last_updated,
            i.sap_no, i.part_no, i.part_description, i.material_type{$costCols},
            l.location_name, l.location_type, l.production_line
        FROM " . ONHAND_TABLE . " oh WITH (NOLOCK)
        JOIN " . ITEMS_TABLE . " i WITH (NOLOCK) ON oh.parameter_id = i.item_id
        JOIN " . LOCATIONS_TABLE . " l WITH (NOLOCK) ON oh.location_id = l.location_id
        {$whereSql}
        ORDER BY l.location_name ASC, i.sap_no ASC, oh.stock_type ASC
    ";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    prodJsonSuccess($stmt->fetchAll(PDO::FETCH_ASSOC), 'Loaded WIP onhand');
}

function handleGetWipReportByLot(PDO $pdo, array $input): void {
    $startDate = parseDateOrDefault($input['start_date'] ?? date('Y-m-d', strtotime('-7 days')));
    $endDate = parseDateOrDefault($input['end_date'] ?? date('Y-m-d'));
    $params = [$startDate, $endDate];

    $locFilter = '';
    if (!empty($input['location_id']) && $input['location_id'] !== 'ALL') {
        $locFilter = " AND t.to_location_id = ?";
        $params[] = (int)$input['location_id'];
    }

    $searchFilter = '';
    if (!empty($input['search'])) {
        $term = '%' . trim((string)$input['search']) . '%';
        $searchFilter = " AND (t.reference_id LIKE ? OR i.sap_no LIKE ? OR i.part_no LIKE ?)";
        array_push($params, $term, $term, $term);
    }

    $sql = "
        SELECT TOP 500
            COALESCE(NULLIF(t.reference_id, ''), '-') AS lot_no,
            i.item_id, i.sap_no, i.part_no, i.part_description,
            l.location_name,
            ISNULL(SUM(CASE WHEN t.transaction_type = 'PRODUCTION_FG' THEN t.quantity ELSE 0 END), 0) AS fg_qty,
            ISNULL(SUM(CASE WHEN t.transaction_type = 'PRODUCTION_HOLD' THEN t.quantity ELSE 0 END), 0) AS hold_qty,
            ISNULL(SUM(CASE WHEN t.transaction_type = 'PRODUCTION_SCRAP' THEN t.quantity ELSE 0 END), 0) AS scrap_qty,
            MAX(t.transaction_timestamp) AS last_activity
        FROM " . TRANSACTIONS_TABLE . " t WITH (NOLOCK)
        JOIN " . ITEMS_TABLE . " i WITH (NOLOCK) ON t.parameter_id = i.item_id
        LEFT JOIN " . LOCATIONS_TABLE . " l WITH (NOLOCK) ON t.to_location_id = l.location_id
        WHERE t.transaction_type IN ('PRODUCTION_FG', 'PRODUCTION_HOLD', 'PRODUCTION_SCRAP')
          AND " . SQL_ACTIVE_TXN_FILTER . "
          AND CAST(t.transaction_timestamp AS DATE) BETWEEN ? AND ?
          {$locFilter}
          {$searchFilter}
        GROUP BY COALESCE(NULLIF(t.reference_id, ''), '-'), i.item_id, i.sap_no, i.part_no, i.part_description, l.location_name
        ORDER BY last_activity DESC
    ";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    prodJsonSuccess($stmt->fetchAll(PDO::FETCH_ASSOC), 'Loaded WIP by lot');
}

function handleGetProductionVarianceReport(PDO $pdo, array $input): void {
    $startDate = parseDateOrDefault($input['start_date'] ?? null);
    $endDate = parseDateOrDefault($input['end_date'] ?? null);
    $params = [$startDate, $endDate, $startDate, $endDate];

    $searchFilter = '';
    if (!empty($input['search'])) {
        $term = '%' . trim((string)$input['search']) . '%';
        $searchFilter = " AND (i.sap_no LIKE ? OR i.part_no LIKE ? OR i.part_description LIKE ?)";
        array_push($params, $term, $term, $term);
    }

    $sql = "
        WITH PlanAgg AS (
            SELECT
                p.item_id,
                MAX(p.line) AS line_name,
                ISNULL(SUM(CASE WHEN ISNULL(p.adjusted_planned_quantity, p.original_planned_quantity) > 0 THEN ISNULL(p.adjusted_planned_quantity, p.original_planned_quantity) ELSE 0 END), 0) AS planned_qty
            FROM " . PRODUCTION_PLANS_TABLE . " p WITH (NOLOCK)
            WHERE p.plan_date BETWEEN ? AND ?
            GROUP BY p.item_id
        ),
        ActualAgg AS (
            SELECT
                t.parameter_id AS item_id,
                ISNULL(SUM(CASE WHEN t.transaction_type = 'PRODUCTION_FG' THEN t.quantity ELSE 0 END), 0) AS fg_qty,
                ISNULL(SUM(CASE WHEN t.transaction_type = 'PRODUCTION_HOLD' THEN t.quantity ELSE 0 END), 0) AS hold_qty,
                ISNULL(SUM(CASE WHEN t.transaction_type = 'PRODUCTION_SCRAP' THEN t.quantity ELSE 0 END), 0) AS scrap_qty
            FROM " . TRANSACTIONS_TABLE . " t WITH (NOLOCK)
            WHERE t.transaction_type IN ('PRODUCTION_FG', 'PRODUCTION_HOLD', 'PRODUCTION_SCRAP')
              AND " . SQL_ACTIVE_TXN_FILTER . "
              AND CAST(t.transaction_timestamp AS DATE) BETWEEN ? AND ?
            GROUP BY t.parameter_id
        )
        SELECT TOP 500
            COALESCE(pa.item_id, aa.item_id) AS item_id,
            i.sap_no, i.part_no, i.part_description,
            pa.line_name,
            ISNULL(pa.planned_qty, 0) AS planned_qty,
            ISNULL(aa.fg_qty, 0) AS fg_qty,
            ISNULL(aa.hold_qty, 0) AS hold_qty,
            ISNULL(aa.scrap_qty, 0) AS scrap_qty,
            (ISNULL(aa.fg_qty, 0) - ISNULL(pa.planned_qty, 0)) AS variance_qty
        FROM PlanAgg pa
        FULL OUTER JOIN ActualAgg aa ON pa.item_id = aa.item_id
        JOIN " . ITEMS_TABLE . " i WITH (NOLOCK) ON COALESCE(pa.item_id, aa.item_id) = i.item_id
        WHERE (ISNULL(pa.planned_qty, 0) > 0 OR ISNULL(aa.fg_qty, 0) > 0 OR ISNULL(aa.hold_qty, 0) > 0 OR ISNULL(aa.scrap_qty, 0) > 0)
        {$searchFilter}
        ORDER BY ABS(ISNULL(aa.fg_qty, 0) - ISNULL(pa.planned_qty, 0)) DESC, i.sap_no ASC
    ";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    prodJsonSuccess($stmt->fetchAll(PDO::FETCH_ASSOC), 'Loaded variance report');
}

function handleGetVarianceDetails(PDO $pdo, array $input): void {
    $itemId = parsePositiveInt($input['item_id'] ?? 0, 'Item ID');
    $startDate = parseDateOrDefault($input['start_date'] ?? null);
    $endDate = parseDateOrDefault($input['end_date'] ?? null);

    $stmt = $pdo->prepare("
        SELECT
            t.transaction_id, t.transaction_timestamp, t.transaction_type, t.quantity, t.reference_id, t.notes,
            lt.location_name, u.username
        FROM " . TRANSACTIONS_TABLE . " t WITH (NOLOCK)
        LEFT JOIN " . LOCATIONS_TABLE . " lt WITH (NOLOCK) ON t.to_location_id = lt.location_id
        LEFT JOIN " . USERS_TABLE . " u WITH (NOLOCK) ON t.created_by_user_id = u.id
        WHERE t.parameter_id = ?
          AND t.transaction_type IN ('PRODUCTION_FG', 'PRODUCTION_HOLD', 'PRODUCTION_SCRAP')
          AND " . SQL_ACTIVE_TXN_FILTER . "
          AND CAST(t.transaction_timestamp AS DATE) BETWEEN ? AND ?
        ORDER BY t.transaction_timestamp DESC
    ");
    $stmt->execute([$itemId, $startDate, $endDate]);
    prodJsonSuccess($stmt->fetchAll(PDO::FETCH_ASSOC), 'Loaded variance details');
}

function handleGetStockInventoryReport(PDO $pdo, array $input): void {
    $page = max(1, (int)($input['page'] ?? 1));
    $limit = max(1, min(200, (int)($input['limit'] ?? 50)));
    $offset = ($page - 1) * $limit;
    $params = [];
    $conditions = ["i.is_active = 1"];

    if (!empty($input['location_id']) && $input['location_id'] !== 'ALL') {
        $conditions[] = "oh.location_id = ?";
        $params[] = (int)$input['location_id'];
    }
    if (!empty($input['material_type']) && $input['material_type'] !== 'ALL') {
        $conditions[] = "i.material_type = ?";
        $params[] = trim((string)$input['material_type']);
    }
    if (!empty($input['hide_zero']) && $input['hide_zero'] === 'true') {
        $conditions[] = "ISNULL(oh.quantity, 0) != 0";
    }
    if (!empty($input['search'])) {
        $term = '%' . trim((string)$input['search']) . '%';
        $conditions[] = "(i.sap_no LIKE ? OR i.part_no LIKE ? OR i.part_description LIKE ?)";
        array_push($params, $term, $term, $term);
    }

    $whereSql = 'WHERE ' . implode(' AND ', $conditions);
    $countSql = "
        SELECT COUNT(DISTINCT i.item_id)
        FROM " . ITEMS_TABLE . " i WITH (NOLOCK)
        LEFT JOIN " . ONHAND_TABLE . " oh WITH (NOLOCK) ON i.item_id = oh.parameter_id
        {$whereSql}
    ";
    $countStmt = $pdo->prepare($countSql);
    $countStmt->execute($params);
    $total = (int)$countStmt->fetchColumn();

    $canViewCost = canViewProductionCosts();
    $costCols = $canViewCost
        ? ', i.Cost_Total, (ISNULL(SUM(oh.quantity), 0) * ISNULL(i.Cost_Total, 0)) AS total_value'
        : '';
    $costGroupBy = $canViewCost ? ', i.Cost_Total' : '';

    $dataSql = "
        SELECT
            i.item_id, i.sap_no, i.part_no, i.part_description, i.material_type, i.min_stock, i.max_stock{$costCols},
            ISNULL(SUM(CASE WHEN ISNULL(oh.stock_type, 'UNRESTRICTED') = 'UNRESTRICTED' THEN oh.quantity ELSE 0 END), 0) AS total_onhand,
            ISNULL(SUM(CASE WHEN oh.stock_type = 'QUALITY_INSPECTION' THEN oh.quantity ELSE 0 END), 0) AS total_qi_hold,
            ISNULL(SUM(CASE WHEN oh.stock_type = 'BLOCKED_SCRAP' THEN oh.quantity ELSE 0 END), 0) AS total_blocked_scrap
        FROM " . ITEMS_TABLE . " i WITH (NOLOCK)
        LEFT JOIN " . ONHAND_TABLE . " oh WITH (NOLOCK) ON i.item_id = oh.parameter_id
        {$whereSql}
        GROUP BY i.item_id, i.sap_no, i.part_no, i.part_description, i.material_type, i.min_stock, i.max_stock{$costGroupBy}
        ORDER BY i.sap_no ASC
        OFFSET ? ROWS FETCH NEXT ? ROWS ONLY
    ";
    $stmt = $pdo->prepare($dataSql);
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
    ], 'Loaded stock inventory');
}

function handleGetStockDetailsByItem(PDO $pdo, array $input): void {
    $itemId = parsePositiveInt($input['item_id'] ?? 0, 'Item ID');
    $stmt = $pdo->prepare("
        SELECT oh.location_id, l.location_name, l.location_type,
               ISNULL(oh.stock_type, 'UNRESTRICTED') AS stock_type,
               oh.quantity, oh.last_updated
        FROM " . ONHAND_TABLE . " oh WITH (NOLOCK)
        JOIN " . LOCATIONS_TABLE . " l WITH (NOLOCK) ON oh.location_id = l.location_id
        WHERE oh.parameter_id = ?
        ORDER BY l.location_name ASC, oh.stock_type ASC
    ");
    $stmt->execute([$itemId]);
    prodJsonSuccess($stmt->fetchAll(PDO::FETCH_ASSOC), 'Loaded item stock locations');
}

function handleAdjustSingleStock(PDO $pdo, array $input, array $currentUser): void {
    if (!hasPermission('manage_production') && !hasRole(['admin', 'creator', 'supervisor'])) {
        prodJsonError('คุณไม่มีสิทธิ์ปรับยอดสต็อกด้วยตนเอง', 403);
    }

    $itemId = parsePositiveInt($input['item_id'] ?? 0, 'Item ID');
    $locationId = parsePositiveInt($input['location_id'] ?? 0, 'Location ID');
    $stockType = strtoupper(trim((string)($input['stock_type'] ?? 'UNRESTRICTED')));
    if (!in_array($stockType, ['UNRESTRICTED', 'QUALITY_INSPECTION', 'BLOCKED_SCRAP'], true)) {
        throw new InvalidArgumentException('ประเภทสต็อก (stock_type) ไม่ถูกต้อง');
    }
    if (!isset($input['new_quantity']) || !is_numeric($input['new_quantity'])) {
        throw new InvalidArgumentException('จำนวนใหม่ไม่ถูกต้อง');
    }
    $newQty = round((float)$input['new_quantity'], 3);
    if (!is_finite($newQty) || $newQty < 0 || $newQty > 10000000) {
        throw new InvalidArgumentException('ยอดสต็อกใหม่ต้องอยู่ระหว่าง 0 ถึง 10,000,000');
    }
    $reason = trim((string)($input['reason'] ?? 'Manual stock adjustment'));

    $pdo->beginTransaction();
    try {
        $currStmt = $pdo->prepare("SELECT ISNULL(quantity, 0) FROM " . ONHAND_TABLE . " WITH (UPDLOCK, HOLDLOCK) WHERE parameter_id = ? AND location_id = ? AND stock_type = ?");
        $currStmt->execute([$itemId, $locationId, $stockType]);
        $oldQty = (float)($currStmt->fetchColumn() ?: 0);
        $diff = round($newQty - $oldQty, 3);

        if (abs($diff) > 0.0001) {
            $sp = $pdo->prepare("EXEC " . SP_UPDATE_ONHAND . " @item_id = ?, @location_id = ?, @quantity_to_change = ?, @stock_type = ?");
            $sp->execute([$itemId, $locationId, $diff, $stockType]);
            $sp->closeCursor();

            $ins = $pdo->prepare(
                "INSERT INTO " . TRANSACTIONS_TABLE . "
                    (parameter_id, quantity, transaction_type, stock_type, transaction_timestamp, to_location_id, reference_id, notes, created_by_user_id)
                 VALUES (?, ?, 'ADJUSTMENT', ?, GETDATE(), ?, 'MANUAL_ADJ', ?, ?)"
            );
            $ins->execute([$itemId, $diff, $stockType, $locationId, $reason, (int)$currentUser['id']]);
        }

        writeLog($pdo, 'ADJUST_STOCK', 'PRODUCTION_API', "{$itemId}:{$locationId}:{$stockType}", ['quantity' => $oldQty], ['quantity' => $newQty], $reason);
        $pdo->commit();
        prodJsonSuccess(['old_quantity' => $oldQty, 'new_quantity' => $newQty, 'diff' => $diff, 'stock_type' => $stockType], 'ปรับยอดสต็อกเรียบร้อยแล้ว');
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $e;
    }
}

function handleGetStockOnhand(PDO $pdo, array $input): void {
    $itemId = parsePositiveInt($input['item_id'] ?? 0, 'Item ID');
    $locationId = parsePositiveInt($input['location_id'] ?? 0, 'Location ID');
    $stockType = strtoupper(trim((string)($input['stock_type'] ?? 'UNRESTRICTED')));
    $stmt = $pdo->prepare("SELECT ISNULL(quantity, 0) FROM " . ONHAND_TABLE . " WITH (NOLOCK) WHERE parameter_id = ? AND location_id = ? AND stock_type = ?");
    $stmt->execute([$itemId, $locationId, $stockType]);
    prodJsonSuccess(['quantity' => (float)($stmt->fetchColumn() ?: 0), 'stock_type' => $stockType], 'Loaded stock onhand');
}

function handleGetEmployeeDailySummary(PDO $pdo, array $input): void {
    $startDate = parseDateOrDefault($input['start_date'] ?? null);
    $endDate = parseDateOrDefault($input['end_date'] ?? $startDate);
    $params = [$startDate, $endDate];
    $locSql = '';
    if (!empty($input['location_id']) && $input['location_id'] !== 'ALL') {
        $locSql = " AND t.to_location_id = ?";
        $params[] = (int)$input['location_id'];
    }

    $sql = "
        SELECT TOP 500
            u.id AS user_id,
            u.username,
            COALESCE(NULLIF(me.name_th, ''), NULLIF(u.fullname, ''), u.username) AS employee_name,
            COALESCE(NULLIF(u.emp_id, ''), stu.emp_id, '-') AS emp_id,
            COALESCE(u.team_group, '-') AS team_group,
            ISNULL(SUM(CASE WHEN t.transaction_type = 'PRODUCTION_FG' THEN t.quantity * ISNULL(stu.head_count_ratio, 1.0) ELSE 0 END), 0) AS weighted_fg,
            ISNULL(SUM(CASE WHEN t.transaction_type = 'PRODUCTION_HOLD' THEN t.quantity * ISNULL(stu.head_count_ratio, 1.0) ELSE 0 END), 0) AS weighted_hold,
            ISNULL(SUM(CASE WHEN t.transaction_type = 'PRODUCTION_SCRAP' THEN t.quantity * ISNULL(stu.head_count_ratio, 1.0) ELSE 0 END), 0) AS weighted_scrap,
            COUNT(DISTINCT t.transaction_id) AS txn_count
        FROM dbo.STOCK_TRANSACTION_USERS stu WITH (NOLOCK)
        JOIN " . TRANSACTIONS_TABLE . " t WITH (NOLOCK) ON stu.transaction_id = t.transaction_id
        JOIN " . USERS_TABLE . " u WITH (NOLOCK) ON stu.user_id = u.id
        LEFT JOIN dbo.MANPOWER_EMPLOYEES me WITH (NOLOCK) ON u.emp_id = me.emp_id
        WHERE t.transaction_type IN ('PRODUCTION_FG', 'PRODUCTION_HOLD', 'PRODUCTION_SCRAP')
          AND " . SQL_ACTIVE_TXN_FILTER . "
          AND CAST(t.transaction_timestamp AS DATE) BETWEEN ? AND ?
          {$locSql}
        GROUP BY u.id, u.username, COALESCE(NULLIF(me.name_th, ''), NULLIF(u.fullname, ''), u.username), COALESCE(NULLIF(u.emp_id, ''), stu.emp_id, '-'), COALESCE(u.team_group, '-')
        ORDER BY weighted_fg DESC
    ";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    prodJsonSuccess($stmt->fetchAll(PDO::FETCH_ASSOC), 'Loaded employee summary');
}

function handleGetTeamUsers(PDO $pdo, array $currentUser): void {
    $stmt = $pdo->query("
        SELECT id, username, COALESCE(NULLIF(fullname, ''), username) AS fullname, emp_id, line, team_group, role
        FROM " . USERS_TABLE . " WITH (NOLOCK)
        WHERE is_active = 1
        ORDER BY team_group ASC, fullname ASC, username ASC
    ");
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
    prodJsonSuccess([
        'users' => $users,
        'current_user_id' => (int)$currentUser['id'],
    ], 'Loaded team users');
}

function handleGetActiveLineUsers(PDO $pdo, array $input, array $currentUser): void {
    $date = parseDateOrDefault($input['date'] ?? null);
    $locationId = !empty($input['location_id']) ? (int)$input['location_id'] : 0;
    $lineName = trim((string)($input['line'] ?? ''));

    if ($lineName === '' && $locationId > 0) {
        $lStmt = $pdo->prepare("SELECT production_line FROM " . LOCATIONS_TABLE . " WITH (NOLOCK) WHERE location_id = ?");
        $lStmt->execute([$locationId]);
        $lineName = trim((string)($lStmt->fetchColumn() ?: ''));
    }

    $params = [$date];
    $lineCondition = '';
    if ($lineName !== '') {
        $lineCondition = " AND (mdl.actual_line = ? OR me.line = ? OR u.line = ?)";
        array_push($params, $lineName, $lineName, $lineName);
    }

    $sql = "
        SELECT TOP 200
            u.id AS user_id,
            u.username,
            COALESCE(NULLIF(me.name_th, ''), NULLIF(u.fullname, ''), u.username) AS display_name,
            COALESCE(NULLIF(me.emp_id, ''), u.emp_id) AS emp_id,
            COALESCE(mdl.actual_line, me.line, u.line) AS line,
            COALESCE(mdl.actual_team, me.team_group, u.team_group) AS team_group,
            mdl.shift_id,
            CASE WHEN mdl.log_id IS NOT NULL THEN 1 ELSE 0 END AS is_checked_in
        FROM " . USERS_TABLE . " u WITH (NOLOCK)
        LEFT JOIN dbo.MANPOWER_EMPLOYEES me WITH (NOLOCK) ON u.emp_id = me.emp_id AND me.is_active = 1
        LEFT JOIN dbo.MANPOWER_DAILY_LOGS mdl WITH (NOLOCK) ON me.emp_id = mdl.emp_id AND mdl.log_date = ?
        WHERE u.is_active = 1
          AND u.id IS NOT NULL
          {$lineCondition}
        ORDER BY is_checked_in DESC, display_name ASC
    ";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    prodJsonSuccess([
        'operators' => $stmt->fetchAll(PDO::FETCH_ASSOC),
        'line' => $lineName,
        'current_user_id' => (int)$currentUser['id'],
    ], 'Loaded active line operators');
}
