<?php
/**
 * Self-contained Safety, LOTO Lock/Unlock Verification, Hazard Reports,
 * Pre-Op Audits/Templates & Safety Cards API for Toolbox PE Enterprise (Phase 2.2B).
 */

require_once __DIR__ . '/_common.php';

try {
    [$action, $input, $currentUser] = parsePeRequest();
    requirePeAccess();
    $actor = trim((string)($currentUser['fullname'] ?: $currentUser['username'] ?: 'System'));

    switch ($action) {
        case 'get_loto_overview': {
            $machines = $pdo->query(
                "SELECT TOP 300 M.machine_id, M.machine_code, M.machine_name, M.line, M.area, M.criticality,
                        M.status, M.is_loto, M.loto_reason,
                        L.locked_by, L.locked_at, L.wo_id
                 FROM " . PE_MACHINES_TABLE . " M WITH (NOLOCK)
                 OUTER APPLY (
                     SELECT TOP 1 locked_by, locked_at, wo_id
                     FROM dbo.PE_LOTO_LOGS WITH (NOLOCK)
                     WHERE machine_id = M.machine_id AND UPPER(ISNULL(status, '')) = 'LOCKED'
                     ORDER BY locked_at DESC, log_id DESC
                 ) L
                 WHERE M.is_active = 1
                 ORDER BY ISNULL(M.is_loto, 0) DESC, M.line ASC, M.machine_code ASC"
            )->fetchAll(PDO::FETCH_ASSOC);

            $logs = $pdo->query(
                "SELECT TOP 200 L.log_id, L.machine_id, M.machine_code, M.machine_name, M.line,
                        L.wo_id, W.wo_number, L.locked_by, L.locked_at, L.unlocked_by, L.unlocked_at,
                        L.status, L.reason, L.updated_at
                 FROM dbo.PE_LOTO_LOGS L WITH (NOLOCK)
                 LEFT JOIN " . PE_MACHINES_TABLE . " M WITH (NOLOCK) ON L.machine_id = M.machine_id
                 LEFT JOIN " . PE_WORK_ORDERS_TABLE . " W WITH (NOLOCK) ON L.wo_id = W.wo_id
                 ORDER BY L.log_id DESC"
            )->fetchAll(PDO::FETCH_ASSOC);

            $openWos = $pdo->query(
                "SELECT TOP 100 wo_id, wo_number, machine_id, issue_title, status
                 FROM " . PE_WORK_ORDERS_TABLE . " WITH (NOLOCK)
                 WHERE is_active = 1 AND status IN ('Open', 'Pending', 'Assigned', 'In Progress')
                 ORDER BY wo_id DESC"
            )->fetchAll(PDO::FETCH_ASSOC);

            peJsonSuccess([
                'machines' => $machines,
                'logs' => $logs,
                'open_wos' => $openWos,
            ], 'โหลดข้อมูลสถานะ LOTO สำเร็จ');
            break;
        }

        case 'loto_lock': {
            requirePeAccess(['manage_maintenance', 'manage_production'], ['admin', 'creator', 'manager', 'maintenance', 'engineer', 'supervisor']);
            $machineId = parsePePositiveInt($input['machine_id'] ?? null, 'รหัสเครื่องจักร');
            $woId = !empty($input['wo_id']) ? parsePePositiveInt($input['wo_id'], 'รหัสใบแจ้งซ่อม') : null;
            $lockedBy = trim((string)($input['locked_by'] ?? '')) ?: $actor;
            $reason = trim((string)($input['reason'] ?? ''));

            if ($reason === '') {
                throw new InvalidArgumentException('กรุณาระบุเหตุผลการตัดแยกระบบพลังงาน (LOTO Reason)');
            }

            $pdo->beginTransaction();

            $mStmt = $pdo->prepare(
                "SELECT machine_id, machine_code, machine_name, criticality, area, is_loto, loto_reason
                 FROM " . PE_MACHINES_TABLE . " WHERE machine_id = ? AND is_active = 1"
            );
            $mStmt->execute([$machineId]);
            $mRow = $mStmt->fetch(PDO::FETCH_ASSOC);
            if (!$mRow) {
                peJsonError('ไม่พบข้อมูลเครื่องจักร', 404);
            }
            if ((int)($mRow['is_loto'] ?? 0) === 1) {
                throw new InvalidArgumentException('เครื่องจักรนี้ถูกติดป้าย LOTO อยู่แล้ว');
            }

            $pdo->prepare("UPDATE " . PE_MACHINES_TABLE . " SET is_loto = 1, loto_reason = ?, updated_at = GETDATE() WHERE machine_id = ?")
                ->execute([$reason, $machineId]);

            $pdo->prepare("INSERT INTO dbo.PE_LOTO_LOGS (machine_id, wo_id, locked_by, locked_at, status, reason, updated_at) VALUES (?, ?, ?, GETDATE(), 'Locked', ?, GETDATE())")
                ->execute([$machineId, $woId, $lockedBy, $reason]);
            $logId = (int)$pdo->lastInsertId();

            if (in_array($mRow['criticality'] ?? '', ['High', 'Critical'], true)) {
                $title = "⚠️ LOTO ALERT: {$mRow['machine_name']}";
                $msg = "เครื่องจักรสำคัญถูก Lock Out โดย {$lockedBy}\nเหตุผล: {$reason}";
                $pdo->prepare("INSERT INTO dbo.PE_NOTIFICATIONS (module, ref_id, title, message, alert_level, is_active, created_at) VALUES ('LOTO', ?, ?, ?, 'danger', 1, GETDATE())")
                    ->execute([$machineId, $title, $msg]);
            }

            writeLog($pdo, 'UPDATE', 'PE_LOTO_LOGS', $logId, ['is_loto' => 0], ['is_loto' => 1, 'machine_id' => $machineId, 'locked_by' => $lockedBy, 'reason' => $reason], "LOTO Locked {$mRow['machine_code']}");
            $pdo->commit();

            peJsonSuccess(['machine_id' => $machineId, 'log_id' => $logId], "ติดป้ายนิรภัย LOTO เครื่อง {$mRow['machine_code']} เรียบร้อยแล้ว");
            break;
        }

        case 'loto_unlock': {
            requirePeAccess(['manage_maintenance', 'manage_production'], ['admin', 'creator', 'manager', 'maintenance', 'engineer', 'supervisor']);
            $machineId = parsePePositiveInt($input['machine_id'] ?? null, 'รหัสเครื่องจักร');
            $unlockedBy = trim((string)($input['unlocked_by'] ?? ''));
            $pin = (string)($input['unlocked_pin'] ?? '');

            if ($unlockedBy === '' || $pin === '') {
                throw new InvalidArgumentException('กรุณาระบุชื่อผู้ใช้งาน (Username) และรหัสผ่านยืนยันการปลด LOTO');
            }

            $uStmt = $pdo->prepare("SELECT id, username, fullname, password, role FROM dbo.USERS WITH (NOLOCK) WHERE username = ? AND is_active = 1");
            $uStmt->execute([$unlockedBy]);
            $supUser = $uStmt->fetch(PDO::FETCH_ASSOC);
            if (!$supUser || !password_verify($pin, (string)$supUser['password'])) {
                peJsonError('ชื่อผู้ใช้หรือรหัสผ่านยืนยันไม่ถูกต้อง ไม่สามารถปลดล็อก LOTO ได้', 403);
            }

            $mStmt = $pdo->prepare("SELECT machine_id, machine_code, machine_name, is_loto, loto_reason FROM " . PE_MACHINES_TABLE . " WHERE machine_id = ?");
            $mStmt->execute([$machineId]);
            $oldMachine = $mStmt->fetch(PDO::FETCH_ASSOC);
            if (!$oldMachine) {
                peJsonError('ไม่พบข้อมูลเครื่องจักร', 404);
            }

            $pdo->beginTransaction();

            $pdo->prepare("UPDATE " . PE_MACHINES_TABLE . " SET is_loto = 0, loto_reason = NULL, updated_at = GETDATE() WHERE machine_id = ?")
                ->execute([$machineId]);

            $pdo->prepare(
                "UPDATE dbo.PE_LOTO_LOGS
                 SET unlocked_by = ?, unlocked_at = GETDATE(), status = 'Unlocked', updated_at = GETDATE()
                 WHERE machine_id = ? AND UPPER(ISNULL(status, '')) = 'LOCKED'"
            )->execute([$unlockedBy, $machineId]);

            $pdo->prepare("UPDATE dbo.PE_NOTIFICATIONS SET is_active = 0 WHERE module = 'LOTO' AND ref_id = ?")
                ->execute([$machineId]);

            writeLog($pdo, 'UPDATE', 'PE_LOTO_LOGS', $machineId, $oldMachine, ['is_loto' => 0, 'unlocked_by' => $unlockedBy], "LOTO Unlocked {$oldMachine['machine_code']} by {$unlockedBy}");
            $pdo->commit();

            peJsonSuccess(['machine_id' => $machineId], "ปลดล็อก LOTO เครื่อง {$oldMachine['machine_code']} เรียบร้อยแล้ว");
            break;
        }

        case 'get_hazard_reports': {
            $status = trim((string)($input['status'] ?? 'all'));
            $limit = max(1, min(300, (int)($input['limit'] ?? 100)));
            $days = max(1, min(365, (int)($input['days'] ?? 90)));

            $sql = "SELECT TOP {$limit}
                        W.wo_id, W.wo_number, W.wo_type, W.machine_id, W.machine_name, W.line,
                        W.priority, W.requested_by, W.requested_at, W.issue_title, W.issue_detail,
                        W.image_path, W.photo_before, W.status, W.assigned_to, W.completed_at,
                        W.action_taken AS notes, A.checklist_data
                    FROM " . PE_WORK_ORDERS_TABLE . " W WITH (NOLOCK)
                    LEFT JOIN dbo.PE_PREOP_AUDITS A WITH (NOLOCK) ON W.wo_id = A.wo_id
                    WHERE W.is_active = 1
                      AND W.wo_type = 'Safety/Hazard'
                      AND W.requested_at >= DATEADD(DAY, -{$days}, GETDATE())";
            $params = [];
            if ($status !== '' && $status !== 'all') {
                $sql .= ' AND W.status = ?';
                $params[] = $status;
            }
            $sql .= " ORDER BY CASE W.status WHEN 'Pending' THEN 1 WHEN 'Open' THEN 1 WHEN 'In Progress' THEN 2 ELSE 3 END, W.requested_at DESC";

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $reports = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $kpi = $pdo->query(
                "SELECT
                    COUNT(*) AS total,
                    SUM(CASE WHEN status IN ('Pending', 'Open') THEN 1 ELSE 0 END) AS pending,
                    SUM(CASE WHEN status IN ('Assigned', 'In Progress') THEN 1 ELSE 0 END) AS in_progress,
                    SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) AS completed,
                    ISNULL(AVG(CASE WHEN completed_at IS NOT NULL THEN CAST(DATEDIFF(MINUTE, requested_at, completed_at) AS FLOAT) ELSE NULL END), 0) AS avg_response_min
                 FROM " . PE_WORK_ORDERS_TABLE . " WITH (NOLOCK)
                 WHERE is_active = 1
                   AND wo_type = 'Safety/Hazard'
                   AND requested_at >= DATEADD(DAY, -{$days}, GETDATE())"
            )->fetch(PDO::FETCH_ASSOC) ?: ['total' => 0, 'pending' => 0, 'in_progress' => 0, 'completed' => 0, 'avg_response_min' => 0];

            peJsonSuccess($reports, 'โหลดรายงานจุดเสี่ยงด้านความปลอดภัยสำเร็จ', ['kpi' => $kpi]);
            break;
        }

        case 'update_hazard_status': {
            requirePeAccess(['manage_maintenance'], ['admin', 'creator', 'manager', 'maintenance', 'engineer', 'supervisor']);
            $woId = parsePePositiveInt($input['wo_id'] ?? null, 'รหัสใบแจ้งเตือนจุดเสี่ยง');
            $status = trim((string)($input['status'] ?? ''));
            $notes = trim((string)($input['notes'] ?? ''));
            $assignedTo = trim((string)($input['assigned_to'] ?? ''));

            if (!in_array($status, ['Pending', 'In Progress', 'Completed', 'Cancelled'], true)) {
                throw new InvalidArgumentException('สถานะรายงานจุดเสี่ยงไม่ถูกต้อง');
            }

            $oldStmt = $pdo->prepare("SELECT wo_id, status, action_taken AS notes, assigned_to FROM " . PE_WORK_ORDERS_TABLE . " WHERE wo_id = ? AND wo_type = 'Safety/Hazard'");
            $oldStmt->execute([$woId]);
            $oldRow = $oldStmt->fetch(PDO::FETCH_ASSOC);
            if (!$oldRow) {
                peJsonError('ไม่พบรายการจุดเสี่ยงด้านความปลอดภัย', 404);
            }

            $pdo->beginTransaction();
            $pdo->prepare(
                "UPDATE " . PE_WORK_ORDERS_TABLE . "
                 SET status = ?,
                     action_taken = ?,
                     assigned_to = NULLIF(?, ''),
                     completed_at = CASE WHEN ? = 'Completed' THEN GETDATE() ELSE completed_at END,
                     updated_at = GETDATE()
                 WHERE wo_id = ?"
            )->execute([$status, $notes, $assignedTo, $status, $woId]);

            writeLog($pdo, 'UPDATE', 'PE_WORK_ORDERS', $woId, $oldRow, [
                'status' => $status,
                'notes' => $notes,
                'assigned_to' => $assignedTo,
            ], "Updated safety hazard #{$woId} -> {$status}");
            $pdo->commit();

            peJsonSuccess(['wo_id' => $woId, 'status' => $status], "อัปเดตสถานะจุดเสี่ยงเป็น {$status} เรียบร้อยแล้ว");
            break;
        }

        case 'get_preop_overview': {
            $limit = max(1, min(500, (int)($input['limit'] ?? 200)));
            $logs = $pdo->query(
                "SELECT TOP {$limit}
                    P.audit_id, P.machine_id, M.machine_code, M.machine_name, M.line, M.machine_type,
                    P.shift_date, P.shift_name, P.audited_by, P.audited_at, P.status,
                    P.failed_reason, P.wo_id, W.wo_number, P.image_path, P.checklist_data
                 FROM dbo.PE_PREOP_AUDITS P WITH (NOLOCK)
                 JOIN " . PE_MACHINES_TABLE . " M WITH (NOLOCK) ON P.machine_id = M.machine_id
                 LEFT JOIN " . PE_WORK_ORDERS_TABLE . " W WITH (NOLOCK) ON P.wo_id = W.wo_id
                 ORDER BY P.audited_at DESC, P.audit_id DESC"
            )->fetchAll(PDO::FETCH_ASSOC);

            $todayStats = $pdo->query(
                "SELECT
                    COUNT(*) AS total,
                    SUM(CASE WHEN status = 'Passed' THEN 1 ELSE 0 END) AS passed,
                    SUM(CASE WHEN status = 'Failed' THEN 1 ELSE 0 END) AS failed
                 FROM dbo.PE_PREOP_AUDITS WITH (NOLOCK)
                 WHERE CAST(audited_at AS DATE) = CAST(GETDATE() AS DATE)"
            )->fetch(PDO::FETCH_ASSOC) ?: ['total' => 0, 'passed' => 0, 'failed' => 0];

            $allStats = $pdo->query(
                "SELECT
                    COUNT(*) AS total,
                    SUM(CASE WHEN status = 'Passed' THEN 1 ELSE 0 END) AS passed,
                    SUM(CASE WHEN status = 'Failed' THEN 1 ELSE 0 END) AS failed
                 FROM dbo.PE_PREOP_AUDITS WITH (NOLOCK)
                 WHERE audited_at >= DATEADD(DAY, -30, GETDATE())"
            )->fetch(PDO::FETCH_ASSOC) ?: ['total' => 0, 'passed' => 0, 'failed' => 0];

            $totalEval = (int)($allStats['total'] ?? 0);
            $compliance = $totalEval > 0 ? round(((int)$allStats['passed'] / $totalEval) * 100, 1) : 100.0;

            $configuredMachines = $pdo->query(
                "SELECT DISTINCT C.machine_code, M.machine_name, M.line
                 FROM dbo.PE_PREOP_CHECKLIST_TEMPLATE C WITH (NOLOCK)
                 LEFT JOIN " . PE_MACHINES_TABLE . " M WITH (NOLOCK) ON C.machine_code = M.machine_code
                 WHERE C.machine_code IS NOT NULL AND C.machine_code != ''
                 ORDER BY C.machine_code ASC"
            )->fetchAll(PDO::FETCH_ASSOC);

            peJsonSuccess([
                'logs' => $logs,
                'today' => $todayStats,
                'summary' => [
                    'total' => $totalEval,
                    'passed' => (int)($allStats['passed'] ?? 0),
                    'failed' => (int)($allStats['failed'] ?? 0),
                    'compliance' => $compliance,
                ],
                'configured_machines' => $configuredMachines,
            ], 'โหลดข้อมูลประวัติ Pre-Op Audits สำเร็จ');
            break;
        }

        case 'get_checklist_config': {
            $machineCode = strtoupper(trim((string)($input['machine_code'] ?? '')));
            if ($machineCode === '') {
                throw new InvalidArgumentException('กรุณาระบุรหัสเครื่องจักร');
            }
            $stmt = $pdo->prepare(
                "SELECT item_id, machine_type, machine_code, item_order, item_text, is_critical
                 FROM dbo.PE_PREOP_CHECKLIST_TEMPLATE WITH (NOLOCK)
                 WHERE machine_code = ?
                 ORDER BY item_order ASC, item_id ASC"
            );
            $stmt->execute([$machineCode]);
            peJsonSuccess($stmt->fetchAll(PDO::FETCH_ASSOC), 'โหลดแบบฟอร์ม Pre-Op ของเครื่องจักรสำเร็จ');
            break;
        }

        case 'save_checklist_config': {
            requirePeAccess(['manage_maintenance'], ['admin', 'creator', 'manager', 'maintenance', 'engineer']);
            $machineCode = strtoupper(trim((string)($input['machine_code'] ?? '')));
            $items = $input['items'] ?? [];
            if ($machineCode === '' || !is_array($items)) {
                throw new InvalidArgumentException('ข้อมูลหัวข้อตรวจสอบไม่ครบถ้วน');
            }

            $oldStmt = $pdo->prepare("SELECT item_id, item_order, item_text, is_critical FROM dbo.PE_PREOP_CHECKLIST_TEMPLATE WHERE machine_code = ?");
            $oldStmt->execute([$machineCode]);
            $oldRows = $oldStmt->fetchAll(PDO::FETCH_ASSOC);

            $pdo->beginTransaction();
            $pdo->prepare("DELETE FROM dbo.PE_PREOP_CHECKLIST_TEMPLATE WHERE machine_code = ?")->execute([$machineCode]);

            $insStmt = $pdo->prepare(
                "INSERT INTO dbo.PE_PREOP_CHECKLIST_TEMPLATE (machine_code, item_order, item_text, is_critical) VALUES (?, ?, ?, ?)"
            );
            $newRows = [];
            $seq = 1;
            foreach ($items as $item) {
                $txt = trim((string)($item['item_text'] ?? ''));
                if ($txt === '') {
                    continue;
                }
                $order = isset($item['item_order']) && (int)$item['item_order'] > 0 ? (int)$item['item_order'] : $seq;
                $crit = !empty($item['is_critical']) ? 1 : 0;
                $insStmt->execute([$machineCode, $order, $txt, $crit]);
                $newRows[] = ['item_order' => $order, 'item_text' => $txt, 'is_critical' => $crit];
                $seq++;
            }

            writeLog($pdo, 'UPDATE', 'PE_PREOP_CHECKLIST_TEMPLATE', $machineCode, $oldRows, $newRows, "Saved Pre-Op template for {$machineCode}");
            $pdo->commit();

            peJsonSuccess(['machine_code' => $machineCode, 'count' => count($newRows)], "บันทึกหัวข้อตรวจ Pre-Op เครื่อง {$machineCode} สำเร็จ");
            break;
        }

        case 'get_safety_print_data': {
            $machines = $pdo->query(
                "SELECT TOP 300 machine_id, machine_code, machine_name, line, area, status, criticality, is_loto, loto_reason
                 FROM " . PE_MACHINES_TABLE . " WITH (NOLOCK)
                 WHERE is_active = 1
                 ORDER BY line ASC, machine_code ASC"
            )->fetchAll(PDO::FETCH_ASSOC);

            $employees = $pdo->query(
                "SELECT TOP 500 E.emp_id, E.name_th, E.position, E.line, U.profile_picture
                 FROM dbo.MANPOWER_EMPLOYEES E WITH (NOLOCK)
                 LEFT JOIN dbo.USERS U WITH (NOLOCK) ON E.emp_id = U.emp_id
                 WHERE E.is_active = 1
                 ORDER BY E.name_th ASC"
            )->fetchAll(PDO::FETCH_ASSOC);

            $lines = [];
            foreach ($employees as $e) {
                if (!empty($e['line']) && !in_array($e['line'], $lines, true)) {
                    $lines[] = $e['line'];
                }
            }
            sort($lines);

            peJsonSuccess([
                'machines' => $machines,
                'employees' => $employees,
                'lines' => $lines,
            ], 'โหลดข้อมูลสำหรับพิมพ์ป้ายนิรภัยและบัตร LOTO สำเร็จ');
            break;
        }

        default:
            peJsonError('Invalid action requested', 400);
    }
} catch (Throwable $e) {
    handleApiError($e, $pdo ?? null, $input ?? $_REQUEST);
}
