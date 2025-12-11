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
        $filter = $_GET['status'] ?? 'ALL';
        
        // Join เพื่อดึงราคา (Price)
        $sql = "SELECT s.*, COALESCE(i.Price_USD, i.StandardPrice, 0) as price 
                FROM $table s 
                LEFT JOIN $itemsTable i ON s.sku = i.sku 
                WHERE 1=1";
        
        if ($filter === 'WAIT_PROD') $sql .= " AND is_production_done = 0";
        if ($filter === 'PROD_DONE') $sql .= " AND is_production_done = 1";
        if ($filter === 'WAIT_LOAD') $sql .= " AND is_production_done = 1 AND is_loading_done = 0";
        if ($filter === 'LOADED')    $sql .= " AND is_loading_done = 1";

        $sql .= " ORDER BY order_date DESC, id DESC";
        $stmt = $pdo->prepare($sql);
        $stmt->execute();
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // KPI Summary
        $sumSql = "SELECT COUNT(*) as total,
                   SUM(CASE WHEN is_production_done = 0 THEN 1 ELSE 0 END) as wait_prod,
                   SUM(CASE WHEN is_production_done = 1 THEN 1 ELSE 0 END) as prod_done,
                   SUM(CASE WHEN is_production_done = 1 AND is_loading_done = 0 THEN 1 ELSE 0 END) as wait_load,
                   SUM(CASE WHEN is_loading_done = 1 THEN 1 ELSE 0 END) as loaded
                   FROM $table";
        $summary = $pdo->query($sumSql)->fetch(PDO::FETCH_ASSOC);

        echo json_encode(['success'=>true, 'data'=>$data, 'summary'=>$summary]);
        exit;
    }

    // ------------------------------------------------------------------
    // 2. IMPORT (Full Logic)
    // ------------------------------------------------------------------
    if ($action === 'import') {
        if (!isset($_FILES['file'])) throw new Exception("No file uploaded");
        
        $file = $_FILES['file']['tmp_name'];
        
        // Auto-Detect Delimiter
        $handle = fopen($file, "r");
        $firstLine = fgets($handle);
        fclose($handle);
        $delimiter = (substr_count($firstLine, ';') > substr_count($firstLine, ',')) ? ';' : ',';

        $csv = new SplFileObject($file);
        $csv->setFlags(SplFileObject::READ_CSV | SplFileObject::READ_AHEAD | SplFileObject::SKIP_EMPTY | SplFileObject::DROP_NEW_LINE);
        $csv->setCsvControl($delimiter);
        
        $pdo->beginTransaction();
        $count = 0;
        $skippedCount = 0;
        $errorLogs = [];

        // SQL MERGE
        $sql = "MERGE INTO $table AS T 
                USING (VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)) 
                AS S(odate, descr, color, sku, po, qty, dc, lweek, sweek, pdate, pdone, ldate, ldone, ticket, idate, istat, rem)
                ON T.po_number = S.po AND T.sku = S.sku
                WHEN MATCHED THEN UPDATE SET 
                    description=S.descr, color=S.color, quantity=S.qty, dc_location=S.dc,
                    loading_week=S.lweek, shipping_week=S.sweek,
                    production_date=S.pdate, is_production_done=S.pdone,
                    loading_date=S.ldate, is_loading_done=S.ldone,
                    ticket_number=S.ticket, inspection_date=S.idate, inspection_status=S.istat, remark=S.rem,
                    updated_at=GETDATE()
                WHEN NOT MATCHED THEN INSERT 
                    (order_date, description, color, sku, po_number, quantity, dc_location, 
                     loading_week, shipping_week, 
                     production_date, is_production_done, 
                     loading_date, is_loading_done, 
                     ticket_number, inspection_date, inspection_status, remark)
                VALUES (S.odate, S.descr, S.color, S.sku, S.po, S.qty, S.dc, S.lweek, S.sweek, S.pdate, S.pdone, S.ldate, S.ldone, S.ticket, S.idate, S.istat, S.rem);";
        
        $stmt = $pdo->prepare($sql);

        foreach ($csv as $index => $row) {
            if ($index === 0) continue; 
            if (count($row) < 5) continue;

            $po = trim($row[5] ?? '');
            $sku = trim($row[4] ?? '');

            if (empty($po)) {
                $skippedCount++;
                $errorLogs[] = "Line " . ($index+1) . ": Missing PO";
                continue;
            }

            try {
                // Date Helper
                $fnDate = function($val) {
                    if (empty($val)) return null;
                    $d = DateTime::createFromFormat('d/m/Y', $val);
                    if (!$d) $d = DateTime::createFromFormat('Y-m-d', $val);
                    return $d ? $d->format('Y-m-d') : null;
                };
                $oDate = $fnDate($row[0] ?? '');

                // Status Logic
                $rawPrd = $row[13] ?? '';
                $prdStatus = (stripos($rawPrd, 'Done') !== false || stripos($rawPrd, 'OK') !== false) ? 1 : 0;
                
                $rawLoad = $row[14] ?? '';
                $loadStatus = (stripos($rawLoad, 'Shipped') !== false || stripos($rawLoad, 'Done') !== false) ? 1 : 0;
                
                $qty = intval(str_replace(',', '', $row[6] ?? '0'));

                // Inspection Logic
                $rawInsp = $row[16] ?? '';
                $ticket = '';
                if (preg_match('/INSP-\d+/', $rawInsp, $m)) { $ticket = $m[0]; }
                
                $inspDate = $fnDate($rawInsp);
                $inspStatus = '';
                if (stripos($rawInsp, 'OK') !== false || stripos($rawInsp, 'Done') !== false) $inspStatus = 'Pass';
                
                // Execute SQL
                $stmt->execute([
                    $oDate,                 // Order Date
                    $row[2] ?? '',          // Description
                    $row[3] ?? '',          // Color
                    $sku,                   // SKU
                    $po,                    // PO
                    $qty,                   // QTY
                    $row[7] ?? '',          // DC
                    $row[10] ?? '',         // Loading Wk
                    $row[11] ?? '',         // Ship Wk
                    $fnDate($rawPrd),       // Prod Date
                    $prdStatus,             // Prod Status
                    $fnDate($rawLoad),      // Load Date
                    $loadStatus,            // Load Status
                    $ticket,                // Ticket
                    $inspDate,              // Insp Date
                    $inspStatus,            // Insp Status
                    $row[15] ?? ''          // Remark
                ]);
                $count++;
            } catch (Exception $ex) {
                $skippedCount++;
                $errorLogs[] = "Line " . ($index+1) . ": " . $ex->getMessage();
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
    // 3. UPDATE CHECKBOX (ปิด Autofill วันที่ตามข้อ 3)
    // ------------------------------------------------------------------
    if ($action === 'update_check') {
        $in = json_decode(file_get_contents('php://input'), true);
        $field = $in['field']; 
        $id = $in['id'];
        
        $col = ''; $dateCol = null;
        if ($field === 'prod') { $col='is_production_done'; $dateCol='production_date'; }
        elseif ($field === 'load') { $col='is_loading_done'; $dateCol='loading_date'; }
        elseif ($field === 'insp') { 
            $in['checked'] = $in['checked'] ? true : false;
            $val = $in['checked'] ? 'Pass' : 'Wait'; 
            $col='inspection_status'; $dateCol='inspection_date'; 
        }
        elseif ($field === 'confirm') { $col='is_confirmed'; }

        if ($field !== 'insp') {
            $val = $in['checked'] ? 1 : 0;
        }

        if ($col) {
            $sql = "UPDATE $table SET $col = ?";
            
            // --- [CHANGE] ปิดการ Auto Fill วันที่ (ตาม Requirement ข้อ 3) ---
            // if ($dateCol) $sql .= ", $dateCol = GETDATE()"; 
            // -----------------------------------------------------------
            
            $sql .= ", updated_at = GETDATE() WHERE id = ?";
            $pdo->prepare($sql)->execute([$val, $id]);
            echo json_encode(['success'=>true]);
        }
        exit;
    }

    // ------------------------------------------------------------------
    // 4. UPDATE CELL
    // ------------------------------------------------------------------
    if ($action === 'update_cell') {
        $in = json_decode(file_get_contents('php://input'), true);
        $id = $in['id']; $field = $in['field']; $value = $in['value'];
        $allowedFields = ['quantity', 'loading_week', 'shipping_week', 'ticket_number', 'remark', 'production_date', 'loading_date', 'inspection_date', 'inspection_status'];
        
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
    // 5. CREATE SINGLE
    // ------------------------------------------------------------------
    if ($action === 'create_single') {
        $in = json_decode(file_get_contents('php://input'), true);
        
        if (empty($in['po_number']) || empty($in['sku'])) {
            throw new Exception("PO Number and SKU are required.");
        }

        $sql = "INSERT INTO $table (
                    po_number, sku, order_date, description, color, quantity, dc_location, 
                    loading_week, shipping_week, remark, 
                    production_status, loading_status, is_confirmed, created_at
                ) VALUES (
                    ?, ?, ?, ?, ?, ?, ?, 
                    ?, ?, ?, 
                    'WAIT', 'WAIT', 0, GETDATE()
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
            $in['remark'] ?? ''
        ]);

        echo json_encode(['success'=>true, 'message'=>'New order created.']);
        exit;
    }

} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500); echo json_encode(['success'=>false, 'message'=>$e->getMessage()]);
}
?>