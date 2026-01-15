<?php
// MES/page/manpower/api/sync_from_api.php
// Version: SHIFT-CENTRIC + SP CALCULATION (Final)

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

// ดึงเผื่อหน้าหลัง
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

    // 2. Load Shift Config
    $shiftConfig = [];
    $stmtShifts = $pdo->query("SELECT shift_id, start_time FROM " . MANPOWER_SHIFTS_TABLE);
    while ($row = $stmtShifts->fetch(PDO::FETCH_ASSOC)) { 
        $shiftConfig[$row['shift_id']] = $row['start_time']; 
    }
    
    $defaultShiftId = 1; 
    foreach ($shiftConfig as $id => $time) { 
        if (strpos($time, '08:') === 0) { $defaultShiftId = $id; break; } 
    }

    // 3. Group Data by "Date Bucket" (เก็บดิบๆ ตามวันที่จริง)
    $scansByDate = []; 
    $empInfoMap = []; 

    foreach ($rawList as $row) {
        $dept = $row['DEPARTMENT'] ?? '';
        if (stripos($dept, 'Toolbox') === false && stripos($dept, 'B9') === false && stripos($dept, 'B10') === false) continue; 
        
        $empId = strval($row['EMPID']);
        $ts = strtotime($row['TIMEINOUT']);
        
        if ($ts && date('Y', $ts) > 2020) {
            $logDate = date('Y-m-d', $ts);
            $scansByDate[$empId][$logDate][] = $ts; 
            if (!isset($empInfoMap[$empId])) $empInfoMap[$empId] = $row;
        }
    }

    // 4. Update Master Data
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

    $stats = ['new' => 0, 'updated' => 0, 'log_processed' => 0, 'cleaned_ghosts' => 0];

    foreach ($empInfoMap as $apiEmpId => $info) {
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

    // =================================================================
    // 🔥 5. Process Logs (SHIFT-FIRST LOGIC)
    // =================================================================
    
    $stmtCheckLog = $pdo->prepare("SELECT log_id, is_verified, shift_id FROM " . MANPOWER_DAILY_LOGS_TABLE . " WHERE emp_id = ? AND log_date = ?");
    $stmtDeleteLog = $pdo->prepare("DELETE FROM " . MANPOWER_DAILY_LOGS_TABLE . " WHERE log_id = ?");
    
    $stmtUpdateLog = $pdo->prepare("UPDATE " . MANPOWER_DAILY_LOGS_TABLE . " 
        SET scan_in_time = ?, scan_out_time = ?, status = ?, shift_id = ?, 
            actual_line = ?, actual_team = ?, actual_emp_type = ?, is_forgot_out = ?,
            updated_at = GETDATE() 
        WHERE log_id = ? AND is_verified = 0");
        
    $stmtInsertLog = $pdo->prepare("INSERT INTO " . MANPOWER_DAILY_LOGS_TABLE . " 
        (log_date, emp_id, scan_in_time, scan_out_time, status, shift_id, actual_line, actual_team, actual_emp_type, is_forgot_out, updated_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, GETDATE())");

    $currTs = strtotime($startDate); 
    
    while ($currTs <= strtotime($endDate)) {
        $procDate = date('Y-m-d', $currTs);
        $nextDate = date('Y-m-d', strtotime('+1 day', $currTs)); 
        
        foreach ($existingEmployees as $empId => $empData) {
            
            // 5.1 Ghost Buster
            if (isset($empData['is_active']) && $empData['is_active'] == 0) {
                $stmtCheckLog->execute([$empId, $procDate]);
                $ghostLog = $stmtCheckLog->fetch(PDO::FETCH_ASSOC);
                if ($ghostLog && $ghostLog['is_verified'] == 0) {
                    $stmtDeleteLog->execute([$ghostLog['log_id']]);
                    $stats['cleaned_ghosts']++;
                }
                continue; 
            }

            // 5.2 Check Existing Log
            $stmtCheckLog->execute([$empId, $procDate]);
            $logExist = $stmtCheckLog->fetch(PDO::FETCH_ASSOC);
            if ($logExist && $logExist['is_verified'] == 1) continue; 

            $snapLine = $empData['line'];
            $snapTeam = $empData['team_group'];
            $snapType = $empData['emp_type'];

            // -------------------------------------------------------------
            // 🔥 SHIFT-FIRST LOGIC starts here
            // -------------------------------------------------------------
            
            // 1. ระบุกะที่จะใช้
            $targetShiftId = $logExist['shift_id'] ?? $empData['default_shift_id'] ?? $defaultShiftId;
            $shiftStartTime = $shiftConfig[$targetShiftId] ?? '08:00:00';
            
            $isNight = ((int)substr($shiftStartTime, 0, 2) >= 15);

            // 2. กำหนด "หน้าต่างเวลา"
            $windowStart = 0; $windowEnd = 0;

            if ($isNight) {
                $windowStart = strtotime("$procDate 14:00:00");
                $windowEnd   = strtotime("$nextDate 13:00:00");
            } else {
                $windowStart = strtotime("$procDate 04:00:00");
                $windowEnd   = strtotime("$nextDate 03:00:00");
            }

            // 3. รวบรวมสแกน
            $poolScans = array_merge(
                $scansByDate[$empId][$procDate] ?? [],
                $scansByDate[$empId][$nextDate] ?? []
            );
            sort($poolScans);

            // 4. กรองสแกนใน Window
            $validScans = [];
            foreach ($poolScans as $t) {
                if ($t >= $windowStart && $t <= $windowEnd) {
                    $validScans[] = $t;
                }
            }

            // 5. ตัดสินใจ In / Out
            $finalIn = null;
            $finalOut = null;
            $isForgotOut = 1;

            if (!empty($validScans)) {
                $finalIn = $validScans[0]; 
                
                if (count($validScans) > 1) {
                    $lastScan = end($validScans);
                    if (($lastScan - $finalIn) > 2700) { 
                        $finalOut = $lastScan;
                        $isForgotOut = 0;
                    }
                }
            }

            // 6. Save DB
            if ($finalIn) {
                $inTimeStr = date('Y-m-d H:i:s', $finalIn);
                $outTimeStr = $finalOut ? date('Y-m-d H:i:s', $finalOut) : null;
                
                $shiftStartTs = strtotime("$procDate $shiftStartTime");
                // Strict Late Policy: สาย 1 วินาที = LATE
                $status = ($finalIn > $shiftStartTs) ? 'LATE' : 'PRESENT';

                if ($logExist) {
                    $stmtUpdateLog->execute([
                        $inTimeStr, $outTimeStr, $status, $targetShiftId, 
                        $snapLine, $snapTeam, $snapType, $isForgotOut, 
                        $logExist['log_id']
                    ]);
                } else {
                    $stmtInsertLog->execute([
                        $procDate, $empId, $inTimeStr, $outTimeStr, $status, $targetShiftId, 
                        $snapLine, $snapTeam, $snapType, $isForgotOut
                    ]);
                }
            } else {
                if (!$logExist) {
                    $defaultStatus = ($procDate < date('Y-m-d')) ? 'ABSENT' : 'WAITING';
                    $stmtInsertLog->execute([
                        $procDate, $empId, null, null, $defaultStatus, $targetShiftId, 
                        $snapLine, $snapTeam, $snapType, 0 
                    ]);
                }
            }
            $stats['log_processed']++;
            usleep(2000); 
        }
        $currTs = strtotime('+1 day', $currTs);
    }

    // =================================================================
    // 6. Cost Calculation (CALL STORED PROCEDURE) 🚀
    // =================================================================
    // เรียกใช้ SP ตัวกลางที่เราเพิ่งอัปเดต เพื่อความถูกต้องและเป็นมาตรฐานเดียว
    
    $calcStart = date('Y-m-d', strtotime($startDate));
    $calcEnd   = date('Y-m-d', strtotime($endDate));

    $stmtCalc = $pdo->prepare("EXEC sp_CalculateDailyCost @StartDate = ?, @EndDate = ?");
    $stmtCalc->execute([$calcStart, $calcEnd]);
    
    $stats['cost_calc_method'] = 'Stored Procedure (sp_CalculateDailyCost)';
    $stats['cost_calc_range'] = "$calcStart to $calcEnd";

    $pdo->commit();
    echo json_encode(['success' => true, 'message' => 'Sync Completed (Shift-Centric + SP Calc)', 'stats' => $stats]);

} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>