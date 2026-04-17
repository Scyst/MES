<?php
// MES/page/storeManagement/api/api_store.php
require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../../auth/check_auth.php';
require_once __DIR__ . '/../../logger.php';

header('Content-Type: application/json; charset=utf-8');
ini_set('display_errors', 0); // บังคับปิด Error ออกหน้าจอ ป้องกัน JSON พัง

try {
    if (!isset($_SESSION['user'])) {
        http_response_code(401);
        throw new Exception('Unauthorized Access');
    }

    $currentUser = $_SESSION['user'];
    $action = $_REQUEST['action'] ?? '';
    $storeLocationId = 1008; // กำหนด Location ID ของ Store
    
    // 🛡️ กำหนด Action ที่มีการเขียนข้อมูล (POST) เพื่อตรวจสอบ CSRF
    $writeActions = [
        'issue_rm', 'issue_selected_tags', 'import_excel', 'group_master_pallet', 
        'receive_scanned_tag', 'delete_tag', 'delete_bulk_tags', 'edit_tag', 
        'update_print_status', 'create_request', 'approve_request', 'reject_request',
        'bulk_receive_tags', 'manual_add_rm', 'process_transfer_request', 'bulk_process_transfer_request',
        'submit_cycle_count', 'approve_cycle_count', 'create_transfer_request',
        'submit_requisition', 'accept_order', 'confirm_issue', 'reject_order', 'submit_k2_pr', 
        'upload_image', 'update_item_info'
    ];
    
    if (in_array($action, $writeActions) && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $clientToken = $_POST['csrf_token'] ?? json_decode(file_get_contents('php://input'), true)['csrf_token'] ?? '';
        if (empty($clientToken) || !hash_equals($_SESSION['csrf_token'], $clientToken)) {
            http_response_code(403);
            throw new Exception('CSRF Token Validation Failed. Please refresh the page.');
        }
    }

    if (!isset($pdo)) {
        $pdo = new PDO("sqlsrv:Server=" . DB_HOST . ";Database=" . DB_DATABASE, DB_USER, DB_PASSWORD);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    }

    $response = ['success' => false, 'message' => 'Action not executed'];

    switch ($action) {
        
        // ==========================================
        // 🟢 1. STORE DASHBOARD & K2 QUEUE 🟢
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
                    WHERE EXISTS (SELECT 1 FROM dbo.STORE_REQUISITION_ITEMS ri2 WHERE ri2.req_id = r.id AND ri2.request_type = 'STOCK') 
                      AND r.created_at >= ? AND r.created_at < DATEADD(DAY, 1, CAST(? AS DATE)) ";
            
            // 💡 ให้มันใช้วันที่กรองข้อมูลเสมอ ไม่ว่าจะเป็นสถานะไหน
            $params = [$startDate, $endDate];
            
            if ($status === 'ACTIVE') {
                $sql .= " AND r.status IN ('NEW ORDER', 'PREPARING') ";
            } elseif ($status !== 'ALL') {
                $sql .= " AND r.status = ? ";
                $params[] = $status;
            }
            
            $sql .= " ORDER BY CASE WHEN r.status = 'NEW ORDER' THEN 1 WHEN r.status = 'PREPARING' THEN 2 ELSE 3 END ASC, r.created_at DESC";

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $response = ['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)];
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
            
            $response = ['success' => true, 'header' => $header, 'items' => $stmtI->fetchAll(PDO::FETCH_ASSOC)];
            break;

        case 'accept_order':
            $pdo->prepare("UPDATE dbo.STORE_REQUISITIONS SET status = 'PREPARING' WHERE id = ?")->execute([$_POST['req_id']]);
            $response = ['success' => true];
            break;

        case 'confirm_issue':
            $req_id = $_POST['req_id'];
            $issuer_id = $currentUser['id'];
            $itemsData = json_decode($_POST['items'], true); 

            $pdo->beginTransaction();
            $stmtUpdateItem = $pdo->prepare("UPDATE dbo.STORE_REQUISITION_ITEMS SET qty_issued = ? WHERE id = ?");
            
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
                    $stmtLog->execute([$qty_issued, $storeLocationId, $issuer_id, $_POST['req_number'], $item['item_id']]);
                    $stmtSp = $pdo->prepare("EXEC dbo.sp_UpdateOnhandBalance @item_id = ?, @location_id = ?, @quantity_to_change = ?");
                    $stmtSp->execute([$item['item_id'], $storeLocationId, ($qty_issued * -1)]);
                }
            }

            $pdo->prepare("UPDATE dbo.STORE_REQUISITIONS SET status = 'COMPLETED', issuer_id = ?, issued_at = GETDATE() WHERE id = ?")->execute([$issuer_id, $req_id]);
            $pdo->commit();
            $response = ['success' => true];
            break;

        case 'reject_order':
            $reason = $_POST['reason'] ?? 'Rejected by Store';
            $pdo->prepare("UPDATE dbo.STORE_REQUISITIONS SET status = 'REJECTED', remark = ISNULL(remark, '') + ' [Reject: ' + ? + ']' WHERE id = ?")->execute([$reason, $_POST['req_id']]);
            $response = ['success' => true];
            break;

        case 'get_k2_summary':
            $status = $_REQUEST['status'] ?? 'WAITING'; 
            $startDate = $_REQUEST['start_date'] ?? date('Y-m-d', strtotime('-30 days'));
            $endDate = $_REQUEST['end_date'] ?? date('Y-m-d');

            $sql = "SELECT ri.item_code, i.part_description as description, i.image_path, i.item_category,
                           SUM(ri.qty_requested) as total_qty, COUNT(k.id) as request_count, MAX(k.k2_reference_no) as k2_ref, MAX(k.updated_at) as last_update
                    FROM dbo.STORE_K2_REQUESTS k WITH (NOLOCK)
                    JOIN dbo.STORE_REQUISITION_ITEMS ri WITH (NOLOCK) ON k.req_item_id = ri.id
                    JOIN dbo.STORE_REQUISITIONS r WITH (NOLOCK) ON ri.req_id = r.id
                    JOIN dbo.ITEMS i WITH (NOLOCK) ON ri.item_code = i.sap_no
                    WHERE k.k2_status = ? 
                      AND r.created_at >= ? AND r.created_at < DATEADD(DAY, 1, CAST(? AS DATE))
                    GROUP BY ri.item_code, i.part_description, i.image_path, i.item_category
                    ORDER BY total_qty DESC";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$status, $startDate, $endDate]);
            $response = ['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)];
            break;

        case 'get_k2_item_details':
            $item_code = $_REQUEST['item_code'];
            $status = $_REQUEST['status'] ?? 'WAITING';
            $startDate = $_REQUEST['start_date'] ?? date('Y-m-d', strtotime('-30 days'));
            $endDate = $_REQUEST['end_date'] ?? date('Y-m-d');

            $sql = "SELECT k.id as k2_id, ri.qty_requested, r.req_number, u.fullname, FORMAT(r.created_at, 'dd/MM/yyyy') as req_date, r.remark
                    FROM dbo.STORE_K2_REQUESTS k WITH (NOLOCK)
                    JOIN dbo.STORE_REQUISITION_ITEMS ri WITH (NOLOCK) ON k.req_item_id = ri.id
                    JOIN dbo.STORE_REQUISITIONS r WITH (NOLOCK) ON ri.req_id = r.id
                    LEFT JOIN dbo.USERS u WITH (NOLOCK) ON r.requester_id = u.id
                    WHERE k.k2_status = ? AND ri.item_code = ?
                      AND r.created_at >= ? AND r.created_at < DATEADD(DAY, 1, CAST(? AS DATE))
                    ORDER BY r.created_at ASC";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$status, $item_code, $startDate, $endDate]);
            $response = ['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)];
            break;

        case 'submit_k2_pr':
            $item_code = $_POST['item_code'];
            $k2_pr_no = $_POST['k2_pr_no'];
            $userId = $currentUser['id'];
            $sql = "UPDATE k
                    SET k.k2_status = 'K2_OPENED', k.k2_reference_no = ?, k.updated_at = GETDATE(), k.updated_by = ?
                    FROM dbo.STORE_K2_REQUESTS k
                    JOIN dbo.STORE_REQUISITION_ITEMS ri ON k.req_item_id = ri.id
                    WHERE k.k2_status = 'WAITING' AND ri.item_code = ?";
            $pdo->prepare($sql)->execute([$k2_pr_no, $userId, $item_code]);
            $response = ['success' => true, 'message' => 'บันทึกรหัส K2 PR สำเร็จ'];
            break;

        case 'get_analytics':
            $startDate = $_REQUEST['start_date'] ?? date('Y-m-01');
            $endDate = $_REQUEST['end_date'] ?? date('Y-m-t'); 
            
            // 🚀 Optimized Batch Query without SQL Comments
            $sqlKpi = "
                SET NOCOUNT ON;
                DECLARE @Start DATE = ?;
                DECLARE @End DATETIME = DATEADD(DAY, 1, CAST(? AS DATE));

                DECLARE @TotalReqs INT = (SELECT COUNT(DISTINCT CASE WHEN status = 'COMPLETED' THEN id END) FROM dbo.STORE_REQUISITIONS WITH (NOLOCK) WHERE created_at >= @Start AND created_at < @End);
                DECLARE @TotalIssued DECIMAL(18,4) = (SELECT ISNULL(SUM(ri.qty_issued), 0) FROM dbo.STORE_REQUISITION_ITEMS ri WITH (NOLOCK) JOIN dbo.STORE_REQUISITIONS r WITH (NOLOCK) ON r.id = ri.req_id WHERE r.status = 'COMPLETED' AND r.created_at >= @Start AND r.created_at < @End);
                DECLARE @WaitK2 INT = (SELECT COUNT(*) FROM dbo.STORE_K2_REQUESTS WITH (NOLOCK) WHERE k2_status = 'WAITING');
                DECLARE @TotalRej INT = (SELECT COUNT(DISTINCT CASE WHEN status = 'REJECTED' THEN id END) FROM dbo.STORE_REQUISITIONS WITH (NOLOCK) WHERE created_at >= @Start AND created_at < @End);

                DECLARE @AvgSla INT = (SELECT ISNULL(AVG(DATEDIFF(MINUTE, r.created_at, r.issued_at)), 0) FROM dbo.STORE_REQUISITIONS r WITH (NOLOCK) WHERE r.status = 'COMPLETED' AND r.issued_at >= @Start AND r.issued_at < @End);
                DECLARE @FillRate FLOAT = (SELECT ISNULL((SUM(ri.qty_issued) / NULLIF(SUM(ri.qty_requested), 0)) * 100, 0) FROM dbo.STORE_REQUISITION_ITEMS ri WITH (NOLOCK) JOIN dbo.STORE_REQUISITIONS r WITH (NOLOCK) ON r.id = ri.req_id WHERE r.status = 'COMPLETED' AND r.issued_at >= @Start AND r.issued_at < @End);

                DECLARE @DeadStock FLOAT = (
                    SELECT ISNULL(SUM(inv.quantity * i.StandardPrice), 0)
                    FROM dbo.INVENTORY_ONHAND inv WITH (NOLOCK)
                    JOIN dbo.ITEMS i WITH (NOLOCK) ON inv.parameter_id = i.item_id
                    LEFT JOIN (
                        SELECT DISTINCT parameter_id 
                        FROM dbo.STOCK_TRANSACTIONS WITH (NOLOCK) 
                        WHERE transaction_timestamp >= DATEADD(DAY, -90, GETDATE())
                    ) act ON inv.parameter_id = act.parameter_id
                    WHERE inv.quantity > 0 AND act.parameter_id IS NULL
                );

                DECLARE @Ira FLOAT = (SELECT ISNULL((CAST(SUM(CASE WHEN diff_qty = 0 THEN 1 ELSE 0 END) AS FLOAT) / NULLIF(COUNT(*), 0)) * 100, 100) FROM dbo.INVENTORY_CYCLE_COUNTS WITH (NOLOCK) WHERE status = 'APPROVED' AND approved_at >= @Start AND approved_at < @End);

                DECLARE @Cogs FLOAT = (
                    SELECT ISNULL(SUM(st.quantity * i.StandardPrice), 0) 
                    FROM dbo.STOCK_TRANSACTIONS st WITH (NOLOCK) 
                    JOIN dbo.ITEMS i WITH (NOLOCK) ON st.parameter_id = i.item_id 
                    WHERE st.transaction_type IN ('ISSUE_STORE', 'ISSUE_RM') AND st.transaction_timestamp >= @Start AND st.transaction_timestamp < @End
                );
                
                DECLARE @InvVal FLOAT = (
                    SELECT ISNULL(SUM(inv.quantity * i.StandardPrice), 0) 
                    FROM dbo.INVENTORY_ONHAND inv WITH (NOLOCK) 
                    JOIN dbo.ITEMS i WITH (NOLOCK) ON inv.parameter_id = i.item_id 
                    WHERE inv.quantity > 0
                );
                
                DECLARE @Turnover FLOAT = CASE WHEN @InvVal > 0 THEN (@Cogs / @InvVal) ELSE 0 END;

                SELECT 
                    @TotalReqs as total_reqs, @TotalIssued as total_issued_qty, @WaitK2 as waiting_k2, @TotalRej as total_rejects,
                    @AvgSla as avg_sla_minutes, @FillRate as fill_rate_percent, @DeadStock as dead_stock_value,
                    @Ira as ira_percent, @Turnover as turnover_ratio;
            ";

            $stmtKpi = $pdo->prepare($sqlKpi);
            $stmtKpi->execute([$startDate, $endDate]);
            $summary = $stmtKpi->fetch(PDO::FETCH_ASSOC);

            $stmtTrend = $pdo->prepare("SELECT CAST(r.created_at AS DATE) as req_date, COUNT(DISTINCT r.id) as req_count FROM dbo.STORE_REQUISITIONS r WITH (NOLOCK) WHERE r.created_at >= ? AND r.created_at < DATEADD(DAY, 1, CAST(? AS DATE)) AND r.status = 'COMPLETED' GROUP BY CAST(r.created_at AS DATE) ORDER BY req_date ASC");
            $stmtTrend->execute([$startDate, $endDate]); 
            $trendData = $stmtTrend->fetchAll(PDO::FETCH_ASSOC);

            $stmtCat = $pdo->prepare("SELECT ISNULL(i.item_category, 'OTHER') as category, SUM(ri.qty_issued) as total_qty FROM dbo.STORE_REQUISITION_ITEMS ri WITH (NOLOCK) JOIN dbo.STORE_REQUISITIONS r WITH (NOLOCK) ON ri.req_id = r.id JOIN dbo.ITEMS i WITH (NOLOCK) ON ri.item_code = i.sap_no WHERE r.created_at >= ? AND r.created_at < DATEADD(DAY, 1, CAST(? AS DATE)) AND r.status = 'COMPLETED' AND ri.qty_issued > 0 GROUP BY i.item_category");
            $stmtCat->execute([$startDate, $endDate]); 
            $categoryData = $stmtCat->fetchAll(PDO::FETCH_ASSOC);

            $stmtTopItems = $pdo->prepare("SELECT TOP 5 i.part_description, SUM(ri.qty_issued) as total_qty FROM dbo.STORE_REQUISITION_ITEMS ri WITH (NOLOCK) JOIN dbo.STORE_REQUISITIONS r WITH (NOLOCK) ON ri.req_id = r.id JOIN dbo.ITEMS i WITH (NOLOCK) ON ri.item_code = i.sap_no WHERE r.created_at >= ? AND r.created_at < DATEADD(DAY, 1, CAST(? AS DATE)) AND r.status = 'COMPLETED' AND ri.qty_issued > 0 GROUP BY i.part_description ORDER BY total_qty DESC");
            $stmtTopItems->execute([$startDate, $endDate]); 
            $topItems = $stmtTopItems->fetchAll(PDO::FETCH_ASSOC);

            $stmtTopUsers = $pdo->prepare("SELECT TOP 5 u.fullname, COUNT(DISTINCT r.id) as req_count FROM dbo.STORE_REQUISITIONS r WITH (NOLOCK) JOIN dbo.USERS u WITH (NOLOCK) ON r.requester_id = u.id WHERE r.created_at >= ? AND r.created_at < DATEADD(DAY, 1, CAST(? AS DATE)) AND r.status = 'COMPLETED' GROUP BY u.fullname ORDER BY req_count DESC");
            $stmtTopUsers->execute([$startDate, $endDate]); 
            $topUsers = $stmtTopUsers->fetchAll(PDO::FETCH_ASSOC);

            $response = [
                'success' => true, 
                'summary' => $summary, 
                'trendData' => $trendData,
                'categoryData' => $categoryData,
                'topItems' => $topItems, 
                'topUsers' => $topUsers
            ];
            break;

        case 'export_analytics':
            $startDate = $_REQUEST['start_date'] ?? date('Y-m-01');
            $endDate = $_REQUEST['end_date'] ?? date('Y-m-t'); 
            
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
            
            $response = ['success' => true, 'exportData' => $exportData];
            break;

        // ==========================================
        // 🟢 2. MATERIAL REQUISITION (ผู้ขอเบิก) 🟢
        // ==========================================
        case 'submit_requisition':
            $cart = json_decode($_POST['cart'], true);
            $remark = trim($_POST['remark'] ?? '');
            $reqType = $_POST['request_type'] ?? 'STOCK';
            $userId = $currentUser['id'];

            if (empty($cart)) throw new Exception("ไม่มีรายการสินค้า");

            $pdo->beginTransaction();
            
            $prefix = 'REQ-' . date('ym') . '-';
            $stmtLast = $pdo->query("SELECT TOP 1 req_number FROM dbo.STORE_REQUISITIONS WITH (UPDLOCK) WHERE req_number LIKE '$prefix%' ORDER BY req_number DESC");
            $lastNo = $stmtLast->fetchColumn();
            $nextSeq = $lastNo ? ((int)substr($lastNo, -4)) + 1 : 1;
            $req_number = $prefix . str_pad($nextSeq, 4, '0', STR_PAD_LEFT);

            $pdo->prepare("INSERT INTO dbo.STORE_REQUISITIONS (req_number, requester_id, status, remark, created_at) VALUES (?, ?, 'NEW ORDER', ?, GETDATE())")
                ->execute([$req_number, $userId, $remark]);
            $req_id = $pdo->lastInsertId();

            $stmtItem = $pdo->prepare("INSERT INTO dbo.STORE_REQUISITION_ITEMS (req_id, item_code, qty_requested, request_type) VALUES (?, ?, ?, ?)");
            $stmtK2 = $pdo->prepare("INSERT INTO dbo.STORE_K2_REQUESTS (req_item_id, k2_status, updated_at) VALUES (?, 'WAITING', GETDATE())");

            foreach($cart as $c) {
                $stmtItem->execute([$req_id, $c['item_code'], $c['qty'], $reqType]);
                $req_item_id = $pdo->lastInsertId();
                if($reqType === 'K2') {
                    $stmtK2->execute([$req_item_id]);
                }
            }
            $pdo->commit();
            $response = ['success' => true, 'req_number' => $req_number];
            break;

        case 'get_my_orders':
            $startDate = $_REQUEST['start_date'] ?? date('Y-m-d', strtotime('-30 days'));
            $endDate = $_REQUEST['end_date'] ?? date('Y-m-d');
            $userId = $currentUser['id'];
            
            $sql = "SELECT r.id, r.req_number, r.status, r.remark, FORMAT(r.created_at, 'dd/MM/yyyy HH:mm') as req_time,
                           (SELECT COUNT(*) FROM dbo.STORE_REQUISITION_ITEMS ri WITH (NOLOCK) WHERE ri.req_id = r.id) as total_items
                    FROM dbo.STORE_REQUISITIONS r WITH (NOLOCK)
                    WHERE r.requester_id = ? AND r.created_at >= ? AND r.created_at < DATEADD(DAY, 1, CAST(? AS DATE))
                    ORDER BY r.created_at DESC";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$userId, $startDate, $endDate]);
            $response = ['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)];
            break;

        case 'get_my_order_details':
            $req_id = $_REQUEST['req_id'];
            $userId = $currentUser['id'];
            $stmtH = $pdo->prepare("SELECT r.*, FORMAT(r.created_at, 'dd/MM/yyyy HH:mm') as req_time, FORMAT(r.issued_at, 'dd/MM/yyyy HH:mm') as issue_time, i.fullname as issuer_name 
                                    FROM dbo.STORE_REQUISITIONS r WITH (NOLOCK) 
                                    LEFT JOIN dbo.USERS i WITH (NOLOCK) ON r.issuer_id = i.id 
                                    WHERE r.id = ? AND r.requester_id = ?");
            $stmtH->execute([$req_id, $userId]);
            $header = $stmtH->fetch(PDO::FETCH_ASSOC);
            if(!$header) throw new Exception("ไม่พบรายการ หรือไม่มีสิทธิ์เข้าถึง");

            $sqlItems = "SELECT ri.id as row_id, ri.item_code, ri.qty_requested, ri.qty_issued, i.part_description as description, i.image_path, i.item_category
                         FROM dbo.STORE_REQUISITION_ITEMS ri WITH (NOLOCK)
                         JOIN dbo.ITEMS i WITH (NOLOCK) ON ri.item_code = i.sap_no
                         WHERE ri.req_id = ?";
            $stmtI = $pdo->prepare($sqlItems);
            $stmtI->execute([$req_id]);
            
            $response = ['success' => true, 'header' => $header, 'items' => $stmtI->fetchAll(PDO::FETCH_ASSOC)];
            break;

        case 'get_catalog':
            $category = $_REQUEST['category'] ?? 'ALL';
            $search = $_REQUEST['search'] ?? '';
            $sort = $_REQUEST['sort'] ?? 'DEFAULT'; 
            $page = isset($_REQUEST['page']) ? (int)$_REQUEST['page'] : 1;
            $limit = 40; 
            $offset = ($page - 1) * $limit;
            
            $stmt = $pdo->prepare("EXEC sp_Store_GetCatalog @Category=?, @Search=?, @Sort=?, @Offset=?, @Limit=?");
            $stmt->execute([$category, $search, $sort, $offset, $limit]);
            
            $response = ['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)];
            break;

        case 'get_item_info':
            $item_code = $_REQUEST['item_code'];
            $stmt = $pdo->prepare("SELECT sap_no, part_description, ISNULL(material_type, 'OTHER') as item_category, StandardPrice FROM dbo.ITEMS WITH (NOLOCK) WHERE sap_no = ?");
            $stmt->execute([$item_code]);
            $data = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($data) $response = ['success' => true, 'data' => $data];
            else throw new Exception('Not found');
            break;

        case 'update_item_info':
            if (!in_array($currentUser['role'], ['admin', 'creator', 'store'])) {
                throw new Exception("ไม่มีสิทธิ์แก้ไขข้อมูล");
            }
            $item_code = $_POST['item_code'];
            $desc = $_POST['description'];
            $category = $_POST['item_category'];
            $price = (float)($_POST['std_price'] ?? 0);
            
            $pdo->prepare("UPDATE dbo.ITEMS SET part_description = ?, material_type = ?, StandardPrice = ? WHERE sap_no = ?")
                ->execute([$desc, $category, $price, $item_code]);
            
            $response = ['success' => true];
            break;

        case 'upload_image':
            $sap_no = $_POST['item_code'] ?? '';
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
                $response = ['success' => true, 'image_path' => $newFileName];
            } else {
                throw new Exception("บันทึกไฟล์ไม่สำเร็จ เช็ค Permission โฟลเดอร์");
            }
            break;


        // ==========================================
        // 🟢 3. INVENTORY & STOCK TRANSACTIONS 🟢
        // ==========================================
        case 'get_master_data':
            $locStmt = $pdo->query("SELECT location_id, location_name, location_type, production_line FROM dbo.LOCATIONS WITH (NOLOCK) WHERE is_active = 1 ORDER BY location_name");
            $itemsStmt = $pdo->query("SELECT item_id, sap_no, part_no, part_description FROM dbo.ITEMS WITH (NOLOCK) WHERE is_active = 1 ORDER BY sap_no");
            
            $response = [
                'success' => true, 
                'data' => [
                    'locations' => $locStmt->fetchAll(PDO::FETCH_ASSOC),
                    'items' => $itemsStmt->fetchAll(PDO::FETCH_ASSOC)
                ],
                'user_role' => $currentUser['role'],
                'user_line' => $currentUser['line'] ?? null
            ];
            break;

        case 'get_inventory_dashboard':
            $location_id = $_GET['location_id'] ?? 'ALL';
            $material_type = $_GET['material_type'] ?? 'ALL';
            $hide_zero = $_GET['hide_zero'] ?? 'false';
            $page = max(1, (int)($_GET['page'] ?? 1));
            $limit = max(10, (int)($_GET['limit'] ?? 100));
            $offset = ($page - 1) * $limit;

            $conditions = ["i.is_active = 1"];
            $params = [];

            $search = $_GET['search'] ?? '';
            if (!empty($search)) {
                $conditions[] = "(i.part_no LIKE ? OR i.sap_no LIKE ? OR i.part_description LIKE ?)";
                $params[] = "%$search%";
                $params[] = "%$search%";
                $params[] = "%$search%";
            }

            if ($material_type !== 'ALL') {
                $conditions[] = "i.material_type = ?";
                $params[] = strtoupper($material_type);
            }

            if ($hide_zero === 'true') {
                $conditions[] = "(ISNULL(Onhand.available_qty, 0) <> 0 OR ISNULL(Pending.pending_qty, 0) > 0)";
            }

            $locFilter = ($location_id !== 'ALL' && $location_id !== '') ? "AND o.location_id = " . (int)$location_id : "";
            
            $whereClause = implode(" AND ", $conditions);
            $whereSQL = !empty($whereClause) ? "WHERE " . $whereClause : "";

            $countSql = "
                SELECT 
                    COUNT(*) as total_skus,
                    SUM(CASE WHEN ISNULL(Onhand.available_qty, 0) <= 0 THEN 1 ELSE 0 END) as out_of_stock,
                    SUM(ISNULL(Onhand.available_qty, 0)) as toolbar_total_pcs,
                    SUM(ISNULL(Pending.pending_qty, 0)) as total_pending_qty,
                    SUM(ISNULL(Onhand.available_qty, 0) * ISNULL(i.StandardPrice, 0)) as total_value
                FROM dbo.ITEMS i WITH (NOLOCK)
                OUTER APPLY (
                    SELECT SUM(o.quantity) AS available_qty 
                    FROM dbo.INVENTORY_ONHAND o WITH (NOLOCK) 
                    WHERE o.parameter_id = i.item_id $locFilter
                ) Onhand
                OUTER APPLY (
                    SELECT SUM(p.qty_per_pallet) AS pending_qty 
                    FROM dbo.RM_SERIAL_TAGS p WITH (NOLOCK) 
                    WHERE p.item_id = i.item_id AND p.status = 'PENDING'
                ) Pending
                $whereSQL
            ";
            
            $kpiStmt = $pdo->prepare($countSql);
            $kpiStmt->execute($params);
            $kpi = $kpiStmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$kpi) {
                $kpi = ['total_skus' => 0, 'out_of_stock' => 0, 'total_pending_qty' => 0, 'total_value' => 0, 'toolbar_total_pcs' => 0];
            }

            $offsetInt = (int)$offset;
            $limitInt = (int)$limit;
            $sql = "
                SELECT 
                    i.item_id,
                    ISNULL(i.part_no, i.sap_no) AS item_no,
                    i.part_description,
                    ISNULL(i.material_type, 'UNKNOWN') AS material_type,
                    ISNULL(Onhand.available_qty, 0) AS available_qty,
                    ISNULL(Pending.pending_qty, 0) AS pending_qty,
                    (ISNULL(Onhand.available_qty, 0) + ISNULL(Pending.pending_qty, 0)) AS total_qty,
                    ISNULL(i.StandardPrice, 0) AS unit_price,
                    (ISNULL(Onhand.available_qty, 0) * ISNULL(i.StandardPrice, 0)) AS total_value
                FROM dbo.ITEMS i WITH (NOLOCK)
                OUTER APPLY (
                    SELECT SUM(o.quantity) AS available_qty 
                    FROM dbo.INVENTORY_ONHAND o WITH (NOLOCK) 
                    WHERE o.parameter_id = i.item_id $locFilter
                ) Onhand
                OUTER APPLY (
                    SELECT SUM(p.qty_per_pallet) AS pending_qty 
                    FROM dbo.RM_SERIAL_TAGS p WITH (NOLOCK) 
                    WHERE p.item_id = i.item_id AND p.status = 'PENDING'
                ) Pending
                $whereSQL
                ORDER BY available_qty ASC, total_value DESC
                OFFSET $offsetInt ROWS FETCH NEXT $limitInt ROWS ONLY
            ";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $response = [
                'success' => true, 
                'data' => $data, 
                'kpi' => $kpi,
                'pagination' => [
                    'total_records' => $kpi['total_skus'],
                    'current_page' => $page,
                    'total_pages' => ceil($kpi['total_skus'] / $limit)
                ]
            ];
            break;

        case 'get_item_details':
            $item_id = $_GET['item_id'] ?? 0;
            
            $stmtAvail = $pdo->prepare("SELECT l.location_name, SUM(o.quantity) as qty FROM dbo.INVENTORY_ONHAND o WITH (NOLOCK) JOIN dbo.LOCATIONS l WITH (NOLOCK) ON o.location_id = l.location_id WHERE o.parameter_id = ? AND o.quantity > 0 GROUP BY l.location_name ORDER BY qty DESC");
            $stmtAvail->execute([$item_id]);
            $available_details = $stmtAvail->fetchAll(PDO::FETCH_ASSOC);

            $stmtPend = $pdo->prepare("SELECT ISNULL(master_pallet_no, ctn_number) as tracking_no, MAX(po_number) as po_number, SUM(qty_per_pallet) as qty FROM dbo.RM_SERIAL_TAGS WITH (NOLOCK) WHERE item_id = ? AND status = 'PENDING' GROUP BY ISNULL(master_pallet_no, ctn_number) ORDER BY qty DESC");
            $stmtPend->execute([$item_id]);
            $pending_details = $stmtPend->fetchAll(PDO::FETCH_ASSOC);

            $response = ['success' => true, 'available_details' => $available_details, 'pending_details' => $pending_details];
            break;

        case 'get_stock_ledger':
            $startDate = $_GET['start_date'] ?? date('Y-m-d', strtotime('-7 days'));
            $endDate = $_GET['end_date'] ?? date('Y-m-d');
            $search = $_GET['search'] ?? '';
            $locationId = $_GET['location_id'] ?? 'ALL';
            $typeFilter = $_GET['type_filter'] ?? 'ALL';
            $page = max(1, (int)($_GET['page'] ?? 1));
            $limit = max(10, (int)($_GET['limit'] ?? 100));
            $offset = ($page - 1) * $limit;
            $isExport = isset($_GET['export']) && $_GET['export'] === 'true';

            $conditions = ["t.transaction_timestamp >= ?", "t.transaction_timestamp <= ?"];
            $params = [$startDate . " 00:00:00", $endDate . " 23:59:59"];

            if ($locationId !== 'ALL') {
                $conditions[] = "(t.from_location_id = ? OR t.to_location_id = ?)";
                $params[] = $locationId;
                $params[] = $locationId;
            }

            if ($typeFilter !== 'ALL') {
                if ($typeFilter === 'RECEIPT') {
                    $conditions[] = "t.transaction_type LIKE '%RECEIPT%'";
                } elseif ($typeFilter === 'INTERNAL_TRANSFER') {
                    $conditions[] = "t.transaction_type LIKE '%TRANSFER%'";
                } else {
                    $conditions[] = "t.transaction_type = ?";
                    $params[] = $typeFilter;
                }
            }

            if (!empty($search)) {
                $conditions[] = "(i.sap_no LIKE ? OR i.part_no LIKE ? OR t.reference_id LIKE ? OR t.notes LIKE ?)";
                $searchWildcard = "%$search%";
                $params = array_merge($params, array_fill(0, 4, $searchWildcard));
            }

            $whereClause = implode(" AND ", $conditions);

            $kpiSql = "SELECT COUNT(*) as total_trans,
                              SUM(CASE WHEN t.quantity > 0 THEN t.quantity ELSE 0 END) as total_in,
                              SUM(CASE WHEN t.quantity < 0 THEN ABS(t.quantity) ELSE 0 END) as total_out
                       FROM dbo.STOCK_TRANSACTIONS t WITH (NOLOCK)
                       LEFT JOIN dbo.ITEMS i WITH (NOLOCK) ON t.parameter_id = i.item_id
                       WHERE $whereClause";
            
            $kpiStmt = $pdo->prepare($kpiSql);
            $kpiStmt->execute($params);
            $kpi = $kpiStmt->fetch(PDO::FETCH_ASSOC);

            $sql = "SELECT t.transaction_id, t.transaction_timestamp, t.transaction_type, t.quantity, t.reference_id, t.notes,
                           ISNULL(i.part_no, i.sap_no) AS item_no, i.part_description,
                           loc_from.location_name AS from_loc, loc_to.location_name AS to_loc,
                           ISNULL(e.name_th, u.username) AS actor_name
                    FROM dbo.STOCK_TRANSACTIONS t WITH (NOLOCK)
                    LEFT JOIN dbo.ITEMS i WITH (NOLOCK) ON t.parameter_id = i.item_id
                    LEFT JOIN dbo.LOCATIONS loc_from WITH (NOLOCK) ON t.from_location_id = loc_from.location_id
                    LEFT JOIN dbo.LOCATIONS loc_to WITH (NOLOCK) ON t.to_location_id = loc_to.location_id
                    LEFT JOIN dbo.USERS u WITH (NOLOCK) ON t.created_by_user_id = u.id
                    LEFT JOIN dbo.MANPOWER_EMPLOYEES e WITH (NOLOCK) ON u.emp_id = e.emp_id
                    WHERE $whereClause
                    ORDER BY t.transaction_timestamp DESC";

            if (!$isExport) {
                $offsetInt = (int)$offset;
                $limitInt = (int)$limit;
                $sql .= " OFFSET $offsetInt ROWS FETCH NEXT $limitInt ROWS ONLY";
            }

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            
            $response = [
                'success' => true, 
                'data' => $stmt->fetchAll(PDO::FETCH_ASSOC), 
                'kpi' => $kpi,
                'pagination' => $isExport ? null : [
                    'total_records' => $kpi['total_trans'], 
                    'current_page' => $page, 
                    'total_pages' => ceil($kpi['total_trans'] / $limit)
                ]
            ];
            break;


        // ==========================================
        // 🟢 4. STOCK TRANSFERS & REPLACEMENT 🟢
        // ==========================================
        case 'create_transfer_request':
            $item_id = (int)($_POST['item_id'] ?? 0);
            $from_loc_id = (int)($_POST['from_loc_id'] ?? 0);
            $to_loc_id = (int)($_POST['to_loc_id'] ?? 0);
            $qty = (float)($_POST['quantity'] ?? 0);
            $remark = trim($_POST['remark'] ?? '');

            if ($item_id === 0 || $from_loc_id === 0 || $to_loc_id === 0 || $qty <= 0) {
                throw new Exception("ข้อมูลไม่ครบถ้วน (Item, Locations, Qty)");
            }
            if ($from_loc_id === $to_loc_id) {
                throw new Exception("คลังต้นทางและปลายทางต้องไม่ซ้ำกัน");
            }

            $uuid = 'TRF-' . strtoupper(substr(md5(uniqid()), 0, 8));
            $sql = "INSERT INTO dbo.STOCK_TRANSFER_ORDERS 
                    (transfer_uuid, item_id, quantity, from_location_id, to_location_id, status, created_by_user_id, notes, created_at) 
                    VALUES (?, ?, ?, ?, ?, 'PENDING', ?, ?, GETDATE())";
            
            $pdo->prepare($sql)->execute([$uuid, $item_id, $qty, $from_loc_id, $to_loc_id, $currentUser['id'], $remark]);
            
            $response = ['success' => true, 'message' => 'สร้างรายการรอโอนย้ายสำเร็จ'];
            break;

        case 'get_pending_transfers':
            $typeFilter = $_GET['type'] ?? 'ALL';
            $search = $_GET['search'] ?? '';
            $page = max(1, (int)($_GET['page'] ?? 1));
            $limit = max(10, (int)($_GET['limit'] ?? 100));
            $offset = ($page - 1) * $limit;
            
            $conditions = ["t.status = 'PENDING'"];
            $params = [];

            if ($typeFilter === 'REPLACEMENT') {
                $conditions[] = "t.notes LIKE '%Replacement:%'";
            } elseif ($typeFilter === 'NORMAL') {
                $conditions[] = "(t.notes NOT LIKE '%Replacement:%' OR t.notes IS NULL)";
            }

            if (!empty($search)) {
                $conditions[] = "(i.sap_no LIKE ? OR i.part_no LIKE ? OR t.notes LIKE ?)";
                $searchWildcard = "%$search%";
                array_push($params, $searchWildcard, $searchWildcard, $searchWildcard);
            }

            $whereClause = implode(" AND ", $conditions);
            $countSql = "SELECT COUNT(*) 
                         FROM dbo.STOCK_TRANSFER_ORDERS t WITH (NOLOCK)
                         JOIN dbo.ITEMS i WITH (NOLOCK) ON t.item_id = i.item_id
                         WHERE $whereClause";
            $countStmt = $pdo->prepare($countSql);
            $countStmt->execute($params);
            $totalRecords = (int)$countStmt->fetchColumn();
            $sql = "SELECT t.transfer_id, t.transfer_uuid, t.quantity, t.created_at, t.notes,
                           ISNULL(i.part_no, i.sap_no) AS item_no, i.part_description,
                           loc_from.location_name AS from_loc, loc_to.location_name AS to_loc,
                           ISNULL(e.name_th, u.username) AS requester
                    FROM dbo.STOCK_TRANSFER_ORDERS t WITH (NOLOCK)
                    JOIN dbo.ITEMS i WITH (NOLOCK) ON t.item_id = i.item_id
                    JOIN dbo.LOCATIONS loc_from WITH (NOLOCK) ON t.from_location_id = loc_from.location_id
                    JOIN dbo.LOCATIONS loc_to WITH (NOLOCK) ON t.to_location_id = loc_to.location_id
                    LEFT JOIN dbo.USERS u WITH (NOLOCK) ON t.created_by_user_id = u.id
                    LEFT JOIN dbo.MANPOWER_EMPLOYEES e WITH (NOLOCK) ON u.emp_id = e.emp_id
                    WHERE $whereClause
                    ORDER BY t.created_at ASC
                    OFFSET $offset ROWS FETCH NEXT $limit ROWS ONLY"; 
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $totalBadgeCount = $pdo->query("SELECT COUNT(*) FROM dbo.STOCK_TRANSFER_ORDERS WITH (NOLOCK) WHERE status = 'PENDING'")->fetchColumn();

            $response = [
                'success' => true, 
                'data' => $data, 
                'count' => $totalBadgeCount,
                'pagination' => [
                    'total_records' => $totalRecords,
                    'current_page' => $page,
                    'total_pages' => ceil($totalRecords / $limit)
                ]
            ];
            break;

        case 'process_transfer_request':
            $transfer_id = (int)($_POST['transfer_id'] ?? 0);
            $action_status = $_POST['action_status'] ?? '';

            if ($transfer_id === 0 || !in_array($action_status, ['COMPLETED', 'CANCELLED'])) {
                throw new Exception("คำสั่งไม่ถูกต้อง");
            }

            $pdo->beginTransaction();

            $sqlGet = "SELECT * FROM dbo.STOCK_TRANSFER_ORDERS WITH (UPDLOCK) WHERE transfer_id = ?";
            $stmtGet = $pdo->prepare($sqlGet);
            $stmtGet->execute([$transfer_id]);
            $req = $stmtGet->fetch(PDO::FETCH_ASSOC);

            if (!$req) throw new Exception("ไม่พบรายการนี้");
            if ($req['status'] !== 'PENDING') throw new Exception("รายการนี้ถูกจัดการไปแล้ว");

            if ($action_status === 'COMPLETED') {
                $qty = (float)$req['quantity'];
                $spStock = $pdo->prepare("EXEC dbo.sp_UpdateOnhandBalance @item_id = ?, @location_id = ?, @quantity_to_change = ?");
                $spStock->execute([$req['item_id'], $req['from_location_id'], -$qty]); 
                $spStock->execute([$req['item_id'], $req['to_location_id'], $qty]);
                $transSql = "INSERT INTO dbo.STOCK_TRANSACTIONS 
                             (parameter_id, quantity, transaction_type, from_location_id, to_location_id, created_by_user_id, reference_id, notes) 
                             VALUES (?, ?, 'INTERNAL_TRANSFER', ?, ?, ?, ?, ?)";
                $pdo->prepare($transSql)->execute([
                    $req['item_id'], $qty, $req['from_location_id'], $req['to_location_id'], 
                    $currentUser['id'], $req['transfer_uuid'], $req['notes']
                ]);
            }

            $pdo->prepare("UPDATE dbo.STOCK_TRANSFER_ORDERS SET status = ?, confirmed_by_user_id = ?, confirmed_at = GETDATE() WHERE transfer_id = ?")
                ->execute([$action_status, $currentUser['id'], $transfer_id]);

            $pdo->commit();
            $msg = $action_status === 'COMPLETED' ? "โอนย้ายสต็อกสำเร็จ!" : "ยกเลิกรายการสำเร็จ!";
            $response = ['success' => true, 'message' => $msg];
            break;

        case 'bulk_process_transfer_request':
            $transfer_ids = json_decode($_POST['transfer_ids'], true);
            $action_status = $_POST['action_status'] ?? '';

            if (empty($transfer_ids) || !is_array($transfer_ids) || !in_array($action_status, ['COMPLETED', 'CANCELLED'])) {
                throw new Exception("ข้อมูลไม่ถูกต้อง");
            }

            $pdo->beginTransaction();
            $successCount = 0;

            $spStock = $pdo->prepare("EXEC dbo.sp_UpdateOnhandBalance @item_id = ?, @location_id = ?, @quantity_to_change = ?");
            $transStmt = $pdo->prepare("INSERT INTO dbo.STOCK_TRANSACTIONS (parameter_id, quantity, transaction_type, from_location_id, to_location_id, created_by_user_id, reference_id, notes) VALUES (?, ?, 'INTERNAL_TRANSFER', ?, ?, ?, ?, ?)");
            $updStmt = $pdo->prepare("UPDATE dbo.STOCK_TRANSFER_ORDERS SET status = ?, confirmed_by_user_id = ?, confirmed_at = GETDATE() WHERE transfer_id = ?");

            $sqlGet = "SELECT * FROM dbo.STOCK_TRANSFER_ORDERS WITH (UPDLOCK) WHERE transfer_id = ?";
            $stmtGet = $pdo->prepare($sqlGet);

            foreach ($transfer_ids as $tid) {
                $stmtGet->execute([$tid]);
                $req = $stmtGet->fetch(PDO::FETCH_ASSOC);

                if ($req && $req['status'] === 'PENDING') {
                    if ($action_status === 'COMPLETED') {
                        $qty = (float)$req['quantity'];
                        $spStock->execute([$req['item_id'], $req['from_location_id'], -$qty]); 
                        $spStock->execute([$req['item_id'], $req['to_location_id'], $qty]);
                        
                        $transStmt->execute([
                            $req['item_id'], $qty, $req['from_location_id'], $req['to_location_id'], 
                            $currentUser['id'], $req['transfer_uuid'], $req['notes']
                        ]);
                    }
                    $updStmt->execute([$action_status, $currentUser['id'], $tid]);
                    $successCount++;
                }
            }

            $pdo->commit();
            $response = ['success' => true, 'message' => "ดำเนินการเสร็จสิ้นจำนวน $successCount รายการ"];
            break;


        // ==========================================
        // 🟢 5. DEFECT, SCRAP & REPLACEMENT 🟢
        // ==========================================
        case 'create_request':
            $input = json_decode(file_get_contents("php://input"), true);
            if (empty($input['item_id']) || empty($input['store_location_id'])) throw new Exception("ข้อมูลไม่ครบถ้วน (Item หรือ Store)");

            $pdo->beginTransaction();
            $item_id = $input['item_id']; $qty = floatval($input['quantity']); $wip_loc = $input['wip_location_id']; $store_loc = $input['store_location_id'];
            $defect_source = $input['defect_source'] ?? 'SNC'; $raw_reason = trim($input['reason']);
            if ($qty <= 0) throw new Exception("จำนวนต้องมากกว่า 0");

            $full_reason = "[$defect_source] $raw_reason"; $timestamp = date('Y-m-d H:i:s');

            $spStock = $pdo->prepare("EXEC dbo.sp_UpdateOnhandBalance @item_id = ?, @location_id = ?, @quantity_to_change = ?");
            $spStock->execute([$item_id, $wip_loc, -$qty]);

            $pdo->prepare("INSERT INTO dbo.STOCK_TRANSACTIONS (parameter_id, quantity, transaction_type, from_location_id, created_by_user_id, notes, transaction_timestamp) VALUES (?, ?, 'SCRAP', ?, ?, ?, ?)")->execute([$item_id, -$qty, $wip_loc, $currentUser['id'], "Defect: $full_reason", $timestamp]);

            $uuid = 'REQ-' . strtoupper(uniqid());
            $pdo->prepare("INSERT INTO dbo.STOCK_TRANSFER_ORDERS (transfer_uuid, item_id, quantity, from_location_id, to_location_id, status, created_by_user_id, notes, created_at) VALUES (?, ?, ?, ?, ?, 'PENDING', ?, ?, ?)")->execute([$uuid, $item_id, $qty, $store_loc, $wip_loc, $currentUser['id'], "Replacement: $full_reason", $timestamp]);

            $pdo->commit();
            $response = ['success' => true, 'message' => 'บันทึกของเสียและส่งคำขอเบิกแล้ว'];
            break;

        case 'approve_request':
            $input = json_decode(file_get_contents("php://input"), true);
            if (!hasPermission('manage_warehouse')) {
                throw new Exception("Unauthorized: ไม่มีสิทธิ์อนุมัติการเบิกจ่าย");
            }

            $pdo->beginTransaction();
            $transfer_id = $input['transfer_id'];
            
            $reqStmt = $pdo->prepare("SELECT * FROM dbo.STOCK_TRANSFER_ORDERS WITH (UPDLOCK) WHERE transfer_id = ?");
            $reqStmt->execute([$transfer_id]);
            $req = $reqStmt->fetch(PDO::FETCH_ASSOC);

            if (!$req) throw new Exception("ไม่พบรายการ");
            if ($req['status'] !== 'PENDING') throw new Exception("รายการนี้ถูกดำเนินการไปแล้ว");

            $qty = floatval($req['quantity']); $timestamp = date('Y-m-d H:i:s');

            $spStock = $pdo->prepare("EXEC dbo.sp_UpdateOnhandBalance @item_id = ?, @location_id = ?, @quantity_to_change = ?");
            $spStock->execute([$req['item_id'], $req['from_location_id'], -$qty]); 
            $spStock->execute([$req['item_id'], $req['to_location_id'], $qty]);

            $pdo->prepare("UPDATE dbo.STOCK_TRANSFER_ORDERS SET status = 'COMPLETED', confirmed_by_user_id = ?, confirmed_at = ? WHERE transfer_id = ?")->execute([$currentUser['id'], $timestamp, $transfer_id]);
            $pdo->prepare("INSERT INTO dbo.STOCK_TRANSACTIONS (parameter_id, quantity, transaction_type, from_location_id, to_location_id, created_by_user_id, reference_id, transaction_timestamp, notes) VALUES (?, ?, 'INTERNAL_TRANSFER', ?, ?, ?, ?, ?, ?)")->execute([$req['item_id'], $qty, $req['from_location_id'], $req['to_location_id'], $currentUser['id'], $req['transfer_uuid'], $timestamp, "Approved Replacement"]);

            $pdo->commit();
            $response = ['success' => true, 'message' => 'อนุมัติจ่ายของเรียบร้อย'];
            break;

        case 'reject_request':
            $input = json_decode(file_get_contents("php://input"), true);
            if (!hasPermission('manage_warehouse')) {
                throw new Exception("Unauthorized: ไม่มีสิทธิ์อนุมัติการเบิกจ่าย");
            }
            
            $pdo->beginTransaction();
            $transfer_id = $input['transfer_id'];
            $reason = trim($input['reject_reason'] ?? '');
            
            $reqStmt = $pdo->prepare("SELECT status FROM dbo.STOCK_TRANSFER_ORDERS WITH (UPDLOCK) WHERE transfer_id = ?");
            $reqStmt->execute([$transfer_id]);
            $currentStatus = $reqStmt->fetchColumn();

            if (!$currentStatus) throw new Exception("ไม่พบรายการ");
            if ($currentStatus !== 'PENDING') throw new Exception("รายการนี้ถูกดำเนินการไปแล้ว");

            $pdo->prepare("UPDATE dbo.STOCK_TRANSFER_ORDERS SET status = 'REJECTED', confirmed_by_user_id = ?, confirmed_at = GETDATE(), notes = ISNULL(notes,'') + ' | Reject Reason: ' + ? WHERE transfer_id = ?")->execute([$currentUser['id'], $reason, $transfer_id]);

            $pdo->commit();
            $response = ['success' => true, 'message' => 'ปฏิเสธคำขอเรียบร้อย'];
            break;

        case 'get_scrap_requests':
            $status = $_GET['status'] ?? 'ALL';
            $search = $_GET['search'] ?? '';
            $startDate = $_GET['start_date'] ?? '';
            $endDate = $_GET['end_date'] ?? '';
            $isExport = isset($_GET['export']) && $_GET['export'] === 'true';

            $page = max(1, (int)($_GET['page'] ?? 1));
            $limit = max(10, (int)($_GET['limit'] ?? 100));
            $offset = ($page - 1) * $limit;

            $conditions = ["1=1"];
            $params = [];

            if ($status !== 'ALL') { $conditions[] = "t.status = ?"; $params[] = $status; }
            if (!empty($startDate)) { $conditions[] = "t.created_at >= ?"; $params[] = $startDate . ' 00:00:00'; }
            if (!empty($endDate)) { $conditions[] = "t.created_at <= ?"; $params[] = $endDate . ' 23:59:59'; }

            if (!empty($search)) {
                $conditions[] = "(i.sap_no LIKE ? OR i.part_no LIKE ? OR t.transfer_uuid LIKE ? OR e.name_th LIKE ?)";
                $searchParam = "%$search%";
                $params = array_merge($params, array_fill(0, 4, $searchParam));
            }

            if ($currentUser['role'] === 'supervisor') {
                $conditions[] = "(loc_to.production_line = ? OR t.created_by_user_id = ?)";
                $params[] = $currentUser['line'] ?? '';
                $params[] = $currentUser['id'];
            } elseif ($currentUser['role'] === 'operator') {
                $conditions[] = "t.created_by_user_id = ?";
                $params[] = $currentUser['id'];
            }

            $whereClause = "WHERE " . implode(' AND ', $conditions);

            $kpiSql = "SELECT COUNT(t.transfer_id) as total_count, ISNULL(SUM(t.quantity), 0) as total_qty, ISNULL(SUM(t.quantity * ISNULL(i.Cost_Total, 0)), 0) as total_cost
                       FROM dbo.STOCK_TRANSFER_ORDERS t WITH (NOLOCK)
                       JOIN dbo.ITEMS i WITH (NOLOCK) ON t.item_id = i.item_id
                       JOIN dbo.LOCATIONS loc_to WITH (NOLOCK) ON t.to_location_id = loc_to.location_id
                       LEFT JOIN dbo.USERS u WITH (NOLOCK) ON t.created_by_user_id = u.id
                       LEFT JOIN dbo.MANPOWER_EMPLOYEES e WITH (NOLOCK) ON u.emp_id = e.emp_id
                       $whereClause";
            
            $kpiStmt = $pdo->prepare($kpiSql);
            $kpiStmt->execute($params);
            $kpi = $kpiStmt->fetch(PDO::FETCH_ASSOC);

            $sql = "SELECT t.transfer_id, t.transfer_uuid, t.quantity, t.created_at, i.sap_no, ISNULL(i.part_no, i.sap_no) as part_no, i.part_description, ISNULL(i.Cost_Total, 0) as unit_cost, loc_from.location_name as from_loc, loc_to.location_name as to_loc, t.status, t.notes, ISNULL(e.name_th, u.username) as requester, ISNULL(approver.username, '-') as approver
                    FROM dbo.STOCK_TRANSFER_ORDERS t WITH (NOLOCK)
                    JOIN dbo.ITEMS i WITH (NOLOCK) ON t.item_id = i.item_id
                    JOIN dbo.LOCATIONS loc_from WITH (NOLOCK) ON t.from_location_id = loc_from.location_id
                    JOIN dbo.LOCATIONS loc_to WITH (NOLOCK) ON t.to_location_id = loc_to.location_id
                    LEFT JOIN dbo.USERS u WITH (NOLOCK) ON t.created_by_user_id = u.id
                    LEFT JOIN dbo.MANPOWER_EMPLOYEES e WITH (NOLOCK) ON u.emp_id = e.emp_id
                    LEFT JOIN dbo.USERS approver WITH (NOLOCK) ON t.confirmed_by_user_id = approver.id
                    $whereClause
                    ORDER BY t.created_at DESC";

            if (!$isExport) {
                $offsetInt = (int)$offset;
                $limitInt = (int)$limit;
                $sql .= " OFFSET $offsetInt ROWS FETCH NEXT $limitInt ROWS ONLY";
            }

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $response = [
                'success' => true, 'data' => $data, 'kpi' => $kpi,
                'pagination' => $isExport ? null : ['total_records' => $kpi['total_count'], 'current_page' => $page, 'total_pages' => ceil($kpi['total_count'] / $limit)]
            ];
            break;


        // ==========================================
        // 🟢 6. CYCLE COUNT (ปรับยอดสต็อก) 🟢
        // ==========================================
        case 'submit_cycle_count':
            $item_id = (int)($_POST['item_id'] ?? 0);
            $location_id = (int)($_POST['location_id'] ?? 0);
            $actual_qty = (float)($_POST['actual_qty'] ?? -1);
            $remark = trim($_POST['remark'] ?? '');
            $userId = $_SESSION['user']['id'];

            if ($item_id === 0 || $location_id === 0 || $actual_qty < 0) {
                throw new Exception("ข้อมูลไม่ครบถ้วน (Item, Location หรือยอดนับจริงไม่ถูกต้อง)");
            }

            $checkStmt = $pdo->prepare("SELECT COUNT(*) FROM dbo.INVENTORY_CYCLE_COUNTS WITH (NOLOCK) WHERE item_id = ? AND location_id = ? AND status = 'PENDING'");
            $checkStmt->execute([$item_id, $location_id]);
            if ($checkStmt->fetchColumn() > 0) {
                throw new Exception("มีรายการขอปรับยอดของสินค้านี้ในคลังนี้ รออนุมัติอยู่แล้ว กรุณารอการอนุมัติก่อน");
            }

            $stmt = $pdo->prepare("EXEC dbo.sp_Store_SubmitCycleCount @location_id=?, @item_id=?, @serial_no=NULL, @actual_qty=?, @user_id=?, @remark=?");
            $stmt->execute([$location_id, $item_id, $actual_qty, $userId, $remark]);

            $response = ['success' => true, 'message' => 'ส่งคำขอปรับยอดสต็อกเรียบร้อยแล้ว'];
            break;

        case 'approve_cycle_count':
            $count_id = (int)($_POST['count_id'] ?? 0);
            $approval_action = $_POST['approval_action'] ?? ''; 
            $userId = $_SESSION['user']['id'];

            if (!hasPermission('manage_warehouse')) {
                throw new Exception("Unauthorized: ไม่มีสิทธิ์อนุมัติการปรับยอดสต็อก");
            }

            if ($count_id === 0 || !in_array($approval_action, ['APPROVE', 'REJECT'])) {
                throw new Exception("ข้อมูลไม่ถูกต้อง");
            }

            $stmt = $pdo->prepare("EXEC dbo.sp_Store_ApproveCycleCount @count_id=?, @action=?, @user_id=?");
            $stmt->execute([$count_id, $approval_action, $userId]);

            $response = ['success' => true, 'message' => 'ดำเนินการเรียบร้อยแล้ว'];
            break;

        case 'get_pending_counts':
            $sql = "
                SELECT 
                    c.count_id, c.count_date, c.system_qty, c.actual_qty, c.diff_qty, c.remark, c.counted_at,
                    i.sap_no, ISNULL(i.part_no, i.sap_no) AS item_no, i.part_description,
                    l.location_name,
                    ISNULL(e.name_th, u.username) AS counter_name
                FROM dbo.INVENTORY_CYCLE_COUNTS c WITH (NOLOCK)
                JOIN dbo.ITEMS i WITH (NOLOCK) ON c.item_id = i.item_id
                JOIN dbo.LOCATIONS l WITH (NOLOCK) ON c.location_id = l.location_id
                LEFT JOIN dbo.USERS u WITH (NOLOCK) ON c.counted_by_user_id = u.id
                LEFT JOIN dbo.MANPOWER_EMPLOYEES e WITH (NOLOCK) ON u.emp_id = e.emp_id
                WHERE c.status = 'PENDING'
                ORDER BY c.counted_at ASC
            ";
            $stmt = $pdo->query($sql);
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $response = ['success' => true, 'data' => $data, 'count' => count($data)];
            break;

        case 'get_cycle_count_history':
            $sql = "
                SELECT 
                    c.count_id, c.count_date, c.system_qty, c.actual_qty, c.diff_qty, c.remark, c.counted_at, c.status, c.approved_at,
                    i.sap_no, ISNULL(i.part_no, i.sap_no) AS item_no, i.part_description,
                    l.location_name,
                    ISNULL(e1.name_th, u1.username) AS counter_name,
                    ISNULL(e2.name_th, u2.username) AS approver_name
                FROM dbo.INVENTORY_CYCLE_COUNTS c WITH (NOLOCK)
                JOIN dbo.ITEMS i WITH (NOLOCK) ON c.item_id = i.item_id
                JOIN dbo.LOCATIONS l WITH (NOLOCK) ON c.location_id = l.location_id
                LEFT JOIN dbo.USERS u1 WITH (NOLOCK) ON c.counted_by_user_id = u1.id
                LEFT JOIN dbo.MANPOWER_EMPLOYEES e1 WITH (NOLOCK) ON u1.emp_id = e1.emp_id
                LEFT JOIN dbo.USERS u2 WITH (NOLOCK) ON c.approved_by_user_id = u2.id
                LEFT JOIN dbo.MANPOWER_EMPLOYEES e2 WITH (NOLOCK) ON u2.emp_id = e2.emp_id
                WHERE c.status IN ('APPROVED', 'REJECTED')
                ORDER BY c.approved_at DESC
                OFFSET 0 ROWS FETCH NEXT 200 ROWS ONLY
            ";
            $stmt = $pdo->query($sql);
            $response = ['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)];
            break;


        // ==========================================
        // 🟢 7. TAGS, PALLETS & RAW MATERIALS (RECEIVING) 🟢
        // ==========================================
        case 'issue_selected_tags':
            $serials = $_POST['serials'] ?? '';
            $to_location = (int)($_POST['to_location'] ?? 0);
            $ignore_fifo = isset($_POST['ignore_fifo']) && $_POST['ignore_fifo'] === 'true'; 

            if (empty($serials) || $to_location == 0) {
                throw new Exception("ข้อมูลไม่ครบถ้วน (ยังไม่ได้เลือก Tag หรือ โลเคชั่น)");
            }

            $serialList = explode(',', $serials);
            $placeholders = implode(',', array_fill(0, count($serialList), '?'));

            if (!$ignore_fifo) {
                $fifoSql = "
                    SELECT TOP 1
                        req.serial_no AS requested_serial, i.part_no, req.received_date AS requested_date,
                        older.serial_no AS older_serial, older.received_date AS older_date, 
                        older.warehouse_no, older.master_pallet_no
                    FROM dbo.RM_SERIAL_TAGS req WITH (NOLOCK)
                    JOIN dbo.ITEMS i WITH (NOLOCK) ON req.item_id = i.item_id
                    CROSS APPLY (
                        SELECT TOP 1 t.serial_no, t.received_date, t.warehouse_no, t.master_pallet_no
                        FROM dbo.RM_SERIAL_TAGS t WITH (NOLOCK)
                        WHERE t.item_id = req.item_id AND t.status = 'AVAILABLE'
                          AND (t.received_date < req.received_date OR (t.received_date = req.received_date AND t.created_at < req.created_at))
                          AND t.serial_no NOT IN ($placeholders)
                        ORDER BY t.received_date ASC, t.created_at ASC
                    ) older
                    WHERE req.serial_no IN ($placeholders)
                ";
                $fifoParams = array_merge($serialList, $serialList);
                $fifoStmt = $pdo->prepare($fifoSql);
                $fifoStmt->execute($fifoParams);
                $fifoViolation = $fifoStmt->fetch(PDO::FETCH_ASSOC);

                if ($fifoViolation) {
                    $partNo = $fifoViolation['part_no'];
                    $oldRef = $fifoViolation['master_pallet_no'] ? "พาเลท " . $fifoViolation['master_pallet_no'] : "ป้าย " . $fifoViolation['older_serial'];
                    $oldDate = date('d/m/Y H:i', strtotime($fifoViolation['older_date']));
                    $oldLoc = $fifoViolation['warehouse_no'] ? "พิกัด: " . $fifoViolation['warehouse_no'] : "ไม่ระบุพิกัด";
                    
                    $response = [
                        'success' => true, 
                        'require_fifo_confirm' => true,
                        'message' => "พบวัตถุดิบ [{$partNo}] ที่เก่ากว่าค้างอยู่ในคลัง\nแนะนำให้เบิก {$oldRef} ({$oldLoc})\nที่รับเข้าเมื่อ {$oldDate} มาใช้ก่อน\n\nคุณยืนยันที่จะจ่าย Tag ล็อตนี้เลยหรือไม่?"
                    ];
                    break;
                }
            }

            $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_SILENT);
            $stmt = $pdo->prepare("EXEC dbo.sp_Store_IssueSpecificTags @SerialNumbers=?, @ToLocationID=?, @UserID=?");
            $success = $stmt->execute([$serials, $to_location, $currentUser['id']]);
            $errors = $stmt->errorInfo();
            $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION); 

            if (!$success && isset($errors[0]) && !in_array($errors[0], ['00000', '01000', '01003'])) {
                throw new Exception($errors[2] ?? "เกิดข้อผิดพลาดในการรันคำสั่ง");
            }

            $issuedTags = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $response = ['success' => true, 'issued_count' => count($issuedTags), 'issued_tags' => $issuedTags];
            break;

        case 'get_print_tags':
            $serials = $_POST['serials'] ?? '';
            if(empty($serials)) throw new Exception("ไม่มีรายการให้ปริ้นท์");
            
            $serialList = explode(',', $serials);
            $placeholders = implode(',', array_fill(0, count($serialList), '?'));
            
            $sql = "SELECT 
                        t.serial_no, 
                        i.sap_no AS item_no,
                        ISNULL(i.part_no, i.sap_no) AS part_no, 
                        i.part_description, 
                        ISNULL(i.material_type, '') AS category,
                        t.current_qty AS qty, 
                        t.qty_per_pallet,
                        t.po_number, 
                        t.received_date,
                        t.warehouse_no,
                        t.pallet_no,
                        t.ctn_number,
                        t.week_no,
                        t.remark
                    FROM dbo.RM_SERIAL_TAGS t WITH (NOLOCK)
                    LEFT JOIN dbo.ITEMS i WITH (NOLOCK) ON t.item_id = i.item_id
                    WHERE t.serial_no IN ($placeholders)";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute($serialList);
            $response = ['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)];
            break;

        case 'import_excel':
            $jsonData = $_POST['data'] ?? '';
            if (empty($jsonData)) throw new Exception("ไม่พบข้อมูลสำหรับการนำเข้า");

            $stmt = $pdo->prepare("EXEC dbo.sp_Store_ImportRMShipping @JsonData = ?, @UserId = ?");
            $stmt->execute([$jsonData, $currentUser['id']]);
            $importedData = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $response = ['success' => true, 'data' => $importedData];
            break;

        case 'receive_scanned_tag':
            $barcode = trim($_POST['barcode'] ?? '');
            $location_id = (int)($_POST['location_id'] ?? 0);
            
            if (empty($barcode) || $location_id === 0) {
                throw new Exception("ข้อมูลไม่ครบถ้วน (Barcode หรือ Location)");
            }

            $mode = (strpos($barcode, 'MPL-') === 0) ? 'PALLET' : 'SERIAL';
            
            $stmt = $pdo->prepare("EXEC dbo.sp_Store_ScanReceiveRM @ScanMode=?, @BarcodeValue=?, @LocationID=?, @UserID=?");
            $stmt->execute([$mode, $barcode, $location_id, $currentUser['id']]);
            
            $response = ['success' => true, 'message' => 'รับเข้าสำเร็จ'];
            break;

        case 'group_master_pallet':
            $serials = json_decode($_POST['serials'], true);
            if (!is_array($serials) || empty($serials)) throw new Exception("ไม่มีข้อมูลที่เลือกจัดพาเลท");

            $pdo->beginTransaction();
            $prefix = 'MPL-' . date('ym') . '-';
            $stmtLast = $pdo->query("SELECT TOP 1 master_pallet_no FROM dbo.RM_SERIAL_TAGS WITH (UPDLOCK) WHERE master_pallet_no LIKE '$prefix%' ORDER BY master_pallet_no DESC");
            $lastNo = $stmtLast->fetchColumn();
            $nextSeq = $lastNo ? ((int)substr($lastNo, -4)) + 1 : 1;
            $newMasterPalletNo = $prefix . str_pad($nextSeq, 4, '0', STR_PAD_LEFT);
            
            $placeholders = implode(',', array_fill(0, count($serials), '?'));
            $updStmt = $pdo->prepare("UPDATE dbo.RM_SERIAL_TAGS SET master_pallet_no = ? WHERE serial_no IN ($placeholders) AND status = 'PENDING'");            
            $params = array_merge([$newMasterPalletNo], $serials);
            $updStmt->execute($params);

            if ($updStmt->rowCount() == 0) throw new Exception("ไม่สามารถจัดกลุ่มได้ (อาจมีบางรายการถูกรับเข้าสต็อกไปแล้ว)");

            $selStmt = $pdo->prepare("
                SELECT 
                    MAX(t.master_pallet_no) AS master_pallet_no, MAX(i.part_no) AS item_no, MAX(i.part_description) AS part_description,
                    COUNT(DISTINCT i.item_id) AS distinct_items, MAX(t.po_number) AS po_number, COUNT(*) AS total_tags, SUM(t.qty_per_pallet) AS total_qty
                FROM dbo.RM_SERIAL_TAGS t WITH (NOLOCK)
                JOIN dbo.ITEMS i WITH (NOLOCK) ON t.item_id = i.item_id
                WHERE t.master_pallet_no = ?
            ");
            $selStmt->execute([$newMasterPalletNo]);
            $masterData = $selStmt->fetch(PDO::FETCH_ASSOC);

            $pdo->commit();
            $response = ['success' => true, 'data' => $masterData];
            break;

        case 'delete_tag':
            $serial_no = $_POST['serial_no'] ?? '';
            if (empty($serial_no)) throw new Exception("ไม่พบ Serial No.");

            $checkStmt = $pdo->prepare("SELECT status FROM dbo.RM_SERIAL_TAGS WITH (NOLOCK) WHERE serial_no = ?");
            $checkStmt->execute([$serial_no]);
            $tagStatus = $checkStmt->fetchColumn();

            if (!$tagStatus) throw new Exception('ไม่พบข้อมูล Tag นี้ในระบบ');
            if (!in_array($tagStatus, ['PENDING', 'AVAILABLE'])) {
                throw new Exception('ไม่อนุญาตให้ลบ เนื่องจากวัตถุดิบนี้ถูกเบิกจ่าย หรือเข้าสู่กระบวนการผลิตแล้ว!');
            }

            $pdo->prepare("DELETE FROM dbo.RM_SERIAL_TAGS WHERE serial_no = ?")->execute([$serial_no]);
            $response = ['success' => true];
            break;

        case 'delete_bulk_tags':
            $serials = json_decode($_POST['serials'], true);
            if (!is_array($serials) || empty($serials)) throw new Exception('ไม่มีข้อมูลให้ลบ');

            $placeholders = implode(',', array_fill(0, count($serials), '?'));
            
            $checkStmt = $pdo->prepare("SELECT serial_no FROM dbo.RM_SERIAL_TAGS WITH (NOLOCK) WHERE serial_no IN ($placeholders) AND status NOT IN ('PENDING', 'AVAILABLE')");
            $checkStmt->execute($serials);
            $usedTags = $checkStmt->fetchAll(PDO::FETCH_COLUMN);

            if (count($usedTags) > 0) throw new Exception('ไม่อนุญาตให้ลบ! มีบางรายการถูกเบิกจ่ายไปแล้ว: ' . implode(', ', $usedTags));

            $pdo->prepare("DELETE FROM dbo.RM_SERIAL_TAGS WHERE serial_no IN ($placeholders)")->execute($serials);
            $response = ['success' => true];
            break;

        case 'edit_tag':
            $serial_no = $_POST['serial_no'] ?? '';
            if (empty($serial_no)) throw new Exception("ไม่พบ Serial No.");

            $updStmt = $pdo->prepare("UPDATE dbo.RM_SERIAL_TAGS SET po_number = ?, warehouse_no = ?, pallet_no = ?, ctn_number = ?, week_no = ?, remark = ? WHERE serial_no = ?");
            $updStmt->execute([
                $_POST['po_number'] ?? '', $_POST['warehouse_no'] ?? '', $_POST['pallet_no'] ?? '',
                $_POST['ctn_number'] ?? '', $_POST['week_no'] ?? '', $_POST['remark'] ?? '', $serial_no
            ]);
            $response = ['success' => true];
            break;

        case 'update_print_status':
            $serials = json_decode($_POST['serials'], true);
            if (!is_array($serials) || empty($serials)) throw new Exception('ไม่มีข้อมูล');

            $placeholders = implode(',', array_fill(0, count($serials), '?'));
            $pdo->prepare("UPDATE dbo.RM_SERIAL_TAGS SET print_count = ISNULL(print_count, 0) + 1, last_printed_at = GETDATE() WHERE serial_no IN ($placeholders)")->execute($serials);
            $response = ['success' => true];
            break;

        case 'trace_tag':
            $barcode = isset($_GET['serial_no']) ? trim($_GET['serial_no']) : '';
            if (empty($barcode)) throw new Exception("กรุณาระบุ Barcode");

            $sqlTag = "SELECT 
                        MAX(ISNULL(t.master_pallet_no, t.serial_no)) AS serial_no, 
                        MAX(t.master_pallet_no) AS master_pallet_no,
                        CASE WHEN COUNT(DISTINCT i.item_id) > 1 THEN 'MIXED PARTS' ELSE MAX(i.part_no) END AS item_no, 
                        CASE WHEN COUNT(DISTINCT i.item_id) > 1 THEN 'พาเลทรวมสินค้าหลายชนิด (Consolidated Pallet)' ELSE MAX(i.part_description) END AS part_description, 
                        MAX(t.description_ref) AS description_ref, MAX(t.category) AS category,
                        SUM(t.qty_per_pallet) AS qty_per_pallet, SUM(t.current_qty) AS current_qty, 
                        COUNT(t.serial_no) AS total_tags, COUNT(DISTINCT i.item_id) AS distinct_items,
                        SUM(t.qty_per_pallet) AS total_qty, MAX(t.pallet_no) AS pallet_no, MAX(t.ctn_number) AS ctn_number,
                        MAX(t.week_no) AS week_no, MAX(t.po_number) AS po_number, MAX(t.received_date) AS received_date,
                        MAX(t.warehouse_no) AS warehouse_no, MAX(t.status) AS status, MAX(t.remark) AS remark,
                        MAX(u.fullname) AS actor_name, MAX(t.created_at) AS created_at
                    FROM dbo.RM_SERIAL_TAGS t WITH (NOLOCK)
                    LEFT JOIN dbo.ITEMS i WITH (NOLOCK) ON t.item_id = i.item_id
                    LEFT JOIN dbo.USERS u WITH (NOLOCK) ON t.created_by = u.id
                    WHERE t.serial_no = ? OR t.master_pallet_no = ? OR t.ctn_number = ?";
            
            $stmtTag = $pdo->prepare($sqlTag);
            $stmtTag->execute([$barcode, $barcode, $barcode]);
            $tagInfo = $stmtTag->fetch(PDO::FETCH_ASSOC);

            if (!$tagInfo || empty($tagInfo['item_no'])) {
                throw new Exception('ไม่พบข้อมูลในระบบ');
            }

            if ($tagInfo['total_tags'] <= 1 && empty($tagInfo['master_pallet_no'])) {
                unset($tagInfo['total_tags']);
                unset($tagInfo['total_qty']);
            }

            $history = [];
            if ($tagInfo['status'] != 'PENDING') {
                $history[] = [
                    'transaction_timestamp' => $tagInfo['created_at'], 'transaction_type' => 'RECEIVE_RM',
                    'quantity' => $tagInfo['total_qty'] ?? $tagInfo['qty_per_pallet'],
                    'notes' => 'รับเข้าสต็อก (สแกนรับของเข้า)', 'actor_name' => $tagInfo['actor_name'] ?? 'System'
                ];
            }

            $transSql = "SELECT t.transaction_timestamp, t.transaction_type, t.quantity, t.notes, ISNULL(e.name_th, u.username) AS actor_name
                         FROM dbo.STOCK_TRANSACTIONS t WITH (NOLOCK)
                         LEFT JOIN dbo.USERS u WITH (NOLOCK) ON t.created_by_user_id = u.id
                         LEFT JOIN dbo.MANPOWER_EMPLOYEES e WITH (NOLOCK) ON u.emp_id = e.emp_id
                         WHERE t.reference_id = ? ORDER BY t.transaction_timestamp ASC";
            $transStmt = $pdo->prepare($transSql);
            $transStmt->execute([$tagInfo['po_number']]);
            $history = array_merge($history, $transStmt->fetchAll(PDO::FETCH_ASSOC));

            $response = ['success' => true, 'data' => ['tag_info' => $tagInfo, 'history' => $history]];
            break;

        case 'get_rm_history':
            $startDate = $_GET['start_date'] ?? date('Y-m-d');
            $endDate = $_GET['end_date'] ?? date('Y-m-d');
            $search = $_GET['search'] ?? '';
            $statusFilter = $_GET['status'] ?? 'ALL';
            $isExport = isset($_GET['export']) && $_GET['export'] === 'true';

            $page = max(1, (int)($_GET['page'] ?? 1));
            $limit = max(10, (int)($_GET['limit'] ?? 100));
            $offset = ($page - 1) * $limit;

            $baseConditions = ["t.created_at >= ?", "t.created_at < ?"];
            $params = [$startDate . " 00:00:00", date('Y-m-d', strtotime($endDate . ' +1 day')) . " 00:00:00"];

            if (!empty($search)) {
                $baseConditions[] = "(t.serial_no LIKE ? OR t.master_pallet_no LIKE ? OR i.part_no LIKE ? OR i.sap_no LIKE ? OR t.po_number LIKE ? OR t.warehouse_no LIKE ? OR t.pallet_no LIKE ? OR t.ctn_number LIKE ?)";
                $searchWildcard = "%$search%";
                $params = array_merge($params, array_fill(0, 8, $searchWildcard));
            }

            $kpiWhereClause = implode(" AND ", $baseConditions);
            $kpiSql = "SELECT COUNT(*) as total_tags, ISNULL(SUM(qty_per_pallet), 0) as total_qty, 
                              SUM(CASE WHEN ISNULL(print_count, 0) > 0 THEN 1 ELSE 0 END) as printed_tags, 
                              SUM(CASE WHEN ISNULL(print_count, 0) = 0 THEN 1 ELSE 0 END) as pending_tags
                       FROM dbo.RM_SERIAL_TAGS t WITH (NOLOCK)
                       LEFT JOIN dbo.ITEMS i WITH (NOLOCK) ON t.item_id = i.item_id
                       WHERE $kpiWhereClause";
            
            $kpiStmt = $pdo->prepare($kpiSql);
            $kpiStmt->execute($params);
            $kpi = $kpiStmt->fetch(PDO::FETCH_ASSOC);
            $tableConditions = $baseConditions;
            
            if ($statusFilter === 'PENDING') {
                $tableConditions[] = "t.status = 'PENDING'";
            } elseif ($statusFilter === 'AVAILABLE') {
                $tableConditions[] = "t.status = 'AVAILABLE'";
            } elseif ($statusFilter === 'ISSUED') {
                $tableConditions[] = "t.status NOT IN ('PENDING', 'AVAILABLE')";
            }
            
            $tableWhereClause = implode(" AND ", $tableConditions);
            $sql = "SELECT t.*, ISNULL(i.part_no, i.sap_no) AS item_no, i.part_description 
                    FROM dbo.RM_SERIAL_TAGS t WITH (NOLOCK)
                    LEFT JOIN dbo.ITEMS i WITH (NOLOCK) ON t.item_id = i.item_id
                    WHERE $tableWhereClause
                    ORDER BY t.created_at DESC";

            if (!$isExport) {
                $offsetInt = (int)$offset;
                $limitInt = (int)$limit;
                $sql .= " OFFSET $offsetInt ROWS FETCH NEXT $limitInt ROWS ONLY";
            }

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $countFilteredSql = "SELECT COUNT(*) FROM dbo.RM_SERIAL_TAGS t WITH (NOLOCK) LEFT JOIN dbo.ITEMS i WITH (NOLOCK) ON t.item_id = i.item_id WHERE $tableWhereClause";
            $countFilteredStmt = $pdo->prepare($countFilteredSql);
            $countFilteredStmt->execute($params);
            $filteredRecords = $countFilteredStmt->fetchColumn();
            
            $response = [
                'success' => true, 'data' => $data, 'kpi' => $kpi,
                'pagination' => $isExport ? null : ['total_records' => $filteredRecords, 'current_page' => $page, 'total_pages' => ceil($filteredRecords / $limit)]
            ];
            break;

        case 'bulk_receive_tags':
            $serials = json_decode($_POST['serials'], true);
            $location_id = (int)($_POST['location_id'] ?? 0);

            if (!is_array($serials) || empty($serials)) {
                throw new Exception("ไม่มีรายการที่เลือกรับเข้า");
            }
            if ($location_id === 0) {
                throw new Exception("กรุณาระบุคลัง (Location) ที่ต้องการรับเข้า");
            }

            $pdo->beginTransaction();
            $successCount = 0;
            $stmt = $pdo->prepare("EXEC dbo.sp_Store_ScanReceiveRM @ScanMode='SERIAL', @BarcodeValue=?, @LocationID=?, @UserID=?");
            
            foreach ($serials as $serial) {
                $stmt->execute([$serial, $location_id, $currentUser['id']]);
                $successCount++;
            }

            $pdo->commit();
            $response = ['success' => true, 'message' => "ยืนยันรับเข้าสต็อกสำเร็จจำนวน $successCount พาเลท/กล่อง"];
            break;

        // ==========================================
        // 🟢 8. UNMATCHED CASES (Catch All) 🟢
        // ==========================================
        default:
            http_response_code(400);
            throw new Exception("Invalid API Action Request: " . htmlspecialchars($action));
    }

    // 🎯 Single Point of Return สำหรับฝั่ง Success
    echo json_encode($response);

} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    
    $errorMessage = $e->getMessage();
    
    if (strpos($errorMessage, '[SQL Server]') !== false) {
        $parts = explode('[SQL Server]', $errorMessage);
        $cleanError = trim(end($parts));
        if (strpos($cleanError, 'Violation of') !== false || strpos($cleanError, 'Invalid object') !== false) {
            $errorMessage = "เกิดข้อผิดพลาดในการประมวลผลฐานข้อมูล (Database Constraint Violation)";
        } else {
            $errorMessage = $cleanError;
        }
    }

    if (http_response_code() === 200) {
        http_response_code(500);
    }
    
    // 🎯 Single Point of Return สำหรับฝั่ง Error
    echo json_encode(['success' => false, 'message' => $errorMessage]);
}
?>