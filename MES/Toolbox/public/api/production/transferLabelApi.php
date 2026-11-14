<?php
/**
 * Self-contained Toolbox API for WIP/FG Thermal Tag Printer & Transfer Scanning.
 * Handles LOT_SERIALS sequence reservation, STOCK_TRANSFER_ORDERS CRUD/cancel/rollback,
 * range-based batch printing, and transfer confirmation / reversal / scan-sale.
 */

require_once __DIR__ . '/_common.php';

[$action, $input, $currentUser] = parseProductionRequest();

try {
    switch ($action) {
        case 'search_items':
            handleLabelSearchItems($pdo, $input);
            break;

        case 'get_label_history':
            handleGetLabelHistory($pdo, $input, $currentUser);
            break;

        case 'create_batch_transfer_orders':
            handleCreateBatchLabels($pdo, $input, $currentUser);
            break;

        case 'create_transfer_order':
            handleCreateSingleTransferOrder($pdo, $input, $currentUser);
            break;

        case 'get_transfer_details':
            handleGetTransferDetails($pdo, $input);
            break;

        case 'get_labels_by_range':
            handleGetLabelsByRange($pdo, $input);
            break;

        case 'update_label':
            handleUpdateLabel($pdo, $input, $currentUser);
            break;

        case 'update_batch_labels':
            handleUpdateBatchLabels($pdo, $input, $currentUser);
            break;

        case 'cancel_label':
            handleCancelLabel($pdo, $input, $currentUser);
            break;

        case 'cancel_batch_labels':
            handleCancelBatchLabels($pdo, $input, $currentUser);
            break;

        case 'confirm_transfer':
        case 'reroute_and_confirm_transfer':
            handleConfirmTransfer($pdo, $input, $currentUser);
            break;

        case 'reverse_transfer':
            handleReverseTransfer($pdo, $input, $currentUser);
            break;

        case 'execute_scan_sale':
            handleExecuteScanSale($pdo, $input, $currentUser);
            break;

        case 'get_pending_receive':
            handleGetPendingList($pdo, $input, 'PENDING', 'from_location_id');
            break;

        case 'get_pending_sell':
            handleGetPendingList($pdo, $input, 'COMPLETED', 'to_location_id');
            break;

        case 'bulk_confirm_transfer':
            handleBulkConfirmTransfer($pdo, $input, $currentUser);
            break;

        case 'bulk_execute_scan_sale':
            handleBulkExecuteScanSale($pdo, $input, $currentUser);
            break;

        default:
            prodJsonError("ไม่พบ Action '{$action}' ในระบบ Tag Printer API", 400);
    }
} catch (Throwable $e) {
    handleApiError($e, $pdo ?? null, $input ?? $_REQUEST);
}

function handleLabelSearchItems(PDO $pdo, array $input): void {
    $q = trim((string)($input['q'] ?? ''));
    if (strlen($q) < 1) {
        prodJsonSuccess([], 'Empty query');
    }
    $term = "%{$q}%";
    $stmt = $pdo->prepare("
        SELECT TOP 100 item_id, sap_no, part_no, part_description, sku, CTN, barcode, material_type
        FROM " . ITEMS_TABLE . " WITH (NOLOCK)
        WHERE is_active = 1
          AND (sap_no LIKE ? OR part_no LIKE ? OR part_description LIKE ? OR sku LIKE ?)
        ORDER BY sap_no ASC
    ");
    $stmt->execute([$term, $term, $term, $term]);
    prodJsonSuccess($stmt->fetchAll(PDO::FETCH_ASSOC), 'Searched items');
}

function handleGetLabelHistory(PDO $pdo, array $input, array $currentUser): void {
    $page = max(1, (int)($input['page'] ?? 1));
    $limit = max(1, min(200, (int)($input['limit'] ?? 50)));
    $offset = ($page - 1) * $limit;
    $search = trim((string)($input['search'] ?? ''));
    $statusFilter = strtoupper(trim((string)($input['status'] ?? 'ACTIVE')));

    $baseConds = [
        "t.created_at >= DATEADD(DAY, -30, GETDATE())",
        "t.transfer_uuid NOT LIKE 'REQ-%'",
        "t.transfer_uuid NOT LIKE 'TRF-%'",
    ];
    $baseParams = [];

    if (!hasPermission('manage_production') && !hasRole(['admin', 'creator', 'supervisor'])) {
        $baseConds[] = "t.created_by_user_id = ?";
        $baseParams[] = (int)$currentUser['id'];
    }
    if ($search !== '') {
        $term = "%{$search}%";
        $baseConds[] = "(t.transfer_uuid LIKE ? OR i.sap_no LIKE ? OR i.part_no LIKE ? OR i.part_description LIKE ?)";
        array_push($baseParams, $term, $term, $term, $term);
    }

    $baseWhere = 'WHERE ' . implode(' AND ', $baseConds);
    $sumStmt = $pdo->prepare("
        SELECT
            ISNULL(SUM(CASE WHEN t.status = 'PENDING' THEN 1 ELSE 0 END), 0) AS total_pending,
            ISNULL(SUM(CASE WHEN t.status = 'COMPLETED' THEN 1 ELSE 0 END), 0) AS total_completed,
            ISNULL(SUM(CASE WHEN t.status IN ('SHIPPED', 'SOLD') THEN 1 ELSE 0 END), 0) AS total_shipped,
            ISNULL(SUM(CASE WHEN t.status = 'CANCELLED' THEN 1 ELSE 0 END), 0) AS total_cancelled,
            COUNT(*) AS total_all
        FROM " . TRANSFER_ORDERS_TABLE . " t WITH (NOLOCK)
        JOIN " . ITEMS_TABLE . " i WITH (NOLOCK) ON t.item_id = i.item_id
        {$baseWhere}
    ");
    $sumStmt->execute($baseParams);
    $summary = $sumStmt->fetch(PDO::FETCH_ASSOC) ?: [];

    $listConds = $baseConds;
    $listParams = $baseParams;
    if ($statusFilter === 'ACTIVE') {
        $listConds[] = "t.status != 'CANCELLED'";
    } elseif ($statusFilter !== 'ALL') {
        $listConds[] = "t.status = ?";
        $listParams[] = $statusFilter;
    }
    $listWhere = 'WHERE ' . implode(' AND ', $listConds);

    $cntStmt = $pdo->prepare("
        SELECT COUNT(*)
        FROM " . TRANSFER_ORDERS_TABLE . " t WITH (NOLOCK)
        JOIN " . ITEMS_TABLE . " i WITH (NOLOCK) ON t.item_id = i.item_id
        {$listWhere}
    ");
    $cntStmt->execute($listParams);
    $total = (int)$cntStmt->fetchColumn();

    $dataSql = "
        SELECT
            t.transfer_id, t.transfer_uuid, t.item_id, t.quantity, t.status, t.created_at, t.confirmed_at, t.prod_date, t.notes,
            t.from_location_id, t.to_location_id, t.created_by_user_id,
            i.sap_no, i.part_no, i.part_description, i.sku,
            lf.location_name AS from_location_name,
            lt.location_name AS to_location_name,
            COALESCE(NULLIF(u.fullname, ''), u.username) AS created_by_name
        FROM " . TRANSFER_ORDERS_TABLE . " t WITH (NOLOCK)
        JOIN " . ITEMS_TABLE . " i WITH (NOLOCK) ON t.item_id = i.item_id
        LEFT JOIN " . LOCATIONS_TABLE . " lf WITH (NOLOCK) ON t.from_location_id = lf.location_id
        LEFT JOIN " . LOCATIONS_TABLE . " lt WITH (NOLOCK) ON t.to_location_id = lt.location_id
        LEFT JOIN " . USERS_TABLE . " u WITH (NOLOCK) ON t.created_by_user_id = u.id
        {$listWhere}
        ORDER BY t.created_at DESC, t.transfer_id DESC
        OFFSET ? ROWS FETCH NEXT ? ROWS ONLY
    ";
    $stmt = $pdo->prepare($dataSql);
    $idx = 1;
    foreach ($listParams as $val) $stmt->bindValue($idx++, $val);
    $stmt->bindValue($idx++, $offset, PDO::PARAM_INT);
    $stmt->bindValue($idx++, $limit, PDO::PARAM_INT);
    $stmt->execute();

    prodJsonSuccess([
        'rows' => $stmt->fetchAll(PDO::FETCH_ASSOC),
        'summary' => $summary,
        'pagination' => [
            'page' => $page,
            'limit' => $limit,
            'total' => $total,
            'total_pages' => max(1, (int)ceil($total / $limit)),
        ],
    ], 'Loaded label history');
}

function handleCreateBatchLabels(PDO $pdo, array $input, array $currentUser): void {
    $parentLot = trim((string)($input['parent_lot'] ?? ''));
    $printCount = (int)($input['print_count'] ?? 1);
    $itemId = parsePositiveInt($input['item_id'] ?? 0, 'สินค้า');
    $qty = parsePositiveQty($input['quantity'] ?? 0, 'จำนวนต่อกล่อง');
    $fromLocId = parsePositiveInt($input['from_location_id'] ?? $input['from_loc_id'] ?? 0, 'สถานีต้นทาง');
    $toLocId = parsePositiveInt($input['to_location_id'] ?? $input['to_loc_id'] ?? 0, 'คลังปลายทาง');
    $notes = trim((string)($input['notes'] ?? ''));
    $prodDate = trim((string)($input['prod_date'] ?? ''));
    $prodDateVal = $prodDate !== '' ? parseDateOrDefault($prodDate) : null;

    if ($parentLot === '') {
        throw new InvalidArgumentException('กรุณาระบุเลข Lot (Parent Lot)');
    }
    if ($printCount < 1 || $printCount > 500) {
        throw new InvalidArgumentException('จำนวนดวงที่พิมพ์ต้องอยู่ระหว่าง 1 ถึง 500 ดวงต่อครั้ง');
    }

    $pdo->beginTransaction();
    try {
        $sqlReserve = "
            MERGE INTO " . LOT_SERIALS_TABLE . " WITH (HOLDLOCK) AS T
            USING (SELECT ? AS parent_lot) AS S
            ON (T.parent_lot = S.parent_lot)
            WHEN MATCHED THEN
                UPDATE SET T.last_serial = T.last_serial + ?, T.updated_at = GETDATE()
            WHEN NOT MATCHED THEN
                INSERT (parent_lot, last_serial, updated_at)
                VALUES (S.parent_lot, ?, GETDATE())
            OUTPUT inserted.last_serial, deleted.last_serial AS old_serial;
        ";
        $stmtRes = $pdo->prepare($sqlReserve);
        $stmtRes->execute([$parentLot, $printCount, $printCount]);
        $reserve = $stmtRes->fetch(PDO::FETCH_ASSOC);
        if (!$reserve) {
            throw new RuntimeException('ไม่สามารถจองเลข Serial ได้');
        }

        $endSerial = (int)$reserve['last_serial'];
        $startSerial = (int)($reserve['old_serial'] ?? 0) + 1;

        $insStmt = $pdo->prepare("
            INSERT INTO " . TRANSFER_ORDERS_TABLE . "
                (transfer_uuid, item_id, quantity, from_location_id, to_location_id, status, created_by_user_id, created_at, prod_date, notes, tag_serial_no)
            VALUES (?, ?, ?, ?, ?, 'PENDING', ?, GETDATE(), ?, ?, ?)
        ");

        $labels = [];
        for ($serialIdx = $startSerial; $serialIdx <= $endSerial; $serialIdx++) {
            $serialNo = str_pad((string)$serialIdx, 3, '0', STR_PAD_LEFT);
            $uuid = "{$parentLot}-{$serialNo}";
            $insStmt->execute([
                $uuid,
                $itemId,
                $qty,
                $fromLocId,
                $toLocId,
                (int)$currentUser['id'],
                $prodDateVal,
                $notes !== '' ? $notes : null,
                $serialNo,
            ]);
            $labels[] = [
                'transfer_uuid' => $uuid,
                'serial_no' => $serialNo,
            ];
        }

        writeLog($pdo, 'CREATE_BATCH_LABELS', 'LABEL_API', $parentLot, null, [
            'start_serial' => $startSerial, 'end_serial' => $endSerial, 'item_id' => $itemId, 'qty' => $qty
        ], "Generated {$printCount} thermal labels");
        $pdo->commit();

        prodJsonSuccess(['labels' => $labels, 'parent_lot' => $parentLot], "สร้างแท็กจำนวน {$printCount} ดวงสำเร็จ");
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $e;
    }
}

function handleCreateSingleTransferOrder(PDO $pdo, array $input, array $currentUser): void {
    $uuid = trim((string)($input['transfer_uuid'] ?? ''));
    $itemId = parsePositiveInt($input['item_id'] ?? 0, 'สินค้า');
    $qty = parsePositiveQty($input['quantity'] ?? 0, 'จำนวน');
    $fromLocId = parsePositiveInt($input['from_location_id'] ?? $input['from_loc_id'] ?? 0, 'คลังต้นทาง');
    $toLocId = parsePositiveInt($input['to_location_id'] ?? $input['to_loc_id'] ?? 0, 'คลังปลายทาง');
    if ($uuid === '') {
        throw new InvalidArgumentException('กรุณาระบุ Transfer UUID');
    }
    if ($fromLocId === $toLocId) {
        throw new InvalidArgumentException('คลังต้นทางและปลายทางต้องไม่ซ้ำกัน');
    }

    $notes = trim((string)($input['notes'] ?? ''));
    $prodDate = trim((string)($input['prod_date'] ?? ''));
    $prodDateVal = $prodDate !== '' ? parseDateOrDefault($prodDate) : null;

    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare("
            INSERT INTO " . TRANSFER_ORDERS_TABLE . "
                (transfer_uuid, item_id, quantity, from_location_id, to_location_id, status, created_by_user_id, created_at, prod_date, notes)
            VALUES (?, ?, ?, ?, ?, 'PENDING', ?, GETDATE(), ?, ?)
        ");
        $stmt->execute([$uuid, $itemId, $qty, $fromLocId, $toLocId, (int)$currentUser['id'], $prodDateVal, $notes !== '' ? $notes : null]);
        $newId = (int)$pdo->lastInsertId();
        writeLog($pdo, 'CREATE_TRANSFER_ORDER', 'LABEL_API', $uuid, null, $input, 'Created single transfer order');
        $pdo->commit();
        prodJsonSuccess(['transfer_id' => $newId, 'transfer_uuid' => $uuid], 'สร้างใบโอนย้าย (Pending) สำเร็จ');
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $e;
    }
}

function extractTransferUuid(string $raw): string {
    $trimmed = trim($raw);
    if ($trimmed === '') return '';
    if (preg_match('/transfer_id=([^&\s#]+)/i', $trimmed, $m)) {
        return urldecode($m[1]);
    }
    return $trimmed;
}

function handleGetTransferDetails(PDO $pdo, array $input): void {
    $uuid = extractTransferUuid((string)($input['transfer_id'] ?? $input['transfer_uuid'] ?? ''));
    if ($uuid === '') {
        throw new InvalidArgumentException('กรุณาระบุรหัส Tag (Transfer UUID)');
    }

    $stmt = $pdo->prepare("
        SELECT
            t.transfer_id, t.transfer_uuid, t.item_id, t.quantity, t.from_location_id, t.to_location_id,
            t.status, t.created_by_user_id, t.created_at, t.confirmed_by_user_id, t.confirmed_at,
            t.prod_date, t.notes, t.tag_serial_no,
            i.sap_no, i.part_no, i.part_description, i.sku,
            lf.location_name AS from_location_name,
            lt.location_name AS to_location_name
        FROM " . TRANSFER_ORDERS_TABLE . " t WITH (NOLOCK)
        JOIN " . ITEMS_TABLE . " i WITH (NOLOCK) ON t.item_id = i.item_id
        LEFT JOIN " . LOCATIONS_TABLE . " lf WITH (NOLOCK) ON t.from_location_id = lf.location_id
        LEFT JOIN " . LOCATIONS_TABLE . " lt WITH (NOLOCK) ON t.to_location_id = lt.location_id
        WHERE t.transfer_uuid = ?
    ");
    $stmt->execute([$uuid]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row) {
        prodJsonError("ไม่พบข้อมูล Tag รหัส {$uuid}", 404);
    }
    prodJsonSuccess($row, 'Loaded transfer tag details');
}

function handleGetLabelsByRange(PDO $pdo, array $input): void {
    $lotNo = trim((string)($input['lot_no'] ?? ''));
    $uuids = $input['uuids'] ?? null;

    if (is_array($uuids) && !empty($uuids)) {
        $cleanUuids = array_slice(array_values(array_filter(array_map('trim', $uuids))), 0, 500);
        if (empty($cleanUuids)) {
            prodJsonSuccess([], 'No UUIDs specified');
        }
        $placeholders = implode(',', array_fill(0, count($cleanUuids), '?'));
        $stmt = $pdo->prepare("
            SELECT
                t.transfer_id, t.transfer_uuid, t.item_id, t.quantity, t.status, t.prod_date, t.notes,
                i.sap_no, i.part_no, i.part_description,
                lf.location_name AS from_location_name,
                lt.location_name AS to_location_name
            FROM " . TRANSFER_ORDERS_TABLE . " t WITH (NOLOCK)
            JOIN " . ITEMS_TABLE . " i WITH (NOLOCK) ON t.item_id = i.item_id
            LEFT JOIN " . LOCATIONS_TABLE . " lf WITH (NOLOCK) ON t.from_location_id = lf.location_id
            LEFT JOIN " . LOCATIONS_TABLE . " lt WITH (NOLOCK) ON t.to_location_id = lt.location_id
            WHERE t.transfer_uuid IN ({$placeholders})
              AND t.status != 'CANCELLED'
            ORDER BY t.transfer_uuid ASC
        ");
        $stmt->execute($cleanUuids);
        prodJsonSuccess($stmt->fetchAll(PDO::FETCH_ASSOC), 'Loaded labels');
    }

    if ($lotNo === '') {
        throw new InvalidArgumentException('กรุณาระบุเลข Lot หรือรายการ UUID');
    }
    $startNo = max(1, (int)($input['start_no'] ?? 1));
    $endNo = max($startNo, (int)($input['end_no'] ?? $startNo));
    if (($endNo - $startNo + 1) > 500) {
        throw new InvalidArgumentException('อนุญาตให้ดึงข้อมูลเพื่อพิมพ์สูงสุด 500 ดวงต่อครั้ง');
    }

    $stmt = $pdo->prepare("
        SELECT TOP 500
            t.transfer_id, t.transfer_uuid, t.item_id, t.quantity, t.status, t.prod_date, t.notes,
            i.sap_no, i.part_no, i.part_description,
            lf.location_name AS from_location_name,
            lt.location_name AS to_location_name
        FROM " . TRANSFER_ORDERS_TABLE . " t WITH (NOLOCK)
        JOIN " . ITEMS_TABLE . " i WITH (NOLOCK) ON t.item_id = i.item_id
        LEFT JOIN " . LOCATIONS_TABLE . " lf WITH (NOLOCK) ON t.from_location_id = lf.location_id
        LEFT JOIN " . LOCATIONS_TABLE . " lt WITH (NOLOCK) ON t.to_location_id = lt.location_id
        WHERE t.transfer_uuid LIKE ?
          AND t.status != 'CANCELLED'
          AND TRY_CAST(RIGHT(t.transfer_uuid, CHARINDEX('-', REVERSE(t.transfer_uuid)) - 1) AS INT) BETWEEN ? AND ?
        ORDER BY TRY_CAST(RIGHT(t.transfer_uuid, CHARINDEX('-', REVERSE(t.transfer_uuid)) - 1) AS INT) ASC
    ");
    $stmt->execute([$lotNo . '-%', $startNo, $endNo]);
    prodJsonSuccess($stmt->fetchAll(PDO::FETCH_ASSOC), 'Loaded range labels');
}

function handleUpdateLabel(PDO $pdo, array $input, array $currentUser): void {
    $uuid = trim((string)($input['transfer_uuid'] ?? ''));
    $itemId = parsePositiveInt($input['item_id'] ?? 0, 'สินค้า');
    $qty = parsePositiveQty($input['quantity'] ?? 0, 'จำนวนบรรจุ');
    $fromLocId = parsePositiveInt($input['from_location_id'] ?? 0, 'สถานีต้นทาง');
    $notes = trim((string)($input['notes'] ?? ''));
    $prodDate = trim((string)($input['prod_date'] ?? ''));
    $prodDateVal = $prodDate !== '' ? parseDateOrDefault($prodDate) : null;

    if ($uuid === '') throw new InvalidArgumentException('กรุณาระบุ Transfer UUID');

    $pdo->beginTransaction();
    try {
        $chk = $pdo->prepare("SELECT transfer_id, transfer_uuid, item_id, quantity, from_location_id, prod_date, notes, status, created_by_user_id FROM " . TRANSFER_ORDERS_TABLE . " WITH (UPDLOCK) WHERE transfer_uuid = ?");
        $chk->execute([$uuid]);
        $old = $chk->fetch(PDO::FETCH_ASSOC);
        if (!$old) prodJsonError('ไม่พบรายการสติ๊กเกอร์นี้ในระบบ', 404);
        if ($old['status'] !== 'PENDING') prodJsonError("ไม่สามารถแก้ไขได้ สถานะปัจจุบันคือ: {$old['status']}", 400);
        if ((int)$old['created_by_user_id'] !== (int)$currentUser['id'] && !hasPermission('manage_production') && !hasRole(['admin', 'creator', 'supervisor'])) {
            prodJsonError('คุณไม่มีสิทธิ์แก้ไขรายการที่ผู้อื่นสร้าง', 403);
        }

        $auditNote = ($notes !== '' ? $notes : '') . "\nEdited by {$currentUser['username']} at " . date('Y-m-d H:i:s');
        $upd = $pdo->prepare("
            UPDATE " . TRANSFER_ORDERS_TABLE . "
            SET item_id = ?, quantity = ?, from_location_id = ?, prod_date = ?, notes = ?
            WHERE transfer_uuid = ?
        ");
        $upd->execute([$itemId, $qty, $fromLocId, $prodDateVal, mb_substr(trim($auditNote), 0, 490), $uuid]);

        writeLog($pdo, 'UPDATE_LABEL', 'LABEL_API', $uuid, $old, $input, 'Updated pending tag');
        $pdo->commit();
        prodJsonSuccess(['transfer_uuid' => $uuid], "อัปเดตแท็ก {$uuid} สำเร็จ");
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $e;
    }
}

function handleUpdateBatchLabels(PDO $pdo, array $input, array $currentUser): void {
    $lotNo = trim((string)($input['lot_no'] ?? ''));
    $isRange = !empty($input['is_range']);
    $startNo = (int)($input['start_no'] ?? 0);
    $endNo = (int)($input['end_no'] ?? 0);
    $itemId = parsePositiveInt($input['item_id'] ?? 0, 'สินค้า');
    $qty = parsePositiveQty($input['quantity'] ?? 0, 'จำนวนบรรจุ');
    $fromLocId = parsePositiveInt($input['from_location_id'] ?? 0, 'สถานีต้นทาง');
    $notes = trim((string)($input['notes'] ?? ''));
    $prodDate = trim((string)($input['prod_date'] ?? ''));
    $prodDateVal = $prodDate !== '' ? parseDateOrDefault($prodDate) : null;

    if ($lotNo === '') throw new InvalidArgumentException('กรุณาระบุเลข Lot');
    if ($isRange && ($startNo <= 0 || $endNo <= 0 || $startNo > $endNo)) {
        throw new InvalidArgumentException('ระบุช่วงเลขรันให้ถูกต้อง');
    }

    $pdo->beginTransaction();
    try {
        $auditNote = trim(($notes !== '' ? $notes . "\n" : '') . "Bulk Edited by {$currentUser['username']} at " . date('Y-m-d H:i:s'));
        $sql = "
            UPDATE " . TRANSFER_ORDERS_TABLE . "
            SET item_id = ?, quantity = ?, from_location_id = ?, prod_date = ?, notes = ?
            WHERE status = 'PENDING' AND transfer_uuid LIKE ?
        ";
        $params = [$itemId, $qty, $fromLocId, $prodDateVal, mb_substr($auditNote, 0, 490), $lotNo . '-%'];
        if (!hasPermission('manage_production') && !hasRole(['admin', 'creator', 'supervisor'])) {
            $sql .= " AND created_by_user_id = ?";
            $params[] = (int)$currentUser['id'];
        }
        if ($isRange) {
            $sql .= " AND TRY_CAST(RIGHT(transfer_uuid, CHARINDEX('-', REVERSE(transfer_uuid)) - 1) AS INT) BETWEEN ? AND ?";
            $params[] = $startNo;
            $params[] = $endNo;
        }

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $affected = $stmt->rowCount();
        if ($affected === 0) {
            throw new InvalidArgumentException('ไม่พบสติ๊กเกอร์สถานะ PENDING ที่ตรงเงื่อนไขหรือไม่มีสิทธิ์แก้ไข');
        }

        writeLog($pdo, 'UPDATE_BATCH_LABELS', 'LABEL_API', $lotNo, null, ['affected' => $affected, 'item_id' => $itemId, 'qty' => $qty], 'Bulk updated labels');
        $pdo->commit();
        prodJsonSuccess(['affected' => $affected], "แก้ไขแท็กแบบกลุ่มจำนวน {$affected} ดวงสำเร็จ");
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $e;
    }
}

function handleCancelLabel(PDO $pdo, array $input, array $currentUser): void {
    $uuid = trim((string)($input['transfer_uuid'] ?? ''));
    if ($uuid === '') throw new InvalidArgumentException('กรุณาระบุ Transfer UUID');

    $chk = $pdo->prepare("SELECT transfer_id, transfer_uuid, status, created_by_user_id FROM " . TRANSFER_ORDERS_TABLE . " WITH (NOLOCK) WHERE transfer_uuid = ?");
    $chk->execute([$uuid]);
    $old = $chk->fetch(PDO::FETCH_ASSOC);
    if (!$old) prodJsonError('ไม่พบข้อมูลสติ๊กเกอร์', 404);
    if ((int)$old['created_by_user_id'] !== (int)$currentUser['id'] && !hasPermission('manage_production') && !hasRole(['admin', 'creator', 'supervisor'])) {
        prodJsonError('คุณไม่มีสิทธิ์ยกเลิกสติ๊กเกอร์ที่ผู้อื่นสร้าง', 403);
    }

    $sp = $pdo->prepare("EXEC dbo.sp_CancelAndRollbackTag @transfer_uuid = ?, @user_id = ?");
    $sp->execute([$uuid, (int)$currentUser['id']]);
    $sp->closeCursor();

    writeLog($pdo, 'CANCEL_LABEL', 'LABEL_API', $uuid, $old, ['status' => 'CANCELLED'], 'Cancelled label with rollback');
    prodJsonSuccess(['transfer_uuid' => $uuid], "ยกเลิกแท็ก {$uuid} และคืนเลขรันเรียบร้อยแล้ว");
}

function handleCancelBatchLabels(PDO $pdo, array $input, array $currentUser): void {
    $lotNo = trim((string)($input['lot_no'] ?? ''));
    $isRange = !empty($input['is_range']);
    $startNo = (int)($input['start_no'] ?? 0);
    $endNo = (int)($input['end_no'] ?? 0);

    if ($lotNo === '') throw new InvalidArgumentException('กรุณาระบุเลข Lot ที่ต้องการยกเลิก');
    if ($isRange && ($startNo <= 0 || $endNo <= 0 || $startNo > $endNo)) {
        throw new InvalidArgumentException('ระบุช่วงเลขรันให้ถูกต้อง');
    }

    $pdo->beginTransaction();
    try {
        $sql = "DELETE FROM " . TRANSFER_ORDERS_TABLE . " WHERE status IN ('PENDING', 'CANCELLED') AND transfer_uuid LIKE ?";
        $params = [$lotNo . '-%'];
        if (!hasPermission('manage_production') && !hasRole(['admin', 'creator', 'supervisor'])) {
            $sql .= " AND created_by_user_id = ?";
            $params[] = (int)$currentUser['id'];
        }
        if ($isRange) {
            $sql .= " AND TRY_CAST(RIGHT(transfer_uuid, CHARINDEX('-', REVERSE(transfer_uuid)) - 1) AS INT) BETWEEN ? AND ?";
            $params[] = $startNo;
            $params[] = $endNo;
        }
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $affected = $stmt->rowCount();
        if ($affected === 0) {
            throw new InvalidArgumentException('ไม่พบสติ๊กเกอร์สถานะ PENDING ในช่วงที่ระบุหรือไม่มีสิทธิ์ลบ');
        }

        $pdo->prepare("
            UPDATE " . LOT_SERIALS_TABLE . "
            SET last_serial = ISNULL((
                SELECT MAX(TRY_CAST(RIGHT(transfer_uuid, CHARINDEX('-', REVERSE(transfer_uuid)) - 1) AS INT))
                FROM " . TRANSFER_ORDERS_TABLE . " WITH (NOLOCK)
                WHERE transfer_uuid LIKE ?
            ), 0)
            WHERE parent_lot = ?
        ")->execute([$lotNo . '-%', $lotNo]);

        writeLog($pdo, 'CANCEL_BATCH_LABELS', 'LABEL_API', $lotNo, ['affected' => $affected], null, 'Batch cancelled pending tags');
        $pdo->commit();
        prodJsonSuccess(['affected' => $affected], "ยกเลิกสติ๊กเกอร์ Lot {$lotNo} จำนวน {$affected} รายการ สำเร็จ");
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $e;
    }
}

function executeTransferConfirmationSingle(PDO $pdo, string $uuid, ?float $confirmedQtyInput, ?int $overrideToLocId, array $currentUser): string {
    $getStmt = $pdo->prepare("SELECT * FROM " . TRANSFER_ORDERS_TABLE . " WITH (UPDLOCK) WHERE transfer_uuid = ?");
    $getStmt->execute([$uuid]);
    $order = $getStmt->fetch(PDO::FETCH_ASSOC);
    if (!$order) throw new InvalidArgumentException("ไม่พบแท็ก {$uuid}");
    if ($order['status'] !== 'PENDING') throw new InvalidArgumentException("แท็ก {$uuid} ถูกดำเนินการไปแล้ว ({$order['status']})");

    $qty = ($confirmedQtyInput !== null && $confirmedQtyInput > 0) ? floor($confirmedQtyInput) : floor((float)$order['quantity']);
    if ($qty <= 0) throw new InvalidArgumentException("จำนวนรับเข้าไม่ถูกต้องสำหรับ {$uuid}");

    $itemId = (int)$order['item_id'];
    $fromLocId = (int)$order['from_location_id'];
    $toLocId = ($overrideToLocId !== null && $overrideToLocId > 0) ? $overrideToLocId : (int)$order['to_location_id'];

    $itemStmt = $pdo->prepare("SELECT Cost_RM, Cost_PKG, Cost_SUB, Cost_DL, Cost_OH_Machine, Cost_OH_Utilities, Cost_OH_Indirect, Cost_OH_Staff, Cost_OH_Accessory, Cost_OH_Others FROM " . ITEMS_TABLE . " WITH (NOLOCK) WHERE item_id = ?");
    $itemStmt->execute([$itemId]);
    $item = $itemStmt->fetch(PDO::FETCH_ASSOC) ?: [];
    $ohTotal = (float)($item['Cost_OH_Machine'] ?? 0) + (float)($item['Cost_OH_Utilities'] ?? 0) + (float)($item['Cost_OH_Indirect'] ?? 0)
        + (float)($item['Cost_OH_Staff'] ?? 0) + (float)($item['Cost_OH_Accessory'] ?? 0) + (float)($item['Cost_OH_Others'] ?? 0);

    $spStock = $pdo->prepare("EXEC " . SP_UPDATE_ONHAND . " @item_id = ?, @location_id = ?, @quantity_to_change = ?");
    $spStock->execute([$itemId, $fromLocId, -$qty]);
    $spStock->closeCursor();
    $spStock->execute([$itemId, $toLocId, $qty]);
    $spStock->closeCursor();

    $ts = date('Y-m-d H:i:s');
    $noteUpd = "\nConfirmed by {$currentUser['username']} Qty: {$qty} at {$ts}";
    $upd = $pdo->prepare("UPDATE " . TRANSFER_ORDERS_TABLE . " SET status = 'COMPLETED', to_location_id = ?, confirmed_by_user_id = ?, confirmed_at = ?, notes = ISNULL(notes, '') + ? WHERE transfer_id = ?");
    $upd->execute([$toLocId, (int)$currentUser['id'], $ts, $noteUpd, (int)$order['transfer_id']]);

    $insTxn = $pdo->prepare("
        INSERT INTO " . TRANSACTIONS_TABLE . "
            (parameter_id, quantity, transaction_type, transaction_timestamp, from_location_id, to_location_id, reference_id, created_by_user_id,
             std_cost_mat_snapshot, std_cost_dl_snapshot, std_cost_oh_snapshot,
             std_cost_oh_machine_snapshot, std_cost_oh_util_snapshot, std_cost_oh_indirect_snapshot,
             std_cost_oh_staff_snapshot, std_cost_oh_acc_snapshot, std_cost_oh_other_snapshot)
        VALUES (?, ?, 'INTERNAL_TRANSFER', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");
    $insTxn->execute([
        $itemId, $qty, $ts, $fromLocId, $toLocId, $uuid, (int)$currentUser['id'],
        (float)($item['Cost_RM'] ?? 0), (float)($item['Cost_DL'] ?? 0), $ohTotal,
        (float)($item['Cost_OH_Machine'] ?? 0), (float)($item['Cost_OH_Utilities'] ?? 0), (float)($item['Cost_OH_Indirect'] ?? 0),
        (float)($item['Cost_OH_Staff'] ?? 0), (float)($item['Cost_OH_Accessory'] ?? 0), (float)($item['Cost_OH_Others'] ?? 0),
    ]);
    return $uuid;
}

function handleConfirmTransfer(PDO $pdo, array $input, array $currentUser): void {
    $uuid = extractTransferUuid((string)($input['transfer_uuid'] ?? ''));
    if ($uuid === '') throw new InvalidArgumentException('กรุณาระบุ Transfer UUID');
    $confirmedQty = isset($input['confirmed_quantity']) ? (float)$input['confirmed_quantity'] : null;
    $toLocId = !empty($input['to_location_id']) ? (int)$input['to_location_id'] : null;

    $pdo->beginTransaction();
    try {
        executeTransferConfirmationSingle($pdo, $uuid, $confirmedQty, $toLocId, $currentUser);
        writeLog($pdo, 'CONFIRM_TRANSFER', 'LABEL_API', $uuid, ['status' => 'PENDING'], ['status' => 'COMPLETED', 'to_location_id' => $toLocId], 'Confirmed tag transfer');
        $pdo->commit();
        prodJsonSuccess(['transfer_uuid' => $uuid], "รับเข้าสต็อกแท็ก {$uuid} เรียบร้อยแล้ว");
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $e;
    }
}

function handleReverseTransfer(PDO $pdo, array $input, array $currentUser): void {
    $uuid = extractTransferUuid((string)($input['transfer_uuid'] ?? ''));
    if ($uuid === '') throw new InvalidArgumentException('กรุณาระบุ Transfer UUID');

    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare("SELECT * FROM " . TRANSFER_ORDERS_TABLE . " WITH (UPDLOCK) WHERE transfer_uuid = ?");
        $stmt->execute([$uuid]);
        $order = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$order) prodJsonError('ไม่พบแท็กในระบบ', 404);
        if ($order['status'] !== 'COMPLETED') prodJsonError("สามารถ Reverse ได้เฉพาะสถานะ COMPLETED (สถานะปัจจุบัน: {$order['status']})", 400);

        $qty = floor((float)$order['quantity']);
        $spStock = $pdo->prepare("EXEC " . SP_UPDATE_ONHAND . " @item_id = ?, @location_id = ?, @quantity_to_change = ?");
        $spStock->execute([(int)$order['item_id'], (int)$order['to_location_id'], -$qty]);
        $spStock->closeCursor();
        $spStock->execute([(int)$order['item_id'], (int)$order['from_location_id'], $qty]);
        $spStock->closeCursor();

        $ts = date('Y-m-d H:i:s');
        $noteUpd = "\nReversed back to PENDING by {$currentUser['username']} at {$ts}";
        $pdo->prepare("UPDATE " . TRANSFER_ORDERS_TABLE . " SET status = 'PENDING', confirmed_by_user_id = NULL, confirmed_at = NULL, notes = ISNULL(notes, '') + ? WHERE transfer_id = ?")
            ->execute([$noteUpd, (int)$order['transfer_id']]);

        $pdo->prepare("INSERT INTO " . TRANSACTIONS_TABLE . " (parameter_id, quantity, transaction_type, transaction_timestamp, from_location_id, to_location_id, reference_id, created_by_user_id, notes) VALUES (?, ?, 'TRANSFER_REVERSAL', ?, ?, ?, ?, ?, ?)")
            ->execute([(int)$order['item_id'], $qty, $ts, (int)$order['to_location_id'], (int)$order['from_location_id'], $uuid, (int)$currentUser['id'], 'Reverse completed tag']);

        writeLog($pdo, 'REVERSE_TRANSFER', 'LABEL_API', $uuid, ['status' => 'COMPLETED'], ['status' => 'PENDING'], 'Reversed tag transfer');
        $pdo->commit();
        prodJsonSuccess(['transfer_uuid' => $uuid], "ตีกลับแท็ก {$uuid} เป็น PENDING เรียบร้อยแล้ว");
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $e;
    }
}

function handleExecuteScanSale(PDO $pdo, array $input, array $currentUser): void {
    $uuid = extractTransferUuid((string)($input['transfer_uuid'] ?? ''));
    if ($uuid === '') throw new InvalidArgumentException('กรุณาระบุ Transfer UUID');

    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare("SELECT * FROM " . TRANSFER_ORDERS_TABLE . " WITH (UPDLOCK) WHERE transfer_uuid = ?");
        $stmt->execute([$uuid]);
        $order = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$order) prodJsonError('ไม่พบแท็กสินค้านี้ในระบบ', 404);
        if ($order['status'] === 'PENDING') prodJsonError('สินค้าชิ้นนี้ยังไม่ได้รับเข้าคลัง (สถานะ PENDING)', 400);
        if (in_array($order['status'], ['SHIPPED', 'SOLD'], true)) prodJsonError('แท็กนี้ถูกสแกนตัดขายไปแล้ว', 400);

        $qty = floor((float)$order['quantity']);
        $fgLoc = (int)$order['to_location_id'];
        $spStock = $pdo->prepare("EXEC " . SP_UPDATE_ONHAND . " @item_id = ?, @location_id = ?, @quantity_to_change = ?");
        $spStock->execute([(int)$order['item_id'], $fgLoc, -$qty]);
        $spStock->closeCursor();

        $ts = date('Y-m-d H:i:s');
        $pdo->prepare("UPDATE " . TRANSFER_ORDERS_TABLE . " SET status = 'SHIPPED', notes = ISNULL(notes, '') + ? WHERE transfer_id = ?")
            ->execute(["\nSold & Shipped by {$currentUser['username']} at {$ts}", (int)$order['transfer_id']]);

        $pdo->prepare("INSERT INTO " . TRANSACTIONS_TABLE . " (parameter_id, quantity, transaction_type, transaction_timestamp, from_location_id, to_location_id, reference_id, created_by_user_id) VALUES (?, ?, 'SHIPPED', ?, ?, NULL, ?, ?)")
            ->execute([(int)$order['item_id'], -$qty, $ts, $fgLoc, $uuid, (int)$currentUser['id']]);

        writeLog($pdo, 'EXECUTE_SCAN_SALE', 'LABEL_API', $uuid, ['status' => $order['status']], ['status' => 'SHIPPED'], 'Scan sale shipped');
        $pdo->commit();
        prodJsonSuccess(['transfer_uuid' => $uuid], "สแกนตัดขายแท็ก {$uuid} เรียบร้อยแล้ว");
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $e;
    }
}

function handleGetPendingList(PDO $pdo, array $input, string $status, string $locCol): void {
    $page = max(1, (int)($input['page'] ?? 1));
    $limit = max(1, min(100, (int)($input['limit'] ?? 50)));
    $offset = ($page - 1) * $limit;
    $search = trim((string)($input['search'] ?? ''));

    $conds = ["t.status = ?", "t.transfer_uuid NOT LIKE 'REQ-%'", "t.transfer_uuid NOT LIKE 'TRF-%'"];
    $params = [$status];
    if (!empty($input['location_id'])) {
        $conds[] = "t.{$locCol} = ?";
        $params[] = (int)$input['location_id'];
    }
    if ($search !== '') {
        $term = "%{$search}%";
        $conds[] = "(t.transfer_uuid LIKE ? OR i.sap_no LIKE ? OR i.part_no LIKE ?)";
        array_push($params, $term, $term, $term);
    }

    $whereSql = 'WHERE ' . implode(' AND ', $conds);
    $cnt = $pdo->prepare("SELECT COUNT(*) FROM " . TRANSFER_ORDERS_TABLE . " t WITH (NOLOCK) JOIN " . ITEMS_TABLE . " i WITH (NOLOCK) ON t.item_id = i.item_id {$whereSql}");
    $cnt->execute($params);
    $total = (int)$cnt->fetchColumn();

    $stmt = $pdo->prepare("
        SELECT t.transfer_uuid, t.quantity, t.created_at, t.status, i.sap_no, i.part_no, i.part_description
        FROM " . TRANSFER_ORDERS_TABLE . " t WITH (NOLOCK)
        JOIN " . ITEMS_TABLE . " i WITH (NOLOCK) ON t.item_id = i.item_id
        {$whereSql}
        ORDER BY t.created_at DESC
        OFFSET ? ROWS FETCH NEXT ? ROWS ONLY
    ");
    $idx = 1;
    foreach ($params as $val) $stmt->bindValue($idx++, $val);
    $stmt->bindValue($idx++, $offset, PDO::PARAM_INT);
    $stmt->bindValue($idx++, $limit, PDO::PARAM_INT);
    $stmt->execute();

    prodJsonSuccess([
        'rows' => $stmt->fetchAll(PDO::FETCH_ASSOC),
        'pagination' => ['page' => $page, 'limit' => $limit, 'total' => $total, 'total_pages' => max(1, (int)ceil($total / $limit))],
    ], 'Loaded pending queue');
}

function handleBulkConfirmTransfer(PDO $pdo, array $input, array $currentUser): void {
    $uuids = $input['transfer_uuids'] ?? [];
    if (!is_array($uuids) || empty($uuids)) {
        throw new InvalidArgumentException('กรุณาเลือกรายการอย่างน้อย 1 แท็ก');
    }
    $overrideToLoc = !empty($input['to_location_id']) ? (int)$input['to_location_id'] : null;

    $pdo->beginTransaction();
    try {
        $count = 0;
        foreach (array_slice($uuids, 0, 200) as $rawUuid) {
            $uuid = extractTransferUuid((string)$rawUuid);
            if ($uuid === '') continue;
            $chk = $pdo->prepare("SELECT status FROM " . TRANSFER_ORDERS_TABLE . " WITH (NOLOCK) WHERE transfer_uuid = ?");
            $chk->execute([$uuid]);
            if ($chk->fetchColumn() !== 'PENDING') continue;
            executeTransferConfirmationSingle($pdo, $uuid, null, $overrideToLoc, $currentUser);
            $count++;
        }
        writeLog($pdo, 'BULK_CONFIRM_TRANSFER', 'LABEL_API', 'BATCH', null, ['count' => $count], 'Bulk confirmed tags');
        $pdo->commit();
        prodJsonSuccess(['confirmed_count' => $count], "รับเข้าคลังแบบกลุ่มสำเร็จ {$count} รายการ");
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $e;
    }
}

function handleBulkExecuteScanSale(PDO $pdo, array $input, array $currentUser): void {
    $uuids = $input['transfer_uuids'] ?? [];
    if (!is_array($uuids) || empty($uuids)) {
        throw new InvalidArgumentException('กรุณาเลือกรายการอย่างน้อย 1 แท็ก');
    }

    $pdo->beginTransaction();
    try {
        $count = 0;
        $ts = date('Y-m-d H:i:s');
        $spStock = $pdo->prepare("EXEC " . SP_UPDATE_ONHAND . " @item_id = ?, @location_id = ?, @quantity_to_change = ?");

        foreach (array_slice($uuids, 0, 200) as $rawUuid) {
            $uuid = extractTransferUuid((string)$rawUuid);
            if ($uuid === '') continue;
            $stmt = $pdo->prepare("SELECT * FROM " . TRANSFER_ORDERS_TABLE . " WITH (UPDLOCK) WHERE transfer_uuid = ?");
            $stmt->execute([$uuid]);
            $order = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$order || $order['status'] !== 'COMPLETED') continue;

            $qty = floor((float)$order['quantity']);
            $fgLoc = (int)$order['to_location_id'];
            $spStock->execute([(int)$order['item_id'], $fgLoc, -$qty]);
            $spStock->closeCursor();

            $pdo->prepare("UPDATE " . TRANSFER_ORDERS_TABLE . " SET status = 'SHIPPED', notes = ISNULL(notes, '') + ? WHERE transfer_id = ?")
                ->execute(["\nBulk Sold & Shipped by {$currentUser['username']} at {$ts}", (int)$order['transfer_id']]);

            $pdo->prepare("INSERT INTO " . TRANSACTIONS_TABLE . " (parameter_id, quantity, transaction_type, transaction_timestamp, from_location_id, to_location_id, reference_id, created_by_user_id) VALUES (?, ?, 'SHIPPED', ?, ?, NULL, ?, ?)")
                ->execute([(int)$order['item_id'], -$qty, $ts, $fgLoc, $uuid, (int)$currentUser['id']]);
            $count++;
        }

        writeLog($pdo, 'BULK_SCAN_SALE', 'LABEL_API', 'BATCH', null, ['count' => $count], 'Bulk scan sale shipped');
        $pdo->commit();
        prodJsonSuccess(['shipped_count' => $count], "ตัดสต็อกส่งขายแบบกลุ่มสำเร็จ {$count} รายการ");
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $e;
    }
}
