<?php
require_once __DIR__ . '/../../../api/db.php';
require_once __DIR__ . '/../../../auth/check_auth.php';
require_once __DIR__ . '/../../../api/logger.php';


// session_start() ถูกเรียกแล้วใน check_auth.php

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    if (!isset($_SERVER['HTTP_X_CSRF_TOKEN']) || !isset($_SESSION['csrf_token']) || !hash_equals($_SESSION['csrf_token'], $_SERVER['HTTP_X_CSRF_TOKEN'])) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'CSRF token validation failed.']);
        exit;
    }
}

// =================================================================
// DEVELOPMENT SWITCH
$is_development = true; // <-- ตั้งค่าที่นี่: true เพื่อใช้ตาราง Test, false เพื่อใช้ตารางจริง
$bom_table   = $is_development ? 'PRODUCT_BOM_TEST' : 'PRODUCT_BOM';
$param_table = $is_development ? 'PARAMETER_TEST'   : 'PARAMETER';
// =================================================================

$action = $_REQUEST['action'] ?? '';
$input = json_decode(file_get_contents("php://input"), true);
$currentUser = $_SESSION['user'];


try {
    switch ($action) {
        case 'get_bom_components':
            $fg_part_no = $_GET['fg_part_no'] ?? '';
            $line = $_GET['line'] ?? '';
            $model = $_GET['model'] ?? '';
            
            enforceLinePermission($line); 

            if (empty($fg_part_no) || empty($line) || empty($model)) {
                throw new Exception("FG Part No, Line, and Model are required to get components.");
            }

            $stmt = $pdo->prepare("SELECT * FROM {$bom_table} WHERE fg_part_no = ? AND line = ? AND model = ? ORDER BY component_part_no");
            $stmt->execute([$fg_part_no, $line, $model]);
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
            break;

        case 'add_bom_component':
            $fg_part_no = $input['fg_part_no'] ?? '';
            $line = $input['line'] ?? '';
            $model = $input['model'] ?? '';
            $component_part_no = $input['component_part_no'] ?? '';
            $quantity_required = $input['quantity_required'] ?? 0;
            enforceLinePermission($line);

            if (empty($fg_part_no) || empty($line) || empty($model) || empty($component_part_no) || empty($quantity_required)) {
                throw new Exception("Missing required fields.");
            }
            if ($fg_part_no === $component_part_no) {
                throw new Exception("Finished Good and Component cannot be the same part.");
            }

            $checkSql = "SELECT COUNT(*) FROM {$bom_table} WHERE fg_part_no = ? AND line = ? AND model = ? AND component_part_no = ?";
            $checkStmt = $pdo->prepare($checkSql);
            $checkStmt->execute([$fg_part_no, $line, $model, $component_part_no]);
            if ($checkStmt->fetchColumn() > 0) {
                http_response_code(409);
                throw new Exception("This component ({$component_part_no}) already exists in this BOM.");
            }

            $sql = "INSERT INTO {$bom_table} (fg_part_no, line, model, component_part_no, quantity_required, updated_by, updated_at) VALUES (?, ?, ?, ?, ?, ?, GETDATE())";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$fg_part_no, $line, $model, $component_part_no, (int)$quantity_required, $currentUser['username']]);
            
            logAction($pdo, $currentUser['username'], 'ADD BOM COMPONENT', "$fg_part_no ($line/$model)", "Component: $component_part_no");
            echo json_encode(['success' => true, 'message' => 'Component added successfully.']);
            break;

        // ** START: โค้ดใหม่ที่เพิ่มเข้ามา **
        case 'update_bom_component':
            $bom_id = $input['bom_id'] ?? 0;
            $quantity_required = $input['quantity_required'] ?? null;

            if (empty($bom_id) || !is_numeric($quantity_required)) {
                throw new Exception("BOM ID and a numeric Quantity are required.");
            }

            // --- ตรวจสอบสิทธิ์ก่อนแก้ไข ---
            $findStmt = $pdo->prepare("SELECT line FROM {$bom_table} WHERE bom_id = ?");
            $findStmt->execute([$bom_id]);
            $bom_item = $findStmt->fetch();
            if ($bom_item) {
                enforceLinePermission($bom_item['line']);
            } else {
                throw new Exception("BOM component not found.");
            }

            // --- อัปเดตข้อมูล ---
            $sql = "UPDATE {$bom_table} SET quantity_required = ?, updated_by = ?, updated_at = GETDATE() WHERE bom_id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([(int)$quantity_required, $currentUser['username'], $bom_id]);

            logAction($pdo, $currentUser['username'], 'UPDATE BOM COMPONENT', "BOM_ID: $bom_id", "New Qty: $quantity_required");
            echo json_encode(['success' => true, 'message' => 'Component quantity updated.']);
            break;
        // ** END: โค้ดใหม่ที่เพิ่มเข้ามา **

        case 'delete_bom_component':
            $bom_id = $input['bom_id'] ?? 0;
            if (empty($bom_id)) throw new Exception("Missing bom_id.");

            $findStmt = $pdo->prepare("SELECT line FROM {$bom_table} WHERE bom_id = ?");
            $findStmt->execute([$bom_id]);
            $bom_item = $findStmt->fetch();
            if ($bom_item) {
                enforceLinePermission($bom_item['line']);
            } else {
                throw new Exception("BOM component not found.");
            }

            $findSql = "SELECT fg_part_no, line, model FROM {$bom_table} WHERE bom_id = ?";
            $findStmt = $pdo->prepare($findSql);
            $findStmt->execute([$bom_id]);
            $bom_group = $findStmt->fetch(PDO::FETCH_ASSOC);

            $deleteStmt = $pdo->prepare("DELETE FROM {$bom_table} WHERE bom_id = ?");
            $deleteStmt->execute([$bom_id]);

            if ($deleteStmt->rowCount() > 0) {
                if ($bom_group) {
                    $updateSql = "UPDATE {$bom_table} SET updated_at = GETDATE(), updated_by = ? WHERE fg_part_no = ? AND line = ? AND model = ?";
                    $updateStmt = $pdo->prepare($updateSql);
                    $updateStmt->execute([$currentUser['username'], $bom_group['fg_part_no'], $bom_group['line'], $bom_group['model']]);
                }
                
                logAction($pdo, $currentUser['username'], 'DELETE BOM COMPONENT', "BOM_ID: $bom_id");
                echo json_encode(['success' => true, 'message' => 'Component deleted successfully.']);
            } else {
                throw new Exception("Component with BOM ID $bom_id not found or could not be deleted.");
            }
            break;

        case 'get_all_fgs':
            $sql = "
                WITH RankedBOMs AS (
                    SELECT fg_part_no, line, model, updated_at, updated_by,
                           ROW_NUMBER() OVER(PARTITION BY fg_part_no, line, model ORDER BY updated_at DESC) as rn
                    FROM {$bom_table}
                )
                SELECT DISTINCT b.fg_part_no, b.line, b.model, p.sap_no, rb.updated_by, rb.updated_at
                FROM {$bom_table} b
                LEFT JOIN {$param_table} p ON b.fg_part_no = p.part_no AND b.line = p.line AND b.model = p.model
                LEFT JOIN RankedBOMs rb ON b.fg_part_no = rb.fg_part_no AND b.line = rb.line AND b.model = rb.model AND rb.rn = 1
            ";
            $params = [];
            if ($currentUser['role'] === 'supervisor') {
                $sql .= " WHERE b.line = ?";
                $params[] = $currentUser['line'];
            }
            $sql .= " ORDER BY b.fg_part_no, b.line, b.model;";
            
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
            $fg_part_no = $input['fg_part_no'] ?? '';
            $line = $input['line'] ?? '';
            $model = $input['model'] ?? '';
            enforceLinePermission($line);

            if (empty($fg_part_no) || empty($line) || empty($model)) {
                throw new Exception("FG Part No, Line, and Model are required to delete a BOM.");
            }
            
            $stmt = $pdo->prepare("DELETE FROM {$bom_table} WHERE fg_part_no = ? AND line = ? AND model = ?");
            $stmt->execute([$fg_part_no, $line, $model]);
            
            logAction($pdo, $currentUser['username'], 'DELETE FULL BOM', "$fg_part_no ($line/$model)");
            echo json_encode(['success' => true, 'message' => 'BOM has been deleted.']);
            break;

        case 'bulk_delete_bom':
            $boms_to_delete = $input['boms'] ?? [];
            if (empty($boms_to_delete) || !is_array($boms_to_delete)) {
                throw new Exception("No BOMs provided for bulk deletion.");
            }

            $pdo->beginTransaction();
            try {
                $deleteStmt = $pdo->prepare("DELETE FROM {$bom_table} WHERE fg_part_no = ? AND line = ? AND model = ?");
                $deletedCount = 0;

                foreach($boms_to_delete as $bom) {
                    $fg_part_no = $bom['fg_part_no'] ?? '';
                    $line = $bom['line'] ?? '';
                    $model = $bom['model'] ?? '';
                    
                    if (empty($fg_part_no) || empty($line) || empty($model)) {
                        continue;
                    }

                    enforceLinePermission($line);
                    
                    $deleteStmt->execute([$fg_part_no, $line, $model]);
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
                    p.sap_no AS fg_sap_no,
                    b.fg_part_no,
                    b.line,
                    b.model,
                    b.component_part_no,
                    b.quantity_required,
                    b.updated_by,
                    b.updated_at
                FROM
                    {$bom_table} b
                LEFT JOIN
                     {$param_table} p ON b.fg_part_no = p.part_no AND b.line = p.line AND b.model = p.model
            ";
            $params = [];
            if ($currentUser['role'] === 'supervisor') {
                $sql .= " WHERE b.line = ?";
                $params[] = $currentUser['line'];
            }
            $sql .= " ORDER BY b.line, b.model, b.fg_part_no, b.component_part_no";

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
            $deleteSql = "DELETE FROM {$bom_table} WHERE fg_part_no = ? AND line = ? AND model = ?";
            $deleteStmt = $pdo->prepare($deleteSql);
            $insertSql = "INSERT INTO {$bom_table} (fg_part_no, line, model, component_part_no, quantity_required, updated_by, updated_at) VALUES (?, ?, ?, ?, ?, ?, GETDATE())";
            $insertStmt = $pdo->prepare($insertSql);
            $importedFgCount = 0;
            $importedComponentCount = 0;
            foreach ($input as $bomGroup) {
                $fg_part_no = $bomGroup['fg_part_no'] ?? null;
                $line = $bomGroup['line'] ?? null;
                $model = $bomGroup['model'] ?? null;
                $components = $bomGroup['components'] ?? [];

                if (!$fg_part_no || !$line || !$model || empty($components)) {
                    continue; 
                }
                enforceLinePermission($line);
                $deleteStmt->execute([$fg_part_no, $line, $model]);
                foreach ($components as $component) {
                    $insertStmt->execute([
                        $fg_part_no,
                        $line,
                        $model,
                        $component['component_part_no'],
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
            $source_fg_part_no = $input['source_fg_part_no'] ?? '';
            $source_line = $input['source_line'] ?? '';
            $source_model = $input['source_model'] ?? '';
            $target_fg_part_no = $input['target_fg_part_no'] ?? '';
            
            $target_line = $source_line;
            $target_model = $source_model;

            if (empty($source_fg_part_no) || empty($source_line) || empty($source_model) || empty($target_fg_part_no)) {
                throw new Exception("Missing source or target information for BOM copy.");
            }
            if ($source_fg_part_no === $target_fg_part_no && $source_line === $target_line && $source_model === $target_model) {
                throw new Exception("Source and Target BOM cannot be the same.");
            }
            
            enforceLinePermission($source_line);

            $pdo->beginTransaction();
            try {
                $checkParamSql = "SELECT COUNT(*) FROM {$param_table} WHERE part_no = ? AND line = ? AND model = ?";
                $checkParamStmt = $pdo->prepare($checkParamSql);
                $checkParamStmt->execute([$target_fg_part_no, $target_line, $target_model]);
                if ($checkParamStmt->fetchColumn() == 0) {
                    throw new Exception("Target Finished Good '{$target_fg_part_no}' does not exist in Parameters for this Line/Model. Please create it first.");
                }

                $deleteStmt = $pdo->prepare("DELETE FROM {$bom_table} WHERE fg_part_no = ? AND line = ? AND model = ?");
                $deleteStmt->execute([$target_fg_part_no, $target_line, $target_model]);

                $sourceComponentsStmt = $pdo->prepare("SELECT component_part_no, quantity_required FROM {$bom_table} WHERE fg_part_no = ? AND line = ? AND model = ?");
                $sourceComponentsStmt->execute([$source_fg_part_no, $source_line, $source_model]);
                $components = $sourceComponentsStmt->fetchAll(PDO::FETCH_ASSOC);

                if (count($components) === 0) {
                    $pdo->commit();
                    echo json_encode(['success' => true, 'message' => "Source BOM was empty. Target BOM for '{$target_fg_part_no}' is now also empty."]);
                    exit;
                }

                $insertSql = "INSERT INTO {$bom_table} (fg_part_no, line, model, component_part_no, quantity_required, updated_by, updated_at) VALUES (?, ?, ?, ?, ?, ?, GETDATE())";
                $insertStmt = $pdo->prepare($insertSql);
                
                foreach ($components as $comp) {
                    $insertStmt->execute([
                        $target_fg_part_no,
                        $target_line,
                        $target_model,
                        $comp['component_part_no'],
                        $comp['quantity_required'],
                        $currentUser['username']
                    ]);
                }

                $pdo->commit();

                $logDetail = "From: {$source_fg_part_no} To: {$target_fg_part_no} ({$target_line}/{$target_model})";
                logAction($pdo, $currentUser['username'], 'COPY BOM', $source_fg_part_no, $logDetail);
                echo json_encode(['success' => true, 'message' => "BOM successfully copied to '{$target_fg_part_no}'."]);

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