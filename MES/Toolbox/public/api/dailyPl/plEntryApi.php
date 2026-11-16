<?php
/**
 * Self-contained Daily P&L Entry, Monthly Targets, Statement (Yearly/Daily),
 * Executive P&L Summary, Exchange/Container Rates, and Holiday Calendar API.
 * Replaces legacy page/dailyPL/api/manage_pl_entry.php.
 */

require_once __DIR__ . '/_common.php';

$action = '';
$input = [];
try {
    [$action, $input, $currentUser] = parsePlRequest('read');
    $userName = trim((string)($currentUser['username'] ?? 'SYSTEM'));

    switch ($action) {
        case 'get_active_lines': {
            requirePlAccess(false);
            $team = strtoupper(trim((string)($input['team'] ?? 'ALL')));
            if ($team !== '' && $team !== 'ALL') {
                $stmt = $pdo->prepare("
                    SELECT DISTINCT E.line
                    FROM " . MANPOWER_EMPLOYEES_TABLE . " E WITH (NOLOCK)
                    LEFT JOIN dbo.MANPOWER_TEAM_SETTINGS TS WITH (NOLOCK) ON E.department_api = TS.department_api
                    WHERE E.is_active = 1 AND TS.hc_group = :team
                      AND E.line IS NOT NULL AND E.line <> '' AND E.line <> 'ALL'
                    ORDER BY E.line
                ");
                $stmt->execute([':team' => $team]);
            } else {
                $stmt = $pdo->query("
                    SELECT DISTINCT line FROM (
                        SELECT line FROM " . MANPOWER_EMPLOYEES_TABLE . " WITH (NOLOCK) WHERE is_active = 1
                        UNION
                        SELECT line FROM " . MANUAL_COSTS_TABLE . " WITH (NOLOCK)
                    ) AS AllLines
                    WHERE line IS NOT NULL AND line <> '' AND line <> 'ALL'
                    ORDER BY line
                ");
            }
            $lines = $stmt->fetchAll(PDO::FETCH_COLUMN) ?: [];
            array_unshift($lines, 'ALL');
            plJsonSuccess($lines, 'Active lines loaded');
            break;
        }

        case 'read': {
            requirePlAccess(false);
            $date = normalizePlDate($input['entry_date'] ?? date('Y-m-d'), date('Y-m-d'));
            $section = trim((string)($input['section'] ?? 'ALL'));
            $team = trim((string)($input['team'] ?? 'ALL'));
            if ($section === '') {
                $section = 'ALL';
            }

            $lockStmt = $pdo->prepare("SELECT ISNULL(is_locked, 0) FROM dbo.DAILY_PL_STATUS WITH (NOLOCK) WHERE entry_date = :d AND section_name = :s");
            $lockStmt->execute([':d' => $date, ':s' => $section]);
            $isLocked = (int)$lockStmt->fetchColumn();

            $stmt = $pdo->prepare("EXEC dbo." . SP_GET_PL_ENTRY . " :date, :section, :team");
            $stmt->execute([':date' => $date, ':section' => $section, ':team' => $team]);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

            foreach ($rows as &$row) {
                $row['actual_amount'] = (float)($row['actual_amount'] ?? 0);
                $row['daily_target'] = (float)($row['daily_target'] ?? 0);
                $row['monthly_budget'] = (float)($row['monthly_budget'] ?? 0);
                $row['item_level'] = (int)($row['item_level'] ?? 0);
                $row['item_id'] = (int)($row['item_id'] ?? 0);
                $row['parent_id'] = is_numeric($row['parent_id'] ?? null) ? (int)$row['parent_id'] : null;
                $row['is_locked'] = $isLocked;
            }
            unset($row);

            plJsonSuccess([
                'items' => $rows,
                'is_locked' => $isLocked,
                'can_manage' => hasPermission('manage_pl') || hasRole(['creator', 'admin']),
            ], 'Daily P&L entry loaded');
            break;
        }

        case 'save':
        case 'save_batch': {
            requirePlAccess(true);
            $date = normalizePlDate($input['entry_date'] ?? null, '');
            $section = trim((string)($input['section'] ?? ''));
            $rawItems = $input['items'] ?? [];
            $itemsJson = is_array($rawItems) ? json_encode($rawItems, JSON_UNESCAPED_UNICODE) : trim((string)$rawItems);

            if ($date === '' || $section === '') {
                plJsonError('กรุณาระบุวันที่และไลน์ผลิต/แผนกให้ครบถ้วน', 400);
            }
            $decodedItems = json_decode($itemsJson, true);
            if (!is_array($decodedItems)) {
                plJsonError('รูปแบบรายการ P&L ไม่ถูกต้อง', 400);
            }

            $checkLock = $pdo->prepare("SELECT ISNULL(is_locked, 0) FROM dbo.DAILY_PL_STATUS WITH (NOLOCK) WHERE entry_date = :d AND section_name = :s");
            $checkLock->execute([':d' => $date, ':s' => $section]);
            if ((int)$checkLock->fetchColumn() === 1) {
                plJsonError('ช่วงเวลานี้ถูกล็อกแล้ว ไม่สามารถบันทึกการเปลี่ยนแปลงได้', 403);
            }

            $stmtOld = $pdo->prepare("SELECT item_id, actual_amount, remark FROM " . DAILY_PL_ENTRIES_TABLE . " WITH (NOLOCK) WHERE entry_date = :d AND section_name = :s");
            $stmtOld->execute([':d' => $date, ':s' => $section]);
            $oldSnapshot = $stmtOld->fetchAll(PDO::FETCH_ASSOC) ?: [];

            $stmt = $pdo->prepare("EXEC dbo.sp_UpsertDailyPLEntry_Batch :date, :sect, :items, :usr");
            $stmt->execute([
                ':date' => $date,
                ':sect' => $section,
                ':items' => $itemsJson,
                ':usr' => $userName,
            ]);

            writeLog($pdo, 'UPDATE', 'DAILY_PL', "{$date}_{$section}", ['count' => count($oldSnapshot)], ['updated_items' => count($decodedItems)], 'Saved daily P&L entries');
            plJsonSuccess(['saved_count' => count($decodedItems)], 'บันทึกข้อมูล P&L เรียบร้อยแล้ว');
            break;
        }

        case 'toggle_lock': {
            requirePlAccess(true);
            $date = normalizePlDate($input['entry_date'] ?? null, '');
            $section = trim((string)($input['section'] ?? ''));
            if ($date === '' || $section === '') {
                plJsonError('กรุณาระบุวันที่และส่วนงาน', 400);
            }

            $stmt = $pdo->prepare("EXEC dbo.sp_TogglePLLock :date, :sect, :usr");
            $stmt->execute([':date' => $date, ':sect' => $section, ':usr' => $userName]);
            $res = $stmt->fetch(PDO::FETCH_ASSOC);
            $newLock = (int)($res['is_locked'] ?? 0);

            writeLog($pdo, $newLock ? 'LOCK' : 'UNLOCK', 'DAILY_PL', "{$date}_{$section}", ['is_locked' => $newLock ? 0 : 1], ['is_locked' => $newLock], 'Toggled P&L daily period lock');
            plJsonSuccess(['is_locked' => $newLock], $newLock ? 'ล็อกข้อมูลประจำวันแล้ว' : 'ปลดล็อกข้อมูลประจำวันแล้ว');
            break;
        }

        case 'get_working_days': {
            requirePlAccess(false);
            $year = (int)($input['year'] ?? 0);
            $month = (int)($input['month'] ?? 0);
            if ($year <= 2000 || $month < 1 || $month > 12) {
                plJsonSuccess(['days' => 25, 'actual_days' => 25], 'Default working days');
            }

            $stmt = $pdo->prepare("EXEC dbo." . SP_GET_WORKING_DAYS . " :year, :month");
            $stmt->execute([':year' => $year, ':month' => $month]);
            $res = $stmt->fetch(PDO::FETCH_ASSOC);
            $baseDays = (int)($res['working_days'] ?? 25);

            $stmtSat = $pdo->prepare("
                SELECT COUNT(*)
                FROM " . MANPOWER_CALENDAR_TABLE . " WITH (NOLOCK)
                WHERE YEAR(calendar_date) = :year
                  AND MONTH(calendar_date) = :month
                  AND DATENAME(weekday, calendar_date) = 'Saturday'
                  AND day_type NOT IN ('HOLIDAY', 'SUNDAY', 'OFFDAY')
            ");
            $stmtSat->execute([':year' => $year, ':month' => $month]);
            $satCount = (int)$stmtSat->fetchColumn();

            $plWorkingDays = max(1, $baseDays - $satCount);
            plJsonSuccess(['days' => $plWorkingDays, 'actual_days' => $baseDays], 'Working days loaded');
            break;
        }

        case 'get_target_data': {
            requirePlAccess(false);
            $year = (int)($input['year'] ?? 0);
            $month = (int)($input['month'] ?? 0);
            $section = trim((string)($input['section'] ?? 'ALL'));

            $stmt = $pdo->prepare("SELECT item_id, target_amount FROM " . MONTHLY_PL_TARGETS_TABLE . " WITH (NOLOCK) WHERE year_val = :y AND month_val = :m AND section_name = :s");
            $stmt->execute([':y' => $year, ':m' => $month, ':s' => $section]);
            $rows = $stmt->fetchAll(PDO::FETCH_KEY_PAIR) ?: [];
            $formatted = [];
            foreach ($rows as $itemId => $amount) {
                $formatted[(string)$itemId] = (float)$amount;
            }
            plJsonSuccess(empty($formatted) ? new stdClass() : $formatted, 'Monthly target loaded');
            break;
        }

        case 'save_target': {
            requirePlAccess(true);
            $year = (int)($input['year'] ?? 0);
            $month = (int)($input['month'] ?? 0);
            $section = trim((string)($input['section'] ?? 'ALL'));
            $rawItems = $input['items'] ?? [];
            $itemsJson = is_array($rawItems) ? json_encode($rawItems, JSON_UNESCAPED_UNICODE) : trim((string)$rawItems);

            if ($year < 2000 || $month < 1 || $month > 12 || $section === '') {
                plJsonError('ปี เดือน หรือส่วนงานไม่ถูกต้อง', 400);
            }
            if (!is_array(json_decode($itemsJson, true))) {
                plJsonError('รูปแบบข้อมูลงบประมาณไม่ถูกต้อง', 400);
            }

            $stmt = $pdo->prepare("EXEC dbo." . SP_SAVE_MONTHLY_TARGET . " :year, :month, :section, :items, :usr");
            $stmt->execute([
                ':year' => $year,
                ':month' => $month,
                ':section' => $section,
                ':items' => $itemsJson,
                ':usr' => $userName,
            ]);
            $res = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$res || (int)($res['success'] ?? 0) !== 1) {
                plJsonError($res['message'] ?? 'ไม่สามารถบันทึกงบประมาณรายเดือนได้', 500);
            }

            writeLog($pdo, 'UPDATE', 'DAILY_PL_TARGET', "{$year}-{$month}-{$section}", null, ['working_days' => $res['working_days_used'] ?? 0], 'Saved monthly P&L budget targets');
            plJsonSuccess(['working_days' => (int)($res['working_days_used'] ?? 24)], 'บันทึกเป้าหมายงบประมาณรายเดือนสำเร็จ');
            break;
        }

        case 'report_range': {
            requirePlAccess(false);
            $start = normalizePlDate($input['start_date'] ?? null, '');
            $end = normalizePlDate($input['end_date'] ?? null, '');
            $section = trim((string)($input['section'] ?? 'ALL'));
            if ($start === '' || $end === '') {
                plJsonError('กรุณาระบุช่วงวันที่ให้ครบถ้วน', 400);
            }

            $stmt = $pdo->prepare("EXEC dbo." . SP_GET_PL_REPORT_RANGE . " :start, :end, :section");
            $stmt->execute([':start' => $start, ':end' => $end, ':section' => $section]);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
            foreach ($rows as &$row) {
                $row['actual_amount'] = (float)($row['actual_amount'] ?? 0);
                $row['daily_target'] = (float)($row['daily_target'] ?? 0);
            }
            unset($row);
            plJsonSuccess($rows, 'Range P&L report loaded');
            break;
        }

        case 'statement_yearly': {
            requirePlAccess(false);
            $year = (int)($input['year'] ?? date('Y'));
            $section = trim((string)($input['section'] ?? 'ALL'));
            if ($year < 2000 || $year > 2100) {
                plJsonError('ปีไม่ถูกต้อง', 400);
            }

            $stmt = $pdo->prepare("EXEC dbo.sp_GetPLStatement_Yearly :year, :section");
            $stmt->execute([':year' => $year, ':section' => $section]);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
            foreach ($rows as &$row) {
                $row['item_level'] = (int)($row['item_level'] ?? 0);
                for ($m = 1; $m <= 12; $m++) {
                    $row["m{$m}_act"] = (float)($row["m{$m}_act"] ?? 0);
                    $row["m{$m}_tgt"] = (float)($row["m{$m}_tgt"] ?? 0);
                }
            }
            unset($row);
            plJsonSuccess($rows, 'Yearly P&L statement loaded');
            break;
        }

        case 'statement_daily': {
            requirePlAccess(false);
            $year = (int)($input['year'] ?? date('Y'));
            $month = (int)($input['month'] ?? date('m'));
            $section = trim((string)($input['section'] ?? 'ALL'));
            if ($year < 2000 || $year > 2100 || $month < 1 || $month > 12) {
                plJsonError('ปีหรือเดือนไม่ถูกต้อง', 400);
            }

            $stmt = $pdo->prepare("EXEC dbo.sp_GetPLStatement_Daily :year, :month, :section");
            $stmt->execute([':year' => $year, ':month' => $month, ':section' => $section]);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
            foreach ($rows as &$row) {
                $row['item_level'] = (int)($row['item_level'] ?? 0);
                for ($d = 1; $d <= 31; $d++) {
                    $row["d{$d}_act"] = (float)($row["d{$d}_act"] ?? 0);
                    $row["d{$d}_tgt"] = (float)($row["d{$d}_tgt"] ?? 0);
                }
            }
            unset($row);

            $stmtLock = $pdo->prepare("
                SELECT DAY(entry_date) AS d
                FROM dbo.DAILY_PL_STATUS WITH (NOLOCK)
                WHERE YEAR(entry_date) = :y AND MONTH(entry_date) = :m AND section_name = :s AND is_locked = 1
            ");
            $stmtLock->execute([':y' => $year, ':m' => $month, ':s' => $section]);
            $lockedDays = array_map('intval', $stmtLock->fetchAll(PDO::FETCH_COLUMN) ?: []);

            plJsonSuccess(['items' => $rows, 'locked_days' => $lockedDays], 'Daily P&L statement loaded');
            break;
        }

        case 'get_exchange_rate': {
            requirePlAccess(false);
            $year = (int)($input['year'] ?? 0);
            $month = (int)($input['month'] ?? 0);
            if ($year <= 2000 || $month < 1 || $month > 12) {
                plJsonSuccess(['rate' => 32.0], 'Default exchange rate');
            }
            $stmt = $pdo->prepare("EXEC dbo." . SP_MANAGE_EXCHANGE . " 'GET', :y, :m");
            $stmt->execute([':y' => $year, ':m' => $month]);
            $res = $stmt->fetch(PDO::FETCH_ASSOC);
            plJsonSuccess(['rate' => (float)($res['rate'] ?? 32.0)], 'Exchange rate loaded');
            break;
        }

        case 'save_exchange_rate': {
            requirePlAccess(true);
            $year = (int)($input['year'] ?? 0);
            $month = (int)($input['month'] ?? 0);
            $rate = (float)($input['rate'] ?? 0);
            if ($year <= 2000 || $month < 1 || $month > 12 || $rate <= 0) {
                plJsonError('ข้อมูลอัตราแลกเปลี่ยนไม่ถูกต้อง', 400);
            }
            $stmt = $pdo->prepare("EXEC dbo." . SP_MANAGE_EXCHANGE . " 'SAVE', :y, :m, :r, :u");
            $stmt->execute([':y' => $year, ':m' => $month, ':r' => $rate, ':u' => $userName]);
            writeLog($pdo, 'UPDATE', 'DAILY_PL_RATE', "EX_{$year}_{$month}", null, ['rate' => $rate], 'Updated monthly USD exchange rate');
            plJsonSuccess(['rate' => $rate], 'บันทึกอัตราแลกเปลี่ยนสำเร็จ');
            break;
        }

        case 'get_container_rate': {
            requirePlAccess(false);
            $year = (int)($input['year'] ?? 0);
            $month = (int)($input['month'] ?? 0);
            if ($year <= 2000 || $month < 1 || $month > 12) {
                plJsonSuccess(['rate' => 3000.0], 'Default container rate');
            }
            $stmt = $pdo->prepare("EXEC dbo." . SP_MANAGE_CONTAINER . " 'GET', :y, :m");
            $stmt->execute([':y' => $year, ':m' => $month]);
            $res = $stmt->fetch(PDO::FETCH_ASSOC);
            plJsonSuccess(['rate' => (float)($res['rate'] ?? 3000.0)], 'Container rate loaded');
            break;
        }

        case 'save_container_rate': {
            requirePlAccess(true);
            $year = (int)($input['year'] ?? 0);
            $month = (int)($input['month'] ?? 0);
            $rate = (float)($input['rate'] ?? 0);
            if ($year <= 2000 || $month < 1 || $month > 12 || $rate < 0) {
                plJsonError('ข้อมูลอัตราค่าตู้คอนเทนเนอร์ไม่ถูกต้อง', 400);
            }
            $stmt = $pdo->prepare("EXEC dbo." . SP_MANAGE_CONTAINER . " 'SAVE', :y, :m, :r, :u");
            $stmt->execute([':y' => $year, ':m' => $month, ':r' => $rate, ':u' => $userName]);
            writeLog($pdo, 'UPDATE', 'DAILY_PL_RATE', "CTN_{$year}_{$month}", null, ['rate' => $rate], 'Updated monthly container rate');
            plJsonSuccess(['rate' => $rate], 'บันทึกค่าตู้คอนเทนเนอร์สำเร็จ');
            break;
        }

        case 'calendar_read': {
            requirePlAccess(false);
            $start = normalizePlDate($input['start'] ?? date('Y-m-01'), date('Y-m-01'));
            $end = normalizePlDate($input['end'] ?? date('Y-m-t'), date('Y-m-t'));
            $stmt = $pdo->prepare("
                SELECT CONVERT(VARCHAR(10), calendar_date, 23) AS calendar_date,
                       description, day_type, work_rate_holiday, ot_rate_holiday, exchange_rate, container_rate
                FROM dbo.MANPOWER_CALENDAR WITH (NOLOCK)
                WHERE calendar_date BETWEEN :sd AND :ed
                ORDER BY calendar_date ASC
            ");
            $stmt->execute([':sd' => $start, ':ed' => $end]);
            plJsonSuccess($stmt->fetchAll(PDO::FETCH_ASSOC) ?: [], 'Calendar days loaded');
            break;
        }

        case 'calendar_save': {
            requirePlAccess(true);
            $date = normalizePlDate($input['date'] ?? null, '');
            $dayType = strtoupper(trim((string)($input['day_type'] ?? 'HOLIDAY')));
            $desc = trim((string)($input['description'] ?? ''));
            $workRate = (float)($input['work_rate'] ?? 2.0);
            $otRate = (float)($input['ot_rate'] ?? 3.0);

            if ($date === '' || !in_array($dayType, ['HOLIDAY', 'OFFDAY', 'SUNDAY', 'NORMAL'], true)) {
                plJsonError('ข้อมูลวันหยุดไม่ถูกต้อง', 400);
            }

            $stmt = $pdo->prepare("EXEC dbo." . SP_SAVE_CALENDAR . " :date, :type, :desc, :wRate, :oRate, :usr");
            $stmt->execute([
                ':date' => $date,
                ':type' => $dayType,
                ':desc' => $desc,
                ':wRate' => $workRate,
                ':oRate' => $otRate,
                ':usr' => $userName,
            ]);
            writeLog($pdo, 'UPDATE', 'DAILY_PL_CALENDAR', $date, null, ['day_type' => $dayType, 'description' => $desc], 'Saved P&L working calendar day');
            plJsonSuccess(['date' => $date], 'บันทึกข้อมูลวันหยุดสำเร็จ');
            break;
        }

        case 'calendar_delete': {
            requirePlAccess(true);
            $date = normalizePlDate($input['date'] ?? null, '');
            if ($date === '') {
                plJsonError('กรุณาระบุวันที่ต้องการลบ', 400);
            }
            $stmtOld = $pdo->prepare("SELECT CONVERT(VARCHAR(10), calendar_date, 23) AS calendar_date, day_type, description FROM dbo.MANPOWER_CALENDAR WITH (NOLOCK) WHERE calendar_date = ?");
            $stmtOld->execute([$date]);
            $oldRow = $stmtOld->fetch(PDO::FETCH_ASSOC);

            $pdo->prepare("DELETE FROM dbo.MANPOWER_CALENDAR WHERE calendar_date = ?")->execute([$date]);
            writeLog($pdo, 'DELETE', 'DAILY_PL_CALENDAR', $date, $oldRow ?: null, null, 'Deleted calendar event');
            plJsonSuccess(['date' => $date], 'ลบวันหยุดเรียบร้อยแล้ว');
            break;
        }

        default:
            plJsonError("Invalid action: {$action}", 400);
    }
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    writeErrorLog($pdo ?? null, 'DAILY_PL_ENTRY', $e->getMessage(), ['action' => $action]);
    plJsonError('ไม่สามารถประมวลผลข้อมูลงบกำไรขาดทุนได้ กรุณาลองใหม่อีกครั้ง', 500);
}
