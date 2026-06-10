<?php
require 'db.php';

$startDate = '2026-06-08';
$endDate = '2026-06-10';

// Mock the API fetching to get real scans
$apiUrl = "https://oem.sncformer.com/api/attendance?startDate=$startDate&endDate=$endDate";
$ch = curl_init($apiUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
$response = curl_exec($ch);
curl_close($ch);

$apiData = json_decode($response, true);
$allScansByEmp = [];

if ($apiData && isset($apiData['data'])) {
    foreach ($apiData['data'] as $empId => $info) {
        $apiEmpId = strval($empId);
        if ($apiEmpId === '1093103036') {
            if (isset($info['SCANS']) && is_array($info['SCANS'])) {
                foreach ($info['SCANS'] as $scanTime) {
                    $allScansByEmp[$apiEmpId][] = strtotime($scanTime);
                }
            }
        }
    }
}

sort($allScansByEmp['1093103036']);

// Output the scans we got
echo "Raw Scans:\n";
foreach ($allScansByEmp['1093103036'] as $ts) {
    echo date('Y-m-d H:i:s', $ts) . "\n";
}

$stmtEmp = $pdo->query("SELECT default_shift_id FROM dbo.MANPOWER_EMPLOYEES WHERE emp_id = '1093103036'");
$empRow = $stmtEmp->fetch(PDO::FETCH_ASSOC);
$empShiftId = $empRow['default_shift_id'];

$stmtShifts = $pdo->query("SELECT shift_id, start_time FROM dbo.MANPOWER_SHIFTS");
$shiftConfig = [];
while ($row = $stmtShifts->fetch(PDO::FETCH_ASSOC)) { 
    $shiftConfig[$row['shift_id']] = $row['start_time']; 
}

$empShiftStart = $shiftConfig[$empShiftId] ?? '08:00:00';

$shiftStartHour = 8;
if (preg_match('/(?:T| )(\d{2}):/', $empShiftStart, $m)) {
    $shiftStartHour = (int)$m[1];
} else if (preg_match('/^(\d{2}):/', $empShiftStart, $m)) {
    $shiftStartHour = (int)$m[1];
}

$isNightShift = ($shiftStartHour >= 15 || $shiftStartHour < 3);

echo "\nLogic Trace:\n";
echo "empShiftId: $empShiftId\n";
echo "empShiftStart: $empShiftStart\n";
echo "shiftStartHour: $shiftStartHour\n";
echo "isNightShift: " . ($isNightShift ? "TRUE" : "FALSE") . "\n";

$MIN_GAP = 2700;
$MAX_GAP = 57600;
$sessionsByEmpDate = [];

$empId = '1093103036';
$scans = $allScansByEmp[$empId];
$currentIn = null;

foreach ($scans as $ts) {
    $hour = (int)date('G', $ts);
    $likelyIn = $isNightShift ? ($hour >= 14 || $hour < 3) : ($hour >= 3 && $hour < 14);

    echo "\nScan: " . date('Y-m-d H:i:s', $ts) . " (Hour $hour)\n";
    echo "likelyIn: " . ($likelyIn ? "TRUE" : "FALSE") . "\n";

    if ($currentIn === null) {
        if ($likelyIn) {
            $currentIn = $ts;
            echo "-> Action: Start new session\n";
        } else {
            echo "-> Action: Skip (Orphan OUT)\n";
        }
    } else {
        $gap = $ts - $currentIn;
        echo "gap = $gap seconds\n";
        if ($gap > $MAX_GAP) {
            $logDate = date('Y-m-d', $currentIn);
            if (!isset($sessionsByEmpDate[$empId][$logDate])) {
                $sessionsByEmpDate[$empId][$logDate] = ['in' => $currentIn, 'out' => null];
            }
            $currentIn = $likelyIn ? $ts : null;
            echo "-> Action: Gap > MAX. Close old session on $logDate. currentIn = " . ($currentIn ? date('Y-m-d H:i:s', $currentIn) : "NULL") . "\n";
        } else if ($gap > $MIN_GAP) {
            $logDate = date('Y-m-d', $currentIn);
            if (!isset($sessionsByEmpDate[$empId][$logDate])) {
                $sessionsByEmpDate[$empId][$logDate] = ['in' => $currentIn, 'out' => $ts];
            }
            $currentIn = null;
            echo "-> Action: Gap > MIN. Normal OUT on $logDate. currentIn = NULL\n";
        } else {
            echo "-> Action: Gap <= MIN. Skip (Bounce)\n";
        }
    }
}

if ($currentIn !== null) {
    $logDate = date('Y-m-d', $currentIn);
    if (!isset($sessionsByEmpDate[$empId][$logDate])) {
        $sessionsByEmpDate[$empId][$logDate] = ['in' => $currentIn, 'out' => null];
    }
    echo "\n-> Action: Leftover currentIn, close on $logDate\n";
}

echo "\nSessions:\n";
print_r(array_map(function($dates) {
    return array_map(function($sess) {
        return ['in' => $sess['in'] ? date('Y-m-d H:i:s', $sess['in']) : null, 'out' => $sess['out'] ? date('Y-m-d H:i:s', $sess['out']) : null];
    }, $dates);
}, $sessionsByEmpDate));
