<?php
header('Content-Type: text/html; charset=utf-8');
// page/paintChem/api/export_pdf.php
// Renders printable HTML — browser-native print supporting Single & Batch Multi-Sheet modes.
require_once '../../db.php';
require_once '../../../auth/check_auth.php';

$isBlank = !empty($_GET['blank']);
$logDate = $_GET['date'] ?? date('Y-m-d');
$shift   = $_GET['shift'] ?? 'DAY';

// Batch parameters
$isBatch = !empty($_GET['batch']) || !empty($_GET['header_ids']) || !empty($_GET['start_date']);
$headerIdsParam = trim($_GET['header_ids'] ?? '');
$startDate = trim($_GET['start_date'] ?? '');
$endDate   = trim($_GET['end_date'] ?? '');
$batchShift = strtoupper(trim($_GET['shift'] ?? ''));

$headersList = [];

if ($isBatch) {
    if ($headerIdsParam !== '') {
        $idArr = array_filter(array_map('intval', explode(',', $headerIdsParam)));
        if (!empty($idArr)) {
            $inPlaceholders = implode(',', array_fill(0, count($idArr), '?'));
            $stmt = $pdo->prepare("SELECT h.*, 
                       up.fullname AS prepared_by_name,
                       uc.fullname AS checked_by_name,
                       ua.fullname AS approved_by_name
                FROM dbo.PAINT_CHEM_SHEET_HEADER h
                LEFT JOIN dbo.USERS up ON up.id = h.prepared_by
                LEFT JOIN dbo.USERS uc ON uc.id = h.checked_by
                LEFT JOIN dbo.USERS ua ON ua.id = h.approved_by
                WHERE h.header_id IN ($inPlaceholders)
                ORDER BY h.log_date ASC, h.shift ASC");
            $stmt->execute(array_values($idArr));
            $headersList = $stmt->fetchAll();
        }
    } elseif ($startDate !== '' && $endDate !== '') {
        $shiftSql = in_array($batchShift, ['DAY', 'NIGHT']) ? "AND h.shift = ?" : "";
        $params = [$startDate, $endDate];
        if (in_array($batchShift, ['DAY', 'NIGHT'])) $params[] = $batchShift;

        $stmt = $pdo->prepare("SELECT h.*, 
                   up.fullname AS prepared_by_name,
                   uc.fullname AS checked_by_name,
                   ua.fullname AS approved_by_name
            FROM dbo.PAINT_CHEM_SHEET_HEADER h
            LEFT JOIN dbo.USERS up ON up.id = h.prepared_by
            LEFT JOIN dbo.USERS uc ON uc.id = h.checked_by
            LEFT JOIN dbo.USERS ua ON ua.id = h.approved_by
            WHERE h.log_date BETWEEN ? AND ? $shiftSql
            ORDER BY h.log_date ASC, h.shift ASC");
        $stmt->execute($params);
        $headersList = $stmt->fetchAll();
    }
} else {
    // Single sheet mode (existing behavior)
    $stmtH = $pdo->prepare("SELECT h.*, 
               up.fullname AS prepared_by_name,
               uc.fullname AS checked_by_name,
               ua.fullname AS approved_by_name
        FROM dbo.PAINT_CHEM_SHEET_HEADER h
        LEFT JOIN dbo.USERS up ON up.id = h.prepared_by
        LEFT JOIN dbo.USERS uc ON uc.id = h.checked_by
        LEFT JOIN dbo.USERS ua ON ua.id = h.approved_by
        WHERE h.log_date = ? AND h.shift = ?");
    if (!$isBlank) {
        $stmtH->execute([$logDate, $shift]);
        $singleH = $stmtH->fetch();
        if ($singleH) {
            $headersList = [$singleH];
        } else {
            $headersList = [];
        }
    } else {
        $headersList = [null]; // Blank sheet template
    }
}

$stations = [
    1 => ['name' => 'Degreasing 1<br>6.3 Kg/pt-up',    'chem' => 'FC-TS008', 'params' => [
        ['key' => 'F_Al',        'label' => 'F.Al',        'std' => '10-12 pt',    'min' => '10',  'max' => '12',  'hasKg' => true,  'isOvf' => false],
        ['key' => 'Temperature', 'label' => 'Temperature', 'std' => '25-35 °C',    'min' => '25',  'max' => '35',  'hasKg' => true, 'isOvf' => false],
        ['key' => 'Pressure',    'label' => 'Pressure',    'std' => '0.4-0.8 Bar', 'min' => '0.4', 'max' => '0.8', 'hasKg' => true, 'isOvf' => false],
    ]],
    2 => ['name' => 'Degreasing 2<br>12.4 Kg/pt-up',   'chem' => 'FC-TS008', 'params' => [
        ['key' => 'F_Al',        'label' => 'F.Al',        'std' => '10-12 pt',    'min' => '10',  'max' => '12',  'hasKg' => true,  'isOvf' => false],
        ['key' => 'Temperature', 'label' => 'Temperature', 'std' => '25-35 °C',    'min' => '25',  'max' => '35',  'hasKg' => true, 'isOvf' => false],
        ['key' => 'Pressure',    'label' => 'Pressure',    'std' => '0.4-0.8 Bar', 'min' => '0.4', 'max' => '0.8', 'hasKg' => true, 'isOvf' => false],
    ]],
    3 => ['name' => 'Water Rinse 1', 'chem' => 'Water Rinse 1', 'params' => [
        ['key' => 'Conta_WR1',      'label' => 'pH',         'std' => '-',            'min' => '-',   'max' => '-',   'hasKg' => true, 'isOvf' => false],
        ['key' => 'Pressure',       'label' => 'Pressure',   'std' => '0.4-0.8 Bar', 'min' => '0.4', 'max' => '0.8', 'hasKg' => true, 'isOvf' => false],
    ]],
    4 => ['name' => 'Water Rinse 2', 'chem' => 'Water Rinse 2', 'params' => [
        ['key' => 'Conta_WR2',      'label' => 'pH',         'std' => '-',            'min' => '-',   'max' => '-',   'hasKg' => true, 'isOvf' => false],
        ['key' => 'Pressure',       'label' => 'Pressure',   'std' => '0.4-0.8 Bar', 'min' => '0.4', 'max' => '0.8', 'hasKg' => true, 'isOvf' => false],
        ['key' => 'WaterLevel_WR2', 'label' => 'Water level','std' => '> Overflow',  'min' => '-',   'max' => '-',   'hasKg' => false, 'isOvf' => true],
    ]],
    5 => ['name' => 'Surface Cond.<br>0.2 Kg/day', 'chem' => 'NT-4055<br>PL-XG<br>AD-4977', 'params' => [
        ['key' => 'pH',             'label' => 'pH',         'std' => '9.0-11.0',    'min' => '9.0', 'max' => '11.0','hasKg' => true, 'isOvf' => false],
        ['key' => 'TC',             'label' => 'T.C',        'std' => '2.0-4.0 pt',  'min' => '2.0', 'max' => '4.0', 'hasKg' => true, 'isOvf' => false],
        ['key' => 'Pressure',       'label' => 'Pressure',   'std' => '0.4-0.8 Bar', 'min' => '0.4', 'max' => '0.8', 'hasKg' => true, 'isOvf' => false],
    ]],
    6 => ['name' => 'Zinc Phosphate<br>1.1 Kg/pt-down<br>12.9 Kg/pt-up<br>1 Kg/pt-up', 'chem' => 'NT-4055<br>PB-LT5103 RF-1<br>AC-131<br>AJ-T6', 'params' => [
        ['key' => 'Temperature',    'label' => 'Temperature',        'std' => '25-35 °C',    'min' => '25',  'max' => '35',  'hasKg' => true, 'isOvf' => false],
        ['key' => 'FA',             'label' => 'F.A.(Free Acid)',    'std' => '0.3-0.5 pt',  'min' => '0.3', 'max' => '0.5', 'hasKg' => true,  'isOvf' => false],
        ['key' => 'TA',             'label' => 'T.A.(Total Acidity)','std' => '23-25 pt',    'min' => '23',  'max' => '25',  'hasKg' => true,  'isOvf' => false],
        ['key' => 'AC',             'label' => 'A.C',                'std' => '2.0-4.0 pt',  'min' => '2.0', 'max' => '4.0', 'hasKg' => true,  'isOvf' => false],
        ['key' => 'Pressure',       'label' => 'Pressure',           'std' => '0.4-0.8 Bar', 'min' => '0.4', 'max' => '0.8', 'hasKg' => true, 'isOvf' => false],
    ]],
    7 => ['name' => 'Water Rinse 3', 'chem' => 'DI Water Rinse', 'params' => [
        ['key' => 'Conta_WR3',      'label' => 'pH',         'std' => '-',            'min' => '-',   'max' => '-',   'hasKg' => true, 'isOvf' => false],
        ['key' => 'Pressure',       'label' => 'Pressure',   'std' => '0.4-0.8 Bar', 'min' => '0.4', 'max' => '0.8', 'hasKg' => true, 'isOvf' => false],
    ]],
    8 => ['name' => 'Water Rinse 4', 'chem' => 'DI Water Rinse', 'params' => [
        ['key' => 'Conta_WR4',      'label' => 'pH',         'std' => '-',            'min' => '-',   'max' => '-',   'hasKg' => true, 'isOvf' => false],
        ['key' => 'Pressure',       'label' => 'Pressure',   'std' => '0.4-0.8 Bar', 'min' => '0.4', 'max' => '0.8', 'hasKg' => true, 'isOvf' => false],
        ['key' => 'WaterLevel_WR4', 'label' => 'Water level','std' => '> Overflow',  'min' => '-',   'max' => '-',   'hasKg' => false, 'isOvf' => true],
    ]],
    9 => ['name' => 'Deionized<br>Water Rinse', 'chem' => 'DI Water Rinse', 'params' => [
        ['key' => 'pH_DI',          'label' => 'pH',         'std' => '-',           'min' => '-',   'max' => '-',   'hasKg' => true, 'isOvf' => false],
        ['key' => 'EC',             'label' => 'EC',         'std' => '< 10 µS/cm',  'min' => '-',   'max' => '10',  'hasKg' => true, 'isOvf' => false],
        ['key' => 'FlowRate',       'label' => 'Flow rate',  'std' => '> 1.5 m3/hr', 'min' => '1.5', 'max' => '-',   'hasKg' => true, 'isOvf' => false],
    ]],
];

$totalSheets = count($headersList);
$docTitle = $totalSheets > 1 
    ? "Paint Chem Check Sheets — ชุดเอกสาร " . $totalSheets . " ใบ" 
    : "Paint Chem Check Sheet — " . htmlspecialchars($logDate) . " " . htmlspecialchars($shift);
?>
<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8">
<title><?php echo $docTitle; ?></title>
<style>
  @media screen { html { zoom: 110%; } }
  @media print {
    html { zoom: 100%; }
    .no-print { display: none !important; }
  }

  /* ===== PAGE SETUP ===== */
  @page {
    size: A4 landscape;
    margin: 5mm 5mm 5mm 5mm;
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'TH Sarabun New', 'Sarabun', 'Arial', sans-serif;
    font-size: 7.5pt;
    color: #000;
    background: #525659;   /* dark background = paper preview */
    padding: 16px 0;
  }

  /* ===== PAPER CARD ===== */
  .page {
    width: 287mm;         /* A4L = 297mm minus 5mm*2 = 287mm */
    height: 198mm;
    background: #fff;
    margin: 0 auto 18px auto;
    padding: 3mm 4mm;
    box-shadow: 0 4px 16px rgba(0,0,0,0.55);
    position: relative;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    page-break-inside: avoid;
    break-inside: avoid;
    page-break-after: always;
    break-after: page;
  }
  .page:last-child {
    margin-bottom: 0;
  }

  /* ===== TOP ACTION BAR ===== */
  .no-print-bar {
    position: fixed;
    top: 12px;
    right: 18px;
    z-index: 9999;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .no-print-bar button {
    background: #2563eb;
    color: #fff;
    border: none;
    padding: 8px 18px;
    border-radius: 6px;
    font-size: 13px;
    font-weight: bold;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0,0,0,0.35);
    transition: background 0.15s;
  }
  .no-print-bar button:hover {
    background: #1d4ed8;
  }
  .no-print-badge {
    background: rgba(15, 23, 42, 0.9);
    color: #fff;
    padding: 7px 14px;
    border-radius: 6px;
    font-size: 12px;
    font-family: sans-serif;
    font-weight: 600;
    box-shadow: 0 4px 12px rgba(0,0,0,0.25);
  }

  /* ===== DOCUMENT HEADER ===== */
  table.doc-header {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 2mm;
    flex-shrink: 0;
  }
  table.doc-header td {
    vertical-align: middle;
    border: none;
    padding: 0;
  }
  .doc-title {
    font-size: 14pt;
    font-weight: bold;
    color: #1e3a5f;
    letter-spacing: 0.5px;
    text-align: center;
  }
  .doc-title span { color: #dc2626; }
  .doc-meta {
    text-align: right;
    font-size: 7.5pt;
    line-height: 1.4;
  }
  .doc-meta .meta-label { color: #555; }
  .doc-meta .meta-value { font-weight: bold; }

  /* ===== MAIN TABLE ===== */
  table.main {
    width: 100%;
    border-collapse: collapse;
    font-size: 6.2pt;
    table-layout: fixed;
    flex-shrink: 0;
  }
  table.main th,
  table.main td {
    border: 1px solid #374151;
    padding: 3px 1.5px;
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
    font-size: 6.2pt;
  }
  .bg-sub {
    background-color: #dbeafe;
    color: #1e3a5f;
    font-weight: bold;
    font-size: 5.8pt;
  }
  .oor { background-color: #fee2e2; color: #b91c1c; font-weight: bold; }
  .align-left { text-align: left; }

  /* ===== COLUMN WIDTHS ===== */
  col.c-no    { width: 7mm;  }
  col.c-proc  { width: 18mm; }
  col.c-chem  { width: 16mm; }
  col.c-param { width: 17mm; }
  col.c-std   { width: 13mm; }
  col.c-min   { width: 6mm;  }
  col.c-max   { width: 6mm;  }
  col.c-bf    { width: 10.8mm; }
  col.c-af    { width: 10.8mm; }
  col.c-kg    { width: 10.8mm; }

  /* ===== DYNAMIC FOOTER SECTION ===== */
  .footer-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    margin-top: 2.5mm;
  }
  table.footer-tbl {
    width: 100%;
    height: 100%;
    flex: 1;
    border-collapse: collapse;
    font-size: 6.5pt;
  }
  table.footer-tbl td, table.footer-tbl th {
    border: 1px solid #374151;
    padding: 3px 5px;
    vertical-align: middle;
  }
  table.footer-tbl th {
    height: 18px;
    padding: 2px 4px;
    font-weight: bold;
    text-align: center;
  }
  .sig-row td {
    vertical-align: bottom !important;
    text-align: center !important;
    padding-bottom: 8px !important;
  }
  .note-cell {
    vertical-align: top !important;
    text-align: left !important;
  }
  .remark-cell {
    vertical-align: top !important;
    text-align: center !important;
  }
  .bg-std { background-color: #dbeafe; font-weight: bold; text-align: center; }
  .bg-remark { background-color: #f0f9ff; font-weight: bold; text-align: center; }

  /* ===== PRINT OVERRIDES ===== */
  @media print {
    html, body {
      width: 100% !important;
      height: auto !important;
      background: white !important;
      padding: 0 !important;
      margin: 0 !important;
      overflow: visible !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .no-print, .no-print-bar { display: none !important; }
    .page {
      width: 100% !important;
      max-width: 100% !important;
      height: 198mm !important;
      max-height: 198mm !important;
      margin: 0 !important;
      padding: 2mm 3mm !important;
      box-shadow: none !important;
      display: flex !important;
      flex-direction: column !important;
      overflow: hidden !important;
      page-break-after: always !important;
      break-after: page !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    .page:last-child {
      page-break-after: auto !important;
      break-after: auto !important;
    }
    .doc-header {
      flex-shrink: 0 !important;
      margin-bottom: 2mm !important;
    }
    table.main {
      flex-shrink: 0 !important;
      font-size: 6pt !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    table.main th,
    table.main td {
      padding: 3px 1.5px !important;
      line-height: 1.25 !important;
    }
    .footer-container {
      flex: 1 !important;
      display: flex !important;
      flex-direction: column !important;
      min-height: 0 !important;
      margin-top: 2mm !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    table.footer-tbl {
      width: 100% !important;
      height: 100% !important;
      flex: 1 !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
  }
</style>
</head>
<body>

<?php if ($totalSheets > 0): ?>
<div class="no-print-bar">
  <?php if ($totalSheets > 1): ?>
  <span class="no-print-badge">เอกสารทั้งหมด <?php echo $totalSheets; ?> ใบ</span>
  <button onclick="window.print()">🖨️ พิมพ์ทั้งหมด (Print All <?php echo $totalSheets; ?> Pages)</button>
  <?php else: ?>
  <button onclick="window.print()">🖨️ พิมพ์ / บันทึก PDF</button>
  <?php endif; ?>
</div>
<?php endif; ?>

<?php
if ($totalSheets === 0) {
    echo '<div style="max-width:500px; margin:80px auto; background:#fff; padding:32px; border-radius:12px; text-align:center; font-family:sans-serif; box-shadow:0 4px 16px rgba(0,0,0,0.2);">';
    echo '<h3 style="color:#1e3a5f; margin-bottom:8px; font-size:18px;">ไม่พบข้อมูลเอกสารตามเงื่อนไขที่เลือก</h3>';
    echo '<p style="color:#666; font-size:14px; margin-bottom:20px;">กรุณาตรวจสอบช่วงวันที่หรือเงื่อนไขการค้นหาอีกครั้ง</p>';
    echo '<button onclick="window.close()" style="background:#e2e8f0; color:#334155; border:none; padding:8px 20px; border-radius:6px; font-weight:bold; cursor:pointer;">ปิดหน้าต่างนี้</button>';
    echo '</div>';
}

function renderSheetPage($header, $logs, $shift, $logDate, $isBlank, $stations, $sheetIndex, $totalSheets) {
    $timeSlots = $shift === 'DAY'
        ? ['08:00-09:00','10:00-11:00','13:00-14:00','15:00-16:00','17:30-18:30','19:30-20:30']
        : ['20:00-22:00','22:00-00:00','01:00-03:00','03:00-05:00','05:30-07:00','07:00-08:00'];

    $noteLines = [];
    $legacyNote = trim((string)($header['note'] ?? ''));
    if ($legacyNote !== '') $noteLines[] = $legacyNote;
    foreach ($timeSlots as $ts) {
        $slotNote = trim((string)($logs[12]['SlotNote'][$ts]['note'] ?? ''));
        if ($slotNote !== '') $noteLines[] = '[' . $ts . '] ' . $slotNote;
    }
    $noteText = implode("\n", $noteLines);
    $noteCount = count($noteLines);
    $noteLen = mb_strlen($noteText);
    $isMultiCol = ($noteCount >= 5 || $noteLen > 220);
    $noteFontSize = ($noteCount >= 7 || $noteLen > 300) ? '5.2pt' : (($noteCount >= 5 || $noteLen > 180) ? '5.8pt' : '6.5pt');
    $noteColStyle = $isMultiCol ? "column-count: 2; column-gap: 5mm; -webkit-column-count: 2; -webkit-column-gap: 5mm;" : "";
    $preparedBy = $header['prepared_by_name'] ?? '';
    $checkedBy  = $header['checked_by_name'] ?? '';
    $approvedBy = $header['approved_by_name'] ?? '';
    $shiftLabel = $shift === 'DAY' ? 'กลางวัน (DAY)' : 'กลางคืน (NIGHT)';
    $dateLabel  = $isBlank ? '.....................' : date('d/m/Y', strtotime($logDate));
?>
<div class="page">
  <?php if ($totalSheets > 1): ?>
  <div class="no-print" style="position:absolute; top:2px; left:6px; font-size:10px; color:#6b7280; font-family:sans-serif;">
    ใบที่ <?php echo $sheetIndex; ?> / <?php echo $totalSheets; ?> — <?php echo htmlspecialchars($logDate); ?> (<?php echo $shift; ?>)
  </div>
  <?php endif; ?>

  <!-- ===== DOCUMENT HEADER ===== -->
  <table class="doc-header">
    <tr>
      <td width="25%">
          <img alt="SNC Logo" src="/iot-toolbox/sandbox-b9/Toolbox/assets/logo.webp" style="height: 28px; object-fit: contain; margin-bottom: 2px;">
          <div style="font-size:6.5pt;color:#555;margin-top:1px;">บริษัท เอส เอ็น ซี ฟอร์เมอร์ จำกัด</div>
        </td>
      <td width="50%">
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
        <th rowspan="2">ชื่อ<br>เคมี</th>
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
        <td rowspan="<?php echo $rowspan; ?>" style="text-align:left;font-size:5.8pt;"><?php echo $st['name']; ?></td>
        <td rowspan="<?php echo $rowspan; ?>" style="text-align:left;font-size:5.8pt;"><?php echo $st['chem']; ?></td>
        <?php endif; ?>
        <td class="align-left" style="font-size:5.8pt;"><?php echo htmlspecialchars($p['label']); ?></td>
        <td style="font-size:5.8pt;"><?php echo $p['std']; ?></td>
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
          <td class="bg-std">175 – 220</td>
          <td colspan="2" style="background-color: #4b5563;"></td>
          <?php foreach ($timeSlots as $ts):
              $lb = $logs[10]['BakeOvenTemp'][$ts] ?? null;
              $valb = $lb ? htmlspecialchars((string)$lb['before_value']) : '';
          ?>
          <td colspan="3"><?php echo $valb; ?></td>
          <?php endforeach; ?>
        </tr>
      <tr>
          <td colspan="3" style="text-align:right;font-weight:bold;background:#f8fafc;">Dry Oven Temp. (°C)</td>
          <td style="font-weight:bold;background:#f8fafc;">Standard</td>
          <td class="bg-std">175 – 220</td>
          <td colspan="2" style="background-color: #4b5563;"></td>
          <?php foreach ($timeSlots as $ts):
              $ld = $logs[10]['DryOvenTemp'][$ts] ?? null;
              $vald = $ld ? htmlspecialchars((string)$ld['before_value']) : '';
          ?>
          <td colspan="3"><?php echo $vald; ?></td>
          <?php endforeach; ?>
        </tr>
        <tr>
          <td colspan="3" style="text-align:right;font-weight:bold;background:#f8fafc;">Speed Conveyor (m/min)</td>
          <td style="font-weight:bold;background:#f8fafc;">Standard</td>
          <td class="bg-std">2.5 – 5.0</td>
          <td colspan="2" style="background-color: #4b5563;"></td>
          <?php foreach ($timeSlots as $ts):
              $lc = $logs[11]['ConveyorSpeed'][$ts] ?? null;
              $valc = $lc ? htmlspecialchars((string)$lc['before_value']) : '';
          ?>
          <td colspan="3"><?php echo $valc; ?></td>
          <?php endforeach; ?>
        </tr>
    </tbody>
  </table>

  <!-- ===== DYNAMIC FOOTER / SIGNATURE SECTION ===== -->
  <div class="footer-container">
    <table class="footer-tbl">
      <thead>
        <tr>
          <th width="42%" style="text-align:left; font-size:7pt; color:#1e3a5f;">Note.</th>
          <th width="16%" class="bg-remark" style="font-size:7pt; color:#1e3a5f;">Remark</th>
          <th width="14%">Prepared by</th>
          <th width="14%">Checked by</th>
          <th width="14%">Approved by</th>
        </tr>
      </thead>
      <tbody>
        <tr class="sig-row">
          <td class="note-cell">
            <div style="font-size:<?php echo $noteFontSize; ?>; line-height:1.2; <?php echo $noteColStyle; ?>">
              <?php if (empty($noteLines)): ?>
                &nbsp;
              <?php else: ?>
                <?php foreach ($noteLines as $nl): ?>
                  <div style="break-inside: avoid; -webkit-column-break-inside: avoid; margin-bottom: 2px;"><?php echo htmlspecialchars($nl); ?></div>
                <?php endforeach; ?>
              <?php endif; ?>
            </div>
          </td>
          <td class="remark-cell bg-remark"></td>
          <td>
            <div style="margin-bottom:6px; color:#555;">...................................</div>
            <div style="font-size:6.5pt; font-weight:bold;"><?php echo htmlspecialchars($preparedBy); ?></div>
          </td>
          <td>
            <div style="margin-bottom:6px; color:#555;">...................................</div>
            <div style="font-size:6.5pt; font-weight:bold;"><?php echo htmlspecialchars($checkedBy); ?></div>
          </td>
          <td>
            <div style="margin-bottom:6px; color:#555;">...................................</div>
            <div style="font-size:6.5pt; font-weight:bold;"><?php echo htmlspecialchars($approvedBy); ?></div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</div><!-- .page -->
<?php
}

$sheetIndex = 1;
foreach ($headersList as $h) {
    $curShift = $h ? $h['shift'] : ($shift ?: 'DAY');
    $curDate  = $h ? $h['log_date'] : $logDate;
    $curLogs  = [];
    if ($h) {
        $stmtL = $pdo->prepare("SELECT time_slot, station_no, parameter_key, before_value, after_value, chemical_added_kg, is_overflow, note FROM dbo.PAINT_CHEM_LOG WHERE header_id = ?");
        $stmtL->execute([$h['header_id']]);
        while ($row = $stmtL->fetch()) {
            $curLogs[$row['station_no']][$row['parameter_key']][$row['time_slot']] = $row;
        }
    }
    renderSheetPage($h, $curLogs, $curShift, $curDate, $isBlank, $stations, $sheetIndex++, $totalSheets);
}
?>

</body>
</html>
