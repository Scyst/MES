<?php
/**
 * Self-contained Learning Hub, Competency Passport & Mixed Mandatory Curriculum API.
 * - Replaces cross-directory calls to ../MES/MES/page/manpower/api/api_learning.php.
 * - Uses shared _grading_helpers.php for University-Style Credits + Mandatory 1M/3M Resets.
 * - Enforces session authentication & CSRF protection on all mutations.
 */

define('ALLOW_GUEST_ACCESS', true);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: strict-origin-when-cross-origin');

date_default_timezone_set('Asia/Bangkok');

require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../utils/check_auth.php';
require_once __DIR__ . '/../../utils/logger.php';
require_once __DIR__ . '/../manpower/_grading_helpers.php';

$COURSE_SKILL_MAP = [
    'c-enterprise-app' => 'SKILL_ENTERPRISE_APP',
    'c-ppap' => 'SKILL_PPAP_APQP',
    'c-iso-9001' => 'SKILL_ISO_9001',
    'c-iso-14001' => 'SKILL_ISO_14001',
    'c-iso-45001' => 'SKILL_ISO_45001',
    'c-iso-17025' => 'SKILL_ISO_17025',
    'c-live-qa' => 'SKILL_IQC_OQC_VISUAL',
    'c-customer-audits' => 'SKILL_CUSTOMER_AUDIT',
    'c-industrial-backend-api' => 'SKILL_PHP_PDO_API',
    'c-industrial-database-sql' => 'SKILL_MSSQL_DBA',
    'c-iiot-nodered-edge' => 'SKILL_NODERED_IIOT',
    'c-machine-vision' => 'SKILL_MACHINE_VISION',
    'c-machine-vision-v2' => 'SKILL_MACHINE_VISION_V2',
    'c-cad-cam' => 'SKILL_CAD_CAM',
    'c-cnc-4-0' => 'SKILL_CNC_5AXIS',
    'c-ev-conversion' => 'SKILL_EV_HV_SAFETY',
    'c-plc-automation' => 'SKILL_PLC_HMI',
    'c-robot-automation' => 'SKILL_ROBOT_ARC',
];

function lrJsonExit(bool $success, $data = null, string $message = 'OK', int $code = 200, array $extra = []): void {
    http_response_code($code);
    echo json_encode(array_merge([
        'success' => $success,
        'data' => $data,
        'message' => $message,
    ], $extra), JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

function validateLrCsrf(): void {
    $hdr = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    $sess = $_SESSION['csrf_token'] ?? '';
    if ($hdr === '' || $sess === '' || !hash_equals($sess, $hdr)) {
        lrJsonExit(false, null, 'การตรวจสอบความปลอดภัย (CSRF Token) ไม่ถูกต้อง กรุณารีเฟรชหน้าจอ', 403);
    }
}

$rawBody = file_get_contents('php://input');
$jsonBody = ($rawBody !== false && trim($rawBody) !== '') ? (json_decode($rawBody, true) ?: []) : [];
$input = array_merge($_GET, $_POST, is_array($jsonBody) ? $jsonBody : []);
$action = trim((string)($input['action'] ?? 'get_current_user'));
$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

try {
    if ($action === 'get_current_user') {
        $sessUser = $_SESSION['user'] ?? [];
        if (empty($sessUser['id'])) {
            lrJsonExit(true, ['user' => null], 'Guest mode', 200, ['authenticated' => false]);
        }

        $empId = resolveSessionEmpId($pdo, $sessUser);
        $empRow = null;
        if ($empId !== '') {
            $stmtE = $pdo->prepare("
                SELECT TOP 1 E.emp_id, E.name_th, E.position, E.department_api, E.line, E.team_group,
                       ISNULL(TS.hc_group, '') AS hc_group
                FROM dbo.MANPOWER_EMPLOYEES E WITH (NOLOCK)
                LEFT JOIN dbo.MANPOWER_TEAM_SETTINGS TS WITH (NOLOCK) ON E.department_api = TS.department_api
                WHERE E.emp_id = ?
            ");
            $stmtE->execute([$empId]);
            $empRow = $stmtE->fetch(PDO::FETCH_ASSOC) ?: null;
        }

        $effectiveId = $empId !== '' ? $empId : (string)($sessUser['username'] ?? $sessUser['id']);
        $sysRole = (string)($sessUser['role'] ?? 'operator');
        $empForEval = [
            'emp_id' => $effectiveId,
            'position' => $empRow['position'] ?? '',
            'sys_role' => $sysRole,
            'department_api' => $empRow['department_api'] ?? '',
            'line' => $empRow['line'] ?? ($sessUser['line'] ?? ''),
            'hc_group' => $empRow['hc_group'] ?? '',
        ];

        $learnCtx = fetchLearningEvalContext($pdo, [$effectiveId]);
        $empRecords = $learnCtx['records_by_emp'][$effectiveId] ?? [];
        $learnEval = evaluateUniversityLearning(
            $empForEval,
            $learnCtx['rules'],
            $empRecords,
            (int)($learnCtx['manual_skills_by_emp'][$effectiveId] ?? 0),
            date('Y-m')
        );

        $stmtGrade = $pdo->prepare("
            SELECT TOP 1 evaluation_period, grade, grade_iph, grade_5s, grade_attendance, grade_learning, grade_overall
            FROM dbo.EMPLOYEE_GRADES WITH (NOLOCK)
            WHERE emp_id = ?
            ORDER BY evaluation_period DESC
        ");
        $stmtGrade->execute([$effectiveId]);
        $gradeRow = $stmtGrade->fetch(PDO::FETCH_ASSOC) ?: [];

        $canViewSelfGrading = ($empId !== '');
        $isManager = isGradingManagerUser($sessUser);
        $isAdmin = in_array(strtolower($sysRole), ['creator', 'admin'], true);
        $isTrainer = $isAdmin || in_array(strtolower($sysRole), ['manager', 'supervisor', 'qa', 'qc'], true);

        $avgScore = 0.0;
        $scoredCount = 0;
        foreach ($empRecords as $r) {
            if (!empty($r['passed'])) {
                $avgScore += (int)($r['quiz_percentage'] ?? 0);
                $scoredCount++;
            }
        }

        lrJsonExit(true, [
            'csrf_token' => $_SESSION['csrf_token'] ?? '',
            'user' => [
                'id' => $effectiveId,
                'emp_id' => $effectiveId,
                'username' => $sessUser['username'] ?? $effectiveId,
                'name' => $empRow['name_th'] ?? ($sessUser['fullname'] ?? $sessUser['username'] ?? ''),
                'role' => $empRow['position'] ?? ($sessUser['role'] ?? ''),
                'sys_role' => $sysRole,
                'line' => $empRow['line'] ?? ($sessUser['line'] ?? 'ALL'),
                'department' => $empRow['department_api'] ?? '',
                'team_group' => $empRow['hc_group'] ?: ($empRow['team_group'] ?? 'TEAM 1'),
                'profile_picture' => $sessUser['profile_picture'] ?? '',
                'is_logged_in_real' => true,
                'is_admin' => $isAdmin,
                'is_manager' => $isManager,
                'is_trainer' => $isTrainer,
                'can_view_grading' => $canViewSelfGrading,
                'skill_count' => $learnEval['total_credits'],
                'passed_courses' => $learnEval['passed_courses_total'],
                'exp' => 450 + ($learnEval['passed_courses_total'] * 50),
            ],
            'grading' => $canViewSelfGrading ? [
                'evaluation_period' => $gradeRow['evaluation_period'] ?? date('Y-m'),
                'grade_overall' => $gradeRow['grade_overall'] ?? $gradeRow['grade'] ?? '-',
                'grade_iph' => $gradeRow['grade_iph'] ?? '-',
                'grade_5s' => $gradeRow['grade_5s'] ?? '-',
                'grade_attendance' => $gradeRow['grade_attendance'] ?? '-',
                'grade_learning' => !empty($gradeRow['grade_learning']) ? $gradeRow['grade_learning'] : $learnEval['grade'],
                'system_grade_learning' => $learnEval['grade'],
                'learning_tier_name' => $learnEval['tier_name'],
                'learning_target_a' => $learnEval['target_a'],
                'learning_target_b' => $learnEval['target_b'],
                'learning_target_c' => $learnEval['target_c'],
                'learning_criteria_label' => $learnEval['criteria_label'],
                'skill_count' => $learnEval['total_credits'],
                'passed_courses' => $learnEval['passed_courses_total'],
                'avg_score' => $scoredCount > 0 ? round($avgScore / $scoredCount, 1) : 0,
                'wage_masked' => !$isManager,
                'learning_eval' => $learnEval,
            ] : null,
            'curriculum' => $learnEval,
            'courses' => array_map(static function ($c) {
                return [
                    'course_id' => $c['course_id'],
                    'course_title' => $c['course_title'],
                    'category' => $c['category'],
                    'status' => $c['status'],
                    'quiz_score' => (int)($c['quiz_score'] ?? 0),
                    'quiz_total' => (int)($c['quiz_total'] ?? 0),
                    'quiz_percentage' => (int)($c['quiz_percentage'] ?? 0),
                    'passed' => !empty($c['passed']),
                    'certificate_id' => $c['certificate_id'],
                    'cycle_key' => $c['cycle_key'] ?? 'PERM',
                    'expires_at' => $c['expires_at'] ?? null,
                    'completed_at' => $c['completed_at'] ?? null,
                ];
            }, $empRecords),
        ], 'OK', 200, ['authenticated' => true]);
    }

    if (empty($_SESSION['user']['id'])) {
        lrJsonExit(false, null, 'กรุณาเข้าสู่ระบบ MES ก่อนดำเนินการ', 401, ['authenticated' => false]);
    }

    $sessUser = $_SESSION['user'];
    $isManager = isGradingManagerUser($sessUser);
    $selfEmpId = resolveSessionEmpId($pdo, $sessUser);

    if ($method !== 'GET' && $method !== 'HEAD' && $method !== 'OPTIONS') {
        validateLrCsrf();
    }

    switch ($action) {
        case 'get_curriculum_rules':
            $rules = $pdo->query("
                SELECT rule_id, course_id, course_title, hc_group_filter, department_filter,
                       line_filter, tier_filter, requirement_type, reset_cycle, credits,
                       pass_score_pct, is_active, notes, created_by, created_at, updated_at
                FROM dbo.LEARNING_CURRICULUM_RULES WITH (NOLOCK)
                ORDER BY is_active DESC, CASE WHEN requirement_type = 'MANDATORY' THEN 0 ELSE 1 END, rule_id DESC
            ")->fetchAll(PDO::FETCH_ASSOC);

            $hcGroups = $pdo->query("SELECT DISTINCT hc_group FROM dbo.MANPOWER_TEAM_SETTINGS WITH (NOLOCK) WHERE hc_group IS NOT NULL AND hc_group <> '' ORDER BY hc_group ASC")->fetchAll(PDO::FETCH_COLUMN);
            $departments = $pdo->query("SELECT DISTINCT department_api FROM dbo.MANPOWER_TEAM_SETTINGS WITH (NOLOCK) WHERE department_api IS NOT NULL AND department_api <> '' ORDER BY department_api ASC")->fetchAll(PDO::FETCH_COLUMN);
            $lines = $pdo->query("SELECT DISTINCT line FROM dbo.MANPOWER_EMPLOYEES WITH (NOLOCK) WHERE is_active = 1 AND line IS NOT NULL AND line <> '' ORDER BY line ASC")->fetchAll(PDO::FETCH_COLUMN);

            lrJsonExit(true, [
                'rules' => $rules,
                'filters' => [
                    'hc_groups' => $hcGroups,
                    'departments' => $departments,
                    'lines' => $lines,
                    'tiers' => ['ALL', 'TIER_1', 'TIER_2', 'TIER_3'],
                ],
                'current_monthly_cycle' => resolveLearningCycleInfo('MONTHLY')['cycle_key'],
                'current_quarterly_cycle' => resolveLearningCycleInfo('QUARTERLY')['cycle_key'],
            ]);

        case 'save_curriculum_rule':
            if (!$isManager) {
                lrJsonExit(false, null, 'สงวนสิทธิ์เฉพาะผู้ดูแลระบบในการตั้งค่าหลักสูตรบังคับ', 403);
            }
            $ruleId = (int)($input['rule_id'] ?? 0);
            $courseId = trim((string)($input['course_id'] ?? ''));
            $courseTitle = mb_substr(trim((string)($input['course_title'] ?? $courseId)), 0, 255, 'UTF-8');
            $hcFilter = trim((string)($input['hc_group_filter'] ?? 'ALL')) ?: 'ALL';
            $deptFilter = mb_substr(trim((string)($input['department_filter'] ?? 'ALL')) ?: 'ALL', 0, 100, 'UTF-8');
            $lineFilter = trim((string)($input['line_filter'] ?? 'ALL')) ?: 'ALL';
            $tierFilter = strtoupper(trim((string)($input['tier_filter'] ?? 'ALL')) ?: 'ALL');
            $reqType = strtoupper(trim((string)($input['requirement_type'] ?? 'MANDATORY')) ?: 'MANDATORY');
            $resetCycle = strtoupper(trim((string)($input['reset_cycle'] ?? 'MONTHLY')) ?: 'MONTHLY');
            $credits = max(0.5, min(10.0, round((float)($input['credits'] ?? 1.0), 1)));
            $passPct = max(50, min(100, (int)($input['pass_score_pct'] ?? 80)));
            $isActive = isset($input['is_active']) ? ((int)$input['is_active'] ? 1 : 0) : 1;
            $notes = mb_substr(trim((string)($input['notes'] ?? '')), 0, 300, 'UTF-8');

            if ($courseId === '') {
                throw new InvalidArgumentException('กรุณาเลือกหลักสูตร');
            }
            if (!in_array($tierFilter, ['ALL', 'TIER_1', 'TIER_2', 'TIER_3'], true)) {
                throw new InvalidArgumentException('ระดับตำแหน่งเป้าหมายไม่ถูกต้อง');
            }
            if (!in_array($reqType, ['MANDATORY', 'ELECTIVE'], true)) {
                throw new InvalidArgumentException('ประเภทหลักสูตรต้องเป็น MANDATORY หรือ ELECTIVE');
            }
            if (!in_array($resetCycle, ['MONTHLY', 'QUARTERLY', 'NONE'], true)) {
                throw new InvalidArgumentException('รอบรีเซ็ทต้องเป็น MONTHLY (1 เดือน), QUARTERLY (3 เดือน) หรือ NONE');
            }

            $pdo->beginTransaction();
            $oldRule = null;
            if ($ruleId > 0) {
                $stmtOld = $pdo->prepare('SELECT * FROM dbo.LEARNING_CURRICULUM_RULES WHERE rule_id = ?');
                $stmtOld->execute([$ruleId]);
                $oldRule = $stmtOld->fetch(PDO::FETCH_ASSOC);
                if (!$oldRule) {
                    throw new InvalidArgumentException('ไม่พบกฎหลักสูตรที่ต้องการแก้ไข');
                }
                $pdo->prepare("
                    UPDATE dbo.LEARNING_CURRICULUM_RULES
                    SET course_id = ?, course_title = ?, hc_group_filter = ?, department_filter = ?,
                        line_filter = ?, tier_filter = ?, requirement_type = ?, reset_cycle = ?,
                        credits = ?, pass_score_pct = ?, is_active = ?, notes = ?, updated_at = GETDATE()
                    WHERE rule_id = ?
                ")->execute([
                    $courseId, $courseTitle, $hcFilter, $deptFilter, $lineFilter, $tierFilter,
                    $reqType, $resetCycle, $credits, $passPct, $isActive, $notes, $ruleId
                ]);
            } else {
                $pdo->prepare("
                    INSERT INTO dbo.LEARNING_CURRICULUM_RULES
                    (course_id, course_title, hc_group_filter, department_filter, line_filter, tier_filter,
                     requirement_type, reset_cycle, credits, pass_score_pct, is_active, notes, created_by)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ")->execute([
                    $courseId, $courseTitle, $hcFilter, $deptFilter, $lineFilter, $tierFilter,
                    $reqType, $resetCycle, $credits, $passPct, $isActive, $notes, $selfEmpId ?: 'ADMIN'
                ]);
                $ruleId = (int)$pdo->lastInsertId();
            }

            writeLog($pdo, $oldRule ? 'UPDATE' : 'CREATE', 'LEARNING_CURRICULUM_RULE', (string)$ruleId, $oldRule, [
                'course_id' => $courseId, 'hc_group_filter' => $hcFilter, 'department_filter' => $deptFilter,
                'line_filter' => $lineFilter, 'tier_filter' => $tierFilter,
                'requirement_type' => $reqType, 'reset_cycle' => $resetCycle, 'credits' => $credits,
            ], "Configured {$reqType} learning rule for {$courseId} ({$resetCycle})");
            $pdo->commit();
            lrJsonExit(true, ['rule_id' => $ruleId], 'บันทึกกติกาหลักสูตรบังคับและรอบรีเซ็ทเรียบร้อยแล้ว');

        case 'delete_curriculum_rule':
            if (!$isManager) {
                lrJsonExit(false, null, 'สงวนสิทธิ์เฉพาะผู้ดูแลระบบ', 403);
            }
            $ruleId = (int)($input['rule_id'] ?? 0);
            $stmtOld = $pdo->prepare('SELECT * FROM dbo.LEARNING_CURRICULUM_RULES WHERE rule_id = ?');
            $stmtOld->execute([$ruleId]);
            $oldRule = $stmtOld->fetch(PDO::FETCH_ASSOC);
            if (!$oldRule) {
                throw new InvalidArgumentException('ไม่พบรายการที่ต้องการลบ');
            }
            $pdo->beginTransaction();
            $pdo->prepare('DELETE FROM dbo.LEARNING_CURRICULUM_RULES WHERE rule_id = ?')->execute([$ruleId]);
            writeLog($pdo, 'DELETE', 'LEARNING_CURRICULUM_RULE', (string)$ruleId, $oldRule, null, "Deleted learning curriculum rule #{$ruleId} ({$oldRule['course_id']})");
            $pdo->commit();
            lrJsonExit(true, ['rule_id' => $ruleId], 'ลบกฎหลักสูตรเรียบร้อยแล้ว');

        case 'get_employees':
            $search = trim((string)($input['q'] ?? ''));
            $lineFilter = trim((string)($input['line'] ?? 'ALL'));
            $limit = min(200, max(1, (int)($input['limit'] ?? 100)));
            $offset = max(0, (int)($input['offset'] ?? 0));

            $where = ['E.is_active = 1'];
            $params = [];
            if ($search !== '') {
                $where[] = '(E.emp_id LIKE ? OR E.name_th LIKE ? OR E.position LIKE ?)';
                $like = "%{$search}%";
                array_push($params, $like, $like, $like);
            }
            if ($lineFilter !== '' && $lineFilter !== 'ALL') {
                $where[] = 'E.line = ?';
                $params[] = $lineFilter;
            }
            $whereSql = implode(' AND ', $where);
            $stmt = $pdo->prepare("
                SELECT E.emp_id, E.name_th, E.position, E.line, E.department_api,
                       ISNULL(TS.hc_group, '') AS hc_group,
                       U.role AS sys_role, U.profile_picture
                FROM dbo.MANPOWER_EMPLOYEES E WITH (NOLOCK)
                LEFT JOIN dbo.MANPOWER_TEAM_SETTINGS TS WITH (NOLOCK) ON E.department_api = TS.department_api
                OUTER APPLY (
                    SELECT TOP 1 role, profile_picture FROM dbo.USERS WITH (NOLOCK)
                    WHERE emp_id = E.emp_id COLLATE Thai_CI_AS ORDER BY is_active DESC, id ASC
                ) U
                WHERE {$whereSql}
                ORDER BY E.line ASC, E.name_th ASC
                OFFSET {$offset} ROWS FETCH NEXT {$limit} ROWS ONLY
            ");
            $stmt->execute($params);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $empIds = array_column($rows, 'emp_id');
            $ctx = fetchLearningEvalContext($pdo, $empIds);
            foreach ($rows as &$r) {
                $eid = trim((string)$r['emp_id']);
                $eval = evaluateUniversityLearning(
                    $r,
                    $ctx['rules'],
                    $ctx['records_by_emp'][$eid] ?? [],
                    (int)($ctx['manual_skills_by_emp'][$eid] ?? 0),
                    date('Y-m')
                );
                $r['passed_courses'] = $eval['passed_courses_total'];
                $r['total_credits'] = $eval['total_credits'];
                $r['mandatory_passed'] = $eval['mandatory_passed'];
                $r['mandatory_total'] = $eval['mandatory_total'];
                $r['grade_learning'] = $eval['grade'];
            }
            unset($r);
            $allLines = $pdo->query("SELECT DISTINCT line FROM dbo.MANPOWER_EMPLOYEES WITH (NOLOCK) WHERE is_active = 1 AND line IS NOT NULL AND line <> '' ORDER BY line ASC")->fetchAll(PDO::FETCH_COLUMN);
            lrJsonExit(true, [
                'employees' => $rows,
                'lines' => $allLines,
            ]);

        case 'get_employee_passport':
            $reqEmpId = trim((string)($input['emp_id'] ?? $selfEmpId));
            // Self or Management can view passport & own grade; colleagues cannot see another employee's financial/4D grade
            if (!$isManager && $reqEmpId !== $selfEmpId) {
                lrJsonExit(false, null, 'สงวนสิทธิ์เฉพาะการดูสมุดพกทักษะของตนเองหรือสิทธิ์ผู้ดูแลระบบ', 403);
            }
            $stmtEmp = $pdo->prepare("
                SELECT TOP 1 E.emp_id, E.name_th, E.position, E.department_api, E.line, E.team_group,
                       ISNULL(TS.hc_group, '') AS hc_group, U.role AS sys_role, U.profile_picture
                FROM dbo.MANPOWER_EMPLOYEES E WITH (NOLOCK)
                LEFT JOIN dbo.MANPOWER_TEAM_SETTINGS TS WITH (NOLOCK) ON E.department_api = TS.department_api
                OUTER APPLY (
                    SELECT TOP 1 role, profile_picture FROM dbo.USERS WITH (NOLOCK)
                    WHERE emp_id = E.emp_id COLLATE Thai_CI_AS ORDER BY is_active DESC, id ASC
                ) U
                WHERE E.emp_id = ?
            ");
            $stmtEmp->execute([$reqEmpId]);
            $emp = $stmtEmp->fetch(PDO::FETCH_ASSOC);
            if (!$emp) {
                throw new InvalidArgumentException('ไม่พบข้อมูลพนักงานที่ระบุ');
            }

            $ctx = fetchLearningEvalContext($pdo, [$reqEmpId]);
            $records = $ctx['records_by_emp'][$reqEmpId] ?? [];
            $learnEval = evaluateUniversityLearning(
                $emp,
                $ctx['rules'],
                $records,
                (int)($ctx['manual_skills_by_emp'][$reqEmpId] ?? 0),
                date('Y-m')
            );

            $stmtSkills = $pdo->prepare("
                SELECT SD.skill_code, SD.skill_name, SD.category, ES.level, ES.certified_at, ES.certified_by, ES.notes
                FROM dbo.EMP_SKILLS ES WITH (NOLOCK)
                INNER JOIN dbo.SKILL_DEFINITIONS SD WITH (NOLOCK) ON ES.skill_id = SD.skill_id
                WHERE ES.emp_id = ?
                ORDER BY ES.level DESC, SD.display_order ASC
            ");
            $stmtSkills->execute([$reqEmpId]);
            $skills = $stmtSkills->fetchAll(PDO::FETCH_ASSOC);

            $stmtGrade = $pdo->prepare("
                SELECT TOP 1 evaluation_period, grade, grade_iph, grade_5s, grade_attendance, grade_learning, grade_overall, notes
                FROM dbo.EMPLOYEE_GRADES WITH (NOLOCK)
                WHERE emp_id = ?
                ORDER BY evaluation_period DESC
            ");
            $stmtGrade->execute([$reqEmpId]);
            $gradeRow = $stmtGrade->fetch(PDO::FETCH_ASSOC) ?: [];

            lrJsonExit(true, [
                'employee' => $emp,
                'learning_records' => $records,
                'skills' => $skills,
                'curriculum' => $learnEval,
                'can_view_grading' => ($isManager || $reqEmpId === $selfEmpId),
                'grading' => [
                    'evaluation_period' => $gradeRow['evaluation_period'] ?? date('Y-m'),
                    'grade_overall' => $gradeRow['grade_overall'] ?? $gradeRow['grade'] ?? '-',
                    'grade_iph' => $gradeRow['grade_iph'] ?? '-',
                    'grade_5s' => $gradeRow['grade_5s'] ?? '-',
                    'grade_attendance' => $gradeRow['grade_attendance'] ?? '-',
                    'grade_learning' => !empty($gradeRow['grade_learning']) ? $gradeRow['grade_learning'] : $learnEval['grade'],
                    'system_grade_learning' => $learnEval['grade'],
                    'learning_tier_name' => $learnEval['tier_name'],
                    'learning_target_a' => $learnEval['target_a'],
                    'learning_target_b' => $learnEval['target_b'],
                    'learning_target_c' => $learnEval['target_c'],
                    'learning_criteria_label' => $learnEval['criteria_label'],
                    'skill_count' => $learnEval['total_credits'],
                    'passed_courses' => $learnEval['passed_courses_total'],
                    'learning_eval' => $learnEval,
                    'notes' => $gradeRow['notes'] ?? null,
                ],
            ]);

        case 'save_course_progress':
            $empId = trim((string)($input['emp_id'] ?? $selfEmpId));
            if (!$isManager && $empId !== $selfEmpId) {
                lrJsonExit(false, null, 'ไม่สามารถบันทึกผลการเรียนแทนพนักงานคนอื่นได้', 403);
            }
            $courseId = trim((string)($input['course_id'] ?? ''));
            $courseTitle = mb_substr(trim((string)($input['course_title'] ?? $courseId)), 0, 255, 'UTF-8');
            $category = mb_substr(trim((string)($input['category'] ?? 'มาตรฐานโรงงาน')), 0, 100, 'UTF-8');
            $status = trim((string)($input['status'] ?? 'in_progress'));
            $quizScore = (int)($input['quiz_score'] ?? 0);
            $quizTotal = max(1, (int)($input['quiz_total'] ?? 4));
            $quizPct = max(0, min(100, (int)($input['quiz_percentage'] ?? round(($quizScore / $quizTotal) * 100))));
            $passed = (!empty($input['passed']) && $quizPct >= 50) ? 1 : 0;
            $certId = $passed ? trim((string)($input['certificate_id'] ?? '')) : null;
            if ($passed && empty($certId)) {
                $certId = 'SNC-CERT-' . date('Y') . '-' . random_int(1000, 9999);
            }

            if ($empId === '' || $courseId === '') {
                throw new InvalidArgumentException('ข้อมูลรหัสพนักงานหรือรหัสหลักสูตรไม่ครบถ้วน');
            }

            $stmtEmp = $pdo->prepare("
                SELECT TOP 1 E.emp_id, E.position, E.department_api, E.line, ISNULL(TS.hc_group, '') AS hc_group,
                       ISNULL(TS.weight_iph, 25) AS weight_iph, ISNULL(TS.weight_5s, 25) AS weight_5s,
                       ISNULL(TS.weight_attendance, 25) AS weight_attendance, ISNULL(TS.weight_learning, 25) AS weight_learning
                FROM dbo.MANPOWER_EMPLOYEES E WITH (NOLOCK)
                LEFT JOIN dbo.MANPOWER_TEAM_SETTINGS TS WITH (NOLOCK) ON E.department_api = TS.department_api
                WHERE E.emp_id = ?
            ");
            $stmtEmp->execute([$empId]);
            $empRow = $stmtEmp->fetch(PDO::FETCH_ASSOC) ?: [
                'emp_id' => $empId, 'position' => '', 'department_api' => '', 'line' => '', 'hc_group' => '',
                'weight_iph' => 25, 'weight_5s' => 25, 'weight_attendance' => 25, 'weight_learning' => 25,
            ];
            $empRow['sys_role'] = $sessUser['role'] ?? '';

            $ctxBefore = fetchLearningEvalContext($pdo, [$empId]);
            $tier = resolveLearningTier((string)$empRow['position'], (string)$empRow['sys_role']);
            $matchedRule = null;
            foreach ($ctxBefore['rules'] as $r) {
                if ($r['course_id'] === $courseId && ruleMatchesEmployee($r, $empRow, $tier['tier_code'])) {
                    $matchedRule = $r;
                    break;
                }
            }

            $cycleInfo = resolveLearningCycleInfo($matchedRule ? (string)$matchedRule['reset_cycle'] : 'NONE', date('Y-m'));
            $cycleKey = $cycleInfo['cycle_key'];
            $expiresAt = $cycleInfo['expires_at'];
            $ruleId = $matchedRule ? (int)$matchedRule['rule_id'] : null;

            $pdo->beginTransaction();
            $pdo->prepare("
                MERGE dbo.LEARNING_RECORDS AS target
                USING (VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?))
                AS source (emp_id, course_id, course_title, category, status, quiz_score, quiz_total, quiz_percentage, passed, certificate_id, cycle_key, rule_id, expires_at)
                ON target.emp_id = source.emp_id AND target.course_id = source.course_id AND target.cycle_key = source.cycle_key
                WHEN MATCHED THEN
                    UPDATE SET
                        target.course_title = source.course_title,
                        target.category = source.category,
                        target.status = CASE WHEN target.passed = 1 THEN 'completed' ELSE source.status END,
                        target.quiz_score = CASE WHEN source.quiz_score > ISNULL(target.quiz_score, 0) THEN source.quiz_score ELSE target.quiz_score END,
                        target.quiz_total = source.quiz_total,
                        target.quiz_percentage = CASE WHEN source.quiz_percentage > ISNULL(target.quiz_percentage, 0) THEN source.quiz_percentage ELSE target.quiz_percentage END,
                        target.passed = CASE WHEN target.passed = 1 OR source.passed = 1 THEN 1 ELSE 0 END,
                        target.certificate_id = COALESCE(target.certificate_id, source.certificate_id),
                        target.rule_id = COALESCE(source.rule_id, target.rule_id),
                        target.expires_at = COALESCE(source.expires_at, target.expires_at),
                        target.completed_at = CASE WHEN target.passed = 0 AND source.passed = 1 THEN GETDATE() ELSE target.completed_at END,
                        target.updated_at = GETDATE()
                WHEN NOT MATCHED THEN
                    INSERT (emp_id, course_id, course_title, category, status, quiz_score, quiz_total, quiz_percentage, passed, certificate_id, cycle_key, rule_id, expires_at, completed_at, created_at, updated_at)
                    VALUES (source.emp_id, source.course_id, source.course_title, source.category, source.status, source.quiz_score, source.quiz_total, source.quiz_percentage, source.passed, source.certificate_id, source.cycle_key, source.rule_id, source.expires_at, CASE WHEN source.passed = 1 THEN GETDATE() ELSE NULL END, GETDATE(), GETDATE());
            ")->execute([
                $empId, $courseId, $courseTitle, $category, $status, $quizScore, $quizTotal,
                $quizPct, $passed, $certId, $cycleKey, $ruleId, $expiresAt
            ]);

            $skillUpdated = false;
            $skillCode = $COURSE_SKILL_MAP[$courseId] ?? ('SKILL_' . substr(strtoupper(preg_replace('/[^A-Za-z0-9]/', '_', $courseId)), 0, 38));
            if ($passed && $skillCode !== '') {
                $stmtSkill = $pdo->prepare('SELECT TOP 1 skill_id FROM dbo.SKILL_DEFINITIONS WHERE skill_code = ?');
                $stmtSkill->execute([$skillCode]);
                $skillId = (int)($stmtSkill->fetchColumn() ?: 0);
                if ($skillId <= 0) {
                    $pdo->prepare("INSERT INTO dbo.SKILL_DEFINITIONS (skill_code, skill_name, category, line, is_active, display_order, created_at) VALUES (?, ?, ?, 'ALL', 1, 90, GETDATE())")
                        ->execute([$skillCode, mb_substr($courseTitle, 0, 120, 'UTF-8'), mb_substr($category, 0, 60, 'UTF-8')]);
                    $skillId = (int)$pdo->lastInsertId();
                }
                if ($skillId > 0) {
                    $note = "รับรองสมรรถนะผ่าน MES Learning Hub: เลขที่ {$certId} (รอบ {$cycleKey}, คะแนน {$quizPct}%)";
                    $pdo->prepare("
                        MERGE dbo.EMP_SKILLS AS target
                        USING (VALUES (?, ?, 3, ?, CAST(GETDATE() AS DATE), 'MES_LEARNING_HUB'))
                        AS source (emp_id, skill_id, level, notes, certified_at, certified_by)
                        ON target.emp_id = source.emp_id AND target.skill_id = source.skill_id
                        WHEN MATCHED THEN
                            UPDATE SET target.level = CASE WHEN target.level < 3 THEN 3 ELSE target.level END,
                                       target.certified_at = GETDATE(),
                                       target.certified_by = source.certified_by,
                                       target.notes = source.notes,
                                       target.updated_at = GETDATE()
                        WHEN NOT MATCHED THEN
                            INSERT (emp_id, skill_id, level, notes, certified_at, certified_by, updated_at)
                            VALUES (source.emp_id, source.skill_id, source.level, source.notes, source.certified_at, source.certified_by, GETDATE());
                    ")->execute([$empId, $skillId, $note]);
                    $skillUpdated = true;
                }
            }

            // Recompute Learning Grade & sync current period row in EMPLOYEE_GRADES
            $ctxAfter = fetchLearningEvalContext($pdo, [$empId]);
            $learnEval = evaluateUniversityLearning(
                $empRow,
                $ctxAfter['rules'],
                $ctxAfter['records_by_emp'][$empId] ?? [],
                (int)($ctxAfter['manual_skills_by_emp'][$empId] ?? 0),
                date('Y-m')
            );
            $newLrnGrade = $learnEval['grade'];
            $currentPeriod = date('Y-m');
            $stmtG = $pdo->prepare('SELECT TOP 1 id, grade_iph, grade_5s, grade_attendance, grade_learning, grade_overall FROM dbo.EMPLOYEE_GRADES WHERE emp_id = ? AND evaluation_period = ?');
            $stmtG->execute([$empId, $currentPeriod]);
            $gRow = $stmtG->fetch(PDO::FETCH_ASSOC);

            $overallGrade = $newLrnGrade;
            if ($gRow) {
                $calc = calculateWeightedOverallGrade(
                    $gRow['grade_iph'],
                    $gRow['grade_5s'],
                    $gRow['grade_attendance'],
                    $newLrnGrade,
                    (int)$empRow['weight_iph'],
                    (int)$empRow['weight_5s'],
                    (int)$empRow['weight_attendance'],
                    (int)$empRow['weight_learning']
                );
                $overallGrade = $calc['grade'] !== '-' ? $calc['grade'] : $gRow['grade_overall'];
                $pdo->prepare('UPDATE dbo.EMPLOYEE_GRADES SET grade_learning = ?, grade_overall = ?, grade = ?, updated_at = GETDATE() WHERE id = ?')
                    ->execute([$newLrnGrade, $overallGrade, $overallGrade, $gRow['id']]);
            }

            writeLog($pdo, 'UPDATE', 'LEARNING_PROGRESS', "{$empId}@{$courseId}:{$cycleKey}", null, [
                'passed' => $passed, 'quiz_percentage' => $quizPct, 'cycle_key' => $cycleKey,
                'learning_grade' => $newLrnGrade, 'total_credits' => $learnEval['total_credits'],
            ], "Learning Hub record saved for {$empId} ({$courseId} / {$cycleKey})");
            $pdo->commit();

            lrJsonExit(true, [
                'emp_id' => $empId,
                'course_id' => $courseId,
                'cycle_key' => $cycleKey,
                'expires_at' => $expiresAt,
                'certificate_id' => $certId,
                'passed' => (bool)$passed,
                'skill_updated' => $skillUpdated,
                'new_skill_count' => $learnEval['total_credits'],
                'passed_courses' => $learnEval['passed_courses_total'],
                'learning_grade' => $newLrnGrade,
                'grade_overall' => $overallGrade,
                'learning_eval' => $learnEval,
                'exp_bonus' => $passed ? 50 : 5,
            ], $passed ? "บันทึกผลสอบผ่าน ({$cycleKey}) และออกใบรับรอง {$certId} สำเร็จ" : 'บันทึกความคืบหน้าสำเร็จ');

        case 'get_audit_matrix':
            $totalEmp = (int)$pdo->query('SELECT COUNT(*) FROM dbo.MANPOWER_EMPLOYEES WHERE is_active = 1')->fetchColumn();
            $certStats = $pdo->query("
                SELECT COUNT(DISTINCT emp_id) AS certified_employees,
                       COUNT(*) AS total_certifications,
                       AVG(CAST(quiz_percentage AS FLOAT)) AS avg_pass_rate
                FROM dbo.LEARNING_RECORDS WITH (NOLOCK)
                WHERE passed = 1
            ")->fetch(PDO::FETCH_ASSOC);

            $deptStats = $pdo->query("
                SELECT E.line,
                       COUNT(DISTINCT E.emp_id) AS total_in_line,
                       COUNT(DISTINCT LR.emp_id) AS certified_in_line,
                       COUNT(LR.id) AS total_certs_in_line
                FROM dbo.MANPOWER_EMPLOYEES E WITH (NOLOCK)
                LEFT JOIN dbo.LEARNING_RECORDS LR WITH (NOLOCK) ON LR.emp_id = E.emp_id COLLATE Thai_CI_AS AND LR.passed = 1
                WHERE E.is_active = 1 AND E.line IS NOT NULL
                GROUP BY E.line
                ORDER BY certified_in_line DESC, total_in_line DESC
            ")->fetchAll(PDO::FETCH_ASSOC);

            $topSkills = $pdo->query("
                SELECT TOP 5 SD.skill_name, SD.category, COUNT(ES.emp_id) AS certified_count
                FROM dbo.EMP_SKILLS ES WITH (NOLOCK)
                INNER JOIN dbo.SKILL_DEFINITIONS SD WITH (NOLOCK) ON ES.skill_id = SD.skill_id
                WHERE ES.level >= 2
                GROUP BY SD.skill_name, SD.category
                ORDER BY certified_count DESC
            ")->fetchAll(PDO::FETCH_ASSOC);

            $recentCerts = $pdo->query("
                SELECT TOP 10 LR.certificate_id, LR.course_title, LR.quiz_percentage, LR.cycle_key, LR.completed_at,
                       E.name_th, E.emp_id, E.line
                FROM dbo.LEARNING_RECORDS LR WITH (NOLOCK)
                INNER JOIN dbo.MANPOWER_EMPLOYEES E WITH (NOLOCK) ON LR.emp_id = E.emp_id COLLATE Thai_CI_AS
                WHERE LR.passed = 1
                ORDER BY LR.completed_at DESC
            ")->fetchAll(PDO::FETCH_ASSOC);

            lrJsonExit(true, [
                'total_employees' => $totalEmp,
                'certified_employees' => (int)($certStats['certified_employees'] ?? 0),
                'total_certifications' => (int)($certStats['total_certifications'] ?? 0),
                'avg_score' => round((float)($certStats['avg_pass_rate'] ?? 0), 1),
                'department_breakdown' => $deptStats,
                'top_skills' => $topSkills,
                'recent_certifications' => $recentCerts,
            ]);

        default:
            throw new InvalidArgumentException('ไม่พบคำสั่งที่ระบุ');
    }
} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    writeErrorLog($pdo, 'LEARNING_API', $e->getMessage(), $input);
    $msg = translateSqlErrorMessage($e->getMessage());
    lrJsonExit(false, null, $msg, $e instanceof InvalidArgumentException ? 400 : 500);
}
