<?php
// page/QMS/print_concession.php
require_once('../db.php');
require_once('../../auth/check_auth.php'); 

requirePermission(['view_qms', 'view_production']);

$is_blank = (isset($_GET['mode']) && $_GET['mode'] === 'blank');
$ids_str = $_GET['ids'] ?? ($_GET['id'] ?? '');

$records = [];

if ($is_blank) {
    // --- Blank Mode ---
    $records[] = [
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
    $ids_arr = array_filter(explode(',', $ids_str), 'is_numeric');
    if (empty($ids_arr)) die('Error: Missing ID');
    
    $placeholders = implode(',', array_fill(0, count($ids_arr), '?'));
    $sql = "SELECT * FROM QMS_CONCESSION WITH (NOLOCK) WHERE id IN ($placeholders)";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($ids_arr);
    $records = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (empty($records)) die('Error: Concession Data not found');
}

function getRealName($pdo, $name) {
    if (empty($name)) return $name;
    $stmt = $pdo->prepare("SELECT COALESCE(m.name_th, u.fullname, u.username) as real_name FROM USERS u LEFT JOIN MANPOWER_EMPLOYEES m ON u.username = m.emp_id WHERE u.username = ? OR u.fullname = ?");
    $stmt->execute([$name, $name]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    return $row ? $row['real_name'] : $name;
}

function renderApproverBlank() {
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

$title = $is_blank ? 'Concession_Blank' : 'Concession_Print';
?>
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <title><?php echo htmlspecialchars($title); ?></title>
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
            page-break-after: always;
        }
        
        .page:last-child {
            page-break-after: auto;
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
        body { font-family: 'Sarabun', 'TH Sarabun New', Arial, Helvetica, sans-serif; font-size: 13px; color: #000; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
        .table-bordered th, .table-bordered td { border: 1px solid #000; padding: 4px 5px; vertical-align: top; }
        .table-noborder th, .table-noborder td { border: none; padding: 3px 4px; vertical-align: top; }
        
        .text-center { text-align: center; }
        .text-left { text-align: left; }
        .text-right { text-align: right; }
        .align-middle { vertical-align: middle !important; }
        
        .font-bold { font-weight: 700; }
        .text-red { color: #dc2626; }
        
        .text-xs { font-size: 10px; }
        .text-sm { font-size: 11px; }
        .text-base { font-size: 13px; }
        .text-lg { font-size: 16px; }
        .text-xl { font-size: 20px; }
        
        .bg-header { background-color: #eaeaea; font-weight: bold; }
        .bg-label { background-color: #f2f2f2; font-weight: bold; }
        
        .mb-1 { margin-bottom: 4px; }
        .mb-2 { margin-bottom: 8px; }
        
        .whitespace-pre-wrap { white-space: pre-wrap; }
        
        /* Signatures */
        .signature-box { text-align: center; margin-top: 2px; }
        .sig-space { height: 50px; }
        .sig-line { margin-bottom: 3px; }
        .sig-date { margin-bottom: 5px; }
        .sig-status { font-size: 12px; font-weight: bold; }

        /* Hide injected inactivity modal */
        .modal { display: none !important; }
    </style>
    <script>
        var bootstrap = { Modal: function() { return { show: function(){}, hide: function(){} }; } };
    </script>
</head>
<body>

    <div class="no-print">
        <button class="btn-print" onclick="window.print()">
            <i class="fas fa-print"></i> Print PDF
        </button>
    </div>

    <?php foreach ($records as $data): 
        $show_date = $is_blank || empty($data['request_date']) ? '....../....../......' : date('d/m/Y', strtotime($data['request_date']));
        $show_mfg_date = empty($data['mfg_date']) ? '' : date('d/m/Y', strtotime($data['mfg_date']));
        $qty = $data['qty'];
        $show_qty = $is_blank ? '' : (floor($qty) == $qty ? number_format((float)$qty) : rtrim(rtrim(number_format((float)$qty, 4), '0'), '.'));
        $person_name = getRealName($pdo, $data['person_name']);
        
        $chkReportNeed = $data['is_report_needed'] ? '[ / ] Need' : '[  ] Need';
        $chkReportNotNeed = !$data['is_report_needed'] ? '[ / ] Not Need' : '[  ] Not Need';
    ?>
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
            <tr class="bg-header">
                <td colspan="4">1. General Information (ข้อมูลทั่วไป)</td>
            </tr>
            <tr>
                <td width="15%" class="bg-label">ISSUED BY :</td>
                <td width="35%"><?php echo htmlspecialchars($data['issued_by_dept']); ?></td>
                <td width="15%" class="bg-label">REQUEST TO :</td>
                <td width="35%"><?php echo htmlspecialchars($data['request_to']); ?></td>
            </tr>
            <tr>
                <td class="bg-label">PERSON :</td>
                <td><?php echo htmlspecialchars($person_name); ?></td>
                <td class="bg-label">SUBJECT :</td>
                <td><?php echo htmlspecialchars($data['subject']); ?></td>
            </tr>
        </table>

        <table class="table-bordered">
            <tr class="bg-header">
                <td colspan="4">2. Product Information (ข้อมูลผลิตภัณฑ์)</td>
            </tr>
            <tr>
                <td width="15%" class="bg-label">Part Name :</td>
                <td width="35%"><?php echo htmlspecialchars($data['part_name']); ?></td>
                <td width="15%" class="bg-label">Order No. :</td>
                <td width="35%"><?php echo htmlspecialchars($data['order_no']); ?></td>
            </tr>
            <tr>
                <td class="bg-label">Part No. :</td>
                <td><?php echo htmlspecialchars($data['part_no']); ?></td>
                <td class="bg-label">Quantity :</td>
                <td><?php echo $show_qty; ?></td>
            </tr>
            <tr>
                <td class="bg-label">Lot No. :</td>
                <td><?php echo htmlspecialchars($data['lot_no']); ?></td>
                <td class="bg-label">Model Name :</td>
                <td><?php echo htmlspecialchars($data['model_name']); ?></td>
            </tr>
            <tr>
                <td class="bg-label">Serial No. :</td>
                <td><?php echo htmlspecialchars($data['serial_no']); ?></td>
                <td class="bg-label">MFG Date :</td>
                <td><?php echo $show_mfg_date; ?></td>
            </tr>
        </table>
        <table class="table-bordered">
            <tr class="bg-header">
                <td>3. Details (รายละเอียด)</td>
            </tr>
            <tr>
                <td>
                    <div class="font-bold mb-1">Difference Regular Part and special adopt part (ข้อแตกต่าง) :</div>
                    <div class="whitespace-pre-wrap"><?php echo htmlspecialchars($data['difference_detail']); ?></div>
                </td>
            </tr>
            <tr>
                <td>
                    <div class="font-bold mb-1">REASON FOR SPECIAL ADOPT (เหตุผลในการขอใช้) :</div>
                    <div class="whitespace-pre-wrap"><?php echo htmlspecialchars($data['reason_for_adopt']); ?></div>
                </td>
            </tr>
            <tr>
                <td>
                    <div class="font-bold mb-1">CAUSE (สาเหตุของปัญหา) :</div>
                    <div class="whitespace-pre-wrap"><?php echo htmlspecialchars($data['root_cause']); ?></div>
                </td>
            </tr>
            <tr>
                <td>
                    <div class="font-bold mb-2">HOW TO TAKE MEASURE IN THE FUTURE (การจัดการในอนาคต) :</div>
                    
                    <div class="font-bold">TENTATIVE (ชั่วคราว):</div>
                    <div class="whitespace-pre-wrap mb-2"><?php echo htmlspecialchars($data['measure_tentative']); ?></div>
                    
                    <div class="font-bold">PERMANENT (ถาวร):</div>
                    <div class="whitespace-pre-wrap"><?php echo htmlspecialchars($data['measure_permanent']); ?></div>
                </td>
            </tr>
            <tr>
                <td>
                    <span class="font-bold">Submit Report (เอกสารสนับสนุน) :</span> &nbsp;&nbsp;&nbsp;
                    <?php echo $chkReportNeed; ?> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <?php echo $chkReportNotNeed; ?>
                </td>
            </tr>
        </table>

        <!-- Signatures -->
        <table class="table-bordered text-center" style="margin-bottom: 0;">
            <tr class="bg-header">
                <td colspan="4">
                    4. Approver's Comments / Signatures<br>
                    <span style="font-weight:normal; font-size:11px;">By Signing this approval, it is agreed that <?php echo $is_blank || empty($data['request_to']) ? '....................' : htmlspecialchars($data['request_to']); ?> will take full responsibility for any claims and damages arise from this adaptation</span>
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
                    <?php echo renderApproverBlank(); ?>
                </td>
                <td class="align-middle">
                    <?php echo renderApproverBlank(); ?>
                </td>
                <td class="align-middle">
                    <?php echo renderApproverBlank(); ?>
                </td>
                <td class="align-middle">
                    <?php echo renderApproverBlank(); ?>
                </td>
            </tr>
        </table>

        <div class="text-right text-xs" style="margin-top: 15px;">
            FM-QCS-006 / R02 : 07/07/22
        </div>
    </div>
    <?php endforeach; ?>

</body>
</html>
