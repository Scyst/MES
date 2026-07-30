<?php
// page/QMS/print_concession.php
require_once('../db.php');
require_once('../../auth/check_auth.php'); 
require_once('../../utils/libs/tcpdf/tcpdf.php');

requirePermission(['view_qms', 'view_production']);

$is_blank = (isset($_GET['mode']) && $_GET['mode'] === 'blank');
$id = $_GET['id'] ?? 0;

$data = [];

if ($is_blank) {
    // --- Blank Mode ---
    $data = [
        'request_no' => '....................',
        'request_date' => null,
        'issued_by_dept' => '', 'request_to' => '',
        'subject' => '', 'person_name' => '',
        'part_name' => '', 'part_no' => '', 'order_no' => '',
        'qty' => 0, 'lot_no' => '', 'model_name' => '',
        'serial_no' => '', 'mfg_date' => null,
        'difference_detail' => '', 'reason_for_adopt' => '', 'root_cause' => '',
        'measure_tentative' => '', 'measure_permanent' => '',
        'is_report_needed' => 0,
        'approver_1_name' => '', 'approver_1_status' => '', 'approver_1_date' => null,
        'approver_2_name' => '', 'approver_2_status' => '', 'approver_2_date' => null,
        'approver_3_name' => '', 'approver_3_status' => '', 'approver_3_date' => null,
        'approver_4_name' => '', 'approver_4_status' => '', 'approver_4_date' => null,
    ];
} else {
    if (!$id) die('Error: Missing ID');
    
    $sql = "SELECT * FROM QMS_CONCESSION WITH (NOLOCK) WHERE id = ?";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$id]);
    $data = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$data) die('Error: Concession Data not found');
}

// Format variables
$show_date = $is_blank || empty($data['request_date']) ? '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;/&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;/&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;' : date('d/m/Y', strtotime($data['request_date']));
$show_mfg_date = empty($data['mfg_date']) ? '' : date('d/m/Y', strtotime($data['mfg_date']));
$qty = $data['qty'];
$show_qty = $is_blank ? '' : (floor($qty) == $qty ? number_format((float)$qty) : rtrim(rtrim(number_format((float)$qty, 4), '0'), '.'));

function fmtAppr($name, $status, $dateStr) {
    if (!$status) return "<br><br><br><br>...................................................<br>Date ....../....../......";
    $dt = $dateStr ? date('d / m / Y', strtotime($dateStr)) : '....../....../......';
    $st = $status == 'Approve' ? '[ / ] Approve  [  ] Not Approve' : '[  ] Approve  [ / ] Not Approve';
    return "<br>$st<br><br><u>&nbsp;&nbsp;$name&nbsp;&nbsp;</u><br>Date: $dt";
}

$appr1 = fmtAppr($data['approver_1_name'], $data['approver_1_status'], $data['approver_1_date']);
$appr2 = fmtAppr($data['approver_2_name'], $data['approver_2_status'], $data['approver_2_date']);
$appr3 = fmtAppr($data['approver_3_name'], $data['approver_3_status'], $data['approver_3_date']);
$appr4 = fmtAppr($data['approver_4_name'], $data['approver_4_status'], $data['approver_4_date']);

$chkReportNeed = $data['is_report_needed'] ? '[ / ] Need' : '[  ] Need';
$chkReportNotNeed = !$data['is_report_needed'] ? '[ / ] Not Need' : '[  ] Not Need';

// Init PDF
$pdf = new TCPDF(PDF_PAGE_ORIENTATION, PDF_UNIT, PDF_PAGE_FORMAT, true, 'UTF-8', false);
$pdf->setPrintHeader(false);
$pdf->setPrintFooter(false);
$pdf->SetMargins(12, 10, 12);
$pdf->SetAutoPageBreak(TRUE, 5);
$pdf->AddPage();
$pdf->SetFont('freeserif', '', 10);

$html = '
<table border="1" cellpadding="5" cellspacing="0" width="100%">
    <tr>
        <td width="30%" align="center" valign="middle">
            <b style="font-family:helvetica; font-size:22pt; color:red;">SCAN</b><br>
            <span style="font-size:8pt;">SNC CREATIVITY ANTHOLOGY CO.,LTD.</span>
        </td>
        <td width="40%" align="center" valign="middle">
            <br>
            <b style="font-size:16pt;">ใบขอใช้ชิ้นงานกรณีพิเศษ</b>
            <br>
            <span style="font-size:10pt;">( CUSTOMER CONCESSION REQUEST )</span>
        </td>
        <td width="30%" style="font-size:10pt;" valign="middle">
            <table border="0" cellpadding="2">
                <tr>
                    <td width="35%" align="left"><b>Doc No.:</b></td>
                    <td width="65%" align="left">' . $data['request_no'] . '</td>
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
</table>
<br><br>

<table border="1" cellpadding="5" cellspacing="0" width="100%">
    <tr>
        <td width="50%">
            <b>ISSUED BY :</b> ' . htmlspecialchars($data['issued_by_dept']) . '
        </td>
        <td width="50%">
            <b>REQUEST TO :</b> ' . htmlspecialchars($data['request_to']) . '
        </td>
    </tr>
    <tr>
        <td width="50%">
            <b>PERSON :</b> ' . htmlspecialchars($data['person_name']) . '
        </td>
        <td width="50%">
            <b>SUBJECT :</b> ' . htmlspecialchars($data['subject']) . '
        </td>
    </tr>
    <tr>
        <td width="100%" colspan="2">
            <table border="0" cellpadding="2" cellspacing="0" width="100%">
                <tr>
                    <td width="20%"><b>Part Name :</b></td><td width="30%">' . htmlspecialchars($data['part_name']) . '</td>
                    <td width="20%"><b>Order No. :</b></td><td width="30%">' . htmlspecialchars($data['order_no']) . '</td>
                </tr>
                <tr>
                    <td><b>Part No. :</b></td><td>' . htmlspecialchars($data['part_no']) . '</td>
                    <td><b>Quantity :</b></td><td>' . $show_qty . '</td>
                </tr>
                <tr>
                    <td><b>Lot No. :</b></td><td>' . htmlspecialchars($data['lot_no']) . '</td>
                    <td><b>Model Name :</b></td><td>' . htmlspecialchars($data['model_name']) . '</td>
                </tr>
                <tr>
                    <td><b>Serial No. :</b></td><td>' . htmlspecialchars($data['serial_no']) . '</td>
                    <td><b>MFG Date :</b></td><td>' . $show_mfg_date . '</td>
                </tr>
            </table>
        </td>
    </tr>
    <tr>
        <td width="100%" colspan="2">
            <b>Difference Regular Part and special adopt part (ข้อแตกต่าง) :</b><br>
            ' . nl2br(htmlspecialchars($data['difference_detail'])) . '
        </td>
    </tr>
    <tr>
        <td width="100%" colspan="2">
            <b>REASON FOR SPECIAL ADOPT (เหตุผลในการขอใช้) :</b><br>
            ' . nl2br(htmlspecialchars($data['reason_for_adopt'])) . '
        </td>
    </tr>
    <tr>
        <td width="100%" colspan="2">
            <b>CAUSE (สาเหตุของปัญหา) :</b><br>
            ' . nl2br(htmlspecialchars($data['root_cause'])) . '
        </td>
    </tr>
    <tr>
        <td width="100%" colspan="2">
            <b>HOW TO TAKE MEASURE IN THE FUTURE (การจัดการในอนาคต) :</b><br>
            <b>TENTATIVE (ชั่วคราว):</b><br>
            ' . nl2br(htmlspecialchars($data['measure_tentative'])) . '<br><br>
            <b>PERMANENT (ถาวร):</b><br>
            ' . nl2br(htmlspecialchars($data['measure_permanent'])) . '
        </td>
    </tr>
    <tr>
        <td width="100%" colspan="2">
            <b>Submit Report (เอกสารสนับสนุน) :</b> &nbsp;&nbsp;&nbsp;
            ' . $chkReportNeed . ' &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ' . $chkReportNotNeed . '
        </td>
    </tr>
</table>

<br>
<div style="margin-bottom: 5px;">
    <b>Approver\'s Comments / Signatures</b><br>
    <span style="font-size:9pt;">By Signing this approval, it is agreed that OTI will take full responsibility for any claims and damages arise from this adaptation</span>
</div>
<table border="1" cellpadding="5" cellspacing="0" width="100%" style="text-align:center;">
    <tr>
        <td width="25%"><b>Approver 1</b></td>
        <td width="25%"><b>Approver 2</b></td>
        <td width="25%"><b>Approver 3</b></td>
        <td width="25%"><b>Approver 4</b></td>
    </tr>
    <tr>
        <td>' . $appr1 . '</td>
        <td>' . $appr2 . '</td>
        <td>' . $appr3 . '</td>
        <td>' . $appr4 . '</td>
    </tr>
</table>

<br><br>
<table border="0" cellpadding="2" width="100%">
    <tr>
        <td align="right" style="font-size:8pt;">FM-QCS-006 / R02 : 07/07/22</td>
    </tr>
</table>
';

$pdf->writeHTML($html, true, false, true, false, '');

$pdf->Output('Concession_' . ($is_blank ? 'Blank' : $data['request_no']) . '.pdf', 'I');
?>
