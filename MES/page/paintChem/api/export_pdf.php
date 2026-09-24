<?php
// page/paintChem/api/export_pdf.php
require_once '../../db.php';
require_once '../../../auth/check_auth.php';
require_once '../../utils/libs/tcpdf/tcpdf.php';

requireLogin();

$logDate = $_GET['date'] ?? date('Y-m-d');
$shift = $_GET['shift'] ?? 'DAY';

// Fetch Header
$stmtH = $pdo->prepare("SELECT * FROM dbo.PAINT_CHEM_SHEET_HEADER WHERE log_date = ? AND shift = ?");
$stmtH->execute([$logDate, $shift]);
$header = $stmtH->fetch();

// Fetch Logs
$logs = [];
if ($header) {
    $stmtL = $pdo->prepare("
        SELECT time_slot, station_no, parameter_key, before_value, after_value, chemical_added_kg, is_overflow 
        FROM dbo.PAINT_CHEM_LOG 
        WHERE header_id = ?
    ");
    $stmtL->execute([$header['header_id']]);
    while ($row = $stmtL->fetch()) {
        $logs[$row['station_no']][$row['parameter_key']][$row['time_slot']] = $row;
    }
}

$timeSlots = [];
if ($shift === 'DAY') {
    $timeSlots = ['08:00-09:00','10:00-11:00','13:00-14:00','15:00-16:00','17:30-18:30','19:30-20:30'];
} else {
    $timeSlots = ['20:00-22:00','22:00-00:00','01:00-03:00','03:00-05:00','05:30-07:00','07:00-08:00'];
}

$pdf = new TCPDF('L', 'mm', 'A4', true, 'UTF-8', false);
$pdf->SetCreator(PDF_CREATOR);
$pdf->SetAuthor('MES System');
$pdf->SetTitle("Paint Chem Check Sheet - $logDate $shift");
$pdf->setPrintHeader(false);
$pdf->setPrintFooter(false);
$pdf->SetMargins(10, 10, 10);
$pdf->SetAutoPageBreak(TRUE, 10);

// Use a font that supports Thai. freeserif is often available in TCPDF standard.
// If THSarabun is available, we should use it. We'll fallback to freeserif.
$pdf->SetFont('freeserif', '', 8);

$pdf->AddPage();

// Build HTML table
$html = '
<style>
    th, td { border: 1px solid black; padding: 3px; text-align: center; vertical-align: middle; }
    .header-table { width: 100%; border: none; font-size: 10pt; }
    .header-table td { border: none; text-align: left; }
    .main-table { width: 100%; font-size: 7pt; }
    .bg-gray { background-color: #e0e0e0; }
    .bold { font-weight: bold; }
</style>

<table class="header-table">
    <tr>
        <td width="30%"><h1>SCAN</h1></td>
        <td width="40%" style="text-align:center;"><h2>Parameter & Chemicals Control Check Sheet</h2></td>
        <td width="30%" style="text-align:right;">
            ว/ด/ป: <u>' . date('d/m/Y', strtotime($logDate)) . '</u><br>
            กะทำงาน: <u>' . ($shift === 'DAY' ? 'กลางวัน' : 'กลางคืน') . '</u>
        </td>
    </tr>
</table>
<br>
<table class="main-table" cellpadding="2">
    <thead>
        <tr class="bg-gray bold">
            <th width="3%" rowspan="2">บ่อเคมี</th>
            <th width="10%" rowspan="2">กระบวนการ</th>
            <th width="8%" rowspan="2">สารเคมีที่ใช้</th>
            <th width="10%" rowspan="2">หัวข้อควบคุม</th>
            <th width="7%" rowspan="2">ค่ามาตรฐาน</th>
            <th width="6%" rowspan="1" colspan="2">ค่าควบคุม</th>';
            
foreach ($timeSlots as $ts) {
    $html .= '<th width="9.33%" colspan="3">' . $ts . '</th>';
}

$html .= '
        </tr>
        <tr class="bg-gray bold">
            <th>ต่ำสุด</th>
            <th>สูงสุด</th>';
for ($i=0; $i<6; $i++) {
    $html .= '<th>ก่อนปรับ</th><th>หลังปรับ</th><th>กก.</th>';
}
$html .= '</tr>
    </thead>
    <tbody>';

$stations = [
    1 => ['name' => 'Degreasing 1<br>6.3 Kg/pt-up', 'chem' => 'FC-TS008', 'params' => [
        ['key' => 'F_Al', 'label' => 'F.Al', 'std' => '10-12 pt', 'min' => '10', 'max' => '12'],
        ['key' => 'Temperature', 'label' => 'Temperature', 'std' => '25-35 °C', 'min' => '25', 'max' => '35'],
        ['key' => 'Pressure', 'label' => 'Pressure', 'std' => '0.4-0.8 Bar', 'min' => '0.4', 'max' => '0.8'],
    ]],
    2 => ['name' => 'Degreasing 2<br>12.4 Kg/pt-up', 'chem' => 'FC-TS008', 'params' => [
        ['key' => 'F_Al', 'label' => 'F.Al', 'std' => '10-12 pt', 'min' => '10', 'max' => '12'],
        ['key' => 'Temperature', 'label' => 'Temperature', 'std' => '25-35 °C', 'min' => '25', 'max' => '35'],
        ['key' => 'Pressure', 'label' => 'Pressure', 'std' => '0.4-0.8 Bar', 'min' => '0.4', 'max' => '0.8'],
    ]],
    3 => ['name' => 'Water Rinse 1', 'chem' => 'Water Rinse 1', 'params' => [
        ['key' => 'Conta_WR1', 'label' => 'Conta', 'std' => '< 8.0 pt', 'min' => '-', 'max' => '8.0'],
        ['key' => 'Pressure', 'label' => 'Pressure', 'std' => '0.4-0.8 Bar', 'min' => '0.4', 'max' => '0.8'],
    ]],
    4 => ['name' => 'Water Rinse 2', 'chem' => 'Water Rinse 2', 'params' => [
        ['key' => 'WaterLevel', 'label' => 'Water level', 'std' => '> Over flow', 'min' => '-', 'max' => '-'],
        ['key' => 'Conta_WR2', 'label' => 'Conta', 'std' => '< 1.0 pt', 'min' => '-', 'max' => '1.0'],
        ['key' => 'Pressure', 'label' => 'Pressure', 'std' => '0.4-0.8 Bar', 'min' => '0.4', 'max' => '0.8'],
    ]],
    5 => ['name' => 'Surface Cond.<br>0.2 Kg / every day', 'chem' => 'NT-4055<br>PL-XG<br>AD-4977', 'params' => [
        ['key' => 'pH', 'label' => 'pH', 'std' => '9.0-11.0', 'min' => '9.0', 'max' => '11.0'],
        ['key' => 'TC', 'label' => 'T.C', 'std' => '2.0-4.0 pt', 'min' => '2.0', 'max' => '4.0'],
        ['key' => 'Pressure', 'label' => 'Pressure', 'std' => '0.4-0.8 Bar', 'min' => '0.4', 'max' => '0.8'],
    ]],
    6 => ['name' => 'Zinc Phosphate<br>1.1 Kg/pt-down<br>12.9 Kg/pt up<br>1 Kg / pt-up', 'chem' => 'NT-4055<br>PB-LT5103 RF-1<br>AC-131<br>AJ-T6', 'params' => [
        ['key' => 'Temperature', 'label' => 'Temperature', 'std' => '25-35 °C', 'min' => '25', 'max' => '35'],
        ['key' => 'FA', 'label' => 'F.A.(Free Acid)', 'std' => '0.3-0.5 pt', 'min' => '0.3', 'max' => '0.5'],
        ['key' => 'TA', 'label' => 'T.A.(Total Acidity)', 'std' => '23-25 pt', 'min' => '23', 'max' => '25'],
        ['key' => 'AC', 'label' => 'A.C', 'std' => '2.0-4.0 pt', 'min' => '2.0', 'max' => '4.0'],
        ['key' => 'Pressure', 'label' => 'Pressure', 'std' => '0.4-0.8 Bar', 'min' => '0.4', 'max' => '0.8'],
    ]],
    7 => ['name' => 'Water Rinse 3', 'chem' => 'DI Water Rinse', 'params' => [
        ['key' => 'Conta_WR3', 'label' => 'Conta', 'std' => '< 5.0 pt', 'min' => '-', 'max' => '5.0'],
        ['key' => 'Pressure', 'label' => 'Pressure', 'std' => '0.4-0.8 Bar', 'min' => '0.4', 'max' => '0.8'],
    ]],
    8 => ['name' => 'Water Rinse 4', 'chem' => 'DI Water Rinse', 'params' => [
        ['key' => 'WaterLevel', 'label' => 'Water level', 'std' => '> Over flow', 'min' => '-', 'max' => '-'],
        ['key' => 'Conta_WR4', 'label' => 'Conta', 'std' => '< 0.5 pt', 'min' => '-', 'max' => '0.5'],
        ['key' => 'Pressure', 'label' => 'Pressure', 'std' => '0.4-0.8 Bar', 'min' => '0.4', 'max' => '0.8'],
    ]],
    9 => ['name' => 'Deionized Water<br>Rinse', 'chem' => 'DI Water Rinse', 'params' => [
        ['key' => 'EC', 'label' => 'EC', 'std' => '< 10 µS/cm', 'min' => '-', 'max' => '10'],
        ['key' => 'FlowRate', 'label' => 'Flow rate', 'std' => '> 1.5 m3/hr', 'min' => '1.5', 'max' => '-'],
    ]],
];

foreach ($stations as $sNo => $st) {
    $rowspan = count($st['params']);
    foreach ($st['params'] as $idx => $p) {
        $html .= '<tr>';
        if ($idx === 0) {
            $html .= '<td rowspan="'.$rowspan.'">'.$sNo.'</td>';
            $html .= '<td rowspan="'.$rowspan.'">'.$st['name'].'</td>';
            $html .= '<td rowspan="'.$rowspan.'">'.$st['chem'].'</td>';
        }
        $html .= '<td>'.$p['label'].'</td>';
        $html .= '<td>'.$p['std'].'</td>';
        $html .= '<td>'.$p['min'].'</td>';
        $html .= '<td>'.$p['max'].'</td>';
        
        foreach ($timeSlots as $ts) {
            $log = $logs[$sNo][$p['key']][$ts] ?? null;
            $bf = $log && $log['before_value'] !== null ? $log['before_value'] : '';
            if ($p['key'] === 'WaterLevel') {
                $bf = $log && $log['is_overflow'] ? 'Overflow' : ($log && $log['is_overflow'] === 0 ? 'No' : '');
            }
            $af = $log && $log['after_value'] !== null ? $log['after_value'] : '';
            $kg = $log && $log['chemical_added_kg'] !== null ? $log['chemical_added_kg'] : '';
            
            $html .= '<td>'.$bf.'</td><td>'.$af.'</td><td>'.$kg.'</td>';
        }
        $html .= '</tr>';
    }
}

// Add Oven temps
$bake = $header['bake_oven_temp'] ?? '';
$dry = $header['dry_oven_temp'] ?? '';
$html .= '
<tr>
    <td colspan="3" class="bold" style="text-align:right;">Bake Oven Temperature (°C)</td>
    <td class="bold">Standard</td>
    <td colspan="3" class="bold bg-gray">175 - 220 °C</td>
    <td colspan="18" class="bold">' . $bake . '</td>
</tr>
<tr>
    <td colspan="3" class="bold" style="text-align:right;">Dry Oven Temperature (°C)</td>
    <td class="bold">Standard</td>
    <td colspan="3" class="bold bg-gray">140 - 160 °C</td>
    <td colspan="18" class="bold">' . $dry . '</td>
</tr>
';

$html .= '</tbody></table>';

// Footer block
$speed = $header['conveyor_speed'] ?? '';
$html .= '<br>
<table style="width:100%; border: 1px solid black;" cellpadding="3">
    <tr>
        <td width="15%" style="border-right:1px dotted black;" class="bold">Note.</td>
        <td width="35%" style="border-right:1px solid black;"></td>
        <td width="20%" style="border-bottom:1px solid black;" class="bold">Remark</td>
        <td width="15%" style="border-bottom:1px solid black;" class="bold bg-gray">Standard</td>
        <td width="15%" style="border-bottom:1px solid black;" class="bold">Actual</td>
    </tr>
    <tr>
        <td width="15%" style="border-right:1px dotted black;"></td>
        <td width="35%" style="border-right:1px solid black;"></td>
        <td width="20%" class="bold">Painting Condition:<br>1) Speed Conveyor (m/min)</td>
        <td width="15%" class="bold bg-gray" style="text-align:center; vertical-align:middle;">2.5 - 5.0</td>
        <td width="15%" style="text-align:center; vertical-align:middle;">' . $speed . '</td>
    </tr>
    <tr>
        <td colspan="2" style="border-top:1px solid black; border-right:1px solid black;"></td>
        <td style="border-top:1px solid black; text-align:center;" class="bold">Prepared by</td>
        <td style="border-top:1px solid black; text-align:center;" class="bold">Checked by</td>
        <td style="border-top:1px solid black; text-align:center;" class="bold">Approved by</td>
    </tr>
    <tr>
        <td colspan="2" style="border-right:1px solid black;"></td>
        <td style="text-align:center;"><br><br><br>......................................</td>
        <td style="text-align:center;"><br><br><br>......................................</td>
        <td style="text-align:center;"><br><br><br>......................................</td>
    </tr>
</table>
';

$pdf->writeHTML($html, true, false, true, false, '');

$pdf->Output("PaintChem_CheckSheet_{$logDate}_{$shift}.pdf", 'I');
?>
