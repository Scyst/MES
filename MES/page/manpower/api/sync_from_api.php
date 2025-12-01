<?php
// page/manpower/api/sync_from_api.php
set_time_limit(600); 
header('Content-Type: application/json');

require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../../auth/check_auth.php';

if (!hasRole(['admin', 'creator', 'supervisor'])) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Unauthorized access.']);
    exit;
}

$startDate = $_GET['startDate'] ?? date('Y-m-d');
$endDate   = $_GET['endDate']   ?? date('Y-m-d');

// ขยายเวลาดึง API เพื่อครอบคลุมกะดึก
$apiStartDate = date('Y-m-d', strtotime('-1 day', strtotime($startDate)));
$apiEndDate   = date('Y-m-d', strtotime('+1 day', strtotime($endDate)));

$apiUrl = "https://oem.sncformer.com/oem-calendar/oem-web-link/api/api.php?router=/man-power-painting&sdate={$apiStartDate}&edate={$apiEndDate}";

try {
    // 1. Fetch Data
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $apiUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    $apiResponse = curl_exec($ch);
    curl_close($ch);

    if (!$apiResponse) throw new Exception("API Connection Failed");
    $rawList = json_decode($apiResponse, true);
    if (!is_array($rawList)) $rawList = [];

    $stats = ['processed' => 0, 'present' => 0, 'absent' => 0, 'late' => 0, 'cleaned' => 0];
    $targetDepts = ['Toolbox', 'B9', 'B10', 'B11'];

    $pdo->beginTransaction();

    // ---------------------------------------------------------------
    // STEP 0: เตรียมข้อมูลพื้นฐาน
    // ---------------------------------------------------------------
    
    // โหลด Shift Config
    $shiftConfig = [];
    $stmtShifts = $pdo->query("SELECT shift_id, start_time FROM ".MANPOWER_SHIFTS_TABLE);
    while ($row = $stmtShifts->fetch(PDO::FETCH_ASSOC)) {
        $shiftConfig[$row['shift_id']] = $row['start_time']; 
    }

    // Default Shift (08:00)
    $defaultShiftId = 1; 
    foreach ($shiftConfig as $id => $time) {
        if (strpos($time, '08:') === 0) { $defaultShiftId = $id; break; }
    }

    // Fix Null Shifts
    $pdo->exec("UPDATE ".MANPOWER_EMPLOYEES_TABLE." SET default_shift_id = $defaultShiftId WHERE default_shift_id IS NULL AND is_active = 1");


    // ---------------------------------------------------------------
    // STEP 1: เตรียมข้อมูล API (Grouping)
    // ---------------------------------------------------------------
    $groupedData = []; 
    
    foreach ($rawList as $row) {
        $dept = $row['DEPARTMENT'] ?? '';
        $isMatch = false;
        foreach ($targetDepts as $kw) {
            if (stripos($dept, $kw) !== false) { $isMatch = true; break; }
        }
        if (!$isMatch) continue;

        $empId = $row['EMPID'];
        if (!isset($groupedData[$empId])) {
            $groupedData[$empId] = ['info' => $row, 'timestamps' => []];
        }
        
        $ts = strtotime($row['TIMEINOUT']);
        if ($ts && date('Y', $ts) > 2020) { 
            $groupedData[$empId]['timestamps'][] = $ts;
        }
    }

    // ---------------------------------------------------------------
    // STEP 2: วนลูปตามวัน (Day Loop Logic)
    // ---------------------------------------------------------------
    
    // โหลดพนักงานทั้งหมด
    $allEmployees = [];
    $sqlEmp = "SELECT emp_id, name_th, position, department_api, default_shift_id, line FROM ".MANPOWER_EMPLOYEES_TABLE." WHERE is_active = 1";
    $stmtAllEmp = $pdo->query($sqlEmp);
    while ($row = $stmtAllEmp->fetch(PDO::FETCH_ASSOC)) {
        $allEmployees[$row['emp_id']] = $row;
    }

    // SQL Statements
    $stmtUpdateEmpInfo = $pdo->prepare("UPDATE ".MANPOWER_EMPLOYEES_TABLE." SET name_th=?, position=?, department_api=?, last_sync_at=GETDATE() WHERE emp_id=?");
    $stmtCheckUser = $pdo->prepare("SELECT id FROM ".USERS_TABLE." WHERE emp_id = ?");
    $stmtInsUser = $pdo->prepare("INSERT INTO ".USERS_TABLE." (username, password, role, line, emp_id) VALUES (?, ?, ?, ?, ?)");

    // SQL สำหรับจัดการ Log (ลบก่อน แล้วค่อยเพิ่ม)
    $stmtDeleteOldLog = $pdo->prepare("DELETE FROM ".MANPOWER_DAILY_LOGS_TABLE." WHERE log_date = ? AND is_verified = 0"); // ★ พระเอกของเรา
    $stmtCheckLog = $pdo->prepare("SELECT log_id, is_verified FROM ".MANPOWER_DAILY_LOGS_TABLE." WHERE emp_id = ? AND log_date = ?");
    $stmtInsertLog = $pdo->prepare("INSERT INTO ".MANPOWER_DAILY_LOGS_TABLE." (log_date, emp_id, scan_in_time, scan_out_time, status) VALUES (?, ?, ?, ?, ?)");


    // เริ่มวนลูปวันที่
    $currentDate = strtotime($startDate);
    $endTs = strtotime($endDate);

    while ($currentDate <= $endTs) {
        $processingDate = date('Y-m-d', $currentDate);

        // 🔥 [AUTO CLEANUP] ลบข้อมูลเก่าของวันนี้ทิ้งก่อน (เฉพาะที่ยังไม่ Verify)
        $stmtDeleteOldLog->execute([$processingDate]);
        $stats['cleaned'] += $stmtDeleteOldLog->rowCount();
        
        foreach ($allEmployees as $empId => $empDB) {
            
            // 2.1 อัปเดตข้อมูลพื้นฐาน (ถ้ามีใน API)
            if (isset($groupedData[$empId])) {
                $apiInfo = $groupedData[$empId]['info'];
                $stmtUpdateEmpInfo->execute([$apiInfo['NAME'], $apiInfo['POSITION'], $apiInfo['DEPARTMENT'], $empId]);
                
                $stmtCheckUser->execute([$empId]);
                if (!$stmtCheckUser->fetch()) {
                    $rawPass = (strlen($empId) >= 4) ? substr($empId, -4) : $empId;
                    $role = (stripos($apiInfo['POSITION'], 'Manager') !== false || stripos($apiInfo['POSITION'], 'หัวหน้า') !== false) ? 'supervisor' : 'operator';
                    $stmtInsUser->execute([$empId, password_hash($rawPass, PASSWORD_DEFAULT), $role, 'TOOLBOX_POOL', $empId]);
                }
            }

            // 2.2 กำหนด Time Window
            $shiftId = $empDB['default_shift_id'] ?? $defaultShiftId;
            $shiftStartTimeStr = $shiftConfig[$shiftId] ?? '08:00:00';
            
            $startHour = (int)substr($shiftStartTimeStr, 0, 2);
            $isNightShift = ($startHour >= 15); 

            if ($isNightShift) {
                $windowStart = strtotime("$processingDate 15:00:00");
                $windowEnd   = strtotime("$processingDate 12:00:00 +1 day");
            } else {
                $windowStart = strtotime("$processingDate 05:00:00");
                $windowEnd   = strtotime("$processingDate 02:00:00 +1 day");
            }

            // 2.3 กรองสแกน
            $scansInWindow = [];
            if (isset($groupedData[$empId])) {
                foreach ($groupedData[$empId]['timestamps'] as $ts) {
                    if ($ts >= $windowStart && $ts <= $windowEnd) {
                        $scansInWindow[] = $ts;
                    }
                }
            }

            // 2.4 คำนวณ Status
            $status = 'ABSENT';
            $inTime = null;
            $outTime = null;
            $lateBufferMinutes = 10; 

            if (!empty($scansInWindow)) {
                $inTs = min($scansInWindow);
                $outTs = max($scansInWindow);

                $expectedStartTs = strtotime("$processingDate $shiftStartTimeStr");

                if ($inTs > ($expectedStartTs + ($lateBufferMinutes * 60))) {
                    $status = 'LATE';
                    $stats['late']++;
                } else {
                    $status = 'PRESENT';
                    $stats['present']++;
                }

                $inTime = date('Y-m-d H:i:s', $inTs);
                $outTime = ($inTs == $outTs) ? null : date('Y-m-d H:i:s', $outTs);
                if ($outTs < 946684800) $outTime = null;

            } else {
                // ขาดงาน (เช็คว่าถึงเวลาตัดสินหรือยัง)
                if (time() < $windowEnd) continue; // ยังไม่จบกะ ข้ามไปก่อน
                $stats['absent']++;
            }

            // 2.5 บันทึก (Insert อย่างเดียว เพราะเราลบของเก่าไปแล้ว)
            // ยกเว้นกรณีที่มี Verified Record ค้างอยู่ (ลบไม่ออก) เราต้องข้าม
            $stmtCheckLog->execute([$empId, $processingDate]);
            $existing = $stmtCheckLog->fetch(PDO::FETCH_ASSOC);

            if (!$existing) {
                $stmtInsertLog->execute([$processingDate, $empId, $inTime, $outTime, $status]);
                $stats['processed']++;
            } else {
                // ถ้าเข้ามาตรงนี้แสดงว่าเป็น is_verified = 1 (เพราะ = 0 โดนลบไปแล้ว)
                // เราจะไม่ยุ่งกับข้อมูลที่ Verify แล้ว
            }

        } // End Employee

        $currentDate = strtotime('+1 day', $currentDate);

    } // End Date

    // 3. Cleanup Users
    $stmtDeactivate = $pdo->prepare("UPDATE ".MANPOWER_EMPLOYEES_TABLE." SET is_active = 0 WHERE last_sync_at < ? AND is_active = 1");
    $stmtDeactivate->execute([date('Y-m-d H:i:s', strtotime('-30 days'))]);

    $pdo->commit();
    echo json_encode(['success' => true, 'message' => "Sync & Auto-Clean Complete.", 'stats' => $stats]);

} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>