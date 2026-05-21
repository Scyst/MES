<?php
// MES/page/manpower_test/api/sync_from_api_test.php
// Version: INGEST ALL (รับพนักงานทั้งหมดเข้าสู่ระบบแล้วจัดกลุ่ม / ป้องกันการเขียนทับด้วยมือ)
// Target: _TEST Tables

ignore_user_abort(true); 
set_time_limit(600); 

header('Content-Type: application/json');

// 1. Auto-Sync Check
$isAutoSync = false;
if (isset($_SERVER['HTTP_X_MODE']) && $_SERVER['HTTP_X_MODE'] === 'auto_sync') {
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

    // 2. Load Config (ใช้ตารางจริงสำหรับตั้งค่ากะได้ เพราะอ่านอย่างเดียว)
    $shiftConfig = [];
    $stmtShifts = $pdo->query("SELECT shift_id, start_time FROM dbo.MANPOWER_SHIFTS");
    while ($row = $stmtShifts->fetch(PDO::FETCH_ASSOC)) { 
        $shiftConfig[$row['shift_id']] = $row['start_time']; 
    }
    
    $defaultShiftId = 1; 
    foreach ($shiftConfig as $id => $time) { 
        if (strpos($time, '08:') === 0) { $defaultShiftId = $id; break; } 
    }

    // 3. Group Data (ไม่มี Hard Filter แล้ว)
    $scansByDate = []; 
    $empInfoMap = []; 

    foreach ($rawList as $row) {
        $empId = strval($row['EMPID']);
        $ts = strtotime($row['TIMEINOUT']);
        
        if ($ts && date('Y', $ts) > 2020) {
            $logDate = date('Y-m-d', $ts);
            $scansByDate[$empId][$logDate][] = $ts; 
            if (!isset($empInfoMap[$empId])) $empInfoMap[$empId] = $row;
        }
    }

    // 4. Update Master Data (TEST Table)
    $existingEmployees = [];
    $sqlEmp = "SELECT E.emp_id, E.line, E.default_shift_id, E.team_group, E.is_active, 
                      ISNULL(CM.category_name, 'Other') as emp_type
               FROM dbo.MANPOWER_EMPLOYEES_TEST E
               LEFT JOIN dbo.MANPOWER_CATEGORY_MAPPING_TEST CM ON E.position LIKE '%' + CM.keyword + '%'";
    
    $stmtCheckIds = $pdo->query($sqlEmp);
    while ($row = $stmtCheckIds->fetch(PDO::FETCH_ASSOC)) { 
        $existingEmployees[strval($row['emp_id'])] = $row; 
    }
    
    $stmtInsertEmp = $pdo->prepare("INSERT INTO dbo.MANPOWER_EMPLOYEES_TEST (emp_id, name_th, position, department_api, is_active, line, default_shift_id, last_sync_at) VALUES (?, ?, ?, ?, ?, ?, ?, GETDATE())");
    $stmtUpdateEmp = $pdo->prepare("UPDATE dbo.MANPOWER_EMPLOYEES_TEST SET position = ?, department_api = ?, is_active = ?, last_sync_at = GETDATE() WHERE emp_id = ?");

    $stats = ['new' => 0, 'updated' => 0, 'deactivated' => 0, 'log_processed' => 0, 'cleaned_ghosts' => 0, 'outsiders' => 0];

    foreach ($empInfoMap as $apiEmpId => $info) {
        $deptApi = $info['DEPARTMENT'] ?? '';
        
        // --- 💡 ลอจิกจัดหมวดหมู่ใหม่ ---
        $isToolbox = (stripos($deptApi, 'Toolbox') !== false);
        $isTeam1 = (stripos($deptApi, 'Team1') !== false);
        
        // API บอกว่าควร Active หรือไม่ (ต้องเป็น Toolbox + Team1 เท่านั้นถึงจะเข้ากะผลิต)
        $apiCalculatedActive = ($isToolbox && $isTeam1) ? 1 : 0;
        
        // กำหนด Line เริ่มต้น
        $defaultLine = $isToolbox ? 'TOOLBOX_POOL' : 'OTHER_DEPT';

        if (!$isToolbox) $stats['outsiders']++;

        if (isset($existingEmployees[$apiEmpId])) {
            // --- มีในระบบแล้ว ตรวจสอบลอจิกห้ามเขียนทับ (Anti-Overwrite) ---
            $currentDbActive = (int)$existingEmployees[$apiEmpId]['is_active'];
            $finalStatus = 0;

            if ($currentDbActive === 1) {
                // ถ้าระบบเดิม (ใน MES) มีคนตั้งให้ Active แปลว่าหัวหน้างานต้องการให้คนนี้ทำงาน ให้รักษาค่าเดิมไว้
                $finalStatus = 1;
            } else {
                // ถ้าระบบเดิม Inactive อยู่ ให้เชื่อฟัง API 
                $finalStatus = $apiCalculatedActive;
            }

            $stmtUpdateEmp->execute([
                $info['POSITION'] ?? '-', 
                $deptApi, 
                $finalStatus, 
                $apiEmpId
            ]);
            
            $existingEmployees[$apiEmpId]['is_active'] = $finalStatus;
            
            if ($finalStatus == 0) $stats['deactivated']++;
            else $stats['updated']++;

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

    // 5. Process Logs (ลงตาราง TEST)
    $stmtCheckLog = $pdo->prepare("SELECT log_id, is_verified, shift_id, status FROM dbo.MANPOWER_DAILY_LOGS_TEST WHERE emp_id = ? AND log_date = ?");
    $stmtDeleteLog = $pdo->prepare("DELETE FROM dbo.MANPOWER_DAILY_LOGS_TEST WHERE log_id = ?");
    
    $stmtUpdateLog = $pdo->prepare("UPDATE dbo.MANPOWER_DAILY_LOGS_TEST 
        SET scan_in_time = ?, scan_out_time = ?, status = ?, shift_id = ?, 
            actual_line = ?, actual_team = ?, actual_emp_type = ?, 
            updated_at = GETDATE() 
        WHERE log_id = ? AND is_verified = 0");
        
    $stmtInsertLog = $pdo->prepare("INSERT INTO dbo.MANPOWER_DAILY_LOGS_TEST 
        (log_date, emp_id, scan_in_time, scan_out_time, status, shift_id, actual_line, actual_team, actual_emp_type, updated_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, GETDATE())");

    $currTs = strtotime($startDate); 
    
    while ($currTs <= strtotime($endDate)) {
        $procDate = date('Y-m-d', $currTs);
        $nextDate = date('Y-m-d', strtotime('+1 day', $currTs)); 
        
        foreach ($existingEmployees as $empId => $empData) {
            
            // ข้ามคนที่ Inactive ไปเลย (ไม่ต้องสร้าง Log) แต่ต้องเคลียร์ของเก่าทิ้งถ้ายังไม่ Confirm
            if (isset($empData['is_active']) && $empData['is_active'] == 0) {
                $stmtCheckLog->execute([$empId, $procDate]);
                $ghostLog = $stmtCheckLog->fetch(PDO::FETCH_ASSOC);
                
                if ($ghostLog && $ghostLog['is_verified'] == 0) {
                    $stmtDeleteLog->execute([$ghostLog['log_id']]);
                    $stats['cleaned_ghosts']++;
                }
                continue;
            }

            $stmtCheckLog->execute([$empId, $procDate]);
            $logExist = $stmtCheckLog->fetch(PDO::FETCH_ASSOC);
            if ($logExist && $logExist['is_verified'] == 1) continue; 

            $snapLine = $empData['line'];
            $snapTeam = $empData['team_group'];
            $snapType = $empData['emp_type'];

            $targetShiftId = $logExist['shift_id'] ?? $empData['default_shift_id'] ?? $defaultShiftId;
            $shiftStartTime = $shiftConfig[$targetShiftId] ?? '08:00:00';
            $isNight = ((int)substr($shiftStartTime, 0, 2) >= 15);

            $windowStart = 0; $windowEnd = 0;
            if ($isNight) {
                $windowStart = strtotime("$procDate 14:00:00");
                $windowEnd   = strtotime("$nextDate 13:00:00");
            } else {
                $windowStart = strtotime("$procDate 04:00:00");
                $windowEnd   = strtotime("$nextDate 03:00:00");
            }

            $poolScans = array_merge(
                $scansByDate[$empId][$procDate] ?? [],
                $scansByDate[$empId][$nextDate] ?? []
            );
            sort($poolScans);

            $validScans = [];
            foreach ($poolScans as $t) {
                if ($t >= $windowStart && $t <= $windowEnd) {
                    $validScans[] = $t;
                }
            }

            $finalIn = null; $finalOut = null;
            if (!empty($validScans)) {
                $finalIn = $validScans[0]; 
                if (count($validScans) > 1) {
                    $lastScan = end($validScans);
                    if (($lastScan - $finalIn) > 2700) { 
                        $finalOut = $lastScan;
                    }
                }
            }

            if ($finalIn) {
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
                $targetStatus = ($procDate < date('Y-m-d')) ? 'ABSENT' : 'WAITING';

                if ($logExist) {
                    if ($logExist['status'] === 'WAITING' && $targetStatus === 'ABSENT') {
                        $pdo->prepare("UPDATE dbo.MANPOWER_DAILY_LOGS_TEST SET status = 'ABSENT', updated_at = GETDATE() WHERE log_id = ?")->execute([$logExist['log_id']]);
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

    $pdo->commit();
    echo json_encode(['success' => true, 'message' => 'Test Sync Completed (All Users Ingested)', 'stats' => $stats]);

} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>