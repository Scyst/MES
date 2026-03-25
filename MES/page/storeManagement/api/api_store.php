<?php
// MES/page/storeManagement/api/api_store.php
require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../../auth/check_auth.php';
require_once __DIR__ . '/../../logger.php';

header('Content-Type: application/json; charset=utf-8');
ini_set('display_errors', 0);

try {
    if (!isset($_SESSION['user'])) {
        http_response_code(401);
        throw new Exception('Unauthorized Access');
    }

    $currentUser = $_SESSION['user'];
    $action = $_REQUEST['action'] ?? '';
    $writeActions = [
        'issue_rm', 'issue_selected_tags', 'import_excel', 'group_master_pallet', 
        'receive_scanned_tag', 'delete_tag', 'delete_bulk_tags', 'edit_tag', 
        'update_print_status', 'create_request', 'approve_request', 'reject_request'
    ];
    
    if (in_array($action, $writeActions) && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $clientToken = $_POST['csrf_token'] ?? json_decode(file_get_contents('php://input'), true)['csrf_token'] ?? '';
        if (empty($clientToken) || !hash_equals($_SESSION['csrf_token'], $clientToken)) {
            http_response_code(403);
            throw new Exception('CSRF Token Validation Failed.');
        }
    }

    if (!isset($pdo)) {
        $pdo = new PDO("sqlsrv:Server=" . DB_HOST . ";Database=" . DB_DATABASE, DB_USER, DB_PASSWORD);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    }

    switch ($action) {
        case 'get_master_data':
            $locStmt = $pdo->query("SELECT location_id, location_name, location_type, production_line FROM dbo.LOCATIONS WITH (NOLOCK) WHERE is_active = 1 ORDER BY location_name");
            $itemsStmt = $pdo->query("SELECT item_id, sap_no, part_no, part_description FROM dbo.ITEMS WITH (NOLOCK) WHERE is_active = 1 ORDER BY sap_no");
            
            echo json_encode([
                'success' => true, 
                'data' => [
                    'locations' => $locStmt->fetchAll(PDO::FETCH_ASSOC),
                    'items' => $itemsStmt->fetchAll(PDO::FETCH_ASSOC)
                ],
                'user_role' => $currentUser['role'],
                'user_line' => $currentUser['line'] ?? null
            ]);
            break;

        case 'get_inventory_dashboard':
            $location_id = $_GET['location_id'] ?? 'ALL';
            $material_type = $_GET['material_type'] ?? 'ALL';
            $hide_zero = $_GET['hide_zero'] ?? 'false';
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

            $locFilter = ($location_id !== 'ALL' && $location_id !== '') ? "AND o.location_id = " . (int)$location_id : "";
            $zeroFilter = ($hide_zero === 'true') ? "HAVING (ISNULL(SUM(o.quantity), 0) <> 0 OR ISNULL(SUM(p.qty_per_pallet), 0) > 0)" : "";
            $whereClause = implode(" AND ", $conditions);
            $whereSQL = !empty($whereClause) ? "WHERE " . $whereClause : "";
            $countSql = "
                SELECT 
                    COUNT(*) as total_skus,
                    SUM(CASE WHEN Sub.available_qty <= 0 THEN 1 ELSE 0 END) as out_of_stock,
                    SUM(Sub.available_qty) as toolbar_total_pcs,
                    SUM(Sub.pending_qty) as total_pending_qty,
                    SUM(Sub.total_value) as total_value
                FROM (
                    SELECT 
                        i.item_id,
                        ISNULL(SUM(o.quantity), 0) AS available_qty,
                        ISNULL(SUM(p.qty_per_pallet), 0) AS pending_qty,
                        (ISNULL(SUM(o.quantity), 0) * ISNULL(i.StandardPrice, 0)) AS total_value
                    FROM dbo.ITEMS i WITH (NOLOCK)
                    LEFT JOIN dbo.INVENTORY_ONHAND o WITH (NOLOCK) ON i.item_id = o.parameter_id $locFilter
                    LEFT JOIN dbo.RM_SERIAL_TAGS p WITH (NOLOCK) ON i.item_id = p.item_id AND p.status = 'PENDING'
                    $whereSQL
                    GROUP BY i.item_id, i.StandardPrice
                    $zeroFilter
                ) as Sub
            ";
            
            $kpiStmt = $pdo->prepare($countSql);
            $kpiStmt->execute($params);
            $kpi = $kpiStmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$kpi) {
                $kpi = ['total_skus' => 0, 'out_of_stock' => 0, 'total_pending_qty' => 0, 'total_value' => 0, 'toolbar_total_pcs' => 0];
            }

            $offsetInt = (int)$offset;
            $limitInt = (int)$limit;
            $sql = "
                SELECT 
                    i.item_id,
                    ISNULL(i.part_no, i.sap_no) AS item_no,
                    i.part_description,
                    ISNULL(i.material_type, 'UNKNOWN') AS material_type,
                    ISNULL(SUM(o.quantity), 0) AS available_qty,
                    ISNULL(SUM(p.qty_per_pallet), 0) AS pending_qty,
                    ISNULL(SUM(o.quantity), 0) + ISNULL(SUM(p.qty_per_pallet), 0) AS total_qty,
                    ISNULL(i.StandardPrice, 0) AS unit_price,
                    (ISNULL(SUM(o.quantity), 0) * ISNULL(i.StandardPrice, 0)) AS total_value
                FROM dbo.ITEMS i WITH (NOLOCK)
                LEFT JOIN dbo.INVENTORY_ONHAND o WITH (NOLOCK) ON i.item_id = o.parameter_id $locFilter
                LEFT JOIN dbo.RM_SERIAL_TAGS p WITH (NOLOCK) ON i.item_id = p.item_id AND p.status = 'PENDING'
                $whereSQL
                GROUP BY i.item_id, i.part_no, i.sap_no, i.part_description, i.material_type, i.StandardPrice
                $zeroFilter
                ORDER BY available_qty ASC, total_value DESC
                OFFSET $offsetInt ROWS FETCH NEXT $limitInt ROWS ONLY
            ";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode([
                'success' => true, 
                'data' => $data, 
                'kpi' => $kpi,
                'pagination' => [
                    'total_records' => $kpi['total_skus'],
                    'current_page' => $page,
                    'total_pages' => ceil($kpi['total_skus'] / $limit)
                ]
            ]);
            break;

        case 'get_item_details':
            $item_id = $_GET['item_id'] ?? 0;
            
            $stmtAvail = $pdo->prepare("SELECT l.location_name, SUM(o.quantity) as qty FROM dbo.INVENTORY_ONHAND o WITH (NOLOCK) JOIN dbo.LOCATIONS l WITH (NOLOCK) ON o.location_id = l.location_id WHERE o.parameter_id = ? AND o.quantity > 0 GROUP BY l.location_name ORDER BY qty DESC");
            $stmtAvail->execute([$item_id]);
            $available_details = $stmtAvail->fetchAll(PDO::FETCH_ASSOC);

            $stmtPend = $pdo->prepare("SELECT ISNULL(master_pallet_no, ctn_number) as tracking_no, MAX(po_number) as po_number, SUM(qty_per_pallet) as qty FROM dbo.RM_SERIAL_TAGS WITH (NOLOCK) WHERE item_id = ? AND status = 'PENDING' GROUP BY ISNULL(master_pallet_no, ctn_number) ORDER BY qty DESC");
            $stmtPend->execute([$item_id]);
            $pending_details = $stmtPend->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode(['success' => true, 'available_details' => $available_details, 'pending_details' => $pending_details]);
            break;

        case 'issue_rm':
            $barcode = trim($_POST['barcode'] ?? '');
            $qty = (float)($_POST['qty'] ?? 1);
            $to_location = (int)($_POST['to_location'] ?? 0);
            $userId = $_SESSION['user']['id'];
            $ignore_fifo = isset($_POST['ignore_fifo']) && $_POST['ignore_fifo'] === 'true';

            if (empty($barcode) || $qty <= 0 || $to_location == 0) {
                throw new Exception("ข้อมูลไม่ครบถ้วน (Barcode, QTY, Location)");
            }
            if (!$ignore_fifo) {
                $tagStmt = $pdo->prepare("SELECT serial_no FROM dbo.RM_SERIAL_TAGS WITH (NOLOCK) WHERE (serial_no = ? OR master_pallet_no = ? OR ctn_number = ?) AND status = 'AVAILABLE'");
                $tagStmt->execute([$barcode, $barcode, $barcode]);
                $tagsToIssue = $tagStmt->fetchAll(PDO::FETCH_COLUMN);

                if (count($tagsToIssue) > 0) {
                    $placeholders = implode(',', array_fill(0, count($tagsToIssue), '?'));
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
                    $fifoParams = array_merge($tagsToIssue, $tagsToIssue);
                    $fifoStmt = $pdo->prepare($fifoSql);
                    $fifoStmt->execute($fifoParams);
                    $fifoViolation = $fifoStmt->fetch(PDO::FETCH_ASSOC);

                    if ($fifoViolation) {
                        $partNo = $fifoViolation['part_no'];
                        $oldRef = $fifoViolation['master_pallet_no'] ? "พาเลท " . $fifoViolation['master_pallet_no'] : "ป้าย " . $fifoViolation['older_serial'];
                        $oldDate = date('d/m/Y H:i', strtotime($fifoViolation['older_date']));
                        $oldLoc = $fifoViolation['warehouse_no'] ? "พิกัด: " . $fifoViolation['warehouse_no'] : "ไม่ระบุพิกัด";
                        echo json_encode([
                            'success' => true, 
                            'require_fifo_confirm' => true,
                            'message' => "พบวัตถุดิบ [{$partNo}] ที่เก่ากว่าค้างอยู่ในคลัง\nแนะนำให้เบิก {$oldRef} ({$oldLoc})\nที่รับเข้าเมื่อ {$oldDate} มาใช้ก่อน\n\nคุณยืนยันที่จะจ่าย Tag ล็อตนี้เลยหรือไม่?"
                        ]);
                        exit;
                    }
                }
            }
            $stmt = $pdo->prepare("EXEC dbo.sp_Store_IssueRM @ScanValue=?, @TagsToIssue=?, @ToLocationID=?, @UserID=?");
            $stmt->execute([$barcode, $qty, $to_location, $userId]);
            $issuedTags = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode(['success' => true, 'issued_count' => count($issuedTags), 'issued_tags' => $issuedTags]);
            break;

        case 'get_pallet_tags':
            $barcode = trim($_GET['barcode'] ?? '');
            if (empty($barcode)) throw new Exception("กรุณาระบุบาร์โค้ด");

            $stmt = $pdo->prepare("
                SELECT t.serial_no, ISNULL(i.part_no, i.sap_no) as part_no, t.current_qty as qty
                FROM dbo.RM_SERIAL_TAGS t WITH (NOLOCK)
                JOIN dbo.ITEMS i WITH (NOLOCK) ON t.item_id = i.item_id
                WHERE (t.master_pallet_no = ? OR t.ctn_number = ? OR t.serial_no = ?)
                  AND t.status = 'AVAILABLE' AND t.current_qty > 0
                ORDER BY t.serial_no ASC
            ");
            $stmt->execute([$barcode, $barcode, $barcode]);
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
            break;

        case 'issue_selected_tags':
            $serials = $_POST['serials'] ?? '';
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
                    
                    echo json_encode([
                        'success' => true, 
                        'require_fifo_confirm' => true,
                        'message' => "พบวัตถุดิบ [{$partNo}] ที่เก่ากว่าค้างอยู่ในคลัง\nแนะนำให้เบิก {$oldRef} ({$oldLoc})\nที่รับเข้าเมื่อ {$oldDate} มาใช้ก่อน\n\nคุณยืนยันที่จะจ่าย Tag ล็อตนี้เลยหรือไม่?"
                    ]);
                    exit;
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
            echo json_encode(['success' => true, 'issued_count' => count($issuedTags), 'issued_tags' => $issuedTags]);
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
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
            break;

        case 'import_excel':
            $jsonData = $_POST['data'] ?? '';
            if (empty($jsonData)) throw new Exception("ไม่พบข้อมูลสำหรับการนำเข้า");

            $stmt = $pdo->prepare("EXEC dbo.sp_Store_ImportRMShipping @JsonData = ?, @UserId = ?");
            $stmt->execute([$jsonData, $currentUser['id']]);
            $importedData = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode(['success' => true, 'data' => $importedData]);
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
            
            echo json_encode(['success' => true, 'message' => 'รับเข้าสำเร็จ']);
            break;

        case 'group_master_pallet':
            $serials = json_decode($_POST['serials'], true);
            if (!is_array($serials) || empty($serials)) throw new Exception("ไม่มีข้อมูลที่เลือกจัดพาเลท");

            $pdo->beginTransaction();
            $prefix = 'MPL-' . date('ym') . '-';
            $stmtLast = $pdo->query("SELECT TOP 1 master_pallet_no FROM dbo.RM_SERIAL_TAGS WITH (UPDLOCK) WHERE master_pallet_no LIKE '$prefix%' ORDER BY master_pallet_no DESC");
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
            echo json_encode(['success' => true, 'data' => $masterData]);
            break;

        case 'delete_tag':
            $serial_no = $_POST['serial_no'] ?? '';
            if (empty($serial_no)) throw new Exception("ไม่พบ Serial No.");

            $checkStmt = $pdo->prepare("SELECT status FROM dbo.RM_SERIAL_TAGS WITH (NOLOCK) WHERE serial_no = ?");
            $checkStmt->execute([$serial_no]);
            $tagStatus = $checkStmt->fetchColumn();

            if (!$tagStatus) throw new Exception('ไม่พบข้อมูล Tag นี้ในระบบ');
            if (!in_array($tagStatus, ['PENDING', 'AVAILABLE'])) {
                throw new Exception('ไม่อนุญาตให้ลบ เนื่องจากวัตถุดิบนี้ถูกเบิกจ่าย หรือเข้าสู่กระบวนการผลิตแล้ว!');
            }

            $pdo->prepare("DELETE FROM dbo.RM_SERIAL_TAGS WHERE serial_no = ?")->execute([$serial_no]);
            echo json_encode(['success' => true]);
            break;

        case 'delete_bulk_tags':
            $serials = json_decode($_POST['serials'], true);
            if (!is_array($serials) || empty($serials)) throw new Exception('ไม่มีข้อมูลให้ลบ');

            $placeholders = implode(',', array_fill(0, count($serials), '?'));
            
            $checkStmt = $pdo->prepare("SELECT serial_no FROM dbo.RM_SERIAL_TAGS WITH (NOLOCK) WHERE serial_no IN ($placeholders) AND status NOT IN ('PENDING', 'AVAILABLE')");
            $checkStmt->execute($serials);
            $usedTags = $checkStmt->fetchAll(PDO::FETCH_COLUMN);

            if (count($usedTags) > 0) throw new Exception('ไม่อนุญาตให้ลบ! มีบางรายการถูกเบิกจ่ายไปแล้ว: ' . implode(', ', $usedTags));

            $pdo->prepare("DELETE FROM dbo.RM_SERIAL_TAGS WHERE serial_no IN ($placeholders)")->execute($serials);
            echo json_encode(['success' => true]);
            break;

        case 'edit_tag':
            $serial_no = $_POST['serial_no'] ?? '';
            if (empty($serial_no)) throw new Exception("ไม่พบ Serial No.");

            $updStmt = $pdo->prepare("UPDATE dbo.RM_SERIAL_TAGS SET po_number = ?, warehouse_no = ?, pallet_no = ?, ctn_number = ?, week_no = ?, remark = ? WHERE serial_no = ?");
            $updStmt->execute([
                $_POST['po_number'] ?? '', $_POST['warehouse_no'] ?? '', $_POST['pallet_no'] ?? '',
                $_POST['ctn_number'] ?? '', $_POST['week_no'] ?? '', $_POST['remark'] ?? '', $serial_no
            ]);
            echo json_encode(['success' => true]);
            break;

        case 'update_print_status':
            $serials = json_decode($_POST['serials'], true);
            if (!is_array($serials) || empty($serials)) throw new Exception('ไม่มีข้อมูล');

            $placeholders = implode(',', array_fill(0, count($serials), '?'));
            $pdo->prepare("UPDATE dbo.RM_SERIAL_TAGS SET print_count = ISNULL(print_count, 0) + 1, last_printed_at = GETDATE() WHERE serial_no IN ($placeholders)")->execute($serials);
            echo json_encode(['success' => true]);
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
                echo json_encode(['success' => false, 'message' => 'ไม่พบข้อมูลในระบบ']);
                exit;
            }

            if ($tagInfo['total_tags'] <= 1 && empty($tagInfo['master_pallet_no'])) {
                unset($tagInfo['total_tags']);
                unset($tagInfo['total_qty']);
            }

            $history = [];
            if ($tagInfo['status'] != 'PENDING') {
                $history[] = [
                    'transaction_timestamp' => $tagInfo['created_at'], 'transaction_type' => 'RECEIVE_RM',
                    'quantity' => $tagInfo['total_qty'] ?? $tagInfo['qty_per_pallet'],
                    'notes' => 'รับเข้าสต็อก (สแกนรับของเข้า)', 'actor_name' => $tagInfo['actor_name'] ?? 'System'
                ];
            }

            $transSql = "SELECT t.transaction_timestamp, t.transaction_type, t.quantity, t.notes, ISNULL(e.name_th, u.username) AS actor_name
                         FROM dbo.STOCK_TRANSACTIONS t WITH (NOLOCK)
                         LEFT JOIN dbo.USERS u WITH (NOLOCK) ON t.created_by_user_id = u.id
                         LEFT JOIN dbo.MANPOWER_EMPLOYEES e WITH (NOLOCK) ON u.emp_id = e.emp_id
                         WHERE t.reference_id = ? ORDER BY t.transaction_timestamp ASC";
            $transStmt = $pdo->prepare($transSql);
            $transStmt->execute([$tagInfo['po_number']]);
            $history = array_merge($history, $transStmt->fetchAll(PDO::FETCH_ASSOC));

            echo json_encode(['success' => true, 'data' => ['tag_info' => $tagInfo, 'history' => $history]]);
            break;

        case 'get_rm_history':
            $startDate = $_GET['start_date'] ?? date('Y-m-d');
            $endDate = $_GET['end_date'] ?? date('Y-m-d');
            $search = $_GET['search'] ?? '';
            $isExport = isset($_GET['export']) && $_GET['export'] === 'true';

            $page = max(1, (int)($_GET['page'] ?? 1));
            $limit = max(10, (int)($_GET['limit'] ?? 100));
            $offset = ($page - 1) * $limit;

            $conditions = ["t.created_at >= ?", "t.created_at < ?"];
            $params = [$startDate . " 00:00:00", date('Y-m-d', strtotime($endDate . ' +1 day')) . " 00:00:00"];

            if (!empty($search)) {
                $conditions[] = "(t.serial_no LIKE ? OR t.master_pallet_no LIKE ? OR i.part_no LIKE ? OR i.sap_no LIKE ? OR t.po_number LIKE ? OR t.warehouse_no LIKE ? OR t.pallet_no LIKE ? OR t.ctn_number LIKE ?)";
                $searchWildcard = "%$search%";
                $params = array_merge($params, array_fill(0, 8, $searchWildcard));
            }

            $whereClause = implode(" AND ", $conditions);

            $kpiSql = "SELECT COUNT(*) as total_tags, ISNULL(SUM(qty_per_pallet), 0) as total_qty, SUM(CASE WHEN ISNULL(print_count, 0) > 0 THEN 1 ELSE 0 END) as printed_tags, SUM(CASE WHEN ISNULL(print_count, 0) = 0 THEN 1 ELSE 0 END) as pending_tags
                       FROM dbo.RM_SERIAL_TAGS t WITH (NOLOCK)
                       LEFT JOIN dbo.ITEMS i WITH (NOLOCK) ON t.item_id = i.item_id
                       WHERE $whereClause";
            
            $kpiStmt = $pdo->prepare($kpiSql);
            $kpiStmt->execute($params);
            $kpi = $kpiStmt->fetch(PDO::FETCH_ASSOC);

            $sql = "SELECT t.*, ISNULL(i.part_no, i.sap_no) AS item_no, i.part_description 
                    FROM dbo.RM_SERIAL_TAGS t WITH (NOLOCK)
                    LEFT JOIN dbo.ITEMS i WITH (NOLOCK) ON t.item_id = i.item_id
                    WHERE $whereClause
                    ORDER BY t.created_at DESC";

            if (!$isExport) {
                $offsetInt = (int)$offset;
                $limitInt = (int)$limit;
                $sql .= " OFFSET $offsetInt ROWS FETCH NEXT $limitInt ROWS ONLY";
            }

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            
            echo json_encode([
                'success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC), 'kpi' => $kpi,
                'pagination' => $isExport ? null : ['total_records' => $kpi['total_tags'], 'current_page' => $page, 'total_pages' => ceil($kpi['total_tags'] / $limit)]
            ]);
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

            $conditions = ["1=1"];
            $params = [];

            if ($status !== 'ALL') { $conditions[] = "t.status = ?"; $params[] = $status; }
            if (!empty($startDate)) { $conditions[] = "t.created_at >= ?"; $params[] = $startDate . ' 00:00:00'; }
            if (!empty($endDate)) { $conditions[] = "t.created_at <= ?"; $params[] = $endDate . ' 23:59:59'; }

            if (!empty($search)) {
                $conditions[] = "(i.sap_no LIKE ? OR i.part_no LIKE ? OR t.transfer_uuid LIKE ? OR e.name_th LIKE ?)";
                $searchParam = "%$search%";
                $params = array_merge($params, array_fill(0, 4, $searchParam));
            }

            if ($currentUser['role'] === 'supervisor') {
                $conditions[] = "(loc_to.production_line = ? OR t.created_by_user_id = ?)";
                $params[] = $currentUser['line'] ?? '';
                $params[] = $currentUser['id'];
            } elseif ($currentUser['role'] === 'operator') {
                $conditions[] = "t.created_by_user_id = ?";
                $params[] = $currentUser['id'];
            }

            $whereClause = "WHERE " . implode(' AND ', $conditions);

            $kpiSql = "SELECT COUNT(t.transfer_id) as total_count, ISNULL(SUM(t.quantity), 0) as total_qty, ISNULL(SUM(t.quantity * ISNULL(i.Cost_Total, 0)), 0) as total_cost
                       FROM dbo.STOCK_TRANSFER_ORDERS t WITH (NOLOCK)
                       JOIN dbo.ITEMS i WITH (NOLOCK) ON t.item_id = i.item_id
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

            echo json_encode([
                'success' => true, 'data' => $data, 'kpi' => $kpi,
                'pagination' => $isExport ? null : ['total_records' => $kpi['total_count'], 'current_page' => $page, 'total_pages' => ceil($kpi['total_count'] / $limit)]
            ]);
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
            echo json_encode(['success' => true, 'message' => 'บันทึกของเสียและส่งคำขอเบิกแล้ว']);
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
            echo json_encode(['success' => true, 'message' => 'อนุมัติจ่ายของเรียบร้อย']);
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
            echo json_encode(['success' => true, 'message' => 'ปฏิเสธคำขอเรียบร้อย']);
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

            echo json_encode(['success' => true, 'message' => 'ส่งคำขอปรับยอดสต็อกเรียบร้อยแล้ว']);
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

            echo json_encode(['success' => true, 'data' => $data, 'count' => count($data)]);
            break;

        case 'approve_cycle_count':
            $count_id = (int)($_POST['count_id'] ?? 0);
            $approval_action = $_POST['approval_action'] ?? ''; // 'APPROVE' หรือ 'REJECT'
            $userId = $_SESSION['user']['id'];

            if (!hasPermission('manage_warehouse')) {
                throw new Exception("Unauthorized: ไม่มีสิทธิ์อนุมัติการปรับยอดสต็อก");
            }

            if ($count_id === 0 || !in_array($approval_action, ['APPROVE', 'REJECT'])) {
                throw new Exception("ข้อมูลไม่ถูกต้อง");
            }

            $stmt = $pdo->prepare("EXEC dbo.sp_Store_ApproveCycleCount @count_id=?, @action=?, @user_id=?");
            $stmt->execute([$count_id, $approval_action, $userId]);

            echo json_encode(['success' => true, 'message' => 'ดำเนินการเรียบร้อยแล้ว']);
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
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
            break;

        case 'get_master_pallet_details':
            $masterPalletNo = $_GET['master_pallet_no'] ?? '';
            if (empty($masterPalletNo)) {
                throw new Exception("Master Pallet Number is required");
            }
            $sql = "
                SELECT 
                    t.master_pallet_no,
                    MAX(i.part_no) as part_no,
                    MAX(i.part_description) as part_description,
                    MAX(t.po_number) as po_number,
                    MAX(t.warehouse_no) as warehouse_no,
                    MAX(t.received_date) as received_date,
                    SUM(t.current_qty) as total_qty,
                    COUNT(t.tag_id) as total_tags,
                    MAX(t.week_no) as week_no,
                    MAX(t.remark) as remark
                FROM dbo.RM_SERIAL_TAGS t WITH (NOLOCK)
                JOIN dbo.ITEMS i WITH (NOLOCK) ON t.item_id = i.item_id
                WHERE t.master_pallet_no = :master_pallet_no
                GROUP BY t.master_pallet_no
            ";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute(['master_pallet_no' => $masterPalletNo]);
            $data = $stmt->fetch();

            if (!$data) {
                throw new Exception("ไม่พบข้อมูลพาเลทหมายเลข: $masterPalletNo");
            }

            echo json_encode([
                'success' => true,
                'data' => $data
            ]);
            break;

        case 'get_stock_ledger':
            $startDate = $_GET['start_date'] ?? date('Y-m-d', strtotime('-7 days'));
            $endDate = $_GET['end_date'] ?? date('Y-m-d');
            $search = $_GET['search'] ?? '';
            $locationId = $_GET['location_id'] ?? 'ALL';
            $typeFilter = $_GET['type_filter'] ?? 'ALL';
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

            if (!empty($search)) {
                $conditions[] = "(i.sap_no LIKE ? OR i.part_no LIKE ? OR t.reference_id LIKE ? OR t.notes LIKE ?)";
                $searchWildcard = "%$search%";
                $params = array_merge($params, array_fill(0, 4, $searchWildcard));
            }

            $whereClause = implode(" AND ", $conditions);

            // คำนวณ KPI ด้านบน (ยอด IN / OUT รวม)
            $kpiSql = "SELECT COUNT(*) as total_trans,
                              SUM(CASE WHEN t.quantity > 0 THEN t.quantity ELSE 0 END) as total_in,
                              SUM(CASE WHEN t.quantity < 0 THEN ABS(t.quantity) ELSE 0 END) as total_out
                       FROM dbo.STOCK_TRANSACTIONS t WITH (NOLOCK)
                       LEFT JOIN dbo.ITEMS i WITH (NOLOCK) ON t.parameter_id = i.item_id
                       WHERE $whereClause";
            
            $kpiStmt = $pdo->prepare($kpiSql);
            $kpiStmt->execute($params);
            $kpi = $kpiStmt->fetch(PDO::FETCH_ASSOC);

            // ดึงข้อมูลประวัติ
            $sql = "SELECT t.transaction_id, t.transaction_timestamp, t.transaction_type, t.quantity, t.reference_id, t.notes,
                           ISNULL(i.part_no, i.sap_no) AS item_no, i.part_description,
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
            
            echo json_encode([
                'success' => true, 
                'data' => $stmt->fetchAll(PDO::FETCH_ASSOC), 
                'kpi' => $kpi,
                'pagination' => $isExport ? null : [
                    'total_records' => $kpi['total_trans'], 
                    'current_page' => $page, 
                    'total_pages' => ceil($kpi['total_trans'] / $limit)
                ]
            ]);
            break;

        default:
            http_response_code(400);
            throw new Exception("Invalid API Action Request");
    }

} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    
    $errorMessage = $e->getMessage();
    
    if (strpos($errorMessage, '[SQL Server]') !== false) {
        $parts = explode('[SQL Server]', $errorMessage);
        $cleanError = trim(end($parts));
        if (strpos($cleanError, 'Violation of') !== false || strpos($cleanError, 'Invalid object') !== false) {
            $errorMessage = "เกิดข้อผิดพลาดในการประมวลผลฐานข้อมูล (Database Constraint Violation)";
        } else {
            $errorMessage = $cleanError;
        }
    }

    if (http_response_code() === 200) {
        http_response_code(500);
    }
    
    echo json_encode(['success' => false, 'message' => $errorMessage]);
}
?>