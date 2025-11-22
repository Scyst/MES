<?php
// print_job_order.php

// 1. เรียกใช้ Database (ถอย 1 ชั้นจาก Stop_Cause ไปหา page)
require_once __DIR__ . '/../db.php'; 

// 2. เรียกใช้ Config (ถอย 2 ชั้น: Stop_Cause -> page -> MES)
require_once __DIR__ . '/../../config/config.php';

// 3. เรียกใช้ TCPDF (ถอย 2 ชั้น)
require_once __DIR__ . '/../../utils/libs/tcpdf/tcpdf.php'; 

// --- ตรวจสอบ ID ---
if (!isset($_GET['id'])) { die("Error: Missing Job ID"); }
$id = intval($_GET['id']);

// --- ดึงข้อมูลใบงาน ---
$sql = "SELECT * FROM " . MAINTENANCE_REQUESTS_TABLE . " WHERE id = ?";
$stmt = $pdo->prepare($sql);
$stmt->execute([$id]);
$job = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$job) { die("Error: Job not found"); }

// --- [FIX] แก้ไข Path รูปภาพให้ถูกต้อง ---
// ไฟล์ php อยู่ที่: MES/page/Stop_Cause/print_job_order.php
// รูปอยู่ที่: MES/page/uploads/maintenance/
// ดังนั้นต้องถอย 1 ชั้น (..) เพื่อไปที่ page ก่อน แล้วค่อยเข้า uploads
$baseUploadDir = __DIR__ . '/../uploads/maintenance/'; 

function getImagePath($dbPath, $baseDir) {
    if (empty($dbPath)) return '';
    $filename = basename($dbPath);
    $fullPath = $baseDir . $filename;
    
    // เช็คว่ามีไฟล์จริงไหม
    if (file_exists($fullPath)) {
        return $fullPath;
    }
    return '';
}

$photoBefore = getImagePath($job['photo_before_path'], $baseUploadDir);
$photoAfter = getImagePath($job['photo_after_path'], $baseUploadDir);

// --- ฟังก์ชันจัดรูปแบบวันที่ ---
function formatDateTH($date) {
    if (!$date) return "";
    return date('d/m/Y', strtotime($date));
}
function formatTime($date) {
    if (!$date) return "";
    return date('H:i', strtotime($date));
}

// ==========================================
// สร้าง PDF ด้วย TCPDF
// ==========================================

class MYPDF extends TCPDF {
    // Footer: ใส่เลขกำกับเอกสารด้านล่างขวา
    public function Footer() {
        $this->SetY(-15); // ห่างจากขอบล่าง 15mm
        $this->SetFont('freeserif', '', 8);
        // พิมพ์เลขเอกสารทางขวา
        $this->Cell(0, 10, 'FM-MTD-013/R00:15/11/17', 0, false, 'R', 0, '', 0, false, 'T', 'M');
    }
}

// สร้างเอกสาร A4 แนวตั้ง
$pdf = new MYPDF(PDF_PAGE_ORIENTATION, PDF_UNIT, PDF_PAGE_FORMAT, true, 'UTF-8', false);

// ตั้งค่า Meta Data
$pdf->SetCreator('MES System');
$pdf->SetTitle('Job Order #' . $job['id']);

// ตั้งค่าขอบกระดาษ (ซ้าย, บน, ขวา)
$pdf->SetMargins(15, 15, 15);
$pdf->SetHeaderMargin(0);
$pdf->SetFooterMargin(15);
$pdf->SetAutoPageBreak(TRUE, 20);

// ตั้งค่าฟอนต์ภาษาไทย
$pdf->SetFont('freeserif', '', 11); // ปรับขนาดฟอนต์ให้อ่านง่ายขึ้น

$pdf->AddPage();

// --- HTML CSS Styling (จัดรูปแบบให้สวยงาม) ---
$html = '
<style>
    table { width: 100%; border-collapse: collapse; border-spacing: 0; }
    th { 
        border: 1px solid #333; 
        background-color: #e0e0e0; 
        font-weight: bold; 
        text-align: center; 
        padding: 5px;
        font-size: 12px;
    }
    td { 
        border: 1px solid #333; 
        padding: 6px; 
        vertical-align: top;
        font-size: 12px;
    }
    .header-title { font-size: 22px; font-weight: bold; text-align: center; line-height: 1.2; }
    .sub-title { text-align: right; font-size: 14px; margin-bottom: 10px; }
    .section-header { background-color: #f9f9f9; font-weight: bold; font-size: 13px; }
    .no-border { border: none; }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .text-bold { font-weight: bold; }
</style>

<div class="header-title">ใบแจ้งงานซ่อมบำรุง</div>
<div class="header-title" style="font-size: 16px;">(MAINTENANCE JOB ORDER)</div>
<br>

<div class="sub-title">Job Order ID: <b>' . str_pad($job['id'], 6, '0', STR_PAD_LEFT) . '</b></div>

<div style="font-weight: bold; font-size: 14px; margin-bottom: 5px;">1. ข้อมูลผู้แจ้งซ่อม</div>
<table cellpadding="5">
    <thead>
        <tr>
            <th width="20%">วันที่แจ้งซ่อม</th>
            <th width="15%">เวลา</th>
            <th width="25%">ชื่อผู้แจ้งซ่อม</th>
            <th width="20%">แผนก/ไลน์</th>
            <th width="20%">เครื่องจักร/อุปกรณ์</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td align="center">' . formatDateTH($job['request_date']) . '</td>
            <td align="center">' . formatTime($job['request_date']) . '</td>
            <td>' . htmlspecialchars($job['request_by']) . '</td>
            <td align="center">' . htmlspecialchars($job['line']) . '</td>
            <td>' . htmlspecialchars($job['machine']) . '</td>
        </tr>
    </tbody>
</table>
<br>

<div style="font-weight: bold; font-size: 14px; margin-bottom: 5px;">2. รายละเอียดงานซ่อม</div>
<table cellpadding="5">
    <thead>
        <tr>
            <th width="40%">อาการเสีย (Issue)</th>
            <th width="60%">รายละเอียดการซ่อม (Work Detail)</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td height="80">' . nl2br(htmlspecialchars($job['issue_description'])) . '</td>
            <td>' . nl2br(htmlspecialchars($job['technician_note'] ?? '-')) . '</td>
        </tr>
    </tbody>
</table>
<br>

<div style="font-weight: bold; font-size: 14px; margin-bottom: 5px;">3. การใช้อะไหล่และเวลาปฏิบัติงาน</div>
<table cellpadding="5">
    <tr>
        <td colspan="4" style="background-color: #f9f9f9;">
            <b>รายการชิ้นส่วน/อุปกรณ์ (Replaced Part/Equipment):</b><br>
            ' . nl2br(htmlspecialchars($job['spare_parts_list'] ?? '-')) . '
        </td>
    </tr>
    <tr>
        <th width="25%">วันที่เริ่มแก้ไข</th>
        <th width="25%">เวลาเริ่ม</th>
        <th width="25%">วันที่เสร็จ</th>
        <th width="25%">เวลาเสร็จ</th>
    </tr>
    <tr>
        <td align="center">' . formatDateTH($job['started_at']) . '</td>
        <td align="center">' . formatTime($job['started_at']) . '</td>
        <td align="center">' . formatDateTH($job['resolved_at']) . '</td>
        <td align="center">' . formatTime($job['resolved_at']) . '</td>
    </tr>
</table>
<br>

<div style="font-weight: bold; font-size: 14px; margin-bottom: 5px;">4. รูปภาพประกอบ (Images)</div>
<table border="1" cellpadding="5" cellspacing="0">
    <tr>
        <td width="50%" align="center" height="180" style="vertical-align: middle;">
            <div style="font-weight:bold; margin-bottom:5px;">รูปก่อนแก้ไข (Before)</div>';
            
if ($photoBefore) {
    $html .= '<img src="' . $photoBefore . '" width="180" height="130" style="object-fit:contain;">';
} else {
    $html .= '<div style="color:#aaa;">No Image</div>';
}

$html .= '
        </td>
        <td width="50%" align="center" height="180" style="vertical-align: middle;">
            <div style="font-weight:bold; margin-bottom:5px;">รูปหลังแก้ไข (After)</div>';
            
if ($photoAfter) {
    $html .= '<img src="' . $photoAfter . '" width="180" height="130" style="object-fit:contain;">';
} else {
    $html .= '<div style="color:#aaa;">No Image</div>';
}

$html .= '
        </td>
    </tr>
</table>
<br><br>

<table border="0" cellpadding="0" cellspacing="0">
    <tr>
        <td width="10%" style="border:none;"></td>
        <td width="35%" align="center" style="border:none;">
            ผู้แจ้งซ่อม<br><br><br>
            .........................................<br>
            (' . htmlspecialchars($job['request_by']) . ')<br>
            วันที่ ........./........./.........
        </td>
        <td width="10%" style="border:none;"></td>
        <td width="35%" align="center" style="border:none;">
            ผู้ซ่อม/ผู้รับผิดชอบ<br><br><br>
            .........................................<br>
            (' . htmlspecialchars($job['resolved_by'] ?? '....................') . ')<br>
            วันที่ ........./........./.........
        </td>
        <td width="10%" style="border:none;"></td>
    </tr>
</table>
';

// เขียน HTML ลง PDF
$pdf->writeHTML($html, true, false, true, false, '');

// Output PDF
$pdf->Output('JobOrder_' . $job['id'] . '.pdf', 'I');
?>