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
            $to_location_id = $input['to_location_id'] ?? 0;
            $from_location_id = $input['from_location_id'] ?? 0;
            $quantity = $input['quantity'] ?? 0;
            $lot_no = $input['lot_no'] ?? null;
            $notes = $input['notes'] ?? null;
            $log_date = $input['log_date'] ?? date('Y-m-d');
            $log_time = $input['log_time'] ?? date('H:i:s');
            $timestamp = $log_date . ' ' . $log_time;

            if (empty($item_id) || empty($to_location_id) || !is_numeric($quantity) || $quantity <= 0) {
                throw new Exception("Invalid data provided. Item, Quantity, and Destination are required.");
            }

            $pdo->beginTransaction();
            try {
                if (!empty($from_location_id)) {
                    // ========== นี่คือ LOGIC สำหรับ TRANSFER (เวอร์ชันใหม่) ==========
                    if ($from_location_id == $to_location_id) {
                        throw new Exception("Source and Destination locations cannot be the same.");
                    }

                    // 1. หักสตอกจากต้นทาง (โดยไม่เช็คสต็อก และจะสร้างแถวใหม่ถ้ายังไม่มี)
                    $mergeFromSql = "MERGE " . ONHAND_TABLE . " AS target 
                                    USING (SELECT ? AS item_id, ? AS location_id) AS source 
                                    ON (target.parameter_id = source.item_id AND target.location_id = source.location_id) 
                                    WHEN MATCHED THEN 
                                        UPDATE SET quantity = target.quantity - ? 
                                    WHEN NOT MATCHED THEN 
                                        INSERT (parameter_id, location_id, quantity) VALUES (?, ?, ?);";
                    $mergeFromStmt = $pdo->prepare($mergeFromSql);
                    $mergeFromStmt->execute([$item_id, $from_location_id, $quantity, $item_id, $from_location_id, -$quantity]);


                    // 2. เพิ่มสต็อกที่ปลายทาง (โค้ดส่วนนี้เหมือนเดิม)
                    $updateToSql = "MERGE " . ONHAND_TABLE . " AS target USING (SELECT ? AS item_id, ? AS location_id) AS source ON (target.parameter_id = source.item_id AND target.location_id = source.location_id) WHEN MATCHED THEN UPDATE SET quantity = target.quantity + ? WHEN NOT MATCHED THEN INSERT (parameter_id, location_id, quantity) VALUES (?, ?, ?);";
                    $updateToStmt = $pdo->prepare($updateToSql);
                    $updateToStmt->execute([$item_id, $to_location_id, $quantity, $item_id, $to_location_id, $quantity]);

                    // 3. บันทึกประวัติเป็น TRANSFER (โค้ดส่วนนี้เหมือนเดิม)
                    $transSql = "INSERT INTO " . TRANSACTIONS_TABLE . " (parameter_id, quantity, transaction_type, from_location_id, to_location_id, created_by_user_id, notes, reference_id) VALUES (?, ?, 'TRANSFER', ?, ?, ?, ?, ?)";
                    $transStmt = $pdo->prepare($transSql);
                    $transStmt->execute([$item_id, $quantity, $from_location_id, $to_location_id, $currentUser['id'], $notes, $lot_no, $timestamp]);
                    $message = 'Stock transferred successfully.';

                } else {
                    $mergeSql = "MERGE " . ONHAND_TABLE . " AS target USING (SELECT ? AS item_id, ? AS location_id) AS source ON (target.parameter_id = source.item_id AND target.location_id = source.location_id) WHEN MATCHED THEN UPDATE SET quantity = target.quantity + ? WHEN NOT MATCHED THEN INSERT (parameter_id, location_id, quantity) VALUES (?, ?, ?);";
                    $mergeStmt = $pdo->prepare($mergeSql);
                    $mergeStmt->execute([$item_id, $to_location_id, $quantity, $item_id, $to_location_id, $quantity]);

                    $transSql = "INSERT INTO " . TRANSACTIONS_TABLE . " (parameter_id, quantity, transaction_type, to_location_id, created_by_user_id, notes, reference_id) VALUES (?, ?, 'RECEIPT', ?, ?, ?, ?)";
                    $transStmt = $pdo->prepare($transSql);
                    $transStmt->execute([$item_id, $quantity, $to_location_id, $currentUser['id'], $notes, $lot_no, $timestamp]);

                    $message = 'Stock receipt logged successfully.';
                }

                $pdo->commit();
                logAction($pdo, $currentUser['username'], 'STOCK_IN', $item_id, "Qty: {$quantity}, To: {$to_location_id}, From: {$from_location_id}");
                echo json_encode(['success' => true, 'message' => $message]);

            } catch (Exception $e) {
                if ($pdo->inTransaction()) $pdo->rollBack();
                throw $e;
            }
            break;

        case 'get_receipt_history':
            $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
            $limit = 50;
            $offset = ($page - 1) * $limit;

            $params = [];
            $conditions = ["t.transaction_type IN ('RECEIPT', 'TRANSFER')"];

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
            if (!empty($_GET['startDate'])) { $conditions[] = "CAST(t.transaction_timestamp AS DATE) >= ?"; $params[] = $_GET['startDate']; }
            if (!empty($_GET['endDate'])) { $conditions[] = "CAST(t.transaction_timestamp AS DATE) <= ?"; $params[] = $_GET['endDate']; }

            $whereClause = "WHERE " . implode(" AND ", $conditions);

            $totalSql = "SELECT COUNT(*) FROM " . TRANSACTIONS_TABLE . " t JOIN " . ITEMS_TABLE . " i ON t.parameter_id = i.item_id {$whereClause}";
            $totalStmt = $pdo->prepare($totalSql);
            $totalStmt->execute($params);
            $total = (int)$totalStmt->fetchColumn();

            $dataSql = "
                SELECT 
                    t.transaction_id, t.transaction_timestamp, t.transaction_type,
                    i.sap_no, i.part_no, i.part_description, t.quantity, 
                    loc_to.location_name AS destination_location,
                    loc_from.location_name AS source_location,
                    t.reference_id as lot_no,
                    t.notes
                FROM " . TRANSACTIONS_TABLE . " t
                JOIN " . ITEMS_TABLE . " i ON t.parameter_id = i.item_id
                JOIN " . LOCATIONS_TABLE . " loc_to ON t.to_location_id = loc_to.location_id
                LEFT JOIN " . LOCATIONS_TABLE . " loc_from ON t.from_location_id = loc_from.location_id
                {$whereClause}
                ORDER BY t.transaction_timestamp DESC
                OFFSET ? ROWS FETCH NEXT ? ROWS ONLY
            ";

            $dataStmt = $pdo->prepare($dataSql);

            // --- ส่วนที่แก้ไข: เปลี่ยนมาใช้ bindValue เพื่อกำหนดชนิดข้อมูล ---
            $paramIndex = 1;
            foreach ($params as $param) {
                $dataStmt->bindValue($paramIndex++, $param); // สำหรับ WHERE clause (เป็น String)
            }
            // บังคับให้ offset และ limit เป็น Integer
            $dataStmt->bindValue($paramIndex++, $offset, PDO::PARAM_INT);
            $dataStmt->bindValue($paramIndex++, $limit, PDO::PARAM_INT);

            $dataStmt->execute();
            $history = $dataStmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode(['success' => true, 'data' => $history, 'total' => $total, 'page' => $page, 'limit' => $limit]);
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
            $date_params = [];
            $conditions = [];
            $date_where_clause = '';
            
            if (!empty($_GET['part_no'])) { 
                $conditions[] = "(i.sap_no LIKE ? OR i.part_no LIKE ?)"; 
                $params[] = '%' . $_GET['part_no'] . '%'; 
                $params[] = '%' . $_GET['part_no'] . '%';
            }
            if (!empty($_GET['location'])) { 
                $conditions[] = "l.location_name LIKE ?"; 
                $params[] = '%' . $_GET['location'] . '%'; 
            }
            
            if (!empty($_GET['startDate']) && !empty($_GET['endDate'])) {
                $date_where_clause = "AND t.transaction_timestamp >= ? AND t.transaction_timestamp < DATEADD(day, 1, ?)";
                $date_params[] = $_GET['startDate'];
                $date_params[] = $_GET['endDate'];
            }

            $baseQuery = "
                -- 1. Get all OUT transactions (Consumption, Production, and the FROM side of a Transfer)
                SELECT 
                    t.parameter_id,
                    ISNULL(t.from_location_id, t.to_location_id) AS location_id,
                    0 AS total_in,
                    ABS(t.quantity) AS total_out
                FROM " . TRANSACTIONS_TABLE . " t
                WHERE ( -- *** FIX: Added parentheses to group OR conditions ***
                    (t.transaction_type IN ('CONSUMPTION', 'TRANSFER') AND t.from_location_id IS NOT NULL)
                    OR 
                    (t.transaction_type LIKE 'PRODUCTION_%')
                )
                {$date_where_clause}

                UNION ALL

                -- 2. Get all IN transactions (Receipt and the TO side of a Transfer)
                SELECT 
                    t.parameter_id,
                    t.to_location_id AS location_id,
                    t.quantity AS total_in,
                    0 AS total_out
                FROM " . TRANSACTIONS_TABLE . " t
                WHERE t.transaction_type IN ('RECEIPT', 'TRANSFER') AND t.to_location_id IS NOT NULL
                {$date_where_clause}
            ";
            
            $finalQuery = "
                SELECT
                    agg.location_id,
                    l.location_name,
                    i.item_id,
                    i.sap_no, i.part_no, i.part_description,
                    SUM(agg.total_in) as total_in,
                    SUM(agg.total_out) as total_out,
                    (SUM(agg.total_out) - SUM(agg.total_in)) as variance
                FROM ({$baseQuery}) agg
                JOIN " . ITEMS_TABLE . " i ON agg.parameter_id = i.item_id
                JOIN " . LOCATIONS_TABLE . " l ON agg.location_id = l.location_id
                ".(!empty($conditions) ? "WHERE " . implode(" AND ", $conditions) : "")."
                GROUP BY agg.location_id, l.location_name, i.item_id, i.sap_no, i.part_no, i.part_description
            ";

            $full_params = array_merge($date_params, $date_params, $params);
            
            $totalSql = "SELECT COUNT(*) FROM ({$finalQuery}) AS SubQuery";
            $totalStmt = $pdo->prepare($totalSql);
            $totalStmt->execute($full_params);
            $total = (int)$totalStmt->fetchColumn();

            $dataSql = "
                WITH NumberedRows AS (
                    SELECT *, ROW_NUMBER() OVER (ORDER BY location_name, sap_no) AS RowNum
                    FROM ({$finalQuery}) AS FinalQuery
                )
                SELECT * FROM NumberedRows WHERE RowNum > ? AND RowNum <= ?
            ";

            $dataStmt = $pdo->prepare($dataSql);
            $final_execution_params = array_merge($full_params, [$startRow, $startRow + $limit]);
            $dataStmt->execute($final_execution_params);
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
                        i.item_id, -- <<< เพิ่มเข้ามา
                        h.location_id, -- <<< เพิ่มเข้ามา
                        l.location_name, i.sap_no, i.part_no, i.part_description, 
                        ISNULL(h.quantity, 0) as quantity,
                        ROW_NUMBER() OVER (ORDER BY l.location_name, i.sap_no) as RowNum
                    FROM ". ONHAND_TABLE ." h
                    JOIN ". ITEMS_TABLE ." i ON h.parameter_id = i.item_id
                    JOIN ". LOCATIONS_TABLE ." l ON h.location_id = l.location_id
                    {$whereClause}
                    AND h.quantity > 0 -- <<< เพิ่มเข้ามาเพื่อประสิทธิภาพที่ดีขึ้น
                )
                SELECT item_id, location_id, location_name, sap_no, part_no, part_description, quantity 
                FROM NumberedRows 
                WHERE RowNum > ? AND RowNum <= ?
            ";
            
            $dataStmt = $pdo->prepare($dataSql);
            $dataStmt->execute(array_merge($params, [$startRow, $startRow + $limit]));
            $data = $dataStmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode(['success' => true, 'data' => $data, 'total' => $total, 'page' => $page]);
            break;

        case 'execute_production':
            $item_id = $input['item_id'] ?? 0;
            $location_id = $input['location_id'] ?? 0;
            $quantity = $input['quantity'] ?? 0;
            $count_type = $input['count_type'] ?? '';
            $lot_no = $input['lot_no'] ?? null;
            $notes = $input['notes'] ?? null;
            $log_date = $input['log_date'] ?? null;
            // --- 1. รับค่า start_time และ end_time จาก input ---
            $start_time = $input['start_time'] ?? null;
            $end_time = $input['end_time'] ?? null; 

            if (empty($item_id) || empty($location_id) || !is_numeric($quantity) || $quantity <= 0 || empty($count_type)) {
                throw new Exception("Invalid data provided for production logging.");
            }

            $pdo->beginTransaction();

            $prod_transaction_type = 'PRODUCTION_' . strtoupper($count_type);

            // --- 2. อัปเดตการเรียกใช้ logStockTransaction ให้ส่งค่าเวลาใหม่ไปด้วย ---
            logStockTransaction(
                $pdo, $item_id, $quantity, $prod_transaction_type, 
                null, $location_id, $currentUser['id'], $notes, $lot_no,
                $start_time, $end_time // <-- เพิ่ม 2 ค่านี้เข้าไป
            );

            if (in_array(strtoupper($count_type), ['FG', 'NG', 'SCRAP'])) {
                $bomSql = "SELECT component_item_id, quantity_required FROM " . BOM_TABLE . " WHERE fg_item_id = ?";
                $bomStmt = $pdo->prepare($bomSql);
                $bomStmt->execute([$item_id]);
                $components = $bomStmt->fetchAll(PDO::FETCH_ASSOC);

                if (!empty($components)) {
                    foreach ($components as $comp) {
                        $qty_to_consume = $quantity * (float)$comp['quantity_required'];
                        $component_item_id = $comp['component_item_id'];

                        updateOnhandBalance($pdo, $component_item_id, $location_id, -$qty_to_consume);

                        $consume_note = "Auto-consumed for production of Item ID: {$item_id}, Lot: {$lot_no}";
                        // --- 3. อัปเดตการเรียกใช้ logStockTransaction ของ Component ด้วย ---
                        logStockTransaction(
                            $pdo, $component_item_id, -$qty_to_consume, 'CONSUMPTION', 
                            $location_id, null, $currentUser['id'], $consume_note, $lot_no,
                            $start_time, $end_time // <-- เพิ่ม 2 ค่านี้เข้าไป
                        );
                    }
                }
            }

            // *** หมายเหตุ: โค้ดส่วน updateOnhandBalance สำหรับตัว FG ถูกย้ายไปจัดการใน `update_transaction` แล้ว ***
            // *** เพื่อป้องกันการบวกสต็อกซ้ำซ้อนเมื่อมีการแก้ไขข้อมูล เราจะจัดการสต็อก FG ตอนแก้ไขเท่านั้น ***
            // *** แต่หากต้องการให้บวกสต็อก FG ทันทีที่ Add ให้เพิ่มบรรทัดนี้กลับเข้ามา: ***
            // updateOnhandBalance($pdo, $item_id, $location_id, $quantity);

            $pdo->commit();
            logAction($pdo, $currentUser['username'], 'PRODUCTION LOG', $item_id, "Type: {$count_type}, Qty: {$quantity}, Location: {$location_id}, Lot: {$lot_no}");
            echo json_encode(['success' => true, 'message' => 'Production logged successfully.']);
            break;

        case 'get_production_history':
            $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
            // --- ส่วนที่แก้ไข: จัดการกับการ Export ---
            $isExport = isset($_GET['limit']) && $_GET['limit'] == -1;
            $limit = $isExport ? 99999 : 50; // ถ้าเป็นการ Export ให้ดึงข้อมูลเยอะๆ
            $offset = ($page - 1) * $limit;

            $conditions = ["t.transaction_type LIKE 'PRODUCTION_%'"];
            $params = [];
            
            if (!empty($_GET['part_no'])) { $conditions[] = "(i.sap_no LIKE ? OR i.part_no LIKE ?)"; $params[] = '%' . $_GET['part_no'] . '%'; $params[] = '%' . $_GET['part_no'] . '%';}
            if (!empty($_GET['location'])) { $conditions[] = "loc.location_name LIKE ?"; $params[] = '%' . $_GET['location'] . '%'; }
            if (!empty($_GET['lot_no'])) { $conditions[] = "t.reference_id LIKE ?"; $params[] = '%' . $_GET['lot_no'] . '%'; }
            if (!empty($_GET['count_type'])) { $conditions[] = "t.transaction_type = ?"; $params[] = 'PRODUCTION_' . $_GET['count_type']; }
            if (!empty($_GET['startDate'])) { $conditions[] = "CAST(t.transaction_timestamp AS DATE) >= ?"; $params[] = $_GET['startDate']; }
            if (!empty($_GET['endDate'])) { $conditions[] = "CAST(t.transaction_timestamp AS DATE) <= ?"; $params[] = $_GET['endDate']; }

            $whereClause = "WHERE " . implode(" AND ", $conditions);

            // --- ส่วน Query หลัก (เหมือนเดิม) ---
            $totalSql = "SELECT COUNT(*) FROM " . TRANSACTIONS_TABLE . " t JOIN " . ITEMS_TABLE . " i ON t.parameter_id = i.item_id LEFT JOIN " . LOCATIONS_TABLE . " loc ON t.to_location_id = loc.location_id {$whereClause}";
            $totalStmt = $pdo->prepare($totalSql);
            $totalStmt->execute($params);
            $total = (int)$totalStmt->fetchColumn();

            $dataSql = "
                SELECT t.transaction_id, t.transaction_timestamp, i.sap_no, i.part_no, t.quantity,
                    REPLACE(t.transaction_type, 'PRODUCTION_', '') AS count_type,
                    loc.location_name, t.reference_id as lot_no, u.username AS created_by, t.notes,
                    FORMAT(t.start_time, N'hh\\:mm\\:ss') as start_time,
                    FORMAT(t.end_time, N'hh\\:mm\\:ss') as end_time
                FROM " . TRANSACTIONS_TABLE . " t
                LEFT JOIN " . ITEMS_TABLE . " i ON t.parameter_id = i.item_id
                LEFT JOIN " . LOCATIONS_TABLE . " loc ON t.to_location_id = loc.location_id
                LEFT JOIN " . USERS_TABLE . " u ON t.created_by_user_id = u.id
                {$whereClause}
                ORDER BY t.transaction_timestamp DESC
                OFFSET ? ROWS FETCH NEXT ? ROWS ONLY
            ";
            $dataStmt = $pdo->prepare($dataSql);
            $paramIndex = 1;
            foreach ($params as $param) { $dataStmt->bindValue($paramIndex++, $param); }
            $dataStmt->bindValue($paramIndex++, $offset, PDO::PARAM_INT);
            $dataStmt->bindValue($paramIndex++, $limit, PDO::PARAM_INT);
            $dataStmt->execute();
            $history = $dataStmt->fetchAll(PDO::FETCH_ASSOC);

            // --- ส่วนที่เพิ่มเข้ามา: คำนวณ Summary และ Grand Total เฉพาะตอน Export ---
            $summary = [];
            $grand_total = [];

            if ($isExport) {
                // Query for Summary by Part
                $summarySql = "
                    SELECT i.sap_no, i.part_no, REPLACE(t.transaction_type, 'PRODUCTION_', '') as count_type, SUM(t.quantity) as total_quantity
                    FROM " . TRANSACTIONS_TABLE . " t
                    JOIN " . ITEMS_TABLE . " i ON t.parameter_id = i.item_id
                    LEFT JOIN " . LOCATIONS_TABLE . " loc ON t.to_location_id = loc.location_id
                    {$whereClause}
                    GROUP BY i.sap_no, i.part_no, t.transaction_type
                    ORDER BY i.sap_no, i.part_no, t.transaction_type
                ";
                $summaryStmt = $pdo->prepare($summarySql);
                $summaryStmt->execute($params);
                $summary = $summaryStmt->fetchAll(PDO::FETCH_ASSOC);

                // Query for Grand Total
                $grandTotalSql = "
                    SELECT REPLACE(t.transaction_type, 'PRODUCTION_', '') as count_type, SUM(t.quantity) as total_quantity
                    FROM " . TRANSACTIONS_TABLE . " t
                    JOIN " . ITEMS_TABLE . " i ON t.parameter_id = i.item_id
                    LEFT JOIN " . LOCATIONS_TABLE . " loc ON t.to_location_id = loc.location_id
                    {$whereClause}
                    GROUP BY t.transaction_type
                ";
                $grandTotalStmt = $pdo->prepare($grandTotalSql);
                $grandTotalStmt->execute($params);
                $grand_total = $grandTotalStmt->fetchAll(PDO::FETCH_ASSOC);
            }

            echo json_encode([
                'success' => true, 'data' => $history, 'total' => $total, 'page' => $page, 'limit' => $limit,
                'summary' => $summary, 'grand_total' => $grand_total // << ส่งข้อมูลใหม่ไปด้วย
            ]);
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

            // 1. ดึงข้อมูลเก่าเพื่อตรวจสอบประเภท
            $stmt = $pdo->prepare("SELECT * FROM " . TRANSACTIONS_TABLE . " WHERE transaction_id = ?");
            $stmt->execute([$transaction_id]);
            $old_transaction = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$old_transaction) throw new Exception("Original transaction not found.");

            // 2. แยก Logic การทำงานตามประเภทของ Transaction เดิม
            if (strpos($old_transaction['transaction_type'], 'PRODUCTION_') === 0) {
                // ===================================================
                // นี่คือ LOGIC สำหรับแก้ไข PRODUCTION (ของออก)
                // ===================================================
                $old_item_id = $old_transaction['parameter_id'];
                $old_location_id = $old_transaction['to_location_id'];
                $old_count_type = strtoupper(str_replace('PRODUCTION_', '', $old_transaction['transaction_type']));

                // 2.1 Revert สต็อกเก่าทั้งหมด (Product และ Components)
                updateOnhandBalance($pdo, $old_item_id, $old_location_id, -(float)$old_transaction['quantity']);
                if (in_array($old_count_type, ['FG', 'NG', 'SCRAP'])) {
                    $bomSql = "SELECT component_item_id, quantity_required FROM " . BOM_TABLE . " WHERE fg_item_id = ?";
                    $bomStmt = $pdo->prepare($bomSql); $bomStmt->execute([$old_item_id]);
                    $components = $bomStmt->fetchAll(PDO::FETCH_ASSOC);
                    foreach ($components as $comp) {
                        $qty_to_revert = (float)$old_transaction['quantity'] * (float)$comp['quantity_required'];
                        updateOnhandBalance($pdo, $comp['component_item_id'], $old_location_id, $qty_to_revert);
                    }
                }

                // 2.2 เตรียมข้อมูลใหม่
                $new_quantity = (float)($input['quantity'] ?? 0);
                $new_location_id = (int)($input['location_id'] ?? 0);
                $new_lot_no = $input['lot_no'] ?? null;
                $new_notes = $input['notes'] ?? null;
                $new_log_date = $input['log_date'] ?? date('Y-m-d');
                $new_start_time = $input['start_time'] ?? null;
                $new_end_time = $input['end_time'] ?? null;
                $new_timestamp = $new_end_time ? ($new_log_date . ' ' . $new_end_time) : $old_transaction['transaction_timestamp'];
                $new_count_type = strtoupper($input['count_type'] ?? '');
                $new_transaction_type = 'PRODUCTION_' . $new_count_type;

                // 2.3 อัปเดต Transaction record
                $sql = "UPDATE " . TRANSACTIONS_TABLE . " SET quantity=?, to_location_id=?, reference_id=?, notes=?, transaction_type=?, transaction_timestamp=?, start_time=?, end_time=? WHERE transaction_id=?";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$new_quantity, $new_location_id, $new_lot_no, $new_notes, $new_transaction_type, $new_timestamp, $new_start_time, $new_end_time, $transaction_id]);

                // 2.4 เพิ่มสต็อกใหม่ (Product และ Components)
                updateOnhandBalance($pdo, $old_item_id, $new_location_id, $new_quantity);
                if (in_array($new_count_type, ['FG', 'NG', 'SCRAP'])) {
                    $bomSql = "SELECT component_item_id, quantity_required FROM " . BOM_TABLE . " WHERE fg_item_id = ?";
                    $bomStmt = $pdo->prepare($bomSql); $bomStmt->execute([$old_item_id]);
                    $components = $bomStmt->fetchAll(PDO::FETCH_ASSOC);
                    foreach ($components as $comp) {
                        $qty_to_consume = $new_quantity * (float)$comp['quantity_required'];
                        updateOnhandBalance($pdo, $comp['component_item_id'], $new_location_id, -$qty_to_consume);
                    }
                }

            } else {
                // ===================================================
                // นี่คือ LOGIC สำหรับแก้ไข RECEIPT / TRANSFER (ของเข้า)
                // ===================================================
                $old_item_id = $old_transaction['parameter_id'];
                $old_location_id = $old_transaction['to_location_id'];

                // 2.1 Revert สต็อกเก่า
                updateOnhandBalance($pdo, $old_item_id, $old_location_id, -(float)$old_transaction['quantity']);

                // 2.2 เตรียมข้อมูลใหม่
                $new_quantity = (float)($input['quantity'] ?? 0);
                $new_location_id = (int)($input['location_id'] ?? 0);
                $new_lot_no = $input['lot_no'] ?? null;
                $new_notes = $input['notes'] ?? null;
                $new_log_date = $input['log_date'] ?? date('Y-m-d');
                $new_log_time = $input['log_time'] ?? date('H:i:s');
                $new_timestamp = $new_log_date . ' ' . $new_log_time;

                // 2.3 อัปเดต Transaction record (เพิ่ม transaction_timestamp)
                $sql = "UPDATE " . TRANSACTIONS_TABLE . " SET quantity=?, to_location_id=?, reference_id=?, notes=?, transaction_timestamp=? WHERE transaction_id=?";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$new_quantity, $new_location_id, $new_lot_no, $new_notes, $new_timestamp, $transaction_id]);

                // 2.4 เพิ่มสต็อกใหม่
                updateOnhandBalance($pdo, $old_item_id, $new_location_id, $new_quantity);
            }

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

        case 'adjust_single_stock':
            $pdo->beginTransaction();
            try {
                $item_id = $input['item_id'] ?? 0;
                $location_id = $input['location_id'] ?? 0;
                $physical_count = $input['physical_count'] ?? null;
                $notes = trim($input['notes'] ?? 'Quick Adjustment');

                if (empty($item_id) || empty($location_id) || !is_numeric($physical_count)) {
                    throw new Exception("Item, Location, and a valid Physical Count are required.");
                }

                $onhandStmt = $pdo->prepare("SELECT quantity FROM " . ONHAND_TABLE . " WHERE parameter_id = ? AND location_id = ?");
                $onhandStmt->execute([$item_id, $location_id]);
                $current_quantity = (float)($onhandStmt->fetchColumn() ?: 0);

                $variance = (float)$physical_count - $current_quantity;

                if ($variance == 0) {
                    echo json_encode(['success' => true, 'message' => 'No adjustment needed as quantity is already correct.']);
                    $pdo->commit();
                    exit;
                }

                $mergeSql = "MERGE " . ONHAND_TABLE . " AS target 
                            USING (SELECT ? AS item_id, ? AS location_id) AS source 
                            ON (target.parameter_id = source.item_id AND target.location_id = source.location_id) 
                            WHEN MATCHED THEN 
                                UPDATE SET quantity = ? 
                            WHEN NOT MATCHED THEN 
                                INSERT (parameter_id, location_id, quantity) VALUES (?, ?, ?);";
                $mergeStmt = $pdo->prepare($mergeSql);
                $mergeStmt->execute([$item_id, $location_id, $physical_count, $item_id, $location_id, $physical_count]);

                $transSql = "INSERT INTO " . TRANSACTIONS_TABLE . " (parameter_id, quantity, transaction_type, to_location_id, created_by_user_id, notes) VALUES (?, ?, 'ADJUSTMENT', ?, ?, ?)";
                $transStmt = $pdo->prepare($transSql);
                $transStmt->execute([$item_id, $variance, $location_id, $currentUser['id'], $notes]);

                $pdo->commit();
                logAction($pdo, $currentUser['username'], 'QUICK_ADJUST', $item_id, "Location: {$location_id}, New Qty: {$physical_count}, Variance: {$variance}");
                echo json_encode(['success' => true, 'message' => 'Stock adjusted successfully.']);

            } catch (Exception $e) {
                if ($pdo->inTransaction()) {
                    $pdo->rollBack();
                }
                throw $e;
            }
            break;

        // --- เพิ่ม case นี้เข้าไปใน switch ของไฟล์ inventoryManage.php ---
        case 'get_stock_onhand':
            $item_id = $_GET['item_id'] ?? 0;
            $location_id = $_GET['location_id'] ?? 0;
            if (empty($item_id) || empty($location_id)) {
                echo json_encode(['success' => true, 'quantity' => 0]);
                exit;
            }
            $stockStmt = $pdo->prepare("SELECT quantity FROM " . ONHAND_TABLE . " WHERE parameter_id = ? AND location_id = ?");
            $stockStmt->execute([$item_id, $location_id]);
            $quantity = $stockStmt->fetchColumn();
            echo json_encode(['success' => true, 'quantity' => $quantity ?: 0]);
            break;

        case 'get_all_transactions':
            $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
            $limit = 50;
            $offset = ($page - 1) * $limit;

            $params = [];
            $conditions = [];

            if (!empty($_GET['part_no'])) { 
                $conditions[] = "(i.sap_no LIKE ? OR i.part_no LIKE ?)"; 
                $params[] = '%' . $_GET['part_no'] . '%'; 
                $params[] = '%' . $_GET['part_no'] . '%';
            }
            if (!empty($_GET['lot_no'])) { 
                $conditions[] = "t.reference_id LIKE ?"; 
                $params[] = '%' . $_GET['lot_no'] . '%'; 
            }
            if (!empty($_GET['line'])) { 
                $conditions[] = "(loc_from.location_name LIKE ? OR loc_to.location_name LIKE ?)";
                $params[] = '%' . $_GET['line'] . '%';
                $params[] = '%' . $_GET['line'] . '%';
            }
            if (!empty($_GET['startDate'])) { 
                $conditions[] = "CAST(t.transaction_timestamp AS DATE) >= ?"; 
                $params[] = $_GET['startDate']; 
            }
            if (!empty($_GET['endDate'])) { 
                $conditions[] = "CAST(t.transaction_timestamp AS DATE) <= ?"; 
                $params[] = $_GET['endDate']; 
            }

            $whereClause = !empty($conditions) ? "WHERE " . implode(" AND ", $conditions) : "";

            $baseSql = "
                FROM " . TRANSACTIONS_TABLE . " t
                LEFT JOIN " . ITEMS_TABLE . " i ON t.parameter_id = i.item_id
                LEFT JOIN " . LOCATIONS_TABLE . " loc_from ON t.from_location_id = loc_from.location_id
                LEFT JOIN " . LOCATIONS_TABLE . " loc_to ON t.to_location_id = loc_to.location_id
                LEFT JOIN " . USERS_TABLE . " u ON t.created_by_user_id = u.id
                {$whereClause}
            ";

            $totalSql = "SELECT COUNT(*) " . $baseSql;
            $totalStmt = $pdo->prepare($totalSql);
            $totalStmt->execute($params);
            $total = (int)$totalStmt->fetchColumn();

            $dataSql = "
                SELECT 
                    t.transaction_timestamp, t.transaction_type, i.sap_no, i.part_no,
                    loc_from.location_name AS source_location,
                    loc_to.location_name AS destination_location,
                    t.quantity, t.reference_id as lot_no, u.username, t.notes
                " . $baseSql . "
                ORDER BY t.transaction_timestamp DESC
                OFFSET ? ROWS FETCH NEXT ? ROWS ONLY
            ";

            $dataStmt = $pdo->prepare($dataSql);

            $paramIndex = 1;
            foreach ($params as $param) {
                $dataStmt->bindValue($paramIndex++, $param);
            }
            $dataStmt->bindValue($paramIndex++, $offset, PDO::PARAM_INT);
            $dataStmt->bindValue($paramIndex++, $limit, PDO::PARAM_INT);

            $dataStmt->execute();
            $transactions = $dataStmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode(['success' => true, 'data' => $transactions, 'total' => $total, 'page' => $page, 'limit' => $limit]);
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