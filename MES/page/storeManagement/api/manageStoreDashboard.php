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
            
            $sql = "SELECT r.id, r.req_number, r.status, r.remark,
                           FORMAT(r.created_at, 'dd/MM/yyyy HH:mm') as req_time,
                           u.fullname as requester_name,
                           (SELECT COUNT(*) FROM dbo.STORE_REQUISITION_ITEMS ri WITH (NOLOCK) WHERE ri.req_id = r.id AND ri.request_type = 'STOCK') as total_items
                    FROM dbo.STORE_REQUISITIONS r WITH (NOLOCK)
                    LEFT JOIN dbo.USERS u WITH (NOLOCK) ON r.requester_id = u.id
                    WHERE CAST(r.created_at AS DATE) BETWEEN ? AND ? 
                      AND EXISTS (SELECT 1 FROM dbo.STORE_REQUISITION_ITEMS ri2 WHERE ri2.req_id = r.id AND ri2.request_type = 'STOCK') ";
            
            $params = [$startDate, $endDate];
            
            if ($status !== 'ALL') {
                if ($status === 'ACTIVE') {
                    $sql = str_replace("WHERE CAST(r.created_at AS DATE) BETWEEN ? AND ?", "WHERE 1=1", $sql);
                    $params = [];
                    $sql .= " AND r.status IN ('NEW ORDER', 'PREPARING') ";
                } else {
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

            // ดึงเฉพาะของที่ขอเบิกจากคลัง (STOCK)
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
                $sqlLog = "INSERT INTO dbo.STOCK_TRANSACTIONS (parameter_id, quantity, transaction_type, from_location_id, created_by_user_id, notes, reference_id, transaction_timestamp) VALUES (?, ?, 'ISSUE_STORE', ?, ?, 'Issued via Material Req', ?, GETDATE())";
                $stmtLog = $pdo->prepare($sqlLog);

                foreach ($itemsData as $item) {
                    $qty_issued = (float)$item['qty_issued'];
                    $stmtUpdateItem->execute([$qty_issued, $item['row_id']]);

                    if ($qty_issued > 0) {
                        $stmtLog->execute([$item['item_id'], $qty_issued, $storeLocationId, $issuer_id, $_POST['req_number']]);
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
            $status = $_REQUEST['status'] ?? 'WAITING'; // WAITING, K2_OPENED
            
            // สรุปรวมยอดขอซื้อแยกตาม Item Code
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

            // ดึงรายละเอียดว่า "ใครบ้างที่ขอ Item นี้มา"
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

            // อัปเดตสถานะของ K2 Request ทุกรายการที่เป็น ItemCode เดียวกันและรออยู่
            $sql = "UPDATE k
                    SET k.k2_status = 'K2_OPENED', k.k2_reference_no = ?, k.updated_at = GETDATE(), k.updated_by = ?
                    FROM dbo.STORE_K2_REQUESTS k
                    JOIN dbo.STORE_REQUISITION_ITEMS ri ON k.req_item_id = ri.id
                    WHERE k.k2_status = 'WAITING' AND ri.item_code = ?";
            
            $pdo->prepare($sql)->execute([$k2_pr_no, $userId, $item_code]);
            echo json_encode(['success' => true, 'message' => 'บันทึกรหัส K2 PR สำเร็จ']);
            break;

        default:
            echo json_encode(['success' => false, 'message' => 'Invalid Action']);
    }

} catch (\Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => "Server Error: " . $e->getMessage()]);
}
?>