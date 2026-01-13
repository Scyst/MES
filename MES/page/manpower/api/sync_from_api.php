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

// 🚀 FIRE AND FORGET
ob_start();
echo json_encode([
    'success' => true, 
    'message' => '✅ Background Sync Started.',
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

$startDate = $_GET['startDate'] ?? date('Y-m-d');
$endDate   = $_GET['endDate']   ?? date('Y-m-d');
$apiStartDate = date('Y-m-d', strtotime('-1 day', strtotime($startDate)));
$apiEndDate   = date('Y-m-d', strtotime('+1 day', strtotime($endDate)));

$apiUrl = "https://oem.sncformer.com/oem-calendar/oem-web-link/api/api.php?router=/man-power-painting&sdate={$apiStartDate}&edate={$apiEndDate}";

try {
    // 3. Fetch API
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $apiUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    $apiResponse = curl_exec($ch);
    curl_close($ch);

    if (!$apiResponse) throw new Exception("API Connection Failed");
    $rawList = json_decode($apiResponse, true) ?? [];

    // 4. Load Shifts
    $shiftConfig = [];
    $stmtShifts = $pdo->query("SELECT shift_id, start_time, end_time FROM " . MANPOWER_SHIFTS_TABLE);
    while ($row = $stmtShifts->fetch(PDO::FETCH_ASSOC)) { $shiftConfig[$row['shift_id']] = $row; }
    
    $defaultShiftId = 1; 
    foreach ($shiftConfig as $id => $s) { if (strpos($s['start_time'], '08:') === 0) { $defaultShiftId = $id; break; } }

    // 🔥 [NEW] 4.1 Load Mappings (ดึงกฎการแปลงตำแหน่งจาก DB)
    // เรียงตามความยาว Keyword มากไปน้อย (LEN DESC) เพื่อให้คำที่ยาวกว่าถูกจับคู่ก่อน
    // เช่น "พนักงานประจำ" (ยาวกว่า) จะถูกเช็คก่อน "พนักงาน" (สั้นกว่า)
    $mappingRules = [];
    $stmtMap = $pdo->query("SELECT keyword, category_name FROM " . MANPOWER_CATEGORY_MAPPING_TABLE . " ORDER BY LEN(keyword) DESC");
    while ($m = $stmtMap->fetch(PDO::FETCH_ASSOC)) {
        $mappingRules[] = $m;
    }

    // 5. Group Data (Filter Toolbox Team1)
    $groupedData = []; 
    foreach ($rawList as $row) {
        $dept = $row['DEPARTMENT'] ?? '';
        $isToolbox = (stripos($dept, 'Toolbox') !== false);
        $isTeam1   = (stripos($dept, 'Team1') !== false) || (stripos($dept, 'Team 1') !== false);

        if (!$isToolbox || !$isTeam1) continue; 
        
        $empId = strval($row['EMPID']);
        if (!isset($groupedData[$empId])) $groupedData[$empId] = ['info' => $row, 'timestamps' => []];
        
        $ts = strtotime($row['TIMEINOUT']);
        if ($ts && date('Y', $ts) > 2020) $groupedData[$empId]['timestamps'][] = $ts; 
    }

    // 6. Update Master Data
    $existingEmployees = [];
    $stmtCheckIds = $pdo->query("SELECT * FROM " . MANPOWER_EMPLOYEES_TABLE);
    while ($row = $stmtCheckIds->fetch(PDO::FETCH_ASSOC)) { $existingEmployees[strval($row['emp_id'])] = $row; }
    
    $stmtInsertEmp = $pdo->prepare("INSERT INTO " . MANPOWER_EMPLOYEES_TABLE . " (emp_id, name_th, position, department_api, is_active, line, default_shift_id, last_sync_at) VALUES (?, ?, ?, ?, 1, 'TOOLBOX_POOL', ?, GETDATE())");
    $stmtUpdateEmp = $pdo->prepare("UPDATE " . MANPOWER_EMPLOYEES_TABLE . " SET position = ?, department_api = ?, is_active = 1, last_sync_at = GETDATE() WHERE emp_id = ?");

    $stats = ['new' => 0, 'updated' => 0, 'log_processed' => 0];

    // 6.1 Process Active Employees
    foreach ($groupedData as $apiEmpId => $data) {
        $info = $data['info'];
        $rawPos = trim($info['POSITION'] ?? '-');
        
        // 🔥 [NEW LOGIC] ใช้ Mapping Table แทน Hardcode
        $finalPos = $rawPos; // ค่า Default คือค่าเดิมจาก API
        
        foreach ($mappingRules as $rule) {
            // เช็คว่าตำแหน่งจาก API มีคำ Keyword นี้ผสมอยู่ไหม (Case Insensitive)
            if (stripos($rawPos, $rule['keyword']) !== false) {
                $finalPos = $rule['category_name']; // ถ้าเจอ ให้ใช้ชื่อมาตรฐานจาก DB แทน
                break; // เจอแล้วหยุดเลย (เพราะเราเรียงจากยาวไปสั้นแล้ว)
            }
        }

        if (isset($existingEmployees[$apiEmpId])) {
            $stmtUpdateEmp->execute([$finalPos, $info['DEPARTMENT']??'-', $apiEmpId]);
            $stats['updated']++;
        } else {
            $stmtInsertEmp->execute([$apiEmpId, $info['NAME']??'-', $finalPos, $info['DEPARTMENT']??'-', $defaultShiftId]);
            $existingEmployees[$apiEmpId] = [
                'emp_id' => $apiEmpId, 'line' => 'TOOLBOX_POOL', 'default_shift_id' => $defaultShiftId,
                'team_group' => null, 'is_active' => 1, 'emp_type' => 'Other'
            ];
            $stats['new']++;
        }
        usleep(10000); 
    }

    // 7. Process Logs (เหมือนเดิม)
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
            
            if (isset($empData['is_active']) && $empData['is_active'] == 0) {
                $stmtCheckLog->execute([$empId, $procDate]);
                $ghostLog = $stmtCheckLog->fetch(PDO::FETCH_ASSOC);
                if ($ghostLog && $ghostLog['is_verified'] == 0) $stmtDeleteLog->execute([$ghostLog['log_id']]);
                continue; 
            }

            $stmtCheckLog->execute([$empId, $procDate]);
            $logExist = $stmtCheckLog->fetch(PDO::FETCH_ASSOC);
            if ($logExist && $logExist['is_verified'] == 1) continue; 

            // Snapshot Values
            $snapLine = $empData['line'];
            $snapTeam = $empData['team_group'];
            
            // 🔥 [Logic ใหม่] หา Category (Emp Type) จาก Mapping Table ด้วย (ถ้าไม่มีใน DB Employee)
            // แต่ปกติตอนนี้เราเอา $finalPos บันทึกลง E.position ไปแล้ว 
            // ดังนั้น E.position ใน existingEmployees จะเป็นค่าที่ถูกต้องแล้ว
            // เราแค่ map E.position กลับหา Category Name อีกที (หรือใช้ Other)
            // (ในที่นี้เราใช้ค่าจากตาราง MAPPING ที่ดึงมาตอน 4.1 ได้เลยถ้าต้องการแม่นยำ แต่ง่ายสุดคือดึงจาก Mapping ตาม Logic เดิมที่เคยเขียนไว้ใน SQL หรือ PHP)
            
            // เพื่อความชัวร์ ใช้ Logic เดียวกับตอนหา finalPos
            $currentPos = $empData['position']; // ค่าใน DB
            $snapType = 'Other';
            foreach ($mappingRules as $rule) {
                if (stripos($currentPos, $rule['keyword']) !== false) {
                    $snapType = $rule['category_name'];
                    break;
                }
            }
            
            // Shift Calculation
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

            $validScans = [];
            if (isset($groupedData[$empId])) {
                foreach ($groupedData[$empId]['timestamps'] as $t) {
                    if ($t >= $wStart && $t <= $wEnd) $validScans[] = $t;
                }
            }

            if (!empty($validScans)) {
                sort($validScans);
                $inTs = $validScans[0];
                $outTs = null;
                $lastScan = end($validScans);
                if ($lastScan > ($inTs + 60)) { $outTs = $lastScan; }

                $inTimeStr = date('Y-m-d H:i:s', $inTs);
                $outTimeStr = $outTs ? date('Y-m-d H:i:s', $outTs) : null;
                
                if ($logExist) {
                    $stmtUpdateLog->execute([$inTimeStr, $outTimeStr, 'PRESENT', $targetShiftId, $snapLine, $snapTeam, $snapType, $logExist['log_id']]);
                } else {
                    $stmtInsertLog->execute([$procDate, $empId, $inTimeStr, $outTimeStr, 'PRESENT', $targetShiftId, $snapLine, $snapTeam, $snapType]);
                }

            } else {
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