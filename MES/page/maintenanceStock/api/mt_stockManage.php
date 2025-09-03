<?php
// page/maintenanceStock/api/mt_stockManage.php (เวอร์ชันแก้ไข)

require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../../auth/check_auth.php';
require_once __DIR__ . '/../../logger.php';

// --- CSRF Token Validation ---
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

// --- Helper function for updating on-hand stock (เหมือนเดิม) ---
function updateMtOnhandBalance(PDO $pdo, int $item_id, int $location_id, float $quantity_change): void {
    $sql = "
        MERGE INTO " . MT_ONHAND_TABLE . " AS target
        USING (SELECT ? AS item_id, ? AS location_id) AS source
        ON (target.item_id = source.item_id AND target.location_id = source.location_id)
        WHEN MATCHED THEN
            UPDATE SET quantity = target.quantity + ?, last_updated = GETDATE()
        WHEN NOT MATCHED THEN
            INSERT (item_id, location_id, quantity, last_updated) VALUES (?, ?, ?, GETDATE());
    ";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$item_id, $location_id, $quantity_change, $item_id, $location_id, $quantity_change]);
}

try {
    switch ($action) {

        // ... (case 'get_onhand', 'get_transactions', etc. เหมือนเดิม) ...
        case 'get_initial_data':
            $locationsStmt = $pdo->query("SELECT location_id, location_name FROM " . MT_LOCATIONS_TABLE . " ORDER BY location_name");
            $locations = $locationsStmt->fetchAll(PDO::FETCH_ASSOC);
            $itemsStmt = $pdo->query("SELECT item_id, item_code, item_name, description FROM " . MT_ITEMS_TABLE . " WHERE is_active = 1 ORDER BY item_code");
            $items = $itemsStmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(['success' => true, 'locations' => $locations, 'items' => $items]);
            break;

        case 'get_onhand':
            $sql = "
                SELECT 
                    i.item_code, i.item_name, l.location_name, 
                    i.min_stock, i.max_stock, h.quantity
                FROM " . MT_ONHAND_TABLE . " h
                JOIN " . MT_ITEMS_TABLE . " i ON h.item_id = i.item_id
                JOIN " . MT_LOCATIONS_TABLE . " l ON h.location_id = l.location_id
                ORDER BY i.item_code, l.location_name
            ";
            $stmt = $pdo->query($sql);
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(['success' => true, 'data' => $data]);
            break;

        case 'get_transactions':
            $sql = "
                SELECT 
                    t.created_at, i.item_code, i.item_name, t.transaction_type, 
                    t.quantity, u.username, t.notes
                FROM " . MT_TRANSACTIONS_TABLE . " t
                JOIN " . MT_ITEMS_TABLE . " i ON t.item_id = i.item_id
                LEFT JOIN " . USERS_TABLE . " u ON t.created_by_user_id = u.id
                ORDER BY t.created_at DESC
            ";
            $stmt = $pdo->query($sql);
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(['success' => true, 'data' => $data]);
            break;

        case 'get_items':
            $searchTerm = $_GET['search'] ?? '';
            $params = [];
            $whereClause = '';
            if (!empty($searchTerm)) {
                $whereClause = "WHERE item_code LIKE ? OR item_name LIKE ? OR description LIKE ?";
                $params = ['%' . $searchTerm . '%', '%' . $searchTerm . '%', '%' . $searchTerm . '%'];
            }
            $sql = "SELECT * FROM " . MT_ITEMS_TABLE . " {$whereClause} ORDER BY item_code";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(['success' => true, 'data' => $data]);
            break;

        case 'get_locations':
            $stmt = $pdo->query("SELECT * FROM " . MT_LOCATIONS_TABLE . " ORDER BY location_name");
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(['success' => true, 'data' => $data]);
            break;
            
        case 'save_item':
            if (!hasRole(['admin', 'creator', 'supervisor'])) throw new Exception("Unauthorized");
            $id = $input['item_id'] ?? 0;
            // ✅ 2. แก้ไข Logic การรับค่า is_active ให้ถูกต้อง
            $is_active = isset($input['is_active']) && $input['is_active'] ? 1 : 0;

            if ($id > 0) {
                $sql = "UPDATE " . MT_ITEMS_TABLE . " SET item_code=?, item_name=?, description=?, supplier=?, min_stock=?, max_stock=?, is_active=? WHERE item_id=?";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$input['item_code'], $input['item_name'], $input['description'], $input['supplier'], $input['min_stock'], $input['max_stock'], $is_active, $id]);
                $message = 'Item updated successfully.';
            } else {
                $sql = "INSERT INTO " . MT_ITEMS_TABLE . " (item_code, item_name, description, supplier, min_stock, max_stock, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$input['item_code'], $input['item_name'], $input['description'], $input['supplier'], $input['min_stock'], $input['max_stock'], $is_active]);
                $message = 'Item created successfully.';
            }
            logAction($pdo, $currentUser['username'], $id > 0 ? 'UPDATE_MT_ITEM' : 'CREATE_MT_ITEM', $id ?: $pdo->lastInsertId());
            echo json_encode(['success' => true, 'message' => $message]);
            break;

        case 'delete_item':
            if (!hasRole(['admin', 'creator', 'supervisor'])) throw new Exception("Unauthorized");
            $id = $input['item_id'] ?? 0;
            if (!$id) throw new Exception("Item ID is required for deletion.");
            $sql = "UPDATE " . MT_ITEMS_TABLE . " SET is_active = 0 WHERE item_id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$id]);
            logAction($pdo, $currentUser['username'], 'DEACTIVATE_MT_ITEM', $id);
            echo json_encode(['success' => true, 'message' => 'Item has been deactivated.']);
            break;

        case 'save_location':
            if (!hasRole(['admin', 'creator', 'supervisor'])) throw new Exception("Unauthorized");
            $id = $input['location_id'] ?? 0;
            if ($id > 0) {
                $sql = "UPDATE " . MT_LOCATIONS_TABLE . " SET location_name=?, description=? WHERE location_id=?";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$input['location_name'], $input['description'], $id]);
                $message = 'Location updated successfully.';
            } else {
                $sql = "INSERT INTO " . MT_LOCATIONS_TABLE . " (location_name, description) VALUES (?, ?)";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$input['location_name'], $input['description']]);
                $message = 'Location created successfully.';
            }
            logAction($pdo, $currentUser['username'], $id > 0 ? 'UPDATE_MT_LOCATION' : 'CREATE_MT_LOCATION', $id ?: $pdo->lastInsertId());
            echo json_encode(['success' => true, 'message' => $message]);
            break;

        case 'execute_transaction':
            $pdo->beginTransaction();
            try {
                $item_id = (int)($input['item_id'] ?? 0);
                $location_id = (int)($input['location_id'] ?? 0);
                $quantity = (float)($input['quantity'] ?? 0);
                $type = $input['transaction_type'] ?? '';
                $notes = $input['notes'] ?? null;
                
                if (empty($item_id) || empty($location_id) || empty($type) || $quantity <= 0) {
                    throw new Exception("Item, Location, Type, and a valid Quantity are required.");
                }

                $quantity_change = 0;
                switch (strtoupper($type)) {
                    case 'RECEIPT': $quantity_change = $quantity; break;
                    case 'ISSUE': $quantity_change = -$quantity; break;
                    default: throw new Exception("Invalid transaction type specified.");
                }
                
                updateMtOnhandBalance($pdo, $item_id, $location_id, $quantity_change);

                $sql = "INSERT INTO " . MT_TRANSACTIONS_TABLE . " (item_id, quantity, transaction_type, notes, created_by_user_id) VALUES (?, ?, ?, ?, ?)";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$item_id, $quantity_change, strtoupper($type), $notes, $currentUser['id']]);
                
                $pdo->commit();
                logAction($pdo, $currentUser['username'], 'MT_TRANSACTION', $item_id, "Type: {$type}, Qty: {$quantity_change}");
                echo json_encode(['success' => true, 'message' => 'Transaction recorded successfully.']);
            } catch (Exception $e) {
                if ($pdo->inTransaction()) $pdo->rollBack();
                throw $e;
            }
            break;

        default:
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => "Action '{$action}' is not handled."]);
            break;
    }
} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>