<?php
// page/pl_daily/api/export_pl_excel.php

// 1. Include & Auth
require_once __DIR__ . '/../../../config/config.php';
require_once __DIR__ . '/../../../auth/check_auth.php';
require_once __DIR__ . '/../../db.php';

if (!hasRole(['admin', 'creator', 'supervisor'])) {
    die("Access Denied");
}

// 2. Prepare Data
$mode = $_GET['mode'] ?? 'daily';
$section = $_GET['section'] ?? 'Team 1';
$filename = "PL_" . date('Ymd_His') . ".xls";
$data = [];
$periodText = "";

try {
    $startDate = '';
    $endDate = '';

    if ($mode === 'daily') {
        $date = $_GET['entry_date'];
        $startDate = $date;
        $endDate = $date;
        $filename = "PL_Daily_{$date}_{$section}.xls";
        $periodText = "Date: " . $date;
    } else {
        $startDate = $_GET['start_date'];
        $endDate = $_GET['end_date'];
        $filename = "PL_Report_{$startDate}_to_{$endDate}_{$section}.xls";
        $periodText = "Period: " . $startDate . " - " . $endDate;
    }

    if (!$pdo) die("Error: Database connection failed");

    $stmt = $pdo->prepare("EXEC dbo.sp_GetPLReport_Range :start, :end, :section");
    $stmt->execute([':start' => $startDate, ':end' => $endDate, ':section' => $section]);
    $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

} catch (Exception $e) {
    die("Error: " . $e->getMessage());
}

// 3. Headers
header("Content-Type: application/vnd.ms-excel; charset=utf-8");
header("Content-Disposition: attachment; filename=\"$filename\"");
header("Pragma: no-cache");
header("Expires: 0");
echo "\xEF\xBB\xBF"; 
?>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:x="urn:schemas-microsoft-com:office:excel"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <style>
        /* 🔥 ใช้ Segoe UI หรือ Tahoma เพื่อให้ดูเหมือนหน้าเว็บและอ่านไทยง่าย */
        body, table, tr, td, th {
            font-family: 'Segoe UI', 'Tahoma', sans-serif !important;
            font-size: 10pt !important; /* ขนาดมาตรฐาน Excel สากล */
            color: #000000;
            vertical-align: middle;
        }
        
        /* Table Structure */
        table { border-collapse: collapse; width: 100%; }
        th, td { border: .5pt solid #CCCCCC; padding: 4px 5px; } /* เส้นขอบสีเทาอ่อนแบบ Modern */
        
        /* Header Style */
        th { 
            background-color: #f8f9fa; /* สีเทาอ่อนเหมือนหน้าเว็บ */
            color: #212529; /* สีดำเทา */
            font-weight: bold; 
            text-align: center; 
            height: 35px;
            border-bottom: 2px solid #dee2e6; /* เส้นใต้หัวตารางหนาหน่อย */
        }
    </style>
</head>
<body>

    <h2 style="font-size: 16pt; margin: 0; font-weight:bold; color: #0d6efd;"><?php echo htmlspecialchars($section); ?> P&L Report</h2>
    <p style="font-size: 10pt; color: #6c757d; margin: 5px 0;"><?php echo $periodText; ?></p>
    <br>

    <table border="1">
        <colgroup>
            <col style="width: 300px;">
            <col style="width: 100px;">
            <col style="width: 100px;">
            <col style="width: 100px;">
            <col style="width: 80px;">
            <col style="width: 80px;">
            <col style="width: 250px;">
        </colgroup>
        <thead>
            <tr>
                <th>Account Item</th>
                <th>Code</th>
                <th>Target</th>
                <th>Actual</th>
                <th>Diff %</th>
                <th>Type</th>
                <th>Remark</th>
            </tr>
        </thead>
        <tbody>
            <?php foreach ($data as $row): 
                $level = (int)$row['item_level'];
                
                // Indentation
                $paddingLeft = ($level * 20) . "px"; 
                
                // Background Color Logic (เลียนแบบหน้าเว็บ)
                $bgStyle = "";
                $fontWeight = "font-weight: normal;";
                
                if ($level == 0) {
                    $bgStyle = "background-color: #e7f1ff;"; // สีฟ้าจางๆ (Level 0)
                    $fontWeight = "font-weight: bold; color: #055160;";
                } elseif ($level == 1) {
                    $bgStyle = "background-color: #ffffff;";
                    $fontWeight = "font-weight: bold; color: #495057;";
                }

                // Data Values
                $actual = (float)$row['actual_amount'];
                $target = (float)$row['daily_target'];
                $remark = strip_tags($row['remark'] ?? '');
                
                // Diff Logic
                $diffText = "-";
                $diffColorStyle = "color: #6c757d;"; // สีเทา (Muted)

                if ($target > 0) {
                    $diff = $actual - $target;
                    $percent = ($diff / $target) * 100;
                    $diffText = number_format(abs($percent), 0) . "%";
                    
                    if ($row['item_type'] == 'REVENUE') {
                        $diffColorStyle = ($diff >= -0.01) ? "color: #198754; font-weight: bold;" : "color: #dc3545; font-weight: bold;";
                        $diffText = ($diff < 0 ? "↓ " : "↑ ") . $diffText;
                    } else {
                        $diffColorStyle = ($diff <= 0.01) ? "color: #198754; font-weight: bold;" : "color: #dc3545; font-weight: bold;";
                        $diffText = ($diff < 0 ? "↓ " : "↑ ") . $diffText;
                    }
                }
            ?>
                <tr style="<?php echo $bgStyle; ?>">
                    
                    <td style="<?php echo $fontWeight; ?> padding-left: <?php echo $paddingLeft; ?>; mso-number-format:'\@';">
                        <?php echo htmlspecialchars($row['item_name']); ?>
                    </td>
                    
                    <td style="text-align: center; color: #6c757d; mso-number-format:'\@';">
                        <?php echo strip_tags($row['account_code']); ?>
                    </td>
                    
                    <td style="text-align: right; color: #6c757d; mso-number-format:'\#\,\#\#0\.00';">
                        <?php echo ($target > 0) ? $target : 0; ?>
                    </td>
                    
                    <td style="text-align: right; font-weight: bold; color: #000; mso-number-format:'\#\,\#\#0\.00';">
                        <?php echo $actual; ?>
                    </td>
                    
                    <td style="text-align: center; <?php echo $diffColorStyle; ?>">
                        <?php echo $diffText; ?>
                    </td>
                    
                    <td style="text-align: center; font-size: 9pt;">
                        <?php echo strip_tags($row['item_type']); ?>
                    </td>
                    
                    <td style="text-align: left; color: #555; mso-number-format:'\@';">
                        <?php echo htmlspecialchars($remark); ?>
                    </td>
                </tr>
            <?php endforeach; ?>
        </tbody>
    </table>
</body>
</html>