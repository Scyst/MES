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
        
        /* ซ่อนลูกศรขึ้นลงในช่อง input number ของเรทเงิน */
        #exchangeRate::-webkit-inner-spin-button, 
        #exchangeRate::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        #exchangeRate { -moz-appearance: textfield; }
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
                    <div class="card-body p-2 bg-body-tertiary rounded">
                        <div class="d-flex flex-wrap align-items-center justify-content-between gap-2">
                            
                            <div class="d-flex align-items-center gap-2 flex-grow-1">
                                <div class="input-group input-group-sm" style="max-width: 350px;">
                                    <span class="input-group-text bg-body border-secondary-subtle text-secondary"><i class="fas fa-search"></i></span>
                                    <input type="text" id="universalSearch" class="form-control border-secondary-subtle ps-2" placeholder="ค้นหา Invoice No, Customer, Vessel...">
                                </div>

                                <div class="input-group input-group-sm shadow-sm" style="width: auto;">
                                    <span class="input-group-text bg-light border-secondary-subtle text-secondary small fw-bold"><i class="fas fa-users"></i></span>
                                    <select id="filterTeam" class="form-select border-secondary-subtle" onchange="renderTable()" style="font-weight: 500; min-width: 120px;">
                                        <option value="ALL">All Teams</option>
                                        <option value="Team 1">Team 1</option>
                                        <option value="Team 2">Team 2</option>
                                    </select>
                                </div>
                                
                                <div class="input-group input-group-sm shadow-sm" style="width: auto;">
                                    <select class="form-select border-secondary-subtle text-secondary small bg-light" id="filterDateType" style="max-width: 120px; font-weight: bold; border-right: 0;">
                                        <option value="created_at" selected>💾 Created</option>
                                        <option value="invoice_date">📝 Inv. Date</option>
                                        <option value="etd_date">🚢 ETD Date</option>
                                    </select>
                                    <input type="date" id="filterStartDate" class="form-control border-secondary-subtle" title="Start Date">
                                    <span class="input-group-text bg-white border-secondary-subtle border-start-0 border-end-0">-</span>
                                    <input type="date" id="filterEndDate" class="form-control border-secondary-subtle" title="End Date">
                                </div>

                                <button class="btn btn-outline-secondary btn-sm d-flex align-items-center justify-content-center" onclick="clearFilter()" data-bs-toggle="tooltip" title="Reset Filters" style="width: 32px; height: 32px;"> 
                                    <i class="fas fa-sync-alt"></i>
                                </button>
                            </div>

                            <div class="d-flex align-items-center gap-2 flex-wrap justify-content-end">
                                
                                <div class="d-none d-xl-flex align-items-center border border-secondary-subtle rounded px-3 py-0 bg-body shadow-sm h-100" style="min-height: 31px;">
                                    
                                    <span class="badge bg-dark me-2" id="sum-invoices">0</span> 
                                    <span class="small text-muted fw-bold me-2">Bills</span>
                                    
                                    <div class="vr mx-2 opacity-25"></div>
                                    
                                    <div class="d-flex align-items-center" title="Exchange Rate">
                                        <span class="small text-muted fw-bold me-1">1$ =</span>
                                        <input type="number" id="exchangeRate" class="form-control form-control-sm text-center fw-bold text-info px-1 border-0 bg-transparent shadow-none p-0" value="35.00" step="0.01" style="width: 55px;"> 
                                    </div>
                                    
                                    <div class="vr mx-2 opacity-25"></div>
                                    
                                    <span class="small text-muted fw-bold me-1">USD =</span>
                                    <span class="fw-bold text-success font-monospace" id="sum-amount-usd">$0.00</span>
                                    
                                    <div class="vr mx-2 opacity-25"></div>
                                    
                                    <span class="small text-muted fw-bold me-1">Baht =</span>
                                    <span class="fw-bold text-primary font-monospace" id="sum-amount-thb">฿0.00</span>
                                </div>

                                <div class="btn-group shadow-sm">
                                    <button class="btn btn-light btn-sm border-secondary-subtle" id="btnDownloadTemplate" data-bs-toggle="tooltip" title="Download Excel Template">
                                        <i class="fas fa-file-excel text-success"></i>
                                    </button>
                                    <button class="btn btn-light btn-sm border-secondary-subtle" data-bs-toggle="modal" data-bs-target="#importModal" data-bs-toggle="tooltip" title="Import Excel">
                                        <i class="fas fa-file-import text-secondary"></i>
                                    </button>
                                </div>

                                <button class="btn btn-primary btn-sm fw-bold px-3 shadow-sm" onclick="openCreateInvoice()">
                                    <i class="fas fa-plus me-1"></i> New
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
                                    <th style="width: 140px;">Invoice No.</th>
                                    <th style="width: 100px;">Inv. Date</th>
                                    <th style="width: 140px;">Booking No.</th>
                                    <th>Customer</th>
                                    <th>Logistics Info</th>
                                    <th class="text-center">ETD / ETA</th>
                                    <th class="text-end">Total (USD)</th>
                                    <th class="text-center">Ver.</th>
                                    <th class="text-center">Status</th>
                                    <th class="text-center">Created</th> <th class="text-center" style="width: 180px;">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr><td colspan="11" class="text-center text-muted py-4">กำลังโหลดข้อมูล...</td></tr>
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
    
    <script>
        // Activate Bootstrap Tooltips
        document.addEventListener('DOMContentLoaded', function () {
            var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
            var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
                return new bootstrap.Tooltip(tooltipTriggerEl)
            })
        });
    </script>
</body>
</html>