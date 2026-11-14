<?php
/**
 * PE Request, Downtime Quick-Log, Safety Hazard, and Pre-Op Safety Audit API
 * Supports operator mobile workflows (#/pe/request) safely with audit logging and bounded queries.
 */

require_once __DIR__ . '/_common.php';

try {
    [$action, $input, $currentUser] = parsePeRequest();
    requirePeAccess();
    $actor = getPeActorName($currentUser);

    switch ($action) {
        case 'get_downtime': {
            $startDate = parsePeDateOrNull($input['startDate'] ?? null) ?? date('Y-m-d', strtotime('-7 days'));
            $endDate = parsePeDateOrNull($input['endDate'] ?? null) ?? date('Y-m-d');
            $conditions = ['D.log_date >= ?', 'D.log_date <= ?'];
            $params = [$startDate, $endDate];

            if (!empty($input['line'])) {
                $conditions[] = 'D.line = ?';
                $params[] = trim((string)$input['line']);
            }
            if (!empty($input['category'])) {
                $conditions[] = 'D.cause_category = ?';
                $params[] = trim((string)$input['category']);
            }
            if (!empty($input['machine_id'])) {
                $conditions[] = 'D.machine_id = ?';
                $params[] = parsePePositiveInt($input['machine_id'], 'เครื่องจักร');
            }

            $limit = max(1, min(500, (int)($input['limit'] ?? 200)));
            $where = 'WHERE ' . implode(' AND ', $conditions);

            $sql = "SELECT TOP {$limit}
                        D.downtime_id, D.machine_id, D.machine_name, D.line,
                        D.log_date, D.start_time, D.end_time, D.duration_min,
                        D.cause_category, D.cause_detail, D.wo_id, D.recovered_by,
                        D.notes, D.created_by, D.created_at,
                        M.machine_code, W.wo_number
                    FROM " . PE_DOWNTIME_LOG_TABLE . " D WITH (NOLOCK)
                    LEFT JOIN " . PE_MACHINES_TABLE . " M WITH (NOLOCK) ON D.machine_id = M.machine_id
                    LEFT JOIN " . PE_WORK_ORDERS_TABLE . " W WITH (NOLOCK) ON D.wo_id = W.wo_id
                    {$where}
                    ORDER BY D.log_date DESC, D.start_time DESC, D.downtime_id DESC";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

            peJsonSuccess($data, 'โหลดประวัติการหยุดเครื่องจักรสำเร็จ');
            break;
        }

        case 'add_downtime': {
            $machineId = !empty($input['machine_id']) ? parsePePositiveInt($input['machine_id'], 'เครื่องจักร') : null;
            $machineName = mb_substr(trim((string)($input['machine_name'] ?? '')), 0, 200);
            $line = mb_substr(trim((string)($input['line'] ?? '')), 0, 100);
            $logDate = parsePeDateOrNull($input['log_date'] ?? null) ?? date('Y-m-d');
            $startTimeRaw = trim((string)($input['start_time'] ?? ''));
            $endTimeRaw = trim((string)($input['end_time'] ?? ''));
            $endDateRaw = parsePeDateOrNull($input['end_date'] ?? null);
            $category = mb_substr(trim((string)($input['cause_category'] ?? '')), 0, 100);
            $detail = trim((string)($input['cause_detail'] ?? ''));
            $recoveredBy = mb_substr(trim((string)($input['recovered_by'] ?? '')), 0, 150);
            $notes = trim((string)($input['notes'] ?? ''));
            $createWo = !empty($input['create_wo']);

            if ($machineId === null && $machineName === '') {
                throw new InvalidArgumentException('กรุณาระบุชื่อหรือรหัสเครื่องจักร');
            }
            if ($category === '') {
                throw new InvalidArgumentException('กรุณาเลือกหมวดหมู่สาเหตุการหยุดเครื่อง');
            }
            if ($startTimeRaw === '') {
                throw new InvalidArgumentException('กรุณาระบุเวลาที่เครื่องจักรเริ่มหยุด');
            }

            if ($machineId !== null) {
                $mStmt = $pdo->prepare("SELECT machine_name, line FROM " . PE_MACHINES_TABLE . " WITH (NOLOCK) WHERE machine_id = ?");
                $mStmt->execute([$machineId]);
                $mRow = $mStmt->fetch(PDO::FETCH_ASSOC);
                if ($mRow) {
                    $machineName = $mRow['machine_name'];
                    if ($line === '') {
                        $line = (string)$mRow['line'];
                    }
                }
            }

            $startDateTime = parsePeDateTimeOrNull("{$logDate} {$startTimeRaw}");
            $endDateTime = null;
            if ($endTimeRaw !== '') {
                $effEndDate = $endDateRaw ?? $logDate;
                $endDateTime = parsePeDateTimeOrNull("{$effEndDate} {$endTimeRaw}");
                if (strtotime($endDateTime) < strtotime($startDateTime)) {
                    throw new InvalidArgumentException('เวลาสิ้นสุดต้องไม่น้อยกว่าเวลาที่เริ่มหยุดเครื่อง');
                }
            }

            $pdo->beginTransaction();

            $woId = !empty($input['wo_id']) ? parsePePositiveInt($input['wo_id'], 'ใบแจ้งซ่อม') : null;
            $createdWoNum = null;
            if ($createWo && $woId === null) {
                $createdWoNum = generatePeWoNumber($pdo);
                $woTitle = "[Downtime: {$category}] " . ($detail !== '' ? $detail : 'เครื่องจักรหยุดทำงาน');
                $pdo->prepare(
                    "INSERT INTO " . PE_WORK_ORDERS_TABLE . "
                     (wo_number, wo_type, machine_id, machine_name, line, priority, status, requested_by, requested_at, issue_title, issue_detail, is_active, created_at)
                     VALUES (?, 'Corrective', ?, ?, ?, 'High', 'Open', ?, ?, ?, ?, 1, GETDATE())"
                )->execute([
                    $createdWoNum,
                    $machineId,
                    $machineName,
                    $line,
                    $actor,
                    $startDateTime,
                    mb_substr($woTitle, 0, 255),
                    "แจ้งเครื่องหยุดจากหน้า Stop Request\nสาเหตุ: {$category}\nรายละเอียด: {$detail}",
                ]);
                $woId = (int)$pdo->lastInsertId();
            }

            $pdo->prepare(
                "INSERT INTO " . PE_DOWNTIME_LOG_TABLE . "
                 (machine_id, machine_name, line, log_date, start_time, end_time, cause_category, cause_detail, wo_id, recovered_by, notes, created_by, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, GETDATE())"
            )->execute([
                $machineId,
                $machineName,
                $line,
                $logDate,
                $startDateTime,
                $endDateTime,
                $category,
                $detail,
                $woId,
                $recoveredBy,
                $notes,
                $actor,
            ]);
            $newDtId = (int)$pdo->lastInsertId();

            writeLog($pdo, 'CREATE', 'PE_DOWNTIME_LOG', $newDtId, null, [
                'machine_name' => $machineName,
                'line' => $line,
                'cause_category' => $category,
                'wo_id' => $woId,
            ], "Logged downtime for {$machineName}");

            $pdo->commit();
            peJsonSuccess([
                'downtime_id' => $newDtId,
                'wo_id' => $woId,
                'wo_number' => $createdWoNum,
            ], $createdWoNum ? "บันทึกเวลาหยุดเครื่องและเปิดใบงาน {$createdWoNum} สำเร็จ" : 'บันทึกเวลาหยุดเครื่องจักรเรียบร้อยแล้ว');
            break;
        }

        case 'end_downtime': {
            $id = parsePePositiveInt($input['downtime_id'] ?? null, 'รหัสบันทึกหยุดเครื่อง');
            $oldStmt = $pdo->prepare("SELECT downtime_id, machine_name, start_time, end_time FROM " . PE_DOWNTIME_LOG_TABLE . " WHERE downtime_id = ?");
            $oldStmt->execute([$id]);
            $oldRow = $oldStmt->fetch(PDO::FETCH_ASSOC);
            if (!$oldRow) {
                throw new InvalidArgumentException('ไม่พบรายการหยุดเครื่องที่ต้องการปิดเวลา');
            }
            if (!empty($oldRow['end_time'])) {
                throw new InvalidArgumentException('รายการนี้ได้บันทึกเวลาเดินเครื่องกลับแล้ว');
            }

            $endDateTime = date('Y-m-d H:i:s');
            $pdo->beginTransaction();
            $pdo->prepare("UPDATE " . PE_DOWNTIME_LOG_TABLE . " SET end_time = ?, recovered_by = COALESCE(NULLIF(recovered_by, ''), ?) WHERE downtime_id = ?")
                ->execute([$endDateTime, $actor, $id]);
            writeLog($pdo, 'UPDATE', 'PE_DOWNTIME_LOG', $id, $oldRow, ['end_time' => $endDateTime], 'Machine recovered from downtime');
            $pdo->commit();
            peJsonSuccess(['downtime_id' => $id, 'end_time' => $endDateTime], 'บันทึกเครื่องจักรกลับมาทำงานปกติเรียบร้อยแล้ว');
            break;
        }

        case 'submit_hazard_report': {
            $machineCode = strtoupper(trim((string)($input['machine_code'] ?? '')));
            $issueTitle = trim((string)($input['issue_title'] ?? ''));
            $issueDetail = trim((string)($input['issue_detail'] ?? ''));
            $imageBase64 = (string)($input['image_base64'] ?? '');

            if ($machineCode === '' || $issueTitle === '') {
                throw new InvalidArgumentException('กรุณาระบุรหัสเครื่องจักรและหัวข้อความเสี่ยง');
            }

            $mStmt = $pdo->prepare("SELECT TOP 1 machine_id, machine_name, line FROM " . PE_MACHINES_TABLE . " WITH (NOLOCK) WHERE machine_code = ? OR machine_name = ?");
            $mStmt->execute([$machineCode, $machineCode]);
            $mData = $mStmt->fetch(PDO::FETCH_ASSOC);
            if (!$mData) {
                throw new InvalidArgumentException("ไม่พบรหัสเครื่องจักร '{$machineCode}' ในระบบ");
            }

            $imagePath = !empty($input['image_path']) ? trim((string)$input['image_path']) : null;
            if ($imageBase64 !== '') {
                $imagePath = savePeBase64Image($imageBase64, 'pe_images', 'HAZARD_');
            }

            $pdo->beginTransaction();
            $woNumber = generatePeWoNumber($pdo);

            $pdo->prepare(
                "INSERT INTO " . PE_WORK_ORDERS_TABLE . "
                 (wo_number, wo_type, machine_id, machine_name, line, priority, status, requested_by, requested_at, issue_title, issue_detail, image_path, is_active, created_at)
                 VALUES (?, 'Safety/Hazard', ?, ?, ?, 'Critical', 'Pending', ?, GETDATE(), ?, ?, ?, 1, GETDATE())"
            )->execute([
                $woNumber,
                $mData['machine_id'],
                $mData['machine_name'],
                $mData['line'],
                $actor,
                mb_substr($issueTitle, 0, 255),
                $issueDetail !== '' ? $issueDetail : 'รายงานความเสี่ยงด้านความปลอดภัย (Safety Hazard)',
                $imagePath,
            ]);
            $woId = (int)$pdo->lastInsertId();

            writeLog($pdo, 'CREATE', 'PE_WORK_ORDERS', $woId, null, [
                'wo_number' => $woNumber,
                'wo_type' => 'Safety/Hazard',
                'machine_id' => $mData['machine_id'],
                'priority' => 'Critical',
            ], "Reported Safety Hazard ({$woNumber})");

            $pdo->commit();
            peJsonSuccess(['wo_id' => $woId, 'wo_number' => $woNumber], "ส่งรายงานจุดเสี่ยง {$woNumber} (Critical) เรียบร้อยแล้ว");
            break;
        }

        case 'get_checklist': {
            $machineCode = strtoupper(trim((string)($input['machine_code'] ?? '')));
            if ($machineCode === '') {
                peJsonSuccess([], 'กรุณาระบุรหัสเครื่องจักร', ['already_audited' => false]);
            }

            $stmt = $pdo->prepare(
                "SELECT TOP 100 item_id, machine_type, item_order, item_text, is_critical, machine_code
                 FROM dbo.PE_PREOP_CHECKLIST_TEMPLATE WITH (NOLOCK)
                 WHERE machine_code = ?
                 ORDER BY item_order ASC, item_id ASC"
            );
            $stmt->execute([$machineCode]);
            $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $checkStmt = $pdo->prepare(
                "SELECT COUNT(*)
                 FROM dbo.PE_PREOP_AUDITS WITH (NOLOCK)
                 WHERE machine_id = (SELECT TOP 1 machine_id FROM " . PE_MACHINES_TABLE . " WITH (NOLOCK) WHERE machine_code = ? OR machine_name = ?)
                   AND CAST(audited_at AS DATE) = CAST(GETDATE() AS DATE)"
            );
            $checkStmt->execute([$machineCode, $machineCode]);
            $alreadyAudited = ((int)$checkStmt->fetchColumn()) > 0;

            peJsonSuccess($items, 'โหลดรายการตรวจสอบ Pre-Op สำเร็จ', ['already_audited' => $alreadyAudited]);
            break;
        }

        case 'submit_preop': {
            $machineCode = strtoupper(trim((string)($input['machine_code'] ?? '')));
            $shift = trim((string)($input['shift'] ?? 'Day'));
            $auditedBy = trim((string)($input['audited_by'] ?? '')) ?: $actor;
            $checklistData = $input['checklist_data'] ?? [];
            $remarks = trim((string)($input['remarks'] ?? ''));

            if ($machineCode === '' || !is_array($checklistData)) {
                throw new InvalidArgumentException('ข้อมูลการตรวจสอบ Pre-Op ไม่ครบถ้วน');
            }

            $mStmt = $pdo->prepare("SELECT TOP 1 machine_id, machine_name, line FROM " . PE_MACHINES_TABLE . " WITH (NOLOCK) WHERE machine_code = ? OR machine_name = ?");
            $mStmt->execute([$machineCode, $machineCode]);
            $mData = $mStmt->fetch(PDO::FETCH_ASSOC);
            if (!$mData) {
                throw new InvalidArgumentException("ไม่พบเครื่องจักร รหัส '{$machineCode}' ในระบบ");
            }

            $isFailed = false;
            $firstImagePath = null;
            foreach ($checklistData as &$item) {
                if (($item['answer'] ?? '') === 'no') {
                    $isFailed = true;
                }
                if (!empty($item['image_base64'])) {
                    $saved = savePeBase64Image((string)$item['image_base64'], 'pe_images', 'PREOP_');
                    $item['image_path'] = $saved;
                    if ($firstImagePath === null) {
                        $firstImagePath = $saved;
                    }
                    unset($item['image_base64']);
                }
            }
            unset($item);

            $status = $isFailed ? 'Failed' : 'Passed';
            $checklistJson = json_encode($checklistData, JSON_UNESCAPED_UNICODE);

            $pdo->beginTransaction();

            $woId = null;
            $woNumber = null;
            if ($isFailed) {
                $woNumber = generatePeWoNumber($pdo);
                $pdo->prepare(
                    "INSERT INTO " . PE_WORK_ORDERS_TABLE . "
                     (wo_number, wo_type, machine_id, machine_name, line, priority, requested_by, requested_at, issue_title, issue_detail, image_path, status, is_active, created_at)
                     VALUES (?, 'Safety/Hazard', ?, ?, ?, 'Critical', ?, GETDATE(), 'Pre-Op Audit Failed', ?, ?, 'Pending', 1, GETDATE())"
                )->execute([
                    $woNumber,
                    $mData['machine_id'],
                    $mData['machine_name'],
                    $mData['line'],
                    $auditedBy,
                    "Checklist failed items.\nRemarks: {$remarks}",
                    $firstImagePath,
                ]);
                $woId = (int)$pdo->lastInsertId();

                $pdo->prepare("UPDATE " . PE_MACHINES_TABLE . " SET is_loto = 1, loto_reason = ? WHERE machine_id = ?")
                    ->execute([mb_substr("Pre-Op Audit Failed: {$remarks}", 0, 250), $mData['machine_id']]);

                $pdo->prepare("INSERT INTO dbo.PE_LOTO_LOGS (machine_id, wo_id, locked_by, locked_at, status, reason) VALUES (?, ?, ?, GETDATE(), 'LOCKED', ?)")
                    ->execute([$mData['machine_id'], $woId, $auditedBy, mb_substr("Failed: {$remarks}", 0, 480)]);
            }

            $shiftDate = date('Y-m-d');
            $pdo->prepare(
                "INSERT INTO dbo.PE_PREOP_AUDITS
                 (machine_id, shift_date, shift_name, audited_by, status, failed_reason, wo_id, image_path, checklist_data)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
            )->execute([
                $mData['machine_id'],
                $shiftDate,
                $shift,
                mb_substr($auditedBy, 0, 100),
                $status,
                $isFailed ? $remarks : null,
                $woId,
                $firstImagePath,
                $checklistJson,
            ]);
            $auditId = (int)$pdo->lastInsertId();

            writeLog($pdo, 'CREATE', 'PE_PREOP_AUDITS', $auditId, null, [
                'machine_code' => $machineCode,
                'status' => $status,
                'wo_id' => $woId,
            ], "Submitted Pre-Op audit ({$status})");

            $pdo->commit();
            peJsonSuccess([
                'audit_id' => $auditId,
                'status' => $status,
                'wo_id' => $woId,
                'wo_number' => $woNumber,
            ], $isFailed ? "ตรวจสอบไม่ผ่าน! ระบบได้ล็อกเครื่องและเปิดใบแจ้งซ่อมฉุกเฉิน {$woNumber} แล้ว" : 'บันทึกผลการตรวจสอบ Pre-Op เรียบร้อยแล้ว');
            break;
        }

        default:
            peJsonError('Invalid action requested', 400);
    }
} catch (Throwable $e) {
    handleApiError($e, $pdo ?? null, $input ?? $_REQUEST);
}
