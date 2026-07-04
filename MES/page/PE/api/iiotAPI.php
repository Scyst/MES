<?php
// MES/page/PE/api/iiotAPI.php
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../../db.php';
$action = $_GET['action'] ?? '';
if ($action === 'update_telemetry' || $action === 'snapshot_iiot_telemetry') {
    define('ALLOW_GUEST_ACCESS', true);
}

require_once __DIR__ . '/../../components/init.php';

try {
    switch ($action) {
        case 'update_telemetry':
            // Called by Python Background Daemon
            // Accept JSON POST
            $inputRaw = file_get_contents('php://input');
            $data = json_decode($inputRaw, true);
            
            if (!$data || !isset($data['topic_name'])) {
                throw new Exception("Invalid telemetry data format (topic_name required)");
            }

            $topicName = trim($data['topic_name']);
            $nowStr = date('Y-m-d H:i:s');
            
            // UPSERT into Discovery Table
            $discCheck = $pdo->prepare("SELECT topic_name FROM PE_IIOT_DISCOVERY WHERE topic_name = ?");
            $discCheck->execute([$topicName]);
            if ($discCheck->fetch()) {
                $discUpdate = $pdo->prepare("UPDATE PE_IIOT_DISCOVERY SET last_payload = ?, last_seen = ? WHERE topic_name = ?");
                $discUpdate->execute([json_encode($data), $nowStr, $topicName]);
            } else {
                $discInsert = $pdo->prepare("INSERT INTO PE_IIOT_DISCOVERY (topic_name, last_payload, last_seen) VALUES (?, ?, ?)");
                $discInsert->execute([$topicName, json_encode($data), $nowStr]);
            }

            // Lookup machine_code from mqtt_topic
            $lookupStmt = $pdo->prepare("SELECT machine_code FROM " . PE_MACHINES_TABLE . " WHERE mqtt_topic = ? AND is_active = 1");
            $lookupStmt->execute([$topicName]);
            $machineRow = $lookupStmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$machineRow) {
                // Ignore gracefully if no machine is configured for this topic
                echo json_encode(['success' => true, 'message' => 'Topic ignored (no machine mapped)']);
                exit;
            }

            $machineCode = $machineRow['machine_code'];
            $liveStatus = $data['live_status'] ?? null;
            $liveCounter = isset($data['live_counter']) ? (int)$data['live_counter'] : null;
            $liveTotal = isset($data['live_total']) ? (int)$data['live_total'] : null;
            $cycleTime = isset($data['cycle_time']) ? (float)$data['cycle_time'] : null;
            $powerKw = isset($data['power_kw']) ? (float)$data['power_kw'] : null;
            $voltage = isset($data['voltage']) ? (float)$data['voltage'] : null;
            $currentA = isset($data['current_a']) ? (float)$data['current_a'] : null;
            $powerFactor = isset($data['power_factor']) ? (float)$data['power_factor'] : null;
            $cumulativeKwh = isset($data['cumulative_kwh']) ? (float)$data['cumulative_kwh'] : null;
            $flowRate = isset($data['flow_rate']) ? (float)$data['flow_rate'] : null;
            $velocity = isset($data['velocity']) ? (float)$data['velocity'] : null;
            $cumulativeFlow = isset($data['cumulative_flow']) ? (float)$data['cumulative_flow'] : null;
            $now = date('Y-m-d H:i:s');

            // Upsert Logic
            $checkSql = "SELECT machine_code FROM PE_IIOT_TELEMETRY WHERE machine_code = ?";
            $checkStmt = $pdo->prepare($checkSql);
            $checkStmt->execute([$machineCode]);
            
            if ($checkStmt->fetch()) {
                // Update
                $updateFields = ["last_updated = ?"];
                $updateParams = [$now];

                if ($liveStatus !== null) { $updateFields[] = "live_status = ?"; $updateParams[] = $liveStatus; }
                if ($liveCounter !== null) { $updateFields[] = "live_counter = ?"; $updateParams[] = $liveCounter; }
                if ($liveTotal !== null) { $updateFields[] = "live_total = ?"; $updateParams[] = $liveTotal; }
                if ($cycleTime !== null) { $updateFields[] = "cycle_time = ?"; $updateParams[] = $cycleTime; }
                if ($powerKw !== null) { $updateFields[] = "power_kw = ?"; $updateParams[] = $powerKw; }
                if ($voltage !== null) { $updateFields[] = "voltage = ?"; $updateParams[] = $voltage; }
                if ($currentA !== null) { $updateFields[] = "current_a = ?"; $updateParams[] = $currentA; }
                if ($powerFactor !== null) { $updateFields[] = "power_factor = ?"; $updateParams[] = $powerFactor; }
                if ($cumulativeKwh !== null) { $updateFields[] = "cumulative_kwh = ?"; $updateParams[] = $cumulativeKwh; }
                if ($flowRate !== null) { $updateFields[] = "flow_rate = ?"; $updateParams[] = $flowRate; }
                if ($velocity !== null) { $updateFields[] = "velocity = ?"; $updateParams[] = $velocity; }
                if ($cumulativeFlow !== null) { $updateFields[] = "cumulative_flow = ?"; $updateParams[] = $cumulativeFlow; }
                
                $updateParams[] = $machineCode; // WHERE

                $sql = "UPDATE PE_IIOT_TELEMETRY SET " . implode(", ", $updateFields) . " WHERE machine_code = ?";
                $stmt = $pdo->prepare($sql);
                $stmt->execute($updateParams);
            } else {
                // Insert
                $sql = "INSERT INTO PE_IIOT_TELEMETRY 
                        (machine_code, live_status, live_counter, live_total, cycle_time, power_kw, voltage, current_a, power_factor, cumulative_kwh, flow_rate, velocity, cumulative_flow, last_updated)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([
                    $machineCode, $liveStatus, $liveCounter, $liveTotal, $cycleTime, $powerKw, $voltage, $currentA, $powerFactor, $cumulativeKwh, $flowRate, $velocity, $cumulativeFlow, $now
                ]);
            }

            echo json_encode(['success' => true, 'message' => 'Telemetry updated']);
            break;

        case 'get_live_telemetry':
            // Called by Frontend JS (e.g. machineModule.js)
            // Fetch all telemetry data
            $sql = "SELECT * FROM PE_IIOT_TELEMETRY WITH (NOLOCK) WHERE last_updated >= DATEADD(MINUTE, -5, GETDATE())";
            $stmt = $pdo->query($sql);
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Map by machine_code for easy JS access
            $mapped = [];
            foreach ($data as $row) {
                $base = isset($row['shift_baseline_counter']) ? (int)$row['shift_baseline_counter'] : 0;
                $live = (int)$row['live_counter'];
                $row['net_counter'] = ($live >= $base) ? ($live - $base) : $live;
                
                $mapped[$row['machine_code']] = $row;
            }

            echo json_encode(['success' => true, 'data' => $mapped]);
            break;

        case 'get_discovery_topics':
            $sql = "SELECT d.topic_name, d.last_payload, d.last_seen, m.machine_code 
                    FROM PE_IIOT_DISCOVERY d WITH (NOLOCK)
                    LEFT JOIN " . PE_MACHINES_TABLE . " m WITH (NOLOCK) ON d.topic_name = m.mqtt_topic AND m.is_active = 1
                    ORDER BY d.last_seen DESC";
            $stmt = $pdo->query($sql);
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // decode json payload
            foreach ($data as &$row) {
                if ($row['last_payload']) {
                    $row['payload_obj'] = json_decode($row['last_payload'], true);
                }
            }
            
            echo json_encode(['success' => true, 'data' => $data]);
            break;

        case 'get_availability_stats':
            // Calculate Availability based on total elapsed time for the shift day (08:00 to 07:59)
            $reqDate = isset($_GET['date']) ? $_GET['date'] : null;
            
            if ($reqDate) {
                // Historical data for a specific date
                $shiftStart = strtotime($reqDate . ' 08:00:00');
                $shiftEnd = strtotime($reqDate . ' 08:00:00 +1 day');
                $totalPassedSeconds = 86400; // Full 24 hours
                $evalEndTime = $shiftEnd; // For past dates, the "end" of the timeline is the end of the shift
            } else {
                // Live current data
                $now = time();
                $hour = (int)date('H');
                
                if ($hour >= 8) {
                    $shiftStart = strtotime(date('Y-m-d') . ' 08:00:00');
                } else {
                    $shiftStart = strtotime(date('Y-m-d', strtotime('-1 day')) . ' 08:00:00');
                }
                
                $totalPassedSeconds = max(1, $now - $shiftStart);
                $evalEndTime = $now;
            }
            
            $shiftStartDateStr = date('Y-m-d H:i:s', $shiftStart);
            $shiftEndDateStr = date('Y-m-d H:i:s', $shiftStart + 86400);
            
            // Get all logs starting from the shift, plus any logs that started before the shift but ended during the shift (or are still active)
            $sql = "SELECT machine_code, status, start_time, end_time, duration_seconds
                    FROM PE_IIOT_STATE_LOG WITH (NOLOCK)
                    WHERE (start_time >= ? AND start_time < ?) 
                       OR (start_time < ? AND (end_time >= ? OR end_time IS NULL))";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$shiftStartDateStr, $shiftEndDateStr, $shiftStartDateStr, $shiftStartDateStr]);
            $logs = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $machineStats = [];
            
            foreach ($logs as $log) {
                $mc = $log['machine_code'];
                if (!isset($machineStats[$mc])) {
                    $machineStats[$mc] = [
                        'total_online_seconds' => 0,
                        'total_offline_seconds' => 0
                    ];
                }
                
                // Adjust start and end times to shift boundary
                $st = strtotime($log['start_time']);
                if ($st < $shiftStart) $st = $shiftStart;
                
                $et = $log['end_time'] ? strtotime($log['end_time']) : $evalEndTime;
                if ($et > ($shiftStart + 86400)) $et = $shiftStart + 86400; // Cap at the end of the shift
                
                $duration = max(0, $et - $st);
                
                $s = strtoupper($log['status']);
                if (strpos($s, 'RUN') !== false || strpos($s, 'ON') !== false) {
                    $machineStats[$mc]['total_online_seconds'] += $duration;
                } else {
                    $machineStats[$mc]['total_offline_seconds'] += $duration;
                }
            }
            
            // Format result
            $result = [];
            foreach ($machineStats as $mc => $stats) {
                $avail = min(100, ($stats['total_online_seconds'] / $totalPassedSeconds) * 100);
                $result[$mc] = [
                    'availability_percent' => round($avail, 1),
                    'total_online_seconds' => $stats['total_online_seconds'],
                    'total_offline_seconds' => $stats['total_offline_seconds'],
                    'total_passed_seconds' => $totalPassedSeconds
                ];
            }
            
            echo json_encode(['success' => true, 'data' => $result]);
            break;

        case 'get_debug':
            $currStatusStmt = $pdo->prepare("SELECT TOP 1 status FROM PE_IIOT_STATE_LOG WHERE machine_code = 'BEND-001' ORDER BY start_time DESC");
            $currStatusStmt->execute();
            $lastLog = $currStatusStmt->fetch(PDO::FETCH_ASSOC);
            $oldStatus = $lastLog ? $lastLog['status'] : null;
            echo json_encode(['old' => $oldStatus]);
            break;

                case 'get_iiot_oee_stats':
            $reqDate = isset($_GET['date']) ? $_GET['date'] : null;
            $reqMachine = isset($_GET['machine']) ? $_GET['machine'] : null;
            
            if ($reqDate) {
                $shiftStart = strtotime($reqDate . ' 08:00:00');
                $shiftEnd = strtotime($reqDate . ' 08:00:00 +1 day');
                $totalPassedSeconds = 86400;
                $evalEndTime = $shiftEnd;
            } else {
                $now = time();
                $hour = (int)date('H');
                if ($hour >= 8) {
                    $shiftStart = strtotime(date('Y-m-d') . ' 08:00:00');
                } else {
                    $shiftStart = strtotime(date('Y-m-d', strtotime('-1 day')) . ' 08:00:00');
                }
                $totalPassedSeconds = max(1, $now - $shiftStart);
                $evalEndTime = $now;
            }
            
            $shiftStartDateStr = date('Y-m-d H:i:s', $shiftStart);
            $shiftEndDateStr = date('Y-m-d H:i:s', $shiftStart + 86400);
            
            // 1. Get Availability from PE_IIOT_STATE_LOG
            $sqlAvail = "SELECT machine_code, status, start_time, end_time, duration_seconds
                    FROM PE_IIOT_STATE_LOG WITH (NOLOCK)
                    WHERE ((start_time >= ? AND start_time < ?) 
                       OR (start_time < ? AND (end_time >= ? OR end_time IS NULL)))";
            $params = [$shiftStartDateStr, $shiftEndDateStr, $shiftStartDateStr, $shiftStartDateStr];
            
            if ($reqMachine) {
                $sqlAvail .= " AND machine_code = ?";
                $params[] = $reqMachine;
            }
            
            $stmt = $pdo->prepare($sqlAvail);
            $stmt->execute($params);
            $logs = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $machineStats = [];
            foreach ($logs as $log) {
                $mc = $log['machine_code'];
                if (!isset($machineStats[$mc])) {
                    $machineStats[$mc] = [
                        'total_online_seconds' => 0,
                        'total_offline_seconds' => 0,
                        'live_counter' => 0,
                        'defects' => 0,
                        'planned_output_ph' => 0
                    ];
                }
                
                $st = strtotime($log['start_time']);
                if ($st < $shiftStart) $st = $shiftStart;
                
                $et = $log['end_time'] ? strtotime($log['end_time']) : $evalEndTime;
                if ($et > ($shiftStart + 86400)) $et = $shiftStart + 86400;
                
                $duration = max(0, $et - $st);
                
                $s = strtoupper($log['status']);
                if (strpos($s, 'RUN') !== false || strpos($s, 'ON') !== false) {
                    $machineStats[$mc]['total_online_seconds'] += $duration;
                } else {
                    $machineStats[$mc]['total_offline_seconds'] += $duration;
                }
            }

            // If a specific machine is requested but has no logs, initialize it
            if ($reqMachine && !isset($machineStats[$reqMachine])) {
                $machineStats[$reqMachine] = [
                    'total_online_seconds' => 0,
                    'total_offline_seconds' => 0,
                    'live_counter' => 0,
                    'defects' => 0,
                    'planned_output_ph' => 0
                ];
            }
            
            // Add fallback for missing state logs (assume current state since shift start)
            $telStatusStmt = $pdo->query("SELECT machine_code, live_status FROM PE_IIOT_TELEMETRY WITH (NOLOCK)");
            $telStatuses = [];
            while($row = $telStatusStmt->fetch(PDO::FETCH_ASSOC)) {
                $telStatuses[$row['machine_code']] = strtoupper($row['live_status']);
            }
            
            foreach ($machineStats as $mc => &$stats) {
                if ($stats['total_online_seconds'] == 0 && $stats['total_offline_seconds'] == 0) {
                    $s = $telStatuses[$mc] ?? 'OFFLINE';
                    if (strpos($s, 'RUN') !== false || strpos($s, 'ON') !== false) {
                        $stats['total_online_seconds'] = $totalPassedSeconds;
                    } else {
                        $stats['total_offline_seconds'] = $totalPassedSeconds;
                    }
                }
            }
            
            // For each machine, get Live Counter (from IIoT or History) and Planned Output (from Routes)
            foreach ($machineStats as $mc => &$stats) {
                // Determine whether to get Live Telemetry (Today) or Historical Production
                if ($reqDate && $reqDate < date('Y-m-d')) {
                    // Fetch from STOCK_TRANSACTIONS (PRODUCTION_FG)
                    $histProdSql = "
                        SELECT ISNULL(SUM(ABS(t.quantity)), 0) as good_prod
                        FROM STOCK_TRANSACTIONS t WITH (NOLOCK)
                        LEFT JOIN LOCATIONS l WITH (NOLOCK) ON t.to_location_id = l.location_id
                        LEFT JOIN PE_MACHINES m WITH (NOLOCK) ON l.production_line = m.line
                        WHERE m.machine_code = ? 
                          AND t.transaction_type = 'PRODUCTION_FG'
                          AND t.transaction_timestamp >= ? AND t.transaction_timestamp < ?
                    ";
                    $histProdStmt = $pdo->prepare($histProdSql);
                    $histProdStmt->execute([$mc, $shiftStartDateStr, $shiftEndDateStr]);
                    $histProd = $histProdStmt->fetch(PDO::FETCH_ASSOC);
                    $stats['live_counter'] = $histProd ? (int)$histProd['good_prod'] : 0;
                } else {
                    // Get Live Counter (Calculate Net Production using Baseline)
                    $telStmt = $pdo->prepare("SELECT live_counter, shift_baseline_counter FROM PE_IIOT_TELEMETRY WITH (NOLOCK) WHERE machine_code = ?");
                    $telStmt->execute([$mc]);
                    $tel = $telStmt->fetch(PDO::FETCH_ASSOC);
                    
                    $live = $tel ? (int)$tel['live_counter'] : 0;
                    $base = $tel ? (int)$tel['shift_baseline_counter'] : 0;
                    $stats['live_counter'] = ($live >= $base) ? ($live - $base) : $live;
                }
                
                // Get planned output and strokes for the current active item on this machine
                // (Approximation: average planned output for this line)
                $routeStmt = $pdo->prepare("
                    SELECT TOP 1 r.planned_output, ISNULL(i.strokes_per_part, 1) as strokes_per_part
                    FROM PE_MACHINES m WITH (NOLOCK)
                    LEFT JOIN MANUFACTURING_ROUTES r WITH (NOLOCK) ON m.line = r.line
                    LEFT JOIN ITEMS i WITH (NOLOCK) ON r.item_id = i.item_id
                    WHERE m.machine_code = ? AND r.planned_output > 0
                ");
                $routeStmt->execute([$mc]);
                $route = $routeStmt->fetch(PDO::FETCH_ASSOC);
                $stats['planned_output_ph'] = $route ? (float)$route['planned_output'] : 0;
                
                // Fallback for missing routes so OEE isn't 0
                if ($stats['planned_output_ph'] <= 0) {
                    $stats['planned_output_ph'] = 300; // Default 300 parts per hour
                }
                $strokes = $route ? (int)$route['strokes_per_part'] : 1;
                if ($strokes > 1) {
                    $stats['live_counter'] = floor($stats['live_counter'] / $strokes);
                }
                
                // Get defects from STOCK_TRANSACTIONS (Hold + Scrap)
                $defSql = "
                    SELECT ISNULL(SUM(ABS(t.quantity)), 0) as defects
                    FROM STOCK_TRANSACTIONS t WITH (NOLOCK)
                    LEFT JOIN LOCATIONS l WITH (NOLOCK) ON t.to_location_id = l.location_id
                    LEFT JOIN PE_MACHINES m WITH (NOLOCK) ON l.production_line = m.line
                    WHERE m.machine_code = ? 
                      AND t.transaction_type IN ('PRODUCTION_HOLD', 'PRODUCTION_SCRAP')
                      AND t.transaction_timestamp >= ? AND t.transaction_timestamp < ?
                ";
                $defStmt = $pdo->prepare($defSql);
                $defStmt->execute([$mc, $shiftStartDateStr, $shiftEndDateStr]);
                $def = $defStmt->fetch(PDO::FETCH_ASSOC);
                $stats['defects'] = $def ? (float)$def['defects'] : 0;
            }
            unset($stats);
            
            // Calculate final OEE metrics
            $result = [];
            foreach ($machineStats as $mc => $stats) {
                // Availability
                $avail = min(100, ($stats['total_online_seconds'] / $totalPassedSeconds) * 100);
                
                // Performance
                $expectedOutput = 0;
                if ($stats['planned_output_ph'] > 0) {
                    $expectedOutput = ($stats['total_online_seconds'] / 3600) * $stats['planned_output_ph'];
                }
                
                $perf = 0;
                if ($expectedOutput > 0) {
                    $perf = ($stats['live_counter'] / $expectedOutput) * 100;
                }
                $perf = min(100, $perf); // Cap at 100%
                
                // Quality
                $qual = 100;
                if ($stats['live_counter'] > 0) {
                    $good = max(0, $stats['live_counter'] - $stats['defects']);
                    $qual = ($good / $stats['live_counter']) * 100;
                }
                $qual = min(100, $qual);
                
                // OEE
                $oee = ($avail / 100) * ($perf / 100) * ($qual / 100) * 100;
                
                $result[$mc] = [
                    'availability' => round($avail, 1),
                    'performance' => round($perf, 1),
                    'quality' => round($qual, 1),
                    'oee' => round($oee, 1),
                    'total_online_seconds' => $stats['total_online_seconds'],
                    'total_passed_seconds' => $totalPassedSeconds,
                    'live_counter' => $stats['live_counter'],
                    'defects' => $stats['defects'],
                    'expected_output' => round($expectedOutput, 0)
                ];
            }
            
            echo json_encode(['success' => true, 'data' => $result]);
            break;

        case 'get_production_overview':
            $reqDate = isset($_GET['date']) ? $_GET['date'] : null;
            
            if ($reqDate) {
                $shiftStart = strtotime($reqDate . ' 08:00:00');
                $shiftEnd = strtotime($reqDate . ' 08:00:00 +1 day');
                $totalPassedSeconds = 86400;
                $evalEndTime = $shiftEnd;
            } else {
                $now = time();
                $hour = (int)date('H');
                if ($hour >= 8) {
                    $shiftStart = strtotime(date('Y-m-d') . ' 08:00:00');
                } else {
                    $shiftStart = strtotime(date('Y-m-d', strtotime('-1 day')) . ' 08:00:00');
                }
                $totalPassedSeconds = max(1, $now - $shiftStart);
                $evalEndTime = $now;
            }
            
            $shiftStartDateStr = date('Y-m-d H:i:s', $shiftStart);
            $shiftEndDateStr = date('Y-m-d H:i:s', $shiftStart + 86400);

            // 1. Get all active machines with their live status
            $sql = "
                SELECT 
                    m.line,
                    m.machine_code,
                    m.mqtt_topic,
                    t.live_status,
                    t.last_updated,
                    t.live_counter,
                    t.shift_baseline_counter
                FROM " . PE_MACHINES_TABLE . " m WITH (NOLOCK)
                LEFT JOIN PE_IIOT_TELEMETRY t WITH (NOLOCK) ON m.machine_code = t.machine_code
                WHERE m.is_active = 1
            ";
            $stmt = $pdo->query($sql);
            $machines = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // 2. Get planned output and strokes for routes
            $routeStmt = $pdo->query("
                SELECT r.line, MAX(r.planned_output) as planned_output, MAX(ISNULL(i.strokes_per_part, 1)) as strokes_per_part 
                FROM MANUFACTURING_ROUTES r WITH (NOLOCK) 
                LEFT JOIN ITEMS i WITH (NOLOCK) ON r.item_id = i.item_id
                WHERE r.planned_output > 0 
                GROUP BY r.line
            ");
            $routes = [];
            $strokesMap = [];
            while ($r = $routeStmt->fetch(PDO::FETCH_ASSOC)) {
                $routes[$r['line']] = (float)$r['planned_output'];
                $strokesMap[$r['line']] = (int)$r['strokes_per_part'];
            }

            // 3. Get Availability stats from State Log
            $sqlAvail = "SELECT machine_code, status, start_time, end_time FROM PE_IIOT_STATE_LOG WITH (NOLOCK)
                         WHERE ((start_time >= ? AND start_time < ?) OR (start_time < ? AND (end_time >= ? OR end_time IS NULL)))";
            $stmtAvail = $pdo->prepare($sqlAvail);
            $stmtAvail->execute([$shiftStartDateStr, $shiftEndDateStr, $shiftStartDateStr, $shiftStartDateStr]);
            $logs = $stmtAvail->fetchAll(PDO::FETCH_ASSOC);
            
            $machineOnlineSec = [];
            foreach ($logs as $log) {
                $mc = $log['machine_code'];
                if (!isset($machineOnlineSec[$mc])) $machineOnlineSec[$mc] = 0;
                
                $st = strtotime($log['start_time']);
                if ($st < $shiftStart) $st = $shiftStart;
                
                $et = $log['end_time'] ? strtotime($log['end_time']) : $evalEndTime;
                if ($et > ($shiftStart + 86400)) $et = $shiftStart + 86400;
                
                $duration = max(0, $et - $st);
                
                $s = strtoupper($log['status']);
                if (strpos($s, 'RUN') !== false || strpos($s, 'ON') !== false) {
                    $machineOnlineSec[$mc] += $duration;
                }
            }

            // 4. Get Defects
            $defSql = "
                SELECT m.machine_code, ISNULL(SUM(ABS(t.quantity)), 0) as defects
                FROM STOCK_TRANSACTIONS t WITH (NOLOCK)
                LEFT JOIN LOCATIONS l WITH (NOLOCK) ON t.to_location_id = l.location_id
                LEFT JOIN PE_MACHINES m WITH (NOLOCK) ON l.production_line = m.line
                WHERE t.transaction_type IN ('PRODUCTION_HOLD', 'PRODUCTION_SCRAP')
                  AND t.transaction_timestamp >= ? AND t.transaction_timestamp < ?
                GROUP BY m.machine_code
            ";
            $defStmt = $pdo->prepare($defSql);
            $defStmt->execute([$shiftStartDateStr, $shiftEndDateStr]);
            $defectsMap = [];
            while ($d = $defStmt->fetch(PDO::FETCH_ASSOC)) {
                $defectsMap[$d['machine_code']] = (int)$d['defects'];
            }

            // 5. Aggregate by Line
            $overview = [];
            foreach ($machines as $m) {
                $line = $m['line'] ?: 'OTHER';
                if (!isset($overview[$line])) {
                    $overview[$line] = [
                        'total_machines' => 0,
                        'ONLINE' => 0, 'STOP' => 0, 'OFFLINE' => 0, 'MANUAL' => 0,
                        'total_actual' => 0,
                        'total_expected' => 0,
                        'total_defects' => 0,
                        'availability' => 0, 'performance' => 0, 'quality' => 0, 'oee' => 0,
                        'line_online_sec' => 0,
                        'line_passed_sec' => 0
                    ];
                }

                $overview[$line]['total_machines']++;
                $overview[$line]['line_passed_sec'] += $totalPassedSeconds;
                
                // Status
                $status = 'OFFLINE';
                if (empty($m['mqtt_topic'])) {
                    $status = 'MANUAL';
                } else if ($m['last_updated']) {
                    $lastUpdated = strtotime($m['last_updated']);
                    if ((time() - $lastUpdated) <= 300) {
                        $ls = strtoupper($m['live_status'] ?? '');
                        if (strpos($ls, 'RUN') !== false || strpos($ls, 'ON') !== false) {
                            $status = 'ONLINE';
                        } else if (strpos($ls, 'STOP') !== false || strpos($ls, 'DOWN') !== false || strpos($ls, 'ALARM') !== false) {
                            $status = 'STOP';
                        } else {
                            $status = 'STOP'; // IDLE
                        }
                    }
                }
                $overview[$line][$status]++;
                
                // Actual Output
                $live = (int)$m['live_counter'];
                $base = (int)$m['shift_baseline_counter'];
                $net = ($live >= $base) ? ($live - $base) : $live;
                
                $strokes = isset($strokesMap[$line]) ? $strokesMap[$line] : 1;
                if ($strokes > 1) {
                    $net = floor($net / $strokes);
                }
                
                $overview[$line]['total_actual'] += $net;

                // Defects
                $mc = $m['machine_code'];
                $def = isset($defectsMap[$mc]) ? $defectsMap[$mc] : 0;
                $overview[$line]['total_defects'] += $def;

                // Expected Output & Online Time
                $onlineSec = isset($machineOnlineSec[$mc]) ? $machineOnlineSec[$mc] : 0;
                $overview[$line]['line_online_sec'] += $onlineSec;
                
                $plannedPh = isset($routes[$line]) ? $routes[$line] : 0;
                if ($plannedPh > 0) {
                    $expected = ($onlineSec / 3600) * $plannedPh;
                    $overview[$line]['total_expected'] += $expected;
                }
            }

            // Calculate OEE per Line
            foreach ($overview as $line => &$stats) {
                $avail = 0;
                if ($stats['line_passed_sec'] > 0) {
                    $avail = ($stats['line_online_sec'] / $stats['line_passed_sec']) * 100;
                }
                $stats['availability'] = min(100, round($avail, 1));
                
                $perf = 0;
                if ($stats['total_expected'] > 0) {
                    $perf = ($stats['total_actual'] / $stats['total_expected']) * 100;
                }
                $stats['performance'] = min(100, round($perf, 1));
                
                $qual = 100;
                if ($stats['total_actual'] > 0) {
                    $good = max(0, $stats['total_actual'] - $stats['total_defects']);
                    $qual = ($good / $stats['total_actual']) * 100;
                }
                $stats['quality'] = min(100, round($qual, 1));
                
                $oee = ($stats['availability'] / 100) * ($stats['performance'] / 100) * ($stats['quality'] / 100) * 100;
                $stats['oee'] = round($oee, 1);
                
                $stats['total_expected'] = round($stats['total_expected'], 0);
            }
            unset($stats);

            echo json_encode(['success' => true, 'data' => $overview]);
            break;
case 'get_historical_iiot_analytics':
            $startDate = $_GET['start_date'] ?? date('Y-m-d', strtotime('-7 days'));
            $endDate = $_GET['end_date'] ?? date('Y-m-d');
            $machineFilter = $_GET['machine'] ?? null;
            $lineFilter = $_GET['line'] ?? null;

            $startTs = strtotime($startDate . ' 08:00:00');
            $endTs = strtotime($endDate . ' 08:00:00 +1 day');

            $startStr = date('Y-m-d H:i:s', $startTs);
            $endStr = date('Y-m-d H:i:s', $endTs);

            // 1. Get Uptime / Downtime from State Logs
            $sqlAvail = "SELECT l.machine_code, l.status, l.start_time, l.end_time, l.duration_seconds 
                         FROM PE_IIOT_STATE_LOG l WITH (NOLOCK)
                         INNER JOIN PE_MACHINES m WITH (NOLOCK) ON l.machine_code = m.machine_code
                         WHERE ((l.start_time >= ? AND l.start_time < ?) 
                            OR (l.start_time < ? AND (l.end_time >= ? OR l.end_time IS NULL)))";
            $params = [$startStr, $endStr, $startStr, $startStr];

            if ($machineFilter) {
                $sqlAvail .= " AND l.machine_code = ?";
                $params[] = $machineFilter;
            } else if ($lineFilter) {
                $sqlAvail .= " AND m.line = ?";
                $params[] = $lineFilter;
            }

            $stmt = $pdo->prepare($sqlAvail);
            $stmt->execute($params);
            $logs = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // 2. Fetch all unique machines & specs
            $machines = [];
            $sqlMachines = "SELECT machine_code, machine_name, line FROM PE_MACHINES WITH (NOLOCK) WHERE is_active = 1 AND (mqtt_topic IS NOT NULL AND mqtt_topic != '')";
            $machParams = [];
            
            if ($machineFilter) {
                $sqlMachines .= " AND machine_code = ?";
                $machParams[] = $machineFilter;
            } else if ($lineFilter) {
                $sqlMachines .= " AND line = ?";
                $machParams[] = $lineFilter;
            }
            
            $stmtM = $pdo->prepare($sqlMachines);
            $stmtM->execute($machParams);
            foreach ($stmtM->fetchAll(PDO::FETCH_ASSOC) as $m) {
                $machines[$m['machine_code']] = $m;
            }

            $routeStmt = $pdo->query("
                SELECT m.machine_code, r.planned_output, ISNULL(i.strokes_per_part, 1) as strokes_per_part
                FROM PE_MACHINES m WITH (NOLOCK)
                LEFT JOIN MANUFACTURING_ROUTES r WITH (NOLOCK) ON m.line = r.line
                LEFT JOIN ITEMS i WITH (NOLOCK) ON r.item_id = i.item_id
                WHERE r.planned_output > 0
            ");
            $machineSpecs = [];
            while ($row = $routeStmt->fetch(PDO::FETCH_ASSOC)) {
                if (!isset($machineSpecs[$row['machine_code']])) {
                    $machineSpecs[$row['machine_code']] = [
                        'planned_output' => (float)$row['planned_output'],
                        'strokes' => (int)$row['strokes_per_part']
                    ];
                }
            }

            // 3. Get Production (from IIoT Telemetry) and Defects (from Stock Transactions)
            $sqlProd = "
                SELECT 
                    sub.machine_code, 
                    'PRODUCTION_FG' as transaction_type, 
                    CAST(sub.snapshot_time AS DATE) as shift_date,
                    SUM(sub.strokes) as qty
                FROM (
                    SELECT 
                        CAST(h.snapshot_time AS DATE) as snapshot_time,
                        h.machine_code,
                        h.shift_baseline_counter,
                        (MAX(h.live_counter) - h.shift_baseline_counter) as strokes
                    FROM PE_IIOT_TELEMETRY_HISTORY h WITH (NOLOCK)
                    WHERE h.live_counter >= h.shift_baseline_counter
                      AND h.snapshot_time >= ? AND h.snapshot_time < ?
                    GROUP BY CAST(h.snapshot_time AS DATE), h.machine_code, h.shift_baseline_counter
                ) sub
                INNER JOIN PE_MACHINES m WITH (NOLOCK) ON sub.machine_code = m.machine_code
                WHERE 1=1
            ";
            $prodParams = [$startStr, $endStr];
            if ($machineFilter) {
                $sqlProd .= " AND m.machine_code = ?";
                $prodParams[] = $machineFilter;
            } else if ($lineFilter) {
                $sqlProd .= " AND m.line = ?";
                $prodParams[] = $lineFilter;
            }
            $sqlProd .= " GROUP BY sub.machine_code, CAST(sub.snapshot_time AS DATE)
            
            UNION ALL
            
                SELECT 
                    m.machine_code, 
                    t.transaction_type, 
                    CAST(DATEADD(hour, -8, t.transaction_timestamp) AS DATE) as shift_date,
                    SUM(ABS(t.quantity)) as qty
                FROM STOCK_TRANSACTIONS t WITH (NOLOCK)
                INNER JOIN LOCATIONS loc WITH (NOLOCK) ON t.to_location_id = loc.location_id
                INNER JOIN PE_MACHINES m WITH (NOLOCK) ON loc.production_line = m.line
                WHERE t.transaction_type IN ('PRODUCTION_HOLD', 'PRODUCTION_SCRAP')
                  AND (m.mqtt_topic IS NOT NULL AND m.mqtt_topic != '')
                  AND t.transaction_timestamp >= ? AND t.transaction_timestamp < ?
            ";
            
            $prodParams[] = $startStr;
            $prodParams[] = $endStr;
            
            if ($machineFilter) {
                $sqlProd .= " AND m.machine_code = ?";
                $prodParams[] = $machineFilter;
            } else if ($lineFilter) {
                $sqlProd .= " AND m.line = ?";
                $prodParams[] = $lineFilter;
            }
            $sqlProd .= " GROUP BY m.machine_code, t.transaction_type, CAST(DATEADD(hour, -8, t.transaction_timestamp) AS DATE)";
            
            $stmt = $pdo->prepare($sqlProd);
            $stmt->execute($prodParams);
            $prodLogs = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $trendData = [];
            $machineData = [];

            // Initialize days
            $currTs = $startTs;
            while ($currTs < $endTs) {
                $dateKey = date('Y-m-d', $currTs);
                $trendData[$dateKey] = [
                    'date' => $dateKey,
                    'online_seconds' => 0, 'offline_seconds' => 0,
                    'output' => 0, 'defects' => 0, 'expected_output' => 0
                ];
                $currTs += 86400;
            }

            $processedLineDates = [];

            foreach ($prodLogs as $log) {
                $mc = $log['machine_code'];
                if (!$mc || !isset($machines[$mc])) continue;
                
                $line = $machines[$mc]['line'];
                $dateKey = $log['shift_date'];
                $ttype = $log['transaction_type'];
                
                if (!isset($machineData[$mc])) {
                    $machineData[$mc] = [
                        'machine_code' => $mc,
                        'online_seconds' => 0, 'offline_seconds' => 0,
                        'output' => 0, 'defects' => 0, 'expected_output' => 0
                    ];
                }
                
                $qty = (int)$log['qty'];
                $strokes = $machineSpecs[$mc]['strokes'] ?? 1;
                $netQty = ($strokes > 1) ? floor($qty / $strokes) : $qty;
                
                if ($ttype === 'PRODUCTION_FG') {
                    if (isset($trendData[$dateKey])) $trendData[$dateKey]['output'] += $netQty;
                    $machineData[$mc]['output'] += $netQty;
                } else {
                    if (isset($trendData[$dateKey])) $trendData[$dateKey]['defects'] += $netQty;
                    $machineData[$mc]['defects'] += $netQty;
                }
            }

            foreach ($logs as $log) {
                $mc = $log['machine_code'];
                if (!$mc) continue;
                
                if (!isset($machineData[$mc])) {
                    $machineData[$mc] = [
                        'machine_code' => $mc,
                        'online_seconds' => 0, 'offline_seconds' => 0,
                        'output' => 0, 'defects' => 0, 'expected_output' => 0
                    ];
                }
                
                $st = strtotime($log['start_time']);
                $et = $log['end_time'] ? strtotime($log['end_time']) : time();
                
                $dateKey = date('Y-m-d', $st);
                if (date('H', $st) < 8) $dateKey = date('Y-m-d', $st - 86400);
                
                if ($st < $startTs) $st = $startTs;
                if ($et > $endTs) $et = $endTs;
                $dur = max(0, $et - $st);
                
                $s = strtoupper($log['status']);
                $isOnline = (strpos($s, 'RUN') !== false || strpos($s, 'ON') !== false);
                
                if ($isOnline) {
                    if (isset($trendData[$dateKey])) $trendData[$dateKey]['online_seconds'] += $dur;
                    $machineData[$mc]['online_seconds'] += $dur;
                    
                    $plannedPH = $machineSpecs[$mc]['planned_output'] ?? 300;
                    $exp = ($dur / 3600.0) * $plannedPH;
                    
                    if (isset($trendData[$dateKey])) $trendData[$dateKey]['expected_output'] += $exp;
                    $machineData[$mc]['expected_output'] += $exp;
                } else {
                    if (isset($trendData[$dateKey])) $trendData[$dateKey]['offline_seconds'] += $dur;
                    $machineData[$mc]['offline_seconds'] += $dur;
                }
            }

            $calcOEE = function($data) {
                $totalTime = $data['online_seconds'] + $data['offline_seconds'];
                if ($totalTime == 0) $totalTime = 86400; 
                $avail = ($data['online_seconds'] / $totalTime) * 100;
                $perf = $data['expected_output'] > 0 ? ($data['output'] / $data['expected_output']) * 100 : 0;
                $totalParts = $data['output'] + $data['defects'];
                $qual = $totalParts > 0 ? ($data['output'] / $totalParts) * 100 : 0;
                $avail = min(100, max(0, $avail));
                $perf = min(100, max(0, $perf));
                $qual = min(100, max(0, $qual));
                return [
                    'availability' => round($avail, 1),
                    'performance' => round($perf, 1),
                    'quality' => round($qual, 1),
                    'oee' => round(($avail / 100) * ($perf / 100) * ($qual / 100) * 100, 1)
                ];
            };

            $trendArray = [];
            foreach ($trendData as $date => $t) {
                $oeeRes = $calcOEE($t);
                $trendArray[] = array_merge($t, $oeeRes);
            }

            $machineArray = [];
            $sumAvail = 0; $sumPerf = 0; $sumQual = 0; $sumOee = 0;
            $totalMachines = count($machineData);
            $totalOutput = 0; $totalDefects = 0;

            foreach ($machineData as $mc => $m) {
                $oeeRes = $calcOEE($m);
                $sumAvail += $oeeRes['availability'];
                $sumPerf += $oeeRes['performance'];
                $sumQual += $oeeRes['quality'];
                $sumOee += $oeeRes['oee'];
                $totalOutput += $m['output'];
                $totalDefects += $m['defects'];
                $machineArray[] = array_merge($m, $oeeRes);
            }

            $summary = [
                'availability' => $totalMachines > 0 ? ($sumAvail / $totalMachines) : 0,
                'performance' => $totalMachines > 0 ? ($sumPerf / $totalMachines) : 0,
                'quality' => $totalMachines > 0 ? ($sumQual / $totalMachines) : 0,
                'oee' => $totalMachines > 0 ? ($sumOee / $totalMachines) : 0,
                'total_output' => $totalOutput,
                'total_defects' => $totalDefects
            ];

            echo json_encode(['success' => true, 'data' => [
                'summary' => $summary,
                'trend' => array_values($trendArray),
                'machines' => array_values($machineArray)
            ]]);
            break;

        case 'get_machine_timeline':
            $reqDate = isset($_GET['date']) ? $_GET['date'] : null;
            
            if ($reqDate) {
                $shiftStart = strtotime($reqDate . ' 08:00:00');
                $shiftEnd = strtotime($reqDate . ' 08:00:00 +1 day');
            } else {
                $hour = (int)date('H');
                if ($hour >= 8) {
                    $shiftStart = strtotime(date('Y-m-d') . ' 08:00:00');
                } else {
                    $shiftStart = strtotime(date('Y-m-d', strtotime('-1 day')) . ' 08:00:00');
                }
                $shiftEnd = $shiftStart + 86400;
            }
            
            $shiftStartDateStr = date('Y-m-d H:i:s', $shiftStart);
            $shiftEndDateStr = date('Y-m-d H:i:s', $shiftEnd);
            
            // Get all machines
            $mcStmt = $pdo->query("SELECT machine_code, line FROM " . PE_MACHINES_TABLE . " WHERE is_active = 1 ORDER BY line, machine_code");
            $machines = $mcStmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Get logs
            $logSql = "SELECT machine_code, status, start_time, end_time
                    FROM PE_IIOT_STATE_LOG WITH (NOLOCK)
                    WHERE ((start_time >= ? AND start_time < ?) 
                       OR (start_time < ? AND (end_time >= ? OR end_time IS NULL)))
                    ORDER BY start_time ASC";
            $logStmt = $pdo->prepare($logSql);
            $logStmt->execute([$shiftStartDateStr, $shiftEndDateStr, $shiftStartDateStr, $shiftStartDateStr]);
            $logs = $logStmt->fetchAll(PDO::FETCH_ASSOC);

            $timeline = [];
            foreach ($machines as $m) {
                $timeline[$m['machine_code']] = [];
            }
            
            foreach ($logs as $log) {
                $mc = $log['machine_code'];
                if (!isset($timeline[$mc])) continue; // Ignore inactive
                
                $st = strtotime($log['start_time']);
                if ($st < $shiftStart) $st = $shiftStart;
                
                $et = $log['end_time'] ? strtotime($log['end_time']) : time();
                if ($et > $shiftEnd) $et = $shiftEnd;
                
                $duration = $et - $st;
                if ($duration <= 0) continue;
                
                $s = strtoupper($log['status']);
                $stateCat = 'OFFLINE';
                if (strpos($s, 'RUN') !== false || strpos($s, 'ON') !== false) {
                    $stateCat = 'RUNNING';
                } else if (strpos($s, 'IDLE') !== false) {
                    $stateCat = 'IDLE';
                } else if ($s === 'OFFLINE') {
                    $stateCat = 'OFFLINE';
                } else {
                    $stateCat = 'STOP';
                }
                
                $timeline[$mc][] = [
                    'status' => $stateCat,
                    'start' => $st,
                    'end' => $et,
                    'duration' => $duration
                ];
            }
            
            // Post-process to merge small gaps and identical adjacent statuses
            $MERGE_GAP_TOLERANCE = 300; // 5 minutes in seconds
            $IGNORE_OFFLINE_DURATION = 180; // Ignore OFFLINE blocks < 3 minutes
            foreach ($timeline as $mc => $mcLogs) {
                if (empty($mcLogs)) continue;
                $merged = [];
                $current = null;
                
                // Sort by start time just in case (should already be sorted by SQL)
                usort($mcLogs, function($a, $b) { return $a['start'] - $b['start']; });
                
                foreach ($mcLogs as $log) {
                    // Debounce: Skip short OFFLINE states so they become gaps and get merged
                    if ($log['status'] === 'OFFLINE' && $log['duration'] <= $IGNORE_OFFLINE_DURATION) {
                        continue;
                    }

                    if (!$current) {
                        $current = $log;
                        continue;
                    }
                    
                    $gap = $log['start'] - $current['end'];
                    
                    if ($gap <= $MERGE_GAP_TOLERANCE) {
                        if ($current['status'] === $log['status']) {
                            // Same status: Merge into one continuous block
                            $current['end'] = max($current['end'], $log['end']);
                            $current['duration'] = $current['end'] - $current['start'];
                        } else {
                            // Different status: Eliminate gap by extending the current block to the start of the next block
                            $current['end'] = $log['start'];
                            $current['duration'] = $current['end'] - $current['start'];
                            $merged[] = $current;
                            $current = $log;
                        }
                    } else {
                        // Gap is larger than tolerance, leave it as an OFFLINE gap
                        $merged[] = $current;
                        $current = $log;
                    }
                }
                if ($current) {
                    $merged[] = $current;
                }
                $timeline[$mc] = $merged;
            }
            
            echo json_encode([
                'success' => true, 
                'shift_start' => $shiftStart,
                'shift_end' => $shiftEnd,
                'data' => $timeline
            ]);
            break;
            
        case 'snapshot_iiot_telemetry':
            // 1. Ensure history table exists
            $createSql = "
                IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='PE_IIOT_TELEMETRY_HISTORY' and xtype='U')
                CREATE TABLE PE_IIOT_TELEMETRY_HISTORY (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    snapshot_time DATETIME NOT NULL,
                    machine_code VARCHAR(50) NOT NULL,
                    live_counter INT NOT NULL,
                    shift_baseline_counter INT NOT NULL,
                    created_at DATETIME DEFAULT GETDATE()
                );
            ";
            $pdo->exec($createSql);
            
            // 2. Check if a snapshot for THIS HOUR already exists to prevent duplicates
            $checkStmt = $pdo->query("SELECT COUNT(*) FROM PE_IIOT_TELEMETRY_HISTORY WHERE FORMAT(snapshot_time, 'yyyy-MM-dd HH:00:00') = FORMAT(GETDATE(), 'yyyy-MM-dd HH:00:00')");
            if ($checkStmt->fetchColumn() > 0) {
                echo json_encode(['success' => false, 'message' => 'Snapshot for this hour already exists.']);
                break;
            }
            
            // 3. Take snapshot for the current hour
            $insertSql = "
                INSERT INTO PE_IIOT_TELEMETRY_HISTORY (snapshot_time, machine_code, live_counter, shift_baseline_counter)
                SELECT CAST(FORMAT(GETDATE(), 'yyyy-MM-dd HH:00:00') AS DATETIME), machine_code, live_counter, shift_baseline_counter
                FROM PE_IIOT_TELEMETRY
            ";
            $pdo->exec($insertSql);
            
            echo json_encode(['success' => true, 'message' => 'Hourly snapshot taken successfully.']);
            break;

        default:
    }
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
