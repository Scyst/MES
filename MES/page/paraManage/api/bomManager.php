<?php
require_once __DIR__ . '/../../../api/db.php';
require_once __DIR__ . '/../../../auth/check_auth.php';
require_once __DIR__ . '/../../../api/logger.php';

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

            // ** แก้ไข SQL: JOIN กับ ITEMS_TEST โดยใช้ item_id **
            $sql = "
                SELECT 
                    b.bom_id,
                    b.component_item_id,
                    i.sap_no AS component_sap_no,
                    i.part_no AS component_part_no,
                    i.part_description,
                    b.quantity_required
                FROM " . BOM_TABLE . " b
                LEFT JOIN " . ITEMS_TABLE . " i ON b.component_item_id = i.item_id
                WHERE b.fg_item_id = ? AND b.line = ? AND b.model = ? 
                ORDER BY i.part_no
            ";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([(int)$fg_item_id, $line, $model]);
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
            break;

        case 'add_bom_component':
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

            // ** แก้ไข SQL: INSERT และตรวจสอบโดยใช้ item_id **
            $sql = "INSERT INTO " . BOM_TABLE . " (fg_item_id, line, model, component_item_id, quantity_required, updated_by, updated_at) VALUES (?, ?, ?, ?, ?, ?, GETDATE())";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([(int)$fg_item_id, $line, $model, (int)$component_item_id, (int)$quantity_required, $currentUser['username']]);
            
            logAction($pdo, $currentUser['username'], 'ADD BOM COMPONENT', "FG_ID: $fg_item_id ($line/$model)", "Comp_ID: $component_item_id");
            echo json_encode(['success' => true, 'message' => 'Component added successfully.']);
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

        case 'get_all_fgs_with_bom':
            // ** แก้ไข SQL: ดึงข้อมูล BOM โดยอ้างอิงจาก item_id **
            $sql = "
                SELECT DISTINCT
                    b.fg_item_id,
                    b.line,
                    b.model,
                    i.sap_no AS fg_sap_no,
                    i.part_no AS fg_part_no,
                    (SELECT MAX(sub.updated_at) FROM " . BOM_TABLE . " sub WHERE sub.fg_item_id = b.fg_item_id AND sub.line = b.line AND sub.model = b.model) as updated_at,
                    (SELECT TOP 1 sub.updated_by FROM " . BOM_TABLE . " sub WHERE sub.fg_item_id = b.fg_item_id AND sub.line = b.line AND sub.model = b.model ORDER BY sub.updated_at DESC) as updated_by
                FROM " . BOM_TABLE . " b
                JOIN " . ITEMS_TABLE . " i ON b.fg_item_id = i.item_id
            ";
            $params = [];
            if ($currentUser['role'] === 'supervisor') {
                $sql .= " WHERE b.line = ?";
                $params[] = $currentUser['line'];
            }
            $sql .= " ORDER BY b.line, b.model, i.part_no";
            
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
            $boms_to_delete = $input['boms'] ?? [];
            if (empty($boms_to_delete) || !is_array($boms_to_delete)) {
                throw new Exception("No BOMs provided for bulk deletion.");
            }

            $pdo->beginTransaction();
            try {
                $deleteStmt = $pdo->prepare("DELETE FROM " . BOM_TABLE . " WHERE fg_sap_no = ? AND line = ? AND model = ?");
                $deletedCount = 0;

                foreach($boms_to_delete as $bom) {
                    $fg_sap_no = $bom['fg_sap_no'] ?? '';
                    $line = $bom['line'] ?? '';
                    $model = $bom['model'] ?? '';
                    
                    if (empty($fg_sap_no) || empty($line) || empty($model)) { continue; }

                    enforceLinePermission($line);
                    
                    $deleteStmt->execute([$fg_sap_no, $line, $model]);
                    if ($deleteStmt->rowCount() > 0) {
                        $deletedCount++;
                    }
                }

                $pdo->commit();
                logAction($pdo, $currentUser['username'], 'BULK DELETE BOM', null, "Deleted {$deletedCount} BOMs.");
                echo json_encode(['success' => true, 'message' => "Successfully deleted {$deletedCount} BOMs."]);

            } catch (Exception $e) {
                $pdo->rollBack();
                throw $e;
            }
            break;

        case 'get_full_bom_export':
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
                LEFT JOIN " . ITEMS_TABLE . " fg_item ON b.fg_sap_no = fg_item.sap_no
                LEFT JOIN " . ITEMS_TABLE . " comp_item ON b.component_sap_no = comp_item.sap_no
            ";
            $params = [];
            if ($currentUser['role'] === 'supervisor') {
                $sql .= " WHERE b.line = ?";
                $params[] = $currentUser['line'];
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
            $deleteSql = "DELETE FROM " . BOM_TABLE . " WHERE fg_sap_no = ? AND line = ? AND model = ?";
            $deleteStmt = $pdo->prepare($deleteSql);
            $insertSql = "INSERT INTO " . BOM_TABLE . " (fg_sap_no, line, model, component_sap_no, quantity_required, updated_by, updated_at) VALUES (?, ?, ?, ?, ?, ?, GETDATE())";
            $insertStmt = $pdo->prepare($insertSql);
            
            $importedFgCount = 0;
            $importedComponentCount = 0;
            
            foreach ($input as $bomGroup) {
                $fg_sap_no = $bomGroup['fg_sap_no'] ?? null;
                $line = $bomGroup['line'] ?? null;
                $model = $bomGroup['model'] ?? null;
                $components = $bomGroup['components'] ?? [];

                if (!$fg_sap_no || !$line || !$model || empty($components)) { continue; }
                enforceLinePermission($line);
                $deleteStmt->execute([$fg_sap_no, $line, $model]);
                
                foreach ($components as $component) {
                    $insertStmt->execute([
                        $fg_sap_no,
                        $line,
                        $model,
                        $component['component_sap_no'],
                        (int)$component['quantity_required'],
                        $currentUser['username']
                    ]);
                    $importedComponentCount++;
                }
                $importedFgCount++;
            }
            $pdo->commit();
            logAction($pdo, $currentUser['username'], 'BULK IMPORT BOM', null, "Imported $importedFgCount FGs with a total of $importedComponentCount components.");
            echo json_encode(["success" => true, "message" => "Successfully imported BOM for $importedFgCount Finished Goods."]);
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