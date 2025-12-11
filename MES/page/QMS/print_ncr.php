<?php
// page/QMS/print_ncr.php
require_once('../../utils/libs/tcpdf/tcpdf.php');
require_once('../../config/config.php');
require_once('../db.php');

$is_blank = (isset($_GET['mode']) && $_GET['mode'] === 'blank');
$case_id = $_GET['id'] ?? 0;

$data = [];
$images = [];

if ($is_blank) {
    // --- Blank Mode ---
    $data = [
        'car_no' => '....................',
        'found_date' => null,
        'customer_name' => '', 'product_name' => '',
        'defect_type' => '', 'defect_qty' => 0, 'defect_description' => '',
        'production_date' => '', 'found_shift' => '', 'lot_no' => '',
        'product_model' => '', 'production_line' => '',
        'issuer_name' => '.........................................'
    ];
} else {
    // --- Normal Mode ---
    if (!$case_id) die('Error: Missing Case ID');
    
    $sql = "SELECT c.car_no, c.customer_name, c.product_name, c.case_date,
                   n.*,
                   u.username as issuer_name
            FROM " . QMS_CASES_TABLE . " c
            JOIN " . QMS_NCR_TABLE . " n ON c.case_id = n.case_id
            LEFT JOIN " . USERS_TABLE . " u ON c.created_by = u.id
            WHERE c.case_id = ?";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$case_id]);
    $data = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$data) die('NCR Data not found');

    // รูปภาพ NCR (TOP 3)
    $sqlImg = "SELECT TOP 3 file_path FROM " . QMS_FILE_TABLE . " WHERE case_id = ? AND doc_stage = 'NCR' ORDER BY uploaded_at ASC";
    $stmtImg = $pdo->prepare($sqlImg);
    $stmtImg->execute([$case_id]);
    $images = $stmtImg->fetchAll(PDO::FETCH_ASSOC);
}

// Display Variables
$show_date = $is_blank ? '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;/&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;/&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;' : date('d/m/Y H:i', strtotime($data['found_date']));
$show_qty  = $is_blank ? '' : number_format($data['defect_qty']);
$show_car_no = $data['car_no'];

// Init PDF
$pdf = new TCPDF(PDF_PAGE_ORIENTATION, PDF_UNIT, PDF_PAGE_FORMAT, true, 'UTF-8', false);
$pdf->setPrintHeader(false);
$pdf->setPrintFooter(false);
$pdf->SetMargins(10, 8, 10);
$pdf->SetAutoPageBreak(TRUE, 5);
$pdf->AddPage();
$pdf->SetFont('freeserif', '', 9);

// ==========================================
// 1. HEADER
// ==========================================
$html = '
<table border="1" cellpadding="5" cellspacing="0">
    <tr>
        <td width="30%" align="center" valign="middle">
            <b style="font-family:helvetica; font-size:22pt; color:red;">SCAN</b><br>
            <span style="font-size:8pt;">SNC CREATIVITY ANTHOLOGY CO.,LTD.</span>
        </td>
        <td width="40%" align="center" valign="middle">
            <b style="font-size:20pt;">NCR</b>
            <br style="font-size:20pt; line-height:20px;">
            <span style="font-size:10pt;">NON-CONFORMANCE REPORT</span>
        </td>
        <td width="30%" style="font-size:9pt;" valign="middle">
            <table border="0" cellpadding="2">
                <tr>
                    <td width="30%" align="left"><b>Ref No.:</b></td>
                    <td width="70%" align="left">' . $show_car_no . '</td>
                </tr>
                <tr>
                    <td align="left"><b>Date:</b></td>
                    <td align="left">' . $show_date . '</td>
                </tr>
                <tr>
                    <td align="left"><b>Page:</b></td>
                    <td align="left">1 of 1</td>
                </tr>
            </table>
        </td>
    </tr>
</table>';

// ==========================================
// 2. PRODUCT INFO
// ==========================================
$html .= '
<table border="1" cellpadding="3" cellspacing="0" style="font-size:9pt;">
    <tr style="background-color:#eaeaea;">
        <td colspan="4"><b>1. Product Information (ข้อมูลผลิตภัณฑ์)</b></td>
    </tr>
    <tr>
        <td width="15%" bgcolor="#f2f2f2"><b>Customer:</b></td>
        <td width="35%">' . $data['customer_name'] . '</td>
        <td width="15%" bgcolor="#f2f2f2"><b>Line:</b></td>
        <td width="35%">' . ($data['production_line'] ?? '-') . '</td>
    </tr>
    <tr>
        <td bgcolor="#f2f2f2"><b>Product:</b></td>
        <td>' . $data['product_name'] . '</td>
        <td bgcolor="#f2f2f2"><b>Model:</b></td>
        <td>' . ($data['product_model'] ?? '-') . '</td>
    </tr>
</table>';

// ==========================================
// 3. DEFECT DETAILS (ใช้ Layout 50/50 แบบเดียวกับ CAR)
// [FIX] เอา colspan="2" ออกจาก Header เพื่อไม่ให้ Layout เพี้ยน
// ==========================================
$imgHtml = '&nbsp;';
if (!$is_blank && !empty($images)) {
    foreach ($images as $img) {
        $path = dirname(__DIR__) . '/' . str_replace('../', '', $img['file_path']);
        if (file_exists($path)) {
            $imgHtml .= '<img src="' . $path . '" height="95" border="1">&nbsp;&nbsp;'; 
        }
    }
}

$html .= '
<table border="1" cellpadding="3" cellspacing="0">
    <tr style="background-color:#eaeaea;">
        <td><b>2. Defect Description (รายละเอียดความผิดปกติ)</b></td>
    </tr>
    <tr>
        <td height="120">
            <table border="0" width="100%">
                <tr>
                    <td width="50%" valign="top">
                        <table border="0" width="100%">
                            <tr>
                                <td align="left" valign="top">' . nl2br($data['defect_description']) . '</td>
                            </tr>
                            <tr><td height="75"></td></tr> <tr>
                                <td align="left" valign="bottom">
                                    <b>Defect Type:</b> <span>' . $data['defect_type'] . '</span><br>
                                    <b>Quantity:</b> ' . $show_qty . ' PCS
                                </td>
                            </tr>
                        </table>
                    </td>
                    
                    <td width="50%" valign="top">
                        <table border="0" width="100%">
                            <tr><td height="10" style="font-size:10pt; line-height:10px;">&nbsp;</td></tr>
                            <tr><td align="center">' . $imgHtml . '</td></tr>
                        </table>
                    </td>
                </tr>
            </table>
        </td>
    </tr>
</table>';

// ==========================================
// 4. TRACEABILITY
// ==========================================
$html .= '
<table border="1" cellpadding="3" cellspacing="0">
    <tr style="background-color:#eaeaea;">
        <td colspan="3"><b>3. Traceability (ข้อมูลการผลิต)</b></td>
    </tr>
    <tr>
        <td width="33%"><b>Prod Date:</b> ' . $data['production_date'] . '</td>
        <td width="33%"><b>Shift:</b> ' . $data['found_shift'] . '</td>
        <td width="34%"><b>Lot No:</b> ' . $data['lot_no'] . '</td>
    </tr>
</table>';

// ==========================================
// 5. DISPOSITION
// ==========================================
$html .= '
<table border="1" cellpadding="3" cellspacing="0">
    <tr style="background-color:#eaeaea;">
        <td><b>4. Preliminary Disposition (การจัดการเบื้องต้น)</b></td>
    </tr>
    <tr>
        <td height="60">
            [ &nbsp; ] Rework &nbsp;&nbsp;&nbsp; [ &nbsp; ] Scrap &nbsp;&nbsp;&nbsp; [ &nbsp; ] Sort &nbsp;&nbsp;&nbsp; [ &nbsp; ] Hold<br><br>
            <b>Remark:</b> ....................................................................................................
        </td>
    </tr>
</table>';

// ==========================================
// 6. SIGNATURES
// ==========================================
$html .= '
<br>
<table border="1" cellpadding="5" cellspacing="0" style="text-align:center;">
    <tr style="background-color:#eaeaea;">
        <td width="34%"><b>Issuer (Production)</b></td>
        <td width="33%"><b>Receiver (QC)</b></td>
        <td width="33%"><b>Approved By</b></td>
    </tr>
    <tr>
        <td height="60"><br><br><br><br>(' . $data['issuer_name'] . ')<br>Date: ' . $show_date . '</td>
        <td height="60"><br><br><br>.........................................<br>( QC Engineer )<br>Date: _____/_____/_____</td>
        <td height="60"><br><br><br>.........................................<br>( QC Supervisor )<br>Date: _____/_____/_____</td>
    </tr>
</table>
';

$pdf->writeHTML($html);
$pdf->Output('NCR_' . ($is_blank ? 'BLANK' : $data['car_no']) . '.pdf', 'I');
?>