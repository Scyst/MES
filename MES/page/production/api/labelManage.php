<?php
// api/labelManage.php
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../../auth/check_auth.php';
require_once __DIR__ . '/../../logger.php';

// สมมติว่าใช้ Permission print_label หรือ permission ที่เกี่ยวข้อง
if (!hasPermission('print_label') && !hasPermission('manage_production')) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Permission Denied']);
    exit;
}

$action = $_REQUEST['action'] ?? '';
$input = json_decode(file_get_contents("php://input"), true);
$currentUser = $_SESSION['user'];

try {
    switch ($action) {

        // ==========================================================
        // [1] AJAX Item Search 
        // ==========================================================
        case 'search_items':
            $q = $_GET['q'] ?? '';
            if (strlen($q) < 2) {
                echo json_encode(['success' => true, 'data' => [], 'message' => 'Query too short']);
                break;
            }

            $sql = "SELECT TOP 20 item_id, sap_no, part_no, part_description 
                    FROM " . ITEMS_TABLE . " WITH (NOLOCK) 
                    WHERE is_active = 1 
                      AND (sap_no LIKE :q1 OR part_no LIKE :q2 OR part_description LIKE :q3)
                    ORDER BY sap_no ASC";
            
            $stmt = $pdo->prepare($sql);
            $searchTerm = "%{$q}%";
            $stmt->execute(['q1' => $searchTerm, 'q2' => $searchTerm, 'q3' => $searchTerm]);
            $items = $stmt->fetchAll();

            echo json_encode(['success' => true, 'data' => $items, 'message' => 'Fetched successfully']);
            break;

        // ==========================================================
        // [2] Get Label History (7 Days)
        // ==========================================================
        case 'get_label_history':
            $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;
            
            $sql = "SELECT 
                        t.transfer_uuid, 
                        t.quantity, 
                        t.status, 
                        t.created_at,
                        i.sap_no, 
                        i.part_description 
                    FROM " . TRANSFER_ORDERS_TABLE . " t WITH (NOLOCK)
                    JOIN " . ITEMS_TABLE . " i WITH (NOLOCK) ON t.item_id = i.item_id
                    WHERE t.created_by_user_id = :user_id 
                      AND t.created_at >= DATEADD(DAY, -7, GETDATE())
                    ORDER BY t.created_at DESC 
                    OFFSET 0 ROWS FETCH NEXT :limit ROWS ONLY";
            
            $stmt = $pdo->prepare($sql);
            $stmt->bindValue(':user_id', $currentUser['id'], PDO::PARAM_INT);
            $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
            $stmt->execute();
            $history = $stmt->fetchAll();

            echo json_encode(['success' => true, 'data' => $history, 'message' => 'Fetched history']);
            break;

        // ==========================================================
        // [3] Cancel Ghost Label
        // ==========================================================
        case 'cancel_label':
            $transferUuid = $input['transfer_uuid'] ?? '';
            if (empty($transferUuid)) {
                throw new Exception("Transfer UUID is required.");
            }

            $pdo->beginTransaction();
            
            $checkStmt = $pdo->prepare("SELECT status FROM " . TRANSFER_ORDERS_TABLE . " WITH (UPDLOCK) WHERE transfer_uuid = ?");
            $checkStmt->execute([$transferUuid]);
            $currentStatus = $checkStmt->fetchColumn();

            if (!$currentStatus) {
                throw new Exception("ไม่พบรายการ Label นี้ในระบบ");
            }

            if ($currentStatus !== 'PENDING') {
                throw new Exception("ไม่สามารถยกเลิกได้ เนื่องจากสถานะปัจจุบันคือ {$currentStatus}");
            }

            $updStmt = $pdo->prepare("UPDATE " . TRANSFER_ORDERS_TABLE . " SET status = 'CANCELLED' WHERE transfer_uuid = ?");
            $updStmt->execute([$transferUuid]);

            $pdo->commit();
            echo json_encode(['success' => true, 'data' => null, 'message' => "ยกเลิกรายการ {$transferUuid} สำเร็จ"]);
            break;

        // ==========================================================
        // [4] Create Batch Transfer Orders (ย้ายมาจาก transferManage.php)
        // ==========================================================
        case 'create_batch_transfer_orders':
            // ดึงโค้ดเดิมจาก transferManage.php มาวางที่นี่
            // อย่าลืมตรวจสอบตัวแปรให้ตรงกับ $input และหุ้มด้วย $pdo->beginTransaction(); ... $pdo->commit();
            
            /* ตัวอย่าง (คุณต้องเอา Logic ตัวเต็มที่คุณมีมาใส่):
            $itemId = $input['item_id'];
            $fromLoc = $input['from_location_id'];
            $toLoc = $input['to_location_id'];
            ... 
            */
            
            echo json_encode(['success' => true, 'message' => 'Generated successfully', 'labels' => []]);
            break;

        default:
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => "Invalid action: {$action}"]);
            break;
    }

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    // หากมีระบบ Log ให้บันทึกลง Logger ด้วย
}