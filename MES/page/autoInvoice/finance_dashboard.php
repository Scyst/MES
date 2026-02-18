<?php
// MES/page/finance/finance_dashboard.php
require_once __DIR__ . '/../components/init.php';

$pageTitle = "Invoice Management";
$pageHeaderTitle = "Invoice Management";
$pageHeaderSubtitle = "ระบบออกบิลและจัดการเวอร์ชันอัตโนมัติ";
$pageIcon = "fas fa-file-invoice-dollar";
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <?php include __DIR__ . '/../components/common_head.php'; ?>
    <link rel="stylesheet" href="../sales/css/salesDashboard.css"> 
    <link rel="stylesheet" href="css/finance_dashboard.css?v=<?php echo time(); ?>">
    <style>
        /* สไตล์เสริมสำหรับ KPI Card ให้คลิกได้ */
        .kpi-card { cursor: pointer; transition: all 0.2s ease-in-out; }
        .kpi-card:hover { transform: translateY(-3px); box-shadow: 0 0.5rem 1rem rgba(0,0,0,0.15) !important; }
        .kpi-card.active { border: 2px solid #0d6efd !important; background-color: #f8f9fa; }
    </style>
</head>
<body class="layout-top-header">
    <div class="page-container">
        <?php include __DIR__ . '/../components/php/top_header.php'; ?>

        <div id="main-content">
            <div class="content-wrapper">
                
                <div class="row row-cols-2 row-cols-md-3 row-cols-xl-5 g-3 mb-3">
                    <div class="col">
                        <div class="card shadow-sm border-0 border-start border-4 border-primary h-100 kpi-card active" id="card-ALL" onclick="filterStatus('ALL')">
                            <div class="card-body p-3">
                                <div class="text-muted small fw-bold mb-1">ALL INVOICES</div>
                                <div class="d-flex justify-content-between align-items-center">
                                    <h3 class="mb-0 fw-bold text-primary" id="kpi-all">0</h3>
                                    <i class="fas fa-file-invoice fa-2x text-primary opacity-25"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col">
                        <div class="card shadow-sm border-0 border-start border-4 border-warning h-100 kpi-card" id="card-Pending" onclick="filterStatus('Pending')">
                            <div class="card-body p-3">
                                <div class="text-muted small fw-bold mb-1">PENDING</div>
                                <div class="d-flex justify-content-between align-items-center">
                                    <h3 class="mb-0 fw-bold text-warning" id="kpi-pending">0</h3>
                                    <i class="fas fa-clock fa-2x text-warning opacity-25"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col">
                        <div class="card shadow-sm border-0 border-start border-4 border-info h-100 kpi-card" id="card-Exported" onclick="filterStatus('Exported')">
                            <div class="card-body p-3">
                                <div class="text-muted small fw-bold mb-1">EXPORTED</div>
                                <div class="d-flex justify-content-between align-items-center">
                                    <h3 class="mb-0 fw-bold text-info" id="kpi-exported">0</h3>
                                    <i class="fas fa-plane-departure fa-2x text-info opacity-25"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col">
                        <div class="card shadow-sm border-0 border-start border-4 border-success h-100 kpi-card" id="card-Paid" onclick="filterStatus('Paid')">
                            <div class="card-body p-3">
                                <div class="text-muted small fw-bold mb-1">PAID</div>
                                <div class="d-flex justify-content-between align-items-center">
                                    <h3 class="mb-0 fw-bold text-success" id="kpi-paid">0</h3>
                                    <i class="fas fa-check-circle fa-2x text-success opacity-25"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col">
                        <div class="card shadow-sm border-0 border-start border-4 border-danger h-100 kpi-card" id="card-Voided" onclick="filterStatus('Voided')">
                            <div class="card-body p-3">
                                <div class="text-muted small fw-bold mb-1">VOIDED</div>
                                <div class="d-flex justify-content-between align-items-center">
                                    <h3 class="mb-0 fw-bold text-danger" id="kpi-voided">0</h3>
                                    <i class="fas fa-ban fa-2x text-danger opacity-25"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="card shadow-sm border-0 mb-3 flex-shrink-0">
                    <div class="card-body p-2">
                        <div class="d-flex flex-wrap justify-content-between align-items-center gap-2">
                            <div class="d-flex align-items-center gap-2 flex-wrap" style="flex: 1;">
                                <div class="input-group input-group-sm shadow-sm" style="max-width: 250px;">
                                    <span class="input-group-text bg-white text-muted"><i class="fas fa-search"></i></span>
                                    <input type="text" id="searchInput" class="form-control border-start-0" placeholder="Search Invoice...">
                                </div>
                                
                                <div class="input-group input-group-sm shadow-sm" style="max-width: 320px;">
                                    <span class="input-group-text bg-white text-muted">From</span>
                                    <input type="date" id="filterStartDate" class="form-control">
                                    <span class="input-group-text bg-white text-muted">To</span>
                                    <input type="date" id="filterEndDate" class="form-control">
                                </div>
                                
                                <button class="btn btn-primary btn-sm shadow-sm fw-bold" onclick="loadHistory()"><i class="fas fa-filter me-1"></i> Filter</button>
                                <button class="btn btn-light border btn-sm shadow-sm" onclick="clearFilter()" title="Clear Filters"><i class="fas fa-sync-alt text-secondary"></i></button>
                            </div>

                            <div class="d-flex gap-2">
                                <button type="button" id="btnDownloadTemplate" class="btn btn-outline-success btn-sm shadow-sm fw-bold">
                                    <i class="fas fa-file-excel me-1"></i> Template
                                </button>
                                <button type="button" class="btn btn-primary btn-sm shadow-sm fw-bold" data-bs-toggle="modal" data-bs-target="#importModal">
                                    <i class="fas fa-file-import me-1"></i> Import Invoice
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="card shadow-sm border-0 d-flex flex-column flex-grow-1" style="min-height: 0;">
                    <div class="table-responsive flex-grow-1" style="overflow-y: auto;">
                        <table class="table table-hover align-middle mb-0" id="historyTable">
                            <thead class="table-light text-secondary" style="position: sticky; top: 0; z-index: 10;">
                                <tr>
                                    <th style="width: 150px;">Invoice No.</th>
                                    <th>Customer</th>
                                    <th>Logistics Info</th>
                                    <th class="text-center">ETD / ETA</th>
                                    <th class="text-end">Total (USD)</th>
                                    <th class="text-center">Status</th>
                                    <th class="text-center">Date</th>
                                    <th class="text-center" style="width: 180px;">Action</th>
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
    </div> 

    <?php include __DIR__ . '/components/financeModal.php'; ?>
    
    <script src="../../utils/libs/xlsx.full.min.js"></script>
    <script src="script/finance_dashboard.js?v=<?php echo time(); ?>"></script>
</body>
</html>