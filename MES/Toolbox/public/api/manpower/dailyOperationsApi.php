<?php
/**
 * Self-contained Manpower Daily Operations & Analytics API.
 * Supports daily summary (V1/V2 cost simulator), attendance logs, anomaly detection,
 * shift swap re-pairing, YTD KPI summary, executive range reports, and integrated analysis.
 */

require_once __DIR__ . '/_common.php';

$input = [];
try {
    [$action, $input, $currentUser] = parseMpRequest('read_daily');
    $updatedBy = trim((string)($currentUser['username'] ?? 'SYSTEM'));

    switch ($action) {
        case 'read_kpi_summary':
            requireMpAccess(false);
            $endDate = parseMpDate($input['endDate'] ?? null, date('Y-m-d'), 'วันสิ้นสุด');
            $startDate = parseMpDate($input['startDate'] ?? null, date('Y-01-01'), 'วันเริ่มต้น');
            $empIdFilter = trim((string)($input['emp_id'] ?? ''));
            $hcGroup = trim((string)($input['hcGroup'] ?? 'ALL'));

            $whereParts = ["L.log_date BETWEEN ? AND ?"];
            $params = [$startDate, $endDate];

            if ($empIdFilter !== '') {
                $whereParts[] = 'L.emp_id = ?';
                $params[] = $empIdFilter;
            }
            if ($hcGroup !== 'ALL' && $hcGroup !== '' && $hcGroup !== 'undefined' && $hcGroup !== 'null') {
                $whereParts[] = 'E.department_api IN (SELECT department_api FROM dbo.MANPOWER_TEAM_SETTINGS WITH (NOLOCK) WHERE hc_group = ?)';
                $params[] = $hcGroup;
            }
            $whereSql = implode(' AND ', $whereParts);

            $sql = "
                SELECT TOP (1000)
                    E.emp_id,
                    E.name_th,
                    E.line,
                    E.team_group,
                    SUM(CASE WHEN ISNULL(C.day_type, 'NORMAL') NOT IN ('HOLIDAY', 'SUNDAY', 'OFFDAY') THEN 1 ELSE 0 END) AS total_working_days,
                    SUM(CASE WHEN L.status = 'PRESENT' THEN 1 ELSE 0 END) AS count_present,
                    SUM(CASE WHEN L.status = 'LATE' THEN 1 ELSE 0 END) AS count_late,
                    SUM(CASE WHEN L.status = 'ABSENT' AND ISNULL(C.day_type, 'NORMAL') NOT IN ('HOLIDAY', 'SUNDAY', 'OFFDAY') THEN 1 ELSE 0 END) AS count_absent,
                    SUM(CASE WHEN L.status = 'SICK' THEN 1 ELSE 0 END) AS count_sick,
                    SUM(CASE WHEN L.status = 'BUSINESS' THEN 1 ELSE 0 END) AS count_business,
                    SUM(CASE WHEN L.status = 'VACATION' THEN 1 ELSE 0 END) AS count_vacation
                FROM dbo.MANPOWER_DAILY_LOGS L WITH (NOLOCK)
                JOIN dbo.MANPOWER_EMPLOYEES E WITH (NOLOCK) ON L.emp_id = E.emp_id
                LEFT JOIN dbo.MANPOWER_CALENDAR C WITH (NOLOCK) ON L.log_date = C.calendar_date
                WHERE {$whereSql}
                GROUP BY E.emp_id, E.name_th, E.line, E.team_group
                ORDER BY E.line ASC, E.name_th ASC
            ";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            mpJsonSuccess($stmt->fetchAll(PDO::FETCH_ASSOC));

        case 'read_daily':
            requireMpAccess(false);
            $date = parseMpDate($input['date'] ?? null, date('Y-m-d'), 'วันที่');
            $line = trim((string)($input['line'] ?? 'ALL'));
            $hcGroup = trim((string)($input['hcGroup'] ?? 'ALL'));
            $shift = trim((string)($input['shift'] ?? 'ALL'));
            $type = trim((string)($input['type'] ?? 'ALL'));
            $status = strtoupper(trim((string)($input['status'] ?? 'ALL')));

            $where = ['L.log_date = ?'];
            $params = [$date];

            if ($line !== 'ALL' && $line !== '') {
                $where[] = 'ISNULL(L.actual_line, E.line) = ?';
                $params[] = $line;
            }
            if ($hcGroup !== 'ALL' && $hcGroup !== '' && $hcGroup !== 'undefined' && $hcGroup !== 'null') {
                $where[] = "ISNULL(L.actual_hc_group, ISNULL(TS.hc_group, 'MAIN')) = ?";
                $params[] = $hcGroup;
            }
            if ($shift !== 'ALL' && $shift !== '') {
                $where[] = "ISNULL(S.shift_name, '') = ?";
                $params[] = $shift;
            }
            if ($status !== 'ALL' && $status !== '') {
                $where[] = 'L.status = ?';
                $params[] = $status;
            }
            if ($type !== 'ALL' && $type !== '') {
                $where[] = "COALESCE(L.actual_emp_type, CM.category_name, E.position, 'Other') = ?";
                $params[] = $type;
            }

            $whereSql = implode(' AND ', $where);
            $sql = "
                SELECT TOP (1000)
                    L.log_id,
                    CONVERT(VARCHAR(10), L.log_date, 120) AS log_date,
                    L.emp_id,
                    E.name_th,
                    E.position,
                    ISNULL(L.actual_line, E.line) AS line,
                    ISNULL(L.actual_team, E.team_group) AS team_group,
                    ISNULL(L.actual_hc_group, ISNULL(TS.hc_group, 'MAIN')) AS hc_group,
                    COALESCE(L.actual_emp_type, CM.category_name, E.position, 'Other') AS emp_type,
                    ISNULL(CM.rate_type, 'DAILY') AS rate_type,
                    ISNULL(L.shift_id, E.default_shift_id) AS shift_id,
                    ISNULL(S.shift_name, 'Day') AS shift_name,
                    CONVERT(VARCHAR(5), S.start_time, 108) AS shift_start,
                    CONVERT(VARCHAR(8), L.scan_in_time, 108) AS scan_in_time,
                    CONVERT(VARCHAR(8), L.scan_out_time, 108) AS scan_out_time,
                    L.scan_in_time AS scan_in_raw,
                    L.scan_out_time AS scan_out_raw,
                    L.status,
                    L.remark,
                    ISNULL(L.is_verified, 0) AS is_verified,
                    L.verified_by,
                    L.verified_at,
                    L.updated_by,
                    L.updated_at,
                    ISNULL(L.is_forgot_out, 0) AS is_forgot_out,
                    CASE
                        WHEN L.scan_out_time IS NOT NULL AND S.start_time IS NOT NULL AND L.status IN ('PRESENT', 'LATE')
                             AND DATEDIFF(MINUTE, CAST(CONCAT(CONVERT(VARCHAR(10), L.log_date, 120), ' ', CONVERT(VARCHAR(8), S.start_time, 108)) AS DATETIME), L.scan_out_time) > 570
                        THEN FLOOR((DATEDIFF(MINUTE, CAST(CONCAT(CONVERT(VARCHAR(10), L.log_date, 120), ' ', CONVERT(VARCHAR(8), S.start_time, 108)) AS DATETIME), L.scan_out_time) - 570) / 30.0) * 0.5
                        ELSE 0
                    END AS ot_hours
                FROM dbo.MANPOWER_DAILY_LOGS L WITH (NOLOCK)
                JOIN dbo.MANPOWER_EMPLOYEES E WITH (NOLOCK) ON L.emp_id = E.emp_id
                LEFT JOIN dbo.MANPOWER_TEAM_SETTINGS TS WITH (NOLOCK) ON E.department_api = TS.department_api
                LEFT JOIN dbo.MANPOWER_SHIFTS S WITH (NOLOCK) ON ISNULL(L.shift_id, E.default_shift_id) = S.shift_id
                OUTER APPLY (
                    SELECT TOP 1 category_name, rate_type, hourly_rate
                    FROM dbo.MANPOWER_CATEGORY_MAPPING WITH (NOLOCK)
                    WHERE E.position LIKE '%' + keyword + '%' COLLATE Thai_CI_AS
                    ORDER BY LEN(keyword) DESC
                ) CM
                WHERE {$whereSql}
                ORDER BY ISNULL(L.actual_line, E.line) ASC, S.shift_id ASC, L.emp_id ASC
            ";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            mpJsonSuccess($stmt->fetchAll(PDO::FETCH_ASSOC));

        case 'read_summary':
            requireMpAccess(false);
            $date = parseMpDate($input['date'] ?? null, date('Y-m-d'), 'วันที่');
            $hcGroup = trim((string)($input['hcGroup'] ?? 'ALL'));
            $useNewFormula = filter_var($input['use_new_formula'] ?? false, FILTER_VALIDATE_BOOLEAN);
            $funcName = $useNewFormula ? 'dbo.fn_GetManpowerSummary_V2' : 'dbo.fn_GetManpowerSummary';

            $sql = "
                SELECT
                    display_section,
                    shift_name,
                    team_group,
                    category_name,
                    rate_type,
                    section_id,
                    hc_group,
                    Total_Registered,
                    Count_Present,
                    Count_Late,
                    Count_Absent,
                    Count_Leave,
                    Count_Actual,
                    Total_OT_Hours,
                    Count_OT,
                    Normal_Cost,
                    OT_Cost
                FROM {$funcName}(?)
            ";
            $params = [$date];
            if ($hcGroup !== 'ALL' && $hcGroup !== '' && $hcGroup !== 'undefined' && $hcGroup !== 'null') {
                $sql .= " WHERE ISNULL(hc_group, 'MAIN') = ?";
                $params[] = $hcGroup;
            }
            $sql .= ' ORDER BY section_id ASC, display_section ASC, shift_name ASC';

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $totals = [
                'total_registered' => 0,
                'actual_present' => 0,
                'count_present' => 0,
                'count_late' => 0,
                'count_absent' => 0,
                'count_leave' => 0,
                'total_ot_hours' => 0.0,
                'count_ot' => 0,
                'dl_cost' => 0.0,
                'ot_cost' => 0.0,
                'total_cost' => 0.0,
            ];

            foreach ($rows as &$r) {
                $dl = round((float)($r['Normal_Cost'] ?? 0), 2);
                $ot = round((float)($r['OT_Cost'] ?? 0), 2);
                $r['Normal_Cost'] = $dl;
                $r['OT_Cost'] = $ot;
                $r['Total_Cost'] = round($dl + $ot, 2);

                $totals['total_registered'] += (int)($r['Total_Registered'] ?? 0);
                $totals['actual_present'] += (int)($r['Count_Actual'] ?? 0);
                $totals['count_present'] += (int)($r['Count_Present'] ?? 0);
                $totals['count_late'] += (int)($r['Count_Late'] ?? 0);
                $totals['count_absent'] += (int)($r['Count_Absent'] ?? 0);
                $totals['count_leave'] += (int)($r['Count_Leave'] ?? 0);
                $totals['total_ot_hours'] += (float)($r['Total_OT_Hours'] ?? 0);
                $totals['count_ot'] += (int)($r['Count_OT'] ?? 0);
                $totals['dl_cost'] += $dl;
                $totals['ot_cost'] += $ot;
                $totals['total_cost'] += ($dl + $ot);
            }
            unset($r);

            $calStmt = $pdo->prepare("SELECT TOP 1 calendar_date, day_type, description, work_rate_holiday, ot_rate_holiday FROM dbo.MANPOWER_CALENDAR WITH (NOLOCK) WHERE calendar_date = ?");
            $calStmt->execute([$date]);
            $dayInfo = $calStmt->fetch(PDO::FETCH_ASSOC) ?: null;

            mpJsonSuccess([
                'rows' => $rows,
                'kpis' => [
                    'total_registered' => $totals['total_registered'],
                    'actual_present' => $totals['actual_present'],
                    'count_present' => $totals['count_present'],
                    'count_late' => $totals['count_late'],
                    'count_absent' => $totals['count_absent'],
                    'count_leave' => $totals['count_leave'],
                    'total_ot_hours' => round($totals['total_ot_hours'], 1),
                    'count_ot' => $totals['count_ot'],
                    'dl_cost' => round($totals['dl_cost'], 2),
                    'ot_cost' => round($totals['ot_cost'], 2),
                    'total_cost' => round($totals['total_cost'], 2),
                    'formula_version' => $useNewFormula ? 'V2' : 'V1',
                ],
                'day_info' => $dayInfo,
            ], 'OK', ['raw_data' => $rows]);

        case 'read_trend':
            requireMpAccess(false);
            $endDate = parseMpDate($input['endDate'] ?? null, date('Y-m-d'), 'วันสิ้นสุด');
            $startDate = parseMpDate($input['startDate'] ?? null, date('Y-m-d', strtotime('-6 days', strtotime($endDate))), 'วันเริ่มต้น');
            $hcGroup = trim((string)($input['hcGroup'] ?? 'ALL'));

            $where = ['L.log_date BETWEEN ? AND ?'];
            $params = [$startDate, $endDate];
            if ($hcGroup !== 'ALL' && $hcGroup !== '' && $hcGroup !== 'undefined' && $hcGroup !== 'null') {
                $where[] = "ISNULL(L.actual_hc_group, ISNULL(TS.hc_group, 'MAIN')) = ?";
                $params[] = $hcGroup;
            }
            $whereSql = implode(' AND ', $where);

            $sql = "
                SELECT TOP (90)
                    CONVERT(VARCHAR(10), L.log_date, 120) AS log_date,
                    MAX(ISNULL(C.day_type, 'NORMAL')) AS day_type,
                    COUNT(DISTINCT CASE
                        WHEN ISNULL(C.day_type, 'NORMAL') NOT IN ('HOLIDAY', 'SUNDAY', 'OFFDAY') THEN L.emp_id
                        WHEN L.status IN ('PRESENT', 'LATE') THEN L.emp_id
                        ELSE NULL
                    END) AS plan_hc,
                    SUM(CASE WHEN L.status IN ('PRESENT', 'LATE') THEN 1 ELSE 0 END) AS actual_present,
                    SUM(CASE WHEN L.status = 'LATE' THEN 1 ELSE 0 END) AS count_late,
                    SUM(CASE WHEN L.status = 'ABSENT' AND ISNULL(C.day_type, 'NORMAL') NOT IN ('HOLIDAY', 'SUNDAY', 'OFFDAY') THEN 1 ELSE 0 END) AS count_absent,
                    SUM(CASE WHEN L.status IN ('SICK', 'BUSINESS', 'VACATION', 'LEAVE') THEN 1 ELSE 0 END) AS count_leave
                FROM dbo.MANPOWER_DAILY_LOGS L WITH (NOLOCK)
                LEFT JOIN dbo.MANPOWER_EMPLOYEES E WITH (NOLOCK) ON L.emp_id = E.emp_id
                LEFT JOIN dbo.MANPOWER_TEAM_SETTINGS TS WITH (NOLOCK) ON E.department_api = TS.department_api
                LEFT JOIN dbo.MANPOWER_CALENDAR C WITH (NOLOCK) ON L.log_date = C.calendar_date
                WHERE {$whereSql}
                GROUP BY L.log_date
                ORDER BY L.log_date ASC
            ";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            mpJsonSuccess($stmt->fetchAll(PDO::FETCH_ASSOC));

        case 'read_range_report':
            requireMpAccess(false);
            $startDate = parseMpDate($input['startDate'] ?? null, date('Y-m-01'), 'วันเริ่มต้น');
            $endDate = parseMpDate($input['endDate'] ?? null, date('Y-m-d'), 'วันสิ้นสุด');
            $line = trim((string)($input['line'] ?? 'ALL'));
            $shift = trim((string)($input['shift'] ?? 'ALL'));
            $empType = trim((string)($input['empType'] ?? 'ALL'));

            $stmt = $pdo->prepare('EXEC dbo.sp_GetExecutiveRangeReport @StartDate = ?, @EndDate = ?, @Line = ?, @Shift = ?, @EmpType = ?');
            $stmt->execute([$startDate, $endDate, $line, $shift, $empType]);
            $summary = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];
            $trend = [];
            if ($stmt->nextRowset()) {
                $trend = $stmt->fetchAll(PDO::FETCH_ASSOC);
            }
            mpJsonSuccess(['summary' => $summary, 'trend' => $trend]);

        case 'compare_cost':
            requireMpAccess(false);
            $startDate = parseMpDate($input['startDate'] ?? null, date('Y-m-01'), 'วันเริ่มต้น');
            $endDate = parseMpDate($input['endDate'] ?? null, date('Y-m-d'), 'วันสิ้นสุด');

            $stmt = $pdo->prepare('EXEC dbo.sp_CompareLaborCost_Logic @StartDate = ?, @EndDate = ?');
            $stmt->execute([$startDate, $endDate]);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            mpJsonSuccess($rows);

        case 'integrated_analysis':
            requireMpAccess(false);
            $startDate = parseMpDate($input['startDate'] ?? null, date('Y-m-01'), 'วันเริ่มต้น');
            $endDate = parseMpDate($input['endDate'] ?? null, date('Y-m-d'), 'วันสิ้นสุด');
            $line = trim((string)($input['line'] ?? 'ALL'));
            $hcGroup = trim((string)($input['hcGroup'] ?? 'ALL'));

            $stmt = $pdo->prepare('EXEC dbo.sp_GetIntegratedManpowerAnalysis @StartDate = ?, @EndDate = ?, @Line = ?, @HcGroup = ?');
            $stmt->execute([$startDate, $endDate, $line, $hcGroup]);

            $summary = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];
            $trend = $stmt->nextRowset() ? $stmt->fetchAll(PDO::FETCH_ASSOC) : [];
            $financials = $stmt->nextRowset() ? $stmt->fetchAll(PDO::FETCH_ASSOC) : [];
            $distribution = $stmt->nextRowset() ? $stmt->fetchAll(PDO::FETCH_ASSOC) : [];

            mpJsonSuccess([
                'summary' => $summary,
                'trend' => $trend,
                'financials' => $financials,
                'distribution' => $distribution,
            ]);

        case 'detect_shift_swaps':
            requireMpAccess(false);
            $startDate = parseMpDate($input['startDate'] ?? null, date('Y-m-d', strtotime('-3 days')), 'วันเริ่มต้น');
            $endDate = parseMpDate($input['endDate'] ?? null, date('Y-m-d'), 'วันสิ้นสุด');
            $hcGroup = trim((string)($input['hcGroup'] ?? 'ALL'));

            $teamFilter = '';
            $params = [$startDate, $endDate];
            if ($hcGroup !== 'ALL' && $hcGroup !== '' && $hcGroup !== 'undefined' && $hcGroup !== 'null') {
                $teamFilter = ' AND E.department_api IN (SELECT department_api FROM dbo.MANPOWER_TEAM_SETTINGS WITH (NOLOCK) WHERE hc_group = ?) ';
                $params[] = $hcGroup;
            }

            $sql = "
                SELECT TOP (300)
                    L.log_id,
                    CONVERT(VARCHAR(10), L.log_date, 120) AS log_date,
                    L.emp_id,
                    E.name_th,
                    L.shift_id,
                    S.shift_name,
                    CONVERT(VARCHAR(5), L.scan_in_time, 108) AS scan_in,
                    CONVERT(VARCHAR(5), L.scan_out_time, 108) AS scan_out,
                    L.status,
                    CASE
                        WHEN L.shift_id = 1 AND L.scan_in_time IS NOT NULL AND (
                            CAST(L.scan_in_time AS TIME) BETWEEN '16:00:00' AND '16:59:59' OR
                            CAST(L.scan_in_time AS TIME) BETWEEN '19:00:00' AND '19:59:59' OR
                            CAST(L.scan_in_time AS TIME) BETWEEN '08:01:00' AND '09:00:59' OR
                            CAST(L.scan_in_time AS TIME) BETWEEN '05:00:00' AND '06:00:59'
                        ) THEN 'DAY_ABNORMAL_SCAN'
                        WHEN L.shift_id = 2 AND L.scan_in_time IS NOT NULL AND (
                            CAST(L.scan_in_time AS TIME) BETWEEN '07:00:00' AND '07:59:59' OR
                            CAST(L.scan_in_time AS TIME) BETWEEN '17:00:00' AND '18:00:59' OR
                            CAST(L.scan_in_time AS TIME) BETWEEN '20:01:00' AND '21:00:59'
                        ) THEN 'NIGHT_ABNORMAL_SCAN'
                        WHEN L.shift_id = 1 AND L.scan_in_time IS NOT NULL AND CAST(L.scan_in_time AS TIME) >= '13:00:00' THEN 'DAY_BUT_NIGHT_SCAN'
                        WHEN L.status = 'LATE' AND L.scan_in_time IS NOT NULL THEN 'LATE_SUSPECT'
                        WHEN L.scan_in_time IS NULL AND L.scan_out_time IS NOT NULL THEN 'ORPHAN_OUT'
                        WHEN L.shift_id = 1 AND L.scan_in_time IS NULL AND ((L.log_date = CAST(GETDATE() AS DATE) AND CAST(GETDATE() AS TIME) >= '08:30:00') OR L.log_date < CAST(GETDATE() AS DATE)) AND L.status IN ('WAITING', 'ABSENT') THEN 'MISSING_IN_SCAN'
                        WHEN L.shift_id = 2 AND L.scan_in_time IS NULL AND ((L.log_date = CAST(GETDATE() AS DATE) AND CAST(GETDATE() AS TIME) >= '20:30:00') OR L.log_date < CAST(GETDATE() AS DATE)) AND L.status IN ('WAITING', 'ABSENT') THEN 'MISSING_IN_SCAN'
                        ELSE 'SCAN_MISMATCH'
                    END AS detect_type
                FROM dbo.MANPOWER_DAILY_LOGS L WITH (NOLOCK)
                JOIN dbo.MANPOWER_EMPLOYEES E WITH (NOLOCK) ON L.emp_id = E.emp_id
                LEFT JOIN dbo.MANPOWER_SHIFTS S WITH (NOLOCK) ON L.shift_id = S.shift_id
                WHERE L.log_date BETWEEN ? AND ?
                  {$teamFilter}
                  AND (
                      (L.shift_id = 1 AND L.scan_in_time IS NOT NULL AND CAST(L.scan_in_time AS TIME) >= '13:00:00')
                      OR (L.status = 'LATE' AND L.scan_in_time IS NOT NULL)
                      OR (L.scan_in_time IS NULL AND L.scan_out_time IS NOT NULL AND L.status IN ('PRESENT','LATE'))
                      OR (L.shift_id = 1 AND L.scan_in_time IS NOT NULL AND (
                          CAST(L.scan_in_time AS TIME) BETWEEN '16:00:00' AND '16:59:59' OR
                          CAST(L.scan_in_time AS TIME) BETWEEN '19:00:00' AND '19:59:59' OR
                          CAST(L.scan_in_time AS TIME) BETWEEN '08:01:00' AND '09:00:59' OR
                          CAST(L.scan_in_time AS TIME) BETWEEN '05:00:00' AND '06:00:59'
                      ))
                      OR (L.shift_id = 2 AND L.scan_in_time IS NOT NULL AND (
                          CAST(L.scan_in_time AS TIME) BETWEEN '07:00:00' AND '07:59:59' OR
                          CAST(L.scan_in_time AS TIME) BETWEEN '17:00:00' AND '18:00:59' OR
                          CAST(L.scan_in_time AS TIME) BETWEEN '20:01:00' AND '21:00:59'
                      ))
                      OR (L.shift_id = 1 AND L.scan_in_time IS NULL AND ((L.log_date = CAST(GETDATE() AS DATE) AND CAST(GETDATE() AS TIME) >= '08:30:00') OR L.log_date < CAST(GETDATE() AS DATE)) AND L.status IN ('WAITING', 'ABSENT'))
                      OR (L.shift_id = 2 AND L.scan_in_time IS NULL AND ((L.log_date = CAST(GETDATE() AS DATE) AND CAST(GETDATE() AS TIME) >= '20:30:00') OR L.log_date < CAST(GETDATE() AS DATE)) AND L.status IN ('WAITING', 'ABSENT'))
                  )
                  AND (L.is_verified = 0 OR L.is_verified IS NULL)
                ORDER BY L.log_date DESC, L.scan_in_time DESC
            ";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            mpJsonSuccess($stmt->fetchAll(PDO::FETCH_ASSOC));

        case 'fetch_raw_central_scans':
            requireMpAccess(false);
            $startDate = parseMpDate($input['start_date'] ?? null, date('Y-m-d'), 'วันเริ่มต้น');
            $endDate = parseMpDate($input['end_date'] ?? null, date('Y-m-d', strtotime('+1 day', strtotime($startDate))), 'วันสิ้นสุด');
            $rawList = fetchCentralScanRows($startDate, $endDate);
            usort($rawList, static function ($a, $b) {
                return strtotime($b['TIMEINOUT'] ?? '') - strtotime($a['TIMEINOUT'] ?? '');
            });
            mpJsonSuccess(array_slice($rawList, 0, 1000));

        case 'export_history':
            requireMpAccess(false);
            $endDate = parseMpDate($input['endDate'] ?? null, date('Y-m-d'), 'วันสิ้นสุด');
            $startDate = parseMpDate($input['startDate'] ?? null, date('Y-m-d', strtotime('-6 days', strtotime($endDate))), 'วันเริ่มต้น');

            $sql = "
                WITH DateRange AS (
                    SELECT CAST(? AS DATE) AS SummaryDate
                    UNION ALL
                    SELECT DATEADD(DAY, 1, SummaryDate)
                    FROM DateRange
                    WHERE SummaryDate < CAST(? AS DATE)
                )
                SELECT
                    CONVERT(VARCHAR(10), d.SummaryDate, 120) AS [Date],
                    f.display_section AS [Line],
                    f.shift_name AS [Shift],
                    f.team_group AS [Team],
                    f.Total_Registered AS [Plan (HC)],
                    f.Count_Present AS [Present],
                    f.Count_Late AS [Late],
                    f.Count_Absent AS [Absent],
                    f.Count_Leave AS [Leave],
                    f.Count_Actual AS [Actual (Present+Late)],
                    (f.Count_Present + f.Count_Late + f.Count_Absent + f.Count_Leave) AS [Total_Accounted],
                    (ISNULL(f.Normal_Cost, 0) + ISNULL(f.OT_Cost, 0)) AS [Est_Cost]
                FROM DateRange d
                CROSS APPLY dbo.fn_GetManpowerSummary_V2(d.SummaryDate) f
                ORDER BY d.SummaryDate DESC, f.section_id ASC, f.shift_name ASC
                OPTION (MAXRECURSION 366)
            ";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$startDate, $endDate]);
            mpJsonSuccess($stmt->fetchAll(PDO::FETCH_ASSOC));

        case 'update_log':
            requireMpAccess(true);
            $logId = (int)($input['log_id'] ?? 0);
            if ($logId <= 0) {
                throw new InvalidArgumentException('ไม่พบรหัส Log (log_id)');
            }

            $oldStmt = $pdo->prepare("SELECT log_id, CONVERT(VARCHAR(10), log_date, 120) AS log_date, emp_id, shift_id, status, scan_in_time, scan_out_time, remark, actual_line, actual_team, is_verified FROM dbo.MANPOWER_DAILY_LOGS WHERE log_id = ?");
            $oldStmt->execute([$logId]);
            $oldRow = $oldStmt->fetch(PDO::FETCH_ASSOC);
            if (!$oldRow) {
                throw new InvalidArgumentException('ไม่พบข้อมูลการลงเวลาที่ต้องการแก้ไข');
            }

            $logDate = $oldRow['log_date'];
            $status = strtoupper(trim((string)($input['status'] ?? $oldRow['status'])));
            $shiftId = !empty($input['shift_id']) ? (int)$input['shift_id'] : (int)$oldRow['shift_id'];
            $remark = substr(trim((string)($input['remark'] ?? '')), 0, 500);
            $actualLine = isset($input['actual_line']) && trim((string)$input['actual_line']) !== ''
                ? trim((string)$input['actual_line'])
                : $oldRow['actual_line'];
            $actualTeam = isset($input['actual_team']) && trim((string)$input['actual_team']) !== ''
                ? trim((string)$input['actual_team'])
                : $oldRow['actual_team'];

            $formatScan = static function (?string $rawTime, string $baseDate): ?string {
                $t = trim((string)$rawTime);
                if ($t === '') {
                    return null;
                }
                if (preg_match('/^\d{4}-\d{2}-\d{2}/', $t)) {
                    return date('Y-m-d H:i:s', strtotime($t));
                }
                return date('Y-m-d H:i:s', strtotime("{$baseDate} {$t}"));
            };

            $scanIn = array_key_exists('scan_in_time', $input) ? $formatScan((string)$input['scan_in_time'], $logDate) : $oldRow['scan_in_time'];
            $scanOut = array_key_exists('scan_out_time', $input) ? $formatScan((string)$input['scan_out_time'], $logDate) : $oldRow['scan_out_time'];

            if ($scanOut !== null && $scanIn !== null && strtotime($scanOut) < strtotime($scanIn)) {
                $scanOut = date('Y-m-d H:i:s', strtotime($scanOut . ' +1 day'));
            }

            $pdo->beginTransaction();
            $stmtUpd = $pdo->prepare("
                UPDATE dbo.MANPOWER_DAILY_LOGS
                SET status = ?, shift_id = ?, scan_in_time = ?, scan_out_time = ?,
                    remark = ?, actual_line = ?, actual_team = ?,
                    is_verified = 1, verified_by = ?, verified_at = GETDATE(),
                    updated_by = ?, updated_at = GETDATE()
                WHERE log_id = ?
            ");
            $stmtUpd->execute([
                $status,
                $shiftId,
                $scanIn,
                $scanOut,
                $remark,
                $actualLine,
                $actualTeam,
                $updatedBy,
                $updatedBy,
                $logId,
            ]);
            recalculateManpowerDailyCost($pdo, $logDate, $logDate);
            writeLog($pdo, 'UPDATE', 'MANPOWER_LOG', (string)$logId, $oldRow, [
                'status' => $status,
                'shift_id' => $shiftId,
                'scan_in_time' => $scanIn,
                'scan_out_time' => $scanOut,
                'actual_line' => $actualLine,
                'actual_team' => $actualTeam,
            ], "Updated daily attendance log for {$oldRow['emp_id']} on {$logDate}");
            $pdo->commit();
            mpJsonSuccess(null, 'อัปเดตบันทึกเวลาเรียบร้อยแล้ว');

        case 'update_log_status':
            requireMpAccess(true);
            $logId = (int)($input['log_id'] ?? 0);
            $status = strtoupper(trim((string)($input['status'] ?? '')));
            if ($logId <= 0 || $status === '') {
                throw new InvalidArgumentException('ข้อมูล log_id หรือ status ไม่ถูกต้อง');
            }

            $oldStmt = $pdo->prepare("SELECT log_id, emp_id, status, CONVERT(VARCHAR(10), log_date, 120) AS log_date FROM dbo.MANPOWER_DAILY_LOGS WHERE log_id = ?");
            $oldStmt->execute([$logId]);
            $oldRow = $oldStmt->fetch(PDO::FETCH_ASSOC);
            if (!$oldRow) {
                throw new InvalidArgumentException('ไม่พบข้อมูล Log');
            }

            $pdo->beginTransaction();
            $pdo->prepare("
                UPDATE dbo.MANPOWER_DAILY_LOGS
                SET status = ?, is_verified = 1, verified_by = ?, verified_at = GETDATE(), updated_by = ?, updated_at = GETDATE()
                WHERE log_id = ?
            ")->execute([$status, $updatedBy, $updatedBy, $logId]);
            recalculateManpowerDailyCost($pdo, $oldRow['log_date'], $oldRow['log_date']);
            writeLog($pdo, 'UPDATE', 'MANPOWER_LOG', (string)$logId, ['status' => $oldRow['status']], ['status' => $status], "Quick status update for {$oldRow['emp_id']}");
            $pdo->commit();
            mpJsonSuccess(null, 'อัปเดตสถานะเรียบร้อยแล้ว');

        case 'delete_log':
            requireMpAccess(true);
            $logId = (int)($input['log_id'] ?? 0);
            if ($logId <= 0) {
                throw new InvalidArgumentException('ข้อมูล log_id ไม่ถูกต้อง');
            }

            $oldStmt = $pdo->prepare("SELECT log_id, emp_id, status, CONVERT(VARCHAR(10), log_date, 120) AS log_date FROM dbo.MANPOWER_DAILY_LOGS WHERE log_id = ?");
            $oldStmt->execute([$logId]);
            $oldRow = $oldStmt->fetch(PDO::FETCH_ASSOC);
            if (!$oldRow) {
                throw new InvalidArgumentException('ไม่พบข้อมูล Log');
            }

            $pdo->beginTransaction();
            $pdo->prepare('DELETE FROM dbo.MANPOWER_DAILY_LOGS WHERE log_id = ?')->execute([$logId]);
            recalculateManpowerDailyCost($pdo, $oldRow['log_date'], $oldRow['log_date']);
            writeLog($pdo, 'DELETE', 'MANPOWER_LOG', (string)$logId, $oldRow, null, "Deleted attendance log {$oldRow['emp_id']}");
            $pdo->commit();
            mpJsonSuccess(null, 'ลบรายการลงเวลาเรียบร้อยแล้ว');

        case 'clear_day':
            requireMpAccess(true);
            $date = parseMpDate($input['date'] ?? null, null, 'วันที่');
            if (!$date) {
                throw new InvalidArgumentException('กรุณาระบุวันที่');
            }
            $hardReset = filter_var($input['hard_reset'] ?? false, FILTER_VALIDATE_BOOLEAN);

            $pdo->beginTransaction();
            if ($hardReset) {
                $stmt = $pdo->prepare('DELETE FROM dbo.MANPOWER_DAILY_LOGS WHERE log_date = ?');
                $stmt->execute([$date]);
                $affected = $stmt->rowCount();
            } else {
                $stmt = $pdo->prepare("
                    UPDATE dbo.MANPOWER_DAILY_LOGS
                    SET scan_in_time = NULL, scan_out_time = NULL, status = 'WAITING', is_verified = 0, updated_by = ?, updated_at = GETDATE()
                    WHERE log_date = ? AND (is_verified = 0 OR is_verified IS NULL)
                ");
                $stmt->execute([$updatedBy, $date]);
                $affected = $stmt->rowCount();
            }
            recalculateManpowerDailyCost($pdo, $date, $date);
            writeLog($pdo, $hardReset ? 'DELETE' : 'UPDATE', 'MANPOWER_LOG', $date, null, ['hard_reset' => $hardReset, 'affected' => $affected], "Cleared daily logs on {$date}");
            $pdo->commit();
            mpJsonSuccess(['affected' => $affected], "ล้างข้อมูลประจำวันที่ {$date} จำนวน {$affected} รายการเรียบร้อยแล้ว");

        case 'confirm_anomaly':
            requireMpAccess(true);
            $logId = (int)($input['log_id'] ?? 0);
            if ($logId <= 0) {
                throw new InvalidArgumentException('ไม่พบรหัส log_id');
            }
            $pdo->beginTransaction();
            $pdo->prepare("UPDATE dbo.MANPOWER_DAILY_LOGS SET is_verified = 1, verified_by = ?, verified_at = GETDATE(), updated_by = ?, updated_at = GETDATE() WHERE log_id = ?")
                ->execute([$updatedBy, $updatedBy, $logId]);
            writeLog($pdo, 'UPDATE', 'MANPOWER_ANOMALY', (string)$logId, ['is_verified' => 0], ['is_verified' => 1], 'Confirmed attendance anomaly');
            $pdo->commit();
            mpJsonSuccess(null, 'ยืนยันความถูกต้องเรียบร้อยแล้ว');

        case 'batch_confirm_anomaly':
            requireMpAccess(true);
            $logIds = array_values(array_filter(array_map('intval', is_array($input['log_ids'] ?? null) ? $input['log_ids'] : []), static fn($v) => $v > 0));
            if (empty($logIds)) {
                throw new InvalidArgumentException('กรุณาเลือกรายการที่ต้องการยืนยัน');
            }
            $placeholders = implode(',', array_fill(0, count($logIds), '?'));
            $pdo->beginTransaction();
            $stmt = $pdo->prepare("UPDATE dbo.MANPOWER_DAILY_LOGS SET is_verified = 1, verified_by = ?, verified_at = GETDATE(), updated_by = ?, updated_at = GETDATE() WHERE log_id IN ({$placeholders})");
            $stmt->execute(array_merge([$updatedBy, $updatedBy], $logIds));
            writeLog($pdo, 'UPDATE', 'MANPOWER_ANOMALY', 'BATCH_' . count($logIds), null, ['log_ids' => $logIds], 'Batch confirmed attendance anomalies');
            $pdo->commit();
            mpJsonSuccess(['count' => count($logIds)], 'ยืนยันรายการที่เลือกทั้งหมดเรียบร้อยแล้ว');

        case 'quick_swap_shift':
        case 'batch_quick_swap_shift':
            requireMpAccess(true);
            $applyFuture = filter_var($input['apply_future'] ?? false, FILTER_VALIDATE_BOOLEAN);
            $rawLogs = $action === 'quick_swap_shift'
                ? [['log_id' => $input['log_id'] ?? 0, 'new_shift_id' => $input['new_shift_id'] ?? 0]]
                : (is_array($input['logs'] ?? null) ? $input['logs'] : []);

            $logDetails = [];
            $minDate = '2099-12-31';
            $maxDate = '1970-01-01';
            foreach ($rawLogs as $item) {
                $lId = (int)($item['log_id'] ?? 0);
                $sId = (int)($item['new_shift_id'] ?? 0);
                if ($lId <= 0 || $sId <= 0) {
                    continue;
                }
                $st = $pdo->prepare("
                    SELECT L.log_id, L.emp_id, CONVERT(VARCHAR(10), L.log_date, 120) AS log_date, L.shift_id AS old_shift_id, CONVERT(VARCHAR(8), S.start_time, 108) AS start_time
                    FROM dbo.MANPOWER_DAILY_LOGS L WITH (NOLOCK)
                    CROSS JOIN dbo.MANPOWER_SHIFTS S WITH (NOLOCK)
                    WHERE L.log_id = ? AND S.shift_id = ?
                ");
                $st->execute([$lId, $sId]);
                $det = $st->fetch(PDO::FETCH_ASSOC);
                if ($det) {
                    $det['new_shift_id'] = $sId;
                    $logDetails[] = $det;
                    if ($det['log_date'] < $minDate) $minDate = $det['log_date'];
                    if ($det['log_date'] > $maxDate) $maxDate = $det['log_date'];
                }
            }
            if (empty($logDetails)) {
                throw new InvalidArgumentException('ไม่พบข้อมูลพนักงานหรือกะที่ต้องการสลับ');
            }

            $allScansByEmp = [];
            try {
                $apiStartDate = date('Y-m-d', strtotime('-1 day', strtotime($minDate)));
                $apiEndDate = date('Y-m-d', strtotime('+1 day', strtotime($maxDate)));
                $rawList = fetchCentralScanRows($apiStartDate, $apiEndDate);
                foreach ($rawList as $row) {
                    $eid = trim((string)($row['EMPID'] ?? ''));
                    $ts = strtotime((string)($row['TIMEINOUT'] ?? ''));
                    if ($eid !== '' && $ts && (int)date('Y', $ts) > 2020) {
                        $allScansByEmp[$eid][] = $ts;
                    }
                }
                foreach ($allScansByEmp as &$scans) {
                    sort($scans);
                    $scans = array_values(array_unique($scans));
                }
                unset($scans);
            } catch (Throwable $scanErr) {
                // Allow shift update without aborting when scanner service is temporarily unreachable
                writeErrorLog($pdo, 'MANPOWER_SCAN_FETCH', $scanErr->getMessage(), ['minDate' => $minDate, 'maxDate' => $maxDate]);
            }

            $pdo->beginTransaction();
            $successCount = 0;
            $affectedDates = [];
            foreach ($logDetails as $det) {
                $paired = pairShiftWindowScans($allScansByEmp[$det['emp_id']] ?? [], $det['log_date'], $det['start_time'] ?? '08:00:00');
                $pdo->prepare("
                    UPDATE dbo.MANPOWER_DAILY_LOGS
                    SET shift_id = ?, scan_in_time = ?, scan_out_time = ?, status = ?, is_verified = 1, verified_by = ?, verified_at = GETDATE(), updated_by = ?, updated_at = GETDATE()
                    WHERE log_id = ?
                ")->execute([
                    $det['new_shift_id'],
                    $paired['scan_in_time'],
                    $paired['scan_out_time'],
                    $paired['status'],
                    $updatedBy,
                    $updatedBy,
                    $det['log_id'],
                ]);

                if ($applyFuture) {
                    $pdo->prepare("UPDATE dbo.MANPOWER_EMPLOYEES SET default_shift_id = ?, last_sync_at = GETDATE() WHERE emp_id = ?")
                        ->execute([$det['new_shift_id'], $det['emp_id']]);
                    $pdo->prepare("
                        UPDATE L
                        SET L.shift_id = ?,
                            L.status = CASE
                                WHEN L.scan_in_time IS NULL AND L.log_date >= CAST(GETDATE() AS DATE) THEN 'WAITING'
                                WHEN L.scan_in_time IS NULL AND L.log_date < CAST(GETDATE() AS DATE) THEN 'ABSENT'
                                WHEN CAST(L.scan_in_time AS TIME) > S.start_time THEN 'LATE'
                                ELSE 'PRESENT'
                            END,
                            L.updated_by = ?, L.updated_at = GETDATE()
                        FROM dbo.MANPOWER_DAILY_LOGS L
                        JOIN dbo.MANPOWER_SHIFTS S ON S.shift_id = ?
                        WHERE L.emp_id = ? AND L.log_date > ? AND L.log_id != ?
                    ")->execute([$det['new_shift_id'], $updatedBy, $det['new_shift_id'], $det['emp_id'], $det['log_date'], $det['log_id']]);
                }

                $affectedDates[$det['log_date']] = true;
                $successCount++;
            }

            foreach (array_keys($affectedDates) as $d) {
                recalculateManpowerDailyCost($pdo, $d, $applyFuture ? date('Y-m-d', strtotime('+3 days')) : $d);
            }
            writeLog($pdo, 'UPDATE', 'MANPOWER_SHIFT_SWAP', 'SWAP_' . $successCount, $logDetails, ['apply_future' => $applyFuture], "Swapped shift for {$successCount} record(s)");
            $pdo->commit();
            mpJsonSuccess(['count' => $successCount], "สลับกะและคำนวณเวลาใหม่จำนวน {$successCount} รายการเรียบร้อยแล้ว");

        case 'batch_clear_times':
            requireMpAccess(true);
            $logs = array_values(array_filter(array_map('intval', is_array($input['logs'] ?? null) ? $input['logs'] : []), static fn($v) => $v > 0));
            if (empty($logs)) {
                throw new InvalidArgumentException('กรุณาเลือกรายการ Log');
            }
            $placeholders = implode(',', array_fill(0, count($logs), '?'));

            $pdo->beginTransaction();
            $stmtDates = $pdo->prepare("SELECT DISTINCT CONVERT(VARCHAR(10), log_date, 120) AS log_date FROM dbo.MANPOWER_DAILY_LOGS WHERE log_id IN ({$placeholders})");
            $stmtDates->execute($logs);
            $dates = $stmtDates->fetchAll(PDO::FETCH_COLUMN);

            $stmt = $pdo->prepare("
                UPDATE dbo.MANPOWER_DAILY_LOGS
                SET scan_in_time = NULL, scan_out_time = NULL, status = 'HOLIDAY', is_verified = 1, verified_by = ?, verified_at = GETDATE(), updated_by = ?, updated_at = GETDATE()
                WHERE log_id IN ({$placeholders})
            ");
            $stmt->execute(array_merge([$updatedBy, $updatedBy], $logs));

            foreach ($dates as $d) {
                recalculateManpowerDailyCost($pdo, $d, $d);
            }
            writeLog($pdo, 'UPDATE', 'MANPOWER_LOG', 'BATCH_CLEAR_' . count($logs), ['log_ids' => $logs], ['status' => 'HOLIDAY'], 'Batch cleared scan times');
            $pdo->commit();
            mpJsonSuccess(['count' => count($logs)], 'ล้างเวลาสแกนและตั้งเป็นวันหยุดเรียบร้อยแล้ว');

        default:
            throw new InvalidArgumentException('ไม่พบคำสั่งที่ระบุ (Invalid action)');
    }
} catch (Throwable $e) {
    handleMpException($pdo, 'MANPOWER_DAILY_API', $e, $input);
}
