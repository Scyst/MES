<?php
// page/store/api/manageRmReceiving.php
require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../../auth/check_auth.php';
require_once __DIR__ . '/../../logger.php';

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
        case 'import_excel':
            $jsonData = $_POST['data'] ?? '';
            if (empty($jsonData)) {
                throw new Exception("ไม่พบข้อมูลสำหรับการนำเข้า");
            }

            $userId = $_SESSION['user']['id'];

            // เรียกใช้ SP สำหรับ Import (สถานะจะเป็น PENDING เสมอ)
            $stmt = $pdo->prepare("EXEC sp_Store_ImportRMShipping @JsonData = :json, @UserId = :uid");
            $stmt->bindParam(':json', $jsonData, PDO::PARAM_STR);
            $stmt->bindParam(':uid', $userId, PDO::PARAM_INT);
            $stmt->execute();

            $tags = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode([
                'success' => true, 
                'data' => $tags, 
                'message' => 'นำเข้าข้อมูล PENDING เรียบร้อยแล้ว'
            ]);
            break;

        case 'get_history':
            $start_date = $_GET['start_date'] ?? date('Y-m-01');
            $end_date = $_GET['end_date'] ?? date('Y-m-d');
            $end_date_full = $end_date . ' 23:59:59';

            $sql = "SELECT 
                        t.serial_no, 
                        t.master_pallet_no, 
                        i.part_no AS item_no, 
                        i.part_description,
                        t.description_ref, 
                        t.category,
                        t.qty_per_pallet, 
                        t.current_qty, 
                        t.pallet_no, 
                        t.ctn_number,
                        t.week_no,
                        t.po_number, 
                        t.received_date,
                        t.actual_receive_date,
                        t.warehouse_no,
                        t.status, 
                        t.remark, 
                        t.print_count,
                        t.last_printed_at,
                        u.username AS created_by,
                        t.created_at
                    FROM RM_SERIAL_TAGS t WITH (NOLOCK)
                    JOIN ITEMS i WITH (NOLOCK) ON t.item_id = i.item_id
                    LEFT JOIN USERS u WITH (NOLOCK) ON t.created_by = u.id
                    WHERE t.created_at >= :start_date AND t.created_at <= :end_date
                    ORDER BY 
                        t.received_date DESC, 
                        t.ctn_number ASC,     
                        i.part_no ASC,        
                        t.serial_no ASC       
                    OFFSET 0 ROWS FETCH NEXT 5000 ROWS ONLY";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                ':start_date' => $start_date,
                ':end_date' => $end_date_full
            ]);
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode(['success' => true, 'data' => $data]);
            break;

        // =========================================================
        // [NEW] รวมกลุ่ม Master Pallet
        // =========================================================
        case 'group_master_pallet':
            $serials = json_decode($_POST['serials'], true);
            if (!is_array($serials) || empty($serials)) {
                throw new Exception("ไม่มีข้อมูลที่เลือกจัดพาเลท");
            }

            $pdo->beginTransaction();

            // 1. Generate Master Pallet Number (เช่น MPL-2603-0001)
            $prefix = 'MPL-' . date('ym') . '-';
            $stmtLast = $pdo->query("SELECT TOP 1 master_pallet_no FROM RM_SERIAL_TAGS WITH (UPDLOCK) WHERE master_pallet_no LIKE '$prefix%' ORDER BY master_pallet_no DESC");
            $lastNo = $stmtLast->fetchColumn();
            $nextSeq = $lastNo ? ((int)substr($lastNo, -4)) + 1 : 1;
            $newMasterPalletNo = $prefix . str_pad($nextSeq, 4, '0', STR_PAD_LEFT);

            // 2. Update ข้อมูลให้รายการที่ถูกเลือก
            $placeholders = implode(',', array_fill(0, count($serials), '?'));
            $updStmt = $pdo->prepare("UPDATE RM_SERIAL_TAGS SET master_pallet_no = ? WHERE serial_no IN ($placeholders) AND status = 'PENDING'");
            
            $params = array_merge([$newMasterPalletNo], $serials);
            $updStmt->execute($params);

            if ($updStmt->rowCount() == 0) {
                throw new Exception("ไม่สามารถจัดกลุ่มได้ (อาจมีบางรายการถูกรับเข้าสต็อกไปแล้ว)");
            }

            // 3. ดึงยอดสรุปของ Master Pallet ใบนี้ เพื่อส่งกลับไปปริ้นท์
            $selStmt = $pdo->prepare("
                SELECT 
                    MAX(t.master_pallet_no) AS master_pallet_no,
                    MAX(i.part_no) AS item_no,
                    MAX(i.part_description) AS part_description,
                    COUNT(DISTINCT i.item_id) AS distinct_items,
                    MAX(t.po_number) AS po_number,
                    COUNT(*) AS total_tags,
                    SUM(t.qty_per_pallet) AS total_qty
                FROM RM_SERIAL_TAGS t WITH (NOLOCK)
                JOIN ITEMS i WITH (NOLOCK) ON t.item_id = i.item_id
                WHERE t.master_pallet_no = ?
            ");
            $selStmt->execute([$newMasterPalletNo]);
            $masterData = $selStmt->fetch(PDO::FETCH_ASSOC);

            $pdo->commit();
            echo json_encode(['success' => true, 'data' => $masterData]);
            break;

        // =========================================================
        // [NEW] รับเข้าสต็อกด้วย Smart Scanner
        // =========================================================
        case 'receive_scanned_tag':
            $barcode = trim($_POST['barcode'] ?? '');
            $location_id = (int)($_POST['location_id'] ?? 1); // ค่าเริ่มต้นรับเข้าคลัง RM = 1
            $userId = $_SESSION['user']['id'];
            
            if (empty($barcode)) {
                throw new Exception("ไม่พบรหัสบาร์โค้ด");
            }

            // ระบบสมองกล: แยกว่าที่ยิงมาคือ Serial, CTN หรือ Master Pallet
            $scanMode = 'SERIAL'; 
            $checkStmt = $pdo->prepare("SELECT TOP 1 serial_no, master_pallet_no, ctn_number FROM RM_SERIAL_TAGS WHERE serial_no = ? OR master_pallet_no = ? OR ctn_number = ?");
            $checkStmt->execute([$barcode, $barcode, $barcode]);
            $found = $checkStmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$found) {
                throw new Exception("ไม่พบรหัสนี้ในระบบ กรุณาตรวจสอบป้ายอีกครั้ง");
            }

            if ($found['master_pallet_no'] === $barcode) {
                $scanMode = 'PALLET';
            } elseif ($found['ctn_number'] === $barcode) {
                $scanMode = 'CTN';
            }

            // ยิงเรียก SP ไปจัดการบวกสต็อกหลังบ้าน
            $execStmt = $pdo->prepare("EXEC sp_Store_ScanReceiveRM @ScanMode=?, @BarcodeValue=?, @LocationID=?, @UserID=?");
            $execStmt->execute([$scanMode, $barcode, $location_id, $userId]);
            $result = $execStmt->fetch(PDO::FETCH_ASSOC);

            echo json_encode(['success' => true, 'message' => $result['message']]);
            break;

        // =========================================================
        // Trace Tag (รองรับการสแกนแบบเหมา Master Pallet / CTN)
        // =========================================================
        case 'trace_tag':
            $barcode = isset($_GET['serial_no']) ? trim($_GET['serial_no']) : '';
            if (empty($barcode)) { throw new Exception("กรุณาระบุ Barcode"); }

            // ดึงข้อมูลแบบ Aggregation (ถ้ายิงตู้ หรือ Master Pallet มันจะรวมยอดให้เลย)
            $sqlTag = "SELECT 
                        MAX(ISNULL(t.master_pallet_no, t.serial_no)) AS serial_no, 
                        MAX(t.master_pallet_no) AS master_pallet_no,
                        
                        -- เช็คว่าถ้าพาเลทนี้มีหลาย Part No ให้พ่นคำว่า MIXED PARTS
                        CASE WHEN COUNT(DISTINCT i.item_id) > 1 THEN 'MIXED PARTS' ELSE MAX(i.part_no) END AS item_no, 
                        CASE WHEN COUNT(DISTINCT i.item_id) > 1 THEN 'พาเลทรวมสินค้าหลายชนิด (Consolidated Pallet)' ELSE MAX(i.part_description) END AS part_description, 
                        
                        MAX(t.description_ref) AS description_ref, 
                        MAX(t.category) AS category,
                        SUM(t.qty_per_pallet) AS qty_per_pallet, 
                        SUM(t.current_qty) AS current_qty, 
                        COUNT(t.serial_no) AS total_tags,
                        COUNT(DISTINCT i.item_id) AS distinct_items,
                        SUM(t.qty_per_pallet) AS total_qty,
                        MAX(t.pallet_no) AS pallet_no, 
                        MAX(t.ctn_number) AS ctn_number,
                        MAX(t.week_no) AS week_no,
                        MAX(t.po_number) AS po_number, 
                        MAX(t.received_date) AS received_date,
                        MAX(t.warehouse_no) AS warehouse_no, 
                        MAX(t.status) AS status, 
                        MAX(t.remark) AS remark,
                        MAX(u.fullname) AS actor_name,
                        MAX(t.created_at) AS created_at
                    FROM RM_SERIAL_TAGS t WITH (NOLOCK)
                    LEFT JOIN ITEMS i WITH (NOLOCK) ON t.item_id = i.item_id
                    LEFT JOIN USERS u WITH (NOLOCK) ON t.created_by = u.id
                    
                    -- ⭐️ [FIXED BUG]: เปลี่ยนจาก :barcode เป็นเครื่องหมาย ? 3 ตัว
                    WHERE t.serial_no = ? OR t.master_pallet_no = ? OR t.ctn_number = ?";
            
            $stmtTag = $pdo->prepare($sqlTag);
            // ⭐️ [FIXED BUG]: ส่งค่า $barcode เข้าไป 3 ตัว ให้พอดีกับ ? ในคำสั่ง SQL
            $stmtTag->execute([$barcode, $barcode, $barcode]);
            $tagInfo = $stmtTag->fetch(PDO::FETCH_ASSOC);

            if (!$tagInfo || empty($tagInfo['item_no'])) {
                echo json_encode(['success' => false, 'message' => 'ไม่พบข้อมูลในระบบ']);
                exit;
            }

            // ถ้ามีใบเดียว ให้ซ่อน total_tags เพื่อไม่ให้หน้าเว็บโชว์กล่อง Master Pallet
            if ($tagInfo['total_tags'] <= 1 && empty($tagInfo['master_pallet_no'])) {
                unset($tagInfo['total_tags']);
                unset($tagInfo['total_qty']);
            }

            // ประวัติ (จำลองชั่วคราว ดึงจากใบที่ 1 ของกลุ่มมาเป็นตัวแทน)
            $history = [];
            if ($tagInfo['status'] != 'PENDING') {
                $history[] = [
                    'transaction_timestamp' => $tagInfo['created_at'],
                    'transaction_type' => 'RECEIVE_RM',
                    'quantity' => $tagInfo['total_qty'] ?? $tagInfo['qty_per_pallet'],
                    'notes' => 'รับเข้าสต็อก (สแกนรับของเข้า)',
                    'actor_name' => $tagInfo['actor_name'] ?? 'System'
                ];
            }

            echo json_encode(['success' => true, 'data' => ['tag_info' => $tagInfo, 'history' => $history]]);
            break;
            
        case 'delete_bulk_tags':
            $serials = json_decode($_POST['serials'], true);
            if (!is_array($serials) || empty($serials)) {
                throw new Exception('ไม่มีข้อมูลที่เลือก');
            }

            $placeholders = implode(',', array_fill(0, count($serials), '?'));
            $checkStmt = $pdo->prepare("SELECT serial_no FROM RM_SERIAL_TAGS WHERE serial_no IN ($placeholders) AND status != 'PENDING' AND status != 'AVAILABLE'");
            $checkStmt->execute($serials);
            $usedTags = $checkStmt->fetchAll(PDO::FETCH_COLUMN);

            if (count($usedTags) > 0) {
                throw new Exception('ไม่อนุญาตให้ลบ! เนื่องจากมีบางรายการถูกเบิกจ่ายไปแล้ว: ' . implode(', ', $usedTags));
            }

            $delStmt = $pdo->prepare("DELETE FROM RM_SERIAL_TAGS WHERE serial_no IN ($placeholders)");
            $delStmt->execute($serials);

            echo json_encode(['success' => true]);
            break;

        case 'delete_tag':
            $serial_no = $_POST['serial_no'] ?? '';
            $checkStmt = $pdo->prepare("SELECT status FROM RM_SERIAL_TAGS WHERE serial_no = ?");
            $checkStmt->execute([$serial_no]);
            $tag = $checkStmt->fetch();

            if (!$tag) { throw new Exception('ไม่พบข้อมูล Tag นี้ในระบบ'); }
            if ($tag['status'] != 'PENDING' && $tag['status'] != 'AVAILABLE') {
                throw new Exception('ไม่อนุญาตให้ลบ เนื่องจากวัตถุดิบนี้ถูกขยับหรือเบิกจ่ายไปแล้ว!');
            }

            $delStmt = $pdo->prepare("DELETE FROM RM_SERIAL_TAGS WHERE serial_no = ?");
            $delStmt->execute([$serial_no]);
            echo json_encode(['success' => true]);
            break;

        case 'edit_tag':
            $serial_no = $_POST['serial_no'] ?? '';
            $po_number = $_POST['po_number'] ?? '';
            $warehouse_no = $_POST['warehouse_no'] ?? '';
            $pallet_no = $_POST['pallet_no'] ?? '';
            $ctn_number = $_POST['ctn_number'] ?? '';
            $week_no = $_POST['week_no'] ?? '';
            $remark = $_POST['remark'] ?? '';

            $updStmt = $pdo->prepare("UPDATE RM_SERIAL_TAGS SET po_number = ?, warehouse_no = ?, pallet_no = ?, ctn_number = ?, week_no = ?, remark = ? WHERE serial_no = ?");
            $updStmt->execute([$po_number, $warehouse_no, $pallet_no, $ctn_number, $week_no, $remark, $serial_no]);
            
            echo json_encode(['success' => true]);
            break;

        case 'update_print_status':
            $serials = json_decode($_POST['serials'], true);
            if (!is_array($serials) || empty($serials)) { throw new Exception('ไม่มีข้อมูล'); }

            $placeholders = implode(',', array_fill(0, count($serials), '?'));
            $updStmt = $pdo->prepare("UPDATE RM_SERIAL_TAGS SET print_count = ISNULL(print_count, 0) + 1, last_printed_at = GETDATE() WHERE serial_no IN ($placeholders)");
            $updStmt->execute($serials);
            
            echo json_encode(['success' => true]);
            break;

        default:
            throw new Exception("Invalid Action");
    }
} catch (Exception $e) {
    $errorMessage = $e->getMessage();
    if (strpos($errorMessage, '[SQL Server]') !== false) {
        $parts = explode('[SQL Server]', $errorMessage);
        $errorMessage = trim(end($parts));
    }

    echo json_encode(['success' => false, 'message' => $errorMessage]);
}
?>