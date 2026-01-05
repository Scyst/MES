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
            if (empty($rows)) throw new Exception("ไม่พบข้อมูลที่จะนำเข้า");

            $successCount = 0;
            $skipCount = 0;
            $errors = [];

            // Mapping: ลบ atd และ etd_time ออกแล้ว และเปลี่ยน ctns_qty เป็น quantity
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
                'containerno' => 'container_no',
                'sealno' => 'seal_no',
                'containertare' => 'container_tare',
                'nw' => 'net_weight',
                'gw' => 'gross_weight',
                'cbm' => 'cbm',
                'feedervessel' => 'feeder_vessel',
                'mothervessel' => 'mother_vessel',
                'snccino' => 'snc_ci_no',
                'sivgmcutoff' => 'si_vgm_cut_off',
                'pickup' => 'pickup_date',
                'rtn' => 'return_date',
                'remark' => 'remark'
            ];

            // ลบ atd ออกจากกลุ่มวันที่
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
                    $skipCount++;
                    $errors[] = "แถวที่ $rowNum: ข้าม (ไม่พบเลขที่ PO)";
                    continue;
                }

                $fieldsToSet = [];
                foreach ($columnMap as $cleanHeader => $dbCol) {
                    if (isset($normalizedRow[$cleanHeader]) && $dbCol !== 'po_number') {
                        $val = trim($normalizedRow[$cleanHeader]);
                        
                        // Validation: ตัวเลข (ทำให้มั่นใจว่าถ้าไม่มีค่าจะไม่ส่งเป็น String ว่างไป SQL)
                        if (in_array($dbCol, $numCols)) {
                            $val = str_replace(',', '', $val);
                            if ($val === '') {
                                $val = null; // ส่ง null จริงๆ ไปที่ Database
                            } elseif (is_numeric($val)) {
                                $val = (float)$val;
                            } else {
                                $errors[] = "แถวที่ $rowNum (PO: $poVal): '$val' ในช่อง $dbCol ไม่ใช่ตัวเลข";
                                $val = null; 
                            }
                        } 
                        // Validation: วันที่
                        elseif (in_array($dbCol, $dateCols)) {
                            $val = $fnDate($val);
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

                    // SQL MERGE แบบ Dynamic ตามจำนวนคอลัมน์ที่มีข้อมูล
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
                    $errors[] = "แถวที่ $rowNum (PO: $poVal): SQL Error - " . $e->getMessage();
                }
            }
            $pdo->commit();

            echo json_encode([
                'success' => true, 
                'success_count' => $successCount, 
                'skipped_count' => $skipCount, 
                'errors' => $errors
            ]);
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