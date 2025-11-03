<?php
require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../../auth/check_auth.php';
require_once __DIR__ . '/../../logger.php';

if (!hasRole(['admin', 'creator', 'supervisor'])) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

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
        case 'get_items':
            $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
            $limit = isset($_GET['limit']) && intval($_GET['limit']) === -1 ? 999999 : 50;
            $startRow = ($page - 1) * $limit;
            $endRow = $startRow + $limit;

            $searchTerm = $_GET['search'] ?? '';
            $showInactive = isset($_GET['show_inactive']) && $_GET['show_inactive'] === 'true';
            $filter_model = $_GET['filter_model'] ?? '';

            $params = [];
            $fromClause = "FROM " . ITEMS_TABLE . " i";
            $conditions = [];

            if ($currentUser['role'] === 'supervisor') {
                $supervisor_line = $currentUser['line'];
                $conditions[] = "
                    i.item_id IN (
                        SELECT item_id FROM " . ROUTES_TABLE . " WHERE line = ?
                        UNION
                        SELECT DISTINCT b.component_item_id
                        FROM " . BOM_TABLE . " b
                        WHERE b.fg_item_id IN (SELECT item_id FROM " . ROUTES_TABLE . " WHERE line = ?)
                    )
                ";
                $params[] = $supervisor_line;
                $params[] = $supervisor_line;
            }

            if (!empty($filter_model)) {
                $fromClause .= " JOIN " . ROUTES_TABLE . " r ON i.item_id = r.item_id";
                $conditions[] = "RTRIM(LTRIM(r.model)) LIKE ?";
                $params[] = '%' . $filter_model . '%';
            }

            if (!$showInactive) {
                $conditions[] = "i.is_active = 1";
            }
            if (!empty($searchTerm)) {
                $conditions[] = "(i.sap_no LIKE ? OR i.part_no LIKE ? OR i.part_description LIKE ?)";
                $params = array_merge($params, ['%' . $searchTerm . '%', '%' . $searchTerm . '%', '%' . $searchTerm . '%']);
            }
            $whereClause = !empty($conditions) ? "WHERE " . implode(" AND ", $conditions) : "";

            $orderByClause = "ORDER BY i.sap_no DESC";
            if ($showInactive) {
                $orderByClause = "ORDER BY i.is_active ASC, i.sap_no DESC";
            }

            $totalSql = "SELECT COUNT(DISTINCT i.item_id) {$fromClause} {$whereClause}";
            $totalStmt = $pdo->prepare($totalSql);
            $totalStmt->execute($params);
            $total = (int)$totalStmt->fetchColumn();

            // MES: Define Costing Columns for SELECT
            $costingCols_CTE = "
                , i.Cost_RM, i.Cost_PKG, i.Cost_SUB, i.Cost_DL
                , i.Cost_OH_Machine, i.Cost_OH_Utilities, i.Cost_OH_Indirect, i.Cost_OH_Staff, i.Cost_OH_Accessory, i.Cost_OH_Others
                , i.Cost_Total, i.StandardPrice, i.StandardGP, i.Price_USD
            ";
            $costingCols_Final = "
                , Cost_RM, Cost_PKG, Cost_SUB, Cost_DL
                , Cost_OH_Machine, Cost_OH_Utilities, Cost_OH_Indirect, Cost_OH_Staff, Cost_OH_Accessory, Cost_OH_Others
                , Cost_Total, StandardPrice, StandardGP, Price_USD
            ";

            $dataSql = "
                WITH NumberedRows AS (
                    SELECT 
                        DISTINCT i.item_id, i.sap_no, i.part_no, i.part_description, FORMAT(i.created_at, 'yyyy-MM-dd HH:mm') as created_at, 
                        i.is_active, i.planned_output, i.min_stock, i.max_stock, i.is_tracking
                        {$costingCols_CTE} -- MES: ADDED COSTING COLUMNS
                        ,
                        STUFF((
                            SELECT ', ' + r_sub.model FROM " . ROUTES_TABLE . " r_sub
                            WHERE r_sub.item_id = i.item_id ORDER BY r_sub.model FOR XML PATH('')
                        ), 1, 2, '') AS used_in_models,
                        ROW_NUMBER() OVER ({$orderByClause}) AS RowNum
                    {$fromClause}
                    {$whereClause}
                )
                SELECT item_id, sap_no, part_no, part_description, created_at, is_active, used_in_models, planned_output, min_stock, max_stock, is_tracking
                {$costingCols_Final} -- MES: ADDED COSTING COLUMNS
                FROM NumberedRows
                WHERE RowNum > ? AND RowNum <= ?
            ";

            $paginationParams = array_merge($params, [$startRow, $endRow]);
            $dataStmt = $pdo->prepare($dataSql);
            $dataStmt->execute($paginationParams);
            $items = $dataStmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode(['success' => true, 'data' => $items, 'total' => $total, 'page' => $page]);
            break;

        /*case 'save_item':
            $id = $input['item_id'] ?? 0;
            $sap_no = trim($input['sap_no'] ?? '');
            $part_no = trim($input['part_no'] ?? '');
            $description = trim($input['part_description'] ?? '');
            $planned_output = (int)($input['planned_output'] ?? 0);

            if (empty($sap_no) || empty($part_no)) {
                throw new Exception("SAP No. and Part No. are required.");
            }

            if ($id > 0) {
                $sql = "UPDATE " . ITEMS_TABLE . " SET sap_no = ?, part_no = ?, part_description = ?, planned_output = ? WHERE item_id = ?";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$sap_no, $part_no, $description, $planned_output, $id]);
                
                logAction($pdo, $currentUser['username'], 'UPDATE ITEM', $id, "SAP: {$sap_no}");
                echo json_encode(['success' => true, 'message' => 'Item updated successfully.']);
            } else {
                $sql = "INSERT INTO " . ITEMS_TABLE . " (sap_no, part_no, part_description, created_at, planned_output) VALUES (?, ?, ?, GETDATE(), ?)";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$sap_no, $part_no, $description, $planned_output]);

                $newId = $pdo->lastInsertId();
                logAction($pdo, $currentUser['username'], 'CREATE ITEM', $newId, "SAP: {$sap_no}");
                echo json_encode(['success' => true, 'message' => 'Item created successfully.']);
            }
            break;*/

        case 'delete_item':
            $id = $input['item_id'] ?? 0;
            if (!$id) {
                throw new Exception("Item ID is required.");
            }

            $sql = "UPDATE " . ITEMS_TABLE . " SET is_active = 0 WHERE item_id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$id]);

            if ($stmt->rowCount() > 0) {
                logAction($pdo, $currentUser['username'], 'DEACTIVATE ITEM', $id);
                echo json_encode(['success' => true, 'message' => 'Item deactivated successfully.']);
            } else {
                throw new Exception("Item not found or could not be deactivated.");
            }
            break;

        case 'restore_item':
            $id = $input['item_id'] ?? 0;
            if (!$id) {
                throw new Exception("Item ID is required.");
            }

            $sql = "UPDATE " . ITEMS_TABLE . " SET is_active = 1 WHERE item_id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$id]);

            if ($stmt->rowCount() > 0) {
                logAction($pdo, $currentUser['username'], 'RESTORE ITEM', $id);
                echo json_encode(['success' => true, 'message' => 'Item restored successfully.']);
            } else {
                throw new Exception("Item not found or could not be restored.");
            }
            break;

        case 'get_lines':
            $sql = "SELECT DISTINCT RTRIM(LTRIM(line)) as line FROM " . ROUTES_TABLE . " WHERE line IS NOT NULL AND line != '' ORDER BY line ASC";
            $stmt = $pdo->prepare($sql);
            $stmt->execute();
            $lines = $stmt->fetchAll(PDO::FETCH_COLUMN);
            echo json_encode(['success' => true, 'data' => $lines]);
            break;

        case 'get_models':
            $searchTerm = $_GET['search'] ?? '';
            $sql = "SELECT DISTINCT RTRIM(LTRIM(model)) as model FROM " . ROUTES_TABLE . " WHERE model IS NOT NULL AND model != ''";
            $params = [];
            if (!empty($searchTerm)) {
                $sql .= " AND model LIKE ?";
                $params[] = '%' . $searchTerm . '%';
            }
            $sql .= " ORDER BY model ASC";

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $models = $stmt->fetchAll(PDO::FETCH_COLUMN);
            echo json_encode(['success' => true, 'data' => $models]);
            break;

        case 'bulk_import_items':
            $items = $input;
            if (empty($items)) {
                throw new Exception("No items to import.");
            }
            $pdo->beginTransaction();
            try {
                $sql = "
                    MERGE INTO " . ITEMS_TABLE . " AS target
                    USING (VALUES (?)) AS source (sap_no)
                    ON target.sap_no = source.sap_no
                    WHEN MATCHED THEN
                        UPDATE SET 
                            part_no = ?, 
                            part_description = ?,
                            planned_output = ?, 
                            is_active = ?
                    WHEN NOT MATCHED THEN
                        INSERT (sap_no, part_no, part_description, planned_output, is_active, created_at) 
                        VALUES (?, ?, ?, ?, ?, GETDATE());
                ";
                $stmt = $pdo->prepare($sql);

                foreach ($items as $item) {
                    $sap_no = trim($item['sap_no'] ?? '');
                    if (empty($sap_no)) continue;

                    $part_no = trim($item['part_no'] ?? $sap_no);
                    $desc = trim($item['part_description'] ?? '');
                    $planned_output = (int)($item['planned_output'] ?? 0);
                    $is_active = (bool)($item['is_active'] ?? true);
                    
                    $stmt->execute([
                        $sap_no, $part_no, $desc, $planned_output, $is_active,
                        $sap_no, $part_no, $desc, $planned_output, $is_active
                    ]);
                }

                $pdo->commit();
                logAction($pdo, $currentUser['username'], 'BULK IMPORT ITEMS', null, "Processed " . count($items) . " items.");
                echo json_encode(['success' => true, 'message' => "Import successful. " . count($items) . " items have been processed."]);

            } catch (Exception $e) {
                $pdo->rollBack();
                throw $e;
            }
            break;

        case 'import_costing_json':
            // Security check: Only allow admin/creator for costing import
            if (!hasRole(['admin', 'creator'])) {
                http_response_code(403);
                echo json_encode(['success' => false, 'message' => 'Unauthorized to import costing data.']);
                exit;
            }

            $costingData = $input; // Data comes directly as JSON array from JS
            if (empty($costingData)) {
                throw new Exception("No costing data received to import.");
            }

            $pdo->beginTransaction();
            try {
                // Prepare one UPDATE statement for efficiency
                $sql = "UPDATE " . ITEMS_TABLE . " SET 
                            Cost_RM = ?, Cost_PKG = ?, Cost_SUB = ?, Cost_DL = ?,
                            Cost_OH_Machine = ?, Cost_OH_Utilities = ?, Cost_OH_Indirect = ?, Cost_OH_Staff = ?, Cost_OH_Accessory = ?, Cost_OH_Others = ?,
                            Cost_Total = ?, StandardPrice = ?, StandardGP = ?, Price_USD = ?
                        WHERE sap_no = ?"; 
                $stmt = $pdo->prepare($sql);

                $updatedCount = 0;
                $notFoundCount = 0;
                $skippedCount = 0;

                foreach ($costingData as $itemCost) {
                    $sap_no = trim($itemCost['sap_no'] ?? '');
                    if (empty($sap_no)) {
                        $skippedCount++;
                        continue; // Skip if sap_no is missing
                    }

                    // Execute the update
                    $success = $stmt->execute([
                        $itemCost['Cost_RM'] ?? 0,
                        $itemCost['Cost_PKG'] ?? 0,
                        $itemCost['Cost_SUB'] ?? 0,
                        $itemCost['Cost_DL'] ?? 0,
                        $itemCost['Cost_OH_Machine'] ?? 0,
                        $itemCost['Cost_OH_Utilities'] ?? 0,
                        $itemCost['Cost_OH_Indirect'] ?? 0,
                        $itemCost['Cost_OH_Staff'] ?? 0,
                        $itemCost['Cost_OH_Accessory'] ?? 0,
                        $itemCost['Cost_OH_Others'] ?? 0,
                        $itemCost['Cost_Total'] ?? 0,
                        $itemCost['StandardPrice'] ?? 0,
                        $itemCost['StandardGP'] ?? 0,
                        $itemCost['Price_USD'] ?? 0,
                        $sap_no // WHERE clause parameter
                    ]);

                    if ($success) {
                        if ($stmt->rowCount() > 0) {
                            $updatedCount++;
                        } else {
                            // RowCount is 0 means the sap_no wasn't found in ITEMS_TABLE
                            $notFoundCount++;
                        }
                    } else {
                        // Handle potential DB error if needed, though execute usually throws PDOException
                        $skippedCount++; 
                    }
                }

                $pdo->commit();
                
                $message = "Costing import complete. Updated: {$updatedCount}. SAP No. not found: {$notFoundCount}. Skipped rows: {$skippedCount}.";
                logAction($pdo, $currentUser['username'], 'IMPORT COSTING', null, $message);
                echo json_encode(['success' => true, 'message' => $message]);

            } catch (Exception $e) {
                $pdo->rollBack();
                // Log the detailed error for debugging
                error_log("Costing Import Error: " . $e->getMessage()); 
                // Send a generic message to the user
                throw new Exception("An error occurred during the costing import process. Please check the server logs."); 
            }
            break;

        // ====== ROUTES ACTIONS ======
        case 'get_item_routes':
            $item_id = $_GET['item_id'] ?? 0;
            if (!$item_id) {
                echo json_encode(['success' => true, 'data' => []]);
                exit;
            }
            $stmt = $pdo->prepare("SELECT * FROM " . ROUTES_TABLE . " WHERE item_id = ? ORDER BY line, model");
            $stmt->execute([$item_id]);
            $routes = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(['success' => true, 'data' => $routes]);
            break;

        case 'save_route':
            $route_id = $input['route_id'] ?? 0;
            $item_id = $input['route_item_id'] ?? null;
            $line = trim($input['route_line'] ?? '');
            $model = trim($input['route_model'] ?? '');
            $planned_output = (int)($input['route_planned_output'] ?? 0);

            if (empty($item_id) || empty($line) || empty($model)) {
                throw new Exception("Item ID, Line, and Model are required.");
            }

            if ($route_id > 0) {
                $sql = "UPDATE " . ROUTES_TABLE . " SET line = ?, model = ?, planned_output = ?, updated_at = GETDATE() WHERE route_id = ?";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$line, $model, $planned_output, $route_id]);
                echo json_encode(['success' => true, 'message' => 'Route updated successfully.']);
            } else {
                $sql = "INSERT INTO " . ROUTES_TABLE . " (item_id, line, model, planned_output) VALUES (?, ?, ?, ?)";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$item_id, $line, $model, $planned_output]);
                echo json_encode(['success' => true, 'message' => 'New route created successfully.']);
            }
            break;

        case 'save_item_and_routes':
            if (!hasRole(['admin', 'creator'])) {
                http_response_code(403);
                echo json_encode(['success' => false, 'message' => 'Unauthorized']);
                exit;
            }

            $item_details = $input['item_details'] ?? [];
            $routes_data = $input['routes_data'] ?? [];

            if (empty($item_details['sap_no']) || empty($item_details['part_no'])) {
                throw new Exception("SAP No. and Part No. are required.");
            }
            
            $pdo->beginTransaction();
            try {
                $item_id = (int)$item_details['item_id'];
                
                $min_stock = !empty($item_details['min_stock']) ? $item_details['min_stock'] : 0;
                $max_stock = !empty($item_details['max_stock']) ? $item_details['max_stock'] : 0;

                // MES: Extract 14 costing variables, defaulting to 0
                $Cost_RM = !empty($item_details['Cost_RM']) ? $item_details['Cost_RM'] : 0;
                $Cost_PKG = !empty($item_details['Cost_PKG']) ? $item_details['Cost_PKG'] : 0;
                $Cost_SUB = !empty($item_details['Cost_SUB']) ? $item_details['Cost_SUB'] : 0;
                $Cost_DL = !empty($item_details['Cost_DL']) ? $item_details['Cost_DL'] : 0;
                $Cost_OH_Machine = !empty($item_details['Cost_OH_Machine']) ? $item_details['Cost_OH_Machine'] : 0;
                $Cost_OH_Utilities = !empty($item_details['Cost_OH_Utilities']) ? $item_details['Cost_OH_Utilities'] : 0;
                $Cost_OH_Indirect = !empty($item_details['Cost_OH_Indirect']) ? $item_details['Cost_OH_Indirect'] : 0;
                $Cost_OH_Staff = !empty($item_details['Cost_OH_Staff']) ? $item_details['Cost_OH_Staff'] : 0;
                $Cost_OH_Accessory = !empty($item_details['Cost_OH_Accessory']) ? $item_details['Cost_OH_Accessory'] : 0;
                $Cost_OH_Others = !empty($item_details['Cost_OH_Others']) ? $item_details['Cost_OH_Others'] : 0;
                $Cost_Total = !empty($item_details['Cost_Total']) ? $item_details['Cost_Total'] : 0;
                $StandardPrice = !empty($item_details['StandardPrice']) ? $item_details['StandardPrice'] : 0;
                $StandardGP = !empty($item_details['StandardGP']) ? $item_details['StandardGP'] : 0;
                $Price_USD = !empty($item_details['Price_USD']) ? $item_details['Price_USD'] : 0;

                if ($item_id > 0) {
                    // MES: Modified UPDATE statement
                    $sql = "UPDATE " . ITEMS_TABLE . " SET 
                                sap_no = ?, part_no = ?, part_description = ?, planned_output = ?, min_stock = ?, max_stock = ?, is_tracking = ?,
                                Cost_RM = ?, Cost_PKG = ?, Cost_SUB = ?, Cost_DL = ?,
                                Cost_OH_Machine = ?, Cost_OH_Utilities = ?, Cost_OH_Indirect = ?, Cost_OH_Staff = ?, Cost_OH_Accessory = ?, Cost_OH_Others = ?,
                                Cost_Total = ?, StandardPrice = ?, StandardGP = ?, Price_USD = ?
                            WHERE item_id = ?";
                    $stmt = $pdo->prepare($sql);
                    $stmt->execute([
                        $item_details['sap_no'], 
                        $item_details['part_no'], 
                        $item_details['part_description'], 
                        (int)$item_details['planned_output'],
                        $min_stock,
                        $max_stock,
                        (bool)($item_details['is_tracking'] ?? false),
                        // MES: Add 14 Costing variables
                        $Cost_RM, $Cost_PKG, $Cost_SUB, $Cost_DL,
                        $Cost_OH_Machine, $Cost_OH_Utilities, $Cost_OH_Indirect, $Cost_OH_Staff, $Cost_OH_Accessory, $Cost_OH_Others,
                        $Cost_Total, $StandardPrice, $StandardGP, $Price_USD,
                        // END MES
                        $item_id
                    ]);
                    logAction($pdo, $currentUser['username'], 'UPDATE ITEM', $item_id, "SAP: {$item_details['sap_no']}");
                } else {
                    // MES: Modified INSERT statement
                    $sql = "INSERT INTO " . ITEMS_TABLE . " (
                                sap_no, part_no, part_description, created_at, planned_output, min_stock, max_stock, is_tracking,
                                Cost_RM, Cost_PKG, Cost_SUB, Cost_DL,
                                Cost_OH_Machine, Cost_OH_Utilities, Cost_OH_Indirect, Cost_OH_Staff, Cost_OH_Accessory, Cost_OH_Others,
                                Cost_Total, StandardPrice, StandardGP, Price_USD
                            ) VALUES (
                                ?, ?, ?, GETDATE(), ?, ?, ?, ?,
                                ?, ?, ?, ?, 
                                ?, ?, ?, ?, ?, ?, 
                                ?, ?, ?, ?
                            )";
                    $stmt = $pdo->prepare($sql);
                    $stmt->execute([
                        $item_details['sap_no'], 
                        $item_details['part_no'], 
                        $item_details['part_description'], 
                        (int)$item_details['planned_output'],
                        $min_stock,
                        $max_stock,
                        (bool)($item_details['is_tracking'] ?? false),
                        // MES: Add 14 Costing variables
                        $Cost_RM, $Cost_PKG, $Cost_SUB, $Cost_DL,
                        $Cost_OH_Machine, $Cost_OH_Utilities, $Cost_OH_Indirect, $Cost_OH_Staff, $Cost_OH_Accessory, $Cost_OH_Others,
                        $Cost_Total, $StandardPrice, $StandardGP, $Price_USD
                        // END MES
                    ]);
                    $item_id = $pdo->lastInsertId();
                    logAction($pdo, $currentUser['username'], 'CREATE ITEM', $item_id, "SAP: {$item_details['sap_no']}");
                }

                foreach ($routes_data as $route) {
                    $route_id = (int)$route['route_id'];
                    $status = $route['status'];

                    if ($status === 'deleted' && $route_id > 0) {
                        $stmt = $pdo->prepare("DELETE FROM " . ROUTES_TABLE . " WHERE route_id = ?");
                        $stmt->execute([$route_id]);
                    } else if ($status === 'new') {
                        $sql = "INSERT INTO " . ROUTES_TABLE . " (item_id, line, model, planned_output) VALUES (?, ?, ?, ?)";
                        $stmt = $pdo->prepare($sql);
                        $stmt->execute([$item_id, $route['line'], $route['model'], (int)$route['planned_output']]);
                    } else if ($status === 'existing') {
                        $sql = "UPDATE " . ROUTES_TABLE . " SET line = ?, model = ?, planned_output = ?, updated_at = GETDATE() WHERE route_id = ?";
                        $stmt = $pdo->prepare($sql);
                        $stmt->execute([$route['line'], $route['model'], (int)$route['planned_output'], $route_id]);
                    }
               }
                
                $pdo->commit();
                echo json_encode(['success' => true, 'message' => 'Item and routes saved successfully.']);

            } catch (Exception $e) {
                $pdo->rollBack();
                throw $e;
            }
            break;

        case 'delete_route':
            $route_id = $input['route_id'] ?? 0;
            if (!$route_id) throw new Exception("Route ID is required.");
            
            $stmt = $pdo->prepare("DELETE FROM " . ROUTES_TABLE . " WHERE route_id = ?");
            $stmt->execute([$route_id]);
            echo json_encode(['success' => true, 'message' => 'Route deleted successfully.']);
            break;

        case 'read_schedules':
            $stmt = $pdo->prepare("EXEC dbo.sp_GetSchedules");
            $stmt->execute();
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
            break;

        case 'save_schedule':
            $stmt = $pdo->prepare("EXEC dbo.sp_SaveSchedule @id=?, @line=?, @shift_name=?, @start_time=?, @end_time=?, @planned_break_minutes=?, @is_active=?");
            $stmt->execute([
                $input['id'] ?? 0, $input['line'], $input['shift_name'],
                $input['start_time'], $input['end_time'],
                $input['planned_break_minutes'], $input['is_active']
            ]);
            echo json_encode(['success' => true, 'message' => 'Schedule saved successfully.']);
            break;

        case 'delete_schedule':
            $id = $input['id'] ?? 0;
            if (!$id) { throw new Exception("Missing Schedule ID"); }
            $stmt = $pdo->prepare("EXEC dbo.sp_DeleteSchedule @id=?");
            $stmt->execute([(int)$id]);
            echo json_encode(['success' => true, 'message' => 'Schedule deleted.']);
            break;

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
            } else {
                $stmt = $pdo->prepare("EXEC dbo.sp_GetMissingParameters");
                $stmt->execute();
            }
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
            break;
            
        default:
            http_response_code(400);
            throw new Exception("Invalid action specified for Item Master.");
    }
} catch (PDOException $e) {
    http_response_code(500);
    if ($e->getCode() == '23000') {
        echo json_encode(['success' => false, 'message' => "Error: SAP No. '{$input['sap_no']}' already exists."]);
    } else {
        echo json_encode(['success' => false, 'message' => "Database error: " . $e->getMessage()]);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>