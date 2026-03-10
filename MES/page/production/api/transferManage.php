<?php
header('Content-Type: application/json');
require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../../auth/check_auth.php';
require_once __DIR__ . '/../../logger.php';

if (!hasPermission('add_production') && !hasPermission('manage_production')) {
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

function generateShortUUID($prefix = 'T-', $length = 8) {
    try {
        $bytes = random_bytes(ceil($length / 2));
        $hex = bin2hex($bytes);
        return $prefix . substr(strtoupper($hex), 0, $length);
    } catch (Exception $e) {
        $chars = '0123456789ABCDEF';
        $randomString = $prefix;
        for ($i = 0; $i < $length; $i++) {
            $randomString .= $chars[rand(0, 15)];
        }
        return $randomString;
    }
}

try {
    switch ($action) {

        // ==========================================================
        // ACTION: 'create_transfer_order'
        // (ถูกเรียกจาก label_printer.js)
        // ==========================================================
        case 'create_transfer_order':
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') throw new Exception("Invalid request method.");

            $transfer_uuid = $input['transfer_uuid'] ?? ''; 
            $item_id = $input['item_id'] ?? 0;
            $quantity = $input['quantity'] ?? 0;
            $from_loc_id = $input['from_loc_id'] ?? 0;
            $to_loc_id = $input['to_loc_id'] ?? 0;
            $notes = $input['notes'] ?? null;

            // 🔽🔽🔽 [แก้ไข] ลบการตรวจสอบซ้ำซ้อนออก 🔽🔽🔽
            if (empty($transfer_uuid) || empty($item_id) || empty($quantity) || $quantity <= 0 || empty($from_loc_id) || empty($to_loc_id)) {
                throw new Exception("ข้อมูลไม่ครบถ้วน (UUID, Item, Qty, From, To).");
            }
            // (ลบบรรทัดที่ตรวจสอบ `empty($item_id)` ซ้ำซ้อนออก)
            // 🔼🔼🔼 [จบส่วนแก้ไข] 🔼🔼🔼

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
                $transfer_uuid,
                $item_id,
                $quantity,
                $from_loc_id,
                $to_loc_id,
                $currentUser['id'],
                $notes
            ]);
            
            $new_transfer_id = $pdo->lastInsertId();
            
            $pdo->commit();

            echo json_encode(['success' => true, 'message' => 'ใบโอนย้ายถูกสร้าง (Pending) สำเร็จ', 'transfer_uuid' => $transfer_uuid, 'transfer_id' => $new_transfer_id]);
            break;

        // ==========================================================
        // ACTION: 'get_transfer_details'
        // (ถูกเรียกจาก mobile_entry.php ตอนสแกน QR)
        // ==========================================================
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

        // ==========================================================
        // ACTION: 'confirm_transfer'
        // (ถูกเรียกจาก mobile_entry.php ตอนกดยืนยัน "บันทึก")
        // ==========================================================
        case 'confirm_transfer':
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') throw new Exception("Invalid request method.");
            
            $transfer_uuid = $input['transfer_uuid'] ?? '';
            $confirmed_quantity = $input['confirmed_quantity'] ?? 0; 
            
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
                $confirmed_quantity = $transfer_order['quantity'];
            }
            
            $item_id = $transfer_order['item_id'];
            $from_loc_id = $transfer_order['from_location_id'];
            $to_loc_id = $transfer_order['to_location_id'];
            $transaction_timestamp = date('Y-m-d H:i:s'); 

            $spStock = $pdo->prepare("EXEC $spUpdateOnhand @item_id = ?, @location_id = ?, @quantity_to_change = ?");
            $spStock->execute([$item_id, $from_loc_id, -$confirmed_quantity]);
            $spStock->closeCursor();

            $spStock->execute([$item_id, $to_loc_id, $confirmed_quantity]);
            $spStock->closeCursor();

            $sqlUpdate = "UPDATE $transferTable 
                          SET status = 'COMPLETED', 
                              confirmed_by_user_id = ?, 
                              confirmed_at = ?,
                              notes = ISNULL(notes, '') + ?
                          WHERE transfer_id = ?";
            
            $note_update = "\nConfirmed by " . $currentUser['username'] . ". Qty: " . $confirmed_quantity;
            if ($confirmed_quantity != $transfer_order['quantity']) {
                $note_update .= " (Original: " . $transfer_order['quantity'] . ")";
            }

            $stmtUpdate = $pdo->prepare($sqlUpdate);
            $stmtUpdate->execute([
                $currentUser['id'],
                $transaction_timestamp,
                $note_update,
                $transfer_order['transfer_id']
            ]);

            $transSql = "INSERT INTO $transTable 
                            (parameter_id, quantity, transaction_type, transaction_timestamp, from_location_id, to_location_id, reference_id, created_by_user_id) 
                         VALUES 
                            (?, ?, 'INTERNAL_TRANSFER', ?, ?, ?, ?, ?)";
            $transStmt = $pdo->prepare($transSql);
            $transStmt->execute([
                $item_id,
                $confirmed_quantity,
                $transaction_timestamp,
                $from_loc_id,
                $to_loc_id,
                $transfer_uuid, 
                $currentUser['id']
            ]);

            $pdo->commit();

            echo json_encode(['success' => true, 'message' => 'รับของเข้าสำเร็จ! สต็อกถูกอัปเดตแล้ว']);
            break;

        // ==========================================================
        // ACTION: 'reverse_transfer'
        // (ถูกเรียกจาก UI เมื่อต้องการยกเลิกใบโอนที่ Completed)
        // ==========================================================
        case 'reverse_transfer':
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') throw new Exception("Invalid request method.");
            
            // (เราจะรับ $transfer_uuid จาก UI)
            $transfer_uuid = $input['transfer_uuid'] ?? ''; 
            if (empty($transfer_uuid)) throw new Exception("Missing Transfer ID.");

            $pdo->beginTransaction();

            // 1. ดึงใบโอน และล็อกแถว
            $sqlGet = "SELECT * FROM $transferTable WITH (UPDLOCK) WHERE transfer_uuid = ?";
            $stmtGet = $pdo->prepare($sqlGet);
            $stmtGet->execute([$transfer_uuid]);
            $transfer_order = $stmtGet->fetch(PDO::FETCH_ASSOC);

            if (!$transfer_order) {
                $pdo->rollBack();
                throw new Exception("ไม่พบใบโอนย้ายนี้");
            }
            // ⭐️ (สำคัญ) เราจะอนุญาตให้ยกเลิกได้เฉพาะรายการที่ 'COMPLETED' เท่านั้น
            if ($transfer_order['status'] !== 'COMPLETED') {
                $pdo->rollBack();
                throw new Exception("ไม่สามารถยกเลิกได้ สถานะปัจจุบันคือ: " . $transfer_order['status']);
            }

            // 2. ดึง Transaction เดิม เพื่อหายอดที่ยืนยันไปจริงๆ
            $sqlGetTrans = "SELECT * FROM $transTable WHERE reference_id = ? AND transaction_type = 'INTERNAL_TRANSFER'";
            $stmtGetTrans = $pdo->prepare($sqlGetTrans);
            $stmtGetTrans->execute([$transfer_uuid]);
            $original_transaction = $stmtGetTrans->fetch(PDO::FETCH_ASSOC);

            if (!$original_transaction) {
                 $pdo->rollBack();
                throw new Exception("ไม่พบประวัติ Transaction เดิม (Internal Error)");
            }

            $quantity_to_reverse = $original_transaction['quantity']; // ยอดที่ยืนยันไปจริง
            $item_id = $transfer_order['item_id'];
            $from_loc_id = $transfer_order['from_location_id']; // (Store)
            $to_loc_id = $transfer_order['to_location_id']; // (WIP)
            $transaction_timestamp = date('Y-m-d H:i:s'); 

            // 3. (ย้อนกลับ) เรียก SP เพื่อ "บวก" สต็อกคืนต้นทาง (Store)
            $spStock = $pdo->prepare("EXEC $spUpdateOnhand @item_id = ?, @location_id = ?, @quantity_to_change = ?");
            $spStock->execute([$item_id, $from_loc_id, $quantity_to_reverse]);
            $spStock->closeCursor();

            // 4. (ย้อนกลับ) เรียก SP เพื่อ "ลบ" สต็อกออกจากปลายทาง (WIP)
            $spStock->execute([$item_id, $to_loc_id, -$quantity_to_reverse]);
            $spStock->closeCursor();

            // 5. อัปเดตสถานะใบโอนเป็น "REVERSED"
            $sqlUpdate = "UPDATE $transferTable 
                          SET status = 'REVERSED', 
                              notes = ISNULL(notes, '') + ?
                          WHERE transfer_id = ?";
            $note_update = "\nReversed by " . $currentUser['username'] . " at " . $transaction_timestamp;
            $stmtUpdate = $pdo->prepare($sqlUpdate);
            $stmtUpdate->execute([$note_update, $transfer_order['transfer_id']]);

            // 6. บันทึกประวัติการย้อนกลับ (Reversal Transaction)
            $transSql = "INSERT INTO $transTable 
                            (parameter_id, quantity, transaction_type, transaction_timestamp, from_location_id, to_location_id, reference_id, created_by_user_id) 
                         VALUES 
                            (?, ?, 'REVERSAL_TRANSFER', ?, ?, ?, ?, ?)";
            $transStmt = $pdo->prepare($transSql);
            $transStmt->execute([
                $item_id,
                -$quantity_to_reverse, // ⭐️ บันทึกเป็นยอดติดลบ
                $transaction_timestamp,
                $from_loc_id, // (ต้นทางเดิม)
                $to_loc_id,   // (ปลายทางเดิม)
                $transfer_uuid, 
                $currentUser['id']
            ]);

            $pdo->commit();

            echo json_encode(['success' => true, 'message' => 'ยกเลิกรายการสำเร็จ! สต็อกถูกย้อนกลับแล้ว']);
            break;

        case 'get_transfer_history':
            if ($_SERVER['REQUEST_METHOD'] !== 'GET') throw new Exception("Invalid request method.");

            $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
            $limit = 50;
            $offset = ($page - 1) * $limit;

            $params = [];
            $conditions = [];

            // 🔽🔽🔽 [แก้ไข] 🔽🔽🔽
            // 1. Filter ตามสถานะ (ทำให้ 'PENDING' เป็นค่า Default)
            $status_filter = $_GET['status_filter'] ?? 'PENDING'; // ⭐️ Default เป็น PENDING
            if ($status_filter !== 'ALL') {
                $conditions[] = "t.status = ?";
                $params[] = $status_filter;
            }
            // 🔼🔼🔼 [จบส่วนแก้ไข] 🔼🔼🔼

            // 2. Filter ตามวันที่ (วันที่สร้าง)
            if (!empty($_GET['startDate'])) {
                $conditions[] = "CAST(t.created_at AS DATE) >= ?";
                $params[] = $_GET['startDate'];
            }
            if (!empty($_GET['endDate'])) {
                $conditions[] = "CAST(t.created_at AS DATE) <= ?";
                $params[] = $_GET['endDate'];
            }

            // 3. Filter ตาม Role (เหมือนเดิม)
            if ($currentUser['role'] === 'supervisor') {
                $conditions[] = "(loc_from.production_line = ? OR loc_to.production_line = ?)";
                $params[] = $currentUser['line'];
                $params[] = $currentUser['line'];
            }
            
            // (เพิ่ม Search UUID/Lot)
            if (!empty($_GET['search_term'])) {
                 $conditions[] = "(t.transfer_uuid LIKE ? OR i.sap_no LIKE ? OR i.part_no LIKE ?)";
                 $params[] = "%" . $_GET['search_term'] . "%";
                 $params[] = "%" . $_GET['search_term'] . "%";
                 $params[] = "%" . $_GET['search_term'] . "%";
            }

            $whereClause = !empty($conditions) ? "WHERE " . implode(" AND ", $conditions) : "";

            // --- Query นับ Total ---
            $totalSql = "SELECT COUNT(*) 
                         FROM $transferTable t
                         LEFT JOIN $itemTable i ON t.item_id = i.item_id
                         LEFT JOIN $locTable loc_from ON t.from_location_id = loc_from.location_id
                         LEFT JOIN $locTable loc_to ON t.to_location_id = loc_to.location_id
                         {$whereClause}";
            $totalStmt = $pdo->prepare($totalSql);
            $totalStmt->execute($params);
            $total = (int)$totalStmt->fetchColumn();

            // --- Query ดึงข้อมูล ---
            $dataSql = "
                SELECT
                    t.transfer_id, t.transfer_uuid, t.status, t.created_at, t.confirmed_at,
                    i.sap_no, i.part_no, t.quantity,
                    loc_from.location_name AS from_location,
                    loc_to.location_name AS to_location,
                    u_create.username AS created_by,
                    u_confirm.username AS confirmed_by,
                    t.notes
                FROM $transferTable t
                JOIN $itemTable i ON t.item_id = i.item_id
                JOIN $locTable loc_from ON t.from_location_id = loc_from.location_id
                JOIN $locTable loc_to ON t.to_location_id = loc_to.location_id
                LEFT JOIN " . USERS_TABLE . " u_create ON t.created_by_user_id = u_create.id
                LEFT JOIN " . USERS_TABLE . " u_confirm ON t.confirmed_by_user_id = u_confirm.id
                {$whereClause}
                ORDER BY t.created_at DESC
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

        case 'cancel_pending_transfer':
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') throw new Exception("Invalid request method.");
            
            $transfer_uuid = $input['transfer_uuid'] ?? ''; 
            if (empty($transfer_uuid)) throw new Exception("Missing Transfer ID.");

            if (!hasPermission('manage_production')) {
                 throw new Exception("Unauthorized to cancel transfers. Manage permission required.");
            }

            $pdo->beginTransaction();

            $sqlGet = "SELECT * FROM $transferTable WITH (UPDLOCK) WHERE transfer_uuid = ?";
            $stmtGet = $pdo->prepare($sqlGet);
            $stmtGet->execute([$transfer_uuid]);
            $transfer_order = $stmtGet->fetch(PDO::FETCH_ASSOC);

            if (!$transfer_order) {
                $pdo->rollBack();
                throw new Exception("ไม่พบใบโอนย้ายนี้");
            }
            
            if ($transfer_order['status'] !== 'PENDING') {
                $pdo->rollBack();
                throw new Exception("ไม่สามารถยกเลิกได้ สถานะปัจจุบันคือ: " . $transfer_order['status']);
            }

            $sqlUpdate = "UPDATE $transferTable 
                          SET status = 'CANCELLED', 
                              notes = ISNULL(notes, '') + ?
                          WHERE transfer_id = ?";
            $note_update = "\nCancelled by " . $currentUser['username'] . " at " . date('Y-m-d H:i:s');
            $stmtUpdate = $pdo->prepare($sqlUpdate);
            $stmtUpdate->execute([$note_update, $transfer_order['transfer_id']]);

            $pdo->commit();

            echo json_encode(['success' => true, 'message' => 'ยกเลิกใบโอน (Pending) สำเร็จ']);
            break;

        // ==========================================================
        // ACTION: 'create_batch_transfer_orders'
        // ==========================================================
        case 'create_batch_transfer_orders':
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') throw new Exception("Invalid request method.");

            $parent_lot = trim($input['parent_lot'] ?? '');
            $print_count = (int)($input['print_count'] ?? 1);
            $item_id = $input['item_id'] ?? 0;
            $quantity = $input['quantity'] ?? 0;
            $from_loc_id = $input['from_loc_id'] ?? 0;
            $to_loc_id = $input['to_loc_id'] ?? 0;
            $notes = $input['notes'] ?? null;

            if (empty($parent_lot) || $print_count < 1 || empty($item_id) || empty($quantity) || empty($from_loc_id) || empty($to_loc_id)) {
                throw new Exception("ข้อมูลไม่ครบถ้วน กรุณาตรวจสอบฟอร์มอีกครั้ง");
            }
            if ($from_loc_id == $to_loc_id) {
                throw new Exception("คลังต้นทางและปลายทางต้องไม่ซ้ำกัน");
            }
            if ($print_count > 500) {
                throw new Exception("ป้องกัน Memory Limit - อนุญาตให้ปริ้นสูงสุด 500 ดวงต่อครั้ง");
            }

            $pdo->beginTransaction();

            // 1. Reserve Serial Block ทีเดียวรวดเพื่อความเร็วและป้องกัน Concurrency
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

            // 2. Insert แบบ Batch ด้วย Prepared Statement
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

} catch (PDOException $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => "Database Error: " . $e->getMessage()]);
    error_log("Transfer API Error: " . $e->getMessage());

} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    error_log("Transfer API Error: " . $e->getMessage());
}
?>