<?php
// MES/page/manpower/api/sync_from_api.php
// Version: TOOLBOX ONLY (Team1=Active, Others=Inactive)

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
    if (!function_exists('hasRole') || !hasRole(['admin', 'creator', 'supervisor'])) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Unauthorized']);
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

    // 2. Load Config
    $shiftConfig = [];
    $stmtShifts = $pdo->query("SELECT shift_id, start_time FROM " . MANPOWER_SHIFTS_TABLE);
    while ($row = $stmtShifts->fetch(PDO::FETCH_ASSOC)) { 
        $shiftConfig[$row['shift_id']] = $row['start_time']; 
    }
    
    $defaultShiftId = 1; 
    foreach ($shiftConfig as $id => $time) { 
        if (strpos($time, '08:') === 0) { $defaultShiftId = $id; break; } 
    }

    // 3. Group Data & Filter
    $scansByDate = []; 
    $empInfoMap = []; 

    foreach ($rawList as $row) {
        $dept = $row['DEPARTMENT'] ?? '';

        // 🔥 FILTER LOGIC (ตามที่คุยกันล่าสุด)
        // 1. ต้องมีคำว่า "Toolbox" เท่านั้น
        if (stripos($dept, 'Toolbox') === false) continue;

        // 2. (ปิด B9, B10 ไปก่อน ตามคำสั่ง)
        // if (stripos($dept, 'B9') !== false) ... 
        // if (stripos($dept, 'B10') !== false) ...

        $empId = strval($row['EMPID']);
        $ts = strtotime($row['TIMEINOUT']);
        
        if ($ts && date('Y', $ts) > 2020) {
            $logDate = date('Y-m-d', $ts);
            $scansByDate[$empId][$logDate][] = $ts; 
            if (!isset($empInfoMap[$empId])) $empInfoMap[$empId] = $row;
        }
    }

    // 4. Update Master Data (จัดการ Active/Inactive ตรงนี้)
    $existingEmployees = [];
    $sqlEmp = "SELECT E.emp_id, E.line, E.default_shift_id, E.team_group, E.is_active, 
                      ISNULL(CM.category_name, 'Other') as emp_type
               FROM " . MANPOWER_EMPLOYEES_TABLE . " E
               LEFT JOIN " . MANPOWER_CATEGORY_MAPPING_TABLE . " CM ON E.position = CM.keyword";
    
    $stmtCheckIds = $pdo->query($sqlEmp);
    while ($row = $stmtCheckIds->fetch(PDO::FETCH_ASSOC)) { 
        $existingEmployees[strval($row['emp_id'])] = $row; 
    }
    
    // เตรียม SQL (เพิ่ม is_active ในการ Update/Insert)
    $stmtInsertEmp = $pdo->prepare("INSERT INTO " . MANPOWER_EMPLOYEES_TABLE . " (emp_id, name_th, position, department_api, is_active, line, default_shift_id, last_sync_at) VALUES (?, ?, ?, ?, ?, 'TOOLBOX_POOL', ?, GETDATE())");
    $stmtUpdateEmp = $pdo->prepare("UPDATE " . MANPOWER_EMPLOYEES_TABLE . " SET position = ?, department_api = ?, is_active = ?, last_sync_at = GETDATE() WHERE emp_id = ?");

    $stats = ['new' => 0, 'updated' => 0, 'deactivated' => 0, 'log_processed' => 0, 'cleaned_ghosts' => 0];

    foreach ($empInfoMap as $apiEmpId => $info) {
        $deptApi = $info['DEPARTMENT'] ?? '';
        
        // 🔥 STATUS LOGIC: 
        // ถ้าเป็น Team1 -> Active (1)
        // ถ้าเป็น Team อื่นๆ (แต่ยังอยู่ใน Toolbox) -> Inactive (0)
        $isActive = (stripos($deptApi, 'Team1') !== false) ? 1 : 0;

        if (isset($existingEmployees[$apiEmpId])) {
            // มีชื่อเดิมอยู่แล้ว -> อัปเดตข้อมูลและสถานะ (เผื่อเขาย้ายทีม)
            $stmtUpdateEmp->execute([
                $info['POSITION'] ?? '-', 
                $deptApi, 
                $isActive, 
                $apiEmpId
            ]);
            
            // อัปเดตสถานะในตัวแปร array ด้วย (เพื่อให้ Loop ข้างล่างรู้ว่าคนนี้ Active/Inactive)
            $existingEmployees[$apiEmpId]['is_active'] = $isActive;
            
            if ($isActive == 0) $stats['deactivated']++;
            else $stats['updated']++;

        } else {
            // ชื่อใหม่ -> เพิ่มเข้าไปตามสถานะที่เช็คได้
            $stmtInsertEmp->execute([
                $apiEmpId, 
                $info['NAME'] ?? '-', 
                $info['POSITION'] ?? '-', 
                $deptApi, 
                $isActive, 
                $defaultShiftId
            ]);
            
            $existingEmployees[$apiEmpId] = [
                'emp_id' => $apiEmpId, 'line' => 'TOOLBOX_POOL', 'default_shift_id' => $defaultShiftId,
                'team_group' => null, 'is_active' => $isActive, 'emp_type' => 'Other'
            ];
            $stats['new']++;
        }
    }

    // 5. Process Logs (เหมือนเดิม)
    $stmtCheckLog = $pdo->prepare("SELECT log_id, is_verified, shift_id, status FROM " . MANPOWER_DAILY_LOGS_TABLE . " WHERE emp_id = ? AND log_date = ?");
    $stmtDeleteLog = $pdo->prepare("DELETE FROM " . MANPOWER_DAILY_LOGS_TABLE . " WHERE log_id = ?");
    
    // (ตัด is_forgot_out ออก)
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
        $nextDate = date('Y-m-d', strtotime('+1 day', $currTs)); 
        
        foreach ($existingEmployees as $empId => $empData) {
            
            // 5.1 Ghost Buster & Inactive Check
            // ถ้าเป็นคนที่ไม่ Active (เช่น อยู่ Team2) เราจะไม่สร้าง Log ให้เขา (หรือลบของเก่าทิ้ง)
            if (isset($empData['is_active']) && $empData['is_active'] == 0) {
                $stmtCheckLog->execute([$empId, $procDate]);
                $ghostLog = $stmtCheckLog->fetch(PDO::FETCH_ASSOC);
                
                // ถ้ามี Log ค้างอยู่ และยังไม่ Verify -> ลบทิ้งซะ (เพราะเขาไม่ใช่ Team1 แล้ว)
                if ($ghostLog && $ghostLog['is_verified'] == 0) {
                    $stmtDeleteLog->execute([$ghostLog['log_id']]);
                    $stats['cleaned_ghosts']++;
                }
                continue; // ข้ามคนนี้ไปเลย ไม่ต้องหาเวลาสแกน
            }

            // ... (Logic หาเวลาเข้าออก เหมือนเดิมเป๊ะ) ...
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
                    $stmtUpdateLog->execute([
                        $inTimeStr, $outTimeStr, $status, $targetShiftId, 
                        $snapLine, $snapTeam, $snapType, 
                        $logExist['log_id']
                    ]);
                } else {
                    $stmtInsertLog->execute([
                        $procDate, $empId, $inTimeStr, $outTimeStr, $status, $targetShiftId, 
                        $snapLine, $snapTeam, $snapType
                    ]);
                }
            } else {
                // Logic จัดการคนขาดงาน (ABSENT)
                $targetStatus = ($procDate < date('Y-m-d')) ? 'ABSENT' : 'WAITING';

                if ($logExist) {
                    if ($logExist['status'] === 'WAITING' && $targetStatus === 'ABSENT') {
                        $pdo->prepare("UPDATE " . MANPOWER_DAILY_LOGS_TABLE . " SET status = 'ABSENT', updated_at = GETDATE() WHERE log_id = ?")
                            ->execute([$logExist['log_id']]);
                    }
                } else {
                    $stmtInsertLog->execute([
                        $procDate, $empId, null, null, $targetStatus, $targetShiftId, 
                        $snapLine, $snapTeam, $snapType 
                    ]);
                }
            }
            $stats['log_processed']++;
            usleep(2000); 
        }
        $currTs = strtotime('+1 day', $currTs);
    }

    // 6. Cost Calculation
    $calcStart = date('Y-m-d', strtotime($startDate));
    $calcEnd   = date('Y-m-d', strtotime($endDate));

    $stmtCalc = $pdo->prepare("EXEC sp_CalculateDailyCost @StartDate = ?, @EndDate = ?");
    $stmtCalc->execute([$calcStart, $calcEnd]);
    
    $stats['cost_calc_method'] = 'Stored Procedure';

    $pdo->commit();
    echo json_encode(['success' => true, 'message' => 'Sync Completed (Toolbox Team1 Logic Applied)', 'stats' => $stats]);

} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>