<?php
// page/sales/api/manage_sales_orders.php
define('SYSTEM_INJECTION_LOADED', true);

header('Content-Type: application/json');
ini_set('display_errors', 0);
error_reporting(E_ALL);

require_once __DIR__ . '/../../components/init.php'; 

if (!isset($_SESSION['user'])) {
    http_response_code(401); 
    echo json_encode(['success'=>false, 'data'=>null, 'message'=>'Unauthorized'], JSON_UNESCAPED_UNICODE); 
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $clientToken = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? $_POST['csrf_token'] ?? '';
    $sessionToken = $_SESSION['csrf_token'] ?? '';
    if (empty($sessionToken) || !hash_equals($sessionToken, $clientToken)) {
        http_response_code(403);
        echo json_encode(['success'=>false, 'data'=>null, 'message'=>'CSRF token validation failed.'], JSON_UNESCAPED_UNICODE);
        exit;
    }
}

$table = defined('SALES_ORDERS_TABLE') ? SALES_ORDERS_TABLE : 'SALES_ORDERS';
$itemsTable = defined('ITEMS_TABLE') ? ITEMS_TABLE : 'ITEMS';

$action = $_REQUEST['action'] ?? 'read';

try {
    if (!isset($pdo)) {
        $pdo = new PDO("sqlsrv:Server=".DB_HOST.";Database=".DB_DATABASE, DB_USER, DB_PASSWORD);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    }

    // --- Helper Functions ---
    $fnDate = function($val, $refDate = null) {
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

            // Auto-heal legacy 0025/0026/0027 month-overflow corruption
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
                // Auto-correct JS new Date(25,...) -> 1925 export cycle
                $year += 100;
            } elseif ($year >= 2001 && $year <= 2012 && $p3 >= 24 && $p3 <= 30) {
                // Auto-correct strtotime('m-d-yy') -> 200m-0d-yy corruption (e.g. 2005-01-26 -> 2026-05-01)
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

            // Unambiguous US MM/DD/YYYY when second > 12 (e.g. 05/25/2026)
            if ($second > 12 && $first >= 1 && $first <= 12 && $second <= 31 && checkdate($first, $second, $year)) {
                return sprintf('%04d-%02d-%02d', $year, $first, $second);
            }
            // Unambiguous DD/MM/YYYY when first > 12 (e.g. 25/05/2026)
            if ($first > 12 && $second >= 1 && $second <= 12 && $first <= 31 && checkdate($second, $first, $year)) {
                return sprintf('%04d-%02d-%02d', $year, $second, $first);
            }
            // Both <= 12: default DD/MM/YYYY, but cross-check with $refDate (e.g. production_date / loading_date)
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

        // 4. Text month format (e.g. 6-Feb-25, 06-Feb-2025, 6/Feb/2025)
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

    $isYes = function($val) {
        if (empty($val)) return false;
        $v = strtolower(trim($val));
        return in_array($v, ['yes', 'done', 'shipped', 'ok', '1', 'true', 'y', 'pass']);
    };

    // =========================================================
    // SWITCH ACTION
    // =========================================================
    switch ($action) {
        
        // 1. READ
        case 'read':
            $filter = $_GET['status'] ?? 'ACTIVE'; 
            $startDate = $_GET['start_date'] ?? '';
            $endDate   = $_GET['end_date'] ?? '';
            
            $dateType  = $_GET['date_type'] ?? 'loading_date';
            $allowedDateCols = ['loading_date', 'production_date', 'inspection_date'];
            if (!in_array($dateType, $allowedDateCols)) {
                $dateType = 'loading_date';
            }

            $dateCondition = "";
            $dateParams = [];

            if (!empty($startDate)) {
                $dateCondition .= " AND s.$dateType >= ? ";
                $dateParams[] = $startDate;
            }
            if (!empty($endDate)) {
                $dateCondition .= " AND s.$dateType <= ? ";
                $dateParams[] = $endDate;
            }

            // [ADDED] s.team
            $columns = "
                s.id, s.po_number, s.sku, s.quantity, 
                s.order_date, s.description, s.color,
                s.dc_location, s.loading_week, s.shipping_week, s.remark,
                s.production_status, s.loading_status, 
                s.is_loading_done, s.is_production_done, 
                s.is_confirmed, s.custom_order, s.created_at,
                s.production_date, s.production_end_date, s.loading_date, s.inspection_date,
                s.inspection_status, s.inspection_result, s.ticket_number, s.team
            ";

            $sql = "SELECT $columns, 
                    (COALESCE(i.Price_USD, i.StandardPrice, 0) * ISNULL(s.quantity, 0)) as price 
                    FROM $table s WITH (NOLOCK)
                    LEFT JOIN $itemsTable i WITH (NOLOCK) ON s.sku = i.sku 
                    WHERE 1=1";
            
            if ($filter === 'ACTIVE') $sql .= " AND (ISNULL(is_confirmed, 0) = 0 AND ISNULL(is_loading_done, 0) = 0)";
            if ($filter === 'WAIT_PROD') $sql .= " AND ISNULL(is_production_done, 0) = 0 AND ISNULL(is_confirmed, 0) = 0";
            if ($filter === 'WAIT_LOAD') $sql .= " AND is_production_done = 1 AND ISNULL(is_loading_done, 0) = 0 AND ISNULL(is_confirmed, 0) = 0";
            if ($filter === 'PROD_DONE') $sql .= " AND is_loading_done = 1"; 

            $sql .= $dateCondition;
            $sql .= " ORDER BY ISNULL(custom_order, 999999) ASC, id DESC";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute($dateParams);
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $sumSql = "SELECT 
                       COUNT(*) as total_all,
                       SUM(CASE WHEN ISNULL(is_loading_done, 0) = 0 AND ISNULL(is_confirmed, 0) = 0 THEN 1 ELSE 0 END) as total_active,
                       SUM(CASE WHEN ISNULL(is_production_done, 0) = 0 AND ISNULL(is_confirmed, 0) = 0 THEN 1 ELSE 0 END) as wait_prod,
                       SUM(CASE WHEN is_production_done = 1 AND ISNULL(is_loading_done, 0) = 0 AND ISNULL(is_confirmed, 0) = 0 THEN 1 ELSE 0 END) as wait_load,
                       SUM(CASE WHEN is_loading_done = 1 THEN 1 ELSE 0 END) as prod_done
                       FROM $table s WITH (NOLOCK)
                       WHERE 1=1 " . $dateCondition;

            $stmtSum = $pdo->prepare($sumSql);
            $stmtSum->execute($dateParams);
            $summary = $stmtSum->fetch(PDO::FETCH_ASSOC);

            echo json_encode(['success'=>true, 'data'=>$data, 'summary'=>$summary]);
            break;

        // 2. PREVIEW IMPORT
        case 'preview_import':
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
            
            $skippedCount = 0; $errorLogs = [];
            $previewData = [];
            
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

            foreach ($csv as $index => $row) {
                if ($index === 0) continue; 
                if (empty($row) || count($row) < 2) continue; 

                $po = $getCol($row, ['po', 'po number', 'po_number', 'p.o.']);
                $sku = $getCol($row, ['sku', 'item code', 'material']);
                $team = $getCol($row, ['team', 'team group', 'group']); 
                
                if (empty($po)) { 
                    if (implode('', $row) !== '') $skippedCount++; 
                    continue; 
                }

                if (empty($sku)) {
                    $skippedCount++;
                    $errorLogs[] = "แถวที่ " . ($index + 1) . " (PO: $po): ข้ามการนำเข้าเนื่องจากข้อมูลบกพร่อง (ไม่มีการระบุรหัส SKU/รหัสสินค้า)";
                    continue;
                }

                try {
                    $rawPrdDate = $getCol($row, ['prd start date', 'prd completed date', 'production date', 'pdate']);
                    $rawPrdEndDate = $getCol($row, ['prd end date', 'production end date']);
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

                    $rawQty = $getCol($row, ['qty', 'quantity', 'amount']);
                    $qty = null; 
                    if ($rawQty !== '') {
                        $cleanQty = str_replace(',', '', $rawQty);
                        if (is_numeric($cleanQty)) {
                            $qty = (float)$cleanQty; 
                        }
                    }

                    $parsedPrdDate = $fnDate($rawPrdDate);
                    $parsedPrdEndDate = $fnDate($rawPrdEndDate);
                    $parsedLoadDate = $fnDate($rawLoadDate);
                    $parsedInspDate = $fnDate($rawInspDate);
                    $parsedOrderDate = $fnDate($getCol($row, ['order date', 'date', 'odate']), $parsedPrdDate ?: $parsedLoadDate);

                    $warnings = [];
                    $checkYear = function($date, $label) use (&$warnings) {
                        if ($date) {
                            $y = (int)substr($date, 0, 4);
                            if ($y < 2023) $warnings[$label] = true;
                        }
                    };
                    $checkYear($parsedOrderDate, 'order_date');
                    $checkYear($parsedPrdDate, 'production_date');
                    $checkYear($parsedPrdEndDate, 'production_end_date');
                    $checkYear($parsedLoadDate, 'loading_date');
                    $checkYear($parsedInspDate, 'inspection_date');

                    $previewData[] = [
                        'row_index' => $index + 1,
                        'order_date' => $parsedOrderDate,
                        'description' => $getCol($row, ['description', 'desc']),
                        'color' => $getCol($row, ['color', 'colour']),
                        'sku' => $sku,
                        'po_number' => $po,
                        'quantity' => $qty,
                        'dc_location' => $getCol($row, ['dc', 'dc location']),
                        'loading_week' => $getCol($row, ['original loading week', 'loading week']),
                        'shipping_week' => $getCol($row, ['original shipping week', 'shipping week']),
                        'production_date' => $parsedPrdDate,
                        'production_end_date' => $parsedPrdEndDate,
                        'is_production_done' => $prdStatus,
                        'loading_date' => $parsedLoadDate,
                        'is_loading_done' => $loadStatus,
                        'ticket_number' => $getCol($row, ['ticket number', 'ticket']),
                        'inspection_date' => $parsedInspDate,
                        'inspection_status' => $finalInspStatus,
                        'remark' => $getCol($row, ['remark', 'comment']),
                        'is_confirmed' => $isConf,
                        'team' => $team,
                        'warnings' => $warnings
                    ];
                } catch (Exception $ex) {
                    $skippedCount++;
                    $errorLogs[] = "PO $po: " . $ex->getMessage();
                }
            }
            
            echo json_encode([
                'success' => true,
                'data' => $previewData,
                'skipped_count' => $skippedCount,
                'errors' => array_slice($errorLogs, 0, 10)
            ]);
            break;

        case 'import_json':
            $in = json_decode(file_get_contents('php://input'), true);
            if (empty($in['data']) || !is_array($in['data'])) {
                throw new Exception("No data provided");
            }
            
            $pdo->beginTransaction();
            $sqlMax = "SELECT MAX(custom_order) FROM $table WITH (NOLOCK)";
            $maxOrder = $pdo->query($sqlMax)->fetchColumn();
            $currentOrder = ($maxOrder) ? (int)$maxOrder : 0;

            $sql = "MERGE INTO $table AS T 
                    USING (VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)) 
                    AS S(odate, descr, color, sku, po, qty, dc, lweek, sweek, pdate, penddate, pdone, ldate, ldone, ticket, idate, istat, rem, iconf, corder, team)
                    ON T.po_number = S.po 
                    WHEN MATCHED THEN UPDATE SET 
                        T.order_date = COALESCE(S.odate, T.order_date),
                        T.sku = S.sku,
                        T.description = S.descr, 
                        T.color = S.color, 
                        T.quantity = S.qty, 
                        T.dc_location = S.dc,
                        T.loading_week = S.lweek, 
                        T.shipping_week = S.sweek,
                        T.team = ISNULL(NULLIF(S.team, ''), T.team), 
                        T.production_date = COALESCE(S.pdate, T.production_date),
                        T.production_end_date = COALESCE(S.penddate, T.production_end_date),
                        T.is_production_done = S.pdone,
                        T.loading_date = COALESCE(S.ldate, T.loading_date),
                        T.is_loading_done = S.ldone,
                        T.ticket_number = CASE
                            WHEN NULLIF(LTRIM(RTRIM(ISNULL(T.ticket_number, ''))), '') IS NOT NULL
                                 AND (
                                     T.inspection_date IS NOT NULL
                                     OR UPPER(LTRIM(RTRIM(ISNULL(T.inspection_result, '')))) IN ('PASS', 'FAIL')
                                     OR UPPER(LTRIM(RTRIM(ISNULL(T.inspection_status, '')))) IN ('DONE', 'IN_PROGRESS', 'WAITING')
                                 )
                                THEN T.ticket_number
                            ELSE COALESCE(NULLIF(LTRIM(RTRIM(ISNULL(S.ticket, ''))), ''), T.ticket_number)
                        END,
                        T.inspection_date = COALESCE(T.inspection_date, S.idate),
                        T.inspection_status = CASE
                            WHEN UPPER(LTRIM(RTRIM(ISNULL(T.inspection_result, '')))) IN ('PASS', 'FAIL')
                              OR UPPER(LTRIM(RTRIM(ISNULL(T.inspection_status, '')))) IN ('DONE', 'IN_PROGRESS', 'WAITING')
                              OR T.inspection_date IS NOT NULL
                              OR NULLIF(LTRIM(RTRIM(ISNULL(T.ticket_number, ''))), '') IS NOT NULL
                                THEN T.inspection_status
                            WHEN UPPER(LTRIM(RTRIM(ISNULL(S.istat, '')))) = 'PASS'
                                THEN 'DONE'
                            ELSE COALESCE(NULLIF(LTRIM(RTRIM(ISNULL(S.istat, ''))), ''), T.inspection_status)
                        END,
                        T.inspection_result = CASE
                            WHEN UPPER(LTRIM(RTRIM(ISNULL(T.inspection_result, '')))) IN ('PASS', 'FAIL')
                              OR UPPER(LTRIM(RTRIM(ISNULL(T.inspection_status, '')))) IN ('DONE', 'IN_PROGRESS', 'WAITING')
                              OR T.inspection_date IS NOT NULL
                              OR NULLIF(LTRIM(RTRIM(ISNULL(T.ticket_number, ''))), '') IS NOT NULL
                                THEN T.inspection_result
                            WHEN UPPER(LTRIM(RTRIM(ISNULL(S.istat, '')))) = 'PASS'
                                THEN 'PASS'
                            ELSE T.inspection_result
                        END,
                        T.remark = S.rem, 
                        T.is_confirmed = S.iconf,
                        T.custom_order = S.corder, 
                        T.updated_at = GETDATE()
                    WHEN NOT MATCHED THEN INSERT 
                        (order_date, description, color, sku, po_number, quantity, dc_location, 
                        loading_week, shipping_week, production_date, production_end_date, is_production_done, 
                        loading_date, is_loading_done, ticket_number, inspection_date, inspection_status, inspection_result, remark, is_confirmed, custom_order, team)
                    VALUES (S.odate, S.descr, S.color, S.sku, S.po, S.qty, S.dc, S.lweek, S.sweek, S.pdate, S.penddate, S.pdone, S.ldate, S.ldone, S.ticket, S.idate,
                        CASE WHEN UPPER(LTRIM(RTRIM(ISNULL(S.istat, '')))) = 'PASS' THEN 'DONE' ELSE NULLIF(LTRIM(RTRIM(ISNULL(S.istat, ''))), '') END,
                        CASE WHEN UPPER(LTRIM(RTRIM(ISNULL(S.istat, '')))) = 'PASS' THEN 'PASS' ELSE NULL END,
                        S.rem, S.iconf, S.corder, ISNULL(NULLIF(S.team, ''), 'Team1'));";

            $stmt = $pdo->prepare($sql);
            $count = 0;
            $skippedCount = 0;
            $errorLogs = [];
            $samplePos = [];
            
            foreach ($in['data'] as $row) {
                try {
                    $currentOrder++;
                    $normPrdDate = $fnDate($row['production_date'] ?? null);
                    $normPrdEndDate = $fnDate($row['production_end_date'] ?? null);
                    $normLoadDate = $fnDate($row['loading_date'] ?? null);
                    $normInspDate = $fnDate($row['inspection_date'] ?? null);
                    $normOrderDate = $fnDate($row['order_date'] ?? null, $normPrdDate ?: $normLoadDate);
                    $stmt->execute([
                        $normOrderDate,
                        $row['description'],
                        $row['color'],
                        $row['sku'],
                        $row['po_number'],
                        $row['quantity'],
                        $row['dc_location'],
                        $row['loading_week'],
                        $row['shipping_week'],
                        $normPrdDate,
                        $normPrdEndDate,
                        $row['is_production_done'],
                        $normLoadDate,
                        $row['is_loading_done'],
                        $row['ticket_number'],
                        $normInspDate,
                        $row['inspection_status'],
                        $row['remark'],
                        $row['is_confirmed'],
                        $currentOrder,
                        $row['team']
                    ]);
                    $count++;
                    if (count($samplePos) < 10 && !empty($row['po_number'])) {
                        $samplePos[] = $row['po_number'];
                    }
                } catch (Exception $ex) {
                    $skippedCount++;
                    $errorLogs[] = "PO {$row['po_number']}: " . $ex->getMessage();
                }
            }
            
            $pdo->commit();
            if (function_exists('writeLog')) {
                writeLog(
                    $pdo,
                    'IMPORT',
                    'SALES_ORDER',
                    'BATCH_' . $count,
                    null,
                    ['imported_count' => $count, 'skipped_count' => $skippedCount, 'sample_pos' => $samplePos],
                    "Sales JSON import: {$count} imported, {$skippedCount} skipped (QA fields protected)"
                );
            }
            echo json_encode([
                'success' => true,
                'data' => ['imported_count' => $count, 'skipped_count' => $skippedCount],
                'message' => "Imported {$count} rows",
                'imported_count' => $count,
                'skipped_count' => $skippedCount,
                'errors' => array_slice($errorLogs, 0, 10)
            ], JSON_UNESCAPED_UNICODE);
            break;

        // 3. REORDER
        case 'reorder_items':
            $in = json_decode(file_get_contents('php://input'), true);
            if (!empty($in['orderedIds'])) {
                $pdo->beginTransaction();
                $sql = "UPDATE $table SET custom_order = ?, updated_at = GETDATE() WHERE id = ?";
                $stmt = $pdo->prepare($sql);
                foreach ($in['orderedIds'] as $idx => $id) $stmt->execute([$idx + 1, $id]);
                $pdo->commit();
            }
            echo json_encode(['success' => true]);
            break;

        // 4. UPDATE CHECKBOX/BUTTON
        case 'update_check':
            $in = json_decode(file_get_contents('php://input'), true) ?: [];
            $id = intval($in['id'] ?? 0);
            $field = $in['field'] ?? '';
            $val = !empty($in['checked']) ? 1 : 0;
            if ($id <= 0) {
                http_response_code(400);
                echo json_encode(['success'=>false, 'data'=>null, 'message'=>'Invalid order ID'], JSON_UNESCAPED_UNICODE);
                break;
            }

            $stmtOld = $pdo->prepare("SELECT id, po_number, inspection_date, inspection_status, inspection_result, is_production_done, is_loading_done, is_confirmed, loading_date, production_end_date FROM $table WITH (NOLOCK) WHERE id = ?");
            $stmtOld->execute([$id]);
            $oldRow = $stmtOld->fetch(PDO::FETCH_ASSOC);
            if (!$oldRow) {
                http_response_code(404);
                echo json_encode(['success'=>false, 'data'=>null, 'message'=>'Sales order not found'], JSON_UNESCAPED_UNICODE);
                break;
            }

            if ($field === 'insp') {
                $curRes = strtoupper(trim((string)($oldRow['inspection_result'] ?? '')));
                $stmtHist = $pdo->prepare("SELECT TOP (1) id, inspection_result FROM dbo.QMS_PO_INSPECTION_HISTORY WITH (NOLOCK) WHERE sales_order_id = ? AND is_latest = 1 ORDER BY round_no DESC, id DESC");
                $stmtHist->execute([$id]);
                $latestHist = $stmtHist->fetch(PDO::FETCH_ASSOC);
                $histRes = strtoupper(trim((string)($latestHist['inspection_result'] ?? '')));

                if ($curRes === 'FAIL' || $histRes === 'FAIL') {
                    http_response_code(400);
                    echo json_encode([
                        'success'=>false,
                        'data'=>null,
                        'message'=>'ไม่สามารถสลับสถานะ PO ที่ผลตรวจ QA เป็น FAIL ได้ กรุณาเปิดตรวจรอบใหม่ในระบบ iQMS'
                    ], JSON_UNESCAPED_UNICODE);
                    break;
                }

                $statusVal = $val ? 'DONE' : 'WAITING';
                $resultVal = $val ? 'PASS' : null;
                $pdo->beginTransaction();
                $pdo->prepare("UPDATE $table SET inspection_status = ?, inspection_result = ?, updated_at = GETDATE() WHERE id = ?")->execute([$statusVal, $resultVal, $id]);
                if ($latestHist) {
                    $pdo->prepare("UPDATE dbo.QMS_PO_INSPECTION_HISTORY SET inspection_status = ?, inspection_result = ?, updated_at = GETDATE() WHERE id = ?")
                        ->execute([$statusVal, $resultVal, $latestHist['id']]);
                }
                $pdo->commit();
                if (function_exists('writeLog')) {
                    writeLog($pdo, 'UPDATE', 'SALES_ORDER', $id, ['inspection_status' => $oldRow['inspection_status'], 'inspection_result' => $oldRow['inspection_result']], ['inspection_status' => $statusVal, 'inspection_result' => $resultVal], "Updated inspection check on PO {$oldRow['po_number']}");
                }
            } else {
                $col = ($field === 'prod') ? 'is_production_done' : (($field === 'load') ? 'is_loading_done' : (($field === 'confirm') ? 'is_confirmed' : ''));
                if ($col) {
                    if ($col === 'is_loading_done' && $val == 1) {
                        $pdo->prepare("UPDATE $table SET is_loading_done = 1, loading_date = COALESCE(loading_date, GETDATE()), updated_at = GETDATE() WHERE id = ?")->execute([$id]);
                    } else if ($col === 'is_production_done' && $val == 1) {
                        $pdo->prepare("UPDATE $table SET is_production_done = 1, production_end_date = COALESCE(production_end_date, GETDATE()), updated_at = GETDATE() WHERE id = ?")->execute([$id]);
                    } else {
                        $pdo->prepare("UPDATE $table SET $col = ?, updated_at = GETDATE() WHERE id = ?")->execute([$val, $id]);
                    }
                    if (function_exists('writeLog')) {
                        writeLog($pdo, 'UPDATE', 'SALES_ORDER', $id, [$col => $oldRow[$col] ?? null], [$col => $val], "Updated {$col} on PO {$oldRow['po_number']}");
                    }
                }
            }
            echo json_encode(['success'=>true, 'data'=>['id'=>$id], 'message'=>'Updated'], JSON_UNESCAPED_UNICODE); 
            break;

        // 5. UPDATE CELL
        case 'update_cell':
            $in = json_decode(file_get_contents('php://input'), true) ?: [];
            $id = intval($in['id'] ?? 0);
            $field = $in['field'] ?? '';
            $allowed = ['quantity', 'loading_week', 'shipping_week', 'remark', 'dc_location', 'order_date', 'production_date', 'production_end_date', 'loading_date', 'inspection_date', 'ticket_number', 'team'];
            if ($id > 0 && in_array($field, $allowed, true)) {
                $stmtOld = $pdo->prepare("SELECT id, po_number, inspection_date, ticket_number, inspection_status, inspection_result, {$field} AS cur_val FROM $table WITH (NOLOCK) WHERE id = ?");
                $stmtOld->execute([$id]);
                $oldRow = $stmtOld->fetch(PDO::FETCH_ASSOC);
                if (!$oldRow) {
                    http_response_code(404);
                    echo json_encode(['success'=>false, 'data'=>null, 'message'=>'Sales order not found'], JSON_UNESCAPED_UNICODE);
                    break;
                }

                $curRes = strtoupper(trim((string)($oldRow['inspection_result'] ?? '')));
                $curSt = strtoupper(trim((string)($oldRow['inspection_status'] ?? '')));
                if (in_array($field, ['inspection_date', 'ticket_number'], true) && ($curRes === 'FAIL' || $curSt === 'DONE')) {
                    http_response_code(400);
                    echo json_encode([
                        'success'=>false,
                        'data'=>null,
                        'message'=>'PO นี้ตรวจ QA เสร็จสิ้นแล้ว กรุณาแก้ไขวันที่ตรวจหรือเปิดตรวจรอบใหม่ในระบบ iQMS เพื่อไม่ให้ประวัติการตรวจสูญหาย'
                    ], JSON_UNESCAPED_UNICODE);
                    break;
                }

                $val = ($in['value'] ?? '') !== '' ? $in['value'] : null;
                if ($val !== null && strpos($field, 'date') !== false) {
                    $val = $fnDate($val);
                }

                $pdo->beginTransaction();
                $pdo->prepare("UPDATE $table SET {$field} = ?, updated_at = GETDATE() WHERE id = ?")->execute([$val, $id]);
                if ($field === 'inspection_date') {
                    $pdo->prepare("UPDATE dbo.QMS_PO_INSPECTION_HISTORY SET scheduled_date = ?, updated_at = GETDATE() WHERE sales_order_id = ? AND is_latest = 1")->execute([$val, $id]);
                } elseif ($field === 'ticket_number') {
                    $pdo->prepare("UPDATE dbo.QMS_PO_INSPECTION_HISTORY SET ticket_number = ?, updated_at = GETDATE() WHERE sales_order_id = ? AND is_latest = 1")->execute([$val, $id]);
                }
                $pdo->commit();

                if (function_exists('writeLog')) {
                    writeLog($pdo, 'UPDATE', 'SALES_ORDER', $id, [$field => $oldRow['cur_val'] ?? null], [$field => $val], "Inline updated {$field} on PO {$oldRow['po_number']}");
                }
                echo json_encode(['success'=>true, 'data'=>['id'=>$id], 'message'=>'Updated'], JSON_UNESCAPED_UNICODE);
            } else {
                http_response_code(400);
                echo json_encode(['success'=>false, 'data'=>null, 'message'=>'Field not allowed'], JSON_UNESCAPED_UNICODE); 
            }
            break;

        // 6. CREATE SINGLE
        case 'create_single':
            $in = json_decode(file_get_contents('php://input'), true) ?: [];
            if (empty(trim($in['sku'] ?? ''))) {
                echo json_encode(['success' => false, 'data' => null, 'message' => 'ไม่สามารถบันทึกได้: กรุณาระบุรหัส SKU หรือรหัสสินค้า'], JSON_UNESCAPED_UNICODE);
                break;
            }
            $maxOrder = $pdo->query("SELECT MAX(custom_order) FROM $table WITH (NOLOCK)")->fetchColumn();
            $nextOrder = $maxOrder ? $maxOrder + 1 : 1;
            $oDate = $fnDate($in['order_date'] ?: null);
            $team = !empty($in['team']) ? $in['team'] : 'Team1'; // [ADDED] Set Default
            $poNumber = trim((string)($in['po_number'] ?? ''));

            $sql = "INSERT INTO $table (po_number, sku, order_date, description, color, quantity, dc_location, loading_week, shipping_week, remark, custom_order, team, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, GETDATE())";
            $pdo->prepare($sql)->execute([
                $poNumber, $in['sku'], $oDate, $in['description']??'', $in['color']??'', $in['quantity']??0, 
                $in['dc_location']??'', $in['loading_week']??'', $in['shipping_week']??'', $in['remark']??'', $nextOrder, $team
            ]);
            $newId = $pdo->lastInsertId();
            if (function_exists('writeLog')) {
                writeLog($pdo, 'INSERT', 'SALES_ORDER', $newId ?: $poNumber, null, ['po_number' => $poNumber, 'sku' => $in['sku'], 'quantity' => $in['quantity'] ?? 0, 'team' => $team], "Created sales order {$poNumber}");
            }
            echo json_encode(['success'=>true, 'data'=>['id'=>$newId], 'message'=>'Created'], JSON_UNESCAPED_UNICODE); 
            break;

        // 7. DELETE SINGLE
        case 'delete_single':
            $in = json_decode(file_get_contents('php://input'), true) ?: [];
            $id = intval($in['id'] ?? 0);
            if ($id > 0) {
                $stmtOld = $pdo->prepare("SELECT id, po_number, sku, quantity, inspection_status, inspection_result FROM $table WITH (NOLOCK) WHERE id = ?");
                $stmtOld->execute([$id]);
                $oldRow = $stmtOld->fetch(PDO::FETCH_ASSOC);
                if (!$oldRow) {
                    http_response_code(404);
                    echo json_encode(['success'=>false, 'data'=>null, 'message'=>'Sales order not found'], JSON_UNESCAPED_UNICODE);
                    break;
                }
                $pdo->beginTransaction();
                $pdo->prepare("DELETE FROM dbo.QMS_PO_INSPECTION_HISTORY WHERE sales_order_id = ?")->execute([$id]);
                $stmt = $pdo->prepare("DELETE FROM $table WHERE id = ?");
                $stmt->execute([$id]);
                $pdo->commit();
                if (function_exists('writeLog')) {
                    writeLog($pdo, 'DELETE', 'SALES_ORDER', $id, $oldRow, null, "Deleted sales order {$oldRow['po_number']}");
                }
                echo json_encode(['success'=>true, 'data'=>['id'=>$id], 'message'=>'Deleted'], JSON_UNESCAPED_UNICODE);
            } else {
                echo json_encode(['success'=>false, 'data'=>null, 'message'=>'Invalid ID'], JSON_UNESCAPED_UNICODE);
            }
            break;

        default:
            echo json_encode(['success'=>false, 'data'=>null, 'message'=>'Invalid Action'], JSON_UNESCAPED_UNICODE);
            break;
    }

} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
    if (isset($pdo) && function_exists('writeErrorLog')) {
        writeErrorLog($pdo, 'SALES_ORDER', $e->getMessage(), ['action' => $action ?? '']);
    }
    http_response_code(500); 
    echo json_encode(['success'=>false, 'data'=>null, 'message'=>$e->getMessage()], JSON_UNESCAPED_UNICODE);
}
?>