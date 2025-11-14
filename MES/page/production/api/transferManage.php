<?php
// ไฟล์: api/transferManage.php
// API สำหรับจัดการใบโอนย้ายภายใน (Internal Transfer Orders)

header('Content-Type: application/json');
require_once __DIR__ . '/../../db.php'; //
require_once __DIR__ . '/../../../auth/check_auth.php'; //
require_once __DIR__ . '/../../logger.php'; // (ถ้าคุณมี logger.php)

// --- ตรวจสอบสิทธิ์ ---
// ทุกคนที่ล็อกอินสามารถสร้างหรือยืนยันได้ (ปรับ Role ได้ตามต้องการ)
if (!hasRole(['operator', 'supervisor', 'admin', 'creator'])) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

// --- CSRF Check (สำหรับ POST/PUT) ---
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    if (!isset($_SERVER['HTTP_X_CSRF_TOKEN']) || !isset($_SESSION['csrf_token']) || !hash_equals($_SESSION['csrf_token'], $_SERVER['HTTP_X_CSRF_TOKEN'])) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'CSRF token validation failed.']);
        exit;
    }
}

// --- กำหนดค่าคงที่ตาราง ---
$transferTable = TRANSFER_ORDERS_TABLE;
$itemTable = ITEMS_TABLE;
$locTable = LOCATIONS_TABLE;
$spUpdateOnhand = SP_UPDATE_ONHAND; //
$transTable = TRANSACTIONS_TABLE; //

$action = $_REQUEST['action'] ?? '';
$input = json_decode(file_get_contents("php://input"), true);
$currentUser = $_SESSION['user'];

// --- ฟังก์ชันสร้าง UUID สั้นๆ (เหมือนใน inventoryManage.php) ---
// (เราไม่ได้ใช้แล้ว เพราะรับ UUID จาก label_printer.js แต่เก็บไว้เผื่ออนาคตได้)
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