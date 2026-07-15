<?php
// MES/page/storeManagement/api/api_store.php
require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../components/init.php';

header('Content-Type: application/json; charset=utf-8');
ini_set('display_errors', 0);

try {
    if (!isset($_SESSION['user'])) {
        http_response_code(401);
        throw new Exception('Unauthorized Access');
    }

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $jsonPayload = json_decode(file_get_contents('php://input'), true);
        if (is_array($jsonPayload)) {
            $_POST = array_merge($_POST, $jsonPayload);
        }
    }

    $currentUser = $_SESSION['user'];
    $action = $_REQUEST['action'] ?? '';
    $storeLocationId = 1008;
    $writeActions = [
        'issue_rm', 'issue_selected_tags', 'import_excel', 'group_master_pallet', 
        'receive_scanned_tag', 'delete_tag', 'delete_bulk_tags', 'edit_tag', 
        'update_print_status', 'create_request', 'approve_request', 'reject_request',
        'bulk_receive_tags', 'manual_add_rm', 'process_transfer_request', 'bulk_process_transfer_request',
        'submit_cycle_count', 'approve_cycle_count', 'create_transfer_request',
        'submit_requisition', 'accept_order', 'confirm_issue', 'reject_order', 'submit_k2_pr', 
        'upload_image', 'update_item_info', 'cancel_my_order'
    ];
    
    if (in_array($action, $writeActions) && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $clientToken = $_POST['csrf_token'] ?? json_decode(file_get_contents('php://input'), true)['csrf_token'] ?? '';
        if (empty($clientToken) || !hash_equals($_SESSION['csrf_token'], $clientToken)) {
            http_response_code(403);
            throw new Exception('CSRF Token Validation Failed. Please refresh the page.');
        }
    }

    if (!isset($pdo)) {
        $pdo = new PDO("sqlsrv:Server=" . DB_HOST . ";Database=" . DB_DATABASE, DB_USER, DB_PASSWORD);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    }

    $response = ['success' => false, 'message' => 'Action not executed'];

    switch ($action) {
        case 'get_orders':
            $status = $_REQUEST['status'] ?? 'ACTIVE';
            $startDate = $_REQUEST['start_date'] ?? date('Y-m-d', strtotime('-30 days'));
            $endDate = $_REQUEST['end_date'] ?? date('Y-m-d');
            
            $sql = "SELECT r.id, r.req_number, r.status, r.remark,
                           FORMAT(r.created_at, 'dd/MM/yyyy HH:mm') as req_time,
                           u.fullname as requester_name,
                           (SELECT COUNT(*) FROM dbo.STORE_REQUISITION_ITEMS ri WITH (NOLOCK) WHERE ri.req_id = r.id AND ri.request_type = 'STOCK') as total_items
                    FROM dbo.STORE_REQUISITIONS r WITH (NOLOCK)
                    LEFT JOIN dbo.USERS u WITH (NOLOCK) ON r.requester_id = u.id
                    WHERE EXISTS (SELECT 1 FROM dbo.STORE_REQUISITION_ITEMS ri2 WHERE ri2.req_id = r.id AND ri2.request_type = 'STOCK') 
                      AND r.created_at >= ? AND r.created_at < DATEADD(DAY, 1, CAST(? AS DATE)) ";
            
            $params = [$startDate, $endDate];
            
            if ($status === 'ACTIVE') {
                $sql .= " AND r.status IN ('NEW ORDER', 'PREPARING', 'PARTIAL') ";
            } elseif ($status !== 'ALL') {
                $sql .= " AND r.status = ? ";
                $params[] = $status;
            }
            
            $sql .= " ORDER BY CASE WHEN r.status = 'NEW ORDER' THEN 1 WHEN r.status = 'PREPARING' THEN 2 ELSE 3 END ASC, r.created_at DESC";

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $response = ['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)];
            break;

        case 'get_order_details':
            $req_id = $_REQUEST['req_id'];
            $stmtH = $pdo->prepare("SELECT r.*, u.fullname as requester_name, FORMAT(r.created_at, 'dd/MM/yyyy HH:mm') as req_time, FORMAT(r.issued_at, 'dd/MM/yyyy HH:mm') as issue_time, i.fullname as issuer_name
                                    FROM dbo.STORE_REQUISITIONS r WITH (NOLOCK) 
                                    LEFT JOIN dbo.USERS u WITH (NOLOCK) ON r.requester_id = u.id 
                                    LEFT JOIN dbo.USERS i WITH (NOLOCK) ON r.issuer_id = i.id
                                    WHERE r.id = ?");
            $stmtH->execute([$req_id]);
            $header = $stmtH->fetch(PDO::FETCH_ASSOC);

            $sqlItems = "SELECT ri.id as row_id, ri.item_code, ri.qty_requested, ri.qty_issued, ri.requested_tags,
                                i.item_id, i.part_description as description, i.image_path, ISNULL(i.material_sub_type, 'OTHER') as material_sub_type,
                                ISNULL((SELECT SUM(quantity) FROM dbo.INVENTORY_ONHAND WITH (NOLOCK) WHERE parameter_id = i.item_id AND location_id IN (SELECT location_id FROM dbo.LOCATIONS WITH (NOLOCK) WHERE location_type = 'STORE')), 0) as onhand_qty
                         FROM dbo.STORE_REQUISITION_ITEMS ri WITH (NOLOCK)
                         JOIN dbo.ITEMS i WITH (NOLOCK) ON ri.item_code = i.sap_no
                         WHERE ri.req_id = ? AND ri.request_type = 'STOCK'";
            $stmtI = $pdo->prepare($sqlItems);
            $stmtI->execute([$req_id]);
            
            $response = ['success' => true, 'header' => $header, 'items' => $stmtI->fetchAll(PDO::FETCH_ASSOC)];
            break;

        case 'accept_order':
            $pdo->prepare("UPDATE dbo.STORE_REQUISITIONS SET status = 'PREPARING' WHERE id = ?")->execute([$_POST['req_id']]);
            writeLog($pdo, 'ACCEPT_ORDER', 'STORE_MANAGEMENT', $_POST['req_id'], null, ['status' => 'PREPARING']);
            $response = ['success' => true];
            break;

        case 'get_available_tags_for_item':
            $item_code = $_REQUEST['item_code'] ?? '';
            $item_id = $_REQUEST['item_id'] ?? null;
            $location_id = $_REQUEST['location_id'] ?? 'STORE';
            if (!$item_code && !$item_id) throw new Exception("ไม่พบรหัสสินค้า");
            
            if ($item_id) {
                $cond = "t.item_id = ? AND t.status = 'AVAILABLE'";
                $params = [$item_id];
            } else {
                $cond = "t.item_id = (SELECT TOP 1 item_id FROM dbo.ITEMS WHERE sap_no = ? OR part_no = ?) AND t.status = 'AVAILABLE'";
                $params = [$item_code, $item_code];
            }
            
            if ($location_id === 'STORE') {
                $cond .= " AND t.location_id IN (SELECT location_id FROM dbo.LOCATIONS WITH (NOLOCK) WHERE location_type = 'STORE')";
            } elseif ($location_id !== 'ALL') {
                $cond .= " AND t.location_id = ?";
                $params[] = $location_id;
            }
            
            $stmt = $pdo->prepare("
                SELECT t.serial_no, t.current_qty, t.master_pallet_no, t.received_date, t.warehouse_no, l.location_name
                FROM dbo.RM_SERIAL_TAGS t WITH (NOLOCK)
                LEFT JOIN dbo.LOCATIONS l WITH (NOLOCK) ON t.location_id = l.location_id
                WHERE $cond
                ORDER BY t.received_date ASC, t.created_at ASC
            ");
            $stmt->execute($params);
            $response = ['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)];
            break;

        case 'force_issue_tag':
            requirePermission('manage_warehouse');
            $serial_no = $_POST['serial_no'] ?? '';
            $userId = $currentUser['id'];
            
            $pdo->beginTransaction();
            $stmtTag = $pdo->prepare("SELECT item_id, location_id, current_qty, status FROM dbo.RM_SERIAL_TAGS WHERE serial_no = ?");
            $stmtTag->execute([$serial_no]);
            $tag = $stmtTag->fetch(PDO::FETCH_ASSOC);
            
            if (!$tag) throw new Exception("ไม่พบแท็กนี้");
            if ($tag['status'] !== 'AVAILABLE') throw new Exception("แท็กนี้ไม่ได้มีสถานะ AVAILABLE");
            
            $locId = $tag['location_id'];
            
            $remark = " [Manual Force Issue by User $userId]";
            $pdo->prepare("UPDATE dbo.RM_SERIAL_TAGS SET status = 'WIP' WHERE serial_no = ?")
                ->execute([$serial_no]);
            $pdo->prepare("INSERT INTO dbo.TAG_TRANSACTIONS (serial_no, transaction_type, quantity_changed, reference_id, created_by_user_id, notes) VALUES (?, 'FORCE_ISSUE', ?, NULL, ?, ?)")
                ->execute([$serial_no, -$tag['current_qty'], $userId, $remark]);
                
            if ($locId) {
                // Deduct inventory (allowing negative to highlight discrepancies) and update timestamp
                $pdo->prepare("UPDATE dbo.INVENTORY_ONHAND SET quantity = quantity - ?, last_updated = GETDATE() WHERE parameter_id = ? AND location_id = ?")
                    ->execute([$tag['current_qty'], $tag['item_id'], $locId]);

                // Insert into STOCK_TRANSACTIONS
                $pdo->prepare("
                    INSERT INTO dbo.STOCK_TRANSACTIONS (
                        parameter_id, quantity, transaction_type, from_location_id, created_by_user_id, 
                        notes, reference_id, transaction_timestamp
                    ) VALUES (?, ?, 'ISSUE_STORE', ?, ?, 'Manual Force Issue', ?, GETDATE())
                ")->execute([
                    $tag['item_id'], -abs($tag['current_qty']), $locId, $userId, $serial_no
                ]);
            }
            
            $pdo->commit();
            $response = ['success' => true, 'message' => 'ตัดจ่ายแท็กสำเร็จ'];
            break;

        case 'confirm_issue':
            $req_id = $_POST['req_id'];
            $req_number = $_POST['req_number'];
            $issuer_id = $currentUser['id'];
            $itemsJsonStr = is_string($_POST['items']) ? $_POST['items'] : json_encode($_POST['items']);
            
            $pdo->beginTransaction();
            try {
                // 1. Race Condition Check
                $reqStmt = $pdo->prepare("SELECT status FROM dbo.STORE_REQUISITIONS WITH (UPDLOCK, ROWLOCK) WHERE id = ?");
                $reqStmt->execute([$req_id]);
                $reqStatus = $reqStmt->fetchColumn();
                if ($reqStatus !== 'PREPARING' && $reqStatus !== 'WAITING' && $reqStatus !== 'PARTIAL') {
                    throw new Exception("ใบเบิกนี้ถูกทำรายการไปแล้ว (สถานะปัจจุบัน: $reqStatus)");
                }

                // 2. Validate payload and negative quantities
                $items = json_decode($itemsJsonStr, true);
                if (!is_array($items) || count($items) === 0) {
                    throw new Exception("ไม่มีรายการที่ต้องจ่าย");
                }
                foreach ($items as $item) {
                    $qty_to_deduct = floatval($item['qty_issued'] ?? 0);
                    if ($qty_to_deduct <= 0) {
                        throw new Exception("จำนวนที่เบิกจ่ายต้องมากกว่า 0 (พบค่า $qty_to_deduct สำหรับ Item: " . ($item['item_code'] ?? '') . ")");
                    }
                }

                // Get destination location id
                $destLocStmt = $pdo->prepare("SELECT destination_location_id FROM dbo.STORE_REQUISITIONS WITH (NOLOCK) WHERE id = ?");
                $destLocStmt->execute([$req_id]);
                $destLocId = $destLocStmt->fetchColumn();

                $tagDeductions = []; // Stores deductions per exact location

                // 3. Handle Tag Deductions FIRST
                foreach ($items as $item) {
                    $qty_to_deduct = floatval($item['qty_issued']);
                    $itemCode = $item['item_code'] ?? '';
                    
                    // Need to find item_id for cloning tags
                    $itemIdStmt = $pdo->prepare("SELECT TOP 1 item_id FROM dbo.ITEMS WHERE sap_no = ? OR part_no = ?");
                    $itemIdStmt->execute([$itemCode, $itemCode]);
                    $itemId = $itemIdStmt->fetchColumn();
                    
                    if (!empty($item['scanned_tags']) && is_array($item['scanned_tags'])) {
                        // User specifically selected tags
                        $placeholders = implode(',', array_fill(0, count($item['scanned_tags']), '?'));
                        $tagStmt = $pdo->prepare("SELECT * FROM dbo.RM_SERIAL_TAGS WHERE serial_no IN ($placeholders) AND status = 'AVAILABLE' AND current_qty > 0 ORDER BY received_date ASC, created_at ASC");
                        $tagStmt->execute($item['scanned_tags']);
                        $tagsData = $tagStmt->fetchAll(PDO::FETCH_ASSOC);
                    } else {
                        // Auto-FIFO for this item if tags exist
                        $tagStmt = $pdo->prepare("
                            SELECT * 
                            FROM dbo.RM_SERIAL_TAGS 
                            WHERE item_id = ?
                              AND status = 'AVAILABLE' AND current_qty > 0
                              AND location_id IN (SELECT location_id FROM dbo.LOCATIONS WITH (NOLOCK) WHERE location_type = 'STORE')
                            ORDER BY received_date ASC, created_at ASC
                        ");
                        $tagStmt->execute([$itemId]);
                        $tagsData = $tagStmt->fetchAll(PDO::FETCH_ASSOC);
                    }

                    // Deduct from tags (WIP Transfer Logic)
                    $total_issued_for_this_item = $qty_to_deduct;
                    foreach ($tagsData as $t) {
                        if ($qty_to_deduct <= 0) break;

                        $tagQty = floatval($t['current_qty']);
                        $deducted_from_this_tag = min($tagQty, $qty_to_deduct);

                        // Accumulate location deductions
                        $locId = $t['location_id'];
                        $key = $itemId . '_' . $locId;
                        if (!isset($tagDeductions[$key])) {
                            $tagDeductions[$key] = [
                                'item_id' => $itemId,
                                'location_id' => $locId,
                                'qty_deducted' => 0
                            ];
                        }
                        $tagDeductions[$key]['qty_deducted'] += $deducted_from_this_tag;

                        if ($tagQty <= $qty_to_deduct) {
                            // Transfer whole tag to WIP
                            $qty_to_deduct -= $tagQty;
                            $updateSql = "UPDATE dbo.RM_SERIAL_TAGS SET status = 'WIP'";
                            if ($destLocId) $updateSql .= ", location_id = " . intval($destLocId);
                            $updateSql .= " WHERE serial_no = ?";
                            
                            $pdo->prepare($updateSql)
                                ->execute([$t['serial_no']]);
                            $pdo->prepare("INSERT INTO dbo.TAG_TRANSACTIONS (serial_no, transaction_type, quantity_changed, reference_id, created_by_user_id, notes) VALUES (?, 'ISSUE_FULL', ?, ?, ?, ?)")
                                ->execute([$t['serial_no'], -$tagQty, $req_number, $issuer_id, "Transfer to WIP for Full"]);
                        } else {
                            // Partial transfer: Deduct from parent tag, create child tag in WIP
                            $pdo->prepare("UPDATE dbo.RM_SERIAL_TAGS SET current_qty = current_qty - ? WHERE serial_no = ?")
                                ->execute([$qty_to_deduct, $t['serial_no']]);
                            $pdo->prepare("INSERT INTO dbo.TAG_TRANSACTIONS (serial_no, transaction_type, quantity_changed, reference_id, created_by_user_id, notes) VALUES (?, 'ISSUE_PARTIAL', ?, ?, ?, ?)")
                                ->execute([$t['serial_no'], -$qty_to_deduct, $req_number, $issuer_id, "Transfer to WIP Partial"]);
                            
                            // Clone tag to WIP
                            $childSerial = $t['serial_no'] . '-W' . rand(100, 999);
                            $pdo->prepare("
                                INSERT INTO dbo.RM_SERIAL_TAGS (serial_no, master_pallet_no, item_id, qty_per_pallet, current_qty, status, po_number, warehouse_no, pallet_no, ctn_number, week_no, remark, location_id, created_at, created_by, received_date)
                                VALUES (?, ?, ?, ?, ?, 'WIP', ?, ?, ?, ?, ?, ?, ?, GETDATE(), ?, ?)
                            ")->execute([
                                $childSerial, $t['master_pallet_no'], $t['item_id'], $qty_to_deduct, $qty_to_deduct,
                                $t['po_number'], $t['warehouse_no'], $t['pallet_no'], $t['ctn_number'], $t['week_no'],
                                " [Cloned for WIP transfer $req_number]", $destLocId ?: $t['location_id'], $issuer_id, $t['received_date']
                            ]);
                            
                            $qty_to_deduct = 0;
                        }
                    }

                    // Add quantity to WIP Location OnHand
                    if ($destLocId && $itemId && $total_issued_for_this_item > 0) {
                        $pdo->prepare("
                            MERGE dbo.INVENTORY_ONHAND AS t
                            USING (SELECT ? as item_id, ? as loc_id) AS s
                            ON (t.parameter_id = s.item_id AND t.location_id = s.loc_id)
                            WHEN MATCHED THEN UPDATE SET quantity = quantity + ?, last_updated = GETDATE()
                            WHEN NOT MATCHED THEN INSERT (parameter_id, location_id, quantity, last_updated)
                            VALUES (?, ?, ?, GETDATE());
                        ")->execute([
                            $itemId, $destLocId, 
                            $total_issued_for_this_item, 
                            $itemId, $destLocId, $total_issued_for_this_item
                        ]);

                        // Record RECEIVE_WIP transaction for the destination location
                        $pdo->prepare("
                            INSERT INTO dbo.STOCK_TRANSACTIONS (
                                parameter_id, quantity, transaction_type, to_location_id, created_by_user_id, 
                                notes, reference_id, transaction_timestamp
                            ) VALUES (?, ?, 'RECEIVE_WIP', ?, ?, 'Received via Store Requisition', ?, GETDATE())
                        ")->execute([
                            $itemId, $total_issued_for_this_item, $destLocId, $issuer_id, $req_number
                        ]);
                    }
                }

                // 4. Execute SP to update ONHAND and Requisition based on actual source locations
                $tagDeductionsJsonStr = json_encode(array_values($tagDeductions));
                $stmt = $pdo->prepare("EXEC dbo.sp_Store_ConfirmIssueBatch 
                                        @ReqId = ?, @ReqNumber = ?, @UserId = ?, 
                                        @ItemsJson = ?, @TagDeductionsJson = ?");
                $stmt->execute([$req_id, $req_number, $issuer_id, $itemsJsonStr, $tagDeductionsJsonStr]);
                
                writeLog($pdo, 'ISSUE_STOCK', 'STORE_MANAGEMENT', $req_number, null, ['req_id' => $req_id, 'items' => $items]);
                
                $pdo->commit();
                $response = ['success' => true];
            } catch (Exception $e) {
                $pdo->rollBack();
                throw $e;
            }
            break;

        case 'reject_order':
            $reason = $_POST['reason'] ?? 'Rejected by Store';
            $pdo->prepare("UPDATE dbo.STORE_REQUISITIONS SET status = 'REJECTED', remark = ISNULL(remark, '') + ' [Reject: ' + ? + ']' WHERE id = ?")->execute([$reason, $_POST['req_id']]);
            writeLog($pdo, 'REJECT_ORDER', 'STORE_MANAGEMENT', $_POST['req_id'], null, ['status' => 'REJECTED', 'reason' => $reason]);
            $response = ['success' => true];
            break;

        case 'cancel_my_order':
            $req_id = $_POST['req_id'] ?? 0;
            
            $stmt = $pdo->prepare("SELECT requester_id, status FROM dbo.STORE_REQUISITIONS WITH (NOLOCK) WHERE id = ?");
            $stmt->execute([$req_id]);
            $req = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$req) throw new Exception("ไม่พบข้อมูลบิล");
            if ($req['status'] !== 'NEW ORDER') throw new Exception("ไม่สามารถยกเลิกได้ เนื่องจากสโตร์ได้รับออเดอร์ไปแล้ว");
            
            if ($req['requester_id'] != $currentUser['id'] && !in_array($currentUser['role'], ['admin', 'creator'])) {
                throw new Exception("ไม่มีสิทธิ์ยกเลิกบิลของผู้อื่น");
            }
            
            $reason = "ยกเลิกโดยผู้เบิก";
            $pdo->prepare("UPDATE dbo.STORE_REQUISITIONS SET status = 'REJECTED', remark = ISNULL(remark, '') + ' [Reject: ' + ? + ']' WHERE id = ?")->execute([$reason, $req_id]);
            writeLog($pdo, 'CANCEL_ORDER', 'STORE_MANAGEMENT', $req_id, null, ['status' => 'REJECTED', 'reason' => $reason]);
            
            $response = ['success' => true];
            break;

        case 'get_k2_summary':
            $status = $_REQUEST['status'] ?? 'WAITING'; 
            $startDate = $_REQUEST['start_date'] ?? date('Y-m-d', strtotime('-30 days'));
            $endDate = $_REQUEST['end_date'] ?? date('Y-m-d');

            $sql = "SELECT ri.item_code, i.part_description as description, i.image_path, ISNULL(i.material_sub_type, 'OTHER') as material_sub_type,
                           SUM(ri.qty_requested) as total_qty, COUNT(k.id) as request_count, MAX(k.k2_reference_no) as k2_ref, MAX(k.updated_at) as last_update
                    FROM dbo.STORE_K2_REQUESTS k WITH (NOLOCK)
                    JOIN dbo.STORE_REQUISITION_ITEMS ri WITH (NOLOCK) ON k.req_item_id = ri.id
                    JOIN dbo.STORE_REQUISITIONS r WITH (NOLOCK) ON ri.req_id = r.id
                    JOIN dbo.ITEMS i WITH (NOLOCK) ON ri.item_code = i.sap_no
                    WHERE k.k2_status = ? 
                      AND r.created_at >= ? AND r.created_at < DATEADD(DAY, 1, CAST(? AS DATE))
                    GROUP BY ri.item_code, i.part_description, i.image_path, i.material_sub_type
                    ORDER BY total_qty DESC";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$status, $startDate, $endDate]);
            $response = ['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)];
            break;

        case 'get_k2_item_details':
            $item_code = $_REQUEST['item_code'];
            $status = $_REQUEST['status'] ?? 'WAITING';
            $startDate = $_REQUEST['start_date'] ?? date('Y-m-d', strtotime('-30 days'));
            $endDate = $_REQUEST['end_date'] ?? date('Y-m-d');

            $sql = "SELECT k.id as k2_id, ri.qty_requested, r.req_number, u.fullname, FORMAT(r.created_at, 'dd/MM/yyyy') as req_date, r.remark
                    FROM dbo.STORE_K2_REQUESTS k WITH (NOLOCK)
                    JOIN dbo.STORE_REQUISITION_ITEMS ri WITH (NOLOCK) ON k.req_item_id = ri.id
                    JOIN dbo.STORE_REQUISITIONS r WITH (NOLOCK) ON ri.req_id = r.id
                    LEFT JOIN dbo.USERS u WITH (NOLOCK) ON r.requester_id = u.id
                    WHERE k.k2_status = ? AND ri.item_code = ?
                      AND r.created_at >= ? AND r.created_at < DATEADD(DAY, 1, CAST(? AS DATE))
                    ORDER BY r.created_at ASC";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$status, $item_code, $startDate, $endDate]);
            $response = ['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)];
            break;

        case 'submit_k2_pr':
            $item_code = $_POST['item_code'];
            $k2_pr_no = $_POST['k2_pr_no'];
            $userId = $currentUser['id'];
            
            $pdo->beginTransaction();
            $sqlK2 = "UPDATE k
                    SET k.k2_status = 'K2_OPENED', k.k2_reference_no = ?, k.updated_at = GETDATE(), k.updated_by = ?
                    FROM dbo.STORE_K2_REQUESTS k
                    JOIN dbo.STORE_REQUISITION_ITEMS ri ON k.req_item_id = ri.id
                    WHERE k.k2_status = 'WAITING' AND ri.item_code = ?";
            $pdo->prepare($sqlK2)->execute([$k2_pr_no, $userId, $item_code]);
            $sqlPrep = "UPDATE r
                        SET r.status = 'PREPARING'
                        FROM dbo.STORE_REQUISITIONS r
                        WHERE r.status = 'NEW ORDER' 
                          AND r.id IN (SELECT req_id FROM dbo.STORE_REQUISITION_ITEMS WHERE item_code = ?)";
            $pdo->prepare($sqlPrep)->execute([$item_code]);
            $sqlFindReq = "SELECT DISTINCT req_id FROM dbo.STORE_REQUISITION_ITEMS WHERE item_code = ?";
            $stmtFind = $pdo->prepare($sqlFindReq);
            $stmtFind->execute([$item_code]);
            $reqIds = $stmtFind->fetchAll(PDO::FETCH_COLUMN);

            if (!empty($reqIds)) {
                $placeholders = implode(',', array_fill(0, count($reqIds), '?'));
                $sqlCheck = "SELECT DISTINCT ri.req_id 
                             FROM dbo.STORE_REQUISITION_ITEMS ri 
                             LEFT JOIN dbo.STORE_K2_REQUESTS k2 ON ri.id = k2.req_item_id
                             WHERE ri.req_id IN ($placeholders)
                               AND (
                                   (ri.request_type = 'K2' AND ISNULL(k2.k2_status, 'WAITING') = 'WAITING')
                                   OR 
                                   (ri.request_type = 'STOCK' AND ri.qty_issued IS NULL)
                               )";
                $stmtCheck = $pdo->prepare($sqlCheck);
                $stmtCheck->execute($reqIds);
                $incompleteReqs = $stmtCheck->fetchAll(PDO::FETCH_COLUMN);

                $completedReqs = array_diff($reqIds, $incompleteReqs);

                if (!empty($completedReqs)) {
                    $compPlaceholders = implode(',', array_fill(0, count($completedReqs), '?'));
                    $sqlComplete = "UPDATE dbo.STORE_REQUISITIONS 
                                    SET status = 'COMPLETED', issuer_id = ?, issued_at = GETDATE() 
                                    WHERE id IN ($compPlaceholders) AND status != 'COMPLETED'";
                    $params = array_merge([$userId], $completedReqs);
                    $pdo->prepare($sqlComplete)->execute($params);
                }
            }

            writeLog($pdo, 'SUBMIT_K2_PR', 'STORE_MANAGEMENT', $k2_pr_no, null, ['item_code' => $item_code, 'status' => 'K2_OPENED']);

            $pdo->commit();
            $response = ['success' => true, 'message' => 'บันทึกรหัส K2 PR สำเร็จ'];
            break;

        case 'get_analytics':
            $startDate = $_REQUEST['start_date'] ?? date('Y-m-01');
            $endDate = $_REQUEST['end_date'] ?? date('Y-m-t'); 
            $sqlKpi = "
                SET NOCOUNT ON;
                DECLARE @Start DATE = ?;
                DECLARE @End DATETIME = DATEADD(DAY, 1, CAST(? AS DATE));

                DECLARE @TotalReqs INT = (SELECT COUNT(DISTINCT CASE WHEN status = 'COMPLETED' THEN id END) FROM dbo.STORE_REQUISITIONS WITH (NOLOCK) WHERE created_at >= @Start AND created_at < @End);
                DECLARE @TotalIssued DECIMAL(18,4) = (SELECT ISNULL(SUM(ri.qty_issued), 0) FROM dbo.STORE_REQUISITION_ITEMS ri WITH (NOLOCK) JOIN dbo.STORE_REQUISITIONS r WITH (NOLOCK) ON r.id = ri.req_id WHERE r.status = 'COMPLETED' AND r.created_at >= @Start AND r.created_at < @End);
                DECLARE @WaitK2 INT = (SELECT COUNT(*) FROM dbo.STORE_K2_REQUESTS WITH (NOLOCK) WHERE k2_status = 'WAITING');
                DECLARE @TotalRej INT = (SELECT COUNT(DISTINCT CASE WHEN status = 'REJECTED' THEN id END) FROM dbo.STORE_REQUISITIONS WITH (NOLOCK) WHERE created_at >= @Start AND created_at < @End);

                DECLARE @AvgSla INT = (SELECT ISNULL(AVG(DATEDIFF(MINUTE, r.created_at, r.issued_at)), 0) FROM dbo.STORE_REQUISITIONS r WITH (NOLOCK) WHERE r.status = 'COMPLETED' AND r.issued_at >= @Start AND r.issued_at < @End);
                DECLARE @FillRate FLOAT = (SELECT ISNULL((SUM(ri.qty_issued) / NULLIF(SUM(ri.qty_requested), 0)) * 100, 0) FROM dbo.STORE_REQUISITION_ITEMS ri WITH (NOLOCK) JOIN dbo.STORE_REQUISITIONS r WITH (NOLOCK) ON r.id = ri.req_id WHERE r.status = 'COMPLETED' AND r.issued_at >= @Start AND r.issued_at < @End);

                DECLARE @DeadStock FLOAT = (
                    SELECT ISNULL(SUM(inv.quantity * i.StandardPrice), 0)
                    FROM dbo.INVENTORY_ONHAND inv WITH (NOLOCK)
                    JOIN dbo.ITEMS i WITH (NOLOCK) ON inv.parameter_id = i.item_id
                    LEFT JOIN (
                        SELECT DISTINCT parameter_id 
                        FROM dbo.STOCK_TRANSACTIONS WITH (NOLOCK) 
                        WHERE transaction_timestamp >= DATEADD(DAY, -90, GETDATE())
                    ) act ON inv.parameter_id = act.parameter_id
                    WHERE inv.quantity > 0 AND act.parameter_id IS NULL
                );

                DECLARE @Ira FLOAT = (SELECT ISNULL((CAST(SUM(CASE WHEN diff_qty = 0 THEN 1 ELSE 0 END) AS FLOAT) / NULLIF(COUNT(*), 0)) * 100, 100) FROM dbo.INVENTORY_CYCLE_COUNTS WITH (NOLOCK) WHERE status = 'APPROVED' AND approved_at >= @Start AND approved_at < @End);

                DECLARE @Cogs FLOAT = (
                    SELECT ISNULL(SUM(st.quantity * i.StandardPrice), 0) 
                    FROM dbo.STOCK_TRANSACTIONS st WITH (NOLOCK) 
                    JOIN dbo.ITEMS i WITH (NOLOCK) ON st.parameter_id = i.item_id 
                    WHERE st.transaction_type IN ('ISSUE_STORE', 'ISSUE_RM') AND st.transaction_timestamp >= @Start AND st.transaction_timestamp < @End
                );
                
                DECLARE @InvVal FLOAT = (
                    SELECT ISNULL(SUM(inv.quantity * i.StandardPrice), 0) 
                    FROM dbo.INVENTORY_ONHAND inv WITH (NOLOCK) 
                    JOIN dbo.ITEMS i WITH (NOLOCK) ON inv.parameter_id = i.item_id 
                    WHERE inv.quantity > 0
                );
                
                DECLARE @Turnover FLOAT = CASE WHEN @InvVal > 0 THEN (@Cogs / @InvVal) ELSE 0 END;

                SELECT 
                    @TotalReqs as total_reqs, @TotalIssued as total_issued_qty, @WaitK2 as waiting_k2, @TotalRej as total_rejects,
                    @AvgSla as avg_sla_minutes, @FillRate as fill_rate_percent, @DeadStock as dead_stock_value,
                    @Ira as ira_percent, @Turnover as turnover_ratio;
            ";

            $stmtKpi = $pdo->prepare($sqlKpi);
            $stmtKpi->execute([$startDate, $endDate]);
            $summary = $stmtKpi->fetch(PDO::FETCH_ASSOC);

            $stmtTrend = $pdo->prepare("SELECT CAST(r.created_at AS DATE) as req_date, COUNT(DISTINCT r.id) as req_count FROM dbo.STORE_REQUISITIONS r WITH (NOLOCK) WHERE r.created_at >= ? AND r.created_at < DATEADD(DAY, 1, CAST(? AS DATE)) AND r.status = 'COMPLETED' GROUP BY CAST(r.created_at AS DATE) ORDER BY req_date ASC");
            $stmtTrend->execute([$startDate, $endDate]); 
            $trendData = $stmtTrend->fetchAll(PDO::FETCH_ASSOC);

            $stmtCat = $pdo->prepare("SELECT ISNULL(i.material_sub_type, 'OTHER') as category, SUM(ri.qty_issued) as total_qty FROM dbo.STORE_REQUISITION_ITEMS ri WITH (NOLOCK) JOIN dbo.STORE_REQUISITIONS r WITH (NOLOCK) ON ri.req_id = r.id JOIN dbo.ITEMS i WITH (NOLOCK) ON ri.item_code = i.sap_no WHERE r.created_at >= ? AND r.created_at < DATEADD(DAY, 1, CAST(? AS DATE)) AND r.status = 'COMPLETED' AND ri.qty_issued > 0 GROUP BY i.material_sub_type");
            $stmtCat->execute([$startDate, $endDate]); 
            $categoryData = $stmtCat->fetchAll(PDO::FETCH_ASSOC);

            $stmtTopItems = $pdo->prepare("SELECT TOP 5 i.part_description, SUM(ri.qty_issued) as total_qty FROM dbo.STORE_REQUISITION_ITEMS ri WITH (NOLOCK) JOIN dbo.STORE_REQUISITIONS r WITH (NOLOCK) ON ri.req_id = r.id JOIN dbo.ITEMS i WITH (NOLOCK) ON ri.item_code = i.sap_no WHERE r.created_at >= ? AND r.created_at < DATEADD(DAY, 1, CAST(? AS DATE)) AND r.status = 'COMPLETED' AND ri.qty_issued > 0 GROUP BY i.part_description ORDER BY total_qty DESC");
            $stmtTopItems->execute([$startDate, $endDate]); 
            $topItems = $stmtTopItems->fetchAll(PDO::FETCH_ASSOC);

            $stmtTopUsers = $pdo->prepare("SELECT TOP 5 u.fullname, COUNT(DISTINCT r.id) as req_count FROM dbo.STORE_REQUISITIONS r WITH (NOLOCK) JOIN dbo.USERS u WITH (NOLOCK) ON r.requester_id = u.id WHERE r.created_at >= ? AND r.created_at < DATEADD(DAY, 1, CAST(? AS DATE)) AND r.status = 'COMPLETED' GROUP BY u.fullname ORDER BY req_count DESC");
            $stmtTopUsers->execute([$startDate, $endDate]); 
            $topUsers = $stmtTopUsers->fetchAll(PDO::FETCH_ASSOC);

            $response = [
                'success' => true, 
                'summary' => $summary, 
                'trendData' => $trendData,
                'categoryData' => $categoryData,
                'topItems' => $topItems, 
                'topUsers' => $topUsers
            ];
            break;

        case 'export_analytics':
            $startDate = $_REQUEST['start_date'] ?? date('Y-m-01');
            $endDate = $_REQUEST['end_date'] ?? date('Y-m-t'); 
            
            $stmtExport = $pdo->prepare("
                SELECT r.req_number, FORMAT(r.created_at, 'yyyy-MM-dd HH:mm') as date_req, 
                       u.fullname as requester, i.sap_no, i.part_description, 
                       ri.qty_requested, ri.qty_issued, ri.request_type, r.status 
                FROM dbo.STORE_REQUISITION_ITEMS ri WITH (NOLOCK) 
                JOIN dbo.STORE_REQUISITIONS r WITH (NOLOCK) ON ri.req_id = r.id 
                JOIN dbo.USERS u WITH (NOLOCK) ON r.requester_id = u.id 
                JOIN dbo.ITEMS i WITH (NOLOCK) ON ri.item_code = i.sap_no 
                WHERE r.created_at >= ? AND r.created_at < DATEADD(DAY, 1, CAST(? AS DATE)) 
                ORDER BY r.created_at DESC
            ");
            $stmtExport->execute([$startDate, $endDate]); 
            $exportData = $stmtExport->fetchAll(PDO::FETCH_ASSOC);
            
            $response = ['success' => true, 'exportData' => $exportData];
            break;

        case 'submit_requisition':
            $input = json_decode(file_get_contents('php://input'), true) ?? [];
            $cartRaw = $_POST['cart'] ?? $input['cart'] ?? '';
            $cartJsonStr = is_string($cartRaw) ? $cartRaw : json_encode($cartRaw);

            $remark = trim($_POST['remark'] ?? $input['remark'] ?? '');
            $reqType = $_POST['request_type'] ?? $input['request_type'] ?? 'STOCK';
            $userId = $currentUser['id'];

            if (empty($cartJsonStr) || $cartJsonStr === '[]') {
                throw new Exception("ไม่มีรายการสินค้า");
            }

            // --- Anti-Spam / Duplicate Submission Prevention ---
            // Prevent the same user from submitting another requisition within 5 seconds
            $stmtSpam = $pdo->prepare("
                SELECT TOP 1 req_number 
                FROM dbo.STORE_REQUISITIONS WITH (NOLOCK)
                WHERE requester_id = ? 
                  AND created_at > DATEADD(SECOND, -5, GETDATE())
            ");
            $stmtSpam->execute([$userId]);
            $recentReq = $stmtSpam->fetchColumn();
            
            if ($recentReq) {
                throw new Exception("คุณส่งคำขอเร็วเกินไป (ระบบป้องกันข้อมูลซ้ำซ้อน) กรุณารอสักครู่แล้วลองใหม่ครับ");
            }
            // ---------------------------------------------------

            $stmt = $pdo->prepare("{CALL dbo.sp_Store_SubmitRequisition(?, ?, ?, ?, ?, ?)}");
            
            $stmt->bindParam(1, $userId, PDO::PARAM_INT);
            $stmt->bindParam(2, $remark, PDO::PARAM_STR);
            $stmt->bindParam(3, $reqType, PDO::PARAM_STR);
            $stmt->bindParam(4, $cartJsonStr, PDO::PARAM_STR);
            $stmt->bindParam(5, $storeLocationId, PDO::PARAM_INT);
            
            $reqNumber = '';
            $stmt->bindParam(6, $reqNumber, PDO::PARAM_STR | PDO::PARAM_INPUT_OUTPUT, 50);
            $stmt->execute();

            $reservation_number = trim($_POST['reservation_number'] ?? $input['reservation_number'] ?? '');
            $internal_job_no = trim($_POST['internal_job_no'] ?? $input['internal_job_no'] ?? '');
            $destination_location_id = $_POST['destination_location_id'] ?? $input['destination_location_id'] ?? null;
            
            if (!$destination_location_id) {
                // Try to find the destination WIP location based on the user's line or department
                $destLocId = null;
                $line = $currentUser['line'] ?? $currentUser['department_api'] ?? '';
                if (!empty($line)) {
                    $stmtLoc = $pdo->prepare("SELECT TOP 1 location_id FROM dbo.LOCATIONS WHERE production_line = ? AND location_type = 'WIP'");
                    $stmtLoc->execute([$line]);
                    $destLocId = $stmtLoc->fetchColumn();
                }

                // Fallback: If no specific line WIP is found, just find any generic WIP location if we want, or leave it null.
                if (!$destLocId) {
                    $stmtLoc = $pdo->query("SELECT TOP 1 location_id FROM dbo.LOCATIONS WHERE location_type = 'WIP' ORDER BY location_id ASC");
                    $destLocId = $stmtLoc->fetchColumn();
                }
                $destination_location_id = $destLocId;
            }

            // Update Requisition with Reservation, Internal Job, and Destination
            try {
                $pdo->prepare("UPDATE dbo.STORE_REQUISITIONS SET reservation_number = ?, internal_job_no = ?, destination_location_id = ? WHERE req_number = ?")
                    ->execute([$reservation_number ?: null, $internal_job_no ?: null, $destination_location_id ?: null, $reqNumber]);
            } catch (Exception $e) {
                error_log("Failed to update STORE_REQUISITIONS: " . $e->getMessage());
            }

            $response = ['success' => true, 'req_number' => $reqNumber];
            break;

        case 'get_my_orders':
            $startDate = $_REQUEST['start_date'] ?? date('Y-m-d', strtotime('-30 days'));
            $endDate = $_REQUEST['end_date'] ?? date('Y-m-d');
            $userId = $currentUser['id'];
            $sql = "SELECT r.id, r.req_number, r.status, r.remark, FORMAT(r.created_at, 'dd/MM/yyyy HH:mm') as req_time,
                           (SELECT COUNT(*) FROM dbo.STORE_REQUISITION_ITEMS ri WITH (NOLOCK) WHERE ri.req_id = r.id) as total_items,
                           (SELECT TOP 1 request_type FROM dbo.STORE_REQUISITION_ITEMS ri WITH (NOLOCK) WHERE ri.req_id = r.id) as req_type
                    FROM dbo.STORE_REQUISITIONS r WITH (NOLOCK)
                    WHERE r.requester_id = ? AND r.created_at >= ? AND r.created_at < DATEADD(DAY, 1, CAST(? AS DATE))
                    ORDER BY r.created_at DESC";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$userId, $startDate, $endDate]);
            $response = ['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)];
            break;

        case 'get_my_order_details':
            $req_id = $_REQUEST['req_id'];
            $userId = $currentUser['id'];
            $stmtH = $pdo->prepare("SELECT r.*, FORMAT(r.created_at, 'dd/MM/yyyy HH:mm') as req_time, FORMAT(r.issued_at, 'dd/MM/yyyy HH:mm') as issue_time, i.fullname as issuer_name 
                                    FROM dbo.STORE_REQUISITIONS r WITH (NOLOCK) 
                                    LEFT JOIN dbo.USERS i WITH (NOLOCK) ON r.issuer_id = i.id 
                                    WHERE r.id = ? AND r.requester_id = ?");
            $stmtH->execute([$req_id, $userId]);
            $header = $stmtH->fetch(PDO::FETCH_ASSOC);
            if(!$header) throw new Exception("ไม่พบรายการ หรือไม่มีสิทธิ์เข้าถึง");

            $sqlItems = "SELECT ri.id as row_id, ri.item_code, ri.qty_requested, ri.qty_issued, i.part_description as description, i.image_path, ISNULL(i.material_sub_type, 'OTHER') as material_sub_type,
                                k.k2_reference_no, k.k2_status, ri.request_type
                         FROM dbo.STORE_REQUISITION_ITEMS ri WITH (NOLOCK)
                         JOIN dbo.ITEMS i WITH (NOLOCK) ON ri.item_code = i.sap_no
                         LEFT JOIN dbo.STORE_K2_REQUESTS k WITH (NOLOCK) ON ri.id = k.req_item_id
                         WHERE ri.req_id = ?";
            $stmtI = $pdo->prepare($sqlItems);
            $stmtI->execute([$req_id]);
            
            $response = ['success' => true, 'header' => $header, 'items' => $stmtI->fetchAll(PDO::FETCH_ASSOC)];
            break;

        case 'get_catalog':
            $category = $_REQUEST['category'] ?? 'ALL';
            $subCategory = $_REQUEST['sub_category'] ?? 'ALL';
            $search = $_REQUEST['search'] ?? '';
            $sort = $_REQUEST['sort'] ?? 'DEFAULT'; 
            $page = isset($_REQUEST['page']) ? (int)$_REQUEST['page'] : 1;
            $limit = 40; 
            $offset = ($page - 1) * $limit;
            $stmt = $pdo->prepare("EXEC sp_Store_GetCatalog @Category=?, @SubType=?, @Search=?, @Sort=?, @Offset=?, @Limit=?");
            $stmt->execute([$category, $subCategory, $search, $sort, $offset, $limit]); 
            $response = ['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)];
            break;

        case 'get_item_info':
            $item_code = $_REQUEST['item_code'];
            $stmt = $pdo->prepare("SELECT sap_no, part_description, ISNULL(material_sub_type, 'OTHER') as material_sub_type, StandardPrice FROM dbo.ITEMS WITH (NOLOCK) WHERE sap_no = ?");
            $stmt->execute([$item_code]);
            $data = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($data) $response = ['success' => true, 'data' => $data];
            else throw new Exception('Not found');
            break;

        case 'update_item_info':
            if (!in_array($currentUser['role'], ['admin', 'creator', 'store'])) {
                throw new Exception("ไม่มีสิทธิ์แก้ไขข้อมูล");
            }
            $item_code = $_POST['item_code'];
            $desc = $_POST['description'];
            $category = $_POST['material_sub_type'];
            $price = (float)($_POST['std_price'] ?? 0);
            
            $pdo->prepare("UPDATE dbo.ITEMS SET part_description = ?, material_sub_type = ?, StandardPrice = ? WHERE sap_no = ?")
                ->execute([$desc, $category, $price, $item_code]);
            
            $response = ['success' => true];
            break;

        case 'upload_image':
            $sap_no = $_POST['item_code'] ?? '';
            if (empty($sap_no) || !isset($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
                throw new Exception("ข้อมูลไม่ครบ หรือไฟล์มีปัญหา");
            }

            $file = $_FILES['image'];
            $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
            if (!in_array($ext, ['jpg', 'jpeg', 'png', 'webp'])) { throw new Exception("รองรับเฉพาะ JPG, PNG, WEBP"); }
            if ($file['size'] > 5 * 1024 * 1024) { throw new Exception("ไฟล์ต้องไม่เกิน 5MB"); }

            $uploadDir = __DIR__ . '/../../../uploads/items/';
            if (!is_dir($uploadDir)) mkdir($uploadDir, 0777, true);

            $newFileName = preg_replace('/[^a-zA-Z0-9_-]/', '_', $sap_no) . '_' . time() . '.' . $ext;
            
            if (move_uploaded_file($file['tmp_name'], $uploadDir . $newFileName)) {
                $stmtCheck = $pdo->prepare("SELECT image_path FROM dbo.ITEMS WHERE sap_no = ?");
                $stmtCheck->execute([$sap_no]);
                $oldImage = $stmtCheck->fetchColumn();
                
                if ($oldImage && file_exists($uploadDir . $oldImage)) unlink($uploadDir . $oldImage);

                $pdo->prepare("UPDATE dbo.ITEMS SET image_path = ? WHERE sap_no = ?")->execute([$newFileName, $sap_no]);
                $response = ['success' => true, 'image_path' => $newFileName];
            } else {
                throw new Exception("บันทึกไฟล์ไม่สำเร็จ เช็ค Permission โฟลเดอร์");
            }
            break;

        case 'get_master_data':
            $locStmt = $pdo->query("SELECT location_id, location_name, location_type, production_line FROM dbo.LOCATIONS WITH (NOLOCK) WHERE is_active = 1 ORDER BY location_name");
            $itemsStmt = $pdo->query("SELECT item_id, sap_no, part_no, part_description FROM dbo.ITEMS WITH (NOLOCK) WHERE is_active = 1 ORDER BY sap_no");
            
            $response = [
                'success' => true, 
                'data' => [
                    'locations' => $locStmt->fetchAll(PDO::FETCH_ASSOC),
                    'items' => $itemsStmt->fetchAll(PDO::FETCH_ASSOC)
                ],
                'user_role' => $currentUser['role'],
                'user_line' => $currentUser['line'] ?? null
            ];
            break;

        case 'get_active_jobs_for_fulfillment':
            $line = $_GET['line'] ?? '';
            $location_id = $_GET['location_id'] ?? '';
            
            $params = [];
            $filterSql = "";
            
            if (!empty($location_id)) {
                $filterSql = "AND j.location_id = ?";
                $params[] = $location_id;
            } elseif (!empty($line)) {
                $locStmt = $pdo->prepare("SELECT location_id FROM dbo.LOCATIONS WITH (NOLOCK) WHERE production_line = ?");
                $locStmt->execute([$line]);
                $loc_ids = $locStmt->fetchAll(PDO::FETCH_COLUMN);

                if (empty($loc_ids)) {
                    $response = ['success' => true, 'data' => []];
                    break;
                }
                $inQuery = implode(',', array_fill(0, count($loc_ids), '?'));
                $filterSql = "AND j.location_id IN ($inQuery)";
                $params = $loc_ids;
            }

            $sql = "SELECT j.job_id, j.job_no, j.target_qty, i.part_no, i.part_description, j.status
                    FROM dbo.PRODUCTION_JOBS j WITH (NOLOCK)
                    JOIN dbo.ITEMS i WITH (NOLOCK) ON j.item_id = i.item_id
                    WHERE j.status IN ('PENDING', 'RUNNING', 'PAUSED') $filterSql
                    ORDER BY j.queue_order ASC, j.created_at ASC";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $jobs = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $response = ['success' => true, 'data' => $jobs];
            break;

        case 'get_plan_fulfillment':
            $job_id = $_GET['job_id'] ?? '';
            if (empty($job_id)) throw new Exception("ระบุ Job ID");

            $jobStmt = $pdo->prepare("
                SELECT j.job_no, j.target_qty, j.item_id, l.production_line 
                FROM dbo.PRODUCTION_JOBS j WITH (NOLOCK)
                JOIN dbo.LOCATIONS l WITH (NOLOCK) ON j.location_id = l.location_id
                WHERE j.job_id = ?
            ");
            $jobStmt->execute([$job_id]);
            $job = $jobStmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$job) throw new Exception("ไม่พบข้อมูล Job");

            $line = $job['production_line'];
            $locStmt = $pdo->prepare("SELECT TOP 1 location_id FROM dbo.LOCATIONS WITH (NOLOCK) WHERE production_line = ? AND location_type = 'WIP'");
            $locStmt->execute([$line]);
            $wip_loc_id = $locStmt->fetchColumn() ?: 0;

            $sqlBom = "
                SELECT 
                    b.component_item_id as item_id,
                    i.sap_no,
                    i.part_no,
                    i.part_description,
                    i.image_path,
                    SUM(b.quantity_required * ?) as target_qty
                FROM dbo.PRODUCT_BOM b WITH (NOLOCK)
                JOIN dbo.ITEMS i WITH (NOLOCK) ON b.component_item_id = i.item_id
                WHERE b.fg_item_id = ? AND b.bom_status = 'ACTIVE'
                GROUP BY b.component_item_id, i.sap_no, i.part_no, i.part_description, i.image_path
            ";
            $stmtBom = $pdo->prepare($sqlBom);
            $stmtBom->execute([$job['target_qty'], $job['item_id']]);
            $requirements = $stmtBom->fetchAll(PDO::FETCH_ASSOC);

            $sqlIssued = "
                SELECT 
                    i.item_id,
                    SUM(ri.qty_issued) as total_issued
                FROM dbo.STORE_REQUISITIONS r WITH (NOLOCK)
                JOIN dbo.STORE_REQUISITION_ITEMS ri WITH (NOLOCK) ON r.id = ri.req_id
                JOIN dbo.ITEMS i WITH (NOLOCK) ON ri.item_code = i.sap_no
                WHERE (r.internal_job_no = ? OR r.reservation_number = ?)
                  AND r.destination_location_id = ?
                  AND r.status IN ('COMPLETED', 'PARTIAL')
                GROUP BY i.item_id
            ";
            $stmtIssued = $pdo->prepare($sqlIssued);
            $stmtIssued->execute([$job['job_no'], $job['job_no'], $wip_loc_id]);
            $issuedData = [];
            while ($row = $stmtIssued->fetch(PDO::FETCH_ASSOC)) {
                $issuedData[$row['item_id']] = (float)$row['total_issued'];
            }

            $results = [];
            foreach ($requirements as $req) {
                $req['target_qty'] = (float)$req['target_qty'];
                $req['issued_qty'] = $issuedData[$req['item_id']] ?? 0.0;
                $req['pending_qty'] = max(0, $req['target_qty'] - $req['issued_qty']);
                $req['percent'] = $req['target_qty'] > 0 ? min(100, round(($req['issued_qty'] / $req['target_qty']) * 100)) : 100;
                $results[] = $req;
            }

            $response = ['success' => true, 'data' => $results];
            break;

        case 'get_inventory_dashboard':
            $location_id = $_GET['location_id'] ?? 'ALL';
            $location_type = $_GET['location_type'] ?? 'ALL';
            $material_type = $_GET['material_type'] ?? 'ALL';
            $hide_zero = $_GET['hide_zero'] ?? 'false';
            $sortOption = $_GET['sort'] ?? 'DEFAULT';
            $page = max(1, (int)($_GET['page'] ?? 1));
            $limit = max(10, (int)($_GET['limit'] ?? 100));
            $offset = ($page - 1) * $limit;

            $conditions = ["i.is_active = 1"];
            $params = [];

            $search = $_GET['search'] ?? '';
            if (!empty($search)) {
                $conditions[] = "(i.part_no LIKE ? OR i.sap_no LIKE ? OR i.part_description LIKE ?)";
                $params[] = "%$search%";
                $params[] = "%$search%";
                $params[] = "%$search%";
            }

            if ($material_type !== 'ALL') {
                $conditions[] = "i.material_type = ?";
                $params[] = strtoupper($material_type);
            }

            $category = $_GET['category'] ?? 'ALL';
            if ($category !== 'ALL' && $category !== '') {
                $conditions[] = "i.material_sub_type = ?";
                $params[] = $category;
            }

            if ($hide_zero === 'true') {
                $conditions[] = "(ISNULL(Onhand.available_qty, 0) <> 0 OR ISNULL(Pending.pending_qty, 0) > 0)";
            }

            $locFilter = "";
            if ($location_id !== 'ALL' && $location_id !== '') {
                $locFilter = "AND o.location_id = " . (int)$location_id;
            } else if ($location_type !== 'ALL' && $location_type !== '') {
                $locFilter = "AND EXISTS (SELECT 1 FROM dbo.LOCATIONS loc WITH (NOLOCK) WHERE loc.location_id = o.location_id AND loc.location_type = " . $pdo->quote($location_type) . ")";
            }
            
            $whereClause = implode(" AND ", $conditions);
            $whereSQL = !empty($whereClause) ? "WHERE " . $whereClause : "";

            $countSql = "
                SELECT 
                    ISNULL(COUNT(*), 0) as total_skus,
                    ISNULL(SUM(CASE WHEN ISNULL(Onhand.available_qty, 0) <= 0 THEN 1 ELSE 0 END), 0) as out_of_stock,
                    ISNULL(SUM(ISNULL(Onhand.available_qty, 0)), 0) as toolbar_total_pcs,
                    ISNULL(SUM(ISNULL(Pending.pending_qty, 0)), 0) as total_pending_qty,
                    ISNULL(SUM(ISNULL(Onhand.available_qty, 0) * ISNULL(i.StandardPrice, 0)), 0) as total_value
                FROM dbo.ITEMS i WITH (NOLOCK)
                OUTER APPLY (
                    SELECT SUM(o.quantity) AS available_qty 
                    FROM dbo.INVENTORY_ONHAND o WITH (NOLOCK) 
                    WHERE o.parameter_id = i.item_id $locFilter
                ) Onhand
                OUTER APPLY (
                    SELECT SUM(p.qty_per_pallet) AS pending_qty 
                    FROM dbo.RM_SERIAL_TAGS p WITH (NOLOCK) 
                    WHERE p.item_id = i.item_id AND p.status = 'PENDING'
                ) Pending
                $whereSQL
            ";
            
            $kpiStmt = $pdo->prepare($countSql);
            $kpiStmt->execute($params);
            $kpi = $kpiStmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$kpi) {
                $kpi = ['total_skus' => 0, 'out_of_stock' => 0, 'total_pending_qty' => 0, 'total_value' => 0, 'toolbar_total_pcs' => 0];
            }

            $offsetInt = (int)$offset;
            $limitInt = (int)$limit;
            $orderBySQL = "ORDER BY available_qty ASC, total_value DESC"; // DEFAULT
            if ($sortOption === 'ZERO_LAST') {
                $orderBySQL = "ORDER BY CASE WHEN ISNULL(Onhand.available_qty, 0) <= 0 THEN 1 ELSE 0 END ASC, available_qty ASC, total_value DESC";
            } else if ($sortOption === 'QTY_DESC') {
                $orderBySQL = "ORDER BY available_qty DESC, total_value DESC";
            } else if ($sortOption === 'ITEM_ASC') {
                $orderBySQL = "ORDER BY item_no ASC";
            }

            $sql = "
                SELECT 
                    i.item_id,
                    i.sap_no,
                    ISNULL(i.part_no, i.sap_no) AS item_no,
                    i.part_description,
                    ISNULL(i.material_type, 'UNKNOWN') AS material_type,
                    ISNULL(Onhand.available_qty, 0) AS available_qty,
                    ISNULL(Pending.pending_qty, 0) AS pending_qty,
                    (ISNULL(Onhand.available_qty, 0) + ISNULL(Pending.pending_qty, 0)) AS total_qty,
                    ISNULL(i.StandardPrice, 0) AS unit_price,
                    (ISNULL(Onhand.available_qty, 0) * ISNULL(i.StandardPrice, 0)) AS total_value
                FROM dbo.ITEMS i WITH (NOLOCK)
                OUTER APPLY (
                    SELECT SUM(o.quantity) AS available_qty 
                    FROM dbo.INVENTORY_ONHAND o WITH (NOLOCK) 
                    WHERE o.parameter_id = i.item_id $locFilter
                ) Onhand
                OUTER APPLY (
                    SELECT SUM(p.qty_per_pallet) AS pending_qty 
                    FROM dbo.RM_SERIAL_TAGS p WITH (NOLOCK) 
                    WHERE p.item_id = i.item_id AND p.status = 'PENDING'
                ) Pending
                $whereSQL
                $orderBySQL
                OFFSET $offsetInt ROWS FETCH NEXT $limitInt ROWS ONLY
            ";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $response = [
                'success' => true, 
                'data' => $data, 
                'kpi' => $kpi,
                'pagination' => [
                    'total_records' => $kpi['total_skus'],
                    'current_page' => $page,
                    'total_pages' => ceil($kpi['total_skus'] / $limit)
                ]
            ];
            break;

        case 'get_item_details':
            $item_id = $_GET['item_id'] ?? 0;
            $location_id = $_GET['location_id'] ?? 'ALL';
            
            $condAvail = "o.parameter_id = ? AND o.quantity != 0";
            $paramsAvail = [$item_id];
            
            if ($location_id !== 'ALL') {
                $condAvail .= " AND o.location_id = ?";
                $paramsAvail[] = $location_id;
            }
            
            $stmtAvail = $pdo->prepare("SELECT l.location_id, l.location_name, SUM(o.quantity) as qty FROM dbo.INVENTORY_ONHAND o WITH (NOLOCK) JOIN dbo.LOCATIONS l WITH (NOLOCK) ON o.location_id = l.location_id WHERE $condAvail GROUP BY l.location_id, l.location_name ORDER BY qty DESC");
            $stmtAvail->execute($paramsAvail);
            $available_details = $stmtAvail->fetchAll(PDO::FETCH_ASSOC);

            $stmtPend = $pdo->prepare("SELECT ISNULL(master_pallet_no, ctn_number) as tracking_no, MAX(po_number) as po_number, SUM(qty_per_pallet) as qty FROM dbo.RM_SERIAL_TAGS WITH (NOLOCK) WHERE item_id = ? AND status = 'PENDING' GROUP BY ISNULL(master_pallet_no, ctn_number) ORDER BY qty DESC");
            $stmtPend->execute([$item_id]);
            $pending_details = $stmtPend->fetchAll(PDO::FETCH_ASSOC);

            $response = ['success' => true, 'available_details' => $available_details, 'pending_details' => $pending_details];
            break;

        case 'get_stock_ledger':
            $startDate = $_GET['start_date'] ?? date('Y-m-d', strtotime('-7 days'));
            $endDate = $_GET['end_date'] ?? date('Y-m-d');
            $search = $_GET['search'] ?? '';
            $locationId = $_GET['location_id'] ?? 'ALL';
            $locationType = $_GET['location_type'] ?? 'ALL';
            $typeFilter = $_GET['type_filter'] ?? 'ALL';
            $materialType = $_GET['material_type'] ?? 'ALL';
            $category = $_GET['category'] ?? 'ALL';
            $page = max(1, (int)($_GET['page'] ?? 1));
            $limit = max(10, (int)($_GET['limit'] ?? 100));
            $offset = ($page - 1) * $limit;
            $isExport = isset($_GET['export']) && $_GET['export'] === 'true';

            $conditions = ["t.transaction_timestamp >= ?", "t.transaction_timestamp <= ?"];
            $params = [$startDate . " 00:00:00", $endDate . " 23:59:59"];

            if ($locationId !== 'ALL') {
                $conditions[] = "(t.from_location_id = ? OR t.to_location_id = ?)";
                $params[] = $locationId;
                $params[] = $locationId;
            } else if ($locationType !== 'ALL') {
                $conditions[] = "(
                    EXISTS (SELECT 1 FROM dbo.LOCATIONS loc WITH (NOLOCK) WHERE loc.location_id = t.from_location_id AND loc.location_type = ?)
                    OR 
                    EXISTS (SELECT 1 FROM dbo.LOCATIONS loc WITH (NOLOCK) WHERE loc.location_id = t.to_location_id AND loc.location_type = ?)
                )";
                $params[] = $locationType;
                $params[] = $locationType;
            }

            if ($typeFilter !== 'ALL') {
                if ($typeFilter === 'RECEIPT') {
                    $conditions[] = "t.transaction_type LIKE '%RECEIPT%'";
                } elseif ($typeFilter === 'INTERNAL_TRANSFER') {
                    $conditions[] = "t.transaction_type LIKE '%TRANSFER%'";
                } else {
                    $conditions[] = "t.transaction_type = ?";
                    $params[] = $typeFilter;
                }
            }

            if ($materialType !== 'ALL') {
                $conditions[] = "i.material_type = ?";
                $params[] = $materialType;
            }

            if ($category !== 'ALL' && $category !== '') {
                $conditions[] = "i.material_sub_type = ?";
                $params[] = $category;
            }


            if (!empty($search)) {
                $conditions[] = "(i.sap_no LIKE ? OR i.part_no LIKE ? OR t.reference_id LIKE ? OR t.notes LIKE ? 
                    OR (t.reference_id LIKE 'REQ-%' AND EXISTS (
                        SELECT 1 FROM dbo.RM_SERIAL_TAGS tag WITH (NOLOCK) 
                        WHERE tag.serial_no LIKE ? AND tag.remark LIKE '%' + t.reference_id + '%'
                    )))";
                $searchWildcard = "%$search%";
                $params = array_merge($params, array_fill(0, 5, $searchWildcard));
            }

            $whereClause = implode(" AND ", $conditions);

            $kpiSql = "SELECT COUNT(*) as total_trans,
                              SUM(CASE WHEN t.quantity > 0 THEN t.quantity ELSE 0 END) as total_in,
                              SUM(CASE WHEN t.quantity < 0 THEN ABS(t.quantity) ELSE 0 END) as total_out
                       FROM dbo.STOCK_TRANSACTIONS t WITH (NOLOCK)
                       LEFT JOIN dbo.ITEMS i WITH (NOLOCK) ON t.parameter_id = i.item_id
                       WHERE $whereClause";
            
            $kpiStmt = $pdo->prepare($kpiSql);
            $kpiStmt->execute($params);
            $kpi = $kpiStmt->fetch(PDO::FETCH_ASSOC);

            $sql = "SELECT t.transaction_id, t.transaction_timestamp, t.transaction_type, t.quantity, t.reference_id, t.notes,
                           i.sap_no, ISNULL(i.part_no, i.sap_no) AS item_no, i.part_description,
                           t.from_location_id, t.to_location_id,
                           loc_from.location_name AS from_loc, loc_to.location_name AS to_loc,
                           ISNULL(e.name_th, u.username) AS actor_name
                    FROM dbo.STOCK_TRANSACTIONS t WITH (NOLOCK)
                    LEFT JOIN dbo.ITEMS i WITH (NOLOCK) ON t.parameter_id = i.item_id
                    LEFT JOIN dbo.LOCATIONS loc_from WITH (NOLOCK) ON t.from_location_id = loc_from.location_id
                    LEFT JOIN dbo.LOCATIONS loc_to WITH (NOLOCK) ON t.to_location_id = loc_to.location_id
                    LEFT JOIN dbo.USERS u WITH (NOLOCK) ON t.created_by_user_id = u.id
                    LEFT JOIN dbo.MANPOWER_EMPLOYEES e WITH (NOLOCK) ON u.emp_id = e.emp_id
                    WHERE $whereClause
                    ORDER BY t.transaction_timestamp DESC";

            if (!$isExport) {
                $offsetInt = (int)$offset;
                $limitInt = (int)$limit;
                $sql .= " OFFSET $offsetInt ROWS FETCH NEXT $limitInt ROWS ONLY";
            }

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            
            $response = [
                'success' => true, 
                'data' => $stmt->fetchAll(PDO::FETCH_ASSOC), 
                'kpi' => $kpi,
                'pagination' => $isExport ? null : [
                    'total_records' => $kpi['total_trans'], 
                    'current_page' => $page, 
                    'total_pages' => ceil($kpi['total_trans'] / $limit)
                ]
            ];
            break;

        case 'create_transfer_request':
            $item_id = (int)($_POST['item_id'] ?? 0);
            $from_loc_id = (int)($_POST['from_loc_id'] ?? 0);
            $to_loc_id = (int)($_POST['to_loc_id'] ?? 0);
            $qty = (float)($_POST['quantity'] ?? 0);
            $remark = trim($_POST['remark'] ?? '');

            if ($item_id === 0 || $from_loc_id === 0 || $to_loc_id === 0 || $qty <= 0) {
                throw new Exception("ข้อมูลไม่ครบถ้วน (Item, Locations, Qty)");
            }
            if ($from_loc_id === $to_loc_id) {
                throw new Exception("คลังต้นทางและปลายทางต้องไม่ซ้ำกัน");
            }

            $uuid = 'TRF-' . strtoupper(substr(md5(uniqid()), 0, 8));
            $sql = "INSERT INTO dbo.STOCK_TRANSFER_ORDERS 
                    (transfer_uuid, item_id, quantity, from_location_id, to_location_id, status, created_by_user_id, notes, created_at) 
                    VALUES (?, ?, ?, ?, ?, 'PENDING', ?, ?, GETDATE())";
            
            $pdo->prepare($sql)->execute([$uuid, $item_id, $qty, $from_loc_id, $to_loc_id, $currentUser['id'], $remark]);
            
            $response = ['success' => true, 'message' => 'สร้างรายการรอโอนย้ายสำเร็จ'];
            break;

        case 'get_pending_transfers':
            $typeFilter = $_GET['type'] ?? 'ALL';
            $search = $_GET['search'] ?? '';
            $page = max(1, (int)($_GET['page'] ?? 1));
            $limit = max(10, (int)($_GET['limit'] ?? 100));
            $offset = ($page - 1) * $limit;
            $conditions = [
                "t.status = 'PENDING'",
                "(t.transfer_uuid LIKE 'TRF-%' OR t.transfer_uuid LIKE 'REQ-%')"
            ];
            $params = [];

            if ($typeFilter === 'REPLACEMENT') {
                $conditions[] = "t.notes LIKE '%Replacement:%'";
            } elseif ($typeFilter === 'NORMAL') {
                $conditions[] = "(t.notes NOT LIKE '%Replacement:%' OR t.notes IS NULL)";
            }

            if (!empty($search)) {
                $conditions[] = "(i.sap_no LIKE ? OR i.part_no LIKE ? OR t.notes LIKE ?)";
                $searchWildcard = "%$search%";
                array_push($params, $searchWildcard, $searchWildcard, $searchWildcard);
            }

            $whereClause = implode(" AND ", $conditions);
            $countSql = "SELECT COUNT(*) 
                         FROM dbo.STOCK_TRANSFER_ORDERS t WITH (NOLOCK)
                         JOIN dbo.ITEMS i WITH (NOLOCK) ON t.item_id = i.item_id
                         WHERE $whereClause";
            $countStmt = $pdo->prepare($countSql);
            $countStmt->execute($params);
            $totalRecords = (int)$countStmt->fetchColumn();
            
            $sql = "SELECT t.transfer_id, t.transfer_uuid, t.quantity, t.created_at, t.notes,
                           ISNULL(i.part_no, i.sap_no) AS item_no, i.part_description,
                           loc_from.location_name AS from_loc, loc_to.location_name AS to_loc,
                           ISNULL(e.name_th, u.username) AS requester
                    FROM dbo.STOCK_TRANSFER_ORDERS t WITH (NOLOCK)
                    JOIN dbo.ITEMS i WITH (NOLOCK) ON t.item_id = i.item_id
                    JOIN dbo.LOCATIONS loc_from WITH (NOLOCK) ON t.from_location_id = loc_from.location_id
                    JOIN dbo.LOCATIONS loc_to WITH (NOLOCK) ON t.to_location_id = loc_to.location_id
                    LEFT JOIN dbo.USERS u WITH (NOLOCK) ON t.created_by_user_id = u.id
                    LEFT JOIN dbo.MANPOWER_EMPLOYEES e WITH (NOLOCK) ON u.emp_id = e.emp_id
                    WHERE $whereClause
                    ORDER BY t.created_at ASC
                    OFFSET $offset ROWS FETCH NEXT $limit ROWS ONLY"; 
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $totalBadgeCount = $pdo->query("SELECT COUNT(*) FROM dbo.STOCK_TRANSFER_ORDERS WITH (NOLOCK) WHERE status = 'PENDING' AND transfer_uuid NOT LIKE '%-[0-9][0-9][0-9]' AND transfer_uuid NOT LIKE '%-[0-9][0-9][0-9][0-9]' AND transfer_uuid NOT LIKE '%-[0-9][0-9][0-9][0-9][0-9]'")->fetchColumn();

            $response = [
                'success' => true, 
                'data' => $data, 
                'count' => $totalBadgeCount,
                'pagination' => [
                    'total_records' => $totalRecords,
                    'current_page' => $page,
                    'total_pages' => ceil($totalRecords / $limit)
                ]
            ];
            break;

        case 'process_transfer_request':
            if (!hasPermission('manage_warehouse')) { throw new Exception("Unauthorized: ไม่มีสิทธิ์การจัดการคลังสินค้า"); }
            $transfer_id = (int)($_POST['transfer_id'] ?? 0);
            $action_status = $_POST['action_status'] ?? '';

            if ($transfer_id === 0 || !in_array($action_status, ['COMPLETED', 'CANCELLED'])) {
                throw new Exception("คำสั่งไม่ถูกต้อง");
            }

            $transferIdsJson = json_encode([$transfer_id]);
            
            $stmt = $pdo->prepare("EXEC dbo.sp_Store_ProcessTransferBatch @TransferIdsJson = ?, @ActionStatus = ?, @UserId = ?");
            $stmt->execute([$transferIdsJson, $action_status, $currentUser['id']]);
            
            $msg = $action_status === 'COMPLETED' ? "โอนย้ายสต็อกสำเร็จ!" : "ยกเลิกรายการสำเร็จ!";
            $response = ['success' => true, 'message' => $msg];
            break;

        case 'bulk_process_transfer_request':
            if (!hasPermission('manage_warehouse')) { throw new Exception("Unauthorized: ไม่มีสิทธิ์การจัดการคลังสินค้า"); }
            $transferIdsJson = is_string($_POST['transfer_ids']) ? $_POST['transfer_ids'] : json_encode($_POST['transfer_ids']);
            $action_status = $_POST['action_status'] ?? '';

            if (empty($transferIdsJson) || $transferIdsJson === '[]' || !in_array($action_status, ['COMPLETED', 'CANCELLED'])) {
                throw new Exception("ข้อมูลไม่ถูกต้อง");
            }

            $stmt = $pdo->prepare("EXEC dbo.sp_Store_ProcessTransferBatch @TransferIdsJson = ?, @ActionStatus = ?, @UserId = ?");
            $stmt->execute([$transferIdsJson, $action_status, $currentUser['id']]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            $successCount = $result['affected_rows'] ?? 0;

            $response = ['success' => true, 'message' => "ดำเนินการเสร็จสิ้นจำนวน $successCount รายการ"];
            break;

        case 'create_request':
            $input = json_decode(file_get_contents("php://input"), true);
            if (empty($input['item_id']) || empty($input['store_location_id'])) throw new Exception("ข้อมูลไม่ครบถ้วน (Item หรือ Store)");

            $pdo->beginTransaction();
            $item_id = $input['item_id']; $qty = floatval($input['quantity']); $wip_loc = $input['wip_location_id']; $store_loc = $input['store_location_id'];
            $defect_source = $input['defect_source'] ?? 'SNC'; $raw_reason = trim($input['reason']);
            if ($qty <= 0) throw new Exception("จำนวนต้องมากกว่า 0");

            $full_reason = "[$defect_source] $raw_reason"; $timestamp = date('Y-m-d H:i:s');

            $spStock = $pdo->prepare("EXEC dbo.sp_UpdateOnhandBalance @item_id = ?, @location_id = ?, @quantity_to_change = ?");
            $spStock->execute([$item_id, $wip_loc, -$qty]);

            $pdo->prepare("INSERT INTO dbo.STOCK_TRANSACTIONS (parameter_id, quantity, transaction_type, from_location_id, created_by_user_id, notes, transaction_timestamp) VALUES (?, ?, 'SCRAP', ?, ?, ?, ?)")->execute([$item_id, -$qty, $wip_loc, $currentUser['id'], "Defect: $full_reason", $timestamp]);

            $uuid = 'REQ-' . strtoupper(uniqid());
            $pdo->prepare("INSERT INTO dbo.STOCK_TRANSFER_ORDERS (transfer_uuid, item_id, quantity, from_location_id, to_location_id, status, created_by_user_id, notes, created_at) VALUES (?, ?, ?, ?, ?, 'PENDING', ?, ?, ?)")->execute([$uuid, $item_id, $qty, $store_loc, $wip_loc, $currentUser['id'], "Replacement: $full_reason", $timestamp]);

            $pdo->commit();
            $response = ['success' => true, 'message' => 'บันทึกของเสียและส่งคำขอเบิกแล้ว'];
            break;

        case 'approve_request':
            $input = json_decode(file_get_contents("php://input"), true);
            if (!hasPermission('manage_warehouse')) {
                throw new Exception("Unauthorized: ไม่มีสิทธิ์อนุมัติการเบิกจ่าย");
            }

            $pdo->beginTransaction();
            $transfer_id = $input['transfer_id'];
            
            $reqStmt = $pdo->prepare("SELECT * FROM dbo.STOCK_TRANSFER_ORDERS WITH (UPDLOCK) WHERE transfer_id = ?");
            $reqStmt->execute([$transfer_id]);
            $req = $reqStmt->fetch(PDO::FETCH_ASSOC);

            if (!$req) throw new Exception("ไม่พบรายการ");
            if ($req['status'] !== 'PENDING') throw new Exception("รายการนี้ถูกดำเนินการไปแล้ว");

            $qty = floatval($req['quantity']); $timestamp = date('Y-m-d H:i:s');

            $spStock = $pdo->prepare("EXEC dbo.sp_UpdateOnhandBalance @item_id = ?, @location_id = ?, @quantity_to_change = ?");
            $spStock->execute([$req['item_id'], $req['from_location_id'], -$qty]); 
            $spStock->execute([$req['item_id'], $req['to_location_id'], $qty]);

            $pdo->prepare("UPDATE dbo.STOCK_TRANSFER_ORDERS SET status = 'COMPLETED', confirmed_by_user_id = ?, confirmed_at = ? WHERE transfer_id = ?")->execute([$currentUser['id'], $timestamp, $transfer_id]);
            $pdo->prepare("INSERT INTO dbo.STOCK_TRANSACTIONS (parameter_id, quantity, transaction_type, from_location_id, to_location_id, created_by_user_id, reference_id, transaction_timestamp, notes) VALUES (?, ?, 'INTERNAL_TRANSFER', ?, ?, ?, ?, ?, ?)")->execute([$req['item_id'], $qty, $req['from_location_id'], $req['to_location_id'], $currentUser['id'], $req['transfer_uuid'], $timestamp, "Approved Replacement"]);

            $pdo->commit();
            $response = ['success' => true, 'message' => 'อนุมัติจ่ายของเรียบร้อย'];
            break;

        case 'reject_request':
            $input = json_decode(file_get_contents("php://input"), true);
            if (!hasPermission('manage_warehouse')) {
                throw new Exception("Unauthorized: ไม่มีสิทธิ์อนุมัติการเบิกจ่าย");
            }
            
            $pdo->beginTransaction();
            $transfer_id = $input['transfer_id'];
            $reason = trim($input['reject_reason'] ?? '');
            
            $reqStmt = $pdo->prepare("SELECT status FROM dbo.STOCK_TRANSFER_ORDERS WITH (UPDLOCK) WHERE transfer_id = ?");
            $reqStmt->execute([$transfer_id]);
            $currentStatus = $reqStmt->fetchColumn();

            if (!$currentStatus) throw new Exception("ไม่พบรายการ");
            if ($currentStatus !== 'PENDING') throw new Exception("รายการนี้ถูกดำเนินการไปแล้ว");

            $pdo->prepare("UPDATE dbo.STOCK_TRANSFER_ORDERS SET status = 'REJECTED', confirmed_by_user_id = ?, confirmed_at = GETDATE(), notes = ISNULL(notes,'') + ' | Reject Reason: ' + ? WHERE transfer_id = ?")->execute([$currentUser['id'], $reason, $transfer_id]);

            $pdo->commit();
            $response = ['success' => true, 'message' => 'ปฏิเสธคำขอเรียบร้อย'];
            break;

        case 'bulk_approve_requests':
            $input = json_decode(file_get_contents("php://input"), true);
            if (!hasPermission('manage_warehouse')) {
                throw new Exception("Unauthorized: ไม่มีสิทธิ์อนุมัติการเบิกจ่าย");
            }
            if (!isset($input['transfer_ids']) || !is_array($input['transfer_ids']) || count($input['transfer_ids']) === 0) {
                throw new Exception("กรุณาเลือกอย่างน้อย 1 รายการ");
            }

            $pdo->beginTransaction();
            $timestamp = date('Y-m-d H:i:s');
            
            $reqStmt = $pdo->prepare("SELECT * FROM dbo.STOCK_TRANSFER_ORDERS WITH (UPDLOCK) WHERE transfer_id = ?");
            $spStock = $pdo->prepare("EXEC dbo.sp_UpdateOnhandBalance @item_id = ?, @location_id = ?, @quantity_to_change = ?");
            $updateStmt = $pdo->prepare("UPDATE dbo.STOCK_TRANSFER_ORDERS SET status = 'COMPLETED', confirmed_by_user_id = ?, confirmed_at = ? WHERE transfer_id = ?");
            $insertTxn = $pdo->prepare("INSERT INTO dbo.STOCK_TRANSACTIONS (parameter_id, quantity, transaction_type, from_location_id, to_location_id, created_by_user_id, reference_id, transaction_timestamp, notes) VALUES (?, ?, 'INTERNAL_TRANSFER', ?, ?, ?, ?, ?, ?)");

            $processedCount = 0;
            foreach ($input['transfer_ids'] as $transfer_id) {
                $reqStmt->execute([$transfer_id]);
                $req = $reqStmt->fetch(PDO::FETCH_ASSOC);

                if ($req && $req['status'] === 'PENDING') {
                    $qty = floatval($req['quantity']);
                    
                    $spStock->execute([$req['item_id'], $req['from_location_id'], -$qty]); 
                    $spStock->execute([$req['item_id'], $req['to_location_id'], $qty]);

                    $updateStmt->execute([$currentUser['id'], $timestamp, $transfer_id]);
                    $insertTxn->execute([$req['item_id'], $qty, $req['from_location_id'], $req['to_location_id'], $currentUser['id'], $req['transfer_uuid'], $timestamp, "Approved Replacement (Bulk)"]);
                    $processedCount++;
                }
            }

            $pdo->commit();
            $response = ['success' => true, 'message' => "อนุมัติจ่ายของสำเร็จ $processedCount รายการ"];
            break;

        case 'bulk_reject_requests':
            $input = json_decode(file_get_contents("php://input"), true);
            if (!hasPermission('manage_warehouse')) {
                throw new Exception("Unauthorized: ไม่มีสิทธิ์อนุมัติการเบิกจ่าย");
            }
            if (!isset($input['transfer_ids']) || !is_array($input['transfer_ids']) || count($input['transfer_ids']) === 0) {
                throw new Exception("กรุณาเลือกอย่างน้อย 1 รายการ");
            }
            
            $pdo->beginTransaction();
            $reason = trim($input['reject_reason'] ?? 'Bulk Rejected by Admin');
            
            $reqStmt = $pdo->prepare("SELECT status FROM dbo.STOCK_TRANSFER_ORDERS WITH (UPDLOCK) WHERE transfer_id = ?");
            $updateStmt = $pdo->prepare("UPDATE dbo.STOCK_TRANSFER_ORDERS SET status = 'REJECTED', confirmed_by_user_id = ?, confirmed_at = GETDATE(), notes = ISNULL(notes,'') + ' | Reject Reason: ' + ? WHERE transfer_id = ?");

            $processedCount = 0;
            foreach ($input['transfer_ids'] as $transfer_id) {
                $reqStmt->execute([$transfer_id]);
                $currentStatus = $reqStmt->fetchColumn();

                if ($currentStatus === 'PENDING') {
                    $updateStmt->execute([$currentUser['id'], $reason, $transfer_id]);
                    $processedCount++;
                }
            }

            $pdo->commit();
            $response = ['success' => true, 'message' => "ปฏิเสธคำขอสำเร็จ $processedCount รายการ"];
            break;

        case 'get_scrap_requests':
            $status = $_GET['status'] ?? 'ALL';
            $search = $_GET['search'] ?? '';
            $startDate = $_GET['start_date'] ?? '';
            $endDate = $_GET['end_date'] ?? '';
            $isExport = isset($_GET['export']) && $_GET['export'] === 'true';

            $page = max(1, (int)($_GET['page'] ?? 1));
            $limit = max(10, (int)($_GET['limit'] ?? 100));
            $offset = ($page - 1) * $limit;
            
            $filterLine = $_GET['line'] ?? '';
            $filterTeam = $_GET['team'] ?? '';

            $conditions = [
                "1=1",
                "t.transfer_uuid LIKE 'REQ-%'"
            ];
            $params = [];

            if ($status !== 'ALL') { $conditions[] = "t.status = ?"; $params[] = $status; }
            if (!empty($startDate)) { $conditions[] = "t.created_at >= ?"; $params[] = $startDate . ' 00:00:00'; }
            if (!empty($endDate)) { $conditions[] = "t.created_at <= ?"; $params[] = $endDate . ' 23:59:59'; }
            
            if (!empty($filterLine)) {
                $conditions[] = "loc_to.production_line = ?";
                $params[] = $filterLine;
            }
            if (!empty($filterTeam)) {
                $conditions[] = "u.team_group = ?";
                $params[] = $filterTeam;
            }

            if (!empty($search)) {
                $conditions[] = "(i.sap_no LIKE ? OR i.part_no LIKE ? OR t.transfer_uuid LIKE ? OR e.name_th LIKE ?)";
                $searchParam = "%$search%";
                $params = array_merge($params, array_fill(0, 4, $searchParam));
            }

            if (in_array($currentUser['role'], ['admin', 'creator', 'qa', 'qa_qc', 'qc'])) {
                // Admin and QA sees all
            } else if ($currentUser['role'] === 'supervisor') {
                $conditions[] = "(loc_to.production_line = ? OR t.created_by_user_id = ?)";
                $params[] = $currentUser['line'] ?? '';
                $params[] = $currentUser['id'];
            } else {
                $conditions[] = "t.created_by_user_id = ?";
                $params[] = $currentUser['id'];
            }

            $whereClause = "WHERE " . implode(' AND ', $conditions);

            $kpiSql = "SELECT COUNT(t.transfer_id) as total_count, ISNULL(SUM(t.quantity), 0) as total_qty, ISNULL(SUM(t.quantity * ISNULL(i.Cost_Total, 0)), 0) as total_cost
                       FROM dbo.STOCK_TRANSFER_ORDERS t WITH (NOLOCK)
                       JOIN dbo.ITEMS i WITH (NOLOCK) ON t.item_id = i.item_id
                       JOIN dbo.LOCATIONS loc_from WITH (NOLOCK) ON t.from_location_id = loc_from.location_id
                       JOIN dbo.LOCATIONS loc_to WITH (NOLOCK) ON t.to_location_id = loc_to.location_id
                       LEFT JOIN dbo.USERS u WITH (NOLOCK) ON t.created_by_user_id = u.id
                       LEFT JOIN dbo.MANPOWER_EMPLOYEES e WITH (NOLOCK) ON u.emp_id = e.emp_id
                       $whereClause";
            
            $kpiStmt = $pdo->prepare($kpiSql);
            $kpiStmt->execute($params);
            $kpi = $kpiStmt->fetch(PDO::FETCH_ASSOC);

            $sql = "SELECT t.transfer_id, t.transfer_uuid, t.quantity, t.created_at, i.sap_no, ISNULL(i.part_no, i.sap_no) as part_no, i.part_description, ISNULL(i.Cost_Total, 0) as unit_cost, loc_from.location_name as from_loc, loc_to.location_name as to_loc, t.status, t.notes, ISNULL(e.name_th, u.username) as requester, ISNULL(approver.username, '-') as approver
                    FROM dbo.STOCK_TRANSFER_ORDERS t WITH (NOLOCK)
                    JOIN dbo.ITEMS i WITH (NOLOCK) ON t.item_id = i.item_id
                    JOIN dbo.LOCATIONS loc_from WITH (NOLOCK) ON t.from_location_id = loc_from.location_id
                    JOIN dbo.LOCATIONS loc_to WITH (NOLOCK) ON t.to_location_id = loc_to.location_id
                    LEFT JOIN dbo.USERS u WITH (NOLOCK) ON t.created_by_user_id = u.id
                    LEFT JOIN dbo.MANPOWER_EMPLOYEES e WITH (NOLOCK) ON u.emp_id = e.emp_id
                    LEFT JOIN dbo.USERS approver WITH (NOLOCK) ON t.confirmed_by_user_id = approver.id
                    $whereClause
                    ORDER BY t.created_at DESC";

            if (!$isExport) {
                $offsetInt = (int)$offset;
                $limitInt = (int)$limit;
                $sql .= " OFFSET $offsetInt ROWS FETCH NEXT $limitInt ROWS ONLY";
            }

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            

            $response = [
                'success' => true, 'data' => $data, 'kpi' => $kpi,
                'pagination' => $isExport ? null : ['total_records' => $kpi['total_count'], 'current_page' => $page, 'total_pages' => ceil($kpi['total_count'] / $limit)]
            ];
            break;

        case 'submit_cycle_count':
            $item_id = (int)($_POST['item_id'] ?? 0);
            $location_id = (int)($_POST['location_id'] ?? 0);
            $actual_qty = (float)($_POST['actual_qty'] ?? -1);
            $remark = trim($_POST['remark'] ?? '');
            $userId = $_SESSION['user']['id'];

            if ($item_id === 0 || $location_id === 0 || $actual_qty < 0) {
                throw new Exception("ข้อมูลไม่ครบถ้วน (Item, Location หรือยอดนับจริงไม่ถูกต้อง)");
            }

            $checkStmt = $pdo->prepare("SELECT COUNT(*) FROM dbo.INVENTORY_CYCLE_COUNTS WITH (NOLOCK) WHERE item_id = ? AND location_id = ? AND status = 'PENDING'");
            $checkStmt->execute([$item_id, $location_id]);
            if ($checkStmt->fetchColumn() > 0) {
                throw new Exception("มีรายการขอปรับยอดของสินค้านี้ในคลังนี้ รออนุมัติอยู่แล้ว กรุณารอการอนุมัติก่อน");
            }

            $stmt = $pdo->prepare("EXEC dbo.sp_Store_SubmitCycleCount @location_id=?, @item_id=?, @serial_no=NULL, @actual_qty=?, @user_id=?, @remark=?");
            $stmt->execute([$location_id, $item_id, $actual_qty, $userId, $remark]);

            $response = ['success' => true, 'message' => 'ส่งคำขอปรับยอดสต็อกเรียบร้อยแล้ว'];
            break;

        case 'approve_cycle_count':
            $count_id = (int)($_POST['count_id'] ?? 0);
            $approval_action = $_POST['approval_action'] ?? ''; 
            $userId = $_SESSION['user']['id'];

            if (!hasPermission('manage_warehouse')) {
                throw new Exception("Unauthorized: ไม่มีสิทธิ์อนุมัติการปรับยอดสต็อก");
            }

            if ($count_id === 0 || !in_array($approval_action, ['APPROVE', 'REJECT'])) {
                throw new Exception("ข้อมูลไม่ถูกต้อง");
            }

            $stmt = $pdo->prepare("EXEC dbo.sp_Store_ApproveCycleCount @count_id=?, @action=?, @user_id=?");
            $stmt->execute([$count_id, $approval_action, $userId]);

            $response = ['success' => true, 'message' => 'ดำเนินการเรียบร้อยแล้ว'];
            break;

        case 'get_pending_counts':
            $sql = "
                SELECT 
                    c.count_id, c.count_date, c.system_qty, c.actual_qty, c.diff_qty, c.remark, c.counted_at,
                    i.sap_no, ISNULL(i.part_no, i.sap_no) AS item_no, i.part_description,
                    l.location_name,
                    ISNULL(e.name_th, u.username) AS counter_name
                FROM dbo.INVENTORY_CYCLE_COUNTS c WITH (NOLOCK)
                JOIN dbo.ITEMS i WITH (NOLOCK) ON c.item_id = i.item_id
                JOIN dbo.LOCATIONS l WITH (NOLOCK) ON c.location_id = l.location_id
                LEFT JOIN dbo.USERS u WITH (NOLOCK) ON c.counted_by_user_id = u.id
                LEFT JOIN dbo.MANPOWER_EMPLOYEES e WITH (NOLOCK) ON u.emp_id = e.emp_id
                WHERE c.status = 'PENDING'
                ORDER BY c.counted_at ASC
            ";
            $stmt = $pdo->query($sql);
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $response = ['success' => true, 'data' => $data, 'count' => count($data)];
            break;

        case 'get_cycle_count_history':
            $sql = "
                SELECT 
                    c.count_id, c.count_date, c.system_qty, c.actual_qty, c.diff_qty, c.remark, c.counted_at, c.status, c.approved_at,
                    i.sap_no, ISNULL(i.part_no, i.sap_no) AS item_no, i.part_description,
                    l.location_name,
                    ISNULL(e1.name_th, u1.username) AS counter_name,
                    ISNULL(e2.name_th, u2.username) AS approver_name
                FROM dbo.INVENTORY_CYCLE_COUNTS c WITH (NOLOCK)
                JOIN dbo.ITEMS i WITH (NOLOCK) ON c.item_id = i.item_id
                JOIN dbo.LOCATIONS l WITH (NOLOCK) ON c.location_id = l.location_id
                LEFT JOIN dbo.USERS u1 WITH (NOLOCK) ON c.counted_by_user_id = u1.id
                LEFT JOIN dbo.MANPOWER_EMPLOYEES e1 WITH (NOLOCK) ON u1.emp_id = e1.emp_id
                LEFT JOIN dbo.USERS u2 WITH (NOLOCK) ON c.approved_by_user_id = u2.id
                LEFT JOIN dbo.MANPOWER_EMPLOYEES e2 WITH (NOLOCK) ON u2.emp_id = e2.emp_id
                WHERE c.status IN ('APPROVED', 'REJECTED')
                ORDER BY c.approved_at DESC
                OFFSET 0 ROWS FETCH NEXT 200 ROWS ONLY
            ";
            $stmt = $pdo->query($sql);
            $response = ['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)];
            break;

        case 'issue_rm':
        case 'issue_selected_tags':
            $serials = $_POST['serials'] ?? $_POST['barcode'] ?? '';
            $to_location = (int)($_POST['to_location'] ?? 0);
            $ignore_fifo = isset($_POST['ignore_fifo']) && $_POST['ignore_fifo'] === 'true'; 

            if (empty($serials) || $to_location == 0) {
                throw new Exception("ข้อมูลไม่ครบถ้วน (ยังไม่ได้เลือก Tag หรือ โลเคชั่น)");
            }

            $serialList = explode(',', $serials);
            $placeholders = implode(',', array_fill(0, count($serialList), '?'));

            if (!$ignore_fifo) {
                $fifoSql = "
                    SELECT TOP 1
                        req.serial_no AS requested_serial, i.part_no, req.received_date AS requested_date,
                        older.serial_no AS older_serial, older.received_date AS older_date, 
                        older.warehouse_no, older.master_pallet_no
                    FROM dbo.RM_SERIAL_TAGS req WITH (NOLOCK)
                    JOIN dbo.ITEMS i WITH (NOLOCK) ON req.item_id = i.item_id
                    CROSS APPLY (
                        SELECT TOP 1 t.serial_no, t.received_date, t.warehouse_no, t.master_pallet_no
                        FROM dbo.RM_SERIAL_TAGS t WITH (NOLOCK)
                        WHERE t.item_id = req.item_id AND t.status = 'AVAILABLE'
                          AND (t.received_date < req.received_date OR (t.received_date = req.received_date AND t.created_at < req.created_at))
                          AND t.serial_no NOT IN ($placeholders)
                        ORDER BY t.received_date ASC, t.created_at ASC
                    ) older
                    WHERE req.serial_no IN ($placeholders)
                ";
                $fifoParams = array_merge($serialList, $serialList);
                $fifoStmt = $pdo->prepare($fifoSql);
                $fifoStmt->execute($fifoParams);
                $fifoViolation = $fifoStmt->fetch(PDO::FETCH_ASSOC);

                if ($fifoViolation) {
                    $partNo = $fifoViolation['part_no'];
                    $oldRef = $fifoViolation['master_pallet_no'] ? "พาเลท " . $fifoViolation['master_pallet_no'] : "ป้าย " . $fifoViolation['older_serial'];
                    $oldDate = date('d/m/Y H:i', strtotime($fifoViolation['older_date']));
                    $oldLoc = $fifoViolation['warehouse_no'] ? "พิกัด: " . $fifoViolation['warehouse_no'] : "ไม่ระบุพิกัด";
                    
                    $response = [
                        'success' => true, 
                        'require_fifo_confirm' => true,
                        'message' => "พบวัตถุดิบ [{$partNo}] ที่เก่ากว่าค้างอยู่ในคลัง\nแนะนำให้เบิก {$oldRef} ({$oldLoc})\nที่รับเข้าเมื่อ {$oldDate} มาใช้ก่อน\n\nคุณยืนยันที่จะจ่าย Tag ล็อตนี้เลยหรือไม่?"
                    ];
                    break;
                }
            }

            $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_SILENT);
            $stmt = $pdo->prepare("EXEC dbo.sp_Store_IssueSpecificTags @SerialNumbers=?, @ToLocationID=?, @UserID=?");
            $success = $stmt->execute([$serials, $to_location, $currentUser['id']]);
            $errors = $stmt->errorInfo();
            $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION); 

            if (!$success && isset($errors[0]) && !in_array($errors[0], ['00000', '01000', '01003'])) {
                throw new Exception($errors[2] ?? "เกิดข้อผิดพลาดในการรันคำสั่ง");
            }

            $issuedTags = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $response = ['success' => true, 'issued_count' => count($issuedTags), 'issued_tags' => $issuedTags];
            break;

        case 'get_print_tags':
            $serials = $_POST['serials'] ?? '';
            if(empty($serials)) throw new Exception("ไม่มีรายการให้ปริ้นท์");
            
            $serialList = explode(',', $serials);
            $placeholders = implode(',', array_fill(0, count($serialList), '?'));
            
            $sql = "SELECT 
                        t.serial_no, 
                        i.sap_no AS item_no,
                        ISNULL(i.part_no, i.sap_no) AS part_no, 
                        i.part_description, 
                        ISNULL(i.material_type, '') AS category,
                        t.current_qty AS qty, 
                        t.qty_per_pallet,
                        t.po_number, 
                        t.received_date,
                        t.warehouse_no,
                        t.pallet_no,
                        t.ctn_number,
                        t.week_no,
                        t.remark
                    FROM dbo.RM_SERIAL_TAGS t WITH (NOLOCK)
                    LEFT JOIN dbo.ITEMS i WITH (NOLOCK) ON t.item_id = i.item_id
                    WHERE t.serial_no IN ($placeholders)";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute($serialList);
            $response = ['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)];
            break;

        case 'import_excel':
            if (!hasPermission('manage_warehouse')) { throw new Exception("Unauthorized: ไม่มีสิทธิ์การจัดการคลังสินค้า"); }
            $jsonData = $_POST['data'] ?? '';
            if (empty($jsonData)) throw new Exception("ไม่พบข้อมูลสำหรับการนำเข้า");

            $stmt = $pdo->prepare("EXEC dbo.sp_Store_ImportRMShipping @JsonData = ?, @UserId = ?");
            $stmt->execute([$jsonData, $currentUser['id']]);
            $importedData = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $response = ['success' => true, 'data' => $importedData];
            break;

        case 'receive_scanned_tag':
            $barcode = trim($_POST['barcode'] ?? '');
            $location_id = (int)($_POST['location_id'] ?? 0);
            
            if (empty($barcode) || $location_id === 0) {
                throw new Exception("ข้อมูลไม่ครบถ้วน (Barcode หรือ Location)");
            }

            $mode = (strpos($barcode, 'MPL-') === 0) ? 'PALLET' : 'SERIAL';
            
            $stmt = $pdo->prepare("EXEC dbo.sp_Store_ScanReceiveRM @ScanMode=?, @BarcodeValue=?, @LocationID=?, @UserID=?");
            $stmt->execute([$mode, $barcode, $location_id, $currentUser['id']]);
            
            $response = ['success' => true, 'message' => 'รับเข้าสำเร็จ'];
            break;

        case 'group_master_pallet':
            if (!hasPermission('manage_warehouse')) { throw new Exception("Unauthorized: ไม่มีสิทธิ์การจัดการคลังสินค้า"); }
            $serials = json_decode($_POST['serials'], true);
            if (!is_array($serials) || empty($serials)) throw new Exception("ไม่มีข้อมูลที่เลือกจัดพาเลท");

            $pdo->beginTransaction();
            $prefix = 'MPL-' . date('ym') . '-';
            $stmtLast = $pdo->query("SELECT TOP 1 master_pallet_no FROM dbo.RM_SERIAL_TAGS WITH (UPDLOCK) WHERE master_pallet_no LIKE '" . $prefix . "[0-9][0-9][0-9][0-9]' ORDER BY master_pallet_no DESC");
            $lastNo = $stmtLast->fetchColumn();
            $nextSeq = $lastNo ? ((int)substr($lastNo, -4)) + 1 : 1;
            $newMasterPalletNo = $prefix . str_pad($nextSeq, 4, '0', STR_PAD_LEFT);
            
            $placeholders = implode(',', array_fill(0, count($serials), '?'));
            $updStmt = $pdo->prepare("UPDATE dbo.RM_SERIAL_TAGS SET master_pallet_no = ? WHERE serial_no IN ($placeholders) AND status = 'PENDING'");            
            $params = array_merge([$newMasterPalletNo], $serials);
            $updStmt->execute($params);

            if ($updStmt->rowCount() == 0) throw new Exception("ไม่สามารถจัดกลุ่มได้ (อาจมีบางรายการถูกรับเข้าสต็อกไปแล้ว)");

            $selStmt = $pdo->prepare("
                SELECT 
                    MAX(t.master_pallet_no) AS master_pallet_no, MAX(i.part_no) AS item_no, MAX(i.part_description) AS part_description,
                    COUNT(DISTINCT i.item_id) AS distinct_items, MAX(t.po_number) AS po_number, COUNT(*) AS total_tags, SUM(t.qty_per_pallet) AS total_qty
                FROM dbo.RM_SERIAL_TAGS t WITH (NOLOCK)
                JOIN dbo.ITEMS i WITH (NOLOCK) ON t.item_id = i.item_id
                WHERE t.master_pallet_no = ?
            ");
            $selStmt->execute([$newMasterPalletNo]);
            $masterData = $selStmt->fetch(PDO::FETCH_ASSOC);

            $pdo->commit();
            $response = ['success' => true, 'data' => $masterData];
            break;

        case 'delete_tag':
            if (!hasPermission('manage_warehouse')) { throw new Exception("Unauthorized: ไม่มีสิทธิ์การจัดการคลังสินค้า"); }
            $serial_no = $_POST['serial_no'] ?? '';
            if (empty($serial_no)) throw new Exception("ไม่พบ Serial No.");

            $checkStmt = $pdo->prepare("SELECT status FROM dbo.RM_SERIAL_TAGS WITH (NOLOCK) WHERE serial_no = ?");
            $checkStmt->execute([$serial_no]);
            $tagStatus = $checkStmt->fetchColumn();

            if (!$tagStatus) throw new Exception('ไม่พบข้อมูล Tag นี้ในระบบ');
            if (!in_array($tagStatus, ['PENDING', 'AVAILABLE'])) {
                throw new Exception('ไม่อนุญาตให้ลบ เนื่องจากวัตถุดิบนี้ถูกเบิกจ่าย หรือเข้าสู่กระบวนการผลิตแล้ว!');
            }

            try {
                // Check if table DELETED_SERIAL_TAGS exists. If not, create it automatically.
                $pdo->exec("
                    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='DELETED_SERIAL_TAGS' and xtype='U')
                    CREATE TABLE dbo.DELETED_SERIAL_TAGS (
                        deleted_id INT IDENTITY(1,1) PRIMARY KEY,
                        serial_no VARCHAR(50) NOT NULL,
                        master_pallet_no VARCHAR(50) NULL,
                        item_id INT NOT NULL,
                        qty_per_pallet DECIMAL(18,4) DEFAULT 0,
                        current_qty DECIMAL(18,4) DEFAULT 0,
                        status VARCHAR(50) NULL,
                        po_number VARCHAR(100) NULL,
                        warehouse_no VARCHAR(100) NULL,
                        pallet_no VARCHAR(100) NULL,
                        ctn_number VARCHAR(100) NULL,
                        week_no VARCHAR(50) NULL,
                        remark NVARCHAR(MAX) NULL,
                        original_created_at DATETIME NULL,
                        original_created_by INT NULL,
                        deleted_at DATETIME DEFAULT GETDATE(),
                        deleted_by INT NOT NULL
                    )
                ");
            } catch (Exception $e) {}

            try {
                $insStmt = $pdo->prepare("
                    INSERT INTO dbo.DELETED_SERIAL_TAGS (
                        serial_no, master_pallet_no, item_id, qty_per_pallet, current_qty, status,
                        po_number, warehouse_no, pallet_no, ctn_number, week_no, remark, original_created_at, original_created_by,
                        deleted_by
                    )
                    SELECT serial_no, master_pallet_no, item_id, qty_per_pallet, current_qty, status,
                           po_number, warehouse_no, pallet_no, ctn_number, week_no, remark, created_at, created_by, ?
                    FROM dbo.RM_SERIAL_TAGS WHERE serial_no = ?
                ");
                $insStmt->execute([$currentUser['id'] ?? 0, $serial_no]);
            } catch (Exception $e) { }

            $pdo->prepare("DELETE FROM dbo.RM_SERIAL_TAGS WHERE serial_no = ?")->execute([$serial_no]);
            $response = ['success' => true];
            break;

        case 'delete_bulk_tags':
            if (!hasPermission('manage_warehouse')) { throw new Exception("Unauthorized: ไม่มีสิทธิ์การจัดการคลังสินค้า"); }
            $serials = json_decode($_POST['serials'], true);
            if (!is_array($serials) || empty($serials)) throw new Exception('ไม่มีข้อมูลให้ลบ');

            $placeholders = implode(',', array_fill(0, count($serials), '?'));
            
            $checkStmt = $pdo->prepare("SELECT serial_no FROM dbo.RM_SERIAL_TAGS WITH (NOLOCK) WHERE serial_no IN ($placeholders) AND status NOT IN ('PENDING', 'AVAILABLE')");
            $checkStmt->execute($serials);
            $usedTags = $checkStmt->fetchAll(PDO::FETCH_COLUMN);

            if (count($usedTags) > 0) throw new Exception('ไม่อนุญาตให้ลบ! มีบางรายการถูกเบิกจ่ายไปแล้ว: ' . implode(', ', $usedTags));

            try {
                $pdo->exec("
                    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='DELETED_SERIAL_TAGS' and xtype='U')
                    CREATE TABLE dbo.DELETED_SERIAL_TAGS (
                        deleted_id INT IDENTITY(1,1) PRIMARY KEY,
                        serial_no VARCHAR(50) NOT NULL,
                        master_pallet_no VARCHAR(50) NULL,
                        item_id INT NOT NULL,
                        qty_per_pallet DECIMAL(18,4) DEFAULT 0,
                        current_qty DECIMAL(18,4) DEFAULT 0,
                        status VARCHAR(50) NULL,
                        po_number VARCHAR(100) NULL,
                        warehouse_no VARCHAR(100) NULL,
                        pallet_no VARCHAR(100) NULL,
                        ctn_number VARCHAR(100) NULL,
                        week_no VARCHAR(50) NULL,
                        remark NVARCHAR(MAX) NULL,
                        original_created_at DATETIME NULL,
                        original_created_by INT NULL,
                        deleted_at DATETIME DEFAULT GETDATE(),
                        deleted_by INT NOT NULL
                    )
                ");
            } catch (Exception $e) {}

            try {
                $insParams = array_merge([$currentUser['id'] ?? 0], $serials);
                $insStmt = $pdo->prepare("
                    INSERT INTO dbo.DELETED_SERIAL_TAGS (
                        serial_no, master_pallet_no, item_id, qty_per_pallet, current_qty, status,
                        po_number, warehouse_no, pallet_no, ctn_number, week_no, remark, original_created_at, original_created_by,
                        deleted_by
                    )
                    SELECT serial_no, master_pallet_no, item_id, qty_per_pallet, current_qty, status,
                           po_number, warehouse_no, pallet_no, ctn_number, week_no, remark, created_at, created_by, ?
                    FROM dbo.RM_SERIAL_TAGS WHERE serial_no IN ($placeholders)
                ");
                $insStmt->execute($insParams);
            } catch (Exception $e) { }

            $pdo->prepare("DELETE FROM dbo.RM_SERIAL_TAGS WHERE serial_no IN ($placeholders)")->execute($serials);
            $response = ['success' => true];
            break;

        case 'edit_tag':
            if (!hasPermission('manage_warehouse')) { throw new Exception("Unauthorized: ไม่มีสิทธิ์การจัดการคลังสินค้า"); }
            $serial_no = $_POST['serial_no'] ?? '';
            if (empty($serial_no)) throw new Exception("ไม่พบ Serial No.");

            $updStmt = $pdo->prepare("UPDATE dbo.RM_SERIAL_TAGS SET po_number = ?, warehouse_no = ?, pallet_no = ?, ctn_number = ?, week_no = ?, remark = ? WHERE serial_no = ?");
            $updStmt->execute([
                $_POST['po_number'] ?? '', $_POST['warehouse_no'] ?? '', $_POST['pallet_no'] ?? '',
                $_POST['ctn_number'] ?? '', $_POST['week_no'] ?? '', $_POST['remark'] ?? '', $serial_no
            ]);
            $response = ['success' => true];
            break;

        case 'update_print_status':
            $serials = json_decode($_POST['serials'], true);
            if (!is_array($serials) || empty($serials)) throw new Exception('ไม่มีข้อมูล');

            $placeholders = implode(',', array_fill(0, count($serials), '?'));
            $pdo->prepare("UPDATE dbo.RM_SERIAL_TAGS SET print_count = ISNULL(print_count, 0) + 1, last_printed_at = GETDATE() WHERE serial_no IN ($placeholders)")->execute($serials);
            $response = ['success' => true];
            break;

        case 'trace_tag':
            $barcode = isset($_GET['serial_no']) ? trim($_GET['serial_no']) : '';
            if (empty($barcode)) throw new Exception("กรุณาระบุ Barcode");

            $sqlTag = "SELECT 
                        MAX(ISNULL(t.master_pallet_no, t.serial_no)) AS serial_no, 
                        MAX(t.master_pallet_no) AS master_pallet_no,
                        CASE WHEN COUNT(DISTINCT i.item_id) > 1 THEN 'MIXED PARTS' ELSE MAX(i.part_no) END AS item_no, 
                        CASE WHEN COUNT(DISTINCT i.item_id) > 1 THEN 'พาเลทรวมสินค้าหลายชนิด (Consolidated Pallet)' ELSE MAX(i.part_description) END AS part_description, 
                        MAX(t.description_ref) AS description_ref, MAX(t.category) AS category,
                        SUM(t.qty_per_pallet) AS qty_per_pallet, SUM(t.current_qty) AS current_qty, 
                        COUNT(t.serial_no) AS total_tags, COUNT(DISTINCT i.item_id) AS distinct_items,
                        SUM(t.qty_per_pallet) AS total_qty, MAX(t.pallet_no) AS pallet_no, MAX(t.ctn_number) AS ctn_number,
                        MAX(t.week_no) AS week_no, MAX(t.po_number) AS po_number, MAX(t.received_date) AS received_date,
                        MAX(t.warehouse_no) AS warehouse_no, MAX(t.status) AS status, MAX(t.remark) AS remark,
                        MAX(u.fullname) AS actor_name, MAX(t.created_at) AS created_at
                    FROM dbo.RM_SERIAL_TAGS t WITH (NOLOCK)
                    LEFT JOIN dbo.ITEMS i WITH (NOLOCK) ON t.item_id = i.item_id
                    LEFT JOIN dbo.USERS u WITH (NOLOCK) ON t.created_by = u.id
                    WHERE t.serial_no = ? OR t.master_pallet_no = ? OR t.ctn_number = ?";
            
            $stmtTag = $pdo->prepare($sqlTag);
            $stmtTag->execute([$barcode, $barcode, $barcode]);
            $tagInfo = $stmtTag->fetch(PDO::FETCH_ASSOC);

            if (!$tagInfo || empty($tagInfo['item_no'])) {
                try {
                    $delStmt = $pdo->prepare("SELECT d.deleted_at, u.fullname FROM dbo.DELETED_SERIAL_TAGS d LEFT JOIN dbo.USERS u ON d.deleted_by = u.id WHERE d.serial_no = ?");
                    $delStmt->execute([$barcode]);
                    $delInfo = $delStmt->fetch(PDO::FETCH_ASSOC);
                } catch (Exception $e) { $delInfo = false; }
                
                if (!empty($delInfo)) {
                    $dateDel = date('d/m/Y H:i', strtotime($delInfo['deleted_at']));
                    $userDel = $delInfo['fullname'] ?? 'Unknown';
                    throw new Exception("แท็กนี้ถูกลบทิ้งไปแล้วเมื่อ $dateDel โดย $userDel");
                }
                throw new Exception('ไม่พบข้อมูลในระบบ');
            }

            if ($tagInfo['total_tags'] <= 1 && empty($tagInfo['master_pallet_no'])) {
                unset($tagInfo['total_tags']);
                unset($tagInfo['total_qty']);
            }

            $history = [];
            if ($tagInfo['status'] != 'PENDING') {
                $isWip = strpos($tagInfo['serial_no'], '-W') !== false;
                $history[] = [
                    'transaction_timestamp' => $tagInfo['created_at'], 
                    'transaction_type' => 'RECEIVE_RM',
                    'quantity_changed' => $tagInfo['total_qty'] ?? $tagInfo['qty_per_pallet'],
                    'notes' => $isWip ? 'สร้างแท็กลูกและโอนเข้า WIP (Cloned & Received to WIP)' : 'รับเข้าสต็อก (สแกนรับของเข้า)', 
                    'actor_name' => $tagInfo['actor_name'] ?? 'System',
                    'reference_id' => $tagInfo['po_number'] ?? null,
                    'to_loc' => $tagInfo['location_name'] ?? ($isWip ? 'WIP' : 'Store')
                ];
            }

            if (!empty($tagInfo['po_number'])) {
                $transSql = "SELECT t.transaction_timestamp, t.transaction_type, t.quantity, t.notes, ISNULL(e.name_th, u.username) AS actor_name
                             FROM dbo.STOCK_TRANSACTIONS t WITH (NOLOCK)
                             LEFT JOIN dbo.USERS u WITH (NOLOCK) ON t.created_by_user_id = u.id
                             LEFT JOIN dbo.MANPOWER_EMPLOYEES e WITH (NOLOCK) ON u.emp_id = e.emp_id
                             WHERE t.reference_id = ? ORDER BY t.transaction_timestamp ASC";
                $transStmt = $pdo->prepare($transSql);
                $transStmt->execute([$tagInfo['po_number']]);
                $history = array_merge($history, $transStmt->fetchAll(PDO::FETCH_ASSOC));
            }

            $response = ['success' => true, 'data' => ['tag_info' => $tagInfo, 'history' => $history]];
            break;

        case 'get_recent_active_tags':
            // Query for recent distinct tag transactions (limit 50)
            $sqlRecent = "
                WITH RecentTags AS (
                    SELECT serial_no, MAX(transaction_timestamp) as max_date
                    FROM dbo.TAG_TRANSACTIONS WITH (NOLOCK)
                    GROUP BY serial_no
                )
                SELECT TOP 50
                    t.serial_no,
                    tt.transaction_type,
                    FORMAT(tt.transaction_timestamp, 'dd/MM/yyyy HH:mm') as transaction_date,
                    tt.quantity_changed,
                    ISNULL(u.fullname, 'System') as actor_name,
                    i.part_description,
                    i.part_no,
                    t.status,
                    t.warehouse_no as location
                FROM RecentTags rt
                JOIN dbo.TAG_TRANSACTIONS tt WITH (NOLOCK) ON rt.serial_no = tt.serial_no AND rt.max_date = tt.transaction_timestamp
                JOIN dbo.RM_SERIAL_TAGS t WITH (NOLOCK) ON rt.serial_no = t.serial_no
                LEFT JOIN dbo.ITEMS i WITH (NOLOCK) ON t.item_id = i.item_id
                LEFT JOIN dbo.USERS u WITH (NOLOCK) ON tt.created_by_user_id = u.id
                ORDER BY rt.max_date DESC
            ";
            $stmt = $pdo->query($sqlRecent);
            $response = ['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)];
            break;

        case 'trace_tag_v2':
            $barcode = isset($_GET['serial_no']) ? trim($_GET['serial_no']) : '';
            if (empty($barcode)) throw new Exception("ระบุ Barcode");

            $sqlTag = "SELECT 
                        MAX(ISNULL(t.master_pallet_no, t.serial_no)) AS serial_no, 
                        MAX(t.master_pallet_no) AS master_pallet_no,
                        CASE WHEN COUNT(DISTINCT i.item_id) > 1 THEN 'MIXED PARTS' ELSE MAX(i.part_no) END AS item_no, 
                        CASE WHEN COUNT(DISTINCT i.item_id) > 1 THEN 'พาเลทรวมชนิด (Consolidated Pallet)' ELSE MAX(i.part_description) END AS part_description, 
                        MAX(t.description_ref) AS description_ref, MAX(t.category) AS category,
                        SUM(t.qty_per_pallet) AS qty_per_pallet, SUM(t.current_qty) AS current_qty, 
                        COUNT(t.serial_no) AS total_tags, COUNT(DISTINCT i.item_id) AS distinct_items,
                        SUM(t.qty_per_pallet) AS total_qty, MAX(t.pallet_no) AS pallet_no, MAX(t.ctn_number) AS ctn_number,
                        MAX(t.week_no) AS week_no, MAX(t.po_number) AS po_number, MAX(t.received_date) AS received_date,
                        MAX(t.warehouse_no) AS warehouse_no, MAX(t.status) AS status, MAX(t.remark) AS remark,
                        MAX(u.fullname) AS actor_name, MAX(t.created_at) AS created_at
                    FROM dbo.RM_SERIAL_TAGS t WITH (NOLOCK)
                    LEFT JOIN dbo.ITEMS i WITH (NOLOCK) ON t.item_id = i.item_id
                    LEFT JOIN dbo.USERS u WITH (NOLOCK) ON t.created_by = u.id
                    WHERE t.serial_no = ? OR (t.master_pallet_no = ? AND ? NOT LIKE 'RM-%') OR t.ctn_number = ?";
            
            $stmtTag = $pdo->prepare($sqlTag);
            $stmtTag->execute([$barcode, $barcode, $barcode, $barcode]);
            $tagInfo = $stmtTag->fetch(PDO::FETCH_ASSOC);

            if (!$tagInfo || empty($tagInfo['item_no'])) {
                try {
                    $delStmt = $pdo->prepare("SELECT d.deleted_at, u.fullname FROM dbo.DELETED_SERIAL_TAGS d LEFT JOIN dbo.USERS u ON d.deleted_by = u.id WHERE d.serial_no = ?");
                    $delStmt->execute([$barcode]);
                    $delInfo = $delStmt->fetch(PDO::FETCH_ASSOC);
                } catch (Exception $e) { $delInfo = false; }
                
                if (!empty($delInfo)) {
                    $dateDel = date('d/m/Y H:i', strtotime($delInfo['deleted_at']));
                    $userDel = $delInfo['fullname'] ?? 'Unknown';
                    throw new Exception("ถูกลบเมื่อ $dateDel โดย $userDel");
                }
                throw new Exception('ไม่พบระบุ');
            }

            if ($tagInfo['total_tags'] <= 1 && empty($tagInfo['master_pallet_no'])) {
                unset($tagInfo['total_tags']);
                unset($tagInfo['total_qty']);
            }

            $history = [];
            
            if ($tagInfo['status'] != 'PENDING') {
                $history[] = [
                    'transaction_timestamp' => $tagInfo['created_at'], 
                    'transaction_type' => 'RECEIVE_RM',
                    'quantity_changed' => $tagInfo['total_qty'] ?? $tagInfo['qty_per_pallet'],
                    'notes' => 'รับเข้าสต็อก (Tag Created)', 
                    'actor_name' => $tagInfo['actor_name'] ?? 'System'
                ];
            }

            $tagTransSql = "SELECT t.transaction_timestamp, t.transaction_type, t.quantity_changed, t.notes, ISNULL(e.name_th, u.username) AS actor_name, t.reference_id
                            FROM dbo.TAG_TRANSACTIONS t WITH (NOLOCK)
                            LEFT JOIN dbo.USERS u WITH (NOLOCK) ON t.created_by_user_id = u.id
                            LEFT JOIN dbo.MANPOWER_EMPLOYEES e WITH (NOLOCK) ON u.emp_id = e.emp_id
                            WHERE t.serial_no = ? OR t.serial_no = ?";
            $tagTransStmt = $pdo->prepare($tagTransSql);
            $tagTransStmt->execute([$barcode, $tagInfo['serial_no']]);
            $explicitLogs = $tagTransStmt->fetchAll(PDO::FETCH_ASSOC);

            $implicitSql = "SELECT t.transaction_timestamp, t.transaction_type, t.quantity AS quantity_changed, t.notes, ISNULL(e.name_th, u.username) AS actor_name, t.reference_id,
                            lf.location_name AS from_loc, lt.location_name AS to_loc
                            FROM dbo.STOCK_TRANSACTIONS t WITH (NOLOCK)
                            LEFT JOIN dbo.USERS u WITH (NOLOCK) ON t.created_by_user_id = u.id
                            LEFT JOIN dbo.MANPOWER_EMPLOYEES e WITH (NOLOCK) ON u.emp_id = e.emp_id
                            LEFT JOIN dbo.LOCATIONS lf WITH (NOLOCK) ON t.from_location_id = lf.location_id
                            LEFT JOIN dbo.LOCATIONS lt WITH (NOLOCK) ON t.to_location_id = lt.location_id
                            WHERE t.reference_id LIKE 'REQ-%' AND EXISTS (
                                SELECT 1 FROM dbo.RM_SERIAL_TAGS tag WITH (NOLOCK) 
                                WHERE (tag.serial_no = ? OR tag.serial_no = ?) 
                                  AND tag.remark LIKE '%' + t.reference_id + '%'
                            )";
            $implicitStmt = $pdo->prepare($implicitSql);
            $implicitStmt->execute([$barcode, $tagInfo['serial_no']]);
            $implicitLogs = $implicitStmt->fetchAll(PDO::FETCH_ASSOC);
            
            $merged = [];
            foreach ($explicitLogs as $log) {
                $key = $log['reference_id'] . '_' . $log['transaction_type'];
                $merged[$key] = $log;
            }
            foreach ($implicitLogs as $log) {
                // Filter out RECEIVE_WIP entirely for RM tags (it belongs to the child)
                // For WIP tags, we also filter it out because they already get a 'Tag Created' event at the beginning
                $isWipTag = strpos($tagInfo['serial_no'], '-W') !== false;
                if ($log['transaction_type'] === 'RECEIVE_WIP') continue;
                if ($isWipTag && $log['transaction_type'] === 'ISSUE_STORE') continue;
                
                $key = $log['reference_id'] . '_' . $log['transaction_type'];
                if (!isset($merged[$key])) {
                    $merged[$key] = $log;
                }
            }
            
            $history = array_merge($history, array_values($merged));
            
            // Try to find if any child tags were cloned during these issues
            $findChildStmt = $pdo->prepare("SELECT serial_no FROM dbo.RM_SERIAL_TAGS WITH (NOLOCK) WHERE serial_no LIKE ? + '-W%' AND remark LIKE '%' + ? + '%'");
            foreach ($history as &$hItem) {
                if (strpos($hItem['transaction_type'], 'ISSUE') !== false && !empty($hItem['reference_id'])) {
                    $findChildStmt->execute([$tagInfo['serial_no'], $hItem['reference_id']]);
                    $children = $findChildStmt->fetchAll(PDO::FETCH_COLUMN);
                    if (!empty($children)) {
                        $hItem['notes'] .= " (โคลนไปที่: " . implode(', ', $children) . ")";
                    }
                }
            }
            unset($hItem);
            usort($history, function($a, $b) {
                return strtotime($a['transaction_timestamp']) - strtotime($b['transaction_timestamp']);
            });

            $response = ['success' => true, 'data' => ['tag_info' => $tagInfo, 'history' => $history]];
            break;

        case 'get_rm_history':
            $startDate = $_GET['start_date'] ?? date('Y-m-d');
            $endDate = $_GET['end_date'] ?? date('Y-m-d');
            $search = $_GET['search'] ?? '';
            $statusFilter = $_GET['status'] ?? 'ALL';
            $isExport = isset($_GET['export']) && $_GET['export'] === 'true';

            $page = max(1, (int)($_GET['page'] ?? 1));
            $limit = max(10, (int)($_GET['limit'] ?? 100));
            $offset = ($page - 1) * $limit;

            $baseConditions = ["t.created_at >= ?", "t.created_at < ?"];
            $params = [$startDate . " 00:00:00", date('Y-m-d', strtotime($endDate . ' +1 day')) . " 00:00:00"];

            if (!empty($search)) {
                $baseConditions[] = "(t.serial_no LIKE ? OR t.master_pallet_no LIKE ? OR i.part_no LIKE ? OR i.sap_no LIKE ? OR t.po_number LIKE ? OR t.warehouse_no LIKE ? OR t.pallet_no LIKE ? OR t.ctn_number LIKE ?)";
                $searchWildcard = "%$search%";
                $params = array_merge($params, array_fill(0, 8, $searchWildcard));
            }

            $kpiWhereClause = implode(" AND ", $baseConditions);
            $kpiSql = "SELECT COUNT(*) as total_tags, ISNULL(SUM(qty_per_pallet), 0) as total_qty, 
                              SUM(CASE WHEN ISNULL(print_count, 0) > 0 THEN 1 ELSE 0 END) as printed_tags, 
                              SUM(CASE WHEN ISNULL(print_count, 0) = 0 THEN 1 ELSE 0 END) as pending_tags
                       FROM dbo.RM_SERIAL_TAGS t WITH (NOLOCK)
                       LEFT JOIN dbo.ITEMS i WITH (NOLOCK) ON t.item_id = i.item_id
                       WHERE $kpiWhereClause";
            
            $kpiStmt = $pdo->prepare($kpiSql);
            $kpiStmt->execute($params);
            $kpi = $kpiStmt->fetch(PDO::FETCH_ASSOC);
            $tableConditions = $baseConditions;
            
            if ($statusFilter === 'PENDING') {
                $tableConditions[] = "t.status = 'PENDING'";
            } elseif ($statusFilter === 'AVAILABLE') {
                $tableConditions[] = "t.status = 'AVAILABLE'";
            } elseif ($statusFilter === 'ISSUED') {
                $tableConditions[] = "t.status NOT IN ('PENDING', 'AVAILABLE')";
            }
            
            $tableWhereClause = implode(" AND ", $tableConditions);
            $sql = "SELECT t.*, ISNULL(i.part_no, i.sap_no) AS item_no, i.part_description 
                    FROM dbo.RM_SERIAL_TAGS t WITH (NOLOCK)
                    LEFT JOIN dbo.ITEMS i WITH (NOLOCK) ON t.item_id = i.item_id
                    WHERE $tableWhereClause
                    ORDER BY t.created_at DESC";

            if (!$isExport) {
                $offsetInt = (int)$offset;
                $limitInt = (int)$limit;
                $sql .= " OFFSET $offsetInt ROWS FETCH NEXT $limitInt ROWS ONLY";
            }

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $countFilteredSql = "SELECT COUNT(*) FROM dbo.RM_SERIAL_TAGS t WITH (NOLOCK) LEFT JOIN dbo.ITEMS i WITH (NOLOCK) ON t.item_id = i.item_id WHERE $tableWhereClause";
            $countFilteredStmt = $pdo->prepare($countFilteredSql);
            $countFilteredStmt->execute($params);
            $filteredRecords = $countFilteredStmt->fetchColumn();
            
            $response = [
                'success' => true, 'data' => $data, 'kpi' => $kpi,
                'pagination' => $isExport ? null : ['total_records' => $filteredRecords, 'current_page' => $page, 'total_pages' => ceil($filteredRecords / $limit)]
            ];
            break;

        case 'bulk_receive_tags':
            $serials = json_decode($_POST['serials'], true);
            $location_id = (int)($_POST['location_id'] ?? 0);

            if (!is_array($serials) || empty($serials)) {
                throw new Exception("ไม่มีรายการที่เลือกรับเข้า");
            }
            if ($location_id === 0) {
                throw new Exception("กรุณาระบุคลัง (Location) ที่ต้องการรับเข้า");
            }

            $pdo->beginTransaction();
            $successCount = 0;
            $stmt = $pdo->prepare("EXEC dbo.sp_Store_ScanReceiveRM @ScanMode='SERIAL', @BarcodeValue=?, @LocationID=?, @UserID=?");
            
            foreach ($serials as $serial) {
                $stmt->execute([$serial, $location_id, $currentUser['id']]);
                $successCount++;
            }

            $pdo->commit();
            $response = ['success' => true, 'message' => "ยืนยันรับเข้าสต็อกสำเร็จจำนวน $successCount พาเลท/กล่อง"];
            break;

        case 'sync_store_stock_with_tags':
            $item_id = $_POST['item_id'] ?? 0;
            if (!$item_id) {
                echo json_encode(['success' => false, 'message' => 'Missing item_id']);
                exit;
            }

            // 1. Get total tags qty in Store (1008)
            $stmtTags = $pdo->prepare("SELECT ISNULL(SUM(current_qty), 0) as tags_qty FROM dbo.RM_SERIAL_TAGS WITH (NOLOCK) WHERE item_id = ? AND location_id = 1008 AND status = 'AVAILABLE'");
            $stmtTags->execute([$item_id]);
            $tags_qty = (float)$stmtTags->fetchColumn();

            // 2. Get current stock qty in Store (1008)
            $stmtStock = $pdo->prepare("SELECT ISNULL(SUM(quantity), 0) as stock_qty FROM dbo.INVENTORY_ONHAND WITH (NOLOCK) WHERE parameter_id = ? AND location_id = 1008");
            $stmtStock->execute([$item_id]);
            $stock_qty = (float)$stmtStock->fetchColumn();

            $variance = $tags_qty - $stock_qty;

            if ($variance == 0) {
                echo json_encode(['success' => true, 'message' => 'Stock is already in sync with tags.']);
                exit;
            }

            try {
                $pdo->beginTransaction();

                // 3. Insert transaction log
                $stmtTx = $pdo->prepare("INSERT INTO dbo.STOCK_TRANSACTIONS (parameter_id, quantity, transaction_type, from_location_id, to_location_id, created_by_user_id, notes, transaction_timestamp) VALUES (?, ?, 'ADJUSTMENT', NULL, 1008, ?, 'Synced Store Stock with Physical Tags (Legacy Bug Fix)', GETDATE())");
                $stmtTx->execute([$item_id, $variance, $_SESSION['user_id'] ?? 1]);

                // 4. Update Onhand Balance
                $stmtSp = $pdo->prepare("EXEC dbo.sp_UpdateOnhandBalance @item_id = ?, @location_id = 1008, @quantity_to_change = ?");
                $stmtSp->execute([$item_id, $variance]);

                $pdo->commit();
                echo json_encode(['success' => true, 'message' => 'Stock synced successfully.', 'adjusted_qty' => $variance]);
            } catch (Exception $e) {
                $pdo->rollBack();
                error_log("Error syncing stock: " . $e->getMessage());
                echo json_encode(['success' => false, 'message' => 'Failed to sync stock: ' . $e->getMessage()]);
            }
            break;

        default:
            http_response_code(400);
            throw new Exception("Invalid API Action Request: " . htmlspecialchars($action));
            break;

        case 'get_scrap_dashboard':
            $status = $_GET['status'] ?? 'ALL';
            $search = $_GET['search'] ?? '';
            $startDate = $_GET['start_date'] ?? '';
            $endDate = $_GET['end_date'] ?? '';
            $filterLine = $_GET['line'] ?? '';
            $filterTeam = $_GET['team'] ?? '';

            $conditions = [
                "1=1",
                "t.transfer_uuid LIKE 'REQ-%'"
            ];
            $params = [];

            if ($status !== 'ALL') { $conditions[] = "t.status = ?"; $params[] = $status; }
            if (!empty($startDate)) { $conditions[] = "t.created_at >= ?"; $params[] = $startDate . ' 00:00:00'; }
            if (!empty($endDate)) { $conditions[] = "t.created_at <= ?"; $params[] = $endDate . ' 23:59:59'; }
            
            if (!empty($filterLine)) {
                $conditions[] = "loc_to.production_line = ?";
                $params[] = $filterLine;
            }
            if (!empty($filterTeam)) {
                $conditions[] = "u.team_group = ?";
                $params[] = $filterTeam;
            }

            if (!empty($search)) {
                $conditions[] = "(i.sap_no LIKE ? OR i.part_no LIKE ? OR t.transfer_uuid LIKE ? OR e.name_th LIKE ?)";
                $searchParam = "%$search%";
                $params = array_merge($params, array_fill(0, 4, $searchParam));
            }

            if ($currentUser['role'] === 'supervisor') {
                $conditions[] = "(loc_to.production_line = ? OR t.created_by_user_id = ?)";
                $params[] = $currentUser['line'] ?? '';
                $params[] = $currentUser['id'];
            } else if (!in_array($currentUser['role'], ['admin', 'creator', 'qa', 'qa_qc', 'qc'])) {
                $conditions[] = "t.created_by_user_id = ?";
                $params[] = $currentUser['id'];
            }

            $whereClause = "WHERE " . implode(' AND ', $conditions);

            // 0. Summary KPIs
            $summarySql = "SELECT 
                COUNT(DISTINCT t.transfer_uuid) as total_tickets,
                ISNULL(SUM(t.quantity), 0) as total_pcs,
                ISNULL(SUM(t.quantity * ISNULL(i.Cost_Total, 0)), 0) as total_cost
                FROM dbo.STOCK_TRANSFER_ORDERS t WITH (NOLOCK)
                JOIN dbo.ITEMS i WITH (NOLOCK) ON t.item_id = i.item_id
                JOIN dbo.LOCATIONS loc_from WITH (NOLOCK) ON t.from_location_id = loc_from.location_id
                JOIN dbo.LOCATIONS loc_to WITH (NOLOCK) ON t.to_location_id = loc_to.location_id
                LEFT JOIN dbo.USERS u WITH (NOLOCK) ON t.created_by_user_id = u.id
                LEFT JOIN dbo.MANPOWER_EMPLOYEES e WITH (NOLOCK) ON u.emp_id = e.emp_id
                $whereClause";
            $stmt = $pdo->prepare($summarySql);
            $stmt->execute($params);
            $summaryData = $stmt->fetch(PDO::FETCH_ASSOC);

            // 1. Trend Data (Last 30 Days or based on filter)
            $trendSql = "SELECT CAST(t.created_at AS DATE) as date, ISNULL(SUM(t.quantity * ISNULL(i.Cost_Total, 0)), 0) as total_cost
                         FROM dbo.STOCK_TRANSFER_ORDERS t WITH (NOLOCK)
                         JOIN dbo.ITEMS i WITH (NOLOCK) ON t.item_id = i.item_id
                         JOIN dbo.LOCATIONS loc_from WITH (NOLOCK) ON t.from_location_id = loc_from.location_id
                         JOIN dbo.LOCATIONS loc_to WITH (NOLOCK) ON t.to_location_id = loc_to.location_id
                         LEFT JOIN dbo.USERS u WITH (NOLOCK) ON t.created_by_user_id = u.id
                         LEFT JOIN dbo.MANPOWER_EMPLOYEES e WITH (NOLOCK) ON u.emp_id = e.emp_id
                         $whereClause
                         GROUP BY CAST(t.created_at AS DATE)
                         ORDER BY date ASC";
            $stmt = $pdo->prepare($trendSql);
            $stmt->execute($params);
            $trendData = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // 2. Cost by Line
            $lineSql = "SELECT ISNULL(loc_to.production_line, 'N/A') as line, ISNULL(SUM(t.quantity * ISNULL(i.Cost_Total, 0)), 0) as total_cost
                        FROM dbo.STOCK_TRANSFER_ORDERS t WITH (NOLOCK)
                        JOIN dbo.ITEMS i WITH (NOLOCK) ON t.item_id = i.item_id
                        JOIN dbo.LOCATIONS loc_from WITH (NOLOCK) ON t.from_location_id = loc_from.location_id
                        JOIN dbo.LOCATIONS loc_to WITH (NOLOCK) ON t.to_location_id = loc_to.location_id
                        LEFT JOIN dbo.USERS u WITH (NOLOCK) ON t.created_by_user_id = u.id
                        LEFT JOIN dbo.MANPOWER_EMPLOYEES e WITH (NOLOCK) ON u.emp_id = e.emp_id
                        $whereClause
                        GROUP BY loc_to.production_line
                        ORDER BY total_cost DESC";
            $stmt = $pdo->prepare($lineSql);
            $stmt->execute($params);
            $lineData = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // 3. Cost by Team
            $teamSql = "SELECT ISNULL(u.team_group, 'N/A') as team, ISNULL(SUM(t.quantity * ISNULL(i.Cost_Total, 0)), 0) as total_cost
                        FROM dbo.STOCK_TRANSFER_ORDERS t WITH (NOLOCK)
                        JOIN dbo.ITEMS i WITH (NOLOCK) ON t.item_id = i.item_id
                        JOIN dbo.LOCATIONS loc_from WITH (NOLOCK) ON t.from_location_id = loc_from.location_id
                        JOIN dbo.LOCATIONS loc_to WITH (NOLOCK) ON t.to_location_id = loc_to.location_id
                        LEFT JOIN dbo.USERS u WITH (NOLOCK) ON t.created_by_user_id = u.id
                        LEFT JOIN dbo.MANPOWER_EMPLOYEES e WITH (NOLOCK) ON u.emp_id = e.emp_id
                        $whereClause
                        GROUP BY u.team_group
                        ORDER BY total_cost DESC";
            $stmt = $pdo->prepare($teamSql);
            $stmt->execute($params);
            $teamData = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // 4. Top 5 Parts
            $topSql = "SELECT TOP 5 ISNULL(i.part_no, i.sap_no) as part_no, ISNULL(SUM(t.quantity * ISNULL(i.Cost_Total, 0)), 0) as total_cost
                       FROM dbo.STOCK_TRANSFER_ORDERS t WITH (NOLOCK)
                       JOIN dbo.ITEMS i WITH (NOLOCK) ON t.item_id = i.item_id
                       JOIN dbo.LOCATIONS loc_from WITH (NOLOCK) ON t.from_location_id = loc_from.location_id
                       JOIN dbo.LOCATIONS loc_to WITH (NOLOCK) ON t.to_location_id = loc_to.location_id
                       LEFT JOIN dbo.USERS u WITH (NOLOCK) ON t.created_by_user_id = u.id
                       LEFT JOIN dbo.MANPOWER_EMPLOYEES e WITH (NOLOCK) ON u.emp_id = e.emp_id
                       $whereClause
                       GROUP BY ISNULL(i.part_no, i.sap_no)
                       ORDER BY total_cost DESC";
            $stmt = $pdo->prepare($topSql);
            $stmt->execute($params);
            $topPartsData = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // 5. Top Defect Reasons
            $reasonSql = "SELECT TOP 10 
                REPLACE(ISNULL(t.notes, 'N/A'), 'Replacement: [SNC] ', '') as reason, 
                ISNULL(SUM(t.quantity * ISNULL(i.Cost_Total, 0)), 0) as total_cost
                FROM dbo.STOCK_TRANSFER_ORDERS t WITH (NOLOCK)
                JOIN dbo.ITEMS i WITH (NOLOCK) ON t.item_id = i.item_id
                JOIN dbo.LOCATIONS loc_from WITH (NOLOCK) ON t.from_location_id = loc_from.location_id
                JOIN dbo.LOCATIONS loc_to WITH (NOLOCK) ON t.to_location_id = loc_to.location_id
                LEFT JOIN dbo.USERS u WITH (NOLOCK) ON t.created_by_user_id = u.id
                LEFT JOIN dbo.MANPOWER_EMPLOYEES e WITH (NOLOCK) ON u.emp_id = e.emp_id
                $whereClause
                GROUP BY REPLACE(ISNULL(t.notes, 'N/A'), 'Replacement: [SNC] ', '')
                ORDER BY total_cost DESC";
            $stmt = $pdo->prepare($reasonSql);
            $stmt->execute($params);
            $reasonData = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // 6. Top Requesters
            $requesterSql = "SELECT TOP 5 
                ISNULL(e.name_th, u.username) as requester, 
                ISNULL(SUM(t.quantity * ISNULL(i.Cost_Total, 0)), 0) as total_cost
                FROM dbo.STOCK_TRANSFER_ORDERS t WITH (NOLOCK)
                JOIN dbo.ITEMS i WITH (NOLOCK) ON t.item_id = i.item_id
                JOIN dbo.LOCATIONS loc_from WITH (NOLOCK) ON t.from_location_id = loc_from.location_id
                JOIN dbo.LOCATIONS loc_to WITH (NOLOCK) ON t.to_location_id = loc_to.location_id
                LEFT JOIN dbo.USERS u WITH (NOLOCK) ON t.created_by_user_id = u.id
                LEFT JOIN dbo.MANPOWER_EMPLOYEES e WITH (NOLOCK) ON u.emp_id = e.emp_id
                $whereClause
                GROUP BY ISNULL(e.name_th, u.username)
                ORDER BY total_cost DESC";
            $stmt = $pdo->prepare($requesterSql);
            $stmt->execute($params);
            $requesterData = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Top Line for KPI
            $topLine = (!empty($lineData)) ? $lineData[0]['line'] : 'N/A';

            $response = [
                'success' => true,
                'summary' => [
                    'total_tickets' => $summaryData['total_tickets'] ?? 0,
                    'total_pcs' => $summaryData['total_pcs'] ?? 0,
                    'total_cost' => $summaryData['total_cost'] ?? 0,
                    'top_line' => $topLine
                ],
                'trend' => $trendData,
                'line' => $lineData,
                'team' => $teamData,
                'top_parts' => $topPartsData,
                'reasons' => $reasonData,
                'requesters' => $requesterData
            ];
            break;
}
echo json_encode($response);

} catch (Throwable $e) {
    handleApiError($e, isset($pdo) ? $pdo : null, $_POST);
}
?>





