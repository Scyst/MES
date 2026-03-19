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
            // ดึงรายชื่อ Location ที่มีสถานะ Active มาทำ Dropdown
            $stmtLoc = $pdo->query("SELECT location_id, location_name, location_type FROM dbo.LOCATIONS WHERE is_active = 1 ORDER BY location_name");
            echo json_encode(['success' => true, 'data' => $stmtLoc->fetchAll(PDO::FETCH_ASSOC)]);
            break;

        case 'get_dashboard':
            $location_id = $_GET['location_id'] ?? 'ALL';
            
            // สร้างเงื่อนไขกรอง Location (ถ้าเลือก ALL ก็ไม่กรอง)
            $locFilter = ($location_id !== 'ALL' && $location_id !== '') ? "AND location_id = " . (int)$location_id : "";

            // ใช้ Dynamic SQL CTE เพื่อให้ดึงข้อมูล 0 ได้ และกรอง Location ได้
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
                ISNULL(o.available_qty, 0) AS available_qty,
                ISNULL(p.pending_qty, 0) AS pending_qty,
                (ISNULL(o.available_qty, 0) + ISNULL(p.pending_qty, 0)) AS total_qty,
                ISNULL(i.StandardPrice, 0) AS unit_price,
                (ISNULL(o.available_qty, 0) * ISNULL(i.StandardPrice, 0)) AS total_value
            FROM dbo.ITEMS i WITH (NOLOCK)
            LEFT JOIN OnhandSum o ON i.item_id = o.item_id
            LEFT JOIN PendingSum p ON i.item_id = p.item_id
            WHERE i.is_active = 1 AND i.material_type = 'RM'
            ORDER BY o.available_qty ASC, total_value DESC
            ";

            $stmt = $pdo->query($sql);
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // คำนวณ KPI สรุปยอดรวม (ตัวแปรสำหรับส่งไปหน้าเว็บ)
            $kpi = [
                'total_skus' => count($data),
                'out_of_stock' => 0, // [NEW] นับไอเทมที่สต็อกหมดหรือติดลบ
                'total_pending_qty' => 0,
                'total_value' => 0,
                'toolbar_total_pcs' => 0 // ยอดรวมชิ้นที่บอกว่าไม่มีประโยชน์ ย้ายมาไว้แค่นี้
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

        default:
            throw new Exception("Invalid Action");
    }
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>