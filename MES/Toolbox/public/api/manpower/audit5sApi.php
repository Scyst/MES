<?php
/**
 * Multi-Auditor 5S Committee Round & Photo Evidence API (Unlimited 1..N Equal-Weight Auditors + Persistent Default Roster + Blind Audit).
 * - Admins/Managers configure a persistent Default 5S Committee Roster (1..N unlimited members, all lines by default or scoped per line).
 * - Default Committee members view assigned/eligible lines on dedicated #/audit-5s page, upload evidence photos (outside page/),
 *   and submit blind scores (peer scores stay hidden until the round is completed).
 */

if (($_GET['action'] ?? $_REQUEST['action'] ?? '') === 'view_5s_photo') {
    define('MP_SKIP_JSON_HEADER', true);
}

require_once __DIR__ . '/_common.php';
require_once __DIR__ . '/_grading_helpers.php';

/**
 * Fetches evidence photos grouped by audit_id for a given round.
 */
function fetchRoundPhotosByAudit(PDO $pdo, int $roundId): array {
    $stmt = $pdo->prepare("
        SELECT photo_id, audit_id, round_id, category_5s, file_name, file_path, original_name, caption, uploaded_by, uploaded_at
        FROM dbo.AUDIT_5S_PHOTOS WITH (NOLOCK)
        WHERE round_id = ?
        ORDER BY photo_id ASC
    ");
    $stmt->execute([$roundId]);
    $grouped = [];
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $p) {
        $aid = (int)$p['audit_id'];
        $grouped[$aid][] = $p;
    }
    return $grouped;
}

/**
 * Serves an uploaded 5S photo securely after validating filename whitelist and session auth.
 */
function stream5sPhoto(string $rawFile): void {
    $cleanName = basename(str_replace('\\', '/', trim($rawFile)));
    if (!preg_match('/^[A-Za-z0-9._-]+\.(jpg|jpeg|png|webp)$/i', $cleanName)) {
        http_response_code(400);
        exit('Invalid photo filename');
    }

    $foundPath = null;
    foreach (resolve5sUploadSearchDirs() as $baseDir) {
        $candidate = $baseDir . DIRECTORY_SEPARATOR . '5s_audits' . DIRECTORY_SEPARATOR . $cleanName;
        if (is_file($candidate)) {
            $foundPath = $candidate;
            break;
        }
    }
    if ($foundPath === null) {
        http_response_code(404);
        exit('Photo not found');
    }

    $ext = strtolower(pathinfo($foundPath, PATHINFO_EXTENSION));
    $mime = $ext === 'png' ? 'image/png' : ($ext === 'webp' ? 'image/webp' : 'image/jpeg');
    header('Content-Type: ' . $mime);
    header('Content-Length: ' . filesize($foundPath));
    header('Cache-Control: private, max-age=3600');
    readfile($foundPath);
    exit;
}

$input = [];
try {
    [$action, $input, $currentUser] = parseMpRequest('get_my_5s_assignments');
    $isManager = isGradingManagerUser($currentUser);
    $selfEmpId = resolveSessionEmpId($pdo, $currentUser);

    if ($action === 'view_5s_photo') {
        stream5sPhoto((string)($input['file'] ?? $input['file_name'] ?? ''));
    }

    switch ($action) {
        case 'get_my_5s_assignments':
            $dateRaw = trim((string)($input['audit_date'] ?? ''));
            $periodRaw = trim((string)($input['eval_period'] ?? ''));
            if ($dateRaw !== '' && preg_match('/^\d{4}-\d{2}-\d{2}$/', $dateRaw)) {
                $targetDate = $dateRaw;
                $targetPeriod = substr($targetDate, 0, 7);
            } elseif ($periodRaw !== '' && preg_match('/^\d{4}-\d{2}-\d{2}$/', $periodRaw)) {
                $targetDate = $periodRaw;
                $targetPeriod = substr($targetDate, 0, 7);
            } else {
                $targetDate = date('Y-m-d');
                $targetPeriod = ($periodRaw !== '' && preg_match('/^\d{4}-\d{2}$/', $periodRaw)) ? $periodRaw : substr($targetDate, 0, 7);
            }

            $defaultRoster = fetchDefault5sCommittee($pdo, true);
            $selfDefault = null;
            foreach ($defaultRoster as $dm) {
                if ($selfEmpId !== '' && trim((string)$dm['auditor_emp_id']) === $selfEmpId) {
                    $selfDefault = $dm;
                    break;
                }
            }
            $isDefaultMember = ($selfDefault !== null);
            $myDefaultScope = $selfDefault ? ($selfDefault['assigned_lines_list'] ?? parse5sAssignedLines($selfDefault['assigned_lines'] ?? 'ALL')) : [];

            if (!$isManager && !$isDefaultMember) {
                if ($selfEmpId === '') {
                    mpJsonSuccess([
                        'rounds' => [],
                        'audit_date' => $targetDate,
                        'eval_period' => $targetPeriod,
                        'audit_dates_in_period' => [],
                        'monthly_line_summary' => [],
                        'is_committee_member' => false,
                        'is_manager' => false,
                        'default_committee_count' => count($defaultRoster),
                        'my_scope_lines' => [],
                    ]);
                }
            }
            $stmt = $pdo->prepare("
                SELECT TOP (250)
                    R.round_id, R.eval_period, R.line, R.round_name,
                    CONVERT(VARCHAR(10), R.audit_date, 120) AS audit_date,
                    R.required_auditors, R.submitted_count, R.status,
                    R.weighted_score, R.final_grade, R.notes, R.created_at,
                    C.id AS committee_id, C.assigned_role, C.is_completed AS my_is_completed,
                    C.audit_id AS my_audit_id, C.submitted_at AS my_submitted_at
                FROM dbo.AUDIT_5S_ROUNDS R WITH (NOLOCK)
                LEFT JOIN dbo.AUDIT_5S_COMMITTEE C WITH (NOLOCK)
                    ON C.round_id = R.round_id AND C.auditor_emp_id = ?
                WHERE R.audit_date = ?
                ORDER BY R.line ASC, R.round_id DESC
            ");
            $stmt->execute([$selfEmpId, $targetDate]);
            $allRounds = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $rounds = [];
            $existingLinesMap = [];
            foreach ($allRounds as $r) {
                $ln = trim((string)$r['line']);
                $existingLinesMap[$ln] = true;
                $canViewByDefault = $isDefaultMember && isLineCoveredBy5sScope($ln, $myDefaultScope);
                if ($isManager || !empty($r['committee_id']) || $canViewByDefault) {
                    $r['is_virtual_default'] = false;
                    $r['can_audit'] = !empty($r['committee_id']) || $canViewByDefault;
                    $rounds[] = $r;
                }
            }

            $activeLines = fetchActive5sLines($pdo);
            if (!empty($defaultRoster)) {
                foreach ($activeLines as $lnRaw) {
                    $ln = trim((string)$lnRaw);
                    if ($ln === '' || isset($existingLinesMap[$ln])) {
                        continue;
                    }
                    $eligibleForLine = resolveDefaultCommitteeForLine($defaultRoster, $ln);
                    if (empty($eligibleForLine)) {
                        continue;
                    }
                    $canAuditLine = $isDefaultMember && isLineCoveredBy5sScope($ln, $myDefaultScope);
                    if (!$isManager && !$canAuditLine) {
                        continue;
                    }
                    $rounds[] = [
                        'round_id' => 0,
                        'is_virtual_default' => true,
                        'eval_period' => $targetPeriod,
                        'line' => $ln,
                        'round_name' => "ตรวจ 5ส ประจำวันที่ {$targetDate} ({$ln})",
                        'audit_date' => $targetDate,
                        'required_auditors' => count($eligibleForLine),
                        'submitted_count' => 0,
                        'status' => 'READY',
                        'weighted_score' => null,
                        'final_grade' => null,
                        'notes' => 'สร้างอัตโนมัติจากชุดคณะกรรมการประจำ (Default Roster)',
                        'created_at' => null,
                        'committee_id' => $canAuditLine ? 0 : null,
                        'assigned_role' => $selfDefault['assigned_role'] ?? 'AUDITOR',
                        'my_is_completed' => 0,
                        'my_audit_id' => null,
                        'my_submitted_at' => null,
                        'can_audit' => $canAuditLine,
                    ];
                }
            }

            // History of audit dates in this month + Monthly average per line
            $monthStart = $targetPeriod . '-01';
            $monthEnd = date('Y-m-d', strtotime($monthStart . ' +1 month'));
            $stmtDates = $pdo->prepare("
                SELECT CONVERT(VARCHAR(10), audit_date, 120) AS audit_date,
                       COUNT(*) AS total_rounds,
                       SUM(CASE WHEN submitted_count > 0 THEN 1 ELSE 0 END) AS audited_lines,
                       ROUND(AVG(CASE WHEN submitted_count > 0 THEN CAST(weighted_score AS FLOAT) END), 1) AS avg_score
                FROM dbo.AUDIT_5S_ROUNDS WITH (NOLOCK)
                WHERE audit_date >= ? AND audit_date < ?
                GROUP BY CONVERT(VARCHAR(10), audit_date, 120)
                ORDER BY audit_date DESC
            ");
            $stmtDates->execute([$monthStart, $monthEnd]);
            $auditDatesInPeriod = $stmtDates->fetchAll(PDO::FETCH_ASSOC);

            $monthlyConsensusMap = fetch5sPeriodConsensusMap($pdo, $monthStart, $monthEnd);

            $stmtCnt = $pdo->prepare('SELECT COUNT(*) FROM dbo.AUDIT_5S_COMMITTEE WITH (NOLOCK) WHERE auditor_emp_id = ?');
            $stmtCnt->execute([$selfEmpId]);
            $isCommittee = $isDefaultMember || ((int)$stmtCnt->fetchColumn() > 0);

            mpJsonSuccess([
                'rounds' => $rounds,
                'audit_date' => $targetDate,
                'eval_period' => $targetPeriod,
                'audit_dates_in_period' => $auditDatesInPeriod,
                'monthly_line_summary' => $monthlyConsensusMap,
                'active_lines' => $activeLines,
                'is_committee_member' => $isCommittee,
                'is_manager' => $isManager,
                'self_emp_id' => $selfEmpId,
                'default_committee_count' => count($defaultRoster),
                'my_scope_lines' => $myDefaultScope,
            ]);

        case 'get_5s_round_detail':
            $roundId = (int)($input['round_id'] ?? 0);
            $virtualLine = trim((string)($input['line'] ?? ''));
            $virtualDateRaw = trim((string)($input['audit_date'] ?? ''));
            $virtualDate = preg_match('/^\d{4}-\d{2}-\d{2}$/', $virtualDateRaw) ? $virtualDateRaw : date('Y-m-d');
            $virtualPeriod = trim((string)($input['eval_period'] ?? substr($virtualDate, 0, 7)));
            if (!preg_match('/^\d{4}-\d{2}$/', $virtualPeriod)) {
                $virtualPeriod = substr($virtualDate, 0, 7);
            }

            if ($roundId <= 0) {
                if ($virtualLine === '') {
                    throw new InvalidArgumentException('ไม่พบรหัสรอบหรือสายผลิตที่ต้องการดูรายละเอียด');
                }
                $defaultRoster = fetchDefault5sCommittee($pdo, true);
                $eligible = resolveDefaultCommitteeForLine($defaultRoster, $virtualLine);
                $isAssignedVirtual = false;
                $virtualMembers = [];
                foreach ($eligible as $idx => $m) {
                    $isOwn = ($selfEmpId !== '' && trim((string)$m['auditor_emp_id']) === $selfEmpId);
                    if ($isOwn) {
                        $isAssignedVirtual = true;
                    }
                    $virtualMembers[] = [
                        'id' => -($idx + 1),
                        'auditor_emp_id' => $m['auditor_emp_id'],
                        'auditor_name' => $m['auditor_name'],
                        'assigned_role' => $m['assigned_role'],
                        'weight_pct' => $m['weight_pct'],
                        'is_completed' => 0,
                        'audit_id' => null,
                        'submitted_at' => null,
                        'score_seiri' => null,
                        'score_seiton' => null,
                        'score_seiso' => null,
                        'score_seiketsu' => null,
                        'score_shitsuke' => null,
                        'total_score' => null,
                        'grade' => null,
                        'remarks' => null,
                        'is_self' => $isOwn,
                        'photos' => [],
                        'blind_masked' => false,
                    ];
                }
                if (!$isManager && !$isAssignedVirtual) {
                    mpJsonError('คุณไม่ได้รับสิทธิ์เข้าถึงสายการผลิตนี้', 403);
                }
                mpJsonSuccess([
                    'round' => [
                        'round_id' => 0,
                        'is_virtual_default' => true,
                        'eval_period' => $virtualPeriod,
                        'line' => $virtualLine,
                        'round_name' => "ตรวจ 5ส ประจำวันที่ {$virtualDate} ({$virtualLine})",
                        'audit_date' => $virtualDate,
                        'required_auditors' => count($virtualMembers),
                        'submitted_count' => 0,
                        'status' => 'READY',
                        'weighted_score' => null,
                        'final_grade' => null,
                        'notes' => 'ใช้รายชื่อกรรมการประจำ (Default Roster) — เมื่อส่งผลแรก ระบบจะเปิดรอบของวันนี้ให้อัตโนมัติ',
                    ],
                    'committee' => $virtualMembers,
                    'blind_mode' => !$isManager,
                ]);
            }

            $stmtR = $pdo->prepare("
                SELECT round_id, eval_period, line, round_name,
                       CONVERT(VARCHAR(10), audit_date, 120) AS audit_date,
                       required_auditors, submitted_count, status,
                       weighted_score, final_grade, notes, created_by, created_at
                FROM dbo.AUDIT_5S_ROUNDS WITH (NOLOCK)
                WHERE round_id = ?
            ");
            $stmtR->execute([$roundId]);
            $round = $stmtR->fetch(PDO::FETCH_ASSOC);
            if (!$round) {
                throw new InvalidArgumentException('ไม่พบรอบตรวจ 5ส ที่ระบุ');
            }

            $stmtComm = $pdo->prepare("
                SELECT C.id, C.auditor_emp_id, C.auditor_name, C.assigned_role,
                       C.weight_pct, C.is_completed, C.audit_id, C.submitted_at,
                       A.score_seiri, A.score_seiton, A.score_seiso, A.score_seiketsu, A.score_shitsuke,
                       A.total_score, A.grade, A.remarks
                FROM dbo.AUDIT_5S_COMMITTEE C WITH (NOLOCK)
                LEFT JOIN dbo.AUDIT_5S A WITH (NOLOCK) ON C.audit_id = A.audit_id
                WHERE C.round_id = ?
                ORDER BY CASE WHEN C.assigned_role = 'CHAIR' THEN 0 ELSE 1 END, C.id ASC
            ");
            $stmtComm->execute([$roundId]);
            $members = $stmtComm->fetchAll(PDO::FETCH_ASSOC);

            $isAssigned = false;
            foreach ($members as $m) {
                if (trim((string)$m['auditor_emp_id']) === $selfEmpId && $selfEmpId !== '') {
                    $isAssigned = true;
                    break;
                }
            }
            if (!$isAssigned && $selfEmpId !== '') {
                $defRoster = fetchDefault5sCommittee($pdo, true);
                foreach ($defRoster as $dm) {
                    if (trim((string)$dm['auditor_emp_id']) === $selfEmpId && isLineCoveredBy5sScope((string)$round['line'], $dm['assigned_lines_list'] ?? ['ALL'])) {
                        $isAssigned = true;
                        break;
                    }
                }
            }
            if (!$isManager && !$isAssigned) {
                mpJsonError('คุณไม่ได้รับสิทธิ์เข้าถึงรอบตรวจ 5ส นี้', 403);
            }

            // Blind Peer Audit: Hide peer scores until round is COMPLETED/LOCKED (Admin always sees all)
            $canRevealPeers = $isManager || in_array((string)$round['status'], ['COMPLETED', 'LOCKED'], true);
            $photosByAudit = fetchRoundPhotosByAudit($pdo, $roundId);

            foreach ($members as &$m) {
                $isOwn = (trim((string)$m['auditor_emp_id']) === $selfEmpId && $selfEmpId !== '');
                $m['is_self'] = $isOwn;
                $m['photos'] = ($isOwn || $canRevealPeers) && !empty($m['audit_id'])
                    ? ($photosByAudit[(int)$m['audit_id']] ?? [])
                    : [];
                if (!$canRevealPeers && !$isOwn) {
                    $m['score_seiri'] = null;
                    $m['score_seiton'] = null;
                    $m['score_seiso'] = null;
                    $m['score_seiketsu'] = null;
                    $m['score_shitsuke'] = null;
                    $m['total_score'] = null;
                    $m['grade'] = null;
                    $m['remarks'] = null;
                    $m['blind_masked'] = true;
                } else {
                    $m['blind_masked'] = false;
                }
            }
            unset($m);

            $round['is_virtual_default'] = false;
            mpJsonSuccess([
                'round' => $round,
                'committee' => $members,
                'blind_mode' => !$canRevealPeers,
            ]);

        case 'get_default_5s_committee':
            $roster = fetchDefault5sCommittee($pdo, true);
            $lines = fetchActive5sLines($pdo);
            if (!$isManager) {
                $selfEntry = null;
                foreach ($roster as $r) {
                    if ($selfEmpId !== '' && trim((string)$r['auditor_emp_id']) === $selfEmpId) {
                        $selfEntry = $r;
                        break;
                    }
                }
                mpJsonSuccess([
                    'members' => $selfEntry ? [$selfEntry] : [],
                    'total_count' => count($roster),
                    'active_lines' => $lines,
                    'is_manager' => false,
                ]);
            }
            mpJsonSuccess([
                'members' => $roster,
                'total_count' => count($roster),
                'active_lines' => $lines,
                'is_manager' => true,
            ]);

        case 'save_default_5s_committee':
            if (!$isManager) {
                mpJsonError('สงวนสิทธิ์เฉพาะผู้ดูแลระบบในการตั้งค่าคณะกรรมการ 5ส ประจำ', 403);
            }
            $membersRaw = $input['members'] ?? [];
            if (is_string($membersRaw)) {
                $membersRaw = json_decode($membersRaw, true) ?? [];
            }
            if (!is_array($membersRaw) || empty($membersRaw)) {
                throw new InvalidArgumentException('กรุณาเลือกคณะกรรมการ 5ส ประจำอย่างน้อย 1 คน');
            }

            $uniqueMembers = [];
            foreach ($membersRaw as $m) {
                $eid = trim((string)($m['auditor_emp_id'] ?? $m['emp_id'] ?? ''));
                if ($eid === '' || isset($uniqueMembers[$eid])) {
                    continue;
                }
                $uniqueMembers[$eid] = [
                    'auditor_emp_id' => $eid,
                    'auditor_name' => mb_substr(trim((string)($m['auditor_name'] ?? $m['name_th'] ?? $eid)), 0, 200, 'UTF-8'),
                    'assigned_role' => strtoupper(trim((string)($m['assigned_role'] ?? 'AUDITOR'))) === 'CHAIR' ? 'CHAIR' : 'AUDITOR',
                    'assigned_lines' => serialize5sAssignedLines($m['assigned_lines'] ?? $m['assigned_lines_list'] ?? 'ALL'),
                ];
            }
            if (empty($uniqueMembers)) {
                throw new InvalidArgumentException('ไม่พบข้อมูลรหัสพนักงานที่ถูกต้องในรายชื่อคณะกรรมการ');
            }

            $oldRoster = fetchDefault5sCommittee($pdo, false);
            $pdo->beginTransaction();
            $pdo->exec('DELETE FROM dbo.AUDIT_5S_DEFAULT_COMMITTEE');
            $ins = $pdo->prepare('
                INSERT INTO dbo.AUDIT_5S_DEFAULT_COMMITTEE
                (auditor_emp_id, auditor_name, assigned_role, assigned_lines, is_active, created_by, created_at, updated_at)
                VALUES (?, ?, ?, ?, 1, ?, GETDATE(), GETDATE())
            ');
            foreach ($uniqueMembers as $um) {
                $ins->execute([$um['auditor_emp_id'], $um['auditor_name'], $um['assigned_role'], $um['assigned_lines'], $selfEmpId]);
            }
            writeLog($pdo, 'UPDATE', 'AUDIT_5S_DEFAULT_COMMITTEE', 'DEFAULT_ROSTER', $oldRoster, array_values($uniqueMembers), 'Updated persistent Default 5S Committee Roster (' . count($uniqueMembers) . ' members)');
            $pdo->commit();
            mpJsonSuccess(['count' => count($uniqueMembers)], 'บันทึกคณะกรรมการตรวจ 5ส ประจำ (' . count($uniqueMembers) . ' คน) เรียบร้อยแล้ว');

        case 'sync_period_5s_rounds':
            if (!$isManager) {
                mpJsonError('สงวนสิทธิ์เฉพาะผู้ดูแลระบบในการเปิดรอบตรวจ 5ส', 403);
            }
            $evalPeriod = trim((string)($input['eval_period'] ?? date('Y-m')));
            $auditDate = parseMpDate($input['audit_date'] ?? null, date('Y-m-d'), 'วันที่ตรวจ 5ส');
            if (!preg_match('/^\d{4}-\d{2}$/', $evalPeriod)) {
                throw new InvalidArgumentException('รูปแบบงวดเดือนไม่ถูกต้อง (YYYY-MM)');
            }
            $roster = fetchDefault5sCommittee($pdo, true);
            if (empty($roster)) {
                throw new InvalidArgumentException('กรุณาตั้งค่า "คณะกรรมการ 5ส ประจำ (Default Roster)" ก่อนเปิดรอบอัตโนมัติ');
            }
            $activeLines = fetchActive5sLines($pdo);

            $created = 0;
            $synced = 0;
            $pdo->beginTransaction();
            foreach ($activeLines as $ln) {
                $eligible = resolveDefaultCommitteeForLine($roster, (string)$ln);
                if (empty($eligible)) {
                    continue;
                }
                $res = ensure5sRoundFromDefault($pdo, $evalPeriod, (string)$ln, $selfEmpId, $auditDate);
                if (!empty($res['created'])) {
                    $created++;
                } else {
                    $synced++;
                }
            }
            writeLog($pdo, 'CREATE', 'AUDIT_5S_ROUND_SYNC', $evalPeriod, null, ['created' => $created, 'synced' => $synced, 'roster_count' => count($roster)], "Auto-synced 5S rounds from Default Roster for {$evalPeriod}");
            $pdo->commit();
            mpJsonSuccess(['created' => $created, 'synced' => $synced], "ซิงค์รอบตรวจ 5ส งวด {$evalPeriod} สำเร็จ (สร้างใหม่ {$created} สาย · อัปเดต {$synced} สาย)");

        case 'get_auditor_candidates':
            if (!$isManager) {
                mpJsonError('สงวนสิทธิ์เฉพาะผู้ดูแลระบบในการแต่งตั้งคณะกรรมการ 5ส', 403);
            }
            $q = trim((string)($input['q'] ?? ''));
            $where = ['E.is_active = 1', "ISNULL(TS.hc_group, 'TEAM 1') <> 'EXCLUDE'"];
            $params = [];
            if ($q !== '') {
                $where[] = '(E.emp_id LIKE ? OR E.name_th LIKE ? OR E.line LIKE ? OR E.position LIKE ?)';
                $like = "%{$q}%";
                array_push($params, $like, $like, $like, $like);
            }
            $whereSql = implode(' AND ', $where);
            $stmt = $pdo->prepare("
                SELECT TOP (300) E.emp_id, E.name_th, E.position, E.line, E.department_api,
                       MAX(U.username) AS username, MAX(U.role) AS sys_role
                FROM dbo.MANPOWER_EMPLOYEES E WITH (NOLOCK)
                LEFT JOIN dbo.MANPOWER_TEAM_SETTINGS TS WITH (NOLOCK) ON E.department_api = TS.department_api
                LEFT JOIN dbo.USERS U WITH (NOLOCK) ON U.emp_id = E.emp_id COLLATE Thai_CI_AS AND U.is_active = 1
                WHERE {$whereSql}
                GROUP BY E.emp_id, E.name_th, E.position, E.line, E.department_api
                ORDER BY CASE WHEN MAX(U.username) IS NOT NULL THEN 0 ELSE 1 END, E.line ASC, E.emp_id ASC
            ");
            $stmt->execute($params);
            mpJsonSuccess($stmt->fetchAll(PDO::FETCH_ASSOC));

        case 'save_5s_round':
            if (!$isManager) {
                mpJsonError('สงวนสิทธิ์เฉพาะผู้ดูแลระบบในการสร้างหรือแก้ไขรอบตรวจ 5ส', 403);
            }
            $roundId = (int)($input['round_id'] ?? 0);
            $line = trim((string)($input['line'] ?? ''));
            $roundName = mb_substr(trim((string)($input['round_name'] ?? '')), 0, 150, 'UTF-8');
            $auditDate = parseMpDate($input['audit_date'] ?? null, date('Y-m-d'), 'วันที่ตรวจ 5ส');
            $evalPeriod = trim((string)($input['eval_period'] ?? substr((string)$auditDate, 0, 7)));
            $notes = mb_substr(trim((string)($input['notes'] ?? '')), 0, 500, 'UTF-8');

            $committeeRaw = $input['committee'] ?? [];
            if (is_string($committeeRaw)) {
                $committeeRaw = json_decode($committeeRaw, true) ?? [];
            }

            if ($line === '' || !preg_match('/^\d{4}-\d{2}$/', $evalPeriod)) {
                throw new InvalidArgumentException('กรุณาระบุสายการผลิตและงวดเดือน (YYYY-MM) ให้ถูกต้อง');
            }
            if ($roundName === '') {
                $roundName = "ตรวจ 5ส ประจำเดือน {$evalPeriod} ({$line})";
            }

            $uniqueCommittee = [];
            foreach ($committeeRaw as $member) {
                $eid = trim((string)($member['auditor_emp_id'] ?? $member['emp_id'] ?? ''));
                if ($eid === '' || isset($uniqueCommittee[$eid])) {
                    continue;
                }
                $uniqueCommittee[$eid] = [
                    'auditor_emp_id' => $eid,
                    'auditor_name' => mb_substr(trim((string)($member['auditor_name'] ?? $member['name_th'] ?? $eid)), 0, 200, 'UTF-8'),
                    'assigned_role' => strtoupper(trim((string)($member['assigned_role'] ?? 'AUDITOR'))) === 'CHAIR' ? 'CHAIR' : 'AUDITOR',
                ];
            }

            $reqCount = count($uniqueCommittee);
            if ($reqCount < 1) {
                throw new InvalidArgumentException('กรุณาเลือกคณะกรรมการตรวจ 5ส อย่างน้อย 1 คน');
            }
            $equalWeight = round(100.0 / $reqCount, 2);

            $pdo->beginTransaction();
            $oldRound = null;
            if ($roundId > 0) {
                $stmtOld = $pdo->prepare('SELECT * FROM dbo.AUDIT_5S_ROUNDS WHERE round_id = ?');
                $stmtOld->execute([$roundId]);
                $oldRound = $stmtOld->fetch(PDO::FETCH_ASSOC);
                if (!$oldRound) {
                    throw new InvalidArgumentException('ไม่พบรอบตรวจ 5ส ที่ต้องการแก้ไข');
                }
                if ($oldRound['status'] === 'LOCKED') {
                    throw new InvalidArgumentException('รอบตรวจนี้ถูกล็อกปิดงวดแล้ว กรุณาปลดล็อกก่อนแก้ไขรายชื่อกรรมการ');
                }
                $pdo->prepare('
                    UPDATE dbo.AUDIT_5S_ROUNDS
                    SET eval_period = ?, line = ?, round_name = ?, audit_date = ?, required_auditors = ?, notes = ?, updated_at = GETDATE()
                    WHERE round_id = ?
                ')->execute([$evalPeriod, $line, $roundName, $auditDate, $reqCount, $notes, $roundId]);

                // Preserve existing completed submissions while syncing membership
                $existingRows = $pdo->prepare('SELECT auditor_emp_id, is_completed, audit_id FROM dbo.AUDIT_5S_COMMITTEE WHERE round_id = ?');
                $existingRows->execute([$roundId]);
                $existingMap = [];
                foreach ($existingRows->fetchAll(PDO::FETCH_ASSOC) as $ex) {
                    $existingMap[$ex['auditor_emp_id']] = $ex;
                }

                $delStmt = $pdo->prepare('DELETE FROM dbo.AUDIT_5S_COMMITTEE WHERE round_id = ? AND is_completed = 0');
                $delStmt->execute([$roundId]);

                $insC = $pdo->prepare('INSERT INTO dbo.AUDIT_5S_COMMITTEE (round_id, auditor_emp_id, auditor_name, assigned_role, weight_pct, assigned_by) VALUES (?, ?, ?, ?, ?, ?)');
                $updC = $pdo->prepare('UPDATE dbo.AUDIT_5S_COMMITTEE SET auditor_name = ?, assigned_role = ?, weight_pct = ? WHERE round_id = ? AND auditor_emp_id = ?');
                foreach ($uniqueCommittee as $eid => $m) {
                    if (isset($existingMap[$eid]) && (int)$existingMap[$eid]['is_completed'] === 1) {
                        $updC->execute([$m['auditor_name'], $m['assigned_role'], $equalWeight, $roundId, $eid]);
                    } else {
                        $insC->execute([$roundId, $eid, $m['auditor_name'], $m['assigned_role'], $equalWeight, $selfEmpId]);
                    }
                }
            } else {
                $pdo->prepare('
                    INSERT INTO dbo.AUDIT_5S_ROUNDS (eval_period, line, round_name, audit_date, required_auditors, notes, created_by)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                ')->execute([$evalPeriod, $line, $roundName, $auditDate, $reqCount, $notes, $selfEmpId]);
                $roundId = (int)$pdo->lastInsertId();

                $insC = $pdo->prepare('INSERT INTO dbo.AUDIT_5S_COMMITTEE (round_id, auditor_emp_id, auditor_name, assigned_role, weight_pct, assigned_by) VALUES (?, ?, ?, ?, ?, ?)');
                foreach ($uniqueCommittee as $m) {
                    $insC->execute([$roundId, $m['auditor_emp_id'], $m['auditor_name'], $m['assigned_role'], $equalWeight, $selfEmpId]);
                }
            }

            $summary = recompute5sRoundSummary($pdo, $roundId);
            writeLog($pdo, $oldRound ? 'UPDATE' : 'CREATE', 'AUDIT_5S_ROUND', (string)$roundId, $oldRound, [
                'eval_period' => $evalPeriod, 'line' => $line, 'required_auditors' => $reqCount,
                'committee_ids' => array_keys($uniqueCommittee),
            ], "Configured 5S committee round {$roundName} ({$reqCount} auditors, equal weight)");
            $pdo->commit();
            mpJsonSuccess($summary, 'บันทึกแผนและคณะกรรมการตรวจ 5ส เรียบร้อยแล้ว');

        case 'submit_5s_audit':
            $roundId = (int)($input['round_id'] ?? 0);
            $auditLineInput = trim((string)($input['line'] ?? ''));
            $evalPeriodInput = trim((string)($input['eval_period'] ?? date('Y-m')));
            $auditDateInput = parseMpDate($input['audit_date'] ?? null, date('Y-m-d'), 'วันที่ตรวจ 5ส');

            $auditorEmpId = $isManager && !empty($input['auditor_emp_id'])
                ? trim((string)$input['auditor_emp_id'])
                : $selfEmpId;
            if ($auditorEmpId === '') {
                throw new InvalidArgumentException('บัญชีผู้ใช้งานนี้ยังไม่มีรหัสพนักงานสำหรับบันทึกผลตรวจ');
            }

            $s1 = max(0, min(20, (int)($input['score_seiri'] ?? 0)));
            $s2 = max(0, min(20, (int)($input['score_seiton'] ?? 0)));
            $s3 = max(0, min(20, (int)($input['score_seiso'] ?? 0)));
            $s4 = max(0, min(20, (int)($input['score_seiketsu'] ?? 0)));
            $s5 = max(0, min(20, (int)($input['score_shitsuke'] ?? 0)));
            $remarks = mb_substr(trim((string)($input['remarks'] ?? '')), 0, 500, 'UTF-8');

            $categories = $input['categories'] ?? [];
            $captions = $input['captions'] ?? [];
            if (!is_array($categories)) $categories = [$categories];
            if (!is_array($captions)) $captions = [$captions];

            $pdo->beginTransaction();
            if ($roundId <= 0) {
                if ($auditLineInput === '' || !preg_match('/^\d{4}-\d{2}$/', $evalPeriodInput)) {
                    throw new InvalidArgumentException('กรุณาระบุสายการผลิตและงวดเดือน (YYYY-MM) ให้ถูกต้อง');
                }
                $mat = ensure5sRoundFromDefault($pdo, $evalPeriodInput, $auditLineInput, $selfEmpId ?: $auditorEmpId, $auditDateInput);
                $roundId = (int)$mat['round_id'];
            }

            $stmtRound = $pdo->prepare('SELECT * FROM dbo.AUDIT_5S_ROUNDS WHERE round_id = ?');
            $stmtRound->execute([$roundId]);
            $round = $stmtRound->fetch(PDO::FETCH_ASSOC);
            if (!$round) {
                throw new InvalidArgumentException('ไม่พบรอบตรวจ 5ส ที่ระบุ');
            }
            if ($round['status'] === 'LOCKED') {
                throw new InvalidArgumentException('รอบตรวจ 5ส นี้ถูกล็อกปิดผลแล้ว ไม่สามารถแก้ไขคะแนนได้');
            }

            $stmtMember = $pdo->prepare('SELECT * FROM dbo.AUDIT_5S_COMMITTEE WHERE round_id = ? AND auditor_emp_id = ?');
            $stmtMember->execute([$roundId, $auditorEmpId]);
            $member = $stmtMember->fetch(PDO::FETCH_ASSOC);

            if (!$member) {
                $defRoster = fetchDefault5sCommittee($pdo, true);
                foreach ($defRoster as $dm) {
                    if (trim((string)$dm['auditor_emp_id']) === $auditorEmpId && isLineCoveredBy5sScope((string)$round['line'], $dm['assigned_lines_list'] ?? ['ALL'])) {
                        ensure5sRoundFromDefault($pdo, (string)$round['eval_period'], (string)$round['line'], $selfEmpId ?: $auditorEmpId);
                        $stmtMember->execute([$roundId, $auditorEmpId]);
                        $member = $stmtMember->fetch(PDO::FETCH_ASSOC);
                        break;
                    }
                }
            }
            if (!$member) {
                if ($pdo->inTransaction()) {
                    $pdo->rollBack();
                }
                mpJsonError('คุณไม่ได้อยู่ในรายชื่อคณะกรรมการของรอบตรวจ 5ส นี้', 403);
            }
            $existingAuditId = (int)($member['audit_id'] ?? 0);
            $oldAudit = null;

            if ($existingAuditId > 0) {
                $stmtOldA = $pdo->prepare('SELECT audit_id, score_seiri, score_seiton, score_seiso, score_seiketsu, score_shitsuke, total_score, remarks FROM dbo.AUDIT_5S WHERE audit_id = ?');
                $stmtOldA->execute([$existingAuditId]);
                $oldAudit = $stmtOldA->fetch(PDO::FETCH_ASSOC);
                $pdo->prepare("
                    UPDATE dbo.AUDIT_5S
                    SET score_seiri = ?, score_seiton = ?, score_seiso = ?, score_seiketsu = ?, score_shitsuke = ?,
                        remarks = ?, auditor_weight = ?, status = 'SUBMITTED'
                    WHERE audit_id = ?
                ")->execute([$s1, $s2, $s3, $s4, $s5, $remarks, (float)$member['weight_pct'], $existingAuditId]);
                $auditId = $existingAuditId;
            } else {
                $pdo->prepare("
                    INSERT INTO dbo.AUDIT_5S
                    (line, audit_date, auditor_emp_id, score_seiri, score_seiton, score_seiso, score_seiketsu, score_shitsuke, remarks, round_id, auditor_weight, status, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'SUBMITTED', GETDATE())
                ")->execute([
                    $round['line'], $round['audit_date'], $auditorEmpId,
                    $s1, $s2, $s3, $s4, $s5, $remarks, $roundId, (float)$member['weight_pct']
                ]);
                $auditId = (int)$pdo->lastInsertId();
            }

            $uploadedPhotos = [];
            if (!empty($_FILES['photos'])) {
                $uploadedPhotos = save5sPhotoUploads($_FILES['photos'], $roundId, $auditId, $categories, $captions);
                $insPhoto = $pdo->prepare("
                    INSERT INTO dbo.AUDIT_5S_PHOTOS (audit_id, round_id, category_5s, file_name, file_path, original_name, caption, uploaded_by)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ");
                foreach ($uploadedPhotos as $ph) {
                    $insPhoto->execute([
                        $auditId, $roundId, $ph['category_5s'], $ph['file_name'], $ph['file_path'],
                        $ph['original_name'], $ph['caption'], $auditorEmpId
                    ]);
                }
            }

            $pdo->prepare('
                UPDATE dbo.AUDIT_5S_COMMITTEE
                SET is_completed = 1, audit_id = ?, submitted_at = GETDATE()
                WHERE id = ?
            ')->execute([$auditId, (int)$member['id']]);

            $summary = recompute5sRoundSummary($pdo, $roundId);
            $newTotal = $s1 + $s2 + $s3 + $s4 + $s5;
            writeLog($pdo, $oldAudit ? 'UPDATE' : 'CREATE', 'AUDIT_5S_COMMITTEE_SUBMIT', (string)$auditId, $oldAudit, [
                'round_id' => $roundId, 'auditor_emp_id' => $auditorEmpId, 'total_score' => $newTotal,
                'photos_uploaded' => count($uploadedPhotos),
            ], "5S committee audit submitted by {$auditorEmpId} (Round #{$roundId}, Score {$newTotal}/100)");

            $pdo->commit();
            mpJsonSuccess([
                'round_id' => $roundId,
                'audit_id' => $auditId,
                'total_score' => $newTotal,
                'grade' => scoreTo5sGrade($newTotal),
                'photos_uploaded' => count($uploadedPhotos),
                'round_summary' => $summary,
            ], 'ส่งผลตรวจ 5ส และหลักฐานภาพถ่ายเรียบร้อยแล้ว');

        case 'toggle_5s_round_lock':
            if (!$isManager) {
                mpJsonError('สงวนสิทธิ์เฉพาะผู้ดูแลระบบ', 403);
            }
            $roundId = (int)($input['round_id'] ?? 0);
            $lock = !empty($input['lock']);
            $stmtR = $pdo->prepare('SELECT status, required_auditors, submitted_count FROM dbo.AUDIT_5S_ROUNDS WHERE round_id = ?');
            $stmtR->execute([$roundId]);
            $r = $stmtR->fetch(PDO::FETCH_ASSOC);
            if (!$r) {
                throw new InvalidArgumentException('ไม่พบรอบตรวจ 5ส ที่ระบุ');
            }
            $nextStatus = $lock ? 'LOCKED' : (((int)$r['submitted_count'] >= (int)$r['required_auditors']) ? 'COMPLETED' : 'OPEN');
            $pdo->prepare('UPDATE dbo.AUDIT_5S_ROUNDS SET status = ?, updated_at = GETDATE() WHERE round_id = ?')->execute([$nextStatus, $roundId]);
            writeLog($pdo, 'UPDATE', 'AUDIT_5S_ROUND_LOCK', (string)$roundId, ['status' => $r['status']], ['status' => $nextStatus], "Set 5S round #{$roundId} status to {$nextStatus}");
            mpJsonSuccess(['round_id' => $roundId, 'status' => $nextStatus], $lock ? 'ล็อกปิดผลรอบตรวจ 5ส แล้ว' : 'ปลดล็อกรอบตรวจ 5ส แล้ว');

        case 'delete_5s_round':
            if (!$isManager) {
                mpJsonError('สงวนสิทธิ์เฉพาะผู้ดูแลระบบในการลบรอบตรวจ 5ส', 403);
            }
            $roundId = (int)($input['round_id'] ?? 0);
            if ($roundId <= 0) {
                throw new InvalidArgumentException('กรุณาระบุรหัสรอบตรวจ 5ส ที่ต้องการลบ');
            }
            $stmtR = $pdo->prepare('SELECT * FROM dbo.AUDIT_5S_ROUNDS WHERE round_id = ?');
            $stmtR->execute([$roundId]);
            $oldRound = $stmtR->fetch(PDO::FETCH_ASSOC);
            if (!$oldRound) {
                throw new InvalidArgumentException('ไม่พบรอบตรวจ 5ส ที่ต้องการลบ');
            }
            if ($oldRound['status'] === 'LOCKED') {
                throw new InvalidArgumentException('รอบตรวจนี้ถูกล็อกปิดผลแล้ว กรุณาปลดล็อกก่อนลบรอบตรวจ');
            }

            $stmtPh = $pdo->prepare('SELECT file_name FROM dbo.AUDIT_5S_PHOTOS WHERE round_id = ?');
            $stmtPh->execute([$roundId]);
            $photoFiles = $stmtPh->fetchAll(PDO::FETCH_COLUMN);

            $pdo->beginTransaction();
            $pdo->prepare('DELETE FROM dbo.AUDIT_5S_PHOTOS WHERE round_id = ?')->execute([$roundId]);
            $pdo->prepare('DELETE FROM dbo.AUDIT_5S_COMMITTEE WHERE round_id = ?')->execute([$roundId]);
            $pdo->prepare('DELETE FROM dbo.AUDIT_5S WHERE round_id = ?')->execute([$roundId]);
            $pdo->prepare('DELETE FROM dbo.AUDIT_5S_ROUNDS WHERE round_id = ?')->execute([$roundId]);
            writeLog($pdo, 'DELETE', 'AUDIT_5S_ROUND', (string)$roundId, $oldRound, null, "Deleted 5S round #{$roundId} ({$oldRound['line']} - {$oldRound['eval_period']})");
            $pdo->commit();

            foreach ($photoFiles as $fn) {
                $cleanFn = basename((string)$fn);
                foreach (resolve5sUploadSearchDirs() as $baseDir) {
                    $p = $baseDir . DIRECTORY_SEPARATOR . '5s_audits' . DIRECTORY_SEPARATOR . $cleanFn;
                    if (is_file($p)) {
                        @unlink($p);
                    }
                }
            }
            mpJsonSuccess(['round_id' => $roundId], "ลบรอบตรวจ 5ส ({$oldRound['line']}) เรียบร้อยแล้ว");

        case 'delete_5s_photo':
            $photoId = (int)($input['photo_id'] ?? 0);
            if ($photoId <= 0) {
                throw new InvalidArgumentException('กรุณาระบุรหัสรูปภาพที่ต้องการลบ');
            }
            $stmtP = $pdo->prepare("
                SELECT P.*, R.status AS round_status
                FROM dbo.AUDIT_5S_PHOTOS P WITH (NOLOCK)
                LEFT JOIN dbo.AUDIT_5S_ROUNDS R WITH (NOLOCK) ON P.round_id = R.round_id
                WHERE P.photo_id = ?
            ");
            $stmtP->execute([$photoId]);
            $photo = $stmtP->fetch(PDO::FETCH_ASSOC);
            if (!$photo) {
                throw new InvalidArgumentException('ไม่พบรูปภาพที่ต้องการลบ');
            }
            if (($photo['round_status'] ?? '') === 'LOCKED') {
                throw new InvalidArgumentException('รอบตรวจถูกล็อกแล้ว ไม่สามารถลบรูปภาพได้');
            }
            $isOwner = ($selfEmpId !== '' && trim((string)($photo['uploaded_by'] ?? '')) === $selfEmpId);
            if (!$isManager && !$isOwner) {
                mpJsonError('คุณไม่มีสิทธิ์ลบรูปภาพของกรรมการท่านอื่น', 403);
            }

            $pdo->beginTransaction();
            $pdo->prepare('DELETE FROM dbo.AUDIT_5S_PHOTOS WHERE photo_id = ?')->execute([$photoId]);
            writeLog($pdo, 'DELETE', 'AUDIT_5S_PHOTO', (string)$photoId, $photo, null, "Deleted 5S evidence photo #{$photoId}");
            $pdo->commit();

            $cleanFn = basename((string)($photo['file_name'] ?? ''));
            if ($cleanFn !== '') {
                foreach (resolve5sUploadSearchDirs() as $baseDir) {
                    $p = $baseDir . DIRECTORY_SEPARATOR . '5s_audits' . DIRECTORY_SEPARATOR . $cleanFn;
                    if (is_file($p)) {
                        @unlink($p);
                    }
                }
            }
            mpJsonSuccess(['photo_id' => $photoId], 'ลบรูปภาพหลักฐาน 5ส เรียบร้อยแล้ว');

        default:
            throw new InvalidArgumentException('ไม่พบคำสั่งที่ระบุ');
    }
} catch (Throwable $e) {
    handleMpException($pdo, 'AUDIT_5S_API', $e, $input);
}
