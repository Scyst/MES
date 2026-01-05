<?php
// page/sales/api/manage_sales_orders.php
header('Content-Type: application/json');

ini_set('display_errors', 0);
error_reporting(E_ALL);

require_once __DIR__ . '/../../components/init.php'; 

if (!isset($_SESSION['user'])) {
    http_response_code(401); 
    echo json_encode(['success'=>false, 'message'=>'Unauthorized']); 
    exit;
}

$table = defined('SALES_ORDERS_TABLE') ? SALES_ORDERS_TABLE : 'SALES_ORDERS';
$itemsTable = defined('ITEMS_TABLE') ? ITEMS_TABLE : 'ITEMS';

$action = $_REQUEST['action'] ?? 'read';

try {
    if (!isset($pdo)) {
        $pdo = new PDO("sqlsrv:Server=".DB_HOST.";Database=".DB_DATABASE, DB_USER, DB_PASSWORD);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    }

    // Helper: แปลงวันที่
    $fnDate = function($val) {
        if (empty($val)) return null;
        $val = trim($val);
        if (is_numeric($val)) return gmdate("Y-m-d", ($val - 25569) * 86400);
        
        $val = explode(' ', $val)[0]; 
        $d = DateTime::createFromFormat('d/m/Y', $val);
        if ($d && $d->format('d/m/Y') == $val) return $d->format('Y-m-d');
        
        $d = DateTime::createFromFormat('j/n/Y', $val);
        if ($d) return $d->format('Y-m-d');

        $valClean = str_replace('/', '-', $val);
        $ts = strtotime($valClean);
        return $ts ? date('Y-m-d', $ts) : null;
    };

    // Helper: เช็คว่าเป็น Yes/Done หรือไม่
    $isYes = function($val) {
        if (empty($val)) return false;
        $v = strtolower(trim($val));
        return in_array($v, ['yes', 'done', 'shipped', 'ok', '1', 'true', 'y', 'pass']);
    };

    // ------------------------------------------------------------------
    // 1. READ
    // ------------------------------------------------------------------
    if ($action === 'read') {
        $filter = $_GET['status'] ?? 'ACTIVE'; 
        
        $columns = "
            s.id, s.po_number, s.sku, s.quantity, 
            s.order_date, s.description, s.color,
            s.dc_location, s.loading_week, s.shipping_week, s.remark,
            s.production_status, s.loading_status, 
            s.is_loading_done, s.is_production_done, 
            s.is_confirmed, s.custom_order, s.created_at,
            s.production_date, s.loading_date, s.inspection_date,
            s.inspection_status
        ";

        $sql = "SELECT $columns, 
                (COALESCE(i.Price_USD, i.StandardPrice, 0) * ISNULL(s.quantity, 0)) as price 
                FROM $table s 
                LEFT JOIN $itemsTable i ON s.sku = i.sku 
                WHERE 1=1";
        
        if ($filter === 'ACTIVE')    $sql .= " AND (is_confirmed = 0 OR is_confirmed IS NULL)";
        if ($filter === 'WAIT_PROD') $sql .= " AND is_production_done = 0 AND is_confirmed = 0";
        if ($filter === 'PROD_DONE') $sql .= " AND is_production_done = 1 AND is_confirmed = 0";
        if ($filter === 'WAIT_LOAD') $sql .= " AND is_production_done = 1 AND is_loading_done = 0 AND is_confirmed = 0";
        if ($filter === 'LOADED')    $sql .= " AND is_loading_done = 1";
        
        $sql .= " ORDER BY ISNULL(custom_order, 999999) ASC, id DESC";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute();
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

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
    // 2. IMPORT (แก้ไข Logic Inspection Status)
    // ------------------------------------------------------------------
    if ($action === 'import') {
        if (!isset($_FILES['file'])) throw new Exception("No file uploaded");
        
        $file = $_FILES['file']['tmp_name'];
        $content = file_get_contents($file);
        $bom = pack("CCC", 0xef, 0xbb, 0xbf);
        if (0 === strncmp($content, $bom, 3)) file_put_contents($file, substr($content, 3));
        
        $handle = fopen($file, "r");
        $firstLine = fgets($handle);
        fclose($handle);
        $delimiter = (substr_count($firstLine, ';') > substr_count($firstLine, ',')) ? ';' : ',';

        $csv = new SplFileObject($file);
        $csv->setFlags(SplFileObject::READ_CSV | SplFileObject::READ_AHEAD | SplFileObject::SKIP_EMPTY | SplFileObject::DROP_NEW_LINE);
        $csv->setCsvControl($delimiter);
        
        $pdo->beginTransaction();
        $count = 0; $skippedCount = 0; $errorLogs = [];
        
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

        $sqlMax = "SELECT MAX(custom_order) FROM $table";
        $maxOrder = $pdo->query($sqlMax)->fetchColumn();
        $currentOrder = ($maxOrder) ? (int)$maxOrder : 0; 

        $sql = "MERGE INTO $table AS T 
                USING (VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)) 
                AS S(odate, descr, color, sku, po, qty, dc, lweek, sweek, pdate, pdone, ldate, ldone, ticket, idate, istat, rem, iconf, corder)
                ON T.po_number = S.po -- ใช้แค่ PO Number เป็นตัวเชื่อมข้อมูล
                WHEN MATCHED THEN UPDATE SET 
                    T.sku = S.sku,
                    T.description = S.descr, 
                    T.color = S.color, 
                    T.quantity = S.qty, -- จะใช้ค่า $qty ที่ดัก null/0 ไว้แล้ว
                    T.dc_location = S.dc,
                    T.loading_week = S.lweek, 
                    T.shipping_week = S.sweek,
                    T.production_date = S.pdate, 
                    T.is_production_done = S.pdone,
                    T.loading_date = S.ldate, 
                    T.is_loading_done = S.ldone,
                    T.ticket_number = S.ticket, 
                    T.inspection_date = S.idate, 
                    T.inspection_status = S.istat, 
                    T.remark = S.rem, 
                    T.is_confirmed = S.iconf,
                    T.updated_at = GETDATE()
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

                // --- [Logic การอ่านค่าและสถานะคงเดิม] ---
                $rawPrdDate = $getCol($row, ['prd completed date', 'production date', 'pdate']);
                $rawLoadDate = $getCol($row, ['load', 'loading date', 'ldate']);
                $rawInspDate = $getCol($row, ['inspection date', 'insp date']);
                $txtPrdStatus = $getCol($row, ['production status', 'prd status']);
                $txtLoadStatus = $getCol($row, ['loading status', 'load status']);
                $txtConfirm = $getCol($row, ['confirmed', 'is_confirmed']);
                $txtInspStatus = $getCol($row, ['inspection status', 'inspection result']);

                $prdStatus = ($isYes($txtPrdStatus) || $isYes($rawPrdDate)) ? 1 : 0;
                $loadStatus = ($isYes($txtLoadStatus) || $isYes($rawLoadDate)) ? 1 : 0;
                $isConf = $isYes($txtConfirm) ? 1 : 0;

                $finalInspStatus = $txtInspStatus; 
                if ($isYes($txtInspStatus)) $finalInspStatus = 'Pass';

                // --- [FIXED: ย้ายมาไว้ใน Loop และแก้ Logic Qty] ---
                $rawQty = $getCol($row, ['qty', 'quantity', 'amount']);
                $qty = null; 
                if ($rawQty !== '') {
                    $cleanQty = str_replace(',', '', $rawQty);
                    if (is_numeric($cleanQty)) {
                        $qty = (float)$cleanQty; // เก็บ 0 เป็น 0, เก็บเลขเป็นเลข
                    }
                }
                // --------------------------------------------------

                $stmt->execute([
                    $fnDate($getCol($row, ['order date', 'date', 'odate'])),
                    $getCol($row, ['description', 'desc']),
                    $getCol($row, ['color', 'colour']),
                    $sku, $po, $qty, // ใช้ $qty ที่ดักแล้ว
                    $getCol($row, ['dc', 'dc location']),
                    $getCol($row, ['original loading week', 'loading week']), 
                    $getCol($row, ['original shipping week', 'shipping week']),
                    $fnDate($rawPrdDate), $prdStatus,
                    $fnDate($rawLoadDate), $loadStatus, 
                    $getCol($row, ['ticket number', 'ticket']),
                    $fnDate($rawInspDate), 
                    $finalInspStatus, 
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
    // REORDER & UPDATE (แก้ไขให้ติ๊ก Inspection ที่หน้าเว็บได้)
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
        
        // [FIX] เพิ่ม Case สำหรับ 'insp' (Inspection)
        if ($in['field'] == 'insp') {
            // ถ้าติ๊ก -> Pass, ถ้าเอาออก -> (ว่าง)
            $txtVal = $in['checked'] ? 'Pass' : null;
            $pdo->prepare("UPDATE $table SET inspection_status = ?, updated_at = GETDATE() WHERE id = ?")
                ->execute([$txtVal, $in['id']]);
            
        } else {
            // Logic เดิมสำหรับ Prod, Load, Confirm
            $col = ($in['field']=='prod')?'is_production_done':(($in['field']=='load')?'is_loading_done':(($in['field']=='confirm')?'is_confirmed':''));
            if($col) $pdo->prepare("UPDATE $table SET $col = ?, updated_at = GETDATE() WHERE id = ?")->execute([$val, $in['id']]);
        }
        
        echo json_encode(['success'=>true]);
        exit;
    }

    if ($action === 'update_cell') {
        $in = json_decode(file_get_contents('php://input'), true);
        $allowed = ['quantity', 'loading_week', 'shipping_week', 'remark', 'dc_location', 'order_date', 'production_date', 'loading_date', 'inspection_date'];
        if (in_array($in['field'], $allowed)) {
            $val = $in['value'] ?: null;
            if ($val && strpos($in['field'], 'date') !== false) $val = $fnDate($val);
            $pdo->prepare("UPDATE $table SET {$in['field']} = ?, updated_at = GETDATE() WHERE id = ?")->execute([$val, $in['id']]);
            echo json_encode(['success'=>true]);
        } else {
            echo json_encode(['success'=>false, 'message'=>'Field not allowed']);
        }
        exit;
    }

    if ($action === 'create_single') {
        $in = json_decode(file_get_contents('php://input'), true);
        $maxOrder = $pdo->query("SELECT MAX(custom_order) FROM $table")->fetchColumn();
        $nextOrder = $maxOrder ? $maxOrder + 1 : 1;
        $oDate = $fnDate($in['order_date'] ?: null);
        $sql = "INSERT INTO $table (po_number, sku, order_date, description, color, quantity, dc_location, loading_week, shipping_week, remark, custom_order, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, GETDATE())";
        $pdo->prepare($sql)->execute([
            $in['po_number'], $in['sku'], $oDate, $in['description']??'', $in['color']??'', 
            $in['quantity']??0, $in['dc_location']??'', $in['loading_week']??'', $in['shipping_week']??'', $in['remark']??'', $nextOrder
        ]);
        echo json_encode(['success'=>true]);
        exit;
    }

    // ------------------------------------------------------------------
    // 4. EXPORT (Standard: Yes/No Only)
    // ------------------------------------------------------------------
    if ($action === 'export') {
        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename=Sales_Plan_Export.csv');
        $output = fopen('php://output', 'w');
        fprintf($output, chr(0xEF).chr(0xBB).chr(0xBF)); // BOM

        fputcsv($output, [
            'Seq', 'PO Number', 'SKU', 'Description', 'Color', 'Quantity', 'DC',
            'Order Date', 'Loading Week', 'Shipping Week', 
            'Prd Completed Date', 'Loading Date', 'Inspection Date',
            'Production Status', 'Loading Status', 'Confirmed', 
            'Inspection Status', 
            'Ticket Number', 
            'Price (USD)',   
            'Price (THB)',   
            'Remark'
        ]);

        $yn = function($v) { return ($v == 1) ? 'Yes' : 'No'; };
        $dt = function($d) { return ($d) ? date('d/m/Y', strtotime($d)) : ''; };

        // [FIX 1] เพิ่มฟังก์ชันแปลง Inspection (Pass/OK/Done) -> Yes
        $isInspPass = function($v) {
            if (empty($v)) return 'No';
            $v = strtolower(trim($v));
            // ถ้าเจอคำว่า pass, ok, done, yes ให้ถือว่า Yes นอกนั้น No
            return (in_array($v, ['pass', 'ok', 'done', 'yes', '1', 'true'])) ? 'Yes' : 'No';
        };

        $sql = "SELECT s.*, COALESCE(i.Price_USD, i.StandardPrice, 0) as unit_price 
                FROM $table s 
                LEFT JOIN $itemsTable i ON s.sku = i.sku
                ORDER BY ISNULL(custom_order, 999999) ASC, id DESC";
        
        $stmt = $pdo->query($sql);
        
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $qty = intval($row['quantity'] ?: 0);
            $totalUSD = floatval($row['unit_price']) * $qty;
            $totalTHB = $totalUSD * 32.0;

            fputcsv($output, [
                $row['custom_order'], 
                $row['po_number'], $row['sku'], $row['description'], $row['color'], $qty, $row['dc_location'],
                $dt($row['order_date']), $row['loading_week'], $row['shipping_week'],
                $dt($row['production_date']), $dt($row['loading_date']), $dt($row['inspection_date']),
                
                $yn($row['is_production_done']), 
                $yn($row['is_loading_done']),    
                $yn($row['is_confirmed']),       
                
                // [FIX 2] เรียกใช้ฟังก์ชันแปลงค่าตรงนี้ครับ
                $isInspPass($row['inspection_status']), 
                
                $row['ticket_number'], 
                number_format($totalUSD, 2, '.', ''), 
                number_format($totalTHB, 2, '.', ''), 
                $row['remark']
            ]);
        }
        fclose($output);
        exit;
    }

} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500); 
    echo json_encode(['success'=>false, 'message'=>$e->getMessage()]);
}
?>