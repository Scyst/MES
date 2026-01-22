<?php
// page/loading/print_report.php
require_once __DIR__ . '/../components/init.php';
require_once __DIR__ . '/loading_config.php';
require_once __DIR__ . '/../db.php'; 

if (!isset($_GET['report_id'])) die("Error: Missing Report ID");
$report_id = $_GET['report_id'];

// 1. ดึงข้อมูล (ใช้ Query จากเวอร์ชันเก่า เพื่อให้ได้ field ครบ)
$sql = "SELECT r.*, s.po_number, s.booking_no, s.quantity, s.sku, s.description, s.invoice_no, s.snc_ci_no,
               s.container_no as plan_container, s.seal_no as plan_seal,
               r.driver_name, r.inspector_name, r.supervisor_name, r.cable_seal
        FROM " . LOADING_REPORTS_TABLE . " r
        LEFT JOIN " . SALES_ORDERS_TABLE . " s ON r.sales_order_id = s.id
        WHERE r.id = ?";
$stmt = $pdo->prepare($sql);
$stmt->execute([$report_id]);
$header = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$header) die("Error: Report not found");

$location_show = !empty($header['loading_location']) ? $header['loading_location'] : 'SNC Creativity Anthology Company (WH-B10)';
$time_str = "";
$date_show = "";

if (!empty($header['loading_start_time']) && !empty($header['loading_end_time'])) {
    $t_start = date('H:i', strtotime($header['loading_start_time']));
    $t_end   = date('H:i', strtotime($header['loading_end_time']));
    $date_show = date('d/m/Y', strtotime($header['loading_start_time'])); // ใช้วันที่เริ่มงาน
    $time_str = "$t_start - $t_end";
} else {
    // Fallback: ใช้ข้อมูล Created_at เดิม ถ้ายังไม่ได้กรอกใหม่
    $date_show = date('d/m/Y', strtotime($header['created_at']));
    $time_str = date('H:i', strtotime($header['created_at']));
}

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

$manual_master = getOfficialChecklist();

// Helpers (ใช้ Function เดิมจาก Layout ใหม่ ถ้า Logic เหมือนกัน)
function renderCheckbox($result, $targetValue) {
    $isChecked = ($result === $targetValue);
    $symbol = $isChecked ? '&#9745;' : '&#9744;'; 
    $style = $isChecked ? 'font-weight:bold; color:black;' : 'color:#999;';
    return "<span style='font-size: 16px; $style'>{$symbol}</span>";
}
// ฟังก์ชัน Helper (ถ้ายังไม่มี หรือแก้ของเดิมให้ยืดหยุ่นขึ้น)
function renderContainerTypeCheck($currentValue, $targetLabel, $displayLabel = null) {
    if ($displayLabel === null) $displayLabel = $targetLabel;
    $isChecked = ($currentValue === $targetLabel);
    
    $mark = $isChecked ? '<span style="color:blue; font-weight:bold; position:absolute; bottom:0px; left:50%; transform:translateX(-50%);">&#10003;</span>' : '';
    
    return "
    <span style='display:inline-block; margin-right:15px; position:relative;'>
        <span style='display:inline-block; border-bottom:1px solid #000; width:20px; height:12px; position:relative;'>
            {$mark}
        </span> {$displayLabel}
    </span>";
}
?>
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <title>Report_<?php echo $header['po_number']; ?></title>
    <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="../../utils/libs/fontawesome/css/all.min.css">
    
    <style>
        /* === A4 SETTINGS === */
        @page { size: A4; margin: 10mm; }

        body { 
            font-family: 'Sarabun', sans-serif; 
            font-size: 12px; 
            line-height: 1.3; 
            color: #000; 
            background: #525659; /* Web View BG */
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

        .no-print { position: fixed; top: 10px; right: 10px; z-index: 9999; }

        /* === GLOBAL FOOTER (Page Number) === */
        .page-number:after { content: "Page " counter(page); }

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
            #page-1 { page-break-after: always; } /* บังคับตัดหน้า 1 */

            /* Layout Fixes */
            thead { display: table-header-group; }
            tfoot { display: table-footer-group; }
            tr { page-break-inside: avoid; }
        }

        /* --- STYLES --- */
        .header-simple { display: flex; justify-content: space-between; font-size: 10px; font-weight: bold; color: #555; margin-bottom: 10px; }
        .page-1-header { text-align: center; margin-bottom: 5px; }
        .truck-icon { font-size: 24px; color: #2c5aa0; margin-bottom: 2px; }
        .page-1-title { font-size: 14px; font-weight: bold; color: #333; text-transform: uppercase; }
        .loading-date { font-size: 10px; font-weight: bold; margin-bottom: 5px; text-transform: uppercase; }
        
        .green-table { width: 100%; border-collapse: collapse; font-size: 9px; margin-bottom: 5px; }
        .green-table th { background-color: #6dae48; color: black; border: 1px solid #000; padding: 3px; text-align: center; }
        .green-table td { border: 1px solid #000; padding: 3px; text-align: center; height: 20px; }

        .photo-table { width: 100%; border-collapse: collapse; margin-top: 5px; table-layout: fixed; }
        .photo-table td { border: 1px solid #000; padding: 0; vertical-align: top; width: 25%; }
        .photo-label-top { text-align: center; font-size: 8px; font-weight: bold; padding: 2px 0; border-bottom: 1px solid #000; background: #eee; }
        /* ลดความสูงรูปเพื่อกันล้น A4 */
        .photo-img-box { height: 250px; display: flex; align-items: center; justify-content: center; overflow: hidden; padding: 2px; }
        .photo-img-box img { width: 100%; height: 100%; object-fit: contain; }

        .page-footer-blue { margin-top: 10px; height: 35px; background-color: #8faadc; border: 1px solid #000; display: flex; align-items: center; justify-content: center; position: relative; }
        .footer-scan { color: red; font-weight: bold; font-size: 16px; font-style: italic; position: absolute; left: 20px; }
        .footer-text { color: black; font-weight: bold; font-size: 12px; text-decoration: underline; }

        .ctpat-header-table { width: 100%; border-collapse: collapse; border: 1px solid #000; margin-bottom: 0; }
        .ctpat-header-table td { border: 1px solid #000; vertical-align: top; padding: 0 0 2px 2px; }
        .top-brand-row td { border: 1px solid #000; vertical-align: middle; padding: 8px 0; text-align: center; }
        .form-label { font-size: 9px; font-weight: bold; }
        .form-value { font-size: 9px; font-weight: bold; color: blue; margin-left: 5px; }
        .brand-snc { font-size: 18px; font-weight: bold; font-style: italic; }
        .brand-title { font-size: 11px; font-weight: bold; text-align: center;}

        .chk-table { width: 100%; border-collapse: collapse; font-size: 8px; margin-top: -1px; }
        .chk-table th, .chk-table td { border: 1px solid #000;padding: 2px 0 3px 2px; vertical-align: middle; }
        .chk-table th { background-color: #e0e0e0; text-align: center; }
        .topic-row td { background-color: #f0f0f0; font-weight: bold; border-top: 2px solid #000; }
        .col-res { text-align: center; width: 35px; }
        .note-row td { background: #fff; font-style: italic; color: #444; padding: 2px; }
        .sub-item-row td { border-top: 1px dotted #ccc; }
        
        /* Ghost Header Styling */
        .repeat-header-content { display: flex; justify-content: space-between; font-size: 8px; font-weight: bold; color: #555; margin-bottom: 10px; }
    </style>
</head>
<body>

    <div class="no-print">
        <button onclick="window.print()" style="padding: 10px 20px 10px 15px; background: #007bff; color: white; border: none; font-weight: bold; border-radius: 4px; cursor: pointer;">
            🖨️ PRINT REPORT
        </button>
    </div>

    <div class="page" id="page-1">
        <div class="header-simple">
            <div>SNC Creativity Anthology Co., Ltd.</div>
            <div>InspectionOOCU4988902</div>
        </div>

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
                    <td><?php echo $header['snc_ci_no']; ?></td>
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
                'undercarriage' => '1. Gate Pass (ใบผ่าน รปภ.)',
                'outside_door' => '2. Seal Condition (สภาพซีล)',
                'right_side' => '3. Container No. (เบอร์ตู้)',
                'left_side' => '4. Empty Container (ตู้เปล่า)',
                'front_wall' => '5. Half Loaded (ครึ่งตู้)',
                'ceiling_roof' => '6. Full Loaded (เต็มตู้)',
                'floor' => '7. Right Door Closed (ปิดขวา)',
                'inside_empty' => '8. All Doors Closed (ปิด 2 ฝั่ง)',
                'inside_loaded' => '9. Seal Lock (ล็อคซีล)',
                'seal_lock' => '10. Shipping Doc (ใบของออก)'
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
                // --- ส่วนที่ปรับปรุง: สร้างช่องว่างให้มี Layout เหมือนช่องปกติ ---
                $missing = 4 - count($rowItems);
                if ($missing > 0) { 
                    for ($i=0; $i < $missing; $i++) { 
                ?>
                    <td>
                        <div class="photo-label-top">-</div>
                        <div class="photo-img-box"></div>
                    </td>
                <?php 
                    } 
                } 
                ?>
            </tr>
            <?php endforeach; ?>
        </table>

        <div class="page-footer-blue">
            <span class="footer-scan">SCAN</span>
            <span class="footer-text">เอกสารแนบใบตรวจสอบตู้สินค้า</span>
        </div>
    </div>

    <div class="page" id="page-ctpat">
        
        <table style="width: 100%; border-collapse: collapse; border: none;">
            
            <thead>
                <tr>
                    <td style="border: none; padding-bottom: 10px;">
                        <div class="repeat-header-content">
                            <div>SNC Creativity Anthology Co., Ltd.</div>
                            <div>C-TPAT 10-Point กรอก</div>
                        </div>
                    </td>
                </tr>
            </thead>

            <tbody>
                <tr>
                    <td style="border: none;">
                        
                        <table class="ctpat-header-table">
                            <tr class="top-brand-row" style="background-color: #e0e0e0;">
                                <td width="50%" style="text-align:center; padding:8px;">
                                    <span class="brand-snc">SNC</span>
                                </td>
                                <td width="50%" style="text-align:center;">
                                    <div class="brand-title">C-TPAT 10-Point Container Inspection Checklist</div>
                                </td>
                            </tr>
                        </table>

                        <table class="ctpat-header-table" style="margin-top: -1px;">
                            <tr>
                                <td width="60%"> 
                                    <span class="form-label">Loading Location : </span>
                                    <span class="form-value"><?php echo htmlspecialchars($location_show); ?></span>
                                </td>
                                <td width="40%">
                                    <span class="form-label">PO Number หมายเลขคำสั่งซื้อ :</span>
                                    <span class="form-value"><?php echo $header['po_number']; ?></span>
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <div style="display: flex; align-items: center; width: 100%;">
                                        <div style="width: 40%;">
                                            <span class="form-label">Date วันที่ :</span>
                                            <span class="form-value"><?php echo $date_show; ?></span>
                                        </div>
                                        <div style="width: 60%;">
                                            <span class="form-label">Time เวลา :</span>
                                            <span class="form-value"><?php echo $time_str; ?></span>
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
                                    <span class="form-value"><?php echo $header['driver_name'] ?: '-'; ?></span>
                                </td>
                            </tr>
                            <tr>
                                <td colspan="2">
                                    <span class="form-label">Container Type ขนาดตู้คอนเทนเนอร์ :</span>
                                    <span class="form-label">
                                        <?php 
                                        // 1. สร้าง Map แปลงชื่อจาก Database -> ชื่อใน Form
                                        // ฝั่งซ้าย = ค่าใน Database ของคุณ
                                        // ฝั่งขวา = ชื่อตัวเลือกในแบบฟอร์มเอกสารนี้
                                        $typeMapping = [
                                            '20GP' => "20'",
                                            '20HQ' => "20'", // หรือจะ Map ไป Others ก็ได้แล้วแต่ Logic
                                            '40GP' => "40'ST",
                                            '40HQ' => "40'HC",
                                            '40HC' => "40'HC",
                                            '45HQ' => "45'",
                                            // เพิ่ม Mapping อื่นๆ ตามต้องการ
                                        ];

                                        // 2. หาค่าที่แท้จริงที่จะใช้เทียบกับ Form
                                        $dbRawValue = trim($header['container_type']);
                                        $mappedValue = isset($typeMapping[$dbRawValue]) ? $typeMapping[$dbRawValue] : $dbRawValue;

                                        // 3. Render Checkbox 4 ตัวหลัก (เทียบกับ $mappedValue ที่แปลงร่างแล้ว)
                                        echo renderContainerTypeCheck($mappedValue, "20'", "20'"); // ส่งค่า $mappedValue ไปเช็ค
                                        echo renderContainerTypeCheck($mappedValue, "40'ST", "40'ST");
                                        echo renderContainerTypeCheck($mappedValue, "40'HC", "40'HC");
                                        echo renderContainerTypeCheck($mappedValue, "45'", "45'"); 

                                        // 4. Logic สำหรับ "Others" (กรณีแปลงแล้วก็ยังไม่ตรงกับ 4 ตัวหลัก)
                                        $standardFormTypes = ["20'", "40'ST", "40'HC", "45'"];
                                        
                                        // ถ้าค่าที่แปลงแล้ว ไม่อยู่ใน 4 ตัวหลัก -> ถือเป็น Others
                                        $isOther = !in_array($mappedValue, $standardFormTypes) && !empty($dbRawValue);
                                        
                                        $markOther = $isOther ? '<span style="color:blue; font-weight:bold; position:absolute; bottom:0px; left:50%; transform:translateX(-50%);">&#10003;</span>' : '';
                                        // ถ้าเป็น Others ให้โชว์ค่าเดิมจาก DB (เช่น Open Top, Flat Rack)
                                        $otherText = $isOther ? htmlspecialchars($dbRawValue) : '';
                                        ?>

                                        <span style='display:inline-block; margin-right:10px; position:relative;'>
                                            <span style='display:inline-block; border-bottom:1px solid #000; width:20px; height:12px; position:relative;'>
                                                <?php echo $markOther; ?>
                                            </span> 
                                            Others: <span style="border-bottom: 1px dotted #000; min-width: 50px; display: inline-block; color: blue;"><?php echo $otherText; ?></span>
                                        </span>
                                    </span>
                                </td>
                            </tr>
                        </table>

                        <table class="ctpat-header-table" style="margin-top: -1px;">
                            <tr>
                                <td width="50%" style="vertical-align: bottom; padding-bottom: 10px;">
                                    <span class="form-label">Supervisor / Mini-MD หัวหน้าแผนก หรือ ผู้จัดการ :</span>
                                    <div style="text-align: center; margin-top: 5px;">
                                        <span class="form-value" style="font-size: 12px; display: inline-block; border-bottom: 1px dotted #000; min-width: 150px; text-align: center;">
                                            <?php echo $header['supervisor_name'] ?: '&nbsp;'; ?>
                                        </span>
                                        <div style="font-size: 8px; color: #666; margin-top: 2px;">(Signature / Printed Name)</div>
                                    </div>
                                </td>
                                <td width="50%" style="vertical-align: bottom; padding-bottom: 10px;">
                                    <span class="form-label">Inspector name ผู้ตรวจสอบตู้ :</span>
                                    <div style="text-align: center; margin-top: 5px;">
                                        <span class="form-value" style="font-size: 12px; display: inline-block; border-bottom: 1px dotted #000; min-width: 150px; text-align: center;">
                                            <?php echo $header['inspector_name'] ?: '&nbsp;'; ?>
                                        </span>
                                        <div style="font-size: 8px; color: #666; margin-top: 2px;">(Signature / Printed Name)</div>
                                    </div>
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
                                <?php foreach ($manual_master as $topicId => $topic): ?>
                                    <tr class="topic-row">
                                        <td colspan="5"><?php echo $topicId . '. ' . $topic['title']; ?></td>
                                    </tr>
                                    <?php if (isset($topic['note']) && !empty($topic['note'])): ?>
                                    <tr class="note-row">
                                        <td colspan="5"><?php echo nl2br(htmlspecialchars($topic['note'])); ?></td>
                                    </tr>
                                    <?php endif; ?>
                                    <?php 
                                    $i = 1; 
                                    foreach ($topic['items'] as $itemName): 
                                        $itemIdx = $i++;
                                        $data = $checklist_results[$topicId][$itemIdx] ?? ['result'=>'', 'remark'=>''];
                                    ?>
                                    <tr class="sub-item-row">
                                        <td>- <?php echo nl2br(htmlspecialchars($itemName)); ?></td>
                                        <td class="col-res"><?php echo renderCheckbox($data['result'], 'PASS'); ?></td>
                                        <td class="col-res"><?php echo renderCheckbox($data['result'], 'FAIL'); ?></td>
                                        <td class="col-res"><?php echo renderCheckbox($data['result'], 'N/A'); ?></td>
                                        <td><?php echo htmlspecialchars($data['remark']); ?></td>
                                    </tr>
                                    <?php endforeach; ?>
                                <?php endforeach; ?>
                            </tbody>
                        </table>

                    </td>
                </tr>
            </tbody>
        </table>
    </div>

</body>
</html>