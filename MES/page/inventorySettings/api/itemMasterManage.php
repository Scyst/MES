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
                        DISTINCT i.item_id, i.sap_no, i.part_no, i.part_description, i.created_at, i.is_active,
                        
                        STUFF(
                            (
                                SELECT ', ' + p_sub.model
                                FROM " . PARAMETER_TABLE . " p_sub
                                WHERE p_sub.item_id = i.item_id
                                ORDER BY p_sub.model
                                FOR XML PATH('')
                            ), 1, 2, ''
                        ) AS used_models,

                        ROW_NUMBER() OVER ({$orderByClause}) AS RowNum
                    {$fromClause}
                    {$whereClause}
                )
                SELECT item_id, sap_no, part_no, part_description, created_at, is_active, used_models
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

            if (empty($sap_no) || empty($part_no)) {
                throw new Exception("SAP No. and Part No. are required.");
            }

            if ($id > 0) {
                $sql = "UPDATE " . ITEMS_TABLE . " SET sap_no = ?, part_no = ?, part_description = ? WHERE item_id = ?";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$sap_no, $part_no, $description, $id]);
                logAction($pdo, $currentUser['username'], 'UPDATE ITEM', $id, "SAP: {$sap_no}");
                echo json_encode(['success' => true, 'message' => 'Item updated successfully.']);
            } else {
                $sql = "INSERT INTO " . ITEMS_TABLE . " (sap_no, part_no, part_description, created_at) VALUES (?, ?, ?, GETDATE())";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$sap_no, $part_no, $description]);
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
            if (empty($input) || !is_array($input)) {
                throw new Exception("Invalid import data.");
            }

            $pdo->beginTransaction();
            try {
                $checkStmt = $pdo->prepare("SELECT item_id FROM " . ITEMS_TABLE . " WHERE sap_no = ?");
                $updateStmt = $pdo->prepare("UPDATE " . ITEMS_TABLE . " SET part_no = ?, part_description = ?, is_active = ? WHERE item_id = ?");
                $insertStmt = $pdo->prepare("INSERT INTO " . ITEMS_TABLE . " (sap_no, part_no, part_description, is_active, created_at) VALUES (?, ?, ?, ?, GETDATE())");

                $insertedCount = 0;
                $updatedCount = 0;

                foreach ($input as $item) {
                    $sap_no = trim($item['sap_no'] ?? '');
                    if (empty($sap_no)) continue; // ข้ามแถวที่ไม่มี SAP No.

                    $part_no = trim($item['part_no'] ?? '');
                    $desc = trim($item['part_description'] ?? '');
                    $active = isset($item['is_active']) && ($item['is_active'] === '1' || $item['is_active'] === 1) ? 1 : 0;

                    $checkStmt->execute([$sap_no]);
                    $existing_id = $checkStmt->fetchColumn();

                    if ($existing_id) {
                        // Update
                        $updateStmt->execute([$part_no, $desc, $active, $existing_id]);
                        $updatedCount++;
                    } else {
                        // Insert
                        $insertStmt->execute([$sap_no, $part_no, $desc, $active]);
                        $insertedCount++;
                    }
                }

                $pdo->commit();
                logAction($pdo, $currentUser['username'], 'BULK IMPORT ITEMS', null, "Inserted: {$insertedCount}, Updated: {$updatedCount}");
                echo json_encode(['success' => true, 'message' => "Import successful. Added: {$insertedCount} new items, Updated: {$updatedCount} existing items."]);

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