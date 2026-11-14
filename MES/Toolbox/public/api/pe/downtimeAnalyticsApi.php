<?php
/**
 * Self-contained Downtime Log & Maintenance Reliability Analytics API (MTBF/MTTR/Pareto/Cost Drivers)
 * for Toolbox PE Enterprise (Phase 2.2B).
 */

require_once __DIR__ . '/_common.php';

/**
 * Normalizes a HH:MM or HH:MM:SS time fragment and validates it strictly.
 */
function normalizePeTimeFragment(string $raw, string $label = 'เวลา'): string {
    $trimmed = trim($raw);
    if ($trimmed === '') {
        throw new InvalidArgumentException("กรุณาระบุ{$label}");
    }
    if (preg_match('/^\d{2}:\d{2}$/', $trimmed)) {
        $trimmed .= ':00';
    }
    if (!preg_match('/^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/', $trimmed)) {
        throw new InvalidArgumentException("รูปแบบ{$label}ไม่ถูกต้อง (ต้องเป็น HH:MM)");
    }
    return $trimmed;
}

try {
    [$action, $input, $currentUser] = parsePeRequest();
    requirePeAccess();
    $actor = trim((string)($currentUser['fullname'] ?: $currentUser['username'] ?: 'System'));

    switch ($action) {
        case 'get_downtime': {
            $page = max(1, (int)($input['page'] ?? 1));
            $limit = max(1, min(500, (int)($input['limit'] ?? 100)));
            $offset = ($page - 1) * $limit;

            $conditions = ['1 = 1'];
            $params = [];

            $line = trim((string)($input['line'] ?? ''));
            $causeCategory = trim((string)($input['cause_category'] ?? ''));
            $startDate = parsePeDateOrNull($input['startDate'] ?? $input['start_date'] ?? null);
            $endDate = parsePeDateOrNull($input['endDate'] ?? $input['end_date'] ?? null);
            $search = trim((string)($input['search'] ?? ''));

            if ($line !== '') {
                $conditions[] = 'D.line = ?';
                $params[] = $line;
            }
            if ($causeCategory !== '') {
                $conditions[] = 'D.cause_category = ?';
                $params[] = $causeCategory;
            }
            if ($startDate !== null) {
                $conditions[] = 'D.log_date >= ?';
                $params[] = $startDate;
            }
            if ($endDate !== null) {
                $conditions[] = 'D.log_date <= ?';
                $params[] = $endDate;
            }
            if ($search !== '') {
                $conditions[] = '(D.machine_name LIKE ? OR M.machine_code LIKE ? OR D.cause_detail LIKE ? OR D.recovered_by LIKE ?)';
                $like = '%' . $search . '%';
                array_push($params, $like, $like, $like, $like);
            }

            $where = 'WHERE ' . implode(' AND ', $conditions);

            $countStmt = $pdo->prepare(
                "SELECT COUNT(*)
                 FROM " . PE_DOWNTIME_LOG_TABLE . " D WITH (NOLOCK)
                 LEFT JOIN " . PE_MACHINES_TABLE . " M WITH (NOLOCK) ON D.machine_id = M.machine_id
                 {$where}"
            );
            $countStmt->execute($params);
            $total = (int)$countStmt->fetchColumn();

            $dataStmt = $pdo->prepare(
                "SELECT D.downtime_id, D.machine_id, D.machine_name, M.machine_code,
                        D.line, D.log_date, D.start_time, D.end_time,
                        ISNULL(D.duration_min, DATEDIFF(MINUTE, D.start_time, GETDATE())) AS duration_min,
                        D.cause_category, D.cause_detail, D.wo_id, W.wo_number,
                        D.recovered_by, D.notes, D.created_by, D.created_at
                 FROM " . PE_DOWNTIME_LOG_TABLE . " D WITH (NOLOCK)
                 LEFT JOIN " . PE_MACHINES_TABLE . " M WITH (NOLOCK) ON D.machine_id = M.machine_id
                 LEFT JOIN " . PE_WORK_ORDERS_TABLE . " W WITH (NOLOCK) ON D.wo_id = W.wo_id
                 {$where}
                 ORDER BY D.start_time DESC, D.downtime_id DESC
                 OFFSET {$offset} ROWS FETCH NEXT {$limit} ROWS ONLY"
            );
            $dataStmt->execute($params);
            $rows = $dataStmt->fetchAll(PDO::FETCH_ASSOC);

            $summStmt = $pdo->prepare(
                "SELECT D.line,
                        COUNT(*) AS event_count,
                        ISNULL(SUM(ISNULL(D.duration_min, DATEDIFF(MINUTE, D.start_time, GETDATE()))), 0) AS total_minutes
                 FROM " . PE_DOWNTIME_LOG_TABLE . " D WITH (NOLOCK)
                 LEFT JOIN " . PE_MACHINES_TABLE . " M WITH (NOLOCK) ON D.machine_id = M.machine_id
                 {$where}
                 GROUP BY D.line
                 ORDER BY total_minutes DESC"
            );
            $summStmt->execute($params);
            $lineSummary = $summStmt->fetchAll(PDO::FETCH_ASSOC);

            $kpiStmt = $pdo->prepare(
                "SELECT
                    ISNULL(SUM(ISNULL(D.duration_min, DATEDIFF(MINUTE, D.start_time, GETDATE()))), 0) AS total_downtime,
                    COUNT(*) AS total_events,
                    ISNULL(AVG(CAST(ISNULL(D.duration_min, DATEDIFF(MINUTE, D.start_time, GETDATE())) AS FLOAT)), 0) AS avg_duration
                 FROM " . PE_DOWNTIME_LOG_TABLE . " D WITH (NOLOCK)
                 LEFT JOIN " . PE_MACHINES_TABLE . " M WITH (NOLOCK) ON D.machine_id = M.machine_id
                 {$where}"
            );
            $kpiStmt->execute($params);
            $kpi = $kpiStmt->fetch(PDO::FETCH_ASSOC) ?: ['total_downtime' => 0, 'total_events' => 0, 'avg_duration' => 0];

            $topCauseStmt = $pdo->prepare(
                "SELECT TOP 1 D.cause_category, COUNT(*) AS cnt
                 FROM " . PE_DOWNTIME_LOG_TABLE . " D WITH (NOLOCK)
                 LEFT JOIN " . PE_MACHINES_TABLE . " M WITH (NOLOCK) ON D.machine_id = M.machine_id
                 {$where} AND D.cause_category IS NOT NULL AND D.cause_category != ''
                 GROUP BY D.cause_category
                 ORDER BY cnt DESC"
            );
            $topCauseStmt->execute($params);
            $topCauseRow = $topCauseStmt->fetch(PDO::FETCH_ASSOC);

            $lines = $pdo->query(
                "SELECT DISTINCT line
                 FROM " . PE_MACHINES_TABLE . " WITH (NOLOCK)
                 WHERE is_active = 1 AND line IS NOT NULL AND line != ''
                 ORDER BY line ASC"
            )->fetchAll(PDO::FETCH_COLUMN);

            peJsonSuccess($rows, 'โหลดข้อมูล Downtime สำเร็จ', [
                'total' => $total,
                'page' => $page,
                'limit' => $limit,
                'line_summary' => $lineSummary,
                'kpi' => $kpi,
                'top_cause' => $topCauseRow['cause_category'] ?? '-',
                'lines' => $lines,
            ]);
            break;
        }

        case 'add_downtime': {
            requirePeAccess();
            $machineId = !empty($input['machine_id']) ? parsePePositiveInt($input['machine_id'], 'เครื่องจักร') : null;
            $logDate = parsePeDateOrNull($input['log_date'] ?? date('Y-m-d')) ?? date('Y-m-d');
            $startTime = normalizePeTimeFragment((string)($input['start_time'] ?? ''), 'เวลาเริ่มต้น');
            $endTimeRaw = trim((string)($input['end_time'] ?? ''));
            $causeCategory = trim((string)($input['cause_category'] ?? ''));
            $causeDetail = trim((string)($input['cause_detail'] ?? ''));

            if ($causeCategory === '' || $causeDetail === '') {
                throw new InvalidArgumentException('กรุณาระบุหมวดหมู่สาเหตุและรายละเอียดอาการหยุดเครื่อง');
            }

            $startDt = $logDate . ' ' . $startTime;
            $endDt = null;
            if ($endTimeRaw !== '') {
                $endTime = normalizePeTimeFragment($endTimeRaw, 'เวลาสิ้นสุด');
                $endDate = parsePeDateOrNull($input['end_date'] ?? null) ?? $logDate;
                $endDt = $endDate . ' ' . $endTime;
                if (empty($input['end_date']) && strtotime($endDt) < strtotime($startDt)) {
                    $endDt = date('Y-m-d', strtotime($logDate . ' +1 day')) . ' ' . $endTime;
                }
            }

            $machineName = trim((string)($input['machine_name'] ?? ''));
            $line = trim((string)($input['line'] ?? ''));
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

            $recoveredBy = trim((string)($input['recovered_by'] ?? ''));
            $notes = trim((string)($input['notes'] ?? ''));

            $pdo->beginTransaction();

            $insSql = "INSERT INTO " . PE_DOWNTIME_LOG_TABLE . "
                       (machine_id, machine_name, line, log_date, start_time, end_time, cause_category, cause_detail, recovered_by, notes, created_by, created_at)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, GETDATE())";
            $pdo->prepare($insSql)->execute([
                $machineId,
                $machineName,
                $line,
                $logDate,
                $startDt,
                $endDt,
                $causeCategory,
                $causeDetail,
                $recoveredBy,
                $notes,
                $actor,
            ]);
            $newDtId = (int)$pdo->lastInsertId();

            $woNumber = null;
            if (!empty($input['create_wo'])) {
                $woNumber = 'WO-' . date('Ymd') . '-' . str_pad((string)random_int(1, 9999), 4, '0', STR_PAD_LEFT);
                $woStmt = $pdo->prepare(
                    "INSERT INTO " . PE_WORK_ORDERS_TABLE . "
                     (wo_number, wo_type, machine_id, machine_name, line, priority, status, requested_by, requested_at, issue_title, issue_detail, is_active, created_at)
                     VALUES (?, 'Corrective', ?, ?, ?, 'Normal', 'Open', ?, GETDATE(), ?, ?, 1, GETDATE())"
                );
                $woStmt->execute([
                    $woNumber,
                    $machineId,
                    $machineName,
                    $line,
                    $actor,
                    mb_substr("Downtime: {$causeCategory} - {$causeDetail}", 0, 250),
                    "Auto-generated from Downtime #{$newDtId}",
                ]);
                $woId = (int)$pdo->lastInsertId();
                $pdo->prepare("UPDATE " . PE_DOWNTIME_LOG_TABLE . " SET wo_id = ? WHERE downtime_id = ?")
                    ->execute([$woId, $newDtId]);
            }

            writeLog($pdo, 'CREATE', 'PE_DOWNTIME_LOG', $newDtId, null, [
                'machine_name' => $machineName,
                'line' => $line,
                'cause_category' => $causeCategory,
                'wo_number' => $woNumber,
            ], "Added downtime log for {$machineName}");

            $pdo->commit();
            peJsonSuccess(
                ['downtime_id' => $newDtId, 'wo_number' => $woNumber],
                $woNumber ? "บันทึก Downtime พร้อมสร้างใบแจ้งซ่อม {$woNumber} สำเร็จ" : 'บันทึกประวัติ Downtime เรียบร้อยแล้ว'
            );
            break;
        }

        case 'update_downtime': {
            requirePeAccess(['manage_maintenance', 'manage_production'], ['admin', 'creator', 'manager', 'maintenance', 'engineer', 'supervisor']);
            $id = parsePePositiveInt($input['downtime_id'] ?? null, 'รหัส Downtime');

            $oldStmt = $pdo->prepare(
                "SELECT downtime_id, machine_id, machine_name, line, log_date, start_time, end_time, cause_category, cause_detail, recovered_by, notes
                 FROM " . PE_DOWNTIME_LOG_TABLE . " WHERE downtime_id = ?"
            );
            $oldStmt->execute([$id]);
            $oldRow = $oldStmt->fetch(PDO::FETCH_ASSOC);
            if (!$oldRow) {
                peJsonError('ไม่พบรายการ Downtime ที่ต้องการแก้ไข', 404);
            }

            $machineId = !empty($input['machine_id']) ? parsePePositiveInt($input['machine_id'], 'เครื่องจักร') : null;
            $logDate = parsePeDateOrNull($input['log_date'] ?? null) ?? date('Y-m-d');
            $startTime = normalizePeTimeFragment((string)($input['start_time'] ?? ''), 'เวลาเริ่มต้น');
            $endTimeRaw = trim((string)($input['end_time'] ?? ''));

            $startDt = $logDate . ' ' . $startTime;
            $endDt = null;
            if ($endTimeRaw !== '') {
                $endTime = normalizePeTimeFragment($endTimeRaw, 'เวลาสิ้นสุด');
                $endDate = parsePeDateOrNull($input['end_date'] ?? null) ?? $logDate;
                $endDt = $endDate . ' ' . $endTime;
                if (empty($input['end_date']) && strtotime($endDt) < strtotime($startDt)) {
                    $endDt = date('Y-m-d', strtotime($logDate . ' +1 day')) . ' ' . $endTime;
                }
            }

            $machineName = trim((string)($input['machine_name'] ?? $oldRow['machine_name']));
            $line = trim((string)($input['line'] ?? $oldRow['line']));
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

            $causeCategory = trim((string)($input['cause_category'] ?? ''));
            $causeDetail = trim((string)($input['cause_detail'] ?? ''));
            $recoveredBy = trim((string)($input['recovered_by'] ?? ''));
            $notes = trim((string)($input['notes'] ?? ''));

            if ($causeCategory === '' || $causeDetail === '') {
                throw new InvalidArgumentException('กรุณาระบุหมวดหมู่สาเหตุและรายละเอียดอาการหยุดเครื่อง');
            }

            $pdo->beginTransaction();
            $pdo->prepare(
                "UPDATE " . PE_DOWNTIME_LOG_TABLE . "
                 SET machine_id = ?, machine_name = ?, line = ?, log_date = ?, start_time = ?, end_time = ?,
                     cause_category = ?, cause_detail = ?, recovered_by = ?, notes = ?
                 WHERE downtime_id = ?"
            )->execute([
                $machineId, $machineName, $line, $logDate, $startDt, $endDt,
                $causeCategory, $causeDetail, $recoveredBy, $notes, $id,
            ]);

            writeLog($pdo, 'UPDATE', 'PE_DOWNTIME_LOG', $id, $oldRow, [
                'machine_name' => $machineName,
                'line' => $line,
                'start_time' => $startDt,
                'end_time' => $endDt,
                'cause_category' => $causeCategory,
                'cause_detail' => $causeDetail,
            ], "Updated downtime #{$id}");

            $pdo->commit();
            peJsonSuccess(['downtime_id' => $id], 'บันทึกการแก้ไขข้อมูล Downtime เรียบร้อยแล้ว');
            break;
        }

        case 'end_downtime': {
            requirePeAccess();
            $id = parsePePositiveInt($input['downtime_id'] ?? null, 'รหัส Downtime');

            $stmt = $pdo->prepare("SELECT downtime_id, log_date, start_time, end_time FROM " . PE_DOWNTIME_LOG_TABLE . " WHERE downtime_id = ?");
            $stmt->execute([$id]);
            $oldRow = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$oldRow) {
                peJsonError('ไม่พบรายการ Downtime', 404);
            }

            $endTimeRaw = trim((string)($input['end_time'] ?? ''));
            if ($endTimeRaw !== '') {
                $endTime = normalizePeTimeFragment($endTimeRaw, 'เวลาสิ้นสุด');
                $endDate = parsePeDateOrNull($input['end_date'] ?? null) ?? (string)$oldRow['log_date'];
                $endDt = $endDate . ' ' . $endTime;
                if (empty($input['end_date']) && strtotime($endDt) < strtotime((string)$oldRow['start_time'])) {
                    $endDt = date('Y-m-d', strtotime($oldRow['log_date'] . ' +1 day')) . ' ' . $endTime;
                }
            } else {
                $endDt = date('Y-m-d H:i:s');
            }

            $pdo->beginTransaction();
            $pdo->prepare("UPDATE " . PE_DOWNTIME_LOG_TABLE . " SET end_time = ?, recovered_by = ISNULL(NULLIF(?, ''), recovered_by) WHERE downtime_id = ?")
                ->execute([$endDt, trim((string)($input['recovered_by'] ?? $actor)), $id]);

            writeLog($pdo, 'UPDATE', 'PE_DOWNTIME_LOG', $id, $oldRow, ['end_time' => $endDt], "Ended downtime #{$id}");
            $pdo->commit();
            peJsonSuccess(['downtime_id' => $id, 'end_time' => $endDt], 'บันทึกสิ้นสุดเวลาหยุดเครื่องจักรเรียบร้อยแล้ว');
            break;
        }

        case 'delete_downtime': {
            requirePeAccess(['manage_maintenance'], ['admin', 'creator', 'manager', 'maintenance', 'engineer']);
            $id = parsePePositiveInt($input['downtime_id'] ?? null, 'รหัส Downtime');

            $oldStmt = $pdo->prepare(
                "SELECT downtime_id, machine_id, machine_name, line, log_date, start_time, end_time, cause_category, cause_detail
                 FROM " . PE_DOWNTIME_LOG_TABLE . " WHERE downtime_id = ?"
            );
            $oldStmt->execute([$id]);
            $oldRow = $oldStmt->fetch(PDO::FETCH_ASSOC);
            if (!$oldRow) {
                peJsonError('ไม่พบรายการ Downtime ที่ต้องการลบ', 404);
            }

            $pdo->beginTransaction();
            $pdo->prepare("DELETE FROM " . PE_DOWNTIME_LOG_TABLE . " WHERE downtime_id = ?")->execute([$id]);
            writeLog($pdo, 'DELETE', 'PE_DOWNTIME_LOG', $id, $oldRow, null, "Deleted downtime #{$id}");
            $pdo->commit();

            peJsonSuccess(['downtime_id' => $id], 'ลบรายการ Downtime เรียบร้อยแล้ว');
            break;
        }

        case 'get_analytics_bundle': {
            $startDate = parsePeDateOrNull($input['startDate'] ?? $input['start_date'] ?? null) ?? date('Y-m-01');
            $endDate = parsePeDateOrNull($input['endDate'] ?? $input['end_date'] ?? null) ?? date('Y-m-d');
            $lineFilter = trim((string)($input['line'] ?? ''));
            $causeFilter = trim((string)($input['causeCategory'] ?? $input['cause_category'] ?? ''));

            $dtBaseParams = [$startDate, $endDate];
            $dtLineSql = '';
            $woLineSql = '';
            if ($lineFilter !== '') {
                $dtLineSql = ' AND line = ?';
                $woLineSql = ' AND W.line = ?';
                $dtBaseParams[] = $lineFilter;
            }

            // 1. Downtime Overview KPI
            $dtKpiStmt = $pdo->prepare(
                "SELECT
                    ISNULL(SUM(ISNULL(duration_min, DATEDIFF(MINUTE, start_time, GETDATE()))), 0) AS total_downtime_min,
                    COUNT(*) AS total_events,
                    ISNULL(AVG(CAST(ISNULL(duration_min, DATEDIFF(MINUTE, start_time, GETDATE())) AS FLOAT)), 0) AS avg_duration
                 FROM " . PE_DOWNTIME_LOG_TABLE . " WITH (NOLOCK)
                 WHERE log_date >= ? AND log_date <= ? {$dtLineSql}"
            );
            $dtKpiStmt->execute($dtBaseParams);
            $dtKpi = $dtKpiStmt->fetch(PDO::FETCH_ASSOC) ?: ['total_downtime_min' => 0, 'total_events' => 0, 'avg_duration' => 0];

            // Shift hours (handles cross-midnight night shifts cleanly)
            $hoursPerDay = (float)$pdo->query(
                "SELECT ISNULL(SUM(CASE WHEN end_time >= start_time THEN DATEDIFF(MINUTE, start_time, end_time) ELSE 1440 + DATEDIFF(MINUTE, start_time, end_time) END), 1440) / 60.0
                 FROM MANPOWER_SHIFTS WITH (NOLOCK)
                 WHERE is_active = 1"
            )->fetchColumn();
            if ($hoursPerDay <= 0) {
                $hoursPerDay = 24.0;
            }

            // 2. Work Order Cost & Repair Metrics (Parts + Labor Rate)
            $woStmt = $pdo->prepare(
                "SELECT
                    COUNT(*) AS total_wo,
                    SUM(CASE WHEN W.status = 'Completed' THEN 1 ELSE 0 END) AS completed_wo,
                    ISNULL(AVG(CASE WHEN W.status = 'Completed' AND W.repair_minutes > 0 THEN CAST(W.repair_minutes AS FLOAT) ELSE NULL END), 0) AS avg_repair,
                    ISNULL(SUM(ISNULL(W.total_cost, 0)), 0) AS parts_cost,
                    ISNULL(SUM((ISNULL(W.repair_minutes, 0) / 60.0) * ISNULL(RateData.HourlyRate, 200.0)), 0) AS labor_cost
                 FROM " . PE_WORK_ORDERS_TABLE . " W WITH (NOLOCK)
                 OUTER APPLY (
                     SELECT TOP 1
                         CASE
                             WHEN R.rate_type = 'DAILY' THEN CAST(R.daily_rate AS FLOAT) / 8.0
                             WHEN R.rate_type = 'MONTHLY' THEN (CAST(R.daily_rate AS FLOAT) / 30.0) / 8.0
                             ELSE 200.0
                         END AS HourlyRate
                     FROM dbo.MANPOWER_EMPLOYEES E WITH (NOLOCK)
                     LEFT JOIN dbo.MANPOWER_POSITION_RATES R WITH (NOLOCK) ON E.position LIKE '%' + R.position_keyword + '%'
                     WHERE E.emp_id = W.assigned_to OR E.name_th = W.assigned_to
                 ) RateData
                 WHERE W.is_active = 1 AND W.requested_at >= ? AND W.requested_at < DATEADD(DAY, 1, CAST(? AS DATE)) {$woLineSql}"
            );
            $woStmt->execute($dtBaseParams);
            $woKpi = $woStmt->fetch(PDO::FETCH_ASSOC) ?: [
                'total_wo' => 0, 'completed_wo' => 0, 'avg_repair' => 0, 'parts_cost' => 0, 'labor_cost' => 0
            ];

            // Active machines count
            $mcSql = "SELECT COUNT(*) FROM " . PE_MACHINES_TABLE . " WITH (NOLOCK) WHERE is_active = 1 AND status = 'Active'";
            if ($lineFilter !== '') {
                $mcStmt = $pdo->prepare($mcSql . ' AND line = ?');
                $mcStmt->execute([$lineFilter]);
                $machineCount = max(1, (int)$mcStmt->fetchColumn());
            } else {
                $machineCount = max(1, (int)$pdo->query($mcSql)->fetchColumn());
            }

            $daysDiff = max(1.0, (strtotime($endDate) - strtotime($startDate)) / 86400 + 1);
            $totalOperatingHrs = $daysDiff * $hoursPerDay * $machineCount;
            $totalDowntimeHrs = ((float)($dtKpi['total_downtime_min'] ?? 0)) / 60.0;
            $uptimeHrs = max(0.0, $totalOperatingHrs - $totalDowntimeHrs);
            $totalEvents = max(1, (int)($dtKpi['total_events'] ?? 0));

            $mtbf = (int)($dtKpi['total_events'] ?? 0) > 0 ? round($uptimeHrs / $totalEvents, 1) : round($totalOperatingHrs, 1);
            $mttr = round((float)($woKpi['avg_repair'] ?? 0), 1);
            if ($mttr <= 0) {
                $mttr = round((float)($dtKpi['avg_duration'] ?? 0), 1);
            }
            $availability = $totalOperatingHrs > 0 ? min(100.0, round(($uptimeHrs / $totalOperatingHrs) * 100, 1)) : 100.0;

            $partsCost = round((float)($woKpi['parts_cost'] ?? 0), 2);
            $laborCost = round((float)($woKpi['labor_cost'] ?? 0), 2);
            $kpiOverview = [
                'mtbf' => $mtbf,
                'mttr' => $mttr,
                'availability' => $availability,
                'total_downtime_hrs' => round($totalDowntimeHrs, 1),
                'total_cost' => round($partsCost + $laborCost, 2),
                'parts_cost' => $partsCost,
                'labor_cost' => $laborCost,
                'total_events' => (int)($dtKpi['total_events'] ?? 0),
                'total_wo' => (int)($woKpi['total_wo'] ?? 0),
                'completed_wo' => (int)($woKpi['completed_wo'] ?? 0),
            ];

            // 3. Downtime Trend
            $trendStmt = $pdo->prepare(
                "SELECT log_date,
                        SUM(ISNULL(duration_min, DATEDIFF(MINUTE, start_time, GETDATE()))) AS total_min,
                        COUNT(*) AS event_count
                 FROM " . PE_DOWNTIME_LOG_TABLE . " WITH (NOLOCK)
                 WHERE log_date >= ? AND log_date <= ? {$dtLineSql}
                 GROUP BY log_date
                 ORDER BY log_date ASC"
            );
            $trendStmt->execute($dtBaseParams);
            $trend = $trendStmt->fetchAll(PDO::FETCH_ASSOC);

            // 4. Cause Pareto
            $paretoStmt = $pdo->prepare(
                "SELECT cause_category,
                        SUM(ISNULL(duration_min, DATEDIFF(MINUTE, start_time, GETDATE()))) AS total_min,
                        COUNT(*) AS event_count
                 FROM " . PE_DOWNTIME_LOG_TABLE . " WITH (NOLOCK)
                 WHERE log_date >= ? AND log_date <= ? {$dtLineSql}
                   AND cause_category IS NOT NULL AND cause_category != ''
                 GROUP BY cause_category
                 ORDER BY total_min DESC"
            );
            $paretoStmt->execute($dtBaseParams);
            $pareto = $paretoStmt->fetchAll(PDO::FETCH_ASSOC);

            // 5. Top Machines
            $topParams = $dtBaseParams;
            $causeSql = '';
            if ($causeFilter !== '') {
                $causeSql = ' AND cause_category = ?';
                $topParams[] = $causeFilter;
            }
            $topStmt = $pdo->prepare(
                "SELECT TOP 10 machine_name, line,
                        COUNT(*) AS event_count,
                        SUM(ISNULL(duration_min, DATEDIFF(MINUTE, start_time, GETDATE()))) AS total_min,
                        AVG(CAST(ISNULL(duration_min, DATEDIFF(MINUTE, start_time, GETDATE())) AS FLOAT)) AS avg_min
                 FROM " . PE_DOWNTIME_LOG_TABLE . " WITH (NOLOCK)
                 WHERE log_date >= ? AND log_date <= ? {$dtLineSql} {$causeSql}
                   AND machine_name IS NOT NULL AND machine_name != ''
                 GROUP BY machine_name, line
                 ORDER BY total_min DESC"
            );
            $topStmt->execute($topParams);
            $topMachines = $topStmt->fetchAll(PDO::FETCH_ASSOC);

            // 6. WO Status Distribution
            $woDistStmt = $pdo->prepare(
                "SELECT status, COUNT(*) AS count
                 FROM " . PE_WORK_ORDERS_TABLE . " W WITH (NOLOCK)
                 WHERE W.is_active = 1 AND W.requested_at >= ? AND W.requested_at < DATEADD(DAY, 1, CAST(? AS DATE)) {$woLineSql}
                 GROUP BY status"
            );
            $woDistStmt->execute($dtBaseParams);
            $woDist = $woDistStmt->fetchAll(PDO::FETCH_ASSOC);

            // 7. Cost Drivers (Top 10 Machines by Parts + Labor)
            $costStmt = $pdo->prepare(
                "SELECT TOP 10
                    W.machine_name,
                    ISNULL(SUM(ISNULL(W.total_cost, 0)), 0) AS parts_cost,
                    ISNULL(SUM((ISNULL(W.repair_minutes, 0) / 60.0) * ISNULL(RateData.HourlyRate, 200.0)), 0) AS labor_cost
                 FROM " . PE_WORK_ORDERS_TABLE . " W WITH (NOLOCK)
                 OUTER APPLY (
                     SELECT TOP 1
                         CASE
                             WHEN R.rate_type = 'DAILY' THEN CAST(R.daily_rate AS FLOAT) / 8.0
                             WHEN R.rate_type = 'MONTHLY' THEN (CAST(R.daily_rate AS FLOAT) / 30.0) / 8.0
                             ELSE 200.0
                         END AS HourlyRate
                     FROM dbo.MANPOWER_EMPLOYEES E WITH (NOLOCK)
                     LEFT JOIN dbo.MANPOWER_POSITION_RATES R WITH (NOLOCK) ON E.position LIKE '%' + R.position_keyword + '%'
                     WHERE E.emp_id = W.assigned_to OR E.name_th = W.assigned_to
                 ) RateData
                 WHERE W.is_active = 1 AND W.requested_at >= ? AND W.requested_at < DATEADD(DAY, 1, CAST(? AS DATE))
                   AND W.machine_name IS NOT NULL AND W.machine_name != '' {$woLineSql}
                 GROUP BY W.machine_name
                 ORDER BY (ISNULL(SUM(ISNULL(W.total_cost, 0)), 0) + ISNULL(SUM((ISNULL(W.repair_minutes, 0) / 60.0) * ISNULL(RateData.HourlyRate, 200.0)), 0)) DESC"
            );
            $costStmt->execute($dtBaseParams);
            $costDrivers = $costStmt->fetchAll(PDO::FETCH_ASSOC);
            foreach ($costDrivers as &$row) {
                $row['parts_cost'] = round((float)$row['parts_cost'], 2);
                $row['labor_cost'] = round((float)$row['labor_cost'], 2);
                $row['total_cost'] = round($row['parts_cost'] + $row['labor_cost'], 2);
            }
            unset($row);

            // 8. Technician Performance
            $techStmt = $pdo->prepare(
                "SELECT TOP 10
                    W.assigned_to AS tech_name,
                    COUNT(*) AS total_wo,
                    SUM(CASE WHEN W.status = 'Completed' THEN 1 ELSE 0 END) AS completed_wo,
                    ISNULL(AVG(CASE WHEN W.status = 'Completed' AND W.repair_minutes > 0 THEN CAST(W.repair_minutes AS FLOAT) ELSE NULL END), 0) AS avg_repair
                 FROM " . PE_WORK_ORDERS_TABLE . " W WITH (NOLOCK)
                 WHERE W.is_active = 1 AND W.requested_at >= ? AND W.requested_at < DATEADD(DAY, 1, CAST(? AS DATE))
                   AND W.assigned_to IS NOT NULL AND W.assigned_to != '' {$woLineSql}
                 GROUP BY W.assigned_to
                 ORDER BY completed_wo DESC, total_wo DESC"
            );
            $techStmt->execute($dtBaseParams);
            $techPerformance = $techStmt->fetchAll(PDO::FETCH_ASSOC);

            // 9. Predictive Risk Scoring (>= 2 breakdown events)
            $riskStmt = $pdo->prepare(
                "SELECT TOP 8
                    machine_name, line,
                    COUNT(*) AS event_count,
                    SUM(ISNULL(duration_min, DATEDIFF(MINUTE, start_time, GETDATE()))) AS total_min,
                    MAX(start_time) AS last_breakdown
                 FROM " . PE_DOWNTIME_LOG_TABLE . " WITH (NOLOCK)
                 WHERE log_date >= ? AND log_date <= ? {$dtLineSql}
                   AND machine_name IS NOT NULL AND machine_name != ''
                 GROUP BY machine_name, line
                 HAVING COUNT(*) >= 2
                 ORDER BY event_count DESC, total_min DESC"
            );
            $riskStmt->execute($dtBaseParams);
            $predictiveRisk = $riskStmt->fetchAll(PDO::FETCH_ASSOC);
            foreach ($predictiveRisk as &$r) {
                $score = ((int)$r['event_count'] * 10) + ((float)$r['total_min'] / 10);
                $r['risk_score'] = round($score);
                $r['risk_level'] = $score > 100 ? 'Critical' : ($score > 50 ? 'High' : 'Medium');
            }
            unset($r);

            $lines = $pdo->query(
                "SELECT DISTINCT line FROM " . PE_MACHINES_TABLE . " WITH (NOLOCK) WHERE is_active = 1 AND line IS NOT NULL AND line != '' ORDER BY line ASC"
            )->fetchAll(PDO::FETCH_COLUMN);

            peJsonSuccess([
                'kpi' => $kpiOverview,
                'trend' => $trend,
                'pareto' => $pareto,
                'top_machines' => $topMachines,
                'wo_dist' => $woDist,
                'cost_drivers' => $costDrivers,
                'tech_performance' => $techPerformance,
                'predictive_risk' => $predictiveRisk,
                'lines' => $lines,
            ], 'โหลดข้อมูลวิเคราะห์ Reliability & MTBF/MTTR สำเร็จ');
            break;
        }

        default:
            peJsonError('Invalid action requested', 400);
    }
} catch (Throwable $e) {
    handleApiError($e, $pdo ?? null, $input ?? $_REQUEST);
}
