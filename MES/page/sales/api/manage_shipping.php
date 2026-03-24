<?php
// page/sales/api/manage_shipping.php
define('ALLOW_GUEST_ACCESS', true);
define('SYSTEM_INJECTION_LOADED', true);

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
$restrictedActions = ['update_cell', 'update_check', 'import_json', 'import_file']; 

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

        if (is_numeric($val)) {
             return gmdate("Y-m-d", ($val - 25569) * 86400);
        }
        $d = DateTime::createFromFormat('d/m/Y', $val);
        if ($d && $d->format('d/m/Y') === $val) return $d->format('Y-m-d');
        $d2 = DateTime::createFromFormat('m/d/Y', $val);
        if ($d2 && $d2->format('m/d/Y') === $val) return $d2->format('Y-m-d');

        $ts = strtotime(str_replace('/', '-', $val));
        if ($ts !== false) return date('Y-m-d', $ts);
        
        return null; 
    };

    switch ($action) {
        case 'read':
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

            $sql = "SELECT s.*, 
                    (COALESCE(i.Price_USD, i.StandardPrice, 0) * ISNULL(s.quantity, 0)) as price 
                    FROM $table s WITH (NOLOCK)
                    LEFT JOIN $itemsTable i WITH (NOLOCK) ON s.sku = i.sku 
                    WHERE 1=1 " . $dateCondition . " 
                    ORDER BY s.loading_date ASC, s.load_time ASC, s.id DESC"; 

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(['success' => true, 'data' => $data]);
            break;

        case 'import_json':
            $rows = json_decode($_POST['data'] ?? '[]', true);
            if (empty($rows)) throw new Exception("ไม่พบข้อมูลที่จะนำเข้า");

            $successCount = 0; $skipCount = 0; $errors = [];

            $columnMap = [
                'shippingweek' => 'shipping_week', 'status' => 'shipping_customer_status',
                'inspecttype' => 'inspect_type', 'inspectionresult' => 'inspection_result', 'inspectres' => 'inspection_result',
                'sncloadday' => 'loading_date', 'loaddate' => 'loading_date', 'etd' => 'etd', 
                'dc' => 'dc_location', 'dclocation' => 'dc_location',
                'sku' => 'sku', 'po' => 'po_number', 'ponumber' => 'po_number',
                'bookingno' => 'booking_no', 'invoice' => 'invoice_no', 'invoiceno' => 'invoice_no',
                'description' => 'description', 'team' => 'team', 'teamgroup' => 'team', 'group' => 'team',
                'ctnsqtypieces' => 'quantity', 'qty' => 'quantity', 'quantity' => 'quantity',
                'ctnsize' => 'ctn_size', 'size' => 'ctn_size', 'containerno' => 'container_no', 'sealno' => 'seal_no',
                'containertare' => 'container_tare', 'tare' => 'container_tare',
                'nw' => 'net_weight', 'netweight' => 'net_weight', 'gw' => 'gross_weight', 'grossweight' => 'gross_weight', 'cbm' => 'cbm',
                'feedervessel' => 'feeder_vessel', 'mothervessel' => 'mother_vessel', 'snccino' => 'snc_ci_no',
                'sivgmcutoff' => 'si_vgm_cut_off', 'pickup' => 'pickup_date', 'pickupdate' => 'pickup_date',
                'rtn' => 'return_date', 'returndate' => 'return_date', 'remark' => 'remark',
                'loadtime' => 'load_time', 'time' => 'load_time', 'loadingtime' => 'load_time',
                'cutoffdate' => 'cutoff_date', 'cutofftime' => 'cutoff_time'
            ];

            $dateCols = ['loading_date', 'etd', 'si_vgm_cut_off', 'pickup_date', 'return_date', 'cutoff_date', 'inspection_date'];
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
                        } elseif ($dbCol === 'load_time' || $dbCol === 'cutoff_time') {
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
                    
                    if (!array_key_exists('team', $fieldsToSet)) $fieldsToSet['team'] = null;
                    if (trim((string)$fieldsToSet['team']) === '') $fieldsToSet['team'] = null;

                    foreach ($fieldsToSet as $col => $val) {
                        $colNames[] = $col;
                        $bindParams[] = $val;
                        if ($col !== 'remark') {
                            if ($col === 'loading_date') {
                                $updatePairs[] = "T.loading_date = CASE WHEN T.loading_date IS NOT NULL AND T.loading_date < CAST(GETDATE() AS DATE) THEN T.loading_date ELSE S.loading_date END";
                            } elseif ($col === 'team') {
                                $updatePairs[] = "T.team = ISNULL(S.team, T.team)";
                            } else {
                                $updatePairs[] = "T.$col = S.$col";
                            }
                        }
                    }

                    if (count($colNames) <= 1) continue;

                    $insertVals = [];
                    foreach ($colNames as $col) {
                        if ($col === 'team') $insertVals[] = "ISNULL(S.team, 'Team1')";
                        else $insertVals[] = "S.$col";
                    }

                    $sql = "MERGE INTO $table AS T 
                            USING (VALUES (".implode(',', array_fill(0, count($colNames), '?')).")) AS S(".implode(',', $colNames).")
                            ON T.po_number = S.po_number
                            WHEN MATCHED THEN UPDATE SET ".implode(',', $updatePairs).", T.updated_at = GETDATE()
                            WHEN NOT MATCHED THEN INSERT (".implode(',', $colNames).", created_at, updated_at) 
                            VALUES (".implode(',', $insertVals).", GETDATE(), GETDATE());";

                    $pdo->prepare($sql)->execute($bindParams);
                    $successCount++;
                } catch (Exception $e) {
                    $skipCount++;
                    $errors[] = "Row $rowNum (PO: $poVal): " . $e->getMessage();
                }
            } // <- เพิ่มปีกกานี้
            $pdo->commit();
            echo json_encode(['success' => true, 'success_count' => $successCount, 'skipped_count' => $skipCount, 'errors' => $errors]);
            break;

        case 'import_file': 
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
            
            $successCount = 0; $skipCount = 0; $errors = [];
            
            $columnMap = [
                'shippingweek' => 'shipping_week', 'status' => 'shipping_customer_status',
                'inspecttype' => 'inspect_type', 'inspectionresult' => 'inspection_result',
                'sncloadday' => 'loading_date', 'loaddate' => 'loading_date', 'loadingdate' => 'loading_date',
                'etd' => 'etd', 'dc' => 'dc_location', 'dclocation' => 'dc_location',
                'team' => 'team', 'teamgroup' => 'team', 'group' => 'team',
                'sku' => 'sku', 'po' => 'po_number', 'ponumber' => 'po_number',
                'bookingno' => 'booking_no', 'invoice' => 'invoice_no', 'invoiceno' => 'invoice_no', 
                'description' => 'description',
                'ctnsqtypieces' => 'quantity', 'qty' => 'quantity', 'quantity' => 'quantity',
                'ctnsize' => 'ctn_size', 'size' => 'ctn_size', 'containerno' => 'container_no', 'sealno' => 'seal_no',
                'containertare' => 'container_tare', 'tare' => 'container_tare',
                'nw' => 'net_weight', 'netweight' => 'net_weight',
                'gw' => 'gross_weight', 'grossweight' => 'gross_weight', 'cbm' => 'cbm',
                'feedervessel' => 'feeder_vessel', 'mothervessel' => 'mother_vessel', 'snccino' => 'snc_ci_no',
                'sivgmcutoff' => 'si_vgm_cut_off', 'pickup' => 'pickup_date', 'pickupdate' => 'pickup_date',
                'rtn' => 'return_date', 'returndate' => 'return_date', 'remark' => 'remark',
                'loadtime' => 'load_time', 'time' => 'load_time', 'loadingtime' => 'load_time',
                'cutoffdate' => 'cutoff_date', 'cutofftime' => 'cutoff_time'
            ];

            $csv->rewind();
            $headers = $csv->current();
            $headerMap = [];
            if ($headers) {
                foreach ($headers as $index => $colName) {
                    $cleanName = strtolower(trim(preg_replace('/[^a-z0-9]/i', '', $colName)));
                    $headerMap[$cleanName] = $index;
                }
            }

            $dateCols = ['loading_date', 'etd', 'si_vgm_cut_off', 'pickup_date', 'return_date', 'cutoff_date'];
            $numCols = ['quantity', 'container_tare', 'net_weight', 'gross_weight', 'cbm'];

            $pdo->beginTransaction();

            foreach ($csv as $index => $row) {
                if ($index === 0) continue; 
                if (empty($row) || count($row) < 2) continue;

                $getVal = function($key) use ($row, $headerMap) {
                    return isset($headerMap[$key]) && isset($row[$headerMap[$key]]) ? trim($row[$headerMap[$key]]) : null;
                };

                $poVal = $getVal('po') ?? $getVal('ponumber') ?? null;
                if (empty($poVal)) {
                    if (implode('', $row) !== '') { $skipCount++; $errors[] = "Row ".($index+1).": Skipped (No PO)"; }
                    continue;
                }

                $fieldsToSet = [];
                foreach ($columnMap as $csvKey => $dbCol) {
                    if ($dbCol === 'po_number') continue;
                    if (isset($headerMap[$csvKey])) {
                        $val = trim($row[$headerMap[$csvKey]]);
                        if (in_array($dbCol, $numCols)) {
                            $val = str_replace(',', '', $val);
                            $val = ($val === '') ? null : ((is_numeric($val)) ? (float)$val : null);
                        } elseif (in_array($dbCol, $dateCols)) {
                            $val = $fnDate($val); 
                        } elseif ($dbCol === 'load_time' || $dbCol === 'cutoff_time') {
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
                    
                    if (!array_key_exists('team', $fieldsToSet)) $fieldsToSet['team'] = null;
                    if (trim((string)$fieldsToSet['team']) === '') $fieldsToSet['team'] = null;

                    foreach ($fieldsToSet as $col => $val) {
                        $colNames[] = $col;
                        $bindParams[] = $val;
                        if ($col !== 'remark') {
                            if ($col === 'loading_date') {
                                $updatePairs[] = "T.loading_date = CASE WHEN T.loading_date IS NOT NULL AND T.loading_date < CAST(GETDATE() AS DATE) THEN T.loading_date ELSE S.loading_date END";
                            } elseif ($col === 'team') {
                                $updatePairs[] = "T.team = ISNULL(S.team, T.team)";
                            } else {
                                $updatePairs[] = "T.$col = S.$col";
                            }
                        }
                    }

                    if (count($colNames) <= 1) continue;

                    $insertVals = [];
                    foreach ($colNames as $col) {
                        if ($col === 'team') $insertVals[] = "ISNULL(S.team, 'Team1')";
                        else $insertVals[] = "S.$col";
                    }

                    $sql = "MERGE INTO $table AS T 
                            USING (VALUES (".implode(',', array_fill(0, count($colNames), '?')).")) AS S(".implode(',', $colNames).")
                            ON T.po_number = S.po_number
                            WHEN MATCHED THEN UPDATE SET ".implode(',', $updatePairs).", T.updated_at = GETDATE()
                            WHEN NOT MATCHED THEN INSERT (".implode(',', $colNames).", created_at, updated_at) 
                            VALUES (".implode(',', $insertVals).", GETDATE(), GETDATE());";

                    $pdo->prepare($sql)->execute($bindParams);
                    $successCount++;
                } catch (Exception $e) {
                    $skipCount++;
                    $errors[] = "Row ".($index+1)." (PO: $poVal): " . $e->getMessage();
                }
            } // <- เพิ่มปีกกานี้
            
            $pdo->commit();
            echo json_encode(['success' => true, 'success_count' => $successCount, 'skipped_count' => $skipCount, 'errors' => $errors]);
            break;

        case 'update_cell':
            $id = $_POST['id'] ?? null;
            $field = $_POST['field'] ?? null;
            $val = $_POST['value'] ?? null;
            
            $allowed = [
                'container_no', 'booking_no', 'invoice_no', 'remark', 'etd', 
                'loading_date', 'team',
                'si_vgm_cut_off', 'pickup_date', 'return_date', 
                'cutoff_date', 'cutoff_time', 'shipping_customer_status', 
                'inspect_type', 'inspection_result', 'dc_location', 
                'feeder_vessel', 'mother_vessel', 'snc_ci_no', 'ctn_size', 
                'seal_no', 'container_tare', 'net_weight', 'gross_weight', 'cbm',
                'shipping_week', 'sku', 'load_time'
            ];
            
            if ($id && (in_array($field, $allowed) || $field === 'snc_load_day')) { 
                if ($field === 'snc_load_day') $field = 'loading_date';
                if ($val && (strpos($field, 'date') !== false || in_array($field, ['etd', 'si_vgm_cut_off']))) $val = $fnDate($val);
                
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