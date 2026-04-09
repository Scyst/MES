<?php
// page/store/api/manageMaterial.php
header('Content-Type: application/json');
ini_set('display_errors', 0);
error_reporting(E_ALL);

require_once __DIR__ . '/../../components/init.php'; 
require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../components/php/logger.php';

if (!isset($_SESSION['user'])) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Unauthorized Access: กรุณาเข้าสู่ระบบ']);
    exit;
}

$action = $_REQUEST['action'] ?? '';

try {
    if (!isset($pdo)) {
        $pdo = new PDO("sqlsrv:Server=" . DB_HOST . ";Database=" . DB_DATABASE, DB_USER, DB_PASSWORD);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    }

    switch ($action) {
        
        case 'get_catalog':
            $category = $_REQUEST['category'] ?? 'ALL';
            $search = $_REQUEST['search'] ?? '';
            $sort = $_REQUEST['sort'] ?? 'DEFAULT'; // 🟢 รับค่าการจัดเรียงจากหน้าเว็บ

            $sql = "SELECT 
                        i.sap_no AS item_code, 
                        i.part_description AS description, 
                        i.item_category, 
                        i.image_path,
                        ISNULL(SUM(inv.quantity), 0) AS onhand_qty
                    FROM dbo.ITEMS i WITH (NOLOCK)
                    LEFT JOIN dbo.INVENTORY_ONHAND inv WITH (NOLOCK) ON i.item_id = inv.parameter_id
                    WHERE i.is_active = 1 "; 

            $params = [];

            if ($category !== 'ALL') {
                $sql .= " AND i.item_category = ? ";
                $params[] = $category;
            }

            if (!empty($search)) {
                $sql .= " AND (i.sap_no LIKE ? OR i.part_no LIKE ? OR i.part_description LIKE ?) ";
                $searchTerm = "%$search%";
                array_push($params, $searchTerm, $searchTerm, $searchTerm);
            }

            $sql .= " GROUP BY i.sap_no, i.part_description, i.item_category, i.image_path ";

            // 🟢 Logic การจัดเรียง (Sorting) 🟢
            if ($sort === 'SAP_ASC') {
                $sql .= " ORDER BY i.sap_no ASC ";
            } else if ($sort === 'SAP_DESC') {
                $sql .= " ORDER BY i.sap_no DESC ";
            } else if ($sort === 'STOCK_DESC') {
                $sql .= " ORDER BY ISNULL(SUM(inv.quantity), 0) DESC, i.sap_no ASC ";
            } else {
                // DEFAULT: มีของอยู่บน (0), ของหมดอยู่ล่าง (1) -> แล้วเรียงตาม SAP (A-Z)
                $sql .= " ORDER BY CASE WHEN ISNULL(SUM(inv.quantity), 0) > 0 THEN 0 ELSE 1 END ASC, i.sap_no ASC ";
            }

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode(['success' => true, 'data' => $items]);
            break;

        // 🟢 แก้ไขเคส submit_requisition ใน api/manageMaterial.php
        case 'submit_requisition':
            $userId = $_SESSION['user']['id'];
            $remark = $_POST['remark'] ?? '';
            $requestType = $_POST['request_type'] ?? 'STOCK'; // 🟢 รับประเภทบิล (STOCK หรือ K2)
            $cartData = json_decode($_POST['cart'], true); 

            if (empty($cartData) || !is_array($cartData)) {
                throw new Exception("ตะกร้าสินค้าว่างเปล่า ข้อมูลไม่ถูกต้อง");
            }

            $pdo->beginTransaction();
            try {
                $ym = date('ym'); 
                $prefix = "REQ-{$ym}-";
                
                $stmtCheck = $pdo->prepare("SELECT MAX(req_number) as max_req FROM dbo.STORE_REQUISITIONS WITH (UPDLOCK) WHERE req_number LIKE ?");
                $stmtCheck->execute([$prefix . '%']);
                $row = $stmtCheck->fetch();
                
                $runningNo = 1;
                if ($row && $row['max_req']) {
                    $lastNo = (int) substr($row['max_req'], -4);
                    $runningNo = $lastNo + 1;
                }
                $reqNumber = $prefix . str_pad($runningNo, 4, '0', STR_PAD_LEFT);

                // ถ้าเป็น K2 แปะ Tag [K2 Request] ไว้ที่หมายเหตุให้สโตร์เห็นชัดๆ
                $finalRemark = $requestType === 'K2' ? "[K2 Request] " . $remark : $remark;

                $sqlHeader = "INSERT INTO dbo.STORE_REQUISITIONS (req_number, requester_id, status, remark, created_at) 
                              VALUES (?, ?, 'NEW ORDER', ?, GETDATE())";
                $pdo->prepare($sqlHeader)->execute([$reqNumber, $userId, $finalRemark]);
                $reqId = $pdo->lastInsertId();

                $sqlDetail = "INSERT INTO dbo.STORE_REQUISITION_ITEMS (req_id, item_code, qty_requested, request_type) VALUES (?, ?, ?, ?)";
                $stmtDetail = $pdo->prepare($sqlDetail);
                
                $sqlK2 = "INSERT INTO dbo.STORE_K2_REQUESTS (req_item_id) VALUES (?)";
                $stmtK2 = $pdo->prepare($sqlK2);

                foreach ($cartData as $item) {
                    // ทุก Item ในบิลนี้ จะได้ Type เดียวกันหมด
                    $stmtDetail->execute([$reqId, $item['itemCode'], $item['qty'], $requestType]);
                    $rowId = $pdo->lastInsertId();

                    if ($requestType === 'K2') {
                        $stmtK2->execute([$rowId]);
                    }
                }

                if (function_exists('writeLog')) {
                    writeLog($pdo, 'CREATE', 'STORE_REQ', $reqId, null, ['req_number' => $reqNumber, 'type' => $requestType], 'User submitted new material requisition');
                }

                $pdo->commit();
                echo json_encode(['success' => true, 'req_number' => $reqNumber, 'message' => 'บันทึกคำขอสำเร็จ']);

            } catch (Exception $ex) {
                $pdo->rollBack();
                throw $ex;
            }
            break;

        // 🟢 3. ดึงประวัติการเบิกของตัวเอง (Order History) 🟢
        case 'get_my_orders':
            $userId = $_SESSION['user']['id'];
            
            // รับค่าจากหน้าเว็บ ถ้าไม่มีให้ย้อนหลัง 30 วัน
            $startDate = $_REQUEST['start_date'] ?? date('Y-m-d', strtotime('-30 days'));
            $endDate = $_REQUEST['end_date'] ?? date('Y-m-d');
            
            $sql = "SELECT r.id, r.req_number, r.status, r.remark,
                           FORMAT(r.created_at, 'dd/MM/yyyy HH:mm') as req_time,
                           (SELECT COUNT(*) FROM dbo.STORE_REQUISITION_ITEMS ri WITH (NOLOCK) WHERE ri.req_id = r.id) as total_items
                    FROM dbo.STORE_REQUISITIONS r WITH (NOLOCK)
                    WHERE r.requester_id = ? 
                      AND CAST(r.created_at AS DATE) BETWEEN ? AND ?
                    ORDER BY r.created_at DESC";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$userId, $startDate, $endDate]);
            
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
            break;

        // 🟢 4. ดึงรายละเอียดบิลและ Tracking 🟢
        case 'get_my_order_details':
            $req_id = $_REQUEST['req_id'];
            $userId = $_SESSION['user']['id'];

            // ดึงหัวบิล (เช็คด้วยว่าเป็นบิลของ User คนนี้จริงๆ เพื่อความปลอดภัย)
            $stmtH = $pdo->prepare("SELECT r.*, 
                                           FORMAT(r.created_at, 'dd/MM/yyyy HH:mm') as req_time,
                                           FORMAT(r.issued_at, 'dd/MM/yyyy HH:mm') as issue_time,
                                           u.fullname as issuer_name
                                    FROM dbo.STORE_REQUISITIONS r WITH (NOLOCK) 
                                    LEFT JOIN dbo.USERS u WITH (NOLOCK) ON r.issuer_id = u.id 
                                    WHERE r.id = ? AND r.requester_id = ?");
            $stmtH->execute([$req_id, $userId]);
            $header = $stmtH->fetch(PDO::FETCH_ASSOC);

            if (!$header) {
                throw new Exception("ไม่พบข้อมูลบิล หรือคุณไม่มีสิทธิ์เข้าถึง");
            }

            // ดึงรายการของในบิล
            $sqlItems = "SELECT ri.item_code, ri.qty_requested, ri.qty_issued,
                                i.part_description as description, i.image_path, i.item_category
                         FROM dbo.STORE_REQUISITION_ITEMS ri WITH (NOLOCK)
                         JOIN dbo.ITEMS i WITH (NOLOCK) ON ri.item_code = i.sap_no
                         WHERE ri.req_id = ?";
            
            $stmtI = $pdo->prepare($sqlItems);
            $stmtI->execute([$req_id]);
            $items = $stmtI->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode(['success' => true, 'header' => $header, 'items' => $items]);
            break;

        // 🟢 1. ดึงข้อมูลสินค้า (Catalog) แบบแบ่งหน้า (Pagination) 🟢
        case 'get_catalog':
            $category = $_REQUEST['category'] ?? 'ALL';
            $search = $_REQUEST['search'] ?? '';
            $sort = $_REQUEST['sort'] ?? 'DEFAULT'; 
            
            // รับพารามิเตอร์ Pagination
            $page = isset($_REQUEST['page']) ? (int)$_REQUEST['page'] : 1;
            $limit = isset($_REQUEST['limit']) ? (int)$_REQUEST['limit'] : 40; // โหลดทีละ 40 ชิ้น
            $offset = ($page - 1) * $limit;

            $sql = "SELECT 
                        i.sap_no AS item_code, 
                        i.part_description AS description, 
                        i.item_category, 
                        i.image_path,
                        ISNULL(SUM(inv.quantity), 0) AS onhand_qty
                    FROM dbo.ITEMS i WITH (NOLOCK)
                    LEFT JOIN (
                        SELECT io.parameter_id, SUM(io.quantity) as qty
                        FROM dbo.INVENTORY_ONHAND io WITH (NOLOCK)
                        JOIN dbo.LOCATIONS l WITH (NOLOCK) ON io.location_id = l.location_id
                        WHERE l.location_type = 'STORE'
                        GROUP BY io.parameter_id
                    ) inv ON i.item_id = inv.parameter_id
                    WHERE i.is_active = 1 "; 

            $params = [];

            if ($category !== 'ALL') {
                $sql .= " AND i.item_category = ? ";
                $params[] = $category;
            }

            if (!empty($search)) {
                $sql .= " AND (i.sap_no LIKE ? OR i.part_no LIKE ? OR i.part_description LIKE ?) ";
                $searchTerm = "%$search%";
                array_push($params, $searchTerm, $searchTerm, $searchTerm);
            }

            $sql .= " GROUP BY i.sap_no, i.part_description, i.item_category, i.image_path ";

            // Logic การจัดเรียง (Sorting)
            if ($sort === 'SAP_ASC') {
                $sql .= " ORDER BY i.sap_no ASC ";
            } else if ($sort === 'SAP_DESC') {
                $sql .= " ORDER BY i.sap_no DESC ";
            } else if ($sort === 'STOCK_DESC') {
                $sql .= " ORDER BY ISNULL(SUM(inv.quantity), 0) DESC, i.sap_no ASC ";
            } else {
                // DEFAULT: มีของอยู่บน (0), ของหมดอยู่ล่าง (1) -> แล้วเรียงตาม SAP
                $sql .= " ORDER BY CASE WHEN ISNULL(SUM(inv.quantity), 0) > 0 THEN 0 ELSE 1 END ASC, i.sap_no ASC ";
            }

            // 🟢 เทคนิค Pagination สำหรับ SQL Server 2012+ 🟢
            $sql .= " OFFSET ? ROWS FETCH NEXT ? ROWS ONLY ";
            $params[] = $offset;
            $params[] = $limit;

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode(['success' => true, 'data' => $items]);
            break;

        default:
            echo json_encode(['success' => false, 'message' => 'Invalid Action']);
    }

} catch (\Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => "Server Error: " . $e->getMessage()]);
}
?>