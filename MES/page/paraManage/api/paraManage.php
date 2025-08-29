<?php
require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../../auth/check_auth.php';
require_once __DIR__ . '/../../logger.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    if (!isset($_SERVER['HTTP_X_CSRF_TOKEN']) || !isset($_SESSION['csrf_token']) || !hash_equals($_SESSION['csrf_token'], $_SERVER['HTTP_X_CSRF_TOKEN'])) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'CSRF token validation failed.']);
        exit;
    }
}

$action = $_REQUEST['action'] ?? '';
$input = json_decode(file_get_contents("php://input"), true);
$currentUser = $_SESSION['user'];

try {
    switch ($action) {
        
        case 'read':
            $sql = "SELECT id, item_id, line, model, part_no, sap_no, planned_output, part_description, part_value, updated_at FROM " . PARAMETER_TABLE;
            $params = [];
            if ($currentUser['role'] === 'supervisor') {
                $sql .= " WHERE line = ?";
                $params[] = $currentUser['line'];
            }
            $sql .= " ORDER BY updated_at DESC";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            foreach ($rows as &$row) {
                if ($row['updated_at']) {
                    $row['updated_at'] = (new DateTime($row['updated_at']))->format('Y-m-d H:i:s');
                }
            }
            echo json_encode(['success' => true, 'data' => $rows]);
            break;

        case 'get_parameters_for_item':
            $item_id = $_GET['item_id'] ?? 0;
            if (!$item_id) {
                throw new Exception("Item ID is required.");
            }
            $sql = "SELECT id, item_id, line, model, part_no, sap_no 
                    FROM " . PARAMETER_TABLE . " 
                    WHERE item_id = ? 
                    ORDER BY line, model";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([(int)$item_id]);
            $parameters = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(['success' => true, 'data' => $parameters]);
            break;

        case 'create':
            $item_id = $input['item_id'] ?? 0;
            $line = strtoupper($input['line'] ?? '');
            $model = strtoupper($input['model'] ?? '');
            $planned_output = (int)($input['planned_output'] ?? 0);
            $part_value_override = isset($input['part_value']) && is_numeric($input['part_value']) ? (float)$input['part_value'] : null;
            $part_description_override = trim($input['part_description'] ?? '');

            if (empty($item_id) || empty($line) || empty($model)) {
                throw new Exception("Item, Line, and Model are required.");
            }
            enforceLinePermission($line);

            $itemStmt = $pdo->prepare("SELECT sap_no, part_no, part_description, part_value FROM " . ITEMS_TABLE . " WHERE item_id = ?");
            $itemStmt->execute([$item_id]);
            $itemMaster = $itemStmt->fetch(PDO::FETCH_ASSOC);

            if (!$itemMaster) {
                throw new Exception("Selected Item ID not found in Item Master.");
            }

            $checkSql = "SELECT COUNT(*) FROM " . PARAMETER_TABLE . " WHERE item_id = ? AND line = ? AND model = ?";
            $checkStmt = $pdo->prepare($checkSql);
            $checkStmt->execute([$item_id, $line, $model]);
            if ($checkStmt->fetchColumn() > 0) {
                 http_response_code(409);
                 throw new Exception("This parameter (Item, Line, Model combination) already exists.");
            }

            $sap_no = $itemMaster['sap_no'];
            $part_no = $itemMaster['part_no'];
            $part_value = $part_value_override ?? $itemMaster['part_value'];
            $part_description = !empty($part_description_override) ? $part_description_override : $itemMaster['part_description'];

            $sql = "INSERT INTO " . PARAMETER_TABLE . " (item_id, line, model, part_no, sap_no, planned_output, part_description, part_value, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, GETDATE())";
            $params = [$item_id, $line, $model, $part_no, $sap_no, $planned_output, $part_description, $part_value];
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            
            logAction($pdo, $currentUser['username'], 'CREATE PARAMETER', $item_id, "{$line}-{$model}-{$part_no}");
            echo json_encode(['success' => true, 'message' => 'Parameter created successfully.']);
            break;

        case 'update':
            $id = $input['id'] ?? null;
            if (!$id) throw new Exception("Missing Parameter ID");
            
            $stmt = $pdo->prepare("SELECT line FROM " . PARAMETER_TABLE . " WHERE id = ?");
            $stmt->execute([$id]);
            $param = $stmt->fetch();
            if ($param) {
                enforceLinePermission($param['line']);
                if ($input['line'] !== $param['line']) {
                    enforceLinePermission($input['line']);
                }
            } else {
                throw new Exception("Parameter not found.");
            }
            
            $item_id = $input['item_id'] ?? 0;
            $sap_no = strtoupper(trim($input['sap_no'] ?? ''));

            if (empty($item_id)) {
                if (empty($sap_no)) {
                    throw new Exception("SAP No. is required to link old parameters.");
                }
                $itemStmt = $pdo->prepare("SELECT item_id FROM " . ITEMS_TABLE . " WHERE sap_no = ? AND is_active = 1");
                $itemStmt->execute([$sap_no]);
                $found_item_id = $itemStmt->fetchColumn();
                
                if (!$found_item_id) {
                    throw new Exception("Associated Item ID not found in Item Master for SAP No: {$sap_no}. Please create it first.");
                }
                $item_id = $found_item_id;
            }

            $line = strtoupper($input['line']);
            $model = strtoupper($input['model']);
            $part_no = strtoupper(trim($input['part_no'] ?? ''));
            
            $updateSql = "UPDATE " . PARAMETER_TABLE . " SET item_id = ?, line = ?, model = ?, part_no = ?, sap_no = ?, planned_output = ?, part_description = ?, part_value = ?, updated_at = GETDATE() WHERE id = ?";
            $params = [$item_id, $line, $model, $part_no, $sap_no, (int)$input['planned_output'], $input['part_description'] ?? null, isset($input['part_value']) && is_numeric($input['part_value']) ? (float)$input['part_value'] : 0.00, $id];
            $stmt = $pdo->prepare($updateSql);
            $stmt->execute($params);

            logAction($pdo, $currentUser['username'], 'UPDATE PARAMETER', $id, "Data updated for ID: $id");
            echo json_encode(["success" => true, 'message' => 'Parameter updated successfully.']);
            break;

        case 'delete':
            $id = $input['id'] ?? 0;
            if (!$id) throw new Exception("Missing ID");
            
            $stmt = $pdo->prepare("SELECT line FROM " . PARAMETER_TABLE . " WHERE id = ?");
            $stmt->execute([$id]);
            $param = $stmt->fetch();
            if ($param) {
                enforceLinePermission($param['line']);
            } else {
                throw new Exception("Parameter not found.");
            }

            $deleteStmt = $pdo->prepare("DELETE FROM " . PARAMETER_TABLE . " WHERE id = ?");
            $deleteStmt->execute([(int)$id]);

            if ($deleteStmt->rowCount() > 0) {
                logAction($pdo, $currentUser['username'], 'DELETE PARAMETER', $id);
            }
            echo json_encode(["success" => true, 'message' => 'Parameter deleted.']);
            break;

        case 'bulk_delete':
            $ids = $input['ids'] ?? [];
            if (empty($ids) || !is_array($ids)) {
                throw new Exception("No IDs provided for bulk deletion.");
            }

            if ($currentUser['role'] === 'supervisor') {
                $placeholders = implode(',', array_fill(0, count($ids), '?'));
                $checkSql = "SELECT COUNT(DISTINCT line) as line_count, MAX(line) as line_name FROM " . PARAMETER_TABLE . " WHERE id IN ({$placeholders})";
                $checkStmt = $pdo->prepare($checkSql);
                $checkStmt->execute($ids);
                $result = $checkStmt->fetch(PDO::FETCH_ASSOC);

                if ($result['line_count'] > 1 || $result['line_name'] !== $currentUser['line']) {
                     throw new Exception("Supervisors can only bulk delete parameters from their own line.");
                }
            }

            $pdo->beginTransaction();
            try {
                $placeholders = implode(',', array_fill(0, count($ids), '?'));
                $sql = "DELETE FROM " . PARAMETER_TABLE . " WHERE id IN ({$placeholders})";
                $stmt = $pdo->prepare($sql);
                $stmt->execute($ids);
                $deletedCount = $stmt->rowCount();
                $pdo->commit();
                
                logAction($pdo, $currentUser['username'], 'BULK DELETE PARAMETER', null, "Deleted {$deletedCount} records. IDs: " . implode(', ', $ids));
                echo json_encode(['success' => true, 'message' => "Successfully deleted {$deletedCount} parameters."]);

            } catch (Exception $e) {
                $pdo->rollBack();
                throw $e;
            }
            break;
            
        case 'bulk_import':
            if (!is_array($input) || empty($input)) throw new Exception("Invalid data");
            
            $pdo->beginTransaction();
            
            $checkSql = "SELECT id FROM " . PARAMETER_TABLE . " WHERE line = ? AND model = ? AND part_no = ? AND (sap_no = ? OR (sap_no IS NULL AND ? IS NULL))";
            $checkStmt = $pdo->prepare($checkSql);
            
            $updateSql = "UPDATE " . PARAMETER_TABLE . " SET planned_output = ?, part_description = ?, part_value = ?, updated_at = GETDATE() WHERE id = ?";
            $updateStmt = $pdo->prepare($updateSql);
            $insertSql = "INSERT INTO " . PARAMETER_TABLE . " (line, model, part_no, sap_no, planned_output, part_description, part_value, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, GETDATE())";
            $insertStmt = $pdo->prepare($insertSql);

            $imported = 0;
            $updated = 0;

            foreach ($input as $row) {
                $line = strtoupper(trim($row['line'] ?? ''));
                $model = strtoupper(trim($row['model'] ?? ''));
                $part_no = strtoupper(trim($row['part_no'] ?? ''));
                $sap_no = !empty($row['sap_no']) ? strtoupper(trim($row['sap_no'])) : null;

                if (empty($line) || empty($model) || empty($part_no)) {
                    continue; 
                }
                
                enforceLinePermission($line);
                $checkStmt->execute([$line, $model, $part_no, $sap_no, $sap_no]);
                $existing = $checkStmt->fetch();

                if ($existing) {
                    if (isset($row['planned_output']) || isset($row['part_description']) || isset($row['part_value'])) {
                        $planned_output = (int)($row['planned_output'] ?? 0);
                        $part_description = trim($row['part_description'] ?? '');
                        $part_value = isset($row['part_value']) && is_numeric($row['part_value']) ? (float)$row['part_value'] : 0.00;
                        
                        $updateStmt->execute([$planned_output, $part_description, $part_value, $existing['id']]);
                        $updated++;
                    }
                } else {
                    $planned_output = (int)($row['planned_output'] ?? 0);
                    $part_description = trim($row['part_description'] ?? null);
                    $part_value = isset($row['part_value']) && is_numeric($row['part_value']) ? (float)$row['part_value'] : 0.00;

                    $insertStmt->execute([$line, $model, $part_no, $sap_no, $planned_output, $part_description, $part_value]);
                    $imported++;
                }
            }

            $pdo->commit();
            logAction($pdo, $currentUser['username'], 'BULK IMPORT/UPDATE PARAMETER', null, "Imported $imported rows, Updated $updated rows");
            echo json_encode(["success" => true, "imported" => $imported, "updated" => $updated, "message" => "Imported $imported new row(s) and updated $updated existing row(s) successfully."]);
            break;

        case 'create_variants':
            $source_id = $input['source_param_id'] ?? null;
            $variants_str = $input['variants'] ?? '';

            if (!$source_id || empty($variants_str)) {
                throw new Exception("Source Parameter ID and Variant suffixes are required.");
            }

            $pdo->beginTransaction();

            try {
                $sourceStmt = $pdo->prepare("SELECT * FROM " . PARAMETER_TABLE . " WHERE id = ?");
                $sourceStmt->execute([$source_id]);
                $sourceParam = $sourceStmt->fetch(PDO::FETCH_ASSOC);

                if (!$sourceParam) {
                    throw new Exception("Source Parameter with ID {$source_id} not found.");
                }
                
                enforceLinePermission($sourceParam['line']);

                $paramInsertSql = "INSERT INTO " . PARAMETER_TABLE . " (line, model, part_no, sap_no, planned_output, part_description, part_value, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, GETDATE())";
                $paramInsertStmt = $pdo->prepare($paramInsertSql);

                $checkParamSql = "SELECT COUNT(*) FROM " . PARAMETER_TABLE . " WHERE line = ? AND model = ? AND part_no = ?";
                $checkParamStmt = $pdo->prepare($checkParamSql);

                $variants = array_map('trim', explode(',', strtoupper($variants_str)));
                $createdCount = 0;

                foreach ($variants as $suffix) {
                    if (empty($suffix)) continue;
                    $new_part_no = $sourceParam['part_no'] . '-' . $suffix;
                    $checkParamStmt->execute([$sourceParam['line'], $sourceParam['model'], $new_part_no]);
                    if ($checkParamStmt->fetchColumn() == 0) {
                         $paramInsertStmt->execute([$sourceParam['line'], $sourceParam['model'], $new_part_no, null, $sourceParam['planned_output'], $sourceParam['part_description'] . ' (' . $suffix . ')', $sourceParam['part_value']]);
                        $createdCount++;
                    }
                }

                $pdo->commit();
                logAction($pdo, $currentUser['username'], 'CREATE VARIANTS', $source_id, "Created {$createdCount} variants for Part: {$sourceParam['part_no']}");
                echo json_encode(['success' => true, 'message' => "Successfully created {$createdCount} new variants."]);

            } catch (Exception $e) {
                $pdo->rollBack();
                throw $e;
            }
            break;

        case 'bulk_create_variants':
            $source_ids = $input['ids'] ?? [];
            $variants_str = $input['variants'] ?? '';

            if (empty($source_ids) || !is_array($source_ids) || empty($variants_str)) {
                throw new Exception("Source Parameter IDs and Variant suffixes are required.");
            }

            $pdo->beginTransaction();
            try {
                $sourceStmt = $pdo->prepare("SELECT * FROM " . PARAMETER_TABLE . " WHERE id = ?");
                $paramInsertStmt = $pdo->prepare("INSERT INTO " . PARAMETER_TABLE . " (line, model, part_no, sap_no, planned_output, part_description, part_value, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, GETDATE())");
                $checkParamStmt = $pdo->prepare("SELECT COUNT(*) FROM " . PARAMETER_TABLE . " WHERE line = ? AND model = ? AND part_no = ?");
                
                $variants = array_map('trim', explode(',', strtoupper($variants_str)));
                $totalCreatedCount = 0;
                $processedParts = [];

                foreach ($source_ids as $source_id) {
                    $sourceStmt->execute([$source_id]);
                    $sourceParam = $sourceStmt->fetch(PDO::FETCH_ASSOC);
                    if (!$sourceParam) continue;
                    enforceLinePermission($sourceParam['line']);
                    
                    foreach ($variants as $suffix) {
                        if (empty($suffix)) continue;
                        $new_part_no = $sourceParam['part_no'] . '-' . $suffix;
                        $checkParamStmt->execute([$sourceParam['line'], $sourceParam['model'], $new_part_no]);
                        if ($checkParamStmt->fetchColumn() == 0) {
                             $paramInsertStmt->execute([$sourceParam['line'], $sourceParam['model'], $new_part_no, null, $sourceParam['planned_output'], $sourceParam['part_description'] . ' (' . $suffix . ')', $sourceParam['part_value']]);
                            $totalCreatedCount++;
                        }
                    }
                    $processedParts[] = $sourceParam['part_no'];
                }

                $pdo->commit();
                logAction($pdo, $currentUser['username'], 'BULK CREATE VARIANTS', null, "Created {$totalCreatedCount} variants for Parts: " . implode(', ', $processedParts));
                echo json_encode(['success' => true, 'message' => "Successfully created {$totalCreatedCount} new variants."]);

            } catch (Exception $e) {
                $pdo->rollBack();
                throw $e;
            }
            break;

        // ===== START: โค้ดที่เพิ่มกลับเข้ามา =====
        case 'read_schedules':
            $stmt = $pdo->prepare("EXEC dbo.sp_GetSchedules");
            $stmt->execute();
            $schedules = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(['success' => true, 'data' => $schedules]);
            break;

        case 'save_schedule':
            try {
                $stmt = $pdo->prepare("EXEC dbo.sp_SaveSchedule @id=?, @line=?, @shift_name=?, @start_time=?, @end_time=?, @planned_break_minutes=?, @is_active=?");
                $success = $stmt->execute([
                    $input['id'] ?? 0,
                    $input['line'],
                    $input['shift_name'],
                    $input['start_time'],
                    $input['end_time'],
                    $input['planned_break_minutes'],
                    $input['is_active']
                ]);

                if ($success) {
                    $actionType = ($input['id'] ?? 0) > 0 ? 'UPDATE SCHEDULE' : 'CREATE SCHEDULE';
                    logAction($pdo, $currentUser['username'], $actionType, $input['id'] ?? null, "{$input['line']}-{$input['shift_name']}");
                    echo json_encode(['success' => true, 'message' => 'Schedule saved successfully.']);
                } else {
                    throw new Exception("The stored procedure did not execute successfully, but did not throw an error.");
                }

            } catch (PDOException $e) {
                if ($e->getCode() == '23000') {
                    http_response_code(409); 
                    echo json_encode(['success' => false, 'message' => "Schedule for this Line and Shift already exists. Please choose a different combination."]);
                } else {
                    throw $e;
                }
            }
            break;

        case 'delete_schedule':
            $id = $input['id'] ?? 0;
            if (!$id) throw new Exception("Missing Schedule ID");
            $stmt = $pdo->prepare("EXEC dbo.sp_DeleteSchedule @id=?");
            $success = $stmt->execute([(int)$id]);
            if ($success && $stmt->rowCount() > 0) {
                logAction($pdo, $currentUser['username'], 'DELETE SCHEDULE', $id);
            }
            echo json_encode(['success' => $success, 'message' => 'Schedule deleted.']);
            break;
        // ===== END: โค้ดที่เพิ่มกลับเข้ามา =====

        case 'health_check_parameters':
            if (defined('USE_NEW_OEE_CALCULATION') && USE_NEW_OEE_CALCULATION === true) {
                $sql = "
                    SELECT DISTINCT i.sap_no, i.part_no, i.part_description
                    FROM " . TRANSACTIONS_TABLE . " t
                    JOIN " . ITEMS_TABLE . " i ON t.parameter_id = i.item_id
                    WHERE t.transaction_type LIKE 'PRODUCTION_%' AND (i.planned_output IS NULL OR i.planned_output <= 0)
                    ORDER BY i.sap_no";
                $stmt = $pdo->prepare($sql);
                $stmt->execute();
                $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

            } else {
                $stmt = $pdo->prepare("EXEC dbo.sp_GetMissingParameters");
                $stmt->execute();
                $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
            }
            echo json_encode(['success' => true, 'data' => $results]);
            break;

        case 'find_parameter_for_bom':
            $sap_no = trim($input['sap_no'] ?? '');
            $model = trim($input['model'] ?? '');
            $part_no = trim($input['part_no'] ?? '');
            $line = trim($input['line'] ?? '');

            $sql = "SELECT id, item_id, line, model, part_no, sap_no FROM " . PARAMETER_TABLE . " WHERE ";
            $params = [];

            if (!empty($sap_no)) {
                $sql .= "sap_no = ?";
                $params[] = $sap_no;
            } elseif (!empty($line) && !empty($model) && !empty($part_no)) {
                $sql .= "line = ? AND model = ? AND part_no = ?";
                $params[] = $line;
                $params[] = $model;
                $params[] = $part_no;
            } else {
                throw new Exception("Insufficient data provided. Please provide SAP No. or Line/Model/Part No. combination.");
            }

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $parameter = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($parameter) {
                if (empty($parameter['item_id'])) {
                    echo json_encode(['success' => false, 'message' => 'This parameter is not linked to an Item Master record yet. Please edit and save it first.']);
                } else {
                    echo json_encode(['success' => true, 'data' => $parameter]);
                }
            } else {
                echo json_encode(['success' => false, 'message' => 'Parameter not found with the specified criteria.']);
            }
            break;

        case 'get_parts_by_model':
            $model = trim($_GET['model'] ?? '');
            if (empty($model)) {
                echo json_encode(['success' => true, 'data' => []]);
                exit;
            }
            $sql = "SELECT DISTINCT part_no FROM " . PARAMETER_TABLE . " WHERE model = ? ORDER BY part_no";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$model]);
            $parts = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(['success' => true, 'data' => $parts]);
            break;

        case 'get_parameter_by_key':
            $sap_no = trim($_GET['sap_no'] ?? '');
            $line = trim($_GET['line'] ?? '');
            $model = trim($_GET['model'] ?? '');
            $part_no = trim($_GET['part_no'] ?? '');
            $sql = "SELECT * FROM " . PARAMETER_TABLE . " WHERE ";
            $params = [];
            if (!empty($sap_no)) {
                $sql .= "sap_no = ?";
                $params[] = $sap_no;
            } elseif (!empty($line) && !empty($model) && !empty($part_no)) {
                $sql .= "line = ? AND model = ? AND part_no = ?";
                $params[] = $line;
                $params[] = $model;
                $params[] = $part_no;
            } else {
                echo json_encode(['success' => false, 'message' => 'Insufficient keys.']);
                exit;
            }
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $parameter = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($parameter) {
                echo json_encode(['success' => true, 'data' => $parameter]);
            } else {
                echo json_encode(['success' => false, 'data' => null]);
            }
            break;

        case 'get_lines':
            if ($currentUser['role'] === 'supervisor') {
                echo json_encode(['success' => true, 'data' => [$currentUser['line']]]);
            } else {
                $stmt = $pdo->query("SELECT DISTINCT line FROM " . PARAMETER_TABLE . " WHERE line IS NOT NULL AND line != '' ORDER BY line");
                $lines = $stmt->fetchAll(PDO::FETCH_COLUMN);
                echo json_encode(['success' => true, 'data' => $lines]);
            }
            break;

        case 'get_models':
            $stmt = $pdo->query("SELECT DISTINCT model FROM " . PARAMETER_TABLE . " WHERE model IS NOT NULL AND model != '' ORDER BY model ASC");
            $models = $stmt->fetchAll(PDO::FETCH_COLUMN);
            echo json_encode(['success' => true, 'data' => $models]);
            break;

        default:
            http_response_code(400);
            throw new Exception("Invalid action specified.");
    }
} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
    error_log("Error in paraManage.php (Unified API): " . $e->getMessage());
}
?>