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

        default:
            throw new Exception("Invalid action");
    }
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
