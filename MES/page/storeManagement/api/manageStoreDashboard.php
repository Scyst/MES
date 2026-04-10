<?php
// page/store/api/manageStoreDashboard.php
header('Content-Type: application/json');
ini_set('display_errors', 0);
error_reporting(E_ALL);

require_once __DIR__ . '/../../components/init.php';
require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../components/php/logger.php';

if (!isset($_SESSION['user'])) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Unauthorized Access']);
    exit;
}

$action = $_REQUEST['action'] ?? '';
$storeLocationId = 1008; 

try {
    if (!isset($pdo)) {
        $pdo = new PDO("sqlsrv:Server=" . DB_HOST . ";Database=" . DB_DATABASE, DB_USER, DB_PASSWORD);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    }

    switch ($action) {
        
        // ==========================================
        // 🟢 โหมด: เบิกจ่ายสต๊อก (STOCK) 🟢
        // ==========================================
        case 'get_orders':
            $status = $_REQUEST['status'] ?? 'ACTIVE';
            $startDate = $_REQUEST['start_date'] ?? date('Y-m-d', strtotime('-30 days'));
            $endDate = $_REQUEST['end_date'] ?? date('Y-m-d');
            
            // [FIX 2] เปลี่ยนวิธีการเขียน SQL ให้ยืดหยุ่นและลดความเปราะบาง
            $sql = "SELECT r.id, r.req_number, r.status, r.remark,
                           FORMAT(r.created_at, 'dd/MM/yyyy HH:mm') as req_time,
                           u.fullname as requester_name,
                           (SELECT COUNT(*) FROM dbo.STORE_REQUISITION_ITEMS ri WITH (NOLOCK) WHERE ri.req_id = r.id AND ri.request_type = 'STOCK') as total_items
                    FROM dbo.STORE_REQUISITIONS r WITH (NOLOCK)
                    LEFT JOIN dbo.USERS u WITH (NOLOCK) ON r.requester_id = u.id
                    WHERE EXISTS (SELECT 1 FROM dbo.STORE_REQUISITION_ITEMS ri2 WHERE ri2.req_id = r.id AND ri2.request_type = 'STOCK') ";
            
            $params = [];
            
            if ($status === 'ACTIVE') {
                $sql .= " AND r.status IN ('NEW ORDER', 'PREPARING') ";
            } else {
                // [FIX 3] SARGable Query ป้องกัน Full Table Scan
                $sql .= " AND r.created_at >= ? AND r.created_at < DATEADD(DAY, 1, CAST(? AS DATE)) ";
                array_push($params, $startDate, $endDate);
                
                if ($status !== 'ALL') {
                    $sql .= " AND r.status = ? ";
                    $params[] = $status;
                }
            }

            $sql .= " ORDER BY CASE WHEN r.status = 'NEW ORDER' THEN 1 WHEN r.status = 'PREPARING' THEN 2 ELSE 3 END ASC, r.created_at DESC";

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
            break;

        case 'get_order_details':
            $req_id = $_REQUEST['req_id'];

            $stmtH = $pdo->prepare("SELECT r.*, u.fullname as requester_name, FORMAT(r.created_at, 'dd/MM/yyyy HH:mm') as req_time, FORMAT(r.issued_at, 'dd/MM/yyyy HH:mm') as issue_time, i.fullname as issuer_name
                                    FROM dbo.STORE_REQUISITIONS r WITH (NOLOCK) 
                                    LEFT JOIN dbo.USERS u WITH (NOLOCK) ON r.requester_id = u.id 
                                    LEFT JOIN dbo.USERS i WITH (NOLOCK) ON r.issuer_id = i.id
                                    WHERE r.id = ?");
            $stmtH->execute([$req_id]);
            $header = $stmtH->fetch(PDO::FETCH_ASSOC);

            $sqlItems = "SELECT ri.id as row_id, ri.item_code, ri.qty_requested, ri.qty_issued,
                                i.item_id, i.part_description as description, i.image_path, i.item_category,
                                ISNULL(inv.quantity, 0) as onhand_qty
                         FROM dbo.STORE_REQUISITION_ITEMS ri WITH (NOLOCK)
                         JOIN dbo.ITEMS i WITH (NOLOCK) ON ri.item_code = i.sap_no
                         LEFT JOIN dbo.INVENTORY_ONHAND inv WITH (NOLOCK) ON i.item_id = inv.parameter_id AND inv.location_id = ?
                         WHERE ri.req_id = ? AND ri.request_type = 'STOCK'";
            
            $stmtI = $pdo->prepare($sqlItems);
            $stmtI->execute([$storeLocationId, $req_id]);
            
            echo json_encode(['success' => true, 'header' => $header, 'items' => $stmtI->fetchAll(PDO::FETCH_ASSOC)]);
            break;

        case 'accept_order':
            $pdo->prepare("UPDATE dbo.STORE_REQUISITIONS SET status = 'PREPARING' WHERE id = ?")->execute([$_POST['req_id']]);
            echo json_encode(['success' => true]);
            break;

        case 'confirm_issue':
            $req_id = $_POST['req_id'];
            $issuer_id = $_SESSION['user']['id'];
            $itemsData = json_decode($_POST['items'], true); 

            $pdo->beginTransaction();
            try {
                $stmtUpdateItem = $pdo->prepare("UPDATE dbo.STORE_REQUISITION_ITEMS SET qty_issued = ? WHERE id = ?");
                
                // [FIX 1] แทรก Snapshot Cost ลงตาราง STOCK_TRANSACTIONS เพื่อไม่ให้หน้า P&L พัง
                $sqlLog = "INSERT INTO dbo.STOCK_TRANSACTIONS (
                               parameter_id, quantity, transaction_type, from_location_id, created_by_user_id, 
                               notes, reference_id, transaction_timestamp,
                               std_price_snapshot, std_price_usd_snapshot, std_cost_mat_snapshot, std_cost_dl_snapshot, std_cost_oh_snapshot,
                               std_cost_oh_machine_snapshot, std_cost_oh_util_snapshot, std_cost_oh_indirect_snapshot, std_cost_oh_staff_snapshot, std_cost_oh_acc_snapshot, std_cost_oh_other_snapshot
                           ) 
                           SELECT 
                               item_id, ?, 'ISSUE_STORE', ?, ?, 
                               'Issued via Material Req', ?, GETDATE(),
                               ISNULL(StandardPrice, 0), ISNULL(Price_USD, 0), 
                               (ISNULL(Cost_RM, 0) + ISNULL(Cost_PKG, 0) + ISNULL(Cost_SUB, 0)), 
                               ISNULL(Cost_DL, 0),
                               (ISNULL(Cost_OH_Machine, 0) + ISNULL(Cost_OH_Utilities, 0) + ISNULL(Cost_OH_Indirect, 0) + ISNULL(Cost_OH_Staff, 0) + ISNULL(Cost_OH_Accessory, 0) + ISNULL(Cost_OH_Others, 0)),
                               ISNULL(Cost_OH_Machine, 0), ISNULL(Cost_OH_Utilities, 0), ISNULL(Cost_OH_Indirect, 0), ISNULL(Cost_OH_Staff, 0), ISNULL(Cost_OH_Accessory, 0), ISNULL(Cost_OH_Others, 0)
                           FROM dbo.ITEMS WITH (NOLOCK) WHERE item_id = ?";
                
                $stmtLog = $pdo->prepare($sqlLog);

                foreach ($itemsData as $item) {
                    $qty_issued = (float)$item['qty_issued'];
                    $stmtUpdateItem->execute([$qty_issued, $item['row_id']]);

                    if ($qty_issued > 0) {
                        // โยนค่าให้ครบตาม Parameter (เพิ่ม item_id ไปดึงค่าจาก SELECT ท้ายสุด)
                        $stmtLog->execute([$qty_issued, $storeLocationId, $issuer_id, $_POST['req_number'], $item['item_id']]);
                        
                        $stmtSp = $pdo->prepare("EXEC dbo.sp_UpdateOnhandBalance @item_id = ?, @location_id = ?, @quantity_to_change = ?");
                        $stmtSp->execute([$item['item_id'], $storeLocationId, ($qty_issued * -1)]);
                    }
                }

                $pdo->prepare("UPDATE dbo.STORE_REQUISITIONS SET status = 'COMPLETED', issuer_id = ?, issued_at = GETDATE() WHERE id = ?")->execute([$issuer_id, $req_id]);
                $pdo->commit();
                echo json_encode(['success' => true]);

            } catch (Exception $ex) { $pdo->rollBack(); throw $ex; }
            break;

        case 'reject_order':
            $reason = $_POST['reason'] ?? 'Rejected by Store';
            $pdo->prepare("UPDATE dbo.STORE_REQUISITIONS SET status = 'REJECTED', remark = ISNULL(remark, '') + ' [Reject: ' + ? + ']' WHERE id = ?")->execute([$reason, $_POST['req_id']]);
            echo json_encode(['success' => true]);
            break;

        // ==========================================
        // 🟢 โหมด: รวบรวมสั่งซื้อ (K2 REQUEST) 🟢
        // ==========================================
        case 'get_k2_summary':
            $status = $_REQUEST['status'] ?? 'WAITING'; 
            
            $sql = "SELECT ri.item_code, i.part_description as description, i.image_path, i.item_category,
                           SUM(ri.qty_requested) as total_qty, COUNT(k.id) as request_count, MAX(k.k2_reference_no) as k2_ref, MAX(k.updated_at) as last_update
                    FROM dbo.STORE_K2_REQUESTS k WITH (NOLOCK)
                    JOIN dbo.STORE_REQUISITION_ITEMS ri WITH (NOLOCK) ON k.req_item_id = ri.id
                    JOIN dbo.ITEMS i WITH (NOLOCK) ON ri.item_code = i.sap_no
                    WHERE k.k2_status = ?
                    GROUP BY ri.item_code, i.part_description, i.image_path, i.item_category
                    ORDER BY total_qty DESC";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$status]);
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
            break;

        case 'get_k2_item_details':
            $item_code = $_REQUEST['item_code'];
            $status = $_REQUEST['status'] ?? 'WAITING';

            $sql = "SELECT k.id as k2_id, ri.qty_requested, r.req_number, u.fullname, FORMAT(r.created_at, 'dd/MM/yyyy') as req_date, r.remark
                    FROM dbo.STORE_K2_REQUESTS k WITH (NOLOCK)
                    JOIN dbo.STORE_REQUISITION_ITEMS ri WITH (NOLOCK) ON k.req_item_id = ri.id
                    JOIN dbo.STORE_REQUISITIONS r WITH (NOLOCK) ON ri.req_id = r.id
                    LEFT JOIN dbo.USERS u WITH (NOLOCK) ON r.requester_id = u.id
                    WHERE k.k2_status = ? AND ri.item_code = ?
                    ORDER BY r.created_at ASC";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$status, $item_code]);
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
            break;

        case 'submit_k2_pr':
            $item_code = $_POST['item_code'];
            $k2_pr_no = $_POST['k2_pr_no'];
            $userId = $_SESSION['user']['id'];

            $sql = "UPDATE k
                    SET k.k2_status = 'K2_OPENED', k.k2_reference_no = ?, k.updated_at = GETDATE(), k.updated_by = ?
                    FROM dbo.STORE_K2_REQUESTS k
                    JOIN dbo.STORE_REQUISITION_ITEMS ri ON k.req_item_id = ri.id
                    WHERE k.k2_status = 'WAITING' AND ri.item_code = ?";
            
            $pdo->prepare($sql)->execute([$k2_pr_no, $userId, $item_code]);
            echo json_encode(['success' => true, 'message' => 'บันทึกรหัส K2 PR สำเร็จ']);
            break;

        // ==========================================
        // 🟢 โหมด: จัดการรูปภาพสินค้า (IMAGE MANAGEMENT) 🟢
        // ==========================================
        case 'get_items':
            $search = $_REQUEST['search'] ?? '';
            $page = isset($_REQUEST['page']) ? (int)$_REQUEST['page'] : 1;
            $limit = isset($_REQUEST['limit']) ? (int)$_REQUEST['limit'] : 40;
            $offset = ($page - 1) * $limit;

            $sql = "SELECT sap_no, part_description, item_category, image_path 
                    FROM dbo.ITEMS WITH (NOLOCK) 
                    WHERE is_active = 1 ";
            
            $params = [];
            if (!empty($search)) {
                $sql .= " AND (sap_no LIKE ? OR part_no LIKE ? OR part_description LIKE ?) ";
                $searchTerm = "%$search%";
                array_push($params, $searchTerm, $searchTerm, $searchTerm);
            }

            $sql .= " ORDER BY CASE WHEN image_path IS NULL OR image_path = '' THEN 0 ELSE 1 END ASC, sap_no ASC ";
            $sql .= " OFFSET " . (int)$offset . " ROWS FETCH NEXT " . (int)$limit . " ROWS ONLY ";

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
            break;

        case 'upload_image':
            $sap_no = $_POST['sap_no'] ?? '';
            if (empty($sap_no) || !isset($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
                throw new Exception("ข้อมูลไม่ครบ หรือไฟล์มีปัญหา");
            }

            $file = $_FILES['image'];
            $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
            if (!in_array($ext, ['jpg', 'jpeg', 'png', 'webp'])) { throw new Exception("รองรับเฉพาะ JPG, PNG, WEBP"); }
            if ($file['size'] > 5 * 1024 * 1024) { throw new Exception("ไฟล์ต้องไม่เกิน 5MB"); }

            $uploadDir = __DIR__ . '/../../../uploads/items/';
            if (!is_dir($uploadDir)) mkdir($uploadDir, 0777, true);

            $newFileName = preg_replace('/[^a-zA-Z0-9_-]/', '_', $sap_no) . '_' . time() . '.' . $ext;
            
            if (move_uploaded_file($file['tmp_name'], $uploadDir . $newFileName)) {
                $stmtCheck = $pdo->prepare("SELECT image_path FROM dbo.ITEMS WHERE sap_no = ?");
                $stmtCheck->execute([$sap_no]);
                $oldImage = $stmtCheck->fetchColumn();
                
                if ($oldImage && file_exists($uploadDir . $oldImage)) unlink($uploadDir . $oldImage);

                $pdo->prepare("UPDATE dbo.ITEMS SET image_path = ? WHERE sap_no = ?")->execute([$newFileName, $sap_no]);
                echo json_encode(['success' => true, 'image_path' => $newFileName]);
            } else {
                throw new Exception("บันทึกไฟล์ไม่สำเร็จ เช็ค Permission โฟลเดอร์");
            }
            break;

        // ==========================================
        // 🟢 โหมด: สถิติวิเคราะห์ข้อมูล (DATA ANALYTICS) 🟢
        // ==========================================
        case 'get_analytics':
            $startDate = $_REQUEST['start_date'] ?? date('Y-m-01');
            $endDate = $_REQUEST['end_date'] ?? date('Y-m-t'); 
            
            // [FIX 3] SARGable Query ป้องกันค้าง (แก้ไขส่วน Analytics ทั้งหมด)
            $stmtSum = $pdo->prepare("
                SELECT 
                    COUNT(DISTINCT r.id) as total_reqs,
                    ISNULL(SUM(ri.qty_issued), 0) as total_issued_qty,
                    (SELECT COUNT(*) FROM dbo.STORE_K2_REQUESTS WHERE k2_status = 'WAITING') as waiting_k2
                FROM dbo.STORE_REQUISITIONS r WITH (NOLOCK)
                LEFT JOIN dbo.STORE_REQUISITION_ITEMS ri WITH (NOLOCK) ON r.id = ri.req_id
                WHERE r.created_at >= ? AND r.created_at < DATEADD(DAY, 1, CAST(? AS DATE)) 
                  AND r.status = 'COMPLETED'
            ");
            $stmtSum->execute([$startDate, $endDate]);
            $summary = $stmtSum->fetch(PDO::FETCH_ASSOC);

            $stmtTopItems = $pdo->prepare("
                SELECT TOP 5 i.part_description, SUM(ri.qty_issued) as total_qty
                FROM dbo.STORE_REQUISITION_ITEMS ri WITH (NOLOCK)
                JOIN dbo.STORE_REQUISITIONS r WITH (NOLOCK) ON ri.req_id = r.id
                JOIN dbo.ITEMS i WITH (NOLOCK) ON ri.item_code = i.sap_no
                WHERE r.created_at >= ? AND r.created_at < DATEADD(DAY, 1, CAST(? AS DATE)) 
                  AND r.status = 'COMPLETED' AND ri.qty_issued > 0
                GROUP BY i.part_description
                ORDER BY total_qty DESC
            ");
            $stmtTopItems->execute([$startDate, $endDate]);
            $topItems = $stmtTopItems->fetchAll(PDO::FETCH_ASSOC);

            $stmtTopUsers = $pdo->prepare("
                SELECT TOP 5 u.fullname, COUNT(DISTINCT r.id) as req_count
                FROM dbo.STORE_REQUISITIONS r WITH (NOLOCK)
                JOIN dbo.USERS u WITH (NOLOCK) ON r.requester_id = u.id
                WHERE r.created_at >= ? AND r.created_at < DATEADD(DAY, 1, CAST(? AS DATE))
                GROUP BY u.fullname
                ORDER BY req_count DESC
            ");
            $stmtTopUsers->execute([$startDate, $endDate]);
            $topUsers = $stmtTopUsers->fetchAll(PDO::FETCH_ASSOC);

            $stmtExport = $pdo->prepare("
                SELECT r.req_number, FORMAT(r.created_at, 'yyyy-MM-dd HH:mm') as date_req, 
                       u.fullname as requester, i.sap_no, i.part_description, 
                       ri.qty_requested, ri.qty_issued, ri.request_type, r.status
                FROM dbo.STORE_REQUISITION_ITEMS ri WITH (NOLOCK)
                JOIN dbo.STORE_REQUISITIONS r WITH (NOLOCK) ON ri.req_id = r.id
                JOIN dbo.USERS u WITH (NOLOCK) ON r.requester_id = u.id
                JOIN dbo.ITEMS i WITH (NOLOCK) ON ri.item_code = i.sap_no
                WHERE r.created_at >= ? AND r.created_at < DATEADD(DAY, 1, CAST(? AS DATE))
                ORDER BY r.created_at DESC
            ");
            $stmtExport->execute([$startDate, $endDate]);
            $exportData = $stmtExport->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode([
                'success' => true, 
                'summary' => $summary, 
                'topItems' => $topItems, 
                'topUsers' => $topUsers,
                'exportData' => $exportData
            ]);
            break;

        default:
            echo json_encode(['success' => false, 'message' => 'Invalid Action']);
    }

} catch (\Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => "Server Error: " . $e->getMessage()]);
}
?>