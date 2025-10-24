<?php
require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../../auth/check_auth.php';
require_once __DIR__ . '/../../logger.php';
// ⭐️ เพิ่ม inventory_helpers.php เข้ามา เพราะเราจะใช้ updateOnhandBalance
require_once __DIR__ . '/../../components/api/inventory_helpers.php';


if (!hasRole(['supervisor', 'admin', 'creator'])) {
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
        case 'get_transfer_history':
            $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
            $limit = 50;
            $startRow = ($page - 1) * $limit;

            // ⭐️ แก้ไข: แสดง Pending Shipment ด้วย ถ้าต้องการ
            // $conditions = ["t.transaction_type = 'TRANSFER'"];
            $conditions = ["t.transaction_type IN ('TRANSFER', 'TRANSFER_PENDING_SHIPMENT', 'SHIPPED')"]; // แสดงทุกสถานะที่เกี่ยวข้องกับการย้าย

            $params = [];

            if (!empty($_GET['part_no'])) { $conditions[] = "i.part_no LIKE ?"; $params[] = '%' . $_GET['part_no'] . '%'; }
            if (!empty($_GET['from_location'])) { $conditions[] = "loc_from.location_name LIKE ?"; $params[] = '%' . $_GET['from_location'] . '%'; }
            if (!empty($_GET['to_location'])) { $conditions[] = "loc_to.location_name LIKE ?"; $params[] = '%' . $_GET['to_location'] . '%'; }
            if (!empty($_GET['startDate'])) { $conditions[] = "t.transaction_timestamp >= ?"; $params[] = $_GET['startDate']; }
            if (!empty($_GET['endDate'])) { $conditions[] = "t.transaction_timestamp < DATEADD(day, 1, ?)"; $params[] = $_GET['endDate']; }

            $whereClause = "WHERE " . implode(" AND ", $conditions);

            $totalSql = "SELECT COUNT(*) FROM " . TRANSACTIONS_TABLE . " t
                                JOIN " . ITEMS_TABLE . " i ON t.parameter_id = i.item_id
                                LEFT JOIN " . LOCATIONS_TABLE . " loc_from ON t.from_location_id = loc_from.location_id
                                LEFT JOIN " . LOCATIONS_TABLE . " loc_to ON t.to_location_id = loc_to.location_id
                                {$whereClause}";
            $totalStmt = $pdo->prepare($totalSql);
            $totalStmt->execute($params);
            $total = (int)$totalStmt->fetchColumn();

            $dataSql = "
                SELECT
                    t.transaction_id, t.transaction_timestamp, i.part_no, i.part_description, t.quantity,
                    ISNULL(loc_from.location_name, 'N/A') + ' --> ' + ISNULL(loc_to.location_name, 'N/A') AS transfer_path,
                    u.username AS created_by, t.notes,
                    t.transaction_type -- ⭐️ เพิ่ม transaction_type เพื่อแสดงสถานะ
                FROM " . TRANSACTIONS_TABLE . " t
                JOIN " . ITEMS_TABLE . " i ON t.parameter_id = i.item_id
                LEFT JOIN " . LOCATIONS_TABLE . " loc_from ON t.from_location_id = loc_from.location_id
                LEFT JOIN " . LOCATIONS_TABLE . " loc_to ON t.to_location_id = loc_to.location_id
                LEFT JOIN " . USERS_TABLE . " u ON t.created_by_user_id = u.id
                {$whereClause}
                ORDER BY t.transaction_timestamp DESC
                OFFSET ? ROWS FETCH NEXT ? ROWS ONLY
            ";

            $dataStmt = $pdo->prepare($dataSql);

            $paramIndex = 1;
            foreach ($params as $param) {
                $dataStmt->bindValue($paramIndex++, $param);
            }
            $dataStmt->bindValue($paramIndex++, (int)$startRow, PDO::PARAM_INT);
            $dataStmt->bindValue($paramIndex++, (int)$limit, PDO::PARAM_INT);
            $dataStmt->execute();

            $history = $dataStmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode(['success' => true, 'data' => $history, 'total' => $total, 'page' => $page, 'limit' => $limit]);
            break;

        case 'get_initial_data':
            $locationsStmt = $pdo->query("SELECT location_id, location_name FROM " . LOCATIONS_TABLE . " WHERE is_active = 1 ORDER BY location_name");
            $locations = $locationsStmt->fetchAll(PDO::FETCH_ASSOC);
            $itemsStmt = $pdo->query("SELECT item_id, sap_no, part_no, part_description FROM " . ITEMS_TABLE . " ORDER BY sap_no");
            $items = $itemsStmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(['success' => true, 'locations' => $locations, 'items' => $items]);
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
            $stock = $stockStmt->fetch();
            echo json_encode(['success' => true, 'quantity' => $stock['quantity'] ?? 0]);
            break;

        // ========================[ START: ส่วนที่แก้ไข ]========================
        case 'execute_transfer':
            $item_id = $input['item_id'] ?? 0;
            $from_location_id = $input['from_location_id'] ?? 0;
            $to_location_id = $input['to_location_id'] ?? 0;
            $quantity = $input['quantity'] ?? 0;
            $notes = $input['notes'] ?? null;

            if (empty($item_id) || empty($from_location_id) || empty($to_location_id) || !is_numeric($quantity) || $quantity <= 0) {
                 throw new Exception("Invalid data provided for transfer. Item, From Location, To Location, and Quantity are required.");
             }
             if ($from_location_id == $to_location_id) {
                 throw new Exception("From and To locations cannot be the same.");
             }

            $pdo->beginTransaction();
            try {
                // 1. Get Location Types
                $locationTypes = [];
                $locSql = "SELECT location_id, location_type FROM " . LOCATIONS_TABLE . " WHERE location_id IN (?, ?)";
                $locStmt = $pdo->prepare($locSql);
                $locStmt->execute([$from_location_id, $to_location_id]);
                while ($row = $locStmt->fetch(PDO::FETCH_ASSOC)) {
                    $locationTypes[$row['location_id']] = $row['location_type'];
                }
                // $from_type = $locationTypes[$from_location_id] ?? null; // Not strictly needed for logic now
                $to_type = $locationTypes[$to_location_id] ?? null;

                // ⭐️ 2. Check if DESTINATION is SHIPPING ⭐️
                $isTransferToShipping = ($to_type === 'SHIPPING');
                $transaction_type = $isTransferToShipping ? 'TRANSFER_PENDING_SHIPMENT' : 'TRANSFER';
                $log_message_detail = ""; // For logging

                // 3. Update Source Stock
                updateOnhandBalance($pdo, $item_id, $from_location_id, -$quantity);

                // 4. Update Destination Stock (ONLY if NOT transferring to Shipping)
                if (!$isTransferToShipping) {
                    updateOnhandBalance($pdo, $item_id, $to_location_id, $quantity);
                } else {
                    $log_message_detail = " (Pending Confirmation)";
                }

                // 5. Insert Transaction Log
                $transSql = "INSERT INTO " . TRANSACTIONS_TABLE . " (parameter_id, quantity, transaction_type, from_location_id, to_location_id, created_by_user_id, notes) VALUES (?, ?, ?, ?, ?, ?, ?)";
                $transStmt = $pdo->prepare($transSql);
                $transStmt->execute([$item_id, $quantity, $transaction_type, $from_location_id, $to_location_id, $currentUser['id'], $notes]);

                $pdo->commit();

                // 6. Log Action
                $logType = $isTransferToShipping ? 'PENDING SHIPMENT' : 'STOCK TRANSFER';
                logAction($pdo, $currentUser['username'], $logType, $item_id, "Qty: {$quantity}, From: {$from_location_id}, To: {$to_location_id}{$log_message_detail}");

                $message = $isTransferToShipping ? 'Transfer initiated, awaiting shipment confirmation.' : 'Stock transfer executed successfully.';
                echo json_encode(['success' => true, 'message' => $message]);

            } catch (Exception $e) {
                if ($pdo->inTransaction()) {
                    $pdo->rollBack();
                }
                // Rethrow เพื่อให้ catch ด้านนอกจัดการเรื่อง HTTP Response Code
                throw $e;
            }
            break;
        // ========================[ END: ส่วนที่แก้ไข ]========================

        case 'update_transfer':
            if (!hasRole(['admin', 'creator'])) {
                throw new Exception("You do not have permission to edit transfer history.");
            }

            $transaction_id = $input['transaction_id'] ?? 0;
            $notes = trim($input['notes'] ?? '');

            if (empty($transaction_id)) {
                throw new Exception("Transaction ID is required for an update.");
            }

            $sql = "UPDATE " . TRANSACTIONS_TABLE . " SET notes = ? WHERE transaction_id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$notes, $transaction_id]);

            logAction($pdo, $currentUser['username'], 'UPDATE TRANSFER', $transaction_id, "Notes updated.");
            echo json_encode(['success' => true, 'message' => 'Transfer record updated successfully.']);
            break;

        // ⭐️ เพิ่ม 2 Actions ใหม่: get_pending_shipments และ confirm_shipment
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
                 // เพิ่ม Field สำหรับเก็บข้อมูลการ Confirm (ถ้าต้องการ)
                 // อาจจะ ALTER TABLE STOCK_TRANSACTIONS_TEST ADD confirmed_by_user_id INT NULL, confirmed_at DATETIME NULL;
                 // ALTER TABLE STOCK_TRANSACTIONS ADD confirmed_by_user_id INT NULL, confirmed_at DATETIME NULL;

                 $updateSql = "UPDATE " . TRANSACTIONS_TABLE . "
                               SET transaction_type = 'SHIPPED'
                               -- , confirmed_by_user_id = ?, confirmed_at = GETDATE() -- uncomment ถ้ามี fields นี้
                               WHERE transaction_id = ? AND transaction_type = 'TRANSFER_PENDING_SHIPMENT'";
                 $updateStmt = $pdo->prepare($updateSql);

                 foreach ($transaction_ids as $tid) {
                     // ⭐️ Parameter ที่ส่งให้ execute ต้องตรงกับ placeholders (?)
                     $updateStmt->execute([
                         // $currentUser['id'], // uncomment ถ้ามี field confirmed_by_user_id
                         $tid
                     ]);
                     if ($updateStmt->rowCount() > 0) {
                         $confirmed_count++;
                         // Log การ Confirm แต่ละรายการ
                         logAction($pdo, $currentUser['username'], 'CONFIRM SHIPMENT', $tid);
                     } else {
                         // อาจจะ Log warning ว่า transaction_id นี้ Confirm ไม่ได้ (อาจจะสถานะผิด หรือ ID ผิด)
                         error_log("Failed to confirm shipment for transaction ID: " . $tid . " - Status might not be PENDING or ID invalid.");
                     }
                 }

                 $pdo->commit();

                 if ($confirmed_count > 0) {
                     echo json_encode(['success' => true, 'message' => "Successfully confirmed {$confirmed_count} shipment(s)."]);
                 } else {
                     // อาจจะเกิดกรณีที่กด Confirm ซ้ำ หรือข้อมูลไม่ถูกต้อง
                     echo json_encode(['success' => false, 'message' => 'No shipments were confirmed. They might have been confirmed already or the IDs were invalid.']);
                 }

             } catch (Exception $e) {
                 if ($pdo->inTransaction()) {
                     $pdo->rollBack();
                 }
                 throw $e;
             }
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