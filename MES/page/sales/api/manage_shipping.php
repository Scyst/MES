<?php
// page/sales/api/manage_shipping.php

header('Content-Type: application/json');
ini_set('display_errors', 0);
error_reporting(E_ALL);

require_once __DIR__ . '/../../components/init.php';

if (!isset($_SESSION['user'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

$table = defined('SALES_ORDERS_TABLE') ? SALES_ORDERS_TABLE : 'SALES_ORDERS';
$action = $_REQUEST['action'] ?? 'read';

try {
    if (!isset($pdo)) {
        $pdo = new PDO("sqlsrv:Server=" . DB_HOST . ";Database=" . DB_DATABASE, DB_USER, DB_PASSWORD);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    }

    $fnDate = function ($val) {
        if (empty($val)) return null;
        $val = trim($val);
        $val = str_replace('/', '-', $val);
        $ts = strtotime($val);
        return $ts ? date('Y-m-d', $ts) : null;
    };

    switch ($action) {
        case 'read':
            $sql = "SELECT * FROM $table WHERE 1=1 ORDER BY snc_load_day ASC, id DESC";
            $stmt = $pdo->prepare($sql);
            $stmt->execute();
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(['success' => true, 'data' => $data]);
            break;

        case 'import_json':
            if (!hasRole(['admin', 'creator', 'supervisor'])) throw new Exception("Unauthorized Access");
            
            $rows = json_decode($_POST['data'] ?? '[]', true);
            if (empty($rows)) throw new Exception("No data received");

            // แก้ไขเฉพาะส่วน $columnMap ในไฟล์ api/manage_shipping.php
            $columnMap = [
                'Shipping Week' => 'shipping_week', 
                'status' => 'shipping_customer_status',
                'inspect type' => 'inspect_type', 
                'inspection result' => 'inspection_result',
                'SNC LOAD DAY' => 'snc_load_day', 
                'ETD' => 'etd',
                'DC' => 'dc_location', 
                'SKU' => 'sku', 
                'PO' => 'po_number',
                'Booking No.' => 'booking_no', 
                'Invoice' => 'invoice_no',
                'Description' => 'description', 
                'CTNS  Qty (Pieces)' => 'ctns_qty', // [FIXED] เพิ่มเว้นวรรคให้ตรงกับไฟล์ลูกค้า
                'CTN Size' => 'ctn_size', 
                'CONTAINER NO' => 'container_no',
                'SEAL NO.' => 'seal_no', 
                'CONTAINER TARE' => 'container_tare',
                'N.W' => 'net_weight', 
                'G.W' => 'gross_weight', 
                'CBM' => 'cbm',
                'Feeder Vessel' => 'feeder_vessel', 
                'mother vessel' => 'mother_vessel',
                'SNC-CI-NO.' => 'snc_ci_no', 
                'SI/VGM CUT OFF' => 'si_vgm_cut_off',
                'PICK UP' => 'pickup_date', 
                'RTN' => 'return_date', 
                'REMARK' => 'remark'
            ];

            $dateCols = ['snc_load_day', 'etd', 'si_vgm_cut_off', 'pickup_date', 'return_date'];
            $numCols = ['ctns_qty', 'container_tare', 'net_weight', 'gross_weight', 'cbm'];

            $dbFields = array_values($columnMap);
            // Fix: Exclude po_number from SET clause in UPDATE part properly
            $updateSet = [];
            foreach($dbFields as $f) {
                if($f !== 'po_number') $updateSet[] = "T.$f=S.$f";
            }
            $updateSql = implode(', ', $updateSet);
            
            $colNames = implode(', ', $dbFields);
            $placeholders = implode(', ', array_fill(0, count($dbFields), '?'));
            $sourceCols = implode(', ', array_map(function($f){ return "S.$f"; }, $dbFields));

            $sql = "MERGE INTO $table AS T USING (VALUES ($placeholders)) AS S($colNames)
                    ON (T.po_number = S.po_number)
                    WHEN MATCHED THEN UPDATE SET $updateSql, T.updated_at = GETDATE()
                    WHEN NOT MATCHED THEN INSERT ($colNames, created_at, updated_at) VALUES ($sourceCols, GETDATE(), GETDATE());";
            
            $stmt = $pdo->prepare($sql);
            $successCount = 0;

            foreach ($rows as $row) {
                $rowMap = [];
                foreach($row as $k=>$v) $rowMap[strtolower(trim($k))] = $v;
                $poVal = null;
                foreach(['po','po number'] as $k) if(isset($rowMap[$k])) { $poVal = trim($rowMap[$k]); break; }
                if(empty($poVal)) continue;

                $params = [];
                foreach ($columnMap as $header => $col) {
                    $val = $rowMap[strtolower($header)] ?? null;
                    if ($val !== null) {
                        $val = trim($val);
                        if (in_array($col, $dateCols) && $val) $val = $fnDate($val);
                        if (in_array($col, $numCols) && $val!=='') $val = str_replace(',', '', $val);
                    }
                    $params[] = $val;
                }
                $stmt->execute($params);
                $successCount++;
            }
            echo json_encode(['success' => true, 'message' => "Imported $successCount records."]);
            break;

        case 'update_cell':
            $id = $_POST['id'] ?? null;
            $field = $_POST['field'] ?? null;
            $val = $_POST['value'] ?? null;

            // รายการฟิลด์ที่อนุญาต (เช็คให้ชัวร์ว่ามีครบ)
            $allowed = [
                'container_no', 'booking_no', 'invoice_no', 'remark', 'etd', 
                'snc_load_day', 'si_vgm_cut_off', 'pickup_date', 'return_date', 
                'cutoff_date', 'cutoff_time', 'shipping_customer_status', 
                'inspect_type', 'inspection_result', 'dc_location', 
                'feeder_vessel', 'mother_vessel', 'snc_ci_no', 'ctn_size', 
                'seal_no', 'container_tare', 'net_weight', 'gross_weight', 'cbm',
                'shipping_week', 'sku' // เพิ่ม 2 ตัวนี้เผื่อกรณีมีการแก้ไข
            ];

            if ($id && in_array($field, $allowed)) {
                if ($val && (strpos($field, 'date') !== false || in_array($field, ['etd', 'snc_load_day', 'si_vgm_cut_off']))) $val = $fnDate($val);
                
                $sql = "UPDATE $table SET {$field} = ?, updated_at = GETDATE() WHERE id = ?";
                $pdo->prepare($sql)->execute([$val, $id]);
                echo json_encode(['success' => true]);
            } else {
                echo json_encode(['success' => false, 'message' => 'Invalid Field or ID']);
            }
            break;

        case 'update_check':
            // --- [FIXED SECTION] ---
            $id = $_POST['id'] ?? null;
            $field = $_POST['field'] ?? null;
            $val = isset($_POST['checked']) ? (int)$_POST['checked'] : 0;
            
            if ($id && in_array($field, ['is_loading_done', 'is_production_done'])) {
                 $params = [];
                 
                 // ถ้าเป็นการกด Loading Done = 1 ให้ Update วันที่ด้วย
                 if ($field === 'is_loading_done' && $val == 1) {
                     $sql = "UPDATE $table SET is_loading_done = 1, loading_date = COALESCE(loading_date, GETDATE()), updated_at = GETDATE() WHERE id = ?";
                     $params = [$id]; // SQL นี้ใช้แค่ ID ตัวเดียว
                 } else {
                     // กรณีปกติ (Loading = 0 หรือ Production)
                     $sql = "UPDATE $table SET {$field} = ?, updated_at = GETDATE() WHERE id = ?";
                     $params = [$val, $id]; // SQL นี้ใช้ 2 ตัว (ค่า 0/1 และ ID)
                 }

                 $pdo->prepare($sql)->execute($params);
                 echo json_encode(['success' => true]);
            } else {
                 echo json_encode(['success' => false, 'message' => 'Invalid Request']);
            }
            // -----------------------
            break;
             
        default: echo json_encode(['success' => false]);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>