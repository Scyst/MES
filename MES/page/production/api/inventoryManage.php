<?php
// MES/page/production/api/inventoryManage.php
require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../components/init.php';

header('Content-Type: application/json; charset=utf-8');

function generateShortUUID($length = 8) {
    try {
        $bytes = random_bytes(ceil($length / 2));
        $hex = bin2hex($bytes);
        return substr(strtoupper($hex), 0, $length);
    } catch (Exception $e) {
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
            $locationsStmt = $pdo->query("SELECT location_id, location_name, production_line FROM " . LOCATIONS_TABLE . " WHERE is_active = 1 ORDER BY location_name");
            $locations = $locationsStmt->fetchAll(PDO::FETCH_ASSOC);
            $itemsStmt = $pdo->query("SELECT item_id, sap_no, part_no, part_description FROM " . ITEMS_TABLE . " WHERE is_active = 1 ORDER BY sap_no");
            $items = $itemsStmt->fetchAll(PDO::FETCH_ASSOC);
            $machinesStmt = $pdo->query("SELECT machine_id, machine_name, machine_code, line FROM " . PE_MACHINES_TABLE . " WHERE is_active = 1 ORDER BY machine_name");
            $machines = $machinesStmt->fetchAll(PDO::FETCH_ASSOC);
            $usersStmt = $pdo->query("
                SELECT 
                    u.id, 
                    u.username, 
                    ISNULL(NULLIF(emp.name_th, ''), ISNULL(NULLIF(u.fullname, ''), u.username)) AS fullname, 
                    ISNULL(TS.hc_group, ISNULL(NULLIF(emp.team_group, ''), u.team_group)) AS team_group
                FROM " . USERS_TABLE . " u
                LEFT JOIN dbo.MANPOWER_EMPLOYEES emp ON u.emp_id = emp.emp_id COLLATE Thai_CI_AS
                LEFT JOIN dbo.MANPOWER_TEAM_SETTINGS TS ON emp.department_api = TS.department_api COLLATE Thai_CI_AS
                WHERE u.is_active = 1 AND (emp.emp_id IS NOT NULL OR u.id = " . intval($currentUser['id']) . ")
                ORDER BY ISNULL(NULLIF(emp.name_th, ''), ISNULL(NULLIF(u.fullname, ''), u.username))
            ");
            $users = $usersStmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(['success' => true, 'locations' => $locations, 'items' => $items, 'machines' => $machines, 'users' => $users]);
            break;

        case 'execute_receipt':
            $item_id = $input['item_id'] ?? 0;
            $to_location_id = $input['to_location_id'] ?? 0;
            $from_location_id = $input['from_location_id'] ?? 0;
            
            $quantity = floor((float)($input['quantity'] ?? 0));
            if ($quantity <= 0 && isset($input['confirmed_quantity'])) {
                $quantity = floor((float)($input['confirmed_quantity'] ?? 0));
            }

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

            if (!empty($from_location_id) && $from_location_id > 0) {
                throw new Exception("การโอนย้ายภายในต้องทำผ่านระบบ Transfer Label (พิมพ์ QR) เท่านั้น");
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

                $spStock = $pdo->prepare("EXEC dbo." . SP_UPDATE_ONHAND . " @item_id = ?, @location_id = ?, @quantity_to_change = ?");
                $spStock->execute([$item_id, $to_location_id, $quantity]);
                $transSql = "INSERT INTO " . TRANSACTIONS_TABLE . " (parameter_id, quantity, transaction_type, to_location_id, created_by_user_id, notes, reference_id, transaction_timestamp) VALUES (?, ?, 'RECEIPT', ?, ?, ?, ?, ?)";
                $transStmt = $pdo->prepare($transSql);
                $transStmt->execute([$item_id, $quantity, $to_location_id, $currentUser['id'], $notes, $lot_no, $timestamp]);
                
                $message = 'Stock receipt logged successfully.';
                $logType = 'STOCK_IN';
                $logDetail = "Qty: {$quantity}, To: {$to_location_id}, Lot: {$lot_no}";

                $pdo->commit();
                writeLog($pdo, $logType, 'INVENTORY_API', $item_id, null, null, $logDetail);
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

            if ($currentUser['role'] === 'admin' || $currentUser['role'] === 'creator') {
                if (!empty($_GET['user_filter'])) {
                    $conditions[] = "u.username = ?";
                    $params[] = $_GET['user_filter'];
                }
            } else if ($currentUser['role'] === 'supervisor') {
                $conditions[] = "(loc.production_line = ? OR u.line = ?)";
                $params[] = $currentUser['line'];
                $params[] = $currentUser['line'];
                
                if (!empty($_GET['user_filter'])) {
                    $conditions[] = "u.username = ?";
                    $params[] = $_GET['user_filter'];
                }
            } else {
                $conditions[] = "t.created_by_user_id = ?";
                $params[] = $currentUser['id'];
            }

            if ($action === 'get_receipt_history') $conditions[] = "t.transaction_type IN ('RECEIPT', 'TRANSFER', 'TRANSFER_PENDING_SHIPMENT', 'SHIPPED', 'INTERNAL_TRANSFER', 'REVERSAL_TRANSFER')";
            if ($action === 'get_production_history') $conditions[] = "t.transaction_type LIKE 'PRODUCTION_%'";
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

            if (!empty($_GET['line'])) {
                $conditions[] = "loc.production_line = ?";
                $params[] = $_GET['line'];
            }
            if (!empty($_GET['team'])) {
                $conditions[] = "(u.team_group = ? OR t.notes LIKE ?)";
                $params[] = $_GET['team'];
                $params[] = '%[[]TEAM_OVERRIDE: ' . $_GET['team'] . ']%';
            }
            if (!empty($_GET['machine_id'])) {
                $conditions[] = "t.machine_id = ?";
                $params[] = $_GET['machine_id'];
            }

            $whereClause = !empty($conditions) ? "WHERE " . implode(" AND ", $conditions) : "";
            $baseSql = "
                FROM " . TRANSACTIONS_TABLE . " t
                LEFT JOIN " . ITEMS_TABLE . " i ON t.parameter_id = i.item_id
                LEFT JOIN " . LOCATIONS_TABLE . " loc ON ISNULL(t.to_location_id, t.from_location_id) = loc.location_id
                LEFT JOIN " . USERS_TABLE . " u ON t.created_by_user_id = u.id
                LEFT JOIN " . PE_MACHINES_TABLE . " m ON t.machine_id = m.machine_id
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
                    loc.location_name, t.reference_id as lot_no, ISNULL(NULLIF(u.fullname, ''), u.username) AS created_by, t.notes,
                    FORMAT(t.start_time, N'HH\:mm\:ss') as start_time,
                    FORMAT(t.end_time, N'HH\:mm\:ss') as end_time,
                    (SELECT location_name FROM " . LOCATIONS_TABLE . " WHERE location_id = t.from_location_id) as source_location,
                    (SELECT location_name FROM " . LOCATIONS_TABLE . " WHERE location_id = t.to_location_id) as destination_location,
                    m.machine_name,
                    (
                        SELECT 
                            ISNULL(NULLIF(tu.fullname, ''), tu.username) AS name,
                            stu.head_count_ratio AS ratio,
                            COALESCE(
                                CASE 
                                    WHEN pr.rate_type LIKE 'MONTHLY%' THEN pr.hourly_rate / 30.0 
                                    ELSE pr.hourly_rate 
                                END, 
                                (SELECT TOP 1 CASE WHEN rate_type LIKE 'MONTHLY%' THEN hourly_rate / 30.0 ELSE hourly_rate END FROM MANPOWER_CATEGORY_MAPPING WHERE keyword = 'พนักงานประจำ' OR category_name = 'พนักงานประจำ'),
                                350.0
                            ) AS daily_wage,
                            stu.head_count_ratio * (t.quantity * (
                                ISNULL(t.std_cost_dl_snapshot, ISNULL(i.Cost_DL, 0)) + 
                                ISNULL(t.std_cost_oh_snapshot, (ISNULL(i.Cost_OH_Machine, 0) + ISNULL(i.Cost_OH_Utilities, 0) + ISNULL(i.Cost_OH_Indirect, 0) + ISNULL(i.Cost_OH_Staff, 0) + ISNULL(i.Cost_OH_Accessory, 0) + ISNULL(i.Cost_OH_Others, 0)))
                            )) AS earned_value
                        FROM dbo.STOCK_TRANSACTION_USERS stu
                        INNER JOIN " . USERS_TABLE . " tu ON stu.user_id = tu.id
                        LEFT JOIN MANPOWER_EMPLOYEES emp ON tu.emp_id = emp.emp_id COLLATE Thai_CI_AS
                        OUTER APPLY (SELECT TOP 1 * FROM MANPOWER_CATEGORY_MAPPING WHERE emp.position LIKE '%' + keyword + '%' COLLATE Thai_CI_AS ORDER BY display_order DESC) pr
                        WHERE stu.transaction_id = t.transaction_id
                        FOR JSON PATH
                    ) AS team_users
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
            $history = $dataStmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode(['success' => true, 'data' => $history, 'total' => $total, 'page' => $page]);
            break;

         case 'get_stock_inventory_report':
            $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
            $limit = 50; $startRow = ($page - 1) * $limit; $endRow = $startRow + $limit;
            
            $conditions = []; $base_params = [];

            if ($currentUser['role'] === 'admin' || $currentUser['role'] === 'creator') {
                // Admin sees all
            } else if ($currentUser['role'] === 'supervisor' || !empty($currentUser['line'])) {
                $user_line = $currentUser['line'];
                $conditions[] = "
                    i.item_id IN (
                        SELECT item_id FROM " . ROUTES_TABLE . " WHERE line = ?
                        UNION
                        SELECT DISTINCT b.component_item_id
                        FROM " . BOM_TABLE . " b
                        WHERE b.fg_item_id IN (SELECT item_id FROM " . ROUTES_TABLE . " WHERE line = ?)
                    )
                ";
                $base_params[] = $user_line;
                $base_params[] = $user_line;
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

            if ($currentUser['role'] === 'admin' || $currentUser['role'] === 'creator') {
                // Admin sees all
            } else if ($currentUser['role'] === 'supervisor' || !empty($currentUser['line'])) {
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
                    $term_conditions[] = "l.production_line LIKE ?";
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

            if ($currentUser['role'] === 'admin' || $currentUser['role'] === 'creator') {
                // Admin sees all
            } else if ($currentUser['role'] === 'supervisor' || !empty($currentUser['line'])) {
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

            if ($currentUser['role'] === 'admin' || $currentUser['role'] === 'creator') {
                // Admin sees all
            } else if ($currentUser['role'] === 'supervisor' || !empty($currentUser['line'])) {
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

        case 'get_active_jobs':
            $item_id = isset($_GET['item_id']) ? (int)$_GET['item_id'] : 0;
            $line = $currentUser['line'] ?? '';
            $params = [];
            $where = "j.status IN ('PENDING', 'RUNNING', 'PAUSED')";
            
            if ($item_id > 0) {
                $where .= " AND j.item_id = ?";
                $params[] = $item_id;
            }
            
            if ($currentUser['role'] !== 'admin' && $currentUser['role'] !== 'creator' && !empty($line)) {
                $where .= " AND l.production_line = ?";
                $params[] = $line;
            }
            
            $sql = "SELECT j.job_id, j.job_no, j.target_qty, j.actual_qty, j.status, l.location_name,
                           i.item_id, i.sap_no, i.part_no, i.part_description
                    FROM PRODUCTION_JOBS j WITH (NOLOCK)
                    LEFT JOIN " . LOCATIONS_TABLE . " l ON j.location_id = l.location_id
                    LEFT JOIN " . ITEMS_TABLE . " i ON j.item_id = i.item_id
                    WHERE $where
                    ORDER BY j.queue_order ASC, j.created_at ASC";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
            break;

        case 'execute_production':
            $fg_item_id = (int)($input['item_id'] ?? 0);
            $location_id = (int)($input['location_id'] ?? 0);
            
            $quantity = floor((float)($input['quantity'] ?? 0)); 
            
            $count_type = strtoupper($input['count_type'] ?? 'FG');
            $lot_no = $input['lot_no'] ?? null;
            $notes = trim($input['notes'] ?? '');
            $machine_id = !empty($input['machine_id']) ? (int)$input['machine_id'] : null;
            
            $team_user_ids = $input['team_user_ids'] ?? null;
            if (is_array($team_user_ids)) {
                $team_user_ids = implode(',', $team_user_ids);
            }

            $job_no = trim($input['job_no'] ?? '');
            $job = null;
            if ($job_no !== '') {
                $stmt = $pdo->prepare("SELECT job_id, status, item_id, location_id, start_time, job_no FROM PRODUCTION_JOBS WITH (NOLOCK) WHERE job_no = ?");
                $stmt->execute([$job_no]);
                $job = $stmt->fetch(PDO::FETCH_ASSOC);
                
                if ($job) {
                    if (in_array(strtoupper($job['status']), ['COMPLETED', 'CLOSED'])) {
                        http_response_code(400);
                        echo json_encode(['success' => false, 'message' => "Cannot log transaction for a closed/completed Job."]);
                        exit;
                    }
                    if (!empty($lot_no)) {
                        $notes = "[Lot: " . $lot_no . "] " . $notes;
                    }
                    $lot_no = $job['job_no'];
                } else {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'message' => "Job No not found."]);
                    exit;
                }
            }

            $override_team = trim($input['override_team'] ?? '');
            $current_user_team = $currentUser['team_group'] ?? '';
            if (!empty($override_team) && $override_team !== $current_user_team) {
                $notes = "[TEAM_OVERRIDE: " . $override_team . "] " . $notes;
            }
            $log_date = $input['log_date'] ?? date('Y-m-d');
            $start_time = $input['start_time'] ?? date('H:i:s');
            $end_time = $input['end_time'] ?? date('H:i:s');

            if (empty($log_date)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => "Log Date is required."]);
                exit;
            }

            $time_to_use = $end_time ?: date('H:i:s');
            $timestamp = $log_date . ' ' . $time_to_use;

            if ($fg_item_id <= 0 || $location_id <= 0 || $quantity <= 0) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => "Invalid data provided for production logging."]);
                exit;
            }

            try {
                $stmt = $pdo->prepare("
                    EXEC dbo.sp_ExecuteProduction 
                        @item_id = ?, 
                        @location_id = ?, 
                        @quantity = ?, 
                        @count_type = ?, 
                        @lot_no = ?, 
                        @notes = ?, 
                        @timestamp = ?, 
                        @start_time = ?, 
                        @end_time = ?, 
                        @user_id = ?, 
                        @username = ?,
                        @machine_id = ?,
                        @team_user_ids = ?
                ");
                
                $stmt->execute([
                    $fg_item_id, 
                    $location_id, 
                    $quantity, 
                    $count_type, 
                    $lot_no, 
                    $notes, 
                    $timestamp, 
                    $start_time, 
                    $end_time, 
                    $currentUser['id'], 
                    $currentUser['username'],
                    $machine_id,
                    $team_user_ids
                ]);

                if ($job) {
                    $add_actual = $count_type === 'FG' ? $quantity : 0;
                    $add_hold = $count_type === 'HOLD' ? $quantity : 0;
                    $add_scrap = $count_type === 'SCRAP' ? $quantity : 0;
                    $sql = "UPDATE PRODUCTION_JOBS SET actual_qty = ISNULL(actual_qty, 0) + ?, hold_qty = ISNULL(hold_qty, 0) + ?, scrap_qty = ISNULL(scrap_qty, 0) + ? WHERE job_id = ?";
                    $pdo->prepare($sql)->execute([$add_actual, $add_hold, $add_scrap, $job['job_id']]);
                }
                
                $getTxnStmt = $pdo->prepare("SELECT TOP 1 transaction_id FROM " . TRANSACTIONS_TABLE . " WHERE parameter_id = ? AND transaction_type = ? AND created_by_user_id = ? ORDER BY transaction_id DESC");
                $getTxnStmt->execute([$fg_item_id, 'PRODUCTION_' . $count_type, $currentUser['id']]);
                $last_txn_id = $getTxnStmt->fetchColumn();

                if ($last_txn_id && $machine_id) {
                    $updateMachineStmt = $pdo->prepare("UPDATE " . TRANSACTIONS_TABLE . " SET machine_id = ? WHERE transaction_id = ?");
                    $updateMachineStmt->execute([$machine_id, $last_txn_id]);
                }

                // Auto-create Scrap Replacement Request if count_type is SCRAP
                if ($count_type === 'SCRAP') {
                    $store_loc_id = 1008; // Default Store Location ID
                    $defect_source = $input['defect_source'] ?? 'SNC';
                    $uuid = 'REQ-' . strtoupper(uniqid());
                    $clean_notes = preg_replace('/\[TEAM_OVERRIDE:\s*[^\]]+\]\s*/', '', $notes);
                    $repl_notes = "[" . $defect_source . "] " . trim($clean_notes);
                    if ($last_txn_id) {
                        $repl_notes .= " [TXN:" . $last_txn_id . "]";
                    }
                    
                    $reqStmt = $pdo->prepare("INSERT INTO dbo.STOCK_TRANSFER_ORDERS (transfer_uuid, item_id, quantity, from_location_id, to_location_id, status, created_by_user_id, notes, created_at) VALUES (?, ?, ?, ?, ?, 'PENDING', ?, ?, ?)");
                    $reqStmt->execute([$uuid, $fg_item_id, $quantity, $store_loc_id, $location_id, $currentUser['id'], $repl_notes, $timestamp]);
                }
                
                echo json_encode([
                    'success' => true, 
                    'message' => "บันทึกการผลิตและตัดสต็อกวัตถุดิบสำเร็จ"
                ]);

            } catch (Exception $e) {
                throw $e;
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
            
            $teamStmt = $pdo->prepare("SELECT user_id FROM STOCK_TRANSACTION_USERS WHERE transaction_id = ?");
            $teamStmt->execute([$transaction_id]);
            $team_user_ids = $teamStmt->fetchAll(PDO::FETCH_COLUMN);
            $transaction['team_user_ids'] = $team_user_ids;

            echo json_encode(['success' => true, 'data' => $transaction]);
            break;

        case 'update_transaction':
             $pdo->beginTransaction();
            try {
                $transaction_id = $input['transaction_id'] ?? 0;
                if (!$transaction_id) throw new Exception("Transaction ID is required.");

                $stmt = $pdo->prepare("SELECT created_by_user_id FROM " . TRANSACTIONS_TABLE . " WHERE transaction_id = ?");
                $stmt->execute([$transaction_id]);
                $owner_user_id = $stmt->fetchColumn();
                
                if (!$owner_user_id) {
                    throw new Exception("Original transaction not found.");
                }

                $can_manage = hasPermission('manage_production');
                $is_owner = ($currentUser['id'] == $owner_user_id);

                if (!$can_manage && !$is_owner) {
                    http_response_code(403);
                    echo json_encode(['success' => false, 'message' => 'Unauthorized: You can only update your own records.']);
                    $pdo->rollBack();
                    exit;
                }
                $stmt = $pdo->prepare("SELECT * FROM " . TRANSACTIONS_TABLE . " WITH (UPDLOCK) WHERE transaction_id = ?");
                $stmt->execute([$transaction_id]);
                $old_transaction = $stmt->fetch(PDO::FETCH_ASSOC);
                if (!$old_transaction) throw new Exception("Original transaction not found (lock failed).");

                if ($old_transaction['transaction_type'] === 'INTERNAL_TRANSFER' || $old_transaction['transaction_type'] === 'REVERSAL_TRANSFER') {
                    throw new Exception("ไม่สามารถแก้ไขรายการโอนย้ายที่ยืนยันแล้วได้!");
                }
                $spStock = $pdo->prepare("EXEC dbo." . SP_UPDATE_ONHAND . " @item_id = ?, @location_id = ?, @quantity_to_change = ?");
                
                if (strpos($old_transaction['transaction_type'], 'PRODUCTION_') === 0) {
                    $spStock->execute([$old_transaction['parameter_id'], $old_transaction['to_location_id'], -$old_transaction['quantity']]);
                    $note_to_find = "Auto-consumed for production ID: " . $transaction_id;
                    $getConsumeSql = "SELECT parameter_id, quantity, from_location_id FROM " . TRANSACTIONS_TABLE . " WHERE notes = ?";
                    $getConsumeStmt = $pdo->prepare($getConsumeSql);
                    $getConsumeStmt->execute([$note_to_find]);
                    $consumed_items = $getConsumeStmt->fetchAll(PDO::FETCH_ASSOC);

                    foreach ($consumed_items as $item) {
                        $location_to_revert = $item['from_location_id'] ?: $old_transaction['to_location_id'];
                        $spStock->execute([$item['parameter_id'], $location_to_revert, -$item['quantity']]);
                    }

                    $deleteConsumeSql = "DELETE FROM " . TRANSACTIONS_TABLE . " WHERE notes = ?";
                    $deleteConsumeStmt = $pdo->prepare($deleteConsumeSql);
                    $deleteConsumeStmt->execute([$note_to_find]);

                    $new_quantity = floor((float)($input['quantity'] ?? 0)); 
                    
                    $new_location_id = (int)($input['location_id'] ?? 0);
                    $new_lot_no = $input['lot_no'] ?? null;
                    $new_notes = $input['notes'] ?? null;
                    $new_machine_id = !empty($input['machine_id']) ? (int)$input['machine_id'] : null;
                    if (!empty($old_transaction['notes']) && preg_match('/(\[TEAM_OVERRIDE:\s*[^\]]+\])/', $old_transaction['notes'], $matches)) {
                        if (strpos($new_notes, '[TEAM_OVERRIDE:') === false) {
                            $new_notes = $matches[1] . " " . trim($new_notes);
                        }
                    }
                    if (!empty($old_transaction['notes']) && preg_match('/(\[Job:\s*[^\]]+\])/', $old_transaction['notes'], $matchesJob)) {
                        if (strpos($new_notes, '[Job:') === false) {
                            $new_notes = trim($new_notes) . " " . $matchesJob[1];
                        }
                    }
                    $new_log_date = $input['log_date'] ?? null;
                    $new_start_time = $input['start_time'] ?? null;
                    $new_end_time = $input['end_time'] ?? null;
                    
                    $team_user_ids = $input['team_user_ids'] ?? null;
                    if ($team_user_ids && !is_array($team_user_ids)) {
                        $team_user_ids = array_filter(array_map('trim', explode(',', $team_user_ids)));
                    }

                    if (empty($new_log_date)) {
                        throw new Exception("Log Date is required for update.");
                    }

                    $time_to_use = $new_end_time ?: substr($old_transaction['transaction_timestamp'], 11, 8);
                    $new_timestamp = $new_log_date . ' ' . $time_to_use;

                    $new_count_type = strtoupper($input['count_type'] ?? '');
                    $new_transaction_type = 'PRODUCTION_' . $new_count_type;

                    $fgStmt = $pdo->prepare("SELECT * FROM " . ITEMS_TABLE . " WHERE item_id = ?");
                    $fgStmt->execute([$old_transaction['parameter_id']]);
                    $fg = $fgStmt->fetch(PDO::FETCH_ASSOC);
                    
                    $fg_mat_total = (float)($fg['Cost_RM'] ?? 0) + (float)($fg['Cost_PKG'] ?? 0) + (float)($fg['Cost_SUB'] ?? 0);
                    $fg_oh_total = (float)($fg['Cost_OH_Machine'] ?? 0) + (float)($fg['Cost_OH_Utilities'] ?? 0) + (float)($fg['Cost_OH_Indirect'] ?? 0) + 
                                   (float)($fg['Cost_OH_Staff'] ?? 0) + (float)($fg['Cost_OH_Accessory'] ?? 0) + (float)($fg['Cost_OH_Others'] ?? 0);

                    $updateSql = "UPDATE " . TRANSACTIONS_TABLE . " 
                                  SET quantity=?, to_location_id=?, reference_id=?, notes=?, transaction_type=?, transaction_timestamp=?, start_time=?, end_time=?, machine_id=?,
                                      std_price_snapshot=?, std_price_usd_snapshot=?, std_cost_mat_snapshot=?, std_cost_dl_snapshot=?, std_cost_oh_snapshot=?,
                                      std_cost_oh_machine_snapshot=?, std_cost_oh_util_snapshot=?, std_cost_oh_indirect_snapshot=?, std_cost_oh_staff_snapshot=?, std_cost_oh_acc_snapshot=?, std_cost_oh_other_snapshot=?
                                  WHERE transaction_id=?";
                    $updateStmt = $pdo->prepare($updateSql);
                    $updateStmt->execute([
                        $new_quantity, $new_location_id, $new_lot_no, $new_notes, $new_transaction_type, $new_timestamp, $new_start_time, $new_end_time, $new_machine_id,
                        $fg['StandardPrice'], $fg['Price_USD'], $fg_mat_total, $fg['Cost_DL'], $fg_oh_total,
                        $fg['Cost_OH_Machine'], $fg['Cost_OH_Utilities'], $fg['Cost_OH_Indirect'], $fg['Cost_OH_Staff'], $fg['Cost_OH_Accessory'], $fg['Cost_OH_Others'],
                        $transaction_id
                    ]);

                    $spStock->execute([$old_transaction['parameter_id'], $new_location_id, $new_quantity]);

                    // Update STOCK_TRANSACTION_USERS
                    if (strpos($new_transaction_type, 'PRODUCTION_') === 0) {
                        $pdo->prepare("DELETE FROM STOCK_TRANSACTION_USERS WHERE transaction_id = ?")->execute([$transaction_id]);
                        if ($team_user_ids && is_array($team_user_ids) && count($team_user_ids) > 0) {
                            $teamSize = count($team_user_ids);
                            $ratio = 1.0 / $teamSize;
                            $teamStmt = $pdo->prepare("
                                INSERT INTO STOCK_TRANSACTION_USERS (transaction_id, user_id, emp_id, head_count_ratio) 
                                SELECT ?, id, emp_id, ? 
                                FROM " . USERS_TABLE . " 
                                WHERE id = ?
                            ");
                            foreach ($team_user_ids as $tid) {
                                $teamStmt->execute([$transaction_id, $ratio, trim($tid)]);
                            }
                        } else {
                            $pdo->prepare("
                                INSERT INTO STOCK_TRANSACTION_USERS (transaction_id, user_id, emp_id, head_count_ratio) 
                                SELECT ?, id, emp_id, ? 
                                FROM " . USERS_TABLE . " 
                                WHERE id = ?
                            ")->execute([$transaction_id, 1.0, $currentUser['id']]);
                        }
                        
                        // Sync with PRODUCTION_JOBS
                        if (preg_match('/\[Job:\s*(.+?)\]/i', $new_notes, $matches)) {
                            $job_no = trim($matches[1]);
                            
                            $old_qty = (float)$old_transaction['quantity'];
                            $old_ttype = $old_transaction['transaction_type'];
                            $old_col = null;
                            if ($old_ttype === 'PRODUCTION_FG') $old_col = 'actual_qty';
                            elseif ($old_ttype === 'PRODUCTION_HOLD') $old_col = 'hold_qty';
                            elseif ($old_ttype === 'PRODUCTION_SCRAP') $old_col = 'scrap_qty';
                            
                            if ($old_col) {
                                $pdo->prepare("UPDATE PRODUCTION_JOBS SET $old_col = ISNULL($old_col, 0) - ? WHERE job_no = ?")->execute([$old_qty, $job_no]);
                            }
                            
                            $new_col = null;
                            if ($new_transaction_type === 'PRODUCTION_FG') $new_col = 'actual_qty';
                            elseif ($new_transaction_type === 'PRODUCTION_HOLD') $new_col = 'hold_qty';
                            elseif ($new_transaction_type === 'PRODUCTION_SCRAP') $new_col = 'scrap_qty';
                            
                            if ($new_col) {
                                $pdo->prepare("UPDATE PRODUCTION_JOBS SET $new_col = ISNULL($new_col, 0) + ? WHERE job_no = ?")->execute([$new_quantity, $job_no]);
                            }
                        }
                    }

                    // Sync logic for SCRAP replacements
                    if ($old_transaction['transaction_type'] === 'PRODUCTION_SCRAP' && $new_transaction_type === 'PRODUCTION_SCRAP') {
                        $clean_notes = preg_replace('/\[TEAM_OVERRIDE:\s*[^\]]+\]\s*/', '', $new_notes);
                        $repl_notes = "[SNC] " . trim($clean_notes) . " [TXN:" . $transaction_id . "]";
                        
                        $updReqStmt = $pdo->prepare("
                            UPDATE dbo.STOCK_TRANSFER_ORDERS 
                            SET quantity = ?, to_location_id = ?, created_at = ?, notes = ?
                            WHERE status = 'PENDING' AND CHARINDEX('[TXN:' + CAST(? AS VARCHAR) + ']', notes) > 0
                        ");
                        $updReqStmt->execute([
                            $new_quantity, 
                            $new_location_id,
                            $new_timestamp,
                            $repl_notes,
                            $transaction_id
                        ]);
                    } elseif ($old_transaction['transaction_type'] === 'PRODUCTION_SCRAP' && $new_transaction_type !== 'PRODUCTION_SCRAP') {
                        $delReqStmt = $pdo->prepare("
                            DELETE FROM dbo.STOCK_TRANSFER_ORDERS 
                            WHERE status = 'PENDING' AND CHARINDEX('[TXN:' + CAST(? AS VARCHAR) + ']', notes) > 0
                        ");
                        $delReqStmt->execute([$transaction_id]);
                    } elseif ($old_transaction['transaction_type'] !== 'PRODUCTION_SCRAP' && $new_transaction_type === 'PRODUCTION_SCRAP') {
                        $store_loc_id = 1008;
                        $uuid = 'REQ-' . strtoupper(uniqid());
                        $clean_notes = preg_replace('/\[TEAM_OVERRIDE:\s*[^\]]+\]\s*/', '', $new_notes);
                        $repl_notes = "[SNC] " . trim($clean_notes) . " [TXN:" . $transaction_id . "]";
                        $reqStmt = $pdo->prepare("INSERT INTO dbo.STOCK_TRANSFER_ORDERS (transfer_uuid, item_id, quantity, from_location_id, to_location_id, status, created_by_user_id, notes, created_at) VALUES (?, ?, ?, ?, ?, 'PENDING', ?, ?, ?)");
                        $reqStmt->execute([$uuid, $old_transaction['parameter_id'], $new_quantity, $store_loc_id, $new_location_id, $old_transaction['created_by_user_id'], $repl_notes, $new_timestamp]);
                    }

                    if (in_array($new_count_type, ['FG', 'NG', 'SCRAP'])) {
                        $bomSql = "SELECT b.component_item_id, b.quantity_required, c.Cost_RM, c.Cost_DL, c.Cost_OH_Machine, c.Cost_OH_Utilities, c.Cost_OH_Indirect, c.Cost_OH_Staff, c.Cost_OH_Accessory, c.Cost_OH_Others 
                                   FROM " . BOM_TABLE . " b JOIN " . ITEMS_TABLE . " c ON b.component_item_id = c.item_id 
                                   WHERE b.fg_item_id = ? AND b.bom_status = 'ACTIVE'";
                        $bomStmt = $pdo->prepare($bomSql);
                        $bomStmt->execute([$old_transaction['parameter_id']]);
                        $components = $bomStmt->fetchAll(PDO::FETCH_ASSOC);

                        if (!empty($components)) {
                            $consumeSql = "INSERT INTO " . TRANSACTIONS_TABLE . " (
                                            parameter_id, quantity, transaction_type, from_location_id, created_by_user_id, notes, reference_id, transaction_timestamp, start_time, end_time,
                                            std_price_snapshot, std_cost_mat_snapshot, std_cost_dl_snapshot, std_cost_oh_snapshot,
                                            std_cost_oh_machine_snapshot, std_cost_oh_util_snapshot, std_cost_oh_indirect_snapshot, std_cost_oh_staff_snapshot, std_cost_oh_acc_snapshot, std_cost_oh_other_snapshot
                                        ) VALUES (?, ?, 'CONSUMPTION', ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
                            $consumeStmt = $pdo->prepare($consumeSql);
                            $consume_note = "Auto-consumed for production ID: {$transaction_id}";

                            foreach ($components as $comp) {
                                $qty_to_consume = bcmul($new_quantity, $comp['quantity_required'], 6);
                                $oh_total = (float)$comp['Cost_OH_Machine'] + (float)$comp['Cost_OH_Utilities'] + (float)$comp['Cost_OH_Indirect'] + 
                                            (float)$comp['Cost_OH_Staff'] + (float)$comp['Cost_OH_Accessory'] + (float)$comp['Cost_OH_Others'];

                                $consumeStmt->execute([
                                    $comp['component_item_id'], -$qty_to_consume, $new_location_id, $currentUser['id'], $consume_note, $new_lot_no, $new_timestamp, $new_start_time, $new_end_time,
                                    $comp['Cost_RM'], $comp['Cost_DL'], $oh_total,
                                    $comp['Cost_OH_Machine'], $comp['Cost_OH_Utilities'], $comp['Cost_OH_Indirect'],
                                    $comp['Cost_OH_Staff'], $comp['Cost_OH_Accessory'], $comp['Cost_OH_Others']
                                ]);
                                $spStock->execute([$comp['component_item_id'], $new_location_id, -$qty_to_consume]);
                            }
                        }
                    }
                
                } else {
                    $old_item_id = $old_transaction['parameter_id'];
                    $old_quantity = $old_transaction['quantity'];

                    if ($old_transaction['transaction_type'] === 'RECEIPT') {
                        $spStock->execute([$old_item_id, $old_transaction['to_location_id'], -$old_quantity]);
                    } elseif ($old_transaction['transaction_type'] === 'TRANSFER') {
                        $spStock->execute([$old_item_id, $old_transaction['from_location_id'], $old_quantity]);
                        $spStock->execute([$old_item_id, $old_transaction['to_location_id'], -$old_quantity]);
                    }

                    $new_quantity = floor((float)($input['quantity'] ?? 0));
                    
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
                        $spStock->execute([$old_item_id, $new_to_location_id, $new_quantity]);
                    } elseif ($old_transaction['transaction_type'] === 'TRANSFER') {
                        $spStock->execute([$old_item_id, $new_from_location_id, -$new_quantity]);
                        $spStock->execute([$old_item_id, $new_to_location_id, $new_quantity]);
                    }
                }

                $pdo->commit();
                writeLog($pdo, 'UPDATE', 'INVENTORY_API', $transaction_id, null, null, "Updated transaction.");
                echo json_encode(['success' => true, 'message' => 'Transaction updated successfully.']);
                
            } catch (Exception $e) {
                if ($pdo->inTransaction()) $pdo->rollBack();
                throw $e; 
            }
            break;

        case 'delete_transaction':
             $pdo->beginTransaction();
            try {
                $transaction_id = $input['transaction_id'] ?? 0;
                if (!$transaction_id) throw new Exception("Transaction ID is required.");

                $stmt = $pdo->prepare("SELECT created_by_user_id FROM " . TRANSACTIONS_TABLE . " WHERE transaction_id = ?");
                $stmt->execute([$transaction_id]);
                $owner_user_id = $stmt->fetchColumn();

                if (!$owner_user_id) {
                    throw new Exception("Transaction not found.");
                }

                $can_manage = hasPermission('manage_production');
                $is_owner = ($currentUser['id'] == $owner_user_id);

                if (!$can_manage && !$is_owner) {
                    http_response_code(403);
                    echo json_encode(['success' => false, 'message' => 'Unauthorized: You can only delete your own records.']);
                    $pdo->rollBack();
                    exit;
                }
                
                $stmt = $pdo->prepare("SELECT * FROM " . TRANSACTIONS_TABLE . " WITH (UPDLOCK) WHERE transaction_id = ?");
                $stmt->execute([$transaction_id]);
                $transaction = $stmt->fetch(PDO::FETCH_ASSOC);
                if (!$transaction) throw new Exception("Transaction not found (lock failed).");

                if ($transaction['transaction_type'] === 'INTERNAL_TRANSFER' || $transaction['transaction_type'] === 'REVERSAL_TRANSFER') {
                    throw new Exception("ไม่สามารถลบรายการโอนย้ายที่ยืนยันแล้วได้! กรุณาใช้ฟังก์ชัน 'ยกเลิก' (Reversal) เท่านั้น");
                }
                $spStock = $pdo->prepare("EXEC dbo." . SP_UPDATE_ONHAND . " @item_id = ?, @location_id = ?, @quantity_to_change = ?");
                if (strpos($transaction['transaction_type'], 'PRODUCTION_') === 0 || $transaction['transaction_type'] === 'RECEIPT') {
                    $spStock->execute([$transaction['parameter_id'], $transaction['to_location_id'], -$transaction['quantity']]);
                } elseif ($transaction['transaction_type'] === 'TRANSFER') {
                    $spStock->execute([$transaction['parameter_id'], $transaction['from_location_id'], $transaction['quantity']]);
                    $spStock->execute([$transaction['parameter_id'], $transaction['to_location_id'], -$transaction['quantity']]);
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
                        $spStock->execute([$item['parameter_id'], $location_to_revert, $qty_to_revert]);
                    }

                    $deleteConsumeSql = "DELETE FROM " . TRANSACTIONS_TABLE . " WHERE notes = ?";
                    $deleteConsumeStmt = $pdo->prepare($deleteConsumeSql);
                    $deleteConsumeStmt->execute([$note_to_find]);
                }

                $deleteStmt = $pdo->prepare("DELETE FROM " . TRANSACTIONS_TABLE . " WHERE transaction_id = ?");
                $deleteStmt->execute([$transaction_id]);

                if ($transaction['transaction_type'] === 'PRODUCTION_SCRAP') {
                    $delReqStmt = $pdo->prepare("
                        DELETE FROM dbo.STOCK_TRANSFER_ORDERS 
                        WHERE status = 'PENDING' AND CHARINDEX('[TXN:' + CAST(? AS VARCHAR) + ']', notes) > 0
                    ");
                    $delReqStmt->execute([$transaction_id]);
                }
                
                // Sync with PRODUCTION_JOBS
                if (preg_match('/\[Job:\s*(.+?)\]/i', $transaction['notes'], $matches)) {
                    $job_no = trim($matches[1]);
                    $qty = (float)$transaction['quantity'];
                    $ttype = $transaction['transaction_type'];
                    $col = null;
                    if ($ttype === 'PRODUCTION_FG') $col = 'actual_qty';
                    elseif ($ttype === 'PRODUCTION_HOLD') $col = 'hold_qty';
                    elseif ($ttype === 'PRODUCTION_SCRAP') $col = 'scrap_qty';
                    
                    if ($col) {
                        $pdo->prepare("UPDATE PRODUCTION_JOBS SET $col = ISNULL($col, 0) - ? WHERE job_no = ?")->execute([$qty, $job_no]);
                    }
                }

                $pdo->commit();
                writeLog($pdo, 'DELETE', 'INVENTORY_API', $transaction_id);
                echo json_encode(['success' => true, 'message' => 'Transaction deleted successfully.']);

            } catch (Exception $e) { 
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
                  AND (l.location_type IS NULL OR l.location_type != 'SHIPPING') 
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
            if (!hasPermission('manage_production')) {
                http_response_code(403);
                echo json_encode(['success' => false, 'message' => 'Permission Denied: You do not have permission to adjust stock.']);
                exit;
            }

             $pdo->beginTransaction();
            try {
                $item_id = $input['item_id'] ?? 0;
                $location_id = $input['location_id'] ?? 0;
                
                $physical_count = isset($input['physical_count']) ? floor((float)$input['physical_count']) : null;
                
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

                $spStock = $pdo->prepare("EXEC dbo." . SP_UPDATE_ONHAND . " @item_id = ?, @location_id = ?, @quantity_to_change = ?");
                $spStock->execute([$item_id, $location_id, $variance]);

                $transSql = "INSERT INTO " . TRANSACTIONS_TABLE . " (parameter_id, quantity, transaction_type, to_location_id, created_by_user_id, notes) VALUES (?, ?, 'ADJUSTMENT', ?, ?, ?)";
                $transStmt = $pdo->prepare($transSql);
                $transStmt->execute([$item_id, $variance, $location_id, $currentUser['id'], $notes]);

                $pdo->commit();
                writeLog($pdo, 'QUICK_ADJUST', 'INVENTORY_API', $item_id, null, null, "Location: {$location_id}, New Qty: {$physical_count}, Variance: {$variance}");
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
             $conditions = ["t.transaction_type IN ('RECEIPT', 'TRANSFER', 'TRANSFER_PENDING_SHIPMENT', 'SHIPPED')"]; 

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
            if ($currentUser['role'] === 'admin' || $currentUser['role'] === 'creator') {
                // Do nothing, can see all
            } else if ($currentUser['role'] === 'supervisor') {
                $conditions[] = "loc.production_line = ?";
                $params[] = $currentUser['line'];
            } else {
                $conditions[] = "t.created_by_user_id = ?";
                $params[] = $currentUser['id'];
            }

            $whereClause = "WHERE " . implode(" AND ", $conditions);

            $baseFromJoin = "
                FROM " . TRANSACTIONS_TABLE . " t
                JOIN " . ITEMS_TABLE . " i ON t.parameter_id = i.item_id
                LEFT JOIN " . LOCATIONS_TABLE . " loc ON ISNULL(t.to_location_id, t.from_location_id) = loc.location_id
                LEFT JOIN " . USERS_TABLE . " u ON t.created_by_user_id = u.id 
                {$whereClause}
            ";

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
            if ($currentUser['role'] === 'admin' || $currentUser['role'] === 'creator') {
                // Do nothing, can see all
            } else if ($currentUser['role'] === 'supervisor') {
                $conditions[] = "loc.production_line = ?";
                $params[] = $currentUser['line'];
            } else {
                $conditions[] = "t.created_by_user_id = ?";
                $params[] = $currentUser['id'];
            }

            if (!empty($_GET['line'])) {
                $conditions[] = "loc.production_line = ?";
                $params[] = $_GET['line'];
            }
            if (!empty($_GET['team'])) {
                $conditions[] = "(u.team_group = ? OR t.notes LIKE ?)";
                $params[] = $_GET['team'];
                $params[] = '%[[]TEAM_OVERRIDE: ' . $_GET['team'] . ']%';
            }
            if (!empty($_GET['machine_id'])) {
                $conditions[] = "t.machine_id = ?";
                $params[] = $_GET['machine_id'];
            }

            $whereClause = "WHERE " . implode(" AND ", $conditions);

            $baseFromJoin = "
                FROM " . TRANSACTIONS_TABLE . " t
                JOIN " . ITEMS_TABLE . " i ON t.parameter_id = i.item_id
                LEFT JOIN " . LOCATIONS_TABLE . " loc ON ISNULL(t.to_location_id, t.from_location_id) = loc.location_id
                LEFT JOIN " . USERS_TABLE . " u ON t.created_by_user_id = u.id 
                {$whereClause}
            ";

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

        case 'get_production_hourly_summary':
            try {
                $sp_name = SP_CALC_OEE_HOURLY; 
                $target_date = $_GET['endDate'] ?? date('Y-m-d');
                $line_filter = $_GET['line'] ?? null; 
                $model_filter = $_GET['model'] ?? null; 

                $stmt = $pdo->prepare("EXEC {$sp_name} @TargetDate = ?, @Line = ?, @Model = ?");
                $stmt->bindParam(1, $target_date, PDO::PARAM_STR);
                $stmt->bindParam(2, $line_filter, PDO::PARAM_STR);
                $stmt->bindParam(3, $model_filter, PDO::PARAM_STR);
                
                $stmt->execute();
                $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

                echo json_encode(['success' => true, 'data' => $data]);

            } catch (Exception $e) {
                throw $e;
            }
            break;

        case 'get_production_hourly_counts':
            try {
                $start_date = $_GET['startDate'] ?? date('Y-m-d');
                $target_date = $_GET['endDate'] ?? date('Y-m-d');
                $line_filter = $currentUser['line'] ?? null;
                $search_terms_array = $_GET['search_terms'] ?? []; 

                $params = [];
                $conditions = [];
                $production_date_col = "CAST(DATEADD(HOUR, -8, t.transaction_timestamp) AS DATE)";
                $conditions[] = "{$production_date_col} BETWEEN ? AND ?";
                $params[] = $start_date;
                $params[] = $target_date;

                $conditions[] = "t.transaction_type LIKE 'PRODUCTION_%'";
                if ($currentUser['role'] === 'admin' || $currentUser['role'] === 'creator') {
                    // Do nothing, can see all
                } else if ($currentUser['role'] === 'supervisor') {
                    $conditions[] = "l.production_line = ?";
                    $params[] = $line_filter;
                } else {
                    $conditions[] = "t.created_by_user_id = ?";
                    $params[] = $currentUser['id'];
                }
                
                if (!empty($_GET['line'])) {
                    $conditions[] = "l.production_line = ?";
                    $params[] = $_GET['line'];
                }
                if (!empty($_GET['team'])) {
                    $conditions[] = "(u.team_group = ? OR t.notes LIKE ?)";
                    $params[] = $_GET['team'];
                    $params[] = '%[[]TEAM_OVERRIDE: ' . $_GET['team'] . ']%';
                }
                if (!empty($_GET['machine_id'])) {
                    $conditions[] = "t.machine_id = ?";
                    $params[] = $_GET['machine_id'];
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
                        
                        $term_conditions[] = "EXISTS (
                            SELECT 1 
                            FROM " . ROUTES_TABLE . " r 
                            WHERE r.item_id = t.parameter_id 
                              AND r.line = l.production_line
                              AND r.model LIKE ?
                        )";
                        
                        array_push($params, $search_like, $search_like, $search_like, $search_like, $search_like);
                        
                        $conditions[] = "(" . implode(" OR ", $term_conditions) . ")";
                    }
                }

                $whereClause = "WHERE " . implode(" AND ", $conditions);

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
                    LEFT JOIN 
                        " . USERS_TABLE . " u ON t.created_by_user_id = u.id
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
                throw $e;
            }
            break;

        case 'get_employee_daily_summary':
            $conditions = [];
            $params = [];
            
            if ($currentUser['role'] === 'admin' || $currentUser['role'] === 'creator') {
                // Admin sees all
            } else if ($currentUser['role'] === 'supervisor') {
                $conditions[] = "(loc.production_line = ? OR tu.line = ?)";
                $params[] = $currentUser['line'];
                $params[] = $currentUser['line'];
            } else {
                $conditions[] = "stu.user_id = ?";
                $params[] = $currentUser['id'];
            }
            
            if (!empty($_GET['team'])) {
                $conditions[] = "tu.team_group = ?";
                $params[] = $_GET['team'];
            }
            $startDateCondition = "";
            if (!empty($_GET['startDate'])) {
                $conditions[] = "CAST(DATEADD(HOUR, -8, t.transaction_timestamp) AS DATE) >= ?";
                $params[] = $_GET['startDate'];
                $sDate = date('Y-m-d', strtotime($_GET['startDate']));
                $startDateCondition .= " AND ml.log_date >= '$sDate'";
            }
            if (!empty($_GET['endDate'])) {
                $conditions[] = "CAST(DATEADD(HOUR, -8, t.transaction_timestamp) AS DATE) <= ?";
                $params[] = $_GET['endDate'];
                $eDate = date('Y-m-d', strtotime($_GET['endDate']));
                $startDateCondition .= " AND ml.log_date <= '$eDate'";
            }
            if (!empty($_GET['line'])) {
                $conditions[] = "loc.production_line = ?";
                $params[] = $_GET['line'];
            }

            $conditions[] = "t.transaction_type LIKE 'PRODUCTION_%'";
            $whereClause = !empty($conditions) ? "WHERE " . implode(" AND ", $conditions) : "";
            
            $sql = "
            SELECT 
                stu.user_id,
                ISNULL(NULLIF(emp.name_th, ''), ISNULL(NULLIF(tu.fullname, ''), tu.username)) AS name,
                ISNULL(TS.hc_group, ISNULL(NULLIF(emp.team_group, ''), tu.team_group)) AS team_group,
                emp.department_api AS department,
                emp.line,
                COALESCE(
                    (
                        SELECT SUM(
                            COALESCE(
                                CASE WHEN cm.rate_type LIKE 'MONTHLY%' THEN cm.hourly_rate / 30.0 ELSE cm.hourly_rate END,
                                350.0
                            )
                            +
                            (
                                CASE WHEN ml.scan_out_time IS NOT NULL AND ms.start_time IS NOT NULL 
                                THEN 
                                    CASE WHEN DATEDIFF(MINUTE, CAST(CONCAT(ml.log_date, ' ', ms.start_time) AS DATETIME), ml.scan_out_time) > 570 
                                    THEN FLOOR((DATEDIFF(MINUTE, CAST(CONCAT(ml.log_date, ' ', ms.start_time) AS DATETIME), ml.scan_out_time) - 570) / 30.0) * 0.5 
                                    ELSE 0 END
                                ELSE 0 END
                            )
                            * 
                            (COALESCE(CASE WHEN cm.rate_type LIKE 'MONTHLY%' THEN (cm.hourly_rate / 30.0) / 8.0 ELSE cm.hourly_rate / 8.0 END, 350.0 / 8.0) * 1.5)
                        )
                        FROM dbo.MANPOWER_DAILY_LOGS ml
                        LEFT JOIN dbo.MANPOWER_SHIFTS ms ON ms.shift_id = ISNULL(ml.shift_id, emp.default_shift_id)
                        OUTER APPLY (SELECT TOP 1 * FROM dbo.MANPOWER_CATEGORY_MAPPING WHERE emp.position LIKE '%' + keyword + '%' COLLATE Thai_CI_AS ORDER BY display_order DESC) cm
                        WHERE ml.emp_id = emp.emp_id COLLATE Thai_CI_AS
                          AND ml.status IN ('PRESENT', 'LATE')
                          $startDateCondition
                    ),
                    COALESCE(
                        CASE 
                            WHEN pr.rate_type LIKE 'MONTHLY%' THEN pr.hourly_rate / 30.0 
                            ELSE pr.hourly_rate 
                        END, 
                        (SELECT TOP 1 CASE WHEN rate_type LIKE 'MONTHLY%' THEN hourly_rate / 30.0 ELSE hourly_rate END FROM dbo.MANPOWER_CATEGORY_MAPPING WHERE keyword = 'พนักงานประจำ' OR category_name = 'พนักงานประจำ'),
                        350.0
                    ) * COUNT(DISTINCT CAST(DATEADD(HOUR, -8, t.transaction_timestamp) AS DATE))
                ) AS daily_wage,
                SUM(
                    stu.head_count_ratio * (t.quantity * (
                        ISNULL(t.std_cost_dl_snapshot, ISNULL(i.Cost_DL, 0)) + 
                        ISNULL(t.std_cost_oh_snapshot, (ISNULL(i.Cost_OH_Machine, 0) + ISNULL(i.Cost_OH_Utilities, 0) + ISNULL(i.Cost_OH_Indirect, 0) + ISNULL(i.Cost_OH_Staff, 0) + ISNULL(i.Cost_OH_Accessory, 0) + ISNULL(i.Cost_OH_Others, 0)))
                    ))
                ) AS total_earned_value,
                COUNT(DISTINCT t.transaction_id) as transaction_count
            FROM dbo.STOCK_TRANSACTION_USERS stu
            INNER JOIN dbo." . TRANSACTIONS_TABLE . " t ON stu.transaction_id = t.transaction_id
            INNER JOIN dbo." . USERS_TABLE . " tu ON stu.user_id = tu.id
            LEFT JOIN dbo." . ITEMS_TABLE . " i ON t.parameter_id = i.item_id
            LEFT JOIN dbo." . LOCATIONS_TABLE . " loc ON ISNULL(t.to_location_id, t.from_location_id) = loc.location_id
            LEFT JOIN dbo.MANPOWER_EMPLOYEES emp ON stu.emp_id = emp.emp_id COLLATE Thai_CI_AS
            LEFT JOIN dbo.MANPOWER_TEAM_SETTINGS TS ON emp.department_api = TS.department_api COLLATE Thai_CI_AS
            OUTER APPLY (SELECT TOP 1 * FROM MANPOWER_CATEGORY_MAPPING WHERE emp.position LIKE '%' + keyword + '%' COLLATE Thai_CI_AS ORDER BY display_order DESC) pr
            $whereClause
            GROUP BY 
                stu.user_id, 
                tu.username, 
                tu.fullname, 
                tu.team_group,
                emp.name_th,
                emp.team_group,
                TS.hc_group,
                emp.department_api,
                emp.line,
                emp.emp_id,
                emp.default_shift_id,
                emp.position,
                pr.rate_type,
                pr.hourly_rate
            ORDER BY total_earned_value DESC
            ";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode(['success' => true, 'data' => $data]);
            break;

        case 'get_team_users':
            $team = $_GET['team'] ?? '';
            
            $sql = "SELECT 
                    u.id, 
                    u.username, 
                    ISNULL(NULLIF(emp.name_th, ''), ISNULL(NULLIF(u.fullname, ''), u.username)) AS fullname, 
                    ISNULL(TS.hc_group, ISNULL(NULLIF(emp.team_group, ''), u.team_group)) AS team_group
                FROM " . USERS_TABLE . " u
                LEFT JOIN dbo.MANPOWER_EMPLOYEES emp ON u.emp_id = emp.emp_id COLLATE Thai_CI_AS
                LEFT JOIN dbo.MANPOWER_TEAM_SETTINGS TS ON emp.department_api = TS.department_api COLLATE Thai_CI_AS
                WHERE u.is_active = 1 AND (emp.emp_id IS NOT NULL OR u.id = " . intval($currentUser['id']) . ")";
            
            $params = [];
            if ($team !== '') {
                $sql .= " AND ISNULL(TS.hc_group, ISNULL(NULLIF(emp.team_group, ''), u.team_group)) = ?";
                $params[] = $team;
            }
            
            $sql .= " ORDER BY ISNULL(NULLIF(emp.name_th, ''), ISNULL(NULLIF(u.fullname, ''), u.username))";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode(['success' => true, 'users' => $users]);
            break;

        case 'get_active_line_users':
            $location_id = $_GET['location_id'] ?? 0;
            $log_date = $_GET['log_date'] ?? '';
            
            // First get the production_line from LOCATIONS_TABLE
            $locStmt = $pdo->prepare("SELECT production_line FROM " . LOCATIONS_TABLE . " WHERE location_id = ?");
            $locStmt->execute([$location_id]);
            $production_line = $locStmt->fetchColumn();
            
            if (!$production_line) {
                echo json_encode(['success' => false, 'message' => 'สถานที่/เครื่องจักรนี้ ยังไม่ได้ถูกผูกกับไลน์ผลิต (Production Line) ในระบบ']);
                break;
            }
            
            $users = [];

            // Determine shift_date using 08:00-07:59 cutoff (DATEADD hour -8)
            if (!empty($log_date)) {
                // Past record: shift_date = log_date timestamp - 8h
                // Frontend sends the calendar date (YYYY-MM-DD); treat as 08:00 of that day
                // to resolve which shift_date it belongs to
                $sql = "SELECT DISTINCT
                        u.id,
                        u.username,
                        ISNULL(NULLIF(emp.name_th, ''), u.fullname) AS fullname
                    FROM dbo.MANPOWER_DAILY_LOGS dl
                    JOIN dbo.MANPOWER_EMPLOYEES emp ON dl.emp_id = emp.emp_id
                    JOIN " . USERS_TABLE . " u ON emp.emp_id = u.emp_id COLLATE Thai_CI_AS
                    WHERE dl.log_date = CAST(DATEADD(hour, -8, CAST(? AS DATETIME)) AS DATE)
                    AND dl.actual_line = ?
                    AND dl.status = 'PRESENT'
                    AND u.is_active = 1";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$log_date . ' 08:00:00', $production_line]);
                $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
            } else {
                // Live mode: shift_date = NOW() - 8h, must still be clocked in
                $sql = "SELECT DISTINCT
                        u.id,
                        u.username,
                        ISNULL(NULLIF(emp.name_th, ''), u.fullname) AS fullname
                    FROM dbo.MANPOWER_DAILY_LOGS dl
                    JOIN dbo.MANPOWER_EMPLOYEES emp ON dl.emp_id = emp.emp_id
                    JOIN " . USERS_TABLE . " u ON emp.emp_id = u.emp_id COLLATE Thai_CI_AS
                    WHERE dl.log_date = CAST(DATEADD(hour, -8, GETDATE()) AS DATE)
                    AND dl.actual_line = ?
                    AND dl.status = 'PRESENT'
                    AND dl.scan_out_time IS NULL
                    AND u.is_active = 1";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$production_line]);
                $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
            }

            // Fallback: If no logs found (e.g. hasn't clocked in yet, or no records for that past date)
            // fetch default employees assigned to this line.
            if (empty($users)) {
                $fallbackSql = "SELECT DISTINCT
                        u.id, 
                        u.username, 
                        ISNULL(NULLIF(emp.name_th, ''), u.fullname) AS fullname
                    FROM dbo.MANPOWER_EMPLOYEES emp
                    JOIN " . USERS_TABLE . " u ON emp.emp_id = u.emp_id COLLATE Thai_CI_AS
                    WHERE emp.line = ?
                    AND emp.is_active = 1
                    AND u.is_active = 1";
                $fbStmt = $pdo->prepare($fallbackSql);
                $fbStmt->execute([$production_line]);
                $users = $fbStmt->fetchAll(PDO::FETCH_ASSOC);
            }
            
            echo json_encode(['success' => true, 'users' => $users]);
            break;


        default:
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => "Action '{$action}' is not handled."]);
            break;
    }
} catch (Throwable $e) {
    handleApiError($e, $pdo ?? null, $input ?? $_REQUEST);
}
?>