<?php
/**
 * Self-contained Confidential 4D Employee Grading & Criteria API.
 * Strictly restricted to creator / admin / manager with manage_manpower permission.
 * Integrates Multi-Auditor 5S consensus and University-Style Learning rules via _grading_helpers.php.
 */

require_once __DIR__ . '/_common.php';
require_once __DIR__ . '/_grading_helpers.php';

$input = [];
try {
    [$action, $input, $currentUser] = parseMpRequest('get_grading_data');
    requireMpAccess(true, true);

    $userId = (int)$currentUser['id'];
    $empIdSelf = resolveSessionEmpId($pdo, $currentUser);

    switch ($action) {
        case 'get_grading_data':
            $parsed = parseMpPeriod((string)($input['period'] ?? date('Y-m')));
            $period = $parsed['period'];
            $startDate = $parsed['start_date'];
            $endDate = $parsed['end_date'];
            $line = trim((string)($input['line'] ?? 'ALL'));
            $hcGroup = trim((string)($input['hcGroup'] ?? 'ALL'));

            $sql = "
                SELECT TOP (1000)
                    E.emp_id, E.name_th, E.position, E.department_api, E.line, E.team_group,
                    ISNULL(TS.hc_group, '') AS hc_group,
                    U.sys_role,
                    G.grade, G.notes, G.grade_iph, G.grade_5s, G.grade_attendance, G.grade_learning, G.grade_overall,
                    ISNULL(INC.income_per_head, 0) AS income_per_head,
                    ISNULL(WAGE.total_wage, 350.0) AS total_wage,
                    ISNULL(WAGE.dl_wage, 350.0) AS dl_wage,
                    ISNULL(WAGE.ot_wage, 0.0) AS ot_wage,
                    ISNULL(WAGE.ot_hours, 0.0) AS ot_hours,
                    ISNULL(WAGE.late_days, 0) AS late_days,
                    ISNULL(WAGE.absent_days, 0) AS absent_days,
                    C.threshold_a, C.threshold_b, C.threshold_c,
                    C.att_max_late_a, C.att_max_late_b, C.att_max_late_c,
                    ISNULL(TS.weight_iph, 25) AS weight_iph,
                    ISNULL(TS.weight_5s, 25) AS weight_5s,
                    ISNULL(TS.weight_attendance, 25) AS weight_attendance,
                    ISNULL(TS.weight_learning, 25) AS weight_learning
                FROM dbo.MANPOWER_EMPLOYEES E WITH (NOLOCK)
                LEFT JOIN dbo.MANPOWER_TEAM_SETTINGS TS WITH (NOLOCK) ON E.department_api = TS.department_api
                OUTER APPLY (
                    SELECT TOP 1 role AS sys_role
                    FROM dbo.USERS WITH (NOLOCK)
                    WHERE emp_id = E.emp_id COLLATE Thai_CI_AS
                    ORDER BY is_active DESC, id ASC
                ) U
                INNER JOIN (
                    SELECT DISTINCT emp_id
                    FROM dbo.MANPOWER_DAILY_LOGS WITH (NOLOCK)
                    WHERE log_date >= ? AND log_date < ?
                ) L ON L.emp_id = E.emp_id
                LEFT JOIN dbo.EMPLOYEE_GRADES G WITH (NOLOCK) ON E.emp_id = G.emp_id AND G.evaluation_period = ?
                LEFT JOIN (
                    SELECT
                        stu.emp_id,
                        SUM(
                            stu.head_count_ratio * (t.quantity * (
                                ISNULL(t.std_cost_dl_snapshot, ISNULL(i.Cost_DL, 0)) +
                                ISNULL(t.std_cost_oh_snapshot, (ISNULL(i.Cost_OH_Machine, 0) + ISNULL(i.Cost_OH_Utilities, 0) + ISNULL(i.Cost_OH_Indirect, 0) + ISNULL(i.Cost_OH_Staff, 0) + ISNULL(i.Cost_OH_Accessory, 0) + ISNULL(i.Cost_OH_Others, 0)))
                            ))
                        ) AS income_per_head
                    FROM dbo.STOCK_TRANSACTION_USERS stu WITH (NOLOCK)
                    INNER JOIN dbo.STOCK_TRANSACTIONS t WITH (NOLOCK) ON stu.transaction_id = t.transaction_id
                    LEFT JOIN dbo.ITEMS i WITH (NOLOCK) ON t.parameter_id = i.item_id
                    WHERE t.transaction_timestamp >= DATEADD(HOUR, 8, CAST(? AS DATETIME))
                      AND t.transaction_timestamp < DATEADD(HOUR, 8, CAST(? AS DATETIME))
                      AND t.transaction_type LIKE 'PRODUCTION_%'
                    GROUP BY stu.emp_id
                ) INC ON INC.emp_id = E.emp_id COLLATE Thai_CI_AS
                LEFT JOIN (
                    SELECT
                        LOGS.emp_id,
                        LOGS.present_days * RATES.daily_rate AS dl_wage,
                        LOGS.ot_hours * RATES.ot_rate AS ot_wage,
                        (LOGS.present_days * RATES.daily_rate) + (LOGS.ot_hours * RATES.ot_rate) AS total_wage,
                        LOGS.ot_hours,
                        LOGS.late_days,
                        LOGS.absent_days
                    FROM (
                        SELECT
                            ml.emp_id,
                            SUM(CASE WHEN ml.status IN ('PRESENT', 'LATE') THEN 1 ELSE 0 END) AS present_days,
                            SUM(CASE WHEN ml.status = 'LATE' THEN 1 ELSE 0 END) AS late_days,
                            SUM(CASE WHEN ml.status = 'ABSENT' THEN 1 ELSE 0 END) AS absent_days,
                            SUM(
                                CASE WHEN ml.scan_out_time IS NOT NULL AND ms.start_time IS NOT NULL AND ml.status IN ('PRESENT', 'LATE')
                                THEN
                                    CASE WHEN DATEDIFF(MINUTE, CAST(CONCAT(CONVERT(VARCHAR(10), ml.log_date, 120), ' ', CONVERT(VARCHAR(8), ms.start_time, 108)) AS DATETIME), ml.scan_out_time) > 570
                                    THEN FLOOR((DATEDIFF(MINUTE, CAST(CONCAT(CONVERT(VARCHAR(10), ml.log_date, 120), ' ', CONVERT(VARCHAR(8), ms.start_time, 108)) AS DATETIME), ml.scan_out_time) - 570) / 30.0) * 0.5
                                    ELSE 0 END
                                ELSE 0 END
                            ) AS ot_hours
                        FROM dbo.MANPOWER_DAILY_LOGS ml WITH (NOLOCK)
                        LEFT JOIN dbo.MANPOWER_EMPLOYEES emp WITH (NOLOCK) ON ml.emp_id = emp.emp_id COLLATE Thai_CI_AS
                        LEFT JOIN dbo.MANPOWER_SHIFTS ms WITH (NOLOCK) ON ms.shift_id = ISNULL(ml.shift_id, emp.default_shift_id)
                        WHERE ml.log_date >= ? AND ml.log_date < ?
                        GROUP BY ml.emp_id
                    ) LOGS
                    LEFT JOIN (
                        SELECT
                            e.emp_id,
                            COALESCE(CASE WHEN cm.rate_type LIKE 'MONTHLY%' THEN cm.hourly_rate / 30.0 ELSE cm.hourly_rate END, 350.0) AS daily_rate,
                            COALESCE(CASE WHEN cm.rate_type LIKE 'MONTHLY%' THEN (cm.hourly_rate / 30.0) / 8.0 ELSE cm.hourly_rate / 8.0 END, 350.0 / 8.0) * 1.5 AS ot_rate
                        FROM dbo.MANPOWER_EMPLOYEES e WITH (NOLOCK)
                        OUTER APPLY (
                            SELECT TOP 1 hourly_rate, rate_type FROM dbo.MANPOWER_CATEGORY_MAPPING WITH (NOLOCK)
                            WHERE e.position LIKE '%' + keyword + '%' COLLATE Thai_CI_AS
                            ORDER BY display_order DESC
                        ) cm
                    ) RATES ON RATES.emp_id = LOGS.emp_id COLLATE Thai_CI_AS
                ) WAGE ON WAGE.emp_id = E.emp_id COLLATE Thai_CI_AS
                LEFT JOIN dbo.EMPLOYEE_GRADING_CRITERIA C WITH (NOLOCK) ON C.line = E.line
                WHERE E.is_active = 1
            ";

            $params = [$startDate, $endDate, $period, $startDate, $endDate, $startDate, $endDate];
            if ($line !== 'ALL' && $line !== '') {
                $sql .= ' AND E.line = ?';
                $params[] = $line;
            }
            if ($hcGroup !== 'ALL' && $hcGroup !== '' && $hcGroup !== 'undefined') {
                $sql .= ' AND E.department_api IN (SELECT department_api FROM dbo.MANPOWER_TEAM_SETTINGS WITH (NOLOCK) WHERE hc_group = ?)';
                $params[] = $hcGroup;
            }
            $sql .= ' ORDER BY E.line ASC, E.emp_id ASC';

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $employees = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $empIds = array_column($employees, 'emp_id');
            $learnCtx = fetchLearningEvalContext($pdo, $empIds);
            $consensus5s = fetch5sPeriodConsensusMap($pdo, $startDate, $endDate);

            $results = [];
            foreach ($employees as $emp) {
                $eid = trim((string)$emp['emp_id']);
                $ln = trim((string)($emp['line'] ?? ''));
                $income = (float)$emp['income_per_head'];
                $wage = (float)$emp['total_wage'];
                $ratio = $wage > 0 ? ($income / $wage) : 0.0;
                $lateDays = (int)($emp['late_days'] ?? 0);
                $absentDays = (int)($emp['absent_days'] ?? 0);

                $sysIph = evaluateIphGrade($ratio, $emp);
                $sysAtt = evaluateAttendanceGrade($lateDays, $absentDays, $emp);

                $line5s = $consensus5s[$ln] ?? null;
                $sys5s = $line5s ? $line5s['grade_5s'] : 'N/A';

                $learnEval = evaluateUniversityLearning(
                    $emp,
                    $learnCtx['rules'],
                    $learnCtx['records_by_emp'][$eid] ?? [],
                    (int)($learnCtx['manual_skills_by_emp'][$eid] ?? 0),
                    $period
                );

                $results[] = [
                    'emp_id' => $eid,
                    'name_th' => $emp['name_th'],
                    'position' => $emp['position'],
                    'department_api' => $emp['department_api'],
                    'hc_group' => $emp['hc_group'],
                    'line' => $ln,
                    'team_group' => $emp['team_group'],
                    'income_per_head' => round($income, 2),
                    'total_wage' => round($wage, 2),
                    'dl_wage' => round((float)($emp['dl_wage'] ?? 0), 2),
                    'ot_wage' => round((float)($emp['ot_wage'] ?? 0), 2),
                    'ot_hours' => (float)($emp['ot_hours'] ?? 0),
                    'late_days' => $lateDays,
                    'absent_days' => $absentDays,
                    'ratio' => round($ratio, 2),
                    'system_grade_iph' => $sysIph,
                    'system_grade_attendance' => $sysAtt,
                    'system_grade_5s' => $sys5s,
                    'score_5s' => $line5s ? $line5s['score_5s'] : null,
                    'audit_5s_submitted' => $line5s ? (int)$line5s['submitted_count'] : 0,
                    'audit_5s_required' => $line5s ? (int)$line5s['required_auditors'] : 0,
                    'audit_5s_consensus_complete' => $line5s ? (bool)$line5s['is_consensus_complete'] : false,
                    'audit_5s_source' => $line5s['source'] ?? null,
                    'skill_count' => $learnEval['total_credits'],
                    'passed_courses' => $learnEval['passed_courses_total'],
                    'learning_target_a' => $learnEval['target_a'],
                    'learning_tier_name' => $learnEval['criteria_label'],
                    'learning_mandatory_passed' => $learnEval['mandatory_passed'],
                    'learning_mandatory_total' => $learnEval['mandatory_total'],
                    'learning_is_capped' => $learnEval['is_capped_by_mandatory'],
                    'learning_cap_reason' => $learnEval['cap_reason'],
                    'system_grade_learning' => $learnEval['grade'],
                    'grade' => $emp['grade'] ?? '',
                    'grade_iph' => $emp['grade_iph'] ?? '',
                    'grade_5s' => $emp['grade_5s'] ?? '',
                    'grade_attendance' => $emp['grade_attendance'] ?? '',
                    'grade_learning' => $emp['grade_learning'] ?? '',
                    'grade_overall' => $emp['grade_overall'] ?? '',
                    'weight_iph' => (int)($emp['weight_iph'] ?? 25),
                    'weight_5s' => (int)($emp['weight_5s'] ?? 25),
                    'weight_attendance' => (int)($emp['weight_attendance'] ?? 25),
                    'weight_learning' => (int)($emp['weight_learning'] ?? 25),
                    'notes' => $emp['notes'] ?? '',
                ];
            }
            mpJsonSuccess($results);

        case 'get_5s_audits':
            $auditLine = trim((string)($input['line'] ?? 'ALL'));
            $where = ['1=1'];
            $params = [];
            if ($auditLine !== 'ALL' && $auditLine !== '') {
                $where[] = 'line = ?';
                $params[] = $auditLine;
            }
            $whereSql = implode(' AND ', $where);
            $stmt = $pdo->prepare("
                SELECT TOP (200)
                    audit_id, round_id, line, CONVERT(VARCHAR(10), audit_date, 120) AS audit_date,
                    auditor_emp_id, score_seiri, score_seiton, score_seiso, score_seiketsu, score_shitsuke,
                    total_score, grade, remarks, created_at
                FROM dbo.AUDIT_5S WITH (NOLOCK)
                WHERE {$whereSql}
                ORDER BY audit_date DESC, audit_id DESC
            ");
            $stmt->execute($params);
            mpJsonSuccess($stmt->fetchAll(PDO::FETCH_ASSOC));

        case 'save_5s_audit':
            $auditLine = trim((string)($input['line'] ?? ''));
            $auditDate = parseMpDate($input['audit_date'] ?? null, date('Y-m-d'), 'วันที่ตรวจ 5ส');
            $s1 = max(0, min(20, (int)($input['score_seiri'] ?? 0)));
            $s2 = max(0, min(20, (int)($input['score_seiton'] ?? 0)));
            $s3 = max(0, min(20, (int)($input['score_seiso'] ?? 0)));
            $s4 = max(0, min(20, (int)($input['score_seiketsu'] ?? 0)));
            $s5 = max(0, min(20, (int)($input['score_shitsuke'] ?? 0)));
            $remarks = mb_substr(trim((string)($input['remarks'] ?? '')), 0, 500, 'UTF-8');
            if ($auditLine === '') {
                throw new InvalidArgumentException('กรุณาเลือกสายการผลิตสำหรับตรวจ 5ส');
            }

            $pdo->beginTransaction();
            $pdo->prepare("
                INSERT INTO dbo.AUDIT_5S
                (line, audit_date, auditor_emp_id, score_seiri, score_seiton, score_seiso, score_seiketsu, score_shitsuke, remarks, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, GETDATE())
            ")->execute([$auditLine, $auditDate, $empIdSelf ?: 'ADMIN', $s1, $s2, $s3, $s4, $s5, $remarks]);
            $newId = (int)$pdo->lastInsertId();
            $total = $s1 + $s2 + $s3 + $s4 + $s5;
            writeLog($pdo, 'CREATE', 'AUDIT_5S', (string)$newId, null, [
                'line' => $auditLine, 'audit_date' => $auditDate, 'total_score' => $total,
            ], "Recorded standalone 5S audit for {$auditLine} ({$total}/100)");
            $pdo->commit();
            mpJsonSuccess(['audit_id' => $newId, 'total_score' => $total, 'grade' => scoreTo5sGrade($total)], 'บันทึกผลตรวจ 5ส เรียบร้อยแล้ว');

        case 'save_grades':
            $period = trim((string)($input['period'] ?? date('Y-m')));
            if (preg_match('/^\d{4}-\d{2}-\d{2}_\d{4}-\d{2}-\d{2}$/', $period)) {
                throw new InvalidArgumentException('ไม่สามารถบันทึกเกรดในโหมดช่วงเวลา (RANGE) ได้ กรุณาเลือกโหมดรายเดือน (MONTH)');
            }
            parseMpPeriod($period);

            $gradesRaw = $input['grades'] ?? [];
            if (is_string($gradesRaw)) {
                $gradesRaw = json_decode($gradesRaw, true) ?? [];
            }
            if (!is_array($gradesRaw) || empty($gradesRaw)) {
                throw new InvalidArgumentException('ไม่พบข้อมูลเกรดที่ต้องการบันทึก');
            }

            $validGrades = ['A', 'B', 'C', 'D', ''];
            $pdo->beginTransaction();
            $check = $pdo->prepare('SELECT TOP 1 id, grade, grade_iph, grade_5s, grade_attendance, grade_learning, grade_overall, notes FROM dbo.EMPLOYEE_GRADES WHERE emp_id = ? AND evaluation_period = ?');
            $ins = $pdo->prepare('INSERT INTO dbo.EMPLOYEE_GRADES (emp_id, evaluation_period, grade, grade_iph, grade_5s, grade_attendance, grade_learning, grade_overall, evaluated_by, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, GETDATE(), GETDATE())');
            $upd = $pdo->prepare('UPDATE dbo.EMPLOYEE_GRADES SET grade = ?, grade_iph = ?, grade_5s = ?, grade_attendance = ?, grade_learning = ?, grade_overall = ?, evaluated_by = ?, notes = ?, updated_at = GETDATE() WHERE id = ?');

            $savedCount = 0;
            foreach ($gradesRaw as $g) {
                $empId = trim((string)($g['emp_id'] ?? ''));
                if ($empId === '') {
                    continue;
                }
                $cleanG = static function ($v) use ($validGrades): string {
                    $up = strtoupper(trim((string)$v));
                    return in_array($up, $validGrades, true) ? $up : '';
                };
                $gIph = $cleanG($g['grade_iph'] ?? '');
                $g5s = $cleanG($g['grade_5s'] ?? '');
                $gAtt = $cleanG($g['grade_attendance'] ?? '');
                $gLrn = $cleanG($g['grade_learning'] ?? '');
                $gOv = $cleanG($g['grade_overall'] ?? ($g['grade'] ?? ''));
                $gradeMain = $gOv !== '' ? $gOv : 'C';
                $notes = mb_substr(trim((string)($g['notes'] ?? '')), 0, 500, 'UTF-8');

                $check->execute([$empId, $period]);
                $oldRow = $check->fetch(PDO::FETCH_ASSOC);
                $newPayload = [
                    'grade' => $gradeMain, 'grade_iph' => $gIph, 'grade_5s' => $g5s,
                    'grade_attendance' => $gAtt, 'grade_learning' => $gLrn, 'grade_overall' => $gOv,
                    'notes' => $notes,
                ];

                if ($oldRow) {
                    $upd->execute([$gradeMain, $gIph, $g5s, $gAtt, $gLrn, $gOv, $userId, $notes, $oldRow['id']]);
                    writeLog($pdo, 'UPDATE', 'EMPLOYEE_GRADING', "{$empId}@{$period}", $oldRow, $newPayload, "Updated 4D grade for {$empId} ({$period})");
                } else {
                    $ins->execute([$empId, $period, $gradeMain, $gIph, $g5s, $gAtt, $gLrn, $gOv, $userId, $notes]);
                    writeLog($pdo, 'CREATE', 'EMPLOYEE_GRADING', "{$empId}@{$period}", null, $newPayload, "Created 4D grade for {$empId} ({$period})");
                }
                $savedCount++;
            }
            $pdo->commit();
            mpJsonSuccess(['saved_count' => $savedCount], "บันทึกเกรดพนักงาน {$savedCount} คน ประจำงวด {$period} พร้อม Audit Log เรียบร้อยแล้ว");

        case 'save_weightage':
            $hcGroup = trim((string)($input['department_api'] ?? ($input['hc_group'] ?? '')));
            $wIph = (int)($input['weight_iph'] ?? 25);
            $w5s = (int)($input['weight_5s'] ?? 25);
            $wAtt = (int)($input['weight_attendance'] ?? 25);
            $wLrn = (int)($input['weight_learning'] ?? 25);

            if ($hcGroup === '' || $hcGroup === 'ALL') {
                throw new InvalidArgumentException('กรุณาเลือกกลุ่มทีม (ไม่รวม ALL)');
            }
            if ($wIph < 0 || $w5s < 0 || $wAtt < 0 || $wLrn < 0 || ($wIph + $w5s + $wAtt + $wLrn) !== 100) {
                throw new InvalidArgumentException('ผลรวมน้ำหนักทั้ง 4 มิติต้องเท่ากับ 100% พอดี');
            }

            $pdo->beginTransaction();
            $stmtOldW = $pdo->prepare('SELECT TOP 1 weight_iph, weight_5s, weight_attendance, weight_learning FROM dbo.MANPOWER_TEAM_SETTINGS WHERE hc_group = ? OR department_api = ?');
            $stmtOldW->execute([$hcGroup, $hcGroup]);
            $oldW = $stmtOldW->fetch(PDO::FETCH_ASSOC);

            $stmt = $pdo->prepare('UPDATE dbo.MANPOWER_TEAM_SETTINGS SET weight_iph = ?, weight_5s = ?, weight_attendance = ?, weight_learning = ? WHERE hc_group = ? OR department_api = ?');
            $stmt->execute([$wIph, $w5s, $wAtt, $wLrn, $hcGroup, $hcGroup]);
            writeLog($pdo, 'UPDATE', 'GRADING_WEIGHTAGE', $hcGroup, $oldW ?: null, ['weight_iph' => $wIph, 'weight_5s' => $w5s, 'weight_attendance' => $wAtt, 'weight_learning' => $wLrn], "Updated 4D grading weightage for {$hcGroup}");
            $pdo->commit();
            mpJsonSuccess(null, "บันทึกสัดส่วนน้ำหนักกลุ่ม {$hcGroup} เรียบร้อยแล้ว");

        case 'verify_password':
            $password = (string)($input['password'] ?? '');
            if ($password === '') {
                throw new InvalidArgumentException('กรุณาระบุรหัสผ่านเพื่อยืนยันตัวตน');
            }
            $stmt = $pdo->prepare('SELECT TOP 1 password FROM dbo.USERS WITH (NOLOCK) WHERE id = ?');
            $stmt->execute([$userId]);
            $hash = (string)$stmt->fetchColumn();
            if ($hash === '' || !password_verify($password, $hash)) {
                mpJsonError('รหัสผ่านไม่ถูกต้อง', 403);
            }
            writeLog($pdo, 'UNLOCK', 'EMPLOYEE_GRADING', (string)$userId, null, null, 'Verified password to unlock confidential wage data');
            mpJsonSuccess(['verified' => true], 'ยืนยันตัวตนสำเร็จ');

        case 'get_criteria':
            $rows = $pdo->query("
                SELECT C.line, C.threshold_a, C.threshold_b, C.threshold_c, C.att_max_late_a, C.att_max_late_b, C.att_max_late_c, C.updated_at
                FROM dbo.EMPLOYEE_GRADING_CRITERIA C WITH (NOLOCK)
                ORDER BY C.line ASC
            ")->fetchAll(PDO::FETCH_ASSOC);
            $activeLines = $pdo->query("SELECT DISTINCT line FROM dbo.MANPOWER_EMPLOYEES WITH (NOLOCK) WHERE is_active = 1 AND line IS NOT NULL AND line != '' ORDER BY line ASC")->fetchAll(PDO::FETCH_COLUMN);
            mpJsonSuccess(['criteria' => $rows, 'active_lines' => $activeLines]);

        case 'save_criteria':
            $criteriaRaw = $input['criteria'] ?? [];
            if (is_string($criteriaRaw)) {
                $criteriaRaw = json_decode($criteriaRaw, true) ?? [];
            }
            if (!is_array($criteriaRaw) || empty($criteriaRaw)) {
                throw new InvalidArgumentException('ไม่พบข้อมูลเกณฑ์ที่ต้องการบันทึก');
            }
            $pdo->beginTransaction();
            $check = $pdo->prepare('SELECT line, threshold_a, threshold_b, threshold_c, att_max_late_a, att_max_late_b, att_max_late_c FROM dbo.EMPLOYEE_GRADING_CRITERIA WHERE line = ?');
            $upd = $pdo->prepare('UPDATE dbo.EMPLOYEE_GRADING_CRITERIA SET threshold_a = ?, threshold_b = ?, threshold_c = ?, att_max_late_a = ?, att_max_late_b = ?, att_max_late_c = ?, updated_by = ?, updated_at = GETDATE() WHERE line = ?');
            $ins = $pdo->prepare('INSERT INTO dbo.EMPLOYEE_GRADING_CRITERIA (line, threshold_a, threshold_b, threshold_c, att_max_late_a, att_max_late_b, att_max_late_c, updated_by, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, GETDATE())');
            $count = 0;
            foreach ($criteriaRaw as $c) {
                $ln = trim((string)($c['line'] ?? ''));
                if ($ln === '') {
                    continue;
                }
                $a = round((float)($c['threshold_a'] ?? 2.0), 2);
                $b = round((float)($c['threshold_b'] ?? 1.5), 2);
                $cVal = round((float)($c['threshold_c'] ?? 1.0), 2);
                $attA = isset($c['att_max_late_a']) && $c['att_max_late_a'] !== '' ? (int)$c['att_max_late_a'] : 0;
                $attB = isset($c['att_max_late_b']) && $c['att_max_late_b'] !== '' ? (int)$c['att_max_late_b'] : 1;
                $attC = isset($c['att_max_late_c']) && $c['att_max_late_c'] !== '' ? (int)$c['att_max_late_c'] : 2;
                if ($a < $b || $b < $cVal) {
                    throw new InvalidArgumentException("เกณฑ์ IPH ของ {$ln} ต้องเรียงจากมากไปน้อย (A ≥ B ≥ C)");
                }
                if ($attA > $attB || $attB > $attC) {
                    throw new InvalidArgumentException("เกณฑ์จำนวนวันสาย/ขาดของ {$ln} ต้องเรียงจากน้อยไปมาก (A ≤ B ≤ C)");
                }
                $check->execute([$ln]);
                $oldCrit = $check->fetch(PDO::FETCH_ASSOC);
                $newCrit = ['threshold_a' => $a, 'threshold_b' => $b, 'threshold_c' => $cVal, 'att_max_late_a' => $attA, 'att_max_late_b' => $attB, 'att_max_late_c' => $attC];
                if ($oldCrit) {
                    $upd->execute([$a, $b, $cVal, $attA, $attB, $attC, $userId, $ln]);
                    writeLog($pdo, 'UPDATE', 'GRADING_CRITERIA', $ln, $oldCrit, $newCrit, "Updated grading criteria for {$ln}");
                } else {
                    $ins->execute([$ln, $a, $b, $cVal, $attA, $attB, $attC, $userId]);
                    writeLog($pdo, 'CREATE', 'GRADING_CRITERIA', $ln, null, $newCrit, "Created grading criteria for {$ln}");
                }
                $count++;
            }
            $pdo->commit();
            mpJsonSuccess(['count' => $count], 'บันทึกเกณฑ์การตัดเกรดเรียบร้อยแล้ว');

        default:
            throw new InvalidArgumentException('ไม่พบคำสั่งที่ระบุ');
    }
} catch (Throwable $e) {
    handleMpException($pdo, 'MANPOWER_GRADING_API', $e, $input);
}
