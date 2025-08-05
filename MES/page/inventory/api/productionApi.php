<?php
// api/pdTable/pdTableManage.php

require_once __DIR__ . '/../../../api/db.php';
require_once __DIR__ . '/../../../auth/check_auth.php';
require_once __DIR__ . '/../../../api/logger.php';

// ส่วนของ CSRF Token Check (เหมือนเดิม)
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    if (
        !isset($_SERVER['HTTP_X_CSRF_TOKEN']) ||
        !isset($_SESSION['csrf_token']) ||
        !hash_equals($_SESSION['csrf_token'], $_SERVER['HTTP_X_CSRF_TOKEN'])
    ) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'CSRF token validation failed. Request rejected.']);
        exit;
    }
}

// ไม่มีการประกาศ $is_development หรือชื่อตารางที่นี่อีกต่อไป

$action = $_REQUEST['action'] ?? '';
$input = json_decode(file_get_contents("php://input"), true);
if (empty($input) && !empty($_POST)) {
    $input = $_POST;
}
$currentUser = $_SESSION['user'];

// ฟังก์ชัน findBomComponents ที่อัปเดตแล้ว
function findBomComponents($pdo, $part_no, $line, $model) {
    $bomSql = "SELECT component_part_no, quantity_required FROM " . BOM_TABLE . " WHERE fg_part_no = ? AND line = ? AND model = ?";
    $bomStmt = $pdo->prepare($bomSql);
    $bomStmt->execute([$part_no, $line, $model]);
    return $bomStmt->fetchAll(PDO::FETCH_ASSOC);
}

try {
    $currentUser = $_SESSION['user'];

    switch ($action) {
        case 'execute_production':
            $item_id = $input['item_id'] ?? 0;
            $location_id = $input['location_id'] ?? 0;
            $quantity = $input['quantity'] ?? 0;
            $count_type = $input['count_type'] ?? '';
            $lot_no = $input['lot_no'] ?? null;
            $notes = $input['notes'] ?? null;

            if (empty($item_id) || empty($location_id) || !is_numeric($quantity) || $quantity <= 0 || empty($count_type)) {
                throw new Exception("Invalid data provided for production logging.");
            }

            $pdo->beginTransaction();

            $prod_transaction_type = 'PRODUCTION_' . strtoupper($count_type);
            
            $mergeProdSql = "MERGE " . ONHAND_TABLE . " AS target USING (SELECT ? AS item_id, ? AS location_id) AS source ON (target.parameter_id = source.item_id AND target.location_id = source.location_id) WHEN MATCHED THEN UPDATE SET quantity = target.quantity + ?, last_updated = GETDATE() WHEN NOT MATCHED THEN INSERT (parameter_id, location_id, quantity) VALUES (?, ?, ?);";
            $mergeProdStmt = $pdo->prepare($mergeProdSql);
            $mergeProdStmt->execute([$item_id, $location_id, $quantity, $item_id, $location_id, $quantity]);

            $prodTransSql = "INSERT INTO " . TRANSACTIONS_TABLE . " (parameter_id, quantity, transaction_type, to_location_id, created_by_user_id, notes, reference_id) VALUES (?, ?, ?, ?, ?, ?, ?)";
            $prodTransStmt = $pdo->prepare($prodTransSql);
            $prodTransStmt->execute([$item_id, $quantity, $prod_transaction_type, $location_id, $currentUser['id'], $notes, $lot_no]);

            if (strtoupper($count_type) === 'FG') {
                 $bomSql = "SELECT i_comp.item_id as component_item_id, b.quantity_required 
                           FROM " . BOM_TABLE . " b
                           JOIN " . ITEMS_TABLE . " i_fg ON b.fg_part_no = i_fg.part_no 
                           JOIN " . ITEMS_TABLE . " i_comp ON b.component_part_no = i_comp.part_no
                           WHERE i_fg.item_id = ?";
                $bomStmt = $pdo->prepare($bomSql);
                $bomStmt->execute([$item_id]);
                $components = $bomStmt->fetchAll(PDO::FETCH_ASSOC);

                if (!empty($components)) {
                    $consumeSql = "UPDATE " . ONHAND_TABLE . " SET quantity = quantity - ?, last_updated = GETDATE() WHERE parameter_id = ? AND location_id = ? AND quantity >= ?";
                    $consumeStmt = $pdo->prepare($consumeSql);
                    
                    $consumeTransSql = "INSERT INTO " . TRANSACTIONS_TABLE . " (parameter_id, quantity, transaction_type, from_location_id, created_by_user_id, notes, reference_id) VALUES (?, ?, 'CONSUMPTION', ?, ?, ?, ?)";
                    $consumeTransStmt = $pdo->prepare($consumeTransSql);

                    foreach ($components as $comp) {
                        $qty_to_consume = $quantity * (float)$comp['quantity_required'];
                        $component_item_id = $comp['component_item_id'];

                        $consumeStmt->execute([$qty_to_consume, $component_item_id, $location_id, $qty_to_consume]);
                        
                        if ($consumeStmt->rowCount() == 0) {
                            $pdo->rollBack();
                            throw new Exception("Insufficient stock for a component (Item ID: {$component_item_id}) at the production location.");
                        }

                        $consume_note = "Auto-consumed for production of Item ID: {$item_id}, Lot: {$lot_no}";
                        $consumeTransStmt->execute([$component_item_id, -$qty_to_consume, $location_id, $currentUser['id'], $consume_note, $lot_no]);
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

            // *** SQL ที่แก้ไขแล้วสำหรับ SQL Server 2008 ***
            $endRow = $startRow + $limit;
            $dataSql = "
                WITH NumberedRows AS (
                    SELECT 
                        t.transaction_id,
                        t.transaction_timestamp,
                        i.sap_no,
                        i.part_no,
                        t.quantity,
                        REPLACE(t.transaction_type, 'PRODUCTION_', '') AS count_type,
                        loc.location_name,
                        t.reference_id as lot_no,
                        u.username AS created_by,
                        t.notes,
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
        
        default:
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => "Action '{$action}' is not handled in this modified script."]);
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