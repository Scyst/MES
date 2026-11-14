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

        case 'delete_transaction':
            handleDeleteTransaction($pdo, $input, $currentUser);
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
} catch (Throwable $e) {
    handleApiError($e, $pdo ?? null, $input ?? $_REQUEST);
}

function handleGetInitialData(PDO $pdo, array $currentUser): void {
    $locStmt = $pdo->query("
        SELECT location_id, location_name, location_description, location_type, production_line, zone_name
        FROM " . LOCATIONS_TABLE . " WITH (NOLOCK)
        WHERE is_active = 1
        ORDER BY location_name ASC
    ");
    $locations = $locStmt->fetchAll(PDO::FETCH_ASSOC);

    $itemStmt = $pdo->query("
        SELECT TOP 3000 item_id, sap_no, part_no, part_description, material_type, material_sub_type, sku, CTN, barcode, Cost_Total, planned_output
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
            'can_manage' => hasPermission('manage_production') || hasRole(['admin', 'creator', 'supervisor']),
        ],
    ], 'Loaded production metadata');
}

function handleExecuteProduction(PDO $pdo, array $input, array $currentUser): void {
    $itemId = parsePositiveInt($input['item_id'] ?? 0, 'สินค้า (Item)');
    $locationId = parsePositiveInt($input['location_id'] ?? 0, 'ไลน์ผลิต / สถานที่ (Location)');
    $logDate = parseDateOrDefault($input['log_date'] ?? null);
    $startTime = trim((string)($input['start_time'] ?? date('H:00:00')));
    $endTime = trim((string)($input['end_time'] ?? date('H:59:59')));
    $lotNo = trim((string)($input['lot_no'] ?? ''));
    $notes = trim((string)($input['notes'] ?? ''));
    $scrapReason = trim((string)($input['scrap_reason'] ?? ''));
    $machineId = !empty($input['machine_id']) ? (int)$input['machine_id'] : null;
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

    $spStmt = $pdo->prepare(
        "EXEC " . SP_EXECUTE_PRODUCTION . "
            @item_id = ?, @location_id = ?, @quantity = ?, @count_type = ?,
            @lot_no = ?, @notes = ?, @timestamp = ?, @start_time = ?, @end_time = ?,
            @user_id = ?, @username = ?, @machine_id = ?, @team_user_ids = ?"
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
        ]);
        $spStmt->closeCursor();

        $findIdStmt = $pdo->prepare(
            "SELECT TOP 1 transaction_id FROM " . TRANSACTIONS_TABLE . " WITH (NOLOCK)
             WHERE parameter_id = ? AND to_location_id = ? AND created_by_user_id = ?
             ORDER BY transaction_id DESC"
        );
        $findIdStmt->execute([$itemId, $locationId, (int)$currentUser['id']]);
        $txnId = (int)$findIdStmt->fetchColumn();
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
        'entries' => $entries,
        'lot_no' => $lotNo,
        'req_uuids' => $reqUuids,
    ], 'Recorded production execution');

    prodJsonSuccess([
        'transaction_ids' => $createdIds,
        'req_uuids' => $reqUuids,
    ], 'บันทึกผลผลิตเรียบร้อยแล้ว');
}

function handleExecuteReceipt(PDO $pdo, array $input, array $currentUser): void {
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

function buildTransactionWhereClause(string $action, array $input, array &$params): string {
    $conditions = [];

    if ($action === 'get_production_history') {
        $conditions[] = "t.transaction_type IN ('PRODUCTION_FG', 'PRODUCTION_HOLD', 'PRODUCTION_SCRAP')";
    } elseif ($action === 'get_receipt_history') {
        $conditions[] = "t.transaction_type IN ('RECEIPT', 'TRANSFER', 'INTERNAL_TRANSFER')";
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
            t.transaction_timestamp, t.from_location_id, t.to_location_id,
            t.reference_id, t.notes, t.start_time, t.end_time, t.created_by_user_id, t.machine_id,
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
    $whereSql = buildTransactionWhereClause($mappedAction, $input, $params);

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
    $whereSql = buildTransactionWhereClause('get_production_history', $input, $params);
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
    if (hasPermission('manage_production') || hasRole(['admin', 'creator', 'supervisor'])) {
        return;
    }
    if ((int)$oldTxn['created_by_user_id'] !== (int)$currentUser['id']) {
        prodJsonError('คุณไม่มีสิทธิ์แก้ไขหรือลบรายการที่ผู้อื่นเป็นผู้บันทึก', 403);
    }
}

function handleUpdateTransaction(PDO $pdo, array $input, array $currentUser): void {
    $txnId = parsePositiveInt($input['transaction_id'] ?? 0, 'Transaction ID');
    $newQty = parsePositiveQty($input['quantity'] ?? 0, 'จำนวน');
    $logDate = parseDateOrDefault($input['log_date'] ?? null);
    $startTime = trim((string)($input['start_time'] ?? ''));
    $endTime = trim((string)($input['end_time'] ?? ''));
    $logTime = trim((string)($input['log_time'] ?? ($endTime !== '' ? $endTime : date('H:i:s'))));
    $lotNo = trim((string)($input['lot_no'] ?? ''));
    $notes = trim((string)($input['notes'] ?? ''));

    $stmt = $pdo->prepare(
        "SELECT transaction_id, parameter_id, quantity, transaction_type, from_location_id, to_location_id, reference_id, notes, created_by_user_id
         FROM " . TRANSACTIONS_TABLE . " WITH (UPDLOCK) WHERE transaction_id = ?"
    );
    $stmt->execute([$txnId]);
    $oldTxn = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$oldTxn) {
        prodJsonError('ไม่พบ Transaction ที่ต้องการแก้ไข', 404);
    }
    assertTransactionEditPermission($oldTxn, $currentUser);

    $oldQty = (float)$oldTxn['quantity'];
    $oldItemId = (int)$oldTxn['parameter_id'];
    $txnType = $oldTxn['transaction_type'];
    $deltaQty = $newQty - $oldQty;
    $newTimestamp = $logDate . ' ' . $logTime;

    $pdo->beginTransaction();
    try {
        $spStock = $pdo->prepare("EXEC " . SP_UPDATE_ONHAND . " @item_id = ?, @location_id = ?, @quantity_to_change = ?");

        if (str_starts_with($txnType, 'PRODUCTION_')) {
            $newLocId = !empty($input['location_id']) ? (int)$input['location_id'] : (int)$oldTxn['to_location_id'];
            $oldLocId = (int)$oldTxn['to_location_id'];

            if ($newLocId !== $oldLocId) {
                $spStock->execute([$oldItemId, $oldLocId, -$oldQty]);
                $spStock->closeCursor();
                $spStock->execute([$oldItemId, $newLocId, $newQty]);
                $spStock->closeCursor();
            } elseif (abs($deltaQty) > 0.0001) {
                $spStock->execute([$oldItemId, $newLocId, $deltaQty]);
                $spStock->closeCursor();
            }

            if (abs($deltaQty) > 0.0001 || $newLocId !== $oldLocId) {
                $consumeNote = 'Auto-consumed for production ID: ' . $txnId;
                $childStmt = $pdo->prepare(
                    "SELECT transaction_id, parameter_id, quantity, from_location_id
                     FROM " . TRANSACTIONS_TABLE . " WITH (UPDLOCK)
                     WHERE notes = ? AND transaction_type = 'CONSUMPTION'"
                );
                $childStmt->execute([$consumeNote]);
                $children = $childStmt->fetchAll(PDO::FETCH_ASSOC);
                foreach ($children as $child) {
                    $childQty = (float)$child['quantity'];
                    $ratio = $oldQty > 0 ? ($newQty / $oldQty) : 1.0;
                    $newChildQty = round($childQty * $ratio, 6);
                    if ((int)$child['from_location_id'] !== $newLocId) {
                        $spStock->execute([(int)$child['parameter_id'], (int)$child['from_location_id'], -$childQty]);
                        $spStock->closeCursor();
                        $spStock->execute([(int)$child['parameter_id'], $newLocId, $newChildQty]);
                        $spStock->closeCursor();
                    } else {
                        $childDelta = $newChildQty - $childQty;
                        if (abs($childDelta) > 0.0001) {
                            $spStock->execute([(int)$child['parameter_id'], $newLocId, $childDelta]);
                            $spStock->closeCursor();
                        }
                    }
                    $updChild = $pdo->prepare("UPDATE " . TRANSACTIONS_TABLE . " SET quantity = ?, from_location_id = ?, transaction_timestamp = ? WHERE transaction_id = ?");
                    $updChild->execute([$newChildQty, $newLocId, $newTimestamp, (int)$child['transaction_id']]);
                }
            }

            $updMain = $pdo->prepare(
                "UPDATE " . TRANSACTIONS_TABLE . "
                 SET quantity = ?, to_location_id = ?, reference_id = ?, notes = ?, transaction_timestamp = ?,
                     start_time = CASE WHEN ? != '' THEN CAST(? AS TIME) ELSE start_time END,
                     end_time = CASE WHEN ? != '' THEN CAST(? AS TIME) ELSE end_time END
                 WHERE transaction_id = ?"
            );
            $updMain->execute([
                $newQty, $newLocId, $lotNo !== '' ? $lotNo : null, $notes !== '' ? $notes : null, $newTimestamp,
                $startTime, $startTime, $endTime, $endTime, $txnId
            ]);
        } else {
            $newToLoc = parsePositiveInt($input['to_location_id'] ?? $input['location_id'] ?? $oldTxn['to_location_id'], 'คลังปลายทาง');
            $newFromLoc = $txnType === 'TRANSFER'
                ? parsePositiveInt($input['from_location_id'] ?? $oldTxn['from_location_id'], 'คลังต้นทาง')
                : null;

            if (!empty($oldTxn['to_location_id'])) {
                $spStock->execute([$oldItemId, (int)$oldTxn['to_location_id'], -$oldQty]);
                $spStock->closeCursor();
            }
            if (!empty($oldTxn['from_location_id'])) {
                $spStock->execute([$oldItemId, (int)$oldTxn['from_location_id'], $oldQty]);
                $spStock->closeCursor();
            }

            if ($newFromLoc) {
                $spStock->execute([$oldItemId, $newFromLoc, -$newQty]);
                $spStock->closeCursor();
            }
            $spStock->execute([$oldItemId, $newToLoc, $newQty]);
            $spStock->closeCursor();

            $updStmt = $pdo->prepare(
                "UPDATE " . TRANSACTIONS_TABLE . "
                 SET quantity = ?, from_location_id = ?, to_location_id = ?, reference_id = ?, notes = ?, transaction_timestamp = ?
                 WHERE transaction_id = ?"
            );
            $updStmt->execute([$newQty, $newFromLoc, $newToLoc, $lotNo !== '' ? $lotNo : null, $notes !== '' ? $notes : null, $newTimestamp, $txnId]);
        }

        writeLog($pdo, 'UPDATE_TXN', 'PRODUCTION_API', (string)$txnId, $oldTxn, $input, 'Updated stock transaction');
        $pdo->commit();
        prodJsonSuccess(['transaction_id' => $txnId], 'แก้ไขรายการเรียบร้อยแล้ว');
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $e;
    }
}

function handleDeleteTransaction(PDO $pdo, array $input, array $currentUser): void {
    $txnId = parsePositiveInt($input['transaction_id'] ?? 0, 'Transaction ID');
    $stmt = $pdo->prepare(
        "SELECT transaction_id, parameter_id, quantity, transaction_type, from_location_id, to_location_id, created_by_user_id, reference_id
         FROM " . TRANSACTIONS_TABLE . " WITH (NOLOCK) WHERE transaction_id = ?"
    );
    $stmt->execute([$txnId]);
    $oldTxn = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$oldTxn) {
        prodJsonError('ไม่พบรายการที่ต้องการลบ', 404);
    }
    assertTransactionEditPermission($oldTxn, $currentUser);

    if (str_starts_with($oldTxn['transaction_type'], 'PRODUCTION_')) {
        // sp_Job_DeleteTransaction owns its internal transaction boundary
        $jobId = !empty($input['job_id']) ? (int)$input['job_id'] : null;
        $spStmt = $pdo->prepare("EXEC dbo.sp_Job_DeleteTransaction @txn_id = ?, @job_id = ?, @user_id = ?");
        $spStmt->execute([$txnId, $jobId, (int)$currentUser['id']]);
        $spStmt->closeCursor();
        writeLog($pdo, 'DELETE_TXN', 'PRODUCTION_API', (string)$txnId, $oldTxn, null, 'Deleted production transaction');
        prodJsonSuccess(['transaction_id' => $txnId], 'ลบรายการและคืนยอดสต็อกเรียบร้อยแล้ว');
    }

    $pdo->beginTransaction();
    try {
        $qty = (float)$oldTxn['quantity'];
        $itemId = (int)$oldTxn['parameter_id'];
        $spStock = $pdo->prepare("EXEC " . SP_UPDATE_ONHAND . " @item_id = ?, @location_id = ?, @quantity_to_change = ?");
        if (!empty($oldTxn['to_location_id'])) {
            $spStock->execute([$itemId, (int)$oldTxn['to_location_id'], -$qty]);
            $spStock->closeCursor();
        }
        if (!empty($oldTxn['from_location_id'])) {
            $spStock->execute([$itemId, (int)$oldTxn['from_location_id'], $qty]);
            $spStock->closeCursor();
        }
        $pdo->prepare("DELETE FROM dbo.STOCK_TRANSACTION_USERS WHERE transaction_id = ?")->execute([$txnId]);
        $pdo->prepare("DELETE FROM " . TRANSACTIONS_TABLE . " WHERE transaction_id = ?")->execute([$txnId]);

        writeLog($pdo, 'DELETE_TXN', 'PRODUCTION_API', (string)$txnId, $oldTxn, null, 'Deleted inventory transaction');
        $pdo->commit();
        prodJsonSuccess(['transaction_id' => $txnId], 'ลบรายการเรียบร้อยแล้ว');
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
    $sql = "
        SELECT TOP 500
            oh.onhand_id, oh.parameter_id AS item_id, oh.location_id, oh.quantity AS onhand_qty, oh.last_updated,
            i.sap_no, i.part_no, i.part_description, i.material_type, i.Cost_Total,
            (oh.quantity * ISNULL(i.Cost_Total, 0)) AS total_value,
            l.location_name, l.location_type, l.production_line
        FROM " . ONHAND_TABLE . " oh WITH (NOLOCK)
        JOIN " . ITEMS_TABLE . " i WITH (NOLOCK) ON oh.parameter_id = i.item_id
        JOIN " . LOCATIONS_TABLE . " l WITH (NOLOCK) ON oh.location_id = l.location_id
        {$whereSql}
        ORDER BY l.location_name ASC, i.sap_no ASC
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

    $dataSql = "
        SELECT
            i.item_id, i.sap_no, i.part_no, i.part_description, i.material_type, i.min_stock, i.max_stock, i.Cost_Total,
            ISNULL(SUM(oh.quantity), 0) AS total_onhand,
            (ISNULL(SUM(oh.quantity), 0) * ISNULL(i.Cost_Total, 0)) AS total_value
        FROM " . ITEMS_TABLE . " i WITH (NOLOCK)
        LEFT JOIN " . ONHAND_TABLE . " oh WITH (NOLOCK) ON i.item_id = oh.parameter_id
        {$whereSql}
        GROUP BY i.item_id, i.sap_no, i.part_no, i.part_description, i.material_type, i.min_stock, i.max_stock, i.Cost_Total
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
        SELECT oh.location_id, l.location_name, l.location_type, oh.quantity, oh.last_updated
        FROM " . ONHAND_TABLE . " oh WITH (NOLOCK)
        JOIN " . LOCATIONS_TABLE . " l WITH (NOLOCK) ON oh.location_id = l.location_id
        WHERE oh.parameter_id = ?
        ORDER BY l.location_name ASC
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
        $currStmt = $pdo->prepare("SELECT ISNULL(quantity, 0) FROM " . ONHAND_TABLE . " WITH (UPDLOCK) WHERE parameter_id = ? AND location_id = ?");
        $currStmt->execute([$itemId, $locationId]);
        $oldQty = (float)($currStmt->fetchColumn() ?: 0);
        $diff = round($newQty - $oldQty, 3);

        if (abs($diff) > 0.0001) {
            $sp = $pdo->prepare("EXEC " . SP_UPDATE_ONHAND . " @item_id = ?, @location_id = ?, @quantity_to_change = ?");
            $sp->execute([$itemId, $locationId, $diff]);
            $sp->closeCursor();

            $ins = $pdo->prepare(
                "INSERT INTO " . TRANSACTIONS_TABLE . "
                    (parameter_id, quantity, transaction_type, transaction_timestamp, to_location_id, reference_id, notes, created_by_user_id)
                 VALUES (?, ?, 'ADJUSTMENT', GETDATE(), ?, 'MANUAL_ADJ', ?, ?)"
            );
            $ins->execute([$itemId, $diff, $locationId, $reason, (int)$currentUser['id']]);
        }

        writeLog($pdo, 'ADJUST_STOCK', 'PRODUCTION_API', "{$itemId}:{$locationId}", ['quantity' => $oldQty], ['quantity' => $newQty], $reason);
        $pdo->commit();
        prodJsonSuccess(['old_quantity' => $oldQty, 'new_quantity' => $newQty, 'diff' => $diff], 'ปรับยอดสต็อกเรียบร้อยแล้ว');
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $e;
    }
}

function handleGetStockOnhand(PDO $pdo, array $input): void {
    $itemId = parsePositiveInt($input['item_id'] ?? 0, 'Item ID');
    $locationId = parsePositiveInt($input['location_id'] ?? 0, 'Location ID');
    $stmt = $pdo->prepare("SELECT ISNULL(quantity, 0) FROM " . ONHAND_TABLE . " WITH (NOLOCK) WHERE parameter_id = ? AND location_id = ?");
    $stmt->execute([$itemId, $locationId]);
    prodJsonSuccess(['quantity' => (float)($stmt->fetchColumn() ?: 0)], 'Loaded stock onhand');
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
