<?php
// นี่คือ API หลักสำหรับจัดการระบบ Inventory ใหม่ทั้งหมด (IN, OUT, Reports)

require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../../auth/check_auth.php';
require_once __DIR__ . '/../../logger.php';
require_once __DIR__ . '/../../helpers/inventory_helper.php';

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

        // ====== Cases from stockApi.php ======

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

            // --- ส่วนที่เพิ่มเข้ามา ---
            $params = [];
            $conditions = ["t.transaction_type = 'RECEIPT'"];

            if (!empty($_GET['part_no'])) { $conditions[] = "(i.sap_no LIKE ? OR i.part_no LIKE ?)"; $params[] = '%' . $_GET['part_no'] . '%'; $params[] = '%' . $_GET['part_no'] . '%';}
            if (!empty($_GET['lot_no'])) { $conditions[] = "t.reference_id LIKE ?"; $params[] = '%' . $_GET['lot_no'] . '%'; }
            if (!empty($_GET['line'])) { 
                $locIdStmt = $pdo->prepare("SELECT location_id FROM ". LOCATIONS_TABLE ." WHERE location_name = ?");
                $locIdStmt->execute([$_GET['line']]);
                $locId = $locIdStmt->fetchColumn();
                if ($locId) {
                    $conditions[] = "t.to_location_id = ?";
                    $params[] = $locId;
                }
            }
            if (!empty($_GET['startDate'])) { $conditions[] = "t.transaction_timestamp >= ?"; $params[] = $_GET['startDate']; }
            if (!empty($_GET['endDate'])) { $conditions[] = "t.transaction_timestamp < DATEADD(day, 1, ?)"; $params[] = $_GET['endDate']; }

            $whereClause = "WHERE " . implode(" AND ", $conditions);
            // --- สิ้นสุดส่วนที่เพิ่ม ---

            $totalSql = "SELECT COUNT(*) FROM " . TRANSACTIONS_TABLE . " t JOIN " . ITEMS_TABLE . " i ON t.parameter_id = i.item_id LEFT JOIN " . LOCATIONS_TABLE . " l ON t.to_location_id = l.location_id {$whereClause}";
            $totalStmt = $pdo->prepare($totalSql);
            $totalStmt->execute($params);
            $total = (int)$totalStmt->fetchColumn();

            $dataSql = "
                WITH NumberedRows AS (
                    SELECT 
                        t.transaction_id,
                        t.transaction_timestamp, i.sap_no, i.part_no, i.part_description, t.quantity, 
                        l.location_name AS to_location, t.reference_id as lot_no,
                        ROW_NUMBER() OVER (ORDER BY t.transaction_timestamp DESC) as RowNum
                    FROM " . TRANSACTIONS_TABLE . " t
                    JOIN " . ITEMS_TABLE . " i ON t.parameter_id = i.item_id
                    JOIN " . LOCATIONS_TABLE . " l ON t.to_location_id = l.location_id
                    {$whereClause}
                )
                SELECT transaction_id, transaction_timestamp, sap_no, part_no, part_description, quantity, to_location, lot_no
                FROM NumberedRows
                WHERE RowNum > ? AND RowNum <= ?
            ";

            $dataStmt = $pdo->prepare($dataSql);
            $dataStmt->execute(array_merge($params, [$startRow, $endRow]));
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
                        SUM(ISNULL(h.quantity, 0)) as total_onhand,
                        -- This subquery aggregates the model names
                        STUFF(
                            (
                                SELECT ', ' + p.model
                                FROM " . PARAM_TABLE . " p
                                WHERE p.item_id = i.item_id
                                ORDER BY p.model
                                FOR XML PATH('')
                            ), 1, 2, ''
                        ) AS used_models
                    FROM " . ITEMS_TABLE . " i
                    LEFT JOIN " . ONHAND_TABLE . " h ON i.item_id = h.parameter_id
                    {$whereClause}
                    GROUP BY i.item_id, i.sap_no, i.part_no, i.part_description
                ),
                NumberedRows AS (
                    SELECT *, ROW_NUMBER() OVER (ORDER BY sap_no) as RowNum
                    FROM ItemGroup
                )
                SELECT item_id, sap_no, part_no, part_description, total_onhand, used_models
                FROM NumberedRows
                WHERE RowNum > ? AND RowNum <= ?
            ";

            $paginationParams = array_merge($params, [$startRow, $endRow]);
            $dataStmt = $pdo->prepare($dataSql);
            $dataStmt->execute($paginationParams);
            $stock = $dataStmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode(['success' => true, 'data' => $stock, 'total' => $total, 'page' => $page]);
            break;

        case 'get_production_variance_report':
            $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
            $limit = 50;
            $startRow = ($page - 1) * $limit;

            $params = [];
            $conditions = [];
            
            if (!empty($_GET['part_no'])) { $conditions[] = "(i.sap_no LIKE ? OR i.part_no LIKE ?)"; $params[] = '%' . $_GET['part_no'] . '%'; $params[] = '%' . $_GET['part_no'] . '%'; }
            if (!empty($_GET['location'])) { $conditions[] = "l.location_name LIKE ?"; $params[] = '%' . $_GET['location'] . '%'; }
            if (!empty($_GET['startDate'])) { $conditions[] = "t.transaction_timestamp >= ?"; $params[] = $_GET['startDate']; }
            if (!empty($_GET['endDate'])) { $conditions[] = "t.transaction_timestamp < DATEADD(day, 1, ?)"; $params[] = $_GET['endDate']; }

            $whereClause = !empty($conditions) ? "WHERE " . implode(" AND ", $conditions) : "";

            // --- SQL Query ที่แก้ไขใหม่ทั้งหมด ---
            $baseQuery = "
                SELECT
                    ISNULL(t.to_location_id, t.from_location_id) as location_id,
                    t.parameter_id,
                    SUM(CASE WHEN t.transaction_type IN ('RECEIPT', 'TRANSFER') AND t.to_location_id IS NOT NULL THEN t.quantity ELSE 0 END) as total_in,
                    SUM(CASE WHEN t.transaction_type IN ('CONSUMPTION', 'TRANSFER') OR t.transaction_type LIKE 'PRODUCTION_%' THEN ABS(t.quantity) ELSE 0 END) as total_out
                FROM " . TRANSACTIONS_TABLE . " t
                JOIN " . ITEMS_TABLE . " i ON t.parameter_id = i.item_id
                LEFT JOIN " . LOCATIONS_TABLE . " l ON ISNULL(t.to_location_id, t.from_location_id) = l.location_id
                {$whereClause}
                GROUP BY ISNULL(t.to_location_id, t.from_location_id), t.parameter_id
            ";

            $finalQuery = "
                SELECT
                    w.location_id,
                    l.location_name,
                    i.item_id,
                    i.sap_no, i.part_no, i.part_description,
                    ISNULL(w.total_in, 0) as total_in,
                    ISNULL(w.total_out, 0) as total_out,
                    (ISNULL(w.total_out, 0) - ISNULL(w.total_in, 0)) as variance
                FROM ({$baseQuery}) w
                JOIN " . ITEMS_TABLE . " i ON w.parameter_id = i.item_id
                JOIN " . LOCATIONS_TABLE . " l ON w.location_id = l.location_id
            ";
            
            $totalSql = "SELECT COUNT(*) FROM ({$finalQuery}) AS SubQuery";
            $totalStmt = $pdo->prepare($totalSql);
            $totalStmt->execute($params);
            $total = (int)$totalStmt->fetchColumn();

            $dataSql = "
                WITH NumberedRows AS (
                    SELECT *, ROW_NUMBER() OVER (ORDER BY location_name, sap_no) AS RowNum
                    FROM ({$finalQuery}) AS FinalQuery
                )
                SELECT * FROM NumberedRows WHERE RowNum > ? AND RowNum <= ?
            ";

            $dataStmt = $pdo->prepare($dataSql);
            $dataStmt->execute(array_merge($params, [$startRow, $startRow + $limit]));
            $data = $dataStmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode(['success' => true, 'data' => $data, 'total' => $total, 'page' => $page]);
            break;

        case 'get_wip_onhand_report':
            $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
            $limit = 50;
            $startRow = ($page - 1) * $limit;

            $params = [];
            $conditions = ["l.location_name NOT LIKE '%WAREHOUSE%'"];

            if (!empty($_GET['part_no'])) { 
                $conditions[] = "(i.sap_no LIKE ? OR i.part_no LIKE ?)";
                $params[] = '%' . $_GET['part_no'] . '%';
                $params[] = '%' . $_GET['part_no'] . '%';
            }
            if (!empty($_GET['line'])) { 
                $conditions[] = "l.location_name LIKE ?";
                $params[] = '%' . $_GET['line'] . '%';
            }
            
            $whereClause = "WHERE " . implode(" AND ", $conditions);

            // This base query now finds all locations that match the criteria first
            $baseSql = "
                FROM (
                    SELECT location_id, location_name 
                    FROM ". LOCATIONS_TABLE ." l
                    WHERE l.location_name NOT LIKE '%WAREHOUSE%'
                ) l
                CROSS JOIN ". ITEMS_TABLE ." i 
                LEFT JOIN ". ONHAND_TABLE ." h ON i.item_id = h.parameter_id AND l.location_id = h.location_id
                {$whereClause}
            ";

            $totalSql = "SELECT COUNT(*) " . $baseSql;
            $totalStmt = $pdo->prepare($totalSql);
            $totalStmt->execute($params);
            $total = (int)$totalStmt->fetchColumn();

            $dataSql = "
                WITH NumberedRows AS (
                    SELECT 
                        l.location_name, i.sap_no, i.part_no, i.part_description, 
                        ISNULL(h.quantity, 0) as quantity,
                        ROW_NUMBER() OVER (ORDER BY l.location_name, i.sap_no) as RowNum
                    {$baseSql}
                )
                SELECT * FROM NumberedRows WHERE RowNum > ? AND RowNum <= ?
            ";
            
            $dataStmt = $pdo->prepare($dataSql);
            $dataStmt->execute(array_merge($params, [$startRow, $startRow + $limit]));
            $data = $dataStmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode(['success' => true, 'data' => $data, 'total' => $total, 'page' => $page]);
            break;

        // ====== Cases from productionApi.php ======

        case 'execute_production':
            $item_id = $input['item_id'] ?? 0;
            $location_id = $input['location_id'] ?? 0;
            $quantity = $input['quantity'] ?? 0;
            $count_type = $input['count_type'] ?? '';
            $lot_no = $input['lot_no'] ?? null;
            $notes = $input['notes'] ?? null;
            $log_date = $input['log_date'] ?? null;
            $start_time = $input['start_time'] ?? null;

            if (empty($item_id) || empty($location_id) || !is_numeric($quantity) || $quantity <= 0 || empty($count_type)) {
                throw new Exception("Invalid data provided for production logging.");
            }

            $pdo->beginTransaction();

            $prod_transaction_type = 'PRODUCTION_' . strtoupper($count_type);
            updateOnhandBalance($pdo, $item_id, $location_id, $quantity);
            logStockTransaction($pdo, $item_id, $quantity, $prod_transaction_type, null, $location_id, $currentUser['id'], $notes, $lot_no, $log_date, $start_time);

            if (strtoupper($count_type) === 'FG') {
                $bomSql = "SELECT component_item_id, quantity_required 
                           FROM " . BOM_TABLE . "
                           WHERE fg_item_id = ?";
                
                $bomStmt = $pdo->prepare($bomSql);
                $bomStmt->execute([$item_id]);
                $components = $bomStmt->fetchAll(PDO::FETCH_ASSOC);

                if (!empty($components)) {
                    foreach ($components as $comp) {
                        $qty_to_consume = $quantity * (float)$comp['quantity_required'];
                        $component_item_id = $comp['component_item_id'];

                        updateOnhandBalance($pdo, $component_item_id, $location_id, -$qty_to_consume);

                        $consume_note = "Auto-consumed for production of FG Item ID: {$item_id}, Lot: {$lot_no}";
                        logStockTransaction($pdo, $component_item_id, -$qty_to_consume, 'CONSUMPTION', $location_id, null, $currentUser['id'], $consume_note, $lot_no, $log_date, $start_time);
                    }
                }
            }

            $pdo->commit();
            logAction($pdo, $currentUser['username'], 'PRODUCTION LOG', $item_id, "Type: {$count_type}, Qty: {$quantity}, Location: {$location_id}, Lot: {$lot_no}");
            echo json_encode(['success' => true, 'message' => 'Production logged successfully.']);
            break;

        case 'get_production_history':
            $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
            $limit = 50;
            $startRow = ($page - 1) * $limit;

            $conditions = ["t.transaction_type LIKE 'PRODUCTION_%'"];
            $params = [];

            if (!empty($_GET['part_no'])) { $conditions[] = "i.part_no LIKE ?"; $params[] = '%' . $_GET['part_no'] . '%'; }
            if (!empty($_GET['location'])) { $conditions[] = "loc.location_name LIKE ?"; $params[] = '%' . $_GET['location'] . '%'; }
            if (!empty($_GET['lot_no'])) { $conditions[] = "t.reference_id LIKE ?"; $params[] = '%' . $_GET['lot_no'] . '%'; }
            if (!empty($_GET['count_type'])) { $conditions[] = "t.transaction_type = ?"; $params[] = 'PRODUCTION_' . $_GET['count_type']; }
            if (!empty($_GET['startDate'])) { $conditions[] = "CAST(t.transaction_timestamp AS DATE) >= ?"; $params[] = $_GET['startDate']; }
            if (!empty($_GET['endDate'])) { $conditions[] = "CAST(t.transaction_timestamp AS DATE) <= ?"; $params[] = $_GET['endDate']; }

            $whereClause = "WHERE " . implode(" AND ", $conditions);

            $totalSql = "SELECT COUNT(*) FROM " . TRANSACTIONS_TABLE . " t
                         JOIN " . ITEMS_TABLE . " i ON t.parameter_id = i.item_id
                         LEFT JOIN " . LOCATIONS_TABLE . " loc ON t.to_location_id = loc.location_id
                         {$whereClause}";
            $totalStmt = $pdo->prepare($totalSql);
            $totalStmt->execute($params);
            $total = (int)$totalStmt->fetchColumn();

            $endRow = $startRow + $limit;
            $dataSql = "
                WITH NumberedRows AS (
                    SELECT 
                        t.transaction_id, t.transaction_timestamp, i.sap_no, i.part_no, t.quantity,
                        REPLACE(t.transaction_type, 'PRODUCTION_', '') AS count_type,
                        loc.location_name, t.reference_id as lot_no, u.username AS created_by, t.notes,
                        ROW_NUMBER() OVER (ORDER BY t.transaction_timestamp DESC) AS RowNum
                    FROM " . TRANSACTIONS_TABLE . " t
                    JOIN " . ITEMS_TABLE . " i ON t.parameter_id = i.item_id
                    LEFT JOIN " . LOCATIONS_TABLE . " loc ON t.to_location_id = loc.location_id
                    LEFT JOIN " . USERS_TABLE . " u ON t.created_by_user_id = u.id
                    {$whereClause}
                )
                SELECT transaction_id, transaction_timestamp, sap_no, part_no, quantity, count_type, location_name, lot_no, created_by, notes
                FROM NumberedRows
                WHERE RowNum > ? AND RowNum <= ?
            ";

            $paginationParams = array_merge($params, [$startRow, $endRow]);
            $dataStmt = $pdo->prepare($dataSql);
            $dataStmt->execute($paginationParams);
            $history = $dataStmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode(['success' => true, 'data' => $history, 'total' => $total, 'page' => $page]);
            break;

        case 'get_transaction_details':
            $transaction_id = $_GET['transaction_id'] ?? 0;
            if (!$transaction_id) throw new Exception("Transaction ID is required.");

            $sql = "SELECT t.*, i.sap_no, i.part_no 
                    FROM " . TRANSACTIONS_TABLE . " t
                    JOIN " . ITEMS_TABLE . " i ON t.parameter_id = i.item_id
                    WHERE t.transaction_id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$transaction_id]);
            $transaction = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$transaction) throw new Exception("Transaction not found.");
            
            echo json_encode(['success' => true, 'data' => $transaction]);
            break;

        case 'update_transaction':
            $pdo->beginTransaction();
            
            $transaction_id = $input['transaction_id'] ?? 0;
            if (!$transaction_id) throw new Exception("Transaction ID is required.");

            // 1. ดึงข้อมูลเก่าเพื่อคำนวณผลต่าง
            $stmt = $pdo->prepare("SELECT * FROM " . TRANSACTIONS_TABLE . " WHERE transaction_id = ?");
            $stmt->execute([$transaction_id]);
            $old_transaction = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$old_transaction) throw new Exception("Original transaction not found.");

            // 2. Revert สต็อกเก่า
            $revert_qty = - (float)$old_transaction['quantity'];
            updateOnhandBalance($pdo, $old_transaction['parameter_id'], $old_transaction['to_location_id'], $revert_qty);

            // 3. เตรียมข้อมูลใหม่
            $new_quantity = (float)($input['quantity'] ?? 0);
            $new_location_id = (int)($input['location_id'] ?? 0);
            $new_lot_no = $input['lot_no'] ?? null;
            $new_notes = $input['notes'] ?? null;
            $new_count_type = isset($input['count_type']) ? 'PRODUCTION_' . strtoupper($input['count_type']) : $old_transaction['transaction_type'];

            // 4. อัปเดต Transaction record
            $sql = "UPDATE " . TRANSACTIONS_TABLE . " SET quantity=?, to_location_id=?, reference_id=?, notes=?, transaction_type=? WHERE transaction_id=?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$new_quantity, $new_location_id, $new_lot_no, $new_notes, $new_count_type, $transaction_id]);

            // 5. เพิ่มสต็อกใหม่เข้าไป
            updateOnhandBalance($pdo, $old_transaction['parameter_id'], $new_location_id, $new_quantity);
            
            $pdo->commit();
            logAction($pdo, $currentUser['username'], 'UPDATE TRANSACTION', $transaction_id);
            echo json_encode(['success' => true, 'message' => 'Transaction updated successfully.']);
            break;

        case 'delete_transaction':
            $pdo->beginTransaction();
            $transaction_id = $input['transaction_id'] ?? 0;
            if (!$transaction_id) throw new Exception("Transaction ID is required.");

            // 1. ดึงข้อมูลที่จะลบเพื่อนำไป Revert สต็อก
            $stmt = $pdo->prepare("SELECT * FROM " . TRANSACTIONS_TABLE . " WHERE transaction_id = ?");
            $stmt->execute([$transaction_id]);
            $transaction = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$transaction) throw new Exception("Transaction not found.");

            // 2. ลบ Transaction record
            $deleteStmt = $pdo->prepare("DELETE FROM " . TRANSACTIONS_TABLE . " WHERE transaction_id = ?");
            $deleteStmt->execute([$transaction_id]);

            // 3. Revert สต็อก
            $revert_qty = - (float)$transaction['quantity'];
            updateOnhandBalance($pdo, $transaction['parameter_id'], $transaction['to_location_id'], $revert_qty);

            $pdo->commit();
            logAction($pdo, $currentUser['username'], 'DELETE TRANSACTION', $transaction_id);
            echo json_encode(['success' => true, 'message' => 'Transaction deleted successfully.']);
            break;

        case 'get_wip_report_by_lot':
            $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
            $limit = 50;
            $startRow = ($page - 1) * $limit;

            $params = [];
            $conditions = ["t.reference_id IS NOT NULL", "t.reference_id != ''"];
            
            if (!empty($_GET['part_no'])) { $conditions[] = "(i.sap_no LIKE ? OR i.part_no LIKE ?)"; $params[] = '%' . $_GET['part_no'] . '%'; $params[] = '%' . $_GET['part_no'] . '%'; }
            if (!empty($_GET['lot_no'])) { $conditions[] = "t.reference_id LIKE ?"; $params[] = '%' . $_GET['lot_no'] . '%'; }
            if (!empty($_GET['line'])) { 
                $locIdStmt = $pdo->prepare("SELECT location_id FROM ". LOCATIONS_TABLE ." WHERE location_name = ?");
                $locIdStmt->execute([$_GET['line']]);
                $locId = $locIdStmt->fetchColumn();
                if ($locId) {
                    $conditions[] = "(ISNULL(t.to_location_id, t.from_location_id) = ?)";
                    $params[] = $locId;
                }
            }
            if (!empty($_GET['startDate'])) { $conditions[] = "t.transaction_timestamp >= ?"; $params[] = $_GET['startDate']; }
            if (!empty($_GET['endDate'])) { $conditions[] = "t.transaction_timestamp < DATEADD(day, 1, ?)"; $params[] = $_GET['endDate']; }

            $whereClause = "WHERE " . implode(" AND ", $conditions);

            $baseQuery = "
                SELECT
                    t.parameter_id,
                    t.reference_id as lot_no,
                    SUM(CASE WHEN t.transaction_type IN ('RECEIPT', 'TRANSFER') AND t.to_location_id IS NOT NULL THEN t.quantity ELSE 0 END) as total_in,
                    SUM(CASE WHEN t.transaction_type IN ('CONSUMPTION', 'TRANSFER') OR t.transaction_type LIKE 'PRODUCTION_%' THEN ABS(t.quantity) ELSE 0 END) as total_out
                FROM " . TRANSACTIONS_TABLE . " t
                JOIN " . ITEMS_TABLE . " i ON t.parameter_id = i.item_id
                LEFT JOIN " . LOCATIONS_TABLE . " l ON ISNULL(t.to_location_id, t.from_location_id) = l.location_id
                {$whereClause}
                GROUP BY t.parameter_id, t.reference_id
            ";

            $finalQuery = "
                SELECT
                    i.sap_no, i.part_no, i.part_description,
                    w.lot_no,
                    ISNULL(w.total_in, 0) as total_in,
                    ISNULL(w.total_out, 0) as total_out,
                    (ISNULL(w.total_out, 0) - ISNULL(w.total_in, 0)) as variance
                FROM ({$baseQuery}) w
                JOIN " . ITEMS_TABLE . " i ON w.parameter_id = i.item_id
                WHERE (w.total_in > 0 OR w.total_out > 0)
            ";
            
            $totalSql = "SELECT COUNT(*) FROM ({$finalQuery}) AS SubQuery";
            $totalStmt = $pdo->prepare($totalSql);
            $totalStmt->execute($params);
            $total = (int)$totalStmt->fetchColumn();

            $dataSql = "
                WITH NumberedRows AS (
                    SELECT *, ROW_NUMBER() OVER (ORDER BY sap_no, lot_no) AS RowNum
                    FROM ({$finalQuery}) AS FinalQuery
                )
                SELECT * FROM NumberedRows WHERE RowNum > ? AND RowNum <= ?
            ";

            $dataStmt = $pdo->prepare($dataSql);
            $dataStmt->execute(array_merge($params, [$startRow, $startRow + $limit]));
            $data = $dataStmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode(['success' => true, 'data' => $data, 'total' => $total, 'page' => $page]);
            break;

        case 'get_stock_details_by_item':
            $item_id = $_GET['item_id'] ?? 0;
            if (!$item_id) {
                throw new Exception("Item ID is required.");
            }

            $sql = "
                SELECT
                    l.location_name,
                    h.quantity
                FROM " . ONHAND_TABLE . " h
                JOIN " . LOCATIONS_TABLE . " l ON h.location_id = l.location_id
                WHERE h.parameter_id = ? AND h.quantity > 0
                ORDER BY l.location_name
            ";

            $stmt = $pdo->prepare($sql);
            $stmt->execute([$item_id]);
            $details = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode(['success' => true, 'data' => $details]);
            break;

        case 'get_variance_details':
            $item_id = $_GET['item_id'] ?? 0;
            $location_id = $_GET['location_id'] ?? 0;
            $startDate = $_GET['startDate'] ?? '';
            $endDate = $_GET['endDate'] ?? '';

            if (!$item_id || !$location_id) {
                throw new Exception("Item ID and Location ID are required.");
            }

            $params = [$item_id, $location_id];
            $dateCondition = "";
            if (!empty($startDate)) { $dateCondition .= " AND t.transaction_timestamp >= ?"; $params[] = $startDate; }
            if (!empty($endDate)) { $dateCondition .= " AND t.transaction_timestamp < DATEADD(day, 1, ?)"; $params[] = $endDate; }

            // --- SQL ที่แก้ไขตรรกะใหม่ ---
            // ดึงรายการ IN (เฉพาะ RECEIPT และ TRANSFER ที่เข้ามายัง Location นี้)
            $inSql = "SELECT transaction_timestamp, transaction_type, quantity 
                      FROM " . TRANSACTIONS_TABLE . " t
                      WHERE parameter_id = ? AND to_location_id = ? AND transaction_type IN ('RECEIPT', 'TRANSFER') {$dateCondition}
                      ORDER BY transaction_timestamp DESC";
            $inStmt = $pdo->prepare($inSql);
            $inStmt->execute($params);
            $in_records = $inStmt->fetchAll(PDO::FETCH_ASSOC);
            
            // ดึงรายการ OUT (PRODUCTION, CONSUMPTION, และ TRANSFER ที่ออกจาก Location นี้)
            $outSql = "SELECT transaction_timestamp, transaction_type, quantity 
                       FROM " . TRANSACTIONS_TABLE . " t
                       WHERE parameter_id = ? 
                       AND (
                           (transaction_type IN ('CONSUMPTION', 'TRANSFER') AND from_location_id = ?)
                           OR
                           (transaction_type LIKE 'PRODUCTION_%' AND to_location_id = ?)
                       )
                       {$dateCondition}
                       ORDER BY transaction_timestamp DESC";
            
            $outParams = array_merge([$item_id, $location_id, $location_id], array_slice($params, 2));
            $outStmt = $pdo->prepare($outSql);
            $outStmt->execute($outParams);
            $out_records = $outStmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode(['success' => true, 'data' => ['in_records' => $in_records, 'out_records' => $out_records]]);
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