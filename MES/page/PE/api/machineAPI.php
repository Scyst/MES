<?php
// MES/page/PE/api/machineAPI.php
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../components/init.php';


requirePermission(['view_maintenance', 'view_production', 'view_dashboard']);

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    if (!isset($_SERVER['HTTP_X_CSRF_TOKEN']) || !isset($_SESSION['csrf_token']) || !hash_equals($_SESSION['csrf_token'], $_SERVER['HTTP_X_CSRF_TOKEN'])) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'CSRF token validation failed.']);
        exit;
    }
}

$input = json_decode(file_get_contents("php://input"), true) ?? $_POST;
$action = $_REQUEST['action'] ?? $input['action'] ?? '';
$currentUser = $_SESSION['user'];

try {
    switch ($action) {

        case 'get_machines':
            $isDeleted = (!empty($_GET['status']) && $_GET['status'] === 'Deleted');
            $conditions = [$isDeleted ? "is_active = 0" : "is_active = 1"];
            $params = [];

            if (!empty($_GET['line'])) {
                $conditions[] = "line = ?";
                $params[] = $_GET['line'];
            }
            if (!empty($_GET['status']) && !$isDeleted) {
                $conditions[] = "status = ?";
                $params[] = $_GET['status'];
            }
            if (!empty($_GET['machine_type'])) {
                $conditions[] = "machine_type = ?";
                $params[] = $_GET['machine_type'];
            }

            $where = "WHERE " . implode(" AND ", $conditions);
            $sql = "SELECT * FROM " . PE_MACHINES_TABLE . " WITH (NOLOCK) $where ORDER BY line ASC, machine_code ASC";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Stats
            $statsSql = "SELECT 
                            COUNT(*) as total,
                            SUM(CASE WHEN status = 'Active' THEN 1 ELSE 0 END) as active_count,
                            SUM(CASE WHEN status = 'Under Repair' THEN 1 ELSE 0 END) as repair_count,
                            SUM(CASE WHEN status = 'Inactive' THEN 1 ELSE 0 END) as inactive_count
                         FROM " . PE_MACHINES_TABLE . " WITH (NOLOCK) WHERE is_active = 1";
            $statsStmt = $pdo->query($statsSql);
            $stats = $statsStmt->fetch(PDO::FETCH_ASSOC);

            // Get distinct lines and types for filters
            $lines = $pdo->query("SELECT DISTINCT line FROM " . PE_MACHINES_TABLE . " WITH (NOLOCK) WHERE line IS NOT NULL AND line != '' AND is_active = 1 ORDER BY line")->fetchAll(PDO::FETCH_COLUMN);
            $types = $pdo->query("SELECT DISTINCT machine_type FROM " . PE_MACHINES_TABLE . " WITH (NOLOCK) WHERE machine_type IS NOT NULL AND machine_type != '' AND is_active = 1 ORDER BY machine_type")->fetchAll(PDO::FETCH_COLUMN);

            echo json_encode([
                'success' => true,
                'data' => $data,
                'stats' => $stats,
                'filters' => ['lines' => $lines, 'types' => $types]
            ], JSON_INVALID_UTF8_SUBSTITUTE);
            break;

        case 'get_machine':
            $id = $_GET['id'] ?? null;
            if (!$id) throw new Exception("Machine ID is required");

            $stmt = $pdo->prepare("SELECT * FROM " . PE_MACHINES_TABLE . " WHERE machine_id = ?");
            $stmt->execute([$id]);
            $machine = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$machine) throw new Exception("Machine not found");

            // Get history
            $histStmt = $pdo->prepare("SELECT TOP 20 * FROM " . PE_MACHINE_HISTORY_TABLE . " WITH (NOLOCK) WHERE machine_id = ? ORDER BY event_date DESC");
            $histStmt->execute([$id]);
            $history = $histStmt->fetchAll(PDO::FETCH_ASSOC);

            // Get recent work orders
            $woStmt = $pdo->prepare("SELECT TOP 10 wo_id, wo_number, wo_type, status, priority, issue_title, requested_at, completed_at, repair_minutes FROM " . PE_WORK_ORDERS_TABLE . " WITH (NOLOCK) WHERE machine_id = ? ORDER BY requested_at DESC");
            $woStmt->execute([$id]);
            $workOrders = $woStmt->fetchAll(PDO::FETCH_ASSOC);

            // Get recent downtime
            $dtStmt = $pdo->prepare("SELECT TOP 10 downtime_id, log_date, start_time, end_time, duration_min, cause_category, cause_detail FROM " . PE_DOWNTIME_LOG_TABLE . " WITH (NOLOCK) WHERE machine_id = ? ORDER BY log_date DESC");
            $dtStmt->execute([$id]);
            $downtimes = $dtStmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode([
                'success' => true,
                'data' => $machine,
                'history' => $history,
                'work_orders' => $workOrders,
                'downtimes' => $downtimes
            ], JSON_INVALID_UTF8_SUBSTITUTE);
            break;

        case 'save_machine':
            $id = $input['machine_id'] ?? '';
            $code = strtoupper(trim($input['machine_code'] ?? ''));
            $name = trim($input['machine_name'] ?? '');
            $mqttTopic = trim($input['mqtt_topic'] ?? '');

            if (empty($code) || empty($name)) {
                throw new Exception("Machine Code and Name are required");
            }

            $line = trim($input['line'] ?? '');
            $area = trim($input['area'] ?? '');
            $type = trim($input['machine_type'] ?? '');
            $manufacturer = trim($input['manufacturer'] ?? '');
            $model = trim($input['model'] ?? '');
            $serial = trim($input['serial_number'] ?? '');
            $assetNo = trim($input['asset_no'] ?? '');
            $installDate = !empty($input['install_date']) ? $input['install_date'] : null;
            $status = $input['status'] ?? 'Active';
            $criticality = $input['criticality'] ?? 'Medium';
            $notes = trim($input['notes'] ?? '');
            $imagePath = $input['image_path'] ?? null;

            // Check duplicate code
            $checkSql = "SELECT machine_id FROM " . PE_MACHINES_TABLE . " WHERE machine_code = ?";
            $checkStmt = $pdo->prepare($checkSql);
            $checkStmt->execute([$code]);
            $existing = $checkStmt->fetch(PDO::FETCH_ASSOC);

            $pdo->beginTransaction();
            try {
                if (empty($id)) {
                    if ($existing) throw new Exception("Machine Code '$code' already exists");

                    $sql = "INSERT INTO " . PE_MACHINES_TABLE . " 
                            (machine_code, machine_name, mqtt_topic, line, area, machine_type, manufacturer, model, serial_number, asset_no, install_date, status, criticality, notes, image_path)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
                    $stmt = $pdo->prepare($sql);
                    $stmt->execute([$code, $name, $mqttTopic, $line, $area, $type, $manufacturer, $model, $serial, $assetNo, $installDate, $status, $criticality, $notes, $imagePath]);
                    $newId = $pdo->lastInsertId();

                    // Record history
                    $histSql = "INSERT INTO " . PE_MACHINE_HISTORY_TABLE . " (machine_id, event_type, event_detail, performed_by) VALUES (?, 'Created', ?, ?)";
                    $pdo->prepare($histSql)->execute([$newId, "Machine registered: $code - $name", $currentUser['username']]);

                    writeLog($pdo, 'ADD_MACHINE', 'PE_MACHINE_API', $newId, null, null, "Code: $code, Name: $name");
                    $msg = "Machine registered successfully";
                } else {
                    if ($existing && $existing['machine_id'] != $id) {
                        throw new Exception("Machine Code '$code' is used by another machine");
                    }

                    $sql = "UPDATE " . PE_MACHINES_TABLE . " SET 
                                machine_code = ?, machine_name = ?, mqtt_topic = ?, line = ?, area = ?, machine_type = ?,
                                manufacturer = ?, model = ?, serial_number = ?, asset_no = ?, install_date = ?,
                                status = ?, criticality = ?, notes = ?, image_path = ISNULL(?, image_path), updated_at = GETDATE()
                            WHERE machine_id = ?";
                    $stmt = $pdo->prepare($sql);
                    $stmt->execute([$code, $name, $mqttTopic, $line, $area, $type, $manufacturer, $model, $serial, $assetNo, $installDate, $status, $criticality, $notes, $imagePath, $id]);

                    $histSql = "INSERT INTO " . PE_MACHINE_HISTORY_TABLE . " (machine_id, event_type, event_detail, performed_by) VALUES (?, 'Updated', ?, ?)";
                    $pdo->prepare($histSql)->execute([$id, "Machine updated by " . $currentUser['username'], $currentUser['username']]);

                    writeLog($pdo, 'UPDATE_MACHINE', 'PE_MACHINE_API', $id, null, null, "Code: $code");
                    $msg = "Machine updated successfully";
                }

                $pdo->commit();
                echo json_encode(['success' => true, 'message' => $msg]);
            } catch (Exception $e) {
                $pdo->rollBack();
                throw $e;
            }
            break;

        case 'toggle_status':
            $id = $input['machine_id'] ?? null;
            $newStatus = $input['status'] ?? 'Inactive';
            if (!$id) throw new Exception("Invalid Machine ID");

            $pdo->beginTransaction();
            try {
                $sql = "UPDATE " . PE_MACHINES_TABLE . " SET status = ?, updated_at = GETDATE() WHERE machine_id = ?";
                $pdo->prepare($sql)->execute([$newStatus, $id]);

                $histSql = "INSERT INTO " . PE_MACHINE_HISTORY_TABLE . " (machine_id, event_type, event_detail, performed_by) VALUES (?, 'Status Change', ?, ?)";
                $pdo->prepare($histSql)->execute([$id, "Status changed to: $newStatus", $currentUser['username']]);

                $pdo->commit();
                echo json_encode(['success' => true, 'message' => "Status changed to $newStatus"]);
            } catch (Exception $e) {
                $pdo->rollBack();
                throw $e;
            }
            break;

        case 'delete_machine':
            $id = $input['machine_id'] ?? null;
            if (!$id) throw new Exception("Invalid Machine ID");

            $pdo->beginTransaction();
            try {
                // Soft delete
                $sql = "UPDATE " . PE_MACHINES_TABLE . " SET is_active = 0, status = 'Inactive', updated_at = GETDATE() WHERE machine_id = ?";
                $pdo->prepare($sql)->execute([$id]);

                $histSql = "INSERT INTO " . PE_MACHINE_HISTORY_TABLE . " (machine_id, event_type, event_detail, performed_by) VALUES (?, 'Deleted', 'Machine soft deleted', ?)";
                $pdo->prepare($histSql)->execute([$id, $currentUser['username']]);

                writeLog($pdo, 'DELETE_MACHINE', 'PE_MACHINE_API', $id, null, null, "Soft deleted");

                $pdo->commit();
                echo json_encode(['success' => true, 'message' => "Machine deleted successfully"]);
            } catch (Exception $e) {
                $pdo->rollBack();
                throw $e;
            }
            break;

        case 'get_lines':
            $lines = $pdo->query("SELECT DISTINCT line FROM " . MANPOWER_EMPLOYEES_TABLE . " WITH (NOLOCK) WHERE is_active = 1 AND line IS NOT NULL AND RTRIM(LTRIM(line)) <> '' ORDER BY line ASC")->fetchAll(PDO::FETCH_COLUMN);
            echo json_encode(['success' => true, 'data' => $lines]);
            break;

        case 'restore_machine':
            $id = $input['machine_id'] ?? null;
            if (!$id) throw new Exception("Invalid Machine ID");

            $pdo->beginTransaction();
            try {
                // Restore logic
                $sql = "UPDATE " . PE_MACHINES_TABLE . " SET is_active = 1, status = 'Active', updated_at = GETDATE() WHERE machine_id = ?";
                $pdo->prepare($sql)->execute([$id]);

                // Record history
                $histSql = "INSERT INTO " . PE_MACHINE_HISTORY_TABLE . " (machine_id, event_type, event_detail, performed_by) VALUES (?, 'Restored', 'Machine restored from Recycle Bin', ?)";
                $pdo->prepare($histSql)->execute([$id, $currentUser['username']]);

                writeLog($pdo, 'RESTORE_MACHINE', 'PE_MACHINE_API', $id, null, null, "Restored machine");
                
                $pdo->commit();
                echo json_encode(['success' => true, 'message' => 'Machine restored successfully']);
            } catch (Exception $e) {
                $pdo->rollBack();
                throw $e;
            }
            break;

            break;

        case 'save_map_positions':
            $positions = $input['positions'] ?? [];
            if (empty($positions) || !is_array($positions)) {
                throw new Exception("Positions array is required");
            }
            
            $pdo->beginTransaction();
            try {
                $stmt = $pdo->prepare("UPDATE " . PE_MACHINES_TABLE . " SET map_x = ?, map_y = ? WHERE machine_code = ?");
                foreach ($positions as $pos) {
                    $code = $pos['machine_code'] ?? null;
                    $x = isset($pos['x']) ? floatval($pos['x']) : null;
                    $y = isset($pos['y']) ? floatval($pos['y']) : null;
                    if ($code && $x !== null && $y !== null) {
                        $stmt->execute([$x, $y, $code]);
                    }
                }
                $pdo->commit();
                echo json_encode(['success' => true, 'message' => 'Map layout saved successfully']);
            } catch (Exception $e) {
                $pdo->rollBack();
                throw $e;
            }
            break;

        default:
            throw new Exception("Invalid action");
    }
} catch (Throwable $e) {
    handleApiError($e, $pdo ?? null, $input ?? $_REQUEST);
}
?>
