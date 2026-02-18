<?php
// MES/page/autoInvoice/api/export_template.php

// ป้องกันไฟล์ Excel พังจาก White space หรือ Warning ที่อาจแอบ echo ออกมาก่อนหน้า
if (ob_get_length()) {
    ob_end_clean();
}

// 1. ดึงไลบรารีไฟล์เดียวจบของเราเข้ามา
require_once("xlsxwriter.class.php");

// 2. ตั้งชื่อไฟล์ที่ต้องการให้ดาวน์โหลด
$filename = "Invoice_Upload_Template.xlsx";

// 3. ตั้งค่า Header ให้บราวเซอร์รู้ว่านี่คือไฟล์ Excel แท้ (.xlsx)
header('Content-disposition: attachment; filename="'.XLSXWriter::sanitize_filename($filename).'"');
header("Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
header('Content-Transfer-Encoding: binary');
header('Cache-Control: must-revalidate');
header('Pragma: public');

// 4. เริ่มสร้างไฟล์ Excel
$writer = new XLSXWriter();

// 5. กำหนดหัวคอลัมน์ ชนิดข้อมูล และ "ความกว้าง" ของแต่ละช่อง
$header_types = [
    'Invoice_No' => 'string',       // ความกว้าง 15
    'Invoice_Date' => 'string',     // ความกว้าง 15
    'Customer_Name' => 'string',    // ความกว้าง 30
    'Customer_Address' => 'string', // ความกว้าง 40
    'Consignee' => 'string',        // ความกว้าง 20
    'Notify_Party' => 'string',     // ความกว้าง 20
    'PO_Number' => 'string',        // ความกว้าง 15
    'Incoterms' => 'string',        // ความกว้าง 15
    'Payment_Terms' => 'string',    // ความกว้าง 20
    'Port_of_Loading' => 'string',  // ความกว้าง 20
    'Port_of_Discharge' => 'string',// ความกว้าง 20
    'ETD_Date' => 'string',         // ความกว้าง 15
    'ETA_Date' => 'string',         // ความกว้าง 15
    'Feeder_Vessel' => 'string',    // ความกว้าง 25
    'Mother_Vessel' => 'string',    // ความกว้าง 20
    'Container_Qty' => 'string',    // ความกว้าง 15
    'Container_No' => 'string',     // ความกว้าง 20
    'Seal_No' => 'string',          // ความกว้าง 15
    'Shipping_Marks' => 'string',   // ความกว้าง 20
    'Carton_No' => 'string',        // ความกว้าง 15
    'Product_Type' => 'string',     // ความกว้าง 20
    'SKU' => 'string',              // ความกว้าง 20
    'Description' => 'string',      // ความกว้าง 35
    'Qty_Carton' => 'number',       // ความกว้าง 15
    'Unit_Price_USD' => 'price',    // ความกว้าง 15
    'Net_Weight_KG' => 'price',     // ความกว้าง 15
    'Gross_Weight_KG' => 'price',   // ความกว้าง 15
    'CBM' => 'price'                // ความกว้าง 15
];

// 6. กำหนดดีไซน์ (สีพื้นหลัง สีตัวอักษร จัดกึ่งกลาง)
$header_styles = [
    'font' => 'Arial',
    'font-size' => 11,
    'font-style' => 'bold',
    'fill' => '#002060', // พื้นหลังสีน้ำเงินบริษัท
    'color' => '#FFFFFF',// ตัวอักษรสีขาว
    'halign' => 'center',// จัดกึ่งกลาง
    'widths' => [15, 15, 30, 40, 20, 20, 15, 15, 20, 20, 20, 15, 15, 25, 20, 15, 20, 15, 20, 15, 20, 20, 35, 15, 15, 15, 15, 15]
];

// 7. เขียนหัวตารางลง Sheet1
$writer->writeSheetHeader('Template', $header_types, $header_styles);

// 8. ข้อมูลตัวอย่าง (Dummy Data) แถวที่ 2
$row = [
    'SNC-GP26-0146', '2026-02-18', 'WATER WOOD PTE.LTD', '9 RAFFLES PLACE #26-01 PEPUBLIC PLAZA 048619 SINGAPORE (SG) PAYA LEDAR SQUARE 048619 TEL:86 15894290371 (Head office)', 
    'HARBOR FREIGHT TOOLS 23400 CACTUS AVE MORENO VALLEY,CA 92553', ' HARBOR FREIGHT TOOLS  26677 AGOURA RD,CALABASAS, CA 91302, PHONE: (818) 836-5000. FAX: (805) 445-4943', ' 38001-7407636', 'FOB LAEM CHABANG,THAILAND ', 'O/A 30 DAYS AFTER B/L DATE', 
    'LAEM CHABANG', 'LOS ANGELES', '2026-02-22', '2026-04-27', 'EVER BLISS 0835-108N', 
    '-', '1X40HQ', '-', '-', '-', '1-50', 
    'TOOL CABINET',
    '58712', 'S3 56IN TOP CHEST, RED', 81, 220.06, 9963, 11421, 61.51
];

// เขียนข้อมูลลงไป
$writer->writeSheetRow('Template', $row);

// 9. พ่นไฟล์ออกให้ดาวน์โหลด
$writer->writeToStdOut();
exit(0);
?>