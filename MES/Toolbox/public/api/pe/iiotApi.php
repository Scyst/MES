<?php
/**
 * Self-contained IIoT Telemetry, Discovery, Shift State Timeline, Historical OEE Analytics,
 * and Visual 2D Factory Board API for Toolbox PE Enterprise (Phase 2.2B).
 */

require_once __DIR__ . '/_common.php';

/**
 * Computes current 08:00–07:59 shift window timestamps.
 */
function resolveShiftWindow(?string $reqDate): array {
    if ($reqDate !== null && $reqDate !== '') {
        $shiftStart = strtotime($reqDate . ' 08:00:00');
        $shiftEnd = strtotime($reqDate . ' 08:00:00 +1 day');
        return [$shiftStart, $shiftEnd, 86400, $shiftEnd];
    }

    $now = time();
    $hour = (int)date('H', $now);
    $baseDate = $hour >= 8 ? date('Y-m-d', $now) : date('Y-m-d', strtotime('-1 day', $now));
    $shiftStart = strtotime($baseDate . ' 08:00:00');
    $shiftEnd = $shiftStart + 86400;
    return [$shiftStart, $shiftEnd, max(1, $now - $shiftStart), $now];
}

/**
 * Normalizes raw PE_IIOT_STATE_LOG status strings into canonical state names.
 */
function normalizeIiotStateCategory(string $rawStatus): string {
    $s = strtoupper($rawStatus);
    if (strpos($s, 'RUN') !== false || strpos($s, 'ON') !== false) {
        return 'RUNNING';
    }
    if (strpos($s, 'IDLE') !== false) {
        return 'IDLE';
    }
    if ($s === 'OFFLINE') {
        return 'OFFLINE';
    }
    return 'STOP';
}

try {
    [$action, $input, $currentUser] = parsePeRequest();
    requirePeAccess();
    $actor = trim((string)($currentUser['fullname'] ?: $currentUser['username'] ?: 'System'));

    switch ($action) {
        case 'get_live_dashboard': {
            $reqDate = parsePeDateOrNull($input['date'] ?? null);
            [$shiftStart, $shiftEnd, $totalPassedSeconds, $evalEndTime] = resolveShiftWindow($reqDate);
            $shiftStartStr = date('Y-m-d H:i:s', $shiftStart);
            $shiftEndStr = date('Y-m-d H:i:s', $shiftEnd);

            // 1. Active IIoT Telemetry
            $teleRows = $pdo->query(
                "SELECT TOP 200 machine_code, live_status, live_counter, live_total, cycle_time,
                        power_kw, voltage, current_a, power_factor, cumulative_kwh,
                        flow_rate, velocity, cumulative_flow, last_updated,
                        shift_baseline_counter, shift_baseline_updated_at
                 FROM dbo.PE_IIOT_TELEMETRY WITH (NOLOCK)
                 WHERE last_updated >= DATEADD(MINUTE, -15, GETDATE())
                 ORDER BY last_updated DESC"
            )->fetchAll(PDO::FETCH_ASSOC);

            $telemetry = [];
            $nowTs = time();
            foreach ($teleRows as $row) {
                $base = isset($row['shift_baseline_counter']) ? (int)$row['shift_baseline_counter'] : 0;
                $live = (int)($row['live_counter'] ?? 0);
                $row['net_counter'] = ($live >= $base) ? ($live - $base) : $live;
                $lastTs = !empty($row['last_updated']) ? strtotime((string)$row['last_updated']) : 0;
                $row['is_fresh'] = ($nowTs - $lastTs) <= 300;
                $telemetry[$row['machine_code']] = $row;
            }

            // 2. Active Machines (including map_x, map_y, mqtt_topic)
            $machines = $pdo->query(
                "SELECT TOP 300 machine_id, machine_code, machine_name, line, area, area_id,
                        machine_type, status, criticality, mqtt_topic, map_x, map_y, is_loto, loto_reason
                 FROM " . PE_MACHINES_TABLE . " WITH (NOLOCK)
                 WHERE is_active = 1
                 ORDER BY line ASC, machine_code ASC"
            )->fetchAll(PDO::FETCH_ASSOC);

            // 3. Discovery Topics
            $discRows = $pdo->query(
                "SELECT TOP 200 D.topic_name, D.last_payload, D.last_seen, M.machine_code, M.machine_name
                 FROM dbo.PE_IIOT_DISCOVERY D WITH (NOLOCK)
                 LEFT JOIN " . PE_MACHINES_TABLE . " M WITH (NOLOCK) ON D.topic_name = M.mqtt_topic AND M.is_active = 1
                 ORDER BY D.last_seen DESC"
            )->fetchAll(PDO::FETCH_ASSOC);
            foreach ($discRows as &$d) {
                $d['payload_obj'] = !empty($d['last_payload']) ? json_decode((string)$d['last_payload'], true) : null;
            }
            unset($d);

            // 4. State Logs -> Availability + Debounced Timeline
            $logStmt = $pdo->prepare(
                "SELECT machine_code, status, start_time, end_time, duration_seconds
                 FROM dbo.PE_IIOT_STATE_LOG WITH (NOLOCK)
                 WHERE (start_time >= ? AND start_time < ?)
                    OR (start_time < ? AND (end_time >= ? OR end_time IS NULL))
                 ORDER BY start_time ASC"
            );
            $logStmt->execute([$shiftStartStr, $shiftEndStr, $shiftStartStr, $shiftStartStr]);
            $logs = $logStmt->fetchAll(PDO::FETCH_ASSOC);

            $availability = [];
            $timelineRaw = [];
            foreach ($machines as $m) {
                $timelineRaw[$m['machine_code']] = [];
            }

            foreach ($logs as $log) {
                $mc = (string)$log['machine_code'];
                if (!isset($availability[$mc])) {
                    $availability[$mc] = ['total_online_seconds' => 0, 'total_offline_seconds' => 0];
                }
                $st = strtotime((string)$log['start_time']);
                if ($st < $shiftStart) $st = $shiftStart;
                $et = !empty($log['end_time']) ? strtotime((string)$log['end_time']) : $evalEndTime;
                if ($et > $shiftEnd) $et = $shiftEnd;
                $dur = max(0, $et - $st);
                if ($dur <= 0) continue;

                $cat = normalizeIiotStateCategory((string)($log['status'] ?? ''));
                if ($cat === 'RUNNING') {
                    $availability[$mc]['total_online_seconds'] += $dur;
                } else {
                    $availability[$mc]['total_offline_seconds'] += $dur;
                }

                if (isset($timelineRaw[$mc])) {
                    $timelineRaw[$mc][] = ['status' => $cat, 'start' => $st, 'end' => $et, 'duration' => $dur];
                }
            }

            foreach ($availability as $mc => $st) {
                $availPct = min(100.0, ($st['total_online_seconds'] / $totalPassedSeconds) * 100);
                $availability[$mc]['availability_percent'] = round($availPct, 1);
                $availability[$mc]['total_passed_seconds'] = $totalPassedSeconds;
            }

            // Debounce tiny OFFLINE blips and merge <=5min gaps cleanly
            $timeline = [];
            foreach ($timelineRaw as $mc => $items) {
                if (empty($items)) continue;
                usort($items, static fn($a, $b) => $a['start'] <=> $b['start']);
                $merged = [];
                $curr = null;
                foreach ($items as $seg) {
                    if ($seg['status'] === 'OFFLINE' && $seg['duration'] <= 180) {
                        continue;
                    }
                    if ($curr === null) {
                        $curr = $seg;
                        continue;
                    }
                    $gap = $seg['start'] - $curr['end'];
                    if ($gap <= 300) {
                        if ($curr['status'] === $seg['status']) {
                            $curr['end'] = max($curr['end'], $seg['end']);
                            $curr['duration'] = $curr['end'] - $curr['start'];
                        } else {
                            $curr['end'] = $seg['start'];
                            $curr['duration'] = max(0, $curr['end'] - $curr['start']);
                            $merged[] = $curr;
                            $curr = $seg;
                        }
                    } else {
                        $merged[] = $curr;
                        $curr = $seg;
                    }
                }
                if ($curr !== null) {
                    $merged[] = $curr;
                }
                if (!empty($merged)) {
                    $timeline[$mc] = $merged;
                }
            }

            peJsonSuccess([
                'telemetry' => $telemetry,
                'machines' => $machines,
                'discovery' => $discRows,
                'availability' => $availability,
                'timeline' => $timeline,
                'shift_start' => $shiftStart,
                'shift_end' => $shiftEnd,
            ], 'โหลดข้อมูล IIoT Real-time Dashboard สำเร็จ');
            break;
        }

        case 'get_historical_oee': {
            $startDate = parsePeDateOrNull($input['start_date'] ?? null) ?? date('Y-m-d', strtotime('-7 days'));
            $endDate = parsePeDateOrNull($input['end_date'] ?? null) ?? date('Y-m-d');
            $machineFilter = trim((string)($input['machine'] ?? ''));
            $lineFilter = trim((string)($input['line'] ?? ''));

            $startTs = strtotime($startDate . ' 08:00:00');
            $endTs = strtotime($endDate . ' 08:00:00 +1 day');
            $startStr = date('Y-m-d H:i:s', $startTs);
            $endStr = date('Y-m-d H:i:s', $endTs);

            $sqlAvail = "SELECT L.machine_code, L.status, L.start_time, L.end_time
                         FROM dbo.PE_IIOT_STATE_LOG L WITH (NOLOCK)
                         INNER JOIN " . PE_MACHINES_TABLE . " M WITH (NOLOCK) ON L.machine_code = M.machine_code
                         WHERE ((L.start_time >= ? AND L.start_time < ?) OR (L.start_time < ? AND (L.end_time >= ? OR L.end_time IS NULL)))";
            $availParams = [$startStr, $endStr, $startStr, $startStr];
            if ($machineFilter !== '') {
                $sqlAvail .= ' AND L.machine_code = ?';
                $availParams[] = $machineFilter;
            } elseif ($lineFilter !== '') {
                $sqlAvail .= ' AND M.line = ?';
                $availParams[] = $lineFilter;
            }
            $availStmt = $pdo->prepare($sqlAvail);
            $availStmt->execute($availParams);
            $logs = $availStmt->fetchAll(PDO::FETCH_ASSOC);

            $specStmt = $pdo->query(
                "SELECT M.machine_code, R.planned_output, ISNULL(I.strokes_per_part, 1) AS strokes_per_part
                 FROM " . PE_MACHINES_TABLE . " M WITH (NOLOCK)
                 LEFT JOIN dbo.MANUFACTURING_ROUTES R WITH (NOLOCK) ON M.line = R.line
                 LEFT JOIN dbo.ITEMS I WITH (NOLOCK) ON R.item_id = I.item_id
                 WHERE R.planned_output > 0"
            );
            $machineSpecs = [];
            while ($r = $specStmt->fetch(PDO::FETCH_ASSOC)) {
                if (!isset($machineSpecs[$r['machine_code']])) {
                    $machineSpecs[$r['machine_code']] = [
                        'planned_output' => (float)$r['planned_output'],
                        'strokes' => max(1, (int)$r['strokes_per_part']),
                    ];
                }
            }

            $sqlProd = "SELECT sub.machine_code,
                               'TELEMETRY_STROKE' AS tx_type,
                               CAST(sub.snapshot_day AS DATE) AS shift_date,
                               SUM(sub.strokes) AS qty
                        FROM (
                            SELECT CAST(H.snapshot_time AS DATE) AS snapshot_day,
                                   H.machine_code,
                                   H.shift_baseline_counter,
                                   (MAX(H.live_counter) - H.shift_baseline_counter) AS strokes
                            FROM dbo.PE_IIOT_TELEMETRY_HISTORY H WITH (NOLOCK)
                            WHERE H.live_counter >= H.shift_baseline_counter
                              AND H.snapshot_time >= ? AND H.snapshot_time < ?
                            GROUP BY CAST(H.snapshot_time AS DATE), H.machine_code, H.shift_baseline_counter
                        ) sub
                        INNER JOIN " . PE_MACHINES_TABLE . " M WITH (NOLOCK) ON sub.machine_code = M.machine_code
                        WHERE 1 = 1";
            $prodParams = [$startStr, $endStr];
            if ($machineFilter !== '') {
                $sqlProd .= ' AND M.machine_code = ?';
                $prodParams[] = $machineFilter;
            } elseif ($lineFilter !== '') {
                $sqlProd .= ' AND M.line = ?';
                $prodParams[] = $lineFilter;
            }
            $sqlProd .= " GROUP BY sub.machine_code, CAST(sub.snapshot_day AS DATE)
                          UNION ALL
                          SELECT M.machine_code,
                                 T.transaction_type AS tx_type,
                                 CAST(DATEADD(HOUR, -8, T.transaction_timestamp) AS DATE) AS shift_date,
                                 SUM(ABS(T.quantity)) AS qty
                          FROM dbo.STOCK_TRANSACTIONS T WITH (NOLOCK)
                          INNER JOIN " . PE_MACHINES_TABLE . " M WITH (NOLOCK) ON T.machine_id = M.machine_id
                          WHERE T.transaction_type IN ('PRODUCTION_FG', 'PRODUCTION_HOLD', 'PRODUCTION_SCRAP')
                            AND T.transaction_timestamp >= ? AND T.transaction_timestamp < ?";
            array_push($prodParams, $startStr, $endStr);
            if ($machineFilter !== '') {
                $sqlProd .= ' AND M.machine_code = ?';
                $prodParams[] = $machineFilter;
            } elseif ($lineFilter !== '') {
                $sqlProd .= ' AND M.line = ?';
                $prodParams[] = $lineFilter;
            }
            $sqlProd .= " GROUP BY M.machine_code, T.transaction_type, CAST(DATEADD(HOUR, -8, T.transaction_timestamp) AS DATE)";

            $prodStmt = $pdo->prepare($sqlProd);
            $prodStmt->execute($prodParams);
            $prodRows = $prodStmt->fetchAll(PDO::FETCH_ASSOC);

            $trendMap = [];
            for ($ts = $startTs; $ts <= strtotime($endDate . ' 08:00:00'); $ts += 86400) {
                $d = date('Y-m-d', $ts);
                $trendMap[$d] = ['date' => $d, 'online_seconds' => 0, 'offline_seconds' => 0, 'output' => 0, 'defects' => 0, 'expected_output' => 0];
            }
            $machineMap = [];

            foreach ($prodRows as $pr) {
                $mc = (string)$pr['machine_code'];
                $d = substr((string)$pr['shift_date'], 0, 10);
                $qty = (float)$pr['qty'];
                if (!isset($machineMap[$mc])) {
                    $machineMap[$mc] = ['machine_code' => $mc, 'online_seconds' => 0, 'offline_seconds' => 0, 'output' => 0, 'defects' => 0, 'expected_output' => 0];
                }
                if ($pr['tx_type'] === 'TELEMETRY_STROKE') {
                    $strokesPerPart = $machineSpecs[$mc]['strokes'] ?? 1;
                    $net = $strokesPerPart > 1 ? floor($qty / $strokesPerPart) : $qty;
                    if (isset($trendMap[$d])) $trendMap[$d]['output'] += $net;
                    $machineMap[$mc]['output'] += $net;
                } elseif ($pr['tx_type'] === 'PRODUCTION_FG') {
                    if ($machineMap[$mc]['output'] == 0 && isset($trendMap[$d])) {
                        $trendMap[$d]['output'] += $qty;
                    }
                    if ($machineMap[$mc]['output'] == 0) {
                        $machineMap[$mc]['output'] += $qty;
                    }
                } else {
                    if (isset($trendMap[$d])) $trendMap[$d]['defects'] += $qty;
                    $machineMap[$mc]['defects'] += $qty;
                }
            }

            $nowTs = time();
            foreach ($logs as $log) {
                $mc = (string)$log['machine_code'];
                if (!isset($machineMap[$mc])) {
                    $machineMap[$mc] = ['machine_code' => $mc, 'online_seconds' => 0, 'offline_seconds' => 0, 'output' => 0, 'defects' => 0, 'expected_output' => 0];
                }
                $st = strtotime((string)$log['start_time']);
                $et = !empty($log['end_time']) ? strtotime((string)$log['end_time']) : $nowTs;
                $shiftTs = ((int)date('H', $st) < 8) ? ($st - 86400) : $st;
                $d = date('Y-m-d', $shiftTs);

                if ($st < $startTs) $st = $startTs;
                if ($et > $endTs) $et = $endTs;
                $dur = max(0, $et - $st);
                if ($dur <= 0) continue;

                $cat = normalizeIiotStateCategory((string)($log['status'] ?? ''));
                if ($cat === 'RUNNING') {
                    if (isset($trendMap[$d])) $trendMap[$d]['online_seconds'] += $dur;
                    $machineMap[$mc]['online_seconds'] += $dur;
                    $plannedPh = $machineSpecs[$mc]['planned_output'] ?? 300;
                    $exp = ($dur / 3600.0) * $plannedPh;
                    if (isset($trendMap[$d])) $trendMap[$d]['expected_output'] += $exp;
                    $machineMap[$mc]['expected_output'] += $exp;
                } else {
                    if (isset($trendMap[$d])) $trendMap[$d]['offline_seconds'] += $dur;
                    $machineMap[$mc]['offline_seconds'] += $dur;
                }
            }

            $calcOee = static function (array $row): array {
                $totalTime = $row['online_seconds'] + $row['offline_seconds'];
                $avail = $totalTime > 0 ? min(100.0, ($row['online_seconds'] / $totalTime) * 100.0) : 0.0;
                $perf = $row['expected_output'] > 0 ? min(100.0, ($row['output'] / $row['expected_output']) * 100.0) : 0.0;
                $parts = $row['output'] + $row['defects'];
                $qual = $parts > 0 ? min(100.0, ($row['output'] / $parts) * 100.0) : ($row['output'] > 0 ? 100.0 : 0.0);
                $oee = ($avail / 100.0) * ($perf / 100.0) * ($qual / 100.0) * 100.0;
                return [
                    'availability' => round($avail, 1),
                    'performance' => round($perf, 1),
                    'quality' => round($qual, 1),
                    'oee' => round($oee, 1),
                ];
            };

            $trend = [];
            foreach ($trendMap as $t) {
                $trend[] = array_merge($t, $calcOee($t));
            }
            $machineList = [];
            $sumAvail = 0; $sumPerf = 0; $sumQual = 0; $sumOee = 0; $totalOut = 0; $totalDef = 0;
            foreach ($machineMap as $m) {
                $metrics = $calcOee($m);
                $sumAvail += $metrics['availability'];
                $sumPerf += $metrics['performance'];
                $sumQual += $metrics['quality'];
                $sumOee += $metrics['oee'];
                $totalOut += $m['output'];
                $totalDef += $m['defects'];
                $machineList[] = array_merge($m, $metrics);
            }
            $cnt = count($machineList);

            peJsonSuccess([
                'summary' => [
                    'availability' => $cnt > 0 ? round($sumAvail / $cnt, 1) : 0,
                    'performance' => $cnt > 0 ? round($sumPerf / $cnt, 1) : 0,
                    'quality' => $cnt > 0 ? round($sumQual / $cnt, 1) : 0,
                    'oee' => $cnt > 0 ? round($sumOee / $cnt, 1) : 0,
                    'total_output' => $totalOut,
                    'total_defects' => $totalDef,
                ],
                'trend' => $trend,
                'machines' => $machineList,
            ], 'โหลดผลวิเคราะห์ IIoT OEE ย้อนหลังสำเร็จ');
            break;
        }

        case 'load_map': {
            $areaId = max(1, (int)($input['area_id'] ?? 1));
            $stmt = $pdo->prepare("SELECT id, map_json, updated_at, updated_by FROM dbo.PE_IIOT_MAP_DATA WITH (NOLOCK) WHERE id = ?");
            $stmt->execute([$areaId]);
            $mapRow = $stmt->fetch(PDO::FETCH_ASSOC);

            $locations = $pdo->query(
                "SELECT TOP 300 location_id, location_name, location_description, production_line, location_type, is_active
                 FROM dbo.LOCATIONS WITH (NOLOCK)
                 WHERE is_active = 1
                 ORDER BY location_name ASC"
            )->fetchAll(PDO::FETCH_ASSOC);

            peJsonSuccess([
                'area_id' => $areaId,
                'map_data' => $mapRow['map_json'] ?? null,
                'updated_at' => $mapRow['updated_at'] ?? null,
                'updated_by' => $mapRow['updated_by'] ?? null,
                'locations' => $locations,
            ], 'โหลดแผนผังโรงงาน 2D สำเร็จ');
            break;
        }

        case 'save_map': {
            requirePeAccess(['manage_maintenance', 'manage_production'], ['admin', 'creator', 'manager', 'maintenance', 'engineer', 'supervisor']);
            $areaId = max(1, (int)($input['area_id'] ?? 1));
            $rawMap = $input['map_data'] ?? '';
            $mapJsonStr = is_string($rawMap) ? $rawMap : json_encode($rawMap, JSON_UNESCAPED_UNICODE);
            if ($mapJsonStr === '' || json_decode($mapJsonStr, true) === null) {
                throw new InvalidArgumentException('รูปแบบ JSON ของผังโรงงานไม่ถูกต้อง');
            }
            if (strlen($mapJsonStr) > 2000000) {
                throw new InvalidArgumentException('ขนาดไฟล์แผนผังเกินขีดจำกัดที่กำหนด');
            }

            $oldStmt = $pdo->prepare("SELECT id, LEN(map_json) AS old_len, updated_by FROM dbo.PE_IIOT_MAP_DATA WHERE id = ?");
            $oldStmt->execute([$areaId]);
            $oldRow = $oldStmt->fetch(PDO::FETCH_ASSOC);

            $pdo->beginTransaction();
            if ($oldRow) {
                $pdo->prepare("UPDATE dbo.PE_IIOT_MAP_DATA SET map_json = ?, updated_at = GETDATE(), updated_by = ? WHERE id = ?")
                    ->execute([$mapJsonStr, $actor, $areaId]);
            } else {
                $pdo->prepare("INSERT INTO dbo.PE_IIOT_MAP_DATA (id, map_json, updated_at, updated_by) VALUES (?, ?, GETDATE(), ?)")
                    ->execute([$areaId, $mapJsonStr, $actor]);
            }
            writeLog($pdo, 'UPDATE', 'PE_IIOT_MAP_DATA', $areaId, $oldRow ?: null, ['new_len' => strlen($mapJsonStr), 'updated_by' => $actor], "Saved 2D factory map area #{$areaId}");
            $pdo->commit();

            peJsonSuccess(['area_id' => $areaId], 'บันทึกแบบแปลนผังโรงงาน 2D เรียบร้อยแล้ว');
            break;
        }

        case 'save_machine_pin': {
            requirePeAccess(['manage_maintenance', 'manage_production'], ['admin', 'creator', 'manager', 'maintenance', 'engineer', 'supervisor']);
            $machineId = parsePePositiveInt($input['machine_id'] ?? null, 'รหัสเครื่องจักร');
            $mapX = isset($input['map_x']) && $input['map_x'] !== '' && $input['map_x'] !== null ? round((float)$input['map_x'], 2) : null;
            $mapY = isset($input['map_y']) && $input['map_y'] !== '' && $input['map_y'] !== null ? round((float)$input['map_y'], 2) : null;
            $mqttTopic = array_key_exists('mqtt_topic', $input) ? trim((string)$input['mqtt_topic']) : null;

            $oldStmt = $pdo->prepare("SELECT machine_id, machine_code, map_x, map_y, mqtt_topic FROM " . PE_MACHINES_TABLE . " WHERE machine_id = ?");
            $oldStmt->execute([$machineId]);
            $oldRow = $oldStmt->fetch(PDO::FETCH_ASSOC);
            if (!$oldRow) {
                peJsonError('ไม่พบเครื่องจักร', 404);
            }

            $pdo->beginTransaction();
            if ($mqttTopic !== null) {
                $pdo->prepare("UPDATE " . PE_MACHINES_TABLE . " SET map_x = ?, map_y = ?, mqtt_topic = ?, updated_at = GETDATE() WHERE machine_id = ?")
                    ->execute([$mapX, $mapY, $mqttTopic, $machineId]);
            } else {
                $pdo->prepare("UPDATE " . PE_MACHINES_TABLE . " SET map_x = ?, map_y = ?, updated_at = GETDATE() WHERE machine_id = ?")
                    ->execute([$mapX, $mapY, $machineId]);
            }

            writeLog($pdo, 'UPDATE', 'PE_MACHINES', $machineId, $oldRow, [
                'map_x' => $mapX,
                'map_y' => $mapY,
                'mqtt_topic' => $mqttTopic ?? $oldRow['mqtt_topic'],
            ], "Updated 2D map pin / MQTT topic for {$oldRow['machine_code']}");
            $pdo->commit();

            peJsonSuccess(['machine_id' => $machineId, 'map_x' => $mapX, 'map_y' => $mapY], "บันทึกตำแหน่งเครื่อง {$oldRow['machine_code']} เรียบร้อยแล้ว");
            break;
        }

        default:
            peJsonError('Invalid action requested', 400);
    }
} catch (Throwable $e) {
    handleApiError($e, $pdo ?? null, $input ?? $_REQUEST);
}
