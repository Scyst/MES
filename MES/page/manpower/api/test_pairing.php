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

if (!isset($allScansByEmp['1093103036'])) {
    echo "No scans found for 1093103036\n";
    exit;
}

sort($allScansByEmp['1093103036']);

// Output the scans we got
echo "Raw Scans:\n";
foreach ($allScansByEmp['1093103036'] as $ts) {
    echo date('Y-m-d H:i:s', $ts) . "\n";
}

// Emulate pairing
$empShiftStart = "1970-01-01 20:00:00";
$shiftStartHour = (int)date('G', strtotime($empShiftStart));
$isNightShift = ($shiftStartHour >= 15 || $shiftStartHour < 3);

$MIN_GAP = 2700;
$MAX_GAP = 57600;
$sessionsByEmpDate = [];

$empId = '1093103036';
$scans = $allScansByEmp[$empId];
$currentIn = null;

foreach ($scans as $ts) {
    $hour = (int)date('G', $ts);
    $likelyIn = $isNightShift ? ($hour >= 14 || $hour < 3) : ($hour >= 3 && $hour < 14);

    if ($currentIn === null) {
        if ($likelyIn) {
            $currentIn = $ts;
        }
    } else {
        $gap = $ts - $currentIn;
        if ($gap > $MAX_GAP) {
            $logDate = date('Y-m-d', $currentIn);
            if (!isset($sessionsByEmpDate[$empId][$logDate])) {
                $sessionsByEmpDate[$empId][$logDate] = ['in' => $currentIn, 'out' => null];
            }
            $currentIn = $likelyIn ? $ts : null;
        } else if ($gap > $MIN_GAP) {
            $logDate = date('Y-m-d', $currentIn);
            if (!isset($sessionsByEmpDate[$empId][$logDate])) {
                $sessionsByEmpDate[$empId][$logDate] = ['in' => $currentIn, 'out' => $ts];
            }
            $currentIn = null;
        }
    }
}

if ($currentIn !== null) {
    $logDate = date('Y-m-d', $currentIn);
    if (!isset($sessionsByEmpDate[$empId][$logDate])) {
        $sessionsByEmpDate[$empId][$logDate] = ['in' => $currentIn, 'out' => null];
    }
}

echo "\nSessions:\n";
print_r(array_map(function($dates) {
    return array_map(function($sess) {
        return ['in' => $sess['in'] ? date('Y-m-d H:i:s', $sess['in']) : null, 'out' => $sess['out'] ? date('Y-m-d H:i:s', $sess['out']) : null];
    }, $dates);
}, $sessionsByEmpDate));
