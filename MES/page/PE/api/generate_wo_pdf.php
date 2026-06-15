<?php
// Path: MES/page/PE/api/generate_wo_pdf.php

require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../components/init.php';

requirePermission(['view_maintenance', 'view_production', 'view_dashboard']);

$wo_id = $_GET['wo_id'] ?? null;
if (!$wo_id) {
    die("Work Order ID is required.");
}

// 1. Fetch Work Order Data
$sql = "SELECT W.*, M.machine_name, U1.fullname AS req_fullname, U2.fullname AS tech_fullname
        FROM " . PE_WORK_ORDERS_TABLE . " W WITH (NOLOCK)
        LEFT JOIN " . PE_MACHINES_TABLE . " M WITH (NOLOCK) ON W.machine_id = M.machine_id
        LEFT JOIN USERS U1 WITH (NOLOCK) ON W.requested_by = U1.username
        LEFT JOIN USERS U2 WITH (NOLOCK) ON W.assigned_to = U2.username
        WHERE W.wo_id = ?";
$stmt = $pdo->prepare($sql);
$stmt->execute([$wo_id]);
$wo = $stmt->fetch(PDO::FETCH_ASSOC);

$requested_by_display = $wo['req_fullname'] ? $wo['req_fullname'] : $wo['requested_by'];
$assigned_to_display = $wo['tech_fullname'] ? $wo['tech_fullname'] : $wo['assigned_to'];

if (!$wo) {
    die("Work Order not found.");
}

// Helper Functions
if (!function_exists('formatDateTH_PDF')) {
    function formatDateTH_PDF($date) { return $date ? date('d/m/Y', strtotime($date)) : "-"; }
}
if (!function_exists('formatTime_PDF')) {
    function formatTime_PDF($date) { return $date ? date('H:i', strtotime($date)) : "-"; }
}

// 3. Process Image Path (For HTML img src, we use relative web paths)
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

$parts = preg_split('/[\r\n]+/', $wo['parts_used'] ?? '');
$hasParts = false;
$partsHtml = '';
foreach ($parts as $part) {
    $part = trim($part);
    if (!empty($part)) {
        $hasParts = true;
        $partsHtml .= '<div class="value">- ' . htmlspecialchars(ltrim($part, '.-• ')) . '</div>';
    }
}
if (!$hasParts) $partsHtml = '<div class="value">-</div>';

?>
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <title>WO_<?php echo htmlspecialchars($wo['wo_number']); ?></title>
    <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="../../../utils/libs/fontawesome/css/all.min.css">
    
    <style>
        /* === A4 SETTINGS === */
        @page { size: A4 portrait; margin: 10mm; }

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
            padding: 15mm; 
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
        }

        /* --- STYLES --- */
        .header-table { width: 100%; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px; }
        .header-title { font-size: 20px; font-weight: bold; color: #000000; }
        .header-sub { font-size: 13px; color: #555555; }
        .job-id-box { text-align: right; }
        .job-id-label { font-size: 11px; font-weight: bold; color: #444; }
        .job-id { font-size: 18px; font-weight: bold; color: #000000; }
        
        .section-title { font-size: 14px; font-weight: bold; color: #111111; border-bottom: 1px solid #999999; padding-bottom: 4px; margin-bottom: 10px; margin-top: 20px;}
        
        .info-grid { display: flex; flex-wrap: wrap; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 10px; margin-bottom: 10px; }
        .info-col { flex: 1; min-width: 20%; padding: 0 10px; border-right: 1px solid #e2e8f0; }
        .info-col:last-child { border-right: none; }
        
        .label { color: #64748b; font-size: 10px; font-weight: bold; text-transform: uppercase; margin-bottom: 2px; }
        .value { color: #0f172a; font-size: 13px; font-weight: 600; }
        .value-normal { color: #0f172a; font-size: 13px; }
        
        .text-block { margin-bottom: 15px; }
        .text-content { border-bottom: 1px dotted #cbd5e1; padding: 5px 0; min-height: 25px; }
        
        .photo-table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        .photo-table td { width: 50%; padding: 0 10px; vertical-align: top; }
        .photo-box { border: 1px solid #cbd5e1; border-radius: 4px; overflow: hidden; }
        .photo-header { background-color: #f1f5f9; padding: 5px; text-align: center; font-size: 11px; font-weight: bold; color: #475569; border-bottom: 1px solid #cbd5e1; }
        .photo-content { height: 220px; display: flex; align-items: center; justify-content: center; background-color: #fff; padding: 10px; }
        .photo-content img { max-width: 100%; max-height: 100%; object-fit: contain; }
        .no-image { color: #94a3b8; font-size: 12px; font-style: italic; }

        .signature-table { width: 100%; margin-top: 5px; }
        .signature-table td { width: 50%; text-align: center; }
        .signature-space { height: 35px; }
        .signature-line { width: 60%; border-top: 1px solid #000; margin: 0 auto; padding-top: 5px; }
        .signature-name { font-size: 13px; font-weight: bold; color: #0f172a; margin-bottom: 2px; }
        .signature-title { font-size: 11px; color: #64748b; }

        .footer { position: absolute; bottom: 15px; width: calc(100% - 30mm); text-align: right; font-size: 10px; color: #94a3b8; font-style: italic; }
    </style>
</head>
<body>

    <div class="no-print">
        <button onclick="window.print()" style="padding: 10px 20px; background: #2563eb; color: white; border: none; font-weight: bold; border-radius: 4px; cursor: pointer; box-shadow: 0 2px 5px rgba(0,0,0,0.2);">
            <i class="fas fa-print"></i> PRINT WORK ORDER
        </button>
    </div>

    <div class="page" id="page-1">
        
        <table class="header-table">
            <tr>
                <td width="70%">
                    <div class="header-title">MAINTENANCE WORK ORDER</div>
                    <div class="header-sub">ใบแจ้งซ่อมเครื่องจักร (PE Enterprise)</div>
                </td>
                <td width="30%" class="job-id-box">
                    <div class="job-id-label">WO NO.</div>
                    <div class="job-id"><?php echo htmlspecialchars($wo['wo_number']); ?></div>
                </td>
            </tr>
        </table>

        <!-- SECTION 1: REQUEST INFO -->
        <div class="section-title">1. REQUEST INFORMATION (ข้อมูลการแจ้งซ่อม)</div>
        
        <div class="info-grid">
            <div class="info-col">
                <div class="label">MACHINE</div>
                <div class="value"><?php echo htmlspecialchars($wo['machine_name'] ?? '-'); ?></div>
            </div>
            <div class="info-col">
                <div class="label">LINE</div>
                <div class="value-normal"><?php echo htmlspecialchars($wo['line'] ?? '-'); ?></div>
            </div>
            <div class="info-col">
                <div class="label">REQUESTER</div>
                <div class="value-normal"><?php echo htmlspecialchars($requested_by_display ?? '-'); ?></div>
            </div>
            <div class="info-col">
                <div class="label">DATE</div>
                <div class="value-normal"><?php echo formatDateTH_PDF($wo['requested_at']) . ' ' . formatTime_PDF($wo['requested_at']); ?></div>
            </div>
        </div>

        <div class="text-block">
            <div class="label">ISSUE SUMMARY (หัวข้อปัญหา)</div>
            <div class="text-content value"><?php echo nl2br(htmlspecialchars($wo['issue_title'] ?? '-')); ?></div>
        </div>
        
        <div class="text-block">
            <div class="label">ISSUE DESCRIPTION (รายละเอียดปัญหา)</div>
            <div class="text-content value-normal"><?php echo nl2br(htmlspecialchars($wo['issue_detail'] ?? '-')); ?></div>
        </div>

        <!-- SECTION 2: RESOLUTION INFO -->
        <div class="section-title">2. RESOLUTION DETAILS (รายละเอียดการซ่อม)</div>
        
        <div class="text-block">
            <div class="label">ROOT CAUSE (สาเหตุรากฐาน)</div>
            <div class="text-content value-normal"><?php echo nl2br(htmlspecialchars($wo['root_cause'] ?? '-')); ?></div>
        </div>
        
        <div class="text-block">
            <div class="label">ACTION TAKEN (การแก้ไข)</div>
            <div class="text-content value-normal"><?php echo nl2br(htmlspecialchars($wo['action_taken'] ?? '-')); ?></div>
        </div>

        <div class="text-block">
            <div class="label">SPARE PARTS (อะไหล่ที่ใช้)</div>
            <div class="text-content"><?php echo $partsHtml; ?></div>
        </div>

        <div class="info-grid">
            <div class="info-col">
                <div class="label">START TIME</div>
                <div class="value-normal"><?php echo formatDateTH_PDF($wo['started_at']) . ' ' . formatTime_PDF($wo['started_at']); ?></div>
            </div>
            <div class="info-col">
                <div class="label">FINISH TIME</div>
                <div class="value-normal"><?php echo formatDateTH_PDF($wo['completed_at']) . ' ' . formatTime_PDF($wo['completed_at']); ?></div>
            </div>
            <div class="info-col">
                <div class="label">REPAIR TIME</div>
                <div class="value-normal"><?php echo htmlspecialchars($wo['repair_minutes'] ?? '0'); ?> min</div>
            </div>
            <div class="info-col">
                <div class="label">TECHNICIAN</div>
                <div class="value"><?php echo htmlspecialchars($assigned_to_display ?? '-'); ?></div>
            </div>
        </div>

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
                        <div class="signature-name">( <?php echo htmlspecialchars($requested_by_display ?? '-'); ?> )</div>
                        <div class="signature-title">REQUESTER SIGNATURE</div>
                    </div>
                </td>
                <td>
                    <div class="signature-space"></div>
                    <div class="signature-line">
                        <div class="signature-name">( <?php echo htmlspecialchars($assigned_to_display ?? '-'); ?> )</div>
                        <div class="signature-title">TECHNICIAN SIGNATURE</div>
                    </div>
                </td>
            </tr>
        </table>

        <div class="footer">
            Generated by MES System | Ref: FM-MTD-013/R00:15/11/17
        </div>
    </div>

</body>
</html>
