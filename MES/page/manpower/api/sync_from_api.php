<?php
// MES/page/manpower_test/api/sync_from_api_test.php
// Version: INGEST ALL
// Target: _TEST Tables

ignore_user_abort(true); 
set_time_limit(600); 
//error_reporting(0);
//ini_set('display_errors', 0);

header('Content-Type: application/json');

// 1. Auto-Sync Check
$isAutoSync = false;
if ((isset($_SERVER['HTTP_X_MODE']) && $_SERVER['HTTP_X_MODE'] === 'auto_sync') || (isset($_GET['actionBy']) && $_GET['actionBy'] === 'SYSTEM')) {
    $isAutoSync = true;
}

require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../../config/config.php';

// 2. Auth Check
if (!$isAutoSync) {
    require_once __DIR__ . '/../../../auth/check_auth.php';
    if (!function_exists('hasPermission') || !hasPermission('manage_manpower')) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Permission Denied.']);
        exit;
    }
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

    // 2. Load Config (เนเธเนเธ•เธฒเธฃเธฒเธเธเธฃเธดเธเธชเธณเธซเธฃเธฑเธเธ•เธฑเนเธเธเนเธฒเธเธฐเนเธ”เน เน€เธเธฃเธฒเธฐเธญเนเธฒเธเธญเธขเนเธฒเธเน€เธ”เธตเธขเธง)
    $shiftConfig = [];
    $stmtShifts = $pdo->query("SELECT shift_id, start_time FROM dbo.MANPOWER_SHIFTS");
    while ($row = $stmtShifts->fetch(PDO::FETCH_ASSOC)) { 
        $shiftConfig[$row['shift_id']] = $row['start_time']; 
    }
    
    $defaultShiftId = 1; 
    foreach ($shiftConfig as $id => $time) { 
        if (strpos($time, '08:') === 0) { $defaultShiftId = $id; break; } 
    }

    // 3. Collect scan data & employee info from API
    $allScansByEmp = []; // All scans per employee (unsorted)
    $empInfoMap = []; 

    foreach ($rawList as $row) {
        $empId = strval($row['EMPID']);
        $ts = strtotime($row['TIMEINOUT']);
        
        if ($ts && date('Y', $ts) > 2020) {
            $allScansByEmp[$empId][] = $ts;
            if (!isset($empInfoMap[$empId])) $empInfoMap[$empId] = $row;
        }
    }

    // Sort & deduplicate scans per employee
    foreach ($allScansByEmp as $empId => &$scans) {
        sort($scans);
        $scans = array_values(array_unique($scans));
    }
    unset($scans);

    // 4. Update Master Data (TEST Table)
    $existingEmployees = [];
    $sqlEmp = "SELECT E.emp_id, E.line, E.default_shift_id, E.team_group, E.is_active, E.position, E.department_api,
                      ISNULL(CM.category_name, 'Other') as emp_type
               FROM dbo.MANPOWER_EMPLOYEES E
               LEFT JOIN dbo.MANPOWER_CATEGORY_MAPPING CM ON E.position LIKE '%' + CM.keyword + '%'";
    
    $stmtCheckIds = $pdo->query($sqlEmp);
    while ($row = $stmtCheckIds->fetch(PDO::FETCH_ASSOC)) { 
        $existingEmployees[strval($row['emp_id'])] = $row; 
    }
    
    $stmtInsertEmp = $pdo->prepare("INSERT INTO dbo.MANPOWER_EMPLOYEES (emp_id, name_th, position, department_api, is_active, line, default_shift_id, last_sync_at) VALUES (?, ?, ?, ?, ?, ?, ?, GETDATE())");
    $stmtUpdateEmp = $pdo->prepare("UPDATE dbo.MANPOWER_EMPLOYEES SET position = ?, department_api = ?, is_active = ?, last_sync_at = GETDATE() WHERE emp_id = ?");

    $stats = ['new' => 0, 'updated' => 0, 'deactivated' => 0, 'log_processed' => 0, 'cleaned_ghosts' => 0, 'outsiders' => 0];

    foreach ($empInfoMap as $apiEmpId => $info) {
        $deptApi = $info['DEPARTMENT'] ?? '';
        // --- ๐Ÿ’ก เธฅเธญเธˆเธดเธ เธˆเธฑเธ”เธซเธกเธงเธ”เธซเธกเธนเนˆเนƒเธซเธกเนˆ ---
        $isToolbox = (stripos($deptApi, 'Toolbox') !== false);
        $isTeam1 = (stripos($deptApi, 'Team1') !== false);
        
        // เธฃเธฑเธšเธžเธ™เธฑเธ เธ‡เธฒเธ™เธ—เธธเธ เธ„เธ™เน€เธ‚เน‰เธฒเน€เธ›เน‡เธ™ Active เธ—เธฑเน‰เธ‡เธซเธกเธ” เน€เธžเธทเนˆเธญเนƒเธซเน‰เธฃเธฐเธšเธšเธชเธฃเน‰เธฒเธ‡ Daily Log (เนƒเธซเน‰เธซเธฑเธงเธซเธ™เน‰เธฒเธ‡เธฒเธ™/HR เธˆเธฑเธ”เธ เธฒเธฃเธ เธฃเธญเธ‡เธญเธตเธ เธ—เธต)
        $apiCalculatedActive = 1;
        
        // เธ เธณเธซเธ™เธ” Line เน€เธฃเธดเนˆเธกเธ•เน‰เธ™เนƒเธซเน‰เน€เธ›เน‡เธ™เน เธœเธ™เธ เธ—เธตเนˆเน„เธ”เน‰เธˆเธฒเธ  API
        $defaultLine = $deptApi ? trim($deptApi) : 'OTHER_DEPT';
        if ($isToolbox) {
            $defaultLine = 'TOOLBOX_POOL';
        }

        if (!$isToolbox) $stats['outsiders']++;

        if (isset($existingEmployees[$apiEmpId])) {
            // --- มีในระบบแล้ว ตรวจสอบลอจิกห้ามเขียนทับ (Anti-Overwrite) ---
            $currentDbActive = (int)$existingEmployees[$apiEmpId]['is_active'];
            $finalStatus = 0;

            if ($currentDbActive === 1) {
                // ถ้าเดิมเป็น Active ให้รักษาค่าไว้
                $finalStatus = 1;
            } else {
                // แก้ไข: ถ้าเดิมเป็น Inactive (ถูกสั่งลาออกแล้ว) ให้คงสถานะลาออกไว้ ไม่ดึงกลับมาเป็น Active อัตโนมัติ
                $finalStatus = 0;
            }

            $dbPos = $existingEmployees[$apiEmpId]['position'] ?? '';
            $dbDept = $existingEmployees[$apiEmpId]['department_api'] ?? '';
            $apiPos = $info['POSITION'] ?? '-';

            if ($dbPos !== $apiPos || $dbDept !== $deptApi || $currentDbActive !== $finalStatus) {
                $stmtUpdateEmp->execute([
                    $apiPos, 
                    $deptApi, 
                    $finalStatus, 
                    $apiEmpId
                ]);
                
                if ($finalStatus == 0) $stats['deactivated']++;
                else $stats['updated']++;
            }
            
            $existingEmployees[$apiEmpId]['is_active'] = $finalStatus;

        } else {
            // --- คนใหม่ทั้งหมด บันทึกตาม API 100% ---
            $stmtInsertEmp->execute([
                $apiEmpId, 
                $info['NAME'] ?? '-', 
                $info['POSITION'] ?? '-', 
                $deptApi, 
                $apiCalculatedActive, 
                $defaultLine,
                $defaultShiftId
            ]);
            
            $existingEmployees[$apiEmpId] = [
                'emp_id' => $apiEmpId, 'line' => $defaultLine, 'default_shift_id' => $defaultShiftId,
                'team_group' => null, 'is_active' => $apiCalculatedActive, 'emp_type' => 'Other'
            ];
            $stats['new']++;
        }
    }
    // 5. Fetch Calendar / Holidays
    $holidays = [];
    $stmtCal = $pdo->prepare("SELECT calendar_date FROM dbo.MANPOWER_CALENDAR WHERE calendar_date BETWEEN ? AND ? AND day_type = 'HOLIDAY'");
    $stmtCal->execute([$startDate, $endDate]);
    while ($r = $stmtCal->fetch(PDO::FETCH_ASSOC)) {
        $holidays[$r['calendar_date']] = true;
    }

    // 6. Process Logs (ลงตาราง TEST)
    $existingLogs = [];
    $startDateSql = date('Y-m-d', strtotime('-1 day', strtotime($startDate)));
    $stmtAllLogs = $pdo->prepare("SELECT log_id, emp_id, log_date, is_verified, shift_id, status FROM dbo.MANPOWER_DAILY_LOGS WHERE log_date BETWEEN ? AND ?");
    $stmtAllLogs->execute([$startDateSql, $endDate]);
    while ($row = $stmtAllLogs->fetch(PDO::FETCH_ASSOC)) {
        $existingLogs[$row['emp_id']][$row['log_date']] = $row;
    }

    $stmtDeleteLog = $pdo->prepare("DELETE FROM dbo.MANPOWER_DAILY_LOGS WHERE log_id = ?");
    
    $stmtUpdateLog = $pdo->prepare("UPDATE dbo.MANPOWER_DAILY_LOGS 
        SET scan_in_time = ?, scan_out_time = ?, status = ?, shift_id = ?, 
            actual_line = ?, actual_team = ?, actual_emp_type = ?, 
            updated_at = GETDATE() 
        WHERE log_id = ? AND is_verified = 0");
        
    $stmtInsertLog = $pdo->prepare("INSERT INTO dbo.MANPOWER_DAILY_LOGS 
        (log_date, emp_id, scan_in_time, scan_out_time, status, shift_id, actual_line, actual_team, actual_emp_type, updated_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, GETDATE())");

    // ===================================================================
    // SMART GAP-BASED + TIME CONTEXT SCAN PAIRING (2-Pass)
    // ===================================================================

    $MIN_GAP = 2700;    // 45 นาที (สแกนซ้ำ/เดินผ่าน)
    $MAX_GAP = 57600;   // 16 ชม. (ระยะเวลาสูงสุดในการทำงานต่อเนื่อง เช่น กะ 8 + OT 8)

    // Step 1: Pair scans into work sessions per employee
    $sessionsByEmpDate = []; // [empId][logDate] = ['in' => ts|null, 'out' => ts|null]

    foreach ($allScansByEmp as $empId => $scans) {
        $empShiftId = $existingEmployees[$empId]['default_shift_id'] ?? $defaultShiftId;
        $empShiftStart = $shiftConfig[$empShiftId] ?? '08:00:00';
        
        $shiftStartHour = 8;
        if (preg_match('/(?:T| )(\d{2}):/', $empShiftStart, $m)) {
            $shiftStartHour = (int)$m[1];
        } else if (preg_match('/^(\d{2}):/', $empShiftStart, $m)) {
            $shiftStartHour = (int)$m[1];
        }
        $isNightShift = ($shiftStartHour >= 15 || $shiftStartHour < 3);

        // --- PASS 1: Auto-Pairing by Gap ---
        $pairedSessions = []; // เก็บ session ทั้งหมดของคนนี้ก่อนจัดลงวันที่
        $currentIn = null;

        foreach ($scans as $ts) {
            if ($currentIn === null) {
                $currentIn = $ts;
            } else {
                $gap = $ts - $currentIn;

                if ($gap < $MIN_GAP) {
                    // สแกนเบิ้ล ข้าม
                    continue;
                } else if ($gap <= $MAX_GAP) {
                    // ระยะห่างเหมาะสม (45 นาที - 16 ชม.) -> จับคู่เป็น IN / OUT ทันที!
                    $pairedSessions[] = ['in' => $currentIn, 'out' => $ts];
                    $currentIn = null; // เริ่มหารอบใหม่
                } else {
                    // ระยะห่างมากเกินไป (เกิน 16 ชม.) แสดงว่า $currentIn คือเศษ (Orphan) ไม่มี OUT
                    // ให้เก็บ $currentIn เป็นรอบที่ไม่มี OUT ไปก่อน แล้วให้รอบใหม่เริ่มที่ $ts
                    $pairedSessions[] = ['in' => $currentIn, 'out' => null];
                    $currentIn = $ts;
                }
            }
        }
        
        // ถ้ามี $currentIn ค้างอยู่ท้ายสุด ไม่มีคู่ ก็เอามาเป็น Orphan
        if ($currentIn !== null) {
            $pairedSessions[] = ['in' => $currentIn, 'out' => null];
        }

        // --- PASS 2: Orphan Classification & Date Mapping ---
        foreach ($pairedSessions as $sess) {
            $in = $sess['in'];
            $out = $sess['out'];
            
            // กรณีเป็น Orphan (มี in แต่ไม่มี out) -> ใช้ Time Context เดาว่าเป็น IN หรือ OUT
            if ($in !== null && $out === null) {
                $hour = (int)date('G', $in);
                $minute = (int)date('i', $in);
                
                if (!$isNightShift) {
                    // กะเช้า (Day Shift)
                    // ถ้าแสกนหลัง 12:30 น. (ช่วงบ่ายถึงดึก) หรือสแกนเช้ามืด (00:00 - 04:59) ถือว่าเป็นเวลา OUT (ทำโอทีลากยาวแล้วลืมสแกนเข้า หรือสแกนออกตอนเช้า)
                    if ($hour > 12 || ($hour == 12 && $minute >= 30) || $hour < 5) {
                        // ถือว่าเป็นเวลา OUT (คนลืมสแกนเข้า)
                        $out = $in;
                        $in = null;
                    }
                    // ถ้าก่อน 13:00 ให้คงเป็น IN ตามเดิม
                } else {
                    // กะดึก (Night Shift)
                    if ($hour < 12) {
                        // สแกนก่อน 12:00 น. (เที่ยงวัน) -> ถือว่าเป็นเวลา OUT ของเมื่อคืน
                        $out = $in;
                        $in = null;
                    }
                    // ถ้า 12:00 ขึ้นไป ให้คงเป็น IN ตามเดิม
                }
            }
            
            // การระบุ Log Date ของ Session นี้ (ใช้วันที่ของสแกนเข้าเป็นหลัก หรือสแกนออกในกรณีที่เป็น Orphan OUT)
            $referenceTs = $in !== null ? $in : $out;
            $logDate = date('Y-m-d', $referenceTs);
            
            // กรณีเป็น OUT ของกะดึก แต่มาตอนเช้า (เช่น สแกนออก 05:00) 
            // ตัว $logDate จะเป็นของวันนี้ แต่ความจริงเป็นกะของ "เมื่อวาน"
            // เราต้องปรับ Date กลับไปให้ถูกต้อง
            if ($in === null && $out !== null) {
                $outHour = (int)date('G', $out);
                // กะดึก หรือกรณีใดๆ ที่สแกนออกตอนเช้า (00:00 - 11:59) ถือว่าเป็นของกะเมื่อวาน
                if ($outHour < 12) {
                    $logDate = date('Y-m-d', strtotime('-1 day', $referenceTs));
                }
            } else if ($in !== null && $out !== null) {
                // ถ้ามีทั้ง IN และ OUT ให้ยึดวันที่ของ IN
                $logDate = date('Y-m-d', $in);
            }
            
            // ป้องกันการทับซ้อน (ถ้าเกิดวันนั้นมีหลาย session จะใช้อันแรกสุด หรือรวมกัน)
            if (!isset($sessionsByEmpDate[$empId][$logDate])) {
                $sessionsByEmpDate[$empId][$logDate] = ['in' => $in, 'out' => $out];
            } else {
                // ถ้ามีของวันนี้อยู่แล้ว พยายามเติมเต็ม
                if ($sessionsByEmpDate[$empId][$logDate]['in'] === null && $in !== null) {
                    $sessionsByEmpDate[$empId][$logDate]['in'] = $in;
                }
                if ($sessionsByEmpDate[$empId][$logDate]['out'] === null && $out !== null) {
                    $sessionsByEmpDate[$empId][$logDate]['out'] = $out;
                }
            }
        }
    }

    // Step 2: Process daily logs using paired sessions
    $currTs = strtotime($startDate);

    while ($currTs <= strtotime($endDate)) {
        $procDate = date('Y-m-d', $currTs);

        foreach ($existingEmployees as $empId => $empData) {

            // ข้ามคน Inactive (ไม่ต้องสร้าง Log) แต่ต้องเคลียร์ของเก่าทิ้งถ้ายังไม่ Confirm
            if (isset($empData['is_active']) && $empData['is_active'] == 0) {
                $ghostLog = $existingLogs[$empId][$procDate] ?? null;
                if ($ghostLog && $ghostLog['is_verified'] == 0) {
                    $stmtDeleteLog->execute([$ghostLog['log_id']]);
                    $stats['cleaned_ghosts']++;
                }
                continue;
            }

            $logExist = $existingLogs[$empId][$procDate] ?? null;
            if ($logExist && $logExist['is_verified'] == 1) continue;

            $snapLine = $empData['line'];
            $snapTeam = $empData['team_group'];
            $snapType = $empData['emp_type'];

            $targetShiftId = $logExist['shift_id'] ?? $empData['default_shift_id'] ?? $defaultShiftId;
            $shiftStartTime = $shiftConfig[$targetShiftId] ?? '08:00:00';

            // ดึง session ที่จับคู่แล้วสำหรับพนักงานคนนี้ในวันนี้
            $session = $sessionsByEmpDate[$empId][$procDate] ?? null;

            if ($session) {
                $finalIn = $session['in'];
                $finalOut = $session['out'];

                $inTimeStr = date('Y-m-d H:i:s', $finalIn);
                $outTimeStr = $finalOut ? date('Y-m-d H:i:s', $finalOut) : null;
                $shiftStartTs = strtotime("$procDate $shiftStartTime");
                $status = ($finalIn > $shiftStartTs) ? 'LATE' : 'PRESENT';

                if ($logExist) {
                    $stmtUpdateLog->execute([$inTimeStr, $outTimeStr, $status, $targetShiftId, $snapLine, $snapTeam, $snapType, $logExist['log_id']]);
                } else {
                    $stmtInsertLog->execute([$procDate, $empId, $inTimeStr, $outTimeStr, $status, $targetShiftId, $snapLine, $snapTeam, $snapType]);
                }
            } else {
                // ไม่มี session → กำหนดสถานะตามปฏิทิน
                if (isset($holidays[$procDate]) || date('w', strtotime($procDate)) == 0) {
                    $targetStatus = 'HOLIDAY';
                } else {
                    $targetStatus = ($procDate < date('Y-m-d')) ? 'ABSENT' : 'WAITING';
                }

                if ($logExist) {
                    if (in_array($logExist['status'], ['PRESENT', 'LATE']) && $logExist['is_verified'] == 0) {
                        // Scan was consumed by another day's shift (e.g. night shift clock-out)
                        // Clear the stale scan times and reset status
                        $stmtUpdateLog->execute([null, null, $targetStatus, $targetShiftId, $snapLine, $snapTeam, $snapType, $logExist['log_id']]);
                    } else if ($logExist['status'] !== $targetStatus && in_array($logExist['status'], ['WAITING', 'ABSENT', 'HOLIDAY'])) {
                        $pdo->prepare("UPDATE dbo.MANPOWER_DAILY_LOGS SET status = ?, updated_at = GETDATE() WHERE log_id = ?")->execute([$targetStatus, $logExist['log_id']]);
                    }
                } else {
                    $stmtInsertLog->execute([$procDate, $empId, null, null, $targetStatus, $targetShiftId, $snapLine, $snapTeam, $snapType]);
                }
            }
            $stats['log_processed']++;
            usleep(1000); 
        }
        $currTs = strtotime('+1 day', $currTs);
    }

    // --- Cleanup Historical ABSENT on Holidays/Sundays ---
    $sqlFix = "UPDATE dbo.MANPOWER_DAILY_LOGS 
               SET status = 'HOLIDAY', updated_at = GETDATE() 
               WHERE status = 'ABSENT' AND is_verified = 0
               AND (DATEPART(dw, log_date) = 1 OR log_date IN (SELECT calendar_date FROM dbo.MANPOWER_CALENDAR WHERE day_type = 'HOLIDAY'))";
    $stmtFix = $pdo->prepare($sqlFix);
    $stmtFix->execute();
    $stats['fixed_historical_holidays'] = $stmtFix->rowCount();

    $pdo->commit();
    echo json_encode(['success' => true, 'message' => 'Test Sync Completed V3', 'stats' => $stats]);

} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
