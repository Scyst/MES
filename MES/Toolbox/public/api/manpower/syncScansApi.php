<?php
/**
 * Self-contained Manual / Triggered Attendance Punch Sync API.
 * Fetches facial/badge scans from central scan API, pairs IN/OUT shift windows,
 * persists new/updated daily logs (preserving verified edits), and recalculates daily cost.
 */

require_once __DIR__ . '/_common.php';

@set_time_limit(300);

$input = [];
try {
    [$action, $input, $currentUser] = parseMpRequest('sync');
    requireMpAccess(true);
    $updatedBy = trim((string)($currentUser['username'] ?? 'SYSTEM'));

    $startDate = parseMpDate($input['startDate'] ?? null, date('Y-m-d'), 'วันเริ่มต้น');
    $endDate = parseMpDate($input['endDate'] ?? null, $startDate, 'วันสิ้นสุด');

    $apiStart = date('Y-m-d', strtotime('-1 day', strtotime($startDate)));
    $apiEnd = date('Y-m-d', strtotime('+1 day', strtotime($endDate)));
    $rawList = fetchCentralScanRows($apiStart, $apiEnd);

    $pdo->beginTransaction();

    $shiftConfig = [];
    $stmtShifts = $pdo->query('SELECT shift_id, CONVERT(VARCHAR(8), start_time, 108) AS start_time FROM dbo.MANPOWER_SHIFTS WITH (NOLOCK)');
    while ($row = $stmtShifts->fetch(PDO::FETCH_ASSOC)) {
        $shiftConfig[(int)$row['shift_id']] = $row['start_time'];
    }
    $defaultShiftId = 1;

    $allScansByEmp = [];
    $empInfoMap = [];
    foreach ($rawList as $row) {
        $eid = trim((string)($row['EMPID'] ?? ''));
        $ts = strtotime((string)($row['TIMEINOUT'] ?? ''));
        if ($eid === '' || !$ts || (int)date('Y', $ts) <= 2020) {
            continue;
        }
        $allScansByEmp[$eid][] = $ts;
        if (!isset($empInfoMap[$eid])) {
            $empInfoMap[$eid] = $row;
        }
    }
    foreach ($allScansByEmp as &$scans) {
        sort($scans);
        $scans = array_values(array_unique($scans));
    }
    unset($scans);

    $existingEmployees = [];
    $stmtEmp = $pdo->query("
        SELECT E.emp_id, E.line, E.team_group, E.default_shift_id, E.is_active, E.position, E.department_api,
               ISNULL(TS.hc_group, 'MAIN') AS hc_group,
               COALESCE(CM.category_name, 'Other') AS emp_type
        FROM dbo.MANPOWER_EMPLOYEES E WITH (NOLOCK)
        LEFT JOIN dbo.MANPOWER_TEAM_SETTINGS TS WITH (NOLOCK) ON E.department_api = TS.department_api
        OUTER APPLY (
            SELECT TOP 1 category_name FROM dbo.MANPOWER_CATEGORY_MAPPING WITH (NOLOCK)
            WHERE E.position LIKE '%' + keyword + '%' COLLATE Thai_CI_AS ORDER BY LEN(keyword) DESC
        ) CM
    ");
    while ($r = $stmtEmp->fetch(PDO::FETCH_ASSOC)) {
        $existingEmployees[$r['emp_id']] = $r;
    }

    $stats = ['new_employees' => 0, 'updated_employees' => 0, 'processed_logs' => 0, 'cleaned_ghosts' => 0];
    $insEmp = $pdo->prepare('INSERT INTO dbo.MANPOWER_EMPLOYEES (emp_id, name_th, position, department_api, is_active, line, default_shift_id, created_at, last_sync_at) VALUES (?, ?, ?, ?, 1, ?, ?, GETDATE(), GETDATE())');
    $updEmp = $pdo->prepare('UPDATE dbo.MANPOWER_EMPLOYEES SET position = ?, department_api = ?, last_sync_at = GETDATE() WHERE emp_id = ?');

    foreach ($empInfoMap as $apiEmpId => $info) {
        $deptApi = trim((string)($info['DEPARTMENT'] ?? ''));
        $apiPos = trim((string)($info['POSITION'] ?? '-'));
        $isToolbox = stripos($deptApi, 'Toolbox') !== false;
        $defaultLine = $isToolbox ? 'TOOLBOX_POOL' : ($deptApi !== '' ? $deptApi : 'OTHER_DEPT');

        if (isset($existingEmployees[$apiEmpId])) {
            $dbPos = $existingEmployees[$apiEmpId]['position'] ?? '';
            $dbDept = $existingEmployees[$apiEmpId]['department_api'] ?? '';
            if ($dbPos !== $apiPos || $dbDept !== $deptApi) {
                $updEmp->execute([$apiPos, $deptApi, $apiEmpId]);
                $stats['updated_employees']++;
            }
        } else {
            $insEmp->execute([$apiEmpId, trim((string)($info['NAME'] ?? '-')), $apiPos, $deptApi, $defaultLine, $defaultShiftId]);
            $existingEmployees[$apiEmpId] = [
                'emp_id' => $apiEmpId, 'line' => $defaultLine, 'default_shift_id' => $defaultShiftId,
                'team_group' => null, 'is_active' => 1, 'emp_type' => 'Other', 'hc_group' => 'MAIN',
            ];
            $stats['new_employees']++;
        }
    }

    $holidays = [];
    $stmtCal = $pdo->prepare("SELECT CONVERT(VARCHAR(10), calendar_date, 120) AS calendar_date FROM dbo.MANPOWER_CALENDAR WITH (NOLOCK) WHERE calendar_date BETWEEN ? AND ? AND day_type IN ('HOLIDAY', 'SUNDAY', 'OFFDAY')");
    $stmtCal->execute([$startDate, $endDate]);
    while ($c = $stmtCal->fetch(PDO::FETCH_ASSOC)) {
        $holidays[$c['calendar_date']] = true;
    }

    $existingLogs = [];
    $stmtLogs = $pdo->prepare('SELECT log_id, emp_id, CONVERT(VARCHAR(10), log_date, 120) AS log_date, is_verified, shift_id, status FROM dbo.MANPOWER_DAILY_LOGS WITH (NOLOCK) WHERE log_date BETWEEN ? AND ?');
    $stmtLogs->execute([$startDate, $endDate]);
    while ($l = $stmtLogs->fetch(PDO::FETCH_ASSOC)) {
        $existingLogs[$l['emp_id']][$l['log_date']] = $l;
    }

    $delLog = $pdo->prepare('DELETE FROM dbo.MANPOWER_DAILY_LOGS WHERE log_id = ?');
    $updLog = $pdo->prepare('UPDATE dbo.MANPOWER_DAILY_LOGS SET scan_in_time = ?, scan_out_time = ?, status = ?, shift_id = ?, actual_line = ?, actual_team = ?, actual_emp_type = ?, actual_hc_group = ?, updated_by = ?, updated_at = GETDATE() WHERE log_id = ? AND (is_verified = 0 OR is_verified IS NULL)');
    $insLog = $pdo->prepare('INSERT INTO dbo.MANPOWER_DAILY_LOGS (log_date, emp_id, scan_in_time, scan_out_time, status, shift_id, actual_line, actual_team, actual_emp_type, actual_hc_group, updated_by, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, GETDATE())');

    $currTs = strtotime($startDate);
    $endTs = strtotime($endDate);
    while ($currTs <= $endTs) {
        $procDate = date('Y-m-d', $currTs);
        $isSunday = ((int)date('w', $currTs) === 0);
        $isHol = isset($holidays[$procDate]) || $isSunday;

        foreach ($existingEmployees as $empId => $empData) {
            $logExist = $existingLogs[$empId][$procDate] ?? null;
            if ((int)($empData['is_active'] ?? 1) === 0) {
                if ($logExist && !(int)$logExist['is_verified']) {
                    $delLog->execute([$logExist['log_id']]);
                    $stats['cleaned_ghosts']++;
                }
                continue;
            }
            if ($logExist && (int)$logExist['is_verified'] === 1) {
                continue;
            }

            $targetShiftId = (int)($logExist['shift_id'] ?? $empData['default_shift_id'] ?? $defaultShiftId);
            $startTime = $shiftConfig[$targetShiftId] ?? '08:00:00';
            $paired = pairShiftWindowScans($allScansByEmp[$empId] ?? [], $procDate, $startTime);

            $inTime = $paired['scan_in_time'];
            $outTime = $paired['scan_out_time'];
            $status = $paired['status'];
            if ($inTime === null && $outTime === null && $isHol) {
                $status = 'HOLIDAY';
            }

            if ($logExist) {
                $updLog->execute([
                    $inTime, $outTime, $status, $targetShiftId,
                    $empData['line'], $empData['team_group'], $empData['emp_type'], $empData['hc_group'],
                    $updatedBy, $logExist['log_id'],
                ]);
            } else {
                $insLog->execute([
                    $procDate, $empId, $inTime, $outTime, $status, $targetShiftId,
                    $empData['line'], $empData['team_group'], $empData['emp_type'], $empData['hc_group'],
                    $updatedBy,
                ]);
            }
            $stats['processed_logs']++;
        }
        $currTs = strtotime('+1 day', $currTs);
    }

    recalculateManpowerDailyCost($pdo, $startDate, $endDate);
    writeLog($pdo, 'UPDATE', 'MANPOWER_SYNC', "{$startDate}_{$endDate}", null, $stats, "Synced scanner logs from {$startDate} to {$endDate}");
    $pdo->commit();
    mpJsonSuccess($stats, "ซิงค์ข้อมูลสแกนเวลาเรียบร้อย ({$stats['processed_logs']} รายการ)");
} catch (Throwable $e) {
    handleMpException($pdo, 'MANPOWER_SYNC_API', $e, $input);
}
