<?php
// MES/page/PE/api/sparePartsAPI.php
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../components/init.php';

// Check permissions if needed (assuming user is logged in)
if (!isset($_SESSION['user'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

$input = json_decode(file_get_contents("php://input"), true) ?? $_POST;
$action = $_REQUEST['action'] ?? $input['action'] ?? '';
$userId = $_SESSION['user']['id'];

try {
    switch ($action) {
        case 'get_available_parts':
            // Fetch available spare parts and their onhand quantity
            $sql = "SELECT 
                        i.item_id, i.item_code, i.item_name, i.uom, i.unit_price,
                        l.location_id, l.location_name,
                        ISNULL(o.quantity, 0) AS onhand_qty
                    FROM dbo.MT_ITEMS i WITH (NOLOCK)
                    JOIN dbo.MT_INVENTORY_ONHAND o WITH (NOLOCK) ON i.item_id = o.item_id
                    JOIN dbo.LOCATIONS l WITH (NOLOCK) ON o.location_id = l.location_id
                    WHERE i.is_active = 1 AND ISNULL(o.quantity, 0) > 0
                    ORDER BY i.item_name ASC";
            $stmt = $pdo->query($sql);
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
            break;

        case 'get_wo_parts':
            $woId = $input['wo_id'] ?? $_GET['wo_id'] ?? null;
            if (!$woId) throw new Exception("Work Order ID is required");

            $sql = "SELECT 
                        t.transaction_id, 
                        t.created_at, 
                        ABS(t.quantity) as quantity, 
                        i.item_code, 
                        i.item_name, 
                        i.uom, 
                        i.unit_price,
                        (ABS(t.quantity) * i.unit_price) AS total_cost,
                        u.fullname AS issued_by
                    FROM dbo.MT_TRANSACTIONS t WITH (NOLOCK)
                    JOIN dbo.MT_ITEMS i WITH (NOLOCK) ON t.item_id = i.item_id
                    LEFT JOIN dbo.USERS u WITH (NOLOCK) ON t.created_by_user_id = u.id
                    WHERE t.pe_wo_id = ? AND t.transaction_type = 'ISSUE'
                    ORDER BY t.created_at ASC";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$woId]);
            $parts = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $grandTotal = array_sum(array_column($parts, 'total_cost'));

            echo json_encode([
                'success' => true, 
                'data' => [
                    'parts_used' => $parts,
                    'grand_total' => $grandTotal
                ]
            ]);
            break;

        case 'issue_parts':
            $woId = $input['wo_id'] ?? null;
            $parts = $input['parts'] ?? []; // Array of { item_id, location_id, quantity }
            $notes = $input['notes'] ?? 'Issued from PE Work Order';

            if (!$woId || empty($parts)) {
                throw new Exception("ข้อมูลไม่ครบถ้วน");
            }

            $pdo->beginTransaction();

            // 1. Process each part transaction
            $stmt = $pdo->prepare("EXEC sp_MT_ProcessTransaction @item_id=?, @location_id=?, @quantity=?, @transaction_type='ISSUE', @ref_job_id=NULL, @notes=?, @user_id=?, @pe_wo_id=?");
            
            foreach ($parts as $p) {
                $itemId = $p['item_id'] ?? null;
                $locationId = $p['location_id'] ?? null;
                $qty = (float)($p['quantity'] ?? 0);

                if (!$itemId || !$locationId || $qty <= 0) {
                    throw new Exception("ข้อมูลการเบิกไม่สมบูรณ์");
                }

                $stmt->execute([$itemId, $locationId, $qty, $notes, $userId, $woId]);
            }

            // 2. Recalculate total cost for this Work Order
            $costSql = "SELECT ISNULL(SUM(ABS(t.quantity) * i.unit_price), 0) AS total_cost
                        FROM dbo.MT_TRANSACTIONS t WITH (NOLOCK)
                        JOIN dbo.MT_ITEMS i WITH (NOLOCK) ON t.item_id = i.item_id
                        WHERE t.pe_wo_id = ? AND t.transaction_type = 'ISSUE'";
            $costStmt = $pdo->prepare($costSql);
            $costStmt->execute([$woId]);
            $totalCost = (float)$costStmt->fetchColumn();

            // 3. Update PE_WORK_ORDERS
            $updateWoStmt = $pdo->prepare("UPDATE dbo.PE_WORK_ORDERS SET total_cost = ? WHERE wo_id = ?");
            $updateWoStmt->execute([$totalCost, $woId]);

            $pdo->commit();

            echo json_encode(['success' => true, 'message' => 'เบิกอะไหล่และอัปเดตค่าใช้จ่ายเรียบร้อย', 'new_total_cost' => $totalCost]);
            break;

        case 'delete_wo_part':
            $txId = $input['transaction_id'] ?? null;
            $woId = $input['wo_id'] ?? null;

            if (!$txId || !$woId) {
                throw new Exception("ข้อมูลไม่ครบถ้วน");
            }

            $pdo->beginTransaction();

            // 1. Get transaction info
            $stmt = $pdo->prepare("SELECT item_id, location_id, quantity FROM dbo.MT_TRANSACTIONS WITH (UPDLOCK) WHERE transaction_id = ? AND pe_wo_id = ? AND transaction_type = 'ISSUE'");
            $stmt->execute([$txId, $woId]);
            $tx = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$tx) {
                throw new Exception("ไม่พบรายการเบิกอะไหล่นี้ หรือถูกลบไปแล้ว");
            }

            // The quantity for ISSUE is usually stored as negative. We want the absolute value to refund.
            $refundQty = abs((float)$tx['quantity']);

            // 2. Delete the transaction
            $delStmt = $pdo->prepare("DELETE FROM dbo.MT_TRANSACTIONS WHERE transaction_id = ?");
            $delStmt->execute([$txId]);

            // 3. Refund stock
            $refundStmt = $pdo->prepare("UPDATE dbo.MT_INVENTORY_ONHAND SET quantity = quantity + ?, last_updated = GETDATE() WHERE item_id = ? AND location_id = ?");
            $refundStmt->execute([$refundQty, $tx['item_id'], $tx['location_id']]);

            // 4. Recalculate Work Order Cost
            $costSql = "SELECT ISNULL(SUM(ABS(t.quantity) * i.unit_price), 0) AS total_cost
                        FROM dbo.MT_TRANSACTIONS t WITH (NOLOCK)
                        JOIN dbo.MT_ITEMS i WITH (NOLOCK) ON t.item_id = i.item_id
                        WHERE t.pe_wo_id = ? AND t.transaction_type = 'ISSUE'";
            $costStmt = $pdo->prepare($costSql);
            $costStmt->execute([$woId]);
            $totalCost = (float)$costStmt->fetchColumn();

            // 5. Update PE_WORK_ORDERS
            $updateWoStmt = $pdo->prepare("UPDATE dbo.PE_WORK_ORDERS SET total_cost = ? WHERE wo_id = ?");
            $updateWoStmt->execute([$totalCost, $woId]);

            $pdo->commit();

            echo json_encode(['success' => true, 'message' => 'ลบรายการและคืนสต๊อกเรียบร้อย', 'new_total_cost' => $totalCost]);
            break;

        default:
            throw new Exception("Invalid Action");
    }
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
