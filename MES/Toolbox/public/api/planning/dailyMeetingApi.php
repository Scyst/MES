<?php
/**
 * Self-contained Daily Command Center (Morning Meeting & Production Planning) API.
 * Integrates MANPOWER_DAILY_LOGS, PRODUCTION_PLANS, STOCK_TRANSACTIONS, INVENTORY_ONHAND,
 * SALES_ORDERS loading schedule, and DAILY_MEETINGS notes/actions/tracking JSON.
 */

require_once __DIR__ . '/_common.php';

$input = [];
try {
    [$action, $input, $currentUser] = parsePlanningRequest('get_meeting');
    $userId = (int)$currentUser['id'];
    $updatedBy = trim((string)($currentUser['username'] ?? 'SYSTEM'));

    switch ($action) {
        case 'get_meeting':
            requirePlanningAccess(false);
            $date = parsePlanningDate($input['date'] ?? null, date('Y-m-d'));
            $shift = strtoupper(trim((string)($input['shift'] ?? 'DAY')));
            if (!in_array($shift, ['DAY', 'NIGHT', 'ALL'], true)) {
                $shift = 'DAY';
            }

            // 1. Live Manpower Req vs Act by line
            $reqMap = [];
            $reqStmt = $pdo->query("SELECT line, COUNT(*) AS req FROM dbo.MANPOWER_EMPLOYEES WITH (NOLOCK) WHERE is_active = 1 AND line IS NOT NULL AND line != '' GROUP BY line");
            while ($r = $reqStmt->fetch(PDO::FETCH_ASSOC)) {
                $reqMap[$r['line']] = (int)$r['req'];
            }

            $shiftNameParam = ($shift === 'NIGHT') ? 'Night' : 'Day';
            $mpSql = "
                SELECT
                    ISNULL(L.actual_line, E.line) AS line,
                    COUNT(DISTINCT CASE WHEN L.status IN ('PRESENT', 'LATE') THEN L.emp_id END) AS act
                FROM dbo.MANPOWER_DAILY_LOGS L WITH (NOLOCK)
                JOIN dbo.MANPOWER_EMPLOYEES E WITH (NOLOCK) ON L.emp_id = E.emp_id
                LEFT JOIN dbo.MANPOWER_SHIFTS S WITH (NOLOCK) ON ISNULL(L.shift_id, E.default_shift_id) = S.shift_id
                WHERE L.log_date = ?
                  " . ($shift !== 'ALL' ? "AND S.shift_name = ?" : '') . "
                GROUP BY ISNULL(L.actual_line, E.line)
            ";
            $mpStmt = $pdo->prepare($mpSql);
            $mpStmt->execute($shift !== 'ALL' ? [$date, $shiftNameParam] : [$date]);
            $manpowerMap = [];
            while ($r = $mpStmt->fetch(PDO::FETCH_ASSOC)) {
                $ln = $r['line'] ?? '';
                if ($ln === '') {
                    continue;
                }
                $manpowerMap[$ln] = [
                    'act' => (int)$r['act'],
                    'req' => $reqMap[$ln] ?? 0,
                ];
            }

            // 2. Auto Production Plan vs Actual + Live Stock
            $planSql = "
                SELECT TOP (300)
                    P.plan_id,
                    P.line,
                    P.shift,
                    P.item_id,
                    I.part_no,
                    I.sap_no,
                    I.sku,
                    I.part_description,
                    I.min_stock,
                    CAST(ISNULL(P.original_planned_quantity, 0) AS FLOAT) AS plan_qty,
                    CAST(ISNULL(P.adjusted_planned_quantity, ISNULL(P.original_planned_quantity, 0)) AS FLOAT) AS adj_qty,
                    CAST(ISNULL((
                        SELECT SUM(T.quantity)
                        FROM dbo.STOCK_TRANSACTIONS T WITH (NOLOCK)
                        WHERE T.parameter_id = P.item_id
                          AND T.transaction_type LIKE 'PRODUCTION_%'
                          AND COALESCE(T.ProductionDate, CAST(DATEADD(HOUR, -8, T.transaction_timestamp) AS DATE)) = P.plan_date
                    ), 0) AS FLOAT) AS actual_qty,
                    CAST(ISNULL((
                        SELECT SUM(O.quantity)
                        FROM dbo.INVENTORY_ONHAND O WITH (NOLOCK)
                        WHERE O.parameter_id = P.item_id
                    ), 0) AS FLOAT) AS current_stock
                FROM dbo.PRODUCTION_PLANS P WITH (NOLOCK)
                LEFT JOIN dbo.ITEMS I WITH (NOLOCK) ON P.item_id = I.item_id
                WHERE P.plan_date = ?
                  " . ($shift !== 'ALL' ? 'AND P.shift = ?' : '') . "
                ORDER BY P.line ASC, I.part_no ASC
            ";
            $planStmt = $pdo->prepare($planSql);
            $planStmt->execute($shift !== 'ALL' ? [$date, $shift] : [$date]);
            $plans = $planStmt->fetchAll(PDO::FETCH_ASSOC);

            foreach ($plans as &$p) {
                $ln = $p['line'] ?? '';
                $p['mp_act'] = $manpowerMap[$ln]['act'] ?? 0;
                $p['mp_req'] = $manpowerMap[$ln]['req'] ?? ($reqMap[$ln] ?? 0);
            }
            unset($p);

            // 3. Loading Plan (Sales Orders next 7 days from target date)
            $endLoadDate = date('Y-m-d', strtotime('+7 days', strtotime($date)));
            $loadSql = "
                SELECT TOP (100)
                    S.id,
                    S.po_number,
                    S.sku,
                    S.description,
                    S.quantity,
                    CONVERT(VARCHAR(10), S.loading_date, 120) AS loading_date,
                    S.loading_status,
                    S.production_status,
                    S.inspection_status,
                    S.dc_location,
                    S.container_no,
                    I.part_no,
                    CAST(ISNULL((SELECT SUM(O.quantity) FROM dbo.INVENTORY_ONHAND O WITH (NOLOCK) WHERE O.parameter_id = I.item_id), 0) AS FLOAT) AS onhand_qty
                FROM dbo.SALES_ORDERS S WITH (NOLOCK)
                LEFT JOIN dbo.ITEMS I WITH (NOLOCK) ON S.sku = I.sku
                WHERE S.loading_date BETWEEN ? AND ?
                ORDER BY S.loading_date ASC, S.po_number ASC
            ";
            $loadStmt = $pdo->prepare($loadSql);
            $loadStmt->execute([$date, $endLoadDate]);
            $loadingPlans = $loadStmt->fetchAll(PDO::FETCH_ASSOC);

            // 4. Stock Shortage Watchlist (ITEMS where onhand < min_stock)
            $shortageSql = "
                SELECT TOP (80)
                    I.item_id, I.sap_no, I.part_no, I.part_description, I.sku,
                    CAST(I.min_stock AS FLOAT) AS min_stock,
                    CAST(ISNULL(SUM(O.quantity), 0) AS FLOAT) AS onhand_qty
                FROM dbo.ITEMS I WITH (NOLOCK)
                LEFT JOIN dbo.INVENTORY_ONHAND O WITH (NOLOCK) ON I.item_id = O.parameter_id
                WHERE I.is_active = 1 AND I.min_stock > 0
                GROUP BY I.item_id, I.sap_no, I.part_no, I.part_description, I.sku, I.min_stock
                HAVING ISNULL(SUM(O.quantity), 0) < I.min_stock
                ORDER BY (I.min_stock - ISNULL(SUM(O.quantity), 0)) DESC
            ";
            $shortages = $pdo->query($shortageSql)->fetchAll(PDO::FETCH_ASSOC);

            // 5. Saved DAILY_MEETINGS record
            $meetingShift = ($shift === 'ALL') ? 'DAY' : $shift;
            $meetStmt = $pdo->prepare("
                SELECT TOP 1
                    meeting_id,
                    CONVERT(VARCHAR(10), meeting_date, 120) AS meeting_date,
                    shift,
                    meeting_type,
                    CONVERT(VARCHAR(5), meeting_time, 108) AS meeting_time,
                    safety_talk,
                    manpower_update,
                    production_plan,
                    machine_status,
                    general_note,
                    action_plan_json,
                    production_tracking_json,
                    stock_notes_json,
                    loading_plan_json,
                    updated_at
                FROM dbo.DAILY_MEETINGS WITH (NOLOCK)
                WHERE meeting_date = ? AND shift = ?
            ");
            $meetStmt->execute([$date, $meetingShift]);
            $meeting = $meetStmt->fetch(PDO::FETCH_ASSOC) ?: null;

            // 6. Recent History (TOP 25)
            $history = $pdo->query("
                SELECT TOP (25)
                    meeting_id,
                    CONVERT(VARCHAR(10), meeting_date, 120) AS meeting_date,
                    shift,
                    CONVERT(VARCHAR(5), meeting_time, 108) AS meeting_time,
                    general_note,
                    updated_at
                FROM dbo.DAILY_MEETINGS WITH (NOLOCK)
                ORDER BY meeting_date DESC, updated_at DESC
            ")->fetchAll(PDO::FETCH_ASSOC);

            planJsonSuccess([
                'date' => $date,
                'shift' => $shift,
                'meeting' => $meeting,
                'plans' => $plans,
                'manpower_map' => $manpowerMap,
                'loading_plans' => $loadingPlans,
                'shortages' => $shortages,
                'history' => $history,
            ]);

        case 'get_master_lines':
            requirePlanningAccess(false);
            $lines = $pdo->query("SELECT DISTINCT line FROM dbo.PRODUCTION_PLANS WITH (NOLOCK) WHERE line IS NOT NULL AND line != '' ORDER BY line ASC")->fetchAll(PDO::FETCH_COLUMN);
            if (empty($lines)) {
                $lines = $pdo->query("SELECT DISTINCT line FROM dbo.MANPOWER_EMPLOYEES WITH (NOLOCK) WHERE is_active = 1 AND line IS NOT NULL AND line != '' ORDER BY line ASC")->fetchAll(PDO::FETCH_COLUMN);
            }
            planJsonSuccess(['lines' => $lines]);

        case 'search_items':
            requirePlanningAccess(false);
            $q = trim((string)($input['q'] ?? ''));
            $like = '%' . $q . '%';
            $stmt = $pdo->prepare("
                SELECT TOP (30) item_id, sap_no, part_no, part_description, sku
                FROM dbo.ITEMS WITH (NOLOCK)
                WHERE is_active = 1
                  AND (? = '' OR part_no LIKE ? OR sap_no LIKE ? OR part_description LIKE ? OR sku LIKE ?)
                ORDER BY part_no ASC
            ");
            $stmt->execute([$q, $like, $like, $like, $like]);
            planJsonSuccess($stmt->fetchAll(PDO::FETCH_ASSOC));

        case 'save_meeting':
            requirePlanningAccess(true);
            $date = parsePlanningDate($input['meeting_date'] ?? ($input['date'] ?? null), date('Y-m-d'));
            $shift = strtoupper(trim((string)($input['shift'] ?? 'DAY')));
            if (!in_array($shift, ['DAY', 'NIGHT'], true)) {
                $shift = 'DAY';
            }
            $meetingType = trim((string)($input['meeting_type'] ?? 'MORNING_BRIEF'));
            $meetingTime = trim((string)($input['meeting_time'] ?? '08:00'));
            if (!preg_match('/^\d{2}:\d{2}(:\d{2})?$/', $meetingTime)) {
                $meetingTime = '08:00:00';
            }
            $safetyTalk = (string)($input['safety_talk'] ?? '');
            $manpowerUpdate = (string)($input['manpower_update'] ?? '');
            $productionPlan = (string)($input['production_plan'] ?? '');
            $machineStatus = (string)($input['machine_status'] ?? '');
            $generalNote = (string)($input['general_note'] ?? '');

            $encodeJson = static function ($val): string {
                if (is_string($val)) {
                    $decoded = json_decode($val, true);
                    return is_array($decoded) ? json_encode($decoded, JSON_UNESCAPED_UNICODE) : '[]';
                }
                return is_array($val) ? json_encode($val, JSON_UNESCAPED_UNICODE) : '[]';
            };
            $actionJson = $encodeJson($input['action_plan_json'] ?? ($input['actions'] ?? []));
            $trackingJson = $encodeJson($input['production_tracking_json'] ?? ($input['tracking'] ?? []));
            $stockNotesJson = $encodeJson($input['stock_notes_json'] ?? ($input['stock_notes'] ?? []));
            $loadingJson = $encodeJson($input['loading_plan_json'] ?? ($input['loading_notes'] ?? []));

            $check = $pdo->prepare('SELECT TOP 1 meeting_id, general_note, action_plan_json FROM dbo.DAILY_MEETINGS WHERE meeting_date = ? AND shift = ?');
            $check->execute([$date, $shift]);
            $oldRow = $check->fetch(PDO::FETCH_ASSOC);

            $pdo->beginTransaction();
            if ($oldRow) {
                $pdo->prepare("
                    UPDATE dbo.DAILY_MEETINGS
                    SET meeting_type = ?, meeting_time = ?, safety_talk = ?, manpower_update = ?,
                        production_plan = ?, machine_status = ?, general_note = ?,
                        action_plan_json = ?, production_tracking_json = ?, stock_notes_json = ?, loading_plan_json = ?,
                        updated_at = GETDATE()
                    WHERE meeting_id = ?
                ")->execute([
                    $meetingType, $meetingTime, $safetyTalk, $manpowerUpdate,
                    $productionPlan, $machineStatus, $generalNote,
                    $actionJson, $trackingJson, $stockNotesJson, $loadingJson,
                    $oldRow['meeting_id'],
                ]);
                $meetingId = (int)$oldRow['meeting_id'];
            } else {
                $pdo->prepare("
                    INSERT INTO dbo.DAILY_MEETINGS
                    (meeting_date, shift, meeting_type, meeting_time, safety_talk, manpower_update, production_plan, machine_status, general_note, action_plan_json, production_tracking_json, stock_notes_json, loading_plan_json, created_by, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, GETDATE(), GETDATE())
                ")->execute([
                    $date, $shift, $meetingType, $meetingTime, $safetyTalk, $manpowerUpdate,
                    $productionPlan, $machineStatus, $generalNote, $actionJson, $trackingJson, $stockNotesJson, $loadingJson, $userId,
                ]);
                $meetingId = (int)$pdo->lastInsertId();
            }
            writeLog($pdo, $oldRow ? 'UPDATE' : 'CREATE', 'DAILY_MEETING', (string)$meetingId, $oldRow ?: null, ['date' => $date, 'shift' => $shift], "Saved daily meeting {$date} ({$shift})");
            $pdo->commit();
            planJsonSuccess(['meeting_id' => $meetingId], 'บันทึกข้อมูลประชุมและแผนงานประจำวันเรียบร้อยแล้ว');

        case 'add_plan':
            requirePlanningAccess(true);
            $date = parsePlanningDate($input['plan_date'] ?? null, date('Y-m-d'));
            $line = trim((string)($input['line'] ?? ''));
            $shift = strtoupper(trim((string)($input['shift'] ?? 'DAY')));
            $itemId = (int)($input['item_id'] ?? 0);
            $qty = round((float)($input['qty'] ?? 0), 3);

            if ($line === '' || $itemId <= 0 || $qty <= 0) {
                throw new InvalidArgumentException('กรุณาระบุ Line, รายการสินค้า และจำนวนแผนผลิต (> 0)');
            }

            $pdo->beginTransaction();
            $pdo->prepare("
                INSERT INTO dbo.PRODUCTION_PLANS
                (plan_date, line, shift, item_id, original_planned_quantity, carry_over_quantity, note, created_at, updated_at, updated_by)
                VALUES (?, ?, ?, ?, ?, 0, ?, GETDATE(), GETDATE(), ?)
            ")->execute([$date, $line, $shift, $itemId, $qty, trim((string)($input['note'] ?? '')), $updatedBy]);
            $newId = (int)$pdo->lastInsertId();
            writeLog($pdo, 'CREATE', 'PRODUCTION_PLAN', (string)$newId, null, ['plan_date' => $date, 'line' => $line, 'shift' => $shift, 'item_id' => $itemId, 'qty' => $qty], 'Added production plan from Daily Command Center');
            $pdo->commit();
            planJsonSuccess(['plan_id' => $newId], 'เพิ่มแผนการผลิตเรียบร้อยแล้ว');

        case 'update_plan_qty':
            requirePlanningAccess(true);
            $planId = (int)($input['plan_id'] ?? 0);
            $newOriginalQty = round((float)($input['original_qty'] ?? ($input['qty'] ?? -1)), 3);
            if ($planId <= 0 || $newOriginalQty < 0) {
                throw new InvalidArgumentException('รหัสแผนหรือจำนวนแผนผลิตไม่ถูกต้อง');
            }
            $oldStmt = $pdo->prepare('SELECT plan_id, original_planned_quantity, carry_over_quantity, adjusted_planned_quantity FROM dbo.PRODUCTION_PLANS WHERE plan_id = ?');
            $oldStmt->execute([$planId]);
            $oldRow = $oldStmt->fetch(PDO::FETCH_ASSOC);
            if (!$oldRow) {
                throw new InvalidArgumentException('ไม่พบแผนการผลิต');
            }
            $carryOver = array_key_exists('carry_over_qty', $input)
                ? round((float)$input['carry_over_qty'], 3)
                : round((float)$oldRow['carry_over_quantity'], 3);

            $pdo->beginTransaction();
            $pdo->prepare('UPDATE dbo.PRODUCTION_PLANS SET original_planned_quantity = ?, carry_over_quantity = ?, updated_at = GETDATE(), updated_by = ? WHERE plan_id = ?')
                ->execute([$newOriginalQty, $carryOver, $updatedBy, $planId]);
            writeLog($pdo, 'UPDATE', 'PRODUCTION_PLAN', (string)$planId, $oldRow, ['original_planned_quantity' => $newOriginalQty, 'carry_over_quantity' => $carryOver], 'Updated plan quantity');
            $pdo->commit();
            planJsonSuccess(null, 'อัปเดตจำนวนแผนการผลิตเรียบร้อยแล้ว');

        default:
            throw new InvalidArgumentException('ไม่พบคำสั่งที่ระบุ');
    }
} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    writeErrorLog($pdo, 'PLANNING_MEETING_API', $e->getMessage(), $input);
    $httpCode = $e instanceof InvalidArgumentException ? 400 : 500;
    $msg = $e instanceof InvalidArgumentException ? $e->getMessage() : 'เกิดข้อผิดพลาดในการประมวลผลข้อมูลวางแผน';
    planJsonError($msg, $httpCode);
}
