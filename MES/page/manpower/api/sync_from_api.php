<?php
// MES/page/manpower/api/sync_from_api.php

// 1. Setup Environment
date_default_timezone_set('Asia/Bangkok'); 
ignore_user_abort(true); 
set_time_limit(0);       
header('Content-Type: application/json');

// --- 🔒 SECURITY GATE ---
$API_SECRET = "SNC_TOOLBOX_SECURE_KEY_998877";
$incomingKey = $_GET['secret_key'] ?? '';

if ($incomingKey !== $API_SECRET) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => '⛔ Access Denied']);
    exit;
}
// -----------------------

// =================================================================
// 🚀 FIRE AND FORGET (ตอบกลับทันที แล้วทำงานเบื้องหลัง)
// =================================================================
ob_start();
echo json_encode([
    'success' => true, 
    'message' => '✅ Background Sync Started. Process running in background.',
    'timestamp' => date('Y-m-d H:i:s')
]);
$size = ob_get_length();
header("Content-Length: $size");
header('Connection: close'); 
ob_end_flush();
@ob_flush();
flush();
if (function_exists('fastcgi_finish_request')) {
    fastcgi_finish_request(); 
}

require_once __DIR__ . '/../../db.php'; 
require_once __DIR__ . '/../../../config/config.php';

session_write_close();

// 2. Receive Date Range
$startDate = $_GET['startDate'] ?? date('Y-m-d');
$endDate   = $_GET['endDate']   ?? date('Y-m-d');

// ดึงเผื่อหน้าหลัง 1 วัน เพื่อครอบคลุมกะดึก
$apiStartDate = date('Y-m-d', strtotime('-1 day', strtotime($startDate)));
$apiEndDate   = date('Y-m-d', strtotime('+1 day', strtotime($endDate)));

$apiUrl = "https://oem.sncformer.com/oem-calendar/oem-web-link/api/api.php?router=/man-power-painting&sdate={$apiStartDate}&edate={$apiEndDate}";

try {
    // 3. Fetch External API
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $apiUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    $apiResponse = curl_exec($ch);
    curl_close($ch);

    if (!$apiResponse) throw new Exception("API Connection Failed");
    $rawList = json_decode($apiResponse, true) ?? [];

    // 4. Load Config (Shifts)
    $shiftConfig = [];
    $stmtShifts = $pdo->query("SELECT shift_id, start_time, end_time FROM " . MANPOWER_SHIFTS_TABLE);
    while ($row = $stmtShifts->fetch(PDO::FETCH_ASSOC)) { $shiftConfig[$row['shift_id']] = $row; }
    
    $defaultShiftId = 1; 
    foreach ($shiftConfig as $id => $s) { if (strpos($s['start_time'], '08:') === 0) { $defaultShiftId = $id; break; } }

    // =================================================================
    // 5. Group Data (Filter เฉพาะ Team 1 แบบยืดหยุ่น) 🔥 [FIXED]
    // =================================================================
    $groupedData = []; 
    foreach ($rawList as $row) {
        $dept = $row['DEPARTMENT'] ?? '';
        
        // 🔍 ตรวจสอบแบบยืดหยุ่น (Loose Matching)
        // 1. ต้องมีคำว่า "Toolbox"
        // 2. ต้องมีคำว่า "Team1" หรือ "Team 1" (เผื่อมีเว้นวรรค)
        
        $isToolbox = (stripos($dept, 'Toolbox') !== false);
        $isTeam1   = (stripos($dept, 'Team1') !== false) || (stripos($dept, 'Team 1') !== false);

        // ถ้าไม่เข้าเงื่อนไข ให้ข้ามไป
        if (!$isToolbox || !$isTeam1) {
            continue; 
        }
        
        $empId = strval($row['EMPID']);
        if (!isset($groupedData[$empId])) $groupedData[$empId] = ['info' => $row, 'timestamps' => []];
        
        $ts = strtotime($row['TIMEINOUT']);
        if ($ts && date('Y', $ts) > 2020) $groupedData[$empId]['timestamps'][] = $ts; 
    }

    // =================================================================
    // 6. Update Master Data
    // =================================================================
    $existingEmployees = [];
    $sqlEmp = "SELECT E.emp_id, E.line, E.default_shift_id, E.team_group, E.is_active, 
                      ISNULL(CM.category_name, 'Other') as emp_type
               FROM " . MANPOWER_EMPLOYEES_TABLE . " E
               LEFT JOIN " . MANPOWER_CATEGORY_MAPPING_TABLE . " CM ON E.position LIKE '%' + CM.keyword + '%'";
    
    $stmtCheckIds = $pdo->query($sqlEmp);
    while ($row = $stmtCheckIds->fetch(PDO::FETCH_ASSOC)) { $existingEmployees[strval($row['emp_id'])] = $row; }
    
    $stmtInsertEmp = $pdo->prepare("INSERT INTO " . MANPOWER_EMPLOYEES_TABLE . " (emp_id, name_th, position, department_api, is_active, line, default_shift_id, last_sync_at) VALUES (?, ?, ?, ?, 1, 'TOOLBOX_POOL', ?, GETDATE())");
    $stmtUpdateEmp = $pdo->prepare("UPDATE " . MANPOWER_EMPLOYEES_TABLE . " SET position = ?, department_api = ?, is_active = 1, last_sync_at = GETDATE() WHERE emp_id = ?");
    
    // เตรียม Statement สำหรับ Disable (แต่เดี๋ยวเราจะปิดการใช้งานมัน)
    $stmtDisableEmp = $pdo->prepare("UPDATE " . MANPOWER_EMPLOYEES_TABLE . " SET is_active = 0, last_sync_at = GETDATE() WHERE emp_id = ?");

    $stats = ['new' => 0, 'updated' => 0, 'disabled' => 0, 'log_processed' => 0];

    // 6.1 Process Active Employees (คนที่มีใน API)
    foreach ($groupedData as $apiEmpId => $data) {
        $info = $data['info'];
        if (isset($existingEmployees[$apiEmpId])) {
            // มีอยู่แล้ว -> อัปเดตข้อมูล + บังคับ Active = 1
            $stmtUpdateEmp->execute([$info['POSITION']??'-', $info['DEPARTMENT']??'-', $apiEmpId]);
            $stats['updated']++;
        } else {
            // ยังไม่มี -> สร้างใหม่
            $stmtInsertEmp->execute([$apiEmpId, $info['NAME']??'-', $info['POSITION']??'-', $info['DEPARTMENT']??'-', $defaultShiftId]);
            $existingEmployees[$apiEmpId] = [
                'emp_id' => $apiEmpId, 'line' => 'TOOLBOX_POOL', 'default_shift_id' => $defaultShiftId,
                'team_group' => null, 'is_active' => 1, 'emp_type' => 'Other'
            ];
            $stats['new']++;
        }
        usleep(10000); 
    }

    // 6.2 Process Inactive Employees (Auto Disable) 🔥 [DISABLED]
    // ปิดส่วนนี้ไว้ เพื่อป้องกันระบบไปปิดพนักงานที่เรา Active ไว้เอง
    /*
    foreach ($existingEmployees as $dbEmpId => $dbEmpData) {
        if ($dbEmpData['is_active'] == 1 && !isset($groupedData[$dbEmpId])) {
            $stmtDisableEmp->execute([$dbEmpId]);
            
            // Update Memory เพื่อไม่ให้ไปสร้าง Log ในข้อ 7
            $existingEmployees[$dbEmpId]['is_active'] = 0; 
            $stats['disabled']++;
        }
    }
    */

    // 7. Process Logs
    $stmtCheckLog = $pdo->prepare("SELECT log_id, is_verified, shift_id FROM " . MANPOWER_DAILY_LOGS_TABLE . " WHERE emp_id = ? AND log_date = ?");
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
            
            // 7.1 Ghost Buster
            // ถ้าคนนี้ Inactive (คือถูกปิดไปจริงๆ) ให้ลบ Log ที่ยังไม่ Verify ทิ้ง
            if (isset($empData['is_active']) && $empData['is_active'] == 0) {
                $stmtCheckLog->execute([$empId, $procDate]);
                $ghostLog = $stmtCheckLog->fetch(PDO::FETCH_ASSOC);
                if ($ghostLog && $ghostLog['is_verified'] == 0) {
                    $stmtDeleteLog->execute([$ghostLog['log_id']]);
                }
                continue; 
            }

            // 7.2 Snapshot Data
            $snapLine = $empData['line'];
            $snapTeam = $empData['team_group'];
            $snapType = $empData['emp_type'];

            $stmtCheckLog->execute([$empId, $procDate]);
            $logExist = $stmtCheckLog->fetch(PDO::FETCH_ASSOC);
            if ($logExist && $logExist['is_verified'] == 1) continue; 

            // 7.3 Shift Window Calculation
            $targetShiftId = $logExist['shift_id'] ?? $empData['default_shift_id'] ?? $defaultShiftId;
            $sTime = $shiftConfig[$targetShiftId]['start_time'] ?? '08:00:00';
            $isNight = ((int)substr($sTime, 0, 2) >= 15);
            
            if ($isNight) {
                $wStart = strtotime("$procDate 14:00:00");
                $wEnd   = strtotime("$procDate 12:00:00 +1 day");
            } else {
                $wStart = strtotime("$procDate 04:00:00");
                $wEnd   = strtotime("$procDate 03:00:00 +1 day");
            }

            // 7.4 Find Valid Scans
            $validScans = [];
            if (isset($groupedData[$empId])) {
                foreach ($groupedData[$empId]['timestamps'] as $t) {
                    if ($t >= $wStart && $t <= $wEnd) $validScans[] = $t;
                }
            }

            // 7.5 Insert/Update DB
            if (!empty($validScans)) {
                sort($validScans);
                $inTs = $validScans[0];
                $outTs = null;
                $lastScan = end($validScans);
                if ($lastScan > ($inTs + 60)) { $outTs = $lastScan; }

                $inTimeStr = date('Y-m-d H:i:s', $inTs);
                $outTimeStr = $outTs ? date('Y-m-d H:i:s', $outTs) : null;
                $logDate = $procDate; 
                $status = 'PRESENT'; 

                if ($logExist) {
                    $stmtUpdateLog->execute([$inTimeStr, $outTimeStr, $status, $targetShiftId, $snapLine, $snapTeam, $snapType, $logExist['log_id']]);
                } else {
                    $stmtInsertLog->execute([$logDate, $empId, $inTimeStr, $outTimeStr, $status, $targetShiftId, $snapLine, $snapTeam, $snapType]);
                }

            } else {
                // ถ้าไม่มีสแกน -> ลง ABSENT/WAITING
                if (!$logExist) {
                    $defaultStatus = ($procDate < date('Y-m-d')) ? 'ABSENT' : 'WAITING';
                    $stmtInsertLog->execute([$procDate, $empId, null, null, $defaultStatus, $targetShiftId, $snapLine, $snapTeam, $snapType]);
                }
            }
            $stats['log_processed']++;

            usleep(50000); 
        }
        $currTs = strtotime('+1 day', $currTs);
    }

    // 8. Execute Calculation SP
    $spName = IS_DEVELOPMENT ? 'sp_CalculateDailyCost_TEST' : 'sp_CalculateDailyCost';
    
    $calcStart = date('Y-m-d', strtotime($startDate));
    $calcEnd   = date('Y-m-d', strtotime($endDate));
    $stmtSP = $pdo->prepare("EXEC $spName @Date = ?");
    
    $runDate = $calcStart;
    while (strtotime($runDate) <= strtotime($calcEnd)) {
        $stmtSP->execute([$runDate]);
        usleep(200000); 
        $runDate = date('Y-m-d', strtotime("+1 day", strtotime($runDate)));
    }

    echo json_encode(['success' => true, 'message' => 'Sync & Calculation Completed', 'stats' => $stats]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>