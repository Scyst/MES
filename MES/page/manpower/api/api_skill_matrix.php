<?php
// page/manpower/api/api_skill_matrix.php
require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../components/init.php';

header('Content-Type: application/json');

if (!hasPermission('manage_manpower')) {
    echo json_encode(['success' => false, 'message' => 'Permission denied.']);
    exit;
}

$action    = $_GET['action'] ?? $_POST['action'] ?? '';
$userId    = $_SESSION['user']['id'] ?? null;
$empIdSelf = $_SESSION['user']['emp_id'] ?? null;

try {
    // ── GET: Skill Matrix Data (employees x skills grid) ─────────────────────
    if ($action === 'get_skill_matrix') {
        $line     = $_GET['line']     ?? 'ALL';
        $hcGroup  = $_GET['hcGroup']  ?? 'ALL';
        $category = $_GET['category'] ?? 'ALL';

        $skillSql = "SELECT skill_id, skill_code, skill_name, category, line FROM dbo.SKILL_DEFINITIONS WITH (NOLOCK) WHERE is_active = 1";
        $skillParams = [];
        if ($category !== 'ALL') {
            $skillSql .= " AND category = :category";
            $skillParams[':category'] = $category;
        }
        $skillSql .= " ORDER BY category, display_order, skill_name";
        $stmtSkills = $pdo->prepare($skillSql);
        $stmtSkills->execute($skillParams);
        $skills = $stmtSkills->fetchAll(PDO::FETCH_ASSOC);

        $empSql = "
            SELECT E.emp_id, E.name_th, E.position, E.line, E.team_group
            FROM dbo.MANPOWER_EMPLOYEES E WITH (NOLOCK)
            WHERE E.is_active = 1
        ";
        $empParams = [];
        if ($line !== 'ALL') {
            $empSql .= " AND E.line = :line";
            $empParams[':line'] = $line;
        }
        if ($hcGroup !== 'ALL') {
            $empSql .= " AND E.department_api IN (SELECT department_api FROM dbo.MANPOWER_TEAM_SETTINGS WHERE hc_group = :hcGroup)";
            $empParams[':hcGroup'] = $hcGroup;
        }
        $empSql .= " ORDER BY E.line, E.position, E.name_th";
        $stmtEmp = $pdo->prepare($empSql);
        $stmtEmp->execute($empParams);
        $employees = $stmtEmp->fetchAll(PDO::FETCH_ASSOC);

        $empIds    = array_column($employees, 'emp_id');
        $skillData = [];
        if (!empty($empIds)) {
            $placeholders = implode(',', array_fill(0, count($empIds), '?'));
            $stmtEmpSkills = $pdo->prepare("
                SELECT es.emp_id, es.skill_id, es.level, es.certified_at, es.certified_by, es.notes
                FROM dbo.EMP_SKILLS es WITH (NOLOCK)
                WHERE es.emp_id IN ($placeholders)
            ");
            $stmtEmpSkills->execute($empIds);
            foreach ($stmtEmpSkills->fetchAll(PDO::FETCH_ASSOC) as $row) {
                $skillData[$row['emp_id']][$row['skill_id']] = [
                    'level'        => (int)$row['level'],
                    'certified_at' => $row['certified_at'],
                    'certified_by' => $row['certified_by'],
                    'notes'        => $row['notes'],
                ];
            }
        }

        $stmtCats = $pdo->query("SELECT DISTINCT category FROM dbo.SKILL_DEFINITIONS WHERE is_active = 1 AND category IS NOT NULL ORDER BY category");
        $categories = $stmtCats->fetchAll(PDO::FETCH_COLUMN);

        echo json_encode([
            'success'    => true,
            'skills'     => $skills,
            'employees'  => $employees,
            'skill_data' => $skillData,
            'categories' => $categories,
        ]);
        exit;
    }

    // ── POST: Update a single employee skill ──────────────────────────────────
    if ($action === 'update_emp_skill') {
        $empId   = trim($_POST['emp_id']   ?? '');
        $skillId = (int)($_POST['skill_id'] ?? 0);
        $level   = (int)($_POST['level']   ?? 0);
        $notes   = substr(trim($_POST['notes'] ?? ''), 0, 500);

        if (empty($empId) || $skillId <= 0) throw new Exception("emp_id and skill_id are required.");
        if ($level < 0 || $level > 4) throw new Exception("Level must be 0-4.");

        $stmtCheckEmp   = $pdo->prepare("SELECT 1 FROM dbo.MANPOWER_EMPLOYEES WHERE emp_id = ? AND is_active = 1");
        $stmtCheckSkill = $pdo->prepare("SELECT 1 FROM dbo.SKILL_DEFINITIONS WHERE skill_id = ? AND is_active = 1");
        $stmtCheckEmp->execute([$empId]);
        $stmtCheckSkill->execute([$skillId]);
        if (!$stmtCheckEmp->fetchColumn()) throw new Exception("Employee not found.");
        if (!$stmtCheckSkill->fetchColumn()) throw new Exception("Skill definition not found.");

        $stmtCheck = $pdo->prepare("SELECT id, level FROM dbo.EMP_SKILLS WHERE emp_id = ? AND skill_id = ?");
        $stmtCheck->execute([$empId, $skillId]);
        $existing = $stmtCheck->fetch(PDO::FETCH_ASSOC);

        if ($level === 0) {
            if ($existing) {
                $pdo->prepare("DELETE FROM dbo.EMP_SKILLS WHERE id = ?")->execute([$existing['id']]);
                if (function_exists('writeLog')) writeLog($pdo, 'DELETE', 'EmpSkills', $empId, json_encode(['skill_id' => $skillId]), null, "Skill removed");
            }
        } elseif ($existing) {
            $oldData = ['level' => $existing['level']];
            $certifiedAt = ($level >= 3 && $existing['level'] < 3) ? date('Y-m-d') : null;
            if ($certifiedAt) {
                $stmt = $pdo->prepare("UPDATE dbo.EMP_SKILLS SET level = ?, notes = ?, certified_at = ?, certified_by = ?, updated_at = GETDATE(), updated_by = ? WHERE id = ?");
                $stmt->execute([$level, $notes, $certifiedAt, $empIdSelf, $userId, $existing['id']]);
            } else {
                $stmt = $pdo->prepare("UPDATE dbo.EMP_SKILLS SET level = ?, notes = ?, updated_at = GETDATE(), updated_by = ? WHERE id = ?");
                $stmt->execute([$level, $notes, $userId, $existing['id']]);
            }
            if (function_exists('writeLog')) writeLog($pdo, 'UPDATE', 'EmpSkills', $empId, json_encode($oldData), json_encode(['level' => $level]), "Skill level updated");
        } else {
            $certifiedAt = $level >= 3 ? date('Y-m-d') : null;
            $stmt = $pdo->prepare("INSERT INTO dbo.EMP_SKILLS (emp_id, skill_id, level, notes, certified_at, certified_by, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([$empId, $skillId, $level, $notes, $certifiedAt, $certifiedAt ? $empIdSelf : null, $userId]);
            if (function_exists('writeLog')) writeLog($pdo, 'INSERT', 'EmpSkills', $empId, null, json_encode(['skill_id' => $skillId, 'level' => $level]), "Skill added");
        }

        echo json_encode(['success' => true]);
        exit;
    }

    // ── Skill Definitions CRUD ────────────────────────────────────────────────
    if ($action === 'get_skill_definitions') {
        $stmt = $pdo->query("SELECT skill_id, skill_code, skill_name, category, line, display_order, is_active FROM dbo.SKILL_DEFINITIONS ORDER BY category, display_order, skill_name");
        echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
        exit;
    }

    if ($action === 'save_skill_definition') {
        $skillId   = (int)($_POST['skill_id']      ?? 0);
        $skillCode = strtoupper(trim($_POST['skill_code'] ?? ''));
        $skillName = trim($_POST['skill_name']      ?? '');
        $category  = trim($_POST['category']        ?? '');
        $skillLine = trim($_POST['line']            ?? '') ?: null;
        $order     = (int)($_POST['display_order'] ?? 0);

        if (empty($skillCode) || empty($skillName)) throw new Exception("Skill code and name are required.");
        if (!preg_match('/^[A-Z0-9_]+$/', $skillCode)) throw new Exception("Skill code must be alphanumeric uppercase (e.g. WELD_MIG).");

        if ($skillId > 0) {
            $stmt = $pdo->prepare("UPDATE dbo.SKILL_DEFINITIONS SET skill_code = ?, skill_name = ?, category = ?, line = ?, display_order = ? WHERE skill_id = ?");
            $stmt->execute([$skillCode, $skillName, $category, $skillLine, $order, $skillId]);
        } else {
            $stmt = $pdo->prepare("INSERT INTO dbo.SKILL_DEFINITIONS (skill_code, skill_name, category, line, display_order) VALUES (?, ?, ?, ?, ?)");
            $stmt->execute([$skillCode, $skillName, $category, $skillLine, $order]);
            $skillId = (int)$pdo->lastInsertId();
        }
        echo json_encode(['success' => true, 'skill_id' => $skillId]);
        exit;
    }

    if ($action === 'delete_skill_definition') {
        $skillId = (int)($_POST['skill_id'] ?? 0);
        if ($skillId <= 0) throw new Exception("Invalid skill_id.");
        $stmtCheck = $pdo->prepare("SELECT COUNT(*) FROM dbo.EMP_SKILLS WHERE skill_id = ?");
        $stmtCheck->execute([$skillId]);
        if ($stmtCheck->fetchColumn() > 0) throw new Exception("ไม่สามารถลบทักษะที่มีพนักงานใช้งานอยู่ได้ กรุณา Deactivate แทน");
        $pdo->prepare("DELETE FROM dbo.SKILL_DEFINITIONS WHERE skill_id = ?")->execute([$skillId]);
        echo json_encode(['success' => true]);
        exit;
    }

    if ($action === 'toggle_skill_active') {
        $skillId = (int)($_POST['skill_id'] ?? 0);
        if ($skillId <= 0) throw new Exception("Invalid skill_id.");
        $pdo->prepare("UPDATE dbo.SKILL_DEFINITIONS SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END WHERE skill_id = ?")->execute([$skillId]);
        echo json_encode(['success' => true]);
        exit;
    }

    throw new Exception("Invalid action.");

} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
