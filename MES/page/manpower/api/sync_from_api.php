<?php
// MES/page/manpower/api/sync_from_api.php
ignore_user_abort(true); 
set_time_limit(600); 

header('Content-Type: application/json');
require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../../auth/check_auth.php';
require_once __DIR__ . '/../../../config/config.php';

if (!hasRole(['admin', 'creator', 'supervisor'])) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

session_write_close(); 

$startDate = $_GET['startDate'] ?? date('Y-m-d');
$endDate   = $_GET['endDate']   ?? date('Y-m-d');

$apiStartDate = date('Y-m-d', strtotime('-1 day', strtotime($startDate)));
$apiEndDate   = date('Y-m-d', strtotime('+1 day', strtotime($endDate)));

$apiUrl = "https://oem.sncformer.com/oem-calendar/oem-web-link/api/api.php?router=/man-power-painting&sdate={$apiStartDate}&edate={$apiEndDate}";

try {
    // 1. Fetch API
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $apiUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    $apiResponse = curl_exec($ch);
    curl_close($ch);

    if (!$apiResponse) throw new Exception("API Connection Failed");
    $rawList = json_decode($apiResponse, true) ?? [];

    $pdo->beginTransaction();

    // 2. Config
    $shiftConfig = [];
    $stmtShifts = $pdo->query("SELECT shift_id, start_time, end_time FROM " . MANPOWER_SHIFTS_TABLE);
    while ($row = $stmtShifts->fetch(PDO::FETCH_ASSOC)) { $shiftConfig[$row['shift_id']] = $row; }
    
    $defaultShiftId = 1; 
    foreach ($shiftConfig as $id => $s) { if (strpos($s['start_time'], '08:') === 0) { $defaultShiftId = $id; break; } }

    // 3. Group Data
    $groupedData = []; 
    foreach ($rawList as $row) {
        $dept = $row['DEPARTMENT'] ?? '';
        if (stripos($dept, 'Toolbox') === false && stripos($dept, 'B9') === false && stripos($dept, 'B10') === false) continue; 
        
        $empId = strval($row['EMPID']);
        if (!isset($groupedData[$empId])) $groupedData[$empId] = ['info' => $row, 'timestamps' => []];
        $ts = strtotime($row['TIMEINOUT']);
        if ($ts && date('Y', $ts) > 2020) $groupedData[$empId]['timestamps'][] = $ts; 
    }

    // 4. Update Master
    $existingEmployees = [];
    $sqlEmp = "SELECT E.emp_id, E.line, E.default_shift_id, E.team_group, E.is_active, 
                      ISNULL(CM.category_name, 'Other') as emp_type
               FROM " . MANPOWER_EMPLOYEES_TABLE . " E
               LEFT JOIN " . MANPOWER_CATEGORY_MAPPING_TABLE . " CM ON E.position = CM.keyword";
    
    $stmtCheckIds = $pdo->query($sqlEmp);
    while ($row = $stmtCheckIds->fetch(PDO::FETCH_ASSOC)) { 
        $existingEmployees[strval($row['emp_id'])] = $row; 
    }
    
    $stmtInsertEmp = $pdo->prepare("INSERT INTO " . MANPOWER_EMPLOYEES_TABLE . " (emp_id, name_th, position, department_api, is_active, line, default_shift_id, last_sync_at) VALUES (?, ?, ?, ?, 1, 'TOOLBOX_POOL', ?, GETDATE())");
    $stmtUpdateEmp = $pdo->prepare("UPDATE " . MANPOWER_EMPLOYEES_TABLE . " SET position = ?, department_api = ?, last_sync_at = GETDATE() WHERE emp_id = ?");

    $stats = ['new' => 0, 'updated' => 0, 'log_processed' => 0, 'skipped_inactive' => 0, 'cleaned_ghosts' => 0];

    foreach ($groupedData as $apiEmpId => $data) {
        $info = $data['info'];
        if (isset($existingEmployees[$apiEmpId])) {
            if ($existingEmployees[$apiEmpId]['is_active'] == 1) {
                $stmtUpdateEmp->execute([$info['POSITION']??'-', $info['DEPARTMENT']??'-', $apiEmpId]);
                $stats['updated']++;
            }
        } else {
            $stmtInsertEmp->execute([$apiEmpId, $info['NAME']??'-', $info['POSITION']??'-', $info['DEPARTMENT']??'-', $defaultShiftId]);
            $existingEmployees[$apiEmpId] = [
                'emp_id' => $apiEmpId, 'line' => 'TOOLBOX_POOL', 'default_shift_id' => $defaultShiftId,
                'team_group' => null, 'is_active' => 1, 'emp_type' => 'Other'
            ];
            $stats['new']++;
        }
    }

    // 5. Process Logs (The Cleaner)
    $stmtCheckLog = $pdo->prepare("SELECT log_id, is_verified, shift_id FROM " . MANPOWER_DAILY_LOGS_TABLE . " WHERE emp_id = ? AND log_date = ?");
    
    // [เพิ่ม] คำสั่งลบ Log (สำหรับกำจัดผี)
    $stmtDeleteLog = $pdo->prepare("DELETE FROM " . MANPOWER_DAILY_LOGS_TABLE . " WHERE log_id = ?");

    $stmtUpdateLog = $pdo->prepare("UPDATE " . MANPOWER_DAILY_LOGS_TABLE . " 
        SET scan_in_time = ?, scan_out_time = ?, status = ?, shift_id = ?, 
            actual_line = ?, actual_team = ?, actual_emp_type = ?, 
            updated_at = GETDATE() 
        WHERE log_id = ? AND is_verified = 0");
        
    $stmtInsertLog = $pdo->prepare("INSERT INTO " . MANPOWER_DAILY_LOGS_TABLE . " 
        (log_date, emp_id, scan_in_time, scan_out_time, status, shift_id, actual_line, actual_team, actual_emp_type, updated_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, GETDATE())");

    $currTs = strtotime($startDate);
    while ($currTs <= strtotime($endDate)) {
        $procDate = date('Y-m-d', $currTs);
        
        foreach ($existingEmployees as $empId => $empData) {
            
            // =========================================================
            // [GHOST BUSTER] กำจัด Log ผี ของคน Inactive
            // =========================================================
            if (isset($empData['is_active']) && $empData['is_active'] == 0) {
                // เช็คก่อนว่ามี Log หลงเหลืออยู่ไหม?
                $stmtCheckLog->execute([$empId, $procDate]);
                $ghostLog = $stmtCheckLog->fetch(PDO::FETCH_ASSOC);
                
                if ($ghostLog) {
                    // ถ้ามี Log และยังไม่ Verify (System Gen) -> ลบทิ้งเลย!
                    // เพราะเขา Inactive แล้ว ไม่ควรมี Scan โผล่มาที่นี่
                    if ($ghostLog['is_verified'] == 0) {
                        $stmtDeleteLog->execute([$ghostLog['log_id']]);
                        $stats['cleaned_ghosts']++;
                    }
                }
                
                $stats['skipped_inactive']++;
                continue; // ข้ามไปคนถัดไปทันที
            }
            // =========================================================

            $snapLine = $empData['line'];
            $snapTeam = $empData['team_group'];
            $snapType = $empData['emp_type'];

            $stmtCheckLog->execute([$empId, $procDate]);
            $logExist = $stmtCheckLog->fetch(PDO::FETCH_ASSOC);

            if ($logExist && $logExist['is_verified'] == 1) {
                continue;
            }

            $targetShiftId = $logExist['shift_id'] ?? $empData['default_shift_id'] ?? $defaultShiftId;
            $sTime = $shiftConfig[$targetShiftId]['start_time'] ?? '08:00:00';
            $isNight = ((int)substr($sTime, 0, 2) >= 15);
            
            if ($isNight) {
                $wStart = strtotime("$procDate 14:00:00");
                $wEnd   = strtotime("$procDate 12:00:00 +1 day");
            } else {
                $wStart = strtotime("$procDate 04:00:00");
                $wEnd   = strtotime("$procDate 04:00:00 +1 day");
            }

            $validScans = [];
            if (isset($groupedData[$empId])) {
                foreach ($groupedData[$empId]['timestamps'] as $t) {
                    if ($t >= $wStart && $t <= $wEnd) $validScans[] = $t;
                }
            }

            if (!empty($validScans)) {
                // FOUND SCAN
                $inTs = min($validScans); $outTs = max($validScans);
                $inTimeStr = date('Y-m-d H:i:s', $inTs);
                $outTimeStr = ($inTs == $outTs) ? null : date('Y-m-d H:i:s', $outTs);

                $scanHr = (int)date('H', $inTs);
                $logDate = date('Y-m-d', $inTs);
                if ($scanHr >= 0 && $scanHr < 7) $logDate = date('Y-m-d', strtotime("-1 day", $inTs));

                $shiftStartTs = strtotime("$logDate $sTime");
                $status = ($inTs > ($shiftStartTs)) ? 'LATE' : 'PRESENT';

                $stmtCheckLog->execute([$empId, $logDate]);
                $finalLogCheck = $stmtCheckLog->fetch(PDO::FETCH_ASSOC);

                if ($finalLogCheck) {
                    if ($finalLogCheck['is_verified'] == 0) { 
                        $stmtUpdateLog->execute([$inTimeStr, $outTimeStr, $status, $targetShiftId, $snapLine, $snapTeam, $snapType, $finalLogCheck['log_id']]);
                    }
                } else {
                    $stmtInsertLog->execute([$logDate, $empId, $inTimeStr, $outTimeStr, $status, $targetShiftId, $snapLine, $snapTeam, $snapType]);
                }
            } else {
                // NO SCAN -> ABSENT/WAITING
                $logDate = $procDate;
                $defaultStatus = ($logDate < date('Y-m-d')) ? 'ABSENT' : 'WAITING';

                $stmtCheckLog->execute([$empId, $logDate]);
                $finalLogCheck = $stmtCheckLog->fetch(PDO::FETCH_ASSOC);

                if (!$finalLogCheck) {
                    $stmtInsertLog->execute([$logDate, $empId, null, null, $defaultStatus, $targetShiftId, $snapLine, $snapTeam, $snapType]);
                }
            }
            $stats['log_processed']++;
        }
        $currTs = strtotime('+1 day', $currTs);
    }

    // 6. Cost Calculation (ใช้ SQL เดิมได้เลย)
    $calcStart = date('Y-m-d', strtotime($startDate));
    $calcEnd   = date('Y-m-d', strtotime($endDate));
    
    $stmtDelCost = $pdo->prepare("DELETE FROM " . MANUAL_COSTS_TABLE . " WHERE entry_date BETWEEN ? AND ? AND cost_category = 'LABOR'");
    $stmtDelCost->execute([$calcStart, $calcEnd]);

    // Query Base: Join Table และใช้ actual_line เป็นหลัก
    $baseJoin = " FROM " . MANPOWER_DAILY_LOGS_TABLE . " L
                  JOIN " . MANPOWER_EMPLOYEES_TABLE . " E ON L.emp_id = E.emp_id
                  LEFT JOIN " . MANPOWER_SHIFTS_TABLE . " S ON L.shift_id = S.shift_id
                  LEFT JOIN " . MANPOWER_CATEGORY_MAPPING_TABLE . " CM ON E.position = CM.keyword
                  LEFT JOIN dbo.MANPOWER_CALENDAR Cal ON L.log_date = Cal.calendar_date ";
    
    // (A) DIRECT LABOR
    $sqlDL = "INSERT INTO " . MANUAL_COSTS_TABLE . " 
                (entry_date, line, shift, cost_category, cost_type, cost_value, unit, updated_at, updated_by)
                SELECT 
                    L.log_date,
                    COALESCE(L.actual_line, E.line), 
                    CASE WHEN S.shift_name LIKE '%Night%' THEN 'NIGHT' ELSE 'DAY' END,
                    'LABOR',
                    'DIRECT_LABOR',
                    SUM(
                        (CASE 
                            WHEN CM.rate_type LIKE 'MONTHLY%' THEN (CM.hourly_rate / 30.0)
                            ELSE 0 
                        END)
                        +
                        (Final.Normal_Hrs * Rate.Hourly_Base * Rate.Work_Multiplier)
                    ),
                    'THB',
                    GETDATE(),
                    'System_Sync'
                $baseJoin
                CROSS APPLY (
                    SELECT 
                        CASE 
                            WHEN CM.rate_type LIKE 'MONTHLY%' THEN COALESCE(CM.hourly_rate, 0) / 30.0 / 8.0
                            WHEN CM.rate_type = 'DAILY'       THEN COALESCE(CM.hourly_rate, 0) / 8.0
                            ELSE COALESCE(CM.hourly_rate, 0)
                        END AS Hourly_Base,
                        CASE 
                            WHEN CM.rate_type = 'MONTHLY_NO_OT' THEN 0.0 
                            WHEN Cal.day_type = 'HOLIDAY' AND CM.rate_type LIKE 'MONTHLY%' THEN 1.0 
                            WHEN Cal.day_type = 'HOLIDAY' THEN 2.0 
                            WHEN CM.rate_type LIKE 'MONTHLY%' THEN 0.0 
                            ELSE 1.0 
                        END AS Work_Multiplier
                ) AS Rate
                CROSS APPLY (
                    SELECT CAST(CONCAT(L.log_date, ' ', S.start_time) AS DATETIME) AS Shift_Start
                ) AS T0
                CROSS APPLY (
                    SELECT 
                        CASE 
                            WHEN L.scan_out_time IS NULL THEN DATEADD(HOUR, 9, T0.Shift_Start)
                            WHEN L.scan_out_time < T0.Shift_Start THEN DATEADD(HOUR, 9, T0.Shift_Start)
                            WHEN DATEDIFF(HOUR, T0.Shift_Start, L.scan_out_time) >= 22 AND CM.rate_type NOT LIKE 'MONTHLY%' THEN DATEADD(HOUR, 9, T0.Shift_Start)
                            ELSE L.scan_out_time
                        END AS Calc_End_Time
                ) AS T1
                CROSS APPLY ( SELECT DATEDIFF(MINUTE, T0.Shift_Start, T1.Calc_End_Time) AS Raw_Minutes ) AS T2
                CROSS APPLY (
                    SELECT FLOOR((T2.Raw_Minutes - (CASE WHEN T2.Raw_Minutes >= 300 THEN 60 ELSE 0 END) - (CASE WHEN T2.Raw_Minutes >= 570 THEN 30 ELSE 0 END)) / 30.0) * 0.5 AS Net_Hours
                ) AS T3
                CROSS APPLY ( SELECT CASE WHEN T3.Net_Hours > 8 THEN 8 ELSE T3.Net_Hours END AS Normal_Hrs ) AS Final
                WHERE L.log_date BETWEEN ? AND ?
                AND L.status IN ('PRESENT', 'LATE')
                AND L.scan_in_time IS NOT NULL 
                GROUP BY L.log_date, COALESCE(L.actual_line, E.line), CASE WHEN S.shift_name LIKE '%Night%' THEN 'NIGHT' ELSE 'DAY' END";

    $stmtCalcDL = $pdo->prepare($sqlDL);
    $stmtCalcDL->execute([$calcStart, $calcEnd]);
    $rowsDL = $stmtCalcDL->rowCount();

    // (B) OVERTIME
    $sqlOT = "INSERT INTO " . MANUAL_COSTS_TABLE . " 
                (entry_date, line, shift, cost_category, cost_type, cost_value, unit, updated_at, updated_by)
                SELECT 
                    L.log_date,
                    COALESCE(L.actual_line, E.line), 
                    CASE WHEN S.shift_name LIKE '%Night%' THEN 'NIGHT' ELSE 'DAY' END,
                    'LABOR',
                    'OVERTIME',
                    SUM(Final.OT_Hrs * Rate.Hourly_Base * Rate.OT_Multiplier),
                    'THB',
                    GETDATE(),
                    'System_Sync'
                $baseJoin
                CROSS APPLY (
                    SELECT 
                        CASE 
                            WHEN CM.rate_type LIKE 'MONTHLY%' THEN COALESCE(CM.hourly_rate, 0) / 30.0 / 8.0
                            WHEN CM.rate_type = 'DAILY'       THEN COALESCE(CM.hourly_rate, 0) / 8.0
                            ELSE COALESCE(CM.hourly_rate, 0)
                        END AS Hourly_Base,
                        CASE 
                            WHEN CM.rate_type = 'MONTHLY_NO_OT' THEN 0.0
                            WHEN Cal.day_type = 'HOLIDAY' THEN 3.0 
                            ELSE 1.5 
                        END AS OT_Multiplier
                ) AS Rate
                CROSS APPLY ( SELECT CAST(CONCAT(L.log_date, ' ', S.start_time) AS DATETIME) AS Shift_Start ) AS T0
                CROSS APPLY (
                    SELECT 
                        CASE 
                            WHEN L.scan_out_time IS NULL THEN DATEADD(HOUR, 9, T0.Shift_Start)
                            WHEN L.scan_out_time < T0.Shift_Start THEN DATEADD(HOUR, 9, T0.Shift_Start)
                            WHEN DATEDIFF(HOUR, T0.Shift_Start, L.scan_out_time) >= 22 AND CM.rate_type NOT LIKE 'MONTHLY%' THEN DATEADD(HOUR, 9, T0.Shift_Start)
                            ELSE L.scan_out_time
                        END AS Calc_End_Time
                ) AS T1
                CROSS APPLY ( SELECT DATEDIFF(MINUTE, T0.Shift_Start, T1.Calc_End_Time) AS Raw_Minutes ) AS T2
                CROSS APPLY (
                    SELECT FLOOR((T2.Raw_Minutes - (CASE WHEN T2.Raw_Minutes >= 300 THEN 60 ELSE 0 END) - (CASE WHEN T2.Raw_Minutes >= 570 THEN 30 ELSE 0 END)) / 30.0) * 0.5 AS Net_Hours
                ) AS T3
                CROSS APPLY ( SELECT CASE WHEN T3.Net_Hours > 8 THEN (T3.Net_Hours - 8) ELSE 0 END AS OT_Hrs ) AS Final
                WHERE L.log_date BETWEEN ? AND ?
                AND L.status IN ('PRESENT', 'LATE')
                AND L.scan_in_time IS NOT NULL 
                GROUP BY L.log_date, COALESCE(L.actual_line, E.line), CASE WHEN S.shift_name LIKE '%Night%' THEN 'NIGHT' ELSE 'DAY' END
                HAVING SUM(Final.OT_Hrs * Rate.Hourly_Base * Rate.OT_Multiplier) > 0";

    $stmtCalcOT = $pdo->prepare($sqlOT);
    $stmtCalcOT->execute([$calcStart, $calcEnd]);
    $rowsOT = $stmtCalcOT->rowCount();

    // (C) HEAD COUNT
    $sqlHead = "INSERT INTO " . MANUAL_COSTS_TABLE . " 
                (entry_date, line, shift, cost_category, cost_type, cost_value, unit, updated_at, updated_by)
                SELECT 
                    L.log_date,
                    COALESCE(L.actual_line, E.line), 
                    CASE WHEN S.shift_name LIKE '%Night%' THEN 'NIGHT' ELSE 'DAY' END,
                    'LABOR',
                    'HEAD_COUNT',
                    COUNT(DISTINCT L.emp_id),
                    'Person',
                    GETDATE(),
                    'System_Sync'
                $baseJoin
                WHERE L.log_date BETWEEN ? AND ?
                  AND L.status IN ('PRESENT', 'LATE')
                GROUP BY L.log_date, COALESCE(L.actual_line, E.line), CASE WHEN S.shift_name LIKE '%Night%' THEN 'NIGHT' ELSE 'DAY' END";

    $stmtCalcHead = $pdo->prepare($sqlHead);
    $stmtCalcHead->execute([$calcStart, $calcEnd]);
    $rowsHead = $stmtCalcHead->rowCount();
    
    $stats['cost_entries'] = $rowsDL + $rowsOT + $rowsHead;

    $pdo->commit();
    echo json_encode(['success' => true, 'message' => 'Sync Completed (Inactive Cleared)', 'stats' => $stats]);

} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>