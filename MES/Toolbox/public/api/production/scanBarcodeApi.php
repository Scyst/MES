<?php
/**
 * Self-contained Toolbox API for Scan Barcode Terminal.
 * Handles high-speed item lookup, shift-based scan log aggregation (day/night/all),
 * hourly STOCK_TRANSACTIONS rollup, BOM deduction, and active Job progress sync.
 */

require_once __DIR__ . '/_common.php';

[$action, $input, $currentUser] = parseProductionRequest();

try {
    switch ($action) {
        case 'get_locations':
            handleScanLocations($pdo);
            break;

        case 'get_product':
            handleScanGetProduct($pdo, $input);
            break;

        case 'get_logs':
            handleScanGetLogs($pdo, $input);
            break;

        case 'save_scan':
            handleSaveScan($pdo, $input, $currentUser);
            break;

        default:
            prodJsonError("ไม่พบ Action '{$action}' ในระบบ Scan Barcode API", 400);
    }
} catch (Throwable $e) {
    handleApiError($e, $pdo ?? null, $input ?? $_REQUEST);
}

function handleScanLocations(PDO $pdo): void {
    $stmt = $pdo->query("
        SELECT location_id, location_name, location_description, location_type, production_line
        FROM " . LOCATIONS_TABLE . " WITH (NOLOCK)
        WHERE is_active = 1
          AND location_type IN ('WIP', 'FG')
        ORDER BY location_name ASC
    ");
    prodJsonSuccess($stmt->fetchAll(PDO::FETCH_ASSOC), 'Loaded scan locations');
}

function handleScanGetProduct(PDO $pdo, array $input): void {
    $barcode = strtoupper(trim((string)($input['barcode'] ?? '')));
    if ($barcode === '') {
        throw new InvalidArgumentException('กรุณาสแกนหรือระบุรหัสบาร์โค้ด');
    }

    $stmt = $pdo->prepare("
        SELECT TOP 1
            item_id, sap_no, part_no, part_description, barcode, material_type, sku, CTN, planned_output
        FROM " . ITEMS_TABLE . " WITH (NOLOCK)
        WHERE is_active = 1
          AND (UPPER(LTRIM(RTRIM(ISNULL(barcode, '')))) = ?
               OR UPPER(LTRIM(RTRIM(ISNULL(sap_no, '')))) = ?
               OR UPPER(LTRIM(RTRIM(ISNULL(part_no, '')))) = ?)
    ");
    $stmt->execute([$barcode, $barcode, $barcode]);
    $item = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$item) {
        prodJsonError("ไม่พบรหัสสินค้า '{$barcode}' ในระบบ Master Data", 404);
    }
    prodJsonSuccess($item, 'Found item');
}

function handleScanGetLogs(PDO $pdo, array $input): void {
    $date = parseDateOrDefault($input['date'] ?? null);
    $shift = strtolower(trim((string)($input['shift'] ?? 'day')));
    $locationId = !empty($input['location_id']) && $input['location_id'] !== 'ALL' ? (string)(int)$input['location_id'] : '';

    if ($shift === 'day') {
        $startDt = "{$date} 08:00:00";
        $endDt = "{$date} 19:59:59";
    } elseif ($shift === 'night') {
        $nextDate = date('Y-m-d', strtotime($date . ' +1 day'));
        $startDt = "{$date} 20:00:00";
        $endDt = "{$nextDate} 07:59:59";
    } else {
        $startDt = "{$date} 00:00:00";
        $endDt = "{$date} 23:59:59";
    }

    $conds = ["s." . COL_LOG_LOGDATE . " BETWEEN ? AND ?"];
    $params = [$startDt, $endDt];

    if ($locationId !== '') {
        $conds[] = "s." . COL_LOG_LOC_ID . " = ?";
        $params[] = $locationId;
    }
    if (!empty($input['search'])) {
        $term = '%' . trim((string)$input['search']) . '%';
        $conds[] = "(s." . COL_LOG_BARCODE . " LIKE ? OR s." . COL_LOG_SAP . " LIKE ? OR s." . COL_LOG_LOTREF . " LIKE ? OR s." . COL_LOG_NOTES . " LIKE ?)";
        array_push($params, $term, $term, $term, $term);
    }

    $whereSql = 'WHERE ' . implode(' AND ', $conds);
    $sql = "
        SELECT TOP 500
            s.transaction_id,
            s." . COL_LOG_BARCODE . " AS barcode_no,
            s." . COL_LOG_SAP . " AS sap_no,
            s." . COL_LOG_LOTREF . " AS lot_ref,
            s." . COL_LOG_LOC_ID . " AS location_id,
            s." . COL_LOG_LOC_NAME . " AS location_name,
            s." . COL_LOG_PROD_TYPE . " AS production_type,
            s." . COL_LOG_LOGDATE . " AS logdate,
            s." . COL_LOG_NOTES . " AS notes,
            s." . COL_LOG_SCANNED_BY . " AS scanned_by,
            DATEPART(HOUR, s." . COL_LOG_LOGDATE . ") AS scan_hour,
            i.part_no,
            i.part_description
        FROM " . SCAN_LOGS_TABLE . " s WITH (NOLOCK)
        LEFT JOIN " . ITEMS_TABLE . " i WITH (NOLOCK) ON s." . COL_LOG_SAP . " = i.sap_no
        {$whereSql}
        ORDER BY s." . COL_LOG_LOGDATE . " DESC, s.transaction_id DESC
    ";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $sumSql = "
        SELECT
            COUNT(*) AS total_scans,
            ISNULL(SUM(CASE WHEN UPPER(s." . COL_LOG_PROD_TYPE . ") = 'FG' THEN 1 ELSE 0 END), 0) AS fg_count,
            ISNULL(SUM(CASE WHEN UPPER(s." . COL_LOG_PROD_TYPE . ") = 'HOLD' THEN 1 ELSE 0 END), 0) AS hold_count,
            ISNULL(SUM(CASE WHEN UPPER(s." . COL_LOG_PROD_TYPE . ") = 'SCRAP' THEN 1 ELSE 0 END), 0) AS scrap_count
        FROM " . SCAN_LOGS_TABLE . " s WITH (NOLOCK)
        {$whereSql}
    ";
    $sumStmt = $pdo->prepare($sumSql);
    $sumStmt->execute($params);
    $summary = $sumStmt->fetch(PDO::FETCH_ASSOC) ?: [];

    prodJsonSuccess([
        'rows' => $rows,
        'summary' => $summary,
        'range' => ['start' => $startDt, 'end' => $endDt, 'shift' => $shift],
    ], 'Loaded scan logs');
}

function handleSaveScan(PDO $pdo, array $input, array $currentUser): void {
    $barcode = strtoupper(trim((string)($input['barcode'] ?? '')));
    $prodType = strtoupper(trim((string)($input['production_type'] ?? 'FG')));
    $locationId = parsePositiveInt($input['location_id'] ?? 0, 'สถานี / ไลน์ผลิต');
    $lotRef = trim((string)($input['lot_ref'] ?? ''));
    $jobNo = trim((string)($input['job_no'] ?? ''));
    $userNotes = trim((string)($input['notes'] ?? ''));
    $teamCsv = resolveTeamUserIdsCsv($input['team_user_ids'] ?? '', (int)$currentUser['id']);

    if ($barcode === '') {
        throw new InvalidArgumentException('กรุณาสแกนบาร์โค้ดสินค้า');
    }
    if (!in_array($prodType, ['FG', 'HOLD', 'SCRAP'], true)) {
        throw new InvalidArgumentException('ประเภทการผลิตต้องเป็น FG, HOLD หรือ SCRAP');
    }

    $itemStmt = $pdo->prepare("
        SELECT TOP 1 item_id, sap_no, part_no, part_description
        FROM " . ITEMS_TABLE . " WITH (NOLOCK)
        WHERE is_active = 1
          AND (UPPER(LTRIM(RTRIM(ISNULL(barcode, '')))) = ?
               OR UPPER(LTRIM(RTRIM(ISNULL(sap_no, '')))) = ?
               OR UPPER(LTRIM(RTRIM(ISNULL(part_no, '')))) = ?)
    ");
    $itemStmt->execute([$barcode, $barcode, $barcode]);
    $item = $itemStmt->fetch(PDO::FETCH_ASSOC);
    if (!$item) {
        prodJsonError("ไม่พบข้อมูลสินค้าบาร์โค้ด '{$barcode}'", 404);
    }

    $locStmt = $pdo->prepare("SELECT location_id, location_name FROM " . LOCATIONS_TABLE . " WITH (NOLOCK) WHERE location_id = ?");
    $locStmt->execute([$locationId]);
    $location = $locStmt->fetch(PDO::FETCH_ASSOC);
    if (!$location) {
        prodJsonError('ไม่พบข้อมูล Location ที่เลือก', 404);
    }

    $itemId = (int)$item['item_id'];
    $scanNow = date('Y-m-d H:i:s');
    $curHour = date('H');
    $startTime = "{$curHour}:00:00";
    $endTime = "{$curHour}:59:59";
    $scanDate = date('Y-m-d');

    $noteSegments = ['Scan:'];
    if ($jobNo !== '') $noteSegments[] = "[Job: {$jobNo}]";
    if ($lotRef !== '') $noteSegments[] = "[Lot: {$lotRef}]";
    if ($userNotes !== '') $noteSegments[] = $userNotes;
    $scanNote = mb_substr(implode(' ', $noteSegments), 0, 490);
    $refId = $jobNo !== '' ? $jobNo : ($lotRef !== '' ? $lotRef : 'SCAN');

    // 1. Record raw scan event
    $insScan = $pdo->prepare("
        INSERT INTO " . SCAN_LOGS_TABLE . "
            (" . COL_LOG_BARCODE . ", " . COL_LOG_SAP . ", " . COL_LOG_LOTREF . ", " . COL_LOG_LOC_ID . ", " . COL_LOG_LOC_NAME . ",
             " . COL_LOG_PROD_TYPE . ", " . COL_LOG_LOGDATE . ", " . COL_LOG_NOTES . ", created_at, " . COL_LOG_SCANNED_BY . ")
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, GETDATE(), ?)
    ");
    $insScan->execute([
        $barcode,
        $item['sap_no'],
        $lotRef !== '' ? $lotRef : null,
        (string)$locationId,
        $location['location_name'],
        $prodType,
        $scanNow,
        $scanNote,
        $currentUser['username'],
    ]);
    $scanLogId = (int)$pdo->lastInsertId();

    // 2. Aggregate into hourly STOCK_TRANSACTIONS row or create new hourly rollup via sp_ExecuteProduction
    $fullType = 'PRODUCTION_' . $prodType;
    $findAggStmt = $pdo->prepare("
        SELECT TOP 1 transaction_id, quantity
        FROM " . TRANSACTIONS_TABLE . " WITH (UPDLOCK)
        WHERE parameter_id = ?
          AND to_location_id = ?
          AND transaction_type = ?
          AND CAST(transaction_timestamp AS DATE) = ?
          AND start_time = CAST(? AS TIME)
          AND end_time = CAST(? AS TIME)
          AND ISNULL(notes, '') = ?
        ORDER BY transaction_id DESC
    ");
    $findAggStmt->execute([$itemId, $locationId, $fullType, $scanDate, $startTime, $endTime, $scanNote]);
    $existingTxn = $findAggStmt->fetch(PDO::FETCH_ASSOC);

    $stockTxnId = 0;
    if ($existingTxn) {
        $stockTxnId = (int)$existingTxn['transaction_id'];
        $pdo->beginTransaction();
        try {
            $pdo->prepare("UPDATE " . TRANSACTIONS_TABLE . " SET quantity = quantity + 1, transaction_timestamp = ? WHERE transaction_id = ?")
                ->execute([$scanNow, $stockTxnId]);

            $spStock = $pdo->prepare("EXEC " . SP_UPDATE_ONHAND . " @item_id = ?, @location_id = ?, @quantity_to_change = ?");
            $spStock->execute([$itemId, $locationId, 1]);
            $spStock->closeCursor();

            $bomStmt = $pdo->prepare("SELECT component_item_id, quantity_required FROM " . BOM_TABLE . " WITH (NOLOCK) WHERE fg_item_id = ? AND ISNULL(bom_status, 'ACTIVE') != 'INACTIVE'");
            $bomStmt->execute([$itemId]);
            $components = $bomStmt->fetchAll(PDO::FETCH_ASSOC);
            $consumeNote = 'Auto-consumed for production ID: ' . $stockTxnId;

            foreach ($components as $comp) {
                $compId = (int)$comp['component_item_id'];
                $compDelta = -1.0 * (float)$comp['quantity_required'];
                $updComp = $pdo->prepare("
                    UPDATE " . TRANSACTIONS_TABLE . "
                    SET quantity = quantity + ?, transaction_timestamp = ?
                    WHERE notes = ? AND parameter_id = ? AND transaction_type = 'CONSUMPTION'
                ");
                $updComp->execute([$compDelta, $scanNow, $consumeNote, $compId]);
                $spStock->execute([$compId, $locationId, $compDelta]);
                $spStock->closeCursor();
            }
            $pdo->commit();
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            throw $e;
        }
    } else {
        $spProd = $pdo->prepare(
            "EXEC " . SP_EXECUTE_PRODUCTION . "
                @item_id = ?, @location_id = ?, @quantity = ?, @count_type = ?,
                @lot_no = ?, @notes = ?, @timestamp = ?, @start_time = ?, @end_time = ?,
                @user_id = ?, @username = ?, @machine_id = ?, @team_user_ids = ?"
        );
        $spProd->execute([
            $itemId, $locationId, 1, $prodType,
            $refId, $scanNote, $scanNow, $startTime, $endTime,
            (int)$currentUser['id'], $currentUser['username'], null, $teamCsv
        ]);
        $spProd->closeCursor();

        $findNew = $pdo->prepare("SELECT TOP 1 transaction_id FROM " . TRANSACTIONS_TABLE . " WITH (NOLOCK) WHERE parameter_id = ? AND to_location_id = ? AND created_by_user_id = ? ORDER BY transaction_id DESC");
        $findNew->execute([$itemId, $locationId, (int)$currentUser['id']]);
        $stockTxnId = (int)$findNew->fetchColumn();
    }

    if ($prodType === 'SCRAP') {
        buildScrapRequisition($pdo, $itemId, 1.0, $locationId, (int)$currentUser['id'], "Replacement: Scan Scrap {$barcode}", $stockTxnId ?: null);
    }

    if ($jobNo !== '') {
        $jobCol = $prodType === 'FG' ? 'actual_qty' : ($prodType === 'HOLD' ? 'hold_qty' : 'scrap_qty');
        $pdo->prepare("UPDATE dbo.PRODUCTION_JOBS SET {$jobCol} = ISNULL({$jobCol}, 0) + 1 WHERE job_no = ? AND status = 'RUNNING'")
            ->execute([$jobNo]);
    }

    prodJsonSuccess([
        'scan_id' => $scanLogId,
        'stock_transaction_id' => $stockTxnId,
        'barcode_no' => $barcode,
        'sap_no' => $item['sap_no'],
        'part_no' => $item['part_no'],
        'part_description' => $item['part_description'],
        'lot_ref' => $lotRef,
        'job_no' => $jobNo,
        'production_type' => $prodType,
        'location_name' => $location['location_name'],
        'timestamp' => $scanNow,
    ], "สแกน {$item['part_no']} ({$prodType}) สำเร็จ");
}
