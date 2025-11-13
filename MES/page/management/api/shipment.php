<?php
require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../../auth/check_auth.php';
require_once __DIR__ . '/../../logger.php';

// --- กำหนดสิทธิ์การเข้าถึง API นี้ ---
if (!hasRole(['admin', 'creator'])) { // <-- ปรับ Role ตามต้องการ
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

// CSRF Check (เฉพาะ POST requests)
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
        
        case 'get_shipments':
            $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
            $limit = isset($_GET['limit']) && is_numeric($_GET['limit']) ? (int)$_GET['limit'] : 50;
            $offset = ($page - 1) * $limit;
            $status_filter = $_GET['status'] ?? 'pending'; // 'pending', 'shipped', 'rejected', 'all'

            $params = [];
            $conditions = [];

            // ⭐️ แก้ไข: ปรับปรุงเงื่อนไข Transaction Type ตาม Filter Status ⭐️
            if ($status_filter === 'pending') {
                $conditions[] = "t.transaction_type = 'TRANSFER_PENDING_SHIPMENT'";
            } elseif ($status_filter === 'shipped') {
                $conditions[] = "t.transaction_type = 'SHIPPED'";
            } elseif ($status_filter === 'rejected') { // ⭐️ เพิ่ม: เงื่อนไขสำหรับ Rejected
                $conditions[] = "t.transaction_type = 'REJECTED_SHIPMENT'";
            } elseif ($status_filter === 'all') {
                // ⭐️ แก้ไข: เพิ่ม REJECTED_SHIPMENT ใน IN clause
                $conditions[] = "t.transaction_type IN ('TRANSFER_PENDING_SHIPMENT', 'SHIPPED', 'REJECTED_SHIPMENT')";
            } else {
                 // Default to pending if status is invalid
                 $conditions[] = "t.transaction_type = 'TRANSFER_PENDING_SHIPMENT'";
            }

            // --- Filter อื่นๆ (Search, Date) เหมือนเดิม ---
            if (!empty($_GET['search_term'])) {
                $search_term = '%' . $_GET['search_term'] . '%';
                $conditions[] = "(i.sap_no LIKE ? OR i.part_no LIKE ? OR loc_from.location_name LIKE ? OR loc_to.location_name LIKE ? OR t.notes LIKE ?)";
                array_push($params, $search_term, $search_term, $search_term, $search_term, $search_term);
            }
            if (!empty($_GET['startDate'])) { $conditions[] = "CAST(t.transaction_timestamp AS DATE) >= ?"; $params[] = $_GET['startDate']; }
            if (!empty($_GET['endDate'])) { $conditions[] = "CAST(t.transaction_timestamp AS DATE) <= ?"; $params[] = $_GET['endDate']; }

            $whereClause = "WHERE " . implode(" AND ", $conditions);

            // --- Query นับ Total (เหมือนเดิม) ---
            $totalSql = "SELECT COUNT(*) FROM " . TRANSACTIONS_TABLE . " t
                           JOIN " . ITEMS_TABLE . " i ON t.parameter_id = i.item_id
                           LEFT JOIN " . LOCATIONS_TABLE . " loc_from ON t.from_location_id = loc_from.location_id
                           LEFT JOIN " . LOCATIONS_TABLE . " loc_to ON t.to_location_id = loc_to.location_id
                           {$whereClause}"; // ใช้ Where Clause ที่อัปเดตแล้ว
            $totalStmt = $pdo->prepare($totalSql);
            $totalStmt->execute($params);
            $total = (int)$totalStmt->fetchColumn();

            // --- Query ดึงข้อมูล (เหมือนเดิม) ---
            $dataSql = "
                SELECT
                    t.transaction_id, t.transaction_type, t.transaction_timestamp,
                    i.sap_no, i.part_no, t.quantity,
                    loc_from.location_name AS from_location,
                    loc_to.location_name AS to_location,
                    t.notes
                FROM " . TRANSACTIONS_TABLE . " t
                JOIN " . ITEMS_TABLE . " i ON t.parameter_id = i.item_id
                LEFT JOIN " . LOCATIONS_TABLE . " loc_from ON t.from_location_id = loc_from.location_id
                LEFT JOIN " . LOCATIONS_TABLE . " loc_to ON t.to_location_id = loc_to.location_id
                {$whereClause} -- ใช้ Where Clause ที่อัปเดตแล้ว
                ORDER BY t.transaction_timestamp " . ($status_filter === 'pending' ? 'ASC' : 'DESC') . "
                OFFSET ? ROWS FETCH NEXT ? ROWS ONLY
            ";
             $dataStmt = $pdo->prepare($dataSql);
             $paramIndex = 1;
             foreach ($params as $param) { $dataStmt->bindValue($paramIndex++, $param); }
             $dataStmt->bindValue($paramIndex++, $offset, PDO::PARAM_INT);
             $dataStmt->bindValue($paramIndex++, $limit, PDO::PARAM_INT);
             $dataStmt->execute();
             $shipments = $dataStmt->fetchAll(PDO::FETCH_ASSOC);

             // --- Query ยอดรวม (เหมือนเดิม) ---
            $summarySql = "SELECT SUM(t.quantity) as total_quantity
                           FROM " . TRANSACTIONS_TABLE . " t
                           JOIN " . ITEMS_TABLE . " i ON t.parameter_id = i.item_id
                           LEFT JOIN " . LOCATIONS_TABLE . " loc_from ON t.from_location_id = loc_from.location_id
                           LEFT JOIN " . LOCATIONS_TABLE . " loc_to ON t.to_location_id = loc_to.location_id
                           {$whereClause}"; // ใช้ Where Clause ที่อัปเดตแล้ว
            $summaryStmt = $pdo->prepare($summarySql);
            $summaryStmt->execute($params);
            $summary = $summaryStmt->fetch(PDO::FETCH_ASSOC);

            echo json_encode([
                'success' => true,
                'data' => $shipments,
                'total' => $total,
                'page' => $page,
                'summary' => $summary ?? ['total_quantity' => 0]
            ]);
            break;
        // ========================[ END: Action ใหม่ ]========================

        case 'confirm_shipment':
            // ... (โค้ดเดิม ไม่เปลี่ยนแปลง) ...
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

        case 'update_shipment_note':
             $transaction_id = $input['transaction_id'] ?? 0;
             // ใช้ isset เพื่อให้สามารถลบ Note เป็นค่าว่างได้
             $notes = isset($input['notes']) ? trim($input['notes']) : null;

             if (empty($transaction_id)) {
                 throw new Exception("Transaction ID is required for updating notes.");
             }
             if ($notes === null) {
                 throw new Exception("Notes value is missing.");
             }

             // ตรวจสอบ Transaction Type เพื่อความปลอดภัย (อาจจะอนุญาตให้แก้ Note ได้ทั้ง Pending และ Shipped)
             $checkSql = "SELECT transaction_type FROM " . TRANSACTIONS_TABLE . " WHERE transaction_id = ?";
             $checkStmt = $pdo->prepare($checkSql);
             $checkStmt->execute([$transaction_id]);
             $current_type = $checkStmt->fetchColumn();

             if ($current_type !== 'TRANSFER_PENDING_SHIPMENT' && $current_type !== 'SHIPPED') {
                 throw new Exception("Cannot update notes for this transaction type ($current_type).");
             }

             // อัปเดต Notes
             $updateSql = "UPDATE " . TRANSACTIONS_TABLE . " SET notes = ? WHERE transaction_id = ?";
             $updateStmt = $pdo->prepare($updateSql);
             $updateStmt->execute([$notes, $transaction_id]);

             if ($updateStmt->rowCount() > 0) {
                 logAction($pdo, $currentUser['username'], 'UPDATE SHIPMENT NOTE', $transaction_id, "Note updated.");
                 echo json_encode(['success' => true, 'message' => 'Note updated successfully.']);
             } else {
                  // อาจจะเกิดกรณีที่ Note ไม่ได้เปลี่ยนแปลง หรือ ID ผิด
                 echo json_encode(['success' => true, 'message' => 'Note saved (no changes detected or ID invalid).']);
             }
             break;
        
        case 'reject_shipment':
            $transaction_ids = $input['transaction_ids'] ?? [];
            $reason = isset($input['reason']) ? trim($input['reason']) : 'Rejected by management';

            if (empty($transaction_ids) || !is_array($transaction_ids)) {
                throw new Exception("No valid Transaction IDs provided for rejection.");
            }

            $pdo->beginTransaction();
            try {
                $rejected_count = 0;
                $processed_ids = [];
                $spStock = $pdo->prepare("EXEC dbo." . SP_UPDATE_ONHAND . " @item_id = ?, @location_id = ?, @quantity_to_change = ?");

                $getSql = "SELECT transaction_id, parameter_id, quantity, from_location_id, transaction_type
                           FROM " . TRANSACTIONS_TABLE . "
                           WHERE transaction_id = ? AND transaction_type = 'TRANSFER_PENDING_SHIPMENT'";
                $getStmt = $pdo->prepare($getSql);

                $updateSql = "UPDATE " . TRANSACTIONS_TABLE . "
                            SET transaction_type = 'REJECTED_SHIPMENT', notes = ISNULL(notes + CHAR(13)+CHAR(10), '') + ?
                            -- , rejected_by_user_id = ?, rejected_at = GETDATE(), reject_reason = ?
                            WHERE transaction_id = ?";
                $updateStmt = $pdo->prepare($updateSql);

                foreach ($transaction_ids as $tid) {
                    if (in_array($tid, $processed_ids)) continue;

                    $getStmt->execute([$tid]);
                    $original_txn = $getStmt->fetch(PDO::FETCH_ASSOC);

                    if ($original_txn) {
                        $quantity_to_return = abs($original_txn['quantity']);
                        $spStock->execute([$original_txn['parameter_id'], $original_txn['from_location_id'], $quantity_to_return]);

                        $reject_note = "Rejected: " . $reason;
                        $updateParams = [ $reject_note, $tid ];
                        $updateStmt->execute($updateParams);


                        if ($updateStmt->rowCount() > 0) {
                             $rejected_count++;
                             logAction($pdo, $currentUser['username'], 'REJECT SHIPMENT', $tid, "Reason: " . $reason);
                             $processed_ids[] = $tid;
                        } else {
                             error_log("Failed to update status for rejected shipment ID: " . $tid);
                        }
                    } else {
                         error_log("Cannot reject shipment for transaction ID: " . $tid . " - Status might not be PENDING or ID invalid.");
                    }
                 }
                 $pdo->commit();
                 if ($rejected_count > 0) {
                     echo json_encode(['success' => true, 'message' => "Successfully rejected {$rejected_count} shipment(s). Stock returned to origin."]);
                 } else {
                     echo json_encode(['success' => false, 'message' => 'No shipments were rejected. They might have been confirmed/rejected already or the IDs were invalid.']);
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