<?php
// page/sales/api/manage_shipping.php
header('Content-Type: application/json');

// 1. เรียก init.php ตัวเดียวจบ (ได้ Session, Config, Database, Auth ครบ)
require_once __DIR__ . '/../../components/init.php'; 

// 2. ใช้ชื่อตารางจาก Config โดยตรง (มาตรฐานเดียวกับทั้งระบบ)
// ถ้า config.php ถูกโหลดแล้ว ค่านี้ต้องมีแน่นอน แต่ใส่ Default ไว้กันเหนียว
$table = defined('SALES_ORDERS_TABLE') ? SALES_ORDERS_TABLE : 'SALES_ORDERS';

$action = $_REQUEST['action'] ?? 'read';

try {
    // 3. เชื่อมต่อฐานข้อมูล (เผื่อกรณี init.php ไม่ได้สร้าง $pdo ให้)
    if (!isset($pdo)) {
        $pdo = new PDO("sqlsrv:Server=".DB_HOST.";Database=".DB_DATABASE, DB_USER, DB_PASSWORD);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    }

    // ===================================================================================
    // CASE 1: READ (ดึงข้อมูล)
    // ===================================================================================
    if ($action === 'read') {
        $sql = "SELECT * FROM $table ORDER BY id DESC";
        $stmt = $pdo->query($sql);
        echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
        exit;
    }

    // ===================================================================================
    // CASE 2: UPDATE CELL (แก้ไขข้อมูล)
    // ===================================================================================
    if ($action === 'update_cell') {
        $in = json_decode(file_get_contents('php://input'), true) ?? $_POST;
        $id = $in['id'] ?? null;
        $field = $in['field'] ?? null;
        $value = $in['value'] ?? null;
        
        if ($id && $field) {
            // แปลงค่าว่าง string ให้เป็น NULL ใน Database
            if ($value === '') $value = null;

            $sql = "UPDATE $table SET $field = ?, updated_at = GETDATE() WHERE id = ?";
            $pdo->prepare($sql)->execute([$value, $id]);
            
            echo json_encode(['success' => true, 'message' => 'Updated']);
        } else {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Missing parameters']);
        }
        exit;
    }

    // ===================================================================================
    // CASE 3: IMPORT (นำเข้า CSV)
    // ===================================================================================
    if ($action === 'import') {
        if (!isset($_FILES['csv_file'])) throw new Exception("No file uploaded");
        $file = $_FILES['csv_file']['tmp_name'];
        $handle = fopen($file, "r");

        // ข้าม 2 บรรทัดแรก (Header)
        fgetcsv($handle); fgetcsv($handle); 

        $success = 0; $updated = 0;

        while (($data = fgetcsv($handle, 10000, ",")) !== FALSE) {
            // Mapping 31 Columns (ตามไฟล์ Excel ลูกค้า)
            $shipping_week      = trim($data[2] ?? '');
            $status_cust        = trim($data[3] ?? '');
            $inspect_type       = trim($data[4] ?? '');
            $inspect_res        = trim($data[5] ?? '');
            $snc_load_raw       = trim($data[6] ?? '');
            $etd_raw            = trim($data[7] ?? '');
            $dc                 = trim($data[8] ?? '');
            $sku                = trim($data[9] ?? '');
            $po                 = trim($data[10] ?? ''); // KEY (สำคัญ)
            $booking            = trim($data[11] ?? '');
            $invoice            = trim($data[12] ?? '');
            $desc               = trim($data[13] ?? '');
            $qty                = trim($data[14] ?? 0);
            $ctn_size           = trim($data[15] ?? '');
            $container          = trim($data[16] ?? '');
            $seal               = trim($data[17] ?? '');
            $tare               = trim($data[18] ?? '');
            $nw                 = trim($data[19] ?? '');
            $gw                 = trim($data[20] ?? '');
            $cbm                = trim($data[21] ?? '');
            $feeder             = trim($data[22] ?? '');
            $mother             = trim($data[23] ?? '');
            $snc_ci             = trim($data[24] ?? '');
            $si_cut_raw         = trim($data[25] ?? '');
            $pickup_raw         = trim($data[26] ?? '');
            $return_raw         = trim($data[27] ?? '');
            $remark             = trim($data[28] ?? '');
            $cutoff_date_raw    = trim($data[29] ?? '');
            $cutoff_time        = trim($data[30] ?? '');

            if (empty($po)) continue;

            // Date Converter Helper
            $fnDate = function($val) {
                if(empty($val)) return null;
                $d = DateTime::createFromFormat('d/m/Y', $val);
                if(!$d) $d = DateTime::createFromFormat('j/n/Y', $val);
                if(!$d) $d = DateTime::createFromFormat('Y-m-d', $val);
                return $d ? $d->format('Y-m-d') : null;
            };

            // เช็คว่ามี PO นี้หรือยัง
            $stmt = $pdo->prepare("SELECT id FROM $table WHERE po_number = ?");
            $stmt->execute([$po]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);

            // เตรียม Parameters สำหรับ Execute
            $params = [
                $shipping_week, $status_cust, $inspect_type, $inspect_res, $fnDate($snc_load_raw), 
                $fnDate($etd_raw), $dc, $sku, $booking, $invoice, $desc, $qty, $ctn_size, 
                $container, $seal, $tare, $nw, $gw, $cbm, $feeder, $mother, $snc_ci, 
                $fnDate($si_cut_raw), $fnDate($pickup_raw), $fnDate($return_raw), $remark, 
                $fnDate($cutoff_date_raw), $cutoff_time
            ];

            if ($row) {
                // UPDATE
                $sql = "UPDATE $table SET 
                        shipping_week=?, shipping_customer_status=?, inspect_type=?, inspection_result=?, snc_load_day=?, 
                        etd=?, dc_location=?, sku=?, booking_no=?, invoice_no=?, description=?, quantity=?, ctn_size=?, 
                        container_no=?, seal_no=?, container_tare=?, net_weight=?, gross_weight=?, cbm=?, feeder_vessel=?, 
                        mother_vessel=?, snc_ci_no=?, si_vgm_cut_off=?, pickup_date=?, return_date=?, remark=?, 
                        cutoff_date=?, cutoff_time=?, updated_at=GETDATE()
                        WHERE id=?";
                $params[] = $row['id'];
                $pdo->prepare($sql)->execute($params);
                $updated++;
            } else {
                // INSERT
                $sql = "INSERT INTO $table (
                        po_number, shipping_week, shipping_customer_status, inspect_type, inspection_result, snc_load_day, 
                        etd, dc_location, sku, booking_no, invoice_no, description, quantity, ctn_size, 
                        container_no, seal_no, container_tare, net_weight, gross_weight, cbm, feeder_vessel, 
                        mother_vessel, snc_ci_no, si_vgm_cut_off, pickup_date, return_date, remark, 
                        cutoff_date, cutoff_time, created_at
                    ) VALUES (?, ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?, GETDATE())";
                array_unshift($params, $po); // แทรก PO ไว้หน้าสุด
                $pdo->prepare($sql)->execute($params);
                $success++;
            }
        }
        fclose($handle);
        echo json_encode(['success' => true, 'message' => "Import Completed: New $success, Updated $updated"]);
        exit;
    }

    // ===================================================================================
    // 4. EXPORT (ส่งออก CSV)
    // ===================================================================================
    if ($action === 'export') {
        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename=Shipping_Detail_Export.csv');
        $output = fopen('php://output', 'w');
        fprintf($output, chr(0xEF).chr(0xBB).chr(0xBF)); // BOM เพื่อให้อ่านไทยออก

        // Header Row 1 (ว่างไว้ หรือ Group Header ตามไฟล์ลูกค้า)
        fputcsv($output, array_fill(0, 31, '')); 
        
        // Header Row 2 (ชื่อคอลัมน์)
        fputcsv($output, [
            'Loading Status', 'Production Status', 'Shipping Week', 'status', 'inspect type', 
            'inspection result', 'SNC LOAD DAY', 'ETD', 'DC', 'SKU', 
            'PO', 'Booking No.', 'Invoice', 'Description', 'CTNS Qty (Pieces)', 
            'CTN Size', 'CONTAINER NO', 'SEAL NO.', 'CONTAINER TARE', 'N.W', 
            'G.W', 'CBM', 'Feeder Vessel', 'mother vessel', 'SNC-CI-NO.', 
            'SI/VGM CUT OFF', 'Pick up date', 'Return Date', 'REMARK', 'Cutt off Date', 'Cutt off time'
        ]);

        $sql = "SELECT * FROM $table ORDER BY id DESC";
        $stmt = $pdo->query($sql);
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $fn = function($d) { return $d ? date('d/m/Y', strtotime($d)) : ''; };
            fputcsv($output, [
                ($row['is_loading_done']==1?'DONE':'WAIT'), ($row['is_production_done']==1?'DONE':'WAIT'),
                $row['shipping_week'], $row['shipping_customer_status'], $row['inspect_type'],
                $row['inspection_result'], $fn($row['snc_load_day']), $fn($row['etd']), $row['dc_location'], $row['sku'],
                $row['po_number'], $row['booking_no'], $row['invoice_no'], $row['description'], $row['quantity'],
                $row['ctn_size'], $row['container_no'], $row['seal_no'], $row['container_tare'], $row['net_weight'],
                $row['gross_weight'], $row['cbm'], $row['feeder_vessel'], $row['mother_vessel'], $row['snc_ci_no'],
                $fn($row['si_vgm_cut_off']), $fn($row['pickup_date']), $fn($row['return_date']), $row['remark'], $fn($row['cutoff_date']), $row['cutoff_time']
            ]);
        }
        fclose($output);
        exit;
    }

} catch (Exception $e) {
    if($action !== 'export') {
        http_response_code(500);
        echo json_encode(['success'=>false, 'message'=>$e->getMessage()]);
    }
}
?>