<?php
// page/manpower/api/sync_from_api.php

// 1. ปิดการแสดง Error แบบ HTML (ป้องกัน Unexpected token <)
ini_set('display_errors', 0);
error_reporting(E_ALL);

set_time_limit(600);
header('Content-Type: application/json');

require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../../auth/check_auth.php';

// Helper function for clean JSON error
function sendJsonError($message) {
    echo json_encode(['success' => false, 'message' => $message]);
    exit;
}

set_error_handler(function($errno, $errstr, $errfile, $errline) {
    // ข้าม Warning เรื่อง strtotime ถ้าเผลอหลุดมา แต่เรากันไว้แล้ว
    if (strpos($errstr, 'strtotime') !== false) return true;
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
    if (curl_errno($ch)) throw new Exception("Curl Error: " . curl_error($ch));
    curl_close($ch);

    if (!$response) throw new Exception("Failed to connect to Scanner API.");
    
    $apiData = json_decode($response, true);
    if (!is_array($apiData)) $apiData = [];

    $pdo->beginTransaction();

    // 2. เตรียม Statement
    $stmtCheckEmp = $pdo->prepare("SELECT default_shift_id FROM " . MANPOWER_EMPLOYEES_TABLE . " WHERE emp_id = ?");
    $stmtInsertEmp = $pdo->prepare("INSERT INTO " . MANPOWER_EMPLOYEES_TABLE . " (emp_id, name_th, position, department_api, line, is_active, last_sync_at) VALUES (?, ?, ?, ?, ?, 1, GETDATE())");
    $stmtUpdateEmp = $pdo->prepare("UPDATE " . MANPOWER_EMPLOYEES_TABLE . " SET name_th = ?, position = ?, department_api = ?, last_sync_at = GETDATE() WHERE emp_id = ?");
    
    $stmtCheckLog = $pdo->prepare("SELECT log_id, scan_in_time, scan_out_time, is_verified, status FROM " . MANPOWER_DAILY_LOGS_TABLE . " WHERE log_date = ? AND emp_id = ?");
    $stmtInsertLog = $pdo->prepare("INSERT INTO " . MANPOWER_DAILY_LOGS_TABLE . " (log_date, emp_id, scan_in_time, scan_out_time, status, updated_at) VALUES (?, ?, ?, NULL, ?, GETDATE())");
    $stmtUpdateLog = $pdo->prepare("UPDATE " . MANPOWER_DAILY_LOGS_TABLE . " SET scan_in_time = ?, scan_out_time = ?, status = ?, updated_at = GETDATE() WHERE log_id = ?");
    $stmtDeleteGhost = $pdo->prepare("DELETE FROM " . MANPOWER_DAILY_LOGS_TABLE . " WHERE emp_id = ? AND log_date = ? AND is_verified = 0");

    // Load Shifts
    $shifts = [];
    try {
        $stmtShifts = $pdo->query("SELECT shift_id, start_time, late_threshold_minutes FROM " . MANPOWER_SHIFTS_TABLE);
        while ($row = $stmtShifts->fetch(PDO::FETCH_ASSOC)) {
            $shifts[$row['shift_id']] = $row;
        }
    } catch (Exception $ex) {}

    $processedCount = 0;

    foreach ($apiData as $record) {
        $empId = trim($record['EMPID'] ?? '');
        if (empty($empId)) continue;

        $name = trim($record['NAME'] ?? '');
        $position = trim($record['POSITION'] ?? '');
        $deptApi = trim($record['DEPARTMENT'] ?? '');
        $scanTimeRaw = $record['TIMEINOUT'] ?? ''; 
        
        if (empty($scanTimeRaw) || strtotime($scanTimeRaw) === false) continue;
        $scanTs = strtotime($scanTimeRaw);
        
        if (stripos($deptApi, 'TOOLBOX') === false) continue;

        // Logic 1: Date Offset
        $logDate = date('Y-m-d', strtotime('-6 hours', $scanTs));
        
        // Ghost Check
        $calendarDate = date('Y-m-d', $scanTs);
        if ($logDate !== $calendarDate) {
            $stmtDeleteGhost->execute([$empId, $calendarDate]);
        }

        // Upsert Employee
        $stmtCheckEmp->execute([$empId]);
        $existingEmp = $stmtCheckEmp->fetch(PDO::FETCH_ASSOC);
        $defaultShiftId = null;

        if (!$existingEmp) {
            $stmtInsertEmp->execute([$empId, $name, $position, $deptApi, 'TOOLBOX_POOL']);
        } else {
            $stmtUpdateEmp->execute([$name, $position, $deptApi, $empId]);
            $defaultShiftId = $existingEmp['default_shift_id'];
        }

        // Shift Logic
        $scanHour = (int)date('H', $scanTs);
        $isValidIngress = true;
        $lateStatus = 'PRESENT';
        $dayOfWeek = date('w', strtotime($logDate)); 

        $shiftStartTime = '08:00:00';
        $isNightShift = false;

        if ($defaultShiftId && isset($shifts[$defaultShiftId])) {
            $shift = $shifts[$defaultShiftId];
            $shiftStartTime = $shift['start_time'];
            $shiftStartHour = (int)date('H', strtotime($shiftStartTime));
            $isNightShift = ($shiftStartHour >= 15);

            if ($dayOfWeek == 6 && $isNightShift) $shiftStartTime = '17:00:00';

            if ($isNightShift) {
                if ($scanHour >= 6 && $scanHour <= 13) $isValidIngress = false;
            } else {
                if ($scanHour >= 16 && $scanHour <= 23) $isValidIngress = false;
            }
        } else {
            if ($scanHour >= 14) $isValidIngress = false;
        }

        if (!$isValidIngress) continue;

        // --- Compare & Save (Fixed Logic) ---
        $stmtCheckLog->execute([$logDate, $empId]);
        $currentLog = $stmtCheckLog->fetch(PDO::FETCH_ASSOC);

        $shiftStartDateTime = $logDate . ' ' . $shiftStartTime;
        $lateLimit = strtotime("+" . ($shifts[$defaultShiftId]['late_threshold_minutes'] ?? 5) . " minutes", strtotime($shiftStartDateTime));

        if (!$currentLog) {
            // New Record
            if ($scanTs > $lateLimit) $lateStatus = 'LATE';
            $stmtInsertLog->execute([$logDate, $empId, $scanTimeRaw, $lateStatus]);
        } else {
            // Update Existing
            if ($currentLog['is_verified'] == 0) {
                $dbIn = $currentLog['scan_in_time'];
                $dbOut = $currentLog['scan_out_time'];
                
                // [FIX] แปลงเป็น Timestamp หรือ null
                $currentInTs = $dbIn ? strtotime($dbIn) : null;
                $currentOutTs = $dbOut ? strtotime($dbOut) : null;
                
                $newIn = $dbIn;
                $newOut = $dbOut;
                $isUpdated = false;

                // 1. Check Min Time (เวลาเข้า)
                if ($currentInTs === null || $scanTs < $currentInTs) {
                    $newIn = $scanTimeRaw;
                    $isUpdated = true;
                    
                    // Recalculate Late Status
                    if ($scanTs <= $lateLimit) $lateStatus = 'PRESENT';
                    else $lateStatus = 'LATE';
                    
                    // Update reference for next step
                    $currentInTs = $scanTs; 
                } else {
                    $lateStatus = $currentLog['status']; // คงสถานะเดิม
                }

                // 2. Check Max Time (เวลาออก)
                // ต้องมากกว่าเวลาเข้า และ (ยังไม่มีเวลาออก หรือ มากกว่าเวลาออกเดิม)
                if ($currentInTs !== null && $scanTs > $currentInTs) {
                    if ($currentOutTs === null || $scanTs > $currentOutTs) {
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

    // --- Fill Absences ---
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
        'message' => "Sync OK ($processedCount scanned)",
        'stats' => ['valid' => $processedCount]
    ]);

} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Sync Error: ' . $e->getMessage()]);
}
?>