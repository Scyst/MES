<?php
/**
 * Self-contained QMS Concession Request Workflow API.
 * Supports list, detail/bulk print payload, create (CCR-YYMM-XXX), update,
 * image attachments (uploads/concessions/), and internal 4-stage approvals.
 */

require_once __DIR__ . '/_common.php';

try {
    [$action, $input, $currentUser] = parseQmsRequest();
    requireQmsAccess();

    $actorName = resolveQmsActorName($pdo, $currentUser);

    switch ($action) {
        case 'list':
            $search = trim((string)($input['search'] ?? ''));
            $where = '1=1';
            $params = [];
            if ($search !== '') {
                $where = '(request_no LIKE ? OR subject LIKE ? OR part_name LIKE ? OR part_no LIKE ? OR person_name LIKE ? OR order_no LIKE ?)';
                $like = '%' . $search . '%';
                array_push($params, $like, $like, $like, $like, $like, $like);
            }

            $sql = "
                SELECT TOP (200)
                    id, request_no, request_date, issued_by_dept, request_to, subject,
                    person_name, part_name, part_no, order_no, qty, lot_no, model_name,
                    serial_no, mfg_date, difference_detail, reason_for_adopt, root_cause,
                    measure_tentative, measure_permanent, is_report_needed, status,
                    approver_1_name, approver_1_status, approver_1_date,
                    approver_2_name, approver_2_status, approver_2_date,
                    approver_3_name, approver_3_status, approver_3_date,
                    approver_4_name, approver_4_status, approver_4_date,
                    attached_image_1, attached_image_2, attached_image_3,
                    created_at, updated_at
                FROM dbo.QMS_CONCESSION WITH (NOLOCK)
                WHERE {$where}
                ORDER BY created_at DESC, id DESC
            ";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

            qmsJsonSuccess($rows);
            break;

        case 'get':
            $idParam = $input['id'] ?? null;
            $idsParam = trim((string)($input['ids'] ?? ''));

            if ($idsParam !== '') {
                $idList = array_values(array_filter(array_map('intval', explode(',', $idsParam)), static fn ($v) => $v > 0));
                if (empty($idList)) {
                    throw new InvalidArgumentException('ไม่พบรหัสรายการ Concession ที่ต้องการพิมพ์');
                }
                $placeholders = implode(',', array_fill(0, count($idList), '?'));
                $stmt = $pdo->prepare("
                    SELECT c.id, c.request_no, c.request_date, c.issued_by_dept, c.request_to, c.subject,
                           c.person_name, c.part_name, c.part_no, c.order_no, c.qty, c.lot_no, c.model_name,
                           c.serial_no, c.mfg_date, c.difference_detail, c.reason_for_adopt, c.root_cause,
                           c.measure_tentative, c.measure_permanent, c.is_report_needed, c.status,
                           COALESCE(NULLIF(m1.name_th, ''), NULLIF(u1.fullname, ''), c.approver_1_name) AS approver_1_name,
                           c.approver_1_status, c.approver_1_date,
                           COALESCE(NULLIF(m2.name_th, ''), NULLIF(u2.fullname, ''), c.approver_2_name) AS approver_2_name,
                           c.approver_2_status, c.approver_2_date,
                           COALESCE(NULLIF(m3.name_th, ''), NULLIF(u3.fullname, ''), c.approver_3_name) AS approver_3_name,
                           c.approver_3_status, c.approver_3_date,
                           COALESCE(NULLIF(m4.name_th, ''), NULLIF(u4.fullname, ''), c.approver_4_name) AS approver_4_name,
                           c.approver_4_status, c.approver_4_date,
                           c.attached_image_1, c.attached_image_2, c.attached_image_3, c.created_at
                    FROM dbo.QMS_CONCESSION c WITH (NOLOCK)
                    LEFT JOIN dbo.USERS u1 WITH (NOLOCK) ON c.approver_1_name = u1.username
                    LEFT JOIN dbo.MANPOWER_EMPLOYEES m1 WITH (NOLOCK) ON u1.username = m1.emp_id
                    LEFT JOIN dbo.USERS u2 WITH (NOLOCK) ON c.approver_2_name = u2.username
                    LEFT JOIN dbo.MANPOWER_EMPLOYEES m2 WITH (NOLOCK) ON u2.username = m2.emp_id
                    LEFT JOIN dbo.USERS u3 WITH (NOLOCK) ON c.approver_3_name = u3.username
                    LEFT JOIN dbo.MANPOWER_EMPLOYEES m3 WITH (NOLOCK) ON u3.username = m3.emp_id
                    LEFT JOIN dbo.USERS u4 WITH (NOLOCK) ON c.approver_4_name = u4.username
                    LEFT JOIN dbo.MANPOWER_EMPLOYEES m4 WITH (NOLOCK) ON u4.username = m4.emp_id
                    WHERE c.id IN ({$placeholders})
                    ORDER BY c.id DESC
                ");
                $stmt->execute($idList);
                qmsJsonSuccess($stmt->fetchAll(PDO::FETCH_ASSOC));
            }

            $id = parseQmsPositiveInt($idParam, 'รหัส Concession');
            $stmt = $pdo->prepare("
                SELECT c.id, c.request_no, c.request_date, c.issued_by_dept, c.request_to, c.subject,
                       c.person_name, c.part_name, c.part_no, c.order_no, c.qty, c.lot_no, c.model_name,
                       c.serial_no, c.mfg_date, c.difference_detail, c.reason_for_adopt, c.root_cause,
                       c.measure_tentative, c.measure_permanent, c.is_report_needed, c.status,
                       COALESCE(NULLIF(m1.name_th, ''), NULLIF(u1.fullname, ''), c.approver_1_name) AS approver_1_name,
                       c.approver_1_status, c.approver_1_date,
                       COALESCE(NULLIF(m2.name_th, ''), NULLIF(u2.fullname, ''), c.approver_2_name) AS approver_2_name,
                       c.approver_2_status, c.approver_2_date,
                       COALESCE(NULLIF(m3.name_th, ''), NULLIF(u3.fullname, ''), c.approver_3_name) AS approver_3_name,
                       c.approver_3_status, c.approver_3_date,
                       COALESCE(NULLIF(m4.name_th, ''), NULLIF(u4.fullname, ''), c.approver_4_name) AS approver_4_name,
                       c.approver_4_status, c.approver_4_date,
                       c.attached_image_1, c.attached_image_2, c.attached_image_3, c.created_at, c.updated_at
                FROM dbo.QMS_CONCESSION c WITH (NOLOCK)
                LEFT JOIN dbo.USERS u1 WITH (NOLOCK) ON c.approver_1_name = u1.username
                LEFT JOIN dbo.MANPOWER_EMPLOYEES m1 WITH (NOLOCK) ON u1.username = m1.emp_id
                LEFT JOIN dbo.USERS u2 WITH (NOLOCK) ON c.approver_2_name = u2.username
                LEFT JOIN dbo.MANPOWER_EMPLOYEES m2 WITH (NOLOCK) ON u2.username = m2.emp_id
                LEFT JOIN dbo.USERS u3 WITH (NOLOCK) ON c.approver_3_name = u3.username
                LEFT JOIN dbo.MANPOWER_EMPLOYEES m3 WITH (NOLOCK) ON u3.username = m3.emp_id
                LEFT JOIN dbo.USERS u4 WITH (NOLOCK) ON c.approver_4_name = u4.username
                LEFT JOIN dbo.MANPOWER_EMPLOYEES m4 WITH (NOLOCK) ON u4.username = m4.emp_id
                WHERE c.id = ?
            ");
            $stmt->execute([$id]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$row) {
                qmsJsonError('ไม่พบข้อมูลใบขออนุมัติใช้งานเป็นกรณีพิเศษ (Concession)', 404);
            }
            qmsJsonSuccess($row);
            break;

        case 'create':
            $requestDate = parseQmsDateOrNull($input['request_date'] ?? date('Y-m-d')) ?? date('Y-m-d');
            $subject = trim((string)($input['subject'] ?? ''));
            $partName = trim((string)($input['part_name'] ?? ''));
            $partNo = trim((string)($input['part_no'] ?? ''));
            $qty = parseQmsBoundedFloat($input['qty'] ?? null, 'จำนวนชิ้นงาน', 0.0001, 9999999.9999);
            $mfgDate = parseQmsDateOrNull($input['mfg_date'] ?? null);

            if ($subject === '' || $partName === '' || $partNo === '') {
                throw new InvalidArgumentException('กรุณากรอกหัวข้อเรื่อง ชื่อชิ้นงาน และ Part No. ให้ครบถ้วน');
            }

            $pdo->beginTransaction();
            $prefix = 'CCR-' . date('ym') . '-';
            $stmtLast = $pdo->prepare(
                "SELECT TOP 1 request_no FROM dbo.QMS_CONCESSION WITH (UPDLOCK, HOLDLOCK) WHERE request_no LIKE ? ORDER BY id DESC"
            );
            $stmtLast->execute([$prefix . '%']);
            $lastNo = (string)$stmtLast->fetchColumn();
            $seq = 1;
            if ($lastNo !== '' && preg_match('/-(\d+)$/', $lastNo, $m)) {
                $seq = (int)$m[1] + 1;
            }
            $requestNo = $prefix . str_pad((string)$seq, 3, '0', STR_PAD_LEFT);

            $saved = !empty($_FILES['images'])
                ? saveQmsUploadedFiles($_FILES['images'], 'concessions', preg_replace('/[^A-Za-z0-9]/', '_', $requestNo) . '_', 3)
                : [];
            $img1 = $saved[0]['path'] ?? null;
            $img2 = $saved[1]['path'] ?? null;
            $img3 = $saved[2]['path'] ?? null;

            $stmtIns = $pdo->prepare("
                INSERT INTO dbo.QMS_CONCESSION (
                    request_no, request_date, issued_by_dept, request_to, subject, person_name,
                    part_name, part_no, order_no, qty, lot_no, model_name, serial_no, mfg_date,
                    difference_detail, reason_for_adopt, root_cause, measure_tentative, measure_permanent,
                    is_report_needed, status, attached_image_1, attached_image_2, attached_image_3,
                    created_at, updated_at
                )
                OUTPUT INSERTED.id
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING_APPROVAL', ?, ?, ?, GETDATE(), GETDATE())
            ");
            $params = [
                $requestNo,
                $requestDate,
                trim((string)($input['issued_by_dept'] ?? 'QA/QC Section')),
                trim((string)($input['request_to'] ?? 'OTI')),
                $subject,
                trim((string)($input['person_name'] ?? '')) ?: $actorName,
                $partName,
                $partNo,
                trim((string)($input['order_no'] ?? '')),
                $qty,
                trim((string)($input['lot_no'] ?? '')),
                trim((string)($input['model_name'] ?? '')),
                trim((string)($input['serial_no'] ?? '')),
                $mfgDate,
                trim((string)($input['difference_detail'] ?? '')),
                trim((string)($input['reason_for_adopt'] ?? '')),
                trim((string)($input['root_cause'] ?? '')),
                trim((string)($input['measure_tentative'] ?? '')),
                trim((string)($input['measure_permanent'] ?? '')),
                (!empty($input['is_report_needed']) && (string)$input['is_report_needed'] === '1') ? 1 : 0,
                $img1,
                $img2,
                $img3,
            ];
            $stmtIns->execute($params);
            $newId = (int)$stmtIns->fetchColumn();
            $pdo->commit();

            writeLog($pdo, 'CREATE', 'QMS_CONCESSION', $newId, null, ['request_no' => $requestNo, 'subject' => $subject, 'qty' => $qty], "Created concession {$requestNo}");
            qmsJsonSuccess(['id' => $newId, 'request_no' => $requestNo], "บันทึกคำขอ Concession {$requestNo} เรียบร้อยแล้ว");
            break;

        case 'update':
            $id = parseQmsPositiveInt($input['id'] ?? null, 'รหัส Concession');
            $subject = trim((string)($input['subject'] ?? ''));
            $partName = trim((string)($input['part_name'] ?? ''));
            $partNo = trim((string)($input['part_no'] ?? ''));
            $qty = parseQmsBoundedFloat($input['qty'] ?? null, 'จำนวนชิ้นงาน', 0.0001, 9999999.9999);
            $mfgDate = parseQmsDateOrNull($input['mfg_date'] ?? null);

            if ($subject === '' || $partName === '' || $partNo === '') {
                throw new InvalidArgumentException('กรุณากรอกหัวข้อเรื่อง ชื่อชิ้นงาน และ Part No. ให้ครบถ้วน');
            }

            $stmtOld = $pdo->prepare(
                "SELECT id, request_no, issued_by_dept, request_to, subject, person_name,
                        part_name, part_no, order_no, qty, lot_no, model_name, serial_no, mfg_date,
                        difference_detail, reason_for_adopt, root_cause, measure_tentative, measure_permanent,
                        is_report_needed, status, attached_image_1, attached_image_2, attached_image_3
                 FROM dbo.QMS_CONCESSION WITH (NOLOCK) WHERE id = ?"
            );
            $stmtOld->execute([$id]);
            $oldData = $stmtOld->fetch(PDO::FETCH_ASSOC);
            if (!$oldData) {
                qmsJsonError('ไม่พบข้อมูล Concession ที่ต้องการแก้ไข', 404);
            }

            $saved = !empty($_FILES['images'])
                ? saveQmsUploadedFiles($_FILES['images'], 'concessions', preg_replace('/[^A-Za-z0-9]/', '_', (string)$oldData['request_no']) . '_', 3)
                : [];
            $paths = !empty($saved)
                ? [
                    $saved[0]['path'] ?? null,
                    $saved[1]['path'] ?? null,
                    $saved[2]['path'] ?? null,
                ]
                : [
                    $oldData['attached_image_1'],
                    $oldData['attached_image_2'],
                    $oldData['attached_image_3'],
                ];

            $newData = [
                'issued_by_dept' => trim((string)($input['issued_by_dept'] ?? 'QA/QC Section')),
                'request_to' => trim((string)($input['request_to'] ?? 'OTI')),
                'subject' => $subject,
                'person_name' => trim((string)($input['person_name'] ?? '')) ?: $oldData['person_name'],
                'part_name' => $partName,
                'part_no' => $partNo,
                'order_no' => trim((string)($input['order_no'] ?? '')),
                'qty' => $qty,
                'lot_no' => trim((string)($input['lot_no'] ?? '')),
                'model_name' => trim((string)($input['model_name'] ?? '')),
                'serial_no' => trim((string)($input['serial_no'] ?? '')),
                'mfg_date' => $mfgDate,
                'difference_detail' => trim((string)($input['difference_detail'] ?? '')),
                'reason_for_adopt' => trim((string)($input['reason_for_adopt'] ?? '')),
                'root_cause' => trim((string)($input['root_cause'] ?? '')),
                'measure_tentative' => trim((string)($input['measure_tentative'] ?? '')),
                'measure_permanent' => trim((string)($input['measure_permanent'] ?? '')),
                'is_report_needed' => (!empty($input['is_report_needed']) && (string)$input['is_report_needed'] === '1') ? 1 : 0,
            ];

            $pdo->beginTransaction();
            $pdo->prepare("
                UPDATE dbo.QMS_CONCESSION SET
                    issued_by_dept = ?, request_to = ?, subject = ?, person_name = ?,
                    part_name = ?, part_no = ?, order_no = ?, qty = ?, lot_no = ?,
                    model_name = ?, serial_no = ?, mfg_date = ?, difference_detail = ?,
                    reason_for_adopt = ?, root_cause = ?, measure_tentative = ?,
                    measure_permanent = ?, is_report_needed = ?, updated_at = GETDATE(),
                    attached_image_1 = ?, attached_image_2 = ?, attached_image_3 = ?
                WHERE id = ?
            ")->execute([
                $newData['issued_by_dept'],
                $newData['request_to'],
                $newData['subject'],
                $newData['person_name'],
                $newData['part_name'],
                $newData['part_no'],
                $newData['order_no'],
                $newData['qty'],
                $newData['lot_no'],
                $newData['model_name'],
                $newData['serial_no'],
                $newData['mfg_date'],
                $newData['difference_detail'],
                $newData['reason_for_adopt'],
                $newData['root_cause'],
                $newData['measure_tentative'],
                $newData['measure_permanent'],
                $newData['is_report_needed'],
                $paths[0],
                $paths[1],
                $paths[2],
                $id,
            ]);
            $pdo->commit();

            writeLog($pdo, 'UPDATE', 'QMS_CONCESSION', $id, $oldData, $newData, "Updated concession {$oldData['request_no']}");
            qmsJsonSuccess(['id' => $id], 'บันทึกการแก้ไขข้อมูล Concession เรียบร้อยแล้ว');
            break;

        case 'approve':
            $id = parseQmsPositiveInt($input['id'] ?? null, 'รหัส Concession');
            $level = (int)($input['level'] ?? 0);
            if (!in_array($level, [1, 2, 3, 4], true)) {
                throw new InvalidArgumentException('ลำดับผู้อนุมัติไม่ถูกต้อง (ต้องเป็น 1-4)');
            }
            $decision = trim((string)($input['status'] ?? 'Approve'));
            if (!in_array($decision, ['Approve', 'Not Approve'], true)) {
                throw new InvalidArgumentException('สถานะการอนุมัติไม่ถูกต้อง (Approve หรือ Not Approve)');
            }

            $stmtOld = $pdo->prepare(
                "SELECT id, request_no, status, approver_1_status, approver_2_status, approver_3_status, approver_4_status
                 FROM dbo.QMS_CONCESSION WITH (NOLOCK) WHERE id = ?"
            );
            $stmtOld->execute([$id]);
            $oldData = $stmtOld->fetch(PDO::FETCH_ASSOC);
            if (!$oldData) {
                qmsJsonError('ไม่พบข้อมูล Concession', 404);
            }

            $colMap = [
                1 => ['approver_1_name', 'approver_1_status', 'approver_1_date'],
                2 => ['approver_2_name', 'approver_2_status', 'approver_2_date'],
                3 => ['approver_3_name', 'approver_3_status', 'approver_3_date'],
                4 => ['approver_4_name', 'approver_4_status', 'approver_4_date'],
            ];
            [$colName, $colStatus, $colDate] = $colMap[$level];

            $pdo->beginTransaction();
            $pdo->prepare(
                "UPDATE dbo.QMS_CONCESSION SET {$colName} = ?, {$colStatus} = ?, {$colDate} = GETDATE(), updated_at = GETDATE() WHERE id = ?"
            )->execute([$actorName, $decision, $id]);

            $stmtCheck = $pdo->prepare(
                "SELECT approver_1_status, approver_2_status, approver_3_status, approver_4_status FROM dbo.QMS_CONCESSION WHERE id = ?"
            );
            $stmtCheck->execute([$id]);
            $row = $stmtCheck->fetch(PDO::FETCH_ASSOC);

            $overallStatus = 'PENDING_APPROVAL';
            if ($decision === 'Not Approve' || in_array('Not Approve', $row ?: [], true)) {
                $overallStatus = 'REJECTED';
            } elseif (
                ($row['approver_1_status'] ?? '') === 'Approve' &&
                ($row['approver_2_status'] ?? '') === 'Approve' &&
                ($row['approver_3_status'] ?? '') === 'Approve' &&
                ($row['approver_4_status'] ?? '') === 'Approve'
            ) {
                $overallStatus = 'APPROVED';
            }

            $pdo->prepare("UPDATE dbo.QMS_CONCESSION SET status = ?, updated_at = GETDATE() WHERE id = ?")
                ->execute([$overallStatus, $id]);
            $pdo->commit();

            writeLog($pdo, 'APPROVE', 'QMS_CONCESSION', $id, $oldData, [
                'level' => $level,
                'decision' => $decision,
                'approver' => $actorName,
                'overall_status' => $overallStatus,
            ], "Stage {$level} {$decision} on {$oldData['request_no']}");

            qmsJsonSuccess(['id' => $id, 'status' => $overallStatus], 'บันทึกผลการพิจารณาอนุมัติเรียบร้อยแล้ว');
            break;

        default:
            qmsJsonError('ไม่พบ Action ที่ระบุ', 400);
    }
} catch (InvalidArgumentException $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    qmsJsonError($e->getMessage(), 400);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    if (isset($pdo)) {
        writeErrorLog($pdo, 'QMS_CONCESSION', $e->getMessage(), $input ?? null);
    }
    qmsJsonError('เกิดข้อผิดพลาดในระบบ Concession กรุณาลองใหม่อีกครั้ง', 500);
}
