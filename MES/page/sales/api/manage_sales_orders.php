<?php
// page/sales/api/manage_sales_orders.php
header('Content-Type: application/json');
require_once __DIR__ . '/../../db.php'; 
require_once __DIR__ . '/../../../auth/check_auth.php';

if (!isset($_SESSION['user'])) {
    http_response_code(401); echo json_encode(['success'=>false]); exit;
}

$action = $_REQUEST['action'] ?? 'read';
$table = defined('SALES_ORDERS_TABLE') ? SALES_ORDERS_TABLE : 'SALES_ORDERS';
$itemsTable = defined('IS_DEVELOPMENT') && IS_DEVELOPMENT ? 'ITEMS_TEST' : 'ITEMS';

try {
    // 1. READ
    if ($action === 'read') {
        $filter = $_GET['status'] ?? 'ALL';
        // Join ITEMS เพื่อดึงราคามาด้วย
        $sql = "SELECT s.*, COALESCE(i.Price_USD, i.StandardPrice, 0) as price 
                FROM $table s 
                LEFT JOIN $itemsTable i ON s.sku = i.part_no 
                WHERE 1=1";
        
        if ($filter === 'WAIT_PROD') $sql .= " AND is_production_done = 0";
        if ($filter === 'PROD_DONE') $sql .= " AND is_production_done = 1";
        if ($filter === 'WAIT_LOAD') $sql .= " AND is_production_done = 1 AND is_loading_done = 0";
        if ($filter === 'LOADED')    $sql .= " AND is_loading_done = 1";

        $sql .= " ORDER BY order_date DESC, id DESC";
        $stmt = $pdo->prepare($sql);
        $stmt->execute();
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

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

    // 2. IMPORT (เหมือนเดิม)
    if ($action === 'import') {
        if (!isset($_FILES['file'])) throw new Exception("No file");
        
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
                USING (VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)) 
                AS S(po, sku, odate, cname, descr, color, qty, dc, olw, osw, ulw, usw, est, p_str, p_stat, l_str, l_stat, rm, insp)
                ON T.po_number = S.po AND T.sku = S.sku
                WHEN MATCHED THEN UPDATE SET 
                    quantity=S.qty, loading_week=S.ulw, shipping_week=S.usw,
                    production_date_str=S.p_str, production_status=S.p_stat,
                    load_status_str=S.l_str, loading_status=S.l_stat,
                    rm_status=S.rm, inspection_info=S.insp, updated_at=GETDATE()
                WHEN NOT MATCHED THEN INSERT 
                    (po_number, sku, order_date, chinese_name, description, color, quantity, dc_location, 
                     orig_loading_week, orig_shipping_week, loading_week, shipping_week, est_sale,
                     production_date_str, production_status, load_status_str, loading_status, rm_status, inspection_info)
                VALUES (S.po, S.sku, S.odate, S.cname, S.descr, S.color, S.qty, S.dc, S.olw, S.osw, S.ulw, S.usw, S.est, S.p_str, S.p_stat, S.l_str, S.l_stat, S.rm, S.insp);";
        
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
                $fnDate = function($val) {
                    if (empty($val)) return null;
                    $d = DateTime::createFromFormat('d/m/Y', $val);
                    if (!$d) $d = DateTime::createFromFormat('Y-m-d', $val);
                    return $d ? $d->format('Y-m-d') : null;
                };
                $oDate = $fnDate($row[0] ?? '');

                $rawPrd = $row[13] ?? '';
                $prdStatus = (stripos($rawPrd, 'Done') !== false || stripos($rawPrd, 'OK') !== false) ? 'DONE' : 'WAIT';
                
                $rawLoad = $row[14] ?? '';
                $loadStatus = (stripos($rawLoad, 'Shipped') !== false || stripos($rawLoad, 'Done') !== false) ? 'DONE' : 'WAIT';
                
                $qty = intval(str_replace(',', '', $row[6] ?? '0'));

                $stmt->execute([
                    $po, $sku, $oDate,
                    $row[1] ?? '', $row[2] ?? '', $row[3] ?? '',
                    $qty,
                    $row[7] ?? '', $row[8] ?? '', $row[9] ?? '',
                    $row[10] ?? '', $row[11] ?? '', $row[12] ?? '',
                    $rawPrd, $prdStatus,
                    $rawLoad, $loadStatus,
                    $row[15] ?? '', $row[16] ?? ''
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
    // 3. UPDATE CHECKBOX (เพิ่ม insp)
    // ------------------------------------------------------------------
    if ($action === 'update_check') {
        $in = json_decode(file_get_contents('php://input'), true);
        $id = $in['id'];
        $field = $in['field'];
        $checked = $in['checked'] ? 1 : 0;

        $sql = "";
        $params = [$checked, $id];

        // [UPDATED] เพิ่มเคสสำหรับ Inspection
        if ($field === 'prod') {
            $sql = "UPDATE $table SET is_production_done = ?, production_date = GETDATE(), updated_at = GETDATE() WHERE id = ?";
        } elseif ($field === 'load') {
            $sql = "UPDATE $table SET is_loading_done = ?, loading_date = GETDATE(), updated_at = GETDATE() WHERE id = ?";
        } elseif ($field === 'insp') {
            // ถ้าติ๊ก = Pass, ไม่ติ๊ก = Wait (และลงวันที่ตรวจสอบด้วย)
            $statusText = $checked ? 'Pass' : 'Wait';
            $sql = "UPDATE $table SET inspection_status = ?, inspection_date = GETDATE(), updated_at = GETDATE() WHERE id = ?";
            $params = [$statusText, $id];
        } elseif ($field === 'confirm') {
            $sql = "UPDATE $table SET is_confirmed = ?, updated_at = GETDATE() WHERE id = ?";
        }

        if ($sql) {
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            echo json_encode(['success'=>true]);
        } else {
            echo json_encode(['success'=>false, 'message'=>'Invalid field']);
        }
        exit;
    }

    // ------------------------------------------------------------------
    // 4. UPDATE CELL (แก้ไขรายช่อง: เพิ่ม inspection_status)
    // ------------------------------------------------------------------
    if ($action === 'update_cell') {
        $in = json_decode(file_get_contents('php://input'), true);
        $id = $in['id'];
        $field = $in['field'];
        $value = $in['value'];

        // ★★★ เพิ่ม inspection_status เข้าไปในรายการที่อนุญาต ★★★
        $allowedFields = [
            'quantity', 'loading_week', 'shipping_week', 
            'ticket_number', 'remark', 
            'production_date', 'loading_date', 'inspection_date', 
            'inspection_status' // [NEW]
        ];

        if (!in_array($field, $allowedFields)) {
            http_response_code(400); echo json_encode(['success'=>false, 'message'=>'Field not allowed']); exit;
        }

        if ($value === '') $value = null;

        $stmt = $pdo->prepare("UPDATE $table SET $field = ?, updated_at = GETDATE() WHERE id = ?");
        if ($stmt->execute([$value, $id])) {
            echo json_encode(['success'=>true]);
        } else {
            http_response_code(500); echo json_encode(['success'=>false]);
        }
        exit;
    }

} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500); echo json_encode(['success'=>false, 'message'=>$e->getMessage()]);
}
?>