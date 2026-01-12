<?php
// MES/page/manpower/api/sync_from_api.php

// 1. Setup Environment
date_default_timezone_set('Asia/Bangkok'); 
ignore_user_abort(true); // 👈 สำคัญ! สั่งให้ทำงานต่อแม้ Node-RED ตัดสายไปแล้ว
set_time_limit(0);       // 👈 สำคัญ! ปลดล็อคเวลาให้รันได้ยาวๆ ไม่จำกัด
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
// 🚀 เทคนิค FIRE AND FORGET: ตอบกลับ Node-RED ทันที แล้วทำงานต่อ
// =================================================================
ob_start();
echo json_encode([
    'success' => true, 
    'message' => '✅ Background Sync Started. Process running in background.',
    'timestamp' => date('Y-m-d H:i:s')
]);
$size = ob_get_length();
header("Content-Length: $size");
header('Connection: close'); // บอก Node-RED ว่า "จบการคุยแค่นี้นะ"
ob_end_flush();
@ob_flush();
flush();
if (function_exists('fastcgi_finish_request')) {
    fastcgi_finish_request(); // สั่งจบ Request ทันที (สำหรับ IIS/Nginx)
}
// =================================================================
// 👇 หลังจากบรรทัดนี้ Node-RED จะได้รับของแล้วตัดสายไป
//    แต่ PHP จะยังคงทำงานต่ออยู่เบื้องหลังครับ 👇
// =================================================================

require_once __DIR__ . '/../../db.php'; 
require_once __DIR__ . '/../../../config/config.php';

session_write_close();

// 2. Receive Date Range
$startDate = $_GET['startDate'] ?? date('Y-m-d');
$endDate   = $_GET['endDate']   ?? date('Y-m-d');

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

    // ❌ ปิด Transaction ถาวร (เพื่อให้เว็บแทรกเข้าอ่านได้)
    // $pdo->beginTransaction();

    // 4. Load Config
    $shiftConfig = [];
    $stmtShifts = $pdo->query("SELECT shift_id, start_time, end_time FROM " . MANPOWER_SHIFTS_TABLE);
    while ($row = $stmtShifts->fetch(PDO::FETCH_ASSOC)) { $shiftConfig[$row['shift_id']] = $row; }
    
    $defaultShiftId = 1; 
    foreach ($shiftConfig as $id => $s) { if (strpos($s['start_time'], '08:') === 0) { $defaultShiftId = $id; break; } }

    // 5. Group Data
    $groupedData = []; 
    foreach ($rawList as $row) {
        $dept = $row['DEPARTMENT'] ?? '';
        if (stripos($dept, 'Toolbox') === false && stripos($dept, 'B9') === false && stripos($dept, 'B10') === false) continue; 
        
        $empId = strval($row['EMPID']);
        if (!isset($groupedData[$empId])) $groupedData[$empId] = ['info' => $row, 'timestamps' => []];
        
        $ts = strtotime($row['TIMEINOUT']);
        if ($ts && date('Y', $ts) > 2020) $groupedData[$empId]['timestamps'][] = $ts; 
    }

    // 6. Update Master Data
    $existingEmployees = [];
    $sqlEmp = "SELECT E.emp_id, E.line, E.default_shift_id, E.team_group, E.is_active, 
                      ISNULL(CM.category_name, 'Other') as emp_type
               FROM " . MANPOWER_EMPLOYEES_TABLE . " E
               LEFT JOIN " . MANPOWER_CATEGORY_MAPPING_TABLE . " CM ON E.position LIKE '%' + CM.keyword + '%'";
    
    $stmtCheckIds = $pdo->query($sqlEmp);
    while ($row = $stmtCheckIds->fetch(PDO::FETCH_ASSOC)) { $existingEmployees[strval($row['emp_id'])] = $row; }
    
    $stmtInsertEmp = $pdo->prepare("INSERT INTO " . MANPOWER_EMPLOYEES_TABLE . " (emp_id, name_th, position, department_api, is_active, line, default_shift_id, last_sync_at) VALUES (?, ?, ?, ?, 1, 'TOOLBOX_POOL', ?, GETDATE())");
    $stmtUpdateEmp = $pdo->prepare("UPDATE " . MANPOWER_EMPLOYEES_TABLE . " SET position = ?, department_api = ?, last_sync_at = GETDATE() WHERE emp_id = ?");

    $stats = ['new' => 0, 'updated' => 0, 'log_processed' => 0];

    foreach ($groupedData as $apiEmpId => $data) {
        $info = $data['info'];
        if (isset($existingEmployees[$apiEmpId])) {
            if ($existingEmployees[$apiEmpId]['is_active'] == 1) {
                // ✅ เปิดใช้งาน: บันทึก Master Data
                $stmtUpdateEmp->execute([$info['POSITION']??'-', $info['DEPARTMENT']??'-', $apiEmpId]);
                $stats['updated']++;
            }
        } else {
            // ✅ เปิดใช้งาน: เพิ่มพนักงานใหม่
            $stmtInsertEmp->execute([$apiEmpId, $info['NAME']??'-', $info['POSITION']??'-', $info['DEPARTMENT']??'-', $defaultShiftId]);
            $existingEmployees[$apiEmpId] = [
                'emp_id' => $apiEmpId, 'line' => 'TOOLBOX_POOL', 'default_shift_id' => $defaultShiftId,
                'team_group' => null, 'is_active' => 1, 'emp_type' => 'Other'
            ];
            $stats['new']++;
        }
        // 🐢 ชะลอความเร็ว: พัก 0.01 วินาที
        usleep(10000); 
    }

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
            if (isset($empData['is_active']) && $empData['is_active'] == 0) {
                $stmtCheckLog->execute([$empId, $procDate]);
                $ghostLog = $stmtCheckLog->fetch(PDO::FETCH_ASSOC);
                if ($ghostLog && $ghostLog['is_verified'] == 0) {
                    $stmtDeleteLog->execute([$ghostLog['log_id']]);
                }
                continue; 
            }

            // 7.2 Snapshot & Check
            $snapLine = $empData['line'];
            $snapTeam = $empData['team_group'];
            $snapType = $empData['emp_type'];

            $stmtCheckLog->execute([$empId, $procDate]);
            $logExist = $stmtCheckLog->fetch(PDO::FETCH_ASSOC);
            if ($logExist && $logExist['is_verified'] == 1) continue; 

            // 7.3 Shift Window
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

            // 7.4 Valid Scans
            $validScans = [];
            if (isset($groupedData[$empId])) {
                foreach ($groupedData[$empId]['timestamps'] as $t) {
                    if ($t >= $wStart && $t <= $wEnd) $validScans[] = $t;
                }
            }

            // 7.5 Calculate & DB Ops
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

                // ✅ เปิดใช้งาน: บันทึก Log คนมาทำงาน
                if ($logExist) {
                    $stmtUpdateLog->execute([$inTimeStr, $outTimeStr, $status, $targetShiftId, $snapLine, $snapTeam, $snapType, $logExist['log_id']]);
                } else {
                    $stmtInsertLog->execute([$logDate, $empId, $inTimeStr, $outTimeStr, $status, $targetShiftId, $snapLine, $snapTeam, $snapType]);
                }

            } else {
                // ✅ เปิดใช้งาน: บันทึกคนขาดงาน
                if (!$logExist) {
                    $defaultStatus = ($procDate < date('Y-m-d')) ? 'ABSENT' : 'WAITING';
                    $stmtInsertLog->execute([$procDate, $empId, null, null, $defaultStatus, $targetShiftId, $snapLine, $snapTeam, $snapType]);
                }
            }
            $stats['log_processed']++;

            // 🐢 KEY FIX: ชะลอความเร็ว 0.05 วินาทีต่อคน (ให้ DB หายใจ)
            // ทำให้ 200 คน ใช้เวลาเพิ่มขึ้นประมาณ 10 วินาที ซึ่งคุ้มค่ากับเว็บที่ลื่นขึ้น
            usleep(50000); 
        }
        $currTs = strtotime('+1 day', $currTs);
    }

    // 8. Execute Stored Procedure
    $spName = IS_DEVELOPMENT ? 'sp_CalculateDailyCost_TEST' : 'sp_CalculateDailyCost';
    
    $calcStart = date('Y-m-d', strtotime($startDate));
    $calcEnd   = date('Y-m-d', strtotime($endDate));
    $stmtSP = $pdo->prepare("EXEC $spName @Date = ?");
    
    $runDate = $calcStart;
    while (strtotime($runDate) <= strtotime($calcEnd)) {
        $stmtSP->execute([$runDate]);
        
        // 🐢 KEY FIX: ชะลอ 0.2 วินาที หลังคำนวณเสร็จแต่ละวัน
        usleep(200000); 
        
        $runDate = date('Y-m-d', strtotime("+1 day", strtotime($runDate)));
    }

    // $pdo->commit(); // ปิดถาวร
    echo json_encode(['success' => true, 'message' => 'Sync & Calculation Completed', 'stats' => $stats]);

} catch (Exception $e) {
    // if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>