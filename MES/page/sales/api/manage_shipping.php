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

    // ฟังก์ชันจัดการวันที่ให้ฉลาดขึ้น (รองรับ dd/mm/yyyy และ Excel Serial)
    $fnDate = function ($val) {
        if (empty($val)) return null;
        $val = trim($val);
        
        // ถ้าเป็นตัวเลข Serial จาก Excel
        if (is_numeric($val) && $val > 40000) {
            return gmdate("Y-m-d", ($val - 25569) * 86400);
        }

        // ลองแปลงจาก d/m/Y หรือ d-m-Y
        $cleanVal = str_replace('/', '-', $val);
        $ts = strtotime($cleanVal);
        if ($ts) return date('Y-m-d', $ts);

        // Fallback: ถ้า strtotime พลาด ให้ลอง Format ตรงๆ
        $d = DateTime::createFromFormat('d-m-Y', $cleanVal);
        return ($d) ? $d->format('Y-m-d') : null;
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
            $rows = json_decode($_POST['data'] ?? '[]', true);
            if (empty($rows)) throw new Exception("No data received");

            // Mapping ใหม่: ใช้คำที่ "ล้างแล้ว" (Lowercase + No Special Chars) ให้ตรงกับไฟล์ SNC
            $columnMap = [
                'shippingweek' => 'shipping_week',
                'status' => 'shipping_customer_status',
                'inspecttype' => 'inspect_type',
                'inspectionresult' => 'inspection_result',
                'sncloadday' => 'snc_load_day',
                'etd' => 'etd',
                'dc' => 'dc_location',
                'sku' => 'sku',
                'po' => 'po_number',
                'ponumber' => 'po_number',
                'bookingno' => 'booking_no',
                'invoice' => 'invoice_no',
                'description' => 'description',
                'ctnsqtypieces' => 'quantity',
                'ctnsize' => 'ctn_size',
                'containerno' => 'container_no', // แมพกับ 'CONTAINER NO'
                'sealno' => 'seal_no',           // แมพกับ 'SEAL NO.'
                'containertare' => 'container_tare',
                'nw' => 'net_weight',            // แมพกับ 'N.W'
                'gw' => 'gross_weight',          // แมพกับ 'G.W'
                'cbm' => 'cbm',
                'feedervessel' => 'feeder_vessel',
                'mothervessel' => 'mother_vessel',
                'snccino' => 'snc_ci_no',
                'sivgmcutoff' => 'si_vgm_cut_off',
                'pickup' => 'pickup_date',       // แมพกับ 'PICK UP'
                'rtn' => 'return_date',          // แมพกับ 'RTN'
                'remark' => 'remark'
            ];

            $dateCols = ['snc_load_day', 'etd', 'si_vgm_cut_off', 'pickup_date', 'return_date'];
            $numCols = ['quantity', 'container_tare', 'net_weight', 'gross_weight', 'cbm'];

            $pdo->beginTransaction();
            $successCount = 0;

            foreach ($rows as $row) {
                $normalizedRow = [];
                foreach ($row as $k => $v) {
                    // ล้างหัวตารางให้เหลือแค่ a-z และ 0-9
                    $cleanK = strtolower(preg_replace('/[^a-z0-9]/i', '', $k));
                    $normalizedRow[$cleanK] = $v;
                }

                // หา PO Number
                $poVal = $normalizedRow['po'] ?? $normalizedRow['ponumber'] ?? null;
                if (empty($poVal)) continue;

                $fieldsToSet = [];
                foreach ($columnMap as $cleanHeader => $dbCol) {
                    if (isset($normalizedRow[$cleanHeader])) {
                        $val = trim($normalizedRow[$cleanHeader]);
                        
                        // จัดการตัวเลข (ตัดคอมม่า)
                        if (in_array($dbCol, $numCols)) {
                            $val = str_replace(',', '', $val);
                            $val = (is_numeric($val)) ? (float)$val : null;
                        } 
                        // จัดการวันที่
                        elseif (in_array($dbCol, $dateCols)) {
                            $val = $fnDate($val);
                        }
                        
                        if ($dbCol !== 'po_number') {
                            $fieldsToSet[$dbCol] = $val;
                        }
                    }
                }

                if (empty($fieldsToSet)) continue;

                // สร้าง SQL MERGE
                $colNames = ['po_number'];
                $valPlaceholders = ['?'];
                $bindParams = [$poVal];
                $updatePairs = [];

                foreach ($fieldsToSet as $col => $val) {
                    $colNames[] = $col;
                    $valPlaceholders[] = "?";
                    $bindParams[] = $val;
                    $updatePairs[] = "T.$col = S.$col";
                }

                $sql = "MERGE INTO $table AS T 
                        USING (VALUES (".implode(',', $valPlaceholders).")) AS S(".implode(',', $colNames).")
                        ON T.po_number = S.po_number
                        WHEN MATCHED THEN UPDATE SET ".implode(',', $updatePairs).", T.updated_at = GETDATE()
                        WHEN NOT MATCHED THEN INSERT (".implode(',', $colNames).", created_at, updated_at) 
                        VALUES (".implode(',', $colNames).", GETDATE(), GETDATE());";

                $pdo->prepare($sql)->execute($bindParams);
                $successCount++;
            }
            $pdo->commit();
            echo json_encode(['success' => true, 'message' => "นำเข้าสำเร็จ $successCount รายการ"]);
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
            break;
             
        default: echo json_encode(['success' => false]);
    }
} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>