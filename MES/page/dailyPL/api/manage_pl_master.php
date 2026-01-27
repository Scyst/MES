<?php
// page/pl_daily/api/manage_pl_master.php
header('Content-Type: application/json');
require_once __DIR__ . '/../../../config/config.php';
require_once __DIR__ . '/../../../auth/check_auth.php';
require_once __DIR__ . '/../../db.php';

// Check Auth
if (!hasRole(['admin', 'creator'])) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Access Denied']);
    exit;
}

$action = $_REQUEST['action'] ?? 'read';

try {
    switch ($action) {
        case 'read':
            // 🔥 UPGRADE: เรียงลำดับให้ Parent มาก่อน แล้วตามด้วยลูกๆ ของมัน
            // ใช้ CTE หรือ Logic การเรียงแบบง่าย (Row Order เป็นหลัก)
            $sql = "
                SELECT 
                    s.*, 
                    COALESCE(p.item_name, '-') as parent_name,
                    -- คำนวณ Level เพื่อทำ Indent (ย่อหน้า)
                    CASE WHEN s.parent_id IS NULL THEN 0 ELSE 1 END as item_level
                FROM PL_STRUCTURE s WITH (NOLOCK)
                LEFT JOIN PL_STRUCTURE p ON s.parent_id = p.id
                ORDER BY 
                    -- เรียงตาม Row Order ของตัวเอง
                    s.row_order ASC,
                    s.account_code ASC
            ";
            $stmt = $pdo->query($sql);
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode(['success' => true, 'data' => $data]);
            break;

        case 'save':
            $id = filter_input(INPUT_POST, 'id', FILTER_VALIDATE_INT);
            $parent_id = !empty($_POST['parent_id']) ? $_POST['parent_id'] : null;
            
            // Validation
            if (empty($_POST['account_code']) || empty($_POST['item_name'])) {
                throw new Exception("กรุณากรอกข้อมูลให้ครบถ้วน");
            }

            if ($id) {
                // Update
                $sql = "UPDATE PL_STRUCTURE SET 
                        account_code = :code, 
                        item_name = :name, 
                        parent_id = :parent,
                        item_type = :type,
                        data_source = :source,
                        row_order = :order,
                        updated_at = GETDATE()
                        WHERE id = :id";
            } else {
                // Insert
                $sql = "INSERT INTO PL_STRUCTURE (account_code, item_name, parent_id, item_type, data_source, row_order, is_active)
                        VALUES (:code, :name, :parent, :type, :source, :order, 1)";
            }

            $stmt = $pdo->prepare($sql);
            $params = [
                ':code'   => strtoupper(trim($_POST['account_code'])),
                ':name'   => trim($_POST['item_name']),
                ':parent' => $parent_id,
                ':type'   => $_POST['item_type'],
                ':source' => $_POST['data_source'],
                ':order'  => (int)$_POST['row_order']
            ];
            
            if ($id) $params[':id'] = $id;

            $stmt->execute($params);
            
            // Sync to Test
            if (defined('IS_DEVELOPMENT') && IS_DEVELOPMENT) {
               // (Optional) Logic sync table test if needed
            }

            echo json_encode(['success' => true, 'message' => 'บันทึกเรียบร้อยแล้ว']);
            break;

        case 'delete':
            $id = filter_input(INPUT_POST, 'id', FILTER_VALIDATE_INT);
            if (!$id) throw new Exception("Invalid ID");

            // เช็คก่อนว่ามีรายการลูกไหม
            $check = $pdo->prepare("SELECT COUNT(*) FROM PL_STRUCTURE WHERE parent_id = ?");
            $check->execute([$id]);
            if ($check->fetchColumn() > 0) {
                throw new Exception("ไม่สามารถลบได้: มีรายการย่อยอยู่ภายใต้หมวดหมู่นี้");
            }

            $stmt = $pdo->prepare("DELETE FROM PL_STRUCTURE WHERE id = ?");
            $stmt->execute([$id]);
            echo json_encode(['success' => true]);
            break;
            
        default:
            throw new Exception("Unknown Action");
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>