<?php
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../../auth/check_auth.php';
require_once __DIR__ . '/../../logger.php';

if (!hasRole(['admin', 'creator', 'supervisor'])) {
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

$action = $_REQUEST['action'] ?? '';
$input = json_decode(file_get_contents("php://input"), true);
$currentUser = $_SESSION['user'];

try {
    switch ($action) {
        // =====================================================================
        // [1] ITEM MASTER DATA
        // =====================================================================
        case 'get_items':
            $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
            $limit = isset($_GET['limit']) && intval($_GET['limit']) === -1 ? 999999 : 50;
            $startRow = ($page - 1) * $limit;
            $endRow = $startRow + $limit;

            $searchTerm = $_GET['search'] ?? '';
            $showInactive = isset($_GET['show_inactive']) && $_GET['show_inactive'] === 'true';
            $filter_model = $_GET['filter_model'] ?? '';

            $filter_material = $_GET['filter_material'] ?? ''; 

            $params = [];
            $fromClause = "FROM " . ITEMS_TABLE . " i WITH (NOLOCK)";
            $conditions = [];

            if (!empty($filter_material)) {
                $conditions[] = "i.material_type = ?";
                $params[] = $filter_material;
            }

            if ($currentUser['role'] === 'supervisor') {
                $supervisor_line = $currentUser['line'];
                $conditions[] = "
                    i.item_id IN (
                        SELECT item_id FROM " . ROUTES_TABLE . " WITH (NOLOCK) WHERE line = ?
                        UNION
                        SELECT DISTINCT b.component_item_id
                        FROM " . BOM_TABLE . " b WITH (NOLOCK)
                        WHERE b.fg_item_id IN (SELECT item_id FROM " . ROUTES_TABLE . " WITH (NOLOCK) WHERE line = ?)
                    )
                ";
                $params[] = $supervisor_line;
                $params[] = $supervisor_line;
            }

            if (!empty($filter_model)) {
                $fromClause .= " JOIN " . ROUTES_TABLE . " r WITH (NOLOCK) ON i.item_id = r.item_id";
                $conditions[] = "RTRIM(LTRIM(r.model)) LIKE ?";
                $params[] = '%' . $filter_model . '%';
            }

            if (!$showInactive) {
                $conditions[] = "i.is_active = 1";
            }
            
            if (!empty($searchTerm)) {
                $conditions[] = "(i.sap_no LIKE ? OR i.part_no LIKE ? OR i.sku LIKE ? OR i.part_description LIKE ?)";
                $params = array_merge($params, ['%' . $searchTerm . '%', '%' . $searchTerm . '%', '%' . $searchTerm . '%', '%' . $searchTerm . '%']);
            }
            
            $whereClause = !empty($conditions) ? "WHERE " . implode(" AND ", $conditions) : "";

            $orderByClause = "ORDER BY i.sap_no DESC";
            if ($showInactive) {
                $orderByClause = "ORDER BY i.is_active ASC, i.sap_no DESC";
            }

            $totalSql = "SELECT COUNT(DISTINCT i.item_id) {$fromClause} {$whereClause}";
            $totalStmt = $pdo->prepare($totalSql);
            $totalStmt->execute($params);
            $total = (int)$totalStmt->fetchColumn();

            $costingCols_CTE = "
                , i.planned_output, i.material_type, i.material_sub_type, i.CTN, i.net_weight, i.gross_weight, i.cbm, i.invoice_product_type, i.invoice_description
                , i.Cost_RM, i.Cost_PKG, i.Cost_SUB, i.Cost_DL
                , i.Cost_OH_Machine, i.Cost_OH_Utilities, i.Cost_OH_Indirect, i.Cost_OH_Staff, i.Cost_OH_Accessory, i.Cost_OH_Others
                , i.Cost_Total, i.StandardPrice, i.StandardGP, i.Price_USD
            ";
            
            $costingCols_Final = "
                , planned_output, material_type, material_sub_type, CTN, net_weight, gross_weight, cbm, invoice_product_type, invoice_description
                , Cost_RM, Cost_PKG, Cost_SUB, Cost_DL
                , Cost_OH_Machine, Cost_OH_Utilities, Cost_OH_Indirect, Cost_OH_Staff, Cost_OH_Accessory, Cost_OH_Others
                , Cost_Total, StandardPrice, StandardGP, Price_USD
            ";

            $dataSql = "
                WITH NumberedRows AS (
                    SELECT 
                        DISTINCT i.item_id, i.sap_no, i.part_no, i.sku, i.part_description, FORMAT(i.created_at, 'yyyy-MM-dd HH:mm') as created_at, 
                        i.is_active, i.min_stock, i.max_stock, i.is_tracking
                        {$costingCols_CTE} 
                        ,
                        STUFF((
                            SELECT ', ' + r_sub.model FROM " . ROUTES_TABLE . " r_sub WITH (NOLOCK)
                            WHERE r_sub.item_id = i.item_id ORDER BY r_sub.model FOR XML PATH('')
                        ), 1, 2, '') AS used_in_models,
                        (
                            SELECT 
                                CASE 
                                    WHEN COUNT(r_spd.route_id) = 0 THEN 'N/A'
                                    WHEN MIN(r_spd.planned_output) = MAX(r_spd.planned_output) THEN CAST(MIN(r_spd.planned_output) AS VARCHAR(20))
                                    ELSE CAST(MIN(r_spd.planned_output) AS VARCHAR(20)) + ' - ' + CAST(MAX(r_spd.planned_output) AS VARCHAR(20))
                                END
                            FROM " . ROUTES_TABLE . " r_spd WITH (NOLOCK)
                            WHERE r_spd.item_id = i.item_id AND r_spd.planned_output > 0
                        ) AS route_speed_range,
                        ROW_NUMBER() OVER ({$orderByClause}) AS RowNum
                    {$fromClause}
                    {$whereClause}
                )
                SELECT 
                    item_id, sap_no, part_no, sku, part_description, created_at, is_active, used_in_models,
                    route_speed_range, min_stock, max_stock, is_tracking
                {$costingCols_Final} 
                FROM NumberedRows
                WHERE RowNum > ? AND RowNum <= ?
            ";

            $paginationParams = array_merge($params, [$startRow, $endRow]);
            $dataStmt = $pdo->prepare($dataSql);
            $dataStmt->execute($paginationParams);
            $items = $dataStmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode(['success' => true, 'data' => $items, 'total' => $total, 'page' => $page]);
            break;

        case 'delete_item':
            $id = $input['item_id'] ?? 0;
            if (!$id) throw new Exception("Item ID is required.");

            $sql = "UPDATE " . ITEMS_TABLE . " SET is_active = 0 WHERE item_id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$id]);

            if ($stmt->rowCount() > 0) {
                logAction($pdo, $currentUser['username'], 'DEACTIVATE ITEM', $id);
                echo json_encode(['success' => true, 'message' => 'Item deactivated successfully.']);
            } else {
                throw new Exception("Item not found or could not be deactivated.");
            }
            break;

        case 'restore_item':
            $id = $input['item_id'] ?? 0;
            if (!$id) throw new Exception("Item ID is required.");

            $sql = "UPDATE " . ITEMS_TABLE . " SET is_active = 1 WHERE item_id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$id]);

            if ($stmt->rowCount() > 0) {
                logAction($pdo, $currentUser['username'], 'RESTORE ITEM', $id);
                echo json_encode(['success' => true, 'message' => 'Item restored successfully.']);
            } else {
                throw new Exception("Item not found or could not be restored.");
            }
            break;

        case 'save_item_and_routes':
            if (!hasRole(['admin', 'creator'])) {
                http_response_code(403);
                echo json_encode(['success' => false, 'message' => 'Unauthorized']);
                exit;
            }

            $item_details = $input['item_details'] ?? [];
            $routes_data = $input['routes_data'] ?? [];

            if (empty($item_details['sap_no']) || empty($item_details['part_no'])) {
                throw new Exception("SAP No. and Part No. are required.");
            }
            
            $pdo->beginTransaction();
            try {
                $item_id = (int)($item_details['item_id'] ?? 0);
                $sap_no = trim($item_details['sap_no']);
                $part_no = trim($item_details['part_no']);
                $sku = trim($item_details['sku'] ?? '');
                $desc = trim($item_details['part_description'] ?? '');
                $mat_type = trim($item_details['material_type'] ?? 'FG');
                $mat_sub_type = trim($item_details['material_sub_type'] ?? '');
                
                $planned_output = (int)($item_details['planned_output'] ?? 0);
                $min_stock = (float)($item_details['min_stock'] ?? 0);
                $max_stock = (float)($item_details['max_stock'] ?? 0);
                $is_active = (int)($item_details['is_active'] ?? 1);
                $is_tracking = (int)($item_details['is_tracking'] ?? 0);
                
                $ctn = (int)($item_details['CTN'] ?? 0);
                $nw = (float)($item_details['net_weight'] ?? 0);
                $gw = (float)($item_details['gross_weight'] ?? 0);
                $cbm = (float)($item_details['cbm'] ?? 0);
                $inv_type = trim($item_details['invoice_product_type'] ?? '');
                $inv_desc = trim($item_details['invoice_description'] ?? '');

                $c_rm = (float)($item_details['Cost_RM'] ?? 0);
                $c_pkg = (float)($item_details['Cost_PKG'] ?? 0);
                $c_sub = (float)($item_details['Cost_SUB'] ?? 0);
                $c_dl = (float)($item_details['Cost_DL'] ?? 0);
                $c_ohm = (float)($item_details['Cost_OH_Machine'] ?? 0);
                $c_ohu = (float)($item_details['Cost_OH_Utilities'] ?? 0);
                $c_ohi = (float)($item_details['Cost_OH_Indirect'] ?? 0);
                $c_ohs = (float)($item_details['Cost_OH_Staff'] ?? 0);
                $c_oha = (float)($item_details['Cost_OH_Accessory'] ?? 0);
                $c_oho = (float)($item_details['Cost_OH_Others'] ?? 0);
                $p_std = (float)($item_details['StandardPrice'] ?? 0);
                $p_usd = (float)($item_details['Price_USD'] ?? 0);

                if ($item_id > 0) {
                    $sql = "UPDATE " . ITEMS_TABLE . " SET 
                                sap_no = ?, part_no = ?, sku = ?, part_description = ?, material_type = ?, material_sub_type = ?,
                                min_stock = ?, max_stock = ?, is_tracking = ?, planned_output = ?, is_active = ?,
                                CTN = ?, net_weight = ?, gross_weight = ?, cbm = ?, invoice_product_type = ?, invoice_description = ?,
                                Cost_RM = ?, Cost_PKG = ?, Cost_SUB = ?, Cost_DL = ?,
                                Cost_OH_Machine = ?, Cost_OH_Utilities = ?, Cost_OH_Indirect = ?, Cost_OH_Staff = ?, Cost_OH_Accessory = ?, Cost_OH_Others = ?,
                                StandardPrice = ?, Price_USD = ?
                            WHERE item_id = ?";
                    $stmt = $pdo->prepare($sql);
                    $stmt->execute([
                        $sap_no, $part_no, $sku, $desc, $mat_type, $mat_sub_type,
                        $min_stock, $max_stock, $is_tracking, $planned_output, $is_active,
                        $ctn, $nw, $gw, $cbm, $inv_type, $inv_desc,
                        $c_rm, $c_pkg, $c_sub, $c_dl,
                        $c_ohm, $c_ohu, $c_ohi, $c_ohs, $c_oha, $c_oho,
                        $p_std, $p_usd,
                        $item_id
                    ]);
                    logAction($pdo, $currentUser['username'], 'UPDATE ITEM', $item_id, "SAP: {$sap_no}");
                } else {
                    $sql = "INSERT INTO " . ITEMS_TABLE . " (
                                sap_no, part_no, sku, part_description, material_type, material_sub_type, created_at, 
                                min_stock, max_stock, is_tracking, planned_output, is_active,
                                CTN, net_weight, gross_weight, cbm, invoice_product_type, invoice_description,
                                Cost_RM, Cost_PKG, Cost_SUB, Cost_DL,
                                Cost_OH_Machine, Cost_OH_Utilities, Cost_OH_Indirect, Cost_OH_Staff, Cost_OH_Accessory, Cost_OH_Others,
                                StandardPrice, Price_USD
                            ) VALUES (
                                ?, ?, ?, ?, ?, ?, GETDATE(), 
                                ?, ?, ?, ?, ?,
                                ?, ?, ?, ?, ?, ?,
                                ?, ?, ?, ?, 
                                ?, ?, ?, ?, ?, ?, 
                                ?, ?
                            )";
                    $stmt = $pdo->prepare($sql);
                    $stmt->execute([
                        $sap_no, $part_no, $sku, $desc, $mat_type, $mat_sub_type,
                        $min_stock, $max_stock, $is_tracking, $planned_output, $is_active,
                        $ctn, $nw, $gw, $cbm, $inv_type, $inv_desc,
                        $c_rm, $c_pkg, $c_sub, $c_dl,
                        $c_ohm, $c_ohu, $c_ohi, $c_ohs, $c_oha, $c_oho,
                        $p_std, $p_usd
                    ]);
                    $item_id = $pdo->lastInsertId();
                    logAction($pdo, $currentUser['username'], 'CREATE ITEM', $item_id, "SAP: {$sap_no}");
                }

                foreach ($routes_data as $route) {
                    $route_id = (int)($route['route_id'] ?? 0);
                    $status = $route['status'] ?? '';
                    $r_line = trim($route['line'] ?? '');
                    $r_model = trim($route['model'] ?? '');
                    $r_plan = (int)($route['planned_output'] ?? 0);

                    if ($status === 'deleted' && $route_id > 0) {
                        $stmt = $pdo->prepare("DELETE FROM " . ROUTES_TABLE . " WHERE route_id = ?");
                        $stmt->execute([$route_id]);
                    } else if ($status === 'new') {
                        $sql = "INSERT INTO " . ROUTES_TABLE . " (item_id, line, model, planned_output) VALUES (?, ?, ?, ?)";
                        $stmt = $pdo->prepare($sql);
                        $stmt->execute([$item_id, $r_line, $r_model, $r_plan]);
                    } else if ($status === 'existing' && $route_id > 0) {
                        $sql = "UPDATE " . ROUTES_TABLE . " SET line = ?, model = ?, planned_output = ?, updated_at = GETDATE() WHERE route_id = ?";
                        $stmt = $pdo->prepare($sql);
                        $stmt->execute([$r_line, $r_model, $r_plan, $route_id]);
                    }
                }
                
                $pdo->commit();
                echo json_encode(['success' => true, 'message' => 'Item and routes saved successfully.']);

            } catch (Exception $e) {
                $pdo->rollBack();
                throw $e;
            }
            break;

        // =====================================================================
        // [2] ROUTE MANAGEMENT
        // =====================================================================
        case 'get_item_routes':
            $item_id = $_GET['item_id'] ?? 0;
            if (!$item_id) {
                echo json_encode(['success' => true, 'data' => []]);
                exit;
            }
            $stmt = $pdo->prepare("SELECT * FROM " . ROUTES_TABLE . " WITH (NOLOCK) WHERE item_id = ? ORDER BY line, model");
            $stmt->execute([$item_id]);
            $routes = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(['success' => true, 'data' => $routes]);
            break;

        case 'save_route':
            $route_id = $input['route_id'] ?? 0;
            $item_id = $input['route_item_id'] ?? null;
            $line = trim($input['route_line'] ?? '');
            $model = trim($input['route_model'] ?? '');
            $planned_output = (int)($input['route_planned_output'] ?? 0);

            if (empty($item_id) || empty($line) || empty($model)) throw new Exception("Item ID, Line, and Model are required.");

            if ($route_id > 0) {
                $sql = "UPDATE " . ROUTES_TABLE . " SET line = ?, model = ?, planned_output = ?, updated_at = GETDATE() WHERE route_id = ?";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$line, $model, $planned_output, $route_id]);
                echo json_encode(['success' => true, 'message' => 'Route updated successfully.']);
            } else {
                $sql = "INSERT INTO " . ROUTES_TABLE . " (item_id, line, model, planned_output) VALUES (?, ?, ?, ?)";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$item_id, $line, $model, $planned_output]);
                echo json_encode(['success' => true, 'message' => 'New route created successfully.']);
            }
            break;

        // =====================================================================
        // [3] UTILITIES (DROPDOWNS)
        // =====================================================================
        case 'get_lines':
            $sql = "SELECT DISTINCT RTRIM(LTRIM(line)) as line FROM " . ROUTES_TABLE . " WITH (NOLOCK) WHERE line IS NOT NULL AND line != '' ORDER BY line ASC";
            $stmt = $pdo->prepare($sql);
            $stmt->execute();
            $lines = $stmt->fetchAll(PDO::FETCH_COLUMN);
            echo json_encode(['success' => true, 'data' => $lines]);
            break;

        case 'get_models':
            $searchTerm = $_GET['search'] ?? '';
            $sql = "SELECT DISTINCT RTRIM(LTRIM(model)) as model FROM " . ROUTES_TABLE . " WITH (NOLOCK) WHERE model IS NOT NULL AND model != ''";
            $params = [];
            if (!empty($searchTerm)) {
                $sql .= " AND model LIKE ?";
                $params[] = '%' . $searchTerm . '%';
            }
            $sql .= " ORDER BY model ASC";

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $models = $stmt->fetchAll(PDO::FETCH_COLUMN);
            echo json_encode(['success' => true, 'data' => $models]);
            break;

        // =====================================================================
        // [4] BULK IMPORT 
        // =====================================================================
        case 'unified_bulk_import':
            if (!hasRole(['admin', 'creator'])) {
                http_response_code(403);
                echo json_encode(['success' => false, 'message' => 'Unauthorized to import master data.']);
                exit;
            }

            $items = $input;
            if (empty($items)) throw new Exception("No items to import.");
            
            // 1. กวาดหารหัส SAP ทั้งหมดเพื่อไปดึงข้อมูลเก่ามาเทียบ
            $sapNos = [];
            foreach ($items as $item) {
                $sap = $item['sap_no'] ?? $item['SAP No'] ?? $item['SAP_NO'] ?? '';
                if (!empty($sap)) $sapNos[] = $sap;
            }
            $sapNos = array_unique($sapNos);

            // 2. ดึงข้อมูลเก่าจาก DB มาใส่ Memory รอไว้
            $existingDataMap = [];
            if (!empty($sapNos)) {
                $placeholders = implode(',', array_fill(0, count($sapNos), '?'));
                $stmtExisting = $pdo->prepare("SELECT * FROM " . ITEMS_TABLE . " WITH (NOLOCK) WHERE sap_no IN ($placeholders)");
                $stmtExisting->execute(array_values($sapNos));
                while ($row = $stmtExisting->fetch(PDO::FETCH_ASSOC)) {
                    $existingDataMap[strtolower(trim($row['sap_no']))] = $row;
                }
            }

            // 3. เริ่มทำการ Map ชื่อคอลัมน์ Excel ให้ตรงกับ DB (พร้อมซ่อมแซมช่องโหว่)
            $mappedItems = [];
            foreach ($items as $item) {
                $sap = trim($item['sap_no'] ?? $item['SAP No'] ?? $item['SAP_NO'] ?? '');
                if (empty($sap)) continue;
                
                $sapKey = strtolower($sap);
                $oldRow = $existingDataMap[$sapKey] ?? [];

                // 📌 Helper Function: ถ้า Excel ว่างเปล่า ให้เอาข้อมูลเก่าใน DB มาใช้แทน!
                $getValue = function($excelKeys, $dbKey, $default) use ($item, $oldRow) {
                    foreach ($excelKeys as $k) {
                        if (isset($item[$k]) && $item[$k] !== '') {
                            return $item[$k];
                        }
                    }
                    if (!empty($oldRow) && isset($oldRow[$dbKey])) {
                        return $oldRow[$dbKey];
                    }
                    return $default;
                };

                $mat_type = strtoupper(trim($getValue(['material_type', 'Material Type'], 'material_type', 'FG')));
                $raw_sub_type = strtoupper(trim($getValue(['material_sub_type', 'Sub Type', 'Group', 'Material Sub Type'], 'material_sub_type', '')));
                $validSubTypes = [
                    'RM' => ['STEEL', 'PLASTIC', 'CHEMICAL', 'OTHER'],
                    'PKG' => ['BOX', 'PALLET', 'LABEL', 'OTHER'],
                    'CON' => ['ACC', '5S', 'PROD', 'OFFICE', 'PPE'],
                    'SP' => ['MECHANICAL', 'ELECTRICAL', 'OTHER'],
                    'TOOL' => ['HANDTOOL', 'MACHINE'],
                    'FG' => ['STANDARD'],
                    'SEMI' => ['STANDARD'],
                    'WIP' => ['STANDARD']
                ];

                $final_sub_type = 'OTHER';
                
                if (isset($validSubTypes[$mat_type])) {
                    if (in_array($raw_sub_type, $validSubTypes[$mat_type])) {
                        $final_sub_type = $raw_sub_type;
                    } else {
                        if (in_array($mat_type, ['FG', 'SEMI', 'WIP'])) {
                            $final_sub_type = 'STANDARD';
                        } else {
                            $final_sub_type = 'OTHER';
                        }
                    }
                }

                $raw_active = $getValue(['is_active', 'Is Active', 'Is_Active'], 'is_active', 1);
                $is_active_val = 1;
                if (is_string($raw_active)) {
                    $chk = strtolower(trim($raw_active));
                    if ($chk === 'no' || $chk === '0' || $chk === 'false') {
                        $is_active_val = 0;
                    }
                } elseif ($raw_active === 0 || $raw_active === false) {
                    $is_active_val = 0;
                }

                $mapped = [
                    'sap_no' => $sap,
                    'part_no' => $getValue(['part_no', 'Part No'], 'part_no', ''),
                    'sku' => $getValue(['sku', 'Customer SKU'], 'sku', ''),
                    'part_description' => $getValue(['part_description', 'Description'], 'part_description', ''),
                    
                    'material_type' => $mat_type,
                    'material_sub_type' => $final_sub_type,
                    
                    'planned_output' => (int)$getValue(['planned_output', 'Planned Output'], 'planned_output', 0),
                    'min_stock' => (float)$getValue(['min_stock', 'Min Stock'], 'min_stock', 0),
                    'max_stock' => (float)$getValue(['max_stock', 'Max Stock'], 'max_stock', 0),
                    
                    'is_active' => $is_active_val,
                    
                    'CTN' => (int)$getValue(['CTN'], 'CTN', 0),
                    'net_weight' => (float)$getValue(['net_weight', 'Net Weight'], 'net_weight', 0),
                    'gross_weight' => (float)$getValue(['gross_weight', 'Gross Weight'], 'gross_weight', 0),
                    'cbm' => (float)$getValue(['cbm', 'CBM'], 'cbm', 0),
                    
                    'invoice_product_type' => $getValue(['invoice_product_type', 'Invoice Product Type'], 'invoice_product_type', ''),
                    'invoice_description' => $getValue(['invoice_description', 'Invoice Description'], 'invoice_description', ''),
                    
                    'StandardPrice' => (float)$getValue(['StandardPrice', 'Standard Price'], 'StandardPrice', 0),
                    'Price_USD' => (float)$getValue(['Price_USD', 'Price USD'], 'Price_USD', 0),
                    
                    'Cost_RM' => (float)$getValue(['Cost_RM', 'Cost RM'], 'Cost_RM', 0),
                    'Cost_PKG' => (float)$getValue(['Cost_PKG', 'Cost PKG'], 'Cost_PKG', 0),
                    'Cost_SUB' => (float)$getValue(['Cost_SUB', 'Cost SUB'], 'Cost_SUB', 0),
                    'Cost_DL' => (float)$getValue(['Cost_DL', 'Cost DL'], 'Cost_DL', 0),
                    
                    'Cost_OH_Machine' => (float)$getValue(['Cost_OH_Machine', 'OH Machine'], 'Cost_OH_Machine', 0),
                    'Cost_OH_Utilities' => (float)$getValue(['Cost_OH_Utilities', 'OH Utilities'], 'Cost_OH_Utilities', 0),
                    'Cost_OH_Indirect' => (float)$getValue(['Cost_OH_Indirect', 'OH Indirect'], 'Cost_OH_Indirect', 0),
                    'Cost_OH_Staff' => (float)$getValue(['Cost_OH_Staff', 'OH Staff'], 'Cost_OH_Staff', 0),
                    'Cost_OH_Accessory' => (float)$getValue(['Cost_OH_Accessory', 'OH Accessory'], 'Cost_OH_Accessory', 0),
                    'Cost_OH_Others' => (float)$getValue(['Cost_OH_Others', 'OH Others'], 'Cost_OH_Others', 0),
                ];
                
                $mappedItems[] = $mapped;
            }
            
            $pdo->beginTransaction();
            try {
                $jsonData = json_encode($mappedItems, JSON_UNESCAPED_UNICODE);
                $stmt = $pdo->prepare("EXEC dbo.sp_ImportMasterAndCosting_Batch ?, ?");
                $stmt->bindValue(1, $jsonData, PDO::PARAM_STR);
                $stmt->bindValue(2, $currentUser['username'], PDO::PARAM_STR);
                
                $stmt->execute();
                
                $result = $stmt->fetch(PDO::FETCH_ASSOC);
                $inserted = $result['InsertedCount'] ?? 0;
                $updated = $result['UpdatedCount'] ?? 0;

                $pdo->commit();
                echo json_encode([
                    'success' => true, 
                    'message' => "Import successful. Inserted: {$inserted}, Updated: {$updated}."
                ]);

            } catch (Exception $e) {
                $pdo->rollBack();
                throw $e;
            }
            break;

        case 'validate_import_saps':
            $sapNos = $input['sap_nos'] ?? [];
            if (empty($sapNos)) {
                echo json_encode(['success' => true, 'existing_saps' => []]);
                break;
            }

            $placeholders = implode(',', array_fill(0, count($sapNos), '?'));
            $stmt = $pdo->prepare("SELECT sap_no FROM " . ITEMS_TABLE . " WITH (NOLOCK) WHERE sap_no IN ($placeholders)");
            $stmt->execute($sapNos);
            $existing = $stmt->fetchAll(PDO::FETCH_COLUMN);
            echo json_encode(['success' => true, 'existing_saps' => $existing]);
            break;

        // =====================================================================
        // [5] LINE SCHEDULES
        // =====================================================================
        case 'read_schedules':
            $sql = "SELECT id, line, shift_name, CONVERT(VARCHAR(8), start_time, 108) AS start_time, CONVERT(VARCHAR(8), end_time, 108) AS end_time, planned_break_minutes, is_active FROM " . SCHEDULES_TABLE . " WITH (NOLOCK) ORDER BY line, shift_name";
            $stmt = $pdo->prepare($sql);
            $stmt->execute();
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
            break;

        case 'save_schedule':
            $id = $input['id'] ?? 0;
            $line = trim($input['line'] ?? '');
            $shift_name = trim($input['shift_name'] ?? '');
            $start_time = $input['start_time'] ?? '08:00';
            $end_time = $input['end_time'] ?? '17:00';
            $break_min = (int)($input['planned_break_minutes'] ?? 0);
            $is_active = !empty($input['is_active']) ? 1 : 0;
            
            if (empty($line) || empty($shift_name)) throw new Exception("Line and Shift Name are required.");
            
            if ($id > 0) {
                $sql = "UPDATE " . SCHEDULES_TABLE . " SET line = ?, shift_name = ?, start_time = ?, end_time = ?, planned_break_minutes = ?, is_active = ? WHERE id = ?";
                $params = [$line, $shift_name, $start_time, $end_time, $break_min, $is_active, $id];
                $msg = 'Schedule updated successfully.';
            } else {
                $sql = "INSERT INTO " . SCHEDULES_TABLE . " (line, shift_name, start_time, end_time, planned_break_minutes, is_active) VALUES (?, ?, ?, ?, ?, ?)";
                $params = [$line, $shift_name, $start_time, $end_time, $break_min, $is_active];
                $msg = 'Schedule created successfully.';
            }
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            echo json_encode(['success' => true, 'message' => $msg]);
            break;

        case 'delete_schedule':
            $id = $input['id'] ?? 0;
            if (!$id) { throw new Exception("Missing Schedule ID"); }
            $sql = "DELETE FROM " . SCHEDULES_TABLE . " WHERE id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([(int)$id]);
            echo json_encode(['success' => true, 'message' => 'Schedule deleted.']);
            break;

        // =====================================================================
        // [6] HEALTH CHECK
        // =====================================================================
        case 'health_check_parameters':
             $sql = "
                WITH ProducedItems AS (
                    SELECT DISTINCT t.parameter_id AS item_id 
                    FROM " . TRANSACTIONS_TABLE . " t WITH (NOLOCK) 
                    WHERE t.transaction_type LIKE 'PRODUCTION_%'
                ), 
                ItemRoutes AS (
                    SELECT DISTINCT r.item_id 
                    FROM " . ROUTES_TABLE . " r WITH (NOLOCK) 
                    WHERE r.planned_output > 0
                ) 
                SELECT i.sap_no, i.part_no, i.part_description, 'N/A' as line, 'N/A' as model 
                FROM ProducedItems p 
                JOIN " . ITEMS_TABLE . " i WITH (NOLOCK) ON p.item_id = i.item_id 
                WHERE p.item_id NOT IN (SELECT item_id FROM ItemRoutes) 
                  AND i.is_active = 1 
                ORDER BY i.sap_no
             ";
            $stmt = $pdo->prepare($sql);
            $stmt->execute();
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
            break;

        default:
            http_response_code(400);
            throw new Exception("Invalid action specified for Item Master.");
    }

} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    ob_clean();
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>