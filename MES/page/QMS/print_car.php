<?php
// page/QMS/print_car.php
require_once('../../utils/libs/tcpdf/tcpdf.php');
require_once('../../config/config.php');
require_once('../db.php');

// ตรวจสอบโหมด: ?mode=blank
$is_blank = (isset($_GET['mode']) && $_GET['mode'] === 'blank');
$case_id = $_GET['id'] ?? 0;

$data = [];
$images = [];

if ($is_blank) {
    // --- โหมดแบบฟอร์มเปล่า ---
    $data = [
        'car_no' => '....................',
        'case_date' => null,
        'customer_name' => '', 'product_name' => '', 'defect_type' => '',
        'defect_qty' => 0, 'defect_description' => '', 'lot_no' => '',
        'production_date' => '', 'product_model' => '', 'invoice_no' => '',
        'production_line' => '', 'found_by_type' => '',
        'containment_action' => '', 'root_cause_category' => '',
        'customer_root_cause' => '', 'leak_cause' => '',
        'customer_action_plan' => '',
        'issuer_name' => '.........................................'
    ];
} else {
    // --- โหมดปกติ ---
    if (!$case_id) die('Error: Missing Case ID');
    $sql = "SELECT c.car_no, c.case_date, c.customer_name, c.product_name,
                   n.defect_type, n.defect_qty, n.defect_description, 
                   n.lot_no, n.production_date,
                   n.product_model, n.invoice_no, n.production_line, n.found_by_type,
                   car.*, u.username as issuer_name
            FROM " . QMS_CASES_TABLE . " c
            JOIN " . QMS_NCR_TABLE . " n ON c.case_id = n.case_id
            LEFT JOIN " . QMS_CAR_TABLE . " car ON c.case_id = car.case_id
            LEFT JOIN " . USERS_TABLE . " u ON c.created_by = u.id
            WHERE c.case_id = ?";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$case_id]);
    $data = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$data) die('CAR Data not found');

    $sqlImg = "SELECT TOP 3 file_path FROM " . QMS_FILE_TABLE . " WHERE case_id = ? AND doc_stage = 'NCR' ORDER BY uploaded_at ASC";
    $stmtImg = $pdo->prepare($sqlImg);
    $stmtImg->execute([$case_id]);
    $images = $stmtImg->fetchAll(PDO::FETCH_ASSOC);
}

// ตัวแปรแสดงผล
$show_date = $is_blank ? '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;/&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;/&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;' : date('d/m/Y', strtotime($data['case_date']));
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

function chkBox($val, $target) {
    if (empty($val) && empty($target)) return '[&nbsp;&nbsp;&nbsp;]';
    return ($val === $target) ? '[ X ]' : '[&nbsp;&nbsp;&nbsp;]';
}

// ==========================================
// 1. HEADER & LOGO
// ==========================================
$html = '
<table border="1" cellpadding="5" cellspacing="0">
    <tr>
        <td width="30%" align="center" valign="middle">
            <b style="font-family:helvetica; font-size:22pt; color:red;">SCAN</b><br>
            <span style="font-size:8pt;">SNC CREATIVITY ANTHOLOGY CO.,LTD.</span>
        </td>
        <td width="40%" align="center" valign="middle">
            <b style="font-size:20pt;">QC</b>
            <br style="font-size:20pt; line-height:20px;">
            <span style="font-size:10pt;">CORRECTIVE ACTION REQUEST</span>
        </td>
        <td width="30%" style="font-size:9pt;" valign="middle">
            <table border="0" cellpadding="2">
                <tr>
                    <td width="30%" align="left"><b>CAR No.:</b></td>
                    <td width="70%" align="left">' . $show_car_no . '/Rev.00</td>
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
// 2. INFO AREA
// ==========================================
$html .= '
<table border="1" cellpadding="3" cellspacing="0" style="font-size:9pt;">
    <tr>
        <td width="15%" bgcolor="#f2f2f2"><b>Name:</b></td>
        <td width="35%">' . $data['issuer_name'] . '</td>
        <td width="15%" bgcolor="#f2f2f2"><b>Position:</b></td>
        <td width="35%"></td>
    </tr>
    <tr>
        <td bgcolor="#f2f2f2"><b>Line:</b></td>
        <td>' . ($data['production_line'] ?? '') . '</td>
        <td bgcolor="#f2f2f2"><b>Company:</b></td>
        <td style="font-size:8pt;">SNC CREATIVITY ANTHOLOGY CO.,LTD.</td>
    </tr>
    <tr>
        <td bgcolor="#f2f2f2"><b>Part No:</b></td>
        <td>' . $data['product_name'] . '</td>
        <td bgcolor="#f2f2f2"><b>Part Name:</b></td>
        <td>' . $data['product_name'] . '</td>
    </tr>
    <tr>
        <td bgcolor="#f2f2f2"><b>Model:</b></td>
        <td>' . ($data['product_model'] ?? '') . '</td>
        <td bgcolor="#f2f2f2"><b>Lot No:</b></td>
        <td>' . $data['lot_no'] . '</td>
    </tr>
    <tr>
        <td bgcolor="#f2f2f2"><b>Invoice No:</b></td>
        <td>' . ($data['invoice_no'] ?? '') . '</td>
        <td bgcolor="#f2f2f2"><b>Q\'ty:</b></td>
        <td>' . $show_qty . '</td>
    </tr>
</table>';

// ==========================================
// 4. NON-CONFORMING
// ==========================================
$src = $data['found_by_type'];
$html .= '
<table border="1" cellpadding="3" cellspacing="0">
    <tr style="background-color:#eaeaea;">
        <td><b>Originator (แจ้งโดย):</b> 
            &nbsp; ' . chkBox($src, 'Customer') . ' Customer
            &nbsp; ' . chkBox($src, 'QC') . ' QC
            &nbsp; ' . chkBox($src, 'Maintenance') . ' Maintenance
            &nbsp; ' . chkBox($src, 'Other') . ' Other
        </td>
    </tr>
</table>';

// ==========================================
// 5. PROBLEM (Spacer = 5 ตามสั่ง)
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
    <tr style="background-color:#eaeaea;"><td><b>1. Problem Description (รายละเอียดปัญหา):</b></td></tr>
    <tr>
        <td height="110">
            <table border="0" width="100%">
                <tr>
                    <td width="50%" valign="top">
                        <table border="0" width="100%">
                            <tr>
                                <td align="left" valign="top">' . nl2br($data['defect_description']) . '</td>
                            </tr>
                            <tr><td height="75"></td></tr>
                            <tr>
                                <td align="left" valign="bottom"><b>Defect Type:</b> ' . $data['defect_type'] . '</td>
                            </tr>
                        </table>
                    </td>
                    <td width="50%" valign="top">
                        <table border="0" width="100%">
                            <tr><td height="5" style="font-size:5pt; line-height:5px;">&nbsp;</td></tr>
                            <tr>
                                <td align="center">' . $imgHtml . '</td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </td>
    </tr>
</table>';

// ==========================================
// 6-11. (ส่วนอื่นๆ คงเดิม)
// ==========================================
$html .= '
<table border="1" cellpadding="3" cellspacing="0">
    <tr style="background-color:#eaeaea;">
        <td>
            <b>2. Containment Action (การแก้ไขเบื้องต้น):</b> 
            <span style="float:right; font-size:8pt;">(Within 7 Days reply)</span>
        </td>
    </tr>
    <tr><td height="55">' . ($data['containment_action'] ?? '') . '</td></tr>
</table>

<table border="1" cellpadding="3" cellspacing="0">
    <tr style="background-color:#eaeaea;">
        <td>
            <b>3. Root Cause Analysis (สาเหตุของปัญหา):</b><br>
            ' . chkBox($data['root_cause_category'], 'Man') . ' Man &nbsp;
            ' . chkBox($data['root_cause_category'], 'Machine') . ' Machine &nbsp;
            ' . chkBox($data['root_cause_category'], 'Material') . ' Material &nbsp;
            ' . chkBox($data['root_cause_category'], 'Method') . ' Method &nbsp;
            ' . chkBox($data['root_cause_category'], 'Other') . ' Other
        </td>
    </tr>
    <tr><td height="50">' . nl2br($data['customer_root_cause']) . '</td></tr>
</table>

<table border="1" cellpadding="3" cellspacing="0">
    <tr style="background-color:#eaeaea;"><td><b>4. Leak Cause (สาเหตุที่หลุดรอด):</b></td></tr>
    <tr><td height="55">' . ($data['leak_cause'] ?? '') . '</td></tr>
</table>

<table border="1" cellpadding="3" cellspacing="0">
    <tr style="background-color:#eaeaea;"><td><b>5. Corrective Action (การแก้ไขระยะยาว):</b></td></tr>
    <tr><td height="50">' . nl2br($data['customer_action_plan']) . '</td></tr>
</table>

<table border="1" cellpadding="3" cellspacing="0">
    <tr style="background-color:#eaeaea;"><td><b>6. Verification of Effectiveness:</b> (If found reoccurrence, back to re-analysis)</td></tr>
    <tr>
        <td>
            <table border="0" cellpadding="2">
                <tr>
                    <td width="30%">1. Prod Date: ____________</td>
                    <td width="20%">' . chkBox('0', '1') . ' Accept</td>
                    <td width="50%">' . chkBox('0', '1') . ' Reject, need back to analysis element no.2</td>
                </tr>
                <tr>
                    <td>2. Prod Date: ____________</td>
                    <td>' . chkBox('0', '1') . ' Accept</td>
                    <td>' . chkBox('0', '1') . ' Reject, need back to analysis element no.3</td>
                </tr>
                <tr>
                    <td>3. Prod Date: ____________</td>
                    <td>' . chkBox('0', '1') . ' Accept</td>
                    <td>' . chkBox('0', '1') . ' Reject, need back to analysis element no.4</td>
                </tr>
            </table>
        </td>
    </tr>
</table>

<table border="1" cellpadding="3" cellspacing="0">
    <tr style="background-color:#eaeaea;"><td><b>7. Summary Standardization Effectives:</b></td></tr>
    <tr>
        <td>
            ' . chkBox('0', '1') . ' Update FMEA &nbsp;&nbsp;&nbsp;
            ' . chkBox('0', '1') . ' Update Control Plan &nbsp;&nbsp;&nbsp;
            ' . chkBox('0', '1') . ' Update Work Instruction &nbsp;&nbsp;&nbsp;
            ' . chkBox('0', '1') . ' Others: ......................
        </td>
    </tr>
</table>';

// ==========================================
// 13. SIGNATURES (Height = 60 ตามสั่ง)
// ==========================================
$html .= '
<br>
<table border="1" cellpadding="5" cellspacing="0" style="text-align:center;">
    <tr style="background-color:#eaeaea;">
        <td width="34%"><b>Report By</b></td>
        <td width="33%"><b>Check By</b></td>
        <td width="33%"><b>Ack. By (QMR)</b></td>
    </tr>
    <tr>
        <td height="60"><br><br><br><br>(' . $data['issuer_name'] . ')<br>Date: ' . $show_date . '</td>
        <td height="60"><br><br><br>.........................................<br>( QC Supervisor )<br>Date: _____/_____/_____</td>
        <td height="60"><br><br><br>.........................................<br>( QMR )<br>Date: _____/_____/_____</td>
    </tr>
</table>
';

$pdf->writeHTML($html);
$pdf->Output('QC_CAR_' . ($is_blank ? 'BLANK' : $data['car_no']) . '.pdf', 'I');
?>