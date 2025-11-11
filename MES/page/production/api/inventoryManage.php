<?php
require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../../auth/check_auth.php';
require_once __DIR__ . '/../../logger.php';
require_once __DIR__ . '/../../components/api/inventory_helpers.php';

header('Content-Type: application/json; charset=utf-8');

function generateShortUUID($length = 8) {
    try {
        $bytes = random_bytes(ceil($length / 2));
        $hex = bin2hex($bytes);
        return substr(strtoupper($hex), 0, $length);
    } catch (Exception $e) {
        // Fallback for environments without random_bytes
        $chars = '0123456789ABCDEF';
        $randomString = '';
        for ($i = 0; $i < $length; $i++) {
            $randomString .= $chars[rand(0, 15)];
        }
        return $randomString;
    }
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
            $from_location_id = $input['from_location_id'] ?? 0; // Will have value if it's a Transfer
            $quantity = $input['quantity'] ?? 0;
            $lot_no = $input['lot_no'] ?? null;
            $notes = $input['notes'] ?? null;
            $log_date = $input['log_date'] ?? null;
            $log_time = $input['log_time'] ?? date('H:i:s');
            $scan_job_id = $input['scan_job_id'] ?? null;

            if (empty($log_date)) { throw new Exception("Log Date is required."); }
            $timestamp = $log_date . ' ' . $log_time;

            if (empty($item_id) || empty($to_location_id) || !is_numeric($quantity) || $quantity <= 0) {
                 throw new Exception("Invalid data provided. Item, Quantity, and Destination are required.");
            }
            if (!empty($from_location_id) && empty($from_location_id)) {
                 throw new Exception("Source location is required for transfer.");
            }
            if (!empty($from_location_id) && $from_location_id == $to_location_id) {
                 throw new Exception("Source and Destination locations cannot be the same for transfer.");
            }


            $pdo->beginTransaction();
            
            try {
                if (!empty($scan_job_id)) {
                    $claimSql = "UPDATE " . SCAN_JOBS_TABLE . " SET is_used = 1 WHERE scan_id = ? AND is_used = 0";
                    $claimStmt = $pdo->prepare($claimSql);
                    $claimStmt->execute([$scan_job_id]);
                    
                    if ($claimStmt->rowCount() === 0) {
                        throw new Exception("SCAN_ALREADY_USED");
                    }
                }

                if (!empty($from_location_id)) { // --- This is the Transfer part ---

                    // 1. Get Location Types
                    $locationTypes = [];
                    $locSql = "SELECT location_id, location_type FROM " . LOCATIONS_TABLE . " WHERE location_id IN (?, ?)";
                    $locStmt = $pdo->prepare($locSql);
                    $locStmt->execute([$from_location_id, $to_location_id]);
                    while ($row = $locStmt->fetch(PDO::FETCH_ASSOC)) {
                        $locationTypes[$row['location_id']] = $row['location_type'];
                    }
                    $from_type = $locationTypes[$from_location_id] ?? null; // Keep for logging if needed
                    $to_type = $locationTypes[$to_location_id] ?? null;

                    // ⭐️ 2. Check if DESTINATION is SHIPPING ⭐️
                    $isTransferToShipping = ($to_type === 'SHIPPING');
                    $transaction_type = $isTransferToShipping ? 'TRANSFER_PENDING_SHIPMENT' : 'TRANSFER';
                    $log_message_detail = ""; // For logging

                    // 3. Update Source Stock (Always do this for transfer)
                    updateOnhandBalance($pdo, $item_id, $from_location_id, -$quantity);

                    // 4. Update Destination Stock (ONLY if NOT transferring to Shipping)
                    if (!$isTransferToShipping) {
                        updateOnhandBalance($pdo, $item_id, $to_location_id, $quantity);
                    } else {
                        $log_message_detail = " (Pending Confirmation)";
                    }

                    // 5. Insert Transaction Log (Use determined $transaction_type)
                    $transSql = "INSERT INTO " . TRANSACTIONS_TABLE . " (parameter_id, quantity, transaction_type, from_location_id, to_location_id, created_by_user_id, notes, reference_id, transaction_timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
                    $transStmt = $pdo->prepare($transSql);
                    $transStmt->execute([$item_id, $quantity, $transaction_type, $from_location_id, $to_location_id, $currentUser['id'], $notes, $lot_no, $timestamp]);

                    // 6. Set Log Type and Message
                    $logType = $isTransferToShipping ? 'PENDING SHIPMENT' : 'STOCK TRANSFER';
                    $message = $isTransferToShipping ? 'Transfer initiated, awaiting shipment confirmation.' : 'Stock transferred successfully.';
                    $logDetail = "Qty: {$quantity}, From: {$from_location_id}, To: {$to_location_id}{$log_message_detail}";

                } else { // --- This is the Receipt part (remains unchanged) ---
                    updateOnhandBalance($pdo, $item_id, $to_location_id, $quantity);
                    $transSql = "INSERT INTO " . TRANSACTIONS_TABLE . " (parameter_id, quantity, transaction_type, to_location_id, created_by_user_id, notes, reference_id, transaction_timestamp) VALUES (?, ?, 'RECEIPT', ?, ?, ?, ?, ?)";
                    $transStmt = $pdo->prepare($transSql);
                    $transStmt->execute([$item_id, $quantity, $to_location_id, $currentUser['id'], $notes, $lot_no, $timestamp]);
                    $message = 'Stock receipt logged successfully.';
                    $logType = 'STOCK_IN';
                    $logDetail = "Qty: {$quantity}, To: {$to_location_id}, Lot: {$lot_no}";
                }

                $pdo->commit();
                logAction($pdo, $currentUser['username'], $logType, $item_id, $logDetail);
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
            
            $default_limit = ($action === 'get_all_transactions') ? 50 : 25;
            $limit = $isExport ? 10000 : 50;
            $offset = ($page - 1) * $limit;
            
            $params = [];
            $conditions = [];

            // (Logic การกรอง Role ที่เราทำไว้)
            if ($action === 'get_receipt_history' || $action === 'get_production_history') {
                $user_filter_username = $_GET['user_filter'] ?? null;
                if ($currentUser['role'] === 'admin' || $currentUser['role'] === 'creator') {
                    // Admin/Creator: No conditions
                } else if ($currentUser['role'] === 'supervisor') {
                    $supervisorConditions = [];
                    $supervisorConditions[] = "loc.production_line = ?";
                    $params[] = $currentUser['line'];
                    if (!empty($user_filter_username)) {
                        $supervisorConditions[] = "u.username = ?";
                        $params[] = $user_filter_username;
                    }
                    $conditions[] = "(" . implode(" OR ", $supervisorConditions) . ")";
                } else {
                    if (!empty($user_filter_username)) {
                        $conditions[] = "u.username = ?";
                        $params[] = $user_filter_username;
                    }
                }
            } else {
                if ($currentUser['role'] === 'supervisor') {
                    $conditions[] = "loc.production_line = ?";
                    $params[] = $currentUser['line'];
                }
                if (!empty($_GET['user_filter'])) {
                    $conditions[] = "u.username = ?";
                    $params[] = $_GET['user_filter'];
                }
            }
            
            // (เงื่อนไข Type)
            if ($action === 'get_receipt_history') $conditions[] = "t.transaction_type IN ('RECEIPT', 'TRANSFER', 'TRANSFER_PENDING_SHIPMENT', 'SHIPPED')";
            if ($action === 'get_production_history') $conditions[] = "t.transaction_type LIKE 'PRODUCTION_%'";
            
            // 🛑 [START] โค้ด Smart Search ใหม่
            if (isset($_GET['search_terms']) && is_array($_GET['search_terms'])) {
                $search_terms = $_GET['search_terms'];
                foreach ($search_terms as $term) {
                    if (empty($term)) continue;
                    $search_like = '%' . $term . '%';
                    
                    $term_conditions = [];
                    $term_conditions[] = "i.sap_no LIKE ?";
                    $term_conditions[] = "i.part_no LIKE ?";
                    $term_conditions[] = "t.reference_id LIKE ?";
                    $term_conditions[] = "loc.location_name LIKE ?";
                    $term_conditions[] = "loc.production_line LIKE ?"; // (ที่เราเพิ่มไว้)
                    $term_conditions[] = "(SELECT TOP 1 r.model FROM ". ROUTES_TABLE ." r WHERE r.item_id = t.parameter_id AND r.line = loc.production_line) LIKE ?";
                    
                    array_push($params, $search_like, $search_like, $search_like, $search_like, $search_like, $search_like);
                    
                    $conditions[] = "(" . implode(" OR ", $term_conditions) . ")";
                }
            }
            // 🛑 [END] โค้ด Smart Search ใหม่

            if (!empty($_GET['count_type']) && $action === 'get_production_history') {
                $conditions[] = "t.transaction_type = ?";
                $params[] = 'PRODUCTION_' . $_GET['count_type'];
            }
            if (!empty($_GET['startDate'])) {
                $conditions[] = "CAST(DATEADD(HOUR, -8, t.transaction_timestamp) AS DATE) >= ?";
                $params[] = $_GET['startDate'];
            }
            if (!empty($_GET['endDate'])) {
                $conditions[] = "CAST(DATEADD(HOUR, -8, t.transaction_timestamp) AS DATE) <= ?";
                $params[] = $_GET['endDate'];
            }

            // --- ส่วนการดึงข้อมูล (เหมือนเดิม) ---
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
                    t.transaction_id, t.transaction_timestamp, t.transaction_type, i.sap_no, i.part_no, 
                    i.part_description,
                    t.quantity,
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
            
            $conditions = []; $base_params = [];

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

            if (isset($_GET['search_terms']) && is_array($_GET['search_terms'])) {
                $search_terms = $_GET['search_terms'];
                foreach ($search_terms as $term) {
                    if (empty($term)) continue;
                    $search_like = '%' . $term . '%';
                    
                    $term_conditions = [];
                    $term_conditions[] = "i.sap_no LIKE ?";
                    $term_conditions[] = "i.part_no LIKE ?";
                    $term_conditions[] = "i.part_description LIKE ?";
                    
                    array_push($base_params, $search_like, $search_like, $search_like);
                    
                    $conditions[] = "(" . implode(" OR ", $term_conditions) . ")";
                }
            }
            $itemWhereClause = !empty($conditions) ? "WHERE " . implode(" AND ", $conditions) : "";

             $totalSql = "
                SELECT COUNT(DISTINCT i.item_id)
                FROM " . ITEMS_TABLE . " i
                WHERE EXISTS (
                    SELECT 1
                    FROM " . ONHAND_TABLE . " h
                    JOIN " . LOCATIONS_TABLE . " l ON h.location_id = l.location_id
                    WHERE h.parameter_id = i.item_id
                    AND (l.location_type IS NULL OR l.location_type != 'SHIPPING')
                    AND h.quantity <> 0
                )
                " . (!empty($itemWhereClause) ? " AND (" . implode(" AND ", $conditions) . ")" : "") . "
            ";
            $totalStmt = $pdo->prepare($totalSql);
            $totalStmt->execute($base_params);
            $total = (int)$totalStmt->fetchColumn();

            $dataSql = "
                WITH FilteredItems AS (
                    SELECT item_id, sap_no, part_no, part_description
                    FROM " . ITEMS_TABLE . " i
                    {$itemWhereClause}
                ),
                ItemGroup AS (
                    SELECT
                        fi.item_id, fi.sap_no, fi.part_no, fi.part_description,
                        SUM(CASE WHEN (l.location_type IS NULL OR l.location_type != 'SHIPPING') THEN ISNULL(h.quantity, 0) ELSE 0 END) as total_onhand,
                        STUFF((
                            SELECT ', ' + r.model FROM " . ROUTES_TABLE . " r
                            WHERE r.item_id = fi.item_id ORDER BY r.model FOR XML PATH('')
                        ), 1, 2, '') AS used_models
                    FROM FilteredItems fi
                    LEFT JOIN " . ONHAND_TABLE . " h ON fi.item_id = h.parameter_id
                    LEFT JOIN " . LOCATIONS_TABLE . " l ON h.location_id = l.location_id
                    GROUP BY fi.item_id, fi.sap_no, fi.part_no, fi.part_description
                ),
                NumberedRows AS (
                    SELECT *, ROW_NUMBER() OVER (ORDER BY sap_no) as RowNum
                    FROM ItemGroup
                    WHERE total_onhand <> 0
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

            if (isset($_GET['search_terms']) && is_array($_GET['search_terms'])) {
                $search_terms = $_GET['search_terms'];
                foreach ($search_terms as $term) {
                    if (empty($term)) continue;
                    $search_like = '%' . $term . '%';
                    
                    $term_conditions = [];
                    $term_conditions[] = "i.sap_no LIKE ?";
                    $term_conditions[] = "i.part_no LIKE ?";
                    $term_conditions[] = "l.location_name LIKE ?";
                    $term_conditions[] = "l.production_line LIKE ?"; // (เพิ่ม)
                    $term_conditions[] = "(SELECT TOP 1 r.model FROM ". ROUTES_TABLE ." r WHERE r.item_id = i.item_id AND r.line = l.production_line) LIKE ?";
                    
                    array_push($params, $search_like, $search_like, $search_like, $search_like, $search_like);
                    
                    $conditions[] = "(" . implode(" OR ", $term_conditions) . ")";
                }
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

            $conditions = ["l.location_type IN ('WIP', 'STORE', 'WAREHOUSE')", "h.quantity <> 0"];

            if ($currentUser['role'] === 'supervisor') {
                 $conditions[] = "( (l.location_type = 'WIP' AND l.production_line = ?) OR l.location_type IN ('STORE', 'WAREHOUSE') )";
                 $params[] = $currentUser['line'];
            }

            if (isset($_GET['search_terms']) && is_array($_GET['search_terms'])) {
                $search_terms = $_GET['search_terms'];
                foreach ($search_terms as $term) {
                    if (empty($term)) continue;
                    $search_like = '%' . $term . '%';
                    
                    $term_conditions = [];
                    $term_conditions[] = "i.sap_no LIKE ?";
                    $term_conditions[] = "i.part_no LIKE ?";
                    $term_conditions[] = "l.location_name LIKE ?";
                    $term_conditions[] = "l.production_line LIKE ?";
                    $term_conditions[] = "(SELECT TOP 1 r.model FROM ". ROUTES_TABLE ." r WHERE r.item_id = i.item_id AND r.line = l.production_line) LIKE ?";
                    
                    array_push($params, $search_like, $search_like, $search_like, $search_like, $search_like);
                    
                    $conditions[] = "(" . implode(" OR ", $term_conditions) . ")";
                }
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

            if (isset($_GET['search_terms']) && is_array($_GET['search_terms'])) {
                $search_terms = $_GET['search_terms'];
                foreach ($search_terms as $term) {
                    if (empty($term)) continue;
                    $search_like = '%' . $term . '%';
                    
                    $term_conditions = [];
                    $term_conditions[] = "i.sap_no LIKE ?";
                    $term_conditions[] = "i.part_no LIKE ?";
                    $term_conditions[] = "t.reference_id LIKE ?";
                    $term_conditions[] = "l.location_name LIKE ?";
                    $term_conditions[] = "l.production_line LIKE ?";
                    $term_conditions[] = "(SELECT STUFF((SELECT DISTINCT ', ' + r.model FROM ". ROUTES_TABLE ." r WHERE r.item_id = i.item_id FOR XML PATH('')), 1, 2, '')) LIKE ?";
                    
                    array_push($params, $search_like, $search_like, $search_like, $search_like, $search_like, $search_like);
                    
                    $conditions[] = "(" . implode(" OR ", $term_conditions) . ")";
                }
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

            if (empty($item_id) || empty($location_id) || !is_numeric($quantity) || $quantity <= 0 || empty($count_type) || empty($log_date)) {
                 throw new Exception("Invalid data provided for production logging. (Item, Location, Qty, Type, and Date are required)");
            }
            try {
                $sql = "EXEC dbo." . SP_EXECUTE_PRODUCTION . " 
                            @item_id = ?, @location_id = ?, @quantity = ?, @count_type = ?,
                            @lot_no = ?, @notes = ?, @timestamp = ?, @start_time = ?, @end_time = ?,
                            @user_id = ?, @username = ?";
                
                $stmt = $pdo->prepare($sql);
                
                $stmt->execute([
                    $item_id,
                    $location_id,
                    $quantity,
                    $count_type,
                    $lot_no,
                    $notes,
                    $timestamp,
                    $start_time,
                    $end_time,
                    $currentUser['id'],
                    $currentUser['username']
                ]);
                echo json_encode(['success' => true, 'message' => 'Production logged successfully.']);
            
            } catch (Exception $e) {
                http_response_code(500);
                throw new Exception("Database Transaction Failed: " . $e->getMessage());
            }
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
            try { // (เพิ่ม try/catch หุ้ม)
                $transaction_id = $input['transaction_id'] ?? 0;
                if (!$transaction_id) throw new Exception("Transaction ID is required.");

                // 🛑 === [START] ตรวจสอบสิทธิ์ (Authorization) === 🛑
                $stmt = $pdo->prepare("SELECT created_by_user_id FROM " . TRANSACTIONS_TABLE . " WHERE transaction_id = ?");
                $stmt->execute([$transaction_id]);
                $owner_user_id = $stmt->fetchColumn();

                if (!$owner_user_id) {
                    throw new Exception("Original transaction not found.");
                }

                $is_admin_or_supervisor = hasRole(['admin', 'supervisor', 'creator']);
                $is_owner = ($currentUser['id'] == $owner_user_id);

                if (!$is_admin_or_supervisor && !$is_owner) {
                    // ถ้าไม่ใช่ Admin/Supervisor และ ไม่ใช่เจ้าของ -> ปฏิเสธ
                    http_response_code(403);
                    echo json_encode(['success' => false, 'message' => 'Unauthorized: You can only update your own records.']);
                    $pdo->rollBack();
                    exit;
                }
                // 🛑 === [END] ตรวจสอบสิทธิ์ === 🛑

                // (ดึงข้อมูล $old_transaction หลังจากเช็คสิทธิ์แล้ว)
                $stmt = $pdo->prepare("SELECT * FROM " . TRANSACTIONS_TABLE . " WITH (UPDLOCK) WHERE transaction_id = ?");
                $stmt->execute([$transaction_id]);
                $old_transaction = $stmt->fetch(PDO::FETCH_ASSOC);
                if (!$old_transaction) throw new Exception("Original transaction not found (lock failed).");

                // --- (ส่วนที่เหลือคือโค้ดเดิมของคุณ) ---
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
                    $updateStmt->execute([$new_quantity, $new_location_id, $new_lot_no, $new_notes, $new_transaction_type, $new_timestamp, $new_start_time, $new_end_time, $transaction_id]);

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
                
            } catch (Exception $e) { // (เพิ่ม catch)
                if ($pdo->inTransaction()) $pdo->rollBack();
                throw $e; 
            }
            break;

        case 'delete_transaction':
             $pdo->beginTransaction();
            try { // (เพิ่ม try)
                $transaction_id = $input['transaction_id'] ?? 0;
                if (!$transaction_id) throw new Exception("Transaction ID is required.");

                // 🛑 === [START] ตรวจสอบสิทธิ์ (Authorization) === 🛑
                $stmt = $pdo->prepare("SELECT created_by_user_id FROM " . TRANSACTIONS_TABLE . " WHERE transaction_id = ?");
                $stmt->execute([$transaction_id]);
                $owner_user_id = $stmt->fetchColumn();

                if (!$owner_user_id) {
                    throw new Exception("Transaction not found.");
                }

                $is_admin_or_supervisor = hasRole(['admin', 'supervisor', 'creator']);
                $is_owner = ($currentUser['id'] == $owner_user_id);

                if (!$is_admin_or_supervisor && !$is_owner) {
                    // ถ้าไม่ใช่ Admin/Supervisor และ ไม่ใช่เจ้าของ -> ปฏิเสธ
                    http_response_code(403);
                    echo json_encode(['success' => false, 'message' => 'Unauthorized: You can only delete your own records.']);
                    $pdo->rollBack();
                    exit;
                }
                // 🛑 === [END] ตรวจสอบสิทธิ์ === 🛑
                
                // (ดึงข้อมูล $transaction หลังจากเช็คสิทธิ์แล้ว)
                $stmt = $pdo->prepare("SELECT * FROM " . TRANSACTIONS_TABLE . " WITH (UPDLOCK) WHERE transaction_id = ?");
                $stmt->execute([$transaction_id]);
                $transaction = $stmt->fetch(PDO::FETCH_ASSOC);
                if (!$transaction) throw new Exception("Transaction not found (lock failed).");

                // --- (ส่วนที่เหลือคือโค้ดเดิมของคุณ) ---
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

            } catch (Exception $e) { // (เพิ่ม catch)
                if ($pdo->inTransaction()) $pdo->rollBack();
                throw $e;
            }
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
                WHERE h.parameter_id = ?
                  AND h.quantity <> 0
                  AND (l.location_type IS NULL OR l.location_type != 'SHIPPING') -- เงื่อนไขนี้ถูกต้องแล้ว
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
             $conditions = ["t.transaction_type IN ('RECEIPT', 'TRANSFER', 'TRANSFER_PENDING_SHIPMENT', 'SHIPPED')"]; // [แก้ไข] เพิ่ม Type ให้ครบ

            if (isset($_GET['search_terms']) && is_array($_GET['search_terms'])) {
                $search_terms = $_GET['search_terms'];
                foreach ($search_terms as $term) {
                    if (empty($term)) continue;
                    $search_like = '%' . $term . '%';
                    
                    $term_conditions = [];
                    $term_conditions[] = "i.sap_no LIKE ?";
                    $term_conditions[] = "i.part_no LIKE ?";
                    $term_conditions[] = "t.reference_id LIKE ?";
                    $term_conditions[] = "loc.location_name LIKE ?";
                    $term_conditions[] = "loc.production_line LIKE ?";
                    $term_conditions[] = "(SELECT TOP 1 r.model FROM ". ROUTES_TABLE ." r WHERE r.item_id = t.parameter_id AND r.line = loc.production_line) LIKE ?";
                    
                    array_push($params, $search_like, $search_like, $search_like, $search_like, $search_like, $search_like);
                    
                    $conditions[] = "(" . implode(" OR ", $term_conditions) . ")";
                }
            }

            if (!empty($_GET['startDate'])) {
                $conditions[] = "CAST(DATEADD(HOUR, -8, t.transaction_timestamp) AS DATE) >= ?";
                $params[] = $_GET['startDate'];
            }
            if (!empty($_GET['endDate'])) {
                $conditions[] = "CAST(DATEADD(HOUR, -8, t.transaction_timestamp) AS DATE) <= ?";
                $params[] = $_GET['endDate'];
            }
            
            // (เพิ่มการกรอง Role เข้ามาใน Summary ด้วย)
            if ($currentUser['role'] === 'supervisor') {
                $conditions[] = "loc.production_line = ?";
                $params[] = $currentUser['line'];
            }

            $whereClause = "WHERE " . implode(" AND ", $conditions);

            // [แก้ไข] เปลี่ยน Logic การ JOIN ให้เหมือนตารางหลัก (get_receipt_history)
            $baseFromJoin = "
                FROM " . TRANSACTIONS_TABLE . " t
                JOIN " . ITEMS_TABLE . " i ON t.parameter_id = i.item_id
                LEFT JOIN " . LOCATIONS_TABLE . " loc ON ISNULL(t.to_location_id, t.from_location_id) = loc.location_id
                LEFT JOIN " . USERS_TABLE . " u ON t.created_by_user_id = u.id 
                {$whereClause}
            ";

            // Query for Summary
            $summarySql = "
                SELECT
                    i.sap_no, i.part_no, t.transaction_type,
                    SUM(t.quantity) as total_quantity
                {$baseFromJoin}
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
                {$baseFromJoin}
            ";
            $grandTotalStmt = $pdo->prepare($grandTotalSql);
            $grandTotalStmt->execute($params);
            $total_quantity = $grandTotalStmt->fetchColumn();
            $grand_total = [['total_quantity' => $total_quantity ?: 0]];

            echo json_encode(['success' => true, 'summary' => $summary, 'grand_total' => $grand_total]);
            break;

        case 'get_production_summary':
            $params = [];
            $conditions = ["t.transaction_type LIKE 'PRODUCTION_%'"]; 

            if (isset($_GET['search_terms']) && is_array($_GET['search_terms'])) {
                $search_terms = $_GET['search_terms'];
                foreach ($search_terms as $term) {
                    if (empty($term)) continue;
                    $search_like = '%' . $term . '%';
                    
                    $term_conditions = [];
                    $term_conditions[] = "i.sap_no LIKE ?";
                    $term_conditions[] = "i.part_no LIKE ?";
                    $term_conditions[] = "t.reference_id LIKE ?";
                    $term_conditions[] = "loc.location_name LIKE ?";
                    $term_conditions[] = "loc.production_line LIKE ?";
                    $term_conditions[] = "(SELECT TOP 1 r.model FROM ". ROUTES_TABLE ." r WHERE r.item_id = t.parameter_id AND r.line = loc.production_line) LIKE ?";
                    
                    array_push($params, $search_like, $search_like, $search_like, $search_like, $search_like, $search_like);
                    
                    $conditions[] = "(" . implode(" OR ", $term_conditions) . ")";
                }
            }
            
            if (!empty($_GET['count_type'])) {
                $conditions[] = "t.transaction_type = ?";
                $params[] = 'PRODUCTION_' . $_GET['count_type'];
            }

            if (!empty($_GET['startDate'])) {
                $conditions[] = "CAST(DATEADD(HOUR, -8, t.transaction_timestamp) AS DATE) >= ?";
                $params[] = $_GET['startDate'];
            }
            if (!empty($_GET['endDate'])) {
                $conditions[] = "CAST(DATEADD(HOUR, -8, t.transaction_timestamp) AS DATE) <= ?";
                $params[] = $_GET['endDate'];
            }
            
            // (เพิ่มการกรอง Role เข้ามาใน Summary ด้วย)
            if ($currentUser['role'] === 'supervisor') {
                $conditions[] = "loc.production_line = ?";
                $params[] = $currentUser['line'];
            }

            $whereClause = "WHERE " . implode(" AND ", $conditions);

            // [แก้ไข] เปลี่ยน Logic การ JOIN ให้เหมือนตารางหลัก (get_production_history)
            $baseFromJoin = "
                FROM " . TRANSACTIONS_TABLE . " t
                JOIN " . ITEMS_TABLE . " i ON t.parameter_id = i.item_id
                LEFT JOIN " . LOCATIONS_TABLE . " loc ON ISNULL(t.to_location_id, t.from_location_id) = loc.location_id
                LEFT JOIN " . USERS_TABLE . " u ON t.created_by_user_id = u.id 
                {$whereClause}
            ";

            // Query for Summary
            $summarySql = "
                SELECT
                    i.sap_no, i.part_no, 
                    REPLACE(t.transaction_type, 'PRODUCTION_', '') as count_type,
                    SUM(t.quantity) as total_quantity
                {$baseFromJoin}
                GROUP BY i.sap_no, i.part_no, REPLACE(t.transaction_type, 'PRODUCTION_', '')
                ORDER BY i.sap_no, i.part_no, count_type
            ";
            $summaryStmt = $pdo->prepare($summarySql);
            $summaryStmt->execute($params);
            $summary = $summaryStmt->fetchAll(PDO::FETCH_ASSOC);

            // Query for Grand Total
            $grandTotalSql = "
                SELECT
                    REPLACE(t.transaction_type, 'PRODUCTION_', '') as count_type,
                    SUM(t.quantity) as total_quantity
                {$baseFromJoin}
                GROUP BY REPLACE(t.transaction_type, 'PRODUCTION_', '')
                ORDER BY count_type
            ";
            $grandTotalStmt = $pdo->prepare($grandTotalSql);
            $grandTotalStmt->execute($params);
            $grand_total = $grandTotalStmt->fetchAll(PDO::FETCH_ASSOC); 

            echo json_encode(['success' => true, 'summary' => $summary, 'grand_total' => $grand_total]);
            break;

        case 'get_pending_shipments':
            // ตรวจสอบสิทธิ์ ผู้ที่ Confirm ได้ (เช่น admin, creator, หรือ role ใหม่)
            if (!hasRole(['admin', 'creator'])) { // <-- ปรับ Role ตามต้องการ
                http_response_code(403);
                echo json_encode(['success' => false, 'message' => 'Unauthorized to view pending shipments.']);
                exit;
            }

            $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
            $limit = 50; // หรือตามต้องการ
            $offset = ($page - 1) * $limit;
            $params = [];
            $conditions = ["t.transaction_type = 'TRANSFER_PENDING_SHIPMENT'"];

            // เพิ่ม Filter ถ้าต้องการ (เช่น Search, Date Range)
            if (!empty($_GET['search_term'])) {
                $search_term = '%' . $_GET['search_term'] . '%';
                $conditions[] = "(i.sap_no LIKE ? OR i.part_no LIKE ? OR loc_from.location_name LIKE ? OR loc_to.location_name LIKE ? OR u.username LIKE ?)";
                array_push($params, $search_term, $search_term, $search_term, $search_term, $search_term);
            }
            if (!empty($_GET['startDate'])) { $conditions[] = "CAST(t.transaction_timestamp AS DATE) >= ?"; $params[] = $_GET['startDate']; }
            if (!empty($_GET['endDate'])) { $conditions[] = "CAST(t.transaction_timestamp AS DATE) <= ?"; $params[] = $_GET['endDate']; }

            $whereClause = "WHERE " . implode(" AND ", $conditions);

            $totalSql = "SELECT COUNT(*) FROM " . TRANSACTIONS_TABLE . " t
                        JOIN " . ITEMS_TABLE . " i ON t.parameter_id = i.item_id
                        LEFT JOIN " . LOCATIONS_TABLE . " loc_from ON t.from_location_id = loc_from.location_id
                        LEFT JOIN " . LOCATIONS_TABLE . " loc_to ON t.to_location_id = loc_to.location_id
                        LEFT JOIN " . USERS_TABLE . " u ON t.created_by_user_id = u.id
                        {$whereClause}";
            $totalStmt = $pdo->prepare($totalSql);
            $totalStmt->execute($params);
            $total = (int)$totalStmt->fetchColumn();

            $dataSql = "
                SELECT
                    t.transaction_id, t.transaction_timestamp, i.sap_no, i.part_no, i.part_description, t.quantity,
                    loc_from.location_name AS from_location,
                    loc_to.location_name AS to_location,
                    u.username AS requested_by, t.notes
                FROM " . TRANSACTIONS_TABLE . " t
                JOIN " . ITEMS_TABLE . " i ON t.parameter_id = i.item_id
                LEFT JOIN " . LOCATIONS_TABLE . " loc_from ON t.from_location_id = loc_from.location_id
                LEFT JOIN " . LOCATIONS_TABLE . " loc_to ON t.to_location_id = loc_to.location_id
                LEFT JOIN " . USERS_TABLE . " u ON t.created_by_user_id = u.id
                {$whereClause}
                ORDER BY t.transaction_timestamp ASC -- เรียงตามเก่าไปใหม่ เพื่อให้ Confirm ตามลำดับ
                OFFSET ? ROWS FETCH NEXT ? ROWS ONLY
            ";
            $dataStmt = $pdo->prepare($dataSql);
            $paramIndex = 1;
            foreach ($params as $param) { $dataStmt->bindValue($paramIndex++, $param); }
            $dataStmt->bindValue($paramIndex++, $offset, PDO::PARAM_INT);
            $dataStmt->bindValue($paramIndex++, $limit, PDO::PARAM_INT);
            $dataStmt->execute();
            $pending_shipments = $dataStmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode(['success' => true, 'data' => $pending_shipments, 'total' => $total, 'page' => $page]);
            break;

        case 'confirm_shipment':
            // ตรวจสอบสิทธิ์ ผู้ที่ Confirm ได้
            if (!hasRole(['admin', 'creator'])) { // <-- ปรับ Role ตามต้องการ
                http_response_code(403);
                echo json_encode(['success' => false, 'message' => 'Unauthorized to confirm shipments.']);
                exit;
            }

            $transaction_ids = $input['transaction_ids'] ?? []; // รับเป็น Array เผื่อ Confirm หลายรายการ
            if (empty($transaction_ids) || !is_array($transaction_ids)) {
                throw new Exception("No valid Transaction IDs provided for confirmation.");
            }

            $pdo->beginTransaction();
            try {
                $confirmed_count = 0;
                // (Optional) เพิ่ม Field สำหรับเก็บข้อมูลการ Confirm
                // ALTER TABLE STOCK_TRANSACTIONS[_TEST] ADD confirmed_by_user_id INT NULL, confirmed_at DATETIME NULL;

                $updateSql = "UPDATE " . TRANSACTIONS_TABLE . "
                            SET transaction_type = 'SHIPPED'
                            -- , confirmed_by_user_id = ?, confirmed_at = GETDATE() -- uncomment ถ้ามี fields นี้
                            WHERE transaction_id = ? AND transaction_type = 'TRANSFER_PENDING_SHIPMENT'";
                $updateStmt = $pdo->prepare($updateSql);

                foreach ($transaction_ids as $tid) {
                    $updateParams = [ $tid ];
                    // if (isset($currentUser['id'])) { array_unshift($updateParams, $currentUser['id']); } // uncomment ถ้ามี field confirmed_by_user_id
                    $updateStmt->execute($updateParams);

                    if ($updateStmt->rowCount() > 0) {
                        $confirmed_count++;
                        // Log การ Confirm แต่ละรายการ
                        logAction($pdo, $currentUser['username'], 'CONFIRM SHIPMENT', $tid);
                    } else {
                        error_log("Failed to confirm shipment for transaction ID: " . $tid . " - Status might not be PENDING or ID invalid.");
                    }
                }

                $pdo->commit();

                if ($confirmed_count > 0) {
                    echo json_encode(['success' => true, 'message' => "Successfully confirmed {$confirmed_count} shipment(s)."]);
                } else {
                    echo json_encode(['success' => false, 'message' => 'No shipments were confirmed. They might have been confirmed already or the IDs were invalid.']);
                }

            } catch (Exception $e) {
                if ($pdo->inTransaction()) {
                    $pdo->rollBack();
                }
                throw $e;
            }
            break;

            case 'check_lot_status':
            $lot_no = $_GET['lot_no'] ?? '';
            $sap_no = $_GET['sap_no'] ?? ''; // (อันนี้อาจจะไม่ต้องการแล้ว แต่เผื่อไว้)
            $scan_id = $_GET['scan_id'] ?? null; // ⭐️ (ใหม่) รับ scan_id มาด้วย

            // --- Logic ใหม่: ตรวจสอบจาก Scan ID ก่อน (ถ้ามี) ---
            if (!empty($scan_id)) {
                $sql = "SELECT is_used, job_data FROM " . SCAN_JOBS_TABLE . " WHERE scan_id = ?";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$scan_id]);
                $job = $stmt->fetch(PDO::FETCH_ASSOC);

                if ($job && $job['is_used'] == 1) {
                    // ⭐️ 1. เจอ Job และ "ถูกใช้ไปแล้ว"
                    // เราต้องไปหาว่าใครใช้ จากตาราง TRANSACTIONS
                    $job_data = json_decode($job['job_data'], true);
                    $lot_to_find = $job_data['lot'] ?? $lot_no; // ใช้ Lot จาก job_data เพื่อความแม่นยำ

                    $transSql = "SELECT TOP 1 t.transaction_timestamp, u.username 
                                 FROM " . TRANSACTIONS_TABLE . " t
                                 LEFT JOIN " . USERS_TABLE . " u ON t.created_by_user_id = u.id
                                 JOIN " . ITEMS_TABLE . " i ON t.parameter_id = i.item_id
                                 WHERE t.reference_id = ? AND i.sap_no = ?
                                 ORDER BY t.transaction_timestamp DESC";
                    $transStmt = $pdo->prepare($transSql);
                    $transStmt->execute([$lot_to_find, $job_data['sap_no'] ?? $sap_no]);
                    $transaction = $transStmt->fetch(PDO::FETCH_ASSOC);
                    
                    echo json_encode([
                        'success' => true, 
                        'status' => 'received', // ⭐️ ส่งสถานะ "รับแล้ว"
                        'details' => $transaction // ส่งข้อมูลคนที่บันทึกไป
                    ]);
                    exit;
                } else if ($job && $job['is_used'] == 0) {
                    // ⭐️ 2. เจอ Job และ "ยังไม่ถูกใช้"
                    echo json_encode(['success' => true, 'status' => 'new']); // ⭐️ ส่งสถานะ "ใหม่"
                    exit;
                }
                // (ถ้าไม่เจอ Job ID เลย -> ปล่อยให้ไปเช็คแบบเดิมด้านล่าง)
            }

            // --- Logic เดิม (Fallback กรณีไม่มี Scan ID) ---
            if (empty($lot_no) || empty($sap_no)) {
                throw new Exception("Lot No and SAP No are required for status check.");
            }
            $itemStmt = $pdo->prepare("SELECT item_id FROM " . ITEMS_TABLE . " WHERE sap_no = ?");
            $itemStmt->execute([$sap_no]);
            $item_id = $itemStmt->fetchColumn();

            if (!$item_id) {
                echo json_encode(['success' => true, 'status' => 'new']);
                exit;
            }

            $sql = "SELECT TOP 1 t.transaction_timestamp, u.username 
                    FROM " . TRANSACTIONS_TABLE . " t
                    LEFT JOIN " . USERS_TABLE . " u ON t.created_by_user_id = u.id
                    WHERE t.parameter_id = ? AND t.reference_id = ?
                    AND t.transaction_type IN ('RECEIPT', 'TRANSFER')
                    ORDER BY t.transaction_timestamp DESC";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$item_id, $lot_no]);
            $transaction = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($transaction) {
                echo json_encode(['success' => true, 'status' => 'received', 'details' => $transaction]);
            } else {
                echo json_encode(['success' => true, 'status' => 'new']);
            }
            break;

        case 'get_locations_for_qr':
            // ตรวจสอบสิทธิ์ (เฉพาะ Admin/Creator)
            if (!hasRole(['admin', 'creator'])) {
                 http_response_code(403);
                 echo json_encode(['success' => false, 'message' => 'Unauthorized.']);
                 exit;
            }
            
            // ดึงข้อมูล Location จากฐานข้อมูล
            $stmt = $pdo->query("SELECT location_id, location_name FROM " . LOCATIONS_TABLE . " WHERE is_active = 1 ORDER BY location_name");
            $locations = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // ส่งข้อมูลกลับเป็น JSON
            echo json_encode(['success' => true, 'locations' => $locations]);
            break;

        case 'get_next_serial':
            $parent_lot = $input['parent_lot'] ?? '';
            if (empty($parent_lot)) {
                throw new Exception("Parent Lot (Lot No.) is required.");
            }

            $sql = "
                MERGE INTO " . LOT_SERIALS_TABLE . " AS T
                USING (SELECT ? AS parent_lot) AS S
                ON (T.parent_lot = S.parent_lot)
                WHEN MATCHED THEN
                    UPDATE SET 
                        T.last_serial = T.last_serial + 1, 
                        T.updated_at = GETDATE()
                WHEN NOT MATCHED THEN
                    INSERT (parent_lot, last_serial, updated_at) 
                    VALUES (S.parent_lot, 1, GETDATE())
                OUTPUT inserted.last_serial;
            ";

            $pdo->beginTransaction();
            try {
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$parent_lot]);
                $new_serial = $stmt->fetchColumn();
                $pdo->commit();
                echo json_encode(['success' => true, 'new_serial_number' => $new_serial]);
            } catch (Exception $e) {
                if ($pdo->inTransaction()) $pdo->rollBack();
                throw $e;
            }
            break;

        case 'create_scan_job':
            // 1. รับข้อมูลจาก label_printer.js
            $jobData = [
                'sap_no' => $input['sap_no'] ?? null,
                'lot' => $input['lot'] ?? null,
                'qty' => $input['qty'] ?? null,
                'from_loc_id' => $input['from_loc_id'] ?? null
            ];

            if (empty($jobData['sap_no']) || empty($jobData['lot']) || empty($jobData['qty'])) {
                throw new Exception("Incomplete job data provided (SAP, Lot, Qty required).");
            }

            // 2. สร้างรหัสสั้นๆ ที่ไม่ซ้ำ (ลอง 5 ครั้ง)
            $scan_id = '';
            $max_tries = 5;
            for ($i = 0; $i < $max_tries; $i++) {
                $scan_id = generateShortUUID(8); // สร้างรหัส 8 ตัว
                $checkStmt = $pdo->prepare("SELECT COUNT(*) FROM " . SCAN_JOBS_TABLE . " WHERE scan_id = ?");
                $checkStmt->execute([$scan_id]);
                if ($checkStmt->fetchColumn() == 0) {
                    break; // ไม่ซ้ำ ใช้ได้
                }
                if ($i === $max_tries - 1) {
                    throw new Exception("Failed to generate a unique Scan ID.");
                }
            }

            // 3. บันทึกข้อมูล (ในรูปแบบ JSON)
            $sql = "INSERT INTO " . SCAN_JOBS_TABLE . " (scan_id, job_data, created_at, is_used) VALUES (?, ?, GETDATE(), 0)";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$scan_id, json_encode($jobData)]);

            // 4. ส่งรหัสสั้นๆ กลับไป
            echo json_encode(['success' => true, 'scan_id' => $scan_id]);
            break;

        // ⭐️ CASE 2: ดึงข้อมูล Job (เมื่อสแกน) ⭐️
        case 'get_scan_job_data':
            $scan_id = $_GET['scan_id'] ?? '';
            if (empty($scan_id)) {
                throw new Exception("Scan ID is required.");
            }

            $sql = "SELECT job_data FROM " . SCAN_JOBS_TABLE . " WHERE scan_id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$scan_id]);
            $job_data_json = $stmt->fetchColumn();

            if ($job_data_json) {
                // (ทางเลือก) อัปเดตว่าใช้แล้ว
                // $updateStmt = $pdo->prepare("UPDATE " . SCAN_JOBS_TABLE . " SET is_used = 1 WHERE scan_id = ?");
                // $updateStmt->execute([$scan_id]);

                // ส่งข้อมูล JSON กลับไปตรงๆ
                echo json_encode(['success' => true, 'data' => json_decode($job_data_json)]);
            } else {
                throw new Exception("Scan ID not found or already used.");
            }
            break;

        case 'get_production_hourly_summary':
            try {
                // 1. ดึง SP name จาก config
                $sp_name = SP_CALC_OEE_HOURLY; // (มาจาก config.php)

                // 2. ดึง Filters (SP นี้ใช้ endDate เป็น 'TargetDate')
                $target_date = $_GET['endDate'] ?? date('Y-m-d');
                $line_filter = $_GET['line'] ?? null; // (เผื่ออนาคต)
                $model_filter = $_GET['model'] ?? null; // (เผื่ออนาคต)

                // 3. เตรียมและเรียก Stored Procedure
                $stmt = $pdo->prepare("EXEC {$sp_name} @TargetDate = ?, @Line = ?, @Model = ?");
                $stmt->bindParam(1, $target_date, PDO::PARAM_STR);
                $stmt->bindParam(2, $line_filter, PDO::PARAM_STR);
                $stmt->bindParam(3, $model_filter, PDO::PARAM_STR);
                
                $stmt->execute();
                $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

                echo json_encode(['success' => true, 'data' => $data]);

            } catch (Exception $e) {
                http_response_code(500);
                echo json_encode(['success' => false, 'message' => $e->getMessage()]);
            }
            break;

        case 'get_production_hourly_counts':
            try {
                $start_date = $_GET['startDate'] ?? date('Y-m-d');
                $target_date = $_GET['endDate'] ?? date('Y-m-d');
                $line_filter = $currentUser['line'] ?? null;
                // [แก้ไข] เปลี่ยนชื่อตัวแปร
                $search_terms_array = $_GET['search_terms'] ?? []; 

                $params = [];
                $conditions = [];
                $production_date_col = "CAST(DATEADD(HOUR, -8, t.transaction_timestamp) AS DATE)";
                $conditions[] = "{$production_date_col} BETWEEN ? AND ?";
                $params[] = $start_date;
                $params[] = $target_date;

                $conditions[] = "t.transaction_type LIKE 'PRODUCTION_%'";

                if ($currentUser['role'] === 'supervisor') {
                    $conditions[] = "l.production_line = ?";
                    $params[] = $line_filter;
                }
                
                if (!empty($search_terms_array) && is_array($search_terms_array)) {
                    foreach ($search_terms_array as $term) {
                        if (empty($term)) continue;
                        $search_like = '%' . $term . '%';
                        
                        $term_conditions = [];
                        $term_conditions[] = "i.sap_no LIKE ?";
                        $term_conditions[] = "i.part_no LIKE ?";
                        $term_conditions[] = "l.location_name LIKE ?";
                        $term_conditions[] = "l.production_line LIKE ?";
                        $term_conditions[] = "r.model LIKE ?";
                        
                        array_push($params, $search_like, $search_like, $search_like, $search_like, $search_like);
                        
                        $conditions[] = "(" . implode(" OR ", $term_conditions) . ")";
                    }
                }

                $whereClause = "WHERE " . implode(" AND ", $conditions);

                // 4. [แก้ไข] Query หลัก (เปลี่ยน r.model เป็น i.part_no)
                $sql = "
                    SELECT 
                        {$production_date_col} AS ProductionDate,
                        DATEPART(hour, t.transaction_timestamp) AS hour_of_day,
                        i.part_no,
                        i.sap_no,
                        
                        SUM(CASE WHEN t.transaction_type = 'PRODUCTION_FG' THEN t.quantity ELSE 0 END) AS Qty_FG,
                        SUM(CASE WHEN t.transaction_type = 'PRODUCTION_HOLD' THEN t.quantity ELSE 0 END) AS Qty_HOLD,
                        SUM(CASE WHEN t.transaction_type = 'PRODUCTION_SCRAP' THEN t.quantity ELSE 0 END) AS Qty_SCRAP

                    FROM 
                        " . TRANSACTIONS_TABLE . " t
                    JOIN 
                        " . ITEMS_TABLE . " i ON t.parameter_id = i.item_id
                    JOIN 
                        " . LOCATIONS_TABLE . " l ON t.to_location_id = l.location_id
                    JOIN 
                        " . ROUTES_TABLE . " r ON t.parameter_id = r.item_id AND l.production_line = r.line
                    {$whereClause}
                    GROUP BY 
                        {$production_date_col},
                        DATEPART(hour, t.transaction_timestamp), 
                        i.part_no,
                        i.sap_no
                    HAVING 
                        SUM(t.quantity) > 0
                    ORDER BY 
                        ProductionDate,
                        hour_of_day, 
                        i.part_no
                ";
                
                $stmt = $pdo->prepare($sql);
                $stmt->execute($params);
                $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

                echo json_encode(['success' => true, 'data' => $data]);

            } catch (Exception $e) {
                http_response_code(500);
                echo json_encode(['success' => false, 'message' => $e->getMessage()]);
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