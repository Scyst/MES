<?php
/**
 * Shared 4D Employee Grading, Multi-Auditor 5S Consensus, Financial Masking,
 * and University-Style Learning Curriculum Evaluation Helpers.
 */

const GRADING_5S_MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB per photo
const GRADING_5S_ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Checks whether the current session user holds executive/grading management privileges.
 */
function isGradingManagerUser(array $user): bool {
    $role = strtolower(trim((string)($user['role'] ?? '')));
    if (!in_array($role, ['creator', 'admin', 'manager'], true)) {
        return false;
    }
    if (function_exists('hasPermission')) {
        return hasPermission('manage_manpower');
    }
    $perms = $user['permissions'] ?? [];
    return $role === 'creator' || (is_array($perms) && in_array('manage_manpower', $perms, true));
}

/**
 * Resolves the authenticated session user's emp_id safely (never trusting client input).
 */
function resolveSessionEmpId(PDO $pdo, array $sessionUser): string {
    $empId = trim((string)($sessionUser['emp_id'] ?? ''));
    if ($empId !== '') {
        return $empId;
    }
    $fullName = trim((string)($sessionUser['fullname'] ?? ''));
    if ($fullName === '') {
        return '';
    }
    try {
        $stmt = $pdo->prepare('SELECT TOP 1 emp_id FROM dbo.MANPOWER_EMPLOYEES WITH (NOLOCK) WHERE name_th = ? ORDER BY is_active DESC, emp_id DESC');
        $stmt->execute([$fullName]);
        return trim((string)($stmt->fetchColumn() ?: ''));
    } catch (Throwable $ignore) {
        return '';
    }
}

/**
 * Resolves Learning Hub tier targets (Tier 1 Operational, Tier 2 Lead, Tier 3 Management/Engineer).
 */
function resolveLearningTier(string $position, string $sysRole = ''): array {
    $posUpper = mb_strtoupper(trim($position), 'UTF-8');
    $roleLower = strtolower(trim($sysRole));

    $isTier3 = in_array($roleLower, ['creator', 'admin', 'manager'], true)
        || mb_strpos($posUpper, 'ผู้จัดการ', 0, 'UTF-8') !== false
        || mb_strpos($posUpper, 'MINI MD', 0, 'UTF-8') !== false
        || mb_strpos($posUpper, 'ประธาน', 0, 'UTF-8') !== false
        || mb_strpos($posUpper, 'บริหาร', 0, 'UTF-8') !== false
        || mb_strpos($posUpper, 'วิศวกร', 0, 'UTF-8') !== false
        || mb_strpos($posUpper, 'ENGINEER', 0, 'UTF-8') !== false;

    $isTier2 = !$isTier3 && (
        in_array($roleLower, ['supervisor', 'leader', 'planner', 'qc'], true)
        || mb_strpos($posUpper, 'หัวหน้า', 0, 'UTF-8') !== false
        || mb_strpos($posUpper, 'SUPERVISOR', 0, 'UTF-8') !== false
        || mb_strpos($posUpper, 'LEADER', 0, 'UTF-8') !== false
        || mb_strpos($posUpper, 'SPECIAL', 0, 'UTF-8') !== false
        || mb_strpos($posUpper, 'เทคนิค', 0, 'UTF-8') !== false
        || mb_strpos($posUpper, 'QC', 0, 'UTF-8') !== false
        || mb_strpos($posUpper, 'QA', 0, 'UTF-8') !== false
    );

    if ($isTier3) {
        return [
            'tier_code' => 'TIER_3',
            'tier_name' => 'ระดับบริหารและวิศวกร (Tier 3)',
            'target_a' => 8,
            'target_b' => 5,
            'target_c' => 2,
            'criteria_label' => 'Tier 3: บริหาร/วิศวกร (A≥8, B≥5, C≥2)',
        ];
    }
    if ($isTier2) {
        return [
            'tier_code' => 'TIER_2',
            'tier_name' => 'ระดับหัวหน้างานและเทคนิค (Tier 2)',
            'target_a' => 5,
            'target_b' => 3,
            'target_c' => 1,
            'criteria_label' => 'Tier 2: หัวหน้างาน/เทคนิค (A≥5, B≥3, C≥1)',
        ];
    }
    return [
        'tier_code' => 'TIER_1',
        'tier_name' => 'ระดับปฏิบัติการ (Tier 1)',
        'target_a' => 3,
        'target_b' => 2,
        'target_c' => 1,
        'criteria_label' => 'Tier 1: ปฏิบัติการทั่วไป (A≥3, B≥2, C≥1)',
    ];
}

/**
 * Resolves cycle_key, inclusive start_date, and inclusive expires_at for MONTHLY / QUARTERLY / NONE resets.
 */
function resolveLearningCycleInfo(string $resetCycle, string $referencePeriod = ''): array {
    $cycle = strtoupper(trim($resetCycle));
    $ref = trim($referencePeriod);

    $year = (int)date('Y');
    $month = (int)date('n');
    if (preg_match('/^(\d{4})-(\d{2})/', $ref, $m)) {
        $year = (int)$m[1];
        $month = max(1, min(12, (int)$m[2]));
    }

    if ($cycle === 'MONTHLY') {
        $startDate = sprintf('%04d-%02d-01', $year, $month);
        $expiresAt = date('Y-m-t', strtotime($startDate));
        return [
            'reset_cycle' => 'MONTHLY',
            'cycle_key' => sprintf('%04d-%02d', $year, $month),
            'start_date' => $startDate,
            'expires_at' => $expiresAt,
            'label_th' => sprintf('รีเซ็ททุก 1 เดือน (%04d-%02d)', $year, $month),
        ];
    }

    if ($cycle === 'QUARTERLY') {
        $quarter = (int)ceil($month / 3);
        $startMonth = (($quarter - 1) * 3) + 1;
        $endMonth = $quarter * 3;
        $startDate = sprintf('%04d-%02d-01', $year, $startMonth);
        $expiresAt = date('Y-m-t', strtotime(sprintf('%04d-%02d-01', $year, $endMonth)));
        return [
            'reset_cycle' => 'QUARTERLY',
            'cycle_key' => sprintf('%04d-Q%d', $year, $quarter),
            'start_date' => $startDate,
            'expires_at' => $expiresAt,
            'label_th' => sprintf('รีเซ็ททุก 3 เดือน (%04d-Q%d)', $year, $quarter),
        ];
    }

    return [
        'reset_cycle' => 'NONE',
        'cycle_key' => 'PERM',
        'start_date' => null,
        'expires_at' => null,
        'label_th' => 'สะสมหน่วยกิตถาวร',
    ];
}

/**
 * Checks if a single curriculum rule matches an employee's HC group, department, line, and tier.
 */
function ruleMatchesEmployee(array $rule, array $emp, string $tierCode = ''): bool {
    if (isset($rule['is_active']) && (int)$rule['is_active'] === 0) {
        return false;
    }

    $checks = [
        ['rule' => $rule['hc_group_filter'] ?? 'ALL', 'emp' => $emp['hc_group'] ?? ''],
        ['rule' => $rule['department_filter'] ?? 'ALL', 'emp' => $emp['department_api'] ?? ''],
        ['rule' => $rule['line_filter'] ?? 'ALL', 'emp' => $emp['line'] ?? ''],
        ['rule' => $rule['tier_filter'] ?? 'ALL', 'emp' => $tierCode],
    ];

    foreach ($checks as $pair) {
        $target = mb_strtolower(trim((string)$pair['rule']), 'UTF-8');
        if ($target === '' || $target === 'all') {
            continue;
        }
        $actual = mb_strtolower(trim((string)$pair['emp']), 'UTF-8');
        if ($target !== $actual) {
            return false;
        }
    }
    return true;
}

/**
 * Evaluates Learning Dimension using University-Style Mandatory + Elective Credit Rules.
 * If mandatory courses in the active cycle are incomplete, caps final grade at maximum 'C'.
 */
function evaluateUniversityLearning(
    array $emp,
    array $activeRules,
    array $learningRecords,
    int $manualSkillCount = 0,
    string $referencePeriod = ''
): array {
    $tier = resolveLearningTier((string)($emp['position'] ?? ''), (string)($emp['sys_role'] ?? ''));
    $tierCode = $tier['tier_code'];

    $mandatoryByCourse = [];
    $electiveCreditByCourse = [];

    foreach ($activeRules as $rule) {
        if (!ruleMatchesEmployee($rule, $emp, $tierCode)) {
            continue;
        }
        $cid = trim((string)($rule['course_id'] ?? ''));
        if ($cid === '') {
            continue;
        }
        $reqType = strtoupper(trim((string)($rule['requirement_type'] ?? 'MANDATORY')));
        $credits = max(0.5, (float)($rule['credits'] ?? 1.0));
        if ($reqType === 'MANDATORY') {
            $passPct = max(50, min(100, (int)($rule['pass_score_pct'] ?? 80)));
            if (!isset($mandatoryByCourse[$cid]) || $passPct > (int)$mandatoryByCourse[$cid]['pass_score_pct']) {
                $mandatoryByCourse[$cid] = [
                    'rule_id' => (int)($rule['rule_id'] ?? 0),
                    'course_id' => $cid,
                    'course_title' => (string)($rule['course_title'] ?? $cid),
                    'reset_cycle' => strtoupper(trim((string)($rule['reset_cycle'] ?? 'MONTHLY'))),
                    'credits' => $credits,
                    'pass_score_pct' => $passPct,
                ];
            }
        } else {
            $electiveCreditByCourse[$cid] = max($credits, (float)($electiveCreditByCourse[$cid] ?? 0));
        }
    }

    $passedByCourse = [];
    $distinctPassedCourses = [];
    foreach ($learningRecords as $rec) {
        $cid = trim((string)($rec['course_id'] ?? ''));
        if ($cid === '') {
            continue;
        }
        if ((int)($rec['passed'] ?? 0) === 1 || $rec['passed'] === true) {
            $passedByCourse[$cid][] = $rec;
            $distinctPassedCourses[$cid] = true;
        }
    }

    $mandatoryCourses = [];
    $mandatoryPassed = 0;
    $mandatoryCredits = 0.0;

    foreach ($mandatoryByCourse as $cid => $mRule) {
        $cycleInfo = resolveLearningCycleInfo($mRule['reset_cycle'], $referencePeriod);
        $expectedKey = $cycleInfo['cycle_key'];
        $startStr = $cycleInfo['start_date'];
        $endStr = $cycleInfo['expires_at'];

        $matchedRec = null;
        foreach ($passedByCourse[$cid] ?? [] as $rec) {
            $pct = (int)($rec['quiz_percentage'] ?? 0);
            if ($pct < $mRule['pass_score_pct']) {
                continue;
            }
            $recCycle = strtoupper(trim((string)($rec['cycle_key'] ?? 'PERM')));
            if ($expectedKey === 'PERM' || $recCycle === $expectedKey) {
                $matchedRec = $rec;
                break;
            }
            if ($recCycle === 'PERM' && $startStr !== null && $endStr !== null && !empty($rec['completed_at'])) {
                $compDate = substr((string)$rec['completed_at'], 0, 10);
                if ($compDate >= $startStr && $compDate <= $endStr) {
                    $matchedRec = $rec;
                    break;
                }
            }
        }

        $isPassed = $matchedRec !== null;
        if ($isPassed) {
            $mandatoryPassed++;
            $mandatoryCredits += (float)$mRule['credits'];
        }

        $mandatoryCourses[] = [
            'rule_id' => $mRule['rule_id'],
            'course_id' => $cid,
            'course_title' => $mRule['course_title'],
            'reset_cycle' => $mRule['reset_cycle'],
            'cycle_key' => $expectedKey,
            'cycle_label' => $cycleInfo['label_th'],
            'expires_at' => $endStr,
            'credits' => (float)$mRule['credits'],
            'pass_score_pct' => $mRule['pass_score_pct'],
            'is_passed_current_cycle' => $isPassed,
            'last_score_pct' => $matchedRec ? (int)($matchedRec['quiz_percentage'] ?? 0) : null,
            'completed_at' => $matchedRec['completed_at'] ?? null,
        ];
    }

    $electiveCredits = 0.0;
    foreach (array_keys($distinctPassedCourses) as $cid) {
        if (isset($mandatoryByCourse[$cid])) {
            continue;
        }
        $electiveCredits += (float)($electiveCreditByCourse[$cid] ?? 1.0);
    }

    $manualSkillCredits = max(0, $manualSkillCount);
    $totalCredits = round($mandatoryCredits + $electiveCredits + $manualSkillCredits, 1);

    $rawGrade = 'D';
    if ($totalCredits >= $tier['target_a']) {
        $rawGrade = 'A';
    } elseif ($totalCredits >= $tier['target_b']) {
        $rawGrade = 'B';
    } elseif ($totalCredits >= $tier['target_c']) {
        $rawGrade = 'C';
    }

    $mandatoryTotal = count($mandatoryCourses);
    $mandatoryMissing = max(0, $mandatoryTotal - $mandatoryPassed);
    $isCapped = false;
    $finalGrade = $rawGrade;
    $capReason = null;

    if ($mandatoryTotal > 0 && $mandatoryMissing > 0) {
        if ($rawGrade === 'A' || $rawGrade === 'B') {
            $finalGrade = 'C';
            $isCapped = true;
            $capReason = "ยังเรียนหลักสูตรบังคับรอบปัจจุบันไม่ครบ ({$mandatoryPassed}/{$mandatoryTotal} วิชา) ระบบจำกัดเกรดสูงสุดที่ C จนกว่าจะสอบผ่านครบ";
        }
    }

    return [
        'grade' => $finalGrade,
        'raw_grade' => $rawGrade,
        'is_capped_by_mandatory' => $isCapped,
        'cap_reason' => $capReason,
        'total_credits' => $totalCredits,
        'mandatory_credits' => round($mandatoryCredits, 1),
        'elective_credits' => round($electiveCredits, 1),
        'manual_skill_credits' => $manualSkillCredits,
        'mandatory_total' => $mandatoryTotal,
        'mandatory_passed' => $mandatoryPassed,
        'mandatory_missing' => $mandatoryMissing,
        'mandatory_courses' => $mandatoryCourses,
        'passed_courses_total' => count($distinctPassedCourses),
        'tier_code' => $tierCode,
        'tier_name' => $tier['tier_name'],
        'target_a' => $tier['target_a'],
        'target_b' => $tier['target_b'],
        'target_c' => $tier['target_c'],
        'criteria_label' => $tier['criteria_label'],
    ];
}

/**
 * Computes weighted 4D Overall GPA and letter grade matching MANPOWER_TEAM_SETTINGS.
 */
function calculateWeightedOverallGrade(
    ?string $gIph,
    ?string $g5s,
    ?string $gAtt,
    ?string $gLrn,
    int $wIph = 25,
    int $w5s = 25,
    int $wAtt = 25,
    int $wLrn = 25
): array {
    $pointsMap = ['A' => 4.0, 'B' => 3.0, 'C' => 2.0, 'D' => 1.0];
    $dims = [
        ['g' => strtoupper(trim((string)$gIph)), 'w' => max(0, $wIph)],
        ['g' => strtoupper(trim((string)$g5s)), 'w' => max(0, $w5s)],
        ['g' => strtoupper(trim((string)$gAtt)), 'w' => max(0, $wAtt)],
        ['g' => strtoupper(trim((string)$gLrn)), 'w' => max(0, $wLrn)],
    ];

    $weightedSum = 0.0;
    $totalWeight = 0;
    foreach ($dims as $d) {
        if ($d['w'] > 0 && isset($pointsMap[$d['g']])) {
            $weightedSum += $pointsMap[$d['g']] * $d['w'];
            $totalWeight += $d['w'];
        }
    }

    if ($totalWeight <= 0) {
        return ['gpa' => 0.0, 'grade' => '-'];
    }

    $gpa = round($weightedSum / $totalWeight, 2);
    $grade = 'D';
    if ($gpa >= 3.50) {
        $grade = 'A';
    } elseif ($gpa >= 2.50) {
        $grade = 'B';
    } elseif ($gpa >= 1.50) {
        $grade = 'C';
    }
    return ['gpa' => $gpa, 'grade' => $grade];
}

/**
 * Converts a 5S 0..100 score to letter grade matching dbo.AUDIT_5S persisted computed column.
 */
function scoreTo5sGrade(float $score): string {
    if ($score >= 85.0) return 'A';
    if ($score >= 70.0) return 'B';
    if ($score >= 55.0) return 'C';
    return 'D';
}

/**
 * Computes Equal-Weight (1/N) average score & final grade across 3-5 committee submissions.
 */
function compute5sRoundConsensus(array $submittedAudits): array {
    $scores = [];
    foreach ($submittedAudits as $row) {
        if (isset($row['total_score']) && $row['total_score'] !== null) {
            $scores[] = (float)$row['total_score'];
        } elseif (isset($row['score_seiri'])) {
            $scores[] = (float)(
                (int)$row['score_seiri'] + (int)$row['score_seiton'] + (int)$row['score_seiso']
                + (int)$row['score_seiketsu'] + (int)$row['score_shitsuke']
            );
        }
    }
    $cnt = count($scores);
    if ($cnt === 0) {
        return ['submitted_count' => 0, 'weighted_score' => null, 'final_grade' => null];
    }
    $avg = round(array_sum($scores) / $cnt, 2);
    return [
        'submitted_count' => $cnt,
        'weighted_score' => $avg,
        'final_grade' => scoreTo5sGrade($avg),
    ];
}

/**
 * Evaluates IPH Grade against optional line criteria row (fallback 2.0 / 1.5 / 1.0).
 */
function evaluateIphGrade(float $ratio, ?array $criteriaRow): string {
    $hasCustom = $criteriaRow && isset($criteriaRow['threshold_a']) && (float)$criteriaRow['threshold_a'] > 0;
    $thA = $hasCustom ? (float)$criteriaRow['threshold_a'] : 2.0;
    $thB = $hasCustom ? (float)$criteriaRow['threshold_b'] : 1.5;
    $thC = $hasCustom ? (float)$criteriaRow['threshold_c'] : 1.0;

    if ($ratio >= $thA) return 'A';
    if ($ratio >= $thB) return 'B';
    if ($ratio >= $thC) return 'C';
    return 'D';
}

/**
 * Evaluates Attendance Grade against configured line criteria; returns N/A when no criteria exist.
 */
function evaluateAttendanceGrade(int $lateDays, int $absentDays, ?array $criteriaRow): string {
    if (!$criteriaRow || (
        !isset($criteriaRow['att_max_late_a'])
        && !isset($criteriaRow['att_max_late_b'])
        && !isset($criteriaRow['att_max_late_c'])
    )) {
        return 'N/A';
    }
    $infractions = max(0, $lateDays + $absentDays);
    $maxA = (int)($criteriaRow['att_max_late_a'] ?? 0);
    $maxB = (int)($criteriaRow['att_max_late_b'] ?? 1);
    $maxC = (int)($criteriaRow['att_max_late_c'] ?? 2);

    if ($infractions <= $maxA) return 'A';
    if ($infractions <= $maxB) return 'B';
    if ($infractions <= $maxC) return 'C';
    return 'D';
}

/**
 * Strips raw THB salary/income fields for Non-Management users while preserving grades & ratios.
 */
function applyPerformanceFinancialMasking(array $payload, bool $canViewFinancials): array {
    if ($canViewFinancials) {
        $payload['wage_masked'] = false;
        return $payload;
    }
    $payload['income_per_head'] = null;
    $payload['total_wage'] = null;
    $payload['dl_wage'] = null;
    $payload['ot_wage'] = null;
    $payload['wage_masked'] = true;
    return $payload;
}

/**
 * Batch-loads curriculum rules, learning records, and manual skill counts without N+1 queries.
 */
function fetchLearningEvalContext(PDO $pdo, array $empIds = []): array {
    $rules = [];
    try {
        $rules = $pdo->query("
            SELECT rule_id, course_id, course_title, hc_group_filter, department_filter,
                   line_filter, tier_filter, requirement_type, reset_cycle, credits,
                   pass_score_pct, is_active, notes
            FROM dbo.LEARNING_CURRICULUM_RULES WITH (NOLOCK)
            WHERE is_active = 1
            ORDER BY CASE WHEN requirement_type = 'MANDATORY' THEN 0 ELSE 1 END, rule_id ASC
        ")->fetchAll(PDO::FETCH_ASSOC);
    } catch (Throwable $ignore) {
        $rules = [];
    }

    $recordsByEmp = [];
    $manualSkillsByEmp = [];

    if (!empty($empIds)) {
        $cleanIds = array_values(array_unique(array_filter(array_map('trim', $empIds))));
        foreach (array_chunk($cleanIds, 250) as $chunk) {
            $ph = implode(',', array_fill(0, count($chunk), '?'));
            $stmtRec = $pdo->prepare("
                SELECT emp_id, course_id, course_title, category, status, quiz_score, quiz_total,
                       quiz_percentage, passed, certificate_id, cycle_key, rule_id, expires_at,
                       completed_at, updated_at
                FROM dbo.LEARNING_RECORDS WITH (NOLOCK)
                WHERE emp_id IN ({$ph})
            ");
            $stmtRec->execute($chunk);
            foreach ($stmtRec->fetchAll(PDO::FETCH_ASSOC) as $r) {
                $eid = trim((string)$r['emp_id']);
                $recordsByEmp[$eid][] = $r;
            }

            $stmtSkill = $pdo->prepare("
                SELECT emp_id, COUNT(*) AS manual_cnt
                FROM dbo.EMP_SKILLS WITH (NOLOCK)
                WHERE emp_id IN ({$ph})
                  AND level >= 2
                  AND COALESCE(certified_by, '') NOT LIKE '%LEARNING_HUB%'
                  AND COALESCE(certified_by, '') NOT LIKE '%Learning Hub%'
                GROUP BY emp_id
            ");
            $stmtSkill->execute($chunk);
            foreach ($stmtSkill->fetchAll(PDO::FETCH_ASSOC) as $s) {
                $manualSkillsByEmp[trim((string)$s['emp_id'])] = (int)$s['manual_cnt'];
            }
        }
    } else {
        $stmtRec = $pdo->query("
            SELECT emp_id, course_id, course_title, category, status, quiz_score, quiz_total,
                   quiz_percentage, passed, certificate_id, cycle_key, rule_id, expires_at,
                   completed_at, updated_at
            FROM dbo.LEARNING_RECORDS WITH (NOLOCK)
        ");
        foreach ($stmtRec->fetchAll(PDO::FETCH_ASSOC) as $r) {
            $recordsByEmp[trim((string)$r['emp_id'])][] = $r;
        }
        $stmtSkill = $pdo->query("
            SELECT emp_id, COUNT(*) AS manual_cnt
            FROM dbo.EMP_SKILLS WITH (NOLOCK)
            WHERE level >= 2
              AND COALESCE(certified_by, '') NOT LIKE '%LEARNING_HUB%'
              AND COALESCE(certified_by, '') NOT LIKE '%Learning Hub%'
            GROUP BY emp_id
        ");
        foreach ($stmtSkill->fetchAll(PDO::FETCH_ASSOC) as $s) {
            $manualSkillsByEmp[trim((string)$s['emp_id'])] = (int)$s['manual_cnt'];
        }
    }

    return [
        'rules' => $rules,
        'records_by_emp' => $recordsByEmp,
        'manual_skills_by_emp' => $manualSkillsByEmp,
    ];
}

/**
 * Resolves 5S consensus per line for a period from multi-auditor rounds (fallback to standalone AUDIT_5S).
 */
function fetch5sPeriodConsensusMap(PDO $pdo, string $startDate, string $endDate): array {
    $map = [];

    try {
        $stmtRounds = $pdo->prepare("
            SELECT R.round_id, R.line, R.round_name, R.eval_period,
                   CONVERT(VARCHAR(10), R.audit_date, 120) AS audit_date,
                   R.required_auditors, R.submitted_count, R.status,
                   R.weighted_score, R.final_grade
            FROM dbo.AUDIT_5S_ROUNDS R WITH (NOLOCK)
            WHERE R.audit_date >= ? AND R.audit_date < ?
              AND R.submitted_count > 0
            ORDER BY R.audit_date DESC, R.round_id DESC
        ");
        $stmtRounds->execute([$startDate, $endDate]);
        foreach ($stmtRounds->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $ln = trim((string)$row['line']);
            if ($ln === '' || isset($map[$ln])) {
                continue;
            }
            $score = $row['weighted_score'] !== null ? round((float)$row['weighted_score'], 2) : null;
            $map[$ln] = [
                'source' => 'COMMITTEE_ROUND',
                'round_id' => (int)$row['round_id'],
                'round_name' => $row['round_name'],
                'score_5s' => $score,
                'grade_5s' => $row['final_grade'] ?: ($score !== null ? scoreTo5sGrade($score) : null),
                'submitted_count' => (int)$row['submitted_count'],
                'required_auditors' => (int)$row['required_auditors'],
                'is_consensus_complete' => ((int)$row['submitted_count'] >= (int)$row['required_auditors']),
            ];
        }
    } catch (Throwable $ignore) {
        // Fallback smoothly if committee tables are unavailable
    }

    $stmtLegacy = $pdo->prepare("
        SELECT a.line, a.grade, a.total_score, CONVERT(VARCHAR(10), a.audit_date, 120) AS audit_date
        FROM dbo.AUDIT_5S a WITH (NOLOCK)
        INNER JOIN (
            SELECT line, MAX(audit_date) AS max_date
            FROM dbo.AUDIT_5S WITH (NOLOCK)
            WHERE audit_date >= ? AND audit_date < ?
            GROUP BY line
        ) latest ON a.line = latest.line AND a.audit_date = latest.max_date
        ORDER BY a.audit_id DESC
    ");
    $stmtLegacy->execute([$startDate, $endDate]);
    foreach ($stmtLegacy->fetchAll(PDO::FETCH_ASSOC) as $row) {
        $ln = trim((string)$row['line']);
        if ($ln === '' || isset($map[$ln])) {
            continue;
        }
        $score = (float)($row['total_score'] ?? 0);
        $map[$ln] = [
            'source' => 'SINGLE_AUDIT',
            'round_id' => null,
            'round_name' => 'ตรวจ 5ส ประจำวัน (' . $row['audit_date'] . ')',
            'score_5s' => $score,
            'grade_5s' => $row['grade'] ?: scoreTo5sGrade($score),
            'submitted_count' => 1,
            'required_auditors' => 1,
            'is_consensus_complete' => true,
        ];
    }

    return $map;
}

/**
 * Recomputes and persists equal-weight (1/N) summary metrics on dbo.AUDIT_5S_ROUNDS.
 */
function recompute5sRoundSummary(PDO $pdo, int $roundId): array {
    $stmtRound = $pdo->prepare('SELECT round_id, required_auditors, status FROM dbo.AUDIT_5S_ROUNDS WHERE round_id = ?');
    $stmtRound->execute([$roundId]);
    $round = $stmtRound->fetch(PDO::FETCH_ASSOC);
    if (!$round) {
        throw new InvalidArgumentException('ไม่พบรอบการตรวจประเมิน 5ส ที่ระบุ');
    }

    $stmtAudits = $pdo->prepare('SELECT audit_id, total_score FROM dbo.AUDIT_5S WHERE round_id = ?');
    $stmtAudits->execute([$roundId]);
    $audits = $stmtAudits->fetchAll(PDO::FETCH_ASSOC);

    $consensus = compute5sRoundConsensus($audits);
    $reqCount = max(3, min(5, (int)$round['required_auditors']));
    $newStatus = $round['status'] === 'LOCKED'
        ? 'LOCKED'
        : ($consensus['submitted_count'] >= $reqCount ? 'COMPLETED' : 'OPEN');

    $pdo->prepare('
        UPDATE dbo.AUDIT_5S_ROUNDS
        SET submitted_count = ?, weighted_score = ?, final_grade = ?, status = ?, updated_at = GETDATE()
        WHERE round_id = ?
    ')->execute([
        $consensus['submitted_count'],
        $consensus['weighted_score'],
        $consensus['final_grade'],
        $newStatus,
        $roundId,
    ]);

    return array_merge($consensus, [
        'round_id' => $roundId,
        'required_auditors' => $reqCount,
        'status' => $newStatus,
    ]);
}

/**
 * Resolves shared 5S audit upload base directory outside page/ across FTP and local layouts.
 */
function resolve5sUploadsBaseDir(): string {
    $candidates = [
        dirname(__DIR__, 3) . '/MES/MES/uploads',
        dirname(__DIR__, 4) . '/MES/MES/uploads',
        dirname(__DIR__, 4) . '/uploads',
        dirname(__DIR__, 3) . '/uploads',
        dirname(__DIR__, 2) . '/uploads',
    ];
    foreach ($candidates as $dir) {
        if (is_dir($dir)) {
            $real = realpath($dir);
            return $real !== false ? $real : $dir;
        }
    }
    $fallback = dirname(__DIR__, 3) . '/MES/MES/uploads';
    if (!is_dir($fallback)) {
        @mkdir($fallback, 0775, true);
    }
    $real = realpath($fallback);
    return $real !== false ? $real : $fallback;
}

/**
 * Returns candidate base directories for securely serving 5S audit photos.
 */
function resolve5sUploadSearchDirs(): array {
    $dirs = [];
    $candidates = [
        resolve5sUploadsBaseDir(),
        dirname(__DIR__, 3) . '/MES/MES/uploads',
        dirname(__DIR__, 4) . '/MES/MES/uploads',
        dirname(__DIR__, 4) . '/uploads',
        dirname(__DIR__, 3) . '/uploads',
        dirname(__DIR__, 2) . '/uploads',
    ];
    foreach ($candidates as $dir) {
        $real = @realpath($dir);
        if ($real !== false && is_dir($real) && !in_array($real, $dirs, true)) {
            $dirs[] = $real;
        }
    }
    return $dirs;
}

/**
 * Validates and persists uploaded 5S evidence photos outside page/ under uploads/5s_audits/.
 */
function save5sPhotoUploads(array $fileField, int $roundId, int $auditId, array $categories = [], array $captions = []): array {
    if (empty($fileField['name'])) {
        return [];
    }

    $names = is_array($fileField['name']) ? $fileField['name'] : [$fileField['name']];
    $tmps = is_array($fileField['tmp_name']) ? $fileField['tmp_name'] : [$fileField['tmp_name']];
    $errors = is_array($fileField['error']) ? $fileField['error'] : [$fileField['error']];
    $sizes = is_array($fileField['size']) ? $fileField['size'] : [$fileField['size']];

    $targetDir = resolve5sUploadsBaseDir() . DIRECTORY_SEPARATOR . '5s_audits';
    if (!is_dir($targetDir) && !@mkdir($targetDir, 0775, true)) {
        throw new RuntimeException('ไม่สามารถสร้างโฟลเดอร์จัดเก็บภาพตรวจ 5ส ได้');
    }

    $allowedCat = ['SEIRI', 'SEITON', 'SEISO', 'SEIKETSU', 'SHITSUKE', 'GENERAL'];
    $saved = [];
    $finfo = finfo_open(FILEINFO_MIME_TYPE);

    try {
        foreach ($names as $idx => $origName) {
            if (($errors[$idx] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) {
                continue;
            }
            if (($errors[$idx] ?? UPLOAD_ERR_OK) !== UPLOAD_ERR_OK) {
                throw new InvalidArgumentException('การอัปโหลดภาพถ่าย 5ส ไม่สมบูรณ์ กรุณาลองใหม่');
            }
            if (count($saved) >= 10) {
                break;
            }
            $tmpPath = (string)($tmps[$idx] ?? '');
            $fileSize = (int)($sizes[$idx] ?? 0);
            if ($fileSize <= 0 || $fileSize > GRADING_5S_MAX_FILE_BYTES) {
                throw new InvalidArgumentException('ขนาดไฟล์ภาพ 5ส ต้องไม่เกิน 5MB ต่อรูป');
            }

            $mime = $finfo ? (string)finfo_file($finfo, $tmpPath) : '';
            if (!in_array($mime, GRADING_5S_ALLOWED_MIMES, true) || @getimagesize($tmpPath) === false) {
                throw new InvalidArgumentException('รองรับเฉพาะไฟล์รูปภาพ JPEG, PNG หรือ WebP เท่านั้น');
            }

            $ext = $mime === 'image/png' ? 'png' : ($mime === 'image/webp' ? 'webp' : 'jpg');
            $rand = bin2hex(random_bytes(5));
            $fileName = sprintf('5s_r%d_a%d_%s_%s.%s', $roundId, $auditId, date('Ymd_His'), $rand, $ext);
            $destPath = $targetDir . DIRECTORY_SEPARATOR . $fileName;

            if (!@move_uploaded_file($tmpPath, $destPath) && !@copy($tmpPath, $destPath)) {
                throw new RuntimeException('ไม่สามารถบันทึกไฟล์ภาพลงบนเซิร์ฟเวอร์ได้');
            }

            $cat = strtoupper(trim((string)($categories[$idx] ?? 'GENERAL')));
            if (!in_array($cat, $allowedCat, true)) {
                $cat = 'GENERAL';
            }

            $saved[] = [
                'category_5s' => $cat,
                'file_name' => $fileName,
                'file_path' => 'uploads/5s_audits/' . $fileName,
                'original_name' => mb_substr(basename((string)$origName), 0, 200, 'UTF-8'),
                'caption' => mb_substr(trim((string)($captions[$idx] ?? '')), 0, 300, 'UTF-8'),
            ];
        }
    } finally {
        if ($finfo) {
            finfo_close($finfo);
        }
    }

    return $saved;
}
