<?php
/**
 * print_iqs.php — Audit-Ready Printable IQS Check Sheet
 * Path: MES/MES/page/IQS/print_iqs.php
 * Inspired by Paint Chem Check Sheet architecture (A4 Landscape, multi-slot daily matrix,
 * line-adaptive criteria for SPOT, BEND, PRESS, inspector & QA sign-offs, and non-backdatable audit trail).
 */

require_once __DIR__ . '/../../auth/check_auth.php';
require_once __DIR__ . '/../db.php';

// 1. Parameter extraction with fallback support
$roundId = (int)($_GET['round_id'] ?? 0);
$logDate = trim($_GET['date'] ?? '');
$selectedLine = strtoupper(trim($_GET['line'] ?? ''));
$selectedShift = strtoupper(trim($_GET['shift'] ?? 'ALL'));
$viewMode = strtolower(trim($_GET['view'] ?? 'matrix')); // 'matrix' or 'log'

// If round_id provided, preload its meta
$activeRound = null;
if ($roundId > 0) {
    $stmtR = $pdo->prepare("
        SELECT r.*, 
               u1.fullname AS primary_tester_name,
               u2.fullname AS co_tester_name_1,
               u3.fullname AS co_tester_name_2
        FROM dbo.IQS_ROUNDS r
        LEFT JOIN dbo.USERS u1 ON r.primary_tester_id = u1.id
        LEFT JOIN dbo.USERS u2 ON r.co_tester_id_1 = u2.id
        LEFT JOIN dbo.USERS u3 ON r.co_tester_id_2 = u3.id
        WHERE r.round_id = :round_id
    ");
    $stmtR->execute([':round_id' => $roundId]);
    $activeRound = $stmtR->fetch(PDO::FETCH_ASSOC);

    if ($activeRound) {
        if (!$logDate) $logDate = $activeRound['plan_date'];
        if (!$selectedLine) $selectedLine = $activeRound['line'];
        if ($selectedShift === 'ALL') $selectedShift = $activeRound['shift'];
    }
}

if (!$logDate) {
    $logDate = date('Y-m-d');
}
if (!$selectedLine) {
    $selectedLine = 'SPOT';
}
if (!in_array($selectedShift, ['ALL', 'DAY', 'NIGHT'])) {
    $selectedShift = 'ALL';
}

// 2. Standard 7 Daily Time Slots definition
$dailySlots = [
    '08:30' => ['name' => 'รอบเช้า (08:30)', 'shift' => 'DAY', 'label' => '08:30 น.'],
    '10:30' => ['name' => 'รอบสาย (10:30)', 'shift' => 'DAY', 'label' => '10:30 น.'],
    '13:00' => ['name' => 'รอบบ่าย (13:00)', 'shift' => 'DAY', 'label' => '13:00 น.'],
    '15:30' => ['name' => 'รอบเย็น (15:30)', 'shift' => 'DAY', 'label' => '15:30 น.'],
    '20:30' => ['name' => 'รอบค่ำ (20:30)', 'shift' => 'NIGHT', 'label' => '20:30 น.'],
    '22:30' => ['name' => 'รอบดึก (22:30)', 'shift' => 'NIGHT', 'label' => '22:30 น.'],
    '02:30' => ['name' => 'รอบเช้ามืด (02:30)', 'shift' => 'NIGHT', 'label' => '02:30 น.'],
];

// Filter slots if specific shift is selected
if ($selectedShift === 'DAY') {
    $activeSlots = array_filter($dailySlots, fn($s) => $s['shift'] === 'DAY');
} elseif ($selectedShift === 'NIGHT') {
    $activeSlots = array_filter($dailySlots, fn($s) => $s['shift'] === 'NIGHT');
} else {
    $activeSlots = $dailySlots;
}

// 3. Query all target machines
$sqlMachines = "
    SELECT m.machine_id, m.machine_code, m.machine_name, m.line, m.line AS line_group, m.area, m.machine_type
    FROM dbo.PE_MACHINES m
    WHERE m.area = 'B9'
";
$paramsM = [];
if ($selectedLine !== 'ALL') {
    $sqlMachines .= " AND m.line = :line";
    $paramsM[':line'] = $selectedLine;
}
$sqlMachines .= " ORDER BY m.line ASC, m.machine_code ASC";

$stmtM = $pdo->prepare($sqlMachines);
$stmtM->execute($paramsM);
$machines = $stmtM->fetchAll(PDO::FETCH_ASSOC);

// 4. Query test records for the selected date & line
$sqlRecs = "
    SELECT rec.record_id, rec.round_id, rec.machine_id, rec.machine_code,
           rec.sku, rec.po_no, rec.thickness, rec.pull_result,
           rec.knock_check_val, rec.distance_check_val,
           rec.custom_check_val_1, rec.custom_check_val_2, rec.custom_check_text,
           rec.is_skipped, rec.skip_reason, rec.ng_status, rec.ng_remark,
           CONVERT(varchar(5), rec.recorded_at, 108) AS recorded_time,
           CONVERT(varchar(10), rec.recorded_at, 120) AS recorded_date,
           rec.recorded_at,
           r.round_number, r.round_name, r.line, r.shift,
           m.machine_name, m.line AS line_group, m.line,
           u.fullname AS inspector_name
    FROM dbo.IQS_TEST_RECORDS rec
    JOIN dbo.IQS_ROUNDS r ON rec.round_id = r.round_id
    JOIN dbo.PE_MACHINES m ON rec.machine_id = m.machine_id
    LEFT JOIN dbo.USERS u ON r.primary_tester_id = u.id
    WHERE CONVERT(date, r.plan_date) = :plan_date
";
$paramsR = [':plan_date' => $logDate];

if ($selectedLine !== 'ALL') {
    $sqlRecs .= " AND r.line = :line";
    $paramsR[':line'] = $selectedLine;
}
if ($selectedShift !== 'ALL') {
    $sqlRecs .= " AND r.shift = :shift";
    $paramsR[':shift'] = $selectedShift;
}
if ($roundId > 0) {
    $sqlRecs .= " AND r.round_id = :round_id";
    $paramsR[':round_id'] = $roundId;
}
$sqlRecs .= " ORDER BY m.line ASC, m.machine_code ASC, rec.recorded_at ASC";

$stmtRecs = $pdo->prepare($sqlRecs);
$stmtRecs->execute($paramsR);
$records = $stmtRecs->fetchAll(PDO::FETCH_ASSOC);

// Fetch attachments
$recordIds = array_column($records, 'record_id');
$attachmentsByRecord = [];
if (!empty($recordIds)) {
    $inPlaceholders = implode(',', array_fill(0, count($recordIds), '?'));
    $stmtAtt = $pdo->prepare("
        SELECT attach_id, record_id, attach_type, file_path, file_name
        FROM dbo.IQS_ATTACHMENTS
        WHERE record_id IN ($inPlaceholders)
    ");
    $stmtAtt->execute($recordIds);
    while ($att = $stmtAtt->fetch(PDO::FETCH_ASSOC)) {
        $attachmentsByRecord[$att['record_id']][] = $att;
    }
}

// 5. Build Matrix Map: matrixMap[machine_id][slot_key] = record
$matrixMap = [];
$machineLatestMeta = [];
$totalOkCount = 0;
$totalNgCount = 0;
$totalSkipCount = 0;
$inspectorsList = [];

foreach ($records as $r) {
    $mId = $r['machine_id'];
    
    // Store latest SKU and Thickness for machine
    if (!empty($r['sku'])) {
        $machineLatestMeta[$mId] = [
            'sku' => $r['sku'],
            'thickness' => $r['thickness'],
            'po_no' => $r['po_no']
        ];
    }

    if (!empty($r['inspector_name'])) {
        $inspectorsList[$r['inspector_name']] = true;
    }

    // Determine slot key
    $matchedSlot = null;
    foreach ($dailySlots as $slotKey => $slotDef) {
        if (strpos($r['round_name'], $slotKey) !== false) {
            $matchedSlot = $slotKey;
            break;
        }
    }
    // Fallback: match by recorded_time hour proximity
    if (!$matchedSlot && !empty($r['recorded_time'])) {
        $recHour = (int)substr($r['recorded_time'], 0, 2);
        if ($recHour < 10) $matchedSlot = '08:30';
        elseif ($recHour < 12) $matchedSlot = '10:30';
        elseif ($recHour < 15) $matchedSlot = '13:00';
        elseif ($recHour < 18) $matchedSlot = '15:30';
        elseif ($recHour < 22) $matchedSlot = '20:30';
        elseif ($recHour < 24) $matchedSlot = '22:30';
        else $matchedSlot = '02:30';
    }

    if ($matchedSlot) {
        $matrixMap[$mId][$matchedSlot] = $r;
    }

    if ($r['is_skipped']) {
        $totalSkipCount++;
    } elseif ($r['pull_result'] === 'OK') {
        $totalOkCount++;
    } elseif ($r['pull_result'] === 'NG') {
        $totalNgCount++;
    }
}

$inspectorNamesStr = !empty($inspectorsList) ? implode(', ', array_keys($inspectorsList)) : 'พนักงานประจำไลน์';
$lineTitleMap = [
    'SPOT' => '拉力测试 / SPOT WELD PULL TEST & DIMENSION CONTROL (สายการผลิต Spot Welding)',
    'BEND' => '折弯检查 / BENDING ANGLE & FLANGE CONTROL (สายการผลิต Bending)',
    'PRESS' => '冲压首件 / PRESS STAMPING FIRST PIECE INSPECTION (สายการผลิต Press Stamping)',
    'ALL' => 'IN-PROCESS QUALITY SYSTEM (IQS) AUDIT CHECK SHEET (รวมทุกสายการผลิต B9)',
];
$docTitle = $lineTitleMap[$selectedLine] ?? $lineTitleMap['SPOT'];
$dateDisplay = date('d/m/Y', strtotime($logDate));
$shiftDisplay = $selectedShift === 'DAY' ? 'กลางวัน (DAY)' : ($selectedShift === 'NIGHT' ? 'กลางคืน (NIGHT)' : 'ทุกกะ (ALL SHIFTS)');
?>
<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>IQS Daily Audit Check Sheet — <?php echo htmlspecialchars($logDate); ?> [<?php echo htmlspecialchars($selectedLine); ?>]</title>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
<style>
  /* ===== PRINT & A4 SETUP (Matching paintChem export_pdf.php) ===== */
  @page {
    size: A4 landscape;
    margin: 6mm 6mm 6mm 6mm;
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'TH Sarabun New', 'Sarabun', 'Segoe UI', Arial, sans-serif;
    font-size: 7.5pt;
    color: #111;
    background: #4b5563; /* Dark background preview */
    padding: 15px 0;
  }

  .page {
    width: 285mm;
    min-height: 198mm;
    background: #ffffff;
    margin: 0 auto 15px auto;
    padding: 5mm 6mm;
    box-shadow: 0 4px 18px rgba(0, 0, 0, 0.45);
    position: relative;
    border-radius: 2px;
  }

  /* ===== NO-PRINT FLOATING CONTROLS ===== */
  .no-print-toolbar {
    position: sticky;
    top: 10px;
    z-index: 9999;
    max-width: 285mm;
    margin: 0 auto 12px auto;
    background: #1e293b;
    color: #ffffff;
    padding: 8px 14px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    box-shadow: 0 4px 14px rgba(0,0,0,0.3);
    flex-wrap: wrap;
  }

  .toolbar-group {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .toolbar-group select,
  .toolbar-group input {
    background: #0f172a;
    border: 1px solid #334155;
    color: #ffffff;
    border-radius: 6px;
    padding: 5px 8px;
    font-size: 8.5pt;
  }

  .btn-tb {
    padding: 6px 14px;
    border-radius: 6px;
    font-size: 8.5pt;
    font-weight: bold;
    cursor: pointer;
    border: none;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    text-decoration: none;
    transition: opacity 0.15s ease;
  }
  .btn-tb:hover { opacity: 0.9; }
  .btn-tb-primary { background: #2563eb; color: #fff; }
  .btn-tb-success { background: #16a34a; color: #fff; }
  .btn-tb-outline { background: transparent; color: #94a3b8; border: 1px solid #475569; }

  /* ===== DOCUMENT HEADER ===== */
  .doc-header-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 3mm;
  }
  .doc-header-table td {
    vertical-align: middle;
    padding: 0 2mm;
  }
  .logo-box {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .logo-box img {
    height: 28px;
    object-fit: contain;
  }
  .company-title {
    font-size: 11pt;
    font-weight: 800;
    color: #0f172a;
    line-height: 1.15;
  }
  .company-sub {
    font-size: 6.5pt;
    color: #475569;
  }
  .doc-center-box {
    text-align: center;
  }
  .doc-main-title {
    font-size: 10.5pt;
    font-weight: 900;
    color: #1e3a8a;
    letter-spacing: 0.5px;
    border-bottom: 2px solid #1e3a8a;
    padding-bottom: 1px;
    display: inline-block;
  }
  .doc-sub-title {
    font-size: 8pt;
    font-weight: bold;
    color: #b91c1c;
    margin-top: 1px;
  }
  .doc-meta-table {
    width: 100%;
    font-size: 6.8pt;
    border-collapse: collapse;
    text-align: right;
  }
  .doc-meta-table td {
    padding: 1px 2px;
  }
  .meta-lbl { color: #475569; }
  .meta-val { font-weight: bold; color: #000; }

  /* ===== DATA MATRIX TABLE ===== */
  table.main-matrix {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    font-size: 6.2pt;
    line-height: 1.2;
  }
  table.main-matrix th,
  table.main-matrix td {
    border: 1px solid #374151;
    padding: 3px 2px;
    text-align: center;
    vertical-align: middle;
    word-break: break-word;
    overflow: hidden;
  }
  .th-primary {
    background-color: #1e3a8a;
    color: #ffffff;
    font-weight: 700;
    font-size: 6.5pt;
  }
  .th-sub {
    background-color: #dbeafe;
    color: #1e3a8a;
    font-weight: 700;
    font-size: 6pt;
  }
  .td-left {
    text-align: left !important;
    padding-left: 4px !important;
  }
  .badge-ok {
    display: inline-block;
    color: #15803d;
    font-weight: 900;
    font-size: 6.5pt;
  }
  .badge-ng {
    display: inline-block;
    color: #b91c1c;
    font-weight: 900;
    font-size: 6.5pt;
    background: #fee2e2;
    padding: 1px 3px;
    border-radius: 3px;
  }
  .badge-skip {
    display: inline-block;
    color: #6b7280;
    font-weight: 600;
    font-size: 5.5pt;
  }
  .cell-val-note {
    font-size: 5.2pt;
    color: #4b5563;
    display: block;
  }
  .row-zebra {
    background-color: #f8fafc;
  }

  /* Detailed Log Table */
  table.detailed-log {
    width: 100%;
    border-collapse: collapse;
    font-size: 6.2pt;
  }
  table.detailed-log th,
  table.detailed-log td {
    border: 1px solid #374151;
    padding: 3px 3px;
    text-align: center;
    vertical-align: middle;
  }
  .thumb-img {
    width: 28px;
    height: 28px;
    object-fit: cover;
    border-radius: 3px;
    border: 1px solid #cbd5e1;
    margin: 1px;
  }

  /* ===== FOOTER & SIGNATURE SECTION ===== */
  table.doc-footer-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 2.5mm;
    font-size: 6.5pt;
  }
  table.doc-footer-table td {
    border: 1px solid #374151;
    padding: 3px 5px;
    vertical-align: middle;
  }
  .sig-box-title {
    text-align: center;
    font-weight: bold;
    height: 18px;
    background: #f1f5f9;
  }
  .sig-box-body {
    height: 40px;
    text-align: center;
    vertical-align: bottom !important;
    padding-bottom: 4px;
  }
  .sig-line {
    border-bottom: 1px dotted #475569;
    width: 80%;
    margin: 0 auto 3px auto;
  }

  /* ===== PRINT OVERRIDES ===== */
  @media print {
    body {
      background: #ffffff !important;
      padding: 0 !important;
    }
    .no-print,
    .no-print-toolbar,
    #sessionTimeoutModal,
    .modal,
    .modal-backdrop,
    #swal2-container {
      display: none !important;
    }
    .page {
      width: 100% !important;
      min-height: auto !important;
      margin: 0 !important;
      padding: 3mm 4mm !important;
      box-shadow: none !important;
      border: none !important;
    }
    table.main-matrix {
      font-size: 5.8pt !important;
    }
  }
</style>
</head>
<body>

<!-- Interactive Filter Toolbar (Hidden on Print) -->
<div class="no-print-toolbar no-print">
  <div class="toolbar-group">
    <a href="iqsUI.php" class="btn-tb btn-tb-outline">
      <i class="fas fa-arrow-left"></i> กลับ Cockpit
    </a>
    <form method="GET" action="print_iqs.php" id="filterPrintForm" style="display:flex; gap:6px; align-items:center;">
      <input type="hidden" name="view" value="<?php echo htmlspecialchars($viewMode); ?>">
      
      <label style="font-size:8pt; font-weight:bold;">วันที่:</label>
      <input type="date" name="date" value="<?php echo htmlspecialchars($logDate); ?>" onchange="this.form.submit()">

      <label style="font-size:8pt; font-weight:bold;">สายการผลิต:</label>
      <select name="line" onchange="this.form.submit()">
        <option value="SPOT" <?php echo $selectedLine === 'SPOT' ? 'selected' : ''; ?>>⚡ Spot Welding (39 เครื่อง)</option>
        <option value="BEND" <?php echo $selectedLine === 'BEND' ? 'selected' : ''; ?>>📐 Bending (22 เครื่อง)</option>
        <option value="PRESS" <?php echo $selectedLine === 'PRESS' ? 'selected' : ''; ?>>🔨 Press Stamping (20 เครื่อง)</option>
        <option value="ALL" <?php echo $selectedLine === 'ALL' ? 'selected' : ''; ?>>🏭 รวมทุกสาย (81 เครื่อง)</option>
      </select>

      <label style="font-size:8pt; font-weight:bold;">กะ:</label>
      <select name="shift" onchange="this.form.submit()">
        <option value="ALL" <?php echo $selectedShift === 'ALL' ? 'selected' : ''; ?>>ทุกกะ (ALL)</option>
        <option value="DAY" <?php echo $selectedShift === 'DAY' ? 'selected' : ''; ?>>กลางวัน (DAY)</option>
        <option value="NIGHT" <?php echo $selectedShift === 'NIGHT' ? 'selected' : ''; ?>>กลางคืน (NIGHT)</option>
      </select>
    </form>
  </div>

  <div class="toolbar-group">
    <div style="background:#0f172a; padding:3px; border-radius:6px; display:flex; gap:3px;">
      <a href="print_iqs.php?date=<?php echo urlencode($logDate); ?>&line=<?php echo urlencode($selectedLine); ?>&shift=<?php echo urlencode($selectedShift); ?>&view=matrix" 
         class="btn-tb <?php echo $viewMode === 'matrix' ? 'btn-tb-primary' : 'btn-tb-outline'; ?>" style="font-size:7.5pt; padding:4px 8px;">
        <i class="fas fa-th"></i> เมทริกซ์ 7 รอบ (เหมือนโรงพ่นสี)
      </a>
      <a href="print_iqs.php?date=<?php echo urlencode($logDate); ?>&line=<?php echo urlencode($selectedLine); ?>&shift=<?php echo urlencode($selectedShift); ?>&view=log" 
         class="btn-tb <?php echo $viewMode === 'log' ? 'btn-tb-primary' : 'btn-tb-outline'; ?>" style="font-size:7.5pt; padding:4px 8px;">
        <i class="fas fa-list-check"></i> บันทึกตรวจละเอียด (Log)
      </a>
    </div>

    <button type="button" onclick="window.print()" class="btn-tb btn-tb-success">
      <i class="fas fa-print"></i> พิมพ์เอกสาร / บันทึก PDF
    </button>
  </div>
</div>

<div class="page">

  <!-- ===== DOCUMENT HEADER (Standard Audit Layout) ===== -->
  <table class="doc-header-table">
    <tr>
      <td width="30%">
        <div class="logo-box">
          <img src="/iot-toolbox/sandbox-b9/Toolbox2/assets/logo.webp" alt="SNC Logo" onerror="this.style.display='none'">
          <div>
            <div class="company-title">SNC FORMER PUBLIC CO., LTD.</div>
            <div class="company-sub">บริษัท เอส เอ็น ซี ฟอร์เมอร์ จำกัด (มหาชน) — Plant 2 (Zone B9)</div>
          </div>
        </div>
      </td>
      <td width="46%" class="doc-center-box">
        <div class="doc-main-title">IN-PROCESS QUALITY SYSTEM (IQS) CHECK SHEET</div>
        <div class="doc-sub-title"><?php echo htmlspecialchars($docTitle); ?></div>
      </td>
      <td width="24%">
        <table class="doc-meta-table">
          <tr><td class="meta-lbl">วันที่ (Date):</td><td class="meta-val"><?php echo $dateDisplay; ?></td></tr>
          <tr><td class="meta-lbl">สายการผลิต (Line):</td><td class="meta-val"><?php echo htmlspecialchars($selectedLine); ?></td></tr>
          <tr><td class="meta-lbl">กะการทำงาน (Shift):</td><td class="meta-val"><?php echo $shiftDisplay; ?></td></tr>
          <tr><td class="meta-lbl">เลขที่เอกสาร (Doc No.):</td><td class="meta-val">FM-QC-IQS-01 (Rev.03)</td></tr>
        </table>
      </td>
    </tr>
  </table>

  <?php if ($viewMode === 'matrix'): ?>
  <!-- =======================================================
       VIEW 1: DAILY MULTI-SLOT MATRIX (Matching Paint Chem)
       Consolidates all 7 daily time slots into a single sheet!
       ======================================================= -->
  <table class="main-matrix">
    <colgroup>
      <col style="width: 14px;"> <!-- No -->
      <col style="width: 48px;"> <!-- Machine Code -->
      <col style="width: 70px;"> <!-- Machine Name -->
      <col style="width: 46px;"> <!-- Model SKU -->
      <col style="width: 26px;"> <!-- Thickness -->
      <?php foreach ($activeSlots as $slotKey => $slotDef): ?>
      <col style="width: auto;"> <!-- Time Slot -->
      <?php endforeach; ?>
    </colgroup>
    <thead>
      <tr class="th-primary">
        <th rowspan="2">#</th>
        <th rowspan="2">รหัสเครื่อง<br>Machine No.</th>
        <th rowspan="2">ชื่อเครื่องจักร<br>Machine Description</th>
        <th rowspan="2">โมเดล<br>Model SKU</th>
        <th rowspan="2">ความหนา<br>T (mm)</th>
        <th colspan="<?php echo count($activeSlots); ?>">
          รอบเวลาการตรวจสอบตามมาตรฐานประจำวัน (Daily Standard Inspection Time Slots)
        </th>
      </tr>
      <tr class="th-sub">
        <?php foreach ($activeSlots as $slotKey => $slotDef): ?>
        <th><?php echo htmlspecialchars($slotDef['label']); ?><br><span style="font-size:5pt; font-weight:normal;"><?php echo htmlspecialchars($slotDef['name']); ?></span></th>
        <?php endforeach; ?>
      </tr>
    </thead>
    <tbody>
      <?php 
      $no = 1;
      foreach ($machines as $m): 
          $mId = $m['machine_id'];
          $meta = $machineLatestMeta[$mId] ?? null;
          $zebraClass = ($no % 2 === 0) ? 'row-zebra' : '';
      ?>
      <tr class="<?php echo $zebraClass; ?>">
        <td><?php echo $no++; ?></td>
        <td style="font-weight: bold;"><?php echo htmlspecialchars($m['machine_code']); ?></td>
        <td class="td-left" style="font-size: 5.6pt;"><?php echo htmlspecialchars($m['machine_name']); ?></td>
        <td><?php echo htmlspecialchars($meta['sku'] ?? '-'); ?></td>
        <td><?php echo !empty($meta['thickness']) ? number_format((float)$meta['thickness'], 2) : '-'; ?></td>
        
        <?php foreach ($activeSlots as $slotKey => $slotDef): 
            $rec = $matrixMap[$mId][$slotKey] ?? null;
        ?>
        <td>
          <?php if ($rec): ?>
              <?php if ($rec['is_skipped']): ?>
                  <span class="badge-skip">ข้าม</span>
                  <span class="cell-val-note"><?php echo htmlspecialchars($rec['skip_reason'] ?: 'ไม่มีผลิต'); ?></span>
              <?php elseif ($rec['pull_result'] === 'OK'): ?>
                  <span class="badge-ok">✓ OK</span>
                  <?php if ($selectedLine === 'SPOT' || $m['line_group'] === 'SPOT'): ?>
                      <span class="cell-val-note"><?php echo !empty($rec['knock_check_val']) ? 'เคาะ ' . $rec['knock_check_val'] : ''; ?><?php echo !empty($rec['distance_check_val']) ? ' | ระ ' . $rec['distance_check_val'] : ''; ?></span>
                  <?php elseif ($selectedLine === 'BEND' || $m['line_group'] === 'BEND'): ?>
                      <span class="cell-val-note"><?php echo !empty($rec['custom_check_val_1']) ? $rec['custom_check_val_1'] . '°' : ''; ?><?php echo !empty($rec['custom_check_val_2']) ? ' | ' . $rec['custom_check_val_2'] . 'mm' : ''; ?></span>
                  <?php elseif ($selectedLine === 'PRESS' || $m['line_group'] === 'PRESS'): ?>
                      <span class="cell-val-note"><?php echo !empty($rec['custom_check_val_1']) ? 'ครีบ ' . $rec['custom_check_val_1'] . 'mm' : ($rec['custom_check_text'] ?? ''); ?></span>
                  <?php endif; ?>
                  <span style="font-size:4.8pt; color:#64748b;"><?php echo $rec['recorded_time']; ?></span>
              <?php else: ?>
                  <span class="badge-ng">✗ NG</span>
                  <span class="cell-val-note" style="color:#b91c1c;"><?php echo htmlspecialchars(mb_strimwidth($rec['ng_remark'] ?: 'ตกเกณฑ์', 0, 16, '..')); ?></span>
                  <span style="font-size:4.8pt; color:#b91c1c;"><?php echo $rec['recorded_time']; ?></span>
              <?php endif; ?>
          <?php else: ?>
              <span style="color:#94a3b8; font-size:5.5pt;">—</span>
          <?php endif; ?>
        </td>
        <?php endforeach; ?>
      </tr>
      <?php endforeach; ?>

      <!-- Summary Row -->
      <tr style="background:#f1f5f9; font-weight:bold;">
        <td colspan="5" style="text-align:right; padding-right:6px;">สรุปผลการทดสอบประจำวัน (Summary):</td>
        <?php foreach ($activeSlots as $slotKey => $slotDef): 
            $slotTested = 0; $slotOk = 0; $slotNg = 0;
            foreach ($machines as $m) {
                $r = $matrixMap[$m['machine_id']][$slotKey] ?? null;
                if ($r && !$r['is_skipped']) {
                    $slotTested++;
                    if ($r['pull_result'] === 'OK') $slotOk++;
                    elseif ($r['pull_result'] === 'NG') $slotNg++;
                }
            }
        ?>
        <td style="font-size:5.5pt;">
          <?php if ($slotTested > 0): ?>
            <span style="color:#15803d;"><?php echo $slotOk; ?> OK</span> | <span style="color:#b91c1c;"><?php echo $slotNg; ?> NG</span>
          <?php else: ?>
            <span style="color:#94a3b8;">—</span>
          <?php endif; ?>
        </td>
        <?php endforeach; ?>
      </tr>
    </tbody>
  </table>

  <?php else: ?>
  <!-- =======================================================
       VIEW 2: DETAILED AUDIT INSPECTION LOG (With Photos)
       ======================================================= -->
  <table class="detailed-log">
    <thead>
      <tr class="th-primary">
        <th style="width: 22px;">#</th>
        <th style="width: 55px;">รอบเวลา</th>
        <th style="width: 60px;">รหัสเครื่อง</th>
        <th style="width: 80px;">โมเดล (SKU)</th>
        <th style="width: 60px;">เลขที่ PO</th>
        <th style="width: 35px;">ความหนา T</th>
        <th style="width: 45px;">ผลตรวจ</th>
        <th style="width: 90px;">ค่าการวัดที่บันทึก</th>
        <th style="width: 45px;">เวลาตรวจ</th>
        <th style="width: 65px;">ผู้ตรวจ</th>
        <th style="width: 75px;">หลักฐานภาพถ่าย</th>
        <th>หมายเหตุ / อาการ NG</th>
      </tr>
    </thead>
    <tbody>
      <?php if (empty($records)): ?>
      <tr>
        <td colspan="12" style="padding: 20px; color: #64748b; font-size: 8pt;">
          ไม่พบข้อมูลผลการตรวจในวันที่ระบุ (<?php echo htmlspecialchars($logDate); ?>)
        </td>
      </tr>
      <?php else: ?>
      <?php 
      $logIdx = 1;
      foreach ($records as $r): 
          $atts = $attachmentsByRecord[$r['record_id']] ?? [];
      ?>
      <tr>
        <td><?php echo $logIdx++; ?></td>
        <td><?php echo htmlspecialchars($r['round_name'] ?: 'Auto-Round'); ?></td>
        <td style="font-weight:bold;"><?php echo htmlspecialchars($r['machine_code']); ?></td>
        <td><?php echo htmlspecialchars($r['sku'] ?: '-'); ?></td>
        <td><?php echo htmlspecialchars($r['po_no'] ?: '-'); ?></td>
        <td><?php echo !empty($r['thickness']) ? number_format((float)$r['thickness'], 2) : '-'; ?></td>
        <td>
          <?php if ($r['is_skipped']): ?>
            <span class="badge-skip">ข้าม</span>
          <?php elseif ($r['pull_result'] === 'OK'): ?>
            <span class="badge-ok">✓ ผ่าน (OK)</span>
          <?php else: ?>
            <span class="badge-ng">✗ ตกเกณฑ์ (NG)</span>
          <?php endif; ?>
        </td>
        <td class="td-left" style="font-size: 5.8pt;">
          <?php if ($r['line'] === 'SPOT' || $r['line_group'] === 'SPOT'): ?>
            เคาะ: <?php echo $r['knock_check_val'] ?? '-'; ?> mm<br>
            ระยะ: <?php echo $r['distance_check_val'] ?? '-'; ?> mm
          <?php elseif ($r['line'] === 'BEND' || $r['line_group'] === 'BEND'): ?>
            มุมดัด: <?php echo $r['custom_check_val_1'] ?? '-'; ?>°<br>
            ปีก: <?php echo $r['custom_check_val_2'] ?? '-'; ?> mm
          <?php elseif ($r['line'] === 'PRESS' || $r['line_group'] === 'PRESS'): ?>
            แม่พิมพ์: <?php echo $r['custom_check_text'] ?? '-'; ?><br>
            ครีบ: <?php echo $r['custom_check_val_1'] ?? '-'; ?> mm
          <?php endif; ?>
        </td>
        <td><?php echo htmlspecialchars($r['recorded_time']); ?> น.</td>
        <td style="font-size: 5.8pt;"><?php echo htmlspecialchars($r['inspector_name'] ?: 'Inspector'); ?></td>
        <td>
          <?php if (!empty($atts)): ?>
            <?php foreach ($atts as $at): 
                $imgUrl = '/iot-toolbox/sandbox-b9/MES/MES/' . ltrim($at['file_path'], '/');
            ?>
              <img src="<?php echo htmlspecialchars($imgUrl); ?>" class="thumb-img" alt="Photo" onerror="this.style.display='none'">
            <?php endforeach; ?>
          <?php else: ?>
            <span style="color:#94a3b8; font-size:5.5pt;">—</span>
          <?php endif; ?>
        </td>
        <td class="td-left" style="color: <?php echo !empty($r['ng_remark']) ? '#b91c1c' : '#475569'; ?>;">
          <?php echo htmlspecialchars($r['is_skipped'] ? ($r['skip_reason'] ?: 'ข้ามการตรวจ') : ($r['ng_remark'] ?: 'ปกติ')); ?>
        </td>
      </tr>
      <?php endforeach; ?>
      <?php endif; ?>
    </tbody>
  </table>
  <?php endif; ?>

  <!-- ===== FOOTER & SIGNATURE SECTION (Official Audit Compliance) ===== -->
  <table class="doc-footer-table">
    <tr>
      <td rowspan="2" width="46%" style="vertical-align:top; text-align:left; padding:4px;">
        <div style="font-weight:bold; color:#1e3a8a; font-size:6.5pt; margin-bottom:2px;">
          <i class="fas fa-info-circle"></i> บันทึกข้อกำหนดและหมายเหตุการตรวจสอบ (Notes & Verification):
        </div>
        <div style="font-size:5.8pt; color:#334155; line-height: 1.35;">
          1. ตรวจสอบตามมาตรฐาน IATF 16949 / ISO 9001 โดยประทับเวลาจริง (Real-time Audit Trail) ห้ามแก้ไขข้อมูลย้อนหลังโดยเด็ดขาด<br>
          2. สรุปผลการตรวจวันที่ <strong><?php echo $dateDisplay; ?></strong>: ตรวจทั้งหมด <strong><?php echo ($totalOkCount + $totalNgCount); ?></strong> เครื่อง 
             (ผ่าน OK = <strong style="color:#15803d;"><?php echo $totalOkCount; ?></strong>, ไม่ผ่าน NG = <strong style="color:#b91c1c;"><?php echo $totalNgCount; ?></strong>, ข้าม = <?php echo $totalSkipCount; ?>)<br>
          3. กรณีพบงาน NG พนักงานต้องหยุดกระบวนการทันที แจ้งหัวหน้างาน และแยกชิ้นงานกักกันเพื่อป้องกันความเสียหาย
        </div>
      </td>
      <td width="18%" class="sig-box-title">ผู้ตรวจสอบ (Inspector / Prepared)</td>
      <td width="18%" class="sig-box-title">หัวหน้างาน (Supervisor / Checked)</td>
      <td width="18%" class="sig-box-title">แผนกประกันคุณภาพ (QA / Approved)</td>
    </tr>
    <tr>
      <td class="sig-box-body">
        <div class="sig-line"></div>
        <div style="font-size:6pt; font-weight:bold;"><?php echo htmlspecialchars($inspectorNamesStr); ?></div>
        <div style="font-size:5.2pt; color:#64748b;">วันที่: <?php echo $dateDisplay; ?></div>
      </td>
      <td class="sig-box-body">
        <div class="sig-line"></div>
        <div style="font-size:6pt; color:#64748b;">(.......................................................)</div>
        <div style="font-size:5.2pt; color:#64748b;">วันที่: ......./......./............</div>
      </td>
      <td class="sig-box-body">
        <div class="sig-line"></div>
        <div style="font-size:6pt; color:#64748b;">(.......................................................)</div>
        <div style="font-size:5.2pt; color:#64748b;">วันที่: ......./......./............</div>
      </td>
    </tr>
  </table>

</div><!-- .page -->

</body>
</html>
