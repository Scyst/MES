<?php
// page/store/api/manage_rm_receiving.php
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

            // เรียกใช้ SP ตัวใหม่ที่รวบ Logic ทุกอย่างไว้แล้ว (Transaction อยู่ใน SP)
            $stmt = $pdo->prepare("EXEC sp_Store_ImportRMShipping @JsonData = :json, @UserId = :uid");
            $stmt->bindParam(':json', $jsonData, PDO::PARAM_STR);
            $stmt->bindParam(':uid', $userId, PDO::PARAM_INT);
            $stmt->execute();

            // ดึงผลลัพธ์ (รายการ Tag ที่ถูกสร้าง) กลับมาเพื่อพิมพ์ QR Code
            $tags = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode([
                'success' => true, 
                'data' => $tags, 
                'message' => 'บันทึกรับเข้าและสร้าง Serial Tag เรียบร้อยแล้ว'
            ]);
            break;

        case 'get_history':
            $start_date = $_GET['start_date'] ?? date('Y-m-01');
            $end_date = $_GET['end_date'] ?? date('Y-m-d');
            
            // เติมเวลาให้ครอบคลุมถึงสิ้นวัน
            $end_date_full = $end_date . ' 23:59:59';

            $sql = "SELECT 
                        t.serial_no, 
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

        case 'trace_tag':
            $serial_no = isset($_GET['serial_no']) ? trim($_GET['serial_no']) : '';
            
            if (empty($serial_no)) {
                throw new Exception("กรุณาระบุ Serial Number ที่ต้องการค้นหา");
            }

            $sqlTag = "SELECT 
                        t.serial_no, 
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
                        t.warehouse_no, 
                        t.status, 
                        t.remark,
                        u.fullname AS actor_name,
                        t.created_at
                    FROM RM_SERIAL_TAGS t WITH (NOLOCK)
                    LEFT JOIN ITEMS i WITH (NOLOCK) ON t.item_id = i.item_id
                    LEFT JOIN USERS u WITH (NOLOCK) ON t.created_by = u.id
                    WHERE t.serial_no = :serial_no";
            
            $stmtTag = $pdo->prepare($sqlTag);
            $stmtTag->bindParam(':serial_no', $serial_no);
            $stmtTag->execute();
            $tagInfo = $stmtTag->fetch(PDO::FETCH_ASSOC);

            if (!$tagInfo) {
                echo json_encode(['success' => false, 'message' => 'ไม่พบข้อมูลแท็กนี้ในระบบ']);
                exit;
            }

            $history = [];
            $history[] = [
                'transaction_timestamp' => $tagInfo['created_at'],
                'transaction_type' => 'RECEIVE_RM',
                'quantity' => $tagInfo['qty_per_pallet'],
                'notes' => 'รับเข้าสต็อก (Import Excel)',
                'actor_name' => $tagInfo['actor_name'] ?? 'System'
            ];

            if ($tagInfo['current_qty'] < $tagInfo['qty_per_pallet']) {
                $diff = $tagInfo['qty_per_pallet'] - $tagInfo['current_qty'];
                $history[] = [
                    'transaction_timestamp' => date('Y-m-d H:i:s'), 
                    'transaction_type' => 'ISSUE_RM',
                    'quantity' => $diff,
                    'notes' => 'เบิกจ่ายเข้าไลน์ผลิต (ตัวอย่าง)',
                    'actor_name' => 'Operator'
                ];
            }

            echo json_encode(['success' => true, 'data' => ['tag_info' => $tagInfo, 'history' => $history]]);
            break;

        case 'delete_bulk_tags':
            $serials = json_decode($_POST['serials'], true);
            if (!is_array($serials) || empty($serials)) {
                echo json_encode(['success' => false, 'message' => 'ไม่มีข้อมูลที่เลือก']);
                exit;
            }

            // เช็คก่อนว่าในกลุ่มที่เลือกมา มีอันไหนถูกเบิกไปใช้แล้วหรือยัง?
            $placeholders = implode(',', array_fill(0, count($serials), '?'));
            $checkStmt = $pdo->prepare("SELECT serial_no FROM RM_SERIAL_TAGS WHERE serial_no IN ($placeholders) AND current_qty != qty_per_pallet");
            $checkStmt->execute($serials);
            $usedTags = $checkStmt->fetchAll(PDO::FETCH_COLUMN);

            if (count($usedTags) > 0) {
                // ถ้ามีของที่ใช้แล้ว ให้เบรกการลบทันทีและแจ้งเตือน
                echo json_encode(['success' => false, 'message' => 'ไม่อนุญาตให้ลบ! เนื่องจาก Tag ต่อไปนี้ถูกเบิกจ่ายไปแล้ว: ' . implode(', ', $usedTags)]);
                exit;
            }

            // ถ้าผ่านหมด ให้ลบทิ้งรวดเดียว
            $delStmt = $pdo->prepare("DELETE FROM RM_SERIAL_TAGS WHERE serial_no IN ($placeholders)");
            $delStmt->execute($serials);

            echo json_encode(['success' => true]);
            break;

        case 'delete_tag':
            // ฟังก์ชันลบเดี่ยวๆ
            $serial_no = $_POST['serial_no'] ?? '';
            $checkStmt = $pdo->prepare("SELECT current_qty, qty_per_pallet FROM RM_SERIAL_TAGS WHERE serial_no = ?");
            $checkStmt->execute([$serial_no]);
            $tag = $checkStmt->fetch();

            if (!$tag) {
                echo json_encode(['success' => false, 'message' => 'ไม่พบข้อมูล Tag นี้ในระบบ']);
                exit;
            }
            if ($tag['current_qty'] != $tag['qty_per_pallet']) {
                echo json_encode(['success' => false, 'message' => 'ไม่อนุญาตให้ลบ เนื่องจากวัตถุดิบนี้ถูกเบิกจ่ายไปแล้วบางส่วน!']);
                exit;
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

            // อัปเดตข้อมูลครอบคลุมฟิลด์ที่ขอมาทั้งหมด
            $updStmt = $pdo->prepare("UPDATE RM_SERIAL_TAGS SET po_number = ?, warehouse_no = ?, pallet_no = ?, ctn_number = ?, week_no = ?, remark = ? WHERE serial_no = ?");
            $updStmt->execute([$po_number, $warehouse_no, $pallet_no, $ctn_number, $week_no, $remark, $serial_no]);
            
            echo json_encode(['success' => true]);
            break;

        case 'update_print_status':
            $serials = json_decode($_POST['serials'], true);
            if (!is_array($serials) || empty($serials)) {
                echo json_encode(['success' => false, 'message' => 'ไม่มีข้อมูล']);
                exit;
            }

            $placeholders = implode(',', array_fill(0, count($serials), '?'));
            $updStmt = $pdo->prepare("UPDATE RM_SERIAL_TAGS 
                                      SET print_count = ISNULL(print_count, 0) + 1, 
                                          last_printed_at = GETDATE() 
                                      WHERE serial_no IN ($placeholders)");
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

    echo json_encode([
        'success' => false, 
        'message' => $errorMessage
    ]);
}
?>