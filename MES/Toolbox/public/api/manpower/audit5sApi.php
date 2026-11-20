<?php
/**
 * Multi-Auditor 5S Committee Round & Photo Evidence API (3-5 Equal-Weight Auditors + Blind Audit).
 * - Admins/Managers create 5S audit rounds with 3-5 committee members & inspect all photos/scores.
 * - Appointed committee members view their own assigned rounds, upload evidence photos (outside page/),
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
            $period = trim((string)($input['eval_period'] ?? ''));
            $where = ['1=1'];
            $params = [];
            if ($period !== '' && preg_match('/^\d{4}-\d{2}$/', $period)) {
                $where[] = 'R.eval_period = ?';
                $params[] = $period;
            }
            if (!$isManager) {
                if ($selfEmpId === '') {
                    mpJsonSuccess(['rounds' => [], 'is_committee_member' => false, 'is_manager' => false]);
                }
                $where[] = 'C.auditor_emp_id = ?';
                $params[] = $selfEmpId;
            }
            $whereSql = implode(' AND ', $where);
            $stmt = $pdo->prepare("
                SELECT TOP (200)
                    R.round_id, R.eval_period, R.line, R.round_name,
                    CONVERT(VARCHAR(10), R.audit_date, 120) AS audit_date,
                    R.required_auditors, R.submitted_count, R.status,
                    R.weighted_score, R.final_grade, R.notes, R.created_at,
                    C.id AS committee_id, C.assigned_role, C.is_completed AS my_is_completed,
                    C.audit_id AS my_audit_id, C.submitted_at AS my_submitted_at
                FROM dbo.AUDIT_5S_ROUNDS R WITH (NOLOCK)
                LEFT JOIN dbo.AUDIT_5S_COMMITTEE C WITH (NOLOCK)
                    ON C.round_id = R.round_id AND C.auditor_emp_id = ?
                WHERE {$whereSql}
                  AND (? = 1 OR C.id IS NOT NULL)
                ORDER BY R.audit_date DESC, R.round_id DESC
            ");
            $stmt->execute(array_merge([$selfEmpId], $params, [$isManager ? 1 : 0]));
            $rounds = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $stmtCnt = $pdo->prepare('SELECT COUNT(*) FROM dbo.AUDIT_5S_COMMITTEE WITH (NOLOCK) WHERE auditor_emp_id = ?');
            $stmtCnt->execute([$selfEmpId]);
            $isCommittee = ((int)$stmtCnt->fetchColumn() > 0);

            mpJsonSuccess([
                'rounds' => $rounds,
                'is_committee_member' => $isCommittee,
                'is_manager' => $isManager,
                'self_emp_id' => $selfEmpId,
            ]);

        case 'get_5s_round_detail':
            $roundId = (int)($input['round_id'] ?? 0);
            if ($roundId <= 0) {
                throw new InvalidArgumentException('ไม่พบรหัสรอบตรวจ 5ส');
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

            mpJsonSuccess([
                'round' => $round,
                'committee' => $members,
                'blind_mode' => !$canRevealPeers,
            ]);

        case 'get_auditor_candidates':
            if (!$isManager) {
                mpJsonError('สงวนสิทธิ์เฉพาะผู้ดูแลระบบในการแต่งตั้งคณะกรรมการ 5ส', 403);
            }
            $q = trim((string)($input['q'] ?? ''));
            $where = ['E.is_active = 1'];
            $params = [];
            if ($q !== '') {
                $where[] = '(E.emp_id LIKE ? OR E.name_th LIKE ? OR E.line LIKE ? OR E.position LIKE ?)';
                $like = "%{$q}%";
                array_push($params, $like, $like, $like, $like);
            }
            $whereSql = implode(' AND ', $where);
            $stmt = $pdo->prepare("
                SELECT TOP (120) E.emp_id, E.name_th, E.position, E.line, E.department_api,
                       MAX(U.username) AS username, MAX(U.role) AS sys_role
                FROM dbo.MANPOWER_EMPLOYEES E WITH (NOLOCK)
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
            if ($reqCount < 3 || $reqCount > 5) {
                throw new InvalidArgumentException('คณะกรรมการตรวจ 5ส ต้องมีจำนวนตั้งแต่ 3 ถึง 5 คนเพื่อป้องกันอคติ');
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
            if ($roundId <= 0) {
                throw new InvalidArgumentException('ไม่พบรหัสรอบตรวจ 5ส');
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

            $auditorEmpId = $isManager && !empty($input['auditor_emp_id'])
                ? trim((string)$input['auditor_emp_id'])
                : $selfEmpId;
            if ($auditorEmpId === '') {
                throw new InvalidArgumentException('บัญชีผู้ใช้งานนี้ยังไม่มีรหัสพนักงานสำหรับบันทึกผลตรวจ');
            }

            $stmtMember = $pdo->prepare('SELECT * FROM dbo.AUDIT_5S_COMMITTEE WHERE round_id = ? AND auditor_emp_id = ?');
            $stmtMember->execute([$roundId, $auditorEmpId]);
            $member = $stmtMember->fetch(PDO::FETCH_ASSOC);
            if (!$member) {
                mpJsonError('คุณไม่ได้อยู่ในรายชื่อคณะกรรมการของรอบตรวจ 5ส นี้', 403);
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

        default:
            throw new InvalidArgumentException('ไม่พบคำสั่งที่ระบุ');
    }
} catch (Throwable $e) {
    handleMpException($pdo, 'AUDIT_5S_API', $e, $input);
}
