<?php
// api_import_shipping.php
require_once 'config.php'; // ตรวจสอบว่าในนี้ connect SQL Server แล้ว ($conn)

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['status' => 'error', 'message' => 'Invalid Request']);
    exit;
}

if (!isset($_FILES['csv_file']) || $_FILES['csv_file']['error'] !== UPLOAD_ERR_OK) {
    echo json_encode(['status' => 'error', 'message' => 'Upload failed']);
    exit;
}

$file = $_FILES['csv_file']['tmp_name'];
$handle = fopen($file, "r");

$success_insert = 0;
$success_update = 0;

// อ่านทีละแถว
while (($data = fgetcsv($handle, 10000, ",")) !== FALSE) {
    // ** Mapping Column ตามไฟล์ Excel ลูกค้า ** // (กรุณาเช็ค Index อีกครั้งจากไฟล์จริง อันนี้ผม map ตามตัวอย่างที่คุณให้)
    // Col 2: Shipping Week, Col 10: PO
    
    $po_raw = isset($data[10]) ? trim($data[10]) : '';
    
    // ข้าม Header หรือแถวที่ไม่มี PO
    if (empty($po_raw) || $po_raw == 'PO' || $po_raw == 'ฟอร์มลูกค้า') continue;

    // เตรียมข้อมูล
    $shipping_week = $data[2]; 
    $customer_status = $data[3];
    $inspect_type = $data[4];
    $inspect_result = $data[5];
    $snc_load_day = !empty($data[6]) ? date('Y-m-d', strtotime($data[6])) : NULL;
    $etd = !empty($data[7]) ? date('Y-m-d', strtotime($data[7])) : NULL;
    $dc = $data[8];
    $sku = $data[9];
    $po_number = $po_raw; // KEY หลัก
    $booking_no = $data[11];
    $invoice_no = $data[12];
    $description = $data[13]; // ตรงกับ description เดิม
    $ctns_qty = (int)$data[14];
    $ctn_size = $data[15];
    $container_no = $data[16];
    $seal_no = $data[17];
    $net_weight = (float)$data[19];
    $gross_weight = (float)$data[20];
    $cbm = (float)$data[21];
    $feeder = $data[22];
    $mother = $data[23];
    
    // 1. ตรวจสอบว่ามี PO นี้หรือไม่ใน SALES_ORDERS
    $checkSQL = "SELECT id FROM SALES_ORDERS WHERE po_number = ?";
    $params = array($po_number);
    $stmt = sqlsrv_query($conn, $checkSQL, $params);
    
    if ($stmt === false) continue; // ข้ามถ้า Error

    if (sqlsrv_has_rows($stmt)) {
        // --- กรณีมีอยู่แล้ว: UPDATE ---
        $updateSQL = "UPDATE SALES_ORDERS SET 
            shipping_week = ?, shipping_customer_status = ?, inspect_type = ?, inspection_result = ?,
            snc_load_day = ?, etd = ?, dc_location = ?, sku = ?, booking_no = ?, invoice_no = ?,
            description = ?, ctns_qty = ?, ctn_size = ?, container_no = ?, seal_no = ?,
            net_weight = ?, gross_weight = ?, cbm = ?, feeder_vessel = ?, mother_vessel = ?,
            updated_at = GETDATE()
            WHERE po_number = ?";
            
        $updateParams = array(
            $shipping_week, $customer_status, $inspect_type, $inspect_result,
            $snc_load_day, $etd, $dc, $sku, $booking_no, $invoice_no,
            $description, $ctns_qty, $ctn_size, $container_no, $seal_no,
            $net_weight, $gross_weight, $cbm, $feeder, $mother,
            $po_number
        );
        
        $res = sqlsrv_query($conn, $updateSQL, $updateParams);
        if($res) $success_update++;
        
    } else {
        // --- กรณีไม่มี: INSERT (สร้าง Order ใหม่) ---
        // หมายเหตุ: is_production_done, is_loading_done จะเป็น 0 (False) ตาม Default DB
        $insertSQL = "INSERT INTO SALES_ORDERS 
            (po_number, shipping_week, shipping_customer_status, inspect_type, inspection_result,
             snc_load_day, etd, dc_location, sku, booking_no, invoice_no, description,
             ctns_qty, ctn_size, container_no, seal_no, net_weight, gross_weight, cbm,
             feeder_vessel, mother_vessel, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, GETDATE())";
            
        $insertParams = array(
            $po_number, $shipping_week, $customer_status, $inspect_type, $inspect_result,
            $snc_load_day, $etd, $dc, $sku, $booking_no, $invoice_no, $description,
            $ctns_qty, $ctn_size, $container_no, $seal_no, $net_weight, $gross_weight, $cbm,
            $feeder, $mother
        );
        
        $res = sqlsrv_query($conn, $insertSQL, $insertParams);
        if($res) $success_insert++;
    }
}

fclose($handle);

echo json_encode([
    'status' => 'success',
    'message' => "Import Completed: Created $success_insert, Updated $success_update"
]);
?>