<?php
// page/paintChem/api/export_pdf.php
// Renders printable HTML — browser-native print (same pattern as PE/generate_wo_pdf.php)
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
        ['key' => 'Conta_WR1',      'label' => 'Conta',      'std' => '< 8.0 pt',    'min' => '-',   'max' => '8.0', 'hasKg' => false, 'isOvf' => false],
        ['key' => 'Pressure',       'label' => 'Pressure',   'std' => '0.4-0.8 Bar', 'min' => '0.4', 'max' => '0.8', 'hasKg' => false, 'isOvf' => false],
    ]],
    4 => ['name' => 'Water Rinse 2', 'chem' => 'Water Rinse 2', 'params' => [
        ['key' => 'WaterLevel_WR2', 'label' => 'Water level','std' => '> Overflow',  'min' => '-',   'max' => '-',   'hasKg' => false, 'isOvf' => true],
        ['key' => 'Conta_WR2',      'label' => 'Conta',      'std' => '< 1.0 pt',    'min' => '-',   'max' => '1.0', 'hasKg' => false, 'isOvf' => false],
        ['key' => 'Pressure',       'label' => 'Pressure',   'std' => '0.4-0.8 Bar', 'min' => '0.4', 'max' => '0.8', 'hasKg' => false, 'isOvf' => false],
    ]],
    5 => ['name' => 'Surface Cond.<br>0.2 Kg/day', 'chem' => 'NT-4055<br>PL-XG<br>AD-4977', 'params' => [
        ['key' => 'pH',             'label' => 'pH',         'std' => '9.0-11.0',    'min' => '9.0', 'max' => '11.0','hasKg' => false, 'isOvf' => false],
        ['key' => 'TC',             'label' => 'T.C',        'std' => '2.0-4.0 pt',  'min' => '2.0', 'max' => '4.0', 'hasKg' => false, 'isOvf' => false],
        ['key' => 'Pressure',       'label' => 'Pressure',   'std' => '0.4-0.8 Bar', 'min' => '0.4', 'max' => '0.8', 'hasKg' => false, 'isOvf' => false],
    ]],
    6 => ['name' => 'Zinc Phosphate<br>1.1 Kg/pt-down<br>12.9 Kg/pt-up<br>1 Kg/pt-up', 'chem' => 'NT-4055<br>PB-LT5103 RF-1<br>AC-131<br>AJ-T6', 'params' => [
        ['key' => 'Temperature',    'label' => 'Temperature',        'std' => '25-35 °C',    'min' => '25',  'max' => '35',  'hasKg' => false, 'isOvf' => false],
        ['key' => 'FA',             'label' => 'F.A.(Free Acid)',    'std' => '0.3-0.5 pt',  'min' => '0.3', 'max' => '0.5', 'hasKg' => true,  'isOvf' => false],
        ['key' => 'TA',             'label' => 'T.A.(Total Acidity)','std' => '23-25 pt',    'min' => '23',  'max' => '25',  'hasKg' => true,  'isOvf' => false],
        ['key' => 'AC',             'label' => 'A.C',                'std' => '2.0-4.0 pt',  'min' => '2.0', 'max' => '4.0', 'hasKg' => true,  'isOvf' => false],
        ['key' => 'Pressure',       'label' => 'Pressure',           'std' => '0.4-0.8 Bar', 'min' => '0.4', 'max' => '0.8', 'hasKg' => false, 'isOvf' => false],
    ]],
    7 => ['name' => 'Water Rinse 3', 'chem' => 'DI Water Rinse', 'params' => [
        ['key' => 'Conta_WR3',      'label' => 'Conta',      'std' => '< 5.0 pt',    'min' => '-',   'max' => '5.0', 'hasKg' => false, 'isOvf' => false],
        ['key' => 'Pressure',       'label' => 'Pressure',   'std' => '0.4-0.8 Bar', 'min' => '0.4', 'max' => '0.8', 'hasKg' => false, 'isOvf' => false],
        ['key' => 'WaterLevel_WR3', 'label' => 'Water level','std' => '> Overflow',  'min' => '-',   'max' => '-',   'hasKg' => false, 'isOvf' => true],
    ]],
    8 => ['name' => 'Water Rinse 4', 'chem' => 'DI Water Rinse', 'params' => [
        ['key' => 'Conta_WR4',      'label' => 'Conta',      'std' => '< 0.5 pt',    'min' => '-',   'max' => '0.5', 'hasKg' => false, 'isOvf' => false],
        ['key' => 'Pressure',       'label' => 'Pressure',   'std' => '0.4-0.8 Bar', 'min' => '0.4', 'max' => '0.8', 'hasKg' => false, 'isOvf' => false],
    ]],
    9 => ['name' => 'Deionized<br>Water Rinse', 'chem' => 'DI Water Rinse', 'params' => [
        ['key' => 'EC',             'label' => 'EC',         'std' => '< 10 µS/cm',  'min' => '-',   'max' => '10',  'hasKg' => false, 'isOvf' => false],
        ['key' => 'FlowRate',       'label' => 'Flow rate',  'std' => '> 1.5 m3/hr', 'min' => '1.5', 'max' => '-',   'hasKg' => false, 'isOvf' => false],
    ]],
];

$bake       = $header['bake_oven_temp']  ?? '';
$dry        = $header['dry_oven_temp']   ?? '';
$speed      = $header['conveyor_speed']  ?? '';
$preparedBy = $header['prepared_by_name'] ?? '';
$shiftLabel = $shift === 'DAY' ? 'กลางวัน (DAY)' : 'กลางคืน (NIGHT)';
$dateLabel  = date('d/m/Y', strtotime($logDate));
?>
<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8">
<title>Paint Chem Check Sheet — <?php echo htmlspecialchars($logDate); ?> <?php echo $shift; ?></title>
<style>
  /* ===== PAGE SETUP ===== */
  @page { size: A4 landscape; margin: 8mm 7mm 8mm 7mm; }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'TH Sarabun New', 'Sarabun', 'Arial', sans-serif;
    font-size: 7pt;
    color: #000;
    background: #525659;   /* dark background = paper preview */
    padding: 20px 0;
  }

  /* ===== PAPER CARD ===== */
  .page {
    width: 283mm;         /* A4L = 297mm, minus margins 7+7 = 283mm */
    min-height: 200mm;
    background: #fff;
    margin: 0 auto 20px auto;
    padding: 5mm 5mm 5mm 5mm;
    box-shadow: 0 4px 16px rgba(0,0,0,0.55);
    position: relative;
  }

  /* ===== PRINT BUTTON ===== */
  .no-print {
    position: fixed;
    top: 14px;
    right: 18px;
    z-index: 9999;
  }
  .no-print button {
    padding: 9px 20px;
    background: #1d4ed8;
    color: #fff;
    border: none;
    border-radius: 5px;
    font-size: 12pt;
    font-family: 'TH Sarabun New','Sarabun',Arial,sans-serif;
    font-weight: bold;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(0,0,0,0.35);
  }
  .no-print button:hover { background: #1e40af; }

  /* ===== HEADER SECTION ===== */
  .doc-header {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 3mm;
  }
  .doc-header td { vertical-align: middle; padding: 0 2mm; }
  .company-name {
    font-size: 18pt;
    font-weight: 900;
    color: #b91c1c;
    letter-spacing: 1px;
  }
  .doc-title {
    text-align: center;
    font-size: 11pt;
    font-weight: bold;
    color: #1e3a5f;
    border-bottom: 2.5px solid #1e3a5f;
    padding-bottom: 2px;
  }
  .doc-title span { font-weight: 900; color: #b91c1c; }
  .doc-meta {
    text-align: right;
    font-size: 7.5pt;
    line-height: 1.7;
  }
  .meta-label { color: #555; }
  .meta-value { font-weight: bold; color: #000; }

  /* ===== MAIN DATA TABLE ===== */
  table.main {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    font-size: 6pt;
  }
  table.main th,
  table.main td {
    border: 1px solid #374151;
    padding: 1.5px 2px;
    text-align: center;
    vertical-align: middle;
    word-break: break-word;
    overflow: hidden;
    line-height: 1.25;
  }
  .bg-header {
    background-color: #1e3a5f;
    color: #fff;
    font-weight: bold;
    font-size: 6pt;
  }
  .bg-sub {
    background-color: #dbeafe;
    color: #1e3a5f;
    font-weight: bold;
    font-size: 5.5pt;
  }
  .oor { background-color: #fee2e2; color: #b91c1c; font-weight: bold; }
  .align-left { text-align: left; }

  /* ===== COLUMN WIDTHS (total 283mm - 10mm padding = 273mm) ===== */
  col.c-no    { width: 7mm;  }
  col.c-proc  { width: 20mm; }
  col.c-chem  { width: 17mm; }
  col.c-param { width: 18mm; }
  col.c-std   { width: 14mm; }
  col.c-min   { width: 6mm;  }
  col.c-max   { width: 6mm;  }
  /* remaining = 273 - 7-20-17-18-14-6-6 = 185mm / 18 sub-cols ≈ 10.3mm each */
  col.c-bf    { width: 10.3mm; }
  col.c-af    { width: 10.3mm; }
  col.c-kg    { width: 10.3mm; }

  /* ===== OVEN / FOOTER SECTION ===== */
  table.footer-tbl {
    width: 100%;
    border-collapse: collapse;
    margin-top: 2mm;
    font-size: 6.5pt;
  }
  table.footer-tbl td, table.footer-tbl th {
    border: 1px solid #374151;
    padding: 2px 4px;
    vertical-align: middle;
  }
  .sig-line { height: 30px; }
  .bg-std { background-color: #dbeafe; font-weight: bold; text-align: center; }
  .bg-remark { background-color: #f0f9ff; font-weight: bold; text-align: center; }

  /* ===== PRINT OVERRIDES ===== */
  @media print {
    body { background: white !important; padding: 0 !important; }
    .no-print { display: none !important; }
    .page {
      width: 100% !important;
      margin: 0 !important;
      padding: 5mm !important;
      box-shadow: none !important;
      min-height: auto !important;
    }
    table.main { font-size: 5.5pt !important; }
  }
</style>
</head>
<body>

<div class="no-print">
  <button onclick="window.print()">🖨&nbsp; พิมพ์ / บันทึก PDF</button>
</div>

<div class="page">

  <!-- ===== DOCUMENT HEADER ===== -->
  <table class="doc-header">
    <tr>
      <td width="16%">
        <div class="company-name">SCAN</div>
        <div style="font-size:6.5pt;color:#555;margin-top:1px;">บริษัท เอส เอ็น ซี ฟอร์เมอร์ จำกัด</div>
      </td>
      <td width="60%">
        <div class="doc-title">
          Parameter &amp; <span>Chemicals</span> Control Check Sheet
        </div>
      </td>
      <td width="24%" class="doc-meta">
        <div><span class="meta-label">ว/ด/ป: </span><span class="meta-value"><?php echo $dateLabel; ?></span></div>
        <div><span class="meta-label">กะทำงาน: </span><span class="meta-value"><?php echo $shiftLabel; ?></span></div>
      </td>
    </tr>
  </table>

  <!-- ===== MAIN DATA TABLE ===== -->
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
      <tr class="bg-header">
        <th rowspan="2">บ่อ<br>เคมี</th>
        <th rowspan="2">กระบวนการ</th>
        <th rowspan="2">สารเคมีที่ใช้</th>
        <th rowspan="2">หัวข้อควบคุม</th>
        <th rowspan="2">ค่ามาตรฐาน</th>
        <th colspan="2">ค่าควบคุม</th>
        <?php foreach ($timeSlots as $ts): ?>
        <th colspan="3"><?php echo htmlspecialchars($ts); ?></th>
        <?php endforeach; ?>
      </tr>
      <tr class="bg-sub">
        <th>ต่ำสุด</th>
        <th>สูงสุด</th>
        <?php for ($i = 0; $i < 6; $i++): ?>
        <th>ก่อนปรับ</th><th>หลังปรับ</th><th>กก.</th>
        <?php endfor; ?>
      </tr>
    </thead>
    <tbody>
    <?php foreach ($stations as $sNo => $st):
        $rowspan = count($st['params']); ?>
      <?php foreach ($st['params'] as $idx => $p):
          $isFirst = ($idx === 0); ?>
      <tr>
        <?php if ($isFirst): ?>
        <td rowspan="<?php echo $rowspan; ?>" style="font-weight:bold;"><?php echo $sNo; ?></td>
        <td rowspan="<?php echo $rowspan; ?>" style="text-align:left;font-size:5.5pt;"><?php echo $st['name']; ?></td>
        <td rowspan="<?php echo $rowspan; ?>" style="text-align:left;font-size:5.5pt;"><?php echo $st['chem']; ?></td>
        <?php endif; ?>
        <td class="align-left" style="font-size:5.5pt;"><?php echo htmlspecialchars($p['label']); ?></td>
        <td style="font-size:5.5pt;"><?php echo $p['std']; ?></td>
        <td><?php echo $p['min']; ?></td>
        <td><?php echo $p['max']; ?></td>
        <?php foreach ($timeSlots as $ts):
            $log = $logs[$sNo][$p['key']][$ts] ?? null;
            if ($p['isOvf']) {
                $bf = $log ? ($log['is_overflow'] ? 'Ovf' : 'No') : '';
                $af = ''; $kg = '';
            } else {
                $bf = $log && $log['before_value'] !== null ? $log['before_value'] : '';
                $af = $log && $log['after_value']  !== null ? $log['after_value']  : '';
                $kg = ($p['hasKg'] && $log && $log['chemical_added_kg'] !== null) ? $log['chemical_added_kg'] : '';
            }
        ?>
        <td><?php echo htmlspecialchars((string)$bf); ?></td>
        <td><?php echo htmlspecialchars((string)$af); ?></td>
        <td><?php echo htmlspecialchars((string)$kg); ?></td>
        <?php endforeach; ?>
      </tr>
      <?php endforeach; ?>
    <?php endforeach; ?>
      <tr>
        <td colspan="3" style="text-align:right;font-weight:bold;background:#f8fafc;">Bake Oven Temp. (°C)</td>
        <td style="font-weight:bold;background:#f8fafc;">Standard</td>
        <td colspan="2" class="bg-std">175 – 220 °C</td>
        <td colspan="18"><?php echo htmlspecialchars((string)$bake); ?></td>
      </tr>
      <tr>
        <td colspan="3" style="text-align:right;font-weight:bold;background:#f8fafc;">Dry Oven Temp. (°C)</td>
        <td style="font-weight:bold;background:#f8fafc;">Standard</td>
        <td colspan="2" class="bg-std">140 – 160 °C</td>
        <td colspan="18"><?php echo htmlspecialchars((string)$dry); ?></td>
      </tr>
    </tbody>
  </table>

  <!-- ===== FOOTER / SIGNATURE SECTION ===== -->
  <table class="footer-tbl">
    <tr>
      <td rowspan="2" width="15%" style="vertical-align:top;font-weight:bold;font-size:7pt;">Note.</td>
      <td rowspan="2" width="30%" class="sig-line"></td>
      <td width="22%" class="bg-remark">Remark</td>
      <td width="16.5%" class="bg-std">Standard</td>
      <td width="16.5%" style="font-weight:bold;text-align:center;">Actual</td>
    </tr>
    <tr>
      <td class="bg-remark">Painting Condition:<br>1) Speed Conveyor (m/min)</td>
      <td class="bg-std">2.5 – 5.0</td>
      <td style="text-align:center;font-weight:bold;"><?php echo htmlspecialchars((string)$speed); ?></td>
    </tr>
    <tr>
      <td colspan="2" style="border-top:1.5px solid #374151;height:28px;"></td>
      <td style="text-align:center;font-weight:bold;">Prepared by</td>
      <td style="text-align:center;font-weight:bold;">Checked by</td>
      <td style="text-align:center;font-weight:bold;">Approved by</td>
    </tr>
    <tr>
      <td colspan="2" style="height:32px;"></td>
      <td style="text-align:center;font-size:6pt;">
        ...............................<br>
        <span style="font-size:6.5pt;"><?php echo htmlspecialchars($preparedBy); ?></span>
      </td>
      <td style="text-align:center;font-size:6pt;">...............................</td>
      <td style="text-align:center;font-size:6pt;">...............................</td>
    </tr>
  </table>

</div><!-- .page -->
</body>
</html>