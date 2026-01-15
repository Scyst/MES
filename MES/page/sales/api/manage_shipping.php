<?php
// page/sales/api/manage_shipping.php
// [UPDATED] - Cleaned up to use 'loading_date' as Single Source of Truth

define('ALLOW_GUEST_ACCESS', true);

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
$itemsTable = defined('ITEMS_TABLE') ? ITEMS_TABLE : 'ITEMS';

$action = $_REQUEST['action'] ?? 'read';

$isCustomer = (isset($_SESSION['user']['role']) && $_SESSION['user']['role'] === 'CUSTOMER');
$restrictedActions = ['update_cell', 'update_check', 'import_json']; 

if ($isCustomer && in_array($action, $restrictedActions)) {
    echo json_encode(['success' => false, 'message' => 'Access Denied (Read Only)']);
    exit;
}

try {
    if (!isset($pdo)) {
        $pdo = new PDO("sqlsrv:Server=" . DB_HOST . ";Database=" . DB_DATABASE, DB_USER, DB_PASSWORD);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    }

    $fnDate = function ($val) {
        if (empty($val) || $val === 'null' || $val === 'NULL') return null;
        $val = trim($val);
        $val = explode(' ', $val)[0]; 
        if (is_numeric($val) && $val > 20000) return gmdate("Y-m-d", ($val - 25569) * 86400);
        $ts = strtotime($val);
        if ($ts !== false) return date('Y-m-d', $ts);
        $cleanVal = str_replace('/', '-', $val);
        $ts = strtotime($cleanVal);
        if ($ts !== false) return date('Y-m-d', $ts);
        return null; 
    };

    switch ($action) {
        case 'read':
            // [CHANGED] ใช้ loading_date เป็นหลัก
            $startDate = $_REQUEST['start_date'] ?? '';
            $endDate   = $_REQUEST['end_date'] ?? '';
            $dateCondition = "";
            $params = [];

            if (!empty($startDate)) {
                $dateCondition .= " AND s.loading_date >= ? ";
                $params[] = $startDate;
            }
            if (!empty($endDate)) {
                $dateCondition .= " AND s.loading_date <= ? ";
                $params[] = $endDate;
            }

            // [CHANGED] ORDER BY loading_date
            $sql = "SELECT s.*, 
                    (COALESCE(i.Price_USD, i.StandardPrice, 0) * ISNULL(s.quantity, 0)) as price 
                    FROM $table s 
                    LEFT JOIN $itemsTable i ON s.sku = i.sku 
                    WHERE 1=1 " . $dateCondition . " 
                    ORDER BY s.loading_date ASC, s.load_time ASC, s.id DESC"; 

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(['success' => true, 'data' => $data]);
            break;

        case 'export':
            header('Content-Type: text/csv; charset=utf-8');
            header('Content-Disposition: attachment; filename=Shipping_Schedule_Export_' . date('Y-m-d') . '.csv');
            
            $output = fopen('php://output', 'w');
            fprintf($output, chr(0xEF).chr(0xBB).chr(0xBF)); // BOM

            // 1. หัวตาราง
            fputcsv($output, [
                'Seq', 'PO Number', 'Remark', 'SKU', 'Description', 'Quantity',
                'Load Status', 'Prod Status',
                'Load Date', 'Load Time', 'DC Location', // [CHANGED] เปลี่ยนชื่อหัวตารางเป็น Load Date
                'Booking No', 'Invoice No', 
                'Container No', 'Seal No', 'Size', 'Tare', 'Net Weight', 'Gross Weight', 'CBM',
                'Feeder Vessel', 'Mother Vessel', 'SNC CI No',
                'SI/VGM Cutoff', 'Pickup Date', 'Return Date', 'ETD',
                'Inspect Type', 'Inspect Res', 
                'Cutoff Date', 'Cutoff Time'
            ]);

            $dt = function($d) { return ($d && $d != '0000-00-00') ? date('d/m/Y', strtotime($d)) : ''; };
            $tm = function($t) { return ($t) ? date('H:i', strtotime($t)) : ''; };
            $yn = function($v) { return ($v == 1) ? 'Done' : 'Wait'; };

            // 2. [CHANGED] เรียงตาม loading_date และใช้ loading_date ในการแสดงผล
            $sql = "SELECT * FROM $table 
                    ORDER BY 
                        CASE WHEN loading_date IS NULL OR loading_date = '' THEN 1 ELSE 0 END, 
                        loading_date ASC, 
                        load_time ASC, 
                        id DESC";
                    
            $stmt = $pdo->query($sql);

            while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                fputcsv($output, [
                    $row['custom_order'], 
                    $row['po_number'], 
                    $row['remark'],
                    $row['sku'], 
                    $row['description'], 
                    $row['quantity'],
                    $yn($row['is_loading_done']), 
                    $yn($row['is_production_done']),
                    $dt($row['loading_date']),  // [CHANGED] ใช้ loading_date
                    $tm($row['load_time']), 
                    $row['dc_location'],
                    $row['booking_no'], 
                    $row['invoice_no'],
                    $row['container_no'], 
                    $row['seal_no'], 
                    $row['ctn_size'], 
                    $row['container_tare'], 
                    $row['net_weight'], 
                    $row['gross_weight'], 
                    $row['cbm'],
                    $row['feeder_vessel'], 
                    $row['mother_vessel'], 
                    $row['snc_ci_no'],
                    $dt($row['si_vgm_cut_off']), 
                    $dt($row['pickup_date']), 
                    $dt($row['return_date']), 
                    $dt($row['etd']),
                    $row['inspect_type'],
                    $row['inspection_result'], 
                    $dt($row['cutoff_date']), 
                    $tm($row['cutoff_time'])
                ]);
            }
            fclose($output);
            exit;

        case 'import_json':
            $rows = json_decode($_POST['data'] ?? '[]', true);
            if (empty($rows)) throw new Exception("ไม่พบข้อมูลที่จะนำเข้า");

            $successCount = 0; $skipCount = 0; $errors = [];

            $columnMap = [
                'shippingweek' => 'shipping_week', 'status' => 'shipping_customer_status',
                'inspecttype' => 'inspect_type', 'inspectionresult' => 'inspection_result',
                'sncloadday' => 'loading_date', // [CHANGED] แมพหัวตาราง Excel เก่า เข้า loading_date
                'loaddate' => 'loading_date',   // [ADDED] เผื่อหัวตาราง Excel เปลี่ยนชื่อมาแล้ว
                'etd' => 'etd', 'dc' => 'dc_location',
                'sku' => 'sku', 'po' => 'po_number', 'ponumber' => 'po_number',
                'bookingno' => 'booking_no', 'invoice' => 'invoice_no', 'description' => 'description',
                'ctnsqtypieces' => 'quantity', 'qty' => 'quantity', 
                'ctnsize' => 'ctn_size', 'containerno' => 'container_no', 'sealno' => 'seal_no',
                'containertare' => 'container_tare', 'nw' => 'net_weight', 'gw' => 'gross_weight', 'cbm' => 'cbm',
                'feedervessel' => 'feeder_vessel', 'mothervessel' => 'mother_vessel', 'snccino' => 'snc_ci_no',
                'sivgmcutoff' => 'si_vgm_cut_off', 'pickup' => 'pickup_date', 'rtn' => 'return_date', 'remark' => 'remark',
                'loadtime' => 'load_time', 'time' => 'load_time', 'loadingtime' => 'load_time'
            ];

            // [CHANGED] ใช้ loading_date ในรายการวันที่
            $dateCols = ['loading_date', 'etd', 'si_vgm_cut_off', 'pickup_date', 'return_date'];
            $numCols = ['quantity', 'container_tare', 'net_weight', 'gross_weight', 'cbm'];

            $pdo->beginTransaction();
            foreach ($rows as $index => $row) {
                // ... (Logic การ Loop เหมือนเดิม) ...
                $rowNum = $index + 2; 
                $normalizedRow = [];
                foreach ($row as $k => $v) {
                    $cleanK = strtolower(preg_replace('/[^a-z0-9]/i', '', $k));
                    $normalizedRow[$cleanK] = $v;
                }

                $poVal = $normalizedRow['po'] ?? $normalizedRow['ponumber'] ?? null;
                if (empty($poVal)) {
                    if (implode('', $row) !== '') { $skipCount++; $errors[] = "Row $rowNum: Skipped (No PO)"; }
                    continue;
                }

                $fieldsToSet = [];
                foreach ($columnMap as $cleanHeader => $dbCol) {
                    if (isset($normalizedRow[$cleanHeader]) && $dbCol !== 'po_number') {
                        $val = trim($normalizedRow[$cleanHeader]);
                        
                        if (in_array($dbCol, $numCols)) {
                            $val = str_replace(',', '', $val);
                            $val = ($val === '') ? null : ((is_numeric($val)) ? (float)$val : null);
                        } elseif (in_array($dbCol, $dateCols)) {
                            $val = $fnDate($val);
                        } elseif ($dbCol === 'load_time') {
                            if (is_numeric($val)) $val = gmdate("H:i", floor($val * 86400));
                            else $val = ($t = strtotime($val)) ? date("H:i", $t) : null;
                        }
                        
                        $fieldsToSet[$dbCol] = $val;
                    }
                }

                try {
                    $colNames = ['po_number'];
                    $bindParams = [$poVal];
                    $updatePairs = [];
                    foreach ($fieldsToSet as $col => $val) {
                        $colNames[] = $col;
                        $bindParams[] = $val;
                        
                        if ($col !== 'remark') {
                            $updatePairs[] = "T.$col = S.$col";
                        }
                    }

                    if (count($colNames) <= 1) continue;

                    $sql = "MERGE INTO $table AS T 
                            USING (VALUES (".implode(',', array_fill(0, count($colNames), '?')).")) AS S(".implode(',', $colNames).")
                            ON T.po_number = S.po_number
                            WHEN MATCHED THEN UPDATE SET ".implode(',', $updatePairs).", T.updated_at = GETDATE()
                            WHEN NOT MATCHED THEN INSERT (".implode(',', $colNames).", created_at, updated_at) 
                            VALUES (".implode(',', $colNames).", GETDATE(), GETDATE());";

                    $pdo->prepare($sql)->execute($bindParams);
                    $successCount++;
                } catch (Exception $e) {
                    $skipCount++;
                    $errors[] = "Row $rowNum (PO: $poVal): " . $e->getMessage();
                }
            }
            $pdo->commit();
            echo json_encode(['success' => true, 'success_count' => $successCount, 'skipped_count' => $skipCount, 'errors' => $errors]);
            break;

        case 'update_cell':
            $id = $_POST['id'] ?? null;
            $field = $_POST['field'] ?? null;
            $val = $_POST['value'] ?? null;
            
            // [CHANGED] ปรับรายการที่อนุญาตให้เหลือแค่ loading_date
            $allowed = [
                'container_no', 'booking_no', 'invoice_no', 'remark', 'etd', 
                'loading_date', // แทนที่ snc_load_day
                'si_vgm_cut_off', 'pickup_date', 'return_date', 
                'cutoff_date', 'cutoff_time', 'shipping_customer_status', 
                'inspect_type', 'inspection_result', 'dc_location', 
                'feeder_vessel', 'mother_vessel', 'snc_ci_no', 'ctn_size', 
                'seal_no', 'container_tare', 'net_weight', 'gross_weight', 'cbm',
                'shipping_week', 'sku', 'load_time'
            ];
            
            if ($id && (in_array($field, $allowed) || $field === 'snc_load_day')) { // เผื่อ JS เก่ายังส่ง snc_load_day มา
                
                // [SAFETY] ถ้า JS ส่ง snc_load_day มา ให้เปลี่ยนเป็น loading_date ทันที
                if ($field === 'snc_load_day') {
                    $field = 'loading_date';
                }

                // แปลงวันที่
                if ($val && (strpos($field, 'date') !== false || in_array($field, ['etd', 'si_vgm_cut_off']))) $val = $fnDate($val);
                
                // [CHANGED] ตัด Logic Sync ออก อัปเดตแค่ loading_date เพียวๆ
                $pdo->prepare("UPDATE $table SET {$field} = ?, updated_at = GETDATE() WHERE id = ?")->execute([$val, $id]);

                echo json_encode(['success' => true]);
            } else { echo json_encode(['success' => false, 'message' => 'Invalid Field']); }
            break;

        case 'update_check':
            $id = $_POST['id'] ?? null;
            $field = $_POST['field'] ?? null;
            $val = isset($_POST['checked']) ? (int)$_POST['checked'] : 0;
            if ($id && in_array($field, ['is_loading_done', 'is_production_done'])) {
                 if ($field === 'is_loading_done' && $val == 1) {
                     // [CHECKED] อันนี้ถูกต้องแล้ว อัปเดต loading_date เมื่อกดเสร็จ
                     $pdo->prepare("UPDATE $table SET is_loading_done = 1, loading_date = COALESCE(loading_date, GETDATE()), updated_at = GETDATE() WHERE id = ?")->execute([$id]);
                 } elseif ($field === 'is_production_done' && $val == 1) {
                     $pdo->prepare("UPDATE $table SET is_production_done = 1, production_date = COALESCE(production_date, GETDATE()), updated_at = GETDATE() WHERE id = ?")->execute([$id]);
                 } else {
                     $pdo->prepare("UPDATE $table SET {$field} = ?, updated_at = GETDATE() WHERE id = ?")->execute([$val, $id]);
                 }
                 echo json_encode(['success' => true]);
            } else { echo json_encode(['success' => false, 'message' => 'Invalid Request']); }
            break;
             
        default: echo json_encode(['success' => false]);
    }
} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>