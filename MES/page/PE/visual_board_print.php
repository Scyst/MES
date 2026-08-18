<?php
// e:\MES\MES\MES\page\PE\visual_board_print.php
require_once __DIR__ . '/../components/init.php';
requirePermission(['view_production', 'view_maintenance', 'view_executive']);

require_once __DIR__ . '/../db.php';

$machines = [];
$filterLine = $_GET['line'] ?? '';

try {
    $sql = "SELECT machine_id, machine_code, machine_name, line FROM " . PE_MACHINES_TABLE . " WHERE is_active = 1";
    $params = [];
    if (!empty($filterLine)) {
        $sql .= " AND line = ?";
        $params[] = $filterLine;
    }
    $sql .= " ORDER BY line, machine_code";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $machines = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Get unique lines for filter
    $stmtLine = $pdo->query("SELECT DISTINCT line FROM " . PE_MACHINES_TABLE . " WHERE is_active = 1 AND line IS NOT NULL ORDER BY line");
    $lines = $stmtLine->fetchAll(PDO::FETCH_COLUMN);
    
} catch (Exception $e) {
    die("Database error: " . $e->getMessage());
}

$protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? "https" : "http";
$host = $_SERVER['HTTP_HOST'];
$baseUri = defined('BASE_URL') ? BASE_URL : '/MES/MES';
// Allow overriding via parameter for sandbox
$domainOverwrite = $_GET['domain'] ?? ($protocol . '://' . $host);
$hazardUrlBase = $domainOverwrite . $baseUri . "/page/PE/quick_hazard_report.php?machine_code=";
?>
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Visual Management Board Print</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        @page {
            size: A4 portrait;
            margin: 0;
        }
        body {
            background-color: #e9ecef;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        .no-print {
            padding: 20px;
            background: #fff;
            margin-bottom: 20px;
            border-bottom: 2px solid #dee2e6;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .board-page {
            width: 210mm;
            height: 297mm;
            background: white;
            margin: 0 auto 20px auto;
            padding: 20mm 15mm;
            box-shadow: 0 5px 15px rgba(0,0,0,0.2);
            page-break-after: always;
            position: relative;
            box-sizing: border-box;
        }
        .board-page:last-child {
            page-break-after: avoid;
        }
        
        .board-header {
            text-align: center;
            border-bottom: 4px solid #dc3545;
            padding-bottom: 15px;
            margin-bottom: 30px;
        }
        .board-title {
            font-size: 24pt;
            font-weight: 800;
            color: #212529;
            text-transform: uppercase;
            letter-spacing: 2px;
        }
        .board-subtitle {
            font-size: 14pt;
            color: #6c757d;
            font-weight: 600;
        }
        
        .machine-info {
            text-align: center;
            margin-bottom: 40px;
            background: #f8f9fa;
            border-radius: 15px;
            padding: 20px;
            border: 2px dashed #ced4da;
        }
        .machine-code {
            font-size: 55pt;
            font-weight: 900;
            color: #dc3545;
            line-height: 1;
            margin-bottom: 10px;
        }
        .machine-name {
            font-size: 20pt;
            font-weight: bold;
            color: #343a40;
        }
        
        .qr-section {
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 40px;
            gap: 30px;
        }
        .qr-code-box {
            border: 4px solid #dc3545;
            padding: 10px;
            border-radius: 10px;
            background: #fff;
        }
        .qr-text {
            max-width: 300px;
        }
        .qr-text h4 {
            font-weight: 900;
            color: #dc3545;
            font-size: 22pt;
            margin-bottom: 10px;
        }
        .qr-text p {
            font-size: 14pt;
            color: #495057;
            font-weight: 600;
        }
        
        .cards-section {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
        }
        .card-slot {
            border: 3px dashed #adb5bd;
            border-radius: 15px;
            height: 180px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            position: relative;
        }
        .card-slot.full-width {
            grid-column: span 2;
            height: 200px;
        }
        .slot-title {
            position: absolute;
            top: -15px;
            background: white;
            padding: 0 15px;
            font-weight: 900;
            font-size: 16pt;
            color: #495057;
        }
        .slot-icon {
            font-size: 40pt;
            color: #ced4da;
            margin-bottom: 10px;
        }
        .slot-desc {
            font-size: 12pt;
            color: #adb5bd;
        }
        
        @media print {
            .no-print { display: none !important; }
            body { background: white; }
            .board-page {
                margin: 0;
                box-shadow: none;
            }
        }
    </style>
</head>
<body>

<div class="no-print">
    <div class="container">
        <div class="d-flex justify-content-between align-items-center">
            <div>
                <h4 class="mb-0 fw-bold"><i class="fas fa-print text-primary"></i> Print Visual Management Boards</h4>
                <p class="text-muted mb-0">Select a line to print or print all machines</p>
            </div>
            <div class="d-flex gap-2">
                <form class="d-flex gap-2 align-items-center" method="GET">
                    <select name="line" class="form-select fw-bold border-primary">
                        <option value="">-- All Lines --</option>
                        <?php foreach($lines as $l): ?>
                            <option value="<?= htmlspecialchars($l) ?>" <?= $filterLine === $l ? 'selected' : '' ?>><?= htmlspecialchars($l) ?></option>
                        <?php endforeach; ?>
                    </select>
                    <button type="submit" class="btn btn-primary fw-bold px-4">Filter</button>
                </form>
                <button class="btn btn-danger fw-bold px-4 shadow-sm" onclick="window.print()">
                    <i class="fas fa-print me-2"></i> Print Boards
                </button>
            </div>
        </div>
    </div>
</div>

<?php if(empty($machines)): ?>
    <div class="container no-print">
        <div class="alert alert-warning fw-bold text-center">No machines found!</div>
    </div>
<?php endif; ?>

<div id="printContainer">
    <?php foreach($machines as $index => $m): 
        $machineUrl = $hazardUrlBase . urlencode($m['machine_code']);
    ?>
    <div class="board-page">
        <div class="board-header">
            <div class="board-subtitle">SNC FORMER PUBLIC COMPANY LIMITED</div>
            <div class="board-title">Machine Safety & Status Board</div>
        </div>
        
        <div class="machine-info">
            <div class="machine-code"><?= htmlspecialchars($m['machine_code']) ?></div>
            <div class="machine-name"><?= htmlspecialchars($m['machine_name']) ?> <span class="badge bg-secondary ms-2 fs-5"><?= htmlspecialchars($m['line']) ?></span></div>
        </div>
        
        <div class="qr-section">
            <div class="qr-code-box">
                <div id="qrcode_<?= $index ?>" class="qrcode-render" data-url="<?= htmlspecialchars($machineUrl) ?>"></div>
            </div>
            <div class="qr-text">
                <h4><i class="fas fa-exclamation-triangle"></i> แจ้งเหตุฉุกเฉิน</h4>
                <p>สแกน QR Code นี้เพื่อแจ้งปัญหาความปลอดภัย หรือเครื่องจักรขัดข้องทันที (ไม่ต้อง Login)</p>
            </div>
        </div>
        
        <div class="cards-section">
            <div class="card-slot full-width border-danger">
                <div class="slot-title text-danger">สถานะเครื่องจักร (Machine Status)</div>
                <i class="fas fa-traffic-light slot-icon text-danger opacity-50"></i>
                <div class="slot-desc">เสียบบัตรสถานะ: 🟢 ปกติ | 🟡 ระวัง | 🔴 หยุดเครื่อง</div>
            </div>
            
            <div class="card-slot border-primary">
                <div class="slot-title text-primary">พนักงานคุมเครื่อง</div>
                <i class="fas fa-id-badge slot-icon text-primary opacity-50"></i>
                <div class="slot-desc">Operator ID Card</div>
            </div>
            
            <div class="card-slot border-warning">
                <div class="slot-title text-warning text-dark">ช่างซ่อมบำรุง / LOTO</div>
                <i class="fas fa-tools slot-icon text-warning opacity-50"></i>
                <div class="slot-desc">Mechanic / LOTO Card</div>
            </div>
        </div>
    </div>
    <?php endforeach; ?>
</div>

<script src="../../utils/libs/qrcode.min.js"></script>
<script>
document.addEventListener('DOMContentLoaded', function() {
    const qrElements = document.querySelectorAll('.qrcode-render');
    qrElements.forEach(el => {
        const url = el.getAttribute('data-url');
        new QRCode(el, {
            text: url,
            width: 150,
            height: 150,
            colorDark : "#dc3545",
            colorLight : "#ffffff",
            correctLevel : QRCode.CorrectLevel.H
        });
    });
});
</script>

</body>
</html>
