<?php
// MES/page/maintenancePE/api/mtStockAPI.php
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../../auth/check_auth.php';

requirePermission(['view_maintenance', 'manage_maintenance']);

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    if (!isset($_SERVER['HTTP_X_CSRF_TOKEN']) || !isset($_SESSION['csrf_token']) || !hash_equals($_SESSION['csrf_token'], $_SERVER['HTTP_X_CSRF_TOKEN'])) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'CSRF token validation failed.']);
        exit;
    }
}

$input = json_decode(file_get_contents("php://input"), true) ?? $_POST;
$action = $_REQUEST['action'] ?? $input['action'] ?? '';
$userId = $_SESSION['user']['id'];

try {
    switch ($action) {
        case 'get_master_data':
            $items = $pdo->query("SELECT item_id, item_code, item_name, uom FROM dbo.MT_ITEMS WHERE is_active = 1 ORDER BY item_code ASC")->fetchAll();
            $locations = $pdo->query("SELECT location_id, location_name FROM dbo.LOCATIONS WHERE is_active = 1 AND location_type = 'MAINTENANCE' ORDER BY location_name ASC")->fetchAll();
            $jobs = $pdo->query("SELECT id, machine, issue_description, status FROM dbo.MAINTENANCE_REQUESTS ORDER BY id DESC")->fetchAll();

            echo json_encode([
                'success' => true, 
                'data' => [
                    'items' => $items,
                    'locations' => $locations,
                    'active_jobs' => $jobs
                ]
            ]);
            break;

        case 'get_onhand':
            $sql = "SELECT 
                        i.item_id, i.item_code, i.item_name, i.uom,
                        l.location_name, 
                        i.min_stock, i.max_stock, 
                        ISNULL(o.quantity, 0) AS onhand_qty
                    FROM dbo.MT_ITEMS i WITH (NOLOCK)
                    LEFT JOIN dbo.MT_INVENTORY_ONHAND o WITH (NOLOCK) ON i.item_id = o.item_id
                    LEFT JOIN dbo.LOCATIONS l WITH (NOLOCK) ON o.location_id = l.location_id
                    WHERE i.is_active = 1
                    ORDER BY i.item_code ASC";
            $stmt = $pdo->query($sql);
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
            break;

        case 'process_transaction':
            $itemId = $input['item_id'] ?? null;
            $locationId = $input['location_id'] ?? null;
            $quantity = (float)($input['quantity'] ?? 0);
            $type = $input['transaction_type'] ?? '';
            $refJobId = !empty($input['ref_job_id']) ? $input['ref_job_id'] : null;
            $notes = $input['notes'] ?? '';

            if (!$itemId || !$locationId || $quantity <= 0 || !in_array($type, ['RECEIVE', 'ISSUE', 'ADJUST'])) {
                throw new Exception("ข้อมูลไม่ครบถ้วน หรือประเภทธุรกรรมไม่ถูกต้อง");
            }

            $stmt = $pdo->prepare("EXEC sp_MT_ProcessTransaction @item_id=?, @location_id=?, @quantity=?, @transaction_type=?, @ref_job_id=?, @notes=?, @user_id=?");
            $stmt->execute([$itemId, $locationId, $quantity, $type, $refJobId, $notes, $userId]);

            echo json_encode(['success' => true, 'message' => 'ทำรายการ ' . $type . ' สำเร็จ']);
            break;

        case 'get_mt_items':
            $sql = "SELECT * FROM dbo.MT_ITEMS WITH (NOLOCK) ORDER BY is_active DESC, item_code ASC";
            $stmt = $pdo->query($sql);
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
            break;

        case 'save_mt_item':
            $itemId = $input['item_id'] ?? '';
            $itemCode = trim($input['item_code'] ?? '');
            $itemName = trim($input['item_name'] ?? '');
            
            if (empty($itemCode) || empty($itemName)) {
                throw new Exception("กรุณากรอกรหัสและชื่ออะไหล่ให้ครบถ้วน");
            }

            $desc = trim($input['description'] ?? '');
            $supplier = trim($input['supplier'] ?? '');
            $uom = trim($input['uom'] ?? 'PCS');
            $unitPrice = (float)($input['unit_price'] ?? 0);
            $minStock = (float)($input['min_stock'] ?? 0);
            $maxStock = (float)($input['max_stock'] ?? 0);

            $checkSql = "SELECT item_id FROM dbo.MT_ITEMS WITH (NOLOCK) WHERE item_code = ?";
            $stmtCheck = $pdo->prepare($checkSql);
            $stmtCheck->execute([$itemCode]);
            $existing = $stmtCheck->fetch();

            if (empty($itemId)) {
                if ($existing) throw new Exception("รหัสอะไหล่นี้ ($itemCode) มีในระบบแล้ว");
                
                $sql = "INSERT INTO dbo.MT_ITEMS (item_code, item_name, description, supplier, unit_price, uom, min_stock, max_stock) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$itemCode, $itemName, $desc, $supplier, $unitPrice, $uom, $minStock, $maxStock]);
                $msg = "เพิ่มรายการอะไหล่ใหม่สำเร็จ";
            } else {
                if ($existing && $existing['item_id'] != $itemId) {
                    throw new Exception("รหัสอะไหล่นี้ ($itemCode) ถูกใช้ไปแล้วโดยรายการอื่น");
                }

                $sql = "UPDATE dbo.MT_ITEMS 
                        SET item_code = ?, item_name = ?, description = ?, supplier = ?, 
                            unit_price = ?, uom = ?, min_stock = ?, max_stock = ? 
                        WHERE item_id = ?";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$itemCode, $itemName, $desc, $supplier, $unitPrice, $uom, $minStock, $maxStock, $itemId]);
                $msg = "อัปเดตข้อมูลอะไหล่สำเร็จ";
            }
            echo json_encode(['success' => true, 'message' => $msg]);
            break;

        case 'toggle_mt_item':
            $itemId = $input['item_id'] ?? null;
            if (!$itemId) throw new Exception("Invalid Item ID");

            $sql = "UPDATE dbo.MT_ITEMS SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END WHERE item_id = ?";
            $pdo->prepare($sql)->execute([$itemId]);
            echo json_encode(['success' => true, 'message' => 'เปลี่ยนสถานะการใช้งานสำเร็จ']);
            break;

        case 'get_transactions':
            $limit = (int)($input['limit'] ?? 200);
            
            $sql = "SELECT 
                        t.transaction_id, 
                        t.transaction_type, 
                        t.quantity, 
                        t.notes, 
                        t.created_at,
                        i.item_code, 
                        i.item_name, 
                        i.uom,
                        l.location_name,
                        u.fullname AS created_by_name,
                        j.machine, 
                        j.issue_description
                    FROM dbo.MT_TRANSACTIONS t WITH (NOLOCK)
                    JOIN dbo.MT_ITEMS i WITH (NOLOCK) ON t.item_id = i.item_id
                    JOIN dbo.LOCATIONS l WITH (NOLOCK) ON t.location_id = l.location_id
                    LEFT JOIN dbo.USERS u WITH (NOLOCK) ON t.created_by_user_id = u.id
                    LEFT JOIN dbo.MAINTENANCE_REQUESTS j WITH (NOLOCK) ON t.ref_job_id = j.id
                    ORDER BY t.created_at DESC
                    OFFSET 0 ROWS FETCH NEXT $limit ROWS ONLY";
            
            $stmt = $pdo->query($sql);
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
            break;

        case 'get_job_parts_cost':
            $jobId = $input['job_id'] ?? $_GET['job_id'] ?? null;
            if (!$jobId) throw new Exception("Job ID is required");

            $sql = "SELECT 
                        t.transaction_id, 
                        t.created_at, 
                        t.quantity, 
                        i.item_code, 
                        i.item_name, 
                        i.uom, 
                        i.unit_price,
                        (t.quantity * i.unit_price) AS total_cost,
                        u.fullname AS issued_by
                    FROM dbo.MT_TRANSACTIONS t WITH (NOLOCK)
                    JOIN dbo.MT_ITEMS i WITH (NOLOCK) ON t.item_id = i.item_id
                    LEFT JOIN dbo.USERS u WITH (NOLOCK) ON t.created_by_user_id = u.id
                    WHERE t.ref_job_id = ? AND t.transaction_type = 'ISSUE'
                    ORDER BY t.created_at ASC";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$jobId]);
            $parts = $stmt->fetchAll();
            $grandTotal = array_sum(array_column($parts, 'total_cost'));

            echo json_encode([
                'success' => true, 
                'data' => [
                    'parts_used' => $parts,
                    'grand_total' => $grandTotal
                ]
            ]);
            break;

        default:
            throw new Exception("Invalid Action");
    }
} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>