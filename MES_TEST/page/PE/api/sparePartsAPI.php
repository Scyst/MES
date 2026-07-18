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
        case 'get_onhand':
            $sql = "SELECT 
                        i.item_id, i.item_code, i.item_name, i.description, i.uom, 
                        i.unit_price, l.location_id, l.location_name, 
                        i.min_stock, i.max_stock, 
                        ISNULL(o.quantity, 0) AS onhand_qty
                    FROM dbo.MT_ITEMS i WITH (NOLOCK)
                    LEFT JOIN dbo.MT_INVENTORY_ONHAND o WITH (NOLOCK) ON i.item_id = o.item_id
                    LEFT JOIN dbo.LOCATIONS l WITH (NOLOCK) ON o.location_id = l.location_id
                    WHERE i.is_active = 1
                    ORDER BY i.item_code ASC";
            $data = $pdo->query($sql)->fetchAll(PDO::FETCH_ASSOC);

            // KPIs
            $totalSKU = count($data);
            $lowStock = 0;
            $totalValue = 0;
            foreach ($data as $row) {
                $totalValue += $row['onhand_qty'] * ($row['unit_price'] ?? 0);
                if ($row['min_stock'] > 0 && $row['onhand_qty'] <= $row['min_stock']) {
                    $lowStock++;
                }
            }

            // Locations for filter
            $locations = $pdo->query("SELECT location_id, location_name FROM dbo.LOCATIONS WHERE is_active = 1 AND location_type = 'MAINTENANCE' ORDER BY location_name")->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode([
                'success' => true,
                'data' => $data,
                'kpi' => [
                    'total_sku' => $totalSKU,
                    'low_stock' => $lowStock,
                    'total_value' => $totalValue
                ],
                'locations' => $locations
            ]);
            break;

        case 'get_master_data':
            $items = $pdo->query("SELECT item_id, item_code, item_name, uom FROM dbo.MT_ITEMS WHERE is_active = 1 ORDER BY item_code ASC")->fetchAll();
            $locations = $pdo->query("SELECT location_id, location_name FROM dbo.LOCATIONS WHERE is_active = 1 AND location_type = 'MAINTENANCE' ORDER BY location_name ASC")->fetchAll();
            echo json_encode(['success' => true, 'data' => ['items' => $items, 'locations' => $locations]]);
            break;

        case 'process_transaction':
            $itemId = $input['item_id'] ?? null;
            $locationId = $input['location_id'] ?? null;
            $quantity = (float)($input['quantity'] ?? 0);
            $type = $input['transaction_type'] ?? '';
            $refJobId = !empty($input['ref_job_id']) ? $input['ref_job_id'] : null;
            $notes = $input['notes'] ?? '';

            if (!$itemId || !$locationId || $quantity == 0 || !in_array($type, ['RECEIVE', 'ISSUE', 'ADJUST'])) {
                throw new Exception("ข้อมูลไม่ครบถ้วน");
            }

            $stmt = $pdo->prepare("EXEC sp_MT_ProcessTransaction @item_id=?, @location_id=?, @quantity=?, @transaction_type=?, @ref_job_id=?, @notes=?, @user_id=?");
            $stmt->execute([$itemId, $locationId, $quantity, $type, $refJobId, $notes, $userId]);

            echo json_encode(['success' => true, 'message' => "ทำรายการ $type สำเร็จ"]);
            break;

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

        case 'get_mt_items':
            $sql = "SELECT * FROM dbo.MT_ITEMS WITH (NOLOCK) ORDER BY is_active DESC, item_code ASC";
            $stmt = $pdo->query($sql);
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
            break;

        case 'import_mt_items':
            $items = $input['data'] ?? [];
            if (empty($items) || !is_array($items)) {
                throw new Exception("ไม่พบข้อมูลที่จะนำเข้า");
            }
            $pdo->beginTransaction();
            $upsertCount = 0;
            $insertStmt = $pdo->prepare("
                INSERT INTO dbo.MT_ITEMS (item_code, item_name, description, supplier, unit_price, uom, min_stock, max_stock, is_active, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, GETDATE())
            ");
            $updateStmt = $pdo->prepare("
                UPDATE dbo.MT_ITEMS SET 
                    item_name = ?, description = ?, supplier = ?, unit_price = ?, 
                    uom = ?, min_stock = ?, max_stock = ?, is_active = ?, last_updated = GETDATE()
                WHERE item_code = ?
            ");
            $checkStmt = $pdo->prepare("SELECT item_id FROM dbo.MT_ITEMS WITH (NOLOCK) WHERE item_code = ?");
            
            foreach ($items as $row) {
                $itemCode = trim($row['Item Code'] ?? '');
                $itemName = trim($row['Item Name'] ?? '');
                if (empty($itemCode) || empty($itemName)) continue;
                
                $desc = trim($row['Description'] ?? '');
                $supplier = trim($row['Supplier'] ?? '');
                $unitPrice = (float)($row['Unit Price'] ?? 0);
                $uom = trim($row['UoM'] ?? 'PCS');
                $minStock = (float)($row['Min'] ?? 0);
                $maxStock = (float)($row['Max'] ?? 0);
                $isActiveStr = strtoupper(trim($row['Active'] ?? 'Y'));
                $isActive = ($isActiveStr === 'Y' || $isActiveStr === 'YES' || $isActiveStr === '1' || $isActiveStr === 'TRUE') ? 1 : 0;
                
                $checkStmt->execute([$itemCode]);
                if ($checkStmt->fetch()) {
                    $updateStmt->execute([$itemName, $desc, $supplier, $unitPrice, $uom, $minStock, $maxStock, $isActive, $itemCode]);
                } else {
                    $insertStmt->execute([$itemCode, $itemName, $desc, $supplier, $unitPrice, $uom, $minStock, $maxStock, $isActive]);
                }
                $upsertCount++;
            }
            $pdo->commit();
            echo json_encode(['success' => true, 'message' => "นำเข้าข้อมูลสำเร็จ $upsertCount รายการ"]);
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
                
                $sql = "INSERT INTO dbo.MT_ITEMS (item_code, item_name, description, supplier, unit_price, uom, min_stock, max_stock, created_at) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, GETDATE())";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$itemCode, $itemName, $desc, $supplier, $unitPrice, $uom, $minStock, $maxStock]);
                $msg = "เพิ่มรายการอะไหล่ใหม่สำเร็จ";
            } else {
                if ($existing && $existing['item_id'] != $itemId) {
                    throw new Exception("รหัสอะไหล่นี้ ($itemCode) ถูกใช้ไปแล้วโดยรายการอื่น");
                }

                $sql = "UPDATE dbo.MT_ITEMS 
                        SET item_code = ?, item_name = ?, description = ?, supplier = ?, 
                            unit_price = ?, uom = ?, min_stock = ?, max_stock = ?, last_updated = GETDATE()
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
            
            $sql = "SELECT TOP " . $limit . " 
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
                        j.wo_number, 
                        m.machine_code,
                        j.issue_title
                    FROM dbo.MT_TRANSACTIONS t WITH (NOLOCK)
                    JOIN dbo.MT_ITEMS i WITH (NOLOCK) ON t.item_id = i.item_id
                    LEFT JOIN dbo.LOCATIONS l WITH (NOLOCK) ON t.location_id = l.location_id
                    LEFT JOIN dbo.USERS u WITH (NOLOCK) ON t.created_by_user_id = u.id
                    LEFT JOIN dbo.PE_WORK_ORDERS j WITH (NOLOCK) ON t.pe_wo_id = j.wo_id
                    LEFT JOIN dbo.PE_MACHINES m WITH (NOLOCK) ON j.machine_id = m.machine_id
                    ORDER BY t.transaction_id DESC";
                    
            $stmt = $pdo->query($sql);
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
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
