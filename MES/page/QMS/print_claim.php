<?php
// page/QMS/print_claim.php
// Orientation: Landscape (L)
// Update: Header Vertical Alignment (Center Logo & Title)

// 1. เพิ่มการตรวจสอบสิทธิ์ (Security)
session_start();
if (!isset($_SESSION['user'])) {
    die('<div style="color:red; font-family:sans-serif; padding:20px;"><b>Error:</b> Unauthorized Access. Please login first.</div>');
}

require_once('../../utils/libs/tcpdf/tcpdf.php');
require_once('../../config/config.php');
require_once('../db.php');

$is_blank = (isset($_GET['mode']) && $_GET['mode'] === 'blank');
$case_id = $_GET['id'] ?? 0;

$data = [];

if ($is_blank) {
    // --- Blank Mode ---
    $data = [
        'car_no' => '....................',
        'closed_at' => null,
        'customer_name' => '............................................................', 
        'product_name' => '', 'product_model' => '',
        'defect_type' => '', 'defect_qty' => 0, 'defect_description' => '',
        'disposition' => '', 'cost_estimation' => 0,
        'approved_by_name' => '.........................................'
    ];
} else {
    // --- Normal Mode ---
    if (!$case_id) die('Error: Missing Case ID');

    // 2. ใช้ชื่อตารางจริงและใส่ WITH (NOLOCK)
    $sql = "SELECT c.car_no, c.customer_name, c.product_name,
                   n.defect_type, n.defect_qty, n.defect_description, n.product_model,
                   cl.disposition, cl.final_qty, cl.cost_estimation, cl.closed_at,
                   u.username as approved_by_name
            FROM QMS_CASES c WITH (NOLOCK)
            JOIN QMS_CLAIM cl WITH (NOLOCK) ON c.case_id = cl.case_id
            JOIN QMS_NCR n WITH (NOLOCK) ON c.case_id = n.case_id
            LEFT JOIN USERS u WITH (NOLOCK) ON cl.approved_by = u.id
            WHERE c.case_id = ?";
            
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$case_id]);
    $data = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$data) die('Error: Claim Data not found (Case might not be closed yet)');
}

// Display Variables
$show_date = $is_blank || empty($data['closed_at']) ? '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;/&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;/&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;' : date('d/m/Y', strtotime($data['closed_at']));
$show_car_no = $data['car_no'];
$show_claim_no = $is_blank ? '....................' : $data['car_no'] . '-CLM'; 

// Init PDF (Landscape)
$pdf = new TCPDF('L', PDF_UNIT, PDF_PAGE_FORMAT, true, 'UTF-8', false);
$pdf->setPrintHeader(false);
$pdf->setPrintFooter(false);
$pdf->SetMargins(10, 10, 10);
$pdf->SetAutoPageBreak(TRUE, 5);
$pdf->AddPage();
$pdf->SetFont('freeserif', '', 9);

// Helper Checkbox
function chkBox($val, $target) {
    if (empty($val) && empty($target)) return '[&nbsp;&nbsp;&nbsp;]';
    return ($val === $target) ? '[ X ]' : '[&nbsp;&nbsp;&nbsp;]';
}

// ==========================================
// 1. HEADER (3 Columns)
// ==========================================
$html = '
<table border="1" cellpadding="5" cellspacing="0">
    <tr>
        <td width="35%" align="left" valign="middle">
            <table border="0" cellpadding="0">
                <tr>
                    <td width="25%" align="left" valign="middle">
                        <br><br>
                        <b style="font-family:helvetica; font-size:18pt; color:red;">SCAN</b>
                    </td>
                    <td width="75%" style="font-size:8pt;" valign="middle">
                        <br style="font-size:5pt; line-height:5px;">
                        <b>SNC CREATIVITY ANTHOLOGY CO.,LTD.</b><br>
                        111/1 Moo 2, T.Makhamkoo, A.Nikompattana,<br>
                        Rayong 21180 Thailand<br>
                        Tel: (038)-026-750-8 Fax: (038)-026-759
                    </td>
                </tr>
            </table>
        </td>
        
        <td width="30%" align="center" valign="middle">
            <br style="font-size:25pt; line-height:25px;">
            <b style="font-size:16pt;">NOTICE OF CLAIM</b><br>
            <span style="font-size:12pt;">(ใบแจ้งเคลม)</span>
        </td>
        
        <td width="35%" style="font-size:9pt;" valign="middle">
            <table border="0" cellpadding="2">
                <tr>
                    <td width="25%" align="left"><b>Ref CAR No :</b></td>
                    <td width="75%" align="left">' . $show_car_no . '</td>
                </tr>
                <tr>
                    <td align="left"><b>Notice No :</b></td>
                    <td align="left">' . $show_claim_no . '</td>
                </tr>
                <tr>
                    <td align="left"><b>Date :</b></td>
                    <td align="left">' . $show_date . '</td>
                </tr>
            </table>
        </td>
    </tr>
</table>';

// ==========================================
// 2. SUPPLIER INFO
// ==========================================
$html .= '
<table border="0" cellpadding="5" cellspacing="0">
    <tr>
        <td width="10%"><b>Supplier Name :</b></td>
        <td width="90%" style="border-bottom:1px dotted #000;">' . $data['customer_name'] . '</td>
    </tr>
</table>
<br>';

// ==========================================
// 3. CLAIM ITEMS TABLE
// ==========================================
$html .= '
<table border="1" cellpadding="5" cellspacing="0">
    <tr style="background-color:#eaeaea; text-align:center; font-weight:bold;">
        <td width="5%">No.</td>
        <td width="15%">PART NUMBER</td>
        <td width="20%">PART NAME</td>
        <td width="15%">MODEL</td>
        <td width="10%">BATCH Q\'ty</td>
        <td width="35%">PROBLEM / DESCRIPTION</td>
    </tr>';

// ตัดทศนิยมส่วนเกินของ Defect Qty
$qty = $data['defect_qty'];
$format_qty = ($qty ? (floor($qty) == $qty ? number_format($qty) : rtrim(rtrim(number_format($qty, 4), '0'), '.')) : '-');

// Row 1: ข้อมูลจริง
$html .= '
    <tr style="text-align:center;">
        <td>1</td>
        <td>' . ($data['product_name'] ?: '-') . '</td>
        <td>' . ($data['product_name'] ?: '-') . '</td>
        <td>' . ($data['product_model'] ?: '-') . '</td>
        <td>' . $format_qty . '</td>
        <td align="left">' . nl2br($data['defect_description']) . '</td>
    </tr>';

// วนลูป 9 รอบ (รวมเป็น 10 บรรทัด)
for($i=2; $i<=10; $i++) {
    $html .= '
    <tr style="text-align:center; color:#ccc;">
        <td>' . $i . '</td>
        <td></td><td></td><td></td><td></td><td></td>
    </tr>';
}

$html .= '</table>';

// ==========================================
// 4. CLAIM COMPENSATION
// ==========================================
$chk_replace = chkBox('', '');
$chk_money = chkBox('', '');

if (!$is_blank) {
    if ($data['cost_estimation'] > 0) $chk_money = chkBox('1', '1');
    else $chk_replace = chkBox('1', '1');
}

$html .= '
<br>
<table border="1" cellpadding="5" cellspacing="0">
    <tr style="background-color:#eaeaea;">
        <td><b>Compensation Method (การชดเชยค่าเสียหาย)</b></td>
    </tr>
    <tr>
        <td height="40">
            ' . $chk_replace . ' <b>Product Claim (เคลมเป็นสินค้า / Replacement Part)</b>
            <br>
            ' . $chk_money . ' <b>Money Claim (เคลมเป็นเงิน / CN)</b> : 
            <u>&nbsp;&nbsp;' . ($data['cost_estimation'] > 0 ? number_format($data['cost_estimation'], 2) : '....................') . '&nbsp;&nbsp;</u> THB
        </td>
    </tr>
</table>';

// ==========================================
// 5. SIGNATURES
// ==========================================
$html .= '
<br>
<table border="1" cellpadding="5" cellspacing="0" style="text-align:center;">
    <tr style="background-color:#eaeaea;">
        <td width="25%"><b>Production Dept.</b><br>(ฝ่ายผลิต)</td>
        <td width="25%"><b>Quality Dept.</b><br>(ฝ่ายควบคุมคุณภาพ)</td>
        <td width="25%"><b>Purchasing Dept.</b><br>(ฝ่ายจัดซื้อ)</td>
        <td width="25%"><b>Manager Approved</b><br>(ผู้จัดการฝ่าย)</td>
    </tr>
    <tr>
        <td height="90"><br><br><br><br><br><br>.........................................<br>Date: _____/_____/_____</td>
        <td height="90"><br><br><br><br><br><br>.........................................<br>Date: _____/_____/_____</td>
        <td height="90"><br><br><br><br><br><br>.........................................<br>Date: _____/_____/_____</td>
        <td height="90"><br><br><br><br><br><br>.........................................<br>Date: _____/_____/_____</td>
    </tr>
</table>
';

$pdf->writeHTML($html);
$pdf->Output('Notice_Claim_' . ($is_blank ? 'BLANK' : $data['car_no']) . '.pdf', 'I');
?>