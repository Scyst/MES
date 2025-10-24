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

$action = $_REQUEST['action'] ?? '';
$input = json_decode(file_get_contents("php://input"), true);
$currentUser = $_SESSION['user'];

try {
    switch ($action) {
        case 'get_pending_shipments':
             // ... (โค้ดเดิม) ...
             $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
             $limit = isset($_GET['limit']) && is_numeric($_GET['limit']) ? (int)$_GET['limit'] : 50;
             $offset = ($page - 1) * $limit;
             $params = [];
             $conditions = ["t.transaction_type = 'TRANSFER_PENDING_SHIPMENT'"];

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
                 ORDER BY t.transaction_timestamp ASC
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
              // ... (โค้ดเดิม) ...
               $transaction_ids = $input['transaction_ids'] ?? [];
             if (empty($transaction_ids) || !is_array($transaction_ids)) {
                 throw new Exception("No valid Transaction IDs provided for confirmation.");
             }
             $pdo->beginTransaction();
             try {
                 $confirmed_count = 0;
                 $updateSql = "UPDATE " . TRANSACTIONS_TABLE . "
                               SET transaction_type = 'SHIPPED'
                               -- , confirmed_by_user_id = ?, confirmed_at = GETDATE()
                               WHERE transaction_id = ? AND transaction_type = 'TRANSFER_PENDING_SHIPMENT'";
                 $updateStmt = $pdo->prepare($updateSql);
                 foreach ($transaction_ids as $tid) {
                     $updateParams = [ $tid ];
                     // if (isset($currentUser['id'])) { array_unshift($updateParams, $currentUser['id']); }
                     $updateStmt->execute($updateParams);
                     if ($updateStmt->rowCount() > 0) {
                         $confirmed_count++;
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
                 if ($pdo->inTransaction()) $pdo->rollBack();
                 throw $e;
             }
             break;

        // ========================[ START: ส่วนที่เพิ่มใหม่ ]========================
        case 'get_shipment_history':
            $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
            $limit = isset($_GET['limit']) && is_numeric($_GET['limit']) ? (int)$_GET['limit'] : 50;
            $offset = ($page - 1) * $limit;
            $params = [];
            // กรองเฉพาะ Type 'SHIPPED'
            $conditions = ["t.transaction_type = 'SHIPPED'"];

            // Filter (เหมือนกับ get_pending_shipments แต่ปรับตามต้องการ)
            if (!empty($_GET['search_term'])) {
                $search_term = '%' . $_GET['search_term'] . '%';
                // อาจจะเพิ่มการค้นหาผู้ Confirm ถ้ามี Field นั้น
                $conditions[] = "(i.sap_no LIKE ? OR i.part_no LIKE ? OR loc_from.location_name LIKE ? OR loc_to.location_name LIKE ? OR u.username LIKE ?)";
                array_push($params, $search_term, $search_term, $search_term, $search_term, $search_term);
            }
            if (!empty($_GET['startDate'])) { $conditions[] = "CAST(t.transaction_timestamp AS DATE) >= ?"; $params[] = $_GET['startDate']; } // หรือจะกรองตาม confirmed_at ถ้ามี
            if (!empty($_GET['endDate'])) { $conditions[] = "CAST(t.transaction_timestamp AS DATE) <= ?"; $params[] = $_GET['endDate']; } // หรือจะกรองตาม confirmed_at ถ้ามี

            $whereClause = "WHERE " . implode(" AND ", $conditions);

            $totalSql = "SELECT COUNT(*) FROM " . TRANSACTIONS_TABLE . " t
                          JOIN " . ITEMS_TABLE . " i ON t.parameter_id = i.item_id
                          LEFT JOIN " . LOCATIONS_TABLE . " loc_from ON t.from_location_id = loc_from.location_id
                          LEFT JOIN " . LOCATIONS_TABLE . " loc_to ON t.to_location_id = loc_to.location_id
                          LEFT JOIN " . USERS_TABLE . " u ON t.created_by_user_id = u.id
                          -- LEFT JOIN USERS uc ON t.confirmed_by_user_id = uc.id -- Join ผู้ Confirm ถ้ามี
                          {$whereClause}";
            $totalStmt = $pdo->prepare($totalSql);
            $totalStmt->execute($params);
            $total = (int)$totalStmt->fetchColumn();

            $dataSql = "
                SELECT
                    t.transaction_id, t.transaction_timestamp, i.sap_no, i.part_no, i.part_description, t.quantity,
                    loc_from.location_name AS from_location,
                    loc_to.location_name AS to_location,
                    u.username AS requested_by,
                    -- uc.username AS confirmed_by, -- uncomment ถ้ามี Field ผู้ Confirm
                    -- t.confirmed_at, -- uncomment ถ้ามี Field เวลา Confirm
                    t.notes
                FROM " . TRANSACTIONS_TABLE . " t
                JOIN " . ITEMS_TABLE . " i ON t.parameter_id = i.item_id
                LEFT JOIN " . LOCATIONS_TABLE . " loc_from ON t.from_location_id = loc_from.location_id
                LEFT JOIN " . LOCATIONS_TABLE . " loc_to ON t.to_location_id = loc_to.location_id
                LEFT JOIN " . USERS_TABLE . " u ON t.created_by_user_id = u.id
                -- LEFT JOIN USERS uc ON t.confirmed_by_user_id = uc.id -- Join ผู้ Confirm ถ้ามี
                {$whereClause}
                ORDER BY t.transaction_timestamp DESC -- เรียงตามล่าสุดไปเก่า
                OFFSET ? ROWS FETCH NEXT ? ROWS ONLY
            ";
            $dataStmt = $pdo->prepare($dataSql);
            $paramIndex = 1;
            foreach ($params as $param) { $dataStmt->bindValue($paramIndex++, $param); }
            $dataStmt->bindValue($paramIndex++, $offset, PDO::PARAM_INT);
            $dataStmt->bindValue($paramIndex++, $limit, PDO::PARAM_INT);
            $dataStmt->execute();
            $shipment_history = $dataStmt->fetchAll(PDO::FETCH_ASSOC);

            // (Optional) Query ยอดรวม
            $summarySql = "SELECT SUM(t.quantity) as total_quantity
                           FROM " . TRANSACTIONS_TABLE . " t
                           JOIN " . ITEMS_TABLE . " i ON t.parameter_id = i.item_id
                           LEFT JOIN " . LOCATIONS_TABLE . " loc_from ON t.from_location_id = loc_from.location_id
                           LEFT JOIN " . LOCATIONS_TABLE . " loc_to ON t.to_location_id = loc_to.location_id
                           LEFT JOIN " . USERS_TABLE . " u ON t.created_by_user_id = u.id
                           {$whereClause}";
            $summaryStmt = $pdo->prepare($summarySql);
            $summaryStmt->execute($params);
            $summary = $summaryStmt->fetch(PDO::FETCH_ASSOC);


            echo json_encode([
                'success' => true,
                'data' => $shipment_history,
                'total' => $total,
                'page' => $page,
                'summary' => $summary ?? ['total_quantity' => 0] // ส่งค่า Summary ไปด้วย
            ]);
            break;
        // ========================[ END: ส่วนที่เพิ่มใหม่ ]========================


        default:
            http_response_code(400);
            throw new Exception("Invalid action specified for Shipment API.");
    }
} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>