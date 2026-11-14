<?php
/**
 * PE Enterprise Machine Master API (Self-Contained Toolbox Version)
 * Manages PE_MACHINES, PE_MACHINE_HISTORY, status toggles, soft-delete/restore, and detail views.
 */

require_once __DIR__ . '/_common.php';

try {
    [$action, $input, $currentUser] = parsePeRequest();
    requirePeAccess();
    $actor = getPeActorName($currentUser);

    switch ($action) {
        case 'get_machines': {
            $reqStatus = trim((string)($input['status'] ?? ''));
            $isDeleted = ($reqStatus === 'Deleted');
            $conditions = [$isDeleted ? 'is_active = 0' : 'is_active = 1'];
            $params = [];

            if (!empty($input['iiot_only'])) {
                $conditions[] = "(mqtt_topic IS NOT NULL AND mqtt_topic != '')";
            }
            if (!empty($input['line'])) {
                $conditions[] = 'line = ?';
                $params[] = trim((string)$input['line']);
            }
            if (!empty($input['area_id'])) {
                $conditions[] = 'area_id = ?';
                $params[] = (int)$input['area_id'];
            }
            if ($reqStatus !== '' && !$isDeleted) {
                $conditions[] = 'status = ?';
                $params[] = $reqStatus;
            }
            if (!empty($input['machine_type'])) {
                $conditions[] = 'machine_type = ?';
                $params[] = trim((string)$input['machine_type']);
            }

            $limit = max(1, min(1000, (int)($input['limit'] ?? 500)));
            $where = 'WHERE ' . implode(' AND ', $conditions);
            $sql = "SELECT TOP {$limit}
                        machine_id, machine_code, machine_name, line, area, area_id,
                        machine_type, manufacturer, model, serial_number, asset_no,
                        install_date, status, criticality, notes, image_path, photo_path,
                        mqtt_topic, map_x, map_y, is_loto, loto_reason, is_active, created_at, updated_at
                    FROM " . PE_MACHINES_TABLE . " WITH (NOLOCK)
                    {$where}
                    ORDER BY line ASC, machine_code ASC";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $statsSql = "SELECT
                            COUNT(*) AS total,
                            SUM(CASE WHEN status = 'Active' THEN 1 ELSE 0 END) AS active_count,
                            SUM(CASE WHEN status = 'Under Repair' THEN 1 ELSE 0 END) AS repair_count,
                            SUM(CASE WHEN status = 'Inactive' THEN 1 ELSE 0 END) AS inactive_count,
                            SUM(CASE WHEN ISNULL(is_loto, 0) = 1 THEN 1 ELSE 0 END) AS loto_count
                         FROM " . PE_MACHINES_TABLE . " WITH (NOLOCK)
                         WHERE is_active = 1";
            $stats = $pdo->query($statsSql)->fetch(PDO::FETCH_ASSOC) ?: [];

            $lines = $pdo->query("SELECT DISTINCT line FROM " . PE_MACHINES_TABLE . " WITH (NOLOCK) WHERE line IS NOT NULL AND line != '' AND is_active = 1 ORDER BY line")->fetchAll(PDO::FETCH_COLUMN);
            $types = $pdo->query("SELECT DISTINCT machine_type FROM " . PE_MACHINES_TABLE . " WITH (NOLOCK) WHERE machine_type IS NOT NULL AND machine_type != '' AND is_active = 1 ORDER BY machine_type")->fetchAll(PDO::FETCH_COLUMN);

            peJsonSuccess($data, 'โหลดทะเบียนเครื่องจักรสำเร็จ', [
                'stats' => $stats,
                'filters' => ['lines' => $lines, 'types' => $types],
            ]);
            break;
        }

        case 'get_machine': {
            $id = parsePePositiveInt($input['id'] ?? $input['machine_id'] ?? null, 'รหัสเครื่องจักร');

            $stmt = $pdo->prepare(
                "SELECT machine_id, machine_code, machine_name, line, area, area_id,
                        machine_type, manufacturer, model, serial_number, asset_no,
                        install_date, status, criticality, specifications, notes,
                        image_path, photo_path, mqtt_topic, map_x, map_y, is_loto, loto_reason,
                        is_active, created_at, updated_at
                 FROM " . PE_MACHINES_TABLE . " WITH (NOLOCK)
                 WHERE machine_id = ?"
            );
            $stmt->execute([$id]);
            $machine = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$machine) {
                peJsonError('ไม่พบข้อมูลเครื่องจักรในระบบ', 404);
            }

            $histStmt = $pdo->prepare(
                "SELECT TOP 20 history_id, machine_id, event_type, event_detail, performed_by, event_date
                 FROM " . PE_MACHINE_HISTORY_TABLE . " WITH (NOLOCK)
                 WHERE machine_id = ?
                 ORDER BY event_date DESC, history_id DESC"
            );
            $histStmt->execute([$id]);
            $history = $histStmt->fetchAll(PDO::FETCH_ASSOC);

            $woStmt = $pdo->prepare(
                "SELECT TOP 15 wo_id, wo_number, wo_type, status, priority, issue_title, assigned_to, requested_at, completed_at, repair_minutes, total_cost
                 FROM " . PE_WORK_ORDERS_TABLE . " WITH (NOLOCK)
                 WHERE machine_id = ? AND is_active = 1
                 ORDER BY requested_at DESC"
            );
            $woStmt->execute([$id]);
            $workOrders = $woStmt->fetchAll(PDO::FETCH_ASSOC);

            $dtStmt = $pdo->prepare(
                "SELECT TOP 15 downtime_id, log_date, start_time, end_time, duration_min, cause_category, cause_detail, recovered_by
                 FROM " . PE_DOWNTIME_LOG_TABLE . " WITH (NOLOCK)
                 WHERE machine_id = ?
                 ORDER BY log_date DESC, downtime_id DESC"
            );
            $dtStmt->execute([$id]);
            $downtimes = $dtStmt->fetchAll(PDO::FETCH_ASSOC);

            peJsonSuccess($machine, 'โหลดรายละเอียดเครื่องจักรสำเร็จ', [
                'history' => $history,
                'work_orders' => $workOrders,
                'downtimes' => $downtimes,
            ]);
            break;
        }

        case 'save_machine': {
            requirePeAccess(['manage_maintenance', 'manage_production'], ['admin', 'creator', 'manager', 'maintenance', 'engineer', 'supervisor']);

            $id = !empty($input['machine_id']) ? parsePePositiveInt($input['machine_id'], 'รหัสเครื่องจักร') : null;
            $code = strtoupper(trim((string)($input['machine_code'] ?? '')));
            $name = trim((string)($input['machine_name'] ?? ''));
            if ($code === '' || $name === '') {
                throw new InvalidArgumentException('กรุณาระบุรหัสเครื่องจักร (Machine Code) และชื่อเครื่องจักร');
            }

            $mqttTopic = mb_substr(trim((string)($input['mqtt_topic'] ?? '')), 0, 255);
            $line = mb_substr(trim((string)($input['line'] ?? '')), 0, 100);
            $area = mb_substr(trim((string)($input['area'] ?? '')), 0, 100);
            $type = mb_substr(trim((string)($input['machine_type'] ?? '')), 0, 100);
            $manufacturer = mb_substr(trim((string)($input['manufacturer'] ?? '')), 0, 100);
            $model = mb_substr(trim((string)($input['model'] ?? '')), 0, 100);
            $serial = mb_substr(trim((string)($input['serial_number'] ?? '')), 0, 100);
            $assetNo = mb_substr(trim((string)($input['asset_no'] ?? '')), 0, 100);
            $installDate = parsePeDateOrNull($input['install_date'] ?? null);
            $status = in_array($input['status'] ?? 'Active', ['Active', 'Under Repair', 'Inactive'], true)
                ? (string)$input['status']
                : 'Active';
            $criticality = in_array($input['criticality'] ?? 'Medium', ['High', 'Medium', 'Low'], true)
                ? (string)$input['criticality']
                : 'Medium';
            $notes = trim((string)($input['notes'] ?? ''));
            $areaId = !empty($input['area_id']) ? (int)$input['area_id'] : null;
            $mapX = isset($input['map_x']) && $input['map_x'] !== '' ? (float)$input['map_x'] : null;
            $mapY = isset($input['map_y']) && $input['map_y'] !== '' ? (float)$input['map_y'] : null;

            $imagePath = !empty($input['image_path']) ? trim((string)$input['image_path']) : null;
            if (!empty($input['image_base64'])) {
                $imagePath = savePeBase64Image((string)$input['image_base64'], 'pe_images', 'MC_');
            }

            $checkStmt = $pdo->prepare("SELECT machine_id FROM " . PE_MACHINES_TABLE . " WITH (NOLOCK) WHERE machine_code = ?");
            $checkStmt->execute([$code]);
            $existingId = $checkStmt->fetchColumn();

            $pdo->beginTransaction();

            if ($id === null) {
                if ($existingId) {
                    throw new InvalidArgumentException("รหัสเครื่องจักร '{$code}' ถูกใช้งานแล้วในระบบ");
                }

                $sql = "INSERT INTO " . PE_MACHINES_TABLE . "
                        (machine_code, machine_name, mqtt_topic, line, area, area_id, machine_type,
                         manufacturer, model, serial_number, asset_no, install_date, status, criticality,
                         notes, image_path, map_x, map_y, is_active, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, GETDATE())";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([
                    $code, $name, $mqttTopic, $line, $area, $areaId, $type,
                    $manufacturer, $model, $serial, $assetNo, $installDate, $status, $criticality,
                    $notes, $imagePath, $mapX, $mapY,
                ]);
                $newId = (int)$pdo->lastInsertId();

                $pdo->prepare("INSERT INTO " . PE_MACHINE_HISTORY_TABLE . " (machine_id, event_type, event_detail, performed_by) VALUES (?, 'Created', ?, ?)")
                    ->execute([$newId, "Machine registered: {$code} - {$name}", $actor]);

                writeLog($pdo, 'CREATE', 'PE_MACHINES', $newId, null, [
                    'machine_code' => $code,
                    'machine_name' => $name,
                    'line' => $line,
                    'status' => $status,
                ], "Registered machine {$code}");

                $pdo->commit();
                peJsonSuccess(['machine_id' => $newId, 'machine_code' => $code], 'ขึ้นทะเบียนเครื่องจักรใหม่เรียบร้อยแล้ว');
            } else {
                if ($existingId && (int)$existingId !== $id) {
                    throw new InvalidArgumentException("รหัสเครื่องจักร '{$code}' ซ้ำกับเครื่องจักรรายการอื่น");
                }

                $oldStmt = $pdo->prepare("SELECT machine_id, machine_code, machine_name, line, status, criticality FROM " . PE_MACHINES_TABLE . " WHERE machine_id = ?");
                $oldStmt->execute([$id]);
                $oldRow = $oldStmt->fetch(PDO::FETCH_ASSOC);
                if (!$oldRow) {
                    throw new InvalidArgumentException('ไม่พบเครื่องจักรที่ต้องการแก้ไข');
                }

                $sql = "UPDATE " . PE_MACHINES_TABLE . " SET
                            machine_code = ?, machine_name = ?, mqtt_topic = ?, line = ?, area = ?,
                            area_id = ISNULL(?, area_id), machine_type = ?, manufacturer = ?, model = ?,
                            serial_number = ?, asset_no = ?, install_date = ?, status = ?, criticality = ?,
                            notes = ?, image_path = ISNULL(?, image_path), map_x = ISNULL(?, map_x),
                            map_y = ISNULL(?, map_y), updated_at = GETDATE()
                        WHERE machine_id = ?";
                $pdo->prepare($sql)->execute([
                    $code, $name, $mqttTopic, $line, $area,
                    $areaId, $type, $manufacturer, $model,
                    $serial, $assetNo, $installDate, $status, $criticality,
                    $notes, $imagePath, $mapX, $mapY, $id,
                ]);

                $pdo->prepare("INSERT INTO " . PE_MACHINE_HISTORY_TABLE . " (machine_id, event_type, event_detail, performed_by) VALUES (?, 'Updated', ?, ?)")
                    ->execute([$id, "Machine updated by {$actor}", $actor]);

                writeLog($pdo, 'UPDATE', 'PE_MACHINES', $id, $oldRow, [
                    'machine_code' => $code,
                    'machine_name' => $name,
                    'line' => $line,
                    'status' => $status,
                    'criticality' => $criticality,
                ], "Updated machine {$code}");

                $pdo->commit();
                peJsonSuccess(['machine_id' => $id], 'บันทึกการแก้ไขข้อมูลเครื่องจักรเรียบร้อยแล้ว');
            }
            break;
        }

        case 'toggle_status': {
            requirePeAccess(['manage_maintenance', 'manage_production'], ['admin', 'creator', 'manager', 'maintenance', 'engineer', 'supervisor']);
            $id = parsePePositiveInt($input['machine_id'] ?? null, 'รหัสเครื่องจักร');
            $newStatus = trim((string)($input['status'] ?? ''));
            if (!in_array($newStatus, ['Active', 'Under Repair', 'Inactive'], true)) {
                throw new InvalidArgumentException('สถานะเครื่องจักรไม่ถูกต้อง');
            }

            $oldStmt = $pdo->prepare("SELECT machine_code, status FROM " . PE_MACHINES_TABLE . " WHERE machine_id = ?");
            $oldStmt->execute([$id]);
            $oldRow = $oldStmt->fetch(PDO::FETCH_ASSOC);
            if (!$oldRow) {
                throw new InvalidArgumentException('ไม่พบข้อมูลเครื่องจักร');
            }

            $pdo->beginTransaction();
            $pdo->prepare("UPDATE " . PE_MACHINES_TABLE . " SET status = ?, updated_at = GETDATE() WHERE machine_id = ?")
                ->execute([$newStatus, $id]);
            $pdo->prepare("INSERT INTO " . PE_MACHINE_HISTORY_TABLE . " (machine_id, event_type, event_detail, performed_by) VALUES (?, 'Status Change', ?, ?)")
                ->execute([$id, "Status changed: {$oldRow['status']} -> {$newStatus}", $actor]);
            writeLog($pdo, 'UPDATE', 'PE_MACHINES', $id, $oldRow, ['status' => $newStatus], "Changed status to {$newStatus}");
            $pdo->commit();

            peJsonSuccess(['machine_id' => $id, 'status' => $newStatus], "อัปเดตสถานะเป็น {$newStatus} เรียบร้อยแล้ว");
            break;
        }

        case 'delete_machine': {
            requirePeAccess(['manage_maintenance'], ['admin', 'creator', 'manager', 'maintenance']);
            $id = parsePePositiveInt($input['machine_id'] ?? null, 'รหัสเครื่องจักร');
            $oldStmt = $pdo->prepare("SELECT machine_code, machine_name, is_active FROM " . PE_MACHINES_TABLE . " WHERE machine_id = ?");
            $oldStmt->execute([$id]);
            $oldRow = $oldStmt->fetch(PDO::FETCH_ASSOC);
            if (!$oldRow) {
                throw new InvalidArgumentException('ไม่พบข้อมูลเครื่องจักร');
            }

            $pdo->beginTransaction();
            $pdo->prepare("UPDATE " . PE_MACHINES_TABLE . " SET is_active = 0, updated_at = GETDATE() WHERE machine_id = ?")->execute([$id]);
            $pdo->prepare("INSERT INTO " . PE_MACHINE_HISTORY_TABLE . " (machine_id, event_type, event_detail, performed_by) VALUES (?, 'Deleted', 'Soft deleted from PE registry', ?)")
                ->execute([$id, $actor]);
            writeLog($pdo, 'DELETE', 'PE_MACHINES', $id, $oldRow, ['is_active' => 0], "Soft deleted machine {$oldRow['machine_code']}");
            $pdo->commit();

            peJsonSuccess(['machine_id' => $id], 'ย้ายเครื่องจักรไปยังรายการที่ลบเรียบร้อยแล้ว');
            break;
        }

        case 'restore_machine': {
            requirePeAccess(['manage_maintenance'], ['admin', 'creator', 'manager', 'maintenance']);
            $id = parsePePositiveInt($input['machine_id'] ?? null, 'รหัสเครื่องจักร');
            $oldStmt = $pdo->prepare("SELECT machine_code, machine_name, is_active FROM " . PE_MACHINES_TABLE . " WHERE machine_id = ?");
            $oldStmt->execute([$id]);
            $oldRow = $oldStmt->fetch(PDO::FETCH_ASSOC);
            if (!$oldRow) {
                throw new InvalidArgumentException('ไม่พบข้อมูลเครื่องจักร');
            }

            $pdo->beginTransaction();
            $pdo->prepare("UPDATE " . PE_MACHINES_TABLE . " SET is_active = 1, updated_at = GETDATE() WHERE machine_id = ?")->execute([$id]);
            $pdo->prepare("INSERT INTO " . PE_MACHINE_HISTORY_TABLE . " (machine_id, event_type, event_detail, performed_by) VALUES (?, 'Restored', 'Restored to active registry', ?)")
                ->execute([$id, $actor]);
            writeLog($pdo, 'UPDATE', 'PE_MACHINES', $id, $oldRow, ['is_active' => 1], "Restored machine {$oldRow['machine_code']}");
            $pdo->commit();

            peJsonSuccess(['machine_id' => $id], 'กู้คืนเครื่องจักรกลับสู่รายการใช้งานเรียบร้อยแล้ว');
            break;
        }

        case 'get_lines': {
            $lines = $pdo->query("SELECT DISTINCT line FROM " . PE_MACHINES_TABLE . " WITH (NOLOCK) WHERE is_active = 1 AND line IS NOT NULL AND line != '' ORDER BY line ASC")->fetchAll(PDO::FETCH_COLUMN);
            peJsonSuccess($lines, 'โหลดรายชื่อไลน์ผลิตสำเร็จ');
            break;
        }

        default:
            peJsonError('Invalid action requested', 400);
    }
} catch (Throwable $e) {
    handleApiError($e, $pdo ?? null, $input ?? $_REQUEST);
}
