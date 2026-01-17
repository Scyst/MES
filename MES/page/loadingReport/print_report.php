<?php
// page/loading/print_report.php
require_once __DIR__ . '/../components/init.php';
require_once __DIR__ . '/loading_config.php';
require_once __DIR__ . '/../db.php'; 

if (!isset($_GET['report_id'])) die("Error: Missing Report ID");
$report_id = $_GET['report_id'];

// 1. ดึงข้อมูล
$sql = "SELECT r.*, s.po_number, s.booking_no, s.quantity, s.sku, s.description, s.invoice_no,
               s.container_no as plan_container, s.seal_no as plan_seal
        FROM " . LOADING_REPORTS_TABLE . " r
        LEFT JOIN " . SALES_ORDERS_TABLE . " s ON r.sales_order_id = s.id
        WHERE r.id = ?";
$stmt = $pdo->prepare($sql);
$stmt->execute([$report_id]);
$header = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$header) die("Error: Report not found");

// 2. ดึงรูป
$photos = [];
$sqlPhoto = "SELECT photo_type, file_path FROM " . LOADING_PHOTOS_TABLE . " WHERE report_id = ?";
$stmtP = $pdo->prepare($sqlPhoto);
$stmtP->execute([$report_id]);
while ($row = $stmtP->fetch(PDO::FETCH_ASSOC)) {
    $photos[$row['photo_type']] = $row['file_path'];
}

// 3. ดึงผล Checklist
$checklist_results = [];
$sqlCheck = "SELECT topic_id, item_index, result, remark FROM " . LOADING_RESULTS_TABLE . " WHERE report_id = ?";
$stmtC = $pdo->prepare($sqlCheck);
$stmtC->execute([$report_id]);
while ($row = $stmtC->fetch(PDO::FETCH_ASSOC)) {
    $checklist_results[$row['topic_id']][$row['item_index']] = $row;
}

// --- HELPER FUNCTIONS ---
function renderCheckbox($result, $targetValue) {
    $isChecked = ($result === $targetValue);
    $symbol = $isChecked ? '&#9745;' : '&#9744;'; 
    $style = $isChecked ? 'font-weight:bold; color:black;' : 'color:#999;';
    return "<span style='font-size: 16px; $style'>{$symbol}</span>";
}

function renderContainerTypeCheck($currentType, $targetType) {
    $map = ["20'" => "20'", "40'" => "40'ST", "40'HC" => "40'HC", "45'" => "45'"];
    $dbValue = isset($map[$currentType]) ? $map[$currentType] : $currentType;
    $isMatch = ($dbValue === $targetType);
    $mark = $isMatch ? '<span style="color:blue; font-weight:bold; position:absolute; bottom:0px; left:50%; transform:translateX(-50%);">&#10003;</span>' : '';
    
    return "<span style='display:inline-block; margin-right:10px; position:relative;'>
        <span style='display:inline-block; border-bottom:1px solid #000; width:20px; height:12px; position:relative;'>$mark</span> 
        $targetType
    </span>";
}
?>
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <title>Report_<?php echo $header['po_number']; ?></title>
    <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;600;700&display=swap" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <style>
        /* 1. ตั้งค่าหน้ากระดาษหลัก (สำหรับหน้า 1) = ขอบ 0 */
        @page { 
            size: A4; 
            margin: 0; 
        }

        /* 2. [เพิ่มใหม่] ตั้งค่าหน้ากระดาษสำหรับ C-TPAT โดยเฉพาะ = มีขอบบนล่าง 20mm ซ้ายขวา 15mm */
        /* วิธีนี้จะทำให้ทุกหน้าที่เนื้อหาไหลไปถึง มีขอบเว้นอัตโนมัติครับ */
        @page ctpat_pages {
            margin: 20mm 15mm; 
        }

        @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .no-print { display: none !important; }
            .page-break { page-break-before: always; }
            
            /* หน้าทั่วไป (หน้า 1) */
            .page { 
                margin: 0 !important; 
                border: initial !important; 
                width: 210mm !important; 
                min-height: 100% !important; 
                box-shadow: none !important; 
                page-break-after: always;
            }

            /* หน้า 1 (Toolbox) - ล็อคความสูง A4 เพื่อดัน Footer */
            .page.page-fixed {
                height: 297mm !important; 
                overflow: hidden !important; 
                position: relative !important; 
            }

            /* [เพิ่มใหม่] หน้า 2+ (C-TPAT) - เรียกใช้กฎ ctpat_pages */
            .page.page-ctpat {
                page: ctpat_pages; /* สั่งให้ใช้ Margin แบบมีขอบ */
                width: auto !important; 
                height: auto !important; 
                padding: 0 !important; /* ลบ Padding ของ div ออก (เพราะใช้ Margin ของกระดาษแทนแล้ว) */
                margin: 0 !important;
                overflow: visible !important; 
            }
        }

        /* --- GENERAL STYLES (Screen) --- */
        body { font-family: 'Sarabun', sans-serif; font-size: 12px; line-height: 1.3; color: #000; background: #555; margin: 0; padding: 0; }
        
        .page {
            width: 210mm; 
            min-height: 297mm;
            padding: 10mm 10mm; 
            margin: 10mm auto; 
            background: white; 
            position: relative; 
            box-sizing: border-box;
            box-shadow: 0 0 10px rgba(0,0,0,0.5); 
        }

        /* --- PAGE 1 STYLES --- */
        .page-1-header { text-align: center; margin-bottom: 2px; margin-top: 5px; }
        .truck-icon { font-size: 24px; color: #2c5aa0; margin-bottom: 2px; }
        .page-1-title { font-size: 14px; font-weight: bold; color: #333; text-transform: uppercase; letter-spacing: 1px; }
        .loading-date { font-size: 10px; font-weight: bold; margin-bottom: 2px; text-transform: uppercase; }
        
        .green-table { width: 100%; border-collapse: collapse; font-size: 9px; margin-bottom: 5px; }
        .green-table th { background-color: #6dae48; color: black; border: 1px solid #000; padding: 4px 2px; text-align: center; font-weight: bold; vertical-align: middle; }
        .green-table td { border: 1px solid #000; padding: 4px 2px; text-align: center; vertical-align: middle; height: 25px; }

        .photo-table { width: 100%; border-collapse: collapse; margin-top: 0px; table-layout: fixed; }
        .photo-table td { border: 1px solid #000; padding: 0; vertical-align: top; width: 25%; height: auto; }
        .photo-label-top { text-align: center; font-size: 8px; font-weight: bold; padding: 2px 0; border-bottom: 1px solid #000; text-transform: uppercase; background-color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .photo-img-box { height: 255px; display: flex; align-items: center; justify-content: center; overflow: hidden; padding: 5px; box-sizing: border-box; }
        .photo-img-box img { width: 100%; height: 100%; object-fit: cover; }

        .page-footer-blue { position: absolute; bottom: 30px; left: 10mm; right: 10mm; height: 40px; background-color: #8faadc; border: 1px solid #000; display: flex; align-items: center; justify-content: center; padding: 0 20px; box-sizing: border-box; }
        .footer-scan { color: red; font-weight: bold; font-size: 16px; font-style: italic; position: absolute; left: 20px; }
        .footer-text { color: black; font-weight: bold; font-size: 12px; text-decoration: underline; }

        /* --- PAGE 2 STYLES --- */
        .ctpat-header-table { width: 100%; border-collapse: collapse; margin-bottom: 0; border: 1px solid #000; }
        .ctpat-header-table td { border: 1px solid #000; vertical-align: top; padding: 0 0 2px 2px; }
        .form-label { font-size: 9px; color: #000; font-weight: bold; margin-right: 5px; }
        .form-value { font-size: 9px; font-weight: bold; color: blue; font-family: 'Sarabun', sans-serif; }
        .top-brand-row td { border: 1px solid #000; vertical-align: middle; padding: 8px 0; text-align: center; }
        .brand-snc { font-size: 20px; font-weight: bold; font-style: italic; }
        .brand-title { font-size: 11px; font-weight: bold; }
        .chk-table { width: 100%; border-collapse: collapse; font-size: 9px; margin-top: -1px; }
        .chk-table th, .chk-table td { border: 1px solid #000; padding: 2px; vertical-align: middle; }
        .chk-table th { background-color: #e0e0e0; text-align: center; font-weight: bold; border-top: 2px solid #000; }
        .topic-row { background-color: #f0f0f0; font-weight: bold; border-top: 2px solid #000;}
        .sub-item-row td { border-top: 1px dotted #ccc; }
        .col-res { text-align: center; width: 40px; }
        .col-res span { display: block; line-height: 1; }
    </style>
</head>
<body>

    <div class="no-print" style="position: fixed; top: 10px; right: 10px; z-index: 999;">
        <button onclick="window.print()" style="padding: 10px 20px; cursor: pointer; background: #007bff; color: white; border: none; font-weight: bold; border-radius: 4px; box-shadow: 0 2px 5px rgba(0,0,0,0.2);">
            🖨️ PRINT REPORT
        </button>
    </div>

    <div class="page page-fixed">
        <div class="page-1-header">
            <div class="truck-icon"><i class="fas fa-truck-moving"></i></div>
            <div class="page-1-title">LOADING REPORT TOOLBOX</div>
        </div>

        <div class="loading-date">LOADING DATE: <?php echo date('d/m/Y', strtotime($header['created_at'])); ?></div>

        <table class="green-table">
            <thead>
                <tr>
                    <th width="12%">INVOICE</th>
                    <th width="12%">BOOKING NO.</th>
                    <th width="12%">PO.</th>
                    <th width="12%">CONTAINER NO</th>
                    <th width="12%">SEAL NO</th>
                    <th width="12%">CABLE SEAL</th>
                    <th width="16%">DESCRIPTION</th>
                    <th width="8%">QTY</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td><?php echo $header['invoice_no']; ?></td>
                    <td><?php echo $header['booking_no']; ?></td>
                    <td><?php echo $header['po_number']; ?></td>
                    <td><?php echo $header['container_no']; ?></td>
                    <td><?php echo $header['seal_no']; ?></td>
                    <td><?php echo $header['cable_seal'] ?? '-'; ?></td>
                    <td><?php echo $header['description']; ?></td>
                    <td><?php echo number_format($header['quantity']); ?></td>
                </tr>
            </tbody>
        </table>

        <table class="photo-table">
            <?php 
            $photo_list = [
                'GUARD_PASS'  => '1. Security Pass',
                'SEAL_DOC'    => '2. Seal Document',
                'SEAL_UNLOCK' => '3. Seal Unlocked',
                'SEAL_LOCK'   => '4. Seal Locked',
                'CONT_NUM'    => '5. Container No.',
                'EMPTY'       => '6. Empty Container',
                'STUFF50'     => '7. Stuffing 50%',
                'STUFF100'    => '8. Stuffing 100%',
                'DOOR_R'      => '9. Door Right',
                'DOOR_FULL'   => '10. Door Closed'
            ];
            $chunks = array_chunk($photo_list, 4, true);
            foreach ($chunks as $rowItems):
            ?>
            <tr>
                <?php foreach ($rowItems as $key => $label): 
                    $img = isset($photos[$key]) ? $photos[$key] : '';
                ?>
                <td>
                    <div class="photo-label-top"><?php echo $label; ?></div>
                    <div class="photo-img-box">
                        <?php if ($img): ?>
                            <img src="<?php echo $img; ?>">
                        <?php else: ?>
                            <span style="color:#ccc; font-size:10px;">No Image</span>
                        <?php endif; ?>
                    </div>
                </td>
                <?php endforeach; ?>
                <?php 
                $missing = 4 - count($rowItems);
                if ($missing > 0) {
                    for ($i=0; $i < $missing; $i++) echo "<td></td>"; 
                }
                ?>
            </tr>
            <?php endforeach; ?>
        </table>

        <div class="page-footer-blue">
            <span class="footer-scan">SCAN</span>
            <span class="footer-text">ใบตรวจสอบสภาพตู้สินค้า</span>
        </div>
    </div>

    <div class="page page-break page-ctpat">
        
        <table class="ctpat-header-table">
            <tr class="top-brand-row">
                <td width="50%">
                    <span class="brand-snc">SNC</span>
                </td>
                <td width="50%">
                    <div class="brand-title">C-TPAT 10-Point Container Inspection Checklist</div>
                </td>
            </tr>
        </table>

        <table class="ctpat-header-table" style="margin-top: -1px;">
            <tr>
                <td width="62%"> 
                    <span class="form-label">Loading Location : SNC Creativity Anthology Company (WH-B10) </span>
                    <span class="form-value">WH ประตู 1</span>
                </td>
                <td width="38%">
                    <span class="form-label">PO Number หมายเลขคำสั่งซื้อ :</span>
                    <span class="form-value"><?php echo $header['po_number']; ?></span>
                </td>
            </tr>
            <tr>
                <td>
                    <div style="display:flex;">
                        <div style="width:40%;">
                            <span class="form-label">Date วันที่ :</span>
                            <span class="form-value"><?php echo date('d/m/Y', strtotime($header['created_at'])); ?></span>
                        </div>
                        <div style="width:60%;">
                            <span class="form-label">Time เวลา :</span>
                            <span class="form-value"><?php echo date('H:i', strtotime($header['created_at'])); ?></span>
                        </div>
                    </div>
                </td>
                <td>
                    <span class="form-label">Quantity (Units) จำนวนสินค้า :</span>
                    <span class="form-value"><?php echo number_format($header['quantity']); ?> PCS</span>
                </td>
            </tr>
            <tr>
                <td>
                    <span class="form-label">Container Number หมายเลขตู้คอนเทนเนอร์ :</span>
                    <span class="form-value"><?php echo $header['container_no']; ?></span>
                </td>
                <td>
                    <span class="form-label">SKU Number หมายเลข SKU :</span>
                    <span class="form-value"><?php echo $header['sku']; ?></span>
                </td>
            </tr>
            <tr>
                <td>
                    <span class="form-label">Container Seal Number หมายเลขซีล :</span>
                    <span class="form-value"><?php echo $header['seal_no']; ?></span>
                </td>
                <td>
                    <span class="form-label">Car Number ทะเบียนรถ :</span>
                    <span class="form-value"><?php echo $header['car_license']; ?></span>
                </td>
            </tr>
            <tr>
                <td>
                    <span class="form-label">Booking/Bill of Lading Number หมายเลข Booking :</span>
                    <span class="form-value"><?php echo $header['booking_no']; ?></span>
                </td>
                <td>
                    <span class="form-label">Vender ชื่อขนส่ง :</span>
                    <span class="form-value"><?php echo $header['driver_name'] ? $header['driver_name'] : '-'; ?></span>
                </td>
            </tr>
            <tr>
                <td colspan="2" style="vertical-align: middle; padding: 8px 5px;">
                    <span class="form-label">Container Type ขนาดตู้คอนเทนเนอร์ :</span>
                    <span class="form-label">
                        <?php echo renderContainerTypeCheck($header['container_type'], "20'"); ?>
                        <?php echo renderContainerTypeCheck($header['container_type'], "40'ST"); ?>
                        <?php echo renderContainerTypeCheck($header['container_type'], "40'HC"); ?>
                        <?php echo renderContainerTypeCheck($header['container_type'], "45'"); ?>
                    </span>
                </td>
            </tr>
        </table>

        <table class="ctpat-header-table" style="margin-top: -1px;">
            <tr>
                <td width="50%">
                    <span class="form-label">Supervisor / Mini-MD หัวหน้าแผนก หรือ ผู้จัดการ :</span>
                </td>
                <td width="50%">
                    <span class="form-label">Inspector name ผู้ตรวจสอบตู้ :</span>
                    <span class="form-value" style="font-size:12px; margin-left: 10px;">
                        <?php echo $_SESSION['user']['name'] ?? '-'; ?>
                    </span>
                </td>
            </tr>
        </table>

        <table class="chk-table">
            <thead>
                <tr>
                    <th rowspan="2" style="width: 50%;">Inspection Point / Result<br>(จุดตรวจสอบ / ผลการตรวจสอบ)</th>
                    <th colspan="3" style="width: 20%;">Results<br>ผลการตรวจสอบ</th>
                    <th rowspan="2">Objective evidence & Comment<br>หลักฐาน และข้อคิดเห็น</th>
                </tr>
                <tr>
                    <th class="col-res">Pass<br>ผ่าน</th>
                    <th class="col-res">Fail<br>ไม่ผ่าน</th>
                    <th class="col-res">N/A</th>
                </tr>
            </thead>
            <tbody>
                <?php 
                $master = getCtpatChecklist();
                foreach ($master as $topicId => $topic): 
                ?>
                <tr class="topic-row">
                    <td colspan="5"><?php echo $topicId . '. ' . $topic['title']; ?></td>
                </tr>
                <?php 
                    foreach ($topic['items'] as $idx => $itemName): 
                        $itemIdx = $idx + 1;
                        $data = $checklist_results[$topicId][$itemIdx] ?? ['result'=>'', 'remark'=>''];
                ?>
                <tr class="sub-item-row">
                    <td style="padding-left: 15px;">
                        <?php echo $itemName; ?>
                    </td>
                    <td class="col-res">
                        <?php echo renderCheckbox($data['result'], 'PASS'); ?>
                    </td>
                    <td class="col-res">
                        <?php echo renderCheckbox($data['result'], 'FAIL'); ?>
                    </td>
                    <td class="col-res">
                        <?php echo renderCheckbox($data['result'], 'N/A'); ?>
                    </td>
                    <td>
                        <?php echo htmlspecialchars($data['remark']); ?>
                    </td>
                </tr>
                <?php endforeach; ?>
                <?php endforeach; ?>
            </tbody>
        </table>
    </div>

</body>
</html>