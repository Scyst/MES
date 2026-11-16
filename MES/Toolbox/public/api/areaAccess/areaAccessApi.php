<?php
/**
 * Self-contained Area Access Log API for Toolbox SPA.
 * Replaces legacy page/areaAccess/api/apiAreaAccess.php.
 */

require_once __DIR__ . '/_common.php';

$action = '';
$input = [];

try {
    [$action, $input, $currentUser, $isSystemTrigger] = parseAreaRequest('get_history');
    $userId = (int)($currentUser['id'] ?? 0);
    $username = trim((string)($currentUser['username'] ?? 'SYSTEM'));

    switch ($action) {
        case 'auto_clear_ghost': {
            if (!$isSystemTrigger && !hasRole(['creator', 'admin', 'supervisor'])) {
                areaJsonError('สงวนสิทธิ์เฉพาะผู้ดูแลระบบหรือคำสั่งอัตโนมัติเท่านั้น', 403);
            }
            $pdo->query("EXEC dbo.sp_AreaAccess_AutoClearGhost");
            writeLog($pdo, 'UPDATE', 'AREA_ACCESS', 'AUTO_CLEAR_GHOST', null, ['triggered_by' => $username], 'Cleared stale area access sessions > 12h');
            areaJsonSuccess(['cleared' => true], 'ปิดรายการค้างเกิน 12 ชั่วโมงเรียบร้อยแล้ว');
            break;
        }

        case 'get_locations': {
            $stmt = $pdo->query("
                SELECT TOP (200)
                       location_id,
                       location_name,
                       ISNULL(location_type, '') AS location_type,
                       ISNULL(zone_name, '') AS zone_name
                FROM " . LOCATIONS_TABLE . " WITH (NOLOCK)
                WHERE is_active = 1
                ORDER BY location_name ASC
            ");
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
            areaJsonSuccess($rows, 'Locations loaded');
            break;
        }

        case 'get_history': {
            $today = date('Y-m-d');
            $startDate = normalizeAreaDate($input['start_date'] ?? $today, $today);
            $endDate = normalizeAreaDate($input['end_date'] ?? $today, $today);
            if ($startDate > $endDate) {
                areaJsonError('วันที่เริ่มต้นต้องไม่มากกว่าวันที่สิ้นสุด', 400);
            }

            $filterLoc = max(0, (int)($input['filter_loc'] ?? 0));
            $statusFilter = strtoupper(trim((string)($input['status'] ?? 'ALL')));
            $search = trim((string)($input['search'] ?? ''));
            $page = max(1, (int)($input['page'] ?? 1));
            $limit = max(10, min(100, (int)($input['limit'] ?? 50)));
            $offset = ($page - 1) * $limit;

            $where = ["CAST(A.scan_in_time AS DATE) BETWEEN ? AND ?"];
            $params = [$startDate, $endDate];

            if ($filterLoc > 0) {
                $where[] = "A.location_id = ?";
                $params[] = $filterLoc;
            }
            if ($statusFilter === 'IN') {
                $where[] = "A.scan_out_time IS NULL";
            } elseif ($statusFilter === 'OUT') {
                $where[] = "A.scan_out_time IS NOT NULL";
            } elseif ($statusFilter === 'OVERDUE') {
                $where[] = "A.scan_out_time IS NULL AND DATEDIFF(MINUTE, A.scan_in_time, GETDATE()) > 120";
            }
            if ($search !== '') {
                $where[] = "(A.emp_id LIKE ? OR E.name_th LIKE ? OR A.purpose LIKE ? OR L.location_name LIKE ?)";
                $kw = "%{$search}%";
                $params[] = $kw;
                $params[] = $kw;
                $params[] = $kw;
                $params[] = $kw;
            }

            $whereSql = implode(' AND ', $where);

            $countSql = "
                SELECT COUNT(*)
                FROM dbo.AREA_ACCESS_LOGS A WITH (NOLOCK)
                JOIN " . LOCATIONS_TABLE . " L WITH (NOLOCK) ON A.location_id = L.location_id
                LEFT JOIN " . MANPOWER_EMPLOYEES_TABLE . " E WITH (NOLOCK) ON A.emp_id = E.emp_id
                WHERE {$whereSql}
            ";
            $stmtCount = $pdo->prepare($countSql);
            $stmtCount->execute($params);
            $totalRows = (int)$stmtCount->fetchColumn();

            $sql = "
                SELECT A.log_id,
                       A.location_id,
                       L.location_name,
                       A.emp_id,
                       ISNULL(E.name_th, 'Unknown') AS emp_name,
                       ISNULL(E.position, '') AS position,
                       ISNULL(E.line, 'N/A') AS line_name,
                       ISNULL(E.department_api, '-') AS department_api,
                       CONVERT(VARCHAR(16), A.scan_in_time, 120) AS scan_in,
                       CONVERT(VARCHAR(16), A.scan_out_time, 120) AS scan_out,
                       ISNULL(A.purpose, '') AS purpose,
                       CASE WHEN A.scan_out_time IS NULL THEN 'IN' ELSE 'OUT' END AS status,
                       DATEDIFF(MINUTE, A.scan_in_time, ISNULL(A.scan_out_time, GETDATE())) AS duration_mins
                FROM dbo.AREA_ACCESS_LOGS A WITH (NOLOCK)
                JOIN " . LOCATIONS_TABLE . " L WITH (NOLOCK) ON A.location_id = L.location_id
                LEFT JOIN " . MANPOWER_EMPLOYEES_TABLE . " E WITH (NOLOCK) ON A.emp_id = E.emp_id
                WHERE {$whereSql}
                ORDER BY CASE WHEN A.scan_out_time IS NULL THEN 0 ELSE 1 END ASC, A.scan_in_time DESC
                OFFSET ? ROWS FETCH NEXT ? ROWS ONLY
            ";
            $stmt = $pdo->prepare($sql);
            $idx = 1;
            foreach ($params as $val) {
                $stmt->bindValue($idx++, $val, is_int($val) ? PDO::PARAM_INT : PDO::PARAM_STR);
            }
            $stmt->bindValue($idx++, $offset, PDO::PARAM_INT);
            $stmt->bindValue($idx++, $limit, PDO::PARAM_INT);
            $stmt->execute();
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

            $kpiStmt = $pdo->query("
                SELECT
                    (SELECT COUNT(*) FROM dbo.AREA_ACCESS_LOGS WITH (NOLOCK) WHERE CAST(scan_in_time AS DATE) = CAST(GETDATE() AS DATE)) AS total_trans,
                    (SELECT COUNT(*) FROM dbo.AREA_ACCESS_LOGS WITH (NOLOCK) WHERE scan_out_time IS NULL) AS total_inside,
                    (SELECT COUNT(*) FROM dbo.AREA_ACCESS_LOGS WITH (NOLOCK) WHERE scan_out_time IS NULL AND DATEDIFF(MINUTE, scan_in_time, GETDATE()) > 120) AS total_overdue
            ");
            $kpi = $kpiStmt->fetch(PDO::FETCH_ASSOC) ?: ['total_trans' => 0, 'total_inside' => 0, 'total_overdue' => 0];

            areaJsonSuccess([
                'logs' => $rows,
                'kpi' => [
                    'total_trans' => (int)($kpi['total_trans'] ?? 0),
                    'total_inside' => (int)($kpi['total_inside'] ?? 0),
                    'total_overdue' => (int)($kpi['total_overdue'] ?? 0),
                ],
                'pagination' => [
                    'page' => $page,
                    'limit' => $limit,
                    'total_rows' => $totalRows,
                    'total_pages' => max(1, (int)ceil($totalRows / $limit)),
                ],
            ], 'Area access logs loaded');
            break;
        }

        case 'export_rows': {
            $today = date('Y-m-d');
            $startDate = normalizeAreaDate($input['start_date'] ?? $today, $today);
            $endDate = normalizeAreaDate($input['end_date'] ?? $today, $today);
            $filterLoc = max(0, (int)($input['filter_loc'] ?? 0));
            $statusFilter = strtoupper(trim((string)($input['status'] ?? 'ALL')));
            $search = trim((string)($input['search'] ?? ''));

            $where = ["CAST(A.scan_in_time AS DATE) BETWEEN ? AND ?"];
            $params = [$startDate, $endDate];
            if ($filterLoc > 0) {
                $where[] = "A.location_id = ?";
                $params[] = $filterLoc;
            }
            if ($statusFilter === 'IN') {
                $where[] = "A.scan_out_time IS NULL";
            } elseif ($statusFilter === 'OUT') {
                $where[] = "A.scan_out_time IS NOT NULL";
            } elseif ($statusFilter === 'OVERDUE') {
                $where[] = "A.scan_out_time IS NULL AND DATEDIFF(MINUTE, A.scan_in_time, GETDATE()) > 120";
            }
            if ($search !== '') {
                $where[] = "(A.emp_id LIKE ? OR E.name_th LIKE ? OR A.purpose LIKE ? OR L.location_name LIKE ?)";
                $kw = "%{$search}%";
                $params = array_merge($params, [$kw, $kw, $kw, $kw]);
            }
            $whereSql = implode(' AND ', $where);

            $stmt = $pdo->prepare("
                SELECT TOP (2000)
                       A.log_id,
                       L.location_name,
                       A.emp_id,
                       ISNULL(E.name_th, 'Unknown') AS emp_name,
                       ISNULL(E.line, 'N/A') AS line_name,
                       ISNULL(E.department_api, '-') AS department_api,
                       CONVERT(VARCHAR(16), A.scan_in_time, 120) AS scan_in,
                       CONVERT(VARCHAR(16), A.scan_out_time, 120) AS scan_out,
                       ISNULL(A.purpose, '') AS purpose,
                       CASE WHEN A.scan_out_time IS NULL THEN 'IN' ELSE 'OUT' END AS status,
                       DATEDIFF(MINUTE, A.scan_in_time, ISNULL(A.scan_out_time, GETDATE())) AS duration_mins
                FROM dbo.AREA_ACCESS_LOGS A WITH (NOLOCK)
                JOIN " . LOCATIONS_TABLE . " L WITH (NOLOCK) ON A.location_id = L.location_id
                LEFT JOIN " . MANPOWER_EMPLOYEES_TABLE . " E WITH (NOLOCK) ON A.emp_id = E.emp_id
                WHERE {$whereSql}
                ORDER BY A.scan_in_time DESC
            ");
            $stmt->execute($params);
            areaJsonSuccess($stmt->fetchAll(PDO::FETCH_ASSOC) ?: [], 'Export dataset ready');
            break;
        }

        case 'verify_employee': {
            $empId = trim((string)($input['emp_id'] ?? ''));
            if ($empId === '' || mb_strlen($empId) > 20) {
                areaJsonError('กรุณาระบุรหัสพนักงาน (สูงสุด 20 ตัวอักษร)', 400);
            }

            $stmt = $pdo->prepare("
                SELECT emp_id, name_th, ISNULL(position, '') AS position, ISNULL(line, '') AS line,
                       ISNULL(department_api, '') AS department_api, is_active
                FROM " . MANPOWER_EMPLOYEES_TABLE . " WITH (NOLOCK)
                WHERE emp_id = ?
            ");
            $stmt->execute([$empId]);
            $emp = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$emp) {
                areaJsonError('ไม่พบรหัสพนักงานนี้ในระบบ (Unknown ID)', 404);
            }
            if ((int)($emp['is_active'] ?? 0) === 0) {
                areaJsonError('พนักงานท่านนี้พ้นสภาพหรือถูกระงับการใช้งานแล้ว', 403);
            }

            $stmtLog = $pdo->prepare("
                SELECT TOP 1 A.log_id, A.location_id, ISNULL(L.location_name, '') AS location_name,
                       CONVERT(VARCHAR(16), A.scan_in_time, 120) AS scan_in
                FROM dbo.AREA_ACCESS_LOGS A WITH (NOLOCK)
                LEFT JOIN " . LOCATIONS_TABLE . " L WITH (NOLOCK) ON A.location_id = L.location_id
                WHERE A.emp_id = ? AND A.scan_out_time IS NULL
                ORDER BY A.scan_in_time DESC
            ");
            $stmtLog->execute([$empId]);
            $activeLog = $stmtLog->fetch(PDO::FETCH_ASSOC) ?: null;

            $posLower = mb_strtolower((string)($emp['position'] ?? ''));
            $isVisitor = (stripos($empId, 'V') === 0) || strpos($posLower, 'visitor') !== false || strpos($emp['position'], 'บุคคลภายนอก') !== false;

            areaJsonSuccess([
                'emp_id' => $emp['emp_id'],
                'emp_name' => $emp['name_th'],
                'position' => $emp['position'],
                'line' => $emp['line'],
                'department_api' => $emp['department_api'],
                'is_visitor' => $isVisitor,
                'active_log' => $activeLog,
                'next_action' => $activeLog ? 'OUT' : 'IN',
            ], 'Employee verified');
            break;
        }

        case 'record_access': {
            $empId = trim((string)($input['emp_id'] ?? ''));
            $locationId = (int)($input['location_id'] ?? 0);
            $purpose = mb_substr(trim((string)($input['purpose'] ?? '')), 0, 255);

            if ($empId === '' || mb_strlen($empId) > 20 || $locationId <= 0) {
                areaJsonError('กรุณาระบุรหัสพนักงานและสถานที่ให้ครบถ้วน', 400);
            }

            $oldStmt = $pdo->prepare("
                SELECT TOP 1 log_id, location_id, CONVERT(VARCHAR(19), scan_in_time, 120) AS scan_in_time
                FROM dbo.AREA_ACCESS_LOGS WITH (NOLOCK)
                WHERE emp_id = ? AND scan_out_time IS NULL
                ORDER BY scan_in_time DESC
            ");
            $oldStmt->execute([$empId]);
            $oldActive = $oldStmt->fetch(PDO::FETCH_ASSOC) ?: null;

            $stmt = $pdo->prepare("EXEC dbo.sp_RecordAreaAccess ?, ?, ?, ?");
            $stmt->execute([$empId, $locationId, $purpose, $userId]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];

            $actionType = $result['action_type'] ?? 'IN';
            $msg = 'บันทึกเข้าพื้นที่สำเร็จ';
            if ($actionType === 'OUT') {
                $msg = 'บันทึกออกพื้นที่สำเร็จ';
            } elseif ($actionType === 'IN_CHANGED') {
                $msg = 'ย้ายสถานที่สำเร็จ (ปิดการเข้าพื้นที่เดิมอัตโนมัติ)';
            }

            writeLog(
                $pdo,
                $actionType === 'OUT' ? 'CHECKOUT' : 'CHECKIN',
                'AREA_ACCESS',
                (string)($result['log_id'] ?? $empId),
                $oldActive,
                ['emp_id' => $empId, 'location_id' => $locationId, 'action_type' => $actionType, 'purpose' => $purpose],
                $msg
            );

            areaJsonSuccess($result, $msg);
            break;
        }

        case 'manual_edit': {
            requireAreaSupervisorOrOperator($currentUser);
            $logId = (int)($input['log_id'] ?? 0);
            if ($logId <= 0) {
                areaJsonError('ไม่พบรหัสรายการที่ต้องการแก้ไข', 400);
            }

            $scanIn = normalizeAreaDateTime($input['scan_in'] ?? '', false);
            $scanOut = normalizeAreaDateTime($input['scan_out'] ?? '', true);
            $purpose = mb_substr(trim((string)($input['purpose'] ?? '')), 0, 255);

            if ($scanOut !== null && $scanOut < $scanIn) {
                areaJsonError('เวลาออก (OUT) ต้องไม่น้อยกว่าเวลาเข้า (IN)', 400);
            }

            $oldStmt = $pdo->prepare("
                SELECT log_id, emp_id, location_id,
                       CONVERT(VARCHAR(19), scan_in_time, 120) AS scan_in_time,
                       CONVERT(VARCHAR(19), scan_out_time, 120) AS scan_out_time,
                       purpose
                FROM dbo.AREA_ACCESS_LOGS WITH (NOLOCK)
                WHERE log_id = ?
            ");
            $oldStmt->execute([$logId]);
            $oldData = $oldStmt->fetch(PDO::FETCH_ASSOC);
            if (!$oldData) {
                areaJsonError('ไม่พบรายการบันทึกนี้ในระบบ', 404);
            }

            $stmt = $pdo->prepare("EXEC dbo.sp_ManualEditAreaAccess ?, ?, ?, ?, ?, ?");
            $stmt->bindValue(1, $logId, PDO::PARAM_INT);
            $stmt->bindValue(2, $scanIn, PDO::PARAM_STR);
            if ($scanOut === null) {
                $stmt->bindValue(3, null, PDO::PARAM_NULL);
            } else {
                $stmt->bindValue(3, $scanOut, PDO::PARAM_STR);
            }
            $stmt->bindValue(4, $purpose, PDO::PARAM_STR);
            $stmt->bindValue(5, $userId, PDO::PARAM_INT);
            $stmt->bindValue(6, $username, PDO::PARAM_STR);
            $stmt->execute();

            writeLog(
                $pdo,
                'UPDATE',
                'AREA_ACCESS',
                (string)$logId,
                $oldData,
                ['scan_in_time' => $scanIn, 'scan_out_time' => $scanOut, 'purpose' => $purpose],
                'Manual edit of area access log'
            );

            areaJsonSuccess(['log_id' => $logId], 'แก้ไขข้อมูลสำเร็จ');
            break;
        }

        case 'force_checkout': {
            requireAreaSupervisorOrOperator($currentUser);
            $logId = (int)($input['log_id'] ?? 0);
            if ($logId <= 0) {
                areaJsonError('ไม่พบข้อมูลอ้างอิงรายการ', 400);
            }

            $stmtOld = $pdo->prepare("
                SELECT log_id, emp_id, location_id,
                       CONVERT(VARCHAR(19), scan_in_time, 120) AS scan_in_time,
                       CONVERT(VARCHAR(19), scan_out_time, 120) AS scan_out_time,
                       purpose
                FROM dbo.AREA_ACCESS_LOGS WITH (NOLOCK)
                WHERE log_id = ?
            ");
            $stmtOld->execute([$logId]);
            $oldRow = $stmtOld->fetch(PDO::FETCH_ASSOC);
            if (!$oldRow) {
                areaJsonError('ไม่พบรายการบันทึกนี้ในระบบ', 404);
            }
            if ($oldRow['scan_out_time'] !== null) {
                areaJsonError('บุคคลนี้เช็คเอาท์ออกจากพื้นที่ไปแล้ว', 409);
            }

            $newPurpose = mb_substr(trim((string)($oldRow['purpose'] ?? '') . ' [Force Checkout]'), 0, 255);
            $upd = $pdo->prepare("UPDATE dbo.AREA_ACCESS_LOGS SET scan_out_time = GETDATE(), purpose = ? WHERE log_id = ?");
            $upd->execute([$newPurpose, $logId]);

            writeLog(
                $pdo,
                'FORCE_CHECKOUT',
                'AREA_ACCESS',
                (string)$logId,
                $oldRow,
                ['scan_out_time' => date('Y-m-d H:i:s'), 'purpose' => $newPurpose],
                'Forced checkout from Area Access Log'
            );

            areaJsonSuccess(['log_id' => $logId], 'เช็คเอาท์สำเร็จ');
            break;
        }

        case 'get_autocomplete': {
            $q = trim((string)($input['q'] ?? ''));
            if ($q !== '') {
                $stmt = $pdo->prepare("
                    SELECT TOP (100) emp_id, name_th, ISNULL(position, '') AS position, ISNULL(line, '') AS line
                    FROM " . MANPOWER_EMPLOYEES_TABLE . " WITH (NOLOCK)
                    WHERE is_active = 1 AND (emp_id LIKE ? OR name_th LIKE ?)
                    ORDER BY CASE WHEN emp_id LIKE 'V-%' THEN 0 ELSE 1 END, emp_id ASC
                ");
                $kw = "%{$q}%";
                $stmt->execute([$kw, $kw]);
            } else {
                $stmt = $pdo->query("
                    SELECT TOP (500) emp_id, name_th, ISNULL(position, '') AS position, ISNULL(line, '') AS line
                    FROM " . MANPOWER_EMPLOYEES_TABLE . " WITH (NOLOCK)
                    WHERE is_active = 1
                    ORDER BY CASE WHEN emp_id LIKE 'V-%' THEN 0 ELSE 1 END, emp_id ASC
                ");
            }
            areaJsonSuccess($stmt->fetchAll(PDO::FETCH_ASSOC) ?: [], 'Autocomplete list loaded');
            break;
        }

        default:
            areaJsonError("Invalid action: {$action}", 400);
    }
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    $rawMsg = $e->getMessage();
    // Surface controlled SP RAISERROR validation messages to the user without leaking SQL stack/paths
    if (stripos($rawMsg, 'Access Denied:') !== false || stripos($rawMsg, 'สแกนซ้ำเร็วเกินไป') !== false) {
        $parts = explode('[SQL Server]', $rawMsg);
        areaJsonError(trim((string)end($parts)), 400);
    }
    writeErrorLog($pdo ?? null, 'AREA_ACCESS', $rawMsg, ['action' => $action]);
    areaJsonError('เกิดข้อผิดพลาดในการดำเนินการ กรุณาลองใหม่อีกครั้ง', 500);
}
