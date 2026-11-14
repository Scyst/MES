<?php
/**
 * Self-contained Manpower Master Data API.
 * Manages employees (joined with USERS personal profile), team shift planner,
 * position wage mapping, and team HC group configuration.
 */

require_once __DIR__ . '/_common.php';

$input = [];
try {
    [$action, $input, $currentUser] = parseMpRequest('read_structure');
    $updatedBy = trim((string)($currentUser['username'] ?? 'SYSTEM'));

    switch ($action) {
        case 'read_structure':
            requireMpAccess(false);
            $lines = $pdo->query("SELECT DISTINCT line FROM dbo.MANPOWER_EMPLOYEES WITH (NOLOCK) WHERE line IS NOT NULL AND line != '' ORDER BY line ASC")->fetchAll(PDO::FETCH_COLUMN);
            $teams = $pdo->query("SELECT DISTINCT team_group FROM dbo.MANPOWER_EMPLOYEES WITH (NOLOCK) WHERE team_group IS NOT NULL AND team_group != '' ORDER BY team_group ASC")->fetchAll(PDO::FETCH_COLUMN);
            $shifts = $pdo->query("SELECT shift_id, shift_name, CONVERT(VARCHAR(5), start_time, 108) AS start_time, CONVERT(VARCHAR(5), end_time, 108) AS end_time, is_active FROM dbo.MANPOWER_SHIFTS WITH (NOLOCK) ORDER BY shift_id ASC")->fetchAll(PDO::FETCH_ASSOC);
            $hcGroups = $pdo->query("SELECT DISTINCT ISNULL(NULLIF(hc_group, ''), 'MAIN') AS hc_group FROM dbo.MANPOWER_TEAM_SETTINGS WITH (NOLOCK) ORDER BY hc_group ASC")->fetchAll(PDO::FETCH_COLUMN);
            $departments = $pdo->query("SELECT DISTINCT department_api FROM dbo.MANPOWER_EMPLOYEES WITH (NOLOCK) WHERE department_api IS NOT NULL AND department_api != '' ORDER BY department_api ASC")->fetchAll(PDO::FETCH_COLUMN);

            mpJsonSuccess([
                'lines' => $lines,
                'teams' => $teams,
                'shifts' => $shifts,
                'hc_groups' => $hcGroups,
                'departments' => $departments,
            ]);

        case 'read_single_employee':
            requireMpAccess(false);
            $empId = trim((string)($input['emp_id'] ?? ''));
            if ($empId === '') {
                throw new InvalidArgumentException('กรุณาระบุรหัสพนักงาน');
            }
            $stmt = $pdo->prepare("
                SELECT TOP 1
                    E.id, E.emp_id, E.name_th, E.position, E.department_api, E.line, E.team_group,
                    E.default_shift_id, E.is_active,
                    CONVERT(VARCHAR(10), E.start_date, 120) AS start_date,
                    CONVERT(VARCHAR(10), E.resign_date, 120) AS resign_date,
                    E.last_sync_at,
                    U.profile_picture, U.phone, U.bio, U.aka,
                    U.emergency_contact_name, U.emergency_contact_phone, U.emergency_contact_relation,
                    ISNULL(TS.hc_group, 'MAIN') AS hc_group
                FROM dbo.MANPOWER_EMPLOYEES E WITH (NOLOCK)
                LEFT JOIN dbo.USERS U WITH (NOLOCK) ON E.emp_id = U.emp_id COLLATE Thai_CI_AS
                LEFT JOIN dbo.MANPOWER_TEAM_SETTINGS TS WITH (NOLOCK) ON E.department_api = TS.department_api
                WHERE E.emp_id = ?
            ");
            $stmt->execute([$empId]);
            $emp = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$emp) {
                throw new InvalidArgumentException('ไม่พบข้อมูลพนักงาน');
            }
            mpJsonSuccess($emp);

        case 'read_employees':
            requireMpAccess(false);
            $search = trim((string)($input['search'] ?? ''));
            $line = trim((string)($input['line'] ?? ''));
            $team = trim((string)($input['team'] ?? ''));
            $status = strtoupper(trim((string)($input['status'] ?? '1')));
            $dateType = strtoupper(trim((string)($input['date_type'] ?? '')));
            $dateFrom = parseMpDate($input['date_from'] ?? null);
            $dateTo = parseMpDate($input['date_to'] ?? null);
            $limit = min(1000, max(50, (int)($input['limit'] ?? 500)));

            $where = ['1=1'];
            $params = [];

            if ($status === '1') {
                $where[] = 'E.is_active = 1';
            } elseif ($status === '0') {
                $where[] = 'E.is_active = 0';
            } elseif ($status === 'OUTSIDER') {
                $where[] = "(E.line = 'OTHER_DEPT' OR E.line IS NULL OR E.line = '' OR E.department_api NOT LIKE '%Toolbox%')";
            }
            if ($line !== '' && $line !== 'ALL') {
                $where[] = 'E.line = ?';
                $params[] = $line;
            }
            if ($team !== '' && $team !== 'ALL') {
                $where[] = 'E.team_group = ?';
                $params[] = $team;
            }
            if ($search !== '') {
                $where[] = '(E.emp_id LIKE ? OR E.name_th LIKE ? OR E.position LIKE ? OR E.line LIKE ?)';
                $like = '%' . $search . '%';
                array_push($params, $like, $like, $like, $like);
            }
            if ($dateType === 'JOIN' && $dateFrom && $dateTo) {
                $where[] = 'E.start_date BETWEEN ? AND ?';
                array_push($params, $dateFrom, $dateTo);
            } elseif ($dateType === 'RESIGN' && $dateFrom && $dateTo) {
                $where[] = 'E.resign_date BETWEEN ? AND ?';
                array_push($params, $dateFrom, $dateTo);
            }

            $whereSql = implode(' AND ', $where);
            $sql = "
                SELECT TOP ({$limit})
                    E.id, E.emp_id, E.name_th, E.position, E.department_api,
                    E.line, E.default_shift_id, E.is_active, E.team_group,
                    CONVERT(VARCHAR(10), E.start_date, 120) AS start_date,
                    CONVERT(VARCHAR(10), E.resign_date, 120) AS resign_date,
                    E.last_sync_at,
                    S.shift_name,
                    ISNULL(TS.hc_group, 'MAIN') AS hc_group,
                    COALESCE(CM.category_name, 'Other') AS emp_type,
                    U.profile_picture, U.phone, U.bio,
                    U.emergency_contact_name, U.emergency_contact_phone
                FROM dbo.MANPOWER_EMPLOYEES E WITH (NOLOCK)
                LEFT JOIN dbo.MANPOWER_SHIFTS S WITH (NOLOCK) ON E.default_shift_id = S.shift_id
                LEFT JOIN dbo.MANPOWER_TEAM_SETTINGS TS WITH (NOLOCK) ON E.department_api = TS.department_api
                OUTER APPLY (
                    SELECT TOP 1 category_name
                    FROM dbo.MANPOWER_CATEGORY_MAPPING WITH (NOLOCK)
                    WHERE E.position LIKE '%' + keyword + '%' COLLATE Thai_CI_AS
                    ORDER BY LEN(keyword) DESC
                ) CM
                LEFT JOIN dbo.USERS U WITH (NOLOCK) ON E.emp_id = U.emp_id COLLATE Thai_CI_AS
                WHERE {$whereSql}
                ORDER BY E.is_active DESC, E.line ASC, E.emp_id ASC
            ";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            mpJsonSuccess($stmt->fetchAll(PDO::FETCH_ASSOC));

        case 'read_team_shifts':
            requireMpAccess(false);
            $sql = "
                SELECT
                    E.line,
                    E.default_shift_id AS shift_id,
                    MAX(S.shift_name) AS shift_name,
                    COUNT(*) AS emp_count
                FROM dbo.MANPOWER_EMPLOYEES E WITH (NOLOCK)
                LEFT JOIN dbo.MANPOWER_SHIFTS S WITH (NOLOCK) ON E.default_shift_id = S.shift_id
                WHERE E.is_active = 1 AND E.line IS NOT NULL AND E.line != ''
                GROUP BY E.line, E.default_shift_id
                ORDER BY E.line ASC, E.default_shift_id ASC
            ";
            mpJsonSuccess($pdo->query($sql)->fetchAll(PDO::FETCH_ASSOC));

        case 'update_team_shift':
            requireMpAccess(true);
            $line = trim((string)($input['line'] ?? ''));
            $newShiftId = (int)($input['shift_id'] ?? 0);
            $effectiveDate = parseMpDate($input['effective_date'] ?? null, date('Y-m-d'), 'วันที่มีผล');
            if ($line === '' || $newShiftId <= 0) {
                throw new InvalidArgumentException('กรุณาระบุ Line และกะการทำงานที่ต้องการเปลี่ยน');
            }

            $pdo->beginTransaction();
            $stmtUpdEmp = $pdo->prepare('UPDATE dbo.MANPOWER_EMPLOYEES SET default_shift_id = ?, last_sync_at = GETDATE() WHERE line = ? AND is_active = 1');
            $stmtUpdEmp->execute([$newShiftId, $line]);
            $empAffected = $stmtUpdEmp->rowCount();

            $stmtUpdLogs = $pdo->prepare("
                UPDATE L
                SET L.shift_id = ?, L.updated_by = ?, L.updated_at = GETDATE()
                FROM dbo.MANPOWER_DAILY_LOGS L
                JOIN dbo.MANPOWER_EMPLOYEES E ON L.emp_id = E.emp_id
                WHERE ISNULL(L.actual_line, E.line) = ? AND L.log_date >= ? AND (L.is_verified = 0 OR L.is_verified IS NULL)
            ");
            $stmtUpdLogs->execute([$newShiftId, $updatedBy, $line, $effectiveDate]);
            recalculateManpowerDailyCost($pdo, $effectiveDate, date('Y-m-d', strtotime('+3 days', strtotime($effectiveDate))));

            writeLog($pdo, 'UPDATE', 'MANPOWER_TEAM_SHIFT', $line, null, ['shift_id' => $newShiftId, 'effective_date' => $effectiveDate, 'affected' => $empAffected], "Updated default shift for line {$line}");
            $pdo->commit();
            mpJsonSuccess(['affected' => $empAffected], "อัปเดตกะการทำงานสาย {$line} ({$empAffected} คน) เรียบร้อยแล้ว");

        case 'create_employee':
            requireMpAccess(true);
            $empId = strtoupper(trim((string)($input['emp_id'] ?? '')));
            $nameTh = trim((string)($input['name_th'] ?? ''));
            $position = trim((string)($input['position'] ?? ''));
            $line = trim((string)($input['line'] ?? 'TOOLBOX_POOL'));
            $teamGroup = trim((string)($input['team_group'] ?? ''));
            $deptApi = trim((string)($input['department_api'] ?? 'Toolbox_Manual'));
            $shiftId = max(1, (int)($input['default_shift_id'] ?? 1));
            $startDate = parseMpDate($input['start_date'] ?? null, date('Y-m-d'), 'วันเริ่มงาน');

            if ($empId === '' || $nameTh === '') {
                throw new InvalidArgumentException('กรุณากรอกรหัสพนักงานและชื่อ-สกุล');
            }
            $check = $pdo->prepare('SELECT 1 FROM dbo.MANPOWER_EMPLOYEES WITH (NOLOCK) WHERE emp_id = ?');
            $check->execute([$empId]);
            if ($check->fetchColumn()) {
                throw new InvalidArgumentException("รหัสพนักงาน {$empId} มีอยู่ในระบบแล้ว");
            }

            $pdo->beginTransaction();
            $pdo->prepare("
                INSERT INTO dbo.MANPOWER_EMPLOYEES (emp_id, name_th, position, department_api, line, default_shift_id, is_active, team_group, created_at, start_date, last_sync_at)
                VALUES (?, ?, ?, ?, ?, ?, 1, ?, GETDATE(), ?, GETDATE())
            ")->execute([$empId, $nameTh, $position, $deptApi, $line, $shiftId, $teamGroup !== '' ? $teamGroup : null, $startDate]);

            writeLog($pdo, 'CREATE', 'MANPOWER_EMP', $empId, null, [
                'emp_id' => $empId, 'name_th' => $nameTh, 'line' => $line, 'team_group' => $teamGroup, 'shift_id' => $shiftId,
            ], "Created employee {$empId}");
            $pdo->commit();
            mpJsonSuccess(['emp_id' => $empId], 'เพิ่มข้อมูลพนักงานเรียบร้อยแล้ว');

        case 'update_employee':
            requireMpAccess(true);
            $empId = trim((string)($input['emp_id'] ?? ''));
            if ($empId === '') {
                throw new InvalidArgumentException('ไม่พบรหัสพนักงาน');
            }
            $oldStmt = $pdo->prepare("SELECT emp_id, name_th, position, line, team_group, default_shift_id, is_active, CONVERT(VARCHAR(10), start_date, 120) AS start_date, CONVERT(VARCHAR(10), resign_date, 120) AS resign_date FROM dbo.MANPOWER_EMPLOYEES WHERE emp_id = ?");
            $oldStmt->execute([$empId]);
            $oldRow = $oldStmt->fetch(PDO::FETCH_ASSOC);
            if (!$oldRow) {
                throw new InvalidArgumentException('ไม่พบพนักงานในระบบ');
            }

            $nameTh = trim((string)($input['name_th'] ?? $oldRow['name_th']));
            $position = trim((string)($input['position'] ?? $oldRow['position']));
            $line = trim((string)($input['line'] ?? $oldRow['line']));
            $teamGroup = array_key_exists('team_group', $input) ? (trim((string)$input['team_group']) ?: null) : $oldRow['team_group'];
            $shiftId = !empty($input['default_shift_id']) ? (int)$input['default_shift_id'] : (int)$oldRow['default_shift_id'];
            $isActive = array_key_exists('is_active', $input) ? (int)(bool)$input['is_active'] : (int)$oldRow['is_active'];
            $startDate = array_key_exists('start_date', $input) ? parseMpDate($input['start_date'], null, 'วันเริ่มงาน') : $oldRow['start_date'];
            $resignDate = array_key_exists('resign_date', $input) ? parseMpDate($input['resign_date'], null, 'วันลาออก') : $oldRow['resign_date'];
            $updateLogs = filter_var($input['update_logs'] ?? false, FILTER_VALIDATE_BOOLEAN);
            $effectiveDate = parseMpDate($input['effective_date'] ?? null, date('Y-m-d'), 'วันที่มีผล');

            $pdo->beginTransaction();
            $pdo->prepare("
                UPDATE dbo.MANPOWER_EMPLOYEES
                SET name_th = ?, position = ?, line = ?, team_group = ?, default_shift_id = ?,
                    is_active = ?, start_date = ?, resign_date = ?, last_sync_at = GETDATE()
                WHERE emp_id = ?
            ")->execute([$nameTh, $position, $line, $teamGroup, $shiftId, $isActive, $startDate, $resignDate, $empId]);

            if ($updateLogs && $effectiveDate) {
                $pdo->prepare("
                    UPDATE dbo.MANPOWER_DAILY_LOGS
                    SET actual_line = ?, actual_team = ?, shift_id = ?, updated_by = ?, updated_at = GETDATE()
                    WHERE emp_id = ? AND log_date >= ?
                ")->execute([$line, $teamGroup, $shiftId, $updatedBy, $empId, $effectiveDate]);
                recalculateManpowerDailyCost($pdo, $effectiveDate, date('Y-m-d'));
            }

            writeLog($pdo, 'UPDATE', 'MANPOWER_EMP', $empId, $oldRow, [
                'name_th' => $nameTh, 'line' => $line, 'team_group' => $teamGroup, 'shift_id' => $shiftId, 'is_active' => $isActive, 'retroactive' => $updateLogs ? $effectiveDate : null,
            ], "Updated employee profile {$empId}");
            $pdo->commit();
            mpJsonSuccess(null, 'บันทึกข้อมูลพนักงานเรียบร้อยแล้ว');

        case 'terminate_employee':
        case 'reactivate_employee':
            requireMpAccess(true);
            $empId = trim((string)($input['emp_id'] ?? ''));
            if ($empId === '') {
                throw new InvalidArgumentException('ไม่พบรหัสพนักงาน');
            }
            $isReactivate = ($action === 'reactivate_employee');
            $resignDate = $isReactivate ? null : parseMpDate($input['resign_date'] ?? null, date('Y-m-d'), 'วันพ้นสภาพ');

            $pdo->beginTransaction();
            if ($isReactivate) {
                $pdo->prepare('UPDATE dbo.MANPOWER_EMPLOYEES SET is_active = 1, resign_date = NULL, last_sync_at = GETDATE() WHERE emp_id = ?')->execute([$empId]);
            } else {
                $pdo->prepare('UPDATE dbo.MANPOWER_EMPLOYEES SET is_active = 0, resign_date = ?, last_sync_at = GETDATE() WHERE emp_id = ?')->execute([$resignDate, $empId]);
                $pdo->prepare('DELETE FROM dbo.MANPOWER_DAILY_LOGS WHERE emp_id = ? AND log_date > ? AND (is_verified = 0 OR is_verified IS NULL)')
                    ->execute([$empId, $resignDate]);
            }
            writeLog($pdo, 'UPDATE', 'MANPOWER_EMP', $empId, ['is_active' => $isReactivate ? 0 : 1], ['is_active' => $isReactivate ? 1 : 0, 'resign_date' => $resignDate], $isReactivate ? 'Reactivated employee' : 'Terminated employee');
            $pdo->commit();
            mpJsonSuccess(null, $isReactivate ? 'รับพนักงานกลับเข้าทำงานเรียบร้อยแล้ว' : 'บันทึกพ้นสภาพพนักงานเรียบร้อยแล้ว');

        case 'read_mappings':
            requireMpAccess(false);
            $mappings = $pdo->query("SELECT cat_id, keyword, category_name, hourly_rate, display_order, rate_type FROM dbo.MANPOWER_CATEGORY_MAPPING WITH (NOLOCK) ORDER BY display_order ASC, cat_id ASC")->fetchAll(PDO::FETCH_ASSOC);
            $unmapped = $pdo->query("
                SELECT DISTINCT TOP (100) E.position
                FROM dbo.MANPOWER_EMPLOYEES E WITH (NOLOCK)
                WHERE E.is_active = 1 AND E.position IS NOT NULL AND E.position != ''
                  AND NOT EXISTS (
                      SELECT 1 FROM dbo.MANPOWER_CATEGORY_MAPPING M WITH (NOLOCK)
                      WHERE E.position LIKE '%' + M.keyword + '%' COLLATE Thai_CI_AS
                  )
                ORDER BY E.position ASC
            ")->fetchAll(PDO::FETCH_COLUMN);
            mpJsonSuccess(['mappings' => $mappings, 'unmapped' => $unmapped]);

        case 'save_mappings':
            requireMpAccess(true);
            $mappings = $input['mappings'] ?? [];
            if (!is_array($mappings)) {
                throw new InvalidArgumentException('รูปแบบข้อมูล Mapping ไม่ถูกต้อง');
            }
            $pdo->beginTransaction();
            $pdo->exec('DELETE FROM dbo.MANPOWER_CATEGORY_MAPPING');
            $stmt = $pdo->prepare('INSERT INTO dbo.MANPOWER_CATEGORY_MAPPING (keyword, category_name, hourly_rate, display_order, rate_type) VALUES (?, ?, ?, ?, ?)');
            $order = 1;
            foreach ($mappings as $m) {
                $kw = trim((string)($m['keyword'] ?? ''));
                $cat = trim((string)($m['category_name'] ?? 'Other'));
                $rate = round((float)($m['hourly_rate'] ?? 0), 2);
                $rateType = strtoupper(trim((string)($m['rate_type'] ?? 'DAILY')));
                if ($kw === '') {
                    continue;
                }
                $stmt->execute([$kw, $cat, $rate, (int)($m['display_order'] ?? $order), $rateType]);
                $order++;
            }
            writeLog($pdo, 'UPDATE', 'MANPOWER_MAPPING', 'ALL', null, ['count' => $order - 1], 'Saved position wage mappings');
            $pdo->commit();
            mpJsonSuccess(null, 'บันทึกการจับคู่ตำแหน่งและอัตราค่าจ้างเรียบร้อยแล้ว');

        case 'read_team_settings':
            requireMpAccess(false);
            $rows = $pdo->query("
                SELECT department_api, ISNULL(NULLIF(hc_group, ''), 'MAIN') AS hc_group, weight_iph, weight_5s, weight_attendance, weight_learning
                FROM dbo.MANPOWER_TEAM_SETTINGS WITH (NOLOCK)
                ORDER BY hc_group ASC, department_api ASC
            ")->fetchAll(PDO::FETCH_ASSOC);
            mpJsonSuccess($rows);

        case 'save_team_settings':
            requireMpAccess(true);
            $settings = $input['settings'] ?? [];
            if (!is_array($settings)) {
                throw new InvalidArgumentException('รูปแบบข้อมูล Team Settings ไม่ถูกต้อง');
            }
            $pdo->beginTransaction();
            $saved = 0;
            $check = $pdo->prepare('SELECT 1 FROM dbo.MANPOWER_TEAM_SETTINGS WHERE department_api = ?');
            $upd = $pdo->prepare('UPDATE dbo.MANPOWER_TEAM_SETTINGS SET hc_group = ? WHERE department_api = ?');
            $ins = $pdo->prepare('INSERT INTO dbo.MANPOWER_TEAM_SETTINGS (department_api, hc_group, weight_iph, weight_5s, weight_attendance, weight_learning) VALUES (?, ?, 25, 25, 25, 25)');
            foreach ($settings as $row) {
                $dept = trim((string)($row['department_api'] ?? ''));
                $grp = trim((string)($row['hc_group'] ?? 'MAIN'));
                if ($dept === '') {
                    continue;
                }
                $check->execute([$dept]);
                if ($check->fetchColumn()) {
                    $upd->execute([$grp, $dept]);
                } else {
                    $ins->execute([$dept, $grp]);
                }
                $saved++;
            }
            writeLog($pdo, 'UPDATE', 'MANPOWER_TEAM_SETTINGS', 'BATCH_' . $saved, null, $settings, 'Updated HC group team settings');
            $pdo->commit();
            mpJsonSuccess(['count' => $saved], 'บันทึกการตั้งค่ากลุ่มกำลังคนเรียบร้อยแล้ว');

        default:
            throw new InvalidArgumentException('ไม่พบคำสั่งที่ระบุ');
    }
} catch (Throwable $e) {
    handleMpException($pdo, 'MANPOWER_MASTER_API', $e, $input);
}
