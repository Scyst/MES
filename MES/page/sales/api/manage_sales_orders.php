<?php
// page/sales/api/manage_sales_orders.php
header('Content-Type: application/json');

// 1. เรียก init.php (ได้ Session, Auth, Config ครบจบในบรรทัดเดียว)
require_once __DIR__ . '/../../components/init.php'; 

// 2. ตรวจสอบสิทธิ์ (Security Guard)
if (!isset($_SESSION['user'])) {
    http_response_code(401); 
    echo json_encode(['success'=>false, 'message'=>'Unauthorized']); 
    exit;
}

// 3. ใช้ค่าคงที่จาก Config (ไม่ต้องเขียน if-else เช็ค Dev Mode ซ้ำซ้อน)
$table = defined('SALES_ORDERS_TABLE') ? SALES_ORDERS_TABLE : 'SALES_ORDERS';
$itemsTable = defined('ITEMS_TABLE') ? ITEMS_TABLE : 'ITEMS';

$action = $_REQUEST['action'] ?? 'read';

try {
    // 4. เชื่อมต่อฐานข้อมูล (ถ้า init.php ไม่ได้สร้าง $pdo ให้)
    if (!isset($pdo)) {
        $pdo = new PDO("sqlsrv:Server=".DB_HOST.";Database=".DB_DATABASE, DB_USER, DB_PASSWORD);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    }

    // ------------------------------------------------------------------
    // 1. READ
    // ------------------------------------------------------------------
    if ($action === 'read') {
        $filter = $_GET['status'] ?? 'ACTIVE'; 
        
        // [PERFORMANCE FIX] เลือกเฉพาะคอลัมน์ที่ใช้จริง (ป้องกันเว็บค้างจากข้อมูลเยอะเกิน)
        $columns = "
            s.id, s.po_number, s.sku, s.quantity, 
            s.order_date, s.description, s.color,
            s.dc_location, s.loading_week, s.shipping_week, s.remark,
            s.production_status, s.loading_status, 
            s.is_loading_done, s.is_production_done, 
            s.is_confirmed, s.custom_order, s.created_at
        ";

        $sql = "SELECT $columns, COALESCE(i.Price_USD, i.StandardPrice, 0) as price 
                FROM $table s 
                LEFT JOIN $itemsTable i ON s.sku = i.sku 
                WHERE 1=1";
        
        // Filter Logic
        if ($filter === 'ACTIVE')    $sql .= " AND (is_confirmed = 0 OR is_confirmed IS NULL)";
        if ($filter === 'WAIT_PROD') $sql .= " AND is_production_done = 0 AND is_confirmed = 0";
        if ($filter === 'PROD_DONE') $sql .= " AND is_production_done = 1 AND is_confirmed = 0";
        if ($filter === 'WAIT_LOAD') $sql .= " AND is_production_done = 1 AND is_loading_done = 0 AND is_confirmed = 0";
        if ($filter === 'LOADED')    $sql .= " AND is_loading_done = 1";
        
        // Sorting
        $sql .= " ORDER BY ISNULL(custom_order, 999999) ASC, id DESC";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute();
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Summary Count
        $sumSql = "SELECT 
                   COUNT(*) as total_all,
                   SUM(CASE WHEN is_confirmed = 0 OR is_confirmed IS NULL THEN 1 ELSE 0 END) as total_active,
                   SUM(CASE WHEN is_production_done = 0 AND (is_confirmed = 0 OR is_confirmed IS NULL) THEN 1 ELSE 0 END) as wait_prod,
                   SUM(CASE WHEN is_production_done = 1 AND (is_confirmed = 0 OR is_confirmed IS NULL) THEN 1 ELSE 0 END) as prod_done,
                   SUM(CASE WHEN is_production_done = 1 AND is_loading_done = 0 AND (is_confirmed = 0 OR is_confirmed IS NULL) THEN 1 ELSE 0 END) as wait_load,
                   SUM(CASE WHEN is_loading_done = 1 THEN 1 ELSE 0 END) as loaded
                   FROM $table";
                   
        $summary = $pdo->query($sumSql)->fetch(PDO::FETCH_ASSOC);

        echo json_encode(['success'=>true, 'data'=>$data, 'summary'=>$summary]);
        exit;
    }

    // ------------------------------------------------------------------
    // 2. IMPORT (Universal Logic)
    // ------------------------------------------------------------------
    if ($action === 'import') {
        if (!isset($_FILES['file'])) throw new Exception("No file uploaded");
        
        $file = $_FILES['file']['tmp_name'];
        
        // Clean BOM & Detect Delimiter
        $handle = fopen($file, "r");
        $firstLine = fgets($handle);
        fclose($handle);
        $firstLine = preg_replace('/^\xEF\xBB\xBF/', '', $firstLine); 
        $delimiter = (substr_count($firstLine, ';') > substr_count($firstLine, ',')) ? ';' : ',';

        $csv = new SplFileObject($file);
        $csv->setFlags(SplFileObject::READ_CSV | SplFileObject::READ_AHEAD | SplFileObject::SKIP_EMPTY | SplFileObject::DROP_NEW_LINE);
        $csv->setCsvControl($delimiter);
        
        $pdo->beginTransaction();
        $count = 0; $skippedCount = 0; $errorLogs = [];
        
        // Map Headers
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
                if (isset($headerMap[$n]) && isset($row[$headerMap[$n]])) return trim($row[$headerMap[$n]]);
            }
            return '';
        };

        // หาเลข Custom Order สูงสุด
        $sqlMax = "SELECT MAX(custom_order) FROM $table";
        $maxOrder = $pdo->query($sqlMax)->fetchColumn();
        $currentOrder = ($maxOrder) ? (int)$maxOrder : 0; 

        // Prepared Statement (MERGE)
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
                    custom_order=S.corder,
                    updated_at=GETDATE()
                WHEN NOT MATCHED THEN INSERT 
                    (order_date, description, color, sku, po_number, quantity, dc_location, 
                     loading_week, shipping_week, production_date, is_production_done, 
                     loading_date, is_loading_done, ticket_number, inspection_date, inspection_status, remark, is_confirmed, custom_order)
                VALUES (S.odate, S.descr, S.color, S.sku, S.po, S.qty, S.dc, S.lweek, S.sweek, S.pdate, S.pdone, S.ldate, S.ldone, S.ticket, S.idate, S.istat, S.rem, S.iconf, S.corder);";
        
        $stmt = $pdo->prepare($sql);

        $csv->next(); 
        while (!$csv->eof()) {
            $row = $csv->current();
            $csv->next();
            if (empty($row) || count($row) < 2) continue;

            $po = $getCol($row, ['po', 'po number', 'po_number', 'p.o.']);
            $sku = $getCol($row, ['sku', 'item code', 'material']);
            
            if (empty($po)) { $skippedCount++; continue; }

            try {
                $currentOrder++; 
                $fnDate = function($val) {
                    if (empty($val)) return null;
                    if (is_numeric($val)) return gmdate("Y-m-d", ($val - 25569) * 86400);
                    $d = DateTime::createFromFormat('d/m/Y', $val);
                    if (!$d) $d = DateTime::createFromFormat('Y-m-d', $val);
                    if (!$d) $d = date_create($val); 
                    return $d ? $d->format('Y-m-d') : null;
                };

                $rawPrd = $getCol($row, ['prd completed date', 'production date', 'pdate']);
                $prdStatus = (stripos($rawPrd, 'Done') !== false || $fnDate($rawPrd)) ? 1 : 0;

                $rawLoad = $getCol($row, ['load', 'loading date', 'ldate']);
                $loadStatus = (stripos($rawLoad, 'Shipped') !== false || $fnDate($rawLoad)) ? 1 : 0;

                $qty = intval(str_replace(',', '', $getCol($row, ['qty', 'quantity', 'amount'])));
                $rawConf = $getCol($row, ['confirmed', 'is_confirmed']);
                $isConf = (stripos($rawConf, 'Yes') !== false || $rawConf == '1') ? 1 : 0;

                $stmt->execute([
                    $fnDate($getCol($row, ['order date', 'date', 'odate'])),
                    $getCol($row, ['description', 'desc']),
                    $getCol($row, ['color', 'colour']),
                    $sku, $po, $qty,
                    $getCol($row, ['dc', 'dc location']),
                    $getCol($row, ['original loading week', 'loading week']), 
                    $getCol($row, ['original shipping week', 'shipping week']),
                    $fnDate($rawPrd), $prdStatus,
                    $fnDate($rawLoad), $loadStatus,
                    $getCol($row, ['ticket number', 'ticket']),
                    $fnDate($getCol($row, ['inspection date'])),
                    $getCol($row, ['inspection status']),
                    $getCol($row, ['remark', 'comment']),
                    $isConf, $currentOrder
                ]);
                $count++;
            } catch (Exception $ex) {
                $skippedCount++;
                $errorLogs[] = "PO $po: " . $ex->getMessage();
            }
        }
        $pdo->commit();
        echo json_encode([
            'success' => true, 'imported_count' => $count, 'skipped_count' => $skippedCount,
            'errors' => array_slice($errorLogs, 0, 10)
        ]);
        exit;
    }

    // ------------------------------------------------------------------
    // 3. REORDER & UPDATE (ส่วนอื่นๆ เหมือนเดิม)
    // ------------------------------------------------------------------
    if ($action === 'reorder_items') {
        $in = json_decode(file_get_contents('php://input'), true);
        if (!empty($in['orderedIds'])) {
            $pdo->beginTransaction();
            $sql = "UPDATE $table SET custom_order = ? WHERE id = ?";
            $stmt = $pdo->prepare($sql);
            foreach ($in['orderedIds'] as $idx => $id) $stmt->execute([$idx + 1, $id]);
            $pdo->commit();
        }
        echo json_encode(['success' => true]);
        exit;
    }

    if ($action === 'update_check') {
        $in = json_decode(file_get_contents('php://input'), true);
        $val = $in['checked'] ? 1 : 0;
        $col = ($in['field']=='prod')?'is_production_done':(($in['field']=='load')?'is_loading_done':(($in['field']=='confirm')?'is_confirmed':''));
        if($col) $pdo->prepare("UPDATE $table SET $col = ?, updated_at = GETDATE() WHERE id = ?")->execute([$val, $in['id']]);
        echo json_encode(['success'=>true]);
        exit;
    }

    if ($action === 'update_cell') {
        $in = json_decode(file_get_contents('php://input'), true);
        $allowed = ['quantity', 'loading_week', 'shipping_week', 'remark', 'dc_location'];
        if (in_array($in['field'], $allowed)) {
            $pdo->prepare("UPDATE $table SET {$in['field']} = ?, updated_at = GETDATE() WHERE id = ?")
                ->execute([$in['value'] ?: null, $in['id']]);
            echo json_encode(['success'=>true]);
        }
        exit;
    }

    if ($action === 'create_single') {
        $in = json_decode(file_get_contents('php://input'), true);
        $maxOrder = $pdo->query("SELECT MAX(custom_order) FROM $table")->fetchColumn();
        $nextOrder = $maxOrder ? $maxOrder + 1 : 1;
        
        $sql = "INSERT INTO $table (po_number, sku, order_date, description, color, quantity, dc_location, loading_week, shipping_week, remark, custom_order, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, GETDATE())";
        $pdo->prepare($sql)->execute([
            $in['po_number'], $in['sku'], $in['order_date']?:null, $in['description']??'', $in['color']??'', 
            $in['quantity']??0, $in['dc_location']??'', $in['loading_week']??'', $in['shipping_week']??'', $in['remark']??'', $nextOrder
        ]);
        echo json_encode(['success'=>true]);
        exit;
    }

} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500); 
    echo json_encode(['success'=>false, 'message'=>$e->getMessage()]);
}
?>