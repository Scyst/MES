<?php
/**
 * Official Inventory Cycle Count Audit Certificate & Sign-off Engine (Phase 3.1)
 * MES Store Management
 * Compliant with ISO 9001 / IATF 16949 Audit Standards
 */
require_once __DIR__ . '/../components/init.php';
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/api/zone_health_helper.php';

requirePermission(['view_warehouse', 'manage_warehouse']);

if (!isset($_SESSION['user'])) {
    header("Location: ../../login.php");
    exit;
}

$currentUser = $_SESSION['user'] ?? [];
$issuerName = $currentUser['fullname'] ?? $currentUser['name_th'] ?? $currentUser['username'] ?? 'เจ้าหน้าที่คลังสินค้า';

$startDate = $_GET['start_date'] ?? date('Y-m-01');
$endDate = $_GET['end_date'] ?? date('Y-m-d');
$locId = $_GET['location_id'] ?? 'ALL';
$status = $_GET['status'] ?? 'ALL';
$search = trim($_GET['search'] ?? '');
$limit = 1000;

// Validate dates
if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $startDate)) $startDate = date('Y-m-01');
if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $endDate)) $endDate = date('Y-m-d');

$whereClauses = ["c.count_date >= ? AND c.count_date <= ?"];
$params = [$startDate, $endDate];

if ($status !== 'ALL' && in_array($status, ['APPROVED', 'REJECTED', 'PENDING'])) {
    $whereClauses[] = "c.status = ?";
    $params[] = $status;
} else {
    $whereClauses[] = "c.status IN ('APPROVED', 'REJECTED', 'PENDING')";
}

$locationFilterName = 'ทุกตำแหน่ง (All Locations)';
if ($locId !== 'ALL' && is_numeric($locId) && (int)$locId > 0) {
    $whereClauses[] = "c.location_id = ?";
    $params[] = (int)$locId;
    
    $stmtLoc = $pdo->prepare("SELECT location_name, zone_name FROM dbo.LOCATIONS WITH (NOLOCK) WHERE location_id = ?");
    $stmtLoc->execute([(int)$locId]);
    if ($l = $stmtLoc->fetch(PDO::FETCH_ASSOC)) {
        $locationFilterName = $l['location_name'] . (!empty($l['zone_name']) ? " ({$l['zone_name']})" : '');
    }
}

if (!empty($search)) {
    $whereClauses[] = "(i.sap_no LIKE ? OR i.part_no LIKE ? OR i.part_description LIKE ? OR c.serial_no LIKE ? OR l.location_name LIKE ?)";
    $searchParam = "%{$search}%";
    $params[] = $searchParam;
    $params[] = $searchParam;
    $params[] = $searchParam;
    $params[] = $searchParam;
    $params[] = $searchParam;
}

$whereSql = implode(" AND ", $whereClauses);

$sql = "
    SELECT 
        c.count_id, c.count_date, c.system_qty, c.actual_qty, c.diff_qty, c.remark, c.counted_at, c.status, c.approved_at, c.serial_no,
        i.sap_no, ISNULL(i.part_no, i.sap_no) AS item_no, i.part_description,
        COALESCE(NULLIF(i.StandardPrice, 0), NULLIF(i.Cost_Total, 0), 0) AS unit_price,
        ROUND(ABS(c.diff_qty) * COALESCE(NULLIF(i.StandardPrice, 0), NULLIF(i.Cost_Total, 0), 0), 2) AS diff_value,
        ROUND(c.diff_qty * COALESCE(NULLIF(i.StandardPrice, 0), NULLIF(i.Cost_Total, 0), 0), 2) AS net_diff_value,
        l.location_name, ISNULL(l.zone_name, N'อื่น ๆ') AS zone_name,
        ISNULL(e1.name_th, u1.username) AS counter_name,
        ISNULL(e2.name_th, u2.username) AS approver_name
    FROM dbo.INVENTORY_CYCLE_COUNTS c WITH (NOLOCK)
    JOIN dbo.ITEMS i WITH (NOLOCK) ON c.item_id = i.item_id
    JOIN dbo.LOCATIONS l WITH (NOLOCK) ON c.location_id = l.location_id
    LEFT JOIN dbo.USERS u1 WITH (NOLOCK) ON c.counted_by_user_id = u1.id
    LEFT JOIN dbo.MANPOWER_EMPLOYEES e1 WITH (NOLOCK) ON u1.emp_id = e1.emp_id
    LEFT JOIN dbo.USERS u2 WITH (NOLOCK) ON c.approved_by_user_id = u2.id
    LEFT JOIN dbo.MANPOWER_EMPLOYEES e2 WITH (NOLOCK) ON u2.emp_id = e2.emp_id
    WHERE {$whereSql}
    ORDER BY c.count_date DESC, c.count_id DESC
    OFFSET 0 ROWS FETCH NEXT {$limit} ROWS ONLY
";

$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

// Metrics calculation
$totalAudited = count($rows);
$accurateCount = 0;
$approvedCount = 0;
$rejectedCount = 0;
$pendingCount = 0;
$totalSystemQty = 0.0;
$totalActualQty = 0.0;
$totalDiffQty = 0.0;
$totalSystemValue = 0.0;
$totalDiffValue = 0.0;
$netDiffValue = 0.0;

foreach ($rows as $r) {
    if ($r['status'] === 'APPROVED') $approvedCount++;
    elseif ($r['status'] === 'REJECTED') $rejectedCount++;
    elseif ($r['status'] === 'PENDING') $pendingCount++;

    $diff = (float)$r['diff_qty'];
    if ($diff == 0.0) {
        $accurateCount++;
    }

    $unitPrice = (float)$r['unit_price'];
    $sysQty = (float)$r['system_qty'];
    $actQty = (float)$r['actual_qty'];

    $totalSystemQty += $sysQty;
    $totalActualQty += $actQty;
    $totalDiffQty += $diff;

    $totalSystemValue += ($sysQty * $unitPrice);
    $totalDiffValue += (float)$r['diff_value'];
    $netDiffValue += (float)$r['net_diff_value'];
}

$itemIra = $totalAudited > 0 ? round(($accurateCount / $totalAudited) * 100, 1) : 100.0;
$valIra = 100.0;
if ($totalSystemValue > 0) {
    $valIra = round(max(0.0, (1.0 - ($totalDiffValue / $totalSystemValue)) * 100), 1);
}

$grade = 'A';
$gradeText = 'เกรด A · มาตรฐานยอดเยี่ยม (World-Class)';
$gradeBadgeClass = 'badge-success';
if ($itemIra < 85.0) {
    $grade = 'C';
    $gradeText = 'เกรด C · ต้องปรับปรุงเร่งด่วน (Action Required)';
    $gradeBadgeClass = 'badge-danger';
} elseif ($itemIra < 95.0) {
    $grade = 'B';
    $gradeText = 'เกรด B · มาตรฐานยอมรับได้ (Satisfactory)';
    $gradeBadgeClass = 'badge-warning';
}

$docNumber = 'AUD-CC-' . date('Ymd', strtotime($startDate)) . '-' . date('Ymd', strtotime($endDate)) . '-' . strtoupper(substr(md5($startDate . $endDate . $locId . $status), 0, 4));

function formatThaiDate($dateStr) {
    if (!$dateStr) return '-';
    $t = strtotime($dateStr);
    $thaiMonths = ['', 'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    $d = (int)date('j', $t);
    $m = (int)date('n', $t);
    $y = (int)date('Y', $t) + 543;
    return "$d {$thaiMonths[$m]} $y";
}

$periodText = formatThaiDate($startDate) . ' ถึง ' . formatThaiDate($endDate);
?>
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ใบรับรองผลการตรวจนับสต็อก (Cycle Count Audit Certificate) - <?= htmlspecialchars($docNumber) ?></title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        body {
            background-color: #f1f5f9;
            color: #1e293b;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Sarabun", Helvetica, Arial, sans-serif;
            font-size: 11pt;
            margin: 0;
            padding: 20px 0;
        }

        .print-toolbar {
            background: #ffffff;
            border-bottom: 2px solid #e2e8f0;
            padding: 12px 24px;
            margin-bottom: 24px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.04);
            position: sticky;
            top: 0;
            z-index: 1000;
        }

        .audit-paper {
            width: 297mm;
            min-height: 210mm;
            background: #ffffff;
            margin: 0 auto;
            padding: 14mm 16mm;
            box-shadow: 0 4px 15px rgba(0,0,0,0.08);
            border-radius: 4px;
            position: relative;
            box-sizing: border-box;
        }

        .doc-header {
            border-bottom: 2.5px solid #0f172a;
            padding-bottom: 10px;
            margin-bottom: 14px;
        }

        .company-title {
            font-size: 14pt;
            font-weight: 800;
            color: #0f172a;
            letter-spacing: 0.5px;
            text-transform: uppercase;
        }

        .doc-title {
            font-size: 13pt;
            font-weight: 700;
            color: #0284c7;
            margin-top: 3px;
        }

        .meta-card {
            background: #f8fafc;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            padding: 8px 12px;
            font-size: 9pt;
        }

        .kpi-card {
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            padding: 8px 10px;
            background: #f8fafc;
            text-align: center;
        }
        .kpi-title {
            font-size: 8.5pt;
            color: #64748b;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.3px;
        }
        .kpi-val {
            font-size: 13pt;
            font-weight: 800;
            color: #0f172a;
            margin-top: 2px;
        }

        .table-audit {
            width: 100%;
            border-collapse: collapse;
            font-size: 8.5pt;
            margin-top: 12px;
            margin-bottom: 20px;
        }
        .table-audit th {
            background-color: #0f172a !important;
            color: #ffffff !important;
            border: 1px solid #0f172a;
            padding: 6px 8px;
            font-weight: 700;
            text-align: center;
            vertical-align: middle;
        }
        .table-audit td {
            border: 1px solid #cbd5e1;
            padding: 5px 8px;
            vertical-align: middle;
        }
        .table-audit tbody tr:nth-child(even) {
            background-color: #f8fafc;
        }

        .signature-section {
            margin-top: 25px;
            border: 1.5px solid #cbd5e1;
            border-radius: 6px;
            padding: 12px;
            background: #ffffff;
            page-break-inside: avoid;
        }
        .sig-box {
            text-align: center;
            padding: 6px 12px;
            min-height: 125px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
        }
        .sig-line {
            border-bottom: 1.5px dotted #64748b;
            margin: 32px 15px 8px 15px;
        }

        @media print {
            body {
                background: #ffffff !important;
                padding: 0 !important;
                margin: 0 !important;
            }
            .print-toolbar {
                display: none !important;
            }
            .audit-paper {
                box-shadow: none !important;
                border: none !important;
                margin: 0 !important;
                padding: 8mm 10mm !important;
                width: 100% !important;
                min-height: auto !important;
            }
            @page {
                size: A4 landscape;
                margin: 8mm;
            }
            * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
            }
            .table-audit th {
                background-color: #0f172a !important;
                color: #ffffff !important;
            }
        }
    </style>
</head>
<body>

    <!-- Onscreen Print Toolbar -->
    <div class="print-toolbar">
        <div class="container-fluid d-flex align-items-center justify-content-between">
            <div class="d-flex align-items-center gap-3">
                <span class="badge bg-primary px-3 py-2 fs-6">
                    <i class="fas fa-file-signature me-1.5"></i> Cycle Count Audit Engine
                </span>
                <span class="text-secondary fw-semibold">
                    เอกสารทางการรับรองผลการตรวจนับสต็อกและกระทบยอดสินค้า (ISO/IATF Sign-off Ready)
                </span>
            </div>
            <div class="d-flex align-items-center gap-2">
                <button class="btn btn-outline-secondary btn-sm px-3 fw-bold" onclick="window.close()">
                    <i class="fas fa-times me-1"></i> ปิดหน้านี้
                </button>
                <button class="btn btn-primary btn-sm px-4 fw-bold shadow-sm" onclick="window.print()">
                    <i class="fas fa-print me-1.5"></i> สั่งพิมพ์เอกสาร / บันทึก PDF
                </button>
            </div>
        </div>
    </div>

    <!-- Official Certificate Paper -->
    <div class="audit-paper">
        
        <!-- Document Header -->
        <div class="doc-header">
            <div class="d-flex justify-content-between align-items-start">
                <div>
                    <div class="company-title">MANUFACTURING EXECUTION SYSTEM (MES)</div>
                    <div class="text-secondary fw-bold" style="font-size: 10pt;">WAREHOUSE & INVENTORY MANAGEMENT DIVISION</div>
                    <div class="doc-title">
                        <i class="fas fa-stamp me-1"></i> ใบรับรองผลการตรวจนับสต็อกและกระทบยอดสินค้า (INVENTORY AUDIT CERTIFICATE)
                    </div>
                </div>
                <div class="meta-card" style="min-width: 280px;">
                    <div class="d-flex justify-content-between mb-1">
                        <span class="text-muted fw-bold">เลขที่เอกสาร:</span>
                        <span class="fw-bold font-monospace text-dark"><?= htmlspecialchars($docNumber) ?></span>
                    </div>
                    <div class="d-flex justify-content-between mb-1">
                        <span class="text-muted fw-bold">รอบการตรวจนับ:</span>
                        <span class="fw-bold text-primary"><?= $periodText ?></span>
                    </div>
                    <div class="d-flex justify-content-between mb-1">
                        <span class="text-muted fw-bold">ตำแหน่ง/โซน:</span>
                        <span class="fw-bold text-dark"><?= htmlspecialchars($locationFilterName) ?></span>
                    </div>
                    <div class="d-flex justify-content-between mb-1">
                        <span class="text-muted fw-bold">วันที่พิมพ์:</span>
                        <span><?= date('d/m/Y H:i') ?> น.</span>
                    </div>
                    <div class="d-flex justify-content-between">
                        <span class="text-muted fw-bold">ผู้ออกรายงาน:</span>
                        <span class="fw-bold"><?= htmlspecialchars($issuerName) ?></span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Executive KPI Cards -->
        <div class="row g-2 mb-3">
            <div class="col-3">
                <div class="kpi-card">
                    <div class="kpi-title">รายการที่ตรวจนับทั้งหมด</div>
                    <div class="kpi-val text-primary"><?= number_format($totalAudited) ?> <span class="fs-6 fw-normal text-muted">รายการ</span></div>
                    <div class="text-muted" style="font-size: 7.5pt; margin-top: 2px;">
                        อนุมัติแล้ว: <b class="text-success"><?= $approvedCount ?></b> | ปฏิเสธ: <b class="text-danger"><?= $rejectedCount ?></b>
                    </div>
                </div>
            </div>
            <div class="col-3">
                <div class="kpi-card">
                    <div class="kpi-title">ยอดสต็อก (ระบบ vs ตรวจจริง)</div>
                    <div class="kpi-val text-dark">
                        <?= number_format($totalActualQty) ?> <span class="fs-6 fw-normal text-muted">/ <?= number_format($totalSystemQty) ?></span>
                    </div>
                    <div class="text-muted" style="font-size: 7.5pt; margin-top: 2px;">
                        ยอดตรงตามระบบ: <b class="text-success"><?= $accurateCount ?></b> รายการ
                    </div>
                </div>
            </div>
            <div class="col-3">
                <div class="kpi-card">
                    <div class="kpi-title">ผลต่างสุทธิ (Net Variance)</div>
                    <?php 
                        $diffQtyClass = $totalDiffQty > 0 ? 'text-success' : ($totalDiffQty < 0 ? 'text-danger' : 'text-dark');
                        $diffSign = $totalDiffQty > 0 ? '+' : '';
                        $diffValClass = $netDiffValue > 0 ? 'text-success' : ($netDiffValue < 0 ? 'text-danger' : 'text-dark');
                    ?>
                    <div class="kpi-val <?= $diffQtyClass ?>">
                        <?= $diffSign . number_format($totalDiffQty) ?> <span class="fs-6 fw-normal text-muted">ชิ้น</span>
                    </div>
                    <div class="<?= $diffValClass ?>" style="font-size: 8pt; font-weight: 700; margin-top: 2px;">
                        มูลค่าสุทธิ: <?= $diffSign . number_format($netDiffValue, 2) ?> บาท
                    </div>
                </div>
            </div>
            <div class="col-3">
                <div class="kpi-card border-primary" style="background-color: #f0f9ff;">
                    <div class="kpi-title text-primary fw-bold">ดัชนีความแม่นยำสต็อก (IRA)</div>
                    <div class="kpi-val text-primary">
                        <?= number_format($itemIra, 1) ?>% <span class="fs-6 fw-bold text-success">(<?= $grade ?>)</span>
                    </div>
                    <div class="text-dark" style="font-size: 7.5pt; font-weight: 700; margin-top: 2px;">
                        Value IRA: <?= number_format($valIra, 1) ?>% · <?= $gradeText ?>
                    </div>
                </div>
            </div>
        </div>

        <!-- Audit Ledger Table -->
        <table class="table-audit">
            <thead>
                <tr>
                    <th style="width: 30px;">#</th>
                    <th style="width: 80px;">วันที่นับ</th>
                    <th style="width: 85px;">โลเคชั่น</th>
                    <th style="width: 120px;">รหัสสินค้า (Item No)</th>
                    <th>รายละเอียดสินค้า (Part Description)</th>
                    <th style="width: 100px;">Serial No. (Tag)</th>
                    <th style="width: 65px;" class="text-end">ราคา/หน่วย</th>
                    <th style="width: 60px;" class="text-end">ระบบ</th>
                    <th style="width: 60px;" class="text-end">นับจริง</th>
                    <th style="width: 55px;" class="text-end">ผลต่าง</th>
                    <th style="width: 75px;" class="text-end">มูลค่าดิฟ (฿)</th>
                    <th style="width: 65px;" class="text-center">สถานะ</th>
                    <th style="width: 110px;">ผู้อนุมัติ</th>
                </tr>
            </thead>
            <tbody>
                <?php if (empty($rows)): ?>
                    <tr>
                        <td colspan="13" class="text-center py-4 text-muted">ไม่พบข้อมูลการตรวจนับในช่วงเวลาหรือเงื่อนไขที่กำหนด</td>
                    </tr>
                <?php else: ?>
                    <?php 
                    $seq = 1;
                    foreach ($rows as $r): 
                        $diff = (float)$r['diff_qty'];
                        $diffClass = $diff > 0 ? 'text-success fw-bold' : ($diff < 0 ? 'text-danger fw-bold' : 'text-muted');
                        $diffSign = $diff > 0 ? '+' : '';
                        $statusBadge = $r['status'] === 'APPROVED' ? '<span class="badge bg-success">APPROVED</span>' : ($r['status'] === 'REJECTED' ? '<span class="badge bg-danger">REJECTED</span>' : '<span class="badge bg-warning text-dark">PENDING</span>');
                        $dateFormatted = date('d/m/y', strtotime($r['count_date']));
                    ?>
                    <tr>
                        <td class="text-center text-muted"><?= $seq++ ?></td>
                        <td class="text-center"><?= $dateFormatted ?></td>
                        <td>
                            <b><?= htmlspecialchars($r['location_name']) ?></b>
                            <div class="text-muted" style="font-size: 7pt;"><?= htmlspecialchars($r['zone_name']) ?></div>
                        </td>
                        <td class="fw-bold text-dark"><?= htmlspecialchars($r['item_no']) ?></td>
                        <td>
                            <div class="text-truncate" style="max-width: 250px;" title="<?= htmlspecialchars($r['part_description']) ?>">
                                <?= htmlspecialchars($r['part_description']) ?>
                            </div>
                        </td>
                        <td class="font-monospace" style="font-size: 7.5pt;"><?= htmlspecialchars($r['serial_no'] ?? '-') ?></td>
                        <td class="text-end"><?= number_format((float)$r['unit_price'], 2) ?></td>
                        <td class="text-end text-muted"><?= number_format((float)$r['system_qty']) ?></td>
                        <td class="text-end fw-bold"><?= number_format((float)$r['actual_qty']) ?></td>
                        <td class="text-end <?= $diffClass ?>"><?= $diffSign . number_format($diff) ?></td>
                        <td class="text-end <?= $diffClass ?>"><?= number_format((float)$r['net_diff_value'], 2) ?></td>
                        <td class="text-center"><?= $statusBadge ?></td>
                        <td style="font-size: 8pt;">
                            <div><?= htmlspecialchars($r['approver_name'] ?: ($r['counter_name'] ?: '-')) ?></div>
                        </td>
                    </tr>
                    <?php endforeach; ?>
                <?php endif; ?>
            </tbody>
            <tfoot>
                <tr style="background-color: #f1f5f9; font-weight: bold; border-top: 2px solid #0f172a;">
                    <td colspan="7" class="text-end">รวมยอดสุทธิ (Net Total):</td>
                    <td class="text-end"><?= number_format($totalSystemQty) ?></td>
                    <td class="text-end"><?= number_format($totalActualQty) ?></td>
                    <td class="text-end <?= $totalDiffQty >= 0 ? 'text-success' : 'text-danger' ?>">
                        <?= ($totalDiffQty > 0 ? '+' : '') . number_format($totalDiffQty) ?>
                    </td>
                    <td class="text-end <?= $netDiffValue >= 0 ? 'text-success' : 'text-danger' ?>">
                        <?= ($netDiffValue > 0 ? '+' : '') . number_format($netDiffValue, 2) ?>
                    </td>
                    <td colspan="2"></td>
                </tr>
            </tfoot>
        </table>

        <!-- 3 Official Sign-off Boxes (ISO / IATF Audit Compliant) -->
        <div class="signature-section">
            <div class="row g-3">
                <div class="col-4 border-end">
                    <div class="sig-box">
                        <div>
                            <div class="fw-bold text-dark" style="font-size: 9.5pt;">1. ผู้ตรวจนับสินค้า (Warehouse Auditor)</div>
                            <div class="text-muted" style="font-size: 8pt;">เจ้าหน้าที่ดำเนินการตรวจนับสินค้าจริง</div>
                        </div>
                        <div>
                            <div class="sig-line"></div>
                            <div style="font-size: 8.5pt;">ลายมือชื่อ: ....................................................</div>
                            <div style="font-size: 8.5pt; margin-top: 4px;">ชื่อตัวบรรจง: (....................................................)</div>
                            <div style="font-size: 8.5pt; margin-top: 4px;">วันที่: ............ / ............ / ....................</div>
                        </div>
                    </div>
                </div>
                <div class="col-4 border-end">
                    <div class="sig-box">
                        <div>
                            <div class="fw-bold text-dark" style="font-size: 9.5pt;">2. หัวหน้าแผนกสโตร์ (Store Supervisor)</div>
                            <div class="text-muted" style="font-size: 8pt;">ผู้ทวนสอบความถูกต้องและอนุมัติยอดผลต่าง</div>
                        </div>
                        <div>
                            <div class="sig-line"></div>
                            <div style="font-size: 8.5pt;">ลายมือชื่อ: ....................................................</div>
                            <div style="font-size: 8.5pt; margin-top: 4px;">ชื่อตัวบรรจง: (....................................................)</div>
                            <div style="font-size: 8.5pt; margin-top: 4px;">วันที่: ............ / ............ / ....................</div>
                        </div>
                    </div>
                </div>
                <div class="col-4">
                    <div class="sig-box">
                        <div>
                            <div class="fw-bold text-dark" style="font-size: 9.5pt;">3. ผู้จัดการโรงงาน / บัญชี (Plant / Accounting Mgr.)</div>
                            <div class="text-muted" style="font-size: 8pt;">ผู้มีอำนาจลงนามรับรองรายงานกระทบยอดบัญชี</div>
                        </div>
                        <div>
                            <div class="sig-line"></div>
                            <div style="font-size: 8.5pt;">ลายมือชื่อ: ....................................................</div>
                            <div style="font-size: 8.5pt; margin-top: 4px;">ชื่อตัวบรรจง: (....................................................)</div>
                            <div style="font-size: 8.5pt; margin-top: 4px;">วันที่: ............ / ............ / ....................</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Footer Audit Notice -->
        <div class="d-flex justify-content-between align-items-center mt-3 text-muted" style="font-size: 7.5pt;">
            <span>เอกสารนี้ถูกสร้างโดยระบบ MES Store Management อ้างอิงบันทึกในฐานข้อมูลกลาง `dbo.INVENTORY_CYCLE_COUNTS`</span>
            <span>หน้า 1 จาก 1 · มาตรฐานการจัดการคุณภาพ ISO 9001:2015 & IATF 16949</span>
        </div>

    </div>

</body>
</html>
