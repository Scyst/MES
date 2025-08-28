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
        case 'get_bom_components':
            $fg_item_id = $_GET['fg_item_id'] ?? 0;
            $line = $_GET['line'] ?? '';
            $model = $_GET['model'] ?? '';
            
            enforceLinePermission($line); 

            if (empty($fg_item_id) || empty($line) || empty($model)) {
                throw new Exception("FG Item ID, Line, and Model are required.");
            }
            
            $sql = "
                SELECT 
                    b.bom_id, 
                    b.quantity_required,
                    i.part_no as component_part_no,
                    i.sap_no as component_sap_no,
                    i.part_description
                FROM " . BOM_TABLE . " b
                JOIN " . ITEMS_TABLE . " i ON b.component_item_id = i.item_id
                WHERE b.fg_item_id = ? AND b.line = ? AND b.model = ?
                ORDER BY i.sap_no ASC";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$fg_item_id, $line, $model]);
            $components = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(['success' => true, 'data' => $components]);
            break;

        case 'add_bom_component':
            try {
                $fg_item_id = $input['fg_item_id'] ?? 0;
                $line = $input['line'] ?? '';
                $model = $input['model'] ?? '';
                $component_item_id = $input['component_item_id'] ?? 0;
                $quantity_required = $input['quantity_required'] ?? 0;
                enforceLinePermission($line);

                if (empty($fg_item_id) || empty($line) || empty($model) || empty($component_item_id) || empty($quantity_required)) {
                    throw new Exception("Missing required fields.");
                }
                if ($fg_item_id == $component_item_id) {
                    throw new Exception("Finished Good and Component cannot be the same item.");
                }

                $sql = "INSERT INTO " . BOM_TABLE . " (fg_item_id, line, model, component_item_id, quantity_required, updated_by, updated_at) VALUES (?, ?, ?, ?, ?, ?, GETDATE())";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([(int)$fg_item_id, $line, $model, (int)$component_item_id, (int)$quantity_required, $currentUser['username']]);
                
                logAction($pdo, $currentUser['username'], 'ADD BOM COMPONENT', "FG_ID: $fg_item_id ($line/$model)", "Comp_ID: $component_item_id");
                echo json_encode(['success' => true, 'message' => 'Component added successfully.']);

            } catch (PDOException $e) {
                if ($e->getCode() == '23000') {
                    http_response_code(409); // 409 Conflict
                    echo json_encode(['success' => false, 'message' => 'This component already exists in the BOM.']);
                } else {
                    throw $e; 
                }
            }
            break;

        case 'update_bom_component':
            $bom_id = $input['bom_id'] ?? 0;
            $quantity_required = $input['quantity_required'] ?? null;

            if (empty($bom_id) || !is_numeric($quantity_required)) {
                throw new Exception("BOM ID and a numeric Quantity are required.");
            }

            $findStmt = $pdo->prepare("SELECT line FROM " . BOM_TABLE . " WHERE bom_id = ?");
            $findStmt->execute([$bom_id]);
            $bom_item = $findStmt->fetch();
            if ($bom_item) {
                enforceLinePermission($bom_item['line']);
            } else {
                throw new Exception("BOM component not found.");
            }

            $sql = "UPDATE " . BOM_TABLE . " SET quantity_required = ?, updated_by = ?, updated_at = GETDATE() WHERE bom_id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([(int)$quantity_required, $currentUser['username'], $bom_id]);

            logAction($pdo, $currentUser['username'], 'UPDATE BOM COMPONENT', "BOM_ID: $bom_id", "New Qty: $quantity_required");
            echo json_encode(['success' => true, 'message' => 'Component quantity updated.']);
            break;

        case 'delete_bom_component':
            $bom_id = $input['bom_id'] ?? 0;
            if (empty($bom_id)) throw new Exception("Missing bom_id.");

            $findStmt = $pdo->prepare("SELECT * FROM " . BOM_TABLE . " WHERE bom_id = ?");
            $findStmt->execute([$bom_id]);
            $bom_item = $findStmt->fetch(PDO::FETCH_ASSOC);
            if ($bom_item) {
                enforceLinePermission($bom_item['line']);
            } else {
                throw new Exception("BOM component not found.");
            }

            $deleteStmt = $pdo->prepare("DELETE FROM " . BOM_TABLE . " WHERE bom_id = ?");
            $deleteStmt->execute([$bom_id]);

            if ($deleteStmt->rowCount() > 0) {
                // ** แก้ไข: อัปเดต timestamp โดยใช้ item_id **
                $updateSql = "UPDATE " . BOM_TABLE . " SET updated_at = GETDATE(), updated_by = ? WHERE fg_item_id = ? AND line = ? AND model = ?";
                $updateStmt = $pdo->prepare($updateSql);
                $updateStmt->execute([$currentUser['username'], $bom_item['fg_item_id'], $bom_item['line'], $bom_item['model']]);
                
                logAction($pdo, $currentUser['username'], 'DELETE BOM COMPONENT', "BOM_ID: $bom_id");
                echo json_encode(['success' => true, 'message' => 'Component deleted successfully.']);
            } else {
                throw new Exception("Component not found or could not be deleted.");
            }
            break;

        case 'get_bom_export_template':
            $fg_item_id = $_GET['fg_item_id'] ?? 0;
            $line = $_GET['line'] ?? '';
            $model = $_GET['model'] ?? '';
            enforceLinePermission($line);

            if (empty($fg_item_id) || empty($line) || empty($model)) {
                throw new Exception("FG Item ID, Line, and Model are required for export.");
            }

            $sql = "
                SELECT 
                    '' AS ACTION,
                    fg_item.sap_no AS FG_SAP_NO,
                    b.line AS LINE,
                    b.model AS MODEL,
                    comp_item.sap_no AS COMPONENT_SAP_NO,
                    b.quantity_required AS QUANTITY_REQUIRED,
                    fg_item.part_no AS FG_PART_NO,
                    comp_item.part_no AS COMPONENT_PART_NO
                FROM " . BOM_TABLE . " b
                JOIN " . ITEMS_TABLE . " fg_item ON b.fg_item_id = fg_item.item_id
                JOIN " . ITEMS_TABLE . " comp_item ON b.component_item_id = comp_item.item_id
                WHERE b.fg_item_id = ? AND b.line = ? AND b.model = ?
                ORDER BY comp_item.sap_no ASC
            ";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$fg_item_id, $line, $model]);
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode(['success' => true, 'data' => $data]);
            break;

        case 'validate_bom_import':
            $rows = $input['rows'] ?? [];
            if (empty($rows)) {
                throw new Exception("No data submitted for validation.");
            }

            $validationResult = [
                'summary' => ['add' => 0, 'update' => 0, 'delete' => 0, 'error' => 0],
                'rows' => [],
                'isValid' => true
            ];
            
            // 1. Get all relevant SAP Nos in one query for efficiency
            $sapNosInFile = [];
            foreach ($rows as $row) {
                if (!empty($row['FG_SAP_NO'])) $sapNosInFile[] = $row['FG_SAP_NO'];
                if (!empty($row['COMPONENT_SAP_NO'])) $sapNosInFile[] = $row['COMPONENT_SAP_NO'];
            }
            $uniqueSapNos = array_unique($sapNosInFile);
            $itemMap = [];
            if (!empty($uniqueSapNos)) {
                $placeholders = implode(',', array_fill(0, count($uniqueSapNos), '?'));
                $stmt = $pdo->prepare("SELECT item_id, sap_no FROM " . ITEMS_TABLE . " WHERE sap_no IN ({$placeholders})");
                $stmt->execute($uniqueSapNos);
                while ($item = $stmt->fetch(PDO::FETCH_ASSOC)) {
                    $itemMap[$item['sap_no']] = $item['item_id'];
                }
            }

            // 2. Process each row
            foreach ($rows as $index => $row) {
                $processedRow = $row;
                $processedRow['row_index'] = $index + 2; // Excel row number
                $processedRow['errors'] = [];
                $action = strtoupper(trim($row['ACTION'] ?? ''));

                // Validate required fields
                if (empty($row['FG_SAP_NO'])) $processedRow['errors'][] = 'FG_SAP_NO is required.';
                if (empty($row['LINE'])) $processedRow['errors'][] = 'LINE is required.';
                if (empty($row['MODEL'])) $processedRow['errors'][] = 'MODEL is required.';
                if (empty($row['COMPONENT_SAP_NO'])) $processedRow['errors'][] = 'COMPONENT_SAP_NO is required.';

                // Validate SAP numbers exist
                $fgItemId = $itemMap[$row['FG_SAP_NO']] ?? null;
                $componentItemId = $itemMap[$row['COMPONENT_SAP_NO']] ?? null;
                if (!$fgItemId) $processedRow['errors'][] = "FG_SAP_NO '{$row['FG_SAP_NO']}' not found in Item Master.";
                if (!$componentItemId) $processedRow['errors'][] = "COMPONENT_SAP_NO '{$row['COMPONENT_SAP_NO']}' not found in Item Master.";

                // Validate Quantity for non-delete actions
                if ($action !== 'DELETE') {
                    if (!isset($row['QUANTITY_REQUIRED']) || !is_numeric($row['QUANTITY_REQUIRED']) || $row['QUANTITY_REQUIRED'] <= 0) {
                        $processedRow['errors'][] = 'QUANTITY_REQUIRED must be a number greater than 0.';
                    }
                }

                if (empty($processedRow['errors'])) {
                    $stmt = $pdo->prepare("SELECT bom_id FROM " . BOM_TABLE . " WHERE fg_item_id = ? AND component_item_id = ? AND line = ? AND model = ?");
                    $stmt->execute([$fgItemId, $componentItemId, $row['LINE'], $row['MODEL']]);
                    $exists = $stmt->fetchColumn();

                    if ($action === 'DELETE') {
                        if (!$exists) {
                            $processedRow['errors'][] = 'Cannot DELETE: This component is not in the BOM.';
                        } else {
                            $processedRow['determined_action'] = 'DELETE';
                            $validationResult['summary']['delete']++;
                        }
                    } else { // ADD or UPDATE
                        if ($exists) {
                            $processedRow['determined_action'] = 'UPDATE';
                            $validationResult['summary']['update']++;
                        } else {
                            $processedRow['determined_action'] = 'ADD';
                            $validationResult['summary']['add']++;
                        }
                    }
                }

                if (!empty($processedRow['errors'])) {
                    $validationResult['summary']['error']++;
                    $validationResult['isValid'] = false;
                    $processedRow['determined_action'] = 'ERROR';
                }
                
                $validationResult['rows'][] = $processedRow;
            }

            echo json_encode(['success' => true, 'data' => $validationResult]);
            break;

        case 'execute_bom_import':
            $validatedRows = $input['rows'] ?? [];
            if (empty($validatedRows)) {
                throw new Exception("No validated data received for execution.");
            }

            // Map SAP numbers to Item IDs again for security
            $sapNosInFile = [];
            foreach ($validatedRows as $row) {
                $sapNosInFile[] = $row['FG_SAP_NO'];
                $sapNosInFile[] = $row['COMPONENT_SAP_NO'];
            }
            $uniqueSapNos = array_unique($sapNosInFile);
            $itemMap = [];
            if (!empty($uniqueSapNos)) {
                $placeholders = implode(',', array_fill(0, count($uniqueSapNos), '?'));
                $stmt = $pdo->prepare("SELECT item_id, sap_no FROM " . ITEMS_TABLE . " WHERE sap_no IN ({$placeholders})");
                $stmt->execute($uniqueSapNos);
                while ($item = $stmt->fetch(PDO::FETCH_ASSOC)) {
                    $itemMap[$item['sap_no']] = $item['item_id'];
                }
            }

            $pdo->beginTransaction();
            try {
                $insertStmt = $pdo->prepare("INSERT INTO " . BOM_TABLE . " (fg_item_id, component_item_id, line, model, quantity_required, updated_by, updated_at) VALUES (?, ?, ?, ?, ?, ?, GETDATE())");
                $updateStmt = $pdo->prepare("UPDATE " . BOM_TABLE . " SET quantity_required = ?, updated_by = ?, updated_at = GETDATE() WHERE fg_item_id = ? AND component_item_id = ? AND line = ? AND model = ?");
                $deleteStmt = $pdo->prepare("DELETE FROM " . BOM_TABLE . " WHERE fg_item_id = ? AND component_item_id = ? AND line = ? AND model = ?");

                $counts = ['added' => 0, 'updated' => 0, 'deleted' => 0];
                $logDetails = [];

                foreach ($validatedRows as $row) {
                    $fgItemId = $itemMap[$row['FG_SAP_NO']] ?? null;
                    $componentItemId = $itemMap[$row['COMPONENT_SAP_NO']] ?? null;
                    
                    if (!$fgItemId || !$componentItemId) continue; // Should not happen if validation is correct

                    enforceLinePermission($row['LINE']);

                    switch ($row['determined_action']) {
                        case 'ADD':
                            $insertStmt->execute([$fgItemId, $componentItemId, $row['LINE'], $row['MODEL'], $row['QUANTITY_REQUIRED'], $currentUser['username']]);
                            $counts['added']++;
                            $logDetails[] = "ADD {$row['COMPONENT_SAP_NO']} ({$row['QUANTITY_REQUIRED']})";
                            break;
                        case 'UPDATE':
                            $updateStmt->execute([$row['QUANTITY_REQUIRED'], $currentUser['username'], $fgItemId, $componentItemId, $row['LINE'], $row['MODEL']]);
                            $counts['updated']++;
                            $logDetails[] = "UPDATE {$row['COMPONENT_SAP_NO']} ({$row['QUANTITY_REQUIRED']})";
                            break;
                        case 'DELETE':
                            $deleteStmt->execute([$fgItemId, $componentItemId, $row['LINE'], $row['MODEL']]);
                            $counts['deleted']++;
                            $logDetails[] = "DELETE {$row['COMPONENT_SAP_NO']}";
                            break;
                    }
                }

                $pdo->commit();
                
                // Logging
                $targetFG = $validatedRows[0]['FG_SAP_NO'] ?? 'Multiple';
                $logSummary = "Import for {$targetFG}: Added: {$counts['added']}, Updated: {$counts['updated']}, Deleted: {$counts['deleted']}.";
                logAction($pdo, $currentUser['username'], 'BOM Import', $targetFG, $logSummary);
                
                echo json_encode(['success' => true, 'message' => 'BOM has been successfully updated.', 'summary' => $counts]);

            } catch (Exception $e) {
                $pdo->rollBack();
                throw $e;
            }
            break;

        case 'export_all_boms':
            $sql = "
                SELECT 
                    fg_item.sap_no AS FG_SAP_NO,
                    b.line AS LINE,
                    b.model AS MODEL,
                    comp_item.sap_no AS COMPONENT_SAP_NO,
                    b.quantity_required AS QUANTITY_REQUIRED
                FROM " . BOM_TABLE . " b
                JOIN " . ITEMS_TABLE . " fg_item ON b.fg_item_id = fg_item.item_id
                JOIN " . ITEMS_TABLE . " comp_item ON b.component_item_id = comp_item.item_id
            ";
            if ($currentUser['role'] === 'supervisor') {
                $sql .= " WHERE b.line = ?";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$currentUser['line']]);
            } else {
                $stmt = $pdo->query($sql);
            }
            $all_boms_flat = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Group by FG_SAP_NO
            $grouped_boms = [];
            foreach ($all_boms_flat as $row) {
                $grouped_boms[$row['FG_SAP_NO']][] = $row;
            }

            echo json_encode(['success' => true, 'data' => $grouped_boms]);
            break;

        case 'validate_bulk_import':
            $sheets = $input['sheets'] ?? [];
            if (empty($sheets)) {
                throw new Exception("No sheets data submitted for validation.");
            }

            $validationResult = [
                'summary' => ['create' => 0, 'overwrite' => 0, 'skipped' => 0],
                'sheets' => [],
                'isValid' => true
            ];

            // Get all SAP Nos in one query for efficiency
            $sapNosInFile = [];
            foreach ($sheets as $sheetName => $data) {
                $sapNosInFile[] = $sheetName; // FG SAP from sheet name
                foreach ($data['rows'] as $row) {
                    if (!empty($row['COMPONENT_SAP_NO'])) $sapNosInFile[] = $row['COMPONENT_SAP_NO'];
                }
            }
            $itemMap = [];
            if (!empty($sapNosInFile)) {
                $uniqueSapNos = array_unique($sapNosInFile);
                $placeholders = implode(',', array_fill(0, count($uniqueSapNos), '?'));
                $stmt = $pdo->prepare("SELECT item_id, sap_no FROM " . ITEMS_TABLE . " WHERE sap_no IN ({$placeholders})");
                $stmt->execute(array_values($uniqueSapNos));
                while ($item = $stmt->fetch(PDO::FETCH_ASSOC)) {
                    $itemMap[$item['sap_no']] = $item['item_id'];
                }
            }

            // Get existing BOMs
            $existingBomsStmt = $pdo->query("SELECT DISTINCT fg_item_id, line, model FROM " . BOM_TABLE);
            $existingBomsRaw = $existingBomsStmt->fetchAll(PDO::FETCH_ASSOC);
            $existingBoms = [];
            foreach($existingBomsRaw as $bom) {
                $existingBoms[$bom['fg_item_id'] . '_' . $bom['line'] . '_' . $bom['model']] = true;
            }

            foreach ($sheets as $sheetName => $data) {
                $processedSheet = ['sheet_name' => $sheetName, 'status' => '', 'errors' => [], 'rows' => []];
                $fgSapNo = $sheetName;
                $fgItemId = $itemMap[$fgSapNo] ?? null;
                $processedSheet['rows'] = $data['rows'];

                if (!$fgItemId) {
                    $processedSheet['errors'][] = "FG SAP No. '{$fgSapNo}' from sheet name not found in Item Master.";
                }

                foreach ($data['rows'] as $row) {
                    if (empty($row['COMPONENT_SAP_NO']) || !isset($row['QUANTITY_REQUIRED']) || empty($row['LINE']) || empty($row['MODEL'])) {
                         $processedSheet['errors'][] = "Row for component '{$row['COMPONENT_SAP_NO']}' is missing required data (COMPONENT_SAP_NO, QUANTITY_REQUIRED, LINE, MODEL).";
                         continue;
                    }
                    if (!isset($itemMap[$row['COMPONENT_SAP_NO']])) {
                        $processedSheet['errors'][] = "Component SAP No. '{$row['COMPONENT_SAP_NO']}' not found in Item Master.";
                    }
                     if (!is_numeric($row['QUANTITY_REQUIRED']) || $row['QUANTITY_REQUIRED'] <= 0) {
                        $processedSheet['errors'][] = "Quantity for component '{$row['COMPONENT_SAP_NO']}' must be a number greater than 0.";
                    }
                }
                
                if (empty($processedSheet['errors'])) {
                    $uniqueBOMIdentifier = $fgItemId . '_' . $data['rows'][0]['LINE'] . '_' . $data['rows'][0]['MODEL'];
                    if (isset($existingBoms[$uniqueBOMIdentifier])) {
                        $processedSheet['status'] = 'OVERWRITE';
                        $validationResult['summary']['overwrite']++;
                    } else {
                        $processedSheet['status'] = 'CREATE';
                        $validationResult['summary']['create']++;
                    }
                } else {
                    $processedSheet['status'] = 'SKIPPED';
                    $validationResult['summary']['skipped']++;
                    $validationResult['isValid'] = false;
                }
                $validationResult['sheets'][] = $processedSheet;
            }
            echo json_encode(['success' => true, 'data' => $validationResult]);
            break;

        case 'execute_bulk_import':
            $sheets = $input['sheets'] ?? [];
            if (empty($sheets)) {
                throw new Exception("No validated data received for execution.");
            }

            // Map all SAP numbers again for security
            $sapNosInFile = [];
            foreach ($sheets as $sheet) {
                $sapNosInFile[] = $sheet['sheet_name'];
                foreach($sheet['rows'] as $row) $sapNosInFile[] = $row['COMPONENT_SAP_NO'];
            }
            $itemMap = [];
            if (!empty($sapNosInFile)) {
                $uniqueSapNos = array_unique($sapNosInFile);
                $placeholders = implode(',', array_fill(0, count($uniqueSapNos), '?'));
                $stmt = $pdo->prepare("SELECT item_id, sap_no FROM " . ITEMS_TABLE . " WHERE sap_no IN ({$placeholders})");
                $stmt->execute(array_values($uniqueSapNos));

                while ($item = $stmt->fetch(PDO::FETCH_ASSOC)) {
                    $itemMap[$item['sap_no']] = $item['item_id'];
                }
            }
            
            $pdo->beginTransaction();
            try {
                $deleteStmt = $pdo->prepare("DELETE FROM " . BOM_TABLE . " WHERE fg_item_id = ? AND line = ? AND model = ?");
                $insertStmt = $pdo->prepare("INSERT INTO " . BOM_TABLE . " (fg_item_id, component_item_id, line, model, quantity_required, updated_by, updated_at) VALUES (?, ?, ?, ?, ?, ?, GETDATE())");
                
                $counts = ['created' => 0, 'overwritten' => 0];

                foreach ($sheets as $sheet) {
                    if ($sheet['status'] === 'SKIPPED') continue;

                    $fgSapNo = $sheet['sheet_name'];
                    $fgItemId = $itemMap[$fgSapNo] ?? null;
                    if (!$fgItemId) continue;

                    $line = $sheet['rows'][0]['LINE'];
                    $model = $sheet['rows'][0]['MODEL'];
                    enforceLinePermission($line);

                    // Overwrite logic: delete all existing components for this BOM first
                    $deleteStmt->execute([$fgItemId, $line, $model]);

                    foreach($sheet['rows'] as $row) {
                        $componentItemId = $itemMap[$row['COMPONENT_SAP_NO']] ?? null;
                        if (!$componentItemId) continue;
                        $insertStmt->execute([$fgItemId, $componentItemId, $line, $model, $row['QUANTITY_REQUIRED'], $currentUser['username']]);
                    }

                    if ($sheet['status'] === 'CREATE') $counts['created']++;
                    if ($sheet['status'] === 'OVERWRITE') $counts['overwritten']++;
                }

                $pdo->commit();
                
                logAction($pdo, $currentUser['username'], 'BOM Bulk Import', 'Multiple BOMs', "Created: {$counts['created']}, Overwritten: {$counts['overwritten']}");
                echo json_encode(['success' => true, 'message' => 'BOMs have been successfully imported.', 'summary' => $counts]);
            } catch (Exception $e) {
                $pdo->rollBack();
                throw $e;
            }
            break;

        case 'get_all_fgs_with_bom':
             $sql = "
                SELECT DISTINCT
                    b.fg_item_id,
                    i.sap_no as fg_sap_no,
                    i.part_no as fg_part_no,
                    b.line,
                    b.model,
                    (SELECT TOP 1 sub.updated_by FROM " . BOM_TABLE . " sub WHERE sub.fg_item_id = b.fg_item_id AND sub.line = b.line AND sub.model = b.model ORDER BY sub.updated_at DESC) as updated_by,
                    (SELECT TOP 1 sub.updated_at FROM " . BOM_TABLE . " sub WHERE sub.fg_item_id = b.fg_item_id AND sub.line = b.line AND sub.model = b.model ORDER BY sub.updated_at DESC) as updated_at
                FROM " . BOM_TABLE . " b
                JOIN " . ITEMS_TABLE . " i ON b.fg_item_id = i.item_id";
            
            if ($currentUser['role'] === 'supervisor') {
                $sql .= " WHERE b.line = ?";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$currentUser['line']]);
            } else {
                $stmt = $pdo->query($sql);
            }

            $fgs = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(['success' => true, 'data' => $fgs]);
            break;

        case 'delete_full_bom':
            $fg_item_id = $input['fg_item_id'] ?? 0;
            $line = $input['line'] ?? '';
            $model = $input['model'] ?? '';
            enforceLinePermission($line);

            if (empty($fg_item_id) || empty($line) || empty($model)) {
                throw new Exception("FG Item ID, Line, and Model are required.");
            }
            
            // ** แก้ไข SQL: ลบโดยใช้ item_id **
            $stmt = $pdo->prepare("DELETE FROM " . BOM_TABLE . " WHERE fg_item_id = ? AND line = ? AND model = ?");
            $stmt->execute([(int)$fg_item_id, $line, $model]);
            
            logAction($pdo, $currentUser['username'], 'DELETE FULL BOM', "FG_ID: $fg_item_id ($line/$model)");
            echo json_encode(['success' => true, 'message' => 'BOM has been deleted.']);
            break;


        case 'bulk_delete_bom':
            $bomsToDelete = $input['boms'] ?? [];
            if (empty($bomsToDelete)) {
                throw new Exception("No BOMs selected for deletion.");
            }
            
            $pdo->beginTransaction();
            try {
                $stmt = $pdo->prepare(
                    "DELETE b FROM " . BOM_TABLE . " b 
                     JOIN " . ITEMS_TABLE . " i ON b.fg_item_id = i.item_id 
                     WHERE i.sap_no = ? AND b.line = ? AND b.model = ?"
                );

                foreach ($bomsToDelete as $bom) {
                    enforceLinePermission($bom['line']);
                    $stmt->execute([$bom['fg_sap_no'], $bom['line'], $bom['model']]);
                }
                
                $pdo->commit();
                logAction($pdo, $currentUser['username'], 'BOM Bulk Delete', count($bomsToDelete) . ' BOMs', 'Successfully deleted selected BOMs.');
                echo json_encode(['success' => true, 'message' => count($bomsToDelete) . ' BOM(s) have been successfully deleted.']);

            } catch (Exception $e) {
                $pdo->rollBack();
                throw $e;
            }
            break;

        case 'get_full_bom_export':
            // รับค่า search จาก GET parameter
            $searchTerm = $_GET['search'] ?? '';

            $sql = "
                SELECT
                    fg_item.sap_no      AS fg_sap_no,
                    fg_item.part_no     AS fg_part_no,
                    b.line,
                    b.model,
                    comp_item.sap_no    AS component_sap_no,
                    comp_item.part_no   AS component_part_no,
                    b.quantity_required,
                    b.updated_by,
                    b.updated_at
                FROM " . BOM_TABLE . " b
                LEFT JOIN " . ITEMS_TABLE . " fg_item ON b.fg_item_id = fg_item.item_id
                LEFT JOIN " . ITEMS_TABLE . " comp_item ON b.component_item_id = comp_item.item_id
            ";
            
            $conditions = [];
            $params = [];

            // เพิ่มเงื่อนไขการกรองข้อมูลตาม Role ของ Supervisor
            if ($currentUser['role'] === 'supervisor') {
                $conditions[] = "b.line = ?";
                $params[] = $currentUser['line'];
            }

            // เพิ่มเงื่อนไขการกรองข้อมูลจากช่อง Search
            if (!empty($searchTerm)) {
                $conditions[] = "(fg_item.sap_no LIKE ? OR fg_item.part_no LIKE ? OR b.line LIKE ? OR b.model LIKE ?)";
                $params[] = '%' . $searchTerm . '%';
                $params[] = '%' . $searchTerm . '%';
                $params[] = '%' . $searchTerm . '%';
                $params[] = '%' . $searchTerm . '%';
            }

            if (!empty($conditions)) {
                $sql .= " WHERE " . implode(" AND ", $conditions);
            }
            
            $sql .= " ORDER BY b.line, b.model, fg_item.part_no, comp_item.part_no";

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(['success' => true, 'data' => $data]);
            break;

        case 'bulk_import_bom':
            if (!is_array($input) || empty($input)) {
                throw new Exception("Invalid or empty data received for BOM import.");
            }
            
            $pdo->beginTransaction();
            try {
                $insertedCount = 0;
                $updatedCount = 0;

                $checkItemStmt = $pdo->prepare("SELECT item_id FROM " . ITEMS_TABLE . " WHERE sap_no = ?");
                $checkBomStmt = $pdo->prepare("SELECT bom_id FROM " . BOM_TABLE . " WHERE fg_item_id = ? AND line = ? AND model = ? AND component_item_id = ?");
                $updateStmt = $pdo->prepare("UPDATE " . BOM_TABLE . " SET quantity_required = ?, updated_by = ?, updated_at = GETDATE() WHERE bom_id = ?");
                $insertStmt = $pdo->prepare("INSERT INTO " . BOM_TABLE . " (fg_item_id, line, model, component_item_id, quantity_required, updated_by, updated_at) VALUES (?, ?, ?, ?, ?, ?, GETDATE())");

                foreach ($input as $row) {
                    $fg_sap_no = $row['FG_SAP_NO'] ?? null;
                    $line = $row['LINE'] ?? null;
                    $model = $row['MODEL'] ?? null;
                    $comp_sap_no = $row['COMPONENT_SAP_NO'] ?? null;
                    $quantity = (int)($row['QUANTITY_REQUIRED'] ?? 0);

                    if (!$fg_sap_no || !$line || !$model || !$comp_sap_no || $quantity <= 0) {
                        continue; // ข้ามข้อมูลแถวที่ไม่สมบูรณ์
                    }
                    
                    enforceLinePermission($line);

                    $checkItemStmt->execute([$fg_sap_no]);
                    $fg_item_id = $checkItemStmt->fetchColumn();
                    $checkItemStmt->execute([$comp_sap_no]);
                    $comp_item_id = $checkItemStmt->fetchColumn();
                    
                    if (!$fg_item_id || !$comp_item_id) {
                        continue;
                    }
                    $checkBomStmt->execute([$fg_item_id, $line, $model, $comp_item_id]);
                    $existing_bom_id = $checkBomStmt->fetchColumn();

                    if ($existing_bom_id) {
                        $updateStmt->execute([$quantity, $currentUser['username'], $existing_bom_id]);
                        $updatedCount++;
                    } else {
                        $insertStmt->execute([$fg_item_id, $line, $model, $comp_item_id, $quantity, $currentUser['username']]);
                        $insertedCount++;
                    }
                }
                
                $pdo->commit();
                logAction($pdo, $currentUser['username'], 'BULK IMPORT BOM', null, "Imported/Updated BOM. Inserted: $insertedCount, Updated: $updatedCount");
                echo json_encode(['success' => true, 'message' => "BOM import completed. Added: $insertedCount, Updated: $updatedCount."]);

            } catch (Exception $e) {
                $pdo->rollBack();
                throw $e;
            }
            break;

        case 'copy_bom':
            $source_fg_sap_no = $input['source_fg_sap_no'] ?? '';
            $source_line = $input['source_line'] ?? '';
            $source_model = $input['source_model'] ?? '';
            $target_fg_sap_no = $input['target_fg_sap_no'] ?? '';
            
            $target_line = $source_line;
            $target_model = $source_model;

            if (empty($source_fg_sap_no) || empty($source_line) || empty($source_model) || empty($target_fg_sap_no)) {
                throw new Exception("Missing source or target information for BOM copy.");
            }
            if ($source_fg_sap_no === $target_fg_sap_no && $source_line === $target_line && $source_model === $target_model) {
                throw new Exception("Source and Target BOM cannot be the same.");
            }
            
            enforceLinePermission($source_line);

            $pdo->beginTransaction();
            try {
                $checkItemSql = "SELECT COUNT(*) FROM " . ITEMS_TABLE . " WHERE sap_no = ?";
                $checkItemStmt = $pdo->prepare($checkItemSql);
                $checkItemStmt->execute([$target_fg_sap_no]);
                if ($checkItemStmt->fetchColumn() == 0) {
                    throw new Exception("Target Finished Good SAP No '{$target_fg_sap_no}' does not exist in Item Master.");
                }

                $deleteStmt = $pdo->prepare("DELETE FROM " . BOM_TABLE . " WHERE fg_sap_no = ? AND line = ? AND model = ?");
                $deleteStmt->execute([$target_fg_sap_no, $target_line, $target_model]);

                $sourceComponentsStmt = $pdo->prepare("SELECT component_sap_no, quantity_required FROM " . BOM_TABLE . " WHERE fg_sap_no = ? AND line = ? AND model = ?");
                $sourceComponentsStmt->execute([$source_fg_sap_no, $source_line, $source_model]);
                $components = $sourceComponentsStmt->fetchAll(PDO::FETCH_ASSOC);

                if (count($components) === 0) {
                    $pdo->commit();
                    echo json_encode(['success' => true, 'message' => "Source BOM was empty. Target BOM for '{$target_fg_sap_no}' is now also empty."]);
                    exit;
                }

                $insertSql = "INSERT INTO " . BOM_TABLE . " (fg_sap_no, line, model, component_sap_no, quantity_required, updated_by, updated_at) VALUES (?, ?, ?, ?, ?, ?, GETDATE())";
                $insertStmt = $pdo->prepare($insertSql);
                
                foreach ($components as $comp) {
                    $insertStmt->execute([
                        $target_fg_sap_no,
                        $target_line,
                        $target_model,
                        $comp['component_sap_no'],
                        $comp['quantity_required'],
                        $currentUser['username']
                    ]);
                }

                $pdo->commit();

                $logDetail = "From SAP: {$source_fg_sap_no} To SAP: {$target_fg_sap_no} ({$target_line}/{$target_model})";
                logAction($pdo, $currentUser['username'], 'COPY BOM', $source_fg_sap_no, $logDetail);
                echo json_encode(['success' => true, 'message' => "BOM successfully copied to '{$target_fg_sap_no}'."]);

            } catch (Exception $e) {
                $pdo->rollBack();
                throw $e;
            }
            break;
        
        default:
            http_response_code(400);
            throw new Exception("Invalid BOM action.");
    }
} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    error_log("BOM Manager Error: " . $e->getMessage());
}
?>