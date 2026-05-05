<?php
header('Content-Type: application/json');
require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../components/init.php';

if (!hasPermission('add_production') && !hasPermission('manage_production') && !hasPermission('print_label')) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Permission Denied']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    if (!isset($_SERVER['HTTP_X_CSRF_TOKEN']) || !isset($_SESSION['csrf_token']) || !hash_equals($_SESSION['csrf_token'], $_SERVER['HTTP_X_CSRF_TOKEN'])) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'CSRF token validation failed.']);
        exit;
    }
}

$transferTable = TRANSFER_ORDERS_TABLE;
$itemTable = ITEMS_TABLE;
$locTable = LOCATIONS_TABLE;
$spUpdateOnhand = SP_UPDATE_ONHAND;
$transTable = TRANSACTIONS_TABLE;

$action = $_REQUEST['action'] ?? '';
$input = json_decode(file_get_contents("php://input"), true);
$currentUser = $_SESSION['user'];

try {
    switch ($action) {
        case 'search_items':
            if ($_SERVER['REQUEST_METHOD'] !== 'GET') throw new Exception("Invalid request method.");
            
            $q = $_GET['q'] ?? '';
            if (strlen($q) < 2) {
                echo json_encode(['success' => true, 'data' => []]);
                break;
            }

            $sql = "SELECT TOP 150 item_id, sap_no, part_no, part_description 
                    FROM $itemTable WITH (NOLOCK) 
                    WHERE is_active = 1 
                      AND (sap_no LIKE :q1 OR part_no LIKE :q2 OR part_description LIKE :q3)
                    ORDER BY sap_no ASC";
            
            $stmt = $pdo->prepare($sql);
            $searchTerm = "%{$q}%";
            $stmt->execute(['q1' => $searchTerm, 'q2' => $searchTerm, 'q3' => $searchTerm]);
            $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode(['success' => true, 'data' => $items]);
            break;

        case 'get_label_history':
            if ($_SERVER['REQUEST_METHOD'] !== 'GET') throw new Exception("Invalid request method.");
            
            $page = isset($_GET['page']) ? max(1, (int)$_GET['page']) : 1;
            $limit = isset($_GET['limit']) ? max(1, (int)$_GET['limit']) : 100;
            $offset = ($page - 1) * $limit;
            $search = trim($_GET['search'] ?? '');
            $status_filter = $_GET['status'] ?? 'ACTIVE'; 
            $whereClause = "t.created_at >= DATEADD(DAY, -30, GETDATE()) 
                            AND t.transfer_uuid NOT LIKE 'REQ-%' 
                            AND t.transfer_uuid NOT LIKE 'TRF-%'";
            $params = [];

            if (!hasPermission('manage_production')) {
                $whereClause .= " AND t.created_by_user_id = ?";
                $params[] = $currentUser['id'];
            }

            if ($status_filter === 'ACTIVE') {
                $whereClause .= " AND t.status != 'CANCELLED'";
            } elseif ($status_filter !== 'ALL') {
                $whereClause .= " AND t.status = ?";
                $params[] = $status_filter;
            }

            if ($search !== '') {
                $whereClause .= " AND (t.transfer_uuid LIKE ? OR i.sap_no LIKE ? OR i.part_no LIKE ?)";
                $params[] = "%{$search}%";
                $params[] = "%{$search}%";
                $params[] = "%{$search}%";
            }

            $countSql = "SELECT COUNT(*) 
                         FROM " . TRANSFER_ORDERS_TABLE . " t WITH (NOLOCK) 
                         JOIN " . ITEMS_TABLE . " i WITH (NOLOCK) ON t.item_id = i.item_id 
                         WHERE $whereClause";
            $countStmt = $pdo->prepare($countSql);
            $countStmt->execute($params);
            $totalRecords = (int)$countStmt->fetchColumn();
            
            $sql = "SELECT 
                        t.transfer_uuid, 
                        t.quantity, 
                        t.status, 
                        t.created_at,
                        i.sap_no, 
                        i.part_no, 
                        i.part_description 
                    FROM " . TRANSFER_ORDERS_TABLE . " t WITH (NOLOCK)
                    JOIN " . ITEMS_TABLE . " i WITH (NOLOCK) ON t.item_id = i.item_id
                    WHERE $whereClause
                    ORDER BY t.created_at DESC 
                    OFFSET $offset ROWS FETCH NEXT $limit ROWS ONLY";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $history = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode([
                'success' => true, 
                'data' => $history, 
                'total' => $totalRecords,
                'page' => $page,
                'total_pages' => ceil($totalRecords / $limit),
                'message' => 'Fetched history successfully'
            ]);
            break;

        case 'cancel_batch_labels':
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') throw new Exception("Invalid request method.");
            
            $lot_no = trim($input['lot_no'] ?? '');
            $is_range = isset($input['is_range']) ? (bool)$input['is_range'] : false;
            $start_no = (int)($input['start_no'] ?? 0);
            $end_no = (int)($input['end_no'] ?? 0);

            if (empty($lot_no)) throw new Exception("กรุณาระบุเลข Lot ที่ต้องการยกเลิก");
            if ($is_range && ($start_no <= 0 || $end_no <= 0 || $start_no > $end_no)) {
                throw new Exception("ระบุช่วงเลขรันให้ถูกต้อง (เริ่มต้นต้องน้อยกว่าหรือเท่ากับสิ้นสุด)");
            }

            $pdo->beginTransaction();
            $note_update = "\nBulk Cancelled by " . $currentUser['username'] . " at " . date('Y-m-d H:i:s');
            $updSql = "UPDATE $transferTable 
                       SET status = 'CANCELLED', 
                           notes = ISNULL(notes, '') + ? 
                       WHERE status = 'PENDING' 
                         AND transfer_uuid LIKE ?";
            
            $params = [$note_update, $lot_no . '-%'];
            if (!hasPermission('manage_production')) {
                $updSql .= " AND created_by_user_id = ?";
                $params[] = $currentUser['id'];
            }

            if ($is_range) {
                $updSql .= " AND TRY_CAST(RIGHT(transfer_uuid, CHARINDEX('-', REVERSE(transfer_uuid)) - 1) AS INT) BETWEEN ? AND ?";
                $params[] = $start_no;
                $params[] = $end_no;
            }
            
            $stmt = $pdo->prepare($updSql);
            $stmt->execute($params);
            $affectedRows = $stmt->rowCount();

            $pdo->commit();

            if ($affectedRows > 0) {
                echo json_encode(['success' => true, 'message' => "ยกเลิกสติ๊กเกอร์ Lot: {$lot_no} จำนวน {$affectedRows} รายการ สำเร็จ"]);
            } else {
                throw new Exception("ไม่พบสติ๊กเกอร์สถานะ PENDING ในช่วงที่คุณระบุ (อาจถูกลบ/รับเข้าหมดแล้ว หรือคุณไม่มีสิทธิ์ลบของผู้อื่น)");
            }
            break;

        case 'cancel_label':
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') throw new Exception("Invalid request method.");
            
            $transfer_uuid = $input['transfer_uuid'] ?? '';
            if (empty($transfer_uuid)) throw new Exception("Transfer UUID is required.");

            $pdo->beginTransaction();
            
            $checkStmt = $pdo->prepare("SELECT status, created_by_user_id FROM $transferTable WITH (UPDLOCK) WHERE transfer_uuid = ?");
            $checkStmt->execute([$transfer_uuid]);
            $row = $checkStmt->fetch(PDO::FETCH_ASSOC);

            if (!$row) {
                throw new Exception("ไม่พบรายการ Label นี้ในระบบ");
            }
            if ($row['status'] !== 'PENDING') {
                throw new Exception("ไม่สามารถยกเลิกได้ เนื่องจากสถานะปัจจุบันคือ {$row['status']}");
            }
            
            if ($row['created_by_user_id'] != $currentUser['id'] && !hasPermission('manage_production')) {
                throw new Exception("คุณไม่มีสิทธิ์ยกเลิก Label ที่สร้างโดยผู้อื่น");
            }

            $updStmt = $pdo->prepare("UPDATE $transferTable SET status = 'CANCELLED', notes = ISNULL(notes, '') + ? WHERE transfer_uuid = ?");
            $note_update = "\nCancelled (Ghost Label) by " . $currentUser['username'] . " at " . date('Y-m-d H:i:s');
            $updStmt->execute([$note_update, $transfer_uuid]);

            $pdo->commit();
            echo json_encode(['success' => true, 'message' => "ยกเลิกรายการ {$transfer_uuid} สำเร็จ"]);
            break;

        case 'create_transfer_order':
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') throw new Exception("Invalid request method.");

            $transfer_uuid = $input['transfer_uuid'] ?? ''; 
            $item_id = $input['item_id'] ?? 0;
            $quantity = floor((float)($input['quantity'] ?? 0)); // บังคับเป็นจำนวนเต็ม
            $from_loc_id = $input['from_loc_id'] ?? 0;
            $to_loc_id = $input['to_loc_id'] ?? 0;
            $notes = $input['notes'] ?? null;

            if (empty($transfer_uuid) || empty($item_id) || empty($quantity) || $quantity <= 0 || empty($from_loc_id) || empty($to_loc_id)) {
                throw new Exception("ข้อมูลไม่ครบถ้วน (UUID, Item, Qty, From, To).");
            }

            if ($from_loc_id == $to_loc_id) {
                throw new Exception("คลังต้นทางและปลายทางต้องไม่ซ้ำกัน");
            }

            $pdo->beginTransaction();
            
            $sql = "INSERT INTO $transferTable 
                        (transfer_uuid, item_id, quantity, from_location_id, to_location_id, status, created_by_user_id, notes)
                    VALUES 
                        (?, ?, ?, ?, ?, 'PENDING', ?, ?)";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                $transfer_uuid, $item_id, $quantity, $from_loc_id, $to_loc_id, $currentUser['id'], $notes
            ]);
            
            $new_transfer_id = $pdo->lastInsertId();
            $pdo->commit();

            echo json_encode(['success' => true, 'message' => 'ใบโอนย้ายถูกสร้าง (Pending) สำเร็จ', 'transfer_uuid' => $transfer_uuid, 'transfer_id' => $new_transfer_id]);
            break;

        case 'get_transfer_details':
            if ($_SERVER['REQUEST_METHOD'] !== 'GET') throw new Exception("Invalid request method.");
            
            $transfer_uuid = $_GET['transfer_id'] ?? '';
            if (empty($transfer_uuid)) throw new Exception("Missing Transfer ID.");

            $sql = "SELECT 
                        t.*, 
                        i.sap_no, i.part_no, i.part_description,
                        loc_from.location_name as from_location_name,
                        loc_to.location_name as to_location_name
                    FROM $transferTable t
                    JOIN $itemTable i ON t.item_id = i.item_id
                    JOIN $locTable loc_from ON t.from_location_id = loc_from.location_id
                    JOIN $locTable loc_to ON t.to_location_id = loc_to.location_id
                    WHERE t.transfer_uuid = ?";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$transfer_uuid]);
            $details = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$details) {
                throw new Exception("ไม่พบใบโอนย้ายนี้ (Transfer ID: $transfer_uuid)");
            }

            echo json_encode(['success' => true, 'data' => $details]);
            break;

        case 'confirm_transfer':
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') throw new Exception("Invalid request method.");
            
            $transfer_uuid = $input['transfer_uuid'] ?? '';
            $confirmed_quantity = floor((float)($input['confirmed_quantity'] ?? 0)); // บังคับเป็นจำนวนเต็ม
            $actual_to_loc_id = $input['to_location_id'] ?? null;
            
            if (empty($transfer_uuid)) throw new Exception("Missing Transfer ID.");

            $pdo->beginTransaction();

            $sqlGet = "SELECT * FROM $transferTable WITH (UPDLOCK) WHERE transfer_uuid = ?";
            $stmtGet = $pdo->prepare($sqlGet);
            $stmtGet->execute([$transfer_uuid]);
            $transfer_order = $stmtGet->fetch(PDO::FETCH_ASSOC);

            if (!$transfer_order) {
                $pdo->rollBack();
                throw new Exception("ไม่พบใบโอนย้าย (อาจถูกยืนยันไปแล้ว)");
            }
            if ($transfer_order['status'] !== 'PENDING') {
                $pdo->rollBack();
                throw new Exception("ใบโอนย้ายนี้ถูกประมวลผลไปแล้ว (สถานะ: " . $transfer_order['status'] . ")");
            }

            if ($confirmed_quantity <= 0) {
                $confirmed_quantity = floor((float)$transfer_order['quantity']);
            }
            
            $item_id = $transfer_order['item_id'];
            $from_loc_id = $transfer_order['from_location_id'];
            $to_loc_id = $actual_to_loc_id ? $actual_to_loc_id : $transfer_order['to_location_id'];
            
            $transaction_timestamp = date('Y-m-d H:i:s'); 
            $itemStmt = $pdo->prepare("SELECT * FROM $itemTable WITH (NOLOCK) WHERE item_id = ?");
            $itemStmt->execute([$item_id]);
            $item_info = $itemStmt->fetch(PDO::FETCH_ASSOC);

            $oh_total = (float)$item_info['Cost_OH_Machine'] + (float)$item_info['Cost_OH_Utilities'] + (float)$item_info['Cost_OH_Indirect'] + 
                        (float)$item_info['Cost_OH_Staff'] + (float)$item_info['Cost_OH_Accessory'] + (float)$item_info['Cost_OH_Others'];
            $line_cost = (float)$item_info['Cost_Total'] * $confirmed_quantity;

            $spStock = $pdo->prepare("EXEC $spUpdateOnhand @item_id = ?, @location_id = ?, @quantity_to_change = ?");
            $spStock->execute([$item_id, $from_loc_id, -$confirmed_quantity]);
            $spStock->closeCursor();

            $spStock->execute([$item_id, $to_loc_id, $confirmed_quantity]);
            $spStock->closeCursor();
            $sqlUpdate = "UPDATE $transferTable 
                          SET status = 'COMPLETED', 
                              to_location_id = ?, 
                              confirmed_by_user_id = ?, 
                              confirmed_at = ?,
                              notes = ISNULL(notes, '') + ?
                          WHERE transfer_id = ?";
            
            $note_update = "\nConfirmed by " . $currentUser['username'] . ". Qty: " . $confirmed_quantity;
            if ($confirmed_quantity != floor((float)$transfer_order['quantity'])) {
                $note_update .= " (Original: " . floor((float)$transfer_order['quantity']) . ")";
            }

            $stmtUpdate = $pdo->prepare($sqlUpdate);
            $stmtUpdate->execute([$to_loc_id, $currentUser['id'], $transaction_timestamp, $note_update, $transfer_order['transfer_id']]);
            $transSql = "INSERT INTO $transTable 
                            (parameter_id, quantity, transaction_type, transaction_timestamp, 
                             from_location_id, to_location_id, reference_id, created_by_user_id,
                             std_cost_mat_snapshot, std_cost_dl_snapshot, std_cost_oh_snapshot, total_cost_value,
                             std_cost_oh_machine_snapshot, std_cost_oh_util_snapshot, std_cost_oh_indirect_snapshot, 
                             std_cost_oh_staff_snapshot, std_cost_oh_acc_snapshot, std_cost_oh_other_snapshot) 
                         VALUES 
                            (?, ?, 'INTERNAL_TRANSFER', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
            $transStmt = $pdo->prepare($transSql);
            $transStmt->execute([
                $item_id, $confirmed_quantity, $transaction_timestamp, $from_loc_id, $to_loc_id, $transfer_uuid, $currentUser['id'],
                $item_info['Cost_RM'], $item_info['Cost_DL'], $oh_total, $line_cost,
                $item_info['Cost_OH_Machine'], $item_info['Cost_OH_Utilities'], $item_info['Cost_OH_Indirect'],
                $item_info['Cost_OH_Staff'], $item_info['Cost_OH_Accessory'], $item_info['Cost_OH_Others']
            ]);

            $pdo->commit();
            echo json_encode(['success' => true, 'message' => 'รับของเข้าสำเร็จ! สต็อกถูกอัปเดตแล้ว']);
            break;

        case 'reverse_transfer':
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') throw new Exception("Invalid request method.");
            
            $transfer_uuid = $input['transfer_uuid'] ?? ''; 
            if (empty($transfer_uuid)) throw new Exception("Missing Transfer ID.");

            $pdo->beginTransaction();

            $sqlGet = "SELECT * FROM $transferTable WITH (UPDLOCK) WHERE transfer_uuid = ?";
            $stmtGet = $pdo->prepare($sqlGet);
            $stmtGet->execute([$transfer_uuid]);
            $transfer_order = $stmtGet->fetch(PDO::FETCH_ASSOC);

            if (!$transfer_order) {
                $pdo->rollBack();
                throw new Exception("ไม่พบใบโอนย้ายนี้");
            }
            if ($transfer_order['status'] !== 'COMPLETED') {
                $pdo->rollBack();
                throw new Exception("ไม่สามารถยกเลิกได้ สถานะปัจจุบันคือ: " . $transfer_order['status']);
            }

            $sqlGetTrans = "SELECT * FROM $transTable WHERE reference_id = ? AND transaction_type = 'INTERNAL_TRANSFER'";
            $stmtGetTrans = $pdo->prepare($sqlGetTrans);
            $stmtGetTrans->execute([$transfer_uuid]);
            $original_transaction = $stmtGetTrans->fetch(PDO::FETCH_ASSOC);

            if (!$original_transaction) {
                 $pdo->rollBack();
                throw new Exception("ไม่พบประวัติ Transaction เดิม (Internal Error)");
            }

            $quantity_to_reverse = $original_transaction['quantity']; 
            $item_id = $transfer_order['item_id'];
            $from_loc_id = $transfer_order['from_location_id']; 
            $to_loc_id = $transfer_order['to_location_id']; 
            $transaction_timestamp = date('Y-m-d H:i:s'); 

            $spStock = $pdo->prepare("EXEC $spUpdateOnhand @item_id = ?, @location_id = ?, @quantity_to_change = ?");
            $spStock->execute([$item_id, $from_loc_id, $quantity_to_reverse]);
            $spStock->closeCursor();

            $spStock->execute([$item_id, $to_loc_id, -$quantity_to_reverse]);
            $spStock->closeCursor();

            $sqlUpdate = "UPDATE $transferTable 
                          SET status = 'REVERSED', 
                              notes = ISNULL(notes, '') + ?
                          WHERE transfer_id = ?";
            $note_update = "\nReversed by " . $currentUser['username'] . " at " . $transaction_timestamp;
            $stmtUpdate = $pdo->prepare($sqlUpdate);
            $stmtUpdate->execute([$note_update, $transfer_order['transfer_id']]);

            $transSql = "INSERT INTO $transTable 
                            (parameter_id, quantity, transaction_type, transaction_timestamp, 
                             from_location_id, to_location_id, reference_id, created_by_user_id,
                             std_cost_mat_snapshot, std_cost_dl_snapshot, std_cost_oh_snapshot, total_cost_value,
                             std_cost_oh_machine_snapshot, std_cost_oh_util_snapshot, std_cost_oh_indirect_snapshot, 
                             std_cost_oh_staff_snapshot, std_cost_oh_acc_snapshot, std_cost_oh_other_snapshot) 
                         VALUES 
                            (?, ?, 'REVERSAL_TRANSFER', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
            $transStmt = $pdo->prepare($transSql);
            $transStmt->execute([
                $item_id, -$quantity_to_reverse, $transaction_timestamp, $from_loc_id, $to_loc_id, $transfer_uuid, $currentUser['id'],
                $original_transaction['std_cost_mat_snapshot'], $original_transaction['std_cost_dl_snapshot'], 
                $original_transaction['std_cost_oh_snapshot'], -$original_transaction['total_cost_value'],
                $original_transaction['std_cost_oh_machine_snapshot'], $original_transaction['std_cost_oh_util_snapshot'], 
                $original_transaction['std_cost_oh_indirect_snapshot'], $original_transaction['std_cost_oh_staff_snapshot'], 
                $original_transaction['std_cost_oh_acc_snapshot'], $original_transaction['std_cost_oh_other_snapshot']
            ]);

            $pdo->commit();
            echo json_encode(['success' => true, 'message' => 'ยกเลิกรายการสำเร็จ! สต็อกถูกย้อนกลับแล้ว']);
            break;

        case 'create_batch_transfer_orders':
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') throw new Exception("Invalid request method.");

            $parent_lot = trim($input['parent_lot'] ?? '');
            $print_count = (int)($input['print_count'] ?? 1);
            $item_id = $input['item_id'] ?? 0;
            $quantity = floor((float)($input['quantity'] ?? 0)); // บังคับเป็นจำนวนเต็ม
            $from_loc_id = $input['from_loc_id'] ?? 0;
            $to_loc_id = $input['to_loc_id'] ?? 0; 
            $notes = $input['notes'] ?? null;

            if (empty($parent_lot) || $print_count < 1 || empty($item_id) || empty($quantity) || empty($from_loc_id)) {
                throw new Exception("ข้อมูลไม่ครบถ้วน กรุณาตรวจสอบฟอร์มอีกครั้ง");
            }

            if ($print_count > 500) {
                throw new Exception("ป้องกัน Memory Limit - อนุญาตให้ปริ้นสูงสุด 500 ดวงต่อครั้ง");
            }

            $pdo->beginTransaction();

            $sqlReserve = "
                MERGE INTO dbo.LOT_SERIALS WITH (HOLDLOCK) AS T
                USING (SELECT ? AS parent_lot) AS S
                ON (T.parent_lot = S.parent_lot)
                WHEN MATCHED THEN
                    UPDATE SET T.last_serial = T.last_serial + ?, T.updated_at = GETDATE()
                WHEN NOT MATCHED THEN
                    INSERT (parent_lot, last_serial, updated_at)
                    VALUES (S.parent_lot, ?, GETDATE())
                OUTPUT inserted.last_serial, deleted.last_serial AS old_serial;
            ";
            
            $stmtReserve = $pdo->prepare($sqlReserve);
            $stmtReserve->execute([$parent_lot, $print_count, $print_count]);
            $reserveResult = $stmtReserve->fetch(PDO::FETCH_ASSOC);

            if (!$reserveResult) {
                throw new Exception("ไม่สามารถจองเลข Serial ได้");
            }

            $end_serial = (int)$reserveResult['last_serial'];
            $start_serial = (int)($reserveResult['old_serial'] ?? 0) + 1;

            $insertSql = "INSERT INTO $transferTable 
                          (transfer_uuid, item_id, quantity, from_location_id, to_location_id, status, created_by_user_id, notes)
                          VALUES (?, ?, ?, ?, ?, 'PENDING', ?, ?)";
            $insertStmt = $pdo->prepare($insertSql);

            $generated_labels = [];

            for ($i = $start_serial; $i <= $end_serial; $i++) {
                $serialSuffix = '-' . str_pad($i, 3, '0', STR_PAD_LEFT);
                $transfer_uuid = $parent_lot . $serialSuffix;

                $insertStmt->execute([
                    $transfer_uuid, $item_id, $quantity, $from_loc_id, $to_loc_id, $currentUser['id'], $notes
                ]);

                $generated_labels[] = [
                    'transfer_uuid' => $transfer_uuid,
                    'serial_no' => $serialSuffix
                ];
            }

            $pdo->commit();

            echo json_encode([
                'success' => true, 
                'message' => "สร้างและเตรียมพิมพ์ {$print_count} รายการ สำเร็จ", 
                'labels' => $generated_labels
            ]);
            break;

        default:
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => "Invalid action: $action"]);
            break;
    }
} catch (Throwable $e) {
    handleApiError($e, $pdo ?? null, $input ?? $_REQUEST);
}
?>