<?php
/**
 * Self-contained Toolbox Shipping & Container Loading Schedule API.
 * Features explicit projections, pagination, FAIL-first inspection protection,
 * merge-import protection, CSRF validation, and writeLog/writeErrorLog audit logging.
 */

require_once __DIR__ . '/_common.php';

const SHIPPING_SO_TABLE = 'dbo.SALES_ORDERS';
const SHIPPING_ITEMS_TABLE = 'dbo.ITEMS';

/** Executes single protected MERGE INTO SALES_ORDERS for shipping schedule imports. */
function mergeShippingRow(PDO $pdo, string $poVal, array $fieldsToSet): void {
    if (!array_key_exists('team', $fieldsToSet) || trim((string)$fieldsToSet['team']) === '') {
        $fieldsToSet['team'] = null;
    }

    if (empty($fieldsToSet)) {
        $stmtCheck = $pdo->prepare('SELECT TOP 1 id FROM ' . SHIPPING_SO_TABLE . ' WITH (NOLOCK) WHERE po_number = ?');
        $stmtCheck->execute([$poVal]);
        if (!$stmtCheck->fetch()) {
            $pdo->prepare("INSERT INTO " . SHIPPING_SO_TABLE . " (po_number, team, created_at) VALUES (?, 'Team1', GETDATE())")
                ->execute([$poVal]);
        }
        return;
    }

    $qaProtectedCols = ['inspection_date', 'inspection_status', 'inspection_result', 'ticket_number'];
    $updateSets = [];
    $insertCols = ['po_number', 'created_at'];
    $insertVals = ['S.po_number', 'GETDATE()'];
    $usingCols = ['po_number'];
    $execParams = [$poVal];

    foreach ($fieldsToSet as $col => $val) {
        $usingCols[] = $col;
        $execParams[] = $val;

        if ($col === 'team') {
            $updateSets[] = "T.team = COALESCE(NULLIF(LTRIM(RTRIM(ISNULL(S.team, ''))), ''), T.team)";
            $insertCols[] = 'team';
            $insertVals[] = "ISNULL(NULLIF(LTRIM(RTRIM(ISNULL(S.team, ''))), ''), 'Team1')";
        } elseif ($col === 'loading_date') {
            $updateSets[] = 'T.loading_date = COALESCE(S.loading_date, T.loading_date)';
            $insertCols[] = 'loading_date';
            $insertVals[] = 'S.loading_date';
        } elseif ($col === 'inspection_result') {
            $updateSets[] = "T.inspection_result = CASE
                WHEN UPPER(LTRIM(RTRIM(ISNULL(T.inspection_result, '')))) IN ('PASS', 'FAIL')
                  OR UPPER(LTRIM(RTRIM(ISNULL(T.inspection_status, '')))) IN ('DONE', 'IN_PROGRESS', 'WAITING')
                  OR T.inspection_date IS NOT NULL
                    THEN T.inspection_result
                WHEN UPPER(LTRIM(RTRIM(ISNULL(S.inspection_result, '')))) IN ('PASS', 'OK', 'YES', 'DONE') THEN 'PASS'
                WHEN UPPER(LTRIM(RTRIM(ISNULL(S.inspection_result, '')))) = 'FAIL' THEN 'FAIL'
                ELSE COALESCE(NULLIF(LTRIM(RTRIM(ISNULL(S.inspection_result, ''))), ''), T.inspection_result)
            END";
            $insertCols[] = 'inspection_result';
            $insertVals[] = "CASE WHEN UPPER(LTRIM(RTRIM(ISNULL(S.inspection_result, '')))) IN ('PASS','OK','YES','DONE') THEN 'PASS' WHEN UPPER(LTRIM(RTRIM(ISNULL(S.inspection_result, '')))) = 'FAIL' THEN 'FAIL' ELSE NULL END";
        } elseif (in_array($col, $qaProtectedCols, true)) {
            $updateSets[] = "T.{$col} = COALESCE(T.{$col}, S.{$col})";
            $insertCols[] = $col;
            $insertVals[] = "S.{$col}";
        } else {
            $updateSets[] = "T.{$col} = S.{$col}";
            $insertCols[] = $col;
            $insertVals[] = "S.{$col}";
        }
    }

    if (!array_key_exists('team', $fieldsToSet)) {
        $insertCols[] = 'team';
        $insertVals[] = "'Team1'";
    }

    $updateSets[] = 'T.updated_at = GETDATE()';
    $placeholders = implode(', ', array_fill(0, count($usingCols), '?'));
    $sql = "MERGE INTO " . SHIPPING_SO_TABLE . " AS T
        USING (VALUES ({$placeholders})) AS S (" . implode(', ', $usingCols) . ")
        ON T.po_number = S.po_number
        WHEN MATCHED THEN UPDATE SET " . implode(', ', $updateSets) . "
        WHEN NOT MATCHED THEN INSERT (" . implode(', ', $insertCols) . ") VALUES (" . implode(', ', $insertVals) . ");";

    $pdo->prepare($sql)->execute($execParams);
}

/** Reads paginated shipping schedule rows + 7-day/wait-load/active KPI counts. */
function handleReadShipping(PDO $pdo, array $input): void {
    requireSalesAccess(false);

    $startDate = normalizeSalesDate($input['start_date'] ?? '');
    $endDate = normalizeSalesDate($input['end_date'] ?? '');
    $statusFilter = strtoupper(trim((string)($input['status'] ?? 'ALL')));
    $teamFilter = trim((string)($input['team'] ?? ''));
    $search = trim((string)($input['search'] ?? ''));

    $page = max(1, (int)($input['page'] ?? 1));
    $pageSize = max(1, min(500, (int)($input['page_size'] ?? 200)));
    $offset = ($page - 1) * $pageSize;

    $baseWhere = ' WHERE 1=1';
    $params = [];
    if ($startDate !== null) {
        $baseWhere .= ' AND s.loading_date >= ?';
        $params[] = $startDate;
    }
    if ($endDate !== null) {
        $baseWhere .= ' AND s.loading_date <= ?';
        $params[] = $endDate;
    }
    if ($teamFilter !== '' && strtoupper($teamFilter) !== 'ALL') {
        $baseWhere .= ' AND ISNULL(s.team, \'\') = ?';
        $params[] = $teamFilter;
    }
    if ($search !== '') {
        $baseWhere .= ' AND (s.po_number LIKE ? OR s.sku LIKE ? OR s.booking_no LIKE ? OR s.container_no LIKE ? OR s.invoice_no LIKE ? OR s.snc_ci_no LIKE ? OR s.dc_location LIKE ?)';
        $like = '%' . $search . '%';
        array_push($params, $like, $like, $like, $like, $like, $like, $like);
    }

    $today = date('Y-m-d');
    $plus7 = date('Y-m-d', strtotime('+7 days'));
    $kpiSql = "SELECT
            COUNT(*) AS total_all,
            SUM(CASE WHEN ISNULL(s.is_confirmed, 0) = 0 AND ISNULL(s.is_loading_done, 0) = 0 THEN 1 ELSE 0 END) AS total_active,
            SUM(CASE WHEN s.is_production_done = 1 AND ISNULL(s.is_loading_done, 0) = 0 AND ISNULL(s.is_confirmed, 0) = 0 THEN 1 ELSE 0 END) AS wait_load,
            SUM(CASE WHEN ISNULL(s.is_loading_done, 0) = 0 AND ISNULL(s.is_confirmed, 0) = 0 AND s.loading_date BETWEEN ? AND ? THEN 1 ELSE 0 END) AS next_7_days
        FROM " . SHIPPING_SO_TABLE . " s WITH (NOLOCK) {$baseWhere}";
    $stmtKpi = $pdo->prepare($kpiSql);
    $stmtKpi->execute(array_merge([$today, $plus7], $params));
    $summary = $stmtKpi->fetch(PDO::FETCH_ASSOC) ?: [];

    $filterWhere = $baseWhere;
    $filterParams = $params;
    if ($statusFilter === 'NEXT_7_DAYS') {
        $filterWhere .= ' AND ISNULL(s.is_loading_done, 0) = 0 AND ISNULL(s.is_confirmed, 0) = 0 AND s.loading_date BETWEEN ? AND ?';
        array_push($filterParams, $today, $plus7);
    } elseif ($statusFilter === 'WAIT_LOAD') {
        $filterWhere .= ' AND s.is_production_done = 1 AND ISNULL(s.is_loading_done, 0) = 0 AND ISNULL(s.is_confirmed, 0) = 0';
    } elseif ($statusFilter === 'ACTIVE') {
        $filterWhere .= ' AND ISNULL(s.is_loading_done, 0) = 0 AND ISNULL(s.is_confirmed, 0) = 0';
    } elseif ($statusFilter === 'DONE') {
        $filterWhere .= ' AND s.is_loading_done = 1';
    }

    $totSql = "SELECT COUNT(*) AS filtered_count,
            SUM(ISNULL(s.quantity, 0)) AS filtered_qty,
            SUM(ISNULL(s.cbm, 0)) AS filtered_cbm,
            SUM(COALESCE(i.Price_USD, i.StandardPrice, 0) * ISNULL(s.quantity, 0)) AS filtered_usd
        FROM " . SHIPPING_SO_TABLE . " s WITH (NOLOCK)
        LEFT JOIN " . SHIPPING_ITEMS_TABLE . " i WITH (NOLOCK) ON s.sku = i.sku
        {$filterWhere}";
    $stmtTot = $pdo->prepare($totSql);
    $stmtTot->execute($filterParams);
    $totals = $stmtTot->fetch(PDO::FETCH_ASSOC) ?: ['filtered_count' => 0, 'filtered_qty' => 0, 'filtered_cbm' => 0, 'filtered_usd' => 0];

    $cols = "s.id, s.po_number, s.sku, s.description, s.quantity, s.team, s.shipping_week, s.shipping_customer_status,
        s.inspect_type, s.inspection_status, s.inspection_result, s.inspection_date, s.ticket_number,
        s.loading_date, CONVERT(VARCHAR(5), s.load_time, 108) AS load_time, s.etd, s.dc_location,
        s.booking_no, s.invoice_no, s.snc_ci_no, s.ctn_size, s.container_no, s.seal_no,
        s.container_tare, s.net_weight, s.gross_weight, s.cbm, s.feeder_vessel, s.mother_vessel,
        s.si_vgm_cut_off, s.pickup_date, s.return_date, s.cutoff_date, CONVERT(VARCHAR(5), s.cutoff_time, 108) AS cutoff_time,
        s.is_production_done, s.is_loading_done, s.is_confirmed, s.remark";
    $listSql = "SELECT {$cols},
            (COALESCE(i.Price_USD, i.StandardPrice, 0) * ISNULL(s.quantity, 0)) AS price
        FROM " . SHIPPING_SO_TABLE . " s WITH (NOLOCK)
        LEFT JOIN " . SHIPPING_ITEMS_TABLE . " i WITH (NOLOCK) ON s.sku = i.sku
        {$filterWhere}
        ORDER BY CASE WHEN s.loading_date IS NULL THEN 1 ELSE 0 END ASC, s.loading_date ASC, s.load_time ASC, s.id DESC
        OFFSET ? ROWS FETCH NEXT ? ROWS ONLY";

    $stmtList = $pdo->prepare($listSql);
    foreach ($filterParams as $idx => $val) {
        $stmtList->bindValue($idx + 1, $val);
    }
    $stmtList->bindValue(count($filterParams) + 1, $offset, PDO::PARAM_INT);
    $stmtList->bindValue(count($filterParams) + 2, $pageSize, PDO::PARAM_INT);
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

/** Updates allowed shipping column inline with strict QA FAIL immutability check. */
function handleUpdateShippingCell(PDO $pdo, array $input): void {
    requireSalesAccess(true);

    $id = (int)($input['id'] ?? 0);
    $field = trim((string)($input['field'] ?? ''));
    $allowedCols = [
        'shipping_week', 'shipping_customer_status', 'inspect_type', 'inspection_result',
        'loading_date', 'load_time', 'etd', 'dc_location', 'sku', 'po_number',
        'booking_no', 'invoice_no', 'description', 'quantity', 'ctn_size',
        'container_no', 'seal_no', 'container_tare', 'net_weight', 'gross_weight', 'cbm',
        'feeder_vessel', 'mother_vessel', 'snc_ci_no', 'si_vgm_cut_off',
        'pickup_date', 'return_date', 'remark', 'cutoff_date', 'cutoff_time', 'team',
    ];
    if ($id <= 0 || !in_array($field, $allowedCols, true)) {
        salesJsonError('คอลัมน์หรือรหัสคำสั่งซื้อไม่ถูกต้อง', 400);
    }

    $stmtOld = $pdo->prepare("SELECT id, po_number, inspection_status, inspection_result, {$field} AS cur_val FROM " . SHIPPING_SO_TABLE . ' WITH (NOLOCK) WHERE id = ?');
    $stmtOld->execute([$id]);
    $oldRow = $stmtOld->fetch(PDO::FETCH_ASSOC);
    if (!$oldRow) {
        salesJsonError('ไม่พบข้อมูลคำสั่งซื้อ', 404);
    }

    $val = $input['value'] ?? null;
    if ($val === '') {
        $val = null;
    }

    if ($field === 'quantity') {
        $val = $val === null ? 0 : (int)round(parseSalesFloat($val, 'Quantity', 0, 9999999, false));
    } elseif (in_array($field, ['container_tare', 'net_weight', 'gross_weight', 'cbm'], true)) {
        $val = $val === null ? null : parseSalesFloat($val, $field, 0, 9999999, true);
    } elseif (in_array($field, ['loading_date', 'etd', 'si_vgm_cut_off', 'pickup_date', 'return_date', 'cutoff_date'], true)) {
        $val = normalizeSalesDate($val);
    }

    if ($field === 'inspection_result') {
        $latestHist = fetchLatestQaHistory($pdo, $id);
        $curRes = strtoupper(trim((string)($oldRow['inspection_result'] ?? '')));
        $histRes = strtoupper(trim((string)($latestHist['inspection_result'] ?? '')));
        if ($curRes === 'FAIL' || $histRes === 'FAIL') {
            salesJsonError('ไม่สามารถแก้ไขผลตรวจ QA ที่เป็น FAIL จากหน้า Shipping ได้ กรุณาเปิดตรวจรอบใหม่ในระบบ iQMS', 400);
        }

        $normalizedRes = strtoupper(trim((string)($val ?? '')));
        $pdo->beginTransaction();
        if (in_array($normalizedRes, ['PASS', 'FAIL'], true)) {
            $pdo->prepare('UPDATE ' . SHIPPING_SO_TABLE . " SET inspection_result = ?, inspection_status = 'DONE', updated_at = GETDATE() WHERE id = ?")
                ->execute([$normalizedRes, $id]);
            if ($latestHist) {
                $pdo->prepare("UPDATE dbo.QMS_PO_INSPECTION_HISTORY SET inspection_result = ?, inspection_status = 'DONE', updated_at = GETDATE() WHERE id = ?")
                    ->execute([$normalizedRes, $latestHist['id']]);
            }
        } else {
            $pdo->prepare('UPDATE ' . SHIPPING_SO_TABLE . ' SET inspection_result = ?, updated_at = GETDATE() WHERE id = ?')->execute([$val, $id]);
            if ($latestHist) {
                $pdo->prepare('UPDATE dbo.QMS_PO_INSPECTION_HISTORY SET inspection_result = ?, updated_at = GETDATE() WHERE id = ?')->execute([$val, $latestHist['id']]);
            }
        }
        $pdo->commit();
    } else {
        $pdo->prepare("UPDATE " . SHIPPING_SO_TABLE . " SET {$field} = ?, updated_at = GETDATE() WHERE id = ?")->execute([$val, $id]);
        if ($field === 'inspect_type') {
            $pdo->prepare('UPDATE dbo.QMS_PO_INSPECTION_HISTORY SET inspect_type = ?, updated_at = GETDATE() WHERE sales_order_id = ? AND is_latest = 1')->execute([$val, $id]);
        }
    }

    writeLog($pdo, 'UPDATE', 'SHIPPING', $id, [$field => $oldRow['cur_val'] ?? null], [$field => $val], "Shipping updated {$field} on PO {$oldRow['po_number']}");
    salesJsonSuccess(['id' => $id, 'value' => $val], 'บันทึกข้อมูลสำเร็จ');
}

try {
    [$action, $input, $currentUser] = parseSalesRequest('read');

    switch ($action) {
        case 'read':
            handleReadShipping($pdo, $input);
            break;

        case 'update_cell':
            handleUpdateShippingCell($pdo, $input);
            break;

        case 'update_check':
            requireSalesAccess(true);
            $id = (int)($input['id'] ?? 0);
            $field = trim((string)($input['field'] ?? ''));
            $checked = !empty($input['checked']) ? 1 : 0;
            if ($id <= 0 || !in_array($field, ['is_loading_done', 'is_production_done', 'inspection_status'], true)) {
                salesJsonError('พารามิเตอร์สถานะไม่ถูกต้อง', 400);
            }
            $stmtOld = $pdo->prepare('SELECT id, po_number, inspection_status, inspection_result, is_loading_done, is_production_done FROM ' . SHIPPING_SO_TABLE . ' WITH (NOLOCK) WHERE id = ?');
            $stmtOld->execute([$id]);
            $oldRow = $stmtOld->fetch(PDO::FETCH_ASSOC);
            if (!$oldRow) {
                salesJsonError('ไม่พบรายการ', 404);
            }

            if ($field === 'is_loading_done' && $checked === 1) {
                $pdo->prepare('UPDATE ' . SHIPPING_SO_TABLE . ' SET is_loading_done = 1, loading_date = COALESCE(loading_date, GETDATE()), updated_at = GETDATE() WHERE id = ?')->execute([$id]);
            } elseif ($field === 'is_production_done' && $checked === 1) {
                $pdo->prepare('UPDATE ' . SHIPPING_SO_TABLE . ' SET is_production_done = 1, production_end_date = COALESCE(production_end_date, GETDATE()), updated_at = GETDATE() WHERE id = ?')->execute([$id]);
            } elseif ($field === 'inspection_status') {
                $latestHist = fetchLatestQaHistory($pdo, $id);
                $curRes = strtoupper(trim((string)($oldRow['inspection_result'] ?? '')));
                $histRes = strtoupper(trim((string)($latestHist['inspection_result'] ?? '')));
                if ($curRes === 'FAIL' || $histRes === 'FAIL') {
                    salesJsonError('ไม่สามารถสลับสถานะ PO ที่ผลตรวจ QA เป็น FAIL ได้ กรุณาเปิดตรวจรอบใหม่ในระบบ iQMS', 400);
                }
                $statusStr = $checked ? 'DONE' : 'WAITING';
                $resultStr = $checked ? 'PASS' : null;
                $pdo->beginTransaction();
                $pdo->prepare('UPDATE ' . SHIPPING_SO_TABLE . ' SET inspection_status = ?, inspection_result = ?, updated_at = GETDATE() WHERE id = ?')->execute([$statusStr, $resultStr, $id]);
                if ($latestHist) {
                    $pdo->prepare('UPDATE dbo.QMS_PO_INSPECTION_HISTORY SET inspection_status = ?, inspection_result = ?, updated_at = GETDATE() WHERE id = ?')->execute([$statusStr, $resultStr, $latestHist['id']]);
                }
                $pdo->commit();
            } else {
                $pdo->prepare("UPDATE " . SHIPPING_SO_TABLE . " SET {$field} = ?, updated_at = GETDATE() WHERE id = ?")->execute([$checked, $id]);
            }
            writeLog($pdo, 'UPDATE', 'SHIPPING', $id, [$field => $oldRow[$field] ?? null], [$field => $checked], "Shipping toggled {$field} on PO {$oldRow['po_number']}");
            salesJsonSuccess(['id' => $id], 'อัปเดตสถานะเรียบร้อย');
            break;

        case 'import_json':
            requireSalesAccess(true);
            $rows = $input['data'] ?? [];
            if (is_string($rows)) {
                $rows = json_decode($rows, true);
            }
            if (!is_array($rows) || empty($rows)) {
                salesJsonError('ไม่พบข้อมูลที่จะนำเข้า', 400);
            }

            $columnMap = [
                'shippingweek' => 'shipping_week', 'status' => 'shipping_customer_status',
                'inspecttype' => 'inspect_type', 'inspectionresult' => 'inspection_result', 'inspectres' => 'inspection_result',
                'sncloadday' => 'loading_date', 'loaddate' => 'loading_date', 'loadingdate' => 'loading_date', 'etd' => 'etd',
                'dc' => 'dc_location', 'dclocation' => 'dc_location', 'sku' => 'sku', 'po' => 'po_number', 'ponumber' => 'po_number',
                'bookingno' => 'booking_no', 'invoice' => 'invoice_no', 'invoiceno' => 'invoice_no',
                'description' => 'description', 'team' => 'team', 'teamgroup' => 'team', 'group' => 'team',
                'ctnsqtypieces' => 'quantity', 'qty' => 'quantity', 'quantity' => 'quantity',
                'ctnsize' => 'ctn_size', 'size' => 'ctn_size', 'containerno' => 'container_no', 'sealno' => 'seal_no',
                'containertare' => 'container_tare', 'tare' => 'container_tare',
                'nw' => 'net_weight', 'netweight' => 'net_weight', 'gw' => 'gross_weight', 'grossweight' => 'gross_weight', 'cbm' => 'cbm',
                'feedervessel' => 'feeder_vessel', 'mothervessel' => 'mother_vessel', 'snccino' => 'snc_ci_no',
                'sivgmcutoff' => 'si_vgm_cut_off', 'pickup' => 'pickup_date', 'pickupdate' => 'pickup_date',
                'rtn' => 'return_date', 'returndate' => 'return_date', 'remark' => 'remark',
                'loadtime' => 'load_time', 'time' => 'load_time', 'loadingtime' => 'load_time',
                'cutoffdate' => 'cutoff_date', 'cutofftime' => 'cutoff_time',
            ];
            $dateCols = ['loading_date', 'etd', 'si_vgm_cut_off', 'pickup_date', 'return_date', 'cutoff_date', 'inspection_date'];
            $numCols = ['quantity', 'container_tare', 'net_weight', 'gross_weight', 'cbm'];

            $successCount = 0;
            $skipCount = 0;
            $errors = [];

            $pdo->beginTransaction();
            foreach ($rows as $idx => $row) {
                $rowNum = $idx + 2;
                if (!is_array($row)) {
                    $skipCount++;
                    continue;
                }
                $normalized = [];
                foreach ($row as $k => $v) {
                    $normalized[strtolower(preg_replace('/[^a-z0-9]/i', '', (string)$k))] = $v;
                }
                $poVal = trim((string)($normalized['po'] ?? $normalized['ponumber'] ?? ''));
                if ($poVal === '') {
                    $skipCount++;
                    continue;
                }
                $fieldsToSet = [];
                foreach ($columnMap as $cleanHeader => $dbCol) {
                    if ($dbCol === 'po_number' || !array_key_exists($cleanHeader, $normalized)) {
                        continue;
                    }
                    $val = trim((string)$normalized[$cleanHeader]);
                    if (in_array($dbCol, $numCols, true)) {
                        $cleanNum = str_replace(',', '', $val);
                        $val = ($cleanNum === '') ? null : (is_numeric($cleanNum) ? round((float)$cleanNum, 3) : null);
                    } elseif (in_array($dbCol, $dateCols, true)) {
                        $val = normalizeSalesDate($val);
                    } elseif ($dbCol === 'load_time' || $dbCol === 'cutoff_time') {
                        if (is_numeric($val)) {
                            $val = gmdate('H:i', (int)floor((float)$val * 86400));
                        } else {
                            $ts = strtotime($val);
                            $val = $ts ? date('H:i', $ts) : null;
                        }
                    }
                    $fieldsToSet[$dbCol] = $val;
                }

                try {
                    mergeShippingRow($pdo, $poVal, $fieldsToSet);
                    $successCount++;
                } catch (Throwable $ex) {
                    $skipCount++;
                    if (count($errors) < 15) {
                        $errors[] = "Row {$rowNum} (PO: {$poVal}): " . $ex->getMessage();
                    }
                }
            }
            $pdo->commit();
            writeLog($pdo, 'IMPORT', 'SHIPPING', 'JSON_' . $successCount, null, ['success_count' => $successCount, 'skipped_count' => $skipCount], "Shipping import: {$successCount} rows merged");
            salesJsonSuccess([
                'success_count' => $successCount,
                'skipped_count' => $skipCount,
                'errors' => $errors,
            ], "นำเข้าข้อมูลการจัดส่งสำเร็จ {$successCount} รายการ");
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
        writeErrorLog($pdo, 'SHIPPING', $e->getMessage(), ['action' => $action ?? '']);
    }
    salesJsonError('เกิดข้อผิดพลาดในการจัดการตารางจัดส่ง', 500);
}
