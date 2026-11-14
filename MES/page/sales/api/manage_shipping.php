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
    echo json_encode(['success' => false, 'data' => null, 'message' => 'Access Denied (Read Only)'], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action !== 'read') {
    $clientToken = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? $_POST['csrf_token'] ?? '';
    $sessionToken = $_SESSION['csrf_token'] ?? '';
    if (empty($sessionToken) || !hash_equals($sessionToken, $clientToken)) {
        http_response_code(403);
        echo json_encode(['success' => false, 'data' => null, 'message' => 'CSRF token validation failed.'], JSON_UNESCAPED_UNICODE);
        exit;
    }
}

try {
    if (!isset($pdo)) {
        $pdo = new PDO("sqlsrv:Server=" . DB_HOST . ";Database=" . DB_DATABASE, DB_USER, DB_PASSWORD);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    }

    $fnDate = function ($val, $refDate = null) {
        if (empty($val) || $val === 'null' || $val === 'NULL') return null;
        $val = trim((string)$val);
        // Remove invisible/non-printable characters
        $val = preg_replace('/[\x00-\x1F\x7F\xC2\xA0]/u', '', $val);
        $val = explode(' ', $val)[0];
        $val = explode('T', $val)[0];
        if ($val === '' || $val === '0000-00-00' || $val === '1999-12-31' || $val === '1900-01-01') return null;

        // 1. Excel serial number (integer/float days since 1899-12-30)
        if (is_numeric($val) && (float)$val > 40000 && (float)$val < 60000) {
            $unix = ((int)round((float)$val) - 25569) * 86400;
            return gmdate("Y-m-d", $unix);
        }

        // 2. ISO or 4-digit-first format: YYYY-MM-DD or YYYY/MM/DD
        if (preg_match('/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/', $val, $m)) {
            $year = (int)$m[1];
            $p2   = (int)$m[2];
            $p3   = (int)$m[3];

            if ($year >= 25 && $year <= 27) {
                if ($year === 25 && (($p2 === 6 && in_array($p3, [2, 9], true)) || ($p2 === 8 && $p3 === 4) || ($p2 === 9 && $p3 === 8))) {
                    return sprintf('2025-%02d-%02d', $p2, $p3);
                }
                $healedDay = ($year - 25) * 12 + $p2;
                if ($p3 >= 1 && $p3 <= 12 && $healedDay >= 1 && $healedDay <= 31 && checkdate($p3, $healedDay, 2025)) {
                    return sprintf('2025-%02d-%02d', $p3, $healedDay);
                }
                $year += 2000;
            } elseif ($year < 100) {
                $year += ($year < 50) ? 2000 : 1900;
            } elseif ($year >= 1900 && $year < 1990) {
                $year += 100;
            } elseif ($year >= 2001 && $year <= 2012 && $p3 >= 24 && $p3 <= 30) {
                $healedYear  = 2000 + $p3;
                $healedMonth = $year - 2000;
                $healedDay   = $p2;
                if (checkdate($healedMonth, $healedDay, $healedYear)) {
                    return sprintf('%04d-%02d-%02d', $healedYear, $healedMonth, $healedDay);
                }
            }

            if ($p2 >= 1 && $p2 <= 12 && $p3 >= 1 && $p3 <= 31 && checkdate($p2, $p3, $year)) {
                return sprintf('%04d-%02d-%02d', $year, $p2, $p3);
            }
            if ($p3 >= 1 && $p3 <= 12 && $p2 >= 1 && $p2 <= 31 && checkdate($p3, $p2, $year)) {
                return sprintf('%04d-%02d-%02d', $year, $p3, $p2);
            }
        }

        // 3. DD/MM/YYYY, DD/MM/YY, or US MM/DD/YYYY, MM/DD/YY
        if (preg_match('/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/', $val, $m)) {
            $first  = (int)$m[1];
            $second = (int)$m[2];
            $year   = (int)$m[3];
            if ($year < 100) {
                $year += ($year < 50) ? 2000 : 1900;
            }
            if ($year >= 1900 && $year < 1990) {
                $year += 100;
            }

            if ($second > 12 && $first >= 1 && $first <= 12 && $second <= 31 && checkdate($first, $second, $year)) {
                return sprintf('%04d-%02d-%02d', $year, $first, $second);
            }
            if ($first > 12 && $second >= 1 && $second <= 12 && $first <= 31 && checkdate($second, $first, $year)) {
                return sprintf('%04d-%02d-%02d', $year, $second, $first);
            }
            if ($first >= 1 && $first <= 12 && $second >= 1 && $second <= 12) {
                $dmy = checkdate($second, $first, $year) ? sprintf('%04d-%02d-%02d', $year, $second, $first) : null;
                $mdy = checkdate($first, $second, $year) ? sprintf('%04d-%02d-%02d', $year, $first, $second) : null;
                if ($dmy && $mdy && $refDate && $dmy > $refDate && $mdy <= $refDate) {
                    return $mdy;
                }
                if ($dmy) return $dmy;
                if ($mdy) return $mdy;
            }
        }

        // 4. Text month format (e.g. 6-Feb-25, 06-Feb-2025)
        foreach (['!j-M-y', '!d-M-y', '!j-M-Y', '!d-M-Y', '!j/M/y', '!d/M/y', '!j/M/Y', '!d/M/Y'] as $fmt) {
            $dt = DateTime::createFromFormat($fmt, $val);
            if ($dt instanceof DateTime) {
                $y = (int)$dt->format('Y');
                if ($y < 100) $y += 2000;
                if ($y >= 1900 && $y < 1990) $y += 100;
                return sprintf('%04d-%s', $y, $dt->format('m-d'));
            }
        }

        return null; 
    };

    $executeShippingMergeRow = function (PDO $pdo, string $table, string $poVal, array $fieldsToSet): void {
        if (!array_key_exists('team', $fieldsToSet) || trim((string)$fieldsToSet['team']) === '') {
            $fieldsToSet['team'] = null;
        }

        $colNames = ['po_number'];
        $bindParams = [$poVal];
        $updatePairs = [];

        foreach ($fieldsToSet as $col => $val) {
            $colNames[] = $col;
            $bindParams[] = $val;
            if ($col === 'remark') {
                continue;
            }
            if ($col === 'loading_date') {
                $updatePairs[] = "T.loading_date = CASE WHEN T.loading_date IS NOT NULL AND T.loading_date < CAST(GETDATE() AS DATE) THEN T.loading_date ELSE S.loading_date END";
            } elseif ($col === 'team') {
                $updatePairs[] = "T.team = ISNULL(S.team, T.team)";
            } elseif ($col === 'inspection_result') {
                $updatePairs[] = "T.inspection_result = CASE
                    WHEN UPPER(LTRIM(RTRIM(ISNULL(T.inspection_result, '')))) IN ('PASS', 'FAIL')
                      OR UPPER(LTRIM(RTRIM(ISNULL(T.inspection_status, '')))) IN ('DONE', 'IN_PROGRESS', 'WAITING')
                        THEN T.inspection_result
                    ELSE COALESCE(NULLIF(LTRIM(RTRIM(ISNULL(S.inspection_result, ''))), ''), T.inspection_result)
                END";
            } elseif ($col === 'inspect_type') {
                $updatePairs[] = "T.inspect_type = COALESCE(NULLIF(LTRIM(RTRIM(ISNULL(T.inspect_type, ''))), ''), NULLIF(LTRIM(RTRIM(ISNULL(S.inspect_type, ''))), ''), T.inspect_type)";
            } elseif ($col === 'inspection_date') {
                $updatePairs[] = "T.inspection_date = COALESCE(T.inspection_date, S.inspection_date)";
            } else {
                $updatePairs[] = "T.$col = S.$col";
            }
        }

        if (count($colNames) <= 1 || empty($updatePairs)) {
            return;
        }

        $insertVals = [];
        foreach ($colNames as $col) {
            $insertVals[] = ($col === 'team') ? "ISNULL(S.team, 'Team1')" : "S.$col";
        }

        $sql = "MERGE INTO $table AS T
                USING (VALUES (" . implode(',', array_fill(0, count($colNames), '?')) . ")) AS S(" . implode(',', $colNames) . ")
                ON T.po_number = S.po_number
                WHEN MATCHED THEN UPDATE SET " . implode(',', $updatePairs) . ", T.updated_at = GETDATE()
                WHEN NOT MATCHED THEN INSERT (" . implode(',', $colNames) . ", created_at, updated_at)
                VALUES (" . implode(',', $insertVals) . ", GETDATE(), GETDATE());";

        $pdo->prepare($sql)->execute($bindParams);
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
                    $executeShippingMergeRow($pdo, $table, $poVal, $fieldsToSet);
                    $successCount++;
                } catch (Exception $e) {
                    $skipCount++;
                    $errors[] = "Row $rowNum (PO: $poVal): " . $e->getMessage();
                }
            } // <- เพิ่มปีกกานี้
            $pdo->commit();
            if (function_exists('writeLog')) {
                writeLog($pdo, 'IMPORT', 'SHIPPING', 'JSON_' . $successCount, null, ['success_count' => $successCount, 'skipped_count' => $skipCount], "Shipping JSON import: {$successCount} updated/inserted, {$skipCount} skipped (QA fields protected)");
            }
            echo json_encode(['success' => true, 'data' => ['success_count' => $successCount, 'skipped_count' => $skipCount], 'message' => 'Imported successfully', 'success_count' => $successCount, 'skipped_count' => $skipCount, 'errors' => $errors], JSON_UNESCAPED_UNICODE);
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
                    $executeShippingMergeRow($pdo, $table, $poVal, $fieldsToSet);
                    $successCount++;
                } catch (Exception $e) {
                    $skipCount++;
                    $errors[] = "Row ".($index+1)." (PO: $poVal): " . $e->getMessage();
                }
            } // <- เพิ่มปีกกานี้
            
            $pdo->commit();
            if (function_exists('writeLog')) {
                writeLog($pdo, 'IMPORT', 'SHIPPING', 'FILE_' . $successCount, null, ['success_count' => $successCount, 'skipped_count' => $skipCount], "Shipping file import: {$successCount} updated/inserted, {$skipCount} skipped (QA fields protected)");
            }
            echo json_encode(['success' => true, 'data' => ['success_count' => $successCount, 'skipped_count' => $skipCount], 'message' => 'Imported successfully', 'success_count' => $successCount, 'skipped_count' => $skipCount, 'errors' => $errors], JSON_UNESCAPED_UNICODE);
            break;

        case 'update_cell':
            $id = intval($_POST['id'] ?? 0);
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
                'shipping_week', 'sku', 'load_time', 'production_end_date'
            ];
            
            if ($id > 0 && (in_array($field, $allowed, true) || $field === 'snc_load_day')) { 
                if ($field === 'snc_load_day') $field = 'loading_date';

                $stmtOld = $pdo->prepare("SELECT id, po_number, inspection_status, inspection_result, inspect_type, {$field} AS cur_val FROM $table WITH (NOLOCK) WHERE id = ?");
                $stmtOld->execute([$id]);
                $oldRow = $stmtOld->fetch(PDO::FETCH_ASSOC);
                if (!$oldRow) {
                    http_response_code(404);
                    echo json_encode(['success' => false, 'data' => null, 'message' => 'Record not found'], JSON_UNESCAPED_UNICODE);
                    break;
                }

                if ($val !== null && $val !== '' && (strpos($field, 'date') !== false || in_array($field, ['etd', 'si_vgm_cut_off'], true))) {
                    $val = $fnDate($val);
                }
                
                if ($field === 'inspection_result') {
                    $curRes = strtoupper(trim((string)($oldRow['inspection_result'] ?? '')));
                    $stmtHist = $pdo->prepare("SELECT TOP (1) id, inspection_result FROM dbo.QMS_PO_INSPECTION_HISTORY WITH (NOLOCK) WHERE sales_order_id = ? AND is_latest = 1 ORDER BY round_no DESC, id DESC");
                    $stmtHist->execute([$id]);
                    $latestHist = $stmtHist->fetch(PDO::FETCH_ASSOC);
                    $histRes = strtoupper(trim((string)($latestHist['inspection_result'] ?? '')));

                    if ($curRes === 'FAIL' || $histRes === 'FAIL') {
                        http_response_code(400);
                        echo json_encode(['success' => false, 'data' => null, 'message' => 'ไม่สามารถแก้ไขผลตรวจ QA ที่เป็น FAIL จากหน้า Shipping ได้ กรุณาเปิดตรวจรอบใหม่ในระบบ iQMS'], JSON_UNESCAPED_UNICODE);
                        break;
                    }

                    $normalizedRes = strtoupper(trim((string)($val ?? '')));
                    $pdo->beginTransaction();
                    if (in_array($normalizedRes, ['PASS', 'FAIL'], true)) {
                        $pdo->prepare("UPDATE $table SET inspection_result = ?, inspection_status = 'DONE', updated_at = GETDATE() WHERE id = ?")->execute([$normalizedRes, $id]);
                        if ($latestHist) {
                            $pdo->prepare("UPDATE dbo.QMS_PO_INSPECTION_HISTORY SET inspection_result = ?, inspection_status = 'DONE', updated_at = GETDATE() WHERE id = ?")->execute([$normalizedRes, $latestHist['id']]);
                        }
                    } else {
                        $pdo->prepare("UPDATE $table SET inspection_result = ?, updated_at = GETDATE() WHERE id = ?")->execute([$val, $id]);
                        if ($latestHist) {
                            $pdo->prepare("UPDATE dbo.QMS_PO_INSPECTION_HISTORY SET inspection_result = ?, updated_at = GETDATE() WHERE id = ?")->execute([$val, $latestHist['id']]);
                        }
                    }
                    $pdo->commit();
                } else {
                    $pdo->prepare("UPDATE $table SET {$field} = ?, updated_at = GETDATE() WHERE id = ?")->execute([$val, $id]);
                    if ($field === 'inspect_type') {
                        $pdo->prepare("UPDATE dbo.QMS_PO_INSPECTION_HISTORY SET inspect_type = ?, updated_at = GETDATE() WHERE sales_order_id = ? AND is_latest = 1")->execute([$val, $id]);
                    }
                }

                if (function_exists('writeLog')) {
                    writeLog($pdo, 'UPDATE', 'SHIPPING', $id, [$field => $oldRow['cur_val'] ?? null], [$field => $val], "Shipping updated {$field} on PO {$oldRow['po_number']}");
                }
                echo json_encode(['success' => true, 'data' => ['id' => $id], 'message' => 'Updated'], JSON_UNESCAPED_UNICODE);
            } else { echo json_encode(['success' => false, 'data' => null, 'message' => 'Invalid Field'], JSON_UNESCAPED_UNICODE); }
            break;

        case 'update_check':
            $id = intval($_POST['id'] ?? 0);
            $field = $_POST['field'] ?? null;
            $val = isset($_POST['checked']) ? (int)$_POST['checked'] : 0;
            if ($id > 0 && in_array($field, ['is_loading_done', 'is_production_done', 'inspection_status'], true)) {
                $stmtOld = $pdo->prepare("SELECT id, po_number, inspection_status, inspection_result, is_loading_done, is_production_done FROM $table WITH (NOLOCK) WHERE id = ?");
                $stmtOld->execute([$id]);
                $oldRow = $stmtOld->fetch(PDO::FETCH_ASSOC);
                if (!$oldRow) {
                    http_response_code(404);
                    echo json_encode(['success' => false, 'data' => null, 'message' => 'Record not found'], JSON_UNESCAPED_UNICODE);
                    break;
                }

                if ($field === 'is_loading_done' && $val == 1) {
                    $pdo->prepare("UPDATE $table SET is_loading_done = 1, loading_date = COALESCE(loading_date, GETDATE()), updated_at = GETDATE() WHERE id = ?")->execute([$id]);
                } elseif ($field === 'is_production_done' && $val == 1) {
                    $pdo->prepare("UPDATE $table SET is_production_done = 1, production_end_date = COALESCE(production_end_date, GETDATE()), updated_at = GETDATE() WHERE id = ?")->execute([$id]);
                } elseif ($field === 'inspection_status') {
                    $curRes = strtoupper(trim((string)($oldRow['inspection_result'] ?? '')));
                    $stmtHist = $pdo->prepare("SELECT TOP (1) id, inspection_result FROM dbo.QMS_PO_INSPECTION_HISTORY WITH (NOLOCK) WHERE sales_order_id = ? AND is_latest = 1 ORDER BY round_no DESC, id DESC");
                    $stmtHist->execute([$id]);
                    $latestHist = $stmtHist->fetch(PDO::FETCH_ASSOC);
                    $histRes = strtoupper(trim((string)($latestHist['inspection_result'] ?? '')));

                    if ($curRes === 'FAIL' || $histRes === 'FAIL') {
                        http_response_code(400);
                        echo json_encode(['success' => false, 'data' => null, 'message' => 'ไม่สามารถสลับสถานะ PO ที่ผลตรวจ QA เป็น FAIL ได้ กรุณาเปิดตรวจรอบใหม่ในระบบ iQMS'], JSON_UNESCAPED_UNICODE);
                        break;
                    }

                    $statusStr = ($val == 1) ? 'DONE' : 'WAITING';
                    $resultStr = ($val == 1) ? 'PASS' : null;
                    $pdo->beginTransaction();
                    $pdo->prepare("UPDATE $table SET inspection_status = ?, inspection_result = ?, updated_at = GETDATE() WHERE id = ?")->execute([$statusStr, $resultStr, $id]);
                    if ($latestHist) {
                        $pdo->prepare("UPDATE dbo.QMS_PO_INSPECTION_HISTORY SET inspection_status = ?, inspection_result = ?, updated_at = GETDATE() WHERE id = ?")->execute([$statusStr, $resultStr, $latestHist['id']]);
                    }
                    $pdo->commit();
                } else {
                    $pdo->prepare("UPDATE $table SET {$field} = ?, updated_at = GETDATE() WHERE id = ?")->execute([$val, $id]);
                }

                if (function_exists('writeLog')) {
                    writeLog($pdo, 'UPDATE', 'SHIPPING', $id, [$field => $oldRow[$field] ?? null], [$field => $val], "Shipping toggled {$field} on PO {$oldRow['po_number']}");
                }
                echo json_encode(['success' => true, 'data' => ['id' => $id], 'message' => 'Updated'], JSON_UNESCAPED_UNICODE);
            } else { echo json_encode(['success' => false, 'data' => null, 'message' => 'Invalid Request'], JSON_UNESCAPED_UNICODE); }
            break;
             
        default: echo json_encode(['success' => false, 'data' => null, 'message' => 'Invalid Action'], JSON_UNESCAPED_UNICODE);
    }
} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
    if (isset($pdo) && function_exists('writeErrorLog')) {
        writeErrorLog($pdo, 'SHIPPING', $e->getMessage(), ['action' => $action ?? '']);
    }
    http_response_code(500);
    echo json_encode(['success' => false, 'data' => null, 'message' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
}
?>