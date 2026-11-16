<?php
/**
 * Self-contained Production Planning, Schedule Calendar, Bulk Excel Import,
 * APS Auto-Plan, and Carry-Over API for Toolbox SPA (#/management).
 * Replaces legacy page/management/api/planManage.php & filter/item search dependencies.
 */

require_once __DIR__ . '/_common.php';

@set_time_limit(300);

$action = '';
$input = [];
try {
    [$action, $input, $currentUser] = parseMgmtRequest('get_plans');
    $username = trim((string)($currentUser['username'] ?? 'SYSTEM'));

    $planTable = PRODUCTION_PLANS_TABLE;
    $itemTable = ITEMS_TABLE;
    $transTable = TRANSACTIONS_TABLE;
    $locationsTable = LOCATIONS_TABLE;
    $routesTable = ROUTES_TABLE;

    switch ($action) {
        case 'get_filters': {
            requireMgmtPlanningAccess(false);
            $lines = $pdo->query("
                SELECT DISTINCT RTRIM(LTRIM(line)) AS line
                FROM {$routesTable} WITH (NOLOCK)
                WHERE line IS NOT NULL AND line <> ''
                ORDER BY line ASC
            ")->fetchAll(PDO::FETCH_COLUMN) ?: [];

            mgmtJsonSuccess(['lines' => $lines], 'Planning filters loaded');
            break;
        }

        case 'search_items': {
            requireMgmtPlanningAccess(false);
            $q = trim((string)($input['q'] ?? ''));
            if (strlen($q) < 2) {
                mgmtJsonSuccess([], 'Type at least 2 characters');
            }
            $like = '%' . $q . '%';
            $stmt = $pdo->prepare("
                SELECT TOP 40
                    item_id, sap_no, part_no, part_description,
                    ISNULL(Price_USD, 0) AS Price_USD,
                    ISNULL(StandardPrice, 0) AS StandardPrice,
                    ISNULL(Cost_Total, 0) AS Cost_Total
                FROM {$itemTable} WITH (NOLOCK)
                WHERE is_active = 1
                  AND (sap_no LIKE ? OR part_no LIKE ? OR part_description LIKE ?)
                ORDER BY sap_no ASC, part_no ASC
            ");
            $stmt->execute([$like, $like, $like]);
            mgmtJsonSuccess($stmt->fetchAll(PDO::FETCH_ASSOC) ?: [], 'Items loaded');
            break;
        }

        case 'get_plans': {
            requireMgmtPlanningAccess(false);
            $page = max(1, (int)($input['page'] ?? 1));
            $limit = (int)($input['limit'] ?? 50);
            $limit = max(1, min(500, $limit));
            $offset = ($page - 1) * $limit;

            $today = date('Y-m-d');
            $startDate = normalizeMgmtDate($input['startDate'] ?? date('Y-m-01'), date('Y-m-01'));
            $endDate = normalizeMgmtDate($input['endDate'] ?? date('Y-m-t'), date('Y-m-t'));
            $line = trim((string)($input['line'] ?? ''));
            $shift = strtoupper(trim((string)($input['shift'] ?? '')));
            $search = trim((string)($input['search'] ?? ''));

            $startTs = date('Y-m-d 08:00:00', strtotime($startDate));
            $endTs = date('Y-m-d 07:59:59', strtotime($endDate . ' +1 day'));

            $actualsSubQuery = "
                SELECT
                    CAST(DATEADD(HOUR, -8, transaction_timestamp) AS DATE) AS ActualDate,
                    l.production_line AS ActualLine,
                    CASE WHEN DATEPART(HOUR, DATEADD(HOUR, -8, transaction_timestamp)) < 12 THEN 'DAY' ELSE 'NIGHT' END AS ActualShift,
                    parameter_id AS ActualItemId,
                    SUM(quantity) AS ActualQty
                FROM {$transTable} t WITH (NOLOCK)
                JOIN {$locationsTable} l WITH (NOLOCK) ON t.to_location_id = l.location_id
                WHERE t.transaction_type = 'PRODUCTION_FG'
                  AND t.transaction_timestamp >= :startTs
                  AND t.transaction_timestamp <= :endTs
                  " . ($line !== '' ? "AND l.production_line = :lineFilter" : "") . "
                GROUP BY
                    CAST(DATEADD(HOUR, -8, transaction_timestamp) AS DATE),
                    l.production_line,
                    CASE WHEN DATEPART(HOUR, DATEADD(HOUR, -8, transaction_timestamp)) < 12 THEN 'DAY' ELSE 'NIGHT' END,
                    parameter_id
            ";

            $params = [
                ':start' => $startDate,
                ':end' => $endDate,
                ':start2' => $startDate,
                ':end2' => $endDate,
                ':startTs' => $startTs,
                ':endTs' => $endTs,
            ];
            $whereClause = " AND (p.plan_date BETWEEN :start AND :end OR actual.ActualDate BETWEEN :start2 AND :end2)";
            if ($line !== '') {
                $whereClause .= " AND (p.line = :line OR actual.ActualLine = :line2)";
                $params[':line'] = $line;
                $params[':line2'] = $line;
                $params[':lineFilter'] = $line;
            }
            if ($shift !== '') {
                $whereClause .= " AND (p.shift = :shift OR actual.ActualShift = :shift2)";
                $params[':shift'] = $shift;
                $params[':shift2'] = $shift;
            }
            if ($search !== '') {
                $whereClause .= " AND (i.sap_no LIKE :q1 OR i.part_no LIKE :q2 OR i.part_description LIKE :q3 OR p.note LIKE :q4)";
                $likeQ = '%' . $search . '%';
                $params[':q1'] = $likeQ;
                $params[':q2'] = $likeQ;
                $params[':q3'] = $likeQ;
                $params[':q4'] = $likeQ;
            }

            $baseQuery = "
                FROM ({$actualsSubQuery}) AS actual
                FULL OUTER JOIN {$planTable} p WITH (NOLOCK) ON
                    p.plan_date = actual.ActualDate
                    AND p.line = actual.ActualLine
                    AND p.shift = actual.ActualShift
                    AND p.item_id = actual.ActualItemId
                JOIN {$itemTable} i WITH (NOLOCK) ON i.item_id = ISNULL(p.item_id, actual.ActualItemId)
                WHERE 1=1 {$whereClause}
            ";

            $stmtSum = $pdo->prepare("
                SELECT
                    COUNT(*) AS total_records,
                    SUM(ISNULL(p.adjusted_planned_quantity, 0)) AS total_plan_qty,
                    SUM(ISNULL(actual.ActualQty, 0)) AS total_actual_qty,
                    SUM(ISNULL(p.adjusted_planned_quantity, 0) * ISNULL(i.Cost_Total, 0)) AS total_plan_cost,
                    SUM(ISNULL(p.adjusted_planned_quantity, 0) * ISNULL(i.Price_USD, 0)) AS total_plan_sale_usd,
                    SUM(ISNULL(p.adjusted_planned_quantity, 0) * ISNULL(i.StandardPrice, 0)) AS total_plan_sale_thb,
                    SUM(ISNULL(actual.ActualQty, 0) * ISNULL(i.Price_USD, 0)) AS total_actual_sale_usd,
                    SUM(ISNULL(actual.ActualQty, 0) * ISNULL(i.StandardPrice, 0)) AS total_actual_sale_thb
                {$baseQuery}
            ");
            foreach ($params as $key => $val) {
                $stmtSum->bindValue($key, $val);
            }
            $stmtSum->execute();
            $summaryRow = $stmtSum->fetch(PDO::FETCH_ASSOC) ?: [];
            $totalRecords = (int)($summaryRow['total_records'] ?? 0);
            $totalPages = max(1, (int)ceil($totalRecords / $limit));

            $dataSql = "
                SELECT
                    ISNULL(p.plan_id, 0) AS plan_id,
                    CONVERT(VARCHAR(10), ISNULL(p.plan_date, actual.ActualDate), 23) AS plan_date,
                    ISNULL(p.line, actual.ActualLine) AS line,
                    ISNULL(p.shift, actual.ActualShift) AS shift,
                    i.item_id,
                    i.sap_no,
                    i.part_no,
                    i.part_description,
                    ISNULL(i.Price_USD, 0) AS price_usd,
                    ISNULL(i.StandardPrice, 0) AS standard_price,
                    ISNULL(i.Cost_Total, 0) AS cost_total,
                    (ISNULL(i.Cost_RM, 0) + ISNULL(i.Cost_PKG, 0) + ISNULL(i.Cost_SUB, 0)) AS cost_rm,
                    ISNULL(i.Cost_DL, 0) AS cost_dl,
                    (ISNULL(i.Cost_OH_Machine, 0) + ISNULL(i.Cost_OH_Utilities, 0) + ISNULL(i.Cost_OH_Indirect, 0) +
                     ISNULL(i.Cost_OH_Staff, 0) + ISNULL(i.Cost_OH_Accessory, 0) + ISNULL(i.Cost_OH_Others, 0)) AS cost_oh,
                    ISNULL(p.original_planned_quantity, 0) AS original_planned_quantity,
                    ISNULL(p.carry_over_quantity, 0) AS carry_over_quantity,
                    ISNULL(p.adjusted_planned_quantity, 0) AS adjusted_planned_quantity,
                    p.note,
                    ISNULL(p.manpower_num, 0) AS manpower_num,
                    ISNULL(p.ot_hours, 0) AS ot_hours,
                    ISNULL(p.total_labor_cost, 0) AS total_labor_cost,
                    p.updated_at,
                    ISNULL(actual.ActualQty, 0) AS actual_quantity
                {$baseQuery}
                ORDER BY
                    plan_date DESC,
                    CASE
                        WHEN ISNULL(p.shift, actual.ActualShift) = 'NIGHT' THEN 1
                        WHEN ISNULL(p.shift, actual.ActualShift) = 'DAY' THEN 2
                        ELSE 3
                    END ASC,
                    line ASC,
                    i.part_no ASC
                OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
            ";
            $stmt = $pdo->prepare($dataSql);
            foreach ($params as $key => $val) {
                $stmt->bindValue($key, $val);
            }
            $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
            $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
            $stmt->execute();
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

            mgmtJsonSuccess([
                'items' => $rows,
                'summary' => $summaryRow,
                'pagination' => [
                    'current_page' => $page,
                    'total_pages' => $totalPages,
                    'total_records' => $totalRecords,
                    'limit' => $limit,
                ],
            ], 'Production plans loaded');
            break;
        }

        case 'save_plan': {
            requireMgmtPlanningAccess(true);
            $planId = (int)($input['plan_id'] ?? 0);
            $planDate = normalizeMgmtDate($input['plan_date'] ?? null, '');
            $line = trim((string)($input['line'] ?? ''));
            $shift = strtoupper(trim((string)($input['shift'] ?? 'DAY')));
            $itemId = (int)($input['item_id'] ?? 0);
            $qty = (float)($input['original_planned_quantity'] ?? 0);
            $carryOver = isset($input['carry_over_quantity']) ? (float)$input['carry_over_quantity'] : 0.0;
            $note = isset($input['note']) ? trim((string)$input['note']) : null;

            if ($planDate === '' || $line === '' || $itemId <= 0 || $qty < 0 || !in_array($shift, ['DAY', 'NIGHT'], true)) {
                mgmtJsonError('ข้อมูลแผนการผลิตไม่ครบถ้วนหรือไม่ถูกต้อง', 400);
            }

            $pdo->beginTransaction();
            if ($planId > 0) {
                $oldStmt = $pdo->prepare("SELECT plan_id, original_planned_quantity, note, line, shift, CONVERT(VARCHAR(10), plan_date, 23) AS plan_date FROM {$planTable} WHERE plan_id = ?");
                $oldStmt->execute([$planId]);
                $oldRow = $oldStmt->fetch(PDO::FETCH_ASSOC);
                if (!$oldRow) {
                    $pdo->rollBack();
                    mgmtJsonError('ไม่พบรายการแผนที่ต้องการแก้ไข', 404);
                }

                $stmt = $pdo->prepare("
                    UPDATE {$planTable}
                    SET original_planned_quantity = :qty, note = :note, updated_by = :usr, updated_at = GETDATE()
                    WHERE plan_id = :id
                ");
                $stmt->execute([
                    ':qty' => $qty,
                    ':note' => $note,
                    ':usr' => $username,
                    ':id' => $planId,
                ]);
                writeLog($pdo, 'UPDATE', 'PLANNING', $planId, $oldRow, ['original_planned_quantity' => $qty, 'note' => $note], 'Updated production plan');
            } else {
                $stmt = $pdo->prepare("
                    INSERT INTO {$planTable} (plan_date, line, shift, item_id, original_planned_quantity, carry_over_quantity, note, updated_by)
                    VALUES (:dt, :ln, :sh, :iid, :qty, :co, :note, :usr)
                ");
                $stmt->execute([
                    ':dt' => $planDate,
                    ':ln' => $line,
                    ':sh' => $shift,
                    ':iid' => $itemId,
                    ':qty' => $qty,
                    ':co' => $carryOver,
                    ':note' => $note,
                    ':usr' => $username,
                ]);
                $newId = $pdo->lastInsertId() ?: "{$planDate}:{$line}:{$itemId}";
                writeLog($pdo, 'CREATE', 'PLANNING', $newId, null, [
                    'plan_date' => $planDate,
                    'line' => $line,
                    'shift' => $shift,
                    'item_id' => $itemId,
                    'original_planned_quantity' => $qty,
                    'carry_over_quantity' => $carryOver,
                ], 'Created production plan');
            }
            $pdo->commit();
            mgmtJsonSuccess(['plan_id' => $planId], 'บันทึกแผนการผลิตสำเร็จ');
            break;
        }

        case 'update_carry_over': {
            requireMgmtPlanningAccess(true);
            $planId = (int)($input['plan_id'] ?? 0);
            $carryOver = (float)($input['carry_over_quantity'] ?? 0);
            if ($planId <= 0) {
                mgmtJsonError('ไม่พบรหัสแผนการผลิต', 400);
            }

            $pdo->beginTransaction();
            $oldStmt = $pdo->prepare("SELECT plan_id, carry_over_quantity FROM {$planTable} WHERE plan_id = ?");
            $oldStmt->execute([$planId]);
            $oldRow = $oldStmt->fetch(PDO::FETCH_ASSOC);
            if (!$oldRow) {
                $pdo->rollBack();
                mgmtJsonError('ไม่พบรายการแผนที่ต้องการแก้ไข', 404);
            }

            $stmt = $pdo->prepare("UPDATE {$planTable} SET carry_over_quantity = ?, updated_by = ?, updated_at = GETDATE() WHERE plan_id = ?");
            $stmt->execute([$carryOver, $username, $planId]);
            writeLog($pdo, 'UPDATE', 'PLANNING', $planId, $oldRow, ['carry_over_quantity' => $carryOver], 'Updated carry over quantity');
            $pdo->commit();

            mgmtJsonSuccess(['plan_id' => $planId, 'carry_over_quantity' => $carryOver], 'อัปเดตยอดยกมา (C/O) สำเร็จ');
            break;
        }

        case 'delete_plan': {
            requireMgmtPlanningAccess(true);
            $planId = (int)($input['plan_id'] ?? 0);
            if ($planId <= 0) {
                mgmtJsonError('ไม่พบรหัสแผนที่ต้องการลบ', 400);
            }

            $pdo->beginTransaction();
            $oldStmt = $pdo->prepare("SELECT plan_id, CONVERT(VARCHAR(10), plan_date, 23) AS plan_date, line, shift, item_id, original_planned_quantity FROM {$planTable} WHERE plan_id = ?");
            $oldStmt->execute([$planId]);
            $oldRow = $oldStmt->fetch(PDO::FETCH_ASSOC);
            if (!$oldRow) {
                $pdo->rollBack();
                mgmtJsonError('ไม่พบรายการแผนที่ต้องการลบ', 404);
            }

            $pdo->prepare("DELETE FROM {$planTable} WHERE plan_id = ?")->execute([$planId]);
            writeLog($pdo, 'DELETE', 'PLANNING', $planId, $oldRow, null, 'Deleted production plan');
            $pdo->commit();

            mgmtJsonSuccess(['plan_id' => $planId], 'ลบแผนการผลิตสำเร็จ');
            break;
        }

        case 'delete_plans_by_range': {
            requireMgmtPlanningAccess(true);
            $delStart = normalizeMgmtDate($input['startDate'] ?? null, '');
            $delEnd = normalizeMgmtDate($input['endDate'] ?? null, '');
            $delLine = trim((string)($input['line'] ?? 'ALL'));

            if ($delStart === '' || $delEnd === '') {
                mgmtJsonError('กรุณาระบุวันที่เริ่มต้นและสิ้นสุด', 400);
            }
            if ($delStart > $delEnd) {
                mgmtJsonError('วันที่เริ่มต้นต้องไม่มากกว่าวันที่สิ้นสุด', 400);
            }

            $pdo->beginTransaction();
            $sql = "DELETE FROM {$planTable} WHERE plan_date BETWEEN :sd AND :ed";
            $params = [':sd' => $delStart, ':ed' => $delEnd];
            if ($delLine !== '' && strtoupper($delLine) !== 'ALL') {
                $sql .= " AND line = :ln";
                $params[':ln'] = $delLine;
            }
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $deletedCount = $stmt->rowCount();

            writeLog($pdo, 'DELETE', 'PLANNING', "{$delStart}_to_{$delEnd}", ['line' => $delLine, 'deleted_count' => $deletedCount], null, 'Deleted plans by range');
            $pdo->commit();

            mgmtJsonSuccess(['deleted_count' => $deletedCount], "ลบแผนการผลิตสำเร็จจำนวน {$deletedCount} รายการ");
            break;
        }

        case 'clear_all_plans': {
            requireMgmtPlanningAccess(true, true);
            $pdo->beginTransaction();
            $count = (int)$pdo->query("SELECT COUNT(*) FROM {$planTable}")->fetchColumn();
            $pdo->exec("DELETE FROM {$planTable}");
            writeLog($pdo, 'DELETE', 'PLANNING', 'ALL', ['cleared_rows' => $count], null, 'Cleared all production plans');
            $pdo->commit();
            mgmtJsonSuccess(['deleted_count' => $count], 'ล้างข้อมูลแผนการผลิตทั้งหมดเรียบร้อยแล้ว');
            break;
        }

        case 'calculate_carry_over': {
            requireMgmtPlanningAccess(true);
            $startDate = date('Y-01-01');
            $endDate = date('Y-m-d', strtotime('+30 days'));
            if (!defined('SP_UPDATE_CARRYOVER')) {
                mgmtJsonError('ไม่พบ Stored Procedure SP_UPDATE_CARRYOVER ในการตั้งค่า', 500);
            }
            $spName = SP_UPDATE_CARRYOVER;
            $options = defined('PDO::SQLSRV_ATTR_QUERY_TIMEOUT')
                ? [PDO::SQLSRV_ATTR_QUERY_TIMEOUT => 600]
                : [PDO::ATTR_TIMEOUT => 600];
            $stmt = $pdo->prepare("EXEC dbo.{$spName} @StartDate = :sd, @EndDate = :ed", $options);
            $stmt->execute([':sd' => $startDate, ':ed' => $endDate]);

            writeLog($pdo, 'UPDATE', 'PLANNING', 'CARRYOVER', null, ['start' => $startDate, 'end' => $endDate], 'Calculated plan carry over');
            mgmtJsonSuccess(['startDate' => $startDate, 'endDate' => $endDate], 'คำนวณยอดยกมา (Carry Over) สำเร็จ');
            break;
        }

        case 'import_plans_bulk': {
            requireMgmtPlanningAccess(true);
            $plans = $input['plans'] ?? [];
            if (!is_array($plans) || count($plans) === 0) {
                mgmtJsonError('ไม่พบข้อมูลสำหรับนำเข้า', 400);
            }
            if (count($plans) > 5000) {
                mgmtJsonError('จำนวนข้อมูลเกินขีดจำกัด (สูงสุด 5,000 รายการต่อครั้ง)', 400);
            }

            $pdo->beginTransaction();
            $stmtFindSap = $pdo->prepare("SELECT TOP 1 item_id FROM {$itemTable} WITH (NOLOCK) WHERE sap_no = ?");
            $stmtFindPart = $pdo->prepare("
                SELECT TOP 1 i.item_id
                FROM {$itemTable} i WITH (NOLOCK)
                JOIN {$routesTable} r WITH (NOLOCK) ON i.item_id = r.item_id
                WHERE i.part_no = ? AND r.line = ?
            ");
            $stmtFindPartFallback = $pdo->prepare("SELECT TOP 1 item_id FROM {$itemTable} WITH (NOLOCK) WHERE part_no = ?");

            $stmtMerge = $pdo->prepare("
                MERGE INTO {$planTable} AS T
                USING (VALUES (:plan_date, :line, :shift, :item_id, :qty, :user_update))
                AS S (plan_date, line, shift, item_id, qty, user_update)
                ON (T.plan_date = S.plan_date AND T.line = S.line AND T.shift = S.shift AND T.item_id = S.item_id)
                WHEN MATCHED THEN
                    UPDATE SET original_planned_quantity = S.qty, updated_by = S.user_update, updated_at = GETDATE()
                WHEN NOT MATCHED THEN
                    INSERT (plan_date, line, shift, item_id, original_planned_quantity, carry_over_quantity, updated_by)
                    VALUES (S.plan_date, S.line, S.shift, S.item_id, S.qty, 0, S.user_update);
            ");

            $imported = 0;
            $errors = [];
            foreach ($plans as $idx => $row) {
                $itemCode = trim((string)($row['item_code'] ?? ''));
                $targetLine = trim((string)($row['line'] ?? ''));
                $rowDate = normalizeMgmtDate($row['date'] ?? null, '');
                $rowShift = strtoupper(trim((string)($row['shift'] ?? 'DAY')));
                $qty = (float)($row['qty'] ?? 0);

                if ($itemCode === '' || $targetLine === '' || $rowDate === '' || $qty <= 0 || !in_array($rowShift, ['DAY', 'NIGHT'], true)) {
                    $errors[] = 'Row ' . ($idx + 1) . ': ข้อมูลไม่ครบถ้วนหรือจำนวน <= 0';
                    continue;
                }

                $stmtFindSap->execute([$itemCode]);
                $itemId = $stmtFindSap->fetchColumn();
                if (!$itemId) {
                    $stmtFindPart->execute([$itemCode, $targetLine]);
                    $itemId = $stmtFindPart->fetchColumn();
                }
                if (!$itemId) {
                    $stmtFindPartFallback->execute([$itemCode]);
                    $itemId = $stmtFindPartFallback->fetchColumn();
                }

                if ($itemId) {
                    $stmtMerge->execute([
                        ':plan_date' => $rowDate,
                        ':line' => $targetLine,
                        ':shift' => $rowShift,
                        ':item_id' => (int)$itemId,
                        ':qty' => $qty,
                        ':user_update' => $username,
                    ]);
                    $imported++;
                } else {
                    $errors[] = 'Row ' . ($idx + 1) . ": ไม่พบรหัส '{$itemCode}' สำหรับไลน์ '{$targetLine}'";
                }
            }

            writeLog($pdo, 'IMPORT', 'PLANNING', 'BULK_IMPORT', null, ['imported' => $imported, 'skipped' => count($errors)], 'Imported bulk production plans');
            $pdo->commit();

            $msg = "นำเข้าแผนสำเร็จ {$imported} รายการ" . (count($errors) > 0 ? ' (ข้าม ' . count($errors) . ' รายการ)' : '');
            mgmtJsonSuccess(['imported' => $imported, 'errors' => array_slice($errors, 0, 50)], $msg);
            break;
        }

        case 'auto_create_plan': {
            requireMgmtPlanningAccess(true);
            $filterType = strtoupper(trim((string)($input['filterType'] ?? 'DATE')));
            $startDate = trim((string)($input['startDate'] ?? ''));
            $endDate = trim((string)($input['endDate'] ?? ''));
            $startWeek = trim((string)($input['startWeek'] ?? ''));
            $endWeek = trim((string)($input['endWeek'] ?? ''));
            $planStart = normalizeMgmtDate($input['planStartDate'] ?? date('Y-m-d'), date('Y-m-d'));
            $planEnd = !empty($input['planEndDate']) ? normalizeMgmtDate($input['planEndDate'], '') : null;
            $planMode = strtoupper(trim((string)($input['planRangeMode'] ?? 'OPEN')));
            $setupTime = (float)($input['setupTime'] ?? 0);
            $otHours = (float)($input['otHours'] ?? 0);
            $totalOtBudget = (float)($input['totalOTBudget'] ?? 0);
            $shiftMode = strtoupper(trim((string)($input['shiftMode'] ?? 'DAY')));
            $overwrite = !empty($input['overwrite']) ? 1 : 0;
            $workOnSunday = !empty($input['workOnSunday']) ? 1 : 0;
            $allowedOtDays = preg_replace('/[^0-9,]/', '', (string)($input['allowedOTDays'] ?? '1,2,3,4,5'));

            if (!defined('SP_AUTO_GENERATE_PLAN')) {
                mgmtJsonError('ไม่พบ Stored Procedure SP_AUTO_GENERATE_PLAN', 500);
            }
            $spName = SP_AUTO_GENERATE_PLAN;
            $stmt = $pdo->prepare("
                EXEC dbo.{$spName}
                    @FilterType = :ftype,
                    @StartDate = :start,
                    @EndDate = :end,
                    @StartWeek = :sweek,
                    @EndWeek = :eweek,
                    @PlanStartDate = :pstart,
                    @PlanEndDate = :pend,
                    @PlanRangeMode = :pmode,
                    @ShiftMode = :mode,
                    @SetupTimeHrs = :setup,
                    @OTHours = :ot,
                    @TotalOTBudget = :ot_budget,
                    @WorkOnSunday = :sunday,
                    @Overwrite = :ow,
                    @User = :usr,
                    @AllowedOTDays = :ot_days
            ");
            $stmt->execute([
                ':ftype' => $filterType,
                ':start' => $startDate === '' ? null : $startDate,
                ':end' => $endDate === '' ? null : $endDate,
                ':sweek' => $startWeek === '' ? null : $startWeek,
                ':eweek' => $endWeek === '' ? null : $endWeek,
                ':pstart' => $planStart,
                ':pend' => $planEnd,
                ':pmode' => $planMode,
                ':mode' => $shiftMode,
                ':setup' => $setupTime,
                ':ot' => $otHours,
                ':ot_budget' => $totalOtBudget,
                ':sunday' => $workOnSunday,
                ':ow' => $overwrite,
                ':usr' => $username,
                ':ot_days' => $allowedOtDays,
            ]);
            $res = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$res || (int)($res['success'] ?? 0) !== 1) {
                mgmtJsonError($res['message'] ?? 'ไม่พบข้อมูลออเดอร์ที่จะสร้างแผน หรือเกิดข้อผิดพลาด', 400);
            }

            writeLog($pdo, 'CREATE', 'PLANNING', 'APS_AUTO_PLAN', null, [
                'filterType' => $filterType,
                'planStart' => $planStart,
                'shiftMode' => $shiftMode,
                'overwrite' => $overwrite,
            ], 'Executed APS Auto Plan Wizard');

            mgmtJsonSuccess([
                'unplanned_qty' => (float)($res['unplanned_qty'] ?? 0),
                'delayed_details_json' => $res['delayed_details_json'] ?? '[]',
                'ot_summary_json' => $res['ot_summary_json'] ?? '[]',
            ], (string)($res['message'] ?? 'สร้างแผนอัตโนมัติสำเร็จ'));
            break;
        }

        default:
            mgmtJsonError("Invalid action: {$action}", 400);
    }
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    writeErrorLog($pdo ?? null, 'MGMT_PLANNING', $e->getMessage(), ['action' => $action]);
    mgmtJsonError('ไม่สามารถประมวลผลข้อมูลแผนการผลิตได้ กรุณาลองใหม่อีกครั้ง', 500);
}
