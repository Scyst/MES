<?php
// page/paintChem/api/export_pdf.php
// Renders as printable HTML (like generate_wo_pdf.php) — avoids TCPDF colspan/rowspan misalignment.
require_once '../../db.php';
require_once '../../../auth/check_auth.php';

$logDate = $_GET['date'] ?? date('Y-m-d');
$shift   = $_GET['shift'] ?? 'DAY';

$stmtH = $pdo->prepare("SELECT * FROM dbo.PAINT_CHEM_SHEET_HEADER WHERE log_date = ? AND shift = ?");
$stmtH->execute([$logDate, $shift]);
$header = $stmtH->fetch();

$logs = [];
if ($header) {
    $stmtL = $pdo->prepare("SELECT time_slot, station_no, parameter_key, before_value, after_value, chemical_added_kg, is_overflow FROM dbo.PAINT_CHEM_LOG WHERE header_id = ?");
    $stmtL->execute([$header['header_id']]);
    while ($row = $stmtL->fetch()) {
        $logs[$row['station_no']][$row['parameter_key']][$row['time_slot']] = $row;
    }
}

$timeSlots = $shift === 'DAY'
    ? ['08:00-09:00','10:00-11:00','13:00-14:00','15:00-16:00','17:30-18:30','19:30-20:30']
    : ['20:00-22:00','22:00-00:00','01:00-03:00','03:00-05:00','05:30-07:00','07:00-08:00'];

$stations = [
    1 => ['name' => 'Degreasing 1<br>6.3 Kg/pt-up',    'chem' => 'FC-TS008', 'params' => [
        ['key' => 'F_Al',        'label' => 'F.Al',        'std' => '10-12 pt',    'min' => '10',  'max' => '12',  'hasKg' => true,  'isOvf' => false],
        ['key' => 'Temperature', 'label' => 'Temperature', 'std' => '25-35 °C',    'min' => '25',  'max' => '35',  'hasKg' => false, 'isOvf' => false],
        ['key' => 'Pressure',    'label' => 'Pressure',    'std' => '0.4-0.8 Bar', 'min' => '0.4', 'max' => '0.8', 'hasKg' => false, 'isOvf' => false],
    ]],
    2 => ['name' => 'Degreasing 2<br>12.4 Kg/pt-up',   'chem' => 'FC-TS008', 'params' => [
        ['key' => 'F_Al',        'label' => 'F.Al',        'std' => '10-12 pt',    'min' => '10',  'max' => '12',  'hasKg' => true,  'isOvf' => false],
        ['key' => 'Temperature', 'label' => 'Temperature', 'std' => '25-35 °C',    'min' => '25',  'max' => '35',  'hasKg' => false, 'isOvf' => false],
        ['key' => 'Pressure',    'label' => 'Pressure',    'std' => '0.4-0.8 Bar', 'min' => '0.4', 'max' => '0.8', 'hasKg' => false, 'isOvf' => false],
    ]],
    3 => ['name' => 'Water Rinse 1', 'chem' => 'Water Rinse 1', 'params' => [
        ['key' => 'Conta_WR1',   'label' => 'Conta',    'std' => '< 8.0 pt',    'min' => '-',  'max' => '8.0', 'hasKg' => false, 'isOvf' => false],
        ['key' => 'Pressure',    'label' => 'Pressure', 'std' => '0.4-0.8 Bar', 'min' => '0.4','max' => '0.8', 'hasKg' => false, 'isOvf' => false],
    ]],
    4 => ['name' => 'Water Rinse 2', 'chem' => 'Water Rinse 2', 'params' => [
        ['key' => 'WaterLevel_WR2','label' => 'Water level','std' => '> Overflow','min' => '-', 'max' => '-',   'hasKg' => false, 'isOvf' => true],
        ['key' => 'Conta_WR2',   'label' => 'Conta',    'std' => '< 1.0 pt',    'min' => '-',  'max' => '1.0', 'hasKg' => false, 'isOvf' => false],
        ['key' => 'Pressure',    'label' => 'Pressure', 'std' => '0.4-0.8 Bar', 'min' => '0.4','max' => '0.8', 'hasKg' => false, 'isOvf' => false],
    ]],
    5 => ['name' => 'Surface Cond.<br>0.2 Kg/day', 'chem' => 'NT-4055<br>PL-XG<br>AD-4977', 'params' => [
        ['key' => 'pH',          'label' => 'pH',       'std' => '9.0-11.0',    'min' => '9.0','max' => '11.0','hasKg' => false, 'isOvf' => false],
        ['key' => 'TC',          'label' => 'T.C',      'std' => '2.0-4.0 pt',  'min' => '2.0','max' => '4.0', 'hasKg' => false, 'isOvf' => false],
        ['key' => 'Pressure',    'label' => 'Pressure', 'std' => '0.4-0.8 Bar', 'min' => '0.4','max' => '0.8', 'hasKg' => false, 'isOvf' => false],
    ]],
    6 => ['name' => 'Zinc Phosphate<br>1.1 Kg/pt-down<br>12.9 Kg/pt-up<br>1 Kg/pt-up', 'chem' => 'NT-4055<br>PB-LT5103 RF-1<br>AC-131<br>AJ-T6', 'params' => [
        ['key' => 'Temperature', 'label' => 'Temperature',          'std' => '25-35 °C',    'min' => '25',  'max' => '35',  'hasKg' => false, 'isOvf' => false],
        ['key' => 'FA',          'label' => 'F.A.(Free Acid)',       'std' => '0.3-0.5 pt',  'min' => '0.3', 'max' => '0.5', 'hasKg' => true,  'isOvf' => false],
        ['key' => 'TA',          'label' => 'T.A.(Total Acidity)',   'std' => '23-25 pt',    'min' => '23',  'max' => '25',  'hasKg' => true,  'isOvf' => false],
        ['key' => 'AC',          'label' => 'A.C',                   'std' => '2.0-4.0 pt',  'min' => '2.0', 'max' => '4.0', 'hasKg' => true,  'isOvf' => false],
        ['key' => 'Pressure',    'label' => 'Pressure',              'std' => '0.4-0.8 Bar', 'min' => '0.4', 'max' => '0.8', 'hasKg' => false, 'isOvf' => false],
    ]],
    7 => ['name' => 'Water Rinse 3', 'chem' => 'DI Water Rinse', 'params' => [
        ['key' => 'Conta_WR3',   'label' => 'Conta',    'std' => '< 5.0 pt',    'min' => '-',  'max' => '5.0', 'hasKg' => false, 'isOvf' => false],
        ['key' => 'Pressure',    'label' => 'Pressure', 'std' => '0.4-0.8 Bar', 'min' => '0.4','max' => '0.8', 'hasKg' => false, 'isOvf' => false],
        ['key' => 'WaterLevel_WR3','label' => 'Water level','std' => '> Overflow','min' => '-','max' => '-',   'hasKg' => false, 'isOvf' => true],
    ]],
    8 => ['name' => 'Water Rinse 4', 'chem' => 'DI Water Rinse', 'params' => [
        ['key' => 'Conta_WR4',   'label' => 'Conta',    'std' => '< 0.5 pt',    'min' => '-',  'max' => '0.5', 'hasKg' => false, 'isOvf' => false],
        ['key' => 'Pressure',    'label' => 'Pressure', 'std' => '0.4-0.8 Bar', 'min' => '0.4','max' => '0.8', 'hasKg' => false, 'isOvf' => false],
    ]],
    9 => ['name' => 'Deionized<br>Water Rinse', 'chem' => 'DI Water Rinse', 'params' => [
        ['key' => 'EC',          'label' => 'EC',        'std' => '< 10 µS/cm', 'min' => '-',  'max' => '10',  'hasKg' => false, 'isOvf' => false],
        ['key' => 'FlowRate',    'label' => 'Flow rate', 'std' => '> 1.5 m3/hr','min' => '1.5','max' => '-',   'hasKg' => false, 'isOvf' => false],
    ]],
];

$bake  = $header['bake_oven_temp']  ?? '';
$dry   = $header['dry_oven_temp']   ?? '';
$speed = $header['conveyor_speed']  ?? '';
$preparedBy = $header['prepared_by_name'] ?? '';
?>
<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8">
<title>Paint Chem Check Sheet - <?php echo htmlspecialchars($logDate); ?> <?php echo $shift; ?></title>
<style>
  @page { size: A4 landscape; margin: 8mm 8mm 8mm 8mm; }
  * { box-sizing: border-box; }
  body { font-family: 'TH Sarabun New', 'THSarabunNew', 'Sarabun', Arial, sans-serif; font-size: 7pt; color: #000; margin: 0; padding: 0; }
  .page { width: 277mm; margin: 0 auto; }
  h1 { font-size: 14pt; margin: 0; }
  h2 { font-size: 10pt; margin: 0; text-align: center; }
  .title-row { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
  .title-row td { padding: 0 4px; vertical-align: middle; font-size: 8pt; }

  table.main { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 6.5pt; }
  table.main th, table.main td {
    border: 1px solid #000;
    padding: 1.5px 2px;
    text-align: center;
    vertical-align: middle;
    word-break: break-word;
    overflow: hidden;
  }
  .bg { background-color: #d0d0d0; font-weight: bold; }
  .oor { background-color: #ffe0e0; color: red; font-weight: bold; }

  /* Column widths — total = 277mm (A4L minus 16mm margins) */
  /* Left fixed = 3+9+8+9+8+3+3 = 43mm => each time-slot group = (277-43)/6 = 39mm => each sub = 13mm */
  col.c-no    { width: 8mm;  }
  col.c-proc  { width: 20mm; }
  col.c-chem  { width: 18mm; }
  col.c-param { width: 18mm; }
  col.c-std   { width: 15mm; }
  col.c-min   { width: 7mm;  }
  col.c-max   { width: 7mm;  }
  col.c-bf    { width: 13mm; }
  col.c-af    { width: 13mm; }
  col.c-kg    { width: 13mm; }

  .no-print { position: fixed; top: 10px; right: 15px; z-index: 9999; }
  @media print {
    .no-print { display: none !important; }
    body { background: white; }
  }
  table.footer-tbl { width: 100%; border-collapse: collapse; margin-top: 4px; font-size: 7pt; }
  table.footer-tbl td, table.footer-tbl th { border: 1px solid #000; padding: 2px 4px; vertical-align: middle; }
</style>
</head>
<body>
<div class="no-print">
  <button onclick="window.print()" style="padding:8px 16px;background:#1d4ed8;color:white;border:none;border-radius:4px;cursor:pointer;font-size:13px;">🖨 พิมพ์ / บันทึก PDF</button>
</div>

<div class="page">
  <!-- Header -->
  <table class="title-row">
    <tr>
      <td width="18%" style="font-size:16pt;font-weight:bold;">SCAN</td>
      <td width="52%" style="text-align:center;font-size:10pt;font-weight:bold;">Parameter &amp; Chemicals Control Check Sheet</td>
      <td width="30%" style="text-align:right;font-size:7.5pt;">
        ว/ด/ป: <u><?php echo date('d/m/Y', strtotime($logDate)); ?></u><br>
        กะทำงาน: <u><?php echo $shift === 'DAY' ? 'กลางวัน' : 'กลางคืน'; ?></u>
      </td>
    </tr>
  </table>

  <!-- Main Table -->
  <table class="main">
    <colgroup>
      <col class="c-no">
      <col class="c-proc">
      <col class="c-chem">
      <col class="c-param">
      <col class="c-std">
      <col class="c-min">
      <col class="c-max">
      <?php for ($i = 0; $i < 6; $i++): ?>
      <col class="c-bf"><col class="c-af"><col class="c-kg">
      <?php endfor; ?>
    </colgroup>
    <thead>
      <tr class="bg">
        <th rowspan="2">บ่อเคมี</th>
        <th rowspan="2">กระบวนการ</th>
        <th rowspan="2">สารเคมีที่ใช้</th>
        <th rowspan="2">หัวข้อควบคุม</th>
        <th rowspan="2">ค่ามาตรฐาน</th>
        <th colspan="2">ค่าควบคุม</th>
        <?php foreach ($timeSlots as $ts): ?>
        <th colspan="3"><?php echo htmlspecialchars($ts); ?></th>
        <?php endforeach; ?>
      </tr>
      <tr class="bg">
        <th>ต่ำสุด</th>
        <th>สูงสุด</th>
        <?php for ($i = 0; $i < 6; $i++): ?>
        <th>ก่อนปรับ</th><th>หลังปรับ</th><th>กก.</th>
        <?php endfor; ?>
      </tr>
    </thead>
    <tbody>
    <?php foreach ($stations as $sNo => $st):
        $rowspan = count($st['params']);
    ?>
      <?php foreach ($st['params'] as $idx => $p):
          $isFirst = ($idx === 0);
      ?>
      <tr>
        <?php if ($isFirst): ?>
        <td rowspan="<?php echo $rowspan; ?>"><?php echo $sNo; ?></td>
        <td rowspan="<?php echo $rowspan; ?>"><?php echo $st['name']; ?></td>
        <td rowspan="<?php echo $rowspan; ?>"><?php echo $st['chem']; ?></td>
        <?php endif; ?>
        <td style="text-align:left;"><?php echo htmlspecialchars($p['label']); ?></td>
        <td><?php echo $p['std']; ?></td>
        <td><?php echo $p['min']; ?></td>
        <td><?php echo $p['max']; ?></td>
        <?php foreach ($timeSlots as $ts):
            $log = $logs[$sNo][$p['key']][$ts] ?? null;
            if ($p['isOvf']) {
                $bf = $log ? ($log['is_overflow'] ? 'Overflow' : 'No') : '';
                $af = ''; $kg = '';
            } else {
                $bf = $log && $log['before_value'] !== null ? $log['before_value'] : '';
                $af = $log && $log['after_value']  !== null ? $log['after_value']  : '';
                $kg = ($p['hasKg'] && $log && $log['chemical_added_kg'] !== null) ? $log['chemical_added_kg'] : '';
            }
            // OOR highlight
            $bfClass = ''; $afClass = '';
            // Simple check — compare before against min/max if numeric
        ?>
        <td class="<?php echo $bfClass; ?>"><?php echo htmlspecialchars((string)$bf); ?></td>
        <td class="<?php echo $afClass; ?>"><?php echo htmlspecialchars((string)$af); ?></td>
        <td><?php echo htmlspecialchars((string)$kg); ?></td>
        <?php endforeach; ?>
      </tr>
      <?php endforeach; ?>
    <?php endforeach; ?>

      <!-- Bake Oven Row -->
      <tr>
        <td colspan="3" style="text-align:right;font-weight:bold;">Bake Oven Temperature (°C)</td>
        <td style="font-weight:bold;">Standard</td>
        <td colspan="2" class="bg" style="font-weight:bold;">175 - 220 °C</td>
        <td colspan="18" style="font-weight:bold;"><?php echo htmlspecialchars((string)$bake); ?></td>
      </tr>
      <!-- Dry Oven Row -->
      <tr>
        <td colspan="3" style="text-align:right;font-weight:bold;">Dry Oven Temperature (°C)</td>
        <td style="font-weight:bold;">Standard</td>
        <td colspan="2" class="bg" style="font-weight:bold;">140 - 160 °C</td>
        <td colspan="18" style="font-weight:bold;"><?php echo htmlspecialchars((string)$dry); ?></td>
      </tr>
    </tbody>
  </table>

  <!-- Footer -->
  <table class="footer-tbl">
    <tr>
      <td rowspan="2" width="15%" style="vertical-align:top;font-weight:bold;">Note.</td>
      <td rowspan="2" width="32%" style="height:40px;"></td>
      <td width="20%" style="font-weight:bold;text-align:center;">Remark</td>
      <td width="16.5%" style="font-weight:bold;text-align:center;background:#d0d0d0;">Standard</td>
      <td width="16.5%" style="font-weight:bold;text-align:center;">Actual</td>
    </tr>
    <tr>
      <td style="font-weight:bold;text-align:center;">Painting Condition:<br>1) Speed Conveyor (m/min)</td>
      <td style="text-align:center;background:#d0d0d0;">2.5 - 5.0</td>
      <td style="text-align:center;"><?php echo htmlspecialchars((string)$speed); ?></td>
    </tr>
    <tr>
      <td colspan="2" style="height:30px;border-top:1px solid #000;"></td>
      <td style="text-align:center;font-weight:bold;">Prepared by</td>
      <td style="text-align:center;font-weight:bold;">Checked by</td>
      <td style="text-align:center;font-weight:bold;">Approved by</td>
    </tr>
    <tr>
      <td colspan="2" style="height:35px;"></td>
      <td style="text-align:center;">...............................<br><?php echo htmlspecialchars($preparedBy); ?></td>
      <td style="text-align:center;">...............................</td>
      <td style="text-align:center;">...............................</td>
    </tr>
  </table>
</div>
</body>
</html>