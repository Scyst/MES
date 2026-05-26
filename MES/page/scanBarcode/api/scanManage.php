<?php
// MES/page/production/api/scanManage.php
ini_set('display_errors', 0);
require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../components/init.php';

header('Content-Type: application/json; charset=utf-8');
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    if (!isset($_SERVER['HTTP_X_CSRF_TOKEN']) || !isset($_SESSION['csrf_token']) || !hash_equals($_SESSION['csrf_token'], $_SERVER['HTTP_X_CSRF_TOKEN'])) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'CSRF token validation failed.']);
        exit;
    }
}

$action = $_REQUEST['action'] ?? '';
$input = json_decode(file_get_contents("php://input"), true);
$user_id = $_SESSION['user']['id'] ?? 0;
$username = $_SESSION['user']['username'] ?? '';

try {
    switch ($action) {
        case 'get_locations':
            if ($_SERVER['REQUEST_METHOD'] !== 'GET') throw new Exception('Method not allowed');
            
            $stmt = $pdo->query("SELECT location_id, location_name FROM " . LOCATIONS_TABLE . " WHERE is_active = 1 ORDER BY location_name");
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
            break;

        case 'get_product':
            if ($_SERVER['REQUEST_METHOD'] !== 'GET') throw new Exception('Method not allowed');
            
            $barcode = trim($_GET['barcode'] ?? '');
            if (empty($barcode)) throw new Exception('กรุณาระบุ Barcode');

            $stmt = $pdo->prepare("
                SELECT TOP 1 barcode, sap_no, part_no, part_description
                FROM " . ITEMS_TABLE . "
                WHERE material_type = 'FG' AND (barcode = :barcode OR sap_no = :sap) AND is_active = 1
            ");
            $stmt->execute([':barcode' => $barcode, ':sap' => $barcode]);
            $product = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($product) {
                echo json_encode(['success' => true, 'data' => $product]);
            } else {
                echo json_encode(['success' => false, 'message' => 'ไม่พบ Barcode หรือ SAP นี้ในระบบ', 'barcode' => $barcode]);
            }
            break;

        case 'get_logs':
            if ($_SERVER['REQUEST_METHOD'] !== 'GET') throw new Exception('Method not allowed');
            
            $date     = trim($_GET['date']     ?? date('Y-m-d'));
            $location = trim($_GET['location'] ?? '');
            $shift    = trim($_GET['shift']    ?? 'all');
            
            $d = new DateTime($date);
            $dNext = (clone $d)->modify('+1 day');
            
            if ($shift === 'day') {
                $rangeStart = $d->format('Y-m-d') . ' 08:00:00';
                $rangeEnd   = $d->format('Y-m-d') . ' 19:59:59';
            } elseif ($shift === 'night') {
                $rangeStart = $d->format('Y-m-d') . ' 20:00:00';
                $rangeEnd   = $dNext->format('Y-m-d') . ' 07:59:59';
            } else {
                $rangeStart = $d->format('Y-m-d') . ' 08:00:00';
                $rangeEnd   = $dNext->format('Y-m-d') . ' 07:59:59';
            }

            $locationClause = !empty($location) ? "AND l.location_name = :location" : "";
            $sql = "
                SELECT TOP 1000
                    l.transaction_id, l.barcode_no AS barcode, i.part_no AS model,
                    l.lot_ref, l.location_name, l.production_type,
                    CONVERT(varchar(19), l.logdate, 120) AS logdate, l.notes
                FROM " . SCAN_LOGS_TABLE . " l
                LEFT JOIN " . ITEMS_TABLE . " i ON i.barcode = l.barcode_no AND i.material_type = 'FG'
                WHERE l.logdate BETWEEN :rangeStart AND :rangeEnd AND LOWER(l.lot_ref) NOT LIKE '%test%' {$locationClause}
                ORDER BY l.logdate DESC
            ";
            
            $params = [':rangeStart' => $rangeStart, ':rangeEnd' => $rangeEnd];
            if (!empty($location)) $params[':location'] = $location;

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode([
                'success' => true,
                'data'    => $data,
                'count'   => count($data)
            ]);
            break;

        case 'save_scan':
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') throw new Exception('Method not allowed');
            
            $barcode         = trim($input['barcode']         ?? '');
            $sap             = trim($input['sap']             ?? '');
            $lot_ref         = trim($input['lot_ref']         ?? '');
            $location_id     = trim($input['location_id']     ?? '');
            $location_name   = trim($input['location_name']   ?? '');
            $production_type = strtoupper(trim($input['type'] ?? 'FG'));
            $notes           = trim($input['notes']           ?? '');

            if ((empty($barcode) && empty($sap)) || empty($location_id)) {
                throw new Exception('กรุณากรอกข้อมูล Barcode และ Location ให้ครบถ้วน');
            }

            // Find item_id for Stock Transaction
            $itemStmt = $pdo->prepare("
                SELECT TOP 1 item_id, sap_no 
                FROM " . ITEMS_TABLE . " 
                WHERE (barcode = :barcode OR sap_no = :sap) AND is_active = 1
            ");
            $searchSap = !empty($sap) ? $sap : $barcode;
            $itemStmt->execute([':barcode' => $barcode, ':sap' => $searchSap]);
            $item = $itemStmt->fetch(PDO::FETCH_ASSOC);

            if (!$item) {
                throw new Exception("ไม่พบข้อมูลสินค้าในระบบ (Barcode/SAP ไม่ถูกต้อง)");
            }
            $item_id = $item['item_id'];
            $final_sap = !empty($sap) ? $sap : $item['sap_no'];

            $pdo->beginTransaction();

            // 1. Insert Log
            $stmt = $pdo->prepare("
                INSERT INTO " . SCAN_LOGS_TABLE . " (
                    barcode_no, sap_no, lot_ref, location_id, location_name, production_type, logdate, notes, scanned_by
                ) VALUES (?, ?, ?, ?, ?, ?, GETDATE(), ?, ?)
            ");
            $stmt->execute([$barcode, $final_sap, $lot_ref, $location_id, $location_name, $production_type, $notes, $username]);

            // 2. Execute Production (Stock Transaction)
            $logdate = date('Y-m-d');
            $current_time = date('H:i:s');
            $timestamp = $logdate . ' ' . $current_time;
            $prod_notes = trim("Scan: " . $notes);
            
            $prodStmt = $pdo->prepare("
                EXEC dbo.sp_ExecuteProduction 
                    @item_id = ?, 
                    @location_id = ?, 
                    @quantity = ?, 
                    @count_type = ?, 
                    @lot_no = ?, 
                    @notes = ?, 
                    @timestamp = ?, 
                    @start_time = ?, 
                    @end_time = ?, 
                    @user_id = ?, 
                    @username = ?
            ");
            
            $prodStmt->execute([
                $item_id,
                $location_id,
                1, // Quantity 1 per scan
                $production_type,
                $lot_ref,
                $prod_notes,
                $timestamp,
                $current_time,
                $current_time,
                $user_id,
                $username
            ]);

            $pdo->commit();

            writeLog($pdo, 'CREATE', 'SCAN_BARCODE', $barcode, null,
                compact('barcode', 'lot_ref', 'location_name', 'production_type', 'username'));

            $logdate_format = (new DateTime('now', new DateTimeZone('Asia/Bangkok')))->format('Y-m-d H:i:s');
            echo json_encode([
                'success' => true,
                'message' => 'บันทึกข้อมูลและตัดสต็อกสำเร็จ',
                'data'    => [
                    'barcode'         => $barcode,
                    'sap'             => $final_sap,
                    'lot_ref'         => $lot_ref,
                    'location_name'   => $location_name,
                    'production_type' => $production_type,
                    'logdate'         => $logdate_format,
                    'notes'           => $notes,
                ]
            ]);
            break;

        default:
            throw new Exception("Action '{$action}' is not handled.");
    }
} catch (Throwable $e) {
    if ($pdo && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    if (function_exists('handleApiError')) {
        handleApiError($e, $pdo, $input ?? $_REQUEST);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'System Error: ' . $e->getMessage()]);
    }
}