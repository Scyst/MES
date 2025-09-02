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

            // [FIXED] เปลี่ยนจากการ JOIN PARAMETER_TABLE เป็น ROUTES_TABLE
            if (!empty($filter_model)) {
                $fromClause .= " JOIN " . ROUTES_TABLE . " r ON i.item_id = r.item_id"; 
                $conditions[] = "RTRIM(LTRIM(r.model)) LIKE ?";
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
                                -- [FIXED] เปลี่ยนจากการ JOIN PARAMETER_TABLE เป็น ROUTES_TABLE
                                SELECT ', ' + r_sub.model
                                FROM " . ROUTES_TABLE . " r_sub
                                WHERE r_sub.item_id = i.item_id
                                ORDER BY r_sub.model
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

        case 'get_lines':
            // ✅ เพิ่ม case นี้เข้าไป
            $sql = "SELECT DISTINCT RTRIM(LTRIM(line)) as line FROM " . ROUTES_TABLE . " WHERE line IS NOT NULL AND line != '' ORDER BY line ASC";
            $stmt = $pdo->prepare($sql);
            $stmt->execute();
            $lines = $stmt->fetchAll(PDO::FETCH_COLUMN);
            echo json_encode(['success' => true, 'data' => $lines]);
            break;

        case 'get_models':
            $searchTerm = $_GET['search'] ?? '';
            // [FIXED] เปลี่ยนจากการ JOIN PARAMETER_TABLE เป็น ROUTES_TABLE
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
                
                if ($item_id > 0) { // อัปเดต Item ที่มีอยู่
                    $sql = "UPDATE " . ITEMS_TABLE . " SET sap_no = ?, part_no = ?, part_description = ?, planned_output = ? WHERE item_id = ?";
                    $stmt = $pdo->prepare($sql);
                    $stmt->execute([$item_details['sap_no'], $item_details['part_no'], $item_details['part_description'], (int)$item_details['planned_output'], $item_id]);
                    logAction($pdo, $currentUser['username'], 'UPDATE ITEM', $item_id, "SAP: {$item_details['sap_no']}");
                } else { // สร้าง Item ใหม่
                    $sql = "INSERT INTO " . ITEMS_TABLE . " (sap_no, part_no, part_description, created_at, planned_output) VALUES (?, ?, ?, GETDATE(), ?)";
                    $stmt = $pdo->prepare($sql);
                    $stmt->execute([$item_details['sap_no'], $item_details['part_no'], $item_details['part_description'], (int)$item_details['planned_output']]);
                    $item_id = $pdo->lastInsertId(); // ดึง ID ของ Item ที่สร้างใหม่
                    logAction($pdo, $currentUser['username'], 'CREATE ITEM', $item_id, "SAP: {$item_details['sap_no']}");
                }

                // ---- 2. จัดการข้อมูล Routes ----
                foreach ($routes_data as $route) {
                    $route_id = (int)$route['route_id'];
                    $status = $route['status'];

                    if ($status === 'deleted' && $route_id > 0) {
                        // ลบ Route ที่ถูกลบ
                        $stmt = $pdo->prepare("DELETE FROM " . ROUTES_TABLE . " WHERE route_id = ?");
                        $stmt->execute([$route_id]);

                    } else if ($status === 'new') {
                        // เพิ่ม Route ใหม่
                        $sql = "INSERT INTO " . ROUTES_TABLE . " (item_id, line, model, planned_output) VALUES (?, ?, ?, ?)";
                        $stmt = $pdo->prepare($sql);
                        $stmt->execute([$item_id, $route['line'], $route['model'], (int)$route['planned_output']]);

                    } else if ($status === 'existing') {
                        // อัปเดต Route เดิม
                        $sql = "UPDATE " . ROUTES_TABLE . " SET line = ?, model = ?, planned_output = ?, updated_at = GETDATE() WHERE route_id = ?";
                        $stmt = $pdo->prepare($sql);
                        $stmt->execute([$route['line'], $route['model'], (int)$route['planned_output'], $route_id]);
                    }
                }
                
                // ถ้าทุกอย่างเรียบร้อย ให้ commit transaction
                $pdo->commit();
                echo json_encode(['success' => true, 'message' => 'Item and routes saved successfully.']);

            } catch (Exception $e) {
                $pdo->rollBack();
                throw $e; // ส่ง error กลับไปให้ client
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