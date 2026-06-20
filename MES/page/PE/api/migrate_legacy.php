<?php
// MES/page/PE/api/migrate_legacy.php
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../components/init.php';

requirePermission(['manage_maintenance']);

$action = $_GET['action'] ?? '';

if ($action !== 'run_migration') {
    echo json_encode(['success' => false, 'message' => 'Invalid action']);
    exit;
}

try {
    $results = ['downtime_migrated' => 0, 'wo_migrated' => 0, 'images_copied' => 0, 'errors' => []];

    // 1. Migrate STOP_CAUSES -> PE_DOWNTIME_LOG
    $stmtStop = $pdo->query("SELECT * FROM STOP_CAUSES WITH (NOLOCK)");
    while ($row = $stmtStop->fetch(PDO::FETCH_ASSOC)) {
        // Check if already migrated
        $check = $pdo->prepare("SELECT downtime_id FROM " . PE_DOWNTIME_LOG_TABLE . " WHERE legacy_sc_id = ?");
        $check->execute([$row['id']]);
        if ($check->fetchColumn()) continue;

        $startTime = date('Y-m-d H:i:s', strtotime($row['stop_begin']));
        $endTime = date('Y-m-d H:i:s', strtotime($row['stop_end']));
        $logDate = date('Y-m-d', strtotime($row['log_date']));
        $duration = (int)$row['duration'];

        $sql = "INSERT INTO " . PE_DOWNTIME_LOG_TABLE . " 
                (machine_id, machine_name, line, log_date, start_time, end_time, cause_category, cause_detail, recovered_by, notes, legacy_sc_id)
                VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        $ins = $pdo->prepare($sql);
        $ins->execute([
            $row['machine'],
            $row['line'],
            $logDate,
            $startTime,
            $endTime,
            $row['cause'] ?? 'Other',
            'Legacy migration',
            $row['recovered_by'],
            $row['note'],
            $row['id']
        ]);
        $results['downtime_migrated']++;
    }

    // 2. Migrate MAINTENANCE_REQUESTS -> PE_WORK_ORDERS
    // Helper to generate WO
    function generateMigrationWONumber($pdo, $dateStr) {
        $prefix = "WO-" . date('Ymd', strtotime($dateStr)) . "-";
        $sql = "SELECT TOP 1 wo_number FROM " . PE_WORK_ORDERS_TABLE . " WHERE wo_number LIKE ? ORDER BY wo_id DESC";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$prefix . '%']);
        $last = $stmt->fetchColumn();
        $seq = $last ? ((int)substr($last, -3) + 1) : 1;
        return $prefix . str_pad($seq, 3, '0', STR_PAD_LEFT);
    }

    $stmtWO = $pdo->query("SELECT * FROM MAINTENANCE_REQUESTS WITH (NOLOCK)");
    while ($row = $stmtWO->fetch(PDO::FETCH_ASSOC)) {
        $check = $pdo->prepare("SELECT wo_id FROM " . PE_WORK_ORDERS_TABLE . " WHERE legacy_mt_id = ?");
        $check->execute([$row['id']]);
        if ($check->fetchColumn()) continue;

        $woNumber = generateMigrationWONumber($pdo, $row['request_date']);
        $requestedAt = date('Y-m-d H:i:s', strtotime($row['request_date']));
        $startedAt = $row['started_at'] ? date('Y-m-d H:i:s', strtotime($row['started_at'])) : null;
        $completedAt = $row['resolved_at'] ? date('Y-m-d H:i:s', strtotime($row['resolved_at'])) : null;

        // Image Handling
        $imagePath = null;
        if (!empty($row['photo_before_path'])) {
            $oldPath = __DIR__ . '/../../' . str_replace('../', '', $row['photo_before_path']);
            if (file_exists($oldPath)) {
                $fileInfo = pathinfo($oldPath);
                $newName = 'LEGACY_WO_' . $row['id'] . '_' . time() . '.' . ($fileInfo['extension'] ?? 'jpg');
                $newAbsPath = __DIR__ . '/../../../uploads/pe_images/' . $newName;
                
                if (!file_exists(dirname($newAbsPath))) {
                    mkdir(dirname($newAbsPath), 0777, true);
                }

                if (copy($oldPath, $newAbsPath)) {
                    $imagePath = 'uploads/pe_images/' . $newName;
                    $results['images_copied']++;
                }
            }
        }

        $photoAfter = null;
        if (!empty($row['photo_after_path'])) {
            $oldPath = __DIR__ . '/../../' . str_replace('../', '', $row['photo_after_path']);
            if (file_exists($oldPath)) {
                $fileInfo = pathinfo($oldPath);
                $newName = 'LEGACY_AFTER_' . $row['id'] . '_' . time() . '.' . ($fileInfo['extension'] ?? 'jpg');
                $newAbsPath = __DIR__ . '/../../../uploads/pe_images/' . $newName;
                
                if (!file_exists(dirname($newAbsPath))) {
                    mkdir(dirname($newAbsPath), 0777, true);
                }

                if (copy($oldPath, $newAbsPath)) {
                    $photoAfter = 'uploads/pe_images/' . $newName;
                    $results['images_copied']++;
                }
            }
        }

        $woType = 'Corrective';
        if (stripos($row['job_type'], 'PM') !== false) $woType = 'Preventive';

        $notes = $row['spare_parts_list'] ? "Spare Parts: " . $row['spare_parts_list'] : '';

        $sql = "INSERT INTO " . PE_WORK_ORDERS_TABLE . " 
                (wo_number, wo_type, machine_name, line, priority, status, requested_by, requested_at, 
                 issue_title, issue_detail, assigned_to, started_at, completed_at, repair_minutes, action_taken, image_path, photo_after, legacy_mt_id, parts_used)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        $ins = $pdo->prepare($sql);
        $ins->execute([
            $woNumber,
            $woType,
            $row['machine'],
            $row['line'],
            $row['priority'] ?? 'Normal',
            $row['status'] ?? 'Open',
            $row['request_by'],
            $requestedAt,
            mb_substr($row['issue_description'], 0, 100),
            $row['issue_description'],
            $row['resolved_by'],
            $startedAt,
            $completedAt,
            $row['actual_repair_minutes'] ? (int)$row['actual_repair_minutes'] : null,
            $row['technician_note'] . ($row['spare_parts_list'] ? "\n\n[Legacy Spare Parts]: " . $row['spare_parts_list'] : ''),
            $imagePath,
            $photoAfter,
            $row['id'],
            $row['spare_parts_list']
        ]);
        $results['wo_migrated']++;
    }

    // 3. Post-migration: Sync missing AFTER images if PE_WORK_ORDERS was already migrated earlier
    $stmtSync = $pdo->query("
        SELECT PE.wo_id, PE.legacy_mt_id AS legacy_id, MR.photo_after_path 
        FROM " . PE_WORK_ORDERS_TABLE . " PE WITH (NOLOCK)
        INNER JOIN MAINTENANCE_REQUESTS MR WITH (NOLOCK) ON PE.legacy_mt_id = MR.id 
        WHERE MR.photo_after_path IS NOT NULL AND PE.photo_after IS NULL
    ");
    while ($row = $stmtSync->fetch(PDO::FETCH_ASSOC)) {
        $oldPath = __DIR__ . '/../../' . str_replace('../', '', $row['photo_after_path']);
        if (file_exists($oldPath)) {
            $fileInfo = pathinfo($oldPath);
            $newName = 'LEGACY_AFTER_' . $row['legacy_id'] . '_' . time() . '.' . ($fileInfo['extension'] ?? 'jpg');
            $newAbsPath = __DIR__ . '/../../../uploads/pe_images/' . $newName;
            
            if (copy($oldPath, $newAbsPath)) {
                $photoAfter = 'uploads/pe_images/' . $newName;
                $update = $pdo->prepare("UPDATE " . PE_WORK_ORDERS_TABLE . " SET photo_after = ? WHERE wo_id = ?");
                $update->execute([$photoAfter, $row['wo_id']]);
                $results['images_copied']++;
            }
        }
    }

    echo json_encode(['success' => true, 'message' => 'Migration completed', 'results' => $results]);

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
}
?>
