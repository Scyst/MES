<?php
// page/pl_daily/api/export_pl_excel.php

require_once __DIR__ . '/../../../config/config.php';
require_once __DIR__ . '/../../../auth/check_auth.php';
require_once __DIR__ . '/../../db.php';

// 1. Security Check
if (!hasRole(['admin', 'creator', 'supervisor'])) {
    http_response_code(403);
    die("Access Denied: Insufficient Permissions");
}

// 2. Input Handling & Sanitization
$mode = $_GET['mode'] ?? 'daily';
// กรองชื่อไฟล์ไม่ให้มีอักขระพิเศษที่ระบบไฟล์ไม่ชอบ
$sectionRaw = $_GET['section'] ?? 'Team 1';
$sectionSafe = preg_replace('/[^a-zA-Z0-9_\- ]/', '', $sectionRaw); 

$filename = "PL_" . date('Ymd_His') . ".xls";
$periodText = "";
$data = [];

try {
    if ($mode === 'daily') {
        $date = $_GET['entry_date'] ?? date('Y-m-d');
        $filename = "PL_Daily_{$date}_{$sectionSafe}.xls";
        $periodText = "Daily Entry Date: " . $date;

        // เรียก SP เดียวกับหน้าจอ Entry
        $stmt = $pdo->prepare("EXEC dbo.sp_GetPLEntryData_WithTargets :date, :section");
        $stmt->execute([':date' => $date, ':section' => $sectionRaw]);
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

    } else {
        $startDate = $_GET['start_date'] ?? date('Y-m-01');
        $endDate = $_GET['end_date'] ?? date('Y-m-d');
        $filename = "PL_Report_{$startDate}_to_{$endDate}_{$sectionSafe}.xls";
        $periodText = "Period: " . $startDate . " - " . $endDate;

        // เรียก SP รายงานช่วงเวลา
        $stmt = $pdo->prepare("EXEC dbo.sp_GetPLReport_Range :start, :end, :section");
        $stmt->execute([':start' => $startDate, ':end' => $endDate, ':section' => $sectionRaw]);
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    if (empty($data)) {
        die("<h3>No data found for the selected criteria.</h3><button onclick='window.close()'>Close</button>");
    }

} catch (Exception $e) {
    die("Database Error: " . $e->getMessage());
}

// 3. Export Headers
// Clear Buffer เพื่อไม่ให้มี HTML ขยะติดมา
if (ob_get_level()) ob_end_clean();

header("Content-Type: application/vnd.ms-excel; charset=utf-8");
header("Content-Disposition: attachment; filename=\"$filename\"");
header("Pragma: no-cache");
header("Expires: 0");

// 🔥 CRITICAL: Add BOM for Excel UTF-8 Compatibility (แก้ภาษาไทยเพี้ยน)
echo "\xEF\xBB\xBF"; 

?>
<html xmlns:x="urn:schemas-microsoft-com:office:excel">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
    <style>
        /* CSS สำหรับ Excel (HTML Mode) */
        body { font-family: 'Sarabun', sans-serif; font-size: 14px; }
        table { border-collapse: collapse; width: 100%; }
        th { background-color: #4e73df; color: white; border: 1px solid #000; padding: 10px; }
        td { border: 1px solid #ccc; padding: 5px; vertical-align: middle; }
        
        /* 🔥 Format ตัวเลขให้ Excel รู้ว่าเป็น Number */
        .num { mso-number-format:"\#\,\#\#0\.00"; text-align: right; }
        .text-center { text-align: center; }
        .text-code { mso-number-format:"\@"; text-align: center; } /* Force Text Format */
        
        /* Hierarchy Styles */
        .level-0 { background-color: #eaecf4; font-weight: bold; font-size: 15px; color: #000; }
        .level-1 { background-color: #ffffff; font-weight: normal; }
        .level-2 { background-color: #ffffff; color: #555; font-style: italic; }
    </style>
</head>
<body>
    <h3>P&L Report: <?php echo htmlspecialchars($sectionRaw); ?></h3>
    <p><?php echo $periodText; ?></p>
    
    <table>
        <thead>
            <tr>
                <th>Item Name</th>
                <th>Account Code</th>
                <th>Target</th>
                <th>Actual</th>
                <th>Diff</th>
                <th>Source</th>
            </tr>
        </thead>
        <tbody>
            <?php foreach ($data as $row): 
                $level = (int)$row['item_level'];
                $indent = $level * 20;
                $rowClass = "level-" . ($level > 2 ? 2 : $level);
                
                // คำนวณ Diff (ถ้ามีฟิลด์นี้ หรือคำนวณสด)
                $target = (float)($row['daily_target'] ?? 0); // หรือ target_amount แล้วแต่ SP
                $actual = (float)$row['actual_amount'];
                $diff = $actual - $target;
                
                // จัดการ Source Text
                $src = $row['data_source'];
                if (strpos($src, 'AUTO') !== false) $src = 'AUTO';
                elseif ($src === 'CALCULATED') $src = 'FORMULA';
                else $src = 'MANUAL';
            ?>
            <tr class="<?php echo $rowClass; ?>">
                <td style="padding-left: <?php echo $indent; ?>px;">
                    <?php echo htmlspecialchars($row['item_name']); ?>
                </td>
                <td class="text-code"><?php echo $row['account_code']; ?></td>
                
                <td class="num"><?php echo $target; ?></td>
                <td class="num"><?php echo $actual; ?></td>
                <td class="num" style="color: <?php echo ($diff < 0) ? 'red' : 'green'; ?>;">
                    <?php echo $diff; ?>
                </td>
                
                <td class="text-center" style="font-size: 0.8em; color: #888;">
                    <?php echo $src; ?>
                </td>
            </tr>
            <?php endforeach; ?>
        </tbody>
    </table>
</body>
</html>