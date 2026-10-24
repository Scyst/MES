<?php
/**
 * iqs_api.php — In-process Quality System (IQS) API
 * Path: MES/MES/page/IQS/api/iqs_api.php
 * Handles Round management, Machine checklist records, Photo uploads, Audit logging.
 */

require_once __DIR__ . '/../../../auth/check_auth.php';
require_once __DIR__ . '/../../db.php';

header('Content-Type: application/json; charset=utf-8');

// Standardized API response
function jsonSuccess($data = null, string $message = 'Success') {
    echo json_encode(['success' => true, 'data' => $data, 'message' => $message], JSON_UNESCAPED_UNICODE);
    exit;
}

function jsonError(string $message, int $statusCode = 400, $data = null) {
    http_response_code($statusCode);
    echo json_encode(['success' => false, 'data' => $data, 'message' => $message], JSON_UNESCAPED_UNICODE);
    exit;
}

// CSRF validation for state-mutating requests
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $clientToken = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? $_POST['csrf_token'] ?? '';
    $sessionToken = $_SESSION['csrf_token'] ?? '';
    if (empty($sessionToken) || !hash_equals($sessionToken, $clientToken)) {
        jsonError('CSRF token validation failed.', 403);
    }
}

$action = $_GET['action'] ?? $_POST['action'] ?? '';
$currentUser = $_SESSION['user'] ?? null;
$userId = (int)($currentUser['id'] ?? 0);
$userFullname = $currentUser['fullname'] ?? ($currentUser['username'] ?? 'System');

if (!$userId) {
    jsonError('Unauthorized user session.', 401);
}

// Helper function: Compute live inspection status for standard daily time slots
function computeSlotStatuses(PDO $pdo, array $templates): array {
    $stmtNow = $pdo->query("SELECT CONVERT(varchar(5), GETDATE(), 108) AS cur_time, CAST(GETDATE() AS date) AS cur_date");
    $nowRow = $stmtNow->fetch(PDO::FETCH_ASSOC);
    $curTimeStr = $nowRow['cur_time'] ?? date('H:i');
    $curDate = $nowRow['cur_date'] ?? date('Y-m-d');

    list($curH, $curM) = explode(':', $curTimeStr);
    $curMins = (int)$curH * 60 + (int)$curM;

    // Fetch all rounds conducted today
    $stmtRounds = $pdo->prepare("
        SELECT round_id, round_number, template_id, round_name, shift, status,
               CONVERT(varchar(5), started_at, 108) AS start_time,
               CONVERT(varchar(5), submitted_at, 108) AS submit_time
        FROM dbo.IQS_ROUNDS
        WHERE plan_date = :cur_date
    ");
    $stmtRounds->execute([':cur_date' => $curDate]);
    $todayRounds = $stmtRounds->fetchAll(PDO::FETCH_ASSOC);

    // Index rounds by template_id
    $roundsByTemplate = [];
    foreach ($todayRounds as $r) {
        if (!empty($r['template_id'])) {
            $roundsByTemplate[$r['template_id']] = $r;
        }
    }

    $slotList = [];
    $missedCount = 0;
    $missedList = [];
    $completedCount = 0;

    foreach ($templates as $t) {
        $tid = (int)$t['template_id'];
        $stdTime = $t['std_time'];
        list($sh, $sm) = explode(':', $stdTime);
        $stdMins = (int)$sh * 60 + (int)$sm;

        $existingRound = $roundsByTemplate[$tid] ?? null;
        $status = 'UPCOMING';
        $statusLabel = 'ยังไม่ถึงเวลา';
        $badgeClass = 'bg-secondary-subtle text-secondary';
        $roundInfo = null;

        if ($existingRound) {
            $rStatus = $existingRound['status'];
            $roundInfo = [
                'round_id' => (int)$existingRound['round_id'],
                'round_number' => $existingRound['round_number'],
                'status' => $rStatus,
                'start_time' => $existingRound['start_time'],
                'submit_time' => $existingRound['submit_time']
            ];
            if ($rStatus === 'OPEN') {
                $status = 'IN_PROGRESS';
                $statusLabel = 'กำลังตรวจ';
                $badgeClass = 'bg-primary-subtle text-primary border border-primary-subtle';
            } else {
                $status = 'COMPLETED';
                $statusLabel = ($rStatus === 'COMPLETED_WITH_NG') ? 'ตรวจแล้ว (พบ NG)' : 'ตรวจแล้ว (ผ่าน)';
                $badgeClass = ($rStatus === 'COMPLETED_WITH_NG') ? 'bg-danger-subtle text-danger border border-danger-subtle' : 'bg-success-subtle text-success border border-success-subtle';
                $completedCount++;
            }
        } else {
            // Window calculation: [std_time - 30m, std_time + 60m]
            $windowStart = $stdMins - 30;
            $windowEnd = $stdMins + 60;

            if ($stdMins < 360) {
                // Night slot (e.g. 02:30)
                if ($curMins < 360) {
                    if ($curMins >= $windowStart && $curMins <= $windowEnd) {
                        $status = 'DUE_NOW';
                        $statusLabel = 'ถึงเวลาตรวจ (Due)';
                        $badgeClass = 'bg-warning-subtle text-warning-emphasis border border-warning-subtle iqs-pulse-badge';
                    } elseif ($curMins > $windowEnd) {
                        $status = 'MISSED';
                        $statusLabel = 'ขาดการตรวจ (เลยเวลา)';
                        $badgeClass = 'bg-danger-subtle text-danger border border-danger-subtle';
                        $missedCount++;
                        $missedList[] = $t['template_name'];
                    } else {
                        $status = 'UPCOMING';
                        $statusLabel = 'ยังไม่ถึงเวลา';
                        $badgeClass = 'bg-secondary-subtle text-secondary';
                    }
                } else {
                    $status = 'UPCOMING';
                    $statusLabel = 'รอบกะดึก';
                    $badgeClass = 'bg-secondary-subtle text-secondary';
                }
            } else {
                // Day & OT slots (08:30, 10:30, 13:00, 15:30, 20:30, 22:30)
                if ($curMins >= $windowStart && $curMins <= $windowEnd) {
                    $status = 'DUE_NOW';
                    $statusLabel = 'ถึงเวลาตรวจ (Due)';
                    $badgeClass = 'bg-warning-subtle text-warning-emphasis border border-warning-subtle iqs-pulse-badge';
                } elseif ($curMins > $windowEnd) {
                    $status = 'MISSED';
                    $statusLabel = 'ขาดการตรวจ (เลยเวลา)';
                    $badgeClass = 'bg-danger-subtle text-danger border border-danger-subtle';
                    $missedCount++;
                    $missedList[] = $t['template_name'];
                } else {
                    $status = 'UPCOMING';
                    $statusLabel = 'ยังไม่ถึงเวลา';
                    $badgeClass = 'bg-secondary-subtle text-secondary';
                }
            }
        }

        $slotList[] = [
            'template_id' => $tid,
            'template_code' => $t['template_code'],
            'template_name' => $t['template_name'],
            'std_time' => $stdTime,
            'shift' => $t['shift'],
            'status' => $status,
            'status_label' => $statusLabel,
            'badge_class' => $badgeClass,
            'round' => $roundInfo,
            'is_missed' => ($status === 'MISSED'),
            'is_due' => ($status === 'DUE_NOW')
        ];
    }

    return [
        'slots' => $slotList,
        'summary' => [
            'cur_server_time' => $curTimeStr,
            'cur_server_date' => $curDate,
            'total_slots' => count($templates),
            'completed_count' => $completedCount,
            'missed_count' => $missedCount,
            'missed_list' => $missedList,
            'has_missed' => ($missedCount > 0)
        ]
    ];
}

// Helper function: Find active OPEN round or auto-create a standard round for the machine's line
function getOrAutoCreateRound(PDO $pdo, string $line, int $userId, string $userFullname): int {
    $curDate = date('Y-m-d');
    $curTime = date('H:i');
    list($curH, $curM) = explode(':', $curTime);
    $curMins = (int)$curH * 60 + (int)$curM;

    // Check if there is already an active OPEN round for today in this line
    $stmtOpen = $pdo->prepare("
        SELECT TOP 1 round_id 
        FROM dbo.IQS_ROUNDS 
        WHERE plan_date = :cur_date AND line = :line AND status = 'OPEN'
        ORDER BY round_id DESC
    ");
    $stmtOpen->execute([':cur_date' => $curDate, ':line' => $line]);
    $openRoundId = $stmtOpen->fetchColumn();

    if ($openRoundId) {
        return (int)$openRoundId;
    }

    // If none is OPEN, find matching template by closest time slot
    $stmtTpl = $pdo->query("
        SELECT template_id, template_code, template_name, CONVERT(varchar(5), std_time, 108) AS std_time, shift 
        FROM dbo.IQS_ROUND_TEMPLATES 
        WHERE is_active = 1 
        ORDER BY sort_order ASC
    ");
    $templates = $stmtTpl->fetchAll(PDO::FETCH_ASSOC);

    $matchedTemplate = null;
    $closestDiff = 999999;
    foreach ($templates as $tpl) {
        list($th, $tm) = explode(':', $tpl['std_time']);
        $tMins = (int)$th * 60 + (int)$tm;
        $diff = abs($curMins - $tMins);
        if ($diff < $closestDiff) {
            $closestDiff = $diff;
            $matchedTemplate = $tpl;
        }
    }

    if (!$matchedTemplate) {
        $matchedTemplate = [
            'template_id' => 1,
            'template_name' => 'รอบเช้า (08:30)',
            'shift' => 'Day'
        ];
    }

    // Determine sequence number for today
    $stmtSeq = $pdo->prepare("SELECT COUNT(*) FROM dbo.IQS_ROUNDS WHERE plan_date = :cur_date AND line = :line");
    $stmtSeq->execute([':cur_date' => $curDate, ':line' => $line]);
    $seq = ((int)$stmtSeq->fetchColumn()) + 1;

    $roundNumber = sprintf('IQS-%s-%s-%02d', date('Ymd'), strtoupper($line), $seq);
    $roundName = sprintf('%s - %s', $matchedTemplate['template_name'], strtoupper($line));

    $insStmt = $pdo->prepare("
        INSERT INTO dbo.IQS_ROUNDS (
            round_number, plan_date, template_id, round_name, line, shift,
            primary_tester_id, status, started_at
        ) VALUES (
            :round_number, :plan_date, :template_id, :round_name, :line, :shift,
            :primary_tester_id, 'OPEN', GETDATE()
        )
    ");
    $insStmt->execute([
        ':round_number' => $roundNumber,
        ':plan_date' => $curDate,
        ':template_id' => $matchedTemplate['template_id'],
        ':round_name' => $roundName,
        ':line' => $line,
        ':shift' => $matchedTemplate['shift'],
        ':primary_tester_id' => $userId
    ]);

    $newRoundId = (int)$pdo->lastInsertId();

    // Audit log
    $auditStmt = $pdo->prepare("
        INSERT INTO dbo.IQS_AUDIT_LOGS (round_id, action_type, user_id, user_fullname, new_data, ip_address)
        VALUES (:round_id, 'AUTO_CREATE_ROUND', :user_id, :user_fullname, :new_data, :ip)
    ");
    $auditStmt->execute([
        ':round_id' => $newRoundId,
        ':user_id' => $userId,
        ':user_fullname' => $userFullname,
        ':new_data' => json_encode(['round_number' => $roundNumber, 'line' => $line, 'auto_created' => true], JSON_UNESCAPED_UNICODE),
        ':ip' => $_SERVER['REMOTE_ADDR'] ?? ''
    ]);

    return $newRoundId;
}

try {
    switch ($action) {

        // -------------------------------------------------------------
        // 1. GET INITIAL DATA (Templates, Multi-Line Machines, Today's Records)
        // -------------------------------------------------------------
        case 'get_initial_data':
            // 1.1 Round templates
            $stmtTemplates = $pdo->query("
                SELECT template_id, template_code, template_name, 
                       CONVERT(varchar(5), std_time, 108) AS std_time, shift, sort_order
                FROM dbo.IQS_ROUND_TEMPLATES 
                WHERE is_active = 1 
                ORDER BY sort_order ASC
            ");
            $templates = $stmtTemplates->fetchAll(PDO::FETCH_ASSOC);

            // Compute live slot compliance & missed round checks
            $slotData = computeSlotStatuses($pdo, $templates);

            // 1.2 Multi-line machines (SPOT, BEND, PRESS from PE_MACHINES)
            $stmtMachines = $pdo->query("
                SELECT machine_id, machine_code, machine_name, 
                       CASE 
                           WHEN line = 'BEND' OR machine_type LIKE '%Bend%' OR machine_name LIKE '%Bend%' THEN 'BEND'
                           WHEN line = 'PRESS' OR machine_type LIKE '%Press%' OR machine_name LIKE '%Press%' THEN 'PRESS'
                           ELSE 'SPOT'
                       END AS line_group,
                       line, area, machine_type,
                       ISNULL(map_x, 0) AS map_x, ISNULL(map_y, 0) AS map_y
                FROM dbo.PE_MACHINES
                WHERE is_active = 1 AND (line IN ('SPOT', 'BEND', 'PRESS') OR machine_type LIKE '%Spot%' OR machine_name LIKE '%Spot%')
                ORDER BY machine_code ASC
            ");
            $machines = $stmtMachines->fetchAll(PDO::FETCH_ASSOC);

            // 1.3 Today's records for all machines (so machine cards show live status immediately)
            $curDate = date('Y-m-d');
            $stmtTodayRecs = $pdo->prepare("
                SELECT rec.record_id, rec.round_id, rec.machine_id, rec.machine_code,
                       rec.sku, rec.po_no, rec.thickness, rec.pull_result,
                       rec.knock_check_val, rec.distance_check_val,
                       rec.custom_check_val_1, rec.custom_check_val_2, rec.custom_check_text,
                       CONVERT(varchar(19), rec.recorded_at, 120) AS recorded_at,
                       rec.is_skipped, rec.skip_reason, rec.ng_status, rec.ng_remark,
                       r.round_number, r.round_name, r.line AS round_line
                FROM dbo.IQS_TEST_RECORDS rec
                JOIN dbo.IQS_ROUNDS r ON rec.round_id = r.round_id
                WHERE r.plan_date = :cur_date
                ORDER BY rec.recorded_at DESC
            ");
            $stmtTodayRecs->execute([':cur_date' => $curDate]);
            $todayRecs = $stmtTodayRecs->fetchAll(PDO::FETCH_ASSOC);

            $latestRecByMachine = [];
            foreach ($todayRecs as $tr) {
                $mid = (int)$tr['machine_id'];
                if (!isset($latestRecByMachine[$mid])) {
                    $latestRecByMachine[$mid] = $tr;
                }
            }

            // Attachments for today's records
            if (!empty($latestRecByMachine)) {
                $recIds = array_column($latestRecByMachine, 'record_id');
                $inClause = implode(',', array_map('intval', $recIds));
                $stmtAtt = $pdo->query("
                    SELECT attach_id, record_id, attach_type, file_path, file_name, file_size
                    FROM dbo.IQS_ATTACHMENTS
                    WHERE record_id IN ($inClause)
                ");
                $allAtts = $stmtAtt->fetchAll(PDO::FETCH_ASSOC);
                $attByRec = [];
                foreach ($allAtts as $att) {
                    $attByRec[$att['record_id']][] = $att;
                }
                foreach ($latestRecByMachine as &$lRec) {
                    $lRec['attachments'] = $attByRec[$lRec['record_id']] ?? [];
                }
            }

            // 1.4 Active Users for co-testers
            $stmtUsers = $pdo->query("
                SELECT id, username, fullname, role, team_group 
                FROM dbo.USERS 
                WHERE is_active = 1 
                ORDER BY fullname ASC
            ");
            $users = $stmtUsers->fetchAll(PDO::FETCH_ASSOC);

            jsonSuccess([
                'templates' => $templates,
                'slot_statuses' => $slotData['slots'],
                'slot_summary' => $slotData['summary'],
                'machines' => $machines,
                'today_records' => $latestRecByMachine,
                'users' => $users,
                'current_user' => [
                    'id' => $userId,
                    'fullname' => $userFullname,
                    'username' => $currentUser['username'] ?? '',
                    'role' => $currentUser['role'] ?? ''
                ]
            ]);
            break;

        // -------------------------------------------------------------
        // 2. GET ACTIVE ROUND (Current open round for today if any)
        // -------------------------------------------------------------
        case 'get_active_round':
            $stmt = $pdo->prepare("
                SELECT TOP 1 r.round_id, r.round_number, r.plan_date, r.template_id, r.round_name,
                             r.shift, r.primary_tester_id, r.co_tester_id_1, r.co_tester_id_2,
                             r.status, CONVERT(varchar(19), r.started_at, 120) AS started_at,
                             r.notes,
                             u1.fullname AS primary_tester_name,
                             u2.fullname AS co_tester_name_1,
                             u3.fullname AS co_tester_name_2
                FROM dbo.IQS_ROUNDS r
                LEFT JOIN dbo.USERS u1 ON r.primary_tester_id = u1.id
                LEFT JOIN dbo.USERS u2 ON r.co_tester_id_1 = u2.id
                LEFT JOIN dbo.USERS u3 ON r.co_tester_id_2 = u3.id
                WHERE r.status = 'OPEN'
                ORDER BY r.round_id DESC
            ");
            $stmt->execute();
            $round = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$round) {
                jsonSuccess(null, 'No active open round found.');
            }

            // Fetch records for this round
            $roundId = (int)$round['round_id'];
            $stmtRecs = $pdo->prepare("
                SELECT rec.record_id, rec.round_id, rec.machine_id, rec.machine_code,
                       rec.sku, rec.po_no, rec.thickness, rec.pull_result,
                       rec.knock_check_val, rec.distance_check_val,
                       rec.custom_check_val_1, rec.custom_check_val_2, rec.custom_check_text,
                       CONVERT(varchar(19), rec.recorded_at, 120) AS recorded_at,
                       rec.is_skipped, rec.skip_reason, rec.ng_status, rec.ng_remark,
                       m.machine_name
                FROM dbo.IQS_TEST_RECORDS rec
                JOIN dbo.PE_MACHINES m ON rec.machine_id = m.machine_id
                WHERE rec.round_id = :round_id
                ORDER BY rec.machine_code ASC
            ");
            $stmtRecs->execute([':round_id' => $roundId]);
            $records = $stmtRecs->fetchAll(PDO::FETCH_ASSOC);

            // Fetch attachments for these records
            $stmtAttach = $pdo->prepare("
                SELECT a.attach_id, a.record_id, a.attach_type, a.file_path, a.file_name, a.file_size, a.uploaded_at
                FROM dbo.IQS_ATTACHMENTS a
                JOIN dbo.IQS_TEST_RECORDS rec ON a.record_id = rec.record_id
                WHERE rec.round_id = :round_id
            ");
            $stmtAttach->execute([':round_id' => $roundId]);
            $attachments = $stmtAttach->fetchAll(PDO::FETCH_ASSOC);

            // Group attachments by record_id
            $attachByRecord = [];
            foreach ($attachments as $att) {
                $attachByRecord[$att['record_id']][] = $att;
            }

            foreach ($records as &$rec) {
                $rec['attachments'] = $attachByRecord[$rec['record_id']] ?? [];
            }

            jsonSuccess([
                'round' => $round,
                'records' => $records
            ]);
            break;

        // -------------------------------------------------------------
        // 3. CREATE NEW ROUND (Starts a round session)
        // -------------------------------------------------------------
        case 'create_round':
            $templateId = !empty($_POST['template_id']) ? (int)$_POST['template_id'] : null;
            $roundName = trim($_POST['round_name'] ?? '');
            $shift = trim($_POST['shift'] ?? 'Day');
            $coTester1 = !empty($_POST['co_tester_id_1']) ? (int)$_POST['co_tester_id_1'] : null;
            $coTester2 = !empty($_POST['co_tester_id_2']) ? (int)$_POST['co_tester_id_2'] : null;
            $notes = trim($_POST['notes'] ?? '');

            if (empty($roundName)) {
                jsonError('กรุณาระบุชื่อรอบการทดสอบ');
            }

            // Check if there is already an OPEN round
            $checkStmt = $pdo->prepare("SELECT TOP 1 round_id, round_number FROM dbo.IQS_ROUNDS WHERE status = 'OPEN'");
            $checkStmt->execute();
            $existing = $checkStmt->fetch(PDO::FETCH_ASSOC);
            if ($existing) {
                jsonError("มีรอบการทดสอบที่ยังเปิดอยู่ ({$existing['round_number']}) กรุณาบันทึกปิดรอบเดิมก่อนเปิดรอบใหม่");
            }

            // Generate unique round number: IQS-YYYYMMDD-R01
            $todayStr = date('Ymd');
            $stmtCount = $pdo->prepare("SELECT COUNT(*) AS cnt FROM dbo.IQS_ROUNDS WHERE plan_date = CAST(GETDATE() AS DATE)");
            $stmtCount->execute();
            $cnt = ((int)$stmtCount->fetchColumn()) + 1;
            $roundNumber = sprintf("IQS-%s-R%02d", $todayStr, $cnt);

            $pdo->beginTransaction();

            $insertStmt = $pdo->prepare("
                INSERT INTO dbo.IQS_ROUNDS (
                    round_number, plan_date, template_id, round_name, shift,
                    primary_tester_id, co_tester_id_1, co_tester_id_2,
                    status, started_at, notes
                ) VALUES (
                    :round_number, CAST(GETDATE() AS DATE), :template_id, :round_name, :shift,
                    :primary_tester_id, :co_tester_id_1, :co_tester_id_2,
                    'OPEN', GETDATE(), :notes
                )
            ");
            $insertStmt->execute([
                ':round_number' => $roundNumber,
                ':template_id' => $templateId,
                ':round_name' => $roundName,
                ':shift' => $shift,
                ':primary_tester_id' => $userId,
                ':co_tester_id_1' => $coTester1,
                ':co_tester_id_2' => $coTester2,
                ':notes' => $notes ?: null
            ]);

            $newRoundId = (int)$pdo->lastInsertId();

            // Write audit log
            $auditStmt = $pdo->prepare("
                INSERT INTO dbo.IQS_AUDIT_LOGS (round_id, action_type, user_id, user_fullname, new_data, ip_address)
                VALUES (:round_id, 'CREATE_ROUND', :user_id, :user_fullname, :new_data, :ip)
            ");
            $auditStmt->execute([
                ':round_id' => $newRoundId,
                ':user_id' => $userId,
                ':user_fullname' => $userFullname,
                ':new_data' => json_encode(['round_number' => $roundNumber, 'round_name' => $roundName], JSON_UNESCAPED_UNICODE),
                ':ip' => $_SERVER['REMOTE_ADDR'] ?? ''
            ]);

            $pdo->commit();

            jsonSuccess(['round_id' => $newRoundId, 'round_number' => $roundNumber], 'เริ่มรอบการทดสอบเรียบร้อยแล้ว');
            break;

        // -------------------------------------------------------------
        // 4. SAVE TEST RECORD (Machine test line with optional photos)
        // -------------------------------------------------------------
        case 'save_record':
            $roundId = (int)($_POST['round_id'] ?? 0);
            $machineId = (int)($_POST['machine_id'] ?? 0);
            $sku = trim($_POST['sku'] ?? '');
            $poNo = trim($_POST['po_no'] ?? '');
            $thickness = isset($_POST['thickness']) && $_POST['thickness'] !== '' ? (float)$_POST['thickness'] : null;
            $pullResult = strtoupper(trim($_POST['pull_result'] ?? ''));
            $knockCheckVal = isset($_POST['knock_check_val']) && $_POST['knock_check_val'] !== '' ? (float)$_POST['knock_check_val'] : null;
            $distanceCheckVal = isset($_POST['distance_check_val']) && $_POST['distance_check_val'] !== '' ? (float)$_POST['distance_check_val'] : null;
            $customCheckVal1 = isset($_POST['custom_check_val_1']) && $_POST['custom_check_val_1'] !== '' ? (float)$_POST['custom_check_val_1'] : null;
            $customCheckVal2 = isset($_POST['custom_check_val_2']) && $_POST['custom_check_val_2'] !== '' ? (float)$_POST['custom_check_val_2'] : null;
            $customCheckText = trim($_POST['custom_check_text'] ?? '');
            $isSkipped = !empty($_POST['is_skipped']) ? 1 : 0;
            $skipReason = trim($_POST['skip_reason'] ?? '');
            $ngRemark = trim($_POST['ng_remark'] ?? '');

            if (!$machineId) {
                jsonError('กรุณาระบุรหัสเครื่องจักร');
            }

            // Get machine details from PE_MACHINES
            $mCheck = $pdo->prepare("SELECT machine_code, line, machine_name, machine_type FROM dbo.PE_MACHINES WHERE machine_id = :m_id");
            $mCheck->execute([':m_id' => $machineId]);
            $mRow = $mCheck->fetch(PDO::FETCH_ASSOC);
            if (!$mRow) {
                jsonError('ไม่พบข้อมูลเครื่องจักรในระบบ PE_MACHINES');
            }
            $machineCode = $mRow['machine_code'];
            $machineLine = strtoupper($mRow['line'] ?? 'SPOT');
            if (in_array($machineLine, ['BEND', 'PRESS', 'SPOT'])) {
                // exact match
            } elseif (stripos($mRow['machine_name'], 'Bend') !== false || stripos($mRow['machine_type'], 'Bend') !== false) {
                $machineLine = 'BEND';
            } elseif (stripos($mRow['machine_name'], 'Press') !== false || stripos($mRow['machine_type'], 'Press') !== false) {
                $machineLine = 'PRESS';
            } else {
                $machineLine = 'SPOT';
            }

            // Auto-detect or create open round if not provided
            if (!$roundId) {
                $roundId = getOrAutoCreateRound($pdo, $machineLine, $userId, $userFullname);
            }

            // Verify round is still OPEN
            $roundCheck = $pdo->prepare("SELECT status FROM dbo.IQS_ROUNDS WHERE round_id = :round_id");
            $roundCheck->execute([':round_id' => $roundId]);
            $roundStatus = $roundCheck->fetchColumn();
            if ($roundStatus !== 'OPEN') {
                jsonError('รอบการทดสอบนี้ถูกปิดหรือยกเลิกแล้ว ไม่สามารถแก้ไขได้');
            }

            if (!$isSkipped) {
                if (!in_array($pullResult, ['OK', 'NG'])) {
                    jsonError('กรุณาระบุผลทดสอบเป็น OK หรือ NG');
                }
            } else {
                $pullResult = 'SKIP';
            }

            $ngStatus = ($pullResult === 'NG') ? 'PENDING_APPROVAL' : null;

            $pdo->beginTransaction();

            // Check if record already exists for this machine in this round
            $chkRec = $pdo->prepare("SELECT record_id FROM dbo.IQS_TEST_RECORDS WHERE round_id = :r_id AND machine_id = :m_id");
            $chkRec->execute([':r_id' => $roundId, ':m_id' => $machineId]);
            $existingRecId = $chkRec->fetchColumn();

            if ($existingRecId) {
                $recordId = (int)$existingRecId;
                $updateStmt = $pdo->prepare("
                    UPDATE dbo.IQS_TEST_RECORDS SET
                        sku = :sku,
                        po_no = :po_no,
                        thickness = :thickness,
                        pull_result = :pull_result,
                        knock_check_val = :knock_check_val,
                        distance_check_val = :distance_check_val,
                        custom_check_val_1 = :custom_check_val_1,
                        custom_check_val_2 = :custom_check_val_2,
                        custom_check_text = :custom_check_text,
                        is_skipped = :is_skipped,
                        skip_reason = :skip_reason,
                        ng_status = :ng_status,
                        ng_remark = :ng_remark,
                        recorded_at = GETDATE()
                    WHERE record_id = :record_id
                ");
                $updateStmt->execute([
                    ':sku' => $sku ?: null,
                    ':po_no' => $poNo ?: null,
                    ':thickness' => $thickness,
                    ':pull_result' => $pullResult,
                    ':knock_check_val' => $knockCheckVal,
                    ':distance_check_val' => $distanceCheckVal,
                    ':custom_check_val_1' => $customCheckVal1,
                    ':custom_check_val_2' => $customCheckVal2,
                    ':custom_check_text' => $customCheckText ?: null,
                    ':is_skipped' => $isSkipped,
                    ':skip_reason' => $isSkipped ? $skipReason : null,
                    ':ng_status' => $ngStatus,
                    ':ng_remark' => ($pullResult === 'NG') ? $ngRemark : null,
                    ':record_id' => $recordId
                ]);
            } else {
                $insRec = $pdo->prepare("
                    INSERT INTO dbo.IQS_TEST_RECORDS (
                        round_id, machine_id, machine_code, sku, po_no, thickness,
                        pull_result, knock_check_val, distance_check_val,
                        custom_check_val_1, custom_check_val_2, custom_check_text,
                        recorded_at, is_skipped, skip_reason, ng_status, ng_remark
                    ) VALUES (
                        :round_id, :machine_id, :machine_code, :sku, :po_no, :thickness,
                        :pull_result, :knock_check_val, :distance_check_val,
                        :custom_check_val_1, :custom_check_val_2, :custom_check_text,
                        GETDATE(), :is_skipped, :skip_reason, :ng_status, :ng_remark
                    )
                ");
                $insRec->execute([
                    ':round_id' => $roundId,
                    ':machine_id' => $machineId,
                    ':machine_code' => $machineCode,
                    ':sku' => $sku ?: null,
                    ':po_no' => $poNo ?: null,
                    ':thickness' => $thickness,
                    ':pull_result' => $pullResult,
                    ':knock_check_val' => $knockCheckVal,
                    ':distance_check_val' => $distanceCheckVal,
                    ':custom_check_val_1' => $customCheckVal1,
                    ':custom_check_val_2' => $customCheckVal2,
                    ':custom_check_text' => $customCheckText ?: null,
                    ':is_skipped' => $isSkipped,
                    ':skip_reason' => $isSkipped ? $skipReason : null,
                    ':ng_status' => $ngStatus,
                    ':ng_remark' => ($pullResult === 'NG') ? $ngRemark : null
                ]);
                $recordId = (int)$pdo->lastInsertId();
            }

            // Process uploaded files (Pull test photo & Control panel photo)
            $uploadDir = __DIR__ . '/../../../uploads/iqs/' . date('Y-m');
            if (!is_dir($uploadDir)) {
                mkdir($uploadDir, 0755, true);
            }

            $allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
            $fileKeys = [
                'photo_pull' => 'PULL_TEST',
                'photo_panel' => 'CONTROL_PANEL'
            ];

            foreach ($fileKeys as $fileInputName => $attachType) {
                if (!empty($_FILES[$fileInputName]['tmp_name']) && is_uploaded_file($_FILES[$fileInputName]['tmp_name'])) {
                    $tmpPath = $_FILES[$fileInputName]['tmp_name'];
                    $origName = basename($_FILES[$fileInputName]['name']);
                    $fileSize = (int)$_FILES[$fileInputName]['size'];
                    
                    // Validate MIME
                    $finfo = finfo_open(FILEINFO_MIME_TYPE);
                    $mime = finfo_file($finfo, $tmpPath);
                    finfo_close($finfo);

                    if (!in_array($mime, $allowedMimes)) {
                        $pdo->rollBack();
                        jsonError("ไฟล์รูปภาพ {$origName} ไม่ถูกต้อง รองรับเฉพาะ JPG, PNG, WEBP");
                    }

                    if ($fileSize > 15 * 1024 * 1024) { // Max 15MB
                        $pdo->rollBack();
                        jsonError("ขนาดไฟล์ {$origName} เกิน 15MB");
                    }

                    // Compute SHA-256 for audit immutability
                    $sha256 = hash_file('sha256', $tmpPath);

                    $ext = pathinfo($origName, PATHINFO_EXTENSION);
                    $newFileName = sprintf('%s_%d_%s_%s.%s', $machineCode, $recordId, strtolower($attachType), date('Ymd_His'), $ext);
                    $targetPath = $uploadDir . '/' . $newFileName;
                    $relPath = 'uploads/iqs/' . date('Y-m') . '/' . $newFileName;

                    if (move_uploaded_file($tmpPath, $targetPath)) {
                        $insAtt = $pdo->prepare("
                            INSERT INTO dbo.IQS_ATTACHMENTS (
                                record_id, attach_type, file_path, file_name, file_size, sha256_hash, uploaded_at
                            ) VALUES (
                                :rec_id, :type, :path, :name, :size, :hash, GETDATE()
                            )
                        ");
                        $insAtt->execute([
                            ':rec_id' => $recordId,
                            ':type' => $attachType,
                            ':path' => $relPath,
                            ':name' => $origName,
                            ':size' => $fileSize,
                            ':hash' => $sha256
                        ]);
                    }
                }
            }

            // Write audit log
            $auditStmt = $pdo->prepare("
                INSERT INTO dbo.IQS_AUDIT_LOGS (record_id, round_id, action_type, user_id, user_fullname, new_data, ip_address)
                VALUES (:rec_id, :round_id, 'SUBMIT_RECORD', :user_id, :user_fullname, :new_data, :ip)
            ");
            $auditStmt->execute([
                ':rec_id' => $recordId,
                ':round_id' => $roundId,
                ':user_id' => $userId,
                ':user_fullname' => $userFullname,
                ':new_data' => json_encode([
                    'machine_code' => $machineCode,
                    'pull_result' => $pullResult,
                    'sku' => $sku,
                    'is_skipped' => $isSkipped
                ], JSON_UNESCAPED_UNICODE),
                ':ip' => $_SERVER['REMOTE_ADDR'] ?? ''
            ]);

            $pdo->commit();

            jsonSuccess([
                'record_id' => $recordId,
                'round_id' => $roundId,
                'machine_id' => $machineId,
                'machine_code' => $machineCode,
                'sku' => $sku,
                'po_no' => $poNo,
                'thickness' => $thickness,
                'pull_result' => $pullResult,
                'knock_check_val' => $knockCheckVal,
                'distance_check_val' => $distanceCheckVal,
                'custom_check_val_1' => $customCheckVal1,
                'custom_check_val_2' => $customCheckVal2,
                'custom_check_text' => $customCheckText,
                'is_skipped' => $isSkipped,
                'skip_reason' => $isSkipped ? $skipReason : null,
                'ng_status' => $ngStatus,
                'ng_remark' => $ngRemark,
                'recorded_at' => date('Y-m-d H:i:s')
            ], 'บันทึกผลการทดสอบเครื่อง ' . $machineCode . ' เรียบร้อยแล้ว');
            break;

        // -------------------------------------------------------------
        // 5. SUBMIT / CLOSE ROUND (Finalize and lock)
        // -------------------------------------------------------------
        case 'submit_round':
            $roundId = (int)($_POST['round_id'] ?? 0);
            if (!$roundId) {
                jsonError('รหัสรอบไม่ถูกต้อง');
            }

            // Check if there are any records in this round
            $countStmt = $pdo->prepare("SELECT COUNT(*) FROM dbo.IQS_TEST_RECORDS WHERE round_id = :r_id");
            $countStmt->execute([':r_id' => $roundId]);
            $recCount = (int)$countStmt->fetchColumn();

            if ($recCount === 0) {
                jsonError('ยังไม่มีการบันทึกผลการทดสอบเครื่องจักรใดๆ ในรอบนี้ ไม่สามารถปิดรอบได้');
            }

            // Check if there are NG records
            $ngStmt = $pdo->prepare("SELECT COUNT(*) FROM dbo.IQS_TEST_RECORDS WHERE round_id = :r_id AND pull_result = 'NG'");
            $ngStmt->execute([':r_id' => $roundId]);
            $ngCount = (int)$ngStmt->fetchColumn();

            $finalStatus = ($ngCount > 0) ? 'COMPLETED_WITH_NG' : 'SUBMITTED';

            $pdo->beginTransaction();

            $updRound = $pdo->prepare("
                UPDATE dbo.IQS_ROUNDS SET
                    status = :status,
                    submitted_at = GETDATE()
                WHERE round_id = :round_id AND status = 'OPEN'
            ");
            $updRound->execute([':status' => $finalStatus, ':round_id' => $roundId]);

            // Audit
            $audit = $pdo->prepare("
                INSERT INTO dbo.IQS_AUDIT_LOGS (round_id, action_type, user_id, user_fullname, new_data, ip_address)
                VALUES (:round_id, 'SUBMIT_ROUND', :user_id, :user_fullname, :new_data, :ip)
            ");
            $audit->execute([
                ':round_id' => $roundId,
                ':user_id' => $userId,
                ':user_fullname' => $userFullname,
                ':new_data' => json_encode(['final_status' => $finalStatus, 'records_count' => $recCount, 'ng_count' => $ngCount]),
                ':ip' => $_SERVER['REMOTE_ADDR'] ?? ''
            ]);

            $pdo->commit();

            jsonSuccess(['status' => $finalStatus], 'ปิดรอบการทดสอบเรียบร้อยแล้ว');
            break;

        // -------------------------------------------------------------
        // 6. APPROVE NG / RECORD DISPOSITION (Supervisor / QA Lead)
        // -------------------------------------------------------------
        case 'approve_ng':
            $recordId = (int)($_POST['record_id'] ?? 0);
            $actionChoice = trim($_POST['action_choice'] ?? ''); // 'APPROVE' or 'RETEST'
            $remarks = trim($_POST['remarks'] ?? '');

            if (!$recordId || !in_array($actionChoice, ['APPROVE', 'RETEST'])) {
                jsonError('คำสั่งอนุมัติ NG ไม่ถูกต้อง');
            }

            $newNgStatus = ($actionChoice === 'APPROVE') ? 'APPROVED' : 'RETESTED';

            $pdo->beginTransaction();

            $upd = $pdo->prepare("
                UPDATE dbo.IQS_TEST_RECORDS SET
                    ng_status = :ng_status,
                    approved_by = :approved_by,
                    approved_at = GETDATE(),
                    ng_remark = CONCAT(ISNULL(ng_remark, ''), ' [', :remark, ']')
                WHERE record_id = :record_id
            ");
            $upd->execute([
                ':ng_status' => $newNgStatus,
                ':approved_by' => $userId,
                ':remark' => "Action by {$userFullname}: " . ($remarks ?: $actionChoice),
                ':record_id' => $recordId
            ]);

            // Audit
            $audit = $pdo->prepare("
                INSERT INTO dbo.IQS_AUDIT_LOGS (record_id, action_type, user_id, user_fullname, new_data, ip_address)
                VALUES (:rec_id, 'NG_ACTION', :user_id, :user_fullname, :new_data, :ip)
            ");
            $audit->execute([
                ':rec_id' => $recordId,
                ':user_id' => $userId,
                ':user_fullname' => $userFullname,
                ':new_data' => json_encode(['ng_status' => $newNgStatus, 'action' => $actionChoice, 'remarks' => $remarks]),
                ':ip' => $_SERVER['REMOTE_ADDR'] ?? ''
            ]);

            $pdo->commit();

            jsonSuccess(['ng_status' => $newNgStatus], 'อัปเดตสถานะ NG เรียบร้อยแล้ว');
            break;

        // -------------------------------------------------------------
        // 7. GET ROUND DETAILS (For View / Modal / Print)
        // -------------------------------------------------------------
        case 'get_round_details':
            $roundId = (int)($_GET['round_id'] ?? 0);
            if (!$roundId) {
                jsonError('รหัสรอบไม่ถูกต้อง');
            }

            $stmt = $pdo->prepare("
                SELECT r.round_id, r.round_number, r.plan_date, r.template_id, r.round_name,
                       r.shift, r.primary_tester_id, r.co_tester_id_1, r.co_tester_id_2,
                       r.status, CONVERT(varchar(19), r.started_at, 120) AS started_at,
                       CONVERT(varchar(19), r.submitted_at, 120) AS submitted_at,
                       r.notes,
                       u1.fullname AS primary_tester_name,
                       u2.fullname AS co_tester_name_1,
                       u3.fullname AS co_tester_name_2
                FROM dbo.IQS_ROUNDS r
                LEFT JOIN dbo.USERS u1 ON r.primary_tester_id = u1.id
                LEFT JOIN dbo.USERS u2 ON r.co_tester_id_1 = u2.id
                LEFT JOIN dbo.USERS u3 ON r.co_tester_id_2 = u3.id
                WHERE r.round_id = :round_id
            ");
            $stmt->execute([':round_id' => $roundId]);
            $round = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$round) {
                jsonError('ไม่พบข้อมูลรอบการทดสอบ', 404);
            }

            // Records
            $stmtRecs = $pdo->prepare("
                SELECT rec.record_id, rec.round_id, rec.machine_id, rec.machine_code,
                       rec.sku, rec.po_no, rec.thickness, rec.pull_result,
                       rec.knock_check_val, rec.distance_check_val,
                       CONVERT(varchar(19), rec.recorded_at, 120) AS recorded_at,
                       rec.is_skipped, rec.skip_reason, rec.ng_status, rec.ng_remark,
                       rec.approved_by, CONVERT(varchar(19), rec.approved_at, 120) AS approved_at,
                       uApp.fullname AS approved_by_name,
                       m.machine_name
                FROM dbo.IQS_TEST_RECORDS rec
                JOIN dbo.PE_MACHINES m ON rec.machine_id = m.machine_id
                LEFT JOIN dbo.USERS uApp ON rec.approved_by = uApp.id
                WHERE rec.round_id = :round_id
                ORDER BY rec.machine_code ASC
            ");
            $stmtRecs->execute([':round_id' => $roundId]);
            $records = $stmtRecs->fetchAll(PDO::FETCH_ASSOC);

            // Attachments
            $stmtAtt = $pdo->prepare("
                SELECT a.attach_id, a.record_id, a.attach_type, a.file_path, a.file_name, a.file_size,
                       CONVERT(varchar(19), a.uploaded_at, 120) AS uploaded_at, a.sha256_hash
                FROM dbo.IQS_ATTACHMENTS a
                JOIN dbo.IQS_TEST_RECORDS rec ON a.record_id = rec.record_id
                WHERE rec.round_id = :round_id
            ");
            $stmtAtt->execute([':round_id' => $roundId]);
            $attachments = $stmtAtt->fetchAll(PDO::FETCH_ASSOC);

            $attachByRecord = [];
            foreach ($attachments as $att) {
                $attachByRecord[$att['record_id']][] = $att;
            }

            foreach ($records as &$rec) {
                $rec['attachments'] = $attachByRecord[$rec['record_id']] ?? [];
            }

            jsonSuccess([
                'round' => $round,
                'records' => $records
            ]);
            break;

        // -------------------------------------------------------------
        // 8. GET HISTORY / AUDIT LIST (Search by date, shift, status)
        // -------------------------------------------------------------
        case 'get_history':
            $startDate = $_GET['start_date'] ?? date('Y-m-d', strtotime('-7 days'));
            $endDate = $_GET['end_date'] ?? date('Y-m-d');
            $status = $_GET['status'] ?? '';
            $page = max(1, (int)($_GET['page'] ?? 1));
            $limit = max(1, min(100, (int)($_GET['limit'] ?? 20)));
            $offset = ($page - 1) * $limit;

            $whereSql = "WHERE r.plan_date BETWEEN :start_date AND :end_date";
            $params = [':start_date' => $startDate, ':end_date' => $endDate];

            if ($status) {
                $whereSql .= " AND r.status = :status";
                $params[':status'] = $status;
            }

            // Total count
            $stmtCount = $pdo->prepare("SELECT COUNT(*) FROM dbo.IQS_ROUNDS r $whereSql");
            $stmtCount->execute($params);
            $totalRows = (int)$stmtCount->fetchColumn();

            // Paged query
            $stmtList = $pdo->prepare("
                SELECT r.round_id, r.round_number, r.plan_date, r.round_name, r.shift, r.status,
                       CONVERT(varchar(19), r.started_at, 120) AS started_at,
                       CONVERT(varchar(19), r.submitted_at, 120) AS submitted_at,
                       u1.fullname AS primary_tester_name,
                       (SELECT COUNT(*) FROM dbo.IQS_TEST_RECORDS rec WHERE rec.round_id = r.round_id) AS total_records,
                       (SELECT COUNT(*) FROM dbo.IQS_TEST_RECORDS rec WHERE rec.round_id = r.round_id AND rec.pull_result = 'OK') AS ok_count,
                       (SELECT COUNT(*) FROM dbo.IQS_TEST_RECORDS rec WHERE rec.round_id = r.round_id AND rec.pull_result = 'NG') AS ng_count,
                       (SELECT COUNT(*) FROM dbo.IQS_TEST_RECORDS rec WHERE rec.round_id = r.round_id AND rec.is_skipped = 1) AS skip_count
                FROM dbo.IQS_ROUNDS r
                LEFT JOIN dbo.USERS u1 ON r.primary_tester_id = u1.id
                $whereSql
                ORDER BY r.round_id DESC
                OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
            ");
            foreach ($params as $k => $v) {
                $stmtList->bindValue($k, $v);
            }
            $stmtList->bindValue(':offset', $offset, PDO::PARAM_INT);
            $stmtList->bindValue(':limit', $limit, PDO::PARAM_INT);
            $stmtList->execute();
            $rounds = $stmtList->fetchAll(PDO::FETCH_ASSOC);

            jsonSuccess([
                'rounds' => $rounds,
                'pagination' => [
                    'page' => $page,
                    'limit' => $limit,
                    'total_rows' => $totalRows,
                    'total_pages' => ceil($totalRows / $limit)
                ]
            ]);
            break;

        default:
            jsonError('Action parameter is missing or invalid.', 400);
            break;
    }
} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    // Return structured JSON error as required by ERROR_HANDLING_AND_RESILIENCE rule
    jsonError('เกิดข้อผิดพลาดในการทำงาน: ' . $e->getMessage(), 500);
}
