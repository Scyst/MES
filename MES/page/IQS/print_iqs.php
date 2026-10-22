<?php
/**
 * print_iqs.php — Audit-Ready Printable Pull Test Record
 * Path: MES/MES/page/IQS/print_iqs.php
 * Replicates the original standard document "拉力测试 / การทดสอบแรงดึง" for audits.
 */

require_once __DIR__ . '/../../auth/check_auth.php';
require_once __DIR__ . '/../db.php';

$roundId = (int)($_GET['round_id'] ?? 0);
if (!$roundId) {
    die("Invalid Round ID");
}

// Fetch round details
$stmt = $pdo->prepare("
    SELECT r.round_id, r.round_number, r.plan_date, r.round_name, r.shift, r.status,
           CONVERT(varchar(16), r.started_at, 120) AS started_at,
           CONVERT(varchar(16), r.submitted_at, 120) AS submitted_at,
           r.notes,
           u1.fullname AS primary_tester_name,
           u2.fullname AS co_tester_name_1,
           u3.fullname AS co_tester_name_2
    FROM dbo.IQS_ROUNDS r
    LEFT JOIN dbo.USERS u1 ON r.primary_tester_id = u1.id
    LEFT JOIN dbo.USERS u2 ON r.co_tester_id_1 = u2.id
    LEFT JOIN dbo.USERS u3 ON r.co_tester_id_2 = u3.id
    WHERE r.round_id = :round_id
");
$stmt->execute([':round_id' => $roundId]);
$round = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$round) {
    die("Round not found");
}

// Fetch records
$stmtRecs = $pdo->prepare("
    SELECT rec.record_id, rec.machine_id, rec.machine_code,
           rec.sku, rec.po_no, rec.thickness, rec.pull_result,
           rec.knock_check_val, rec.distance_check_val,
           CONVERT(varchar(5), rec.recorded_at, 108) AS recorded_time,
           CONVERT(varchar(10), rec.recorded_at, 120) AS recorded_date,
           rec.is_skipped, rec.skip_reason, rec.ng_status, rec.ng_remark,
           m.machine_name
    FROM dbo.IQS_TEST_RECORDS rec
    JOIN dbo.PE_MACHINES m ON rec.machine_id = m.machine_id
    WHERE rec.round_id = :round_id
    ORDER BY rec.machine_code ASC
");
$stmtRecs->execute([':round_id' => $roundId]);
$records = $stmtRecs->fetchAll(PDO::FETCH_ASSOC);

// Fetch attachments
$stmtAtt = $pdo->prepare("
    SELECT a.attach_id, a.record_id, a.attach_type, a.file_path, a.file_name
    FROM dbo.IQS_ATTACHMENTS a
    JOIN dbo.IQS_TEST_RECORDS rec ON a.record_id = rec.record_id
    WHERE rec.round_id = :round_id
");
$stmtAtt->execute([':round_id' => $roundId]);
$attachments = $stmtAtt->fetchAll(PDO::FETCH_ASSOC);

$attachByRecord = [];
foreach ($attachments as $att) {
    $attachByRecord[$att['record_id']][] = $att;
}

$testers = array_filter([
    $round['primary_tester_name'],
    $round['co_tester_name_1'],
    $round['co_tester_name_2']
]);
?>
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <title>การทดสอบแรงดึง — <?php echo htmlspecialchars($round['round_number']); ?></title>
    <link rel="stylesheet" href="../../page/components/css/bootstrap.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        body {
            font-family: 'Sarabun', 'Angsana New', sans-serif;
            color: #111;
            background: #f8f9fa;
            margin: 0;
            padding: 20px;
        }
        .print-container {
            max-width: 1000px;
            margin: auto;
            background: #fff;
            padding: 30px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.08);
            border-radius: 4px;
        }
        .doc-header {
            text-align: center;
            border-bottom: 2px solid #222;
            padding-bottom: 12px;
            margin-bottom: 15px;
        }
        .doc-header h2 {
            font-size: 24px;
            margin: 0;
            font-weight: bold;
            letter-spacing: 2px;
        }
        .doc-header h3 {
            font-size: 20px;
            margin: 4px 0 0;
            font-weight: bold;
        }
        .meta-box {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 10px;
            font-size: 13px;
            background: #fafafa;
            padding: 10px 15px;
            border: 1px solid #ddd;
            margin-bottom: 15px;
        }
        .table-pull {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
            margin-bottom: 20px;
        }
        .table-pull th, .table-pull td {
            border: 1px solid #333;
            padding: 6px 4px;
            text-align: center;
            vertical-align: middle;
        }
        .table-pull th {
            background-color: #f1f3f5;
            font-weight: bold;
        }
        .check-mark {
            font-weight: bold;
            font-size: 14px;
        }
        .check-ok {
            color: #198754;
        }
        .check-ng {
            color: #dc3545;
            font-weight: bold;
        }
        .sign-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
            margin-top: 40px;
            text-align: center;
            font-size: 13px;
        }
        .sign-line {
            border-bottom: 1px dotted #333;
            height: 45px;
            margin-bottom: 8px;
        }
        .photo-thumb {
            width: 45px;
            height: 45px;
            object-fit: cover;
            border-radius: 3px;
            border: 1px solid #ccc;
            margin: 2px;
        }
        @media print {
            body {
                background: #fff;
                padding: 0;
            }
            .print-container {
                box-shadow: none;
                padding: 0;
                max-width: 100%;
            }
            .no-print {
                display: none !important;
            }
        }
    </style>
</head>
<body>

<div class="print-container">
    <div class="no-print d-flex justify-content-between align-items-center mb-4 pb-2 border-bottom">
        <div>
            <a href="iqsUI.php" class="btn btn-outline-secondary btn-sm me-2"><i class="fas fa-arrow-left me-1"></i>กลับหน้าระบบ</a>
            <span class="badge bg-<?php echo ($round['status'] === 'SUBMITTED' ? 'success' : ($round['status'] === 'COMPLETED_WITH_NG' ? 'danger' : 'warning')); ?>">
                <?php echo htmlspecialchars($round['status']); ?>
            </span>
        </div>
        <button onclick="window.print()" class="btn btn-primary btn-sm"><i class="fas fa-print me-1"></i>พิมพ์เอกสาร (Print / PDF)</button>
    </div>

    <div class="doc-header">
        <h2>拉力测试</h2>
        <h3>การทดสอบแรงดึง</h3>
    </div>

    <div class="meta-box">
        <div><strong>วันที่ (Date):</strong> <?php echo htmlspecialchars($round['plan_date']); ?></div>
        <div><strong>เลขที่รอบ (Round):</strong> <?php echo htmlspecialchars($round['round_number']); ?></div>
        <div><strong>ชื่อรอบ (Slot):</strong> <?php echo htmlspecialchars($round['round_name']); ?></div>
        <div><strong>กะทำงาน (Shift):</strong> <?php echo htmlspecialchars($round['shift']); ?></div>
        <div style="grid-column: span 4;">
            <strong>ผู้ทดสอบ (Inspectors):</strong> 
            <?php echo htmlspecialchars(implode(', ', $testers)); ?>
        </div>
    </div>

    <table class="table-pull">
        <thead>
            <tr>
                <th style="width: 80px;">วันที่<br>Day</th>
                <th style="width: 90px;">รหัสสินค้า<br>PO</th>
                <th style="width: 90px;">ชื่อโมเดล<br>SKU</th>
                <th style="width: 80px;">ความหนาวัสดุ<br>T (mm)</th>
                <th style="width: 100px;">หมายเลขเครื่อง<br>Machine No.</th>
                <th style="width: 70px;">เช็คเคาะ<br>Knock</th>
                <th style="width: 70px;">เช็คระยะ<br>Distance</th>
                <th style="width: 45px;">NG</th>
                <th style="width: 45px;">OK</th>
                <th style="width: 70px;">เวลา<br>Time</th>
                <th class="no-print" style="width: 100px;">รูปหลักฐาน</th>
            </tr>
        </thead>
        <tbody>
            <?php if (empty($records)): ?>
                <tr>
                    <td colspan="11" class="text-muted py-4">ไม่มีข้อมูลการทดสอบในรอบนี้</td>
                </tr>
            <?php else: ?>
                <?php foreach ($records as $r): ?>
                    <tr>
                        <td><?php echo htmlspecialchars($r['recorded_date'] ?? $round['plan_date']); ?></td>
                        <td><?php echo htmlspecialchars($r['po_no'] ?: '-'); ?></td>
                        <td><strong><?php echo htmlspecialchars($r['sku'] ?: '-'); ?></strong></td>
                        <td><?php echo ($r['thickness'] !== null) ? number_format((float)$r['thickness'], 2) : '-'; ?></td>
                        <td>
                            <strong><?php echo htmlspecialchars($r['machine_code']); ?></strong>
                            <?php if ($r['is_skipped']): ?>
                                <span class="d-block text-muted" style="font-size:10px;">(ข้าม: <?php echo htmlspecialchars($r['skip_reason'] ?: 'เครื่องหยุด'); ?>)</span>
                            <?php endif; ?>
                        </td>
                        <td><?php echo ($r['knock_check_val'] !== null) ? number_format((float)$r['knock_check_val'], 2) : '-'; ?></td>
                        <td><?php echo ($r['distance_check_val'] !== null) ? number_format((float)$r['distance_check_val'], 2) : '-'; ?></td>
                        <td>
                            <?php if ($r['pull_result'] === 'NG'): ?>
                                <span class="check-mark check-ng">✓</span>
                            <?php endif; ?>
                        </td>
                        <td>
                            <?php if ($r['pull_result'] === 'OK'): ?>
                                <span class="check-mark check-ok">✓</span>
                            <?php endif; ?>
                        </td>
                        <td><?php echo htmlspecialchars($r['recorded_time']); ?></td>
                        <td class="no-print">
                            <?php 
                            $atts = $attachByRecord[$r['record_id']] ?? [];
                            foreach ($atts as $a): 
                            ?>
                                <a href="../../<?php echo htmlspecialchars($a['file_path']); ?>" target="_blank" title="<?php echo htmlspecialchars($a['attach_type']); ?>">
                                    <img src="../../<?php echo htmlspecialchars($a['file_path']); ?>" class="photo-thumb" alt="Thumb">
                                </a>
                            <?php endforeach; ?>
                        </td>
                    </tr>
                <?php endforeach; ?>
            <?php endif; ?>
        </tbody>
    </table>

    <div class="sign-grid">
        <div>
            <div class="sign-line"></div>
            <strong>ผู้ทำการทดสอบ (Inspector)</strong><br>
            <span><?php echo htmlspecialchars($round['primary_tester_name'] ?? '..................................'); ?></span><br>
            <small class="text-muted">วันที่: <?php echo htmlspecialchars($round['plan_date']); ?></small>
        </div>
        <div>
            <div class="sign-line"></div>
            <strong>หัวหน้างาน (Supervisor)</strong><br>
            <span>..................................</span><br>
            <small class="text-muted">วันที่: ....../....../......</small>
        </div>
        <div>
            <div class="sign-line"></div>
            <strong>แผนกประกันคุณภาพ (QA Dept.)</strong><br>
            <span>..................................</span><br>
            <small class="text-muted">วันที่: ....../....../......</small>
        </div>
    </div>
</div>

</body>
</html>
