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
                        u.username AS created_by,
                        t.created_at
                    FROM RM_SERIAL_TAGS t WITH (NOLOCK)
                    JOIN ITEMS i WITH (NOLOCK) ON t.item_id = i.item_id
                    LEFT JOIN USERS u WITH (NOLOCK) ON t.created_by = u.id
                    ORDER BY t.created_at DESC 
                    OFFSET 0 ROWS FETCH NEXT 1000 ROWS ONLY";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute();
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode(['success' => true, 'data' => $data]);
            break;

        default:
            throw new Exception("Invalid Action");
    }
} catch (Exception $e) {
    $errorMessage = $e->getMessage();
    
    // ดักจับและตัดข้อความขยะจาก SQL Server (เช่น SQLSTATE[42000]: [Microsoft][...][SQL Server])
    // ให้เหลือแค่ข้อความที่เราเขียนไว้ใน RAISERROR 
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