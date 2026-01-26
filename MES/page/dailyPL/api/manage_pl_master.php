<?php
// page/pl_daily/api/manage_pl_master.php
header('Content-Type: application/json');
ini_set('display_errors', 0); // ปิดการแสดง error เพื่อไม่ให้กวน JSON response
error_reporting(E_ALL);

require_once __DIR__ . '/../../../config/config.php';
require_once __DIR__ . '/../../../auth/check_auth.php';
require_once __DIR__ . '/../../db.php';

// ตรวจสอบสิทธิ์ (อ้างอิงจากระบบเดิมของคุณ)
if (!isset($_SESSION['user'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

$action = $_REQUEST['action'] ?? 'read';

try {
    // ใช้ $pdo จาก init.php
    switch ($action) {
        
        // 1. อ่านข้อมูลทั้งหมด
        case 'read':
            $stmt = $pdo->query("SELECT * FROM PL_STRUCTURE ORDER BY row_order ASC");
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(['success' => true, 'data' => $data]);
            break;

        // 2. สร้างรายการใหม่
        case 'create':
            $sql = "INSERT INTO PL_STRUCTURE (account_code, item_name, parent_id, item_type, data_source, row_order, is_active) 
                    VALUES (:code, :name, :parent, :type, :source, :order, 1)";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                ':code'   => $_POST['account_code'],
                ':name'   => $_POST['item_name'],
                ':parent' => !empty($_POST['parent_id']) ? $_POST['parent_id'] : null,
                ':type'   => $_POST['item_type'],
                ':source' => $_POST['data_source'],
                ':order'  => $_POST['row_order'] ?? 0
            ]);
            echo json_encode(['success' => true, 'message' => 'เพิ่มรายการใหม่สำเร็จ']);
            break;

        // 3. อัปเดตข้อมูลรายการเดิม
        case 'update':
            $id = $_POST['id'] ?? null;
            if (!$id) throw new Exception("Missing ID");

            $sql = "UPDATE PL_STRUCTURE SET 
                        account_code = :code, 
                        item_name = :name, 
                        parent_id = :parent, 
                        item_type = :type, 
                        data_source = :source, 
                        row_order = :order 
                    WHERE id = :id";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                ':code'   => $_POST['account_code'],
                ':name'   => $_POST['item_name'],
                ':parent' => !empty($_POST['parent_id']) ? $_POST['parent_id'] : null,
                ':type'   => $_POST['item_type'],
                ':source' => $_POST['data_source'],
                ':order'  => $_POST['row_order'] ?? 0,
                ':id'     => $id
            ]);
            echo json_encode(['success' => true, 'message' => 'อัปเดตข้อมูลสำเร็จ']);
            break;

        // 4. เปลี่ยนสถานะ เปิด/ปิด (Toggle Active)
        case 'update_status':
            $id = $_POST['id'] ?? null;
            $status = isset($_POST['is_active']) ? (int)$_POST['is_active'] : 1;
            if ($id) {
                $stmt = $pdo->prepare("UPDATE PL_STRUCTURE SET is_active = ?, updated_at = GETDATE() WHERE id = ?");
                $stmt->execute([$status, $id]);
                echo json_encode(['success' => true]);
            }
            break;

        default:
            echo json_encode(['success' => false, 'message' => 'Invalid Action']);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false, 
        'message' => 'Database Error: ' . $e->getMessage()
    ]);
}