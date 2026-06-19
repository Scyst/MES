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
    // SHIFT WINDOW SCAN PAIRING (First IN, Last OUT per Shift Window)
    // ===================================================================
    // วิธีมาตรฐานอุตสาหกรรม: กำหนดหน้าต่างเวลา (Shift Window) สำหรับแต่ละกะ
    // แล้วเลือก "สแกนแรก" ใน IN Window เป็นเวลาเข้างาน
    // และ "สแกนสุดท้าย" ใน OUT Window เป็นเวลาออกงาน
    //
    // ข้อดี:
    // - สแกนกี่ครั้งก็ได้ ไม่มีปัญหาสแกนซ้ำ (double-scan)
    // - ทำ OT แล้วสแกนออกหลายรอบก็ถูกต้อง (เอาตัวสุดท้าย)
    // - ไม่ต้องใช้ anti-swap rules หรือ MIN_GAP/MAX_GAP
    //
    // Shift Windows:
    // กะเช้า (Day):  IN = 05:00-12:59 วันนั้น,  OUT = 13:00-23:59 วันนั้น
    // กะดึก (Night): IN = 15:00-23:59 วันนั้น,  OUT = 00:00-12:59 วันถัดไป

    $sessionsByEmpDate = []; // [empId][logDate] = ['in' => ts|null, 'out' => ts|null]

    $syncStartTs = strtotime($startDate);
    $syncEndTs   = strtotime($endDate);

    foreach ($allScansByEmp as $empId => $scans) {
        if (empty($scans)) continue;

        // วนแต่ละวันในช่วง sync
        $currDateTs = $syncStartTs;
        while ($currDateTs <= $syncEndTs) {
            $dateStr = date('Y-m-d', $currDateTs);

            // หา shift_id สำหรับคนนี้วันนี้ (จาก log ที่มีอยู่ หรือ default)
            $sid = $existingLogs[$empId][$dateStr]['shift_id'] 
                ?? $existingEmployees[$empId]['default_shift_id'] 
                ?? $defaultShiftId;

            // ตรวจสอบว่าเป็นกะดึกหรือไม่
            $startTime = $shiftConfig[$sid] ?? '08:00:00';
            $sh = 8;
            if (preg_match('/(?:T| )(\d{2}):/', $startTime, $m)) $sh = (int)$m[1];
            else if (preg_match('/^(\d{2}):/', $startTime, $m)) $sh = (int)$m[1];
            $isNight = ($sh >= 15 || $sh < 3);

            // กำหนด Shift Windows
            if (!$isNight) {
                // กะเช้า (Day Shift)
                $inWinStart  = strtotime("$dateStr 05:00:00");
                $inWinEnd    = strtotime("$dateStr 12:59:59");
                $outWinStart = strtotime("$dateStr 13:00:00");
                $outWinEnd   = strtotime("$dateStr 23:59:59");
            } else {
                // กะดึก (Night Shift)
                $inWinStart  = strtotime("$dateStr 15:00:00");
                $inWinEnd    = strtotime("$dateStr 23:59:59");
                $nextDate    = date('Y-m-d', strtotime('+1 day', $currDateTs));
                $outWinStart = strtotime("$nextDate 00:00:00");
                $outWinEnd   = strtotime("$nextDate 12:59:59");
            }

            // หาสแกนแรกใน IN Window (First IN)
            $scanIn = null;
            foreach ($scans as $ts) {
                if ($ts > $inWinEnd) break; // scans เรียงแล้ว เลยหน้าต่างแล้วหยุดได้
                if ($ts >= $inWinStart) {
                    $scanIn = $ts;
                    break; // ตัวแรกสุด
                }
            }

            // หาสแกนสุดท้ายใน OUT Window (Last OUT)
            $scanOut = null;
            foreach ($scans as $ts) {
                if ($ts > $outWinEnd) break; // เลยหน้าต่างแล้วหยุดได้
                if ($ts >= $outWinStart) {
                    $scanOut = $ts; // อัปเดตเรื่อยๆ ตัวสุดท้ายชนะ
                }
            }

            // บันทึกถ้ามีข้อมูลอย่างน้อย 1 scan
            if ($scanIn !== null || $scanOut !== null) {
                if (!isset($sessionsByEmpDate[$empId][$dateStr])) {
                    $sessionsByEmpDate[$empId][$dateStr] = ['in' => $scanIn, 'out' => $scanOut];
                } else {
                    // เติมเต็มข้อมูลที่ขาด (กรณีหลาย shift window ครอบคลุมวันเดียวกัน)
                    if ($sessionsByEmpDate[$empId][$dateStr]['in'] === null && $scanIn !== null) {
                        $sessionsByEmpDate[$empId][$dateStr]['in'] = $scanIn;
                    }
                    if ($sessionsByEmpDate[$empId][$dateStr]['out'] === null && $scanOut !== null) {
                        $sessionsByEmpDate[$empId][$dateStr]['out'] = $scanOut;
                    }
                }
            }

            $currDateTs = strtotime('+1 day', $currDateTs);
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
