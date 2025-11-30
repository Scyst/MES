<?php
// page/manpower/api/sync_from_api.php

// 1. ปิดการแสดง Error แบบ HTML (ป้องกัน Unexpected token <)
ini_set('display_errors', 0);
error_reporting(E_ALL);

set_time_limit(600);
header('Content-Type: application/json');

require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../../auth/check_auth.php';

// ฟังก์ชันสำหรับส่ง JSON Error กลับไปเสมอ (ไม่ว่าจะเกิดอะไรขึ้น)
function sendJsonError($message) {
    echo json_encode(['success' => false, 'message' => $message]);
    exit;
}

// ตั้งค่า Error Handler ให้จับ PHP Error เป็น Exception
set_error_handler(function($errno, $errstr, $errfile, $errline) {
    throw new ErrorException($errstr, 0, $errno, $errfile, $errline);
});

if (!hasRole(['admin', 'creator', 'supervisor'])) {
    http_response_code(403);
    sendJsonError('Unauthorized access.');
}

$startDate = $_GET['startDate'] ?? date('Y-m-d');
$endDate   = $_GET['endDate']   ?? date('Y-m-d');
$apiUrl = "https://oem.sncformer.com/oem-calendar/oem-web-link/api/api.php?router=/man-power-painting&sdate={$startDate}&edate={$endDate}";

try {
    // 1. เชื่อมต่อ API
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $apiUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    $response = curl_exec($ch);
    if (curl_errno($ch)) {
        throw new Exception("Curl Error: " . curl_error($ch));
    }
    curl_close($ch);

    if (!$response) throw new Exception("Failed to connect to Scanner API (Empty response).");
    
    $apiData = json_decode($response, true);
    // ถ้า JSON แตก หรือไม่ใช่ Array
    if (json_last_error() !== JSON_ERROR_NONE) {
        $apiData = []; // หรือ throw Exception ก็ได้
    }
    if (!is_array($apiData)) $apiData = [];

    $pdo->beginTransaction();

    // 2. เตรียม Statement
    $stmtCheckEmp = $pdo->prepare("SELECT default_shift_id FROM " . MANPOWER_EMPLOYEES_TABLE . " WHERE emp_id = ?");
    $stmtInsertEmp = $pdo->prepare("INSERT INTO " . MANPOWER_EMPLOYEES_TABLE . " (emp_id, name_th, position, department_api, line, is_active, last_sync_at) VALUES (?, ?, ?, ?, ?, 1, GETDATE())");
    $stmtUpdateEmp = $pdo->prepare("UPDATE " . MANPOWER_EMPLOYEES_TABLE . " SET name_th = ?, position = ?, department_api = ?, last_sync_at = GETDATE() WHERE emp_id = ?");
    
    // Log Statements
    $stmtCheckLog = $pdo->prepare("SELECT log_id, scan_in_time, scan_out_time, is_verified FROM " . MANPOWER_DAILY_LOGS_TABLE . " WHERE log_date = ? AND emp_id = ?");
    
    $stmtInsertLog = $pdo->prepare("INSERT INTO " . MANPOWER_DAILY_LOGS_TABLE . " (log_date, emp_id, scan_in_time, scan_out_time, status, updated_at) VALUES (?, ?, ?, NULL, ?, GETDATE())");
    
    $stmtUpdateLog = $pdo->prepare("UPDATE " . MANPOWER_DAILY_LOGS_TABLE . " SET scan_in_time = ?, scan_out_time = ?, status = ?, updated_at = GETDATE() WHERE log_id = ?");

    // Ghost Cleanup
    $stmtDeleteGhost = $pdo->prepare("DELETE FROM " . MANPOWER_DAILY_LOGS_TABLE . " WHERE emp_id = ? AND log_date = ? AND is_verified = 0");

    // Load Shifts
    $shifts = [];
    try {
        $stmtShifts = $pdo->query("SELECT shift_id, start_time, late_threshold_minutes FROM " . MANPOWER_SHIFTS_TABLE);
        while ($row = $stmtShifts->fetch(PDO::FETCH_ASSOC)) {
            $shifts[$row['shift_id']] = $row;
        }
    } catch (Exception $ex) {
        // ถ้าไม่มีตาราง Shift ให้ข้ามไป (ใช้ Default)
    }

    $processedCount = 0;

    foreach ($apiData as $record) {
        $empId = trim($record['EMPID'] ?? '');
        if (empty($empId)) continue;

        $name = trim($record['NAME'] ?? '');
        $position = trim($record['POSITION'] ?? '');
        $deptApi = trim($record['DEPARTMENT'] ?? '');
        $scanTimeRaw = $record['TIMEINOUT'] ?? ''; 
        
        // [Validate Time] ป้องกัน Error Date
        if (empty($scanTimeRaw) || strtotime($scanTimeRaw) === false) continue;

        $scanTs = strtotime($scanTimeRaw);
        
        if (stripos($deptApi, 'TOOLBOX') === false) continue;

        // [Logic 1] Date Offset (-6 Hours)
        $logDate = date('Y-m-d', strtotime('-6 hours', $scanTs));
        
        // [Ghost Check]
        $calendarDate = date('Y-m-d', $scanTs);
        if ($logDate !== $calendarDate) {
            $stmtDeleteGhost->execute([$empId, $calendarDate]);
        }

        // --- Upsert Employee ---
        $stmtCheckEmp->execute([$empId]);
        $existingEmp = $stmtCheckEmp->fetch(PDO::FETCH_ASSOC);
        $defaultShiftId = null;

        if (!$existingEmp) {
            $stmtInsertEmp->execute([$empId, $name, $position, $deptApi, 'TOOLBOX_POOL']);
        } else {
            $stmtUpdateEmp->execute([$name, $position, $deptApi, $empId]);
            $defaultShiftId = $existingEmp['default_shift_id'];
        }

        // --- Shift Logic ---
        $scanHour = (int)date('H', $scanTs);
        $isValidIngress = true;
        $lateStatus = 'PRESENT';
        $dayOfWeek = date('w', strtotime($logDate)); 

        // Shift defaults
        $shiftStartTime = '08:00:00';
        $isNightShift = false;

        if ($defaultShiftId && isset($shifts[$defaultShiftId])) {
            $shift = $shifts[$defaultShiftId];
            $shiftStartTime = $shift['start_time'];
            $shiftStartHour = (int)date('H', strtotime($shiftStartTime));
            $isNightShift = ($shiftStartHour >= 15);

            // Saturday Night Override
            if ($dayOfWeek == 6 && $isNightShift) {
                $shiftStartTime = '17:00:00';
            }

            // Ghost Filter
            if ($isNightShift) {
                if ($scanHour >= 6 && $scanHour <= 13) $isValidIngress = false;
            } else {
                if ($scanHour >= 16 && $scanHour <= 23) $isValidIngress = false;
            }
        } else {
            if ($scanHour >= 14) $isValidIngress = false;
        }

        if (!$isValidIngress) continue;

        // --- Compare & Save (PHP Logic) ---
        $stmtCheckLog->execute([$logDate, $empId]);
        $currentLog = $stmtCheckLog->fetch(PDO::FETCH_ASSOC);

        if (!$currentLog) {
            // Insert
            $shiftStartDateTime = $logDate . ' ' . $shiftStartTime;
            $lateLimit = strtotime("+" . ($shifts[$defaultShiftId]['late_threshold_minutes'] ?? 5) . " minutes", strtotime($shiftStartDateTime));
            if ($scanTs > $lateLimit) $lateStatus = 'LATE';

            $stmtInsertLog->execute([$logDate, $empId, $scanTimeRaw, $lateStatus]);
        } else {
            // Update
            if ($currentLog['is_verified'] == 0) {
                $dbIn = $currentLog['scan_in_time'];
                $dbOut = $currentLog['scan_out_time'];
                
                $newIn = $dbIn;
                $newOut = $dbOut;
                $isUpdated = false;

                // Min Logic (เวลาเข้า)
                if (strtotime($scanTimeRaw) < strtotime($dbIn)) {
                    $newIn = $scanTimeRaw;
                    $isUpdated = true;
                    
                    // Re-check late status for new IN time
                    $shiftStartDateTime = $logDate . ' ' . $shiftStartTime;
                    $lateLimit = strtotime("+" . ($shifts[$defaultShiftId]['late_threshold_minutes'] ?? 5) . " minutes", strtotime($shiftStartDateTime));
                    if (strtotime($newIn) <= $lateLimit) $lateStatus = 'PRESENT';
                    else $lateStatus = 'LATE';
                } else {
                    $lateStatus = $currentLog['status'] ?? 'PRESENT';
                }

                // Max Logic (เวลาออก)
                // ถ้า scan ใหม่ > scan in เดิม -> พิจารณาเป็นเวลาออก
                if (strtotime($scanTimeRaw) > strtotime($dbIn)) {
                    // ถ้ายังไม่มี out หรือ scan ใหม่ > out เดิม
                    if ($dbOut === null || strtotime($scanTimeRaw) > strtotime($dbOut)) {
                        $newOut = $scanTimeRaw;
                        $isUpdated = true;
                    }
                }

                if ($isUpdated) {
                    $stmtUpdateLog->execute([$newIn, $newOut, $lateStatus, $currentLog['log_id']]);
                }
            }
        }
        
        $processedCount++;
    }

    // --- STEP 3: Fill Absences ---
    $currentDate = strtotime($startDate);
    $endTs = strtotime($endDate);
    $absentCount = 0;

    while ($currentDate <= $endTs) {
        $d = date('Y-m-d', $currentDate);
        $sqlFillAbsent = "
            INSERT INTO " . MANPOWER_DAILY_LOGS_TABLE . " (log_date, emp_id, status, updated_at)
            SELECT ?, E.emp_id, 'ABSENT', GETDATE()
            FROM " . MANPOWER_EMPLOYEES_TABLE . " E
            WHERE E.is_active = 1
              AND NOT EXISTS (SELECT 1 FROM " . MANPOWER_DAILY_LOGS_TABLE . " L WHERE L.emp_id = E.emp_id AND L.log_date = ?)
        ";
        $pdo->prepare($sqlFillAbsent)->execute([$d, $d]);
        $absentCount += $pdo->query("SELECT @@ROWCOUNT")->fetchColumn();
        $currentDate = strtotime('+1 day', $currentDate);
    }

    $pdo->commit();

    echo json_encode([
        'success' => true,
        'message' => "Sync OK: $processedCount records processed.",
        'stats' => ['valid' => $processedCount]
    ]);

} catch (Throwable $e) { // Catch ทั้ง Exception และ Error (PHP 7+)
    if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
    // ส่งกลับเป็น JSON เสมอ
    echo json_encode(['success' => false, 'message' => 'Sync Error: ' . $e->getMessage()]);
}
?>