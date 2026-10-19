<?php
// page/manpower/api/api_learning.php
// MES Learning Hub & Manpower Employee Grading Integration API

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Security & Content-Type Headers
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');

// Allow credentials and CORS for MES environment
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (!empty($origin)) {
    header("Access-Control-Allow-Origin: $origin");
    header("Access-Control-Allow-Credentials: true");
    header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
}

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

define('ALLOW_GUEST_ACCESS', true);
require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../components/init.php';

$action = $_GET['action'] ?? $_POST['action'] ?? '';

// Course ID to Skill Code Mapping
$COURSE_SKILL_MAP = [
    'c-ppap'            => 'SKILL_PPAP',
    'c-iso-9001'        => 'SKILL_ISO9001',
    'c-iso-14001'       => 'SKILL_ISO14001',
    'c-iso-45001'       => 'SKILL_ISO45001',
    'c-iso-17025'       => 'SKILL_ISO17025',
    'c-customer-audits' => 'SKILL_CSR_AUDIT',
    'c-live-qa'         => 'SKILL_8D_PROBLEM',
    'c3'                => 'SKILL_LEAN_5S',
    'c4'                => 'SKILL_LEADERSHIP',
    'c1'                => 'SKILL_MES_FRONTEND',
    'c2'                => 'SKILL_MES_BACKEND',
    'post-101'          => 'SKILL_STAMPING',
    'post-102'          => 'SKILL_STORE_MES',
    'post-103'          => 'SKILL_PREOP_MAINT'
];

try {
    // ─────────────────────────────────────────────────────────────────────────
    // Helper: Format Role & Position Display Title
    // ─────────────────────────────────────────────────────────────────────────
    $formatUserRoleTitle = function (?string $sysRole, ?string $empPosition): string {
        $roleKey = strtolower(trim($sysRole ?? ''));
        $pos = trim($empPosition ?? '');
        $roleMap = [
            'creator'    => 'ผู้พัฒนาระบบหลัก (System Creator)',
            'admin'      => 'ผู้ดูแลระบบ (System Admin)',
            'supervisor' => 'หัวหน้างาน (Supervisor)',
            'qc'         => 'เจ้าหน้าที่ควบคุมคุณภาพ (QC/QA)',
            'operator'   => 'เจ้าหน้าที่ปฏิบัติการ (Operator)'
        ];

        if (!empty($pos) && $pos !== 'พนักงาน' && strtolower($pos) !== $roleKey) {
            if (in_array($roleKey, ['admin', 'creator'], true)) {
                return $pos . ' (' . strtoupper($roleKey) . ')';
            }
            return $pos;
        }
        return $roleMap[$roleKey] ?? ($pos ?: 'เจ้าหน้าที่ระบบ MES');
    };

    // ─────────────────────────────────────────────────────────────────────────
    // ACTION: get_current_user
    // ดึงข้อมูลผู้ใช้ที่กำลังล็อกอินจริงในระบบหลัก ($_SESSION['user']) เท่านั้น
    // หากออกจากระบบหลักแล้ว (empty($_SESSION['user'])) จะคืนค่า authenticated = false ทันที
    // ─────────────────────────────────────────────────────────────────────────
    if ($action === 'get_current_user') {
        $sessionUser = $_SESSION['user'] ?? null;

        if (empty($sessionUser)) {
            echo json_encode([
                'success'       => true,
                'authenticated' => false,
                'data'          => [
                    'user'    => null,
                    'grading' => null
                ],
                'message'       => 'Guest mode (No active MES session)'
            ], JSON_UNESCAPED_UNICODE);
            exit;
        }

        $dbUser = null;
        $empData = null;

        // ดึงข้อมูลสดจาก dbo.USERS ตาม $_SESSION['user']
        $sessionUserId = (int)($sessionUser['id'] ?? 0);
        $sessionUsername = trim($sessionUser['username'] ?? '');

        $stmtUsr = $pdo->prepare("
            SELECT TOP 1 id, username, fullname, role, line, emp_id, team_group, profile_picture
            FROM dbo.USERS WITH (NOLOCK)
            WHERE (id = ? AND ? > 0) OR (username = ? AND ? <> '')
            ORDER BY is_active DESC, id ASC
        ");
        $stmtUsr->execute([$sessionUserId, $sessionUserId, $sessionUsername, $sessionUsername]);
        $dbUser = $stmtUsr->fetch(PDO::FETCH_ASSOC) ?: $sessionUser;

        // 1. ค้นหาใน MANPOWER_EMPLOYEES ด้วย emp_id หรือ username
        $candidateEmpId = !empty($dbUser['emp_id']) ? trim($dbUser['emp_id']) : trim($dbUser['username'] ?? '');
        if (!empty($candidateEmpId)) {
            $stmtEmp = $pdo->prepare("
                SELECT TOP 1 E.emp_id, E.name_th, E.position, E.line, E.team_group, E.department_api, E.is_active
                FROM dbo.MANPOWER_EMPLOYEES E WITH (NOLOCK)
                WHERE E.emp_id = ?
                ORDER BY E.is_active DESC
            ");
            $stmtEmp->execute([$candidateEmpId]);
            $empData = $stmtEmp->fetch(PDO::FETCH_ASSOC);
        }

        // 2. ถ้าไม่พบด้วย emp_id (เช่นบัญชี Admin verymaron01 ที่ emp_id เป็น NULL) ให้เชื่อมโยงด้วยชื่อ-นามสกุลจริง (fullname = name_th)
        $fullNameToMatch = trim($dbUser['fullname'] ?? $sessionUser['fullname'] ?? '');
        if (!$empData && !empty($fullNameToMatch)) {
            $stmtByName = $pdo->prepare("
                SELECT TOP 1 E.emp_id, E.name_th, E.position, E.line, E.team_group, E.department_api, E.is_active
                FROM dbo.MANPOWER_EMPLOYEES E WITH (NOLOCK)
                WHERE E.name_th = ?
                ORDER BY E.is_active DESC, E.emp_id DESC
            ");
            $stmtByName->execute([$fullNameToMatch]);
            $empData = $stmtByName->fetch(PDO::FETCH_ASSOC);
        }

        // ประกอบข้อมูลผู้ใช้งานจริงจาก Session
        $empId = $empData['emp_id']
            ?? $dbUser['emp_id']
            ?? $sessionUser['emp_id']
            ?? $dbUser['username']
            ?? $sessionUser['username']
            ?? 'MES-USER';

        $username = $dbUser['username'] ?? $sessionUser['username'] ?? $empId;

        $name = !empty($dbUser['fullname'])
            ? $dbUser['fullname']
            : (!empty($empData['name_th'])
                ? $empData['name_th']
                : (!empty($sessionUser['fullname']) ? $sessionUser['fullname'] : $username));

        $sysRole = $dbUser['role'] ?? $sessionUser['role'] ?? 'operator';
        $empPos = $empData['position'] ?? $sessionUser['position'] ?? '';
        $position = $formatUserRoleTitle($sysRole, $empPos);

        $line = $empData['line'] ?? $dbUser['line'] ?? $sessionUser['line'] ?? 'MT/PE';
        $teamGroup = $empData['team_group'] ?? $dbUser['team_group'] ?? $sessionUser['team_group'] ?? 'TEAM 1';
        $department = $empData['department_api'] ?? $line;
        $profilePic = $dbUser['profile_picture'] ?? $sessionUser['profile_picture'] ?? null;
        $isAdmin = in_array(strtolower($sysRole), ['creator', 'admin', 'supervisor'], true);

        // ดึงผลการประเมินเกรด 4 มิติล่าสุดจาก EMPLOYEE_GRADES
        $stmtGrade = $pdo->prepare("
            SELECT TOP 1 evaluation_period, grade, grade_iph, grade_5s, grade_attendance, grade_learning, grade_overall, notes
            FROM dbo.EMPLOYEE_GRADES WITH (NOLOCK)
            WHERE emp_id = ?
            ORDER BY evaluation_period DESC
        ");
        $stmtGrade->execute([$empId]);
        $gradeRow = $stmtGrade->fetch(PDO::FETCH_ASSOC);

        // ดึงจำนวนทักษะที่ผ่านเกณฑ์ (level >= 2) จาก EMP_SKILLS
        $stmtSkills = $pdo->prepare("
            SELECT COUNT(*) AS skill_count
            FROM dbo.EMP_SKILLS WITH (NOLOCK)
            WHERE emp_id = ? AND level >= 2
        ");
        $stmtSkills->execute([$empId]);
        $skillCount = (int)$stmtSkills->fetchColumn();

        // คำนวณ Learning Grade ตามเกณฑ์ของฝ่ายบริหาร (A >= 5, B >= 3, C >= 1, D = 0)
        $systemLearningGrade = 'D';
        if ($skillCount >= 5) {
            $systemLearningGrade = 'A';
        } elseif ($skillCount >= 3) {
            $systemLearningGrade = 'B';
        } elseif ($skillCount >= 1) {
            $systemLearningGrade = 'C';
        }

        // ดึงสถิติการอบรมจาก LEARNING_RECORDS
        $stmtLearn = $pdo->prepare("
            SELECT COUNT(*) AS total_enrolled,
                   SUM(CASE WHEN passed = 1 THEN 1 ELSE 0 END) AS passed_count,
                   AVG(CASE WHEN passed = 1 THEN quiz_percentage ELSE NULL END) AS avg_score
            FROM dbo.LEARNING_RECORDS WITH (NOLOCK)
            WHERE emp_id = ?
        ");
        $stmtLearn->execute([$empId]);
        $learnStat = $stmtLearn->fetch(PDO::FETCH_ASSOC);

        // คำนวณ EXP สะสม
        $passedCoursesCount = (int)($learnStat['passed_count'] ?? 0);
        $baseExp = $isAdmin ? 450 : 150;
        $computedExp = $baseExp + ($passedCoursesCount * 50) + ($skillCount * 30);

        echo json_encode([
            'success'       => true,
            'authenticated' => true,
            'data'          => [
                'user' => [
                    'id'               => $empId,
                    'emp_id'           => $empId,
                    'username'         => $username,
                    'name'             => $name,
                    'role'             => $position,
                    'sys_role'         => $sysRole,
                    'line'             => $line,
                    'team_group'       => $teamGroup,
                    'department'       => $department,
                    'profile_picture'  => $profilePic,
                    'is_logged_in_real'=> true,
                    'is_admin'         => $isAdmin,
                    'exp'              => $computedExp,
                ],
                'grading' => [
                    'evaluation_period'     => $gradeRow['evaluation_period'] ?? date('Y-m'),
                    'grade_overall'         => $gradeRow['grade_overall'] ?? $gradeRow['grade'] ?? 'B',
                    'grade_iph'             => $gradeRow['grade_iph'] ?? 'B',
                    'grade_5s'              => $gradeRow['grade_5s'] ?? 'A',
                    'grade_attendance'      => $gradeRow['grade_attendance'] ?? 'A',
                    'grade_learning'        => !empty($gradeRow['grade_learning']) ? $gradeRow['grade_learning'] : $systemLearningGrade,
                    'system_grade_learning' => $systemLearningGrade,
                    'skill_count'           => $skillCount,
                    'passed_courses'        => $passedCoursesCount,
                    'avg_score'             => round((float)($learnStat['avg_score'] ?? 0), 1),
                ]
            ]
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // AUTHENTICATION GATE FOR INTERNAL COMPANY & PDPA DATA
    // ข้อมูลรายชื่อพนักงาน 405 คน, พาสปอร์ตเกรด 4 มิติ, การบันทึกผลสอบ และ Audit Matrix
    // สงวนสิทธิ์เฉพาะผู้ที่ล็อกอินในระบบหลัก ($_SESSION['user']) เท่านั้น
    // ─────────────────────────────────────────────────────────────────────────
    if (empty($_SESSION['user'])) {
        echo json_encode([
            'success'       => false,
            'authenticated' => false,
            'data'          => null,
            'message'       => 'กรุณาเข้าสู่ระบบ MES ก่อนเข้าถึงข้อมูลพนักงานและระบบประเมินสมรรถนะภายในโรงงาน'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ACTION: get_employees
    // ดึงรายชื่อพนักงานทั้งหมดจาก MANPOWER_EMPLOYEES พร้อมเกรดและจำนวนคอร์สที่จบ
    // ─────────────────────────────────────────────────────────────────────────
    if ($action === 'get_employees') {
        $search = trim($_GET['q'] ?? '');
        $lineFilter = trim($_GET['line'] ?? 'ALL');
        $limit = min(200, max(1, (int)($_GET['limit'] ?? 100)));
        $offset = max(0, (int)($_GET['offset'] ?? 0));

        $where = ["E.is_active = 1"];
        $params = [];

        if (!empty($search)) {
            $where[] = "(E.emp_id LIKE :search OR E.name_th LIKE :search OR E.position LIKE :search)";
            $params[':search'] = "%$search%";
        }

        if ($lineFilter !== 'ALL' && !empty($lineFilter)) {
            $where[] = "E.line = :line";
            $params[':line'] = $lineFilter;
        }

        $whereSql = implode(' AND ', $where);

        $sql = "
            SELECT E.emp_id, E.name_th, E.position, E.line, E.team_group,
                   ISNULL(LR.passed_courses, 0) AS passed_courses,
                   ISNULL(SKL.skill_count, 0) AS skill_count,
                   ISNULL(G.grade_learning, 'D') AS grade_learning,
                   ISNULL(G.grade_overall, 'B') AS grade_overall
            FROM dbo.MANPOWER_EMPLOYEES E WITH (NOLOCK)
            LEFT JOIN (
                SELECT emp_id, COUNT(*) AS passed_courses
                FROM dbo.LEARNING_RECORDS WITH (NOLOCK)
                WHERE passed = 1
                GROUP BY emp_id
            ) LR ON LR.emp_id = E.emp_id COLLATE Thai_CI_AS
            LEFT JOIN (
                SELECT emp_id, COUNT(*) AS skill_count
                FROM dbo.EMP_SKILLS WITH (NOLOCK)
                WHERE level >= 2
                GROUP BY emp_id
            ) SKL ON SKL.emp_id = E.emp_id COLLATE Thai_CI_AS
            LEFT JOIN (
                SELECT g1.emp_id, g1.grade_learning, g1.grade_overall
                FROM dbo.EMPLOYEE_GRADES g1 WITH (NOLOCK)
                INNER JOIN (
                    SELECT emp_id, MAX(evaluation_period) AS max_period
                    FROM dbo.EMPLOYEE_GRADES WITH (NOLOCK)
                    GROUP BY emp_id
                ) g2 ON g1.emp_id = g2.emp_id AND g1.evaluation_period = g2.max_period
            ) G ON G.emp_id = E.emp_id COLLATE Thai_CI_AS
            WHERE $whereSql
            ORDER BY E.line ASC, E.position ASC, E.emp_id ASC
            OFFSET $offset ROWS FETCH NEXT $limit ROWS ONLY
        ";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $employees = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // ดึงรายการ Line ทั้งหมดที่มี
        $lines = $pdo->query("SELECT DISTINCT line FROM dbo.MANPOWER_EMPLOYEES WHERE is_active = 1 AND line IS NOT NULL ORDER BY line")->fetchAll(PDO::FETCH_COLUMN);

        echo json_encode([
            'success' => true,
            'data' => [
                'employees' => $employees,
                'lines'     => $lines,
                'count'     => count($employees)
            ]
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ACTION: get_employee_passport
    // ดึงสมุดพาสปอร์ตสมรรถนะ (Competency Passport) ฉบับสมบูรณ์
    // ─────────────────────────────────────────────────────────────────────────
    if ($action === 'get_employee_passport') {
        $empId = trim($_GET['emp_id'] ?? '');
        if (empty($empId)) {
            throw new Exception("emp_id is required.");
        }

        // 1. ค้นหาใน MANPOWER_EMPLOYEES
        $stmtEmp = $pdo->prepare("
            SELECT TOP 1 E.emp_id, E.name_th, E.position, E.line, E.team_group, E.department_api
            FROM dbo.MANPOWER_EMPLOYEES E WITH (NOLOCK)
            WHERE E.emp_id = ? OR E.name_th = ?
            ORDER BY E.is_active DESC, E.emp_id DESC
        ");
        $stmtEmp->execute([$empId, $empId]);
        $emp = $stmtEmp->fetch(PDO::FETCH_ASSOC);

        // 2. หากไม่พบใน MANPOWER_EMPLOYEES ให้ค้นหาจาก dbo.USERS (กรณีเป็น Admin/User ในระบบหลัก)
        if (!$emp) {
            $stmtUsr = $pdo->prepare("
                SELECT TOP 1 id, username, fullname, role, line, emp_id, team_group
                FROM dbo.USERS WITH (NOLOCK)
                WHERE emp_id = ? OR username = ?
                ORDER BY is_active DESC, id ASC
            ");
            $stmtUsr->execute([$empId, $empId]);
            $uRow = $stmtUsr->fetch(PDO::FETCH_ASSOC);

            if ($uRow && !empty($uRow['fullname'])) {
                $stmtByName = $pdo->prepare("
                    SELECT TOP 1 E.emp_id, E.name_th, E.position, E.line, E.team_group, E.department_api
                    FROM dbo.MANPOWER_EMPLOYEES E WITH (NOLOCK)
                    WHERE E.name_th = ?
                    ORDER BY E.is_active DESC, E.emp_id DESC
                ");
                $stmtByName->execute([trim($uRow['fullname'])]);
                $emp = $stmtByName->fetch(PDO::FETCH_ASSOC);
            }

            if (!$emp && $uRow) {
                $emp = [
                    'emp_id'         => $uRow['emp_id'] ?: $uRow['username'],
                    'name_th'        => $uRow['fullname'] ?: $uRow['username'],
                    'position'       => $formatUserRoleTitle($uRow['role'] ?? 'operator', ''),
                    'line'           => $uRow['line'] ?: 'MANAGEMENT',
                    'team_group'     => $uRow['team_group'] ?: 'TEAM 1',
                    'department_api' => $uRow['line'] ?: 'MANAGEMENT'
                ];
            }
        }

        if (!$emp) {
            throw new Exception("Employee not found in roster.");
        }

        $resolvedEmpId = $emp['emp_id'];

        // คอร์สที่บันทึกไว้ใน LEARNING_RECORDS
        $stmtRecords = $pdo->prepare("
            SELECT course_id, course_title, category, status, quiz_score, quiz_total, 
                   quiz_percentage, passed, certificate_id, completed_at, updated_at
            FROM dbo.LEARNING_RECORDS WITH (NOLOCK)
            WHERE emp_id = ?
            ORDER BY completed_at DESC, updated_at DESC
        ");
        $stmtRecords->execute([$resolvedEmpId]);
        $learningRecords = $stmtRecords->fetchAll(PDO::FETCH_ASSOC);

        // ทักษะที่ได้รับการรับรองจาก EMP_SKILLS + SKILL_DEFINITIONS
        $stmtSkills = $pdo->prepare("
            SELECT SD.skill_code, SD.skill_name, SD.category, ES.level, ES.certified_at, ES.certified_by, ES.notes
            FROM dbo.EMP_SKILLS ES WITH (NOLOCK)
            INNER JOIN dbo.SKILL_DEFINITIONS SD WITH (NOLOCK) ON ES.skill_id = SD.skill_id
            WHERE ES.emp_id = ?
            ORDER BY ES.level DESC, SD.display_order ASC
        ");
        $stmtSkills->execute([$resolvedEmpId]);
        $skills = $stmtSkills->fetchAll(PDO::FETCH_ASSOC);

        $skillCount = 0;
        foreach ($skills as $sk) {
            if ((int)($sk['level'] ?? 0) >= 2) {
                $skillCount++;
            }
        }

        $systemLearningGrade = 'D';
        if ($skillCount >= 5) {
            $systemLearningGrade = 'A';
        } elseif ($skillCount >= 3) {
            $systemLearningGrade = 'B';
        } elseif ($skillCount >= 1) {
            $systemLearningGrade = 'C';
        }

        $passedCoursesCount = 0;
        foreach ($learningRecords as $lr) {
            if (!empty($lr['passed'])) {
                $passedCoursesCount++;
            }
        }

        // ผลการประเมินเกรดล่าสุด
        $stmtGrade = $pdo->prepare("
            SELECT TOP 1 evaluation_period, grade, grade_iph, grade_5s, grade_attendance, grade_learning, grade_overall, notes
            FROM dbo.EMPLOYEE_GRADES WITH (NOLOCK)
            WHERE emp_id = ?
            ORDER BY evaluation_period DESC
        ");
        $stmtGrade->execute([$resolvedEmpId]);
        $gradeRow = $stmtGrade->fetch(PDO::FETCH_ASSOC);

        $gradingData = [
            'evaluation_period'     => $gradeRow['evaluation_period'] ?? date('Y-m'),
            'grade_overall'         => $gradeRow['grade_overall'] ?? $gradeRow['grade'] ?? 'B',
            'grade_iph'             => $gradeRow['grade_iph'] ?? 'B',
            'grade_5s'              => $gradeRow['grade_5s'] ?? 'A',
            'grade_attendance'      => $gradeRow['grade_attendance'] ?? 'A',
            'grade_learning'        => !empty($gradeRow['grade_learning']) ? $gradeRow['grade_learning'] : $systemLearningGrade,
            'system_grade_learning' => $systemLearningGrade,
            'skill_count'           => $skillCount,
            'passed_courses'        => $passedCoursesCount,
            'notes'                 => $gradeRow['notes'] ?? null
        ];

        echo json_encode([
            'success' => true,
            'data' => [
                'employee'         => $emp,
                'learning_records' => $learningRecords,
                'skills'           => $skills,
                'grading'          => $gradingData
            ]
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ACTION: save_course_progress
    // บันทึกความคืบหน้า / การสอบผ่าน Post-Test และเชื่อมโยงเข้า EMP_SKILLS ทันที
    // ─────────────────────────────────────────────────────────────────────────
    if ($action === 'save_course_progress') {
        $input = json_decode(file_get_contents('php://input'), true) ?: $_POST;

        $empId          = trim($input['emp_id']          ?? '');
        $courseId       = trim($input['course_id']       ?? '');
        $courseTitle    = trim($input['course_title']    ?? '');
        $category       = trim($input['category']        ?? '');
        $status         = trim($input['status']          ?? 'in_progress');
        $quizScore      = (int)($input['quiz_score']      ?? 0);
        $quizTotal      = (int)($input['quiz_total']      ?? 0);
        $quizPercentage = (int)($input['quiz_percentage'] ?? 0);
        $passed         = !empty($input['passed']) ? 1 : 0;
        $certificateId  = trim($input['certificate_id']  ?? '') ?: null;

        if (empty($empId) || empty($courseId)) {
            throw new Exception("emp_id and course_id are required.");
        }

        // ถ้าสอบผ่านและยังไม่มีรหัสใบรับรอง ให้สร้างรหัสมาตรฐานอัตโนมัติ
        if ($passed && empty($certificateId)) {
            $certificateId = 'SNC-CERT-2026-' . rand(1000, 9999);
        }

        $pdo->beginTransaction();

        // 1. บันทึกลง dbo.LEARNING_RECORDS ด้วย MERGE
        $mergeSql = "
            MERGE dbo.LEARNING_RECORDS AS target
            USING (VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?))
            AS source (emp_id, course_id, course_title, category, status, quiz_score, quiz_total, quiz_percentage, passed, certificate_id)
            ON target.emp_id = source.emp_id AND target.course_id = source.course_id
            WHEN MATCHED THEN
                UPDATE SET
                    target.course_title    = source.course_title,
                    target.category        = source.category,
                    target.status          = source.status,
                    target.quiz_score      = source.quiz_score,
                    target.quiz_total      = source.quiz_total,
                    target.quiz_percentage = source.quiz_percentage,
                    target.passed          = source.passed,
                    target.certificate_id  = COALESCE(source.certificate_id, target.certificate_id),
                    target.completed_at    = CASE WHEN source.passed = 1 AND target.completed_at IS NULL THEN GETDATE() ELSE target.completed_at END,
                    target.updated_at      = GETDATE()
            WHEN NOT MATCHED THEN
                INSERT (emp_id, course_id, course_title, category, status, quiz_score, quiz_total, quiz_percentage, passed, certificate_id, completed_at, created_at, updated_at)
                VALUES (source.emp_id, source.course_id, source.course_title, source.category, source.status, source.quiz_score, source.quiz_total, source.quiz_percentage, source.passed, source.certificate_id, CASE WHEN source.passed = 1 THEN GETDATE() ELSE NULL END, GETDATE(), GETDATE());
        ";
        $stmtMerge = $pdo->prepare($mergeSql);
        $stmtMerge->execute([
            $empId, $courseId, $courseTitle, $category, $status,
            $quizScore, $quizTotal, $quizPercentage, $passed, $certificateId
        ]);

        // 2. ถ้าสอบผ่านเกณฑ์ (passed = 1) ให้อัปเดตเข้า dbo.EMP_SKILLS เป็น Level 3 Certified
        $skillUpdated = false;
        $skillCode = $COURSE_SKILL_MAP[$courseId] ?? null;

        if ($passed && !empty($skillCode)) {
            // ค้นหา skill_id จาก SKILL_DEFINITIONS
            $stmtFindSkill = $pdo->prepare("SELECT skill_id, skill_name FROM dbo.SKILL_DEFINITIONS WHERE skill_code = ? AND is_active = 1");
            $stmtFindSkill->execute([$skillCode]);
            $skill = $stmtFindSkill->fetch(PDO::FETCH_ASSOC);

            if ($skill) {
                $skillId = (int)$skill['skill_id'];
                $skillNotes = "รับรองสมรรถนะผ่าน MES Learning Hub: เลขที่ $certificateId (คะแนน $quizPercentage%)";

                $mergeSkillSql = "
                    MERGE dbo.EMP_SKILLS AS target
                    USING (VALUES (?, ?, 3, ?, CAST(GETDATE() AS DATE), 'MES_LEARNING_HUB'))
                    AS source (emp_id, skill_id, level, notes, certified_at, certified_by)
                    ON target.emp_id = source.emp_id AND target.skill_id = source.skill_id
                    WHEN MATCHED THEN
                        UPDATE SET
                            target.level        = CASE WHEN target.level < 3 THEN 3 ELSE target.level END,
                            target.certified_at = COALESCE(target.certified_at, source.certified_at),
                            target.certified_by = COALESCE(target.certified_by, source.certified_by),
                            target.notes        = source.notes,
                            target.updated_at   = GETDATE()
                    WHEN NOT MATCHED THEN
                        INSERT (emp_id, skill_id, level, notes, certified_at, certified_by, updated_at)
                        VALUES (source.emp_id, source.skill_id, source.level, source.notes, source.certified_at, source.certified_by, GETDATE());
                ";
                $stmtSkill = $pdo->prepare($mergeSkillSql);
                $stmtSkill->execute([$empId, $skillId, $skillNotes]);
                $skillUpdated = true;
            }
        }

        // 3. คำนวณ Learning Grade ใหม่แบบเรียลไทม์
        $stmtNewSkills = $pdo->prepare("SELECT COUNT(*) FROM dbo.EMP_SKILLS WHERE emp_id = ? AND level >= 2");
        $stmtNewSkills->execute([$empId]);
        $newSkillCount = (int)$stmtNewSkills->fetchColumn();

        $newLearningGrade = 'D';
        if ($newSkillCount >= 5) {
            $newLearningGrade = 'A';
        } elseif ($newSkillCount >= 3) {
            $newLearningGrade = 'B';
        } elseif ($newSkillCount >= 1) {
            $newLearningGrade = 'C';
        }

        $pdo->commit();

        echo json_encode([
            'success' => true,
            'message' => $passed ? "บันทึกผลการอบรมและออกใบรับรอง $certificateId สำเร็จ" : "บันทึกความคืบหน้าสำเร็จ",
            'data' => [
                'emp_id'           => $empId,
                'course_id'        => $courseId,
                'certificate_id'   => $certificateId,
                'passed'           => $passed,
                'skill_updated'    => $skillUpdated,
                'skill_code'       => $skillCode,
                'new_skill_count'  => $newSkillCount,
                'learning_grade'   => $newLearningGrade,
                'exp_bonus'        => $passed ? 50 : 5
            ]
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ACTION: get_audit_matrix
    // ดึงข้อมูลสำหรับหน้า Audit Dashboard จากฐานข้อมูลจริง
    // ─────────────────────────────────────────────────────────────────────────
    if ($action === 'get_audit_matrix') {
        // 1. สถิติรวม
        $totalEmp = (int)$pdo->query("SELECT COUNT(*) FROM dbo.MANPOWER_EMPLOYEES WHERE is_active = 1")->fetchColumn();
        
        $certStats = $pdo->query("
            SELECT COUNT(DISTINCT emp_id) AS certified_employees,
                   COUNT(*) AS total_certifications,
                   AVG(CAST(quiz_percentage AS FLOAT)) AS avg_pass_rate
            FROM dbo.LEARNING_RECORDS
            WHERE passed = 1
        ")->fetch(PDO::FETCH_ASSOC);

        // 2. แยกตามแผนก / ไลน์การผลิต
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

        // 3. ทักษะที่มีการรับรองสูงสุด 5 อันดับ
        $topSkills = $pdo->query("
            SELECT TOP 5 SD.skill_name, SD.category, COUNT(ES.emp_id) AS certified_count
            FROM dbo.EMP_SKILLS ES WITH (NOLOCK)
            INNER JOIN dbo.SKILL_DEFINITIONS SD WITH (NOLOCK) ON ES.skill_id = SD.skill_id
            WHERE ES.level >= 2
            GROUP BY SD.skill_name, SD.category
            ORDER BY certified_count DESC
        ")->fetchAll(PDO::FETCH_ASSOC);

        // 4. ใบรับรองล่าสุด 10 ใบ
        $recentCerts = $pdo->query("
            SELECT TOP 10 LR.certificate_id, LR.course_title, LR.quiz_percentage, LR.completed_at,
                          E.name_th, E.emp_id, E.line
            FROM dbo.LEARNING_RECORDS LR WITH (NOLOCK)
            INNER JOIN dbo.MANPOWER_EMPLOYEES E WITH (NOLOCK) ON LR.emp_id = E.emp_id COLLATE Thai_CI_AS
            WHERE LR.passed = 1
            ORDER BY LR.completed_at DESC
        ")->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            'success' => true,
            'data' => [
                'total_employees'     => $totalEmp,
                'certified_employees' => (int)($certStats['certified_employees'] ?? 0),
                'total_certifications'=> (int)($certStats['total_certifications'] ?? 0),
                'avg_score'           => round((float)($certStats['avg_pass_rate'] ?? 0), 1),
                'department_breakdown'=> $deptStats,
                'top_skills'          => $topSkills,
                'recent_certificates' => $recentCerts
            ]
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    throw new Exception("Invalid or unsupported action: '$action'");

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'data'    => null,
        'message' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
    exit;
}
