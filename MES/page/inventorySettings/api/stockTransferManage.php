<?php
require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../../auth/check_auth.php';
require_once __DIR__ . '/../../logger.php';

if (!hasRole(['supervisor', 'admin', 'creator'])) {
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

// =================================================================
// DEVELOPMENT SWITCH
$is_development = true; 
$locations_table = $is_development ? 'LOCATIONS_TEST' : 'LOCATIONS';
$items_table = $is_development ? 'ITEMS_TEST' : 'ITEMS';
$onhand_table = $is_development ? 'INVENTORY_ONHAND_TEST' : 'INVENTORY_ONHAND';
$transactions_table = $is_development ? 'STOCK_TRANSACTIONS_TEST' : 'STOCK_TRANSACTIONS';
$users_table = $is_development ? 'USERS_TEST' : 'USERS';
// =================================================================

$action = $_REQUEST['action'] ?? '';
$input = json_decode(file_get_contents("php://input"), true);
$currentUser = $_SESSION['user'];

try {
    switch ($action) {
        case 'get_transfer_history':
            $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
            $limit = 50;
            $startRow = ($page - 1) * $limit;
            
            $conditions = ["t.transaction_type = 'TRANSFER'"];
            $params = [];
            
            if (!empty($_GET['part_no'])) { $conditions[] = "i.part_no LIKE ?"; $params[] = '%' . $_GET['part_no'] . '%'; }
            if (!empty($_GET['from_location'])) { $conditions[] = "loc_from.location_name LIKE ?"; $params[] = '%' . $_GET['from_location'] . '%'; }
            if (!empty($_GET['to_location'])) { $conditions[] = "loc_to.location_name LIKE ?"; $params[] = '%' . $_GET['to_location'] . '%'; }
            if (!empty($_GET['startDate'])) { $conditions[] = "t.transaction_timestamp >= ?"; $params[] = $_GET['startDate']; }
            if (!empty($_GET['endDate'])) { $conditions[] = "t.transaction_timestamp < DATEADD(day, 1, ?)"; $params[] = $_GET['endDate']; }

            $whereClause = "WHERE " . implode(" AND ", $conditions);

            $totalSql = "SELECT COUNT(*) FROM {$transactions_table} t
                        JOIN {$items_table} i ON t.parameter_id = i.item_id
                        LEFT JOIN {$locations_table} loc_from ON t.from_location_id = loc_from.location_id
                        LEFT JOIN {$locations_table} loc_to ON t.to_location_id = loc_to.location_id
                        {$whereClause}";
            $totalStmt = $pdo->prepare($totalSql);
            $totalStmt->execute($params);
            $total = (int)$totalStmt->fetchColumn();

            $dataSql = "
                SELECT 
                    t.transaction_id, t.transaction_timestamp, i.part_no, i.part_description, t.quantity,
                    -- Combine the two location names into a single 'transfer_path' field
                    ISNULL(loc_from.location_name, 'N/A') + ' --> ' + ISNULL(loc_to.location_name, 'N/A') AS transfer_path,
                    u.username AS created_by, t.notes
                FROM {$transactions_table} t
                JOIN {$items_table} i ON t.parameter_id = i.item_id
                LEFT JOIN {$locations_table} loc_from ON t.from_location_id = loc_from.location_id
                LEFT JOIN {$locations_table} loc_to ON t.to_location_id = loc_to.location_id
                LEFT JOIN {$users_table} u ON t.created_by_user_id = u.id
                {$whereClause}
                ORDER BY t.transaction_timestamp DESC
                OFFSET ? ROWS FETCH NEXT ? ROWS ONLY
            ";
            
            $dataStmt = $pdo->prepare($dataSql);
            
            $paramIndex = 1;
            foreach ($params as $param) {
                $dataStmt->bindValue($paramIndex++, $param);
            }
            $dataStmt->bindValue($paramIndex++, (int)$startRow, PDO::PARAM_INT);
            $dataStmt->bindValue($paramIndex++, (int)$limit, PDO::PARAM_INT);
            $dataStmt->execute();

            $history = $dataStmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode(['success' => true, 'data' => $history, 'total' => $total, 'page' => $page, 'limit' => $limit]);
            break;

        case 'get_initial_data':
            $locationsStmt = $pdo->query("SELECT location_id, location_name FROM {$locations_table} WHERE is_active = 1 ORDER BY location_name");
            $locations = $locationsStmt->fetchAll(PDO::FETCH_ASSOC);
            $itemsStmt = $pdo->query("SELECT item_id, sap_no, part_no, part_description FROM {$items_table} ORDER BY sap_no");
            $items = $itemsStmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(['success' => true, 'locations' => $locations, 'items' => $items]);
            break;

        case 'get_stock_onhand':
            $item_id = $_GET['item_id'] ?? 0;
            $location_id = $_GET['location_id'] ?? 0;
            if (empty($item_id) || empty($location_id)) {
                echo json_encode(['success' => true, 'quantity' => 0]);
                exit;
            }
            $stockStmt = $pdo->prepare("SELECT quantity FROM {$onhand_table} WHERE parameter_id = ? AND location_id = ?");
            $stockStmt->execute([$item_id, $location_id]);
            $stock = $stockStmt->fetch();
            echo json_encode(['success' => true, 'quantity' => $stock['quantity'] ?? 0]);
            break;

        case 'execute_transfer':
            $item_id = $input['item_id'] ?? 0;
            $from_location_id = $input['from_location_id'] ?? 0;
            $to_location_id = $input['to_location_id'] ?? 0;
            $quantity = $input['quantity'] ?? 0;
            $notes = $input['notes'] ?? null;
            
            if (empty($item_id) || empty($from_location_id) || empty($to_location_id) || !is_numeric($quantity) || $quantity <= 0) {
                throw new Exception("Invalid data provided for transfer.");
            }
            if ($from_location_id == $to_location_id) {
                throw new Exception("From and To locations cannot be the same.");
            }

            $pdo->beginTransaction();
            
            $updateFromSql = "UPDATE {$onhand_table} SET quantity = quantity - ?, last_updated = GETDATE() WHERE parameter_id = ? AND location_id = ? AND quantity >= ?";
            $updateFromStmt = $pdo->prepare($updateFromSql);
            $updateFromStmt->execute([$quantity, $item_id, $from_location_id, $quantity]);

            if ($updateFromStmt->rowCount() == 0) {
                $pdo->rollBack();
                throw new Exception("Insufficient stock at the source location or location/item not found.");
            }

            $updateToSql = "MERGE {$onhand_table} AS target USING (SELECT ? AS item_id, ? AS location_id) AS source ON (target.parameter_id = source.item_id AND target.location_id = source.location_id) WHEN MATCHED THEN UPDATE SET quantity = target.quantity + ?, last_updated = GETDATE() WHEN NOT MATCHED THEN INSERT (parameter_id, location_id, quantity) VALUES (?, ?, ?);";
            $updateToStmt = $pdo->prepare($updateToSql);
            $updateToStmt->execute([$item_id, $to_location_id, $quantity, $item_id, $to_location_id, $quantity]);

            $transSql = "INSERT INTO {$transactions_table} (parameter_id, quantity, transaction_type, from_location_id, to_location_id, created_by_user_id, notes) VALUES (?, ?, 'TRANSFER', ?, ?, ?, ?)";
            $transStmt = $pdo->prepare($transSql);
            $transStmt->execute([$item_id, $quantity, $from_location_id, $to_location_id, $currentUser['id'], $notes]);

            $pdo->commit();
            logAction($pdo, $currentUser['username'], 'STOCK TRANSFER', $item_id, "Qty: {$quantity}, From: {$from_location_id}, To: {$to_location_id}");
            echo json_encode(['success' => true, 'message' => 'Stock transfer executed successfully.']);
            break;

        case 'update_transfer':
            if (!hasRole(['admin', 'creator'])) {
                throw new Exception("You do not have permission to edit transfer history.");
            }

            $transaction_id = $input['transaction_id'] ?? 0;
            $notes = trim($input['notes'] ?? '');

            if (empty($transaction_id)) {
                throw new Exception("Transaction ID is required for an update.");
            }

            $sql = "UPDATE {$transactions_table} SET notes = ? WHERE transaction_id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$notes, $transaction_id]);

            logAction($pdo, $currentUser['username'], 'UPDATE TRANSFER', $transaction_id, "Notes updated.");
            echo json_encode(['success' => true, 'message' => 'Transfer record updated successfully.']);
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