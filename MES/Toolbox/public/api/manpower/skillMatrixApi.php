<?php
/**
 * Self-contained Skill Matrix & Skill Definitions API.
 */

require_once __DIR__ . '/_common.php';

$input = [];
try {
    [$action, $input, $currentUser] = parseMpRequest('get_skill_matrix');
    $userId = (int)$currentUser['id'];
    $empIdSelf = trim((string)($currentUser['emp_id'] ?? ($currentUser['username'] ?? 'SYSTEM')));

    switch ($action) {
        case 'get_skill_matrix':
            requireMpAccess(false);
            $line = trim((string)($input['line'] ?? 'ALL'));
            $hcGroup = trim((string)($input['hcGroup'] ?? 'ALL'));
            $category = trim((string)($input['category'] ?? 'ALL'));

            $skillSql = 'SELECT skill_id, skill_code, skill_name, category, line, display_order FROM dbo.SKILL_DEFINITIONS WITH (NOLOCK) WHERE is_active = 1';
            $skillParams = [];
            if ($category !== 'ALL' && $category !== '') {
                $skillSql .= ' AND category = ?';
                $skillParams[] = $category;
            }
            $skillSql .= ' ORDER BY category ASC, display_order ASC, skill_name ASC';
            $stmtSkills = $pdo->prepare($skillSql);
            $stmtSkills->execute($skillParams);
            $skills = $stmtSkills->fetchAll(PDO::FETCH_ASSOC);

            $empSql = 'SELECT TOP (500) E.emp_id, E.name_th, E.position, E.line, E.team_group FROM dbo.MANPOWER_EMPLOYEES E WITH (NOLOCK) WHERE E.is_active = 1';
            $empParams = [];
            if ($line !== 'ALL' && $line !== '') {
                $empSql .= ' AND E.line = ?';
                $empParams[] = $line;
            }
            if ($hcGroup !== 'ALL' && $hcGroup !== '' && $hcGroup !== 'undefined') {
                $empSql .= ' AND E.department_api IN (SELECT department_api FROM dbo.MANPOWER_TEAM_SETTINGS WITH (NOLOCK) WHERE hc_group = ?)';
                $empParams[] = $hcGroup;
            }
            $empSql .= ' ORDER BY E.line ASC, E.position ASC, E.name_th ASC';
            $stmtEmp = $pdo->prepare($empSql);
            $stmtEmp->execute($empParams);
            $employees = $stmtEmp->fetchAll(PDO::FETCH_ASSOC);

            $empIds = array_column($employees, 'emp_id');
            $skillData = [];
            if (!empty($empIds)) {
                $placeholders = implode(',', array_fill(0, count($empIds), '?'));
                $stmtES = $pdo->prepare("
                    SELECT es.emp_id, es.skill_id, es.level, CONVERT(VARCHAR(10), es.certified_at, 120) AS certified_at, es.certified_by, es.notes
                    FROM dbo.EMP_SKILLS es WITH (NOLOCK)
                    WHERE es.emp_id IN ({$placeholders})
                ");
                $stmtES->execute($empIds);
                foreach ($stmtES->fetchAll(PDO::FETCH_ASSOC) as $row) {
                    $skillData[$row['emp_id']][$row['skill_id']] = [
                        'level' => (int)$row['level'],
                        'certified_at' => $row['certified_at'],
                        'certified_by' => $row['certified_by'],
                        'notes' => $row['notes'],
                    ];
                }
            }

            $categories = $pdo->query("SELECT DISTINCT category FROM dbo.SKILL_DEFINITIONS WITH (NOLOCK) WHERE is_active = 1 AND category IS NOT NULL AND category != '' ORDER BY category ASC")->fetchAll(PDO::FETCH_COLUMN);

            mpJsonSuccess([
                'skills' => $skills,
                'employees' => $employees,
                'skill_data' => $skillData,
                'categories' => $categories,
            ]);

        case 'update_emp_skill':
            requireMpAccess(true);
            $empId = trim((string)($input['emp_id'] ?? ''));
            $skillId = (int)($input['skill_id'] ?? 0);
            $level = (int)($input['level'] ?? 0);
            $notes = substr(trim((string)($input['notes'] ?? '')), 0, 500);
            if ($empId === '' || $skillId <= 0 || $level < 0 || $level > 4) {
                throw new InvalidArgumentException('ข้อมูลระดับทักษะไม่ถูกต้อง (ต้องอยู่ระหว่าง 0-4)');
            }

            $stEmp = $pdo->prepare('SELECT 1 FROM dbo.MANPOWER_EMPLOYEES WITH (NOLOCK) WHERE emp_id = ? AND is_active = 1');
            $stSkill = $pdo->prepare('SELECT 1 FROM dbo.SKILL_DEFINITIONS WITH (NOLOCK) WHERE skill_id = ? AND is_active = 1');
            $stEmp->execute([$empId]);
            $stSkill->execute([$skillId]);
            if (!$stEmp->fetchColumn() || !$stSkill->fetchColumn()) {
                throw new InvalidArgumentException('ไม่พบข้อมูลพนักงานหรือหัวข้อทักษะที่เลือก');
            }

            $check = $pdo->prepare('SELECT TOP 1 id, level FROM dbo.EMP_SKILLS WHERE emp_id = ? AND skill_id = ?');
            $check->execute([$empId, $skillId]);
            $existing = $check->fetch(PDO::FETCH_ASSOC);

            $pdo->beginTransaction();
            if ($level === 0) {
                if ($existing) {
                    $pdo->prepare('DELETE FROM dbo.EMP_SKILLS WHERE id = ?')->execute([$existing['id']]);
                    writeLog($pdo, 'DELETE', 'EMP_SKILLS', $empId, ['skill_id' => $skillId, 'level' => $existing['level']], null, 'Removed employee skill');
                }
            } elseif ($existing) {
                $certifiedAt = ($level >= 3 && (int)$existing['level'] < 3) ? date('Y-m-d') : null;
                if ($certifiedAt) {
                    $pdo->prepare('UPDATE dbo.EMP_SKILLS SET level = ?, notes = ?, certified_at = ?, certified_by = ?, updated_at = GETDATE(), updated_by = ? WHERE id = ?')
                        ->execute([$level, $notes, $certifiedAt, $empIdSelf, $userId, $existing['id']]);
                } else {
                    $pdo->prepare('UPDATE dbo.EMP_SKILLS SET level = ?, notes = ?, updated_at = GETDATE(), updated_by = ? WHERE id = ?')
                        ->execute([$level, $notes, $userId, $existing['id']]);
                }
                writeLog($pdo, 'UPDATE', 'EMP_SKILLS', $empId, ['skill_id' => $skillId, 'level' => $existing['level']], ['skill_id' => $skillId, 'level' => $level], 'Updated employee skill level');
            } else {
                $certifiedAt = $level >= 3 ? date('Y-m-d') : null;
                $pdo->prepare('INSERT INTO dbo.EMP_SKILLS (emp_id, skill_id, level, notes, certified_at, certified_by, updated_at, updated_by) VALUES (?, ?, ?, ?, ?, ?, GETDATE(), ?)')
                    ->execute([$empId, $skillId, $level, $notes, $certifiedAt, $certifiedAt ? $empIdSelf : null, $userId]);
                writeLog($pdo, 'CREATE', 'EMP_SKILLS', $empId, null, ['skill_id' => $skillId, 'level' => $level], 'Assigned new employee skill');
            }
            $pdo->commit();
            mpJsonSuccess(null, 'บันทึกระดับทักษะเรียบร้อยแล้ว');

        case 'get_skill_definitions':
            requireMpAccess(false);
            $rows = $pdo->query('SELECT skill_id, skill_code, skill_name, category, line, display_order, is_active FROM dbo.SKILL_DEFINITIONS WITH (NOLOCK) ORDER BY category ASC, display_order ASC, skill_name ASC')->fetchAll(PDO::FETCH_ASSOC);
            mpJsonSuccess($rows);

        case 'save_skill_definition':
            requireMpAccess(true);
            $skillId = (int)($input['skill_id'] ?? 0);
            $skillCode = strtoupper(trim((string)($input['skill_code'] ?? '')));
            $skillName = trim((string)($input['skill_name'] ?? ''));
            $category = trim((string)($input['category'] ?? 'General'));
            $skillLine = trim((string)($input['line'] ?? '')) ?: null;
            $order = (int)($input['display_order'] ?? 0);

            if ($skillCode === '' || $skillName === '' || !preg_match('/^[A-Z0-9_]+$/', $skillCode)) {
                throw new InvalidArgumentException('รหัสทักษะต้องเป็นตัวอักษรภาษาอังกฤษพิมพ์ใหญ่ ตัวเลข หรือ _ และต้องกรอกชื่อทักษะ');
            }

            $pdo->beginTransaction();
            if ($skillId > 0) {
                $pdo->prepare('UPDATE dbo.SKILL_DEFINITIONS SET skill_code = ?, skill_name = ?, category = ?, line = ?, display_order = ? WHERE skill_id = ?')
                    ->execute([$skillCode, $skillName, $category, $skillLine, $order, $skillId]);
                writeLog($pdo, 'UPDATE', 'SKILL_DEFINITION', (string)$skillId, null, ['skill_code' => $skillCode, 'skill_name' => $skillName], 'Updated skill definition');
            } else {
                $pdo->prepare('INSERT INTO dbo.SKILL_DEFINITIONS (skill_code, skill_name, category, line, display_order, is_active, created_at) VALUES (?, ?, ?, ?, ?, 1, GETDATE())')
                    ->execute([$skillCode, $skillName, $category, $skillLine, $order]);
                $skillId = (int)$pdo->lastInsertId();
                writeLog($pdo, 'CREATE', 'SKILL_DEFINITION', (string)$skillId, null, ['skill_code' => $skillCode, 'skill_name' => $skillName], 'Created skill definition');
            }
            $pdo->commit();
            mpJsonSuccess(['skill_id' => $skillId], 'บันทึกหัวข้อทักษะเรียบร้อยแล้ว');

        case 'delete_skill_definition':
            requireMpAccess(true);
            $skillId = (int)($input['skill_id'] ?? 0);
            if ($skillId <= 0) {
                throw new InvalidArgumentException('ไม่พบรหัสทักษะ');
            }
            $used = $pdo->prepare('SELECT COUNT(*) FROM dbo.EMP_SKILLS WITH (NOLOCK) WHERE skill_id = ?');
            $used->execute([$skillId]);
            if ((int)$used->fetchColumn() > 0) {
                throw new InvalidArgumentException('ไม่สามารถลบทักษะที่มีพนักงานใช้งานอยู่ได้ กรุณาปิดการใช้งานแทน');
            }
            $pdo->beginTransaction();
            $pdo->prepare('DELETE FROM dbo.SKILL_DEFINITIONS WHERE skill_id = ?')->execute([$skillId]);
            writeLog($pdo, 'DELETE', 'SKILL_DEFINITION', (string)$skillId, null, null, 'Deleted skill definition');
            $pdo->commit();
            mpJsonSuccess(null, 'ลบหัวข้อทักษะเรียบร้อยแล้ว');

        case 'toggle_skill_active':
            requireMpAccess(true);
            $skillId = (int)($input['skill_id'] ?? 0);
            if ($skillId <= 0) {
                throw new InvalidArgumentException('ไม่พบรหัสทักษะ');
            }
            $pdo->beginTransaction();
            $pdo->prepare('UPDATE dbo.SKILL_DEFINITIONS SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END WHERE skill_id = ?')->execute([$skillId]);
            writeLog($pdo, 'UPDATE', 'SKILL_DEFINITION', (string)$skillId, null, null, 'Toggled skill active status');
            $pdo->commit();
            mpJsonSuccess(null, 'อัปเดตสถานะทักษะเรียบร้อยแล้ว');

        default:
            throw new InvalidArgumentException('ไม่พบคำสั่งที่ระบุ');
    }
} catch (Throwable $e) {
    handleMpException($pdo, 'MANPOWER_SKILL_API', $e, $input);
}
