<?php
// page/sales/api/manage_shipping.php
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

// ตรวจสอบสิทธิ์ Customer (ห้ามแก้ไข)
$isCustomer = (isset($_SESSION['user']['role']) && $_SESSION['user']['role'] === 'CUSTOMER');
$restrictedActions = ['update_cell', 'update_check', 'import_json']; // Export & Read อนุญาต

if ($isCustomer && in_array($action, $restrictedActions)) {
    echo json_encode(['success' => false, 'message' => 'Access Denied (Read Only)']);
    exit;
}

try {
    if (!isset($pdo)) {
        $pdo = new PDO("sqlsrv:Server=" . DB_HOST . ";Database=" . DB_DATABASE, DB_USER, DB_PASSWORD);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    }

    // Date Helper (Robust Version)
    $fnDate = function ($val) {
        if (empty($val) || $val === 'null' || $val === 'NULL') return null;
        $val = trim($val);
        // Excel Serial
        if (is_numeric($val) && $val > 20000) return gmdate("Y-m-d", ($val - 25569) * 86400);
        // Standard Formats
        $val = explode(' ', $val)[0]; 
        $cleanVal = str_replace('/', '-', $val);
        $ts = strtotime($cleanVal);
        return ($ts) ? date('Y-m-d', $ts) : null;
    };

    switch ($action) {
        // ------------------------------------------------------------------
        // 1. READ
        // ------------------------------------------------------------------
        case 'read':
            $sql = "SELECT s.*, 
                    (COALESCE(i.Price_USD, i.StandardPrice, 0) * ISNULL(s.quantity, 0)) as price 
                    FROM $table s 
                    LEFT JOIN $itemsTable i ON s.sku = i.sku 
                    WHERE 1=1 
                    ORDER BY s.snc_load_day ASC, s.id DESC";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute();
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(['success' => true, 'data' => $data]);
            break;

        // ------------------------------------------------------------------
        // 2. EXPORT TO CSV
        // ------------------------------------------------------------------
        case 'export':
            header('Content-Type: text/csv; charset=utf-8');
            header('Content-Disposition: attachment; filename=Shipping_Schedule_Export_' . date('Y-m-d') . '.csv');
            
            $output = fopen('php://output', 'w');
            fprintf($output, chr(0xEF).chr(0xBB).chr(0xBF)); // BOM for Excel Thai

            // Header Row
            fputcsv($output, [
                'Seq', 'PO Number', 'SKU', 'Description', 'Quantity',
                'Load Status', 'Prod Status',
                'SNC Load Day', 'Load Time', 'DC Location',
                'Booking No', 'Invoice No', 
                'Container No', 'Seal No', 'Size', 'Tare', 'Net Weight', 'Gross Weight', 'CBM',
                'Feeder Vessel', 'Mother Vessel', 'SNC CI No',
                'SI/VGM Cutoff', 'Pickup Date', 'Return Date', 'ETD',
                'Cutoff Date', 'Cutoff Time', 'Remark'
            ]);

            $dt = function($d) { return ($d && $d != '0000-00-00') ? date('d/m/Y', strtotime($d)) : ''; };
            $tm = function($t) { return ($t) ? date('H:i', strtotime($t)) : ''; };
            $yn = function($v) { return ($v == 1) ? 'Done' : 'Wait'; };

            $stmt = $pdo->query("SELECT * FROM $table ORDER BY ISNULL(custom_order, 999999) ASC, id DESC");
            while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                fputcsv($output, [
                    $row['custom_order'], $row['po_number'], $row['sku'], $row['description'], $row['quantity'],
                    $yn($row['is_loading_done']), $yn($row['is_production_done']),
                    $dt($row['snc_load_day']), $tm($row['load_time']), $row['dc_location'],
                    $row['booking_no'], $row['invoice_no'],
                    $row['container_no'], $row['seal_no'], $row['ctn_size'], $row['container_tare'], 
                    $row['net_weight'], $row['gross_weight'], $row['cbm'],
                    $row['feeder_vessel'], $row['mother_vessel'], $row['snc_ci_no'],
                    $dt($row['si_vgm_cut_off']), $dt($row['pickup_date']), $dt($row['return_date']), $dt($row['etd']),
                    $dt($row['cutoff_date']), $tm($row['cutoff_time']), $row['remark']
                ]);
            }
            fclose($output);
            exit;

        // ------------------------------------------------------------------
        // 3. IMPORT JSON
        // ------------------------------------------------------------------
        case 'import_json':
            // (เหมือนเดิมเป๊ะ ใช้โค้ดที่คุณส่งมาล่าสุดได้เลยครับ มันสมบูรณ์แล้ว)
            $rows = json_decode($_POST['data'] ?? '[]', true);
            if (empty($rows)) throw new Exception("ไม่พบข้อมูลที่จะนำเข้า");

            $successCount = 0; $skipCount = 0; $errors = [];

            // Mapping (เหมือนเดิม)
            $columnMap = [
                'shippingweek' => 'shipping_week', 'status' => 'shipping_customer_status',
                'inspecttype' => 'inspect_type', 'inspectionresult' => 'inspection_result',
                'sncloadday' => 'snc_load_day', 'etd' => 'etd', 'dc' => 'dc_location',
                'sku' => 'sku', 'po' => 'po_number', 'ponumber' => 'po_number',
                'bookingno' => 'booking_no', 'invoice' => 'invoice_no', 'description' => 'description',
                'ctnsqtypieces' => 'quantity', 'qty' => 'quantity', 
                'ctnsize' => 'ctn_size', 'containerno' => 'container_no', 'sealno' => 'seal_no',
                'containertare' => 'container_tare', 'nw' => 'net_weight', 'gw' => 'gross_weight', 'cbm' => 'cbm',
                'feedervessel' => 'feeder_vessel', 'mothervessel' => 'mother_vessel', 'snccino' => 'snc_ci_no',
                'sivgmcutoff' => 'si_vgm_cut_off', 'pickup' => 'pickup_date', 'rtn' => 'return_date', 'remark' => 'remark',
                'loadtime' => 'load_time', 'time' => 'load_time', 'loadingtime' => 'load_time'
            ];

            $dateCols = ['snc_load_day', 'etd', 'si_vgm_cut_off', 'pickup_date', 'return_date'];
            $numCols = ['quantity', 'container_tare', 'net_weight', 'gross_weight', 'cbm'];

            $pdo->beginTransaction();
            foreach ($rows as $index => $row) {
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
                        $updatePairs[] = "T.$col = S.$col";
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

        // ------------------------------------------------------------------
        // 4. UPDATE CELL & CHECK
        // ------------------------------------------------------------------
        case 'update_cell':
            $id = $_POST['id'] ?? null;
            $field = $_POST['field'] ?? null;
            $val = $_POST['value'] ?? null;
            $allowed = [
                'container_no', 'booking_no', 'invoice_no', 'remark', 'etd', 
                'snc_load_day', 'si_vgm_cut_off', 'pickup_date', 'return_date', 
                'cutoff_date', 'cutoff_time', 'shipping_customer_status', 
                'inspect_type', 'inspection_result', 'dc_location', 
                'feeder_vessel', 'mother_vessel', 'snc_ci_no', 'ctn_size', 
                'seal_no', 'container_tare', 'net_weight', 'gross_weight', 'cbm',
                'shipping_week', 'sku', 'load_time'
            ];
            if ($id && in_array($field, $allowed)) {
                if ($val && (strpos($field, 'date') !== false || in_array($field, ['etd', 'snc_load_day', 'si_vgm_cut_off']))) $val = $fnDate($val);
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