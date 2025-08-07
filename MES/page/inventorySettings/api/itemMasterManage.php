<?php
require_once __DIR__ . '/../../../api/db.php';
require_once __DIR__ . '/../../../auth/check_auth.php';
require_once __DIR__ . '/../../../api/logger.php';

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
            $limit = 50;
            $startRow = ($page - 1) * $limit;
            $endRow = $startRow + $limit;

            $searchTerm = $_GET['search'] ?? '';
            $showInactive = isset($_GET['show_inactive']) && $_GET['show_inactive'] === 'true';

            $conditions = [];
            $params = [];

            if (!$showInactive) {
                $conditions[] = "is_active = 1";
            }
            if (!empty($searchTerm)) {
                $conditions[] = "(sap_no LIKE ? OR part_no LIKE ?)";
                $params[] = '%' . $searchTerm . '%';
                $params[] = '%' . $searchTerm . '%';
            }
            $whereClause = !empty($conditions) ? "WHERE " . implode(" AND ", $conditions) : "";
            
            $orderByClause = "ORDER BY sap_no ASC";
            if ($showInactive) {
                $orderByClause = "ORDER BY is_active ASC, sap_no ASC";
            }

            $totalSql = "SELECT COUNT(*) FROM " . ITEMS_TABLE . " {$whereClause}";
            $totalStmt = $pdo->prepare($totalSql);
            $totalStmt->execute($params);
            $total = (int)$totalStmt->fetchColumn();

            $dataSql = "
                WITH NumberedRows AS (
                    SELECT 
                        item_id, sap_no, part_no, part_description, part_value, created_at, is_active,
                        ROW_NUMBER() OVER ({$orderByClause}) AS RowNum
                    FROM " . ITEMS_TABLE . "
                    {$whereClause}
                )
                SELECT * FROM NumberedRows
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
            $part_value = !empty($input['part_value']) ? (float)$input['part_value'] : 0;

            if (empty($sap_no) || empty($part_no)) {
                throw new Exception("SAP No. and Part No. are required.");
            }

            if ($id > 0) {
                $sql = "UPDATE " . ITEMS_TABLE . " SET sap_no = ?, part_no = ?, part_description = ?, part_value = ? WHERE item_id = ?";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$sap_no, $part_no, $description, $part_value, $id]);
                logAction($pdo, $currentUser['username'], 'UPDATE ITEM', $id, "SAP: {$sap_no}");
                echo json_encode(['success' => true, 'message' => 'Item updated successfully.']);
            } else {
                $sql = "INSERT INTO " . ITEMS_TABLE . " (sap_no, part_no, part_description, part_value, created_at) VALUES (?, ?, ?, ?, GETDATE())";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$sap_no, $part_no, $description, $part_value]);
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