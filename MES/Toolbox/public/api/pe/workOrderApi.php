<?php
/**
 * PE Enterprise Work Orders & Notifications API (Self-Contained Toolbox Version)
 * Supports listing/KPIs, creation, full editing, status transitions, Tech Mobile actions,
 * soft-delete/restore, machine/technician lookup, and PE_NOTIFICATIONS bell alerts.
 */

require_once __DIR__ . '/_common.php';

try {
    [$action, $input, $currentUser] = parsePeRequest();
    requirePeAccess();
    $actor = getPeActorName($currentUser);

    switch ($action) {
        case 'get_work_orders': {
            $reqStatus = trim((string)($input['status'] ?? ''));
            $isDeleted = ($reqStatus === 'Deleted');
            $baseConditions = [$isDeleted ? 'W.is_active = 0' : 'W.is_active = 1'];
            $baseParams = [];

            if (!empty($input['priority'])) {
                $baseConditions[] = 'W.priority = ?';
                $baseParams[] = trim((string)$input['priority']);
            }
            if (!empty($input['line'])) {
                $baseConditions[] = 'W.line = ?';
                $baseParams[] = trim((string)$input['line']);
            }

            $dateType = trim((string)($input['dateType'] ?? 'requested_at'));
            $validDateTypes = ['requested_at', 'assigned_at', 'completed_at', 'updated_at'];
            if (!in_array($dateType, $validDateTypes, true)) {
                $dateType = 'requested_at';
            }

            $startDate = parsePeDateOrNull($input['startDate'] ?? null);
            $endDate = parsePeDateOrNull($input['endDate'] ?? null);
            if ($startDate !== null) {
                $baseConditions[] = "W.{$dateType} >= ?";
                $baseParams[] = $startDate;
            }
            if ($endDate !== null) {
                $baseConditions[] = "W.{$dateType} < DATEADD(DAY, 1, CAST(? AS DATE))";
                $baseParams[] = $endDate;
            }

            $conditions = $baseConditions;
            $params = $baseParams;

            if ($reqStatus !== '' && $reqStatus !== 'All' && !$isDeleted) {
                if ($reqStatus === 'Active') {
                    $conditions[] = "W.status IN ('Open', 'Pending', 'Assigned', 'In Progress')";
                } else {
                    $conditions[] = 'W.status = ?';
                    $params[] = $reqStatus;
                }
            }

            $limit = max(1, min(1000, (int)($input['limit'] ?? 500)));
            $where = 'WHERE ' . implode(' AND ', $conditions);
            $summaryWhere = 'WHERE ' . implode(' AND ', $baseConditions);

            $sql = "SELECT TOP {$limit}
                        W.wo_id, W.wo_number, W.wo_type, W.machine_id, W.machine_name,
                        M.machine_code, M.machine_name AS machine_display_name, M.is_loto, M.loto_reason,
                        W.line, W.priority, W.status, W.requested_by, W.requested_at,
                        W.issue_title, W.issue_detail, W.photo_before, W.image_path,
                        W.assigned_to, W.assigned_at, W.started_at, W.completed_at,
                        W.repair_minutes, W.root_cause, W.action_taken, W.photo_after,
                        W.parts_used, W.total_cost, W.created_at, W.updated_at, W.is_active
                    FROM " . PE_WORK_ORDERS_TABLE . " W WITH (NOLOCK)
                    LEFT JOIN " . PE_MACHINES_TABLE . " M WITH (NOLOCK) ON W.machine_id = M.machine_id
                    {$where}
                    ORDER BY
                        CASE W.priority WHEN 'Critical' THEN 1 WHEN 'High' THEN 2 WHEN 'Normal' THEN 3 ELSE 4 END,
                        CASE W.status WHEN 'Open' THEN 1 WHEN 'Pending' THEN 1 WHEN 'Assigned' THEN 2 WHEN 'In Progress' THEN 3 ELSE 4 END,
                        W.requested_at DESC";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $summSql = "SELECT
                            COUNT(*) AS total,
                            SUM(CASE WHEN W.status IN ('Open', 'Pending', 'Assigned', 'In Progress') THEN 1 ELSE 0 END) AS open_count,
                            SUM(CASE WHEN W.status = 'Completed' THEN 1 ELSE 0 END) AS completed_count,
                            ISNULL(AVG(CASE WHEN W.status = 'Completed' AND W.repair_minutes IS NOT NULL THEN CAST(W.repair_minutes AS FLOAT) ELSE NULL END), 0) AS avg_repair,
                            ISNULL(SUM(ISNULL(W.total_cost, 0)), 0) AS total_parts_cost
                        FROM " . PE_WORK_ORDERS_TABLE . " W WITH (NOLOCK)
                        {$summaryWhere}";
            $summStmt = $pdo->prepare($summSql);
            $summStmt->execute($baseParams);
            $summary = $summStmt->fetch(PDO::FETCH_ASSOC) ?: [];

            peJsonSuccess($data, 'โหลดรายการใบแจ้งซ่อมสำเร็จ', ['summary' => $summary]);
            break;
        }

        case 'create_wo': {
            $title = trim((string)($input['issue_title'] ?? ''));
            if ($title === '') {
                throw new InvalidArgumentException('กรุณาระบุหัวข้อปัญหา / อาการเสีย');
            }

            $machineId = !empty($input['machine_id']) ? parsePePositiveInt($input['machine_id'], 'เครื่องจักร') : null;
            $machineName = mb_substr(trim((string)($input['machine_name'] ?? '')), 0, 200);
            $line = mb_substr(trim((string)($input['line'] ?? '')), 0, 100);
            if ($machineId !== null) {
                $mStmt = $pdo->prepare("SELECT machine_name, line FROM " . PE_MACHINES_TABLE . " WITH (NOLOCK) WHERE machine_id = ?");
                $mStmt->execute([$machineId]);
                $mData = $mStmt->fetch(PDO::FETCH_ASSOC);
                if ($mData) {
                    $machineName = $mData['machine_name'];
                    if ($line === '') {
                        $line = (string)$mData['line'];
                    }
                }
            }

            $requestedAt = parsePeDateTimeOrNull($input['requested_at'] ?? null) ?? date('Y-m-d H:i:s');
            $woType = trim((string)($input['wo_type'] ?? 'Corrective'));
            $allowedTypes = ['Corrective', 'Preventive', 'Improvement', 'Inspection', 'Setup', 'Safety/Hazard'];
            if (!in_array($woType, $allowedTypes, true)) {
                $woType = 'Corrective';
            }
            $priority = trim((string)($input['priority'] ?? 'Normal'));
            if (!in_array($priority, ['Critical', 'High', 'Normal', 'Low'], true)) {
                $priority = 'Normal';
            }

            $imagePath = !empty($input['image_path']) ? trim((string)$input['image_path']) : null;
            if (!empty($input['image_base64'])) {
                $imagePath = savePeBase64Image((string)$input['image_base64'], 'pe_images', 'WO_');
            }

            $requestedBy = mb_substr(trim((string)($input['requested_by'] ?? '')) ?: $actor, 0, 150);
            $issueDetail = trim((string)($input['issue_detail'] ?? ''));

            $pdo->beginTransaction();
            $woNumber = generatePeWoNumber($pdo);

            $sql = "INSERT INTO " . PE_WORK_ORDERS_TABLE . "
                    (wo_number, wo_type, machine_id, machine_name, line, priority, status,
                     requested_by, requested_at, issue_title, issue_detail, image_path, is_active, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, 'Open', ?, ?, ?, ?, ?, 1, GETDATE())";
            $pdo->prepare($sql)->execute([
                $woNumber,
                $woType,
                $machineId,
                $machineName,
                $line,
                $priority,
                $requestedBy,
                $requestedAt,
                mb_substr($title, 0, 255),
                $issueDetail,
                $imagePath,
            ]);
            $newId = (int)$pdo->lastInsertId();

            writeLog($pdo, 'CREATE', 'PE_WORK_ORDERS', $newId, null, [
                'wo_number' => $woNumber,
                'wo_type' => $woType,
                'machine_id' => $machineId,
                'machine_name' => $machineName,
                'priority' => $priority,
                'issue_title' => $title,
            ], "Created work order {$woNumber}");

            $pdo->commit();
            peJsonSuccess(['wo_id' => $newId, 'wo_number' => $woNumber], "สร้างใบแจ้งซ่อม {$woNumber} สำเร็จ", ['wo_number' => $woNumber]);
            break;
        }

        case 'update_status_only': {
            $id = parsePePositiveInt($input['wo_id'] ?? null, 'รหัสใบงาน');
            $newStatus = trim((string)($input['status'] ?? ''));
            if (!in_array($newStatus, ['Open', 'Pending', 'Assigned', 'In Progress', 'Completed', 'Cancelled'], true)) {
                throw new InvalidArgumentException('สถานะใบงานไม่ถูกต้อง');
            }

            $oldStmt = $pdo->prepare("SELECT wo_number, status FROM " . PE_WORK_ORDERS_TABLE . " WHERE wo_id = ?");
            $oldStmt->execute([$id]);
            $oldRow = $oldStmt->fetch(PDO::FETCH_ASSOC);
            if (!$oldRow) {
                throw new InvalidArgumentException('ไม่พบใบงานซ่อมในระบบ');
            }

            $pdo->beginTransaction();
            $pdo->prepare("UPDATE " . PE_WORK_ORDERS_TABLE . " SET status = ?, updated_at = GETDATE() WHERE wo_id = ?")
                ->execute([$newStatus, $id]);
            writeLog($pdo, 'UPDATE', 'PE_WORK_ORDERS', $id, $oldRow, ['status' => $newStatus], "Updated WO status -> {$newStatus}");
            $pdo->commit();

            peJsonSuccess(['wo_id' => $id, 'status' => $newStatus], 'อัปเดตสถานะใบงานเรียบร้อยแล้ว');
            break;
        }

        case 'update_wo': {
            $id = parsePePositiveInt($input['wo_id'] ?? null, 'รหัสใบงาน');

            $oldStmt = $pdo->prepare(
                "SELECT wo_id, wo_number, wo_type, machine_id, machine_name, line, priority, status,
                        assigned_to, assigned_at, started_at, completed_at, repair_minutes, root_cause, action_taken
                 FROM " . PE_WORK_ORDERS_TABLE . " WHERE wo_id = ?"
            );
            $oldStmt->execute([$id]);
            $oldRow = $oldStmt->fetch(PDO::FETCH_ASSOC);
            if (!$oldRow) {
                throw new InvalidArgumentException('ไม่พบใบงานซ่อมที่ต้องการแก้ไข');
            }

            $pdo->beginTransaction();
            $fields = [];
            $params = [];

            if (array_key_exists('machine_id', $input)) {
                $machineId = !empty($input['machine_id']) ? parsePePositiveInt($input['machine_id'], 'เครื่องจักร') : null;
                $fields[] = 'machine_id = ?';
                $params[] = $machineId;
                if ($machineId !== null) {
                    $mStmt = $pdo->prepare("SELECT machine_name, line FROM " . PE_MACHINES_TABLE . " WITH (NOLOCK) WHERE machine_id = ?");
                    $mStmt->execute([$machineId]);
                    $mData = $mStmt->fetch(PDO::FETCH_ASSOC);
                    if ($mData) {
                        $input['machine_name'] = $mData['machine_name'];
                        if (empty($input['line'])) {
                            $input['line'] = $mData['line'];
                        }
                    }
                }
            }

            $updatable = [
                'status', 'priority', 'assigned_to', 'wo_type', 'issue_title', 'issue_detail',
                'root_cause', 'action_taken', 'line', 'machine_name', 'image_path', 'photo_after',
            ];
            foreach ($updatable as $col) {
                if (array_key_exists($col, $input)) {
                    $fields[] = "{$col} = ?";
                    $params[] = $input[$col] === '' && in_array($col, ['image_path', 'photo_after', 'assigned_to'], true)
                        ? null
                        : $input[$col];
                }
            }

            if (!empty($input['photo_after_base64'])) {
                $savedAfter = savePeBase64Image((string)$input['photo_after_base64'], 'pe_images', 'AFTER_');
                $fields[] = 'photo_after = ?';
                $params[] = $savedAfter;
            }
            if (!empty($input['image_base64'])) {
                $savedBefore = savePeBase64Image((string)$input['image_base64'], 'pe_images', 'WO_');
                $fields[] = 'image_path = ?';
                $params[] = $savedBefore;
            }

            if (!empty($input['assigned_to']) && empty($input['assigned_at']) && empty($oldRow['assigned_at'])) {
                $fields[] = 'assigned_at = GETDATE()';
            } elseif (array_key_exists('assigned_at', $input)) {
                $dt = parsePeDateTimeOrNull($input['assigned_at']);
                if ($dt !== null) {
                    $fields[] = 'assigned_at = ?';
                    $params[] = $dt;
                }
            }

            if (array_key_exists('started_at', $input)) {
                $dt = parsePeDateTimeOrNull($input['started_at']);
                if ($dt !== null) {
                    $fields[] = 'started_at = ?';
                    $params[] = $dt;
                }
            }

            $completedAtExplicit = null;
            if (array_key_exists('completed_at', $input)) {
                $completedAtExplicit = parsePeDateTimeOrNull($input['completed_at']);
                if ($completedAtExplicit !== null) {
                    $fields[] = 'completed_at = ?';
                    $params[] = $completedAtExplicit;
                }
            }

            if (isset($input['repair_minutes']) && $input['repair_minutes'] !== '') {
                $repairMin = max(0, min(500000, (int)$input['repair_minutes']));
                $fields[] = 'repair_minutes = ?';
                $params[] = $repairMin;
            }

            $isCompleted = (($input['status'] ?? $oldRow['status']) === 'Completed');
            if ($isCompleted && $completedAtExplicit === null && ($input['status'] ?? '') === 'Completed') {
                $fields[] = 'completed_at = COALESCE(completed_at, GETDATE())';
            }

            $fields[] = 'updated_at = GETDATE()';
            $params[] = $id;

            $sql = 'UPDATE ' . PE_WORK_ORDERS_TABLE . ' SET ' . implode(', ', $fields) . ' WHERE wo_id = ?';
            $pdo->prepare($sql)->execute($params);

            if ($isCompleted) {
                $dtStmt = $pdo->prepare("SELECT downtime_id FROM " . PE_DOWNTIME_LOG_TABLE . " WHERE wo_id = ? AND end_time IS NULL");
                $dtStmt->execute([$id]);
                $dtRecord = $dtStmt->fetch(PDO::FETCH_ASSOC);
                if ($dtRecord) {
                    $closeTime = $completedAtExplicit ?? date('Y-m-d H:i:s');
                    $pdo->prepare("UPDATE " . PE_DOWNTIME_LOG_TABLE . " SET end_time = ? WHERE downtime_id = ?")
                        ->execute([$closeTime, $dtRecord['downtime_id']]);
                    writeLog($pdo, 'UPDATE', 'PE_DOWNTIME_LOG', $dtRecord['downtime_id'], ['end_time' => null], ['end_time' => $closeTime], "Auto-closed downtime via WO #{$id}");
                }
            }

            writeLog($pdo, 'UPDATE', 'PE_WORK_ORDERS', $id, $oldRow, [
                'status' => $input['status'] ?? $oldRow['status'],
                'assigned_to' => $input['assigned_to'] ?? $oldRow['assigned_to'],
                'priority' => $input['priority'] ?? $oldRow['priority'],
            ], "Updated WO {$oldRow['wo_number']}");

            $pdo->commit();
            peJsonSuccess(['wo_id' => $id], 'บันทึกการอัปเดตใบแจ้งซ่อมเรียบร้อยแล้ว');
            break;
        }

        case 'quick_accept': {
            $id = parsePePositiveInt($input['wo_id'] ?? null, 'รหัสใบงาน');
            $oldStmt = $pdo->prepare("SELECT wo_number, status, assigned_to FROM " . PE_WORK_ORDERS_TABLE . " WHERE wo_id = ?");
            $oldStmt->execute([$id]);
            $oldRow = $oldStmt->fetch(PDO::FETCH_ASSOC);
            if (!$oldRow) {
                throw new InvalidArgumentException('ไม่พบใบงานซ่อม');
            }

            $pdo->beginTransaction();
            $pdo->prepare(
                "UPDATE " . PE_WORK_ORDERS_TABLE . "
                 SET status = 'Assigned', assigned_to = ?, assigned_at = GETDATE(), updated_at = GETDATE()
                 WHERE wo_id = ?"
            )->execute([$actor, $id]);

            writeLog($pdo, 'UPDATE', 'PE_WORK_ORDERS', $id, $oldRow, ['status' => 'Assigned', 'assigned_to' => $actor], "Technician accepted {$oldRow['wo_number']}");
            $pdo->commit();
            peJsonSuccess(['wo_id' => $id, 'status' => 'Assigned', 'assigned_to' => $actor], 'รับงานซ่อมเรียบร้อยแล้ว');
            break;
        }

        case 'quick_start': {
            $id = parsePePositiveInt($input['wo_id'] ?? null, 'รหัสใบงาน');
            $oldStmt = $pdo->prepare("SELECT wo_number, status, started_at FROM " . PE_WORK_ORDERS_TABLE . " WHERE wo_id = ?");
            $oldStmt->execute([$id]);
            $oldRow = $oldStmt->fetch(PDO::FETCH_ASSOC);
            if (!$oldRow) {
                throw new InvalidArgumentException('ไม่พบใบงานซ่อม');
            }

            $pdo->beginTransaction();
            $pdo->prepare(
                "UPDATE " . PE_WORK_ORDERS_TABLE . "
                 SET status = 'In Progress',
                     assigned_to = COALESCE(NULLIF(assigned_to, ''), ?),
                     assigned_at = COALESCE(assigned_at, GETDATE()),
                     started_at = GETDATE(),
                     updated_at = GETDATE()
                 WHERE wo_id = ?"
            )->execute([$actor, $id]);

            writeLog($pdo, 'UPDATE', 'PE_WORK_ORDERS', $id, $oldRow, ['status' => 'In Progress'], "Started repair on {$oldRow['wo_number']}");
            $pdo->commit();
            peJsonSuccess(['wo_id' => $id, 'status' => 'In Progress'], 'เริ่มดำเนินการซ่อมบำรุงแล้ว');
            break;
        }

        case 'revert_start': {
            $id = parsePePositiveInt($input['wo_id'] ?? null, 'รหัสใบงาน');
            $oldStmt = $pdo->prepare("SELECT wo_number, status, started_at FROM " . PE_WORK_ORDERS_TABLE . " WHERE wo_id = ?");
            $oldStmt->execute([$id]);
            $oldRow = $oldStmt->fetch(PDO::FETCH_ASSOC);
            if (!$oldRow) {
                throw new InvalidArgumentException('ไม่พบใบงานซ่อม');
            }

            $pdo->beginTransaction();
            $pdo->prepare("UPDATE " . PE_WORK_ORDERS_TABLE . " SET status = 'Assigned', started_at = NULL, updated_at = GETDATE() WHERE wo_id = ?")
                ->execute([$id]);
            writeLog($pdo, 'UPDATE', 'PE_WORK_ORDERS', $id, $oldRow, ['status' => 'Assigned', 'started_at' => null], "Reverted start on {$oldRow['wo_number']}");
            $pdo->commit();
            peJsonSuccess(['wo_id' => $id, 'status' => 'Assigned'], 'ย้อนสถานะกลับเป็นรอเข้าดำเนินการแล้ว');
            break;
        }

        case 'quick_close': {
            $id = parsePePositiveInt($input['wo_id'] ?? null, 'รหัสใบงาน');
            $oldStmt = $pdo->prepare("SELECT wo_number, status, started_at, completed_at FROM " . PE_WORK_ORDERS_TABLE . " WHERE wo_id = ?");
            $oldStmt->execute([$id]);
            $oldRow = $oldStmt->fetch(PDO::FETCH_ASSOC);
            if (!$oldRow) {
                throw new InvalidArgumentException('ไม่พบใบงานซ่อม');
            }

            $actionTaken = trim((string)($input['action_taken'] ?? ''));
            $rootCause = trim((string)($input['root_cause'] ?? ''));
            $startedAt = parsePeDateTimeOrNull($input['started_at'] ?? null);
            $completedAt = parsePeDateTimeOrNull($input['completed_at'] ?? null);

            $photoAfter = !empty($input['photo_after']) ? trim((string)$input['photo_after']) : null;
            if (!empty($input['photo_after_base64'])) {
                $photoAfter = savePeBase64Image((string)$input['photo_after_base64'], 'pe_images', 'AFTER_');
            }

            $pdo->beginTransaction();
            $sql = "UPDATE " . PE_WORK_ORDERS_TABLE . "
                    SET status = 'Completed',
                        updated_at = GETDATE(),
                        photo_after = COALESCE(?, photo_after),
                        action_taken = ?,
                        root_cause = ?";
            $params = [$photoAfter, $actionTaken, $rootCause];

            if ($startedAt !== null) {
                $sql .= ', started_at = ?';
                $params[] = $startedAt;
            }
            if ($completedAt !== null) {
                $sql .= ', completed_at = ?';
                $params[] = $completedAt;
            } else {
                $sql .= ', completed_at = GETDATE()';
            }

            $sql .= ', repair_minutes = CASE WHEN ';
            $startExpr = $startedAt !== null ? '?' : 'COALESCE(started_at, requested_at)';
            $endExpr = $completedAt !== null ? '?' : 'GETDATE()';
            if ($startedAt !== null) {
                $params[] = $startedAt;
            }
            if ($completedAt !== null) {
                $params[] = $completedAt;
            }
            $sql .= "DATEDIFF(MINUTE, {$startExpr}, {$endExpr}) >= 0 THEN ";
            if ($startedAt !== null) {
                $params[] = $startedAt;
            }
            if ($completedAt !== null) {
                $params[] = $completedAt;
            }
            $sql .= "DATEDIFF(MINUTE, {$startExpr}, {$endExpr}) ELSE 0 END WHERE wo_id = ?";
            $params[] = $id;

            $pdo->prepare($sql)->execute($params);

            $dtStmt = $pdo->prepare("SELECT downtime_id FROM " . PE_DOWNTIME_LOG_TABLE . " WHERE wo_id = ? AND end_time IS NULL");
            $dtStmt->execute([$id]);
            $dtRecord = $dtStmt->fetch(PDO::FETCH_ASSOC);
            if ($dtRecord) {
                $closeTime = $completedAt ?? date('Y-m-d H:i:s');
                $pdo->prepare("UPDATE " . PE_DOWNTIME_LOG_TABLE . " SET end_time = ? WHERE downtime_id = ?")
                    ->execute([$closeTime, $dtRecord['downtime_id']]);
            }

            writeLog($pdo, 'UPDATE', 'PE_WORK_ORDERS', $id, $oldRow, ['status' => 'Completed', 'root_cause' => $rootCause], "Closed WO {$oldRow['wo_number']}");
            $pdo->commit();
            peJsonSuccess(['wo_id' => $id, 'status' => 'Completed'], 'ปิดงานซ่อมเรียบร้อยแล้ว');
            break;
        }

        case 'delete_wo': {
            requirePeAccess(['manage_maintenance'], ['admin', 'creator', 'manager', 'maintenance', 'supervisor']);
            $id = parsePePositiveInt($input['wo_id'] ?? null, 'รหัสใบงาน');
            $oldStmt = $pdo->prepare("SELECT wo_number, is_active FROM " . PE_WORK_ORDERS_TABLE . " WHERE wo_id = ?");
            $oldStmt->execute([$id]);
            $oldRow = $oldStmt->fetch(PDO::FETCH_ASSOC);
            if (!$oldRow) {
                throw new InvalidArgumentException('ไม่พบใบงานซ่อม');
            }

            $pdo->beginTransaction();
            $pdo->prepare("UPDATE " . PE_WORK_ORDERS_TABLE . " SET is_active = 0, updated_at = GETDATE() WHERE wo_id = ?")->execute([$id]);
            writeLog($pdo, 'DELETE', 'PE_WORK_ORDERS', $id, $oldRow, ['is_active' => 0], "Soft deleted {$oldRow['wo_number']}");
            $pdo->commit();
            peJsonSuccess(['wo_id' => $id], 'ลบใบแจ้งซ่อมไปยังถังขยะเรียบร้อยแล้ว');
            break;
        }

        case 'restore_wo': {
            requirePeAccess(['manage_maintenance'], ['admin', 'creator', 'manager', 'maintenance', 'supervisor']);
            $id = parsePePositiveInt($input['wo_id'] ?? null, 'รหัสใบงาน');
            $oldStmt = $pdo->prepare("SELECT wo_number, is_active FROM " . PE_WORK_ORDERS_TABLE . " WHERE wo_id = ?");
            $oldStmt->execute([$id]);
            $oldRow = $oldStmt->fetch(PDO::FETCH_ASSOC);
            if (!$oldRow) {
                throw new InvalidArgumentException('ไม่พบใบงานซ่อม');
            }

            $pdo->beginTransaction();
            $pdo->prepare("UPDATE " . PE_WORK_ORDERS_TABLE . " SET is_active = 1, updated_at = GETDATE() WHERE wo_id = ?")->execute([$id]);
            writeLog($pdo, 'UPDATE', 'PE_WORK_ORDERS', $id, $oldRow, ['is_active' => 1], "Restored {$oldRow['wo_number']}");
            $pdo->commit();
            peJsonSuccess(['wo_id' => $id], 'กู้คืนใบแจ้งซ่อมเรียบร้อยแล้ว');
            break;
        }

        case 'get_machines_list': {
            $machines = $pdo->query(
                "SELECT TOP 500 machine_id, machine_code, machine_name, line
                 FROM " . PE_MACHINES_TABLE . " WITH (NOLOCK)
                 WHERE is_active = 1 AND status != 'Inactive'
                 ORDER BY machine_code ASC"
            )->fetchAll(PDO::FETCH_ASSOC);

            $technicians = $pdo->query(
                "SELECT TOP 300 name_th AS tech_name
                 FROM " . MANPOWER_EMPLOYEES_TABLE . " WITH (NOLOCK)
                 WHERE is_active = 1 AND name_th IS NOT NULL AND name_th != ''
                 ORDER BY
                    CASE
                        WHEN line = 'MT/PE' THEN 1
                        WHEN line LIKE '%ENGINEER%' THEN 2
                        WHEN line LIKE '%Retrofit%' THEN 3
                        WHEN line LIKE '%Toolbox%' THEN 4
                        ELSE 5
                    END,
                    name_th"
            )->fetchAll(PDO::FETCH_COLUMN);

            $lines = $pdo->query(
                "SELECT DISTINCT line
                 FROM " . PE_MACHINES_TABLE . " WITH (NOLOCK)
                 WHERE is_active = 1 AND line IS NOT NULL AND line != ''
                 ORDER BY line ASC"
            )->fetchAll(PDO::FETCH_COLUMN);

            peJsonSuccess($machines, 'โหลดข้อมูลเครื่องจักรและรายชื่อช่างสำเร็จ', [
                'technicians' => $technicians,
                'lines' => $lines,
            ]);
            break;
        }

        case 'get_notifications': {
            $notifs = $pdo->query(
                "SELECT TOP 30 id, module, ref_id, title, message, alert_level, created_at
                 FROM dbo.PE_NOTIFICATIONS WITH (NOLOCK)
                 WHERE is_active = 1
                 ORDER BY created_at DESC, id DESC"
            )->fetchAll(PDO::FETCH_ASSOC);
            peJsonSuccess($notifs, 'โหลดการแจ้งเตือนสำเร็จ', ['count' => count($notifs)]);
            break;
        }

        case 'clear_notifications': {
            $pdo->beginTransaction();
            $affected = $pdo->exec("UPDATE dbo.PE_NOTIFICATIONS SET is_active = 0 WHERE is_active = 1");
            writeLog($pdo, 'UPDATE', 'PE_NOTIFICATIONS', 'ALL', ['is_active' => 1], ['is_active' => 0, 'cleared' => $affected], 'Cleared PE notifications');
            $pdo->commit();
            peJsonSuccess(['cleared' => (int)$affected], 'ล้างรายการแจ้งเตือนทั้งหมดเรียบร้อยแล้ว');
            break;
        }

        default:
            peJsonError('Invalid action requested', 400);
    }
} catch (Throwable $e) {
    handleApiError($e, $pdo ?? null, $input ?? $_REQUEST);
}
