<?php
// /page/manpower/api/api_my_performance.php
session_start();

ini_set('display_errors', 0);
error_reporting(E_ALL);

header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../../db.php';

if (!isset($_SESSION['user'])) {
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

// Strict confidentiality: Only Admin / Manager / Creator can view 4D evaluation grades
$sessionRole = strtolower(trim($_SESSION['user']['role'] ?? ''));
$canViewGrading = in_array($sessionRole, ['creator', 'admin', 'manager'], true);
if (!$canViewGrading) {
    echo json_encode([
        'success' => true,
        'data' => [
            'has_data'        => false,
            'restricted'      => true,
            'grade'           => '-',
            'grade_iph'       => '-',
            'grade_5s'        => '-',
            'grade_attendance'=> '-',
            'grade_learning'  => '-',
            'grade_overall'   => '-',
            'income_per_head' => 0,
            'total_wage'      => 0,
            'income_ratio'    => 0,
            'skill_count'     => 0,
            'passed_courses'  => 0,
            'trend'           => [],
        ]
    ]);
    exit;
}

$emp_id = trim($_SESSION['user']['emp_id'] ?? '');
if (empty($emp_id)) {
    $fullName = trim($_SESSION['user']['fullname'] ?? '');
    if (!empty($fullName)) {
        try {
            $stmtMatch = $pdo->prepare("SELECT TOP 1 emp_id FROM dbo.MANPOWER_EMPLOYEES WITH (NOLOCK) WHERE name_th = ? ORDER BY is_active DESC, emp_id DESC");
            $stmtMatch->execute([$fullName]);
            $emp_id = (string)($stmtMatch->fetchColumn() ?: '');
        } catch (Exception $ignore) {}
    }
}

if (empty($emp_id)) {
    echo json_encode([
        'success' => true,
        'data' => [
            'has_data'        => false,
            'grade'           => '-',
            'grade_iph'       => '-',
            'grade_5s'        => '-',
            'grade_attendance' => '-',
            'grade_learning'  => '-',
            'grade_overall'   => '-',
            'income_per_head' => 0,
            'total_wage'      => 0,
            'income_ratio'    => 0,
            'skill_count'     => 0,
            'passed_courses'  => 0,
            'trend'           => [],
        ]
    ]);
    exit;
}

$currentPeriod = date('Y-m');

try {
    // ── Main: Current month performance ──────────────────────────────────
    $sql = "
        SELECT
            E.position,
            G.grade,
            G.grade_iph,
            G.grade_5s,
            G.grade_attendance,
            G.grade_learning,
            G.grade_overall,
            ISNULL(INC.income_per_head, 0) AS income_per_head,
            ISNULL(WAGE.total_wage, 350.0) AS total_wage,
            ISNULL(WAGE.late_days, 0) AS late_days,
            ISNULL(WAGE.absent_days, 0) AS absent_days,
            C.threshold_a,
            C.threshold_b,
            C.threshold_c
        FROM dbo.MANPOWER_EMPLOYEES E WITH (NOLOCK)
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
                    COALESCE(
                        CASE WHEN cm.rate_type LIKE 'MONTHLY%' THEN cm.hourly_rate / 30.0 ELSE cm.hourly_rate END,
                        350.0
                    ) +
                    (
                        CASE WHEN ml.scan_out_time IS NOT NULL AND ms.start_time IS NOT NULL
                        THEN
                            CASE WHEN DATEDIFF(MINUTE, CAST(CONCAT(ml.log_date, ' ', ms.start_time) AS DATETIME), ml.scan_out_time) > 570
                            THEN FLOOR((DATEDIFF(MINUTE, CAST(CONCAT(ml.log_date, ' ', ms.start_time) AS DATETIME), ml.scan_out_time) - 570) / 30.0) * 0.5
                            ELSE 0 END
                        ELSE 0 END
                    ) * (COALESCE(CASE WHEN cm.rate_type LIKE 'MONTHLY%' THEN (cm.hourly_rate / 30.0) / 8.0 ELSE cm.hourly_rate / 8.0 END, 350.0 / 8.0) * 1.5)
                ) AS total_wage,
                SUM(CASE WHEN ml.status = 'LATE' THEN 1 ELSE 0 END) AS late_days,
                SUM(CASE WHEN ml.status = 'ABSENT' THEN 1 ELSE 0 END) AS absent_days
            FROM dbo.MANPOWER_DAILY_LOGS ml WITH (NOLOCK)
            LEFT JOIN dbo.MANPOWER_EMPLOYEES emp WITH (NOLOCK) ON ml.emp_id = emp.emp_id COLLATE Thai_CI_AS
            LEFT JOIN dbo.MANPOWER_SHIFTS ms WITH (NOLOCK) ON ms.shift_id = ISNULL(ml.shift_id, emp.default_shift_id)
            OUTER APPLY (
                SELECT TOP 1 * FROM dbo.MANPOWER_CATEGORY_MAPPING WITH (NOLOCK)
                WHERE emp.position LIKE '%' + keyword + '%' COLLATE Thai_CI_AS
                ORDER BY display_order DESC
            ) cm
            WHERE CONVERT(VARCHAR(7), ml.log_date, 120) = :period2
              AND ml.status IN ('PRESENT', 'LATE')
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
    $stmt->execute([':period1' => $currentPeriod, ':period2' => $currentPeriod, ':period3' => $currentPeriod, ':empId' => $emp_id]);
    $data = $stmt->fetch(PDO::FETCH_ASSOC);

    // ── Skill count & Passed Courses count ─────────────────────────────────
    $stmtSkill = $pdo->prepare("SELECT COUNT(*) FROM dbo.EMP_SKILLS WITH (NOLOCK) WHERE emp_id = ? AND level >= 2");
    $stmtSkill->execute([$emp_id]);
    $rawSkillCount = (int)$stmtSkill->fetchColumn();

    $stmtLearn = $pdo->prepare("SELECT COUNT(*) FROM dbo.LEARNING_RECORDS WITH (NOLOCK) WHERE emp_id = ? AND passed = 1");
    $stmtLearn->execute([$emp_id]);
    $passedCourses = (int)$stmtLearn->fetchColumn();

    $skillCount = max($rawSkillCount, $passedCourses);

    $posUpper = mb_strtoupper(trim((string)($data['position'] ?? '')), 'UTF-8');
    $isTier3 = (
        in_array($sessionRole, ['creator', 'admin', 'manager'], true) ||
        mb_strpos($posUpper, 'ผู้จัดการ') !== false ||
        mb_strpos($posUpper, 'MINI MD') !== false ||
        mb_strpos($posUpper, 'ประธาน') !== false ||
        mb_strpos($posUpper, 'บริหาร') !== false ||
        mb_strpos($posUpper, 'วิศวกร') !== false ||
        mb_strpos($posUpper, 'ENGINEER') !== false
    );
    $isTier2 = !$isTier3 && (
        in_array($sessionRole, ['supervisor', 'leader', 'planner'], true) ||
        mb_strpos($posUpper, 'หัวหน้า') !== false ||
        mb_strpos($posUpper, 'SUPERVISOR') !== false ||
        mb_strpos($posUpper, 'LEADER') !== false ||
        mb_strpos($posUpper, 'SPECIAL') !== false ||
        mb_strpos($posUpper, 'เทคนิค') !== false ||
        mb_strpos($posUpper, 'QC') !== false ||
        mb_strpos($posUpper, 'QA') !== false
    );

    $systemLearningGrade = 'D';
    if ($isTier3) {
        if ($skillCount >= 8)      $systemLearningGrade = 'A';
        elseif ($skillCount >= 5)  $systemLearningGrade = 'B';
        elseif ($skillCount >= 2)  $systemLearningGrade = 'C';
    } elseif ($isTier2) {
        if ($skillCount >= 5)      $systemLearningGrade = 'A';
        elseif ($skillCount >= 3)  $systemLearningGrade = 'B';
        elseif ($skillCount >= 1)  $systemLearningGrade = 'C';
    } else {
        if ($skillCount >= 3)      $systemLearningGrade = 'A';
        elseif ($skillCount >= 2)  $systemLearningGrade = 'B';
        elseif ($skillCount >= 1)  $systemLearningGrade = 'C';
    }

    // ── 3-month trend ──────────────────────────────────────────────────
    $stmtTrend = $pdo->prepare("
        SELECT evaluation_period, grade_iph, grade_5s, grade_attendance, grade_learning, grade_overall
        FROM dbo.EMPLOYEE_GRADES WITH (NOLOCK)
        WHERE emp_id = ?
        ORDER BY evaluation_period DESC
        OFFSET 0 ROWS FETCH NEXT 6 ROWS ONLY
    ");
    $stmtTrend->execute([$emp_id]);
    $trend = array_reverse($stmtTrend->fetchAll(PDO::FETCH_ASSOC));

    if ($data) {
        $income = (float)$data['income_per_head'];
        $wage   = (float)$data['total_wage'];
        $ratio  = $wage > 0 ? ($income / $wage) : 0;

        $systemGrade = 'N/A';
        if (!empty($data['threshold_a']) && $data['threshold_a'] > 0) {
            if ($ratio >= $data['threshold_a'])      $systemGrade = 'A';
            elseif ($ratio >= $data['threshold_b'])  $systemGrade = 'B';
            elseif ($ratio >= $data['threshold_c'])  $systemGrade = 'C';
            else                                     $systemGrade = 'D';
        } else {
            if ($ratio >= 2.0)      $systemGrade = 'A';
            elseif ($ratio >= 1.5)  $systemGrade = 'B';
            elseif ($ratio >= 1.0)  $systemGrade = 'C';
            else                    $systemGrade = 'D';
        }

        echo json_encode([
            'success' => true,
            'data' => [
                'has_data'              => true,
                'grade'                 => !empty($data['grade'])            ? $data['grade']            : (!empty($data['grade_overall']) ? $data['grade_overall'] : '-'),
                'grade_iph'             => !empty($data['grade_iph'])        ? $data['grade_iph']        : '-',
                'grade_5s'              => !empty($data['grade_5s'])         ? $data['grade_5s']         : '-',
                'grade_attendance'      => !empty($data['grade_attendance']) ? $data['grade_attendance'] : '-',
                'grade_learning'        => !empty($data['grade_learning'])   ? $data['grade_learning']   : $systemLearningGrade,
                'grade_overall'         => !empty($data['grade_overall'])    ? $data['grade_overall']    : (!empty($data['grade']) ? $data['grade'] : '-'),
                'system_grade'          => $systemGrade,
                'system_grade_learning' => $systemLearningGrade,
                'income_per_head'       => $income,
                'total_wage'            => $wage,
                'income_ratio'          => round($ratio, 2),
                'late_days'             => (int)($data['late_days']   ?? 0),
                'absent_days'           => (int)($data['absent_days'] ?? 0),
                'skill_count'           => $skillCount,
                'passed_courses'        => $passedCourses,
                'trend'                 => $trend,
            ]
        ]);
    } else {
        echo json_encode([
            'success' => true,
            'data' => [
                'has_data'              => false,
                'grade'                 => '-', 'grade_iph' => '-', 'grade_5s' => '-',
                'grade_attendance'      => '-', 'grade_learning' => $systemLearningGrade, 'grade_overall' => '-',
                'system_grade_learning' => $systemLearningGrade,
                'income_per_head'       => 0,
                'total_wage'            => 0,
                'income_ratio'          => 0,
                'late_days'             => 0,
                'absent_days'           => 0,
                'skill_count'           => $skillCount,
                'passed_courses'        => $passedCourses,
                'trend'                 => $trend,
            ]
        ]);
    }

} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Database error', 'error' => $e->getMessage()]);
}
