<?php
require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../../auth/check_auth.php';
require_once __DIR__ . '/../../logger.php';

header('Content-Type: application/json');

// ตรวจสอบสิทธิ์พื้นฐาน
if (!hasRole(['operator', 'supervisor', 'admin', 'creator'])) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

$action = $_REQUEST['action'] ?? '';
$input = json_decode(file_get_contents("php://input"), true);
$currentUser = $_SESSION['user'];

try {
    switch ($action) {
        // 1. ดึงข้อมูลเบื้องต้น (Item List + Locations)
        case 'get_initial_data':
            // ดึง Items สำหรับ Autocomplete
            $itemsStmt = $pdo->query("SELECT item_id, sap_no, part_no, part_description FROM " . ITEMS_TABLE . " WHERE is_active = 1 ORDER BY sap_no");
            
            // ดึง Locations
            $locStmt = $pdo->query("SELECT location_id, location_name, location_type, production_line FROM " . LOCATIONS_TABLE . " WHERE is_active = 1 ORDER BY location_name");
            
            echo json_encode([
                'success' => true,
                'items' => $itemsStmt->fetchAll(PDO::FETCH_ASSOC),
                'locations' => $locStmt->fetchAll(PDO::FETCH_ASSOC),
                'user_role' => $currentUser['role'],
                'user_line' => $currentUser['line'] ?? null
            ]);
            break;

        // 2. บันทึกของเสียและขอเบิก (สำหรับ Production)
        case 'create_request':
            $pdo->beginTransaction();
            
            $item_id = $input['item_id'];
            $qty = floatval($input['quantity']);
            $wip_loc = $input['wip_location_id'];
            $store_loc = $input['store_location_id'];
            $defect_source = $input['defect_source'] ?? 'SNC';
            $raw_reason = $input['reason'];
            
            // รวม Source เข้ากับเหตุผล
            $full_reason = "[$defect_source] $raw_reason"; 
            $timestamp = date('Y-m-d H:i:s');

            // 2.1 ตัดสต็อกของเสีย (SCRAP) ออกจาก WIP
            $spStock = $pdo->prepare("EXEC dbo." . SP_UPDATE_ONHAND . " @item_id = ?, @location_id = ?, @quantity_to_change = ?");
            $spStock->execute([$item_id, $wip_loc, -$qty]);

            // Log Transaction (SCRAP) - ใช้ $full_reason
            $transSql = "INSERT INTO " . TRANSACTIONS_TABLE . " (parameter_id, quantity, transaction_type, from_location_id, created_by_user_id, notes, transaction_timestamp) VALUES (?, ?, 'SCRAP', ?, ?, ?, ?)";
            $pdo->prepare($transSql)->execute([$item_id, -$qty, $wip_loc, $currentUser['id'], "Defect: $full_reason", $timestamp]);

            // 2.2 สร้างใบขอเบิก (Transfer Request) - ใช้ $full_reason
            $uuid = 'REQ-' . strtoupper(uniqid());
            $sqlReq = "INSERT INTO " . TRANSFER_ORDERS_TABLE . " (transfer_uuid, item_id, quantity, from_location_id, to_location_id, status, created_by_user_id, notes) VALUES (?, ?, ?, ?, ?, 'PENDING', ?, ?)";
            $pdo->prepare($sqlReq)->execute([$uuid, $item_id, $qty, $store_loc, $wip_loc, $currentUser['id'], "Replacement: $full_reason"]);

            $pdo->commit();
            echo json_encode(['success' => true, 'message' => 'บันทึกของเสียและส่งคำขอเบิกแล้ว']);
            break;

        // 3. ดึงรายการคำขอ (ตาม Role)
        case 'get_requests':
            // รับค่า status จากหน้าบ้าน ถ้าไม่ส่งมา ให้เป็น 'ALL'
            $status = $_GET['status'] ?? 'ALL'; 
            
            $conditions = [];
            $params = [];

            $conditions[] = "t.transfer_uuid LIKE 'REQ-%'"; // กรองเฉพาะคำขอเบิกที่สร้างจาก Production

            // ถ้าไม่ได้ขอ 'ALL' ให้กรองตามสถานะ (เช่น PENDING)
            if ($status !== 'ALL') {
                $conditions[] = "t.status = ?";
                $params[] = $status;
            }

            // --- Role Logic ---
            if ($currentUser['role'] === 'supervisor') {
                $conditions[] = "(loc_to.production_line = ? OR t.created_by_user_id = ?)";
                $params[] = $currentUser['line'];
                $params[] = $currentUser['id'];
            } 
            elseif ($currentUser['role'] === 'operator') {
                $conditions[] = "t.created_by_user_id = ?";
                $params[] = $currentUser['id'];
            }

            $whereClause = !empty($conditions) ? "WHERE " . implode(" AND ", $conditions) : "";
            
            // เพิ่ม TOP 100 เพื่อไม่ให้โหลดหนักเกินไปในอนาคต
            $sql = "SELECT TOP 100 t.*, i.sap_no, i.part_no, i.part_description,
                           loc_from.location_name as from_loc, loc_to.location_name as to_loc,
                           u.username as requester
                    FROM " . TRANSFER_ORDERS_TABLE . " t
                    JOIN " . ITEMS_TABLE . " i ON t.item_id = i.item_id
                    JOIN " . LOCATIONS_TABLE . " loc_from ON t.from_location_id = loc_from.location_id
                    JOIN " . LOCATIONS_TABLE . " loc_to ON t.to_location_id = loc_to.location_id
                    LEFT JOIN " . USERS_TABLE . " u ON t.created_by_user_id = u.id
                    $whereClause
                    ORDER BY t.created_at DESC"; 

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
            break;

        // 4. อนุมัติคำขอ (สำหรับ Store)
        case 'approve_request':
            if (!hasRole(['admin', 'creator'])) throw new Exception("Unauthorized"); // Store Only

            $pdo->beginTransaction();
            $transfer_id = $input['transfer_id'];
            
            // ดึงข้อมูล
            $req = $pdo->query("SELECT * FROM " . TRANSFER_ORDERS_TABLE . " WHERE transfer_id = $transfer_id")->fetch(PDO::FETCH_ASSOC);
            if ($req['status'] !== 'PENDING') throw new Exception("รายการนี้ถูกดำเนินการไปแล้ว");

            $qty = $req['quantity'];
            $timestamp = date('Y-m-d H:i:s');

            // ตัดสต็อก Store -> เพิ่มสต็อก WIP
            $spStock = $pdo->prepare("EXEC dbo." . SP_UPDATE_ONHAND . " @item_id = ?, @location_id = ?, @quantity_to_change = ?");
            $spStock->execute([$req['item_id'], $req['from_location_id'], -$qty]); // Store Out
            $spStock->execute([$req['item_id'], $req['to_location_id'], $qty]);    // WIP In

            // อัปเดต Status
            $updateSql = "UPDATE " . TRANSFER_ORDERS_TABLE . " SET status = 'COMPLETED', confirmed_by_user_id = ?, confirmed_at = ? WHERE transfer_id = ?";
            $pdo->prepare($updateSql)->execute([$currentUser['id'], $timestamp, $transfer_id]);

            // Log Transaction (Internal Transfer)
            $transSql = "INSERT INTO " . TRANSACTIONS_TABLE . " (parameter_id, quantity, transaction_type, from_location_id, to_location_id, created_by_user_id, reference_id, transaction_timestamp) VALUES (?, ?, 'INTERNAL_TRANSFER', ?, ?, ?, ?, ?)";
            $pdo->prepare($transSql)->execute([$req['item_id'], $qty, $req['from_location_id'], $req['to_location_id'], $currentUser['id'], $req['transfer_uuid'], $timestamp]);

            $pdo->commit();
            echo json_encode(['success' => true, 'message' => 'อนุมัติจ่ายของเรียบร้อย']);
            break;
            
         // 5. ปฏิเสธคำขอ
         case 'reject_request':
            if (!hasRole(['admin', 'creator'])) throw new Exception("Unauthorized");
            
            $transfer_id = $input['transfer_id'];
            $reason = $input['reject_reason'];
            
            $sql = "UPDATE " . TRANSFER_ORDERS_TABLE . " SET status = 'REJECTED', notes = CONCAT(notes, ' | Rejected: $reason'), confirmed_by_user_id = ? WHERE transfer_id = ?";
            $pdo->prepare($sql)->execute([$currentUser['id'], $transfer_id]);
            
            echo json_encode(['success' => true, 'message' => 'ปฏิเสธคำขอเรียบร้อย']);
            break;
    }
} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}