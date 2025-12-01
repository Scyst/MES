<?php
// page/manpower/api/sync_from_api.php
set_time_limit(600); 
header('Content-Type: application/json');

require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../../auth/check_auth.php';

if (!hasRole(['admin', 'creator', 'supervisor'])) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

$startDate = $_GET['startDate'] ?? date('Y-m-d');
$endDate   = $_GET['endDate']   ?? date('Y-m-d');

// ดึงข้อมูลกว้างๆ เผื่อเหลื่อมเวลา
$apiStartDate = date('Y-m-d', strtotime('-1 day', strtotime($startDate)));
$apiEndDate   = date('Y-m-d', strtotime('+1 day', strtotime($endDate)));

$apiUrl = "https://oem.sncformer.com/oem-calendar/oem-web-link/api/api.php?router=/man-power-painting&sdate={$apiStartDate}&edate={$apiEndDate}";

try {
    // 1. Fetch Data from API
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $apiUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    $apiResponse = curl_exec($ch);
    curl_close($ch);

    if (!$apiResponse) throw new Exception("API Connection Failed");
    $rawList = json_decode($apiResponse, true);
    if (!is_array($rawList)) $rawList = [];

    $stats = ['processed' => 0, 'present' => 0, 'absent' => 0, 'late' => 0];
    $targetDepts = ['Toolbox', 'B9', 'B10', 'B11'];

    $pdo->beginTransaction();

    // ---------------------------------------------------------------
    // STEP 0: เตรียมข้อมูลพื้นฐาน (Shifts & Employees)
    // ---------------------------------------------------------------
    
    // 0.1 โหลดข้อมูลกะการทำงานทั้งหมดเก็บเข้า Array เพื่อลดการ Query บ่อยๆ
    $shiftConfig = [];
    $stmtShifts = $pdo->query("SELECT shift_id, start_time FROM ".MANPOWER_SHIFTS_TABLE);
    while ($row = $stmtShifts->fetch(PDO::FETCH_ASSOC)) {
        $shiftConfig[$row['shift_id']] = $row['start_time']; // เก็บเวลาเริ่มงาน เช่น '08:00:00'
    }

    // 0.2 ตั้งค่า Default Shift (กะเช้า 08:00)
    $defaultShiftId = 1; 
    foreach ($shiftConfig as $id => $time) {
        if (strpos($time, '08:') === 0) { $defaultShiftId = $id; break; }
    }

    // 0.3 อัปเดตคนไม่มีกะ ให้เป็นกะเช้า
    $pdo->exec("UPDATE ".MANPOWER_EMPLOYEES_TABLE." SET default_shift_id = $defaultShiftId WHERE default_shift_id IS NULL AND is_active = 1");


    // ---------------------------------------------------------------
    // STEP 1: เตรียมข้อมูล API (Grouping)
    // ---------------------------------------------------------------
    $groupedData = []; // [emp_id => [info, timestamps[]]]
    
    // วนลูป API เพื่อเก็บเวลาสแกนของแต่ละคน
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
        
        // แปลงเป็น timestamp และกรองปี 1970
        $ts = strtotime($row['TIMEINOUT']);
        if ($ts && date('Y', $ts) > 2020) { 
            $groupedData[$empId]['timestamps'][] = $ts;
        }
    }

    // ---------------------------------------------------------------
    // STEP 2: วนลูปตามวัน (Day Loop Logic)
    // ---------------------------------------------------------------
    
    // ดึงรายชื่อพนักงานทั้งหมดในระบบ (รวมคนที่ไม่มีใน API ด้วย เพราะต้องเช็ค ABSENT)
    $allEmployees = [];
    $sqlEmp = "SELECT emp_id, name_th, position, department_api, default_shift_id, line FROM ".MANPOWER_EMPLOYEES_TABLE." WHERE is_active = 1";
    $stmtAllEmp = $pdo->query($sqlEmp);
    while ($row = $stmtAllEmp->fetch(PDO::FETCH_ASSOC)) {
        $allEmployees[$row['emp_id']] = $row;
    }

    // SQL Statements
    $stmtCheckLog = $pdo->prepare("SELECT log_id, scan_in_time, scan_out_time, is_verified, status FROM ".MANPOWER_DAILY_LOGS_TABLE." WHERE emp_id = ? AND log_date = ?");
    $stmtInsertLog = $pdo->prepare("INSERT INTO ".MANPOWER_DAILY_LOGS_TABLE." (log_date, emp_id, scan_in_time, scan_out_time, status) VALUES (?, ?, ?, ?, ?)");
    $stmtUpdateLog = $pdo->prepare("UPDATE ".MANPOWER_DAILY_LOGS_TABLE." SET scan_in_time=?, scan_out_time=?, status=?, updated_at=GETDATE() WHERE log_id=?");
    
    // Update ข้อมูลพนักงาน (ถ้าเจอใน API)
    $stmtUpdateEmpInfo = $pdo->prepare("UPDATE ".MANPOWER_EMPLOYEES_TABLE." SET name_th=?, position=?, department_api=?, last_sync_at=GETDATE() WHERE emp_id=?");

    // Create User
    $stmtCheckUser = $pdo->prepare("SELECT id FROM ".USERS_TABLE." WHERE emp_id = ?");
    $stmtInsUser = $pdo->prepare("INSERT INTO ".USERS_TABLE." (username, password, role, line, emp_id) VALUES (?, ?, ?, ?, ?)");


    // เริ่มวนลูปวันที่
    $currentDate = strtotime($startDate);
    $endTs = strtotime($endDate);

    while ($currentDate <= $endTs) {
        $processingDate = date('Y-m-d', $currentDate);
        
        // วนลูปพนักงานทุกคนที่มีใน DB (เพื่อหาทั้งคนมาและคนขาด)
        foreach ($allEmployees as $empId => $empDB) {
            
            // 2.1 อัปเดตข้อมูลพื้นฐาน และสร้าง User (ถ้ามีใน API)
            if (isset($groupedData[$empId])) {
                $apiInfo = $groupedData[$empId]['info'];
                $stmtUpdateEmpInfo->execute([$apiInfo['NAME'], $apiInfo['POSITION'], $apiInfo['DEPARTMENT'], $empId]);
                
                // Create User Check
                $stmtCheckUser->execute([$empId]);
                if (!$stmtCheckUser->fetch()) {
                    $rawPass = (strlen($empId) >= 4) ? substr($empId, -4) : $empId;
                    $role = (stripos($apiInfo['POSITION'], 'Manager') !== false || stripos($apiInfo['POSITION'], 'หัวหน้า') !== false) ? 'supervisor' : 'operator';
                    $stmtInsUser->execute([$empId, password_hash($rawPass, PASSWORD_DEFAULT), $role, 'TOOLBOX_POOL', $empId]);
                }
            }

            // 2.2 กำหนดกะและช่วงเวลา (Time Window)
            $shiftId = $empDB['default_shift_id'] ?? $defaultShiftId;
            $shiftStartTimeStr = $shiftConfig[$shiftId] ?? '08:00:00'; // เวลาเริ่มงานตามตาราง (เช่น 20:00:00)
            
            $startHour = (int)substr($shiftStartTimeStr, 0, 2);
            $isNightShift = ($startHour >= 15); // ถ้าเริ่มงานหลังบ่าย 3 ถือเป็นกะดึก

            // สร้าง Window สำหรับจับสแกน
            if ($isNightShift) {
                // กะดึก: 15:00 วันนี้ ถึง 12:00 พรุ่งนี้
                $windowStart = strtotime("$processingDate 15:00:00");
                $windowEnd   = strtotime("$processingDate 12:00:00 +1 day");
            } else {
                // กะเช้า: 05:00 วันนี้ ถึง 02:00 พรุ่งนี้
                $windowStart = strtotime("$processingDate 05:00:00");
                $windowEnd   = strtotime("$processingDate 02:00:00 +1 day");
            }

            // 2.3 ค้นหาสแกนที่ตกอยู่ใน Window นี้
            $scansInWindow = [];
            if (isset($groupedData[$empId])) {
                foreach ($groupedData[$empId]['timestamps'] as $ts) {
                    if ($ts >= $windowStart && $ts <= $windowEnd) {
                        $scansInWindow[] = $ts;
                    }
                }
            }

            // 2.4 วิเคราะห์สถานะ (Status Calculation)
            $status = 'ABSENT';
            $inTime = null;
            $outTime = null;
            $lateBufferMinutes = 10; // อนุโลมสายได้ 10 นาที (ปรับได้)

            if (!empty($scansInWindow)) {
                // -- กรณีมาทำงาน (PRESENT / LATE) --
                $inTs = min($scansInWindow);
                $outTs = max($scansInWindow);

                // คำนวณเวลาเข้างานที่ควรจะเป็น (Shift Start Timestamp)
                $expectedStartTs = strtotime("$processingDate $shiftStartTimeStr");

                // เช็คสาย: เวลาสแกน > เวลาเริ่มงาน + buffer
                if ($inTs > ($expectedStartTs + ($lateBufferMinutes * 60))) {
                    $status = 'LATE';
                    $stats['late']++;
                } else {
                    $status = 'PRESENT';
                    $stats['present']++;
                }

                $inTime = date('Y-m-d H:i:s', $inTs);
                $outTime = date('Y-m-d H:i:s', $outTs); 
                
                // ป้องกัน 1970 (Year 2000 Check)
                if ($outTs < 946684800) $outTime = null;
                if ($inTs == $outTs) $outTime = null; // สแกนครั้งเดียว ให้ Out เป็น Null ไปก่อน

            } else {
                // -- กรณีขาดงาน (ABSENT) --
                $stats['absent']++;
            }

            // 2.5 บันทึกลงฐานข้อมูล (Insert / Update)
            $stmtCheckLog->execute([$empId, $processingDate]);
            $existing = $stmtCheckLog->fetch(PDO::FETCH_ASSOC);

            if (!$existing) {
                // ยังไม่มี -> Insert เลย (ไม่ว่าจะเป็น ABSENT หรือ PRESENT)
                // [FIXED HERE]: ใช้ $stmtInsertLog ให้ตรงกับที่ประกาศ
                $stmtInsertLog->execute([$processingDate, $empId, $inTime, $outTime, $status]);
                $stats['processed']++;
            } else {
                // มีแล้ว -> Update (เฉพาะถ้ายังไม่ Verified)
                if ($existing['is_verified'] == 0) {
                    // Logic การ Update:
                    // 1. ถ้าของเดิมเป็น ABSENT แต่รอบนี้เจอสแกน -> อัปเดตเป็น PRESENT/LATE ทันที
                    // 2. ถ้าของเดิมมีสแกนแล้ว -> อัปเดตเวลาให้กว้างขึ้น (Min In, Max Out)
                    
                    $shouldUpdate = false;
                    $newStatus = $existing['status'];
                    $finalIn = $existing['scan_in_time'];
                    $finalOut = $existing['scan_out_time'];

                    if ($status !== 'ABSENT') {
                        // รอบนี้เจอข้อมูล
                        if ($existing['status'] === 'ABSENT') {
                            // เปลี่ยนจากขาด เป็น มา
                            $newStatus = $status;
                            $finalIn = $inTime;
                            $finalOut = $outTime;
                            $shouldUpdate = true;
                        } else {
                            // มีข้อมูลอยู่แล้ว -> ขยายเวลา
                            $dbInTs = strtotime($existing['scan_in_time']);
                            $dbOutTs = strtotime($existing['scan_out_time'] ?? $existing['scan_in_time']);
                            $currInTs = strtotime($inTime);
                            $currOutTs = strtotime($outTime);

                            $updIn = min($dbInTs, $currInTs);
                            $updOut = max($dbOutTs, $currOutTs);

                            if ($updIn != $dbInTs || $updOut != $dbOutTs) {
                                $finalIn = date('Y-m-d H:i:s', $updIn);
                                $finalOut = date('Y-m-d H:i:s', $updOut);
                                $shouldUpdate = true;
                            }
                        }
                    }

                    if ($shouldUpdate) {
                        $stmtUpdateLog->execute([$finalIn, $finalOut, $newStatus, $existing['log_id']]);
                        $stats['processed']++;
                    }
                }
            }

        } // End Employee Loop

        // ขยับวัน
        $currentDate = strtotime('+1 day', $currentDate);

    } // End Date Loop

    // 3. Cleanup คนหาย
    $stmtDeactivate = $pdo->prepare("UPDATE ".MANPOWER_EMPLOYEES_TABLE." SET is_active = 0 WHERE last_sync_at < ? AND is_active = 1");
    $stmtDeactivate->execute([date('Y-m-d H:i:s', strtotime('-30 days'))]);

    $pdo->commit();
    echo json_encode(['success' => true, 'message' => "Sync Complete. Present: {$stats['present']}, Late: {$stats['late']}, Absent: {$stats['absent']}", 'stats' => $stats]);

} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>