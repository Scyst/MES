<?php
// MES/page/manpower/api/sync_from_api.php
ignore_user_abort(true); 
set_time_limit(600); // 10 Minutes timeout

header('Content-Type: application/json');
require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../../auth/check_auth.php';
require_once __DIR__ . '/../../../config/config.php';

// Check Permissions
if (!hasRole(['admin', 'creator', 'supervisor'])) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

session_write_close(); 

$startDate = $_GET['startDate'] ?? date('Y-m-d');
$endDate   = $_GET['endDate']   ?? date('Y-m-d');

// ขยายเวลาเพื่อดึงกะดึก (-1 วัน ถึง +1 วัน) เพื่อให้ครอบคลุมการเข้างานข้ามคืน
$apiStartDate = date('Y-m-d', strtotime('-1 day', strtotime($startDate)));
$apiEndDate   = date('Y-m-d', strtotime('+1 day', strtotime($endDate)));

$apiUrl = "https://oem.sncformer.com/oem-calendar/oem-web-link/api/api.php?router=/man-power-painting&sdate={$apiStartDate}&edate={$apiEndDate}";

try {
    // --------------------------------------------------------
    // 1. ดึงข้อมูลจาก API
    // --------------------------------------------------------
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $apiUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    $apiResponse = curl_exec($ch);
    
    if (curl_errno($ch)) {
        throw new Exception('Curl Error: ' . curl_error($ch));
    }
    curl_close($ch);

    if (!$apiResponse) throw new Exception("API Connection Failed or Empty Response");
    $rawList = json_decode($apiResponse, true);
    if (!is_array($rawList)) $rawList = [];

    // --------------------------------------------------------
    // 2. เตรียมข้อมูล Config (Shift & Filter)
    // --------------------------------------------------------
    $pdo->beginTransaction();

    // 2.1 โหลด Config กะงานจาก DB
    $shiftConfig = [];
    $stmtShifts = $pdo->query("SELECT shift_id, start_time, end_time FROM " . MANPOWER_SHIFTS_TABLE);
    while ($row = $stmtShifts->fetch(PDO::FETCH_ASSOC)) { 
        $shiftConfig[$row['shift_id']] = $row; 
    }
    
    // หา Default Shift (กะเช้า 08:00)
    $defaultShiftId = 1; 
    foreach ($shiftConfig as $id => $s) {
        if (strpos($s['start_time'], '08:') === 0) { $defaultShiftId = $id; break; }
    }

    // 2.2 จัดกลุ่มข้อมูลดิบตาม EMPID
    $groupedData = []; 
    foreach ($rawList as $row) {
        // กรองแผนก (Business Logic เดิม: เอาเฉพาะ Toolbox, B9, B10)
        $dept = $row['DEPARTMENT'] ?? '';
        if (stripos($dept, 'Toolbox') === false && stripos($dept, 'B9') === false && stripos($dept, 'B10') === false) {
            continue; 
        }

        $empId = strval($row['EMPID']);
        if (!isset($groupedData[$empId])) { 
            $groupedData[$empId] = ['info' => $row, 'timestamps' => []]; 
        }
        
        $ts = strtotime($row['TIMEINOUT']);
        if ($ts && date('Y', $ts) > 2020) { 
            $groupedData[$empId]['timestamps'][] = $ts; 
        }
    }

    // --------------------------------------------------------
    // 3. อัปเดตข้อมูลพนักงาน (Master Data)
    // *จุดสำคัญ: รักษา Line เดิมที่ Admin ตั้งไว้*
    // --------------------------------------------------------
    $stats = ['new' => 0, 'updated' => 0, 'log_processed' => 0];

    // ดึงข้อมูลคนที่มีอยู่แล้ว
    $existingEmployees = [];
    $stmtCheckIds = $pdo->query("SELECT emp_id, line, default_shift_id FROM " . MANPOWER_EMPLOYEES_TABLE);
    while ($row = $stmtCheckIds->fetch(PDO::FETCH_ASSOC)) { 
        $existingEmployees[strval($row['emp_id'])] = $row; 
    }
    
    $stmtInsertEmp = $pdo->prepare("INSERT INTO " . MANPOWER_EMPLOYEES_TABLE . " (emp_id, name_th, position, department_api, is_active, line, default_shift_id, last_sync_at) VALUES (?, ?, ?, ?, 1, 'TOOLBOX_POOL', ?, GETDATE())");
    $stmtUpdateEmp = $pdo->prepare("UPDATE " . MANPOWER_EMPLOYEES_TABLE . " SET position = ?, department_api = ?, last_sync_at = GETDATE() WHERE emp_id = ?");

    foreach ($groupedData as $apiEmpId => $data) {
        $info = $data['info'];
        
        if (isset($existingEmployees[$apiEmpId])) {
            // [คนเก่า]: อัปเดตแค่ ชื่อตำแหน่ง กับ แผนก API (ไม่แตะ Line/Shift)
            $stmtUpdateEmp->execute([
                $info['POSITION'] ?? '-', 
                $info['DEPARTMENT'] ?? '-', 
                $apiEmpId
            ]);
            $stats['updated']++;
        } else {
            // [คนใหม่]: ใส่ลง 'TOOLBOX_POOL' ให้ Admin ไปย้ายเอง
            $stmtInsertEmp->execute([
                $apiEmpId, 
                $info['NAME'] ?? '-', 
                $info['POSITION'] ?? '-', 
                $info['DEPARTMENT'] ?? '-', 
                $defaultShiftId
            ]);
            
            // เพิ่มเข้า Array ใน Memory ทันทีเพื่อให้ Loop ด้านล่างมองเห็น
            $existingEmployees[$apiEmpId] = [
                'emp_id' => $apiEmpId, 
                'line' => 'TOOLBOX_POOL', 
                'default_shift_id' => $defaultShiftId
            ];
            $stats['new']++;
        }
    }

    // --------------------------------------------------------
    // 4. บันทึกเวลาเข้างาน (Attendance Log)
    // --------------------------------------------------------
    $stmtCheckLog = $pdo->prepare("SELECT log_id, is_verified, shift_id FROM " . MANPOWER_DAILY_LOGS_TABLE . " WHERE emp_id = ? AND log_date = ?");
    $stmtUpdateLog = $pdo->prepare("UPDATE " . MANPOWER_DAILY_LOGS_TABLE . " SET scan_in_time = ?, scan_out_time = ?, status = ?, shift_id = ?, updated_at = GETDATE() WHERE log_id = ? AND is_verified = 0");
    $stmtInsertLog = $pdo->prepare("INSERT INTO " . MANPOWER_DAILY_LOGS_TABLE . " (log_date, emp_id, scan_in_time, scan_out_time, status, shift_id, updated_at) VALUES (?, ?, ?, ?, ?, ?, GETDATE())");

    $currTs = strtotime($startDate);
    while ($currTs <= strtotime($endDate)) {
        $procDate = date('Y-m-d', $currTs);
        
        foreach ($existingEmployees as $empId => $empData) {
            // 4.1 เช็คว่ามี Log ของวันนี้หรือยัง
            $stmtCheckLog->execute([$empId, $procDate]);
            $logExist = $stmtCheckLog->fetch(PDO::FETCH_ASSOC);
            
            // 4.2 หากะที่จะใช้ (Priority: Log เดิม > Shift ของพนักงาน > Default)
            $targetShiftId = $logExist['shift_id'] ?? $empData['default_shift_id'] ?? $defaultShiftId;
            
            // 4.3 คำนวณ Window ของกะนี้
            $sTime = $shiftConfig[$targetShiftId]['start_time'] ?? '08:00:00';
            $isNight = ((int)substr($sTime, 0, 2) >= 15); // ถ้าเริ่มหลังบ่าย 3 ถือเป็นกะดึก/เย็น
            
            // [แก้ไขใหม่] ขยายเวลาค้นหา (Window)
            if ($isNight) {
                // --- กะดึก (Night Shift) ---
                // เริ่มหาตั้งแต่ 14:00 น. (เผื่อมาเตรียมตัวก่อนเข้างาน)
                // ไปจนถึง 12:00 น. ของอีกวัน (เผื่อทำ OT ไหลยาวถึงเที่ยง)
                $wStart = strtotime("$procDate 14:00:00");
                $wEnd   = strtotime("$procDate 12:00:00 +1 day");
            } else {
                // --- กะเช้า (Day Shift) ---
                // เริ่มหาตั้งแต่ 04:00 น. (เผื่อคนมาเช้ามาก)
                // [จุดสำคัญที่แก้] ไปจนถึง 04:00 น. ของอีกวัน (เดิมแค่ 02:00 ทำให้คนเลิกตี 3 เวลาหาย)
                $wStart = strtotime("$procDate 04:00:00");
                $wEnd   = strtotime("$procDate 04:00:00 +1 day");
            }

            // 4.4 หา Scan ที่อยู่ใน Window นี้
            $validScans = [];
            if (isset($groupedData[$empId])) {
                foreach ($groupedData[$empId]['timestamps'] as $t) {
                    if ($t >= $wStart && $t <= $wEnd) $validScans[] = $t;
                }
            }

            if (!empty($validScans)) {
                $inTs = min($validScans);
                $outTs = max($validScans);
                $inTimeStr = date('Y-m-d H:i:s', $inTs);
                $outTimeStr = ($inTs == $outTs) ? null : date('Y-m-d H:i:s', $outTs);

                // ปรับวันที่ Production Date สำหรับกะดึก (เช่น สแกนตี 2 ต้องเป็นยอดของเมื่อวาน)
                $scanHr = (int)date('H', $inTs);
                $logDate = date('Y-m-d', $inTs);
                if ($scanHr >= 0 && $scanHr < 7) { 
                    $logDate = date('Y-m-d', strtotime("-1 day", $inTs));
                }

                // เช็คสาย
                $shiftStartTs = strtotime("$logDate $sTime");
                $status = ($inTs > ($shiftStartTs)) ? 'LATE' : 'PRESENT';

                // Save ลง DB
                $stmtCheckLog->execute([$empId, $logDate]); // เช็คอีกทีด้วยวันที่ที่ปรับแล้ว
                $finalLogCheck = $stmtCheckLog->fetch(PDO::FETCH_ASSOC);

                if ($finalLogCheck) {
                    // ถ้ายังไม่ได้ Verify (ล็อก) ให้อัปเดตเวลาได้
                    if ($finalLogCheck['is_verified'] == 0) { 
                        $stmtUpdateLog->execute([$inTimeStr, $outTimeStr, $status, $targetShiftId, $finalLogCheck['log_id']]);
                    }
                } else {
                    $stmtInsertLog->execute([$logDate, $empId, $inTimeStr, $outTimeStr, $status, $targetShiftId]);
                }
            } else {
                // ถ้าไม่มีสแกน ไม่ต้องทำอะไร
            }
            $stats['log_processed']++;
        }
        $currTs = strtotime('+1 day', $currTs);
    }

    // --------------------------------------------------------
    // 5. [FIXED] คำนวณค่าแรง (Labor Cost Calculation)
    // แยก DL และ OT ออกจากกันอย่างถูกต้อง
    // --------------------------------------------------------
    
    $calcStart = date('Y-m-d', strtotime($startDate));
    $calcEnd   = date('Y-m-d', strtotime($endDate));

    // 5.1 ลบข้อมูล Cost เก่า (เฉพาะหมวด LABOR ในช่วงวันที่ Sync)
    $stmtDelCost = $pdo->prepare("DELETE FROM " . MANUAL_COSTS_TABLE . " 
                                  WHERE entry_date BETWEEN ? AND ? 
                                  AND cost_category = 'LABOR'");
    $stmtDelCost->execute([$calcStart, $calcEnd]);

    // ==================================================================================
    // 5.2 (A) Insert ค่าแรงปกติ (DIRECT_LABOR) = เงินเดือน + (ชั่วโมงปกติ * เรท * ตัวคูณ)
    // ==================================================================================
    $sqlDL = "INSERT INTO " . MANUAL_COSTS_TABLE . " 
                (entry_date, line, shift, cost_category, cost_type, cost_value, unit, updated_at, updated_by)
                SELECT 
                    L.log_date,
                    E.line,
                    CASE WHEN S.shift_name LIKE '%Night%' THEN 'NIGHT' ELSE 'DAY' END,
                    'LABOR',
                    'DIRECT_LABOR', -- Type: DL
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
                FROM " . MANPOWER_DAILY_LOGS_TABLE . " L
                JOIN " . MANPOWER_EMPLOYEES_TABLE . " E ON L.emp_id = E.emp_id
                LEFT JOIN " . MANPOWER_SHIFTS_TABLE . " S ON L.shift_id = S.shift_id
                LEFT JOIN " . MANPOWER_CATEGORY_MAPPING_TABLE . " CM ON E.position = CM.keyword
                LEFT JOIN dbo.MANPOWER_CALENDAR Cal ON L.log_date = Cal.calendar_date
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
                AND E.line IS NOT NULL
                GROUP BY L.log_date, E.line, CASE WHEN S.shift_name LIKE '%Night%' THEN 'NIGHT' ELSE 'DAY' END";

    $stmtCalcDL = $pdo->prepare($sqlDL);
    $stmtCalcDL->execute([$calcStart, $calcEnd]);
    $rowsDL = $stmtCalcDL->rowCount();

    // ==================================================================================
    // 5.2 (B) Insert ค่าโอที (OVERTIME) = (ชั่วโมง OT * เรท * ตัวคูณ OT)
    // ==================================================================================
    $sqlOT = "INSERT INTO " . MANUAL_COSTS_TABLE . " 
                (entry_date, line, shift, cost_category, cost_type, cost_value, unit, updated_at, updated_by)
                SELECT 
                    L.log_date,
                    E.line,
                    CASE WHEN S.shift_name LIKE '%Night%' THEN 'NIGHT' ELSE 'DAY' END,
                    'LABOR',
                    'OVERTIME', -- Type: OT
                    SUM(Final.OT_Hrs * Rate.Hourly_Base * Rate.OT_Multiplier),
                    'THB',
                    GETDATE(),
                    'System_Sync'
                FROM " . MANPOWER_DAILY_LOGS_TABLE . " L
                JOIN " . MANPOWER_EMPLOYEES_TABLE . " E ON L.emp_id = E.emp_id
                LEFT JOIN " . MANPOWER_SHIFTS_TABLE . " S ON L.shift_id = S.shift_id
                LEFT JOIN " . MANPOWER_CATEGORY_MAPPING_TABLE . " CM ON E.position = CM.keyword
                LEFT JOIN dbo.MANPOWER_CALENDAR Cal ON L.log_date = Cal.calendar_date
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
                AND E.line IS NOT NULL
                GROUP BY L.log_date, E.line, CASE WHEN S.shift_name LIKE '%Night%' THEN 'NIGHT' ELSE 'DAY' END
                HAVING SUM(Final.OT_Hrs * Rate.Hourly_Base * Rate.OT_Multiplier) > 0"; // Insert เฉพาะที่มี OT

    $stmtCalcOT = $pdo->prepare($sqlOT);
    $stmtCalcOT->execute([$calcStart, $calcEnd]);
    $rowsOT = $stmtCalcOT->rowCount();

    // 5.2 (C) Insert จำนวนคน (HEAD_COUNT) - (เหมือนเดิม)
    $sqlHead = "INSERT INTO " . MANUAL_COSTS_TABLE . " 
                (entry_date, line, shift, cost_category, cost_type, cost_value, unit, updated_at, updated_by)
                SELECT 
                    L.log_date,
                    E.line,
                    CASE WHEN S.shift_name LIKE '%Night%' THEN 'NIGHT' ELSE 'DAY' END,
                    'LABOR',
                    'HEAD_COUNT',
                    COUNT(DISTINCT L.emp_id),
                    'Person',
                    GETDATE(),
                    'System_Sync'
                FROM " . MANPOWER_DAILY_LOGS_TABLE . " L
                JOIN " . MANPOWER_EMPLOYEES_TABLE . " E ON L.emp_id = E.emp_id
                LEFT JOIN " . MANPOWER_SHIFTS_TABLE . " S ON L.shift_id = S.shift_id
                WHERE L.log_date BETWEEN ? AND ?
                  AND L.status IN ('PRESENT', 'LATE')
                  AND E.line IS NOT NULL
                GROUP BY L.log_date, E.line, CASE WHEN S.shift_name LIKE '%Night%' THEN 'NIGHT' ELSE 'DAY' END";

    $stmtCalcHead = $pdo->prepare($sqlHead);
    $stmtCalcHead->execute([$calcStart, $calcEnd]);
    $rowsHead = $stmtCalcHead->rowCount();
    
    $stats['cost_entries'] = $rowsDL + $rowsOT + $rowsHead;

    $pdo->commit();
    echo json_encode([
        'success' => true, 
        'message' => 'Sync Completed. Existing Lines Preserved.', 
        'stats' => $stats
    ]);

} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>