<?php
/**
 * Self-contained Confidential 4D Employee Grading & 5S Audit API.
 * Strictly restricted to creator / admin / manager with manage_manpower permission.
 */

require_once __DIR__ . '/_common.php';

$input = [];
try {
    [$action, $input, $currentUser] = parseMpRequest('get_grading_data');
    requireMpAccess(true, true);

    $userId = (int)$currentUser['id'];
    $empIdSelf = trim((string)($currentUser['emp_id'] ?? ($currentUser['username'] ?? 'SYSTEM')));

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
                    E.emp_id, E.name_th, E.position, E.line, E.team_group,
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
                    ISNULL(TS.weight_learning, 25) AS weight_learning,
                    AUDIT5S.grade AS system_grade_5s,
                    AUDIT5S.total_score AS score_5s,
                    ISNULL(SKL.skill_count, 0) AS skill_count,
                    ISNULL(LRN.passed_courses, 0) AS passed_courses
                FROM dbo.MANPOWER_EMPLOYEES E WITH (NOLOCK)
                LEFT JOIN dbo.MANPOWER_TEAM_SETTINGS TS WITH (NOLOCK) ON E.department_api = TS.department_api
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
                LEFT JOIN (
                    SELECT a.line, a.grade, a.total_score
                    FROM dbo.AUDIT_5S a WITH (NOLOCK)
                    INNER JOIN (
                        SELECT line, MAX(audit_date) AS max_date
                        FROM dbo.AUDIT_5S WITH (NOLOCK)
                        WHERE audit_date >= ? AND audit_date < ?
                        GROUP BY line
                    ) latest ON a.line = latest.line AND a.audit_date = latest.max_date
                ) AUDIT5S ON AUDIT5S.line = E.line
                LEFT JOIN (
                    SELECT es.emp_id, COUNT(*) AS skill_count
                    FROM dbo.EMP_SKILLS es WITH (NOLOCK)
                    WHERE es.level >= 2
                    GROUP BY es.emp_id
                ) SKL ON SKL.emp_id = E.emp_id COLLATE Thai_CI_AS
                LEFT JOIN (
                    SELECT lr.emp_id, COUNT(*) AS passed_courses
                    FROM dbo.LEARNING_RECORDS lr WITH (NOLOCK)
                    WHERE lr.passed = 1
                    GROUP BY lr.emp_id
                ) LRN ON LRN.emp_id = E.emp_id COLLATE Thai_CI_AS
                WHERE E.is_active = 1
            ";

            $params = [$startDate, $endDate, $period, $startDate, $endDate, $startDate, $endDate, $startDate, $endDate];
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

            $results = [];
            foreach ($employees as $emp) {
                $income = (float)$emp['income_per_head'];
                $wage = (float)$emp['total_wage'];
                $ratio = $wage > 0 ? ($income / $wage) : 0.0;

                if (isset($emp['threshold_a']) && (float)$emp['threshold_a'] > 0) {
                    if ($ratio >= (float)$emp['threshold_a']) $systemGrade = 'A';
                    elseif ($ratio >= (float)$emp['threshold_b']) $systemGrade = 'B';
                    elseif ($ratio >= (float)$emp['threshold_c']) $systemGrade = 'C';
                    else $systemGrade = 'D';
                } else {
                    if ($ratio >= 2.0) $systemGrade = 'A';
                    elseif ($ratio >= 1.5) $systemGrade = 'B';
                    elseif ($ratio >= 1.0) $systemGrade = 'C';
                    else $systemGrade = 'D';
                }

                $lateDays = (int)($emp['late_days'] ?? 0);
                $absentDays = (int)($emp['absent_days'] ?? 0);
                $infractions = $lateDays + $absentDays;
                $attGrade = 'N/A';
                if (isset($emp['att_max_late_a']) || isset($emp['att_max_late_b']) || isset($emp['att_max_late_c'])) {
                    $maxA = (int)($emp['att_max_late_a'] ?? 0);
                    $maxB = (int)($emp['att_max_late_b'] ?? 1);
                    $maxC = (int)($emp['att_max_late_c'] ?? 2);
                    if ($infractions <= $maxA) $attGrade = 'A';
                    elseif ($infractions <= $maxB) $attGrade = 'B';
                    elseif ($infractions <= $maxC) $attGrade = 'C';
                    else $attGrade = 'D';
                }

                $skillCount = (int)($emp['skill_count'] ?? 0);
                $passedCourses = (int)($emp['passed_courses'] ?? 0);
                $effectiveLearningCount = max($skillCount, $passedCourses);

                $posUpper = mb_strtoupper(trim((string)($emp['position'] ?? '')), 'UTF-8');
                $isTier3 = mb_strpos($posUpper, 'ผู้จัดการ', 0, 'UTF-8') !== false
                    || mb_strpos($posUpper, 'บริหาร', 0, 'UTF-8') !== false
                    || mb_strpos($posUpper, 'MINI MD', 0, 'UTF-8') !== false
                    || mb_strpos($posUpper, 'วิศวกร', 0, 'UTF-8') !== false
                    || mb_strpos($posUpper, 'ENGINEER', 0, 'UTF-8') !== false;
                $isTier2 = !$isTier3 && (
                    mb_strpos($posUpper, 'หัวหน้า', 0, 'UTF-8') !== false
                    || mb_strpos($posUpper, 'SUPERVISOR', 0, 'UTF-8') !== false
                    || mb_strpos($posUpper, 'LEADER', 0, 'UTF-8') !== false
                    || mb_strpos($posUpper, 'SPECIAL', 0, 'UTF-8') !== false
                    || mb_strpos($posUpper, 'เทคนิค', 0, 'UTF-8') !== false
                );

                if ($isTier3) {
                    $lrnTargetA = 8; $lrnTargetB = 5; $lrnTargetC = 2;
                    $lrnTierName = 'Tier 3: บริหาร/วิศวกร (A≥8, B≥5, C≥2)';
                } elseif ($isTier2) {
                    $lrnTargetA = 5; $lrnTargetB = 3; $lrnTargetC = 1;
                    $lrnTierName = 'Tier 2: หัวหน้างาน/เทคนิค (A≥5, B≥3, C≥1)';
                } else {
                    $lrnTargetA = 3; $lrnTargetB = 2; $lrnTargetC = 1;
                    $lrnTierName = 'Tier 1: ปฏิบัติการทั่วไป (A≥3, B=2, C=1)';
                }

                $learningGrade = 'D';
                if ($effectiveLearningCount >= $lrnTargetA) $learningGrade = 'A';
                elseif ($effectiveLearningCount >= $lrnTargetB) $learningGrade = 'B';
                elseif ($effectiveLearningCount >= $lrnTargetC) $learningGrade = 'C';

                $results[] = [
                    'emp_id' => $emp['emp_id'],
                    'name_th' => $emp['name_th'],
                    'position' => $emp['position'],
                    'line' => $emp['line'],
                    'team_group' => $emp['team_group'],
                    'income_per_head' => round($income, 2),
                    'total_wage' => round($wage, 2),
                    'dl_wage' => round((float)($emp['dl_wage'] ?? 0), 2),
                    'ot_wage' => round((float)($emp['ot_wage'] ?? 0), 2),
                    'ot_hours' => (float)($emp['ot_hours'] ?? 0),
                    'late_days' => $lateDays,
                    'absent_days' => $absentDays,
                    'ratio' => round($ratio, 2),
                    'system_grade_iph' => $systemGrade,
                    'system_grade_attendance' => $attGrade,
                    'system_grade_5s' => $emp['system_grade_5s'] ?? null,
                    'score_5s' => (int)($emp['score_5s'] ?? 0),
                    'skill_count' => $effectiveLearningCount,
                    'passed_courses' => $passedCourses,
                    'learning_target_a' => $lrnTargetA,
                    'learning_tier_name' => $lrnTierName,
                    'system_grade_learning' => $learningGrade,
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
                    audit_id, line, CONVERT(VARCHAR(10), audit_date, 120) AS audit_date,
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
            $remarks = substr(trim((string)($input['remarks'] ?? '')), 0, 500);
            if ($auditLine === '') {
                throw new InvalidArgumentException('กรุณาเลือกสายการผลิตสำหรับตรวจ 5ส');
            }

            $pdo->beginTransaction();
            $pdo->prepare("
                INSERT INTO dbo.AUDIT_5S
                (line, audit_date, auditor_emp_id, score_seiri, score_seiton, score_seiso, score_seiketsu, score_shitsuke, remarks, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, GETDATE())
            ")->execute([$auditLine, $auditDate, $empIdSelf, $s1, $s2, $s3, $s4, $s5, $remarks]);
            $newId = (int)$pdo->lastInsertId();
            $total = $s1 + $s2 + $s3 + $s4 + $s5;
            writeLog($pdo, 'CREATE', 'AUDIT_5S', (string)$newId, null, [
                'line' => $auditLine, 'audit_date' => $auditDate, 'total_score' => $total,
            ], "Recorded 5S audit for {$auditLine} ({$total}/100)");
            $pdo->commit();
            mpJsonSuccess(['audit_id' => $newId, 'total_score' => $total], 'บันทึกผลตรวจ 5ส เรียบร้อยแล้ว');

        case 'save_grades':
            $period = trim((string)($input['period'] ?? date('Y-m')));
            $gradesRaw = $input['grades'] ?? [];
            if (is_string($gradesRaw)) {
                $gradesRaw = json_decode($gradesRaw, true) ?? [];
            }
            if (!is_array($gradesRaw) || empty($gradesRaw)) {
                throw new InvalidArgumentException('ไม่พบข้อมูลเกรดที่ต้องการบันทึก');
            }

            $pdo->beginTransaction();
            $check = $pdo->prepare('SELECT TOP 1 id, grade, grade_iph, grade_5s, grade_attendance, grade_learning, grade_overall FROM dbo.EMPLOYEE_GRADES WHERE emp_id = ? AND evaluation_period = ?');
            $ins = $pdo->prepare('INSERT INTO dbo.EMPLOYEE_GRADES (emp_id, evaluation_period, grade, grade_iph, grade_5s, grade_attendance, grade_learning, grade_overall, evaluated_by, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, GETDATE(), GETDATE())');
            $upd = $pdo->prepare('UPDATE dbo.EMPLOYEE_GRADES SET grade = ?, grade_iph = ?, grade_5s = ?, grade_attendance = ?, grade_learning = ?, grade_overall = ?, evaluated_by = ?, notes = ?, updated_at = GETDATE() WHERE id = ?');

            $savedCount = 0;
            foreach ($gradesRaw as $g) {
                $empId = trim((string)($g['emp_id'] ?? ''));
                if ($empId === '') {
                    continue;
                }
                $gIph = strtoupper(trim((string)($g['grade_iph'] ?? '')));
                $g5s = strtoupper(trim((string)($g['grade_5s'] ?? '')));
                $gAtt = strtoupper(trim((string)($g['grade_attendance'] ?? '')));
                $gLrn = strtoupper(trim((string)($g['grade_learning'] ?? '')));
                $gOv = strtoupper(trim((string)($g['grade_overall'] ?? ($g['grade'] ?? ''))));
                $gradeMain = $gOv !== '' ? $gOv : strtoupper(trim((string)($g['grade'] ?? 'C')));
                $notes = substr(trim((string)($g['notes'] ?? '')), 0, 500);

                $check->execute([$empId, $period]);
                $oldRow = $check->fetch(PDO::FETCH_ASSOC);
                if ($oldRow) {
                    $upd->execute([$gradeMain, $gIph, $g5s, $gAtt, $gLrn, $gOv, $userId, $notes, $oldRow['id']]);
                } else {
                    $ins->execute([$empId, $period, $gradeMain, $gIph, $g5s, $gAtt, $gLrn, $gOv, $userId, $notes]);
                }
                $savedCount++;
            }
            writeLog($pdo, 'UPDATE', 'EMPLOYEE_GRADING', $period, null, ['saved_count' => $savedCount], "Saved 4D evaluation grades for {$savedCount} employees ({$period})");
            $pdo->commit();
            mpJsonSuccess(['saved_count' => $savedCount], "บันทึกเกรดพนักงาน {$savedCount} คน ประจำงวด {$period} เรียบร้อยแล้ว");

        case 'save_weightage':
            $hcGroup = trim((string)($input['department_api'] ?? ($input['hc_group'] ?? '')));
            $wIph = (int)($input['weight_iph'] ?? 25);
            $w5s = (int)($input['weight_5s'] ?? 25);
            $wAtt = (int)($input['weight_attendance'] ?? 25);
            $wLrn = (int)($input['weight_learning'] ?? 25);

            if ($hcGroup === '' || $hcGroup === 'ALL') {
                throw new InvalidArgumentException('กรุณาเลือกกลุ่มทีม (ไม่รวม ALL)');
            }
            if ($wIph + $w5s + $wAtt + $wLrn !== 100) {
                throw new InvalidArgumentException('ผลรวมน้ำหนักทั้ง 4 มิติต้องเท่ากับ 100% พอดี');
            }

            $pdo->beginTransaction();
            $stmt = $pdo->prepare('UPDATE dbo.MANPOWER_TEAM_SETTINGS SET weight_iph = ?, weight_5s = ?, weight_attendance = ?, weight_learning = ? WHERE hc_group = ? OR department_api = ?');
            $stmt->execute([$wIph, $w5s, $wAtt, $wLrn, $hcGroup, $hcGroup]);
            writeLog($pdo, 'UPDATE', 'GRADING_WEIGHTAGE', $hcGroup, null, ['iph' => $wIph, '5s' => $w5s, 'att' => $wAtt, 'learn' => $wLrn], "Updated 4D grading weightage for {$hcGroup}");
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
            $check = $pdo->prepare('SELECT 1 FROM dbo.EMPLOYEE_GRADING_CRITERIA WHERE line = ?');
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
                $check->execute([$ln]);
                if ($check->fetchColumn()) {
                    $upd->execute([$a, $b, $cVal, $attA, $attB, $attC, $userId, $ln]);
                } else {
                    $ins->execute([$ln, $a, $b, $cVal, $attA, $attB, $attC, $userId]);
                }
                $count++;
            }
            writeLog($pdo, 'UPDATE', 'GRADING_CRITERIA', 'BATCH_' . $count, null, ['count' => $count], 'Updated 4D grading criteria thresholds');
            $pdo->commit();
            mpJsonSuccess(['count' => $count], 'บันทึกเกณฑ์การตัดเกรดเรียบร้อยแล้ว');

        default:
            throw new InvalidArgumentException('ไม่พบคำสั่งที่ระบุ');
    }
} catch (Throwable $e) {
    handleMpException($pdo, 'MANPOWER_GRADING_API', $e, $input);
}
