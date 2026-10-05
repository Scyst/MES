<?php
// mock_paint_chem.php - Run via CLI
// Usage: php mock_paint_chem.php
require_once __DIR__ . '/../../db.php';

date_default_timezone_set('Asia/Bangkok');
$now = new DateTime();
$hour = (int)$now->format('H');

$logDate = $now->format('Y-m-d');
$shift = ($hour >= 7 && $hour < 20) ? 'DAY' : 'NIGHT';

$slots = [
    'DAY' => ['08:00-09:00', '10:00-11:00', '13:00-14:00', '15:00-16:00', '17:30-18:30', '19:30-20:30'],
    'NIGHT' => ['20:00-22:00', '22:00-00:00', '01:00-03:00', '03:00-05:00', '05:30-07:00', '07:00-08:00']
];

$activeSlot = null;
$hhmm = $now->format('H:i');

// Find the most appropriate slot for current time
foreach (array_reverse($slots[$shift]) as $slot) {
    $start = explode('-', $slot)[0];
    if ($start <= $hhmm) {
        $activeSlot = $slot;
        break;
    }
}
if (!$activeSlot) {
    $activeSlot = $slots[$shift][0];
}

echo "Current Date: $logDate\n";
echo "Current Shift: $shift\n";
echo "Active Slot: $activeSlot\n";

// 1. Ensure Header exists
$stmt = $pdo->prepare("SELECT header_id, bake_oven_temp FROM dbo.PAINT_CHEM_SHEET_HEADER WHERE log_date = ? AND shift = ?");
$stmt->execute([$logDate, $shift]);
$header = $stmt->fetch();

$userId = 1; // Default fallback user
$bakeVal = rand(190, 200);
$dryVal = rand(190, 200);
$speedVal = rand(2, 5) + 0.5;

if (!$header) {
    $stmtIns = $pdo->prepare("
        INSERT INTO dbo.PAINT_CHEM_SHEET_HEADER 
        (log_date, shift, status, prepared_by, bake_oven_temp, dry_oven_temp, conveyor_speed, created_at, updated_at) 
        VALUES (?, ?, 'DRAFT', ?, ?, ?, ?, GETDATE(), GETDATE())
    ");
    $stmtIns->execute([$logDate, $shift, $userId, $bakeVal, $dryVal, $speedVal]);
    $headerId = $pdo->lastInsertId();
    echo "Created new Header ID: $headerId\n";
} else {
    $headerId = $header['header_id'];
    echo "Using existing Header ID: $headerId\n";
    // Also update bake/dry just to show movement? No, wait. 
    // If bake_oven_temp is just a single column, changing it now overwrites the morning value.
    // Let's concatenate if the user wants multiple values? 
    // For now, leave it as is, or update it so it changes.
    $stmtUpd = $pdo->prepare("UPDATE dbo.PAINT_CHEM_SHEET_HEADER SET updated_at = GETDATE() WHERE header_id = ?");
    $stmtUpd->execute([$headerId]);
}

// Stations and Params
$paramConfigs = [
    1 => ['F_Al' => [10, 12], 'Temperature' => [25, 35], 'Pressure' => [0.4, 0.8]],
    2 => ['F_Al' => [10, 12], 'Temperature' => [25, 35], 'Pressure' => [0.4, 0.8]],
    3 => ['Conta_WR1' => [1, 8], 'Pressure' => [0.4, 0.8]],
    4 => ['WaterLevel_WR2' => ['OK', 'OK'], 'Conta_WR2' => [0.1, 1], 'Pressure' => [0.4, 0.8]],
    5 => ['pH' => [9, 11], 'TC' => [2, 4], 'Pressure' => [0.4, 0.8]],
    6 => ['Temperature' => [25, 35], 'FA' => [0.3, 0.5], 'TA' => [23, 25], 'AC' => [2, 4], 'Pressure' => [0.4, 0.8]],
    7 => ['Conta_WR3' => [1, 5], 'Pressure' => [0.4, 0.8], 'WaterLevel_WR3' => ['OK', 'OK']],
    8 => ['Conta_WR4' => [0.1, 0.5], 'Pressure' => [0.4, 0.8]],
    9 => ['EC' => [1, 10], 'FlowRate' => [1.5, 3]],
    10=> ['BakeOvenTemp' => [175, 220], 'DryOvenTemp' => [140, 160], 'ConveyorSpeed' => [2.5, 5.0]]
];

$inserted = 0;
foreach ($paramConfigs as $station => $params) {
    foreach ($params as $key => $range) {
        // Check if exists
        $chk = $pdo->prepare("SELECT log_id FROM dbo.PAINT_CHEM_LOG WHERE header_id = ? AND time_slot = ? AND station_no = ? AND parameter_key = ?");
        $chk->execute([$headerId, $activeSlot, $station, $key]);
        if ($chk->fetch()) {
            continue; // Already logged for this slot
        }

        // Generate value
        if ($range[0] === 'OK') {
            $val = '1'; // or '0' for true/false overflow? The DB uses before_value etc.
            // Wait, overflow is stored in is_overflow (BIT)
            $before = null;
            $overflow = 1; 
        } else {
            // random float within range
            $min = $range[0];
            $max = $range[1];
            $val = round($min + lcg_value() * ($max - $min), 2);
            $before = $val;
            $overflow = 0;
        }

        // 10% chance to have "after_value" and "chemical_added"
        $after = null;
        $kg = null;
        if (rand(1, 10) === 1 && $range[0] !== 'OK') {
            $after = round($val + 0.5, 2);
            $kg = round(rand(1, 10) / 10, 1);
        }

        $ins = $pdo->prepare("
            INSERT INTO dbo.PAINT_CHEM_LOG 
            (header_id, time_slot, station_no, parameter_key, before_value, after_value, chemical_added_kg, is_overflow, recorded_by, recorded_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, GETDATE())
        ");
        $ins->execute([$headerId, $activeSlot, $station, $key, $before, $after, $kg, $overflow, $userId]);
        $inserted++;
    }
}

echo "Inserted $inserted new parameter logs for slot $activeSlot.\n";
