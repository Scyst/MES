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

        case 'get_initial_data':
            $locationsStmt = $pdo->query("SELECT location_id, location_name FROM " . MT_LOCATIONS_TABLE . " ORDER BY location_name");
            $locations = $locationsStmt->fetchAll(PDO::FETCH_ASSOC);
            // ✅ แก้ไข: ดึงเฉพาะ Item ที่ Active ไปใช้ใน Dropdown เริ่มต้น
            $itemsStmt = $pdo->query("SELECT item_id, item_code, item_name, description FROM " . MT_ITEMS_TABLE . " WHERE is_active = 1 ORDER BY item_code");
            $items = $itemsStmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(['success' => true, 'locations' => $locations, 'items' => $items]);
            break;

        case 'get_onhand':
            // ✅ START: แก้ไขจุดที่ 1 - กรอง On-Hand เฉพาะ Item ที่ Active
            $sql = "
                SELECT 
                    i.item_code, i.item_name, l.location_name, 
                    i.min_stock, i.max_stock, h.quantity
                FROM " . MT_ONHAND_TABLE . " h
                JOIN " . MT_ITEMS_TABLE . " i ON h.item_id = i.item_id
                JOIN " . MT_LOCATIONS_TABLE . " l ON h.location_id = l.location_id
                WHERE i.is_active = 1
                ORDER BY i.item_code, l.location_name
            ";
            // ✅ END: แก้ไขจุดที่ 1
            $stmt = $pdo->query($sql);
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(['success' => true, 'data' => $data]);
            break;

        case 'get_transactions':
            $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
            $limit = 50;
            $offset = ($page - 1) * $limit;
            
            $searchTerm = $_GET['search'] ?? '';
            $searchParams = [];
            $conditions = [];

            if (!empty($searchTerm)) {
                $conditions[] = "(i.item_code LIKE ? OR i.item_name LIKE ? OR u.username LIKE ? OR t.notes LIKE ?)";
                $searchWildcard = '%' . $searchTerm . '%';
                array_push($searchParams, $searchWildcard, $searchWildcard, $searchWildcard, $searchWildcard);
            }
            $whereClause = !empty($conditions) ? "WHERE " . implode(" AND ", $conditions) : "";

            // Query สำหรับนับจำนวน (ส่วนนี้ยังใช้ execute($searchParams) ได้ เพราะไม่มี OFFSET/FETCH)
            $totalSql = "SELECT COUNT(*) FROM " . MT_TRANSACTIONS_TABLE . " t JOIN " . MT_ITEMS_TABLE . " i ON t.item_id = i.item_id LEFT JOIN " . USERS_TABLE . " u ON t.created_by_user_id = u.id {$whereClause}";
            $totalStmt = $pdo->prepare($totalSql);
            $totalStmt->execute($searchParams);
            $total = (int)$totalStmt->fetchColumn();

            // Query หลักสำหรับดึงข้อมูล
            $sql = "
                SELECT 
                    t.created_at, i.item_code, i.item_name, t.transaction_type, 
                    t.quantity, u.username, t.notes
                FROM " . MT_TRANSACTIONS_TABLE . " t
                JOIN " . MT_ITEMS_TABLE . " i ON t.item_id = i.item_id
                LEFT JOIN " . USERS_TABLE . " u ON t.created_by_user_id = u.id
                {$whereClause}
                ORDER BY t.created_at DESC
                OFFSET ? ROWS FETCH NEXT ? ROWS ONLY
            ";
            
            $stmt = $pdo->prepare($sql);

            // --- START: ส่วนที่แก้ไข ---
            // 1. Bind ค่าของ Search parameters ทีละตัว
            $paramIndex = 1;
            foreach ($searchParams as $param) {
                $stmt->bindValue($paramIndex++, $param, PDO::PARAM_STR);
            }

            // 2. Bind ค่าของ OFFSET และ LIMIT โดยระบุประเภทเป็น INT อย่างชัดเจน
            $stmt->bindValue($paramIndex++, (int)$offset, PDO::PARAM_INT);
            $stmt->bindValue($paramIndex++, (int)$limit, PDO::PARAM_INT);
            
            // 3. Execute โดยไม่ต้องส่ง Array เข้าไปอีก
            $stmt->execute();
            // --- END: ส่วนที่แก้ไข ---
            
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode(['success' => true, 'data' => $data, 'total' => $total, 'page' => $page]);
            break;

        case 'get_items':
            // ✅ START: แก้ไขจุดที่ 2 - ทำให้ Soft Delete Toggle ทำงาน
            $searchTerm = $_GET['search'] ?? '';
            // รับค่า show_inactive จาก frontend, แปลง 'true' เป็น boolean
            $showInactive = isset($_GET['show_inactive']) && $_GET['show_inactive'] === 'true';

            $params = [];
            $conditions = [];

            // 1. สร้างเงื่อนไขตามสถานะ `is_active`
            if (!$showInactive) {
                $conditions[] = "is_active = 1";
            }
            
            // 2. สร้างเงื่อนไขสำหรับการค้นหา
            if (!empty($searchTerm)) {
                $conditions[] = "(item_code LIKE ? OR item_name LIKE ? OR description LIKE ?)";
                $params = ['%' . $searchTerm . '%', '%' . $searchTerm . '%', '%' . $searchTerm . '%'];
            }
            
            // 3. รวมเงื่อนไขทั้งหมด
            $whereClause = !empty($conditions) ? "WHERE " . implode(' AND ', $conditions) : '';
            
            $sql = "SELECT * FROM " . MT_ITEMS_TABLE . " {$whereClause} ORDER BY is_active DESC, item_code";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(['success' => true, 'data' => $data]);
            // ✅ END: แก้ไขจุดที่ 2
            break;

        case 'search_mt_items':
            // (ส่วนนี้ถูกต้องอยู่แล้ว ไม่มีการแก้ไข)
            $searchTerm = $_GET['search'] ?? '';
            if (strlen($searchTerm) < 2) {
                echo json_encode(['success' => true, 'data' => []]);
                exit;
            }
            $sql = "
                SELECT TOP (10) item_id, item_code, item_name, description
                FROM " . MT_ITEMS_TABLE . "
                WHERE is_active = 1 AND (item_code LIKE ? OR item_name LIKE ? OR description LIKE ?)
                ORDER BY item_code
            ";
            $stmt = $pdo->prepare($sql);
            $stmt->execute(['%' . $searchTerm . '%', '%' . $searchTerm . '%', '%' . $searchTerm . '%']);
            $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(['success' => true, 'data' => $items]);
            break;

        case 'get_locations':
            $stmt = $pdo->query("SELECT * FROM " . MT_LOCATIONS_TABLE . " ORDER BY location_name");
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(['success' => true, 'data' => $data]);
            break;
            
        case 'save_item':
            if (!hasRole(['admin', 'creator', 'supervisor'])) throw new Exception("Unauthorized");
            $id = $input['item_id'] ?? 0;
            // แก้ไขการรับค่า is_active จาก form, checkbox ที่ไม่ได้ติ๊กจะไม่มีค่าส่งมา
            $is_active = isset($input['is_active']) ? 1 : 0;

            if ($id > 0) {
                $sql = "UPDATE " . MT_ITEMS_TABLE . " SET item_code=?, item_name=?, description=?, supplier=?, min_stock=?, max_stock=?, is_active=? WHERE item_id=?";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$input['item_code'], $input['item_name'], $input['description'], $input['supplier'], $input['min_stock'], $input['max_stock'], $is_active, $id]);
                $message = 'Item updated successfully.';
            } else {
                // สำหรับการสร้างใหม่, is_active จะเป็น 1 เสมอ (Active)
                $sql = "INSERT INTO " . MT_ITEMS_TABLE . " (item_code, item_name, description, supplier, min_stock, max_stock, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$input['item_code'], $input['item_name'], $input['description'], $input['supplier'], $input['min_stock'], $input['max_stock']]);
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

        case 'restore_item':
            if (!hasRole(['admin', 'creator', 'supervisor'])) throw new Exception("Unauthorized");
            $id = $input['item_id'] ?? 0;
            if (!$id) throw new Exception("Item ID is required for restoration.");
            $sql = "UPDATE " . MT_ITEMS_TABLE . " SET is_active = 1 WHERE item_id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$id]);
            logAction($pdo, $currentUser['username'], 'RESTORE_MT_ITEM', $id);
            echo json_encode(['success' => true, 'message' => 'Item has been restored.']);
            break;
   
        case 'save_location':
             // (ส่วนนี้ไม่มีการแก้ไข)
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
            // (ส่วนนี้ไม่มีการแก้ไข)
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