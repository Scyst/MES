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
        
        // ========================================================
        // 🟢 1. ดึงข้อมูลสินค้า (Catalog) แบบแบ่งหน้า (Pagination) 🟢
        // ========================================================
        case 'get_catalog':
            $category = $_REQUEST['category'] ?? 'ALL';
            $search = $_REQUEST['search'] ?? '';
            $sort = $_REQUEST['sort'] ?? 'DEFAULT'; 
            
            // รับพารามิเตอร์ Pagination
            $page = isset($_REQUEST['page']) ? (int)$_REQUEST['page'] : 1;
            $limit = isset($_REQUEST['limit']) ? (int)$_REQUEST['limit'] : 40; 
            $offset = ($page - 1) * $limit;

            // [FIX 1] แก้ไข Subquery INVENTORY_ONHAND ให้ดึงเฉพาะ Location ที่เป็น STORE ป้องกันยอดรวมมั่ว
            $sql = "SELECT 
                        i.sap_no AS item_code, 
                        i.part_description AS description, 
                        i.item_category, 
                        i.image_path,
                        ISNULL(inv.qty, 0) AS onhand_qty
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

            // Logic การจัดเรียง (Sorting)
            if ($sort === 'SAP_ASC') {
                $sql .= " ORDER BY i.sap_no ASC ";
            } else if ($sort === 'SAP_DESC') {
                $sql .= " ORDER BY i.sap_no DESC ";
            } else if ($sort === 'STOCK_DESC') {
                $sql .= " ORDER BY ISNULL(inv.qty, 0) DESC, i.sap_no ASC ";
            } else {
                // DEFAULT: มีของอยู่บน (0), ของหมดอยู่ล่าง (1) -> แล้วเรียงตาม SAP
                $sql .= " ORDER BY CASE WHEN ISNULL(inv.qty, 0) > 0 THEN 0 ELSE 1 END ASC, i.sap_no ASC ";
            }

            $sql .= " OFFSET " . (int)$offset . " ROWS FETCH NEXT " . (int)$limit . " ROWS ONLY ";

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode(['success' => true, 'data' => $items]);
            break;

        // ========================================================
        // 🟢 2. ยืนยันการส่งคำขอเบิกของ (Submit Requisition) 🟢
        // ========================================================
        case 'submit_requisition':
            $userId = $_SESSION['user']['id'];
            $remark = $_POST['remark'] ?? '';
            $requestType = $_POST['request_type'] ?? 'STOCK'; 
            $cartData = json_decode($_POST['cart'], true); 

            if (empty($cartData) || !is_array($cartData)) {
                throw new Exception("ตะกร้าสินค้าว่างเปล่า ข้อมูลไม่ถูกต้อง");
            }

            $pdo->beginTransaction();
            try {
                $ym = date('ym'); 
                $prefix = "REQ-{$ym}-";
                
                // [FIX 2] เพิ่ม HOLDLOCK เพื่อป้องกัน Race Condition ในการขอเลข REQ
                $stmtCheck = $pdo->prepare("SELECT MAX(req_number) as max_req FROM dbo.STORE_REQUISITIONS WITH (UPDLOCK, HOLDLOCK) WHERE req_number LIKE ?");
                $stmtCheck->execute([$prefix . '%']);
                $row = $stmtCheck->fetch();
                
                $runningNo = 1;
                if ($row && $row['max_req']) {
                    $lastNo = (int) substr($row['max_req'], -4);
                    $runningNo = $lastNo + 1;
                }
                $reqNumber = $prefix . str_pad($runningNo, 4, '0', STR_PAD_LEFT);

                // ถ้าเป็น K2 แปะ Tag [K2 Request] ไว้ที่หมายเหตุ
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
                    $stmtDetail->execute([$reqId, $item['item_code'], $item['qty'], $requestType]);
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

        // ========================================================
        // 🟢 3. ดึงประวัติการเบิกของตัวเอง (Order History) 🟢
        // ========================================================
        case 'get_my_orders':
            $userId = $_SESSION['user']['id'];
            
            $startDate = $_REQUEST['start_date'] ?? date('Y-m-d', strtotime('-30 days'));
            $endDate = $_REQUEST['end_date'] ?? date('Y-m-d');
            
            // [FIX 3] ครอบเวลาให้รวมถึง 23:59:59 ของวัน End Date ไม่งั้นบิลของวันสุดท้ายจะไม่ขึ้น
            $sql = "SELECT r.id, r.req_number, r.status, r.remark,
                           FORMAT(r.created_at, 'dd/MM/yyyy HH:mm') as req_time,
                           (SELECT COUNT(*) FROM dbo.STORE_REQUISITION_ITEMS ri WITH (NOLOCK) WHERE ri.req_id = r.id) as total_items
                    FROM dbo.STORE_REQUISITIONS r WITH (NOLOCK)
                    WHERE r.requester_id = ? 
                      AND r.created_at >= ? 
                      AND r.created_at < DATEADD(DAY, 1, CAST(? AS DATE))
                    ORDER BY r.created_at DESC";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$userId, $startDate, $endDate]);
            
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
            break;

        // ========================================================
        // 🟢 4. ดึงรายละเอียดบิลและ Tracking 🟢
        // ========================================================
        case 'get_my_order_details':
            $req_id = $_REQUEST['req_id'];
            $userId = $_SESSION['user']['id'];

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

        // ========================================================
        // 🟢 โหมด: อัปโหลด/แก้ไข รูปภาพสินค้า 🟢
        // ========================================================
        case 'upload_image':
            $item_code = $_POST['item_code'] ?? '';
            if (empty($item_code) || !isset($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
                throw new Exception("ข้อมูลไม่ครบ หรือไฟล์มีปัญหา");
            }

            $file = $_FILES['image'];
            $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
            
            // เช็คนามสกุลและขนาด (ไม่เกิน 5MB)
            if (!in_array($ext, ['jpg', 'jpeg', 'png', 'webp'])) { throw new Exception("รองรับเฉพาะ JPG, PNG, WEBP"); }
            if ($file['size'] > 5 * 1024 * 1024) { throw new Exception("ไฟล์ต้องไม่เกิน 5MB"); }

            $uploadDir = __DIR__ . '/../../../uploads/items/';
            if (!is_dir($uploadDir)) mkdir($uploadDir, 0777, true);

            // สร้างชื่อไฟล์ใหม่ ใส่ Timestamp เพื่อให้ชื่อไม่ซ้ำกัน
            $newFileName = preg_replace('/[^a-zA-Z0-9_-]/', '_', $item_code) . '_' . time() . '.' . $ext;
            
            if (move_uploaded_file($file['tmp_name'], $uploadDir . $newFileName)) {
                // ดึงชื่อไฟล์เดิมมาลบทิ้ง
                $stmtCheck = $pdo->prepare("SELECT image_path FROM dbo.ITEMS WHERE sap_no = ?");
                $stmtCheck->execute([$item_code]);
                $oldImage = $stmtCheck->fetchColumn();
                
                if ($oldImage && file_exists($uploadDir . $oldImage)) {
                    unlink($uploadDir . $oldImage); // ลบไฟล์เก่าทิ้ง
                }

                // อัปเดตชื่อไฟล์ใหม่ลง Database
                $pdo->prepare("UPDATE dbo.ITEMS SET image_path = ? WHERE sap_no = ?")->execute([$newFileName, $item_code]);
                echo json_encode(['success' => true, 'image_path' => $newFileName]);
            } else {
                throw new Exception("บันทึกไฟล์ไม่สำเร็จ เช็ค Permission โฟลเดอร์");
            }
            break;

        default:
            echo json_encode(['success' => false, 'message' => 'Invalid Action']);
    }

} catch (\Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => "Server Error: " . $e->getMessage()]);
}
?>