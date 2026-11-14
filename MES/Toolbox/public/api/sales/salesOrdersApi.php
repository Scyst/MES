<?php
/**
 * Self-contained Toolbox Sales Orders & RM Shortage Forecast API.
 * Enforces explicit column projections, server-side pagination, QA history/FAIL protection,
 * PRODUCT_BOM validation, CSRF validation, and writeLog/writeErrorLog auditing.
 */

require_once __DIR__ . '/_common.php';

const SO_TABLE = 'dbo.SALES_ORDERS';
const ITEMS_MASTER_TABLE = 'dbo.ITEMS';
const PRODUCT_BOM_TABLE = 'dbo.PRODUCT_BOM';
const ONHAND_INV_TABLE = 'dbo.INVENTORY_ONHAND';
const LOCATIONS_MASTER_TABLE = 'dbo.LOCATIONS';

/** Normalizes flexible yes/pass CSV flags into boolean 1/0. */
function isTruthyCsvFlag($val): int {
    if (empty($val)) {
        return 0;
    }
    $normalized = strtolower(trim((string)$val));
    return in_array($normalized, ['yes', 'done', 'shipped', 'ok', '1', 'true', 'y', 'pass'], true) ? 1 : 0;
}

/** Reads paginated Sales Orders and full-filter KPI summary counters. */
function handleReadSalesOrders(PDO $pdo, array $input): void {
    requireSalesAccess(false);

    $statusFilter = strtoupper(trim((string)($input['status'] ?? 'ACTIVE')));
    $startDate = normalizeSalesDate($input['start_date'] ?? '');
    $endDate = normalizeSalesDate($input['end_date'] ?? '');
    $dateType = trim((string)($input['date_type'] ?? 'loading_date'));
    $search = trim((string)($input['search'] ?? ''));

    if (!in_array($dateType, ['loading_date', 'production_date', 'inspection_date'], true)) {
        $dateType = 'loading_date';
    }

    $page = max(1, (int)($input['page'] ?? 1));
    $pageSize = max(1, min(500, (int)($input['page_size'] ?? 200)));
    $offset = ($page - 1) * $pageSize;

    $baseWhere = ' WHERE 1=1';
    $baseParams = [];
    if ($startDate !== null) {
        $baseWhere .= " AND s.{$dateType} >= ?";
        $baseParams[] = $startDate;
    }
    if ($endDate !== null) {
        $baseWhere .= " AND s.{$dateType} <= ?";
        $baseParams[] = $endDate;
    }
    if ($search !== '') {
        $baseWhere .= ' AND (s.po_number LIKE ? OR s.sku LIKE ? OR s.description LIKE ? OR s.team LIKE ? OR s.booking_no LIKE ? OR s.ticket_number LIKE ?)';
        $like = '%' . $search . '%';
        array_push($baseParams, $like, $like, $like, $like, $like, $like);
    }

    $sumSql = "SELECT
            COUNT(*) AS total_all,
            SUM(CASE WHEN ISNULL(s.is_loading_done, 0) = 0 AND ISNULL(s.is_confirmed, 0) = 0 THEN 1 ELSE 0 END) AS total_active,
            SUM(CASE WHEN ISNULL(s.is_production_done, 0) = 0 AND ISNULL(s.is_confirmed, 0) = 0 THEN 1 ELSE 0 END) AS wait_prod,
            SUM(CASE WHEN s.is_production_done = 1 AND ISNULL(s.is_loading_done, 0) = 0 AND ISNULL(s.is_confirmed, 0) = 0 THEN 1 ELSE 0 END) AS wait_load,
            SUM(CASE WHEN s.is_loading_done = 1 THEN 1 ELSE 0 END) AS prod_done
        FROM " . SO_TABLE . " s WITH (NOLOCK) {$baseWhere}";
    $stmtSum = $pdo->prepare($sumSql);
    $stmtSum->execute($baseParams);
    $summary = $stmtSum->fetch(PDO::FETCH_ASSOC) ?: [];

    $statusWhere = $baseWhere;
    if ($statusFilter === 'ACTIVE') {
        $statusWhere .= ' AND ISNULL(s.is_confirmed, 0) = 0 AND ISNULL(s.is_loading_done, 0) = 0';
    } elseif ($statusFilter === 'WAIT_PROD') {
        $statusWhere .= ' AND ISNULL(s.is_production_done, 0) = 0 AND ISNULL(s.is_confirmed, 0) = 0';
    } elseif ($statusFilter === 'WAIT_LOAD') {
        $statusWhere .= ' AND s.is_production_done = 1 AND ISNULL(s.is_loading_done, 0) = 0 AND ISNULL(s.is_confirmed, 0) = 0';
    } elseif ($statusFilter === 'PROD_DONE') {
        $statusWhere .= ' AND s.is_loading_done = 1';
    }

    $totSql = "SELECT COUNT(*) AS filtered_count,
            SUM(ISNULL(s.quantity, 0)) AS filtered_qty,
            SUM(COALESCE(i.Price_USD, i.StandardPrice, 0) * ISNULL(s.quantity, 0)) AS filtered_usd
        FROM " . SO_TABLE . " s WITH (NOLOCK)
        LEFT JOIN " . ITEMS_MASTER_TABLE . " i WITH (NOLOCK) ON s.sku = i.sku
        {$statusWhere}";
    $stmtTot = $pdo->prepare($totSql);
    $stmtTot->execute($baseParams);
    $totals = $stmtTot->fetch(PDO::FETCH_ASSOC) ?: ['filtered_count' => 0, 'filtered_qty' => 0, 'filtered_usd' => 0];

    $cols = "s.id, s.po_number, s.sku, s.quantity, s.order_date, s.description, s.color,
        s.dc_location, s.loading_week, s.shipping_week, s.remark, s.production_status, s.loading_status,
        s.is_loading_done, s.is_production_done, s.is_confirmed, s.custom_order, s.created_at,
        s.production_date, s.production_end_date, s.loading_date, s.inspection_date,
        s.inspection_status, s.inspection_result, s.ticket_number, s.team, s.booking_no";
    $listSql = "SELECT {$cols},
            (COALESCE(i.Price_USD, i.StandardPrice, 0) * ISNULL(s.quantity, 0)) AS price
        FROM " . SO_TABLE . " s WITH (NOLOCK)
        LEFT JOIN " . ITEMS_MASTER_TABLE . " i WITH (NOLOCK) ON s.sku = i.sku
        {$statusWhere}
        ORDER BY ISNULL(s.custom_order, 999999) ASC, s.id DESC
        OFFSET ? ROWS FETCH NEXT ? ROWS ONLY";

    $stmtList = $pdo->prepare($listSql);
    foreach ($baseParams as $idx => $val) {
        $stmtList->bindValue($idx + 1, $val);
    }
    $stmtList->bindValue(count($baseParams) + 1, $offset, PDO::PARAM_INT);
    $stmtList->bindValue(count($baseParams) + 2, $pageSize, PDO::PARAM_INT);
    $stmtList->execute();
    $rows = $stmtList->fetchAll(PDO::FETCH_ASSOC);

    salesJsonSuccess($rows, 'OK', [
        'summary' => $summary,
        'totals' => $totals,
        'pagination' => [
            'page' => $page,
            'page_size' => $pageSize,
            'total_rows' => (int)($totals['filtered_count'] ?? 0),
        ],
    ]);
}

/** Batch-merges Sales Order import rows while strictly protecting existing QA inspection records. */
function handleImportSalesJson(PDO $pdo, array $input): void {
    requireSalesAccess(true);

    $rows = $input['data'] ?? null;
    if (!is_array($rows) || empty($rows)) {
        salesJsonError('ไม่พบข้อมูลสำหรับนำเข้า', 400);
    }

    $pdo->beginTransaction();
    $maxOrder = $pdo->query('SELECT MAX(custom_order) FROM ' . SO_TABLE . ' WITH (NOLOCK)')->fetchColumn();
    $currentOrder = $maxOrder ? (int)$maxOrder : 0;

    $sql = "MERGE INTO " . SO_TABLE . " AS T
        USING (VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?))
        AS S(odate, descr, color, sku, po, qty, dc, lweek, sweek, pdate, penddate, pdone, ldate, ldone, ticket, idate, istat, rem, iconf, corder, team)
        ON T.po_number = S.po
        WHEN MATCHED THEN UPDATE SET
            T.order_date = COALESCE(S.odate, T.order_date),
            T.sku = S.sku,
            T.description = S.descr,
            T.color = S.color,
            T.quantity = S.qty,
            T.dc_location = S.dc,
            T.loading_week = S.lweek,
            T.shipping_week = S.sweek,
            T.team = ISNULL(NULLIF(S.team, ''), T.team),
            T.production_date = COALESCE(S.pdate, T.production_date),
            T.production_end_date = COALESCE(S.penddate, T.production_end_date),
            T.is_production_done = S.pdone,
            T.loading_date = COALESCE(S.ldate, T.loading_date),
            T.is_loading_done = S.ldone,
            T.ticket_number = CASE
                WHEN NULLIF(LTRIM(RTRIM(ISNULL(T.ticket_number, ''))), '') IS NOT NULL
                     AND (T.inspection_date IS NOT NULL
                          OR UPPER(LTRIM(RTRIM(ISNULL(T.inspection_result, '')))) IN ('PASS', 'FAIL')
                          OR UPPER(LTRIM(RTRIM(ISNULL(T.inspection_status, '')))) IN ('DONE', 'IN_PROGRESS', 'WAITING'))
                    THEN T.ticket_number
                ELSE COALESCE(NULLIF(LTRIM(RTRIM(ISNULL(S.ticket, ''))), ''), T.ticket_number)
            END,
            T.inspection_date = COALESCE(T.inspection_date, S.idate),
            T.inspection_status = CASE
                WHEN UPPER(LTRIM(RTRIM(ISNULL(T.inspection_result, '')))) IN ('PASS', 'FAIL')
                  OR UPPER(LTRIM(RTRIM(ISNULL(T.inspection_status, '')))) IN ('DONE', 'IN_PROGRESS', 'WAITING')
                  OR T.inspection_date IS NOT NULL
                  OR NULLIF(LTRIM(RTRIM(ISNULL(T.ticket_number, ''))), '') IS NOT NULL
                    THEN T.inspection_status
                WHEN UPPER(LTRIM(RTRIM(ISNULL(S.istat, '')))) = 'PASS' THEN 'DONE'
                ELSE COALESCE(NULLIF(LTRIM(RTRIM(ISNULL(S.istat, ''))), ''), T.inspection_status)
            END,
            T.inspection_result = CASE
                WHEN UPPER(LTRIM(RTRIM(ISNULL(T.inspection_result, '')))) IN ('PASS', 'FAIL')
                  OR UPPER(LTRIM(RTRIM(ISNULL(T.inspection_status, '')))) IN ('DONE', 'IN_PROGRESS', 'WAITING')
                  OR T.inspection_date IS NOT NULL
                  OR NULLIF(LTRIM(RTRIM(ISNULL(T.ticket_number, ''))), '') IS NOT NULL
                    THEN T.inspection_result
                WHEN UPPER(LTRIM(RTRIM(ISNULL(S.istat, '')))) = 'PASS' THEN 'PASS'
                ELSE T.inspection_result
            END,
            T.remark = S.rem,
            T.is_confirmed = S.iconf,
            T.custom_order = S.corder,
            T.updated_at = GETDATE()
        WHEN NOT MATCHED THEN INSERT
            (order_date, description, color, sku, po_number, quantity, dc_location,
            loading_week, shipping_week, production_date, production_end_date, is_production_done,
            loading_date, is_loading_done, ticket_number, inspection_date, inspection_status, inspection_result, remark, is_confirmed, custom_order, team)
        VALUES (S.odate, S.descr, S.color, S.sku, S.po, S.qty, S.dc, S.lweek, S.sweek, S.pdate, S.penddate, S.pdone, S.ldate, S.ldone, S.ticket, S.idate,
            CASE WHEN UPPER(LTRIM(RTRIM(ISNULL(S.istat, '')))) = 'PASS' THEN 'DONE' ELSE NULLIF(LTRIM(RTRIM(ISNULL(S.istat, ''))), '') END,
            CASE WHEN UPPER(LTRIM(RTRIM(ISNULL(S.istat, '')))) = 'PASS' THEN 'PASS' ELSE NULL END,
            S.rem, S.iconf, S.corder, ISNULL(NULLIF(S.team, ''), 'Team1'));";

    $stmt = $pdo->prepare($sql);
    $count = 0;
    $skippedCount = 0;
    $errorLogs = [];
    $samplePos = [];

    foreach ($rows as $row) {
        $poVal = trim((string)($row['po_number'] ?? ''));
        $skuVal = trim((string)($row['sku'] ?? ''));
        if ($poVal === '' || $skuVal === '') {
            $skippedCount++;
            $errorLogs[] = 'ข้ามแถวที่ไม่มี PO Number หรือ SKU';
            continue;
        }
        try {
            $currentOrder++;
            $qty = parseSalesFloat($row['quantity'] ?? 0, 'Quantity', 0, 9999999, true);
            $stmt->execute([
                normalizeSalesDate($row['order_date'] ?? null),
                trim((string)($row['description'] ?? '')),
                trim((string)($row['color'] ?? '')),
                $skuVal,
                $poVal,
                $qty !== null ? (int)round($qty) : 0,
                trim((string)($row['dc_location'] ?? '')),
                trim((string)($row['loading_week'] ?? '')),
                trim((string)($row['shipping_week'] ?? '')),
                normalizeSalesDate($row['production_date'] ?? null),
                normalizeSalesDate($row['production_end_date'] ?? null),
                isTruthyCsvFlag($row['is_production_done'] ?? 0),
                normalizeSalesDate($row['loading_date'] ?? null),
                isTruthyCsvFlag($row['is_loading_done'] ?? 0),
                trim((string)($row['ticket_number'] ?? '')),
                normalizeSalesDate($row['inspection_date'] ?? null),
                trim((string)($row['inspection_status'] ?? '')),
                trim((string)($row['remark'] ?? '')),
                isTruthyCsvFlag($row['is_confirmed'] ?? 0),
                $currentOrder,
                trim((string)($row['team'] ?? '')),
            ]);
            $count++;
            if (count($samplePos) < 5) {
                $samplePos[] = $poVal;
            }
        } catch (Throwable $ex) {
            $skippedCount++;
            if (count($errorLogs) < 10) {
                $errorLogs[] = "PO {$poVal}: " . $ex->getMessage();
            }
        }
    }

    $pdo->commit();
    writeLog($pdo, 'IMPORT', 'SALES_ORDER', 'BATCH_' . $count, null, ['imported' => $count, 'skipped' => $skippedCount, 'samples' => $samplePos], "Imported {$count} sales orders via Toolbox SPA");
    salesJsonSuccess([
        'count' => $count,
        'skipped_count' => $skippedCount,
        'errors' => $errorLogs,
    ], "นำเข้าสำเร็จ {$count} รายการ");
}

/** Updates production/inspection/loading/confirmed checkbox flags with QA FAIL guard. */
function handleToggleCheck(PDO $pdo, array $input): void {
    requireSalesAccess(true);

    $id = (int)($input['id'] ?? 0);
    $field = trim((string)($input['field'] ?? ''));
    $checked = !empty($input['checked']) ? 1 : 0;
    if ($id <= 0) {
        salesJsonError('รหัสคำสั่งซื้อไม่ถูกต้อง', 400);
    }

    $stmtOld = $pdo->prepare('SELECT id, po_number, inspection_date, inspection_status, inspection_result, is_production_done, is_loading_done, is_confirmed FROM ' . SO_TABLE . ' WITH (NOLOCK) WHERE id = ?');
    $stmtOld->execute([$id]);
    $oldRow = $stmtOld->fetch(PDO::FETCH_ASSOC);
    if (!$oldRow) {
        salesJsonError('ไม่พบข้อมูลคำสั่งซื้อ', 404);
    }

    if ($field === 'insp') {
        $latestHist = fetchLatestQaHistory($pdo, $id);
        $curRes = strtoupper(trim((string)($oldRow['inspection_result'] ?? '')));
        $histRes = strtoupper(trim((string)($latestHist['inspection_result'] ?? '')));
        if ($curRes === 'FAIL' || $histRes === 'FAIL') {
            salesJsonError('ไม่สามารถสลับสถานะ PO ที่ผลตรวจ QA เป็น FAIL ได้ กรุณาเปิดตรวจรอบใหม่ในระบบ iQMS', 400);
        }

        $statusVal = $checked ? 'DONE' : 'WAITING';
        $resultVal = $checked ? 'PASS' : null;
        $pdo->beginTransaction();
        $pdo->prepare('UPDATE ' . SO_TABLE . ' SET inspection_status = ?, inspection_result = ?, updated_at = GETDATE() WHERE id = ?')
            ->execute([$statusVal, $resultVal, $id]);
        if ($latestHist) {
            $pdo->prepare('UPDATE dbo.QMS_PO_INSPECTION_HISTORY SET inspection_status = ?, inspection_result = ?, updated_at = GETDATE() WHERE id = ?')
                ->execute([$statusVal, $resultVal, $latestHist['id']]);
        }
        $pdo->commit();
        writeLog($pdo, 'UPDATE', 'SALES_ORDER', $id, ['inspection_status' => $oldRow['inspection_status'], 'inspection_result' => $oldRow['inspection_result']], ['inspection_status' => $statusVal, 'inspection_result' => $resultVal], "Updated inspection check on PO {$oldRow['po_number']}");
        salesJsonSuccess(['id' => $id, 'inspection_status' => $statusVal, 'inspection_result' => $resultVal], 'อัปเดตสถานะตรวจเรียบร้อย');
    }

    $colMap = ['prod' => 'is_production_done', 'load' => 'is_loading_done', 'confirm' => 'is_confirmed'];
    $col = $colMap[$field] ?? '';
    if ($col === '') {
        salesJsonError('ฟิลด์สถานะไม่ถูกต้อง', 400);
    }

    if ($col === 'is_loading_done' && $checked === 1) {
        $pdo->prepare('UPDATE ' . SO_TABLE . ' SET is_loading_done = 1, loading_date = COALESCE(loading_date, GETDATE()), updated_at = GETDATE() WHERE id = ?')->execute([$id]);
    } elseif ($col === 'is_production_done' && $checked === 1) {
        $pdo->prepare('UPDATE ' . SO_TABLE . ' SET is_production_done = 1, production_end_date = COALESCE(production_end_date, GETDATE()), updated_at = GETDATE() WHERE id = ?')->execute([$id]);
    } else {
        $pdo->prepare("UPDATE " . SO_TABLE . " SET {$col} = ?, updated_at = GETDATE() WHERE id = ?")->execute([$checked, $id]);
    }

    writeLog($pdo, 'UPDATE', 'SALES_ORDER', $id, [$col => $oldRow[$col] ?? null], [$col => $checked], "Updated {$col} on PO {$oldRow['po_number']}");
    salesJsonSuccess(['id' => $id], 'อัปเดตสถานะเรียบร้อย');
}

/** Updates a whitelisted Sales Order cell with QA DONE/FAIL schedule lock protection. */
function handleUpdateSalesCell(PDO $pdo, array $input): void {
    requireSalesAccess(true);

    $id = (int)($input['id'] ?? 0);
    $field = trim((string)($input['field'] ?? ''));
    $allowed = ['quantity', 'loading_week', 'shipping_week', 'remark', 'dc_location', 'order_date', 'production_date', 'production_end_date', 'loading_date', 'inspection_date', 'ticket_number', 'team'];
    if ($id <= 0 || !in_array($field, $allowed, true)) {
        salesJsonError('พารามิเตอร์หรือคอลัมน์ไม่ได้รับอนุญาต', 400);
    }

    $stmtOld = $pdo->prepare("SELECT id, po_number, inspection_status, inspection_result, {$field} AS cur_val FROM " . SO_TABLE . ' WITH (NOLOCK) WHERE id = ?');
    $stmtOld->execute([$id]);
    $oldRow = $stmtOld->fetch(PDO::FETCH_ASSOC);
    if (!$oldRow) {
        salesJsonError('ไม่พบข้อมูลคำสั่งซื้อ', 404);
    }

    $curRes = strtoupper(trim((string)($oldRow['inspection_result'] ?? '')));
    $curSt = strtoupper(trim((string)($oldRow['inspection_status'] ?? '')));
    if (in_array($field, ['inspection_date', 'ticket_number'], true) && ($curRes === 'FAIL' || $curSt === 'DONE')) {
        salesJsonError('PO นี้ตรวจ QA เสร็จสิ้นแล้ว กรุณาแก้ไขวันที่ตรวจหรือเปิดตรวจรอบใหม่ในระบบ iQMS เพื่อไม่ให้ประวัติการตรวจสูญหาย', 400);
    }

    $rawVal = $input['value'] ?? '';
    $val = ($rawVal !== '' && $rawVal !== null) ? $rawVal : null;
    if ($field === 'quantity') {
        $parsed = parseSalesFloat($val, 'Quantity', 0, 9999999, false);
        $val = (int)round($parsed);
    } elseif ($val !== null && strpos($field, 'date') !== false) {
        $val = normalizeSalesDate($val);
    }

    $pdo->beginTransaction();
    $pdo->prepare("UPDATE " . SO_TABLE . " SET {$field} = ?, updated_at = GETDATE() WHERE id = ?")->execute([$val, $id]);
    if ($field === 'inspection_date') {
        $pdo->prepare('UPDATE dbo.QMS_PO_INSPECTION_HISTORY SET scheduled_date = ?, updated_at = GETDATE() WHERE sales_order_id = ? AND is_latest = 1')->execute([$val, $id]);
    } elseif ($field === 'ticket_number') {
        $pdo->prepare('UPDATE dbo.QMS_PO_INSPECTION_HISTORY SET ticket_number = ?, updated_at = GETDATE() WHERE sales_order_id = ? AND is_latest = 1')->execute([$val, $id]);
    }
    $pdo->commit();

    writeLog($pdo, 'UPDATE', 'SALES_ORDER', $id, [$field => $oldRow['cur_val'] ?? null], [$field => $val], "Inline updated {$field} on PO {$oldRow['po_number']}");
    salesJsonSuccess(['id' => $id, 'value' => $val], 'บันทึกข้อมูลเรียบร้อย');
}

/** Runs sequential RM allocation simulation against live PRODUCT_BOM & INVENTORY_ONHAND. */
function handleForecastRm(PDO $pdo, array $input): void {
    requireSalesAccess(false);

    $startDate = normalizeSalesDate($input['start_date'] ?? '');
    $endDate = normalizeSalesDate($input['end_date'] ?? '');
    $dateType = trim((string)($input['date_type'] ?? 'loading_date'));
    if (!in_array($dateType, ['loading_date', 'production_date', 'production_end_date', 'inspection_date'], true)) {
        $dateType = 'loading_date';
    }

    $where = ' WHERE ISNULL(s.is_production_done, 0) = 0 AND ISNULL(s.is_confirmed, 0) = 0';
    $params = [];
    if ($startDate !== null) {
        $where .= " AND s.{$dateType} >= ?";
        $params[] = $startDate;
    }
    if ($endDate !== null) {
        $where .= " AND s.{$dateType} <= ?";
        $params[] = $endDate;
    }

    $stmtOrders = $pdo->prepare(
        "SELECT TOP (500) s.id, s.po_number, s.sku, ISNULL(s.quantity, 0) AS quantity, s.custom_order, i.item_id AS fg_item_id
         FROM " . SO_TABLE . " s WITH (NOLOCK)
         LEFT JOIN " . ITEMS_MASTER_TABLE . " i WITH (NOLOCK) ON s.sku = i.sku OR s.sku = i.part_no
         {$where}
         ORDER BY ISNULL(s.custom_order, 999999) ASC, s.id DESC"
    );
    $stmtOrders->execute($params);
    $orders = $stmtOrders->fetchAll(PDO::FETCH_ASSOC);

    if (empty($orders)) {
        salesJsonSuccess([], 'ไม่มีรายการที่รอผลิตในเงื่อนไขที่เลือก', ['summary' => []]);
    }

    $boms = $pdo->query(
        "SELECT b.fg_item_id, b.component_item_id, CAST(b.quantity_required AS FLOAT) AS quantity_required,
                c.sap_no, c.part_description
         FROM " . PRODUCT_BOM_TABLE . " b WITH (NOLOCK)
         JOIN " . ITEMS_MASTER_TABLE . " c WITH (NOLOCK) ON b.component_item_id = c.item_id
         WHERE b.bom_status = 'ACTIVE' AND (c.sap_no LIKE '10%' OR c.sap_no LIKE '20%')"
    )->fetchAll(PDO::FETCH_ASSOC);

    $bomMap = [];
    foreach ($boms as $bom) {
        $bomMap[(int)$bom['fg_item_id']][] = $bom;
    }

    $inventory = $pdo->query(
        "SELECT i.item_id, i.sap_no, i.part_description, ISNULL(SUM(inv.quantity), 0) AS onhand_qty
         FROM " . ITEMS_MASTER_TABLE . " i WITH (NOLOCK)
         LEFT JOIN " . ONHAND_INV_TABLE . " inv WITH (NOLOCK) ON i.item_id = inv.parameter_id
            AND inv.location_id IN (SELECT location_id FROM " . LOCATIONS_MASTER_TABLE . " WITH (NOLOCK) WHERE location_type = 'STORE')
         WHERE (i.sap_no LIKE '10%' OR i.sap_no LIKE '20%')
         GROUP BY i.item_id, i.sap_no, i.part_description"
    )->fetchAll(PDO::FETCH_ASSOC);

    $stockMap = [];
    $originalStockMap = [];
    foreach ($inventory as $inv) {
        $stockMap[(int)$inv['item_id']] = (float)$inv['onhand_qty'];
        $originalStockMap[(int)$inv['item_id']] = (float)$inv['onhand_qty'];
    }

    $result = [];
    $shortageSummary = [];
    foreach ($orders as $order) {
        $poNum = $order['po_number'] ?: ('#' . $order['id']);
        $fgId = $order['fg_item_id'] ? (int)$order['fg_item_id'] : 0;
        $orderQty = (float)$order['quantity'];
        $orderShortages = [];
        $status = 'READY';

        if ($fgId > 0 && !empty($bomMap[$fgId])) {
            foreach ($bomMap[$fgId] as $comp) {
                $compId = (int)$comp['component_item_id'];
                $reqQty = $orderQty * (float)$comp['quantity_required'];
                $avail = $stockMap[$compId] ?? 0.0;
                if ($avail < $reqQty) {
                    $status = 'SHORTAGE';
                    $shortAmt = $reqQty - $avail;
                    $orderShortages[] = [
                        'sap_no' => $comp['sap_no'],
                        'part_description' => $comp['part_description'],
                        'required' => round($reqQty, 3),
                        'available' => round($avail, 3),
                        'shortage' => round($shortAmt, 3),
                    ];
                    if (!isset($shortageSummary[$comp['sap_no']])) {
                        $shortageSummary[$comp['sap_no']] = [
                            'sap_no' => $comp['sap_no'],
                            'part_description' => $comp['part_description'],
                            'total_shortage' => 0.0,
                            'available_in_store' => round($originalStockMap[$compId] ?? 0.0, 3),
                        ];
                    }
                    $shortageSummary[$comp['sap_no']]['total_shortage'] = round($shortageSummary[$comp['sap_no']]['total_shortage'] + $shortAmt, 3);
                    $stockMap[$compId] = 0.0;
                } else {
                    $stockMap[$compId] = $avail - $reqQty;
                }
            }
        } else {
            $status = 'MISSING_BOM';
            $orderShortages[] = [
                'sap_no' => 'N/A',
                'part_description' => 'ไม่พบสูตร BOM (PRODUCT_BOM) หรือ SKU ' . ($order['sku'] ?? ''),
                'required' => 0,
                'available' => 0,
                'shortage' => 0,
                'is_missing_bom' => true,
            ];
        }

        $result[] = [
            'id' => (int)$order['id'],
            'po_number' => $poNum,
            'sku' => $order['sku'],
            'quantity' => $orderQty,
            'status' => $status,
            'shortages' => $orderShortages,
        ];
    }

    salesJsonSuccess($result, 'วิเคราะห์วัตถุดิบเสร็จสิ้น', ['summary' => array_values($shortageSummary)]);
}

try {
    [$action, $input, $currentUser] = parseSalesRequest('read');

    switch ($action) {
        case 'read':
            handleReadSalesOrders($pdo, $input);
            break;

        case 'get_exchange_rate':
            requireSalesAccess(false);
            $stmtRate = $pdo->query('SELECT TOP 1 exchange_rate FROM dbo.MANPOWER_CALENDAR WITH (NOLOCK) WHERE exchange_rate IS NOT NULL ORDER BY calendar_date DESC');
            $rate = $stmtRate ? $stmtRate->fetchColumn() : false;
            salesJsonSuccess(['exchange_rate' => $rate ? (float)$rate : 32.0]);
            break;

        case 'import_json':
            handleImportSalesJson($pdo, $input);
            break;

        case 'reorder_items':
            requireSalesAccess(true);
            $orderedIds = $input['orderedIds'] ?? [];
            if (!is_array($orderedIds) || empty($orderedIds)) {
                salesJsonError('ไม่พบลำดับรายการ', 400);
            }
            $pdo->beginTransaction();
            $stmtOrd = $pdo->prepare('UPDATE ' . SO_TABLE . ' SET custom_order = ?, updated_at = GETDATE() WHERE id = ?');
            foreach ($orderedIds as $idx => $id) {
                $stmtOrd->execute([$idx + 1, (int)$id]);
            }
            $pdo->commit();
            writeLog($pdo, 'REORDER', 'SALES_ORDER', 'BATCH_' . count($orderedIds), null, ['count' => count($orderedIds)], 'Reordered sales orders');
            salesJsonSuccess(['count' => count($orderedIds)], 'บันทึกลำดับใหม่แล้ว');
            break;

        case 'update_check':
            handleToggleCheck($pdo, $input);
            break;

        case 'update_cell':
            handleUpdateSalesCell($pdo, $input);
            break;

        case 'create_single':
            requireSalesAccess(true);
            $sku = trim((string)($input['sku'] ?? ''));
            if ($sku === '') {
                salesJsonError('กรุณาระบุรหัส SKU หรือรหัสสินค้า', 400);
            }
            $poNumber = trim((string)($input['po_number'] ?? ''));
            $qty = parseSalesFloat($input['quantity'] ?? 0, 'Quantity', 0, 9999999, false);
            $orderDate = normalizeSalesDate($input['order_date'] ?? null);
            $team = trim((string)($input['team'] ?? '')) ?: 'Team1';
            $maxOrder = $pdo->query('SELECT MAX(custom_order) FROM ' . SO_TABLE . ' WITH (NOLOCK)')->fetchColumn();
            $nextOrder = $maxOrder ? ((int)$maxOrder + 1) : 1;

            $stmtIns = $pdo->prepare(
                'INSERT INTO ' . SO_TABLE . ' (po_number, sku, order_date, description, color, quantity, dc_location, loading_week, shipping_week, remark, custom_order, team, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, GETDATE())'
            );
            $stmtIns->execute([
                $poNumber,
                $sku,
                $orderDate,
                trim((string)($input['description'] ?? '')),
                trim((string)($input['color'] ?? '')),
                (int)round($qty),
                trim((string)($input['dc_location'] ?? '')),
                trim((string)($input['loading_week'] ?? '')),
                trim((string)($input['shipping_week'] ?? '')),
                trim((string)($input['remark'] ?? '')),
                $nextOrder,
                $team,
            ]);
            $newId = (int)$pdo->lastInsertId();
            writeLog($pdo, 'INSERT', 'SALES_ORDER', $newId ?: $poNumber, null, ['po_number' => $poNumber, 'sku' => $sku, 'quantity' => (int)round($qty), 'team' => $team], "Created sales order {$poNumber}");
            salesJsonSuccess(['id' => $newId], 'สร้างคำสั่งซื้อสำเร็จ');
            break;

        case 'delete_single':
            requireSalesAccess(true);
            $id = (int)($input['id'] ?? 0);
            if ($id <= 0) {
                salesJsonError('รหัสคำสั่งซื้อไม่ถูกต้อง', 400);
            }
            $stmtOld = $pdo->prepare('SELECT id, po_number, sku, quantity, inspection_status, inspection_result FROM ' . SO_TABLE . ' WITH (NOLOCK) WHERE id = ?');
            $stmtOld->execute([$id]);
            $oldRow = $stmtOld->fetch(PDO::FETCH_ASSOC);
            if (!$oldRow) {
                salesJsonError('ไม่พบคำสั่งซื้อที่ต้องการลบ', 404);
            }
            $pdo->beginTransaction();
            $pdo->prepare('DELETE FROM dbo.QMS_PO_INSPECTION_HISTORY WHERE sales_order_id = ?')->execute([$id]);
            $pdo->prepare('DELETE FROM ' . SO_TABLE . ' WHERE id = ?')->execute([$id]);
            $pdo->commit();
            writeLog($pdo, 'DELETE', 'SALES_ORDER', $id, $oldRow, null, "Deleted sales order {$oldRow['po_number']}");
            salesJsonSuccess(['id' => $id], 'ลบคำสั่งซื้อเรียบร้อย');
            break;

        case 'forecast_rm':
            handleForecastRm($pdo, $input);
            break;

        default:
            salesJsonError('ไม่พบ Action ที่ระบุ', 400);
    }
} catch (InvalidArgumentException $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    salesJsonError($e->getMessage(), 400);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    if (isset($pdo) && function_exists('writeErrorLog')) {
        writeErrorLog($pdo, 'SALES_ORDER', $e->getMessage(), ['action' => $action ?? '']);
    }
    salesJsonError('เกิดข้อผิดพลาดในการประมวลผลข้อมูล Sales Orders', 500);
}
