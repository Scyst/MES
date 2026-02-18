<?php
// MES/page/finance/finance_dashboard.php
require_once __DIR__ . '/../components/init.php';

$pageHeaderTitle = "Invoice Management";
$pageHeaderSubtitle = "ระบบออกบิลและจัดการเวอร์ชันอัตโนมัติ";
$pageIcon = "fas fa-file-invoice-dollar";
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <?php include __DIR__ . '/../components/common_head.php'; ?>
    <link rel="stylesheet" href="css/finance_dashboard.css?v=<?php echo filemtime(__DIR__ . '/css/finance_dashboard.css'); ?>">
</head>
<body class="layout-top-header">
    <?php include __DIR__ . '/../components/php/top_header.php'; ?>

    <div id="main-content" class="container-fluid pt-4 px-3 px-md-4 pb-4">
        
        <div class="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
            <div class="d-flex align-items-center gap-2 flex-wrap" style="flex: 1;">
                <div class="input-group shadow-sm" style="max-width: 250px;">
                    <span class="input-group-text bg-white text-muted"><i class="fas fa-search"></i></span>
                    <input type="text" id="searchInput" class="form-control border-start-0" placeholder="ค้นหา Invoice...">
                </div>
                
                <div class="input-group shadow-sm" style="max-width: 320px;">
                    <span class="input-group-text bg-white text-muted small">จาก</span>
                    <input type="date" id="filterStartDate" class="form-control form-control-sm">
                    <span class="input-group-text bg-white text-muted small">ถึง</span>
                    <input type="date" id="filterEndDate" class="form-control form-control-sm">
                </div>
                
                <button class="btn btn-primary shadow-sm btn-sm fw-bold" onclick="loadHistory()"><i class="fas fa-filter"></i> กรอง</button>
                <button class="btn btn-light shadow-sm border btn-sm" onclick="clearFilter()" title="ล้างตัวกรอง"><i class="fas fa-sync-alt text-primary"></i></button>
            </div>

            <div class="d-flex gap-2">
                <button type="button" id="btnDownloadTemplate" class="btn btn-outline-success shadow-sm fw-bold">
                    <i class="fas fa-file-excel me-1"></i> ดาวน์โหลดฟอร์ม
                </button>
                <button type="button" class="btn btn-primary shadow-sm fw-bold" data-bs-toggle="modal" data-bs-target="#importModal">
                    <i class="fas fa-file-import me-1"></i> นำเข้า Invoice
                </button>
            </div>
        </div>

        <div class="card shadow-sm h-100 border-0">
            <div class="card-body p-0">
                <div class="table-responsive" style="max-height: 650px;">
                    <table class="table table-hover align-middle mb-0" id="historyTable">
                        <thead class="table-light text-secondary" style="position: sticky; top: 0; z-index: 1;">
                            <tr>
                                <th>Invoice No.</th>
                                <th>Customer</th>
                                <th>Logistics Info</th>
                                <th class="text-center">ETD / ETA</th>
                                <th class="text-end">Total (USD)</th>
                                <th class="text-center">Status</th>
                                <th class="text-center">Date</th>
                                <th class="text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr><td colspan="8" class="text-center text-muted py-4">กำลังโหลดข้อมูล...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>

    <?php include __DIR__ . '/components/financeModal.php'; ?>
    <script src="../../utils/libs/xlsx.full.min.js"></script>
    <script src="script/finance_dashboard.js?v=<?php echo filemtime(__DIR__ . '/script/finance_dashboard.js'); ?>"></script>
</body>
</html>