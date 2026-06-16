<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../core/init.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit(0); }

$table = defined('SALES_ORDERS_TABLE') ? SALES_ORDERS_TABLE : 'SALES_ORDERS';
$itemsTable = defined('ITEMS_TABLE') ? ITEMS_TABLE : 'ITEMS';

$action = $_REQUEST['action'] ?? 'read';

try {
    if (!isset($pdo)) {
        $pdo = new PDO("sqlsrv:Server=".DB_HOST.";Database=".DB_DATABASE, DB_USER, DB_PASSWORD);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    }

    // --- Helper Functions ---
    $fnDate = function($val) {
        if (empty($val) || $val === 'null' || $val === 'NULL') return null;
        $val = trim($val);
        // Remove invisible/non-printable characters
        $val = preg_replace('/[\x00-\x1F\x7F\xC2\xA0]/u', '', $val);
        $val = explode(' ', $val)[0]; 
        if ($val === '' || $val === '0000-00-00') return null;

        // 1. Excel serial number (integer days since 1899-12-30)
        if (is_numeric($val) && $val > 40000) {
            $unix = ($val - 25569) * 86400;
            return gmdate("Y-m-d", (int)$unix);
        }

        // 2. ISO format: YYYY-MM-DD
        if (preg_match('/^(\d{4})-(\d{1,2})-(\d{1,2})$/', $val, $m)) {
            $year = (int)$m[1];
            // Auto-correct years corrupted by previous export cycles (1925→2025, 1926→2026, etc.)
            if ($year >= 1900 && $year < 1990) $year += 100;
            return sprintf('%04d-%02d-%02d', $year, $m[2], $m[3]);
        }

        // 3. ISO with slashes: YYYY/MM/DD
        if (preg_match('/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/', $val, $m) && $m[1] > 1900) {
            $year = (int)$m[1];
            if ($year >= 1900 && $year < 1990) $year += 100;
            return sprintf('%04d-%02d-%02d', $year, $m[2], $m[3]);
        }

        // 4. DD/MM/YYYY or DD/MM/YY (Thai/European format — this is the primary user format)
        if (preg_match('/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/', $val, $m)) {
            $day   = (int)$m[1];
            $month = (int)$m[2];
            $year  = (int)$m[3];
            // Convert 2-digit year: 00-49 → 2000-2049, 50-99 → 1950-1999
            if ($year < 100) {
                $year += ($year < 50) ? 2000 : 1900;
            }
            // Auto-correct years corrupted by previous export cycles (1925→2025, 1926→2026, etc.)
            if ($year >= 1900 && $year < 1990) $year += 100;
            // Validate day/month ranges
            if ($month >= 1 && $month <= 12 && $day >= 1 && $day <= 31) {
                if (checkdate($month, $day, $year)) {
                    return sprintf('%04d-%02d-%02d', $year, $month, $day);
                }
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
                s.inspection_status, s.ticket_number, s.team
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

                    $parsedOrderDate = $fnDate($getCol($row, ['order date', 'date', 'odate']));
                    $parsedPrdDate = $fnDate($rawPrdDate);
                    $parsedPrdEndDate = $fnDate($rawPrdEndDate);
                    $parsedLoadDate = $fnDate($rawLoadDate);
                    $parsedInspDate = $fnDate($rawInspDate);

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
                        T.ticket_number = S.ticket, 
                        T.inspection_date = S.idate, 
                        T.inspection_status = S.istat, 
                        T.remark = S.rem, 
                        T.is_confirmed = S.iconf,
                        T.custom_order = S.corder, 
                        T.updated_at = GETDATE()
                    WHEN NOT MATCHED THEN INSERT 
                        (order_date, description, color, sku, po_number, quantity, dc_location, 
                        loading_week, shipping_week, production_date, production_end_date, is_production_done, 
                        loading_date, is_loading_done, ticket_number, inspection_date, inspection_status, remark, is_confirmed, custom_order, team)
                    VALUES (S.odate, S.descr, S.color, S.sku, S.po, S.qty, S.dc, S.lweek, S.sweek, S.pdate, S.penddate, S.pdone, S.ldate, S.ldone, S.ticket, S.idate, S.istat, S.rem, S.iconf, S.corder, ISNULL(NULLIF(S.team, ''), 'Team1'));";

            $stmt = $pdo->prepare($sql);
            $count = 0;
            $skippedCount = 0;
            $errorLogs = [];
            
            foreach ($in['data'] as $row) {
                try {
                    $currentOrder++;
                    $stmt->execute([
                        $row['order_date'] ?: null,
                        $row['description'],
                        $row['color'],
                        $row['sku'],
                        $row['po_number'],
                        $row['quantity'],
                        $row['dc_location'],
                        $row['loading_week'],
                        $row['shipping_week'],
                        $row['production_date'] ?: null,
                        $row['production_end_date'] ?: null,
                        $row['is_production_done'],
                        $row['loading_date'] ?: null,
                        $row['is_loading_done'],
                        $row['ticket_number'],
                        $row['inspection_date'] ?: null,
                        $row['inspection_status'],
                        $row['remark'],
                        $row['is_confirmed'],
                        $currentOrder,
                        $row['team']
                    ]);
                    $count++;
                } catch (Exception $ex) {
                    $skippedCount++;
                    $errorLogs[] = "PO {$row['po_number']}: " . $ex->getMessage();
                }
            }
            
            $pdo->commit();
            echo json_encode([
                'success' => true,
                'imported_count' => $count,
                'skipped_count' => $skippedCount,
                'errors' => array_slice($errorLogs, 0, 10)
            ]);
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
            $in = json_decode(file_get_contents('php://input'), true);
            $val = $in['checked'] ? 1 : 0;
            if ($in['field'] == 'insp') {
                $txtVal = $in['checked'] ? 'Pass' : null;
                $pdo->prepare("UPDATE $table SET inspection_status = ?, updated_at = GETDATE() WHERE id = ?")->execute([$txtVal, $in['id']]);
            } else {
                $col = ($in['field']=='prod')?'is_production_done':(($in['field']=='load')?'is_loading_done':(($in['field']=='confirm')?'is_confirmed':''));
                if($col) {
                    if ($col === 'is_loading_done' && $val == 1) {
                        $pdo->prepare("UPDATE $table SET is_loading_done = 1, loading_date = COALESCE(loading_date, GETDATE()), updated_at = GETDATE() WHERE id = ?")->execute([$in['id']]);
                    } else if ($col === 'is_production_done' && $val == 1) {
                        $pdo->prepare("UPDATE $table SET is_production_done = 1, production_end_date = COALESCE(production_end_date, GETDATE()), updated_at = GETDATE() WHERE id = ?")->execute([$in['id']]);
                    } else {
                        $pdo->prepare("UPDATE $table SET $col = ?, updated_at = GETDATE() WHERE id = ?")->execute([$val, $in['id']]);
                    }
                }
            }
            echo json_encode(['success'=>true]); 
            break;

        // 5. UPDATE CELL
        case 'update_cell':
            $in = json_decode(file_get_contents('php://input'), true);
            $allowed = ['quantity', 'loading_week', 'shipping_week', 'remark', 'dc_location', 'order_date', 'production_date', 'production_end_date', 'loading_date', 'inspection_date', 'ticket_number', 'team'];
            if (in_array($in['field'], $allowed)) {
                $val = $in['value'] ?: null;
                if ($val && strpos($in['field'], 'date') !== false) $val = $fnDate($val);

                $pdo->prepare("UPDATE $table SET {$in['field']} = ?, updated_at = GETDATE() WHERE id = ?")->execute([$val, $in['id']]);

                echo json_encode(['success'=>true]);
            } else {
                echo json_encode(['success'=>false, 'message'=>'Field not allowed']); 
            }
            break;

        // 6. CREATE SINGLE
        case 'create_single':
            $in = json_decode(file_get_contents('php://input'), true);
            if (empty(trim($in['sku'] ?? ''))) {
                echo json_encode(['success' => false, 'message' => 'ไม่สามารถบันทึกได้: กรุณาระบุรหัส SKU หรือรหัสสินค้า']);
                break;
            }
            $maxOrder = $pdo->query("SELECT MAX(custom_order) FROM $table WITH (NOLOCK)")->fetchColumn();
            $nextOrder = $maxOrder ? $maxOrder + 1 : 1;
            $oDate = $fnDate($in['order_date'] ?: null);
            $team = !empty($in['team']) ? $in['team'] : 'Team1'; // [ADDED] Set Default

            $sql = "INSERT INTO $table (po_number, sku, order_date, description, color, quantity, dc_location, loading_week, shipping_week, remark, custom_order, team, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, GETDATE())";
            $pdo->prepare($sql)->execute([
                $in['po_number'], $in['sku'], $oDate, $in['description']??'', $in['color']??'', $in['quantity']??0, 
                $in['dc_location']??'', $in['loading_week']??'', $in['shipping_week']??'', $in['remark']??'', $nextOrder, $team
            ]);
            echo json_encode(['success'=>true]); 
            break;

        // 7. DELETE SINGLE
        case 'delete_single':
            $in = json_decode(file_get_contents('php://input'), true);
            $id = $in['id'] ?? 0;
            if ($id) {
                $stmt = $pdo->prepare("DELETE FROM $table WHERE id = ?");
                $stmt->execute([$id]);
                echo json_encode(['success'=>true]);
            } else {
                echo json_encode(['success'=>false, 'message'=>'Invalid ID']);
            }
            break;

        default:
            echo json_encode(['success'=>false, 'message'=>'Invalid Action']);
            break;
    }

} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500); 
    echo json_encode(['success'=>false, 'message'=>$e->getMessage()]);
}
?>