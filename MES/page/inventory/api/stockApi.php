<?php
// api/pdTable/wipManage.php

require_once __DIR__ . '/../../../api/db.php';
require_once __DIR__ . '/../../../auth/check_auth.php';
require_once __DIR__ . '/../../../api/logger.php';

// ส่วนของ CSRF Token Check (เหมือนเดิม)
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    if (!isset($_SERVER['HTTP_X_CSRF_TOKEN']) || !isset($_SESSION['csrf_token']) || !hash_equals($_SESSION['csrf_token'], $_SERVER['HTTP_X_CSRF_TOKEN'])) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'CSRF token validation failed.']);
        exit;
    }
}

// ไม่มีการประกาศ $is_development หรือชื่อตารางที่นี่อีกต่อไป

$action = $_REQUEST['action'] ?? '';
$input = json_decode(file_get_contents("php://input"), true);
$currentUser = $_SESSION['user'];

try {
    switch ($action) {
        case 'get_initial_data':
            $locationsStmt = $pdo->query("SELECT location_id, location_name FROM " . LOCATIONS_TABLE . " WHERE is_active = 1 ORDER BY location_name");
            $locations = $locationsStmt->fetchAll(PDO::FETCH_ASSOC);

            $itemsStmt = $pdo->query("SELECT item_id, sap_no, part_no, part_description FROM " . ITEMS_TABLE . " ORDER BY sap_no");
            $items = $itemsStmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode(['success' => true, 'locations' => $locations, 'items' => $items]);
            break;

        case 'execute_receipt':
            $item_id = $input['item_id'] ?? 0;
            $location_id = $input['location_id'] ?? 0;
            $quantity = $input['quantity'] ?? 0;
            $lot_no = $input['lot_no'] ?? null;
            $notes = $input['notes'] ?? null;
            
            if (empty($item_id) || empty($location_id) || !is_numeric($quantity) || $quantity <= 0) {
                throw new Exception("Invalid data provided for receipt.");
            }

            $pdo->beginTransaction();
            
            $mergeSql = "MERGE " . ONHAND_TABLE . " AS target USING (SELECT ? AS item_id, ? AS location_id) AS source ON (target.parameter_id = source.item_id AND target.location_id = source.location_id) WHEN MATCHED THEN UPDATE SET quantity = target.quantity + ?, last_updated = GETDATE() WHEN NOT MATCHED THEN INSERT (parameter_id, location_id, quantity) VALUES (?, ?, ?);";
            $mergeStmt = $pdo->prepare($mergeSql);
            $mergeStmt->execute([$item_id, $location_id, $quantity, $item_id, $location_id, $quantity]);

            $transSql = "INSERT INTO " . TRANSACTIONS_TABLE . " (parameter_id, quantity, transaction_type, to_location_id, created_by_user_id, notes, reference_id) VALUES (?, ?, 'RECEIPT', ?, ?, ?, ?)";
            $transStmt = $pdo->prepare($transSql);
            $transStmt->execute([$item_id, $quantity, $location_id, $currentUser['id'], $notes, $lot_no]);

            $pdo->commit();
            logAction($pdo, $currentUser['username'], 'STOCK RECEIPT', $item_id, "Qty: {$quantity}, To: {$location_id}, Lot: {$lot_no}");
            echo json_encode(['success' => true, 'message' => 'Stock receipt logged successfully.']);
            break;

        case 'get_receipt_history':
            $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
            $limit = 50;
            $startRow = ($page - 1) * $limit;
            $endRow = $startRow + $limit;
            
            $totalSql = "SELECT COUNT(*) FROM " . TRANSACTIONS_TABLE . " WHERE transaction_type = 'RECEIPT'";
            $total = (int)$pdo->query($totalSql)->fetchColumn();

            $dataSql = "
                WITH NumberedRows AS (
                    SELECT 
                        t.transaction_timestamp, i.sap_no, i.part_no, i.part_description, t.quantity, 
                        loc_to.location_name AS to_location, u.username AS created_by, t.reference_id as lot_no,
                        ROW_NUMBER() OVER (ORDER BY t.transaction_timestamp DESC) as RowNum
                    FROM " . TRANSACTIONS_TABLE . " t
                    JOIN " . ITEMS_TABLE . " i ON t.parameter_id = i.item_id
                    JOIN " . LOCATIONS_TABLE . " loc_to ON t.to_location_id = loc_to.location_id
                    LEFT JOIN " . USERS_TABLE . " u ON t.created_by_user_id = u.id
                    WHERE t.transaction_type = 'RECEIPT'
                )
                SELECT transaction_timestamp, sap_no, part_no, part_description, quantity, to_location, created_by, lot_no
                FROM NumberedRows
                WHERE RowNum > ? AND RowNum <= ?
            ";
            
            $dataStmt = $pdo->prepare($dataSql);
            $dataStmt->execute([$startRow, $endRow]);
            $history = $dataStmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode(['success' => true, 'data' => $history, 'total' => $total, 'page' => $page]);
            break;

        case 'get_stock_inventory_report':
            $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
            $limit = 50;
            $startRow = ($page - 1) * $limit;
            $endRow = $startRow + $limit;

            $search_term = $_GET['search_term'] ?? '';
            $conditions = [];
            $params = [];
            if (!empty($search_term)) {
                $conditions[] = "(i.sap_no LIKE ? OR i.part_no LIKE ? OR i.part_description LIKE ?)";
                $params = ["%{$search_term}%", "%{$search_term}%", "%{$search_term}%"];
            }
            $whereClause = !empty($conditions) ? "WHERE " . implode(" AND ", $conditions) : "";

            $totalSql = "SELECT COUNT(DISTINCT i.item_id) FROM " . ITEMS_TABLE . " i {$whereClause}";
            $totalStmt = $pdo->prepare($totalSql);
            $totalStmt->execute($params);
            $total = (int)$totalStmt->fetchColumn();

            $dataSql = "
                WITH ItemGroup AS (
                    SELECT
                        i.item_id, i.sap_no, i.part_no, i.part_description,
                        SUM(ISNULL(h.quantity, 0)) as total_onhand
                    FROM " . ITEMS_TABLE . " i
                    LEFT JOIN " . ONHAND_TABLE . " h ON i.item_id = h.parameter_id
                    {$whereClause}
                    GROUP BY i.item_id, i.sap_no, i.part_no, i.part_description
                ),
                NumberedRows AS (
                    SELECT *, ROW_NUMBER() OVER (ORDER BY sap_no) as RowNum
                    FROM ItemGroup
                )
                SELECT item_id, sap_no, part_no, part_description, total_onhand
                FROM NumberedRows
                WHERE RowNum > ? AND RowNum <= ?
            ";
            
            $paginationParams = array_merge($params, [$startRow, $endRow]);
            $dataStmt = $pdo->prepare($dataSql);
            $dataStmt->execute($paginationParams);
            $stock = $dataStmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode(['success' => true, 'data' => $stock, 'total' => $total, 'page' => $page]);
            break;

        case 'get_wip_inventory_report':
            $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
            $limit = 50;
            $startRow = ($page - 1) * $limit;
            $endRow = $startRow + $limit;
            
            $wipLocationCondition = "loc.location_name NOT LIKE '%WAREHOUSE%'";

            $params = [];
            $conditions = [$wipLocationCondition];
            if (!empty($_GET['part_no'])) { 
                $conditions[] = "(i.sap_no LIKE ? OR i.part_no LIKE ?)";
                $params[] = '%' . $_GET['part_no'] . '%';
                $params[] = '%' . $_GET['part_no'] . '%';
            }
             if (!empty($_GET['location'])) { 
                $conditions[] = "loc.location_name LIKE ?";
                $params[] = '%' . $_GET['location'] . '%';
            }
            $whereClause = "WHERE " . implode(" AND ", $conditions);

            $totalSql = "SELECT COUNT(*) FROM " . ONHAND_TABLE . " h
                         JOIN " . ITEMS_TABLE . " i ON h.parameter_id = i.item_id
                         JOIN " . LOCATIONS_TABLE . " loc ON h.location_id = loc.location_id
                         {$whereClause}";
            $totalStmt = $pdo->prepare($totalSql);
            $totalStmt->execute($params);
            $total = (int)$totalStmt->fetchColumn();

            $dataSql = "
                WITH NumberedRows AS (
                    SELECT 
                        h.location_id, loc.location_name, h.parameter_id as item_id,
                        i.sap_no, i.part_no, i.part_description, h.quantity,
                        ROW_NUMBER() OVER (ORDER BY loc.location_name, i.sap_no) as RowNum
                    FROM " . ONHAND_TABLE . " h
                    JOIN " . ITEMS_TABLE . " i ON h.parameter_id = i.item_id
                    JOIN " . LOCATIONS_TABLE . " loc ON h.location_id = loc.location_id
                    {$whereClause}
                )
                SELECT location_id, location_name, item_id, sap_no, part_no, part_description, quantity
                FROM NumberedRows
                WHERE RowNum > ? AND RowNum <= ?
            ";
            
            $paginationParams = array_merge($params, [$startRow, $endRow]);
            $dataStmt = $pdo->prepare($dataSql);
            $dataStmt->execute($paginationParams);
            $wip_data = $dataStmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode(['success' => true, 'data' => $wip_data, 'total' => $total, 'page' => $page]);
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
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>