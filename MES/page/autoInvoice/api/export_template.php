<?php
// MES/page/autoInvoice/api/export_template.php

// ล้าง Buffer ป้องกันไฟล์ Excel พัง
while (ob_get_level() > 0) {
    ob_end_clean();
}

// 1. Auth Check (PBAC)
require_once __DIR__ . '/../../../config/config.php';
require_once __DIR__ . '/../../../auth/check_auth.php';

if (!isset($_SESSION['user']) || !hasPermission('manage_invoice')) {
    http_response_code(403);
    die("Access Denied: You do not have permission to download this template.");
}

$lib_path = __DIR__ . "/../../../utils/libs/xlsxwriter.class.php";
if (!file_exists($lib_path)) {
    die("Error: ไม่พบไลบรารีที่ Path: " . realpath($lib_path));
}
require_once($lib_path);

$filename = "Invoice_Upload_Template.xlsx";
header('Content-disposition: attachment; filename="'.XLSXWriter::sanitize_filename($filename).'"');
header("Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
header('Content-Transfer-Encoding: binary');
header('Cache-Control: must-revalidate');
header('Pragma: public');

$writer = new XLSXWriter();

// 1. กำหนดหัวคอลัมน์ (📌 เพิ่ม Team เข้ามาหลัง Booking_No)
$header_types = [
    'Invoice_No' => 'string', 'Booking_No' => 'string', 'Team' => 'string', 'Invoice_Date' => 'string', 'Customer_Name' => 'string',
    'Customer_Address' => 'string', 'Consignee' => 'string', 'Notify_Party' => 'string',
    'Incoterms' => 'string', 'Payment' => 'string', 'Port_of_Loading' => 'string', 'Port_of_Discharge' => 'string',
    'Feeder_Vessel' => 'string', 'Mother_Vessel' => 'string', 'Container_No' => 'string',
    'Seal' => 'string', 'ETD' => 'string', 'ETA' => 'string', 'Container_Qty' => 'string', 'SKU' => 'string', 
    'Product_Type (Auto)' => 'string', 'Description (Auto)' => 'string', 
    'Carton_No' => 'string', 
    'Quantity (Auto)' => 'string', 'Unit_Price (Auto)' => 'string', 
    'N.W (Auto)' => 'string', 'G.W (Auto)' => 'string', 'CBM (Auto)' => 'string', 
    'Purchase_Order' => 'string', 'Shipping Marks' => 'string'
];

// ปรับความกว้างให้ตรงกับจำนวนคอลัมน์ (📌 เพิ่ม 15 สำหรับช่อง Team)
$widths = [15, 20, 15, 15, 30, 40, 20, 20, 25, 15, 25, 20, 20, 20, 15, 15, 15, 15, 15, 15, 20, 35, 15, 15, 15, 15, 15, 15, 20, 20];

// 2. ตั้งค่า Sheet
$sheet_options = [
    'widths' => $widths,
    'suppress_row' => true 
];

$writer->writeSheetHeader('Template', $header_types, $sheet_options);

// 3. สร้าง Style แยกสำหรับ Header และ ช่องข้อมูล
$header_row = array_keys($header_types);
$header_styles = [];
$data_styles = [];

foreach ($header_row as $colName) {
    if (strpos($colName, '(Auto)') !== false) {
        $header_styles[] = [
            'font' => 'Arial', 'font-size' => 11, 'font-style' => 'bold', 
            'fill' => '#ED7D31', 'color' => '#FFFFFF', 'halign' => 'center'
        ];
        $data_styles[] = [
            'fill' => '#FFF2CC', 'halign' => 'center', 'color' => '#555555',
            'border' => 'left,right,top,bottom', 'border-style' => 'thin'
        ];
    } else {
        $header_styles[] = [
            'font' => 'Arial', 'font-size' => 11, 'font-style' => 'bold', 
            'fill' => '#002060', 'color' => '#FFFFFF', 'halign' => 'center'
        ];
        $data_styles[] = [
            'halign' => 'center'
        ];
    }
}

// 4. วาดแถว Header 
$writer->writeSheetRow('Template', $header_row, $header_styles);

// 5. ข้อมูลตัวอย่าง (Dummy Data) - 📌 เพิ่ม 'Team 1' 
$row = [
    'SNC-GP26-0001', 'BKG-12345678', 'Team 1', '20/02/2026', 'DUMMY CUSTOMER CO., LTD', '123 DUMMY STREET, CITY, COUNTRY', 'SAME AS CONSIGNEE',
    'SAME AS CONSIGNEE', 'FOB LAEM CHABANG,THAILAND', 'O/A 30 DAYS AFTER B/L DATE.', 'LAEM CHABANG, THAILAND', 'YOKOHAMA, JAPAN', 'DUMMY VESSEL V.123',
    'MOTHER VESSEL V.456', 'TLLU1234567', 'SEAL123', '25/02/2026', '05/03/2026', '1x20FT', '70344', 
    '', '', '1-10', '', '', '', '', '', 'PO-2026-001', 'N/M'
];

// 6. วาดบรรทัดข้อมูล
$writer->writeSheetRow('Template', $row, $data_styles);

$writer->writeToStdOut();
exit(0);
?>