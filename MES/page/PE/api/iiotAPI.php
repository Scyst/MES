<?php
// MES/page/PE/api/iiotAPI.php
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../../db.php';
$action = $_GET['action'] ?? '';
if ($action === 'update_telemetry') {
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
                $row['net_counter'] = max(0, $live - $base);
                
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
            
            // For each machine, get Live Counter (from IIoT) and Planned Output (from Routes)
            foreach ($machineStats as $mc => &$stats) {
                // Get Live Counter (Calculate Net Production using Baseline)
                $telStmt = $pdo->prepare("SELECT live_counter, shift_baseline_counter FROM PE_IIOT_TELEMETRY WITH (NOLOCK) WHERE machine_code = ?");
                $telStmt->execute([$mc]);
                $tel = $telStmt->fetch(PDO::FETCH_ASSOC);
                
                $live = $tel ? (int)$tel['live_counter'] : 0;
                $base = $tel ? (int)$tel['shift_baseline_counter'] : 0;
                $stats['live_counter'] = max(0, $live - $base);
                
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
                $strokes = $route ? (int)$route['strokes_per_part'] : 1;
                if ($strokes > 1) {
                    $stats['live_counter'] = floor($stats['live_counter'] / $strokes);
                }
                
                // Get defects from STOCK_TRANSACTIONS (Hold + Scrap)
                $defSql = "
                    SELECT ISNULL(SUM(t.quantity), 0) as defects
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
                SELECT m.machine_code, ISNULL(SUM(t.quantity), 0) as defects
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
                $net = max(0, $live - $base);
                
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
            
            echo json_encode([
                'success' => true, 
                'shift_start' => $shiftStart,
                'shift_end' => $shiftEnd,
                'data' => $timeline
            ]);
            break;

        default:
    }
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
