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

try {
    switch ($action) {

        // -------------------------------------------------------------
        // 1. GET INITIAL DATA (Templates, Spot Machines, Active Users)
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

            // 1.2 Spot welding machines (from PE_MACHINES)
            $stmtMachines = $pdo->query("
                SELECT machine_id, machine_code, machine_name, line, area, machine_type,
                       ISNULL(map_x, 0) AS map_x, ISNULL(map_y, 0) AS map_y
                FROM dbo.PE_MACHINES
                WHERE is_active = 1 AND (line = 'SPOT' OR machine_type LIKE '%Spot%' OR machine_name LIKE '%Spot%')
                ORDER BY machine_code ASC
            ");
            $machines = $stmtMachines->fetchAll(PDO::FETCH_ASSOC);

            // 1.3 Active Users for co-testers
            $stmtUsers = $pdo->query("
                SELECT id, username, fullname, role, team_group 
                FROM dbo.USERS 
                WHERE is_active = 1 
                ORDER BY fullname ASC
            ");
            $users = $stmtUsers->fetchAll(PDO::FETCH_ASSOC);

            jsonSuccess([
                'templates' => $templates,
                'machines' => $machines,
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
            $isSkipped = !empty($_POST['is_skipped']) ? 1 : 0;
            $skipReason = trim($_POST['skip_reason'] ?? '');
            $ngRemark = trim($_POST['ng_remark'] ?? '');

            if (!$roundId || !$machineId) {
                jsonError('ข้อมูลรอบหรือรหัสเครื่องจักรไม่ถูกต้อง');
            }

            // Verify round is still OPEN
            $roundCheck = $pdo->prepare("SELECT status FROM dbo.IQS_ROUNDS WHERE round_id = :round_id");
            $roundCheck->execute([':round_id' => $roundId]);
            $roundStatus = $roundCheck->fetchColumn();
            if ($roundStatus !== 'OPEN') {
                jsonError('รอบการทดสอบนี้ถูกปิดหรือยกเลิกแล้ว ไม่สามารถแก้ไขได้');
            }

            // Get machine code
            $mCheck = $pdo->prepare("SELECT machine_code FROM dbo.PE_MACHINES WHERE machine_id = :m_id");
            $mCheck->execute([':m_id' => $machineId]);
            $machineCode = $mCheck->fetchColumn();
            if (!$machineCode) {
                jsonError('ไม่พบข้อมูลเครื่องจักรในระบบ PE_MACHINES');
            }

            if (!$isSkipped) {
                if (!in_array($pullResult, ['OK', 'NG'])) {
                    jsonError('กรุณาระบุผลทดสอบแรงดึงเป็น OK หรือ NG');
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
                        recorded_at, is_skipped, skip_reason, ng_status, ng_remark
                    ) VALUES (
                        :round_id, :machine_id, :machine_code, :sku, :po_no, :thickness,
                        :pull_result, :knock_check_val, :distance_check_val,
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

            jsonSuccess(['record_id' => $recordId], 'บันทึกผลการทดสอบเครื่อง ' . $machineCode . ' เรียบร้อยแล้ว');
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
