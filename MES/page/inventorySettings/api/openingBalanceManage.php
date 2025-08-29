<?php
require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../../auth/check_auth.php';
require_once __DIR__ . '/../../logger.php';

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

// =================================================================
// DEVELOPMENT SWITCH (ส่วนนี้ถูกลบออก)
// =================================================================

$action = $_REQUEST['action'] ?? '';
$input = json_decode(file_get_contents("php://input"), true);
$currentUser = $_SESSION['user'];

try {
    switch ($action) {
        case 'get_locations':
            // *** แก้ไข: เปลี่ยนมาใช้ค่าคงที่ LOCATIONS_TABLE ***
            $stmt = $pdo->query("SELECT location_id, location_name FROM " . LOCATIONS_TABLE . " WHERE is_active = 1 ORDER BY location_name");
            $locations = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(['success' => true, 'data' => $locations]);
            break;

        case 'get_items_for_location':
            $location_id = $_GET['location_id'] ?? 0;
            if (!$location_id) {
                throw new Exception("Location ID is required.");
            }

            // *** แก้ไข: เปลี่ยนมาใช้ค่าคงที่ ONHAND_TABLE และ ITEMS_TABLE ***
            $sql = "
                SELECT 
                    i.item_id,
                    i.sap_no,
                    i.part_no,
                    i.part_description,
                    h.quantity AS onhand_qty
                FROM " . ONHAND_TABLE . " h
                INNER JOIN " . ITEMS_TABLE . " i ON h.parameter_id = i.item_id
                WHERE h.location_id = ? AND h.quantity > 0
                ORDER BY i.part_no ASC
            ";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$location_id]);
            $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode(['success' => true, 'data' => $items]);
            break;
        
        case 'save_stock_take':
            $location_id = $input['location_id'] ?? 0;
            $stock_data = $input['stock_data'] ?? [];

            if (empty($location_id) || empty($stock_data)) {
                throw new Exception("Location and stock data are required.");
            }

            $pdo->beginTransaction();

            // *** แก้ไข: เปลี่ยนมาใช้ค่าคงที่ ONHAND_TABLE ***
            $mergeSql = "
                MERGE " . ONHAND_TABLE . " AS target
                USING (SELECT ? AS item_id, ? AS location_id, ? AS quantity) AS source
                ON (target.parameter_id = source.item_id AND target.location_id = source.location_id)
                WHEN MATCHED THEN
                    UPDATE SET quantity = source.quantity, last_updated = GETDATE()
                WHEN NOT MATCHED THEN
                    INSERT (parameter_id, location_id, quantity) VALUES (source.item_id, source.location_id, source.quantity);
            ";
            $mergeStmt = $pdo->prepare($mergeSql);

            // *** แก้ไข: เปลี่ยนมาใช้ค่าคงที่ TRANSACTIONS_TABLE ***
            $transSql = "
                INSERT INTO " . TRANSACTIONS_TABLE . " (parameter_id, quantity, transaction_type, to_location_id, created_by_user_id, notes)
                VALUES (?, ?, 'ADJUSTMENT', ?, ?, ?)
            ";
            $transStmt = $pdo->prepare($transSql);

            foreach ($stock_data as $item) {
                $item_id = $item['item_id'];
                $quantity = $item['quantity'];
                
                // Update or Insert On-Hand quantity
                $mergeStmt->execute([$item_id, $location_id, $quantity]);

                // Log the transaction
                $note = "Opening Balance / Stock Take adjustment. New physical count: " . $quantity;
                $transStmt->execute([$item_id, $quantity, $location_id, $currentUser['id'], $note]);
            }

            $pdo->commit();
            logAction($pdo, $currentUser['username'], 'STOCK TAKE', $location_id, "Updated stock for " . count($stock_data) . " items.");
            echo json_encode(['success' => true, 'message' => 'Stock levels updated successfully!']);
            break;

        case 'search_all_items':
            $search = $_GET['search'] ?? '';
            $location_id = $_GET['location_id'] ?? 0;
            if (!$location_id) {
                throw new Exception("Location ID is required for search.");
            }
            
            $params = [$location_id];
            // *** แก้ไข: เปลี่ยนมาใช้ค่าคงที่ ITEMS_TABLE และ ONHAND_TABLE ***
            $sql = "
                SELECT TOP 10
                    i.item_id,
                    i.sap_no,
                    i.part_no,
                    i.part_description,
                    ISNULL(h.quantity, 0) as onhand_qty
                FROM " . ITEMS_TABLE . " i
                LEFT JOIN " . ONHAND_TABLE . " h ON i.item_id = h.parameter_id AND h.location_id = ?
                WHERE i.is_active = 1
            ";

            if (!empty($search)) {
                $sql .= " AND (i.sap_no LIKE ? OR i.part_no LIKE ?)";
                $params[] = '%' . $search . '%';
                $params[] = '%' . $search . '%';
            }
            $sql .= " ORDER BY i.sap_no";

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(['success' => true, 'data' => $items]);
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