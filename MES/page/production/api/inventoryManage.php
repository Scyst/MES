<?php
require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../../auth/check_auth.php';
require_once __DIR__ . '/../../logger.php';
require_once __DIR__ . '/../../components/api/inventory_helpers.php';

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
            
            $log_date = $input['log_date'] ?? null;
            $log_time = $input['log_time'] ?? date('H:i:s');

            if (empty($log_date)) {
                throw new Exception("Log Date is required.");
            }

            $timestamp = $log_date . ' ' . $log_time;

            if (empty($item_id) || empty($to_location_id) || !is_numeric($quantity) || $quantity <= 0 || empty($log_date)) {
                throw new Exception("Invalid data provided. Item, Quantity, Destination, and Log Date are required.");
            }

            $pdo->beginTransaction();
            try {
                if (!empty($from_location_id)) {
                    if ($from_location_id == $to_location_id) {
                        throw new Exception("Source and Destination locations cannot be the same.");
                    }
                    updateOnhandBalance($pdo, $item_id, $from_location_id, -$quantity);
                    updateOnhandBalance($pdo, $item_id, $to_location_id, $quantity);
                    $transSql = "INSERT INTO " . TRANSACTIONS_TABLE . " (parameter_id, quantity, transaction_type, from_location_id, to_location_id, created_by_user_id, notes, reference_id, transaction_timestamp) VALUES (?, ?, 'TRANSFER', ?, ?, ?, ?, ?, ?)";
                    $transStmt = $pdo->prepare($transSql);
                    $transStmt->execute([$item_id, $quantity, $from_location_id, $to_location_id, $currentUser['id'], $notes, $lot_no, $timestamp]);
                    $message = 'Stock transferred successfully.';
                } else {
                    updateOnhandBalance($pdo, $item_id, $to_location_id, $quantity);
                    $transSql = "INSERT INTO " . TRANSACTIONS_TABLE . " (parameter_id, quantity, transaction_type, to_location_id, created_by_user_id, notes, reference_id, transaction_timestamp) VALUES (?, ?, 'RECEIPT', ?, ?, ?, ?, ?)";
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
        case 'get_production_history':
        case 'get_all_transactions':
            $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
            $isExport = isset($_GET['limit']) && $_GET['limit'] == -1;
            $limit = $isExport ? 10000 : 50;
            $offset = ($page - 1) * $limit;
            $params = [];
            $conditions = [];

            if ($currentUser['role'] === 'supervisor') {
                $conditions[] = "loc.production_line = ?";
                $params[] = $currentUser['line'];
            }

            if ($action === 'get_receipt_history') $conditions[] = "t.transaction_type IN ('RECEIPT', 'TRANSFER')";
            if ($action === 'get_production_history') $conditions[] = "t.transaction_type LIKE 'PRODUCTION_%'";

            if (!empty($_GET['search_term'])) {
                $search_term = '%' . $_GET['search_term'] . '%';
                $conditions[] = "(i.sap_no LIKE ? OR i.part_no LIKE ? OR t.reference_id LIKE ? OR loc.location_name LIKE ? OR (SELECT TOP 1 r.model FROM ". ROUTES_TABLE ." r WHERE r.item_id = t.parameter_id AND r.line = loc.production_line) LIKE ?)";
                array_push($params, $search_term, $search_term, $search_term, $search_term, $search_term);
            }
            if (!empty($_GET['count_type']) && $action === 'get_production_history') {
                $conditions[] = "t.transaction_type = ?";
                $params[] = 'PRODUCTION_' . $_GET['count_type'];
            }
            
            // <== [แก้ไข] ตรรกะ 8-Hour Shift (SELECT)
            if (!empty($_GET['startDate'])) {
                $conditions[] = "CAST(DATEADD(HOUR, -8, t.transaction_timestamp) AS DATE) >= ?";
                $params[] = $_GET['startDate'];
            }
            if (!empty($_GET['endDate'])) {
                $conditions[] = "CAST(DATEADD(HOUR, -8, t.transaction_timestamp) AS DATE) <= ?";
                $params[] = $_GET['endDate'];
            }
            // <== สิ้นสุดการแก้ไข

            $whereClause = !empty($conditions) ? "WHERE " . implode(" AND ", $conditions) : "";
            $baseSql = "
                FROM " . TRANSACTIONS_TABLE . " t
                LEFT JOIN " . ITEMS_TABLE . " i ON t.parameter_id = i.item_id
                LEFT JOIN " . LOCATIONS_TABLE . " loc ON ISNULL(t.to_location_id, t.from_location_id) = loc.location_id
                LEFT JOIN " . USERS_TABLE . " u ON t.created_by_user_id = u.id
                {$whereClause}
            ";
            $totalSql = "SELECT COUNT(*) " . $baseSql;
            $totalStmt = $pdo->prepare($totalSql);
            $totalStmt->execute($params);
            $total = (int)$totalStmt->fetchColumn();

            $dataSql = "
                SELECT
                    t.transaction_id, t.transaction_timestamp, t.transaction_type, i.sap_no, i.part_no, t.quantity,
                    (
                        SELECT STUFF((
                            SELECT DISTINCT ', ' + r.model FROM " . ROUTES_TABLE . " r
                            WHERE r.item_id = t.parameter_id AND r.line = loc.production_line
                            FOR XML PATH('')), 1, 2, '')
                    ) AS model,
                    REPLACE(t.transaction_type, 'PRODUCTION_', '') AS count_type,
                    loc.location_name, t.reference_id as lot_no, u.username AS created_by, t.notes,
                    FORMAT(t.start_time, N'hh\\:mm\\:ss') as start_time,
                    FORMAT(t.end_time, N'hh\\:mm\\:ss') as end_time,
                    (SELECT location_name FROM " . LOCATIONS_TABLE . " WHERE location_id = t.from_location_id) as source_location,
                    (SELECT location_name FROM " . LOCATIONS_TABLE . " WHERE location_id = t.to_location_id) as destination_location
                " . $baseSql . "
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

            echo json_encode(['success' => true, 'data' => $history, 'total' => $total, 'page' => $page]);
            break;

        case 'get_stock_inventory_report':
            $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
            $limit = 50; $startRow = ($page - 1) * $limit; $endRow = $startRow + $limit;
            $search_term = $_GET['search_term'] ?? '';
            $conditions = []; $base_params = [];

            $conditions[] = "(l.location_type IS NULL OR l.location_type != 'SHIPPING')";

            if ($currentUser['role'] === 'supervisor') {
                $supervisor_line = $currentUser['line'];
                $conditions[] = "
                    i.item_id IN (
                        SELECT item_id FROM " . ROUTES_TABLE . " WHERE line = ?
                        UNION
                        SELECT DISTINCT b.component_item_id
                        FROM " . BOM_TABLE . " b
                        WHERE b.fg_item_id IN (SELECT item_id FROM " . ROUTES_TABLE . " WHERE line = ?)
                    )
                ";
                $base_params[] = $supervisor_line;
                $base_params[] = $supervisor_line;
            }

            if (!empty($search_term)) {
                $conditions[] = "(i.sap_no LIKE ? OR i.part_no LIKE ? OR i.part_description LIKE ?)";
                $base_params[] = "%{$search_term}%";
                $base_params[] = "%{$search_term}%";
                $base_params[] = "%{$search_term}%";
            }

            $whereClause = !empty($conditions) ? "WHERE " . implode(" AND ", $conditions) : "";
            $totalSql = "
                SELECT COUNT(DISTINCT i.item_id)
                FROM " . ITEMS_TABLE . " i
                LEFT JOIN " . ONHAND_TABLE . " h ON i.item_id = h.parameter_id
                LEFT JOIN " . LOCATIONS_TABLE . " l ON h.location_id = l.location_id
                {$whereClause}
            ";
            $totalStmt = $pdo->prepare($totalSql);
            $totalStmt->execute($base_params);
            $total = (int)$totalStmt->fetchColumn();

            $dataSql = "
                WITH ItemGroup AS (
                    SELECT
                        i.item_id, i.sap_no, i.part_no, i.part_description,
                        SUM(ISNULL(h.quantity, 0)) as total_onhand,
                        STUFF((
                            SELECT ', ' + r.model FROM " . ROUTES_TABLE . " r
                            WHERE r.item_id = i.item_id ORDER BY r.model FOR XML PATH('')
                        ), 1, 2, '') AS used_models
                    FROM " . ITEMS_TABLE . " i
                    LEFT JOIN " . ONHAND_TABLE . " h ON i.item_id = h.parameter_id
                    LEFT JOIN " . LOCATIONS_TABLE . " l ON h.location_id = l.location_id
                    {$whereClause} -- ใช้ WHERE clause ที่มีเงื่อนไข location_type
                    GROUP BY i.item_id, i.sap_no, i.part_no, i.part_description
                ),
                NumberedRows AS (
                    SELECT *, ROW_NUMBER() OVER (ORDER BY sap_no) as RowNum FROM ItemGroup
                )
                SELECT item_id, sap_no, part_no, part_description, total_onhand, used_models
                FROM NumberedRows WHERE RowNum > ? AND RowNum <= ?
            ";
            $dataStmt = $pdo->prepare($dataSql);

            $all_params = array_merge($base_params, [$startRow, $endRow]);
            $paramIndex = 1;
            foreach ($all_params as $param) {
                if (is_int($param) || ctype_digit($param)) {
                     $dataStmt->bindValue($paramIndex++, (int)$param, PDO::PARAM_INT);
                } else {
                     $dataStmt->bindValue($paramIndex++, $param);
                }
            }

            $dataStmt->execute();
            $stock = $dataStmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(['success' => true, 'data' => $stock, 'total' => $total, 'page' => $page]);
            break;

        case 'get_production_variance_report':
            $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
            $limit = 50; $startRow = ($page - 1) * $limit;
            $params = []; $date_params = []; $conditions = []; $date_where_clause = '';
            
            if ($currentUser['role'] === 'supervisor') {
                $conditions[] = "l.production_line = ?";
                $params[] = $currentUser['line'];
            }
            
            if (!empty($_GET['search_term'])) {
                $search_term = '%' . $_GET['search_term'] . '%';
                $conditions[] = "(i.sap_no LIKE ? OR i.part_no LIKE ? OR l.location_name LIKE ? OR (SELECT TOP 1 r.model FROM ". ROUTES_TABLE ." r WHERE r.item_id = i.item_id AND r.line = l.production_line) LIKE ?)";
                array_push($params, $search_term, $search_term, $search_term, $search_term);
            }

            if (!empty($_GET['startDate']) && !empty($_GET['endDate'])) {
                $date_where_clause = "AND DATEADD(HOUR, -8, t.transaction_timestamp) >= ? AND DATEADD(HOUR, -8, t.transaction_timestamp) < DATEADD(day, 1, ?)";
                $date_params[] = $_GET['startDate'];
                $date_params[] = $_GET['endDate'];
            }

            $baseQuery = "
                SELECT
                    t.parameter_id, ISNULL(t.from_location_id, t.to_location_id) AS location_id,
                    0 AS total_in, ABS(t.quantity) AS total_out
                FROM " . TRANSACTIONS_TABLE . " t
                WHERE ( (t.transaction_type IN ('CONSUMPTION', 'TRANSFER') AND t.from_location_id IS NOT NULL) OR (t.transaction_type LIKE 'PRODUCTION_%') )
                {$date_where_clause}
                UNION ALL
                SELECT
                    t.parameter_id, t.to_location_id AS location_id,
                    t.quantity AS total_in, 0 AS total_out
                FROM " . TRANSACTIONS_TABLE . " t
                WHERE t.transaction_type IN ('RECEIPT', 'TRANSFER') AND t.to_location_id IS NOT NULL
                {$date_where_clause}
            ";
            $finalQuery = "
                SELECT
                    agg.location_id, l.location_name, i.item_id,
                    i.sap_no, i.part_no, i.part_description,
                    (
                        SELECT STUFF((
                            SELECT DISTINCT ', ' + r.model FROM " . ROUTES_TABLE . " r
                            WHERE r.item_id = i.item_id AND r.line = l.production_line
                            FOR XML PATH('')), 1, 2, '')
                    ) AS model,
                    SUM(agg.total_in) as total_in, SUM(agg.total_out) as total_out,
                    (SUM(agg.total_out) - SUM(agg.total_in)) as variance
                FROM ({$baseQuery}) agg
                JOIN " . ITEMS_TABLE . " i ON agg.parameter_id = i.item_id
                JOIN " . LOCATIONS_TABLE . " l ON agg.location_id = l.location_id
                ".(!empty($conditions) ? "WHERE " . implode(" AND ", $conditions) : "")."
                GROUP BY agg.location_id, l.location_name, i.item_id, i.sap_no, i.part_no, i.part_description, l.production_line
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
            $paramIndex = 1;
            $all_final_params = array_merge($full_params, [$startRow, $startRow + $limit]);
            foreach($all_final_params as $p) {
                if (is_int($p)) { $dataStmt->bindValue($paramIndex++, $p, PDO::PARAM_INT); }
                else { $dataStmt->bindValue($paramIndex++, $p); }
            }
            $dataStmt->execute();
            $data = $dataStmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode(['success' => true, 'data' => $data, 'total' => $total, 'page' => $page]);
            break;

        case 'get_wip_onhand_report':
            $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
            $limit = 50; $startRow = ($page - 1) * $limit;
            $params = [];
            $conditions = ["l.location_type = 'WIP'", "h.quantity <> 0"];

            if ($currentUser['role'] === 'supervisor') {
                $conditions[] = "l.production_line = ?";
                $params[] = $currentUser['line'];
            }
            
            if (!empty($_GET['search_term'])) {
                $search_term = '%' . $_GET['search_term'] . '%';
                $conditions[] = "(i.sap_no LIKE ? OR i.part_no LIKE ? OR l.location_name LIKE ? OR (SELECT TOP 1 r.model FROM ". ROUTES_TABLE ." r WHERE r.item_id = i.item_id AND r.line = l.production_line) LIKE ?)";
                array_push($params, $search_term, $search_term, $search_term, $search_term);
            }
            $whereClause = "WHERE " . implode(" AND ", $conditions);
            $totalSql = "SELECT COUNT(*) FROM ". ONHAND_TABLE ." h JOIN ". ITEMS_TABLE ." i ON h.parameter_id = i.item_id JOIN ". LOCATIONS_TABLE ." l ON h.location_id = l.location_id {$whereClause}";
            $totalStmt = $pdo->prepare($totalSql);
            $totalStmt->execute($params);
            $total = (int)$totalStmt->fetchColumn();
            $dataSql = "
                WITH NumberedRows AS (
                    SELECT
                        i.item_id, h.location_id, l.location_name, i.sap_no, i.part_no, i.part_description,
                        (
                            SELECT STUFF((
                                SELECT DISTINCT ', ' + r.model FROM " . ROUTES_TABLE . " r
                                WHERE r.item_id = i.item_id AND r.line = l.production_line FOR XML PATH('')), 1, 2, '')
                        ) AS model,
                        ISNULL(h.quantity, 0) as quantity,
                        ROW_NUMBER() OVER (ORDER BY l.location_name, i.sap_no) as RowNum
                    FROM ". ONHAND_TABLE ." h
                    JOIN ". ITEMS_TABLE ." i ON h.parameter_id = i.item_id
                    JOIN ". LOCATIONS_TABLE ." l ON h.location_id = l.location_id
                    {$whereClause}
                )
                SELECT item_id, location_id, location_name, sap_no, part_no, part_description, model, quantity
                FROM NumberedRows WHERE RowNum > ? AND RowNum <= ?
            ";
            $dataStmt = $pdo->prepare($dataSql);
            $paramIndex = 1;
            foreach ($params as $param) { $dataStmt->bindValue($paramIndex++, $param); }
            $dataStmt->bindValue($paramIndex++, $startRow, PDO::PARAM_INT);
            $dataStmt->bindValue($paramIndex++, $startRow + $limit, PDO::PARAM_INT);
            $dataStmt->execute();
            $data = $dataStmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode(['success' => true, 'data' => $data, 'total' => $total, 'page' => $page]);
            break;

        case 'get_wip_report_by_lot':
            $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
            $limit = 50; $startRow = ($page - 1) * $limit;
            $params = [];
            $conditions = ["t.reference_id IS NOT NULL", "t.reference_id != ''"];
            
            if ($currentUser['role'] === 'supervisor') {
                $conditions[] = "l.production_line = ?";
                $params[] = $currentUser['line'];
            }
            
            if (!empty($_GET['search_term'])) {
                $search_term = '%' . $_GET['search_term'] . '%';
                $conditions[] = "(i.sap_no LIKE ? OR i.part_no LIKE ? OR t.reference_id LIKE ? OR l.location_name LIKE ? OR (SELECT STUFF((SELECT DISTINCT ', ' + r.model FROM ". ROUTES_TABLE ." r WHERE r.item_id = i.item_id FOR XML PATH('')), 1, 2, '')) LIKE ?)";
                array_push($params, $search_term, $search_term, $search_term, $search_term, $search_term);
            }
            
            if (!empty($_GET['startDate'])) {
                $conditions[] = "DATEADD(HOUR, -8, t.transaction_timestamp) >= ?";
                $params[] = $_GET['startDate'];
            }
            if (!empty($_GET['endDate'])) {
                $conditions[] = "DATEADD(HOUR, -8, t.transaction_timestamp) < DATEADD(day, 1, ?)";
                $params[] = $_GET['endDate'];
            }

            $whereClause = "WHERE " . implode(" AND ", $conditions);
            $baseQuery = "
                SELECT
                    t.parameter_id, t.reference_id as lot_no,
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
                    (
                        SELECT STUFF((
                            SELECT DISTINCT ', ' + r.model FROM " . ROUTES_TABLE . " r
                            WHERE r.item_id = i.item_id FOR XML PATH('')), 1, 2, '')
                    ) AS model,
                    w.lot_no, ISNULL(w.total_in, 0) as total_in,
                    ISNULL(w.total_out, 0) as total_out,
                    (ISNULL(w.total_in, 0) - ISNULL(w.total_out, 0)) as on_hand_by_lot
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
            $paramIndex = 1;
            foreach ($params as $param) { $dataStmt->bindValue($paramIndex++, $param); }
            $dataStmt->bindValue($paramIndex++, $startRow, PDO::PARAM_INT);
            $dataStmt->bindValue($paramIndex++, $startRow + $limit, PDO::PARAM_INT);
            $dataStmt->execute();
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
            $start_time = $input['start_time'] ?? null;
            $end_time = $input['end_time'] ?? null;

            if (empty($log_date)) {
                throw new Exception("Log Date is required.");
            }

            $time_to_use = $end_time ?: date('H:i:s');
            $timestamp = $log_date . ' ' . $time_to_use;
            // <== สิ้นสุดการแก้ไข

            if (empty($item_id) || empty($location_id) || !is_numeric($quantity) || $quantity <= 0 || empty($count_type) || empty($log_date)) {
                 throw new Exception("Invalid data provided for production logging. (Item, Location, Qty, Type, and Date are required)");
            }

            $pdo->beginTransaction();
            $prod_transaction_type = 'PRODUCTION_' . strtoupper($count_type);
            $prodSql = "INSERT INTO " . TRANSACTIONS_TABLE . " (parameter_id, quantity, transaction_type, to_location_id, created_by_user_id, notes, reference_id, transaction_timestamp, start_time, end_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
            $prodStmt = $pdo->prepare($prodSql);
            $prodStmt->execute([$item_id, $quantity, $prod_transaction_type, $location_id, $currentUser['id'], $notes, $lot_no, $timestamp, $start_time, $end_time]); // ใช้ $timestamp
            
            $parent_transaction_id = $pdo->lastInsertId();

            if (in_array(strtoupper($count_type), ['FG', 'NG', 'SCRAP'])) {
                $bomSql = "SELECT component_item_id, quantity_required FROM " . BOM_TABLE . " WHERE fg_item_id = ?";
                $bomStmt = $pdo->prepare($bomSql);
                $bomStmt->execute([$item_id]);
                $components = $bomStmt->fetchAll(PDO::FETCH_ASSOC);

                if (!empty($components)) {
                    $consumeSql = "INSERT INTO " . TRANSACTIONS_TABLE . " (parameter_id, quantity, transaction_type, from_location_id, created_by_user_id, notes, reference_id, transaction_timestamp, start_time, end_time) VALUES (?, ?, 'CONSUMPTION', ?, ?, ?, ?, ?, ?, ?)";
                    $consumeStmt = $pdo->prepare($consumeSql);

                    foreach ($components as $comp) {
                        $qty_to_consume = bcmul($quantity, $comp['quantity_required'], 6); 
                        $component_item_id = $comp['component_item_id'];

                        $consume_note = "Auto-consumed for production ID: {$parent_transaction_id}";
                        // <== [แก้ไข] ใช้ $timestamp เดียวกันกับ Parent
                        $consumeStmt->execute([$component_item_id, -$qty_to_consume, $location_id, $currentUser['id'], $consume_note, $lot_no, $timestamp, $start_time, $end_time]);
                        
                        updateOnhandBalance($pdo, $component_item_id, $location_id, -$qty_to_consume);
                    }
                }
            }

            updateOnhandBalance($pdo, $item_id, $location_id, $quantity);

            $pdo->commit();
            logAction($pdo, $currentUser['username'], 'PRODUCTION LOG', $item_id, "Type: {$count_type}, Qty: {$quantity}, Location: {$location_id}, Lot: {$lot_no}");
            echo json_encode(['success' => true, 'message' => 'Production logged successfully.']);
            break;

        case 'get_transaction_details':
            // ... (โค้ดส่วนนี้ไม่มีการกรองด้วย timestamp จึงไม่ต้องแก้ไข) ...
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

            $stmt = $pdo->prepare("SELECT * FROM " . TRANSACTIONS_TABLE . " WITH (UPDLOCK) WHERE transaction_id = ?");
            $stmt->execute([$transaction_id]);
            $old_transaction = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$old_transaction) throw new Exception("Original transaction not found.");

            if (strpos($old_transaction['transaction_type'], 'PRODUCTION_') === 0) {
                updateOnhandBalance($pdo, $old_transaction['parameter_id'], $old_transaction['to_location_id'], -$old_transaction['quantity']);

                $note_to_find = "Auto-consumed for production ID: " . $transaction_id;
                $getConsumeSql = "SELECT parameter_id, quantity, from_location_id FROM " . TRANSACTIONS_TABLE . " WHERE notes = ?";
                $getConsumeStmt = $pdo->prepare($getConsumeSql);
                $getConsumeStmt->execute([$note_to_find]);
                $consumed_items = $getConsumeStmt->fetchAll(PDO::FETCH_ASSOC);

                foreach ($consumed_items as $item) {
                    $location_to_revert = $item['from_location_id'] ?: $old_transaction['to_location_id'];
                    updateOnhandBalance($pdo, $item['parameter_id'], $location_to_revert, -$item['quantity']);
                }
                
                $deleteConsumeSql = "DELETE FROM " . TRANSACTIONS_TABLE . " WHERE notes = ?";
                $deleteConsumeStmt = $pdo->prepare($deleteConsumeSql);
                $deleteConsumeStmt->execute([$note_to_find]);

                $new_quantity = ($input['quantity'] ?? '0');
                $new_location_id = (int)($input['location_id'] ?? 0);
                $new_lot_no = $input['lot_no'] ?? null;
                $new_notes = $input['notes'] ?? null;
                $new_log_date = $input['log_date'] ?? null;
                $new_start_time = $input['start_time'] ?? null;
                $new_end_time = $input['end_time'] ?? null;

                if (empty($new_log_date)) {
                    throw new Exception("Log Date is required for update.");
                }
                
                $time_to_use = $new_end_time ?: substr($old_transaction['transaction_timestamp'], 11, 8);
                $new_timestamp = $new_log_date . ' ' . $time_to_use;

                $new_count_type = strtoupper($input['count_type'] ?? '');
                $new_transaction_type = 'PRODUCTION_' . $new_count_type;

                $updateSql = "UPDATE " . TRANSACTIONS_TABLE . " SET quantity=?, to_location_id=?, reference_id=?, notes=?, transaction_type=?, transaction_timestamp=?, start_time=?, end_time=? WHERE transaction_id=?";
                $updateStmt = $pdo->prepare($updateSql);
                $updateStmt->execute([$new_quantity, $new_location_id, $new_lot_no, $new_notes, $new_transaction_type, $new_timestamp, $new_start_time, $new_end_time, $transaction_id]); // ใช้ $new_timestamp

                updateOnhandBalance($pdo, $old_transaction['parameter_id'], $new_location_id, $new_quantity);
                
                if (in_array($new_count_type, ['FG', 'NG', 'SCRAP'])) {
                    $bomSql = "SELECT component_item_id, quantity_required FROM " . BOM_TABLE . " WHERE fg_item_id = ?";
                    $bomStmt = $pdo->prepare($bomSql);
                    $bomStmt->execute([$old_transaction['parameter_id']]);
                    $components = $bomStmt->fetchAll(PDO::FETCH_ASSOC);

                    if (!empty($components)) {
                        $consumeSql = "INSERT INTO " . TRANSACTIONS_TABLE . " (parameter_id, quantity, transaction_type, from_location_id, created_by_user_id, notes, reference_id, transaction_timestamp, start_time, end_time) VALUES (?, ?, 'CONSUMPTION', ?, ?, ?, ?, ?, ?, ?)";
                        $consumeStmt = $pdo->prepare($consumeSql);
                        $consume_note = "Auto-consumed for production ID: {$transaction_id}";

                        foreach ($components as $comp) {
                            $qty_to_consume = bcmul($new_quantity, $comp['quantity_required'], 6);
                            // <== [แก้ไข] ใช้ $new_timestamp เดียวกันกับ Parent
                            $consumeStmt->execute([$comp['component_item_id'], -$qty_to_consume, $new_location_id, $currentUser['id'], $consume_note, $new_lot_no, $new_timestamp, $new_start_time, $new_end_time]);
                            updateOnhandBalance($pdo, $comp['component_item_id'], $new_location_id, -$qty_to_consume);
                        }
                    }
                }

            } else {
                $old_item_id = $old_transaction['parameter_id'];
                $old_quantity = $old_transaction['quantity'];
                
                if ($old_transaction['transaction_type'] === 'RECEIPT') {
                    updateOnhandBalance($pdo, $old_item_id, $old_transaction['to_location_id'], -$old_quantity);
                } elseif ($old_transaction['transaction_type'] === 'TRANSFER') {
                    updateOnhandBalance($pdo, $old_item_id, $old_transaction['from_location_id'], $old_quantity);
                    updateOnhandBalance($pdo, $old_item_id, $old_transaction['to_location_id'], -$old_quantity);
                }

                $new_quantity = ($input['quantity'] ?? '0');
                $new_lot_no = $input['lot_no'] ?? null;
                $new_notes = $input['notes'] ?? null;
                $new_log_date = $input['log_date'] ?? null;
                $new_log_time = $input['log_time'] ?? date('H:i:s');

                if (empty($new_log_date)) {
                    throw new Exception("Log Date is required for update.");
                }

                $new_timestamp = $new_log_date . ' ' . $new_log_time;   

                $new_to_location_id = null;
                $new_from_location_id = null;

                if ($old_transaction['transaction_type'] === 'TRANSFER') {
                    $new_to_location_id = (int)($input['to_location_id'] ?? 0);
                    $new_from_location_id = (int)($input['from_location_id'] ?? 0);
                } else {
                    $new_to_location_id = (int)($input['location_id'] ?? 0);
                }
                
                if (empty($new_to_location_id)) {
                    throw new Exception("Destination location is required.");
                }
                if ($old_transaction['transaction_type'] === 'TRANSFER' && empty($new_from_location_id)) {
                    throw new Exception("Source location is required for a transfer.");
                }

                $sql = "UPDATE " . TRANSACTIONS_TABLE . " SET quantity=?, from_location_id=?, to_location_id=?, reference_id=?, notes=?, transaction_timestamp=? WHERE transaction_id=?";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$new_quantity, $new_from_location_id ?: null, $new_to_location_id, $new_lot_no, $new_notes, $new_timestamp, $transaction_id]);

                if ($old_transaction['transaction_type'] === 'RECEIPT') {
                    updateOnhandBalance($pdo, $old_item_id, $new_to_location_id, $new_quantity);
                } elseif ($old_transaction['transaction_type'] === 'TRANSFER') {
                    updateOnhandBalance($pdo, $old_item_id, $new_from_location_id, -$new_quantity);
                    updateOnhandBalance($pdo, $old_item_id, $new_to_location_id, $new_quantity);
                }
            }

            $pdo->commit();
            logAction($pdo, $currentUser['username'], 'UPDATE TRANSACTION', $transaction_id, "Updated transaction.");
            echo json_encode(['success' => true, 'message' => 'Transaction updated successfully.']);
            break;

        case 'delete_transaction':
            $pdo->beginTransaction();
            $transaction_id = $input['transaction_id'] ?? 0;
            if (!$transaction_id) throw new Exception("Transaction ID is required.");

            $stmt = $pdo->prepare("SELECT * FROM " . TRANSACTIONS_TABLE . " WITH (UPDLOCK) WHERE transaction_id = ?");
            $stmt->execute([$transaction_id]);
            $transaction = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$transaction) throw new Exception("Transaction not found.");

            if (strpos($transaction['transaction_type'], 'PRODUCTION_') === 0 || $transaction['transaction_type'] === 'RECEIPT') {
                updateOnhandBalance($pdo, $transaction['parameter_id'], $transaction['to_location_id'], -$transaction['quantity']);
            } elseif ($transaction['transaction_type'] === 'TRANSFER') {
                updateOnhandBalance($pdo, $transaction['parameter_id'], $transaction['from_location_id'], $transaction['quantity']);
                updateOnhandBalance($pdo, $transaction['parameter_id'], $transaction['to_location_id'], -$transaction['quantity']);
            }

            if (strpos($transaction['transaction_type'], 'PRODUCTION_') === 0) {
                $note_to_find = "Auto-consumed for production ID: " . $transaction['transaction_id'];
                $getConsumeSql = "SELECT parameter_id, quantity, from_location_id FROM " . TRANSACTIONS_TABLE . " WHERE notes = ?";
                $getConsumeStmt = $pdo->prepare($getConsumeSql);
                $getConsumeStmt->execute([$note_to_find]);
                $consumed_items = $getConsumeStmt->fetchAll(PDO::FETCH_ASSOC);

                foreach ($consumed_items as $item) {
                    $qty_to_revert = -$item['quantity'];
                    $location_to_revert = $item['from_location_id'] ?: $transaction['to_location_id'];
                    updateOnhandBalance($pdo, $item['parameter_id'], $location_to_revert, $qty_to_revert);
                }

                $deleteConsumeSql = "DELETE FROM " . TRANSACTIONS_TABLE . " WHERE notes = ?";
                $deleteConsumeStmt = $pdo->prepare($deleteConsumeSql);
                $deleteConsumeStmt->execute([$note_to_find]);
            }

            $deleteStmt = $pdo->prepare("DELETE FROM " . TRANSACTIONS_TABLE . " WHERE transaction_id = ?");
            $deleteStmt->execute([$transaction_id]);

            $pdo->commit();
            logAction($pdo, $currentUser['username'], 'DELETE TRANSACTION', $transaction_id);
            echo json_encode(['success' => true, 'message' => 'Transaction deleted successfully.']);
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
            
            if (!empty($startDate)) {
                $dateCondition .= " AND DATEADD(HOUR, -8, t.transaction_timestamp) >= ?"; 
                $params[] = $startDate; 
            }
            if (!empty($endDate)) {
                $dateCondition .= " AND DATEADD(HOUR, -8, t.transaction_timestamp) < DATEADD(day, 1, ?)";
                $params[] = $endDate; 
            }
            $inSql = "SELECT transaction_timestamp, transaction_type, quantity 
                        FROM " . TRANSACTIONS_TABLE . " t
                        WHERE parameter_id = ? AND to_location_id = ? AND transaction_type IN ('RECEIPT', 'TRANSFER') {$dateCondition}
                        ORDER BY transaction_timestamp DESC";
            $inStmt = $pdo->prepare($inSql);
            $inStmt->execute($params);
            $in_records = $inStmt->fetchAll(PDO::FETCH_ASSOC);
            
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
                $current_quantity = ($onhandStmt->fetchColumn() ?: '0');

                $variance = $physical_count - $current_quantity;

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

        case 'get_receipt_history_summary':
            $params = [];
            $conditions = ["t.transaction_type IN ('RECEIPT', 'TRANSFER')"];

            if (!empty($_GET['search_term'])) {
                $search_term = '%' . $_GET['search_term'] . '%';
                $conditions[] = "(i.sap_no LIKE ? OR i.part_no LIKE ? OR t.reference_id LIKE ? OR loc_to.location_name LIKE ? OR loc_from.location_name LIKE ?)";
                array_push($params, $search_term, $search_term, $search_term, $search_term, $search_term);
            }
            
            if (!empty($_GET['startDate'])) { 
                $conditions[] = "CAST(DATEADD(HOUR, -8, t.transaction_timestamp) AS DATE) >= ?";
                $params[] = $_GET['startDate']; 
            }
            if (!empty($_GET['endDate'])) { 
                $conditions[] = "CAST(DATEADD(HOUR, -8, t.transaction_timestamp) AS DATE) <= ?";
                $params[] = $_GET['endDate']; 
            }

            $whereClause = "WHERE " . implode(" AND ", $conditions);

            // Query for Summary
            $summarySql = "
                SELECT 
                    i.sap_no, i.part_no, t.transaction_type, 
                    SUM(t.quantity) as total_quantity
                FROM " . TRANSACTIONS_TABLE . " t
                JOIN " . ITEMS_TABLE . " i ON t.parameter_id = i.item_id
                LEFT JOIN " . LOCATIONS_TABLE . " loc_to ON t.to_location_id = loc_to.location_id
                LEFT JOIN " . LOCATIONS_TABLE . " loc_from ON t.from_location_id = loc_from.location_id
                {$whereClause}
                GROUP BY i.sap_no, i.part_no, t.transaction_type
                ORDER BY i.sap_no, i.part_no, t.transaction_type
            ";
            $summaryStmt = $pdo->prepare($summarySql);
            $summaryStmt->execute($params);
            $summary = $summaryStmt->fetchAll(PDO::FETCH_ASSOC);

            // Query for Grand Total
            $grandTotalSql = "
                SELECT 
                    SUM(t.quantity) as total_quantity
                FROM " . TRANSACTIONS_TABLE . " t
                JOIN " . ITEMS_TABLE . " i ON t.parameter_id = i.item_id
                LEFT JOIN " . LOCATIONS_TABLE . " loc_to ON t.to_location_id = loc_to.location_id
                LEFT JOIN " . LOCATIONS_TABLE . " loc_from ON t.from_location_id = loc_from.location_id
                {$whereClause}
            ";
            $grandTotalStmt = $pdo->prepare($grandTotalSql);
            $grandTotalStmt->execute($params);
            $total_quantity = $grandTotalStmt->fetchColumn();
            $grand_total = [['total_quantity' => $total_quantity ?: 0]];

            echo json_encode(['success' => true, 'summary' => $summary, 'grand_total' => $grand_total]);
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