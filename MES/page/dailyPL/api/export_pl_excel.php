<?php
// page/pl_daily/api/export_pl_excel.php

require_once __DIR__ . '/../../../config/config.php';
require_once __DIR__ . '/../../../auth/check_auth.php';
require_once __DIR__ . '/../../db.php';

if (!hasRole(['admin', 'creator', 'supervisor'])) {
    die("Access Denied");
}

$mode = $_GET['mode'] ?? 'daily';
$section = $_GET['section'] ?? 'Team 1';
$filename = "PL_" . date('Ymd_His') . ".xls";
$data = [];
$periodText = "";

try {
    if ($mode === 'daily') {
        $date = $_GET['entry_date'];
        $filename = "PL_Daily_{$date}_{$section}.xls";
        $periodText = "Date: " . $date;

        // ✅ เรียก SP ตัวเดียวกับหน้าจอ (มั่นใจได้ว่าเลขตรงกัน 100%)
        $stmt = $pdo->prepare("EXEC dbo.sp_GetPLEntryData_WithTargets :date, :section");
        $stmt->execute([':date' => $date, ':section' => $section]);
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

    } else {
        $startDate = $_GET['start_date'];
        $endDate = $_GET['end_date'];
        $filename = "PL_Report_{$startDate}_to_{$endDate}_{$section}.xls";
        $periodText = "Period: " . $startDate . " - " . $endDate;

        $stmt = $pdo->prepare("EXEC dbo.sp_GetPLReport_Range :start, :end, :section");
        $stmt->execute([':start' => $startDate, ':end' => $endDate, ':section' => $section]);
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    if (empty($data)) die("No data found.");

} catch (Exception $e) {
    die("Error: " . $e->getMessage());
}

// Generate Excel HTML
header("Content-Type: application/vnd.ms-excel; charset=utf-8");
header("Content-Disposition: attachment; filename=\"$filename\"");
header("Pragma: no-cache");
header("Expires: 0");

echo '<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="UTF-8"></head><body>';
echo "<h3>P&L Report: $section</h3><p>$periodText</p>";
echo '<table border="1">';
echo '<tr style="background:#f0f0f0;"><th>Item</th><th>Code</th><th>Target</th><th>Actual</th><th>Source</th></tr>';

foreach ($data as $row) {
    $bg = ((int)$row['item_level'] === 0) ? '#e0e0e0' : '#ffffff';
    $weight = ((int)$row['item_level'] === 0) ? 'bold' : 'normal';
    $indent = ((int)$row['item_level'] * 20) . 'px';
    
    // แปลง Source Code เป็นคำอ่านง่าย
    $src = $row['data_source'];
    if(strpos($src, 'AUTO') !== false) $src = 'AUTO';
    elseif($src === 'CALCULATED') $src = 'FORMULA';
    else $src = 'MANUAL';

    echo "<tr style='background-color: $bg; font-weight: $weight;'>";
    echo "<td style='padding-left:$indent'>" . htmlspecialchars($row['item_name']) . "</td>";
    echo "<td style='text-align:center; mso-number-format:\"@\";'>" . $row['account_code'] . "</td>";
    echo "<td style='text-align:right;'>" . number_format((float)$row['daily_target'], 2) . "</td>";
    echo "<td style='text-align:right;'>" . number_format((float)$row['actual_amount'], 2) . "</td>";
    echo "<td style='text-align:center; font-size:0.8em; color:#666;'>" . $src . "</td>";
    echo "</tr>";
}
echo '</table></body></html>';
?>