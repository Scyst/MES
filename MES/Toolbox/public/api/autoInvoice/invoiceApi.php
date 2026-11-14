<?php
/**
 * Self-contained Toolbox Auto Invoice API.
 * Replicates legacy api_invoice.php contracts with explicit projections, server pagination,
 * sp_Finance_ImportInvoice invocation, CSRF enforcement, and writeLog/writeErrorLog auditing.
 */

require_once __DIR__ . '/_common.php';

/** Reads paginated active invoices and status KPI breakdown. */
function handleGetHistory(PDO $pdo, array $input): void {
    $dateType = trim((string)($input['date_type'] ?? 'created_at'));
    $startDate = trim((string)($input['start'] ?? ''));
    $endDate = trim((string)($input['end'] ?? ''));
    $statusFilter = trim((string)($input['status'] ?? ''));
    $search = trim((string)($input['search'] ?? ''));

    $page = max(1, (int)($input['page'] ?? 1));
    $pageSize = max(1, min(500, (int)($input['page_size'] ?? 200)));
    $offset = ($page - 1) * $pageSize;

    $baseWhere = 'is_active = 1';
    $params = [];
    if ($startDate !== '' && $endDate !== '') {
        if ($dateType === 'invoice_date') {
            $baseWhere .= ' AND invoice_date_computed BETWEEN ? AND ?';
        } elseif ($dateType === 'etd_date') {
            $baseWhere .= ' AND etd_date_computed BETWEEN ? AND ?';
        } else {
            $baseWhere .= ' AND CAST(created_at AS DATE) BETWEEN ? AND ?';
        }
        $params[] = $startDate;
        $params[] = $endDate;
    }

    if ($search !== '') {
        $baseWhere .= ' AND (invoice_no LIKE ? OR customer_data_json LIKE ? OR shipping_data_json LIKE ? OR remark LIKE ?)';
        $like = '%' . $search . '%';
        array_push($params, $like, $like, $like, $like);
    }

    $kpiSql = "SELECT
            COUNT(*) AS [all],
            SUM(CASE WHEN ISNULL(doc_status, 'Pending') = 'Pending' THEN 1 ELSE 0 END) AS pending,
            SUM(CASE WHEN doc_status = 'Exported' THEN 1 ELSE 0 END) AS exported,
            SUM(CASE WHEN doc_status = 'Invoiced' THEN 1 ELSE 0 END) AS invoiced,
            SUM(CASE WHEN doc_status = 'Paid' THEN 1 ELSE 0 END) AS paid,
            SUM(CASE WHEN doc_status = 'Voided' THEN 1 ELSE 0 END) AS voided
        FROM dbo.FINANCE_INVOICES WITH (NOLOCK)
        WHERE {$baseWhere}";
    $stmtKpi = $pdo->prepare($kpiSql);
    $stmtKpi->execute($params);
    $summary = $stmtKpi->fetch(PDO::FETCH_ASSOC) ?: [];

    $listWhere = $baseWhere;
    $listParams = $params;
    if ($statusFilter !== '' && strtoupper($statusFilter) !== 'ALL') {
        $listWhere .= " AND ISNULL(doc_status, 'Pending') = ?";
        $listParams[] = $statusFilter;
    }

    $stmtCount = $pdo->prepare("SELECT COUNT(*) FROM dbo.FINANCE_INVOICES WITH (NOLOCK) WHERE {$listWhere}");
    $stmtCount->execute($listParams);
    $totalRows = (int)$stmtCount->fetchColumn();

    $sql = "SELECT id, invoice_no, version, total_amount, created_at, customer_data_json, shipping_data_json,
                ISNULL(doc_status, 'Pending') AS doc_status, remark, void_reason,
                ISNULL(weight_decimals, 2) AS weight_decimals,
                ISNULL(price_decimals, 4) AS price_decimals,
                ISNULL(qty_decimals, 0) AS qty_decimals,
                ISNULL(cbm_decimals, 2) AS cbm_decimals,
                ISNULL(amount_decimals, 2) AS amount_decimals
            FROM dbo.FINANCE_INVOICES WITH (NOLOCK)
            WHERE {$listWhere}
            ORDER BY COALESCE(invoice_date_computed, CAST(created_at AS DATE)) DESC, id DESC
            OFFSET ? ROWS FETCH NEXT ? ROWS ONLY";
    $stmt = $pdo->prepare($sql);
    foreach ($listParams as $idx => $val) {
        $stmt->bindValue($idx + 1, $val);
    }
    $stmt->bindValue(count($listParams) + 1, $offset, PDO::PARAM_INT);
    $stmt->bindValue(count($listParams) + 2, $pageSize, PDO::PARAM_INT);
    $stmt->execute();
    $invoices = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $rows = array_map(static function (array $row): array {
        $customer = json_decode((string)$row['customer_data_json'], true) ?: [];
        $shipping = json_decode((string)$row['shipping_data_json'], true) ?: [];
        $bookingNo = isset($shipping['booking_no']) && trim((string)$shipping['booking_no']) !== '' ? trim((string)$shipping['booking_no']) : '-';
        return [
            'id' => (int)$row['id'],
            'invoice_no' => $row['invoice_no'],
            'version' => (int)$row['version'],
            'doc_status' => $row['doc_status'],
            'void_reason' => $row['void_reason'] ?? '',
            'customer_name' => $customer['name'] ?? '-',
            'container_no' => $shipping['container_no'] ?? '-',
            'vessel' => $shipping['feeder_vessel'] ?? '-',
            'booking_no' => $bookingNo,
            'team_name' => isset($shipping['team_name']) ? trim((string)$shipping['team_name']) : '',
            'admin_memo' => isset($shipping['admin_memo']) ? trim((string)$shipping['admin_memo']) : '',
            'invoice_date' => $shipping['invoice_date'] ?? '-',
            'etd_date' => $shipping['etd_date'] ?? '-',
            'eta_date' => $shipping['eta_date'] ?? '-',
            'total_amount' => number_format((float)$row['total_amount'], (int)($row['amount_decimals'] ?? 2)),
            'total_amount_raw' => (float)$row['total_amount'],
            'remark' => $row['remark'] ?: '-',
            'weight_decimals' => (int)($row['weight_decimals'] ?? 2),
            'price_decimals' => (int)($row['price_decimals'] ?? 4),
            'qty_decimals' => (int)($row['qty_decimals'] ?? 0),
            'cbm_decimals' => (int)($row['cbm_decimals'] ?? 2),
            'amount_decimals' => (int)($row['amount_decimals'] ?? 2),
            'created_at' => $row['created_at'] ? date('d/m/Y H:i', strtotime((string)$row['created_at'])) : '-',
        ];
    }, $invoices);

    invJsonSuccess($rows, 'OK', [
        'summary' => $summary,
        'pagination' => ['page' => $page, 'page_size' => $pageSize, 'total_rows' => $totalRows],
    ]);
}

/** Fetches full invoice header, JSON metadata, and ordered line details by ID or invoice_no. */
function fetchInvoiceBundle(PDO $pdo, int $invoiceId): array {
    $stmt = $pdo->prepare(
        "SELECT id, invoice_no, version, report_id, customer_data_json, shipping_data_json,
                total_amount, is_active, created_at, created_by, remark, updated_at, doc_status, void_reason,
                ISNULL(weight_decimals, 2) AS weight_decimals,
                ISNULL(price_decimals, 4) AS price_decimals,
                ISNULL(qty_decimals, 0) AS qty_decimals,
                ISNULL(cbm_decimals, 2) AS cbm_decimals,
                ISNULL(amount_decimals, 2) AS amount_decimals
         FROM dbo.FINANCE_INVOICES WITH (NOLOCK) WHERE id = ?"
    );
    $stmt->execute([$invoiceId]);
    $header = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$header) {
        invJsonError('ไม่พบข้อมูล Invoice ในระบบ', 404);
    }

    $stmtDet = $pdo->prepare(
        "SELECT detail_id, invoice_id, sku, description, qty_carton, unit_price, line_total,
                net_weight, gross_weight, cbm, po_number, carton_no, shipping_marks, product_type
         FROM dbo.FINANCE_INVOICE_DETAILS WITH (NOLOCK)
         WHERE invoice_id = ?
         ORDER BY detail_id ASC"
    );
    $stmtDet->execute([$invoiceId]);
    $details = $stmtDet->fetchAll(PDO::FETCH_ASSOC);

    return [
        'header' => $header,
        'customer' => json_decode((string)$header['customer_data_json'], true) ?: [],
        'shipping' => json_decode((string)$header['shipping_data_json'], true) ?: [],
        'details' => $details,
        'weight_decimals' => (int)($header['weight_decimals'] ?? 2),
        'price_decimals' => (int)($header['price_decimals'] ?? 4),
        'qty_decimals' => (int)($header['qty_decimals'] ?? 0),
        'cbm_decimals' => (int)($header['cbm_decimals'] ?? 2),
        'amount_decimals' => (int)($header['amount_decimals'] ?? 2),
    ];
}

try {
    [$action, $input, $currentUser] = parseInvRequest('get_history');
    requireInvoiceAccess();
    $userId = (int)($currentUser['id'] ?? 0);

    switch ($action) {
        case 'get_history':
            handleGetHistory($pdo, $input);
            break;

        case 'import_invoice':
            $invoiceNo = trim((string)($input['invoice_no'] ?? 'AUTO')) ?: 'AUTO';
            $reportId = !empty($input['report_id']) && is_numeric($input['report_id']) ? (int)$input['report_id'] : null;
            $remark = trim((string)($input['remark'] ?? ''));
            $customerJson = json_encode($input['customer'] ?? [], JSON_UNESCAPED_UNICODE);
            $shippingJson = json_encode($input['shipping'] ?? [], JSON_UNESCAPED_UNICODE);
            $details = $input['details'] ?? [];
            if (!is_array($details) || empty($details)) {
                invJsonError('ต้องมีรายการสินค้าอย่างน้อย 1 รายการ', 400);
            }
            $detailsJson = json_encode($details, JSON_UNESCAPED_UNICODE);

            $stmt = $pdo->prepare(
                'EXEC dbo.sp_Finance_ImportInvoice
                    @invoice_no = ?, @report_id = ?, @customer_json = ?, @shipping_json = ?, @details_json = ?, @user_id = ?, @remark = ?'
            );
            $stmt->execute([$invoiceNo, $reportId, $customerJson, $shippingJson, $detailsJson, $userId, $remark]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            $stmt->closeCursor();

            if (!$result || (int)($result['success'] ?? 0) !== 1) {
                throw new RuntimeException('ไม่สามารถบันทึกข้อมูล Invoice ผ่าน Stored Procedure ได้');
            }

            $finalInvNo = $result['invoice_no'];
            $newVersion = (int)$result['current_version'];

            if (isset($input['decimals']) && is_array($input['decimals'])) {
                $d = $input['decimals'];
                $wDec = clampInvoiceDecimals($d['weight_decimals'] ?? null, 2);
                $pDec = clampInvoiceDecimals($d['price_decimals'] ?? null, 4);
                $qDec = clampInvoiceDecimals($d['qty_decimals'] ?? null, 0);
                $cDec = clampInvoiceDecimals($d['cbm_decimals'] ?? null, 2);
                $aDec = clampInvoiceDecimals($d['amount_decimals'] ?? null, 2);
                $pdo->prepare(
                    'UPDATE dbo.FINANCE_INVOICES
                     SET weight_decimals = ?, price_decimals = ?, qty_decimals = ?, cbm_decimals = ?, amount_decimals = ?
                     WHERE invoice_no = ? AND version = ?'
                )->execute([$wDec, $pDec, $qDec, $cDec, $aDec, $finalInvNo, $newVersion]);
            }

            writeLog($pdo, 'UPSERT', 'FINANCE_INVOICE', $finalInvNo, null, ['version' => $newVersion, 'remark' => $remark], "Saved invoice {$finalInvNo} v{$newVersion}");
            invJsonSuccess([
                'invoice_no' => $finalInvNo,
                'version' => $newVersion,
            ], 'บันทึกข้อมูล Invoice เรียบร้อยแล้ว');
            break;

        case 'get_versions':
            $invoiceNo = trim((string)($input['invoice_no'] ?? ''));
            if ($invoiceNo === '') {
                invJsonError('กรุณาระบุเลข Invoice', 400);
            }
            $stmt = $pdo->prepare(
                "SELECT TOP (50) id, invoice_no, version, total_amount, is_active, created_at, remark, ISNULL(doc_status, 'Pending') AS doc_status, void_reason, ISNULL(amount_decimals, 2) AS amount_decimals
                 FROM dbo.FINANCE_INVOICES WITH (NOLOCK)
                 WHERE invoice_no = ?
                 ORDER BY version DESC"
            );
            $stmt->execute([$invoiceNo]);
            $rows = array_map(static function (array $row): array {
                return [
                    'id' => (int)$row['id'],
                    'invoice_no' => $row['invoice_no'],
                    'version' => (int)$row['version'],
                    'doc_status' => $row['doc_status'],
                    'total_amount' => number_format((float)$row['total_amount'], (int)($row['amount_decimals'] ?? 2)),
                    'is_active' => (int)$row['is_active'],
                    'created_at' => $row['created_at'] ? date('d/m/Y H:i', strtotime((string)$row['created_at'])) : '-',
                    'remark' => $row['remark'] ?: '-',
                    'void_reason' => $row['void_reason'] ?: '',
                ];
            }, $stmt->fetchAll(PDO::FETCH_ASSOC));
            invJsonSuccess($rows);
            break;

        case 'get_invoice_detail':
            $id = (int)($input['id'] ?? 0);
            if ($id <= 0) {
                invJsonError('ไม่พบรหัส Invoice', 400);
            }
            invJsonSuccess(fetchInvoiceBundle($pdo, $id));
            break;

        case 'get_invoice_by_no':
            $invNo = trim((string)($input['invoice_no'] ?? ''));
            if ($invNo === '') {
                invJsonError('กรุณาระบุ Invoice No.', 400);
            }
            $stmtId = $pdo->prepare('SELECT TOP 1 id FROM dbo.FINANCE_INVOICES WITH (NOLOCK) WHERE invoice_no = ? AND is_active = 1');
            $stmtId->execute([$invNo]);
            $foundId = (int)$stmtId->fetchColumn();
            if ($foundId <= 0) {
                invJsonError('ไม่พบข้อมูล Invoice เลขที่ ' . $invNo, 404);
            }
            invJsonSuccess(fetchInvoiceBundle($pdo, $foundId));
            break;

        case 'get_exchange_rate':
            $rate = $pdo->query('SELECT TOP 1 exchange_rate FROM dbo.MANPOWER_CALENDAR WITH (NOLOCK) WHERE exchange_rate IS NOT NULL ORDER BY calendar_date DESC')->fetchColumn();
            invJsonSuccess(['exchangeRate' => number_format($rate ? (float)$rate : 32.00, 2, '.', '')]);
            break;

        case 'update_status':
            $invoiceNo = trim((string)($input['invoice_no'] ?? ''));
            $status = trim((string)($input['status'] ?? ''));
            $remark = trim((string)($input['remark'] ?? ''));
            $allowedStatuses = ['Pending', 'Exported', 'Invoiced', 'Paid', 'Voided'];
            if ($invoiceNo === '' || !in_array($status, $allowedStatuses, true)) {
                invJsonError('สถานะหรือเลข Invoice ไม่ถูกต้อง', 400);
            }
            if ($status === 'Voided' && $remark === '') {
                invJsonError('ต้องระบุเหตุผลการยกเลิกบิล (Void Reason)', 400);
            }

            $stmtOld = $pdo->prepare('SELECT TOP 1 id, doc_status, void_reason FROM dbo.FINANCE_INVOICES WITH (NOLOCK) WHERE invoice_no = ? AND is_active = 1');
            $stmtOld->execute([$invoiceNo]);
            $oldRow = $stmtOld->fetch(PDO::FETCH_ASSOC);
            if (!$oldRow) {
                invJsonError('ไม่พบข้อมูล Invoice', 404);
            }

            if ($status === 'Voided') {
                $pdo->prepare('UPDATE dbo.FINANCE_INVOICES SET doc_status = ?, void_reason = ?, updated_at = GETDATE() WHERE invoice_no = ? AND is_active = 1')
                    ->execute([$status, $remark, $invoiceNo]);
            } else {
                $pdo->prepare('UPDATE dbo.FINANCE_INVOICES SET doc_status = ?, updated_at = GETDATE() WHERE invoice_no = ? AND is_active = 1')
                    ->execute([$status, $invoiceNo]);
            }
            writeLog($pdo, 'UPDATE', 'FINANCE_INVOICE', $invoiceNo, $oldRow, ['doc_status' => $status, 'void_reason' => $remark], "Updated invoice status to {$status}");
            invJsonSuccess(['invoice_no' => $invoiceNo, 'doc_status' => $status], "อัปเดตสถานะเป็น {$status} สำเร็จ");
            break;

        case 'restore_invoice':
            $invoiceNo = trim((string)($input['invoice_no'] ?? ''));
            if ($invoiceNo === '') {
                invJsonError('กรุณาระบุเลข Invoice', 400);
            }
            $stmtOld = $pdo->prepare('SELECT TOP 1 id, doc_status, void_reason FROM dbo.FINANCE_INVOICES WITH (NOLOCK) WHERE invoice_no = ? AND is_active = 1');
            $stmtOld->execute([$invoiceNo]);
            $oldRow = $stmtOld->fetch(PDO::FETCH_ASSOC);
            if (!$oldRow) {
                invJsonError('ไม่พบข้อมูล Invoice', 404);
            }

            $pdo->prepare("UPDATE dbo.FINANCE_INVOICES SET doc_status = 'Pending', void_reason = NULL, updated_at = GETDATE() WHERE invoice_no = ? AND is_active = 1")
                ->execute([$invoiceNo]);
            writeLog($pdo, 'RESTORE', 'FINANCE_INVOICE', $invoiceNo, $oldRow, ['doc_status' => 'Pending', 'void_reason' => null], "Restored voided invoice {$invoiceNo}");
            invJsonSuccess(['invoice_no' => $invoiceNo], "กู้คืนบิล {$invoiceNo} สำเร็จ");
            break;

        case 'get_item_info':
            $sku = trim((string)($input['sku'] ?? ''));
            if ($sku === '') {
                invJsonError('กรุณาระบุรหัส SKU', 400);
            }
            $stmt = $pdo->prepare(
                'SELECT TOP 1 sku, sap_no, part_description, invoice_description, Price_USD, net_weight, gross_weight, cbm, CTN, invoice_product_type
                 FROM dbo.ITEMS WITH (NOLOCK)
                 WHERE (sku = ? OR sap_no = ?) AND is_active = 1'
            );
            $stmt->execute([$sku, $sku]);
            $item = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$item) {
                invJsonError('ไม่พบข้อมูลสินค้านี้ในระบบ Master', 404);
            }
            invJsonSuccess($item);
            break;

        case 'search_items':
            $q = trim((string)($input['q'] ?? ''));
            if ($q === '') {
                invJsonSuccess([]);
            }
            $like = '%' . $q . '%';
            $stmt = $pdo->prepare(
                'SELECT TOP 20 sku, sap_no, part_description, invoice_description, Price_USD, net_weight, gross_weight, cbm, CTN, invoice_product_type
                 FROM dbo.ITEMS WITH (NOLOCK)
                 WHERE is_active = 1 AND (sku LIKE ? OR sap_no LIKE ? OR part_description LIKE ?)
                 ORDER BY sku ASC'
            );
            $stmt->execute([$like, $like, $like]);
            invJsonSuccess($stmt->fetchAll(PDO::FETCH_ASSOC));
            break;

        case 'get_last_invoice_defaults':
            $last = $pdo->query('SELECT TOP 1 id, customer_data_json, shipping_data_json FROM dbo.FINANCE_INVOICES WITH (NOLOCK) WHERE is_active = 1 ORDER BY created_at DESC')->fetch(PDO::FETCH_ASSOC);
            $defaults = ['customer' => [], 'shipping' => [], 'product_type' => ''];
            if ($last) {
                $defaults['customer'] = json_decode((string)$last['customer_data_json'], true) ?: [];
                $defaults['shipping'] = json_decode((string)$last['shipping_data_json'], true) ?: [];
                $stmtDet = $pdo->prepare('SELECT TOP 1 product_type FROM dbo.FINANCE_INVOICE_DETAILS WITH (NOLOCK) WHERE invoice_id = ? ORDER BY detail_id ASC');
                $stmtDet->execute([(int)$last['id']]);
                $defaults['product_type'] = (string)($stmtDet->fetchColumn() ?: '');
            }
            invJsonSuccess($defaults);
            break;

        case 'update_decimal_settings':
            $invoiceId = (int)($input['invoice_id'] ?? 0);
            if ($invoiceId <= 0) {
                invJsonError('รหัส Invoice ไม่ถูกต้อง', 400);
            }
            $wDec = clampInvoiceDecimals($input['weight_decimals'] ?? null, 2);
            $pDec = clampInvoiceDecimals($input['price_decimals'] ?? null, 4);
            $qDec = clampInvoiceDecimals($input['qty_decimals'] ?? null, 0);
            $cDec = clampInvoiceDecimals($input['cbm_decimals'] ?? null, 2);
            $aDec = clampInvoiceDecimals($input['amount_decimals'] ?? null, 2);

            $pdo->prepare('UPDATE dbo.FINANCE_INVOICES SET weight_decimals = ?, price_decimals = ?, qty_decimals = ?, cbm_decimals = ?, amount_decimals = ? WHERE id = ?')
                ->execute([$wDec, $pDec, $qDec, $cDec, $aDec, $invoiceId]);
            writeLog($pdo, 'UPDATE', 'FINANCE_INVOICE', $invoiceId, null, compact('wDec', 'pDec', 'qDec', 'cDec', 'aDec'), 'Updated invoice decimal settings');
            invJsonSuccess(null, 'อัปเดตการตั้งค่าทศนิยมสำเร็จ');
            break;

        case 'update_memo':
            $invoiceNo = trim((string)($input['invoice_no'] ?? ''));
            $memo = (string)($input['memo'] ?? '');
            if ($invoiceNo === '') {
                invJsonError('กรุณาระบุเลข Invoice', 400);
            }
            $pdo->beginTransaction();
            $stmt = $pdo->prepare('SELECT shipping_data_json FROM dbo.FINANCE_INVOICES WITH (UPDLOCK) WHERE invoice_no = ? AND is_active = 1');
            $stmt->execute([$invoiceNo]);
            $inv = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$inv) {
                throw new InvalidArgumentException('ไม่พบข้อมูลบิล');
            }
            $shipping = json_decode((string)$inv['shipping_data_json'], true) ?: [];
            $oldMemo = $shipping['admin_memo'] ?? '';
            $shipping['admin_memo'] = $memo;
            $pdo->prepare('UPDATE dbo.FINANCE_INVOICES SET shipping_data_json = ?, updated_at = GETDATE() WHERE invoice_no = ? AND is_active = 1')
                ->execute([json_encode($shipping, JSON_UNESCAPED_UNICODE), $invoiceNo]);
            $pdo->commit();
            writeLog($pdo, 'UPDATE', 'FINANCE_INVOICE_MEMO', $invoiceNo, ['admin_memo' => $oldMemo], ['admin_memo' => $memo], "Updated memo on {$invoiceNo}");
            invJsonSuccess(['admin_memo' => $memo], 'บันทึก Memo สำเร็จ');
            break;

        default:
            invJsonError('ไม่พบ Action ที่ระบุ', 400);
    }
} catch (InvalidArgumentException $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    invJsonError($e->getMessage(), 400);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    if (isset($pdo) && function_exists('writeErrorLog')) {
        writeErrorLog($pdo, 'FINANCE_INVOICE', $e->getMessage(), ['action' => $action ?? '']);
    }
    invJsonError('เกิดข้อผิดพลาดในการจัดการ Auto Invoice', 500);
}
