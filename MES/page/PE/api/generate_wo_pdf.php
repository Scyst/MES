<?php
// Path: MES/page/PE/api/generate_wo_pdf.php

require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../components/init.php';

requirePermission(['view_maintenance', 'view_production', 'view_dashboard']);

$wo_id = $_GET['wo_id'] ?? null;
$wo_ids_param = $_GET['wo_ids'] ?? null;

$wo_ids = [];
if ($wo_ids_param) {
    $wo_ids = explode(',', $wo_ids_param);
} elseif ($wo_id) {
    $wo_ids = [$wo_id];
}

if (empty($wo_ids)) {
    die("Work Order ID(s) required.");
}

// Helper Functions
if (!function_exists('formatDateTH_PDF')) {
    function formatDateTH_PDF($date) { return $date ? date('d/m/Y', strtotime($date)) : "-"; }
}
if (!function_exists('formatTime_PDF')) {
    function formatTime_PDF($date) { return $date ? date('H:i', strtotime($date)) : "-"; }
}

?>
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <title>WO_<?php echo count($wo_ids) > 1 ? 'BULK_PRINT' : htmlspecialchars($wo_ids[0]); ?></title>
    <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="../../../utils/libs/fontawesome/css/all.min.css">
    
    <style>
        /* === A4 SETTINGS === */
        @page { size: A4 portrait; margin: 5mm 10mm 10mm 10mm; }

        body { 
            font-family: 'Sarabun', sans-serif; 
            font-size: 13px; 
            line-height: 1.4; 
            color: #000; 
            background: #525659;
            margin: 0; 
            padding: 20px 0;
        }

        .page { 
            width: 210mm; 
            min-height: 297mm; 
            padding: 5mm 15mm 15mm 15mm; 
            margin: 0 auto 20px auto; 
            background: white; 
            position: relative; 
            box-sizing: border-box; 
            box-shadow: 0 0 10px rgba(0,0,0,0.5); 
        }

        .no-print { position: fixed; top: 15px; right: 20px; z-index: 9999; }
        
        /* === PRINT MODE === */
        @media print {
            body { background: white; padding: 0; margin: 0; }
            .no-print { display: none !important; }
            
            .page { 
                width: 100% !important; margin: 0 !important; padding: 0 !important;
                box-shadow: none !important; border: none !important; 
                min-height: auto !important; page-break-after: always;
            }
            .page:last-child { page-break-after: auto; }
            
            table { page-break-inside: avoid; }
            .spare-parts-table { page-break-inside: auto; }
            .spare-parts-table tr { page-break-inside: avoid; page-break-after: auto; }
            .spare-parts-table thead { display: table-header-group; }
            .spare-parts-table tfoot { display: table-footer-group; }
            
            /* Prevent blocks from breaking across pages */
            .text-block, .info-grid, .keep-together {
                page-break-inside: avoid;
                break-inside: avoid;
            }
        }

        /* --- STYLES --- */
        .header-table { width: 100%; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px; }
        .header-title { font-size: 20px; font-weight: bold; color: #000000; }
        .header-sub { font-size: 13px; color: #555555; }
        .job-id-box { text-align: right; }
        .job-id-label { font-size: 11px; font-weight: bold; color: #444; }
        .job-id { font-size: 18px; font-weight: bold; color: #000000; }
        
        .section-title { font-size: 14px; font-weight: bold; color: #111111; border-bottom: 1px solid #999999; padding-bottom: 4px; margin-bottom: 10px; margin-top: 20px;}
        
        .form-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 13px; }
        .form-table th, .form-table td { border: 1px solid #cbd5e1; padding: 6px 10px; vertical-align: top; }
        .form-table th { background-color: #f8fafc; color: #475569; font-size: 11px; text-transform: uppercase; text-align: left; width: 15%; }
        .form-table td { color: #0f172a; width: 35%; }
        .form-table .full-row th { width: 15%; }
        .form-table .full-row td { width: 85%; }
        
        .text-block { margin-bottom: 15px; }
        .text-content { border-bottom: 1px dotted #cbd5e1; padding: 5px 0; min-height: 25px; }
        
        .photo-table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        .photo-table td { width: 50%; padding: 0 10px; vertical-align: top; }
        .photo-box { border: 1px solid #cbd5e1; border-radius: 4px; overflow: hidden; }
        .photo-header { background-color: #f1f5f9; padding: 5px; text-align: center; font-size: 11px; font-weight: bold; color: #475569; border-bottom: 1px solid #cbd5e1; }
        .photo-content { height: 200px; display: flex; align-items: center; justify-content: center; background-color: #fff; padding: 10px; }
        .photo-content img { max-width: 100%; max-height: 100%; object-fit: contain; }
        .no-image { color: #94a3b8; font-size: 12px; font-style: italic; }

        .spare-parts-table { width: 100%; border-collapse: collapse; margin-top: 0; font-size: 12px; }
        .spare-parts-table th, .spare-parts-table td { border: 1px solid #cbd5e1; padding: 6px 8px; }
        .spare-parts-table th { background-color: #f1f5f9; font-weight: bold; text-align: left; color: #475569; }
        .spare-parts-table .text-right { text-align: right; }
        .spare-parts-table .text-center { text-align: center; }
        .spare-parts-table .total-row td { background-color: #f8fafc; font-weight: bold; }
        .spare-parts-table .text-danger { color: #b91c1c; }

        .signature-table { width: 100%; margin-top: 5px; }
        .signature-table td { width: 50%; text-align: center; }
        .signature-space { height: 35px; }
        .signature-line { width: 60%; border-top: 1px solid #000; margin: 0 auto; padding-top: 5px; }
        .signature-name { font-size: 13px; font-weight: bold; color: #0f172a; margin-bottom: 2px; }
        .signature-title { font-size: 11px; color: #64748b; }
        
        .keep-together { page-break-inside: avoid; break-inside: avoid; }
    </style>
</head>
<body>

    <div class="no-print">
        <button onclick="window.print()" style="padding: 10px 20px; background: #2563eb; color: white; border: none; font-weight: bold; border-radius: 4px; cursor: pointer; box-shadow: 0 2px 5px rgba(0,0,0,0.2);">
            <i class="fas fa-print"></i> PRINT WORK ORDER
        </button>
    </div>

<?php 
foreach ($wo_ids as $current_wo_id):
    $current_wo_id = trim($current_wo_id);
    if (!is_numeric($current_wo_id)) continue;
    
    // 1. Fetch Work Order Data
    $sql = "SELECT W.*, M.machine_name, U1.fullname AS req_fullname, U2.fullname AS tech_fullname
            FROM " . PE_WORK_ORDERS_TABLE . " W WITH (NOLOCK)
            LEFT JOIN " . PE_MACHINES_TABLE . " M WITH (NOLOCK) ON W.machine_id = M.machine_id
            LEFT JOIN USERS U1 WITH (NOLOCK) ON W.requested_by = U1.username
            LEFT JOIN USERS U2 WITH (NOLOCK) ON W.assigned_to = U2.username
            WHERE W.wo_id = ?";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$current_wo_id]);
    $wo = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$wo) {
        echo "<div class='page' style='padding: 20px; color: red;'>Work Order #{$current_wo_id} not found.</div>";
        continue;
    }

    $requested_by_display = $wo['req_fullname'] ? $wo['req_fullname'] : $wo['requested_by'];
    $assigned_to_display = $wo['tech_fullname'] ? $wo['tech_fullname'] : $wo['assigned_to'];

    // 3. Process Image Path
    $photoPath = '';
    if (!empty($wo['image_path'])) {
        $cleanPath = str_replace('../../uploads/', 'uploads/', $wo['image_path']);
        $photoPath = '../../../' . ltrim($cleanPath, '/');
    }

    $photoAfterPath = '';
    if (!empty($wo['photo_after'])) {
        $cleanPathAfter = str_replace('../../uploads/', 'uploads/', $wo['photo_after']);
        $photoAfterPath = '../../../' . ltrim($cleanPathAfter, '/');
    }

    // Spare Parts
    $sqlParts = "SELECT ABS(t.quantity) AS quantity, i.uom, i.item_code, i.item_name, (ABS(t.quantity) * i.unit_price) AS total_cost 
                 FROM MT_TRANSACTIONS t WITH (NOLOCK)
                 JOIN MT_ITEMS i WITH (NOLOCK) ON t.item_id = i.item_id
                 WHERE t.pe_wo_id = ? AND t.transaction_type = 'ISSUE'";
    $stmtParts = $pdo->prepare($sqlParts);
    $stmtParts->execute([$current_wo_id]);
    $partsData = $stmtParts->fetchAll(PDO::FETCH_ASSOC);

    $hasParts = false;
    $totalCost = 0;
    $partsHtml = '<table class="spare-parts-table">';
    $partsHtml .= '<thead><tr><th>รหัสอะไหล่ (Code)</th><th>ชื่ออะไหล่ (Item Name)</th><th class="text-right">จำนวน (Qty)</th><th class="text-right">ราคารวม (Total Cost)</th></tr></thead><tbody>';

    foreach ($partsData as $p) {
        $hasParts = true;
        $cost = floatval($p['total_cost']);
        $totalCost += $cost;
        $qty = floatval($p['quantity']);
        $uom = $p['uom'] ?? 'unit';
        $name = $p['item_name'] ?? 'Unknown Part';
        $code = $p['item_code'] ?? '-';
        $partsHtml .= '<tr><td>' . htmlspecialchars($code) . '</td><td>' . htmlspecialchars($name) . '</td><td class="text-right">' . $qty . ' ' . htmlspecialchars($uom) . '</td><td class="text-right">' . number_format($cost, 2) . ' ฿</td></tr>';
    }

    if (!$hasParts) {
        $partsHtml .= '<tr><td colspan="4" class="text-center" style="color:#94a3b8;">ไม่มีการเบิกอะไหล่ (No parts issued)</td></tr>';
    }
    $partsHtml .= '</tbody>';
    if ($hasParts) {
        $partsHtml .= '<tfoot><tr class="total-row"><td colspan="3" class="text-right">Total Cost (รวมราคาอะไหล่)</td><td class="text-right text-danger">' . number_format($totalCost, 2) . ' ฿</td></tr></tfoot>';
    }
    $partsHtml .= '</table>';
?>
    <div class="page" id="page-<?= htmlspecialchars($current_wo_id) ?>">

        <table class="header-table">
            <tr>
                <td width="70%" style="vertical-align: bottom;">
                    <div class="header-title">MAINTENANCE WORK ORDER</div>
                    <div class="header-sub">ใบแจ้งซ่อมเครื่องจักร (PE Enterprise)</div>
                </td>
                <td width="30%" class="job-id-box" style="vertical-align: bottom;">
                    <div style="font-size: 9px; color: #94a3b8; font-style: italic; white-space: nowrap; margin-bottom: 8px;">
                        Generated by MES System | Ref: FM-MTD-013/R00:15/11/17
                    </div>
                    <div class="job-id-label">WO NO.</div>
                    <div class="job-id"><?php echo htmlspecialchars($wo['wo_number']); ?></div>
                </td>
            </tr>
        </table>

        <!-- SECTION 1: REQUEST INFO -->
        <div class="section-title">1. REQUEST INFORMATION (ข้อมูลการแจ้งซ่อม)</div>
        
        <table class="form-table">
            <tr>
                <th>MACHINE</th>
                <td style="font-weight: 600;"><?php echo htmlspecialchars($wo['machine_name'] ?? '-'); ?></td>
                <th>LINE</th>
                <td><?php echo htmlspecialchars($wo['line'] ?? '-'); ?></td>
            </tr>
            <tr>
                <th>REQUESTER</th>
                <td><?php echo htmlspecialchars($requested_by_display ?? '-'); ?></td>
                <th>DATE</th>
                <td><?php echo formatDateTH_PDF($wo['requested_at']) . ' ' . formatTime_PDF($wo['requested_at']); ?></td>
            </tr>
            <tr class="full-row">
                <th>ISSUE SUMMARY</th>
                <td colspan="3" style="font-weight: 600;"><?php echo nl2br(htmlspecialchars($wo['issue_title'] ?? '-')); ?></td>
            </tr>
            <tr class="full-row">
                <th>ISSUE DESC.</th>
                <td colspan="3"><?php echo nl2br(htmlspecialchars($wo['issue_detail'] ?? '-')); ?></td>
            </tr>
        </table>

        <!-- SECTION 2: RESOLUTION INFO -->
        <div class="section-title">2. RESOLUTION DETAILS (รายละเอียดการซ่อม)</div>
        
        <table class="form-table">
            <tr class="full-row">
                <th>ROOT CAUSE</th>
                <td colspan="3"><?php echo nl2br(htmlspecialchars($wo['root_cause'] ?? '-')); ?></td>
            </tr>
            <tr class="full-row">
                <th>ACTION TAKEN</th>
                <td colspan="3"><?php echo nl2br(htmlspecialchars($wo['action_taken'] ?? '-')); ?></td>
            </tr>
            <tr class="full-row">
                <th>SPARE PARTS</th>
                <td colspan="3" style="padding: 0; border: none;">
                    <?php echo $partsHtml; ?>
                </td>
            </tr>
            <tr>
                <th>START TIME</th>
                <td><?php echo formatDateTH_PDF($wo['started_at']) . ' ' . formatTime_PDF($wo['started_at']); ?></td>
                <th>FINISH TIME</th>
                <td><?php echo formatDateTH_PDF($wo['completed_at']) . ' ' . formatTime_PDF($wo['completed_at']); ?></td>
            </tr>
            <tr>
                <th>REPAIR TIME</th>
                <td><?php echo htmlspecialchars($wo['repair_minutes'] ?? '0'); ?> min</td>
                <th>TECHNICIAN</th>
                <td style="font-weight: 600;"><?php echo htmlspecialchars($assigned_to_display ?? '-'); ?></td>
            </tr>
        </table>

        <div class="keep-together" style="position: relative;">
            <!-- SECTION 3: IMAGES -->
            <div class="section-title">3. JOB PHOTOS (รูปภาพประกอบ)</div>
            
            <table class="photo-table">
                <tr>
                    <td>
                        <div class="photo-box">
                            <div class="photo-header">BEFORE</div>
                            <div class="photo-content">
                                <?php if ($photoPath): ?>
                                    <img src="<?php echo $photoPath; ?>">
                                <?php else: ?>
                                    <span class="no-image">- No Image -</span>
                                <?php endif; ?>
                            </div>
                        </div>
                    </td>
                    <td>
                        <div class="photo-box">
                            <div class="photo-header">AFTER</div>
                            <div class="photo-content">
                                <?php if ($photoAfterPath): ?>
                                    <img src="<?php echo $photoAfterPath; ?>">
                                <?php else: ?>
                                    <span class="no-image">- No Image -</span>
                                <?php endif; ?>
                            </div>
                        </div>
                    </td>
                </tr>
            </table>

            <!-- SECTION 4: SIGNATURES -->
            <table class="signature-table">
            <tr>
                <td>
                    <div class="signature-space"></div>
                    <div class="signature-line">
                        <div class="signature-name">( <?php echo !empty(trim($requested_by_display ?? '')) ? htmlspecialchars($requested_by_display) : '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;'; ?> )</div>
                        <div class="signature-title">REQUESTER SIGNATURE</div>
                    </div>
                </td>
                <td>
                    <div class="signature-space"></div>
                    <div class="signature-line">
                        <div class="signature-name">( <?php echo !empty(trim($assigned_to_display ?? '')) ? htmlspecialchars($assigned_to_display) : '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;'; ?> )</div>
                        <div class="signature-title">TECHNICIAN SIGNATURE</div>
                    </div>
                </td>
            </tr>
            </table>
        </div>
        </div>
    </div>
<?php endforeach; ?>

</body>
</html>
