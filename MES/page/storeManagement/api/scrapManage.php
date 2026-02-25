<?php
// MES/page/storeManagement/api/scrapManage.php
require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../../auth/check_auth.php';
require_once __DIR__ . '/../../logger.php';

header('Content-Type: application/json');

// Security Check
if (!hasRole(['operator', 'supervisor', 'admin', 'creator', 'planner'])) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

$action = $_REQUEST['action'] ?? '';
$input = json_decode(file_get_contents("php://input"), true);
$currentUser = $_SESSION['user'];

try {
    switch ($action) {
        // 1. ดึงข้อมูล Master Data
        case 'get_initial_data':
            // Optimization: Select only necessary columns
            $itemsStmt = $pdo->query("SELECT item_id, sap_no, part_no, part_description FROM " . ITEMS_TABLE . " WITH (NOLOCK) WHERE is_active = 1 ORDER BY sap_no");
            
            $locStmt = $pdo->query("SELECT location_id, location_name, location_type, production_line FROM " . LOCATIONS_TABLE . " WITH (NOLOCK) WHERE is_active = 1 ORDER BY location_name");
            
            echo json_encode([
                'success' => true,
                'items' => $itemsStmt->fetchAll(PDO::FETCH_ASSOC),
                'locations' => $locStmt->fetchAll(PDO::FETCH_ASSOC),
                'user_role' => $currentUser['role'],
                'user_line' => $currentUser['line'] ?? null
            ]);
            break;

        // 2. Create Request (Scrap & Replace)
        case 'create_request':
            if (empty($input['item_id']) || empty($input['store_location_id'])) {
                throw new Exception("ข้อมูลไม่ครบถ้วน (Item หรือ Store)");
            }

            $pdo->beginTransaction();
            
            $item_id = $input['item_id'];
            $qty = floatval($input['quantity']);
            $wip_loc = $input['wip_location_id'];
            $store_loc = $input['store_location_id'];
            $defect_source = $input['defect_source'] ?? 'SNC';
            $raw_reason = trim($input['reason']);
            
            if ($qty <= 0) throw new Exception("จำนวนต้องมากกว่า 0");

            // Format Reason
            $full_reason = "[$defect_source] $raw_reason"; 
            $timestamp = date('Y-m-d H:i:s');

            // 2.1 ตัดสต็อกของเสียออกจาก WIP (SCRAP Transaction)
            $spStock = $pdo->prepare("EXEC dbo." . SP_UPDATE_ONHAND . " @item_id = ?, @location_id = ?, @quantity_to_change = ?");
            $spStock->execute([$item_id, $wip_loc, -$qty]);

            $transSql = "INSERT INTO " . TRANSACTIONS_TABLE . " (parameter_id, quantity, transaction_type, from_location_id, created_by_user_id, notes, transaction_timestamp) VALUES (?, ?, 'SCRAP', ?, ?, ?, ?)";
            $pdo->prepare($transSql)->execute([$item_id, -$qty, $wip_loc, $currentUser['id'], "Defect: $full_reason", $timestamp]);

            // 2.2 สร้าง Transfer Request (Replacement)
            $uuid = 'REQ-' . strtoupper(uniqid());
            $sqlReq = "INSERT INTO " . TRANSFER_ORDERS_TABLE . " (transfer_uuid, item_id, quantity, from_location_id, to_location_id, status, created_by_user_id, notes, created_at) VALUES (?, ?, ?, ?, ?, 'PENDING', ?, ?, ?)";
            $pdo->prepare($sqlReq)->execute([$uuid, $item_id, $qty, $store_loc, $wip_loc, $currentUser['id'], "Replacement: $full_reason", $timestamp]);

            $pdo->commit();
            echo json_encode(['success' => true, 'message' => 'บันทึกของเสียและส่งคำขอเบิกแล้ว']);
            break;

        //ดึงเฉพาะยอดสรุป (เบาและเร็วกว่านิดหน่อย)
        case 'get_request_summary':
            // copy logic รับค่า Filter มาเหมือนเดิมเป๊ะๆ
            $status = $_GET['status'] ?? 'ALL'; 
            $search = trim($_GET['search'] ?? '');
            $startDate = $_GET['start_date'] ?? date('Y-m-01');
            $endDate = $_GET['end_date'] ?? date('Y-m-d');
            $startDateTime = $startDate . ' 00:00:00';
            $endDateTime = $endDate . ' 23:59:59';

            $conditions = [
                "t.created_at BETWEEN ? AND ?",
                "t.transfer_uuid LIKE 'REQ-%'" 
            ];
            $params = [$startDateTime, $endDateTime];

            if ($status !== 'ALL') {
                $conditions[] = "t.status = ?";
                $params[] = $status;
            }
            if (!empty($search)) {
                $conditions[] = "(i.sap_no LIKE ? OR i.part_no LIKE ? OR i.part_description LIKE ? OR t.transfer_uuid LIKE ?)";
                $likeTerm = "%$search%";
                array_push($params, $likeTerm, $likeTerm, $likeTerm, $likeTerm);
            }
            if ($currentUser['role'] === 'operator') {
                $conditions[] = "t.created_by_user_id = ?";
                $params[] = $currentUser['id'];
            }

            $whereClause = !empty($conditions) ? "WHERE " . implode(" AND ", $conditions) : "";

            // Query Summary อย่างเดียว
            $sqlSummary = "SELECT 
                                COUNT(t.transfer_id) as total_count,
                                ISNULL(SUM(t.quantity), 0) as total_qty,
                                ISNULL(SUM(t.quantity * ISNULL(i.Cost_Total, 0)), 0) as total_cost
                           FROM " . TRANSFER_ORDERS_TABLE . " t WITH (NOLOCK)
                           JOIN " . ITEMS_TABLE . " i WITH (NOLOCK) ON t.item_id = i.item_id
                           JOIN " . LOCATIONS_TABLE . " loc_to WITH (NOLOCK) ON t.to_location_id = loc_to.location_id
                           LEFT JOIN " . USERS_TABLE . " u WITH (NOLOCK) ON t.created_by_user_id = u.id 
                           $whereClause";
            
            $stmt = $pdo->prepare($sqlSummary);
            $stmt->execute($params);
            echo json_encode(['success' => true, 'summary' => $stmt->fetch(PDO::FETCH_ASSOC)]);
            break;

        // 3. Get Requests (Server-side Search Implemented)
        case 'get_requests':
            $status = $_GET['status'] ?? 'ALL'; 
            $search = trim($_GET['search'] ?? '');
            $startDate = $_GET['start_date'] ?? date('Y-m-01');
            $endDate = $_GET['end_date'] ?? date('Y-m-d');

            // เติมเวลาให้ครอบคลุมทั้งวัน (00:00:00 - 23:59:59)
            $startDateTime = $startDate . ' 00:00:00';
            $endDateTime = $endDate . ' 23:59:59';

            $conditions = [];
            $params = [];

            // 1. Base Condition (Filter ตามวันที่สร้าง)
            $conditions[] = "t.created_at BETWEEN ? AND ?";
            $conditions[] = "t.transfer_uuid LIKE 'REQ-%'";
            $params[] = $startDateTime;
            $params[] = $endDateTime;

            // 2. Status Filter
            if ($status !== 'ALL') {
                $conditions[] = "t.status = ?";
                $params[] = $status;
            }

            // 3. Search Filter
            if (!empty($search)) {
                $conditions[] = "(i.sap_no LIKE ? OR i.part_no LIKE ? OR i.part_description LIKE ? OR t.transfer_uuid LIKE ?)";
                $likeTerm = "%$search%";
                array_push($params, $likeTerm, $likeTerm, $likeTerm, $likeTerm);
            }

            // 4. Role Security
            if ($currentUser['role'] === 'supervisor') {
                $conditions[] = "(loc_to.production_line = ? OR t.created_by_user_id = ?)";
                array_push($params, $currentUser['line'], $currentUser['id']);
            } 
            elseif ($currentUser['role'] === 'operator') {
                $conditions[] = "t.created_by_user_id = ?";
                $params[] = $currentUser['id'];
            }

            $whereClause = !empty($conditions) ? "WHERE " . implode(" AND ", $conditions) : "";
            
            $sqlData = "SELECT TOP 500 t.*, i.sap_no, i.part_no, i.part_description,
                           ISNULL(i.Cost_Total, 0) as unit_cost, 
                           loc_from.location_name as from_loc, loc_to.location_name as to_loc,
                           ISNULL(e.name_th, u.username) as requester
                    FROM " . TRANSFER_ORDERS_TABLE . " t WITH (NOLOCK)
                    JOIN " . ITEMS_TABLE . " i WITH (NOLOCK) ON t.item_id = i.item_id
                    JOIN " . LOCATIONS_TABLE . " loc_from WITH (NOLOCK) ON t.from_location_id = loc_from.location_id
                    JOIN " . LOCATIONS_TABLE . " loc_to WITH (NOLOCK) ON t.to_location_id = loc_to.location_id
                    LEFT JOIN " . USERS_TABLE . " u WITH (NOLOCK) ON t.created_by_user_id = u.id
                    LEFT JOIN " . MANPOWER_EMPLOYEES_TABLE . " e WITH (NOLOCK) ON u.emp_id = e.emp_id
                    $whereClause
                    ORDER BY t.created_at DESC";

            $stmt = $pdo->prepare($sqlData);
            $stmt->execute($params);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode([
                'success' => true, 
                'data' => $rows
            ]);
            break;

        // 4. Approve Request
        case 'approve_request':
            if (!hasRole(['admin', 'creator'])) throw new Exception("Unauthorized");

            $pdo->beginTransaction();
            $transfer_id = $input['transfer_id'];
            
            // Check status with Lock to prevent double approval
            $reqStmt = $pdo->prepare("SELECT * FROM " . TRANSFER_ORDERS_TABLE . " WITH (UPDLOCK) WHERE transfer_id = ?");
            $reqStmt->execute([$transfer_id]);
            $req = $reqStmt->fetch(PDO::FETCH_ASSOC);

            if (!$req) throw new Exception("ไม่พบรายการ");
            if ($req['status'] !== 'PENDING') throw new Exception("รายการนี้สถานะไม่ใช่ Pending (อาจถูกอนุมัติไปแล้ว)");

            $qty = floatval($req['quantity']);
            $timestamp = date('Y-m-d H:i:s');

            // Movement: ตัด Store -> เพิ่ม WIP
            $spStock = $pdo->prepare("EXEC dbo." . SP_UPDATE_ONHAND . " @item_id = ?, @location_id = ?, @quantity_to_change = ?");
            $spStock->execute([$req['item_id'], $req['from_location_id'], -$qty]); 
            $spStock->execute([$req['item_id'], $req['to_location_id'], $qty]);

            // Update Status
            $updateSql = "UPDATE " . TRANSFER_ORDERS_TABLE . " SET status = 'COMPLETED', confirmed_by_user_id = ?, confirmed_at = ? WHERE transfer_id = ?";
            $pdo->prepare($updateSql)->execute([$currentUser['id'], $timestamp, $transfer_id]);

            // Transaction Log
            $transSql = "INSERT INTO " . TRANSACTIONS_TABLE . " (parameter_id, quantity, transaction_type, from_location_id, to_location_id, created_by_user_id, reference_id, transaction_timestamp, notes) VALUES (?, ?, 'INTERNAL_TRANSFER', ?, ?, ?, ?, ?, ?)";
            $pdo->prepare($transSql)->execute([$req['item_id'], $qty, $req['from_location_id'], $req['to_location_id'], $currentUser['id'], $req['transfer_uuid'], $timestamp, "Approved Replacement"]);

            $pdo->commit();
            echo json_encode(['success' => true, 'message' => 'อนุมัติจ่ายของเรียบร้อย']);
            break;
            
         // 5. Reject Request
         case 'reject_request':
            if (!hasRole(['admin', 'creator'])) throw new Exception("Unauthorized");
            
            $transfer_id = $input['transfer_id'];
            $reason = trim($input['reject_reason']);
            $timestamp = date('Y-m-d H:i:s');
            
            $sql = "UPDATE " . TRANSFER_ORDERS_TABLE . " SET status = 'REJECTED', notes = CONCAT(notes, ' | Rejected: $reason'), confirmed_by_user_id = ?, confirmed_at = ? WHERE transfer_id = ?";
            $pdo->prepare($sql)->execute([$currentUser['id'], $timestamp, $transfer_id]);
            
            echo json_encode(['success' => true, 'message' => 'ปฏิเสธคำขอเรียบร้อย']);
            break;

        // 6. Export Data (JSON for Frontend XLSX)
        case 'export':
            $status = $_GET['status'] ?? 'ALL'; 
            $search = trim($_GET['search'] ?? '');
            $startDate = $_GET['start_date'] ?? date('Y-m-01');
            $endDate = $_GET['end_date'] ?? date('Y-m-d');
            $startDateTime = $startDate . ' 00:00:00';
            $endDateTime = $endDate . ' 23:59:59';

            $conditions = [
                "t.created_at BETWEEN ? AND ?",
                "t.transfer_uuid LIKE 'REQ-%'"
            ];
            $params = [$startDateTime, $endDateTime];

            if ($status !== 'ALL') {
                $conditions[] = "t.status = ?";
                $params[] = $status;
            }
            if (!empty($search)) {
                $conditions[] = "(i.sap_no LIKE ? OR i.part_no LIKE ? OR i.part_description LIKE ? OR t.transfer_uuid LIKE ?)";
                $likeTerm = "%$search%";
                array_push($params, $likeTerm, $likeTerm, $likeTerm, $likeTerm);
            }
            if ($currentUser['role'] === 'supervisor') {
                $conditions[] = "(loc_to.production_line = ? OR t.created_by_user_id = ?)";
                array_push($params, $currentUser['line'], $currentUser['id']);
            } elseif ($currentUser['role'] === 'operator') {
                $conditions[] = "t.created_by_user_id = ?";
                $params[] = $currentUser['id'];
            }

            $whereClause = !empty($conditions) ? "WHERE " . implode(" AND ", $conditions) : "";

            // Query Data (เลือก Column เท่าที่จำเป็น)
            $sql = "SELECT t.created_at, t.transfer_uuid, i.sap_no, i.part_no, i.part_description,
                           t.quantity, ISNULL(i.Cost_Total, 0) as unit_cost,
                           loc_from.location_name as from_loc, loc_to.location_name as to_loc,
                           t.status, t.notes,
                           ISNULL(e.name_th, u.username) as requester,
                           ISNULL(approver.username, '-') as approver
                    FROM " . TRANSFER_ORDERS_TABLE . " t WITH (NOLOCK)
                    JOIN " . ITEMS_TABLE . " i WITH (NOLOCK) ON t.item_id = i.item_id
                    JOIN " . LOCATIONS_TABLE . " loc_from WITH (NOLOCK) ON t.from_location_id = loc_from.location_id
                    JOIN " . LOCATIONS_TABLE . " loc_to WITH (NOLOCK) ON t.to_location_id = loc_to.location_id
                    LEFT JOIN " . USERS_TABLE . " u WITH (NOLOCK) ON t.created_by_user_id = u.id
                    LEFT JOIN " . MANPOWER_EMPLOYEES_TABLE . " e WITH (NOLOCK) ON u.emp_id = e.emp_id
                    LEFT JOIN " . USERS_TABLE . " approver WITH (NOLOCK) ON t.confirmed_by_user_id = approver.id
                    $whereClause
                    ORDER BY t.created_at DESC";

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // ส่ง JSON กลับไป
            echo json_encode(['success' => true, 'data' => $data]);
            exit;

        default:
            throw new Exception("Invalid Action");
    }
} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>