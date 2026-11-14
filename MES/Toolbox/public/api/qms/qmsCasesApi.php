<?php
/**
 * Self-contained QMS NCR / CAR 8D / Customer Claim Backend API.
 * Uses SQL Server stored procedures (sp_QMS_CreateNCR, sp_QMS_CloseClaim),
 * parameterized PDO queries, CSRF validation, and full SYSTEM_LOGS + QMS_AUDIT_LOGS audit trail.
 * External customer token approval links are intentionally excluded per QA/QC team hold.
 */

require_once __DIR__ . '/_common.php';

try {
    [$action, $input, $currentUser] = parseQmsRequest();
    requireQmsAccess();

    $actorUserId = (int)$currentUser['id'];
    $actorName = resolveQmsActorName($pdo, $currentUser);

    switch ($action) {
        case 'list':
            $search = trim((string)($input['search'] ?? ''));
            $status = strtoupper(trim((string)($input['status'] ?? '')));
            $startDate = parseQmsDateOrNull($input['start_date'] ?? null);
            $endDate = parseQmsDateOrNull($input['end_date'] ?? null);
            $customer = trim((string)($input['customer'] ?? ''));
            $defect = trim((string)($input['defect'] ?? ''));

            $where = ['1=1'];
            $params = [];

            if ($search !== '') {
                $where[] = '(c.car_no LIKE ? OR c.customer_name LIKE ? OR c.product_name LIKE ? OR n.lot_no LIKE ? OR n.invoice_no LIKE ?)';
                $like = '%' . $search . '%';
                array_push($params, $like, $like, $like, $like, $like);
            }
            if ($status !== '' && $status !== 'ALL') {
                $where[] = 'c.current_status = ?';
                $params[] = $status;
            }
            if ($startDate !== null) {
                $where[] = 'CAST(c.case_date AS DATE) >= ?';
                $params[] = $startDate;
            }
            if ($endDate !== null) {
                $where[] = 'CAST(c.case_date AS DATE) <= ?';
                $params[] = $endDate;
            }
            if ($customer !== '') {
                $where[] = 'c.customer_name = ?';
                $params[] = $customer;
            }
            if ($defect !== '') {
                $where[] = '(n.defect_type LIKE ? OR n.defect_description LIKE ?)';
                $defLike = '%' . $defect . '%';
                array_push($params, $defLike, $defLike);
            }

            $whereSql = implode(' AND ', $where);
            $sql = "
                SELECT TOP (300)
                    c.case_id,
                    c.car_no,
                    c.case_date,
                    c.customer_name,
                    c.product_name,
                    c.current_status,
                    c.updated_at,
                    COALESCE(NULLIF(m.name_th, ''), NULLIF(u.fullname, ''), u.username, c.issue_by_name) AS issue_by_name,
                    n.defect_type,
                    n.defect_qty,
                    n.defect_description,
                    n.production_date,
                    n.lot_no,
                    n.found_shift,
                    n.product_model,
                    n.production_line,
                    n.invoice_no,
                    n.found_by_type,
                    n.prelim_disposition,
                    car.root_cause_category,
                    car.customer_respond_date,
                    cl.disposition AS claim_disposition,
                    cl.cost_estimation,
                    cl.closed_at
                FROM dbo.QMS_CASES c WITH (NOLOCK)
                JOIN dbo.QMS_NCR n WITH (NOLOCK) ON c.case_id = n.case_id
                LEFT JOIN dbo.QMS_CAR car WITH (NOLOCK) ON c.case_id = car.case_id
                LEFT JOIN dbo.QMS_CLAIM cl WITH (NOLOCK) ON c.case_id = cl.case_id
                LEFT JOIN dbo.USERS u WITH (NOLOCK) ON c.created_by = u.id
                LEFT JOIN dbo.MANPOWER_EMPLOYEES m WITH (NOLOCK) ON u.username = m.emp_id
                WHERE {$whereSql}
                ORDER BY c.case_date DESC, c.case_id DESC
            ";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $statSql = "
                SELECT
                    COUNT(*) AS total,
                    SUM(CASE WHEN current_status = 'NCR_CREATED' THEN 1 ELSE 0 END) AS ncr_count,
                    SUM(CASE WHEN current_status = 'SENT_TO_CUSTOMER' THEN 1 ELSE 0 END) AS car_count,
                    SUM(CASE WHEN current_status = 'CUSTOMER_REPLIED' THEN 1 ELSE 0 END) AS reply_count,
                    SUM(CASE WHEN current_status = 'CLOSED' THEN 1 ELSE 0 END) AS closed_count,
                    SUM(CASE WHEN current_status = 'CANCELLED' THEN 1 ELSE 0 END) AS cancelled_count
                FROM dbo.QMS_CASES WITH (NOLOCK)
            ";
            $stats = $pdo->query($statSql)->fetch(PDO::FETCH_ASSOC) ?: [];

            qmsJsonSuccess(['cases' => $rows, 'stats' => $stats]);
            break;

        case 'detail':
            $caseId = parseQmsPositiveInt($input['case_id'] ?? null, 'รหัสเคส QMS');

            $sql = "
                SELECT
                    c.case_id,
                    c.car_no,
                    c.case_date,
                    c.customer_name,
                    c.product_name,
                    c.item_id,
                    c.current_status,
                    c.created_by,
                    c.created_at,
                    c.updated_at,
                    COALESCE(NULLIF(m.name_th, ''), NULLIF(u.fullname, ''), u.username, c.issue_by_name) AS issue_by_name,
                    n.defect_type,
                    n.defect_qty,
                    n.defect_description,
                    n.production_date,
                    n.lot_no,
                    n.found_shift,
                    n.product_model,
                    n.production_line,
                    n.invoice_no,
                    n.issuer_position,
                    n.found_by_type,
                    n.prelim_disposition,
                    n.prelim_remark,
                    car.qa_issue_description,
                    car.customer_root_cause,
                    car.customer_action_plan,
                    car.containment_action,
                    car.root_cause_category,
                    car.leak_cause,
                    car.customer_respond_date,
                    car.return_container_no,
                    car.expected_return_qty,
                    cl.disposition,
                    cl.final_qty,
                    cl.cost_estimation,
                    cl.approved_by,
                    COALESCE(NULLIF(mApp.name_th, ''), NULLIF(uApp.fullname, ''), uApp.username) AS approved_by_name,
                    cl.closed_at,
                    cl.actual_received_qty,
                    cl.verify_date_1,
                    cl.verify_result_1,
                    cl.verify_date_2,
                    cl.verify_result_2,
                    cl.verify_date_3,
                    cl.verify_result_3,
                    cl.std_fmea,
                    cl.std_control_plan,
                    cl.std_wi,
                    cl.std_others
                FROM dbo.QMS_CASES c WITH (NOLOCK)
                JOIN dbo.QMS_NCR n WITH (NOLOCK) ON c.case_id = n.case_id
                LEFT JOIN dbo.QMS_CAR car WITH (NOLOCK) ON c.case_id = car.case_id
                LEFT JOIN dbo.QMS_CLAIM cl WITH (NOLOCK) ON c.case_id = cl.case_id
                LEFT JOIN dbo.USERS u WITH (NOLOCK) ON c.created_by = u.id
                LEFT JOIN dbo.MANPOWER_EMPLOYEES m WITH (NOLOCK) ON u.username = m.emp_id
                LEFT JOIN dbo.USERS uApp WITH (NOLOCK) ON cl.approved_by = uApp.id
                LEFT JOIN dbo.MANPOWER_EMPLOYEES mApp WITH (NOLOCK) ON uApp.username = mApp.emp_id
                WHERE c.case_id = ?
            ";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$caseId]);
            $detail = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$detail) {
                qmsJsonError('ไม่พบข้อมูลเคสคุณภาพที่ระบุ', 404);
            }

            $stmtFiles = $pdo->prepare(
                "SELECT att_id, doc_stage, file_name, file_path, uploaded_at
                 FROM dbo.QMS_FILE WITH (NOLOCK)
                 WHERE case_id = ?
                 ORDER BY uploaded_at ASC, att_id ASC"
            );
            $stmtFiles->execute([$caseId]);
            $files = $stmtFiles->fetchAll(PDO::FETCH_ASSOC);

            $stmtLogs = $pdo->prepare(
                "SELECT TOP (50) log_id, action_type, old_status, new_status, updated_by, updated_at
                 FROM dbo.QMS_AUDIT_LOGS WITH (NOLOCK)
                 WHERE case_id = ?
                 ORDER BY updated_at DESC, log_id DESC"
            );
            $stmtLogs->execute([$caseId]);
            $auditLogs = $stmtLogs->fetchAll(PDO::FETCH_ASSOC);

            qmsJsonSuccess([
                'detail' => $detail,
                'files' => $files,
                'audit_logs' => $auditLogs,
            ]);
            break;

        case 'master_data':
            $lines = $pdo->query(
                "SELECT TOP (200) location_id, location_name
                 FROM dbo.LOCATIONS WITH (NOLOCK)
                 WHERE location_type = 'LINE' AND is_active = 1
                 ORDER BY location_name"
            )->fetchAll(PDO::FETCH_ASSOC);

            $items = $pdo->query(
                "SELECT TOP (600) part_no, part_description AS name
                 FROM dbo.ITEMS WITH (NOLOCK)
                 WHERE is_active = 1
                 ORDER BY part_no"
            )->fetchAll(PDO::FETCH_ASSOC);

            $customers = $pdo->query(
                "SELECT DISTINCT TOP (200) customer_name
                 FROM dbo.QMS_CASES WITH (NOLOCK)
                 WHERE customer_name IS NOT NULL AND LTRIM(RTRIM(customer_name)) <> ''
                 ORDER BY customer_name"
            )->fetchAll(PDO::FETCH_ASSOC);

            qmsJsonSuccess([
                'lines' => $lines,
                'items' => $items,
                'customers' => $customers,
            ]);
            break;

        case 'create_ncr':
            $customerName = trim((string)($input['customer_name'] ?? ''));
            $productName = trim((string)($input['product_name'] ?? ''));
            $defectType = trim((string)($input['defect_type'] ?? ''));
            $defectDesc = trim((string)($input['defect_description'] ?? ''));
            $issueByName = trim((string)($input['issue_by_name'] ?? '')) ?: $actorName;

            if ($customerName === '' || $productName === '' || $defectType === '') {
                throw new InvalidArgumentException('กรุณากรอกชื่อลูกค้า สินค้า และอาการเสียให้ครบถ้วน');
            }

            $defectQty = parseQmsBoundedFloat($input['defect_qty'] ?? null, 'จำนวนงานเสีย', 0.0001, 9999999.9999);
            $prodDate = parseQmsDateOrNull($input['production_date'] ?? null);
            $lotNo = trim((string)($input['lot_no'] ?? '')) ?: null;
            $foundShift = trim((string)($input['found_shift'] ?? '')) ?: null;
            $productModel = trim((string)($input['product_model'] ?? '')) ?: null;
            $productionLine = trim((string)($input['production_line'] ?? '')) ?: null;
            $invoiceNo = trim((string)($input['invoice_no'] ?? '')) ?: null;
            $issuerPosition = trim((string)($input['issuer_position'] ?? '')) ?: null;
            $foundByType = trim((string)($input['found_by_type'] ?? '')) ?: null;
            $prelimDisp = trim((string)($input['prelim_disposition'] ?? '')) ?: null;
            $prelimRemark = trim((string)($input['prelim_remark'] ?? '')) ?: null;

            $sqlSp = "
                DECLARE @newId INT, @newCarNo VARCHAR(50);
                EXEC dbo.sp_QMS_CreateNCR
                    @customer_name = ?,
                    @product_name = ?,
                    @defect_type = ?,
                    @defect_qty = ?,
                    @defect_description = ?,
                    @production_date = ?,
                    @lot_no = ?,
                    @found_shift = ?,
                    @product_model = ?,
                    @production_line = ?,
                    @created_by = ?,
                    @issue_by_name = ?,
                    @invoice_no = ?,
                    @issuer_position = ?,
                    @found_by_type = ?,
                    @prelim_disposition = ?,
                    @prelim_remark = ?,
                    @NewCaseID = @newId OUTPUT,
                    @GeneratedCarNo = @newCarNo OUTPUT;
                SELECT @newId AS case_id, @newCarNo AS car_no;
            ";

            $stmt = $pdo->prepare($sqlSp);
            $stmt->execute([
                $customerName,
                $productName,
                $defectType,
                $defectQty,
                $defectDesc,
                $prodDate,
                $lotNo,
                $foundShift,
                $productModel,
                $productionLine,
                $actorUserId,
                $issueByName,
                $invoiceNo,
                $issuerPosition,
                $foundByType,
                $prelimDisp,
                $prelimRemark,
            ]);

            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            while (!$result && $stmt->nextRowset()) {
                $result = $stmt->fetch(PDO::FETCH_ASSOC);
            }
            if (!$result || empty($result['case_id'])) {
                throw new RuntimeException('ไม่สามารถสร้างเลขที่ NCR/CAR ได้');
            }

            $newCaseId = (int)$result['case_id'];
            $newCarNo = (string)$result['car_no'];

            $savedFiles = !empty($_FILES['ncr_images'])
                ? saveQmsUploadedFiles($_FILES['ncr_images'], 'qms_files', "car_{$newCaseId}_", 5)
                : [];
            if (!empty($savedFiles)) {
                $pdo->beginTransaction();
                $stmtAtt = $pdo->prepare(
                    "INSERT INTO dbo.QMS_FILE (case_id, doc_stage, file_name, file_path, uploaded_by, uploaded_at)
                     VALUES (?, 'NCR', ?, ?, ?, GETDATE())"
                );
                foreach ($savedFiles as $file) {
                    $stmtAtt->execute([$newCaseId, $file['name'], $file['path'], $actorUserId]);
                }
                $pdo->commit();
            }

            insertQmsCaseAuditLog($pdo, $newCaseId, 'CREATE_NCR', null, 'NCR_CREATED', $actorName);
            writeLog($pdo, 'CREATE', 'QMS_CASES', $newCaseId, null, [
                'car_no' => $newCarNo,
                'customer_name' => $customerName,
                'product_name' => $productName,
                'defect_type' => $defectType,
                'defect_qty' => $defectQty,
            ], "Created NCR {$newCarNo}");

            qmsJsonSuccess([
                'case_id' => $newCaseId,
                'car_no' => $newCarNo,
            ], "บันทึกใบแจ้งปัญหา {$newCarNo} เรียบร้อยแล้ว");
            break;

        case 'update_ncr':
            $caseId = parseQmsPositiveInt($input['case_id'] ?? null, 'รหัสเคส QMS');
            $customerName = trim((string)($input['customer_name'] ?? ''));
            $productName = trim((string)($input['product_name'] ?? ''));
            $defectType = trim((string)($input['defect_type'] ?? ''));
            $defectQty = parseQmsBoundedFloat($input['defect_qty'] ?? null, 'จำนวนงานเสีย', 0.0001, 9999999.9999);
            $prodDate = parseQmsDateOrNull($input['production_date'] ?? null);

            if ($customerName === '' || $productName === '' || $defectType === '') {
                throw new InvalidArgumentException('กรุณากรอกชื่อลูกค้า สินค้า และอาการเสียให้ครบถ้วน');
            }

            $stmtOld = $pdo->prepare(
                "SELECT c.case_id, c.car_no, c.customer_name, c.product_name, c.current_status, c.issue_by_name,
                        n.defect_type, n.defect_qty, n.defect_description, n.production_date, n.lot_no, n.found_shift,
                        n.product_model, n.production_line, n.invoice_no, n.issuer_position, n.found_by_type,
                        n.prelim_disposition, n.prelim_remark
                 FROM dbo.QMS_CASES c WITH (NOLOCK)
                 JOIN dbo.QMS_NCR n WITH (NOLOCK) ON c.case_id = n.case_id
                 WHERE c.case_id = ?"
            );
            $stmtOld->execute([$caseId]);
            $oldData = $stmtOld->fetch(PDO::FETCH_ASSOC);
            if (!$oldData) {
                qmsJsonError('ไม่พบข้อมูลเคสคุณภาพที่ต้องการแก้ไข', 404);
            }
            if (in_array($oldData['current_status'], ['CLOSED', 'CANCELLED'], true)) {
                throw new InvalidArgumentException('ไม่สามารถแก้ไขเอกสารที่ปิดงานหรือยกเลิกแล้วได้');
            }

            $newData = [
                'customer_name' => $customerName,
                'product_name' => $productName,
                'issue_by_name' => trim((string)($input['issue_by_name'] ?? '')) ?: $oldData['issue_by_name'],
                'defect_type' => $defectType,
                'defect_qty' => $defectQty,
                'defect_description' => trim((string)($input['defect_description'] ?? '')),
                'production_date' => $prodDate,
                'lot_no' => trim((string)($input['lot_no'] ?? '')) ?: null,
                'found_shift' => trim((string)($input['found_shift'] ?? '')) ?: null,
                'product_model' => trim((string)($input['product_model'] ?? '')) ?: null,
                'production_line' => trim((string)($input['production_line'] ?? '')) ?: null,
                'invoice_no' => trim((string)($input['invoice_no'] ?? '')) ?: null,
                'issuer_position' => trim((string)($input['issuer_position'] ?? '')) ?: null,
                'found_by_type' => trim((string)($input['found_by_type'] ?? '')) ?: null,
                'prelim_disposition' => trim((string)($input['prelim_disposition'] ?? '')) ?: null,
                'prelim_remark' => trim((string)($input['prelim_remark'] ?? '')) ?: null,
            ];

            $pdo->beginTransaction();
            $pdo->prepare(
                "UPDATE dbo.QMS_CASES SET customer_name = ?, product_name = ?, issue_by_name = ?, updated_at = GETDATE() WHERE case_id = ?"
            )->execute([$newData['customer_name'], $newData['product_name'], $newData['issue_by_name'], $caseId]);

            $pdo->prepare(
                "UPDATE dbo.QMS_NCR SET
                    defect_type = ?, defect_qty = ?, defect_description = ?, production_date = ?,
                    lot_no = ?, found_shift = ?, product_model = ?, production_line = ?,
                    invoice_no = ?, issuer_position = ?, found_by_type = ?,
                    prelim_disposition = ?, prelim_remark = ?
                 WHERE case_id = ?"
            )->execute([
                $newData['defect_type'],
                $newData['defect_qty'],
                $newData['defect_description'],
                $newData['production_date'],
                $newData['lot_no'],
                $newData['found_shift'],
                $newData['product_model'],
                $newData['production_line'],
                $newData['invoice_no'],
                $newData['issuer_position'],
                $newData['found_by_type'],
                $newData['prelim_disposition'],
                $newData['prelim_remark'],
                $caseId,
            ]);

            $savedFiles = !empty($_FILES['ncr_images'])
                ? saveQmsUploadedFiles($_FILES['ncr_images'], 'qms_files', "car_{$caseId}_", 5)
                : [];
            if (!empty($savedFiles)) {
                $stmtAtt = $pdo->prepare(
                    "INSERT INTO dbo.QMS_FILE (case_id, doc_stage, file_name, file_path, uploaded_by, uploaded_at)
                     VALUES (?, 'NCR', ?, ?, ?, GETDATE())"
                );
                foreach ($savedFiles as $file) {
                    $stmtAtt->execute([$caseId, $file['name'], $file['path'], $actorUserId]);
                }
            }
            $pdo->commit();

            insertQmsCaseAuditLog($pdo, $caseId, 'UPDATE_NCR', $oldData['current_status'], $oldData['current_status'], $actorName);
            writeLog($pdo, 'UPDATE', 'QMS_CASES', $caseId, $oldData, $newData, "Updated NCR {$oldData['car_no']}");

            qmsJsonSuccess(['case_id' => $caseId], 'บันทึกการแก้ไขข้อมูล NCR เรียบร้อยแล้ว');
            break;

        case 'save_car_8d':
            $caseId = parseQmsPositiveInt($input['case_id'] ?? null, 'รหัสเคส QMS');
            $workflowAction = trim((string)($input['car_mode'] ?? 'submit_8d'));
            if (!in_array($workflowAction, ['issue', 'save_draft', 'submit_8d'], true)) {
                $workflowAction = 'submit_8d';
            }

            $stmtOld = $pdo->prepare(
                "SELECT c.case_id, c.car_no, c.current_status,
                        car.qa_issue_description, car.containment_action, car.root_cause_category,
                        car.customer_root_cause, car.leak_cause, car.customer_action_plan,
                        car.return_container_no, car.expected_return_qty, car.customer_respond_date
                 FROM dbo.QMS_CASES c WITH (NOLOCK)
                 LEFT JOIN dbo.QMS_CAR car WITH (NOLOCK) ON c.case_id = car.case_id
                 WHERE c.case_id = ?"
            );
            $stmtOld->execute([$caseId]);
            $oldData = $stmtOld->fetch(PDO::FETCH_ASSOC);
            if (!$oldData) {
                qmsJsonError('ไม่พบข้อมูลเคสคุณภาพ', 404);
            }
            if ($oldData['current_status'] === 'CANCELLED' || $oldData['current_status'] === 'CLOSED') {
                throw new InvalidArgumentException('ไม่สามารถแก้ไขเอกสาร CAR ของเคสที่ปิดงานหรือยกเลิกแล้วได้');
            }

            $qaIssueDesc = trim((string)($input['qa_issue_description'] ?? ($oldData['qa_issue_description'] ?? '')));
            $containment = trim((string)($input['containment_action'] ?? ($oldData['containment_action'] ?? '')));
            $rcCategory = trim((string)($input['root_cause_category'] ?? ($oldData['root_cause_category'] ?? '')));
            $rootCause = trim((string)($input['customer_root_cause'] ?? ($oldData['customer_root_cause'] ?? '')));
            $leakCause = trim((string)($input['leak_cause'] ?? ($oldData['leak_cause'] ?? '')));
            $actionPlan = trim((string)($input['customer_action_plan'] ?? ($oldData['customer_action_plan'] ?? '')));
            $returnContainer = trim((string)($input['return_container_no'] ?? ($oldData['return_container_no'] ?? '')));
            $expectedQty = parseQmsBoundedFloat(
                $input['expected_return_qty'] ?? ($oldData['expected_return_qty'] ?? null),
                'จำนวนรับคืนที่คาดการณ์',
                0,
                9999999.9999,
                true
            );

            if ($workflowAction === 'issue' && $qaIssueDesc === '') {
                throw new InvalidArgumentException('กรุณาระบุรายละเอียดปัญหา (QA Issue Description) ก่อนเปิดเอกสาร CAR');
            }
            if ($workflowAction === 'submit_8d' && ($rootCause === '' || $actionPlan === '')) {
                throw new InvalidArgumentException('กรุณากรอกผลการวิเคราะห์สาเหตุ (Root Cause) และแผนแก้ไข (Action Plan) ก่อนบันทึก CAR 8D');
            }

            $nextStatus = $oldData['current_status'];
            if ($workflowAction === 'issue') {
                $nextStatus = 'SENT_TO_CUSTOMER';
            } elseif ($workflowAction === 'submit_8d') {
                $nextStatus = 'CUSTOMER_REPLIED';
            } elseif ($oldData['current_status'] === 'NCR_CREATED') {
                $nextStatus = 'SENT_TO_CUSTOMER';
            }

            $internalRefToken = 'INT-' . bin2hex(random_bytes(12));
            $defaultExpiry = date('Y-m-d H:i:s', strtotime('+30 days'));
            $setRespondDate = ($workflowAction === 'submit_8d') ? 1 : 0;

            $pdo->beginTransaction();
            $sqlMerge = "
                MERGE INTO dbo.QMS_CAR AS target
                USING (SELECT ? AS case_id) AS source
                ON (target.case_id = source.case_id)
                WHEN MATCHED THEN
                    UPDATE SET
                        qa_issue_description = ?,
                        containment_action = ?,
                        root_cause_category = ?,
                        customer_root_cause = ?,
                        leak_cause = ?,
                        customer_action_plan = ?,
                        return_container_no = ?,
                        expected_return_qty = ?,
                        customer_respond_date = CASE WHEN ? = 1 THEN COALESCE(customer_respond_date, GETDATE()) ELSE customer_respond_date END
                WHEN NOT MATCHED THEN
                    INSERT (
                        case_id, qa_issue_description, access_token, token_expiry,
                        containment_action, root_cause_category, customer_root_cause, leak_cause,
                        customer_action_plan, return_container_no, expected_return_qty, customer_respond_date
                    )
                    VALUES (
                        ?, ?, ?, ?,
                        ?, ?, ?, ?,
                        ?, ?, ?, CASE WHEN ? = 1 THEN GETDATE() ELSE NULL END
                    );
            ";
            $pdo->prepare($sqlMerge)->execute([
                $caseId,
                $qaIssueDesc !== '' ? $qaIssueDesc : null,
                $containment !== '' ? $containment : null,
                $rcCategory !== '' ? $rcCategory : null,
                $rootCause !== '' ? $rootCause : null,
                $leakCause !== '' ? $leakCause : null,
                $actionPlan !== '' ? $actionPlan : null,
                $returnContainer !== '' ? $returnContainer : null,
                $expectedQty,
                $setRespondDate,
                $caseId,
                $qaIssueDesc !== '' ? $qaIssueDesc : null,
                $internalRefToken,
                $defaultExpiry,
                $containment !== '' ? $containment : null,
                $rcCategory !== '' ? $rcCategory : null,
                $rootCause !== '' ? $rootCause : null,
                $leakCause !== '' ? $leakCause : null,
                $actionPlan !== '' ? $actionPlan : null,
                $returnContainer !== '' ? $returnContainer : null,
                $expectedQty,
                $setRespondDate,
            ]);

            $pdo->prepare(
                "UPDATE dbo.QMS_CASES SET current_status = ?, updated_at = GETDATE() WHERE case_id = ?"
            )->execute([$nextStatus, $caseId]);

            $savedFiles = !empty($_FILES['car_images'])
                ? saveQmsUploadedFiles($_FILES['car_images'], 'qms_files', "car8d_{$caseId}_", 5)
                : [];
            if (!empty($savedFiles)) {
                $stmtAtt = $pdo->prepare(
                    "INSERT INTO dbo.QMS_FILE (case_id, doc_stage, file_name, file_path, uploaded_by, uploaded_at)
                     VALUES (?, 'CAR', ?, ?, ?, GETDATE())"
                );
                foreach ($savedFiles as $file) {
                    $stmtAtt->execute([$caseId, $file['name'], $file['path'], $actorUserId]);
                }
            }
            $pdo->commit();

            $newData = [
                'current_status' => $nextStatus,
                'qa_issue_description' => $qaIssueDesc,
                'root_cause_category' => $rcCategory,
                'customer_root_cause' => $rootCause,
                'customer_action_plan' => $actionPlan,
                'return_container_no' => $returnContainer,
                'expected_return_qty' => $expectedQty,
            ];
            insertQmsCaseAuditLog($pdo, $caseId, strtoupper($workflowAction), $oldData['current_status'], $nextStatus, $actorName);
            writeLog($pdo, 'UPDATE', 'QMS_CAR', $caseId, $oldData, $newData, "Updated CAR 8D ({$oldData['car_no']})");

            qmsJsonSuccess(['case_id' => $caseId, 'current_status' => $nextStatus], 'บันทึกข้อมูล CAR 8D เรียบร้อยแล้ว');
            break;

        case 'close_claim':
            $caseId = parseQmsPositiveInt($input['case_id'] ?? null, 'รหัสเคส QMS');
            $disposition = strtoupper(trim((string)($input['disposition'] ?? '')));
            if (!in_array($disposition, ['RETURN', 'SCRAP', 'ACCEPT'], true)) {
                throw new InvalidArgumentException('กรุณาเลือกผลการจัดการของเสีย (Disposition: RETURN, SCRAP หรือ ACCEPT)');
            }

            $actualQty = parseQmsBoundedFloat($input['actual_received_qty'] ?? null, 'ยอดรับเข้าจริง', 0, 9999999.9999);
            $cost = parseQmsBoundedFloat($input['cost_estimation'] ?? 0, 'ค่าใช้จ่าย/CN', 0, 99999999.99, true) ?? 0.0;

            $stmtOld = $pdo->prepare(
                "SELECT c.case_id, c.car_no, c.current_status, cl.disposition, cl.actual_received_qty, cl.cost_estimation
                 FROM dbo.QMS_CASES c WITH (NOLOCK)
                 LEFT JOIN dbo.QMS_CLAIM cl WITH (NOLOCK) ON c.case_id = cl.case_id
                 WHERE c.case_id = ?"
            );
            $stmtOld->execute([$caseId]);
            $oldData = $stmtOld->fetch(PDO::FETCH_ASSOC);
            if (!$oldData) {
                qmsJsonError('ไม่พบข้อมูลเคสคุณภาพ', 404);
            }
            if ($oldData['current_status'] === 'CANCELLED') {
                throw new InvalidArgumentException('ไม่สามารถปิดเคลมสำหรับเอกสารที่ถูกยกเลิกแล้ว');
            }

            $stdFmea = !empty($input['std_fmea']) && (string)$input['std_fmea'] !== '0' ? 1 : 0;
            $stdCp = !empty($input['std_control_plan']) && (string)$input['std_control_plan'] !== '0' ? 1 : 0;
            $stdWi = !empty($input['std_wi']) && (string)$input['std_wi'] !== '0' ? 1 : 0;
            $stdOth = trim((string)($input['std_others'] ?? '')) ?: null;

            $v1Date = parseQmsDateOrNull($input['verify_date_1'] ?? null);
            $v2Date = parseQmsDateOrNull($input['verify_date_2'] ?? null);
            $v3Date = parseQmsDateOrNull($input['verify_date_3'] ?? null);

            $parseBitOrNull = static function ($val): ?int {
                if ($val === null || $val === '') {
                    return null;
                }
                return ((string)$val === '1' || $val === true) ? 1 : 0;
            };
            $v1Res = $parseBitOrNull($input['verify_result_1'] ?? null);
            $v2Res = $parseBitOrNull($input['verify_result_2'] ?? null);
            $v3Res = $parseBitOrNull($input['verify_result_3'] ?? null);

            $stmt = $pdo->prepare("EXEC dbo.sp_QMS_CloseClaim ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?");
            $stmt->execute([
                $caseId, $disposition, $actualQty, $cost, $actorUserId,
                $stdFmea, $stdCp, $stdWi, $stdOth,
                $v1Date, $v1Res, $v2Date, $v2Res, $v3Date, $v3Res,
            ]);

            $newData = [
                'current_status' => 'CLOSED',
                'disposition' => $disposition,
                'actual_received_qty' => $actualQty,
                'cost_estimation' => $cost,
                'std_fmea' => $stdFmea,
                'std_control_plan' => $stdCp,
                'std_wi' => $stdWi,
            ];
            insertQmsCaseAuditLog($pdo, $caseId, 'CLOSE_CLAIM', $oldData['current_status'], 'CLOSED', $actorName);
            writeLog($pdo, 'CLOSE', 'QMS_CLAIM', $caseId, $oldData, $newData, "Closed claim {$oldData['car_no']}");

            qmsJsonSuccess(['case_id' => $caseId], 'ตรวจสอบและปิดงานเคลมเรียบร้อยแล้ว');
            break;

        case 'reject_car':
            $caseId = parseQmsPositiveInt($input['case_id'] ?? null, 'รหัสเคส QMS');

            $stmtOld = $pdo->prepare("SELECT case_id, car_no, current_status FROM dbo.QMS_CASES WITH (NOLOCK) WHERE case_id = ?");
            $stmtOld->execute([$caseId]);
            $oldData = $stmtOld->fetch(PDO::FETCH_ASSOC);
            if (!$oldData) {
                qmsJsonError('ไม่พบข้อมูลเคสคุณภาพ', 404);
            }
            if (in_array($oldData['current_status'], ['CLOSED', 'CANCELLED'], true)) {
                throw new InvalidArgumentException('ไม่สามารถตีกลับ CAR ของเคสที่ปิดงานหรือยกเลิกแล้วได้');
            }

            $pdo->beginTransaction();
            $pdo->prepare(
                "UPDATE dbo.QMS_CASES SET current_status = 'SENT_TO_CUSTOMER', updated_at = GETDATE() WHERE case_id = ?"
            )->execute([$caseId]);
            $pdo->prepare(
                "UPDATE dbo.QMS_CAR SET customer_respond_date = NULL WHERE case_id = ?"
            )->execute([$caseId]);
            $pdo->commit();

            insertQmsCaseAuditLog($pdo, $caseId, 'REJECT_CAR', $oldData['current_status'], 'SENT_TO_CUSTOMER', $actorName);
            writeLog($pdo, 'REJECT', 'QMS_CAR', $caseId, $oldData, ['current_status' => 'SENT_TO_CUSTOMER'], "Rejected CAR {$oldData['car_no']} for revision");

            qmsJsonSuccess(['case_id' => $caseId], 'ตีกลับเอกสาร CAR เพื่อแก้ไขเรียบร้อยแล้ว');
            break;

        case 'cancel_case':
            $caseId = parseQmsPositiveInt($input['case_id'] ?? null, 'รหัสเคส QMS');

            $stmtOld = $pdo->prepare("SELECT case_id, car_no, current_status FROM dbo.QMS_CASES WITH (NOLOCK) WHERE case_id = ?");
            $stmtOld->execute([$caseId]);
            $oldData = $stmtOld->fetch(PDO::FETCH_ASSOC);
            if (!$oldData) {
                qmsJsonError('ไม่พบข้อมูลเอกสารคุณภาพ', 404);
            }
            if ($oldData['current_status'] === 'CANCELLED') {
                throw new InvalidArgumentException('เอกสารนี้ถูกยกเลิกไปแล้ว');
            }
            if ($oldData['current_status'] === 'CLOSED') {
                throw new InvalidArgumentException('ไม่สามารถยกเลิกเคสที่ปิดงานเรียบร้อยแล้ว');
            }

            $pdo->prepare(
                "UPDATE dbo.QMS_CASES SET current_status = 'CANCELLED', updated_at = GETDATE() WHERE case_id = ?"
            )->execute([$caseId]);

            insertQmsCaseAuditLog($pdo, $caseId, 'CANCEL_CASE', $oldData['current_status'], 'CANCELLED', $actorName);
            writeLog($pdo, 'CANCEL', 'QMS_CASES', $caseId, $oldData, ['current_status' => 'CANCELLED'], "Cancelled case {$oldData['car_no']}");

            qmsJsonSuccess(['case_id' => $caseId], "ยกเลิกเอกสาร {$oldData['car_no']} เรียบร้อยแล้ว");
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
        writeErrorLog($pdo, 'QMS_CASES', $e->getMessage(), $input ?? null);
    }
    qmsJsonError('เกิดข้อผิดพลาดในการดำเนินการระบบ QMS กรุณาลองใหม่อีกครั้ง', 500);
}
