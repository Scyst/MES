<?php
/**
 * PE Enterprise Spare Parts & MRO Inventory API (Self-Contained Toolbox Version)
 * Manages MT_ITEMS, MT_INVENTORY_ONHAND, MT_TRANSACTIONS, WO parts issuance/refund,
 * stock transfer, mistaken receive cancellation, and stock adjustment.
 */

require_once __DIR__ . '/_common.php';

/**
 * Recalculates and updates total_cost on PE_WORK_ORDERS from ISSUE transactions.
 */
function recalculatePeWoPartsCost(PDO $pdo, int $woId): float {
    $costStmt = $pdo->prepare(
        "SELECT ISNULL(SUM(ABS(t.quantity) * ISNULL(i.unit_price, 0)), 0) AS total_cost
         FROM dbo.MT_TRANSACTIONS t WITH (NOLOCK)
         JOIN dbo.MT_ITEMS i WITH (NOLOCK) ON t.item_id = i.item_id
         WHERE (t.pe_wo_id = ? OR t.ref_job_id = ?) AND t.transaction_type = 'ISSUE'"
    );
    $costStmt->execute([$woId, $woId]);
    $totalCost = round((float)$costStmt->fetchColumn(), 2);

    $pdo->prepare("UPDATE " . PE_WORK_ORDERS_TABLE . " SET total_cost = ?, updated_at = GETDATE() WHERE wo_id = ?")
        ->execute([$totalCost, $woId]);

    return $totalCost;
}

try {
    [$action, $input, $currentUser] = parsePeRequest();
    requirePeAccess();
    $userId = (int)$currentUser['id'];

    switch ($action) {
        case 'get_onhand': {
            $sql = "SELECT TOP 500
                        i.item_id, i.item_code, i.item_name, i.description, i.uom,
                        i.unit_price, i.image_path, i.supplier,
                        l.location_id, l.location_name,
                        i.min_stock, i.max_stock,
                        ISNULL(o.quantity, 0) AS onhand_qty
                    FROM dbo.MT_ITEMS i WITH (NOLOCK)
                    LEFT JOIN dbo.MT_INVENTORY_ONHAND o WITH (NOLOCK) ON i.item_id = o.item_id AND o.quantity > 0
                    LEFT JOIN dbo.LOCATIONS l WITH (NOLOCK) ON o.location_id = l.location_id
                    WHERE i.is_active = 1
                    ORDER BY i.item_code ASC";
            $data = $pdo->query($sql)->fetchAll(PDO::FETCH_ASSOC);

            $totalSKU = count($data);
            $lowStock = 0;
            $totalValue = 0.0;
            foreach ($data as $row) {
                $qty = (float)($row['onhand_qty'] ?? 0);
                $price = (float)($row['unit_price'] ?? 0);
                $minStock = (float)($row['min_stock'] ?? 0);
                $totalValue += $qty * $price;
                if ($minStock > 0 && $qty <= $minStock) {
                    $lowStock++;
                }
            }

            $locations = $pdo->query(
                "SELECT location_id, location_name
                 FROM dbo.LOCATIONS WITH (NOLOCK)
                 WHERE is_active = 1 AND location_type = 'MAINTENANCE'
                 ORDER BY location_name ASC"
            )->fetchAll(PDO::FETCH_ASSOC);

            $monthIssues = (float)$pdo->query(
                "SELECT ISNULL(SUM(ABS(quantity)), 0)
                 FROM dbo.MT_TRANSACTIONS WITH (NOLOCK)
                 WHERE transaction_type = 'ISSUE'
                   AND created_at >= DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1)"
            )->fetchColumn();

            peJsonSuccess($data, 'โหลดยอดคงคลังอะไหล่สำเร็จ', [
                'kpi' => [
                    'total_sku' => $totalSKU,
                    'low_stock' => $lowStock,
                    'total_value' => round($totalValue, 2),
                    'month_issues' => round($monthIssues, 3),
                ],
                'locations' => $locations,
            ]);
            break;
        }

        case 'get_master_data': {
            $items = $pdo->query(
                "SELECT TOP 500 item_id, item_code, item_name, uom, unit_price, supplier
                 FROM dbo.MT_ITEMS WITH (NOLOCK)
                 WHERE is_active = 1
                 ORDER BY item_code ASC"
            )->fetchAll(PDO::FETCH_ASSOC);
            $locations = $pdo->query(
                "SELECT location_id, location_name
                 FROM dbo.LOCATIONS WITH (NOLOCK)
                 WHERE is_active = 1 AND location_type = 'MAINTENANCE'
                 ORDER BY location_name ASC"
            )->fetchAll(PDO::FETCH_ASSOC);

            peJsonSuccess(['items' => $items, 'locations' => $locations], 'โหลดข้อมูลตั้งต้นคลังอะไหล่สำเร็จ');
            break;
        }

        case 'process_transaction': {
            $items = $input['items'] ?? [];
            $type = trim((string)($input['transaction_type'] ?? ''));
            $peWoId = !empty($input['ref_job_id']) ? parsePePositiveInt($input['ref_job_id'], 'รหัสใบแจ้งซ่อม') : null;
            $notes = mb_substr(trim((string)($input['notes'] ?? '')), 0, 450);

            if (empty($items) || !is_array($items) || count($items) > 100) {
                throw new InvalidArgumentException('กรุณาระบุรายการอะไหล่อย่างน้อย 1 รายการ (สูงสุด 100 รายการ)');
            }
            if (!in_array($type, ['RECEIVE', 'ISSUE', 'ADJUST'], true)) {
                throw new InvalidArgumentException('ประเภทธุรกรรมสต๊อกไม่ถูกต้อง');
            }

            // Pre-validate full batch before calling sp_MT_ProcessTransaction (SP manages its own SQL transaction)
            $validated = [];
            $checkStockStmt = $pdo->prepare("SELECT ISNULL(quantity, 0) FROM dbo.MT_INVENTORY_ONHAND WITH (NOLOCK) WHERE item_id = ? AND location_id = ?");
            $checkItemStmt = $pdo->prepare("SELECT item_code FROM dbo.MT_ITEMS WITH (NOLOCK) WHERE item_id = ? AND is_active = 1");

            foreach ($items as $entry) {
                $itemId = parsePePositiveInt($entry['item_id'] ?? null, 'รหัสอะไหล่');
                $locationId = parsePePositiveInt($entry['location_id'] ?? null, 'คลังจัดเก็บ');
                $qty = parsePeBoundedFloat($entry['quantity'] ?? null, 'จำนวน', -999999, 999999);
                if (abs($qty) < 0.001) {
                    throw new InvalidArgumentException('จำนวนต้องไม่เป็น 0');
                }
                if ($type !== 'ADJUST' && $qty <= 0) {
                    throw new InvalidArgumentException('จำนวนรับเข้า/เบิกออก ต้องมากกว่า 0');
                }

                $checkItemStmt->execute([$itemId]);
                $itemCode = $checkItemStmt->fetchColumn();
                if (!$itemCode) {
                    throw new InvalidArgumentException("ไม่พบรหัสอะไหล่ #{$itemId} หรือถูกปิดใช้งาน");
                }

                if ($type === 'ISSUE') {
                    $checkStockStmt->execute([$itemId, $locationId]);
                    $avail = (float)($checkStockStmt->fetchColumn() ?: 0);
                    if ($avail < $qty) {
                        throw new InvalidArgumentException("สต๊อกอะไหล่ {$itemCode} ไม่เพียงพอ (คงเหลือ {$avail}, ต้องการเบิก {$qty})");
                    }
                }

                $validated[] = [
                    'item_id' => $itemId,
                    'item_code' => $itemCode,
                    'location_id' => $locationId,
                    'quantity' => $qty,
                ];
            }

            $spStmt = $pdo->prepare("EXEC sp_MT_ProcessTransaction @item_id=?, @location_id=?, @quantity=?, @transaction_type=?, @ref_job_id=NULL, @notes=?, @user_id=?, @pe_wo_id=?");
            foreach ($validated as $row) {
                $spStmt->execute([
                    $row['item_id'],
                    $row['location_id'],
                    $row['quantity'],
                    $type,
                    $notes,
                    $userId,
                    $peWoId,
                ]);
                while ($spStmt->nextRowset()) {
                    // Drain extra result sets emitted inside stored procedure
                }
            }

            if ($type === 'ISSUE' && $peWoId !== null) {
                recalculatePeWoPartsCost($pdo, $peWoId);
            }

            writeLog($pdo, 'CREATE', 'PE_SPARE_PARTS', $peWoId ?? 'BATCH', null, [
                'transaction_type' => $type,
                'items' => $validated,
                'notes' => $notes,
            ], "Processed {$type} for " . count($validated) . " SKU(s)");

            peJsonSuccess(['count' => count($validated), 'transaction_type' => $type], "ทำรายการ {$type} จำนวน " . count($validated) . " รายการสำเร็จ");
            break;
        }

        case 'get_available_parts': {
            $sql = "SELECT TOP 500
                        i.item_id, i.item_code, i.item_name, i.uom, i.unit_price, i.image_path,
                        l.location_id, l.location_name,
                        ISNULL(o.quantity, 0) AS onhand_qty
                    FROM dbo.MT_ITEMS i WITH (NOLOCK)
                    JOIN dbo.MT_INVENTORY_ONHAND o WITH (NOLOCK) ON i.item_id = o.item_id
                    JOIN dbo.LOCATIONS l WITH (NOLOCK) ON o.location_id = l.location_id
                    WHERE i.is_active = 1 AND ISNULL(o.quantity, 0) > 0
                    ORDER BY i.item_name ASC";
            $rows = $pdo->query($sql)->fetchAll(PDO::FETCH_ASSOC);
            peJsonSuccess($rows, 'โหลดรายการอะไหล่พร้อมเบิกสำเร็จ');
            break;
        }

        case 'get_wo_parts': {
            $woId = parsePePositiveInt($input['wo_id'] ?? null, 'รหัสใบแจ้งซ่อม');
            $stmt = $pdo->prepare(
                "SELECT
                    t.transaction_id, t.created_at, ABS(t.quantity) AS quantity,
                    i.item_code, i.item_name, i.uom, i.unit_price, i.image_path,
                    (ABS(t.quantity) * ISNULL(i.unit_price, 0)) AS total_cost,
                    ISNULL(NULLIF(u.fullname, ''), u.username) AS issued_by
                 FROM dbo.MT_TRANSACTIONS t WITH (NOLOCK)
                 JOIN dbo.MT_ITEMS i WITH (NOLOCK) ON t.item_id = i.item_id
                 LEFT JOIN dbo.USERS u WITH (NOLOCK) ON t.created_by_user_id = u.id
                 WHERE (t.pe_wo_id = ? OR t.ref_job_id = ?) AND t.transaction_type = 'ISSUE'
                 ORDER BY t.created_at ASC, t.transaction_id ASC"
            );
            $stmt->execute([$woId, $woId]);
            $parts = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $grandTotal = round(array_sum(array_map(fn($r) => (float)($r['total_cost'] ?? 0), $parts)), 2);

            peJsonSuccess([
                'parts_used' => $parts,
                'grand_total' => $grandTotal,
            ], 'โหลดประวัติการเบิกอะไหล่ใบงานสำเร็จ');
            break;
        }

        case 'issue_parts': {
            $woId = parsePePositiveInt($input['wo_id'] ?? null, 'รหัสใบแจ้งซ่อม');
            $parts = $input['parts'] ?? [];
            $notes = mb_substr(trim((string)($input['notes'] ?? 'Issued from PE Work Order')), 0, 450);

            if (empty($parts) || !is_array($parts) || count($parts) > 50) {
                throw new InvalidArgumentException('กรุณาเลือกรายการอะไหล่ที่ต้องการเบิกอย่างน้อย 1 รายการ');
            }

            $woStmt = $pdo->prepare("SELECT wo_number FROM " . PE_WORK_ORDERS_TABLE . " WITH (NOLOCK) WHERE wo_id = ? AND is_active = 1");
            $woStmt->execute([$woId]);
            $woNumber = $woStmt->fetchColumn();
            if (!$woNumber) {
                throw new InvalidArgumentException('ไม่พบใบแจ้งซ่อมที่ระบุ');
            }

            $checkStockStmt = $pdo->prepare("SELECT ISNULL(quantity, 0) FROM dbo.MT_INVENTORY_ONHAND WITH (NOLOCK) WHERE item_id = ? AND location_id = ?");
            $validated = [];
            foreach ($parts as $p) {
                $itemId = parsePePositiveInt($p['item_id'] ?? null, 'รหัสอะไหล่');
                $locationId = parsePePositiveInt($p['location_id'] ?? null, 'คลังจัดเก็บ');
                $qty = parsePeBoundedFloat($p['quantity'] ?? null, 'จำนวนเบิก', 0.001, 999999);

                $checkStockStmt->execute([$itemId, $locationId]);
                $avail = (float)($checkStockStmt->fetchColumn() ?: 0);
                if ($avail < $qty) {
                    throw new InvalidArgumentException("ยอดคงเหลือไม่เพียงพอสำหรับการเบิก (คงเหลือ {$avail}, ต้องการเบิก {$qty})");
                }
                $validated[] = ['item_id' => $itemId, 'location_id' => $locationId, 'quantity' => $qty];
            }

            $spStmt = $pdo->prepare("EXEC sp_MT_ProcessTransaction @item_id=?, @location_id=?, @quantity=?, @transaction_type='ISSUE', @ref_job_id=NULL, @notes=?, @user_id=?, @pe_wo_id=?");
            foreach ($validated as $row) {
                $spStmt->execute([$row['item_id'], $row['location_id'], $row['quantity'], $notes, $userId, $woId]);
                while ($spStmt->nextRowset()) {
                    // Drain SP rowsets
                }
            }

            $newTotalCost = recalculatePeWoPartsCost($pdo, $woId);

            writeLog($pdo, 'CREATE', 'PE_WORK_ORDERS_PARTS', $woId, null, [
                'wo_number' => $woNumber,
                'parts' => $validated,
                'total_cost' => $newTotalCost,
            ], "Issued spare parts to {$woNumber}");

            peJsonSuccess(['wo_id' => $woId, 'new_total_cost' => $newTotalCost], 'เบิกจ่ายอะไหล่เข้าใบแจ้งซ่อมเรียบร้อยแล้ว', ['new_total_cost' => $newTotalCost]);
            break;
        }

        case 'delete_wo_part': {
            $txId = parsePePositiveInt($input['transaction_id'] ?? null, 'รหัสธุรกรรม');
            $woId = parsePePositiveInt($input['wo_id'] ?? null, 'รหัสใบแจ้งซ่อม');

            $pdo->beginTransaction();

            $txStmt = $pdo->prepare(
                "SELECT transaction_id, item_id, location_id, quantity, transaction_type, pe_wo_id, ref_job_id
                 FROM dbo.MT_TRANSACTIONS WITH (UPDLOCK, ROWLOCK)
                 WHERE transaction_id = ? AND transaction_type = 'ISSUE'"
            );
            $txStmt->execute([$txId]);
            $tx = $txStmt->fetch(PDO::FETCH_ASSOC);
            if (!$tx) {
                throw new InvalidArgumentException('ไม่พบรายการเบิกอะไหล่ในระบบ');
            }

            $refundQty = abs((float)$tx['quantity']);
            $pdo->prepare("DELETE FROM dbo.MT_TRANSACTIONS WHERE transaction_id = ?")->execute([$txId]);

            $pdo->prepare(
                "MERGE INTO dbo.MT_INVENTORY_ONHAND AS target
                 USING (SELECT ? AS item_id, ? AS location_id) AS source
                 ON (target.item_id = source.item_id AND target.location_id = source.location_id)
                 WHEN MATCHED THEN UPDATE SET target.quantity = target.quantity + ?, target.last_updated = GETDATE()
                 WHEN NOT MATCHED THEN INSERT (item_id, location_id, quantity, last_updated) VALUES (source.item_id, source.location_id, ?, GETDATE());"
            )->execute([$tx['item_id'], $tx['location_id'], $refundQty, $refundQty]);

            $newTotalCost = recalculatePeWoPartsCost($pdo, $woId);

            writeLog($pdo, 'DELETE', 'PE_WORK_ORDERS_PARTS', $txId, $tx, [
                'refund_qty' => $refundQty,
                'wo_id' => $woId,
                'new_total_cost' => $newTotalCost,
            ], "Refunded spare part TX #{$txId} for WO #{$woId}");

            $pdo->commit();
            peJsonSuccess(['new_total_cost' => $newTotalCost], 'ยกเลิกรายการเบิกและคืนอะไหล่เข้าสต๊อกเรียบร้อยแล้ว', ['new_total_cost' => $newTotalCost]);
            break;
        }

        case 'get_mt_items': {
            $sql = "SELECT TOP 500
                        item_id, item_code, item_name, description, supplier,
                        unit_price, uom, min_stock, max_stock, is_active, image_path,
                        created_at, last_updated
                    FROM dbo.MT_ITEMS WITH (NOLOCK)
                    ORDER BY is_active DESC, item_code ASC";
            $rows = $pdo->query($sql)->fetchAll(PDO::FETCH_ASSOC);
            peJsonSuccess($rows, 'โหลดทะเบียนรายการอะไหล่ (Master) สำเร็จ');
            break;
        }

        case 'import_mt_items': {
            requirePeAccess(['manage_maintenance'], ['admin', 'creator', 'manager', 'maintenance']);
            $items = $input['data'] ?? [];
            if (empty($items) || !is_array($items) || count($items) > 1000) {
                throw new InvalidArgumentException('ไม่พบข้อมูลสำหรับนำเข้า หรือจำนวนรายการเกินขีดจำกัด (1,000 แถว)');
            }

            $pdo->beginTransaction();
            $upsertCount = 0;

            $insertStmt = $pdo->prepare(
                "INSERT INTO dbo.MT_ITEMS (item_code, item_name, description, supplier, unit_price, uom, min_stock, max_stock, is_active, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, GETDATE())"
            );
            $updateStmt = $pdo->prepare(
                "UPDATE dbo.MT_ITEMS SET
                    item_name = ?, description = ?, supplier = ?, unit_price = ?,
                    uom = ?, min_stock = ?, max_stock = ?, is_active = ?, last_updated = GETDATE()
                 WHERE item_code = ?"
            );
            $checkStmt = $pdo->prepare("SELECT item_id FROM dbo.MT_ITEMS WITH (NOLOCK) WHERE item_code = ?");

            foreach ($items as $row) {
                $itemCode = trim((string)($row['Item Code'] ?? $row['item_code'] ?? ''));
                $itemName = trim((string)($row['Item Name'] ?? $row['item_name'] ?? ''));
                if ($itemCode === '' || $itemName === '') {
                    continue;
                }

                $desc = trim((string)($row['Description'] ?? $row['description'] ?? ''));
                $supplier = trim((string)($row['Supplier'] ?? $row['supplier'] ?? ''));
                $unitPrice = max(0, round((float)($row['Unit Price'] ?? $row['unit_price'] ?? 0), 3));
                $uom = trim((string)($row['UoM'] ?? $row['uom'] ?? 'PCS')) ?: 'PCS';
                $minStock = max(0, round((float)($row['Min'] ?? $row['min_stock'] ?? 0), 3));
                $maxStock = max(0, round((float)($row['Max'] ?? $row['max_stock'] ?? 0), 3));
                $isActiveStr = strtoupper(trim((string)($row['Active'] ?? 'Y')));
                $isActive = in_array($isActiveStr, ['Y', 'YES', '1', 'TRUE'], true) ? 1 : 0;

                $checkStmt->execute([$itemCode]);
                if ($checkStmt->fetch()) {
                    $updateStmt->execute([$itemName, $desc, $supplier, $unitPrice, $uom, $minStock, $maxStock, $isActive, $itemCode]);
                } else {
                    $insertStmt->execute([$itemCode, $itemName, $desc, $supplier, $unitPrice, $uom, $minStock, $maxStock, $isActive]);
                }
                $upsertCount++;
            }

            writeLog($pdo, 'UPDATE', 'MT_ITEMS', 'EXCEL_IMPORT', null, ['upserted' => $upsertCount], "Imported {$upsertCount} MT items");
            $pdo->commit();
            peJsonSuccess(['upserted' => $upsertCount], "นำเข้าข้อมูลอะไหล่สำเร็จ {$upsertCount} รายการ");
            break;
        }

        case 'save_mt_item': {
            requirePeAccess(['manage_maintenance'], ['admin', 'creator', 'manager', 'maintenance']);

            $itemId = !empty($input['item_id']) ? parsePePositiveInt($input['item_id'], 'รหัสอะไหล่') : null;
            $itemCode = trim((string)($input['item_code'] ?? ''));
            $itemName = trim((string)($input['item_name'] ?? ''));
            if ($itemCode === '' || $itemName === '') {
                throw new InvalidArgumentException('กรุณาระบุรหัสอะไหล่ (Item Code) และชื่ออะไหล่');
            }

            $desc = trim((string)($input['description'] ?? ''));
            $supplier = trim((string)($input['supplier'] ?? ''));
            $uom = trim((string)($input['uom'] ?? 'PCS')) ?: 'PCS';
            $unitPrice = parsePeBoundedFloat($input['unit_price'] ?? 0, 'ราคาต่อหน่วย', 0, 9999999);
            $minStock = parsePeBoundedFloat($input['min_stock'] ?? 0, 'สต๊อกขั้นต่ำ', 0, 9999999);
            $maxStock = parsePeBoundedFloat($input['max_stock'] ?? 0, 'สต๊อกสูงสุด', 0, 9999999);

            $imagePath = !empty($input['image_path']) ? trim((string)$input['image_path']) : null;
            if (!empty($_FILES['image']) && ($_FILES['image']['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_OK) {
                $file = $_FILES['image'];
                if ((int)$file['size'] > 5 * 1024 * 1024) {
                    throw new InvalidArgumentException('ขนาดรูปภาพต้องไม่เกิน 5 MB');
                }
                $finfo = new finfo(FILEINFO_MIME_TYPE);
                $mime = $finfo->file($file['tmp_name']);
                $extMap = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
                if (!isset($extMap[$mime])) {
                    throw new InvalidArgumentException('รองรับเฉพาะไฟล์ภาพ JPG, PNG หรือ WebP เท่านั้น');
                }
                $targetDir = resolvePeUploadsBaseDir() . DIRECTORY_SEPARATOR . 'spare_parts';
                if (!is_dir($targetDir)) {
                    mkdir($targetDir, 0755, true);
                }
                $safeCode = preg_replace('/[^a-zA-Z0-9_-]/', '_', $itemCode);
                $filename = 'item_' . $safeCode . '_' . time() . '.' . $extMap[$mime];
                if (move_uploaded_file($file['tmp_name'], $targetDir . DIRECTORY_SEPARATOR . $filename)) {
                    $imagePath = 'uploads/spare_parts/' . $filename;
                }
            } elseif (!empty($input['image_base64'])) {
                $safeCode = preg_replace('/[^a-zA-Z0-9_-]/', '_', $itemCode);
                $imagePath = savePeBase64Image((string)$input['image_base64'], 'spare_parts', "item_{$safeCode}_");
            }

            $checkStmt = $pdo->prepare("SELECT item_id FROM dbo.MT_ITEMS WITH (NOLOCK) WHERE item_code = ?");
            $checkStmt->execute([$itemCode]);
            $existingId = $checkStmt->fetchColumn();

            $pdo->beginTransaction();

            if ($itemId === null) {
                if ($existingId) {
                    throw new InvalidArgumentException("รหัสอะไหล่นี้ ({$itemCode}) มีในระบบแล้ว");
                }
                $pdo->prepare(
                    "INSERT INTO dbo.MT_ITEMS
                     (item_code, item_name, description, supplier, unit_price, uom, min_stock, max_stock, image_path, is_active, created_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, GETDATE())"
                )->execute([$itemCode, $itemName, $desc, $supplier, $unitPrice, $uom, $minStock, $maxStock, $imagePath]);
                $newId = (int)$pdo->lastInsertId();

                writeLog($pdo, 'CREATE', 'MT_ITEMS', $newId, null, [
                    'item_code' => $itemCode,
                    'item_name' => $itemName,
                    'unit_price' => $unitPrice,
                ], "Created spare part {$itemCode}");

                $pdo->commit();
                peJsonSuccess(['item_id' => $newId, 'image_path' => $imagePath], 'เพิ่มรายการอะไหล่ใหม่สำเร็จ');
            } else {
                if ($existingId && (int)$existingId !== $itemId) {
                    throw new InvalidArgumentException("รหัสอะไหล่ ({$itemCode}) ซ้ำกับรายการอื่นในระบบ");
                }
                $oldStmt = $pdo->prepare("SELECT item_id, item_code, item_name, unit_price, min_stock, max_stock, uom, supplier FROM dbo.MT_ITEMS WHERE item_id = ?");
                $oldStmt->execute([$itemId]);
                $oldRow = $oldStmt->fetch(PDO::FETCH_ASSOC);
                if (!$oldRow) {
                    throw new InvalidArgumentException('ไม่พบรายการอะไหล่ที่ต้องการแก้ไข');
                }

                $pdo->prepare(
                    "UPDATE dbo.MT_ITEMS SET
                        item_code = ?, item_name = ?, description = ?, supplier = ?,
                        unit_price = ?, uom = ?, min_stock = ?, max_stock = ?,
                        image_path = ISNULL(?, image_path), last_updated = GETDATE()
                     WHERE item_id = ?"
                )->execute([$itemCode, $itemName, $desc, $supplier, $unitPrice, $uom, $minStock, $maxStock, $imagePath, $itemId]);

                writeLog($pdo, 'UPDATE', 'MT_ITEMS', $itemId, $oldRow, [
                    'item_code' => $itemCode,
                    'item_name' => $itemName,
                    'unit_price' => $unitPrice,
                    'min_stock' => $minStock,
                    'max_stock' => $maxStock,
                ], "Updated spare part {$itemCode}");

                $pdo->commit();
                peJsonSuccess(['item_id' => $itemId, 'image_path' => $imagePath], 'อัปเดตข้อมูลอะไหล่สำเร็จ');
            }
            break;
        }

        case 'toggle_mt_item': {
            requirePeAccess(['manage_maintenance'], ['admin', 'creator', 'manager', 'maintenance']);
            $itemId = parsePePositiveInt($input['item_id'] ?? null, 'รหัสอะไหล่');
            $oldStmt = $pdo->prepare("SELECT item_code, is_active FROM dbo.MT_ITEMS WHERE item_id = ?");
            $oldStmt->execute([$itemId]);
            $oldRow = $oldStmt->fetch(PDO::FETCH_ASSOC);
            if (!$oldRow) {
                throw new InvalidArgumentException('ไม่พบรายการอะไหล่');
            }

            $newActive = ((int)$oldRow['is_active'] === 1) ? 0 : 1;
            $pdo->beginTransaction();
            $pdo->prepare("UPDATE dbo.MT_ITEMS SET is_active = ?, last_updated = GETDATE() WHERE item_id = ?")
                ->execute([$newActive, $itemId]);
            writeLog($pdo, 'UPDATE', 'MT_ITEMS', $itemId, $oldRow, ['is_active' => $newActive], "Toggled spare part {$oldRow['item_code']}");
            $pdo->commit();
            peJsonSuccess(['item_id' => $itemId, 'is_active' => $newActive], 'เปลี่ยนสถานะการใช้งานสำเร็จ');
            break;
        }

        case 'transfer_stock': {
            $items = $input['items'] ?? [];
            $notes = mb_substr(trim((string)($input['notes'] ?? '')), 0, 400);
            if (empty($items) || !is_array($items) || count($items) > 100) {
                throw new InvalidArgumentException('ข้อมูลการย้ายคลังไม่ครบถ้วน');
            }

            $locationNames = [];
            foreach ($pdo->query("SELECT location_id, location_name FROM dbo.LOCATIONS WITH (NOLOCK) WHERE is_active = 1 AND location_type = 'MAINTENANCE'")->fetchAll(PDO::FETCH_ASSOC) as $locRow) {
                $locationNames[(int)$locRow['location_id']] = $locRow['location_name'];
            }
            $validLocations = array_keys($locationNames);

            $pdo->beginTransaction();

            $lockStmt = $pdo->prepare("SELECT quantity FROM dbo.MT_INVENTORY_ONHAND WITH (UPDLOCK, ROWLOCK) WHERE item_id = ? AND location_id = ?");
            $logStmt = $pdo->prepare("INSERT INTO dbo.MT_TRANSACTIONS (item_id, location_id, quantity, transaction_type, ref_job_id, notes, created_by_user_id, created_at, pe_wo_id) VALUES (?, ?, ?, ?, NULL, ?, ?, GETDATE(), NULL)");
            $mergeStmt = $pdo->prepare(
                "MERGE INTO dbo.MT_INVENTORY_ONHAND AS target
                 USING (SELECT ? AS item_id, ? AS location_id) AS source
                 ON (target.item_id = source.item_id AND target.location_id = source.location_id)
                 WHEN MATCHED THEN UPDATE SET target.quantity = target.quantity + ?, target.last_updated = GETDATE()
                 WHEN NOT MATCHED THEN INSERT (item_id, location_id, quantity, last_updated) VALUES (source.item_id, source.location_id, ?, GETDATE());"
            );
            $cleanZeroStmt = $pdo->prepare("DELETE FROM dbo.MT_INVENTORY_ONHAND WHERE item_id = ? AND location_id = ? AND quantity <= 0");

            $moved = [];
            foreach ($items as $item) {
                $itemId = parsePePositiveInt($item['item_id'] ?? null, 'รหัสอะไหล่');
                $fromId = parsePePositiveInt($item['from_location_id'] ?? null, 'คลังต้นทาง');
                $toId = parsePePositiveInt($item['to_location_id'] ?? null, 'คลังปลายทาง');
                $quantity = parsePeBoundedFloat($item['quantity'] ?? null, 'จำนวนย้ายคลัง', 0.001, 999999);

                if ($fromId === $toId) {
                    throw new InvalidArgumentException('คลังต้นทางและปลายทางต้องไม่ใช่คลังเดียวกัน');
                }
                if (!in_array($fromId, $validLocations, true) || !in_array($toId, $validLocations, true)) {
                    throw new InvalidArgumentException('คลังซ่อมบำรุงที่เลือกไม่ถูกต้อง');
                }

                $lockStmt->execute([$itemId, $fromId]);
                $currentQty = round((float)($lockStmt->fetchColumn() ?: 0), 3);
                if ($currentQty < $quantity) {
                    throw new InvalidArgumentException("สต๊อกต้นทางไม่เพียงพอสำหรับการย้ายคลัง (รหัสอะไหล่ #{$itemId}, คงเหลือ {$currentQty})");
                }

                $noteOut = mb_substr(trim("[ย้ายคลังไปยัง {$locationNames[$toId]}] {$notes}"), 0, 500);
                $noteIn = mb_substr(trim("[ย้ายคลังจาก {$locationNames[$fromId]}] {$notes}"), 0, 500);

                $logStmt->execute([$itemId, $fromId, -$quantity, 'TRANSFER_OUT', $noteOut, $userId]);
                $mergeStmt->execute([$itemId, $fromId, -$quantity, -$quantity]);
                $cleanZeroStmt->execute([$itemId, $fromId]);

                $logStmt->execute([$itemId, $toId, $quantity, 'TRANSFER_IN', $noteIn, $userId]);
                $mergeStmt->execute([$itemId, $toId, $quantity, $quantity]);

                $moved[] = ['item_id' => $itemId, 'from' => $fromId, 'to' => $toId, 'qty' => $quantity];
            }

            writeLog($pdo, 'TRANSFER', 'PE_SPARE_PARTS', 'BATCH', null, ['moved' => $moved, 'notes' => $notes], 'Transferred spare parts across maintenance locations');
            $pdo->commit();
            peJsonSuccess(['moved' => $moved], 'ย้ายคลังอะไหล่สำเร็จเรียบร้อยแล้ว');
            break;
        }

        case 'cancel_receive': {
            requirePeAccess(['manage_maintenance'], ['admin', 'creator', 'manager', 'maintenance']);
            $txId = parsePePositiveInt($input['transaction_id'] ?? null, 'รหัสธุรกรรม');
            $reason = mb_substr(trim((string)($input['reason'] ?? '')), 0, 300);
            if ($reason === '') {
                throw new InvalidArgumentException('กรุณาระบุสาเหตุการยกเลิกรายการรับเข้า');
            }

            $pdo->beginTransaction();

            $txStmt = $pdo->prepare(
                "SELECT t.transaction_id, t.item_id, t.location_id, t.quantity, t.transaction_type, t.notes,
                        i.item_code, i.item_name, l.location_name
                 FROM dbo.MT_TRANSACTIONS t WITH (UPDLOCK, ROWLOCK)
                 JOIN dbo.MT_ITEMS i WITH (NOLOCK) ON t.item_id = i.item_id
                 LEFT JOIN dbo.LOCATIONS l WITH (NOLOCK) ON t.location_id = l.location_id
                 WHERE t.transaction_id = ?"
            );
            $txStmt->execute([$txId]);
            $tx = $txStmt->fetch(PDO::FETCH_ASSOC);

            if (!$tx) {
                throw new InvalidArgumentException('ไม่พบรายการธุรกรรมในระบบ');
            }
            if ($tx['transaction_type'] !== 'RECEIVE') {
                throw new InvalidArgumentException('สามารถยกเลิกได้เฉพาะรายการรับเข้า (RECEIVE) เท่านั้น');
            }
            if (mb_strpos((string)($tx['notes'] ?? ''), '[ยกเลิกแล้ว') !== false) {
                throw new InvalidArgumentException('รายการรับเข้านี้ถูกยกเลิกไปแล้ว');
            }

            $cancelQty = round((float)$tx['quantity'], 3);
            if ($cancelQty <= 0) {
                throw new InvalidArgumentException('จำนวนในรายการรับเข้าไม่ถูกต้อง');
            }

            $lockStmt = $pdo->prepare("SELECT quantity FROM dbo.MT_INVENTORY_ONHAND WITH (UPDLOCK, ROWLOCK) WHERE item_id = ? AND location_id = ?");
            $lockStmt->execute([$tx['item_id'], $tx['location_id']]);
            $currentQty = round((float)($lockStmt->fetchColumn() ?: 0), 3);

            if ($currentQty < $cancelQty) {
                $locName = $tx['location_name'] ?? 'คลังต้นทาง';
                throw new InvalidArgumentException("สต๊อกคงเหลือในคลัง {$locName} ไม่เพียงพอสำหรับการยกเลิก (คงเหลือ {$currentQty} แต่ต้องหักคืน {$cancelQty})");
            }

            $pdo->prepare("UPDATE dbo.MT_INVENTORY_ONHAND SET quantity = quantity - ?, last_updated = GETDATE() WHERE item_id = ? AND location_id = ?")
                ->execute([$cancelQty, $tx['item_id'], $tx['location_id']]);
            $pdo->prepare("DELETE FROM dbo.MT_INVENTORY_ONHAND WHERE item_id = ? AND location_id = ? AND quantity <= 0")
                ->execute([$tx['item_id'], $tx['location_id']]);

            $oldNotes = trim((string)($tx['notes'] ?? ''));
            $updatedOrigNotes = mb_substr(trim(($oldNotes !== '' ? $oldNotes . ' ' : '') . "[ยกเลิกแล้ว: {$reason}]"), 0, 500);
            $pdo->prepare("UPDATE dbo.MT_TRANSACTIONS SET notes = ? WHERE transaction_id = ?")
                ->execute([$updatedOrigNotes, $txId]);

            $adjustNote = mb_substr("[ยกเลิกรายการรับเข้า #{$txId}] {$reason}", 0, 500);
            $pdo->prepare("INSERT INTO dbo.MT_TRANSACTIONS (item_id, location_id, quantity, transaction_type, ref_job_id, notes, created_by_user_id, created_at, pe_wo_id) VALUES (?, ?, ?, 'ADJUST', NULL, ?, ?, GETDATE(), NULL)")
                ->execute([$tx['item_id'], $tx['location_id'], -$cancelQty, $adjustNote, $userId]);

            writeLog(
                $pdo,
                'CANCEL_MT_RECEIVE',
                'PE_SPARE_PARTS',
                $txId,
                ['transaction_id' => $txId, 'item_code' => $tx['item_code'], 'location_id' => $tx['location_id'], 'onhand_before' => $currentQty],
                ['cancelled_qty' => $cancelQty, 'onhand_after' => max(0, round($currentQty - $cancelQty, 3)), 'reason' => $reason],
                "Cancelled mistaken RECEIVE #{$txId} ({$tx['item_code']})"
            );

            $pdo->commit();
            peJsonSuccess(null, 'ยกเลิกรายการรับเข้าและปรับลดสต๊อกเรียบร้อยแล้ว');
            break;
        }

        case 'adjust_stock': {
            requirePeAccess(['manage_maintenance'], ['admin', 'creator', 'manager', 'maintenance']);
            $itemId = parsePePositiveInt($input['item_id'] ?? null, 'รหัสอะไหล่');
            $locationId = parsePePositiveInt($input['location_id'] ?? null, 'คลังจัดเก็บ');
            $adjustMode = trim((string)($input['adjust_mode'] ?? 'DEDUCT'));
            $reason = mb_substr(trim((string)($input['reason'] ?? '')), 0, 400);

            if (!in_array($adjustMode, ['DEDUCT', 'ADD', 'SET_EXACT'], true)) {
                throw new InvalidArgumentException('รูปแบบการปรับปรุงสต๊อกไม่ถูกต้อง');
            }
            if ($reason === '') {
                throw new InvalidArgumentException('กรุณาระบุสาเหตุการปรับปรุงสต๊อก');
            }

            $minAllowed = ($adjustMode === 'SET_EXACT') ? 0.0 : 0.001;
            $inputQty = parsePeBoundedFloat($input['quantity'] ?? null, 'จำนวนปรับปรุง', $minAllowed, 999999);

            $pdo->beginTransaction();

            $itemCheck = $pdo->prepare("SELECT item_code, item_name FROM dbo.MT_ITEMS WITH (NOLOCK) WHERE item_id = ? AND is_active = 1");
            $itemCheck->execute([$itemId]);
            $itemRow = $itemCheck->fetch(PDO::FETCH_ASSOC);
            if (!$itemRow) {
                throw new InvalidArgumentException('ไม่พบข้อมูลอะไหล่ในระบบ หรืออะไหล่ถูกระงับการใช้งาน');
            }

            $locCheck = $pdo->prepare("SELECT location_name FROM dbo.LOCATIONS WITH (NOLOCK) WHERE location_id = ? AND is_active = 1");
            $locCheck->execute([$locationId]);
            $locRow = $locCheck->fetch(PDO::FETCH_ASSOC);
            if (!$locRow) {
                throw new InvalidArgumentException('ไม่พบคลังจัดเก็บในระบบ');
            }

            $lockStmt = $pdo->prepare("SELECT quantity FROM dbo.MT_INVENTORY_ONHAND WITH (UPDLOCK, ROWLOCK) WHERE item_id = ? AND location_id = ?");
            $lockStmt->execute([$itemId, $locationId]);
            $currentQty = round((float)($lockStmt->fetchColumn() ?: 0), 3);

            if ($adjustMode === 'DEDUCT') {
                $deltaQty = -$inputQty;
                $newQty = round($currentQty - $inputQty, 3);
            } elseif ($adjustMode === 'ADD') {
                $deltaQty = $inputQty;
                $newQty = round($currentQty + $inputQty, 3);
            } else {
                $deltaQty = round($inputQty - $currentQty, 3);
                $newQty = $inputQty;
            }

            if (abs($deltaQty) < 0.0001) {
                throw new InvalidArgumentException('ยอดสต๊อกไม่มีการเปลี่ยนแปลง (ยอดเดิมเท่ากับยอดที่ระบุ)');
            }
            if ($newQty < 0) {
                throw new InvalidArgumentException("ไม่สามารถปรับลดสต๊อกเกินจำนวนคงเหลือได้ (คงเหลือปัจจุบัน {$currentQty})");
            }

            $modeLabel = $adjustMode === 'DEDUCT' ? 'ปรับลดสต๊อก' : ($adjustMode === 'ADD' ? 'ปรับเพิ่มสต๊อก' : 'ตั้งยอดตามนับจริง');
            $fullNote = mb_substr("[{$modeLabel}: {$currentQty} -> {$newQty}] {$reason}", 0, 500);

            $pdo->prepare("INSERT INTO dbo.MT_TRANSACTIONS (item_id, location_id, quantity, transaction_type, ref_job_id, notes, created_by_user_id, created_at, pe_wo_id) VALUES (?, ?, ?, 'ADJUST', NULL, ?, ?, GETDATE(), NULL)")
                ->execute([$itemId, $locationId, $deltaQty, $fullNote, $userId]);

            $pdo->prepare(
                "MERGE INTO dbo.MT_INVENTORY_ONHAND AS target
                 USING (SELECT ? AS item_id, ? AS location_id) AS source
                 ON (target.item_id = source.item_id AND target.location_id = source.location_id)
                 WHEN MATCHED THEN UPDATE SET target.quantity = target.quantity + ?, target.last_updated = GETDATE()
                 WHEN NOT MATCHED THEN INSERT (item_id, location_id, quantity, last_updated) VALUES (source.item_id, source.location_id, ?, GETDATE());"
            )->execute([$itemId, $locationId, $deltaQty, $deltaQty]);

            $pdo->prepare("DELETE FROM dbo.MT_INVENTORY_ONHAND WHERE item_id = ? AND location_id = ? AND quantity <= 0")
                ->execute([$itemId, $locationId]);

            writeLog(
                $pdo,
                'ADJUST_MT_STOCK',
                'PE_SPARE_PARTS',
                $itemId,
                ['item_id' => $itemId, 'item_code' => $itemRow['item_code'], 'location_id' => $locationId, 'onhand_before' => $currentQty],
                ['adjust_mode' => $adjustMode, 'delta_qty' => $deltaQty, 'onhand_after' => $newQty, 'reason' => $reason],
                "Adjusted stock ({$itemRow['item_code']} at {$locRow['location_name']}): {$currentQty} -> {$newQty}"
            );

            $pdo->commit();
            peJsonSuccess(['old_qty' => $currentQty, 'new_qty' => $newQty, 'delta_qty' => $deltaQty], 'ปรับปรุงยอดสต๊อกเรียบร้อยแล้ว');
            break;
        }

        case 'get_transactions': {
            $limit = max(1, min(500, (int)($input['limit'] ?? 200)));
            $sql = "SELECT TOP {$limit}
                        t.transaction_id, t.item_id, t.location_id, t.transaction_type,
                        t.quantity, t.notes, t.created_at,
                        i.item_code, i.item_name, i.uom,
                        l.location_name,
                        ISNULL(NULLIF(u.fullname, ''), u.username) AS created_by_name,
                        j.wo_number, m.machine_code, j.issue_title
                    FROM dbo.MT_TRANSACTIONS t WITH (NOLOCK)
                    JOIN dbo.MT_ITEMS i WITH (NOLOCK) ON t.item_id = i.item_id
                    LEFT JOIN dbo.LOCATIONS l WITH (NOLOCK) ON t.location_id = l.location_id
                    LEFT JOIN dbo.USERS u WITH (NOLOCK) ON t.created_by_user_id = u.id
                    LEFT JOIN dbo.PE_WORK_ORDERS j WITH (NOLOCK) ON t.pe_wo_id = j.wo_id
                    LEFT JOIN dbo.PE_MACHINES m WITH (NOLOCK) ON j.machine_id = m.machine_id
                    ORDER BY t.transaction_id DESC";
            $rows = $pdo->query($sql)->fetchAll(PDO::FETCH_ASSOC);
            peJsonSuccess($rows, 'โหลดประวัติความเคลื่อนไหวอะไหล่สำเร็จ');
            break;
        }

        default:
            peJsonError('Invalid action requested', 400);
    }
} catch (Throwable $e) {
    handleApiError($e, $pdo ?? null, $input ?? $_REQUEST);
}
