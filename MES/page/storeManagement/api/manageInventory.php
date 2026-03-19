<?php
// page/store/api/manageInventory.php
require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../../auth/check_auth.php';

header('Content-Type: application/json; charset=utf-8');
ini_set('display_errors', 0);

if (!isset($_SESSION['user'])) {
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

$action = $_REQUEST['action'] ?? '';

try {
    if (!isset($pdo)) {
        $pdo = new PDO("sqlsrv:Server=" . DB_HOST . ";Database=" . DB_DATABASE, DB_USER, DB_PASSWORD);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    }

    switch ($action) {
        case 'get_locations':
            $stmtLoc = $pdo->query("SELECT location_id, location_name, location_type FROM dbo.LOCATIONS WHERE is_active = 1 ORDER BY location_name");
            echo json_encode(['success' => true, 'data' => $stmtLoc->fetchAll(PDO::FETCH_ASSOC)]);
            break;

        case 'get_dashboard':
            $location_id = $_GET['location_id'] ?? 'ALL';
            $material_type = $_GET['material_type'] ?? 'ALL';
            $hide_zero = $_GET['hide_zero'] ?? 'false';
            $locFilter = ($location_id !== 'ALL' && $location_id !== '') ? "AND location_id = " . (int)$location_id : "";
            $matFilter = "";
            if ($material_type !== 'ALL') {
                $allowed_types = ['RM', 'FG', 'SEMI', 'WIP', 'PKG'];
                if (in_array(strtoupper($material_type), $allowed_types)) {
                    $matFilter = "AND i.material_type = '" . strtoupper($material_type) . "'";
                }
            }

            $zeroFilter = "";
            if ($hide_zero === 'true') {
                $zeroFilter = "AND (ISNULL(o.available_qty, 0) > 0 OR ISNULL(p.pending_qty, 0) > 0)";
            }

            $sql = "
            WITH OnhandSum AS (
                SELECT parameter_id AS item_id, SUM(quantity) AS available_qty
                FROM dbo.INVENTORY_ONHAND WITH (NOLOCK)
                WHERE 1=1 $locFilter
                GROUP BY parameter_id
            ),
            PendingSum AS (
                SELECT item_id, SUM(qty_per_pallet) AS pending_qty
                FROM dbo.RM_SERIAL_TAGS WITH (NOLOCK)
                WHERE status = 'PENDING'
                GROUP BY item_id
            )
            SELECT 
                i.item_id,
                ISNULL(i.part_no, i.sap_no) AS item_no,
                i.part_description,
                ISNULL(i.material_type, 'UNKNOWN') AS material_type,
                ISNULL(o.available_qty, 0) AS available_qty,
                ISNULL(p.pending_qty, 0) AS pending_qty,
                (ISNULL(o.available_qty, 0) + ISNULL(p.pending_qty, 0)) AS total_qty,
                ISNULL(i.StandardPrice, 0) AS unit_price,
                (ISNULL(o.available_qty, 0) * ISNULL(i.StandardPrice, 0)) AS total_value
            FROM dbo.ITEMS i WITH (NOLOCK)
            LEFT JOIN OnhandSum o ON i.item_id = o.item_id
            LEFT JOIN PendingSum p ON i.item_id = p.item_id
            WHERE i.is_active = 1 $matFilter $zeroFilter
            ORDER BY o.available_qty ASC, total_value DESC
            ";

            $stmt = $pdo->query($sql);
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $kpi = [
                'total_skus' => count($data),
                'out_of_stock' => 0,
                'total_pending_qty' => 0,
                'total_value' => 0,
                'toolbar_total_pcs' => 0
            ];

            foreach ($data as $row) {
                if ((float)$row['available_qty'] <= 0) {
                    $kpi['out_of_stock']++;
                }
                $kpi['toolbar_total_pcs'] += (float)$row['available_qty'];
                $kpi['total_pending_qty'] += (float)$row['pending_qty'];
                $kpi['total_value'] += (float)$row['total_value'];
            }

            echo json_encode(['success' => true, 'data' => $data, 'kpi' => $kpi]);
            break;

        case 'get_item_details':
            $item_id = $_GET['item_id'] ?? 0;
            $stmtAvail = $pdo->prepare("SELECT l.location_name, SUM(o.quantity) as qty FROM dbo.INVENTORY_ONHAND o WITH (NOLOCK) JOIN dbo.LOCATIONS l WITH (NOLOCK) ON o.location_id = l.location_id WHERE o.parameter_id = ? AND o.quantity > 0 GROUP BY l.location_name ORDER BY qty DESC");
            $stmtAvail->execute([$item_id]);
            $available_details = $stmtAvail->fetchAll(PDO::FETCH_ASSOC);

            $stmtPend = $pdo->prepare("SELECT ISNULL(master_pallet_no, ctn_number) as tracking_no, MAX(po_number) as po_number, SUM(qty_per_pallet) as qty FROM dbo.RM_SERIAL_TAGS WITH (NOLOCK) WHERE item_id = ? AND status = 'PENDING' GROUP BY ISNULL(master_pallet_no, ctn_number) ORDER BY qty DESC");
            $stmtPend->execute([$item_id]);
            $pending_details = $stmtPend->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode(['success' => true, 'available_details' => $available_details, 'pending_details' => $pending_details]);
            break;

        // =========================================================
        // ระบบเบิกจ่าย (Smart Material Issue)
        // =========================================================
        case 'issue_rm':
            $barcode = trim($_POST['barcode'] ?? '');
            $qty = (int)($_POST['qty'] ?? 1);
            $to_location = (int)($_POST['to_location'] ?? 0);
            $userId = $_SESSION['user']['id'];

            if (empty($barcode) || $qty < 1 || $to_location == 0) {
                throw new Exception("ข้อมูลไม่ครบถ้วน (Barcode, QTY, Location)");
            }

            $stmt = $pdo->prepare("EXEC sp_Store_IssueRM @ScanValue=?, @TagsToIssue=?, @ToLocationID=?, @UserID=?");
            $stmt->execute([$barcode, $qty, $to_location, $userId]);
            $issuedTags = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode([
                'success' => true, 
                'issued_count' => count($issuedTags),
                'issued_tags' => $issuedTags
            ]);
            break;

        // =========================================================
        // [NEW] ดึงรายชื่อ Tag ย่อยใน Master Pallet
        // =========================================================
        case 'get_pallet_tags':
            $barcode = trim($_GET['barcode'] ?? '');
            if (empty($barcode)) throw new Exception("กรุณาระบุบาร์โค้ด");

            $stmt = $pdo->prepare("
                SELECT t.serial_no, ISNULL(i.part_no, i.sap_no) as part_no, t.current_qty 
                FROM RM_SERIAL_TAGS t WITH (NOLOCK)
                JOIN ITEMS i WITH (NOLOCK) ON t.item_id = i.item_id
                WHERE (t.master_pallet_no = ? OR t.ctn_number = ? OR t.serial_no = ?)
                  AND t.status = 'AVAILABLE' AND t.current_qty > 0
                ORDER BY t.serial_no ASC
            ");
            $stmt->execute([$barcode, $barcode, $barcode]);
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
            break;

        // =========================================================
        // ยืนยันเบิกเฉพาะ Tag ที่เลือก (Smart Issue)
        // =========================================================
        case 'issue_selected_tags':
            $serials = $_POST['serials'] ?? '';
            $to_location = (int)($_POST['to_location'] ?? 0);
            $userId = $_SESSION['user']['id'];

            if (empty($serials) || $to_location == 0) {
                throw new Exception("ข้อมูลไม่ครบถ้วน (ยังไม่ได้เลือก Tag หรือ โลเคชั่น)");
            }

            // ⭐️ ท่าไม้ตายฝั่ง PHP: สั่งปิดการพ่น Exception เมื่อเจอ Warning
            $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_SILENT);
            
            $stmt = $pdo->prepare("EXEC sp_Store_IssueSpecificTags @SerialNumbers=?, @ToLocationID=?, @UserID=?");
            $success = $stmt->execute([$serials, $to_location, $userId]);
            
            // ดึง Error ออกมาเช็คด้วยตัวเอง
            $errors = $stmt->errorInfo();
            
            // ⭐️ เปิด Exception กลับมาให้ระบบอื่นทำงานปกติ
            $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION); 

            // ถ้าทำงานไม่สำเร็จ และ Error Code ไม่ใช่ 00000 (ปกติ), 01000 (Warning), 01003 (Warning)
            if (!$success && isset($errors[0]) && !in_array($errors[0], ['00000', '01000', '01003'])) {
                throw new Exception($errors[2] ?? "เกิดข้อผิดพลาดในการรันคำสั่ง");
            }

            $issuedTags = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode([
                'success' => true, 
                'issued_count' => count($issuedTags),
                'issued_tags' => $issuedTags // ส่งรายชื่อกลับไปพ่นสติ๊กเกอร์
            ]);
            break;

        // =========================================================
        // [NEW] ดึงข้อมูล Tag สำหรับปริ้นท์สติ๊กเกอร์ WIP 
        // =========================================================
        case 'get_print_tags':
            $serials = $_POST['serials'] ?? '';
            if(empty($serials)) throw new Exception("ไม่มีรายการให้ปริ้นท์");
            
            $serialList = explode(',', $serials);
            $placeholders = str_repeat('?,', count($serialList) - 1) . '?';
            
            $sql = "SELECT 
                        t.serial_no, 
                        ISNULL(i.part_no, i.sap_no) AS part_no, 
                        i.part_description, 
                        t.current_qty AS qty, 
                        t.po_number, 
                        t.received_date 
                    FROM dbo.RM_SERIAL_TAGS t WITH (NOLOCK)
                    LEFT JOIN dbo.ITEMS i WITH (NOLOCK) ON t.item_id = i.item_id
                    WHERE t.serial_no IN ($placeholders)";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute($serialList);
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode(['success' => true, 'data' => $data]);
            break;

        default:
            throw new Exception("Invalid Action");
    }
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>