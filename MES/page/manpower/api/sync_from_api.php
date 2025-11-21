<?php
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

$apiUrl = "https://oem.sncformer.com/oem-calendar/oem-web-link/api/api.php?router=/man-power-painting&sdate={$startDate}&edate={$endDate}";

try {
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $apiUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    $response = curl_exec($ch);
    curl_close($ch);

    if (!$response) throw new Exception("Failed to connect to API.");
    $apiData = json_decode($response, true);
    
    if (!is_array($apiData)) $apiData = [];

    // ตัวแปรเก็บสถิติ
    $stats = [
        'range' => "$startDate to $endDate",
        'total_api_records' => count($apiData),
        'toolbox_imported' => 0, // คนใหม่ที่เพิ่ม
        'toolbox_updated' => 0,  // คนเก่าที่อัปเดต
        'logs_recorded' => 0,    // จำนวนวันที่ลงเวลา
        'others_skipped' => 0    // คนนอกที่ข้ามไป
    ];

    $existingEmpMap = [];
    $stmt = $pdo->query("SELECT emp_id, name_th, line FROM " . MANPOWER_EMPLOYEES_TABLE);
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) { $existingEmpMap[$row['emp_id']] = $row; }

    $existingUserMap = [];
    $stmt = $pdo->query("SELECT emp_id FROM " . USERS_TABLE . " WHERE emp_id IS NOT NULL");
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) { $existingUserMap[$row['emp_id']] = true; }

    $existingLogMap = [];
    $stmt = $pdo->prepare("SELECT emp_id, log_date, log_id, scan_in_time, is_verified FROM " . MANPOWER_DAILY_LOGS_TABLE . " WHERE log_date BETWEEN ? AND ?");
    $stmt->execute([$startDate, $endDate]);
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $key = $row['emp_id'] . '_' . $row['log_date'];
        $existingLogMap[$key] = $row;
    }

    $pdo->beginTransaction();

    $stmtInsertEmp = $pdo->prepare("INSERT INTO " . MANPOWER_EMPLOYEES_TABLE . " (emp_id, name_th, position, department_api, line, is_active, last_sync_at) VALUES (?, ?, ?, ?, ?, 1, GETDATE())");
    $stmtUpdateEmp = $pdo->prepare("UPDATE " . MANPOWER_EMPLOYEES_TABLE . " SET name_th = ?, position = ?, department_api = ?, last_sync_at = GETDATE() WHERE emp_id = ?");
    
    $stmtInsertUser = $pdo->prepare("INSERT INTO " . USERS_TABLE . " (username, password, role, line, emp_id, is_auto_generated, created_at) VALUES (?, ?, ?, ?, ?, 1, GETDATE())");
    
    $stmtInsertLog = $pdo->prepare("INSERT INTO " . MANPOWER_DAILY_LOGS_TABLE . " (log_date, emp_id, scan_in_time, status, updated_at) VALUES (?, ?, ?, 'PRESENT', GETDATE())");
    $stmtUpdateLog = $pdo->prepare("UPDATE " . MANPOWER_DAILY_LOGS_TABLE . " SET scan_in_time = ?, updated_at = GETDATE() WHERE log_id = ?");

    foreach ($apiData as $record) {
        $empId = trim($record['EMPID']);
        $name = trim($record['NAME']);
        $position = trim($record['POSITION']);
        $deptApi = trim($record['DEPARTMENT']);
        $scanTime = $record['TIMEINOUT'];
        $logDate = date('Y-m-d', strtotime($scanTime));

        if (stripos($deptApi, 'TOOLBOX') === false) {
            $stats['others_skipped']++;
            continue;
        }

        if (!isset($existingEmpMap[$empId])) {
            $initialLine = 'TOOLBOX_POOL'; 
            $stmtInsertEmp->execute([$empId, $name, $position, $deptApi, $initialLine]);
            $existingEmpMap[$empId] = ['line' => $initialLine];
            $stats['toolbox_imported']++;
        } else {
            $stmtUpdateEmp->execute([$name, $position, $deptApi, $empId]);
            $stats['toolbox_updated']++;
        }
        
        $currentLine = $existingEmpMap[$empId]['line'] ?? 'TOOLBOX_POOL';

        if (!isset($existingUserMap[$empId])) {
            $rawPass = (strlen($empId) >= 4) ? substr($empId, -4) : $empId;
            $hashedPass = password_hash($rawPass, PASSWORD_DEFAULT);
            $initRole = (stripos($position, 'หัวหน้า') !== false || stripos($position, 'Manager') !== false) ? 'supervisor' : 'operator';

            $stmtInsertUser->execute([$empId, $hashedPass, $initRole, $currentLine, $empId]);
            $existingUserMap[$empId] = true;
        }

        $logKey = $empId . '_' . $logDate;
        
        if (!isset($existingLogMap[$logKey])) {
            $stmtInsertLog->execute([$logDate, $empId, $scanTime]);
            $existingLogMap[$logKey] = ['scan_in_time' => $scanTime, 'is_verified' => 0, 'log_id' => 0];
            $stats['logs_recorded']++;
        } else {
            $currLog = $existingLogMap[$logKey];
            if ($currLog['is_verified'] == 0) {
                $oldTime = strtotime($currLog['scan_in_time']);
                $newTime = strtotime($scanTime);
                if ($newTime < $oldTime) {
                    $stmtUpdateLog->execute([$scanTime, $currLog['log_id']]);
                    $existingLogMap[$logKey]['scan_in_time'] = $scanTime;
                }
            }
        }
    }

    $pdo->commit();

    echo json_encode([
        'success' => true,
        'message' => "Sync Completed ({$startDate} to {$endDate})",
        'stats' => $stats
    ]);

} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>