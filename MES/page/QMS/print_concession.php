<?php
// page/QMS/print_concession.php
require_once('../db.php');
require_once('../../auth/check_auth.php'); 

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
$show_date = $is_blank || empty($data['request_date']) ? '....../....../......' : date('d/m/Y', strtotime($data['request_date']));
$show_mfg_date = empty($data['mfg_date']) ? '' : date('d/m/Y', strtotime($data['mfg_date']));
$qty = $data['qty'];
$show_qty = $is_blank ? '' : (floor($qty) == $qty ? number_format((float)$qty) : rtrim(rtrim(number_format((float)$qty, 4), '0'), '.'));

function getRealName($pdo, $name) {
    if (empty($name)) return $name;
    $stmt = $pdo->prepare("SELECT COALESCE(m.name_th, u.fullname, u.username) as real_name FROM USERS u LEFT JOIN MANPOWER_EMPLOYEES m ON u.username = m.emp_id WHERE u.username = ? OR u.fullname = ?");
    $stmt->execute([$name, $name]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    return $row ? $row['real_name'] : $name;
}

$person_name = getRealName($pdo, $data['person_name']);

function renderApprover($pdo, $name, $status, $dateStr) {
    if (!$status) {
        return '
            <div class="signature-box">
                <div class="sig-space"></div>
                <div class="sig-line">...................................................</div>
                <div class="sig-date">Date ....../....../......</div>
                <div class="sig-status">
                    [  ] Approve &nbsp;&nbsp; [  ] Not Approve
                </div>
            </div>
        ';
    }
    
    $dt = $dateStr ? date('d / m / Y', strtotime($dateStr)) : '....../....../......';
    $stAppr = $status == 'Approve' ? '[ / ] Approve' : '[  ] Approve';
    $stNotAppr = $status == 'Not Approve' ? '[ / ] Not Approve' : '[  ] Not Approve';
    $realName = getRealName($pdo, $name);
    
    return '
        <div class="signature-box">
            <div class="sig-space"></div>
            <div class="sig-line" style="text-decoration: underline;">&nbsp;&nbsp;&nbsp;' . htmlspecialchars($realName) . '&nbsp;&nbsp;&nbsp;</div>
            <div class="sig-date">Date ' . $dt . '</div>
            <div class="sig-status">
                ' . $stAppr . ' &nbsp;&nbsp; ' . $stNotAppr . '
            </div>
        </div>
    ';
}

$chkReportNeed = $data['is_report_needed'] ? '[ / ] Need' : '[  ] Need';
$chkReportNotNeed = !$data['is_report_needed'] ? '[ / ] Not Need' : '[  ] Not Need';

?>
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <title>Concession_<?php echo $is_blank ? 'Blank' : htmlspecialchars($data['request_no']); ?></title>
    <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="../../utils/libs/fontawesome/css/all.min.css">
    <style>
        /* === A4 SETTINGS === */
        @page { size: A4 portrait; margin: 10mm; }

        body { 
            font-family: 'Sarabun', sans-serif; 
            font-size: 14px; 
            line-height: 1.4; 
            color: #000; 
            background: #525659;
            margin: 0; 
            padding: 20px 0;
        }

        .page { 
            width: 210mm; 
            min-height: 297mm; 
            padding: 10mm; 
            margin: 0 auto 20px auto; 
            background: white; 
            position: relative; 
            box-sizing: border-box; 
            box-shadow: 0 0 10px rgba(0,0,0,0.5); 
        }

        .no-print { position: fixed; top: 15px; right: 20px; z-index: 9999; }
        
        .btn-print {
            background-color: #0d6efd;
            color: white;
            border: none;
            padding: 10px 20px;
            font-size: 16px;
            border-radius: 5px;
            cursor: pointer;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .btn-print:hover { background-color: #0b5ed7; }

        /* === PRINT MODE === */
        @media print {
            body { background: white; padding: 0; margin: 0; }
            .no-print { display: none !important; }
            .page { 
                width: 100% !important; min-height: auto !important; margin: 0 !important; padding: 0 !important;
                box-shadow: none !important; border: none !important; 
            }
        }

        /* === CUSTOM STYLES === */
        table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
        .table-bordered th, .table-bordered td { border: 1px solid #000; padding: 6px; vertical-align: top; }
        .table-noborder th, .table-noborder td { border: none; padding: 4px; vertical-align: top; }
        
        .text-center { text-align: center; }
        .text-left { text-align: left; }
        .text-right { text-align: right; }
        .align-middle { vertical-align: middle !important; }
        
        .font-bold { font-weight: 700; }
        .text-red { color: #dc2626; }
        .text-blue { color: #1d4ed8; }
        
        .text-xs { font-size: 10px; }
        .text-sm { font-size: 12px; }
        .text-base { font-size: 14px; }
        .text-lg { font-size: 18px; }
        .text-xl { font-size: 24px; }
        
        .font-helvetica { font-family: Arial, Helvetica, sans-serif; }
        
        .bg-gray { background-color: #f3f4f6; }
        
        .whitespace-pre-wrap { white-space: pre-wrap; }
        
        /* Signatures */
        .signature-box { text-align: center; margin-top: 5px; }
        .sig-space { height: 60px; }
        .sig-line { margin-bottom: 5px; }
        .sig-date { margin-bottom: 15px; }
        .sig-status { font-size: 13px; font-weight: bold; }

        /* Hide injected inactivity modal */
        .modal { display: none !important; }
    </style>
    <script>
        // Dummy bootstrap object to prevent inactivity script errors on print page
        var bootstrap = {
            Modal: function() {
                return { show: function(){}, hide: function(){} };
            }
        };
    </script>
</head>
<body>

    <div class="no-print">
        <button class="btn-print" onclick="window.print()">
            <i class="fas fa-print"></i> Print PDF
        </button>
    </div>

    <div class="page">
        <!-- Header -->
        <table class="table-bordered" style="margin-bottom: 15px;">
            <tr>
                <td width="30%" class="text-center align-middle">
                    <div class="font-bold text-red font-helvetica" style="font-size: 28px; line-height: 1;">SCAN</div>
                    <div class="text-xs">SNC CREATIVITY ANTHOLOGY CO.,LTD.</div>
                </td>
                <td width="40%" class="text-center align-middle">
                    <div class="font-bold text-lg" style="margin-bottom: 5px;">ใบขอใช้ชิ้นงานกรณีพิเศษ</div>
                    <div class="text-sm">( CUSTOMER CONCESSION REQUEST )</div>
                </td>
                <td width="30%" class="align-middle" style="padding: 0;">
                    <table class="table-noborder text-sm" style="margin-bottom: 0;">
                        <tr>
                            <td width="35%" class="font-bold">Doc No.:</td>
                            <td width="65%"><?php echo htmlspecialchars($data['request_no']); ?></td>
                        </tr>
                        <tr>
                            <td class="font-bold">Date:</td>
                            <td><?php echo $show_date; ?></td>
                        </tr>
                        <tr>
                            <td class="font-bold">Page:</td>
                            <td>1 of 1</td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>

        <!-- Main Info -->
        <table class="table-bordered">
            <tr>
                <td width="50%">
                    <span class="font-bold">ISSUED BY :</span> <span class="text-blue"><?php echo htmlspecialchars($data['issued_by_dept']); ?></span>
                </td>
                <td width="50%">
                    <span class="font-bold">REQUEST TO :</span> <span class="text-blue"><?php echo htmlspecialchars($data['request_to']); ?></span>
                </td>
            </tr>
            <tr>
                <td width="50%">
                    <span class="font-bold">PERSON :</span> <span class="text-blue"><?php echo htmlspecialchars($person_name); ?></span>
                </td>
                <td width="50%">
                    <span class="font-bold">SUBJECT :</span> <span class="text-blue"><?php echo htmlspecialchars($data['subject']); ?></span>
                </td>
            </tr>
            <tr>
                <td colspan="2" style="padding: 0;">
                    <table class="table-noborder" style="margin-bottom: 0;">
                        <tr>
                            <td width="15%" class="font-bold">Part Name :</td>
                            <td width="35%" class="text-blue"><?php echo htmlspecialchars($data['part_name']); ?></td>
                            <td width="15%" class="font-bold">Order No. :</td>
                            <td width="35%" class="text-blue"><?php echo htmlspecialchars($data['order_no']); ?></td>
                        </tr>
                        <tr>
                            <td class="font-bold">Part No. :</td>
                            <td class="text-blue"><?php echo htmlspecialchars($data['part_no']); ?></td>
                            <td class="font-bold">Quantity :</td>
                            <td class="text-blue"><?php echo $show_qty; ?></td>
                        </tr>
                        <tr>
                            <td class="font-bold">Lot No. :</td>
                            <td class="text-blue"><?php echo htmlspecialchars($data['lot_no']); ?></td>
                            <td class="font-bold">Model Name :</td>
                            <td class="text-blue"><?php echo htmlspecialchars($data['model_name']); ?></td>
                        </tr>
                        <tr>
                            <td class="font-bold">Serial No. :</td>
                            <td class="text-blue"><?php echo htmlspecialchars($data['serial_no']); ?></td>
                            <td class="font-bold">MFG Date :</td>
                            <td class="text-blue"><?php echo $show_mfg_date; ?></td>
                        </tr>
                    </table>
                </td>
            </tr>
            <tr>
                <td colspan="2">
                    <div class="font-bold">Difference Regular Part and special adopt part (ข้อแตกต่าง) :</div>
                    <div class="text-blue whitespace-pre-wrap"><?php echo htmlspecialchars($data['difference_detail']); ?></div>
                </td>
            </tr>
            <tr>
                <td colspan="2">
                    <div class="font-bold">REASON FOR SPECIAL ADOPT (เหตุผลในการขอใช้) :</div>
                    <div class="text-blue whitespace-pre-wrap"><?php echo htmlspecialchars($data['reason_for_adopt']); ?></div>
                </td>
            </tr>
            <tr>
                <td colspan="2">
                    <div class="font-bold">CAUSE (สาเหตุของปัญหา) :</div>
                    <div class="text-blue whitespace-pre-wrap"><?php echo htmlspecialchars($data['root_cause']); ?></div>
                </td>
            </tr>
            <tr>
                <td colspan="2">
                    <div class="font-bold" style="margin-bottom: 10px;">HOW TO TAKE MEASURE IN THE FUTURE (การจัดการในอนาคต) :</div>
                    
                    <div class="font-bold">TENTATIVE (ชั่วคราว):</div>
                    <div class="text-blue whitespace-pre-wrap" style="margin-bottom: 10px;"><?php echo htmlspecialchars($data['measure_tentative']); ?></div>
                    
                    <div class="font-bold">PERMANENT (ถาวร):</div>
                    <div class="text-blue whitespace-pre-wrap"><?php echo htmlspecialchars($data['measure_permanent']); ?></div>
                </td>
            </tr>
            <tr>
                <td colspan="2">
                    <span class="font-bold">Submit Report (เอกสารสนับสนุน) :</span> &nbsp;&nbsp;&nbsp;
                    <?php echo $chkReportNeed; ?> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <?php echo $chkReportNotNeed; ?>
                </td>
            </tr>
        </table>

        <!-- Signatures -->
        <table class="table-bordered text-center" style="margin-bottom: 0;">
            <tr>
                <td colspan="4" class="text-left bg-gray">
                    <div class="font-bold">Approver's Comments / Signatures</div>
                    <div class="text-xs">By Signing this approval, it is agreed that OTI will take full responsibility for any claims and damages arise from this adaptation</div>
                </td>
            </tr>
            <tr>
                <td width="25%" class="font-bold">Approver 1</td>
                <td width="25%" class="font-bold">Approver 2</td>
                <td width="25%" class="font-bold">Approver 3</td>
                <td width="25%" class="font-bold">Approver 4</td>
            </tr>
            <tr>
                <td class="align-middle">
                    <?php echo renderApprover($pdo, $data['approver_1_name'], $data['approver_1_status'], $data['approver_1_date']); ?>
                </td>
                <td class="align-middle">
                    <?php echo renderApprover($pdo, $data['approver_2_name'], $data['approver_2_status'], $data['approver_2_date']); ?>
                </td>
                <td class="align-middle">
                    <?php echo renderApprover($pdo, $data['approver_3_name'], $data['approver_3_status'], $data['approver_3_date']); ?>
                </td>
                <td class="align-middle">
                    <?php echo renderApprover($pdo, $data['approver_4_name'], $data['approver_4_status'], $data['approver_4_date']); ?>
                </td>
            </tr>
        </table>

        <div class="text-right text-xs" style="margin-top: 15px;">
            FM-QCS-006 / R02 : 07/07/22
        </div>
    </div>

    <script>
        // Auto print prompt after a slight delay, optional but helpful
        /*
        window.onload = function() {
            setTimeout(function() {
                window.print();
            }, 500);
        };
        */
    </script>
</body>
</html>
