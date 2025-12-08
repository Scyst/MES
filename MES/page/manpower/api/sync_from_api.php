<?php
// page/manpower/api/sync_from_api.php

ignore_user_abort(true); 
set_time_limit(600); 

header('Content-Type: application/json');
require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../../auth/check_auth.php';

if (!hasRole(['admin', 'creator', 'supervisor'])) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Unauthorized access.']);
    exit;
}

session_write_close(); 

$startDate = $_GET['startDate'] ?? date('Y-m-d');
$endDate   = $_GET['endDate']   ?? date('Y-m-d');

$apiStartDate = date('Y-m-d', strtotime('-1 day', strtotime($startDate)));
$apiEndDate   = date('Y-m-d', strtotime('+1 day', strtotime($endDate)));

$apiUrl = "https://oem.sncformer.com/oem-calendar/oem-web-link/api/api.php?router=/man-power-painting&sdate={$apiStartDate}&edate={$apiEndDate}";

try {
    // ... (ส่วน Fetch Data เหมือนเดิม) ...
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $apiUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    $apiResponse = curl_exec($ch);
    curl_close($ch);

    if (!$apiResponse) throw new Exception("API Connection Failed");
    $rawList = json_decode($apiResponse, true);
    if (!is_array($rawList)) $rawList = [];

    $stats = ['processed' => 0, 'present' => 0, 'absent' => 0, 'late' => 0, 'cleaned' => 0, 'new_added' => 0];
    $targetDepts = ['Toolbox', 'B9', 'B10', 'B11'];

    $pdo->beginTransaction();

    // ... (STEP 0, STEP 1, STEP 1.5 เหมือนเดิมทุกประการ Copy มาได้เลย) ...
    // (เพื่อประหยัดพื้นที่ ผมขอข้าม Code ส่วน STEP 0 - 1.5 ที่เหมือนเดิมนะครับ)
    // ...
    // ...
    
    // ---------------------------------------------------------------
    // STEP 0: (ใส่โค้ดเดิม)
    // ---------------------------------------------------------------
    $shiftConfig = [];
    $stmtShifts = $pdo->query("SELECT shift_id, start_time FROM ".MANPOWER_SHIFTS_TABLE);
    while ($row = $stmtShifts->fetch(PDO::FETCH_ASSOC)) {
        $shiftConfig[$row['shift_id']] = $row['start_time']; 
    }
    $defaultShiftId = 1; 
    foreach ($shiftConfig as $id => $time) {
        if (strpos($time, '08:') === 0) { $defaultShiftId = $id; break; }
    }
    $pdo->exec("UPDATE ".MANPOWER_EMPLOYEES_TABLE." SET default_shift_id = $defaultShiftId WHERE default_shift_id IS NULL AND is_active = 1");

    // ---------------------------------------------------------------
    // STEP 1: (ใส่โค้ดเดิม)
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
    // STEP 1.5: (ใส่โค้ดเดิม)
    // ---------------------------------------------------------------
    $existingEmpIds = [];
    $stmtCheckIds = $pdo->query("SELECT emp_id FROM ".MANPOWER_EMPLOYEES_TABLE);
    while ($row = $stmtCheckIds->fetch(PDO::FETCH_COLUMN)) {
        $existingEmpIds[] = strval($row); 
    }
    $stmtAddNewEmp = $pdo->prepare("INSERT INTO ".MANPOWER_EMPLOYEES_TABLE." (emp_id, name_th, position, department_api, is_active, line, default_shift_id, last_sync_at) VALUES (?, ?, ?, ?, 1, 'TOOLBOX_POOL', ?, GETDATE())");
    $stmtInsUserNew = $pdo->prepare("INSERT INTO ".USERS_TABLE." (username, password, role, line, emp_id, created_at) VALUES (?, ?, ?, ?, ?, GETDATE())");

    foreach ($groupedData as $apiEmpId => $data) {
        if (!in_array(strval($apiEmpId), $existingEmpIds)) {
            $info = $data['info'];
            $name = $info['NAME'] ?? '-';
            $pos  = $info['POSITION'] ?? '-';
            $dept = $info['DEPARTMENT'] ?? '-';
            $stmtAddNewEmp->execute([$apiEmpId, $name, $pos, $dept, $defaultShiftId]);
            $chkUser = $pdo->prepare("SELECT id FROM ".USERS_TABLE." WHERE emp_id = ?");
            $chkUser->execute([$apiEmpId]);
            if (!$chkUser->fetch()) {
                $rawPass = (strlen($apiEmpId) >= 4) ? substr($apiEmpId, -4) : $apiEmpId;
                $role = (stripos($pos, 'Manager') !== false || stripos($pos, 'หัวหน้า') !== false) ? 'supervisor' : 'operator';
                $stmtInsUserNew->execute([$apiEmpId, password_hash($rawPass, PASSWORD_DEFAULT), $role, 'TOOLBOX_POOL', $apiEmpId]);
            }
            $stats['new_added']++;
        }
    }


    // ---------------------------------------------------------------
    // STEP 2: วนลูปตามวัน (Day Loop Logic) - [แก้ไขใหม่ตรงนี้!!]
    // ---------------------------------------------------------------
    
    // โหลดพนักงานทั้งหมด
    $allEmployees = [];
    $sqlEmp = "SELECT emp_id, name_th, position, department_api, default_shift_id, line FROM ".MANPOWER_EMPLOYEES_TABLE." WHERE is_active = 1";
    $stmtAllEmp = $pdo->query($sqlEmp);
    while ($row = $stmtAllEmp->fetch(PDO::FETCH_ASSOC)) {
        $allEmployees[$row['emp_id']] = $row;
    }

    // Prepare SQL
    $stmtUpdateEmpInfo = $pdo->prepare("UPDATE ".MANPOWER_EMPLOYEES_TABLE." SET name_th=?, position=?, department_api=?, last_sync_at=GETDATE() WHERE emp_id=?");
    
    // ★ [FIX] ไม่ลบ (DELETE) แล้ว แต่ใช้การเช็คก่อน Insert
    $stmtCheckLog = $pdo->prepare("SELECT log_id, is_verified FROM ".MANPOWER_DAILY_LOGS_TABLE." WHERE emp_id = ? AND log_date = ?");
    
    // ★ [FIX] เตรียมคำสั่ง UPDATE (กรณีมีข้อมูลเดิมอยู่แล้ว)
    $stmtUpdateLog = $pdo->prepare("UPDATE ".MANPOWER_DAILY_LOGS_TABLE." SET scan_in_time = ?, scan_out_time = ?, status = ?, updated_at = GETDATE() WHERE log_id = ? AND is_verified = 0");
    
    // เตรียมคำสั่ง INSERT (กรณีเป็นข้อมูลใหม่)
    $stmtInsertLog = $pdo->prepare("INSERT INTO ".MANPOWER_DAILY_LOGS_TABLE." (log_date, emp_id, scan_in_time, scan_out_time, status, updated_at) VALUES (?, ?, ?, ?, ?, GETDATE())");


    $currentDate = strtotime($startDate);
    $endTs = strtotime($endDate);

    while ($currentDate <= $endTs) {
        $processingDate = date('Y-m-d', $currentDate);

        // ★ [FIX] ตัดบรรทัด $stmtDeleteOldLog ออกไปเลยครับ!
        // ไม่มีการลบข้อมูลยกแผงอีกต่อไป
        
        foreach ($allEmployees as $empId => $empDB) {
            
            if (isset($groupedData[$empId])) {
                $apiInfo = $groupedData[$empId]['info'];
                $stmtUpdateEmpInfo->execute([$apiInfo['NAME'], $apiInfo['POSITION'], $apiInfo['DEPARTMENT'], $empId]);
            }

            // คำนวณกะและเวลาเข้างาน (Logic เดิม)
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

            $scansInWindow = [];
            if (isset($groupedData[$empId])) {
                foreach ($groupedData[$empId]['timestamps'] as $ts) {
                    if ($ts >= $windowStart && $ts <= $windowEnd) {
                        $scansInWindow[] = $ts;
                    }
                }
            }

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
                if (time() < $windowEnd) continue; 
                $stats['absent']++;
            }

            // ★ [FIX] Logic การบันทึกแบบ Upsert (Update or Insert)
            $stmtCheckLog->execute([$empId, $processingDate]);
            $existing = $stmtCheckLog->fetch(PDO::FETCH_ASSOC);

            if ($existing) {
                // มีข้อมูลอยู่แล้ว -> อัปเดตทับ (ถ้ายังไม่ Verify)
                if ($existing['is_verified'] == 0) {
                    $stmtUpdateLog->execute([$inTime, $outTime, $status, $existing['log_id']]);
                }
            } else {
                // ยังไม่มีข้อมูล -> เพิ่มใหม่
                $stmtInsertLog->execute([$processingDate, $empId, $inTime, $outTime, $status]);
            }
            
            $stats['processed']++;
        } 

        $currentDate = strtotime('+1 day', $currentDate);
    } 

    // Cleanup
    $stmtDeactivate = $pdo->prepare("UPDATE ".MANPOWER_EMPLOYEES_TABLE." SET is_active = 0 WHERE last_sync_at < ? AND is_active = 1");
    $stmtDeactivate->execute([date('Y-m-d H:i:s', strtotime('-30 days'))]);

    $pdo->commit();
    echo json_encode(['success' => true, 'message' => "Sync Completed.", 'stats' => $stats]);

} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>