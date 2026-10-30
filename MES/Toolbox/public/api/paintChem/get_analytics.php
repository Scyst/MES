<?php
// MES/page/paintChem/api/get_analytics.php
// Returns time-series trend data and chemical consumption analytics for Paint Chem.

header('Content-Type: application/json; charset=utf-8');
$origin = $_SERVER['HTTP_ORIGIN'] ?? 'https://oem.sncformer.com';
header("Access-Control-Allow-Origin: $origin");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, X-CSRF-TOKEN");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../utils/check_auth.php';

$dateFrom = $_GET['date_from'] ?? '2026-10-01';
$dateTo   = $_GET['date_to']   ?? date('Y-m-d');
$shift    = strtoupper($_GET['shift'] ?? '');

if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $dateFrom) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $dateTo)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'data' => null, 'message' => 'รูปแบบวันที่ไม่ถูกต้อง']);
    exit;
}

try {
    $shiftFilter = in_array($shift, ['DAY', 'NIGHT']) ? "AND h.shift = ?" : "";
    $hParams = [$dateFrom, $dateTo];
    if (in_array($shift, ['DAY', 'NIGHT'])) $hParams[] = $shift;

    // 1. Fetch Headers in date range
    $stmtH = $pdo->prepare("
        SELECT h.header_id, h.log_date, h.shift, h.status,
               h.conveyor_speed, h.bake_oven_temp, h.dry_oven_temp
        FROM dbo.PAINT_CHEM_SHEET_HEADER h
        WHERE h.log_date BETWEEN ? AND ? $shiftFilter
        ORDER BY h.log_date ASC, h.shift ASC
    ");
    $stmtH->execute($hParams);
    $headers = $stmtH->fetchAll(PDO::FETCH_ASSOC);

    if (empty($headers)) {
        echo json_encode([
            'success' => true,
            'data' => [
                'timeline'             => [],
                'dailyChemicalTotals'  => [],
                'kpiSummary'           => [
                    'totalSheets'          => 0,
                    'totalSlots'           => 0,
                    'totalOor'             => 0,
                    'totalChemicalAddedKg' => 0,
                    'avgBakeOvenTemp'      => null,
                    'avgDryOvenTemp'       => null,
                    'avgConveyorSpeed'     => null,
                    'avgDI_EC'             => null
                ],
                'specs'                => []
            ],
            'message' => 'No records found'
        ]);
        exit;
    }

    $headerIds = array_column($headers, 'header_id');
    $headerMap = [];
    foreach ($headers as $h) {
        $headerMap[$h['header_id']] = $h;
    }

    // 2. Fetch all logs for these headers
    $inPlaceholders = implode(',', array_fill(0, count($headerIds), '?'));
    $stmtLogs = $pdo->prepare("
        SELECT header_id, time_slot, station_no, parameter_key,
               before_value, after_value, chemical_added_kg, is_overflow, is_out_of_range
        FROM dbo.PAINT_CHEM_LOG
        WHERE header_id IN ($inPlaceholders)
        ORDER BY header_id ASC, time_slot ASC, station_no ASC
    ");
    $stmtLogs->execute($headerIds);
    $logs = $stmtLogs->fetchAll(PDO::FETCH_ASSOC);

    // 3. Group logs by header_id and time_slot for timeline points
    $groupedSlots = [];
    $totalChemicalAdded = 0.0;
    $totalOorCount = 0;
    $dailyKgMap = [];
    $allBakeTemps = [];
    $allDryTemps = [];
    $allSpeeds = [];
    $allEcValues = [];

    foreach ($logs as $l) {
        $hid = $l['header_id'];
        $slot = $l['time_slot'];
        $key = $hid . '_' . $slot;

        if (!isset($groupedSlots[$key])) {
            $h = $headerMap[$hid];
            $dt = date('d/m', strtotime($h['log_date']));
            $shiftShort = $h['shift'] === 'DAY' ? 'D' : 'N';
            $slotShort = explode('-', $slot)[0];
            $groupedSlots[$key] = [
                'header_id'      => $hid,
                'log_date'       => $h['log_date'],
                'shift'          => $h['shift'],
                'time_slot'      => $slot,
                'label'          => "$dt $slotShort ($shiftShort)",
                'bake_oven_temp' => $h['bake_oven_temp'] ? (float)$h['bake_oven_temp'] : null,
                'dry_oven_temp'  => $h['dry_oven_temp'] ? (float)$h['dry_oven_temp'] : null,
                'conveyor_speed' => $h['conveyor_speed'] ? (float)$h['conveyor_speed'] : null,
            ];
            if ($h['bake_oven_temp']) $allBakeTemps[] = (float)$h['bake_oven_temp'];
            if ($h['dry_oven_temp'])  $allDryTemps[]  = (float)$h['dry_oven_temp'];
            if ($h['conveyor_speed']) $allSpeeds[]    = (float)$h['conveyor_speed'];
        }

        $val = $l['before_value'] !== null ? (float)$l['before_value'] : null;
        $stn = (int)$l['station_no'];
        $paramKey = $l['parameter_key'];

        // Map parameter keys to clear timeline attributes
        if ($stn === 1 && $paramKey === 'F_Al')       $groupedSlots[$key]['F_Al_1'] = $val;
        if ($stn === 2 && $paramKey === 'F_Al')       $groupedSlots[$key]['F_Al_2'] = $val;
        if ($stn === 3 && $paramKey === 'Conta_WR1')  $groupedSlots[$key]['pH_WR1'] = $val;
        if ($stn === 4 && $paramKey === 'Conta_WR2')  $groupedSlots[$key]['pH_WR2'] = $val;
        if ($stn === 5 && $paramKey === 'pH')         $groupedSlots[$key]['pH_SC']  = $val;
        if ($stn === 5 && $paramKey === 'TC')         $groupedSlots[$key]['TC_SC']  = $val;
        if ($stn === 6 && $paramKey === 'FA')         $groupedSlots[$key]['FA_ZP']  = $val;
        if ($stn === 6 && $paramKey === 'TA')         $groupedSlots[$key]['TA_ZP']  = $val;
        if ($stn === 6 && $paramKey === 'AC')         $groupedSlots[$key]['AC_ZP']  = $val;
        if ($stn === 7 && $paramKey === 'Conta_WR3')  $groupedSlots[$key]['pH_WR3'] = $val;
        if ($stn === 8 && $paramKey === 'Conta_WR4')  $groupedSlots[$key]['pH_WR4'] = $val;
        if ($stn === 9 && $paramKey === 'pH_DI')      $groupedSlots[$key]['pH_DI']  = $val;
        if ($stn === 9 && $paramKey === 'EC') {
            $groupedSlots[$key]['EC_DI'] = $val;
            if ($val !== null) $allEcValues[] = $val;
        }
        if ($stn === 9 && $paramKey === 'FlowRate')   $groupedSlots[$key]['FlowRate'] = $val;

        // OOR & Chemical added tracking
        if ($l['is_out_of_range']) {
            $totalOorCount++;
        }
        if ($l['chemical_added_kg'] !== null && (float)$l['chemical_added_kg'] > 0) {
            $kg = (float)$l['chemical_added_kg'];
            $totalChemicalAdded += $kg;
            $h = $headerMap[$hid];
            $d = $h['log_date'];
            if (!isset($dailyKgMap[$d])) {
                $dailyKgMap[$d] = ['log_date' => $d, 'FC_T5008' => 0.0, 'AC_131' => 0.0, 'total' => 0.0];
            }
            if ($stn === 1 || $stn === 2) {
                $dailyKgMap[$d]['FC_T5008'] += $kg;
            } elseif ($stn === 6) {
                $dailyKgMap[$d]['AC_131'] += $kg;
            }
            $dailyKgMap[$d]['total'] += $kg;
        }
    }

    $timeline = array_values($groupedSlots);

    // Sort timeline by log_date and slot start time
    usort($timeline, function($a, $b) {
        $c = strcmp($a['log_date'], $b['log_date']);
        if ($c !== 0) return $c;
        return strcmp($a['time_slot'], $b['time_slot']);
    });

    // 4. Daily chemical totals array
    ksort($dailyKgMap);
    $dailyChemicalTotals = array_values($dailyKgMap);

    // 5. KPI Summary
    $kpiSummary = [
        'totalSheets'          => count($headers),
        'totalSlots'           => count($timeline),
        'totalOor'             => $totalOorCount,
        'totalChemicalAddedKg' => round($totalChemicalAdded, 2),
        'avgBakeOvenTemp'      => count($allBakeTemps) > 0 ? round(array_sum($allBakeTemps) / count($allBakeTemps), 1) : null,
        'avgDryOvenTemp'       => count($allDryTemps) > 0 ? round(array_sum($allDryTemps) / count($allDryTemps), 1) : null,
        'avgConveyorSpeed'     => count($allSpeeds) > 0 ? round(array_sum($allSpeeds) / count($allSpeeds), 2) : null,
        'avgDI_EC'             => count($allEcValues) > 0 ? round(array_sum($allEcValues) / count($allEcValues), 2) : null
    ];

    // 6. Parameter Standards & Specs for reference lines in Recharts
    $specs = [
        'F_Al'         => ['min' => 10.0, 'max' => 12.0, 'unit' => 'pt',   'label' => 'Degreasing (F.Al)'],
        'pH_SC'        => ['min' => 9.0,  'max' => 11.0, 'unit' => '',     'label' => 'Surface Cond. (pH)'],
        'TC_SC'        => ['min' => 2.0,  'max' => 4.0,  'unit' => 'pt',   'label' => 'Surface Cond. (T.C)'],
        'FA_ZP'        => ['min' => 0.3,  'max' => 0.5,  'unit' => 'pt',   'label' => 'Zinc Phosphate (FA)'],
        'TA_ZP'        => ['min' => 23.0, 'max' => 25.0, 'unit' => 'pt',   'label' => 'Zinc Phosphate (TA)'],
        'AC_ZP'        => ['min' => 2.0,  'max' => 4.0,  'unit' => 'pt',   'label' => 'Zinc Phosphate (AC)'],
        'EC_DI'        => ['min' => null, 'max' => 10.0, 'unit' => 'µS/cm', 'label' => 'DI Water (EC)'],
        'BakeOvenTemp' => ['min' => 175.0,'max' => 220.0,'unit' => '°C',   'label' => 'Bake Oven Temp.'],
        'DryOvenTemp'  => ['min' => 140.0,'max' => 160.0,'unit' => '°C',   'label' => 'Dry Oven Temp.'],
        'ConveyorSpeed'=> ['min' => 2.5,  'max' => 5.0,  'unit' => 'm/min', 'label' => 'Conveyor Speed'],
    ];

    echo json_encode([
        'success' => true,
        'data'    => [
            'timeline'            => $timeline,
            'dailyChemicalTotals' => $dailyChemicalTotals,
            'kpiSummary'          => $kpiSummary,
            'specs'               => $specs
        ],
        'message' => 'OK'
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'data' => null, 'message' => 'เกิดข้อผิดพลาดในการคำนวณแนวโน้มสารเคมี']);
}
