<?php
// print_job_order.php

require_once __DIR__ . '/../db.php'; 
require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../utils/libs/tcpdf/tcpdf.php'; 

// --- ตรวจสอบ ID ---
if (!isset($_GET['id'])) { die("Error: Missing Job ID"); }
$id = intval($_GET['id']);

// --- ดึงข้อมูล ---
$sql = "SELECT * FROM " . MAINTENANCE_REQUESTS_TABLE . " WHERE id = ?";
$stmt = $pdo->prepare($sql);
$stmt->execute([$id]);
$job = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$job) { die("Error: Job not found"); }

// --- สร้าง Job Code ---
$thaiYear = date('y', strtotime($job['request_date'])) + 43;
$month = date('m', strtotime($job['request_date']));
$jobOrderCode = 'MNT-' . $thaiYear . $month . '-' . str_pad($job['id'], 4, '0', STR_PAD_LEFT);

// --- จัดการ Path รูปภาพ ---
$baseUploadDir = __DIR__ . '/../uploads/maintenance/'; 

function getImagePath($dbPath, $baseDir) {
    if (empty($dbPath)) return '';
    $filename = basename($dbPath);
    $fullPath = $baseDir . $filename;
    if (file_exists($fullPath)) {
        $cleanPath = realpath($fullPath);
        return str_replace('\\', '/', $cleanPath);
    }
    return '';
}

$photoBefore = getImagePath($job['photo_before_path'], $baseUploadDir);
$photoAfter = getImagePath($job['photo_after_path'], $baseUploadDir);

// --- ฟังก์ชันวันที่ ---
function formatDateTH($date) {
    if (!$date) return "";
    return date('d/m/Y', strtotime($date));
}
function formatTime($date) {
    if (!$date) return "";
    return date('H:i', strtotime($date));
}

// ==========================================
// ส่วนสร้าง PDF
// ==========================================

class MYPDF extends TCPDF {
    public function Footer() {
        $this->SetY(-15);
        $this->SetFont('freeserif', '', 8);
        $this->Cell(0, 10, 'FM-MTD-013/R00:15/11/17', 0, false, 'R', 0, '', 0, false, 'T', 'M');
    }
}

$pdf = new MYPDF(PDF_PAGE_ORIENTATION, PDF_UNIT, PDF_PAGE_FORMAT, true, 'UTF-8', false);

$pdf->setPrintHeader(false);
$pdf->SetCreator('MES System');
$pdf->SetTitle('Job Order ' . $jobOrderCode);

$pdf->SetMargins(10, 10, 10); 
$pdf->SetFooterMargin(15);
$pdf->SetAutoPageBreak(TRUE, 10);
$pdf->SetFont('freeserif', '', 11);

$pdf->setCellPaddings(0, 0, 0, 0); 
$pdf->setCellHeightRatio(1.15); 

$pdf->AddPage();

// --- HTML Styling & Section 1 & Section 2 ---
// จุดแก้ที่ 1: เริ่มต้น $html ด้วยการเปิด String
$html = '
<style>
    table { 
        width: 100%; 
        border-collapse: collapse; 
    }
    .table-header-title {
        font-weight: bold;
        font-size: 12px;
        border: none; 
        padding-bottom: 2px;
        padding-top: 5px;
    }
    th { 
        border: 1px solid #333; 
        background-color: #f2f2f2; 
        font-weight: bold; 
        text-align: center; 
        font-size: 12px;
    }
    td { 
        border: 1px solid #333; 
        vertical-align: top;
        font-size: 12px;
    }
    .no-border-cell { border: none !important; }
    
    .title-box { font-weight: bold; font-size: 16px; border: none;}
    .code-box { font-weight: bold; font-size: 14px; text-align: right; border: none;}
</style>

<table border="0" cellpadding="2">
    <tr>
        <td width="60%" class="title-box">MAINTENANCE JOB ORDER (ใบแจ้งซ่อม)</td>
        <td width="40%" class="code-box">Job No: ' . $jobOrderCode . '</td>
    </tr>
</table>
<div style="border-bottom: 2px solid #000;"></div>

<table border="0" cellpadding="0" cellspacing="0" style="line-height:0">
    <tr><td height="10" style="border:none;">&nbsp;</td></tr>
</table>

<table cellpadding="4" cellspacing="0">
    <thead>
        <tr>
            <td colspan="5" class="table-header-title">1. ข้อมูลผู้แจ้งซ่อม</td>
        </tr>
        <tr>
            <th width="15%">วันที่แจ้ง</th>
            <th width="15%">เวลา</th>
            <th width="25%">ชื่อผู้แจ้ง</th>
            <th width="20%">แผนก/ไลน์</th>
            <th width="25%">เครื่องจักร</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td width="15%" align="center">' . formatDateTH($job['request_date']) . '</td>
            <td width="15%" align="center">' . formatTime($job['request_date']) . '</td>
            <td width="25%" align="center">' . htmlspecialchars($job['request_by']) . '</td>
            <td width="20%" align="center">' . htmlspecialchars($job['line']) . '</td>
            <td width="25%" align="center">' . htmlspecialchars($job['machine']) . '</td>
        </tr>
    </tbody>
</table>

<table border="0" cellpadding="0" cellspacing="0" style="line-height:0">
    <tr><td height="15" style="border:none;">&nbsp;</td></tr>
</table>

<table cellpadding="4" cellspacing="0">
    <thead>
        <tr>
             <td colspan="2" class="table-header-title">2. รายละเอียดการซ่อม</td>
        </tr>
        <tr>
            <th width="40%">อาการเสีย (Issue)</th>
            <th width="60%">รายละเอียดการแก้ไข (Work Detail)</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td width="40%" height="60">' . nl2br(htmlspecialchars($job['issue_description'])) . '</td>
            <td width="60%">' . nl2br(htmlspecialchars($job['technician_note'] ?? '-')) . '</td>
        </tr>
    </tbody>
</table>'; // <--- จุดแก้สำคัญ 1: ปิด String ตรงนี้ก่อนเริ่มท่อนใหม่

// --- Section 3 ---
$html .= '
<table border="0" cellpadding="0" cellspacing="0" style="line-height:0">
    <tr><td height="15" style="border:none;">&nbsp;</td></tr>
</table>

<table cellpadding="4" cellspacing="0">
    <thead>
        <tr>
             <td colspan="4" class="table-header-title">3. การใช้อะไหล่และเวลาปฏิบัติงาน</td>
        </tr>
    </thead>
    <tbody>
        <tr>
            <th width="25%">วันที่เริ่ม</th>
            <th width="25%">เวลาเริ่ม</th>
            <th width="25%">วันที่เสร็จ</th>
            <th width="25%">เวลาเสร็จ</th>
        </tr>
        <tr>
            <td width="25%" align="center">' . formatDateTH($job['started_at']) . '</td>
            <td width="25%" align="center">' . formatTime($job['started_at']) . '</td>
            <td width="25%" align="center">' . formatDateTH($job['resolved_at']) . '</td>
            <td width="25%" align="center">' . formatTime($job['resolved_at']) . '</td>
        </tr>
        
        <tr>
            <td colspan="4" style="background-color: #fff; border-bottom: 1px solid #333; border-top: 1px solid #333;">
                <b>รายการอะไหล่ที่ใช้ (Spare Parts):</b>
            </td>
        </tr>'; 

$parts = preg_split('/[\r\n]+/', $job['spare_parts_list'] ?? '');
$hasParts = false;

foreach ($parts as $part) {
    $part = trim($part);
    if (!empty($part)) {
        $hasParts = true;
        $part = ltrim($part, '.-• '); 
        
        $html .= '<tr>
                    <td colspan="4" style="border: 1px solid #333;"> - ' . htmlspecialchars($part) . '</td>
                  </tr>';
    }
}

if (!$hasParts) {
    $html .= '<tr><td colspan="4">-</td></tr>';
}

$html .= '
    </tbody>
</table>

<table border="0" cellpadding="0" cellspacing="0" style="line-height:0">
    <tr><td height="15" style="border:none;">&nbsp;</td></tr>
</table>'; 

$html .= '
<table cellpadding="2" cellspacing="0">
    <tr>
         <td colspan="2" class="table-header-title">4. รูปภาพประกอบ (Images)</td>
    </tr>
</table>
<table border="1" cellpadding="2" cellspacing="0">
    <tr>
        <td width="50%" align="center" valign="top" height="240">
            <div style="font-size: 10px; font-weight:bold; margin-bottom:5px; margin-top:5px;">BEFORE</div>';
            
if ($photoBefore) {
    $html .= '<br><img src="' . $photoBefore . '" width="200" height="200" border="0">';
} else {
    $html .= '<br><br><span style="color:#ccc;">- No Image -</span>';
}

$html .= '
        </td>
        <td width="50%" align="center" valign="top" height="240">
            <div style="font-size: 10px; font-weight:bold; margin-bottom:5px; margin-top:5px;">AFTER</div>';
            
if ($photoAfter) {
    $html .= '<br><img src="' . $photoAfter . '" width="200" height="200" border="0">';
} else {
    $html .= '<br><br><span style="color:#ccc;">- No Image -</span>';
}

$html .= '
        </td>
    </tr>
</table>

<br><br>

<table border="0" cellpadding="0" cellspacing="0">
    <tr>
        <td width="10%" class="no-border-cell"></td>
        <td width="35%" align="center" class="no-border-cell">
            ผู้แจ้งซ่อม<br><br><br>
            .........................................<br>
            (' . htmlspecialchars($job['request_by']) . ')<br>
            วันที่ ........./........./.........
        </td>
        <td width="10%" class="no-border-cell"></td>
        <td width="35%" align="center" class="no-border-cell">
            ผู้ซ่อม/ผู้รับผิดชอบ<br><br><br>
            .........................................<br>
            (' . htmlspecialchars($job['resolved_by'] ?? '....................') . ')<br>
            วันที่ ........./........./.........
        </td>
        <td width="10%" class="no-border-cell"></td>
    </tr>
</table>
';

$pdf->writeHTML($html, true, false, true, false, '');
$pdf->Output('JobOrder_' . $jobOrderCode . '.pdf', 'I');
?>