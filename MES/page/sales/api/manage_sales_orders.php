<?php
// page/sales/api/manage_sales_orders.php
header('Content-Type: application/json');
require_once __DIR__ . '/../../db.php'; 
require_once __DIR__ . '/../../../auth/check_auth.php';

if (!isset($_SESSION['user'])) {
    http_response_code(401); 
    echo json_encode(['success'=>false, 'message'=>'Unauthorized']); 
    exit;
}

$action = $_REQUEST['action'] ?? 'read';
$table = defined('SALES_ORDERS_TABLE') ? SALES_ORDERS_TABLE : 'SALES_ORDERS';
$itemsTable = defined('IS_DEVELOPMENT') && IS_DEVELOPMENT ? 'ITEMS_TEST' : 'ITEMS';

try {
    // ------------------------------------------------------------------
    // 1. READ
    // ------------------------------------------------------------------
    if ($action === 'read') {
        // ถ้าไม่ส่ง status มา ให้ถือว่าเป็น 'ACTIVE' (ยังไม่คอนเฟิร์ม)
        $filter = $_GET['status'] ?? 'ACTIVE'; 
        
        $sql = "SELECT s.*, COALESCE(i.Price_USD, i.StandardPrice, 0) as price 
                FROM $table s 
                LEFT JOIN $itemsTable i ON s.sku = i.sku 
                WHERE 1=1";
        
        // [NEW] กรองเฉพาะงานที่ยังไม่คอนเฟิร์ม
        if ($filter === 'ACTIVE') {
            $sql .= " AND is_confirmed = 0";
        }
        
        // ส่วน Filter อื่นๆ คงเดิม
        if ($filter === 'WAIT_PROD') $sql .= " AND is_production_done = 0 AND is_confirmed = 0"; // แถม: กรอง confirmed ออกด้วยก็ได้
        if ($filter === 'PROD_DONE') $sql .= " AND is_production_done = 1 AND is_confirmed = 0";
        if ($filter === 'WAIT_LOAD') $sql .= " AND is_production_done = 1 AND is_loading_done = 0 AND is_confirmed = 0";
        // ส่วน LOADED หรือ ALL อาจจะอยากดูย้อนหลัง ก็ไม่ต้องกรอง is_confirmed
        if ($filter === 'LOADED')    $sql .= " AND is_loading_done = 1";
        
        // ถ้า filter = 'ALL' ก็จะเข้าเงื่อนไข WHERE 1=1 เฉยๆ (แสดงหมดรวม Confirmed)

        // เรียงตาม custom_order
        $sql .= " ORDER BY ISNULL(custom_order, 999999) ASC, id DESC";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute();
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $sumSql = "SELECT 
                   COUNT(*) as total_all,
                   SUM(CASE WHEN is_confirmed = 0 THEN 1 ELSE 0 END) as total_active,
                   SUM(CASE WHEN is_production_done = 0 AND is_confirmed = 0 THEN 1 ELSE 0 END) as wait_prod,
                   SUM(CASE WHEN is_production_done = 1 AND is_confirmed = 0 THEN 1 ELSE 0 END) as prod_done,
                   SUM(CASE WHEN is_production_done = 1 AND is_loading_done = 0 AND is_confirmed = 0 THEN 1 ELSE 0 END) as wait_load,
                   SUM(CASE WHEN is_loading_done = 1 THEN 1 ELSE 0 END) as loaded
                   FROM $table";
                   
        $summary = $pdo->query($sumSql)->fetch(PDO::FETCH_ASSOC);

        echo json_encode(['success'=>true, 'data'=>$data, 'summary'=>$summary]);
        exit;
    }

    // ------------------------------------------------------------------
    // 2. IMPORT (Universal Logic + Sequence Ordering)
    // ------------------------------------------------------------------
    if ($action === 'import') {
        if (!isset($_FILES['file'])) throw new Exception("No file uploaded");
        
        $file = $_FILES['file']['tmp_name'];
        
        // Auto-Detect Delimiter & Clean BOM
        $handle = fopen($file, "r");
        $firstLine = fgets($handle);
        fclose($handle);
        $firstLine = preg_replace('/^\xEF\xBB\xBF/', '', $firstLine); 
        $delimiter = (substr_count($firstLine, ';') > substr_count($firstLine, ',')) ? ';' : ',';

        $csv = new SplFileObject($file);
        $csv->setFlags(SplFileObject::READ_CSV | SplFileObject::READ_AHEAD | SplFileObject::SKIP_EMPTY | SplFileObject::DROP_NEW_LINE);
        $csv->setCsvControl($delimiter);
        
        $pdo->beginTransaction();
        $count = 0;
        $skippedCount = 0;
        $errorLogs = [];
        
        // Header Mapping Logic
        $csv->rewind();
        $headers = $csv->current(); 
        
        $headerMap = [];
        if ($headers) {
            foreach ($headers as $index => $colName) {
                $cleanName = strtolower(trim(preg_replace('/[\x00-\x1F\x80-\xFF]/', '', $colName))); 
                $headerMap[$cleanName] = $index;
            }
        }

        $getCol = function($row, $names) use ($headerMap) {
            foreach ($names as $name) {
                $n = strtolower($name);
                if (isset($headerMap[$n]) && isset($row[$headerMap[$n]])) {
                    return trim($row[$headerMap[$n]]);
                }
            }
            return '';
        };

        // [NEW Logic] หาเลขลำดับสูงสุดที่มีอยู่ในระบบตอนนี้ก่อน
        $sqlMax = "SELECT MAX(custom_order) FROM $table";
        $maxOrder = $pdo->query($sqlMax)->fetchColumn();
        $currentOrder = ($maxOrder) ? (int)$maxOrder : 0; 

        // SQL MERGE
        $sql = "MERGE INTO $table AS T 
                USING (VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)) 
                AS S(odate, descr, color, sku, po, qty, dc, lweek, sweek, pdate, pdone, ldate, ldone, ticket, idate, istat, rem, iconf, corder)
                ON T.po_number = S.po AND T.sku = S.sku
                WHEN MATCHED THEN UPDATE SET 
                    description=S.descr, color=S.color, quantity=S.qty, dc_location=S.dc,
                    loading_week=S.lweek, shipping_week=S.sweek,
                    production_date=S.pdate, is_production_done=S.pdone,
                    loading_date=S.ldate, is_loading_done=S.ldone,
                    ticket_number=S.ticket, inspection_date=S.idate, inspection_status=S.istat, 
                    remark=S.rem, is_confirmed=S.iconf,
                    custom_order=S.corder, -- อัปเดตให้รายการเก่ามายืนเรียงตามไฟล์ใหม่
                    updated_at=GETDATE()
                WHEN NOT MATCHED THEN INSERT 
                    (order_date, description, color, sku, po_number, quantity, dc_location, 
                     loading_week, shipping_week, 
                     production_date, is_production_done, 
                     loading_date, is_loading_done, 
                     ticket_number, inspection_date, inspection_status, remark, is_confirmed, custom_order)
                VALUES (S.odate, S.descr, S.color, S.sku, S.po, S.qty, S.dc, S.lweek, S.sweek, S.pdate, S.pdone, S.ldate, S.ldone, S.ticket, S.idate, S.istat, S.rem, S.iconf, S.corder);";
        
        $stmt = $pdo->prepare($sql);

        $csv->next(); 
        
        while (!$csv->eof()) {
            $row = $csv->current();
            $csv->next();
            if (empty($row) || count($row) < 2) continue;

            $po  = $getCol($row, ['po', 'po number', 'po_number', 'p.o.']);
            $sku = $getCol($row, ['sku', 'item code', 'material']);
            
            if (empty($po)) {
                $skippedCount++;
                continue; 
            }

            try {
                // [NEW Logic] เพิ่มลำดับทีละ 1 ต่อจากเลขสูงสุดเดิม
                $currentOrder++; 

                // Date Parser
                $fnDate = function($val) {
                    if (empty($val)) return null;
                    if (is_numeric($val)) {
                         $unix = ($val - 25569) * 86400;
                         return gmdate("Y-m-d", $unix);
                    }
                    $d = DateTime::createFromFormat('d/m/Y', $val);
                    if (!$d) $d = DateTime::createFromFormat('Y-m-d', $val);
                    if (!$d) $d = date_create($val); 
                    return $d ? $d->format('Y-m-d') : null;
                };

                $oDate = $fnDate($getCol($row, ['order date', 'date', 'odate']));
                
                // Production Status logic
                $rawPrd = $getCol($row, ['prd completed date', 'production date', 'prod date', 'pdate']);
                $prdStatus = (stripos($rawPrd, 'Done') !== false || stripos($rawPrd, 'OK') !== false) ? 1 : 0;
                $statusColPrd = $getCol($row, ['production status']);
                if (stripos($statusColPrd, 'Done') !== false) $prdStatus = 1;
                if ($fnDate($rawPrd)) $prdStatus = 1;

                // Loading Status logic
                $rawLoad = $getCol($row, ['load', 'loading date', 'load date', 'ldate']);
                $loadStatus = (stripos($rawLoad, 'Shipped') !== false || stripos($rawLoad, 'Done') !== false) ? 1 : 0;
                $statusColLoad = $getCol($row, ['loading status']);
                if (stripos($statusColLoad, 'Shipped') !== false) $loadStatus = 1;
                if ($fnDate($rawLoad)) $loadStatus = 1;

                // Qty logic
                $qtyStr = $getCol($row, ['qty', 'quantity', 'amount']);
                $qty = intval(str_replace(',', '', $qtyStr));

                // Inspection logic
                $rawInsp = $getCol($row, ['inspection information', 'inspection', 'inspection date', 'qc date']);
                $ticket = '';
                $ticketDirect = $getCol($row, ['ticket number', 'ticket']);
                if (!empty($ticketDirect)) {
                    $ticket = $ticketDirect;
                } else if (preg_match('/INSP-\d+/', $rawInsp, $m)) { 
                    $ticket = $m[0]; 
                }
                $inspDate = $fnDate($rawInsp);
                $inspStatus = (stripos($rawInsp, 'OK') !== false || stripos($rawInsp, 'Pass') !== false) ? 'Pass' : '';
                $statusColInsp = $getCol($row, ['inspection status']);
                if (!empty($statusColInsp)) $inspStatus = $statusColInsp;

                // Confirmed Status
                $rawConf = $getCol($row, ['confirmed', 'is_confirmed', 'conf.']);
                $isConf = (stripos($rawConf, 'Yes') !== false || $rawConf == '1' || stripos($rawConf, 'True') !== false) ? 1 : 0;

                // Execute SQL
                $stmt->execute([
                    $oDate,
                    $getCol($row, ['description', 'desc', 'product name']),
                    $getCol($row, ['color', 'colour']),
                    $sku,
                    $po,
                    $qty,
                    $getCol($row, ['dc', 'dc location', 'location']),
                    $getCol($row, ['original loading week', 'loading week', 'load week']), 
                    $getCol($row, ['original shipping week', 'shipping week', 'ship week']),
                    $fnDate($rawPrd),
                    $prdStatus,
                    $fnDate($rawLoad),
                    $loadStatus,
                    $ticket,
                    $inspDate,
                    $inspStatus,
                    $getCol($row, ['remark', 'comment', 'notes']),
                    $isConf,
                    $currentOrder // <-- ใช้ตัวแปรที่นับต่อจาก Max เดิม
                ]);
                $count++;
            } catch (Exception $ex) {
                $skippedCount++;
                $errorLogs[] = "PO $po: " . $ex->getMessage();
            }
        }

        $pdo->commit();
        echo json_encode([
            'success' => true, 
            'imported_count' => $count,
            'skipped_count' => $skippedCount,
            'errors' => array_slice($errorLogs, 0, 10),
            'message' => "Processed: $count success"
        ]);
        exit;
    }

    // ------------------------------------------------------------------
    // [NEW] 3. REORDER ITEMS (Action สำหรับการลากวาง)
    // ------------------------------------------------------------------
    if ($action === 'reorder_items') {
        $in = json_decode(file_get_contents('php://input'), true);
        $orderedIds = $in['orderedIds'] ?? [];

        if (!empty($orderedIds)) {
            $pdo->beginTransaction();
            try {
                // อัปเดตทีละรายการตามลำดับที่ส่งมา
                $sql = "UPDATE $table SET custom_order = ? WHERE id = ?";
                $stmt = $pdo->prepare($sql);
                foreach ($orderedIds as $index => $id) {
                    // index + 1 เพื่อเริ่มที่ 1
                    $stmt->execute([$index + 1, $id]);
                }
                $pdo->commit();
                echo json_encode(['success' => true]);
            } catch (Exception $e) {
                $pdo->rollBack();
                http_response_code(500);
                echo json_encode(['success' => false, 'message' => $e->getMessage()]);
            }
        } else {
            echo json_encode(['success' => false]);
        }
        exit;
    }

    // ------------------------------------------------------------------
    // 4. UPDATE CHECKBOX (เหมือนเดิม)
    // ------------------------------------------------------------------
    if ($action === 'update_check') {
        $in = json_decode(file_get_contents('php://input'), true);
        $field = $in['field']; 
        $id = $in['id'];
        
        $col = ''; 
        if ($field === 'prod') { $col='is_production_done'; }
        elseif ($field === 'load') { $col='is_loading_done'; }
        elseif ($field === 'insp') { 
            $in['checked'] = $in['checked'] ? true : false;
            $val = $in['checked'] ? 'Pass' : 'Wait'; 
            $col='inspection_status'; 
        }
        elseif ($field === 'confirm') { $col='is_confirmed'; }

        if ($field !== 'insp') {
            $val = $in['checked'] ? 1 : 0;
        }

        if ($col) {
            $sql = "UPDATE $table SET $col = ?, updated_at = GETDATE() WHERE id = ?";
            $pdo->prepare($sql)->execute([$val, $id]);
            echo json_encode(['success'=>true]);
        }
        exit;
    }

    // ------------------------------------------------------------------
    // 5. UPDATE CELL (เหมือนเดิม)
    // ------------------------------------------------------------------
    if ($action === 'update_cell') {
        $in = json_decode(file_get_contents('php://input'), true);
        $id = $in['id']; $field = $in['field']; $value = $in['value'];
        $allowedFields = ['quantity', 'loading_week', 'shipping_week', 'ticket_number', 'remark', 'production_date', 'loading_date', 'inspection_date', 'inspection_status', 'dc_location'];
        
        if (in_array($field, $allowedFields)) {
            if ($value === '') $value = null;
            $pdo->prepare("UPDATE $table SET $field = ?, updated_at = GETDATE() WHERE id = ?")->execute([$value, $id]);
            echo json_encode(['success'=>true]);
        } else {
            http_response_code(400); echo json_encode(['success'=>false]);
        }
        exit;
    }

    // ------------------------------------------------------------------
    // 6. CREATE SINGLE (เหมือนเดิม - เพิ่ม custom_order default)
    // ------------------------------------------------------------------
    if ($action === 'create_single') {
        $in = json_decode(file_get_contents('php://input'), true);
        
        if (empty($in['po_number']) || empty($in['sku'])) {
            throw new Exception("PO Number and SKU are required.");
        }

        // หา max order ปัจจุบัน เพื่อต่อท้าย
        $maxSql = "SELECT MAX(custom_order) FROM $table";
        $maxOrder = $pdo->query($maxSql)->fetchColumn();
        $nextOrder = ($maxOrder) ? $maxOrder + 1 : 1;

        $sql = "INSERT INTO $table (
                    po_number, sku, order_date, description, color, quantity, dc_location, 
                    loading_week, shipping_week, remark, 
                    production_status, loading_status, is_confirmed, custom_order, created_at
                ) VALUES (
                    ?, ?, ?, ?, ?, ?, ?, 
                    ?, ?, ?, 
                    'WAIT', 'WAIT', 0, ?, GETDATE()
                )";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            trim($in['po_number']),
            trim($in['sku']),
            !empty($in['order_date']) ? $in['order_date'] : null,
            $in['description'] ?? '',
            $in['color'] ?? '',
            intval($in['quantity'] ?? 0),
            $in['dc_location'] ?? '',
            $in['loading_week'] ?? '',
            $in['shipping_week'] ?? '',
            $in['remark'] ?? '',
            $nextOrder // ใส่ต่อท้ายสุด
        ]);

        echo json_encode(['success'=>true, 'message'=>'New order created.']);
        exit;
    }

} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500); echo json_encode(['success'=>false, 'message'=>$e->getMessage()]);
}
?>