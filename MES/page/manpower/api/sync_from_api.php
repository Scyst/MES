<?php
// page/manpower/api/sync_from_api.php

ignore_user_abort(true); 
set_time_limit(600); 

header('Content-Type: application/json');
require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../../auth/check_auth.php';

if (!hasRole(['admin', 'creator', 'supervisor'])) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

session_write_close(); 

$startDate = $_GET['startDate'] ?? date('Y-m-d');
$endDate   = $_GET['endDate']   ?? date('Y-m-d');

$apiStartDate = date('Y-m-d', strtotime('-1 day', strtotime($startDate)));
$apiEndDate   = date('Y-m-d', strtotime('+1 day', strtotime($endDate)));

$apiUrl = "https://oem.sncformer.com/oem-calendar/oem-web-link/api/api.php?router=/man-power-painting&sdate={$apiStartDate}&edate={$apiEndDate}";

try {
    // ---------------------------------------------------------------
    // SECTION 1: FETCH DATA FROM EXTERNAL API
    // ---------------------------------------------------------------
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $apiUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    $apiResponse = curl_exec($ch);
    curl_close($ch);

    if (!$apiResponse) throw new Exception("API Connection Failed");
    $rawList = json_decode($apiResponse, true);
    if (!is_array($rawList)) $rawList = [];

    $stats = ['processed' => 0, 'present' => 0, 'absent' => 0, 'late' => 0, 'new_added' => 0];
    $targetDepts = ['Toolbox', 'B9', 'B10', 'B11'];

    $shiftConfig = [];
    $stmtShifts = $pdo->query("SELECT shift_id, start_time, end_time FROM ".MANPOWER_SHIFTS_TABLE);
    while ($row = $stmtShifts->fetch(PDO::FETCH_ASSOC)) { $shiftConfig[$row['shift_id']] = $row; }
    
    $defaultShiftId = 1; 
    foreach ($shiftConfig as $id => $s) {
        if (strpos($s['start_time'], '08:') === 0) { $defaultShiftId = $id; break; }
    }

    $groupedData = []; 
    foreach ($rawList as $row) {
        $dept = $row['DEPARTMENT'] ?? '';
        $isMatch = false;
        foreach ($targetDepts as $kw) { if (stripos($dept, $kw) !== false) { $isMatch = true; break; } }
        if (!$isMatch) continue;

        $empId = $row['EMPID'];
        if (!isset($groupedData[$empId])) { $groupedData[$empId] = ['info' => $row, 'timestamps' => []]; }
        $ts = strtotime($row['TIMEINOUT']);
        if ($ts && date('Y', $ts) > 2020) { $groupedData[$empId]['timestamps'][] = $ts; }
    }

    $pdo->beginTransaction();

    // ---------------------------------------------------------------
    // SECTION 2: UPDATE EMPLOYEE MASTER
    // ---------------------------------------------------------------
    $existingEmpIds = [];
    $stmtCheckIds = $pdo->query("SELECT emp_id FROM ".MANPOWER_EMPLOYEES_TABLE);
    while ($row = $stmtCheckIds->fetch(PDO::FETCH_COLUMN)) { $existingEmpIds[] = strval($row); }
    
    $stmtAddNewEmp = $pdo->prepare("INSERT INTO ".MANPOWER_EMPLOYEES_TABLE." (emp_id, name_th, position, department_api, is_active, line, default_shift_id, last_sync_at) VALUES (?, ?, ?, ?, 1, 'TOOLBOX_POOL', ?, GETDATE())");

    foreach ($groupedData as $apiEmpId => $data) {
        if (!in_array(strval($apiEmpId), $existingEmpIds)) {
            $info = $data['info'];
            $stmtAddNewEmp->execute([$apiEmpId, $info['NAME'] ?? '-', $info['POSITION'] ?? '-', $info['DEPARTMENT'] ?? '-', $defaultShiftId]);
            $stats['new_added']++;
        }
    }

    // ---------------------------------------------------------------
    // SECTION 3: ATTENDANCE SYNC (GHOST SHIFT OFFSET)
    // ---------------------------------------------------------------
    $allEmployees = [];
    $stmtAllEmp = $pdo->query("SELECT emp_id, position, line, default_shift_id FROM ".MANPOWER_EMPLOYEES_TABLE." WHERE is_active = 1");
    while ($row = $stmtAllEmp->fetch(PDO::FETCH_ASSOC)) { $allEmployees[$row['emp_id']] = $row; }

    $stmtCheckLog = $pdo->prepare("SELECT log_id, is_verified FROM ".MANPOWER_DAILY_LOGS_TABLE." WHERE emp_id = ? AND log_date = ?");
    $stmtUpdateLog = $pdo->prepare("UPDATE ".MANPOWER_DAILY_LOGS_TABLE." SET scan_in_time = ?, scan_out_time = ?, status = ?, updated_at = GETDATE() WHERE log_id = ? AND is_verified = 0");
    $stmtInsertLog = $pdo->prepare("INSERT INTO ".MANPOWER_DAILY_LOGS_TABLE." (log_date, emp_id, scan_in_time, scan_out_time, status, updated_at) VALUES (?, ?, ?, ?, ?, GETDATE())");

    $currentDateTs = strtotime($startDate);
    $endTs = strtotime($endDate);

    while ($currentDateTs <= $endTs) {
        $processingDate = date('Y-m-d', $currentDateTs);
        foreach ($allEmployees as $empId => $empDB) {
            $shiftId = $empDB['default_shift_id'] ?? $defaultShiftId;
            $shiftTime = $shiftConfig[$shiftId]['start_time'] ?? '08:00:00';
            $isNight = ((int)substr($shiftTime, 0, 2) >= 15); 
            $wStart = strtotime($isNight ? "$processingDate 15:00:00" : "$processingDate 05:00:00");
            $wEnd   = strtotime($isNight ? "$processingDate 12:00:00 +1 day" : "$processingDate 02:00:00 +1 day");

            $scans = [];
            if (isset($groupedData[$empId])) {
                foreach ($groupedData[$empId]['timestamps'] as $ts) { if ($ts >= $wStart && $ts <= $wEnd) $scans[] = $ts; }
            }

            if (!empty($scans)) {
                $inTs = min($scans); $outTs = max($scans);
                $inTime = date('Y-m-d H:i:s', $inTs);
                $outTime = ($inTs == $outTs) ? null : date('Y-m-d H:i:s', $outTs);
                
                $inHr = (int)date('H', $inTs);
                $prodDate = date('Y-m-d', $inTs);
                if ($inHr >= 0 && $inHr < 6) { $prodDate = date('Y-m-d', strtotime($prodDate . ' -1 day')); }

                $expStart = strtotime($prodDate . " " . $shiftTime);
                $status = ($inTs > ($expStart + 600)) ? 'LATE' : 'PRESENT';
                if ($status == 'LATE') $stats['late']++; else $stats['present']++;

                $stmtCheckLog->execute([$empId, $prodDate]);
                $exist = $stmtCheckLog->fetch(PDO::FETCH_ASSOC);
                if ($exist) {
                    if ($exist['is_verified'] == 0) $stmtUpdateLog->execute([$inTime, $outTime, $status, $exist['log_id']]);
                } else {
                    $stmtInsertLog->execute([$prodDate, $empId, $inTime, $outTime, $status]);
                }
            } else { if (time() > $wEnd) $stats['absent']++; }
            $stats['processed']++;
        } 
        $currentDateTs = strtotime('+1 day', $currentDateTs);
    } 
    $pdo->commit();

    // ---------------------------------------------------------------
    // SECTION 4: DETAILED LABOR COST CALCULATION (ENHANCED POSITIONS)
    // ---------------------------------------------------------------
    $pdo->beginTransaction();
    $currTs = strtotime($startDate);
    
    $sqlMergeCost = "
        MERGE INTO ".MANUAL_COSTS_TABLE." AS T 
        USING (VALUES (:date, :line, :cat, :type, :val, :unit, 'AUTO_SYNC')) 
        AS S (entry_date, line, cost_category, cost_type, cost_value, unit, user_update) 
        ON (T.entry_date = S.entry_date AND T.line = S.line AND T.cost_type = S.cost_type) 
        WHEN MATCHED THEN 
            UPDATE SET cost_value = S.cost_value, updated_by = S.user_update, updated_at = GETDATE() 
        WHEN NOT MATCHED THEN 
            INSERT (entry_date, line, cost_category, cost_type, cost_value, unit, updated_by) 
            VALUES (S.entry_date, S.line, S.cost_category, S.cost_type, S.cost_value, S.unit, S.user_update);
    ";
    $stmtSaveCost = $pdo->prepare($sqlMergeCost);

    while ($currTs <= $endTs) {
        $pDate = date('Y-m-d', $currTs);
        $dayOfWeek = date('w', $currTs);
        $isSunday = ($dayOfWeek == 0);
        $isHoliday = false; 

        $sqlAtt = "SELECT emp_id, status, scan_in_time, scan_out_time FROM ".MANPOWER_DAILY_LOGS_TABLE." WHERE log_date = ?";
        $stmtAtt = $pdo->prepare($sqlAtt);
        $stmtAtt->execute([$pDate]);
        $dailyAttendance = $stmtAtt->fetchAll(PDO::FETCH_UNIQUE | PDO::FETCH_ASSOC);

        $lineSummary = [];

        foreach ($allEmployees as $eid => $emp) {
            if (!isset($dailyAttendance[$eid])) continue;
            $att = $dailyAttendance[$eid];
            if ($att['status'] === 'ABSENT' || empty($att['scan_in_time'])) continue;
            
            $line = strtoupper(trim($emp['line'] ?? 'UNKNOWN'));
            if (!isset($lineSummary[$line])) { $lineSummary[$line] = ['headcount' => 0, 'dl_cost' => 0, 'ot_cost' => 0]; }
            $lineSummary[$line]['headcount']++;

            $pos = trim($emp['position'] ?? '');
            $dailyWage = 0;
            $isMonthly = false;
            $hasOT = true; 

            if (preg_match('/Mini MD/i', $pos) && stripos($pos, 'Acting') === false) {
                $dailyWage = 80000 / 30; $isMonthly = true; $hasOT = false; 
            } elseif (stripos($pos, 'ผู้จัดการ') !== false || stripos($pos, 'Manager') !== false) {
                // กลุ่มผู้จัดการ (ฝ่าย/แผนก)
                $dailyWage = 45000 / 30; $isMonthly = true; $hasOT = false;
            } elseif (stripos($pos, 'Acting Mini MD') !== false) {
                $dailyWage = 40000 / 30; $isMonthly = true;
            } elseif (stripos($pos, 'หัวหน้า') !== false || stripos($pos, 'Supervisor') !== false || stripos($pos, 'Leader') !== false) {
                $dailyWage = 30000 / 30; $isMonthly = true;
            } elseif (
                stripos($pos, 'นักศึกษาทุน') !== false || 
                stripos($pos, 'SPECIAL LIST') !== false || 
                stripos($pos, 'ผู้ช่วย') !== false || 
                stripos($pos, 'พนักงานประจำ') !== false ||
                (stripos($pos, 'พนักงาน') !== false && stripos($pos, 'สัญญาจ้าง') === false && stripos($pos, 'ทดลองงาน') === false)
            ) {
                // กลุ่มพนักงานประจำ / Office / รายเดือน
                $dailyWage = 20000 / 30; $isMonthly = true;
            } else {
                // พนักงานสัญญาจ้าง, พนักงานทดลองงาน, นักศึกษาฝึกงาน และอื่นๆ (รายวัน)
                $dailyWage = 400; $isMonthly = false;
            }
            $hourlyRate = $dailyWage / 8;

            // คำนวณ DL Cost
            if ($isHoliday) { $lineSummary[$line]['dl_cost'] += ($dailyWage * 3); }
            elseif ($isSunday) { $lineSummary[$line]['dl_cost'] += ($isMonthly ? $dailyWage : ($dailyWage * 2)); }
            else { $lineSummary[$line]['dl_cost'] += $dailyWage; }

            // คำนวณ OT Cost
            if ($hasOT && !empty($att['scan_out_time'])) {
                $sId = $emp['default_shift_id'] ?? $defaultShiftId;
                $sStart = $shiftConfig[$sId]['start_time'];
                $sEnd = $shiftConfig[$sId]['end_time'];

                $outObj = new DateTime($att['scan_out_time']);
                $endObj = new DateTime($pDate . ' ' . $sEnd);
                if (new DateTime($pDate . ' ' . $sStart) > $endObj) $endObj->modify('+1 day');

                $otGate = clone $endObj;
                $otGate->modify('+30 minutes'); 

                if ($outObj > $otGate) {
                    $otMin = ($outObj->getTimestamp() - $endObj->getTimestamp()) / 60;
                    if ($otMin >= 60) {
                        $otHrs = floor($otMin / 60 * 2) / 2;
                        $multiplier = ($isSunday || $isHoliday) ? 3 : 1.5; 
                        $lineSummary[$line]['ot_cost'] += ($otHrs * $hourlyRate * $multiplier);
                    }
                }
            }
        }

        foreach ($lineSummary as $lineName => $costs) {
            $common = [':date' => $pDate, ':line' => $lineName, ':cat' => 'LABOR'];
            $stmtSaveCost->execute(array_merge($common, [':type' => 'HEAD_COUNT', ':val' => $costs['headcount'], ':unit' => 'Person']));
            $stmtSaveCost->execute(array_merge($common, [':type' => 'DIRECT_LABOR', ':val' => $costs['dl_cost'], ':unit' => 'THB']));
            $stmtSaveCost->execute(array_merge($common, [':type' => 'OVERTIME', ':val' => $costs['ot_cost'], ':unit' => 'THB']));
        }
        $currTs = strtotime('+1 day', $currTs);
    }
    $pdo->commit();

    echo json_encode(['success' => true, 'message' => "Sync & Precise Labor Calculation Completed.", 'stats' => $stats]);

} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}