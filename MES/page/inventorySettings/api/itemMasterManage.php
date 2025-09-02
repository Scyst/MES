<?php
require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../../auth/check_auth.php';
require_once __DIR__ . '/../../logger.php';

// จำกัดสิทธิ์ให้เฉพาะ Admin และ Creator เท่านั้นที่สามารถจัดการ Item Master ได้
if (!hasRole(['admin', 'creator'])) {
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

            if (!empty($filter_model)) {
                $fromClause .= " JOIN " . PARAMETER_TABLE . " p ON i.item_id = p.item_id"; 
                $conditions[] = "RTRIM(LTRIM(p.model)) LIKE ?";
                $params[] = '%' . $filter_model . '%';
            }

            if (!$showInactive) {
                $conditions[] = "i.is_active = 1";
            }
            if (!empty($searchTerm)) {
                $conditions[] = "(i.sap_no LIKE ? OR i.part_no LIKE ?)";
                $params[] = '%' . $searchTerm . '%';
                $params[] = '%' . $searchTerm . '%';
            }
            $whereClause = !empty($conditions) ? "WHERE " . implode(" AND ", $conditions) : "";
            
            $orderByClause = "ORDER BY i.sap_no ASC";
            if ($showInactive) {
                $orderByClause = "ORDER BY i.is_active ASC, i.sap_no ASC";
            }

            $totalSql = "SELECT COUNT(DISTINCT i.item_id) {$fromClause} {$whereClause}";
            $totalStmt = $pdo->prepare($totalSql);
            $totalStmt->execute($params);
            $total = (int)$totalStmt->fetchColumn();

            $dataSql = "
                WITH NumberedRows AS (
                    SELECT 
                        DISTINCT i.item_id, i.sap_no, i.part_no, i.part_description, FORMAT(i.created_at, 'yyyy-MM-dd HH:mm') as created_at, i.is_active, i.planned_output,
                        
                        STUFF(
                            (
                                SELECT ', ' + p_sub.model
                                FROM " . PARAMETER_TABLE . " p_sub
                                WHERE p_sub.item_id = i.item_id
                                ORDER BY p_sub.model
                                FOR XML PATH('')
                            ), 1, 2, ''
                        ) AS used_in_models,

                        ROW_NUMBER() OVER ({$orderByClause}) AS RowNum
                    {$fromClause}
                    {$whereClause}
                )
                SELECT item_id, sap_no, part_no, part_description, created_at, is_active, used_in_models, planned_output
                FROM NumberedRows
                WHERE RowNum > ? AND RowNum <= ?
            ";
            
            $paginationParams = array_merge($params, [$startRow, $endRow]);
            $dataStmt = $pdo->prepare($dataSql);
            $dataStmt->execute($paginationParams);
            $items = $dataStmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode(['success' => true, 'data' => $items, 'total' => $total, 'page' => $page]);
            break;

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
    
                if ($route_id > 0) { // Update
                    $sql = "UPDATE " . ROUTES_TABLE . " SET line = ?, model = ?, planned_output = ?, updated_at = GETDATE() WHERE route_id = ?";
                    $stmt = $pdo->prepare($sql);
                    $stmt->execute([$line, $model, $planned_output, $route_id]);
                    echo json_encode(['success' => true, 'message' => 'Route updated successfully.']);
                } else { // Insert
                    $sql = "INSERT INTO " . ROUTES_TABLE . " (item_id, line, model, planned_output) VALUES (?, ?, ?, ?)";
                    $stmt = $pdo->prepare($sql);
                    $stmt->execute([$item_id, $line, $model, $planned_output]);
                    echo json_encode(['success' => true, 'message' => 'New route created successfully.']);
                }
                break;
    
            case 'delete_route':
                $route_id = $input['route_id'] ?? 0;
                if (!$route_id) throw new Exception("Route ID is required.");
                
                $stmt = $pdo->prepare("DELETE FROM " . ROUTES_TABLE . " WHERE route_id = ?");
                $stmt->execute([$route_id]);
                echo json_encode(['success' => true, 'message' => 'Route deleted successfully.']);
                break;

        case 'save_item':
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
            break;

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

        // ใน itemMasterManage.php
        case 'get_models':
            $searchTerm = $_GET['search'] ?? '';
            // ใช้ค่าคงที่จาก config.php โดยตรง
            $sql = "SELECT DISTINCT RTRIM(LTRIM(model)) as model FROM " . PARAMETER_TABLE . " WHERE model IS NOT NULL AND model != ''";
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
                $insertedCount = 0;
                $updatedCount = 0;

                // --- ★★★ START: แก้ไข SQL MERGE ★★★ ---
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
                // --- ★★★ END: แก้ไข SQL MERGE ★★★ ---
                $stmt = $pdo->prepare($sql);

                foreach ($items as $item) {
                    $sap_no = trim($item['sap_no'] ?? '');
                    if (empty($sap_no)) continue;

                    $part_no = trim($item['part_no'] ?? $sap_no);
                    $desc = trim($item['part_description'] ?? '');
                    $planned_output = (int)($item['planned_output'] ?? 0);
                    $is_active = (bool)($item['is_active'] ?? true);
                    
                    // --- ★★★ START: แก้ไข Parameters ★★★ ---
                    $stmt->execute([
                        $sap_no,          // for USING source
                        $part_no,         // for UPDATE SET
                        $desc,            // for UPDATE SET
                        $planned_output,  // for UPDATE SET
                        $is_active,       // for UPDATE SET
                        $sap_no,          // for INSERT
                        $part_no,         // for INSERT
                        $desc,            // for INSERT
                        $planned_output,  // for INSERT
                        $is_active        // for INSERT
                    ]);
                    // --- ★★★ END: แก้ไข Parameters ★★★ ---

                    // Check if it was an insert or update for counting
                    // This is a simplified way; a more robust way might involve OUTPUT clause
                    $checkStmt = $pdo->prepare("SELECT COUNT(*) FROM " . ITEMS_TABLE . " WHERE sap_no = ?");
                    $checkStmt->execute([$sap_no]);
                    
                    // A more accurate rowCount might be needed depending on DB driver
                    if ($stmt->rowCount() > 0) {
                       // Heuristic: If it was just inserted, created_at would be very recent.
                       // For simplicity, we can't easily distinguish insert vs update here without more complex SQL.
                       // We can assume an update if it existed before, but that requires another query.
                       // For now, we just log the action. A better approach is to split into two separate queries if counts are critical.
                    }
                }

                $pdo->commit();
                logAction($pdo, $currentUser['username'], 'BULK IMPORT ITEMS', null, "Processed " . count($items) . " items.");
                echo json_encode(['success' => true, 'message' => "Import successful. " . count($items) . " items have been processed."]);

            } catch (Exception $e) {
                $pdo->rollBack();
                throw $e;
            }
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