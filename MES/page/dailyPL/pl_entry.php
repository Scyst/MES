<?php
// page/pl_daily/pl_entry.php
require_once __DIR__ . '/../components/init.php';

// กฎข้อ 1: Reality Check - เฉพาะผู้ที่มีสิทธิ์บันทึกข้อมูลเท่านั้น
if (!hasRole(['admin', 'creator', 'supervisor'])) {
    header("Location: ../../auth/access_denied.php");
    exit;
}

$pageTitle = "Daily P&L Entry";
$pageIcon = "fas fa-edit"; 
$pageHeaderTitle = "Daily Entry";
$pageHeaderSubtitle = "บันทึกค่าใช้จ่ายรายวัน (Manual Input)";

// ใช้ filemtime แทน time() เพื่อประสิทธิภาพของ Cache ในองค์กร
$v = filemtime(__DIR__ . '/script/pl_entry.js');
?>
<!DOCTYPE html>
<html lang="th">
<head>
    <title><?php echo $pageTitle; ?></title>
    <?php include_once '../components/common_head.php'; ?>
    <style>
        .sticky-top { top: -1px; z-index: 1020; }
        .card-stats { border-left: 5px solid; }
        .pl-input:focus { background-color: #fff9c4 !important; border-color: #fbc02d; box-shadow: 0 0 0 0.25  rem rgba(251, 192, 45, 0.25); }
        /* สำหรับจอ Mobile: ปรับแต่งตารางให้เหมาะสม */
        @media (max-width: 768px) {
            .value-display { font-size: 1.2rem; }
            .table-custom th:nth-child(1), .table-custom td:nth-child(1) { display: none; } /* ซ่อน Account Code ในจอเล็ก */
        }
    </style>
</head>
<body class="layout-top-header">
    <div class="page-container">
        <?php include_once '../components/php/top_header.php'; ?>
        
        <div id="main-content">
            <div class="content-wrapper p-3">
                
                <div class="row g-3 mb-3">
                    <div class="col-md-4">
                        <div class="card shadow-sm border-0 p-3 h-100">
                            <div class="row g-2">
                                <div class="col-6">
                                    <label class="small text-muted mb-1">วันที่ผลิต</label>
                                    <input type="date" id="targetDate" class="form-control border-0 bg-light fw-bold" value="<?php echo date('Y-m-d'); ?>">
                                </div>
                                <div class="col-6">
                                    <label class="small text-muted mb-1">แผนก/Line</label>
                                    <select id="sectionFilter" class="form-select border-0 bg-light fw-bold">
                                        <option value="Team 1" selected>Team 1</option>
                                        <option value="Team 2">Team 2</option>
                                        <?php if(isset($_SESSION['user']['line'])): ?>
                                            <option value="<?= $_SESSION['user']['line'] ?>"><?= $_SESSION['user']['line'] ?> (My Line)</option>
                                        <?php endif; ?>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-8">
                        <div class="card shadow-sm border-0 p-3 bg-primary text-white h-100 card-stats" style="border-left-color: #0d47a1;">
                            <div class="d-flex justify-content-between align-items-center">
                                <div>
                                    <small class="opacity-75">ยอดรวมค่าใช้จ่ายคีย์มือ (Manual Today)</small>
                                    <h2 class="fw-bold mb-0" id="sumManualExpense">0.00</h2>
                                </div>
                                <i class="fas fa-calculator fa-3x opacity-25"></i>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="row g-3 mb-4">
                    <div class="col-md-4">
                        <div class="card shadow-sm border-0 bg-info text-white p-3 card-stats" style="border-left-color: #006064;">
                            <div class="d-flex justify-content-between">
                                <small class="opacity-75">รายได้ผลิต (FG Auto)</small>
                                <i class="fas fa-boxes opacity-50"></i>
                            </div>
                            <h3 class="fw-bold mb-0 value-display" id="autoRevenue">0.00</h3>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="card shadow-sm border-0 bg-danger text-white p-3 card-stats" style="border-left-color: #b71c1c;">
                            <div class="d-flex justify-content-between">
                                <small class="opacity-75">ต้นทุนค่าแรงรวม OT (Auto)</small>
                                <i class="fas fa-user-clock opacity-50"></i>
                            </div>
                            <h3 class="fw-bold mb-0 value-display" id="autoLabor">0.00</h3>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="card shadow-sm border-0 bg-success text-white p-3 card-stats" style="border-left-color: #1b5e20;">
                            <div class="d-flex justify-content-between">
                                <small class="opacity-75">ประมาณการกำไร (Est. GP)</small>
                                <i class="fas fa-chart-line opacity-50"></i>
                            </div>
                            <h3 class="fw-bold mb-0 value-display" id="estGP">0.00</h3>
                        </div>
                    </div>
                </div>

                <div class="card border-0 shadow-sm overflow-hidden" style="border-radius: 15px;">
                    <div class="card-body p-0">
                        <div class="table-responsive" style="max-height: 60vh;">
                            <table class="table table-hover table-custom align-middle mb-0">
                                <thead class="table-light sticky-top">
                                    <tr>
                                        <th width="120" class="ps-4">Code</th>
                                        <th>Account Name</th>
                                        <th width="150">Type</th>
                                        <th width="220" class="text-end pe-4">Actual Amount (THB)</th>
                                    </tr>
                                </thead>
                                <tbody id="entryTableBody">
                                    </tbody>
                            </table>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    </div>

    <script src="script/pl_entry.js?v=<?php echo $v; ?>"></script>
</body>
</html>