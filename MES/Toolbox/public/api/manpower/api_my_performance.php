<?php
/**
 * Self-View 4D Employee Performance API (Header Widget & #/profile).
 * - Always scopes data strictly to the authenticated session user's emp_id.
 * - Opens 4D evaluation visibility for all employees matched to an emp_id.
 * - Masks raw THB financial amounts (income_per_head, total_wage) for Non-Management roles.
 */

require_once __DIR__ . '/_common.php';
require_once __DIR__ . '/_grading_helpers.php';

try {
    [, , $currentUser] = parseMpRequest('get_my_performance');
    $canViewFinancials = isGradingManagerUser($currentUser);
    $empId = resolveSessionEmpId($pdo, $currentUser);

    $emptyPayload = [
        'has_data' => false,
        'restricted' => false,
        'wage_masked' => !$canViewFinancials,
        'can_view_financials' => $canViewFinancials,
        'grade' => '-',
        'grade_iph' => '-',
        'grade_5s' => '-',
        'grade_attendance' => '-',
        'grade_learning' => '-',
        'grade_overall' => '-',
        'system_grade' => '-',
        'system_grade_5s' => '-',
        'system_grade_attendance' => '-',
        'system_grade_learning' => '-',
        'system_grade_overall' => '-',
        'income_per_head' => $canViewFinancials ? 0 : null,
        'total_wage' => $canViewFinancials ? 0 : null,
        'income_ratio' => 0,
        'late_days' => 0,
        'absent_days' => 0,
        'score_5s' => null,
        'audit_5s' => null,
        'skill_count' => 0,
        'passed_courses' => 0,
        'weights' => ['iph' => 25, 's5' => 25, 'attendance' => 25, 'learning' => 25],
        'learning_eval' => null,
        'trend' => [],
    ];

    if ($empId === '') {
        mpJsonSuccess($emptyPayload, 'ไม่พบรหัสพนักงานที่ผูกกับบัญชีผู้ใช้');
    }

    $currentPeriod = date('Y-m');
    $startDate = $currentPeriod . '-01';
    $endDate = date('Y-m-d', strtotime($startDate . ' +1 month'));

    $sql = "
        SELECT
            E.emp_id, E.name_th, E.position, E.department_api, E.line,
            ISNULL(TS.hc_group, '') AS hc_group,
            ISNULL(TS.weight_iph, 25) AS weight_iph,
            ISNULL(TS.weight_5s, 25) AS weight_5s,
            ISNULL(TS.weight_attendance, 25) AS weight_attendance,
            ISNULL(TS.weight_learning, 25) AS weight_learning,
            G.evaluation_period AS saved_period,
            G.grade, G.grade_iph, G.grade_5s, G.grade_attendance, G.grade_learning, G.grade_overall,
            ISNULL(INC.income_per_head, 0) AS income_per_head,
            ISNULL(WAGE.total_wage, 350.0) AS total_wage,
            ISNULL(WAGE.late_days, 0) AS late_days,
            ISNULL(WAGE.absent_days, 0) AS absent_days,
            C.threshold_a, C.threshold_b, C.threshold_c,
            C.att_max_late_a, C.att_max_late_b, C.att_max_late_c
        FROM dbo.MANPOWER_EMPLOYEES E WITH (NOLOCK)
        LEFT JOIN dbo.MANPOWER_TEAM_SETTINGS TS WITH (NOLOCK) ON E.department_api = TS.department_api
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
            WHERE CONVERT(VARCHAR(7), DATEADD(HOUR, -8, t.transaction_timestamp), 120) = :period1
              AND t.transaction_type LIKE 'PRODUCTION_%'
            GROUP BY stu.emp_id
        ) INC ON INC.emp_id = E.emp_id COLLATE Thai_CI_AS
        LEFT JOIN (
            SELECT
                ml.emp_id,
                SUM(
                    CASE WHEN ml.status IN ('PRESENT', 'LATE') THEN
                        COALESCE(CASE WHEN cm.rate_type LIKE 'MONTHLY%' THEN cm.hourly_rate / 30.0 ELSE cm.hourly_rate END, 350.0) +
                        (CASE WHEN ml.scan_out_time IS NOT NULL AND ms.start_time IS NOT NULL
                            THEN CASE WHEN DATEDIFF(MINUTE, CAST(CONCAT(ml.log_date, ' ', ms.start_time) AS DATETIME), ml.scan_out_time) > 570
                                THEN FLOOR((DATEDIFF(MINUTE, CAST(CONCAT(ml.log_date, ' ', ms.start_time) AS DATETIME), ml.scan_out_time) - 570) / 30.0) * 0.5
                                ELSE 0 END
                            ELSE 0 END
                        ) * (COALESCE(CASE WHEN cm.rate_type LIKE 'MONTHLY%' THEN (cm.hourly_rate / 30.0) / 8.0 ELSE cm.hourly_rate / 8.0 END, 350.0 / 8.0) * 1.5)
                    ELSE 0 END
                ) AS total_wage,
                SUM(CASE WHEN ml.status = 'LATE' THEN 1 ELSE 0 END) AS late_days,
                SUM(CASE WHEN ml.status = 'ABSENT' THEN 1 ELSE 0 END) AS absent_days
            FROM dbo.MANPOWER_DAILY_LOGS ml WITH (NOLOCK)
            LEFT JOIN dbo.MANPOWER_EMPLOYEES emp WITH (NOLOCK) ON ml.emp_id = emp.emp_id COLLATE Thai_CI_AS
            LEFT JOIN dbo.MANPOWER_SHIFTS ms WITH (NOLOCK) ON ms.shift_id = ISNULL(ml.shift_id, emp.default_shift_id)
            OUTER APPLY (
                SELECT TOP 1 hourly_rate, rate_type FROM dbo.MANPOWER_CATEGORY_MAPPING WITH (NOLOCK)
                WHERE emp.position LIKE '%' + keyword + '%' COLLATE Thai_CI_AS
                ORDER BY display_order DESC
            ) cm
            WHERE CONVERT(VARCHAR(7), ml.log_date, 120) = :period2
              AND ml.status IN ('PRESENT', 'LATE', 'ABSENT')
            GROUP BY ml.emp_id
        ) WAGE ON WAGE.emp_id = E.emp_id COLLATE Thai_CI_AS
        OUTER APPLY (
            SELECT TOP 1 grade, grade_iph, grade_5s, grade_attendance, grade_learning, grade_overall, evaluation_period
            FROM dbo.EMPLOYEE_GRADES WITH (NOLOCK)
            WHERE emp_id = E.emp_id
            ORDER BY CASE WHEN evaluation_period = :period3 THEN 0 ELSE 1 END, evaluation_period DESC
        ) G
        LEFT JOIN dbo.EMPLOYEE_GRADING_CRITERIA C WITH (NOLOCK) ON C.line = E.line
        WHERE E.emp_id = :empId
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':period1' => $currentPeriod,
        ':period2' => $currentPeriod,
        ':period3' => $currentPeriod,
        ':empId' => $empId,
    ]);
    $data = $stmt->fetch(PDO::FETCH_ASSOC);

    $learnCtx = fetchLearningEvalContext($pdo, [$empId]);
    $empForEval = [
        'emp_id' => $empId,
        'position' => $data['position'] ?? '',
        'sys_role' => $currentUser['role'] ?? '',
        'department_api' => $data['department_api'] ?? '',
        'line' => $data['line'] ?? ($currentUser['line'] ?? ''),
        'hc_group' => $data['hc_group'] ?? '',
    ];
    $learnEval = evaluateUniversityLearning(
        $empForEval,
        $learnCtx['rules'],
        $learnCtx['records_by_emp'][$empId] ?? [],
        (int)($learnCtx['manual_skills_by_emp'][$empId] ?? 0),
        $currentPeriod
    );

    $stmtTrend = $pdo->prepare("
        SELECT evaluation_period, grade_iph, grade_5s, grade_attendance, grade_learning, grade_overall
        FROM dbo.EMPLOYEE_GRADES WITH (NOLOCK)
        WHERE emp_id = ?
        ORDER BY evaluation_period DESC
        OFFSET 0 ROWS FETCH NEXT 6 ROWS ONLY
    ");
    $stmtTrend->execute([$empId]);
    $trend = array_reverse($stmtTrend->fetchAll(PDO::FETCH_ASSOC));

    if (!$data) {
        $emptyPayload['skill_count'] = $learnEval['total_credits'];
        $emptyPayload['passed_courses'] = $learnEval['passed_courses_total'];
        $emptyPayload['grade_learning'] = $learnEval['grade'];
        $emptyPayload['system_grade_learning'] = $learnEval['grade'];
        $emptyPayload['learning_eval'] = $learnEval;
        $emptyPayload['trend'] = $trend;
        mpJsonSuccess($emptyPayload);
    }

    $consensusMap = fetch5sPeriodConsensusMap($pdo, $startDate, $endDate);
    $line5s = $consensusMap[trim((string)($data['line'] ?? ''))] ?? null;

    $income = (float)$data['income_per_head'];
    $wage = (float)$data['total_wage'];
    $ratio = $wage > 0 ? ($income / $wage) : 0.0;
    $lateDays = (int)($data['late_days'] ?? 0);
    $absentDays = (int)($data['absent_days'] ?? 0);

    $sysIph = evaluateIphGrade($ratio, $data);
    $sys5s = $line5s['grade_5s'] ?? 'N/A';
    $sysAtt = evaluateAttendanceGrade($lateDays, $absentDays, $data);
    $sysLrn = $learnEval['grade'];

    $wIph = (int)($data['weight_iph'] ?? 25);
    $w5s = (int)($data['weight_5s'] ?? 25);
    $wAtt = (int)($data['weight_attendance'] ?? 25);
    $wLrn = (int)($data['weight_learning'] ?? 25);

    $hasSavedCurrentPeriod = (($data['saved_period'] ?? '') === $currentPeriod);
    $effIph = ($hasSavedCurrentPeriod && !empty($data['grade_iph'])) ? $data['grade_iph'] : $sysIph;
    $eff5s = ($hasSavedCurrentPeriod && !empty($data['grade_5s'])) ? $data['grade_5s'] : ($sys5s !== 'N/A' ? $sys5s : (!empty($data['grade_5s']) ? $data['grade_5s'] : '-'));
    $effAtt = ($hasSavedCurrentPeriod && !empty($data['grade_attendance'])) ? $data['grade_attendance'] : ($sysAtt !== 'N/A' ? $sysAtt : (!empty($data['grade_attendance']) ? $data['grade_attendance'] : '-'));
    $effLrn = ($hasSavedCurrentPeriod && !empty($data['grade_learning'])) ? $data['grade_learning'] : $sysLrn;

    $liveOverall = calculateWeightedOverallGrade($effIph, $eff5s, $effAtt, $effLrn, $wIph, $w5s, $wAtt, $wLrn);
    $effOverall = ($hasSavedCurrentPeriod && !empty($data['grade_overall']))
        ? $data['grade_overall']
        : ($liveOverall['grade'] !== '-' ? $liveOverall['grade'] : (!empty($data['grade']) ? $data['grade'] : '-'));

    $payload = [
        'has_data' => true,
        'restricted' => false,
        'can_view_financials' => $canViewFinancials,
        'evaluation_period' => $currentPeriod,
        'is_official_saved' => $hasSavedCurrentPeriod,
        'grade' => $effOverall,
        'grade_iph' => $effIph,
        'grade_5s' => $eff5s,
        'grade_attendance' => $effAtt,
        'grade_learning' => $effLrn,
        'grade_overall' => $effOverall,
        'gpa' => $liveOverall['gpa'],
        'system_grade' => $sysIph,
        'system_grade_5s' => $sys5s,
        'system_grade_attendance' => $sysAtt,
        'system_grade_learning' => $sysLrn,
        'system_grade_overall' => $liveOverall['grade'],
        'income_per_head' => round($income, 2),
        'total_wage' => round($wage, 2),
        'income_ratio' => round($ratio, 2),
        'late_days' => $lateDays,
        'absent_days' => $absentDays,
        'score_5s' => $line5s['score_5s'] ?? null,
        'audit_5s' => $line5s,
        'skill_count' => $learnEval['total_credits'],
        'passed_courses' => $learnEval['passed_courses_total'],
        'weights' => [
            'iph' => $wIph,
            's5' => $w5s,
            'attendance' => $wAtt,
            'learning' => $wLrn,
        ],
        'criteria' => [
            'threshold_a' => (float)($data['threshold_a'] ?? 2.0),
            'threshold_b' => (float)($data['threshold_b'] ?? 1.5),
            'threshold_c' => (float)($data['threshold_c'] ?? 1.0),
            'att_max_late_a' => isset($data['att_max_late_a']) ? (int)$data['att_max_late_a'] : null,
            'att_max_late_b' => isset($data['att_max_late_b']) ? (int)$data['att_max_late_b'] : null,
            'att_max_late_c' => isset($data['att_max_late_c']) ? (int)$data['att_max_late_c'] : null,
        ],
        'learning_eval' => $learnEval,
        'trend' => $trend,
    ];

    mpJsonSuccess(applyPerformanceFinancialMasking($payload, $canViewFinancials));
} catch (Throwable $e) {
    handleMpException($pdo, 'MY_PERFORMANCE_API', $e);
}
