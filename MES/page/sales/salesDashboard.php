<?php
// page/sales/salesDashboard.php
require_once __DIR__ . '/../components/init.php';

$pageTitle = "Sales Order Dashboard";
$pageIcon = "fas fa-shipping-fast"; 
$pageHeaderTitle = "Sales Order Tracking";
$pageHeaderSubtitle = "ติดตามสถานะการผลิตและการโหลดตู้";
$pageHelpId = "helpModal";
?>
<!DOCTYPE html>
<html lang="th">
<head>
    <title><?php echo $pageTitle; ?></title>
    <?php include_once '../components/common_head.php'; ?>
    <link rel="stylesheet" href="css/salesDashboard.css?v=<?php echo time(); ?>">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/Sortable/1.15.0/Sortable.min.js"></script> 
    
    <style>
        /* Interactive Sort Header Style */
        th.sortable { 
            cursor: pointer; 
            transition: background-color 0.2s;
        }
        th.sortable:hover {
            background-color: #e9ecef !important;
        }
        .sort-icon {
            font-size: 0.8em;
            opacity: 0.3;
            float: right;
            margin-top: 4px;
        }
        th.sortable:hover .sort-icon {
            opacity: 1;
        }
        th[data-sort-dir="asc"] .sort-icon::before { content: "\f0de"; opacity: 1; color: #0d6efd; } /* Up */
        th[data-sort-dir="desc"] .sort-icon::before { content: "\f0dd"; opacity: 1; color: #0d6efd; } /* Down */
    </style>
</head>
<body class="layout-top-header">

    <div id="loadingOverlay" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 9999; flex-direction: column; align-items: center; justify-content: center; backdrop-filter: blur(2px);">
        <div class="spinner-border text-light mb-3" role="status"></div>
        <h5 class="fw-bold text-white">Processing...</h5>
    </div>

    <?php include('../components/php/top_header.php'); ?>
    <?php include('../components/php/mobile_menu.php'); ?>
    <?php include('../components/php/docking_sidebar.php'); ?>

    <div class="page-container">
        <div id="main-content">
            <div class="content-wrapper pt-3">
                
                <div class="row g-2 mb-3">
    
                    <div class="col-6 col-md-4 col-lg-20-percent">
                        <div class="card shadow-sm kpi-card border-primary h-100 active" onclick="filterData('ACTIVE')" id="card-active" style="cursor: pointer;">
                            <div class="card-body p-3">
                                <div class="d-flex justify-content-between align-items-center">
                                    <div>
                                        <div class="text-uppercase text-primary small fw-bold mb-1">Active Orders</div>
                                        <h2 class="text-primary fw-bold mb-0" id="kpi-active">0</h2>
                                        <div class="small text-muted mt-1" style="font-size: 0.75rem;">Total In-Progress</div>
                                    </div>
                                    <div class="bg-primary bg-opacity-10 text-primary p-3 rounded-circle">
                                        <i class="fas fa-chart-line fa-lg"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="col-6 col-md-4 col-lg-20-percent">
                        <div class="card shadow-sm kpi-card border-warning h-100" onclick="filterData('WAIT_PROD')" id="card-wait-prod" style="cursor: pointer;">
                            <div class="card-body p-3">
                                <div class="d-flex justify-content-between align-items-center">
                                    <div>
                                        <div class="text-uppercase text-warning small fw-bold mb-1">Wait Production</div>
                                        <h2 class="text-warning fw-bold mb-0" id="kpi-wait-prod">0</h2>
                                        <div class="small text-muted mt-1" style="font-size: 0.75rem;">Plan & Material</div>
                                    </div>
                                    <div class="bg-warning bg-opacity-10 text-warning p-3 rounded-circle">
                                        <i class="fas fa-industry fa-lg"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="col-6 col-md-4 col-lg-20-percent">
                        <div class="card shadow-sm kpi-card border-info h-100" onclick="filterData('WAIT_LOAD')" id="card-wait-load" style="cursor: pointer;">
                            <div class="card-body p-3">
                                <div class="d-flex justify-content-between align-items-center">
                                    <div>
                                        <div class="text-uppercase text-info small fw-bold mb-1">Ready to Load</div>
                                        <h2 class="text-info fw-bold mb-0" id="kpi-wait-load">0</h2>
                                        <div class="small text-muted mt-1" style="font-size: 0.75rem;">At Dock / Stock</div>
                                    </div>
                                    <div class="bg-info bg-opacity-10 text-info p-3 rounded-circle">
                                        <i class="fas fa-dolly fa-lg"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="col-6 col-md-4 col-lg-20-percent">
                        <div class="card shadow-sm kpi-card border-success h-100" onclick="filterData('PROD_DONE')" id="card-prod-done" style="cursor: pointer;">
                            <div class="card-body p-3">
                                <div class="d-flex justify-content-between align-items-center">
                                    <div>
                                        <div class="text-uppercase text-success small fw-bold mb-1">Shipped / Loaded</div>
                                        <h2 class="text-success fw-bold mb-0" id="kpi-prod-done">0</h2>
                                        <div class="small text-muted mt-1" style="font-size: 0.75rem;">Completed</div>
                                    </div>
                                    <div class="bg-success bg-opacity-10 text-success p-3 rounded-circle">
                                        <i class="fas fa-truck-moving fa-lg"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="col-6 col-md-4 col-lg-20-percent">
                        <div class="card shadow-sm kpi-card border-secondary h-100" onclick="filterData('ALL')" id="card-all" style="cursor: pointer;">
                            <div class="card-body p-3">
                                <div class="d-flex justify-content-between align-items-center">
                                    <div>
                                        <div class="text-uppercase text-secondary small fw-bold mb-1">All History</div>
                                        <h2 class="text-secondary fw-bold mb-0" id="kpi-total-all">0</h2>
                                        <div class="small text-muted mt-1" style="font-size: 0.75rem;">All Records</div>
                                    </div>
                                    <div class="bg-secondary bg-opacity-10 text-secondary p-3 rounded-circle">
                                        <i class="fas fa-history fa-lg"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>

                <div class="card shadow-sm border-0 mb-3">
                    <div class="card-body p-2 bg-body-tertiary rounded">
                        <div class="d-flex flex-wrap align-items-center justify-content-between gap-2">
                            
                            <div class="d-flex align-items-center gap-2 flex-grow-1">
                                <div class="input-group input-group-sm" style="max-width: 350px;">
                                    <span class="input-group-text bg-body border-secondary-subtle text-secondary"><i class="fas fa-search"></i></span>
                                    <input type="text" id="universalSearch" class="form-control border-secondary-subtle ps-2" placeholder="Search PO, SKU...">
                                </div>
                                <a href="shipping_loading.php" class="btn btn-outline-primary btn-sm fw-bold shadow-sm d-flex align-items-center" data-bs-toggle="tooltip" title="ไปหน้าจัดตารางโหลดตู้">
                                    <i class="fas fa-truck-loading me-2"></i> Shipping Schedule
                                </a>
                                <button class="btn btn-outline-secondary btn-sm d-flex align-items-center justify-content-center" 
                                        onclick="resetToPlanOrder()" 
                                        title="Reset Order (เรียงตามแผนผลิต)"
                                        style="width: 32px; height: 32px;"> 
                                    <i class="fas fa-sync-alt"></i>
                                </button>
                            </div>

                            <div class="d-flex align-items-center gap-2 flex-wrap justify-content-end">
                                
                                <div class="d-none d-xl-flex align-items-center border border-secondary-subtle rounded px-3 py-1 bg-body shadow-sm h-100">
                                    <span class="badge bg-dark me-2" id="sum-containers">0</span> <span class="small text-muted fw-bold me-3">Orders</span>
                                    <span class="badge bg-info text-dark me-2" id="sum-qty">0</span> <span class="small text-muted fw-bold me-3">Pcs</span>
                                    <div class="vr me-3 opacity-25"></div>
                                    <span class="fw-bold text-success font-monospace me-3" id="sum-amount">฿0.00</span>
                                    
                                    <div class="vr me-2 opacity-25"></div>
                                    <div class="d-flex align-items-center" title="Exchange Rate">
                                        <span class="small text-muted me-1">1$ =</span>
                                        <input type="number" id="exchangeRate" 
                                               class="form-control form-control-sm text-end fw-bold text-primary px-1 border-0 bg-transparent" 
                                               value="32" step="0.01" 
                                               style="width: 50px;"> 
                                    </div>
                                </div>

                                <div class="btn-group shadow-sm">
                                    <button class="btn btn-light btn-sm border-secondary-subtle" onclick="document.getElementById('fileInput').click()" title="Import Excel">
                                        <i class="fas fa-file-import text-secondary"></i>
                                    </button>
                                    <button class="btn btn-light btn-sm border-secondary-subtle" onclick="exportData()" title="Export Excel">
                                        <i class="fas fa-file-excel text-success"></i>
                                    </button>
                                </div>

                                <button class="btn btn-primary btn-sm fw-bold px-3 shadow-sm" onclick="openCreateModal()">
                                    <i class="fas fa-plus me-1"></i> New
                                </button>
                                
                                <input type="file" id="fileInput" hidden accept=".csv, .xlsx, .xls">
                            </div>
                        </div>
                    </div>
                </div>

                <div class="card shadow-sm border-0 table-card h-100">
                    <div class="table-responsive-custom">
                        <table class="table table-bordered table-hover align-middle mb-0 text-nowrap sales-table">
                            <thead class="bg-light sticky-top">
                                <tr class="text-center align-middle">
                                    
                                    <th class="sticky-col-left-1 text-secondary" title="Drag to reorder">
                                        <i class="fas fa-bars"></i>
                                    </th>
                                    
                                    <th class="sticky-col-left-2 sortable" data-sort="po_number">
                                        PO Number <i class="sort-icon fas fa-sort ms-1"></i>
                                    </th>
                                    
                                    <th class="sticky-col-left-3 sortable ps-2 pe-2" data-sort="is_confirmed">
                                        Conf. <i class="sort-icon fas fa-sort ms-1"></i>
                                    </th>
                                    
                                    <th class="sortable" data-sort="sku">SKU <i class="sort-icon fas fa-sort ms-1"></i></th>
                                    <th class="sortable" data-sort="description">Description <i class="sort-icon fas fa-sort ms-1"></i></th>
                                    <th class="sortable" data-sort="color">Color <i class="sort-icon fas fa-sort ms-1"></i></th>
                                    <th class="text-center sortable" data-sort="quantity">Qty <i class="sort-icon fas fa-sort ms-1"></i></th>
                                    
                                    <th class="sortable" data-sort="dc_location">DC <i class="sort-icon fas fa-sort ms-1"></i></th>
                                    <th class="sortable" data-sort="loading_week">Load Wk <i class="sort-icon fas fa-sort ms-1"></i></th>
                                    <th class="sortable" data-sort="shipping_week">Ship Wk <i class="sort-icon fas fa-sort ms-1"></i></th>
                                    
                                    <th class="text-center bg-warning bg-opacity-10 sortable" data-sort="production_date">
                                        Prod Date <i class="sort-icon fas fa-sort ms-1"></i>
                                    </th>
                                    <th class="text-center bg-warning bg-opacity-10 sortable text-nowrap" data-sort="is_production_done" style="min-width: 90px;">
                                        Done? <i class="sort-icon fas fa-sort ms-1"></i>
                                    </th>
                                    
                                    <th class="text-center bg-info bg-opacity-10 sortable" data-sort="loading_date">
                                        Load Date <i class="sort-icon fas fa-sort ms-1"></i>
                                    </th>
                                    <th class="text-center bg-info bg-opacity-10 sortable text-nowrap" data-sort="is_loading_done" style="min-width: 90px;">
                                        Loaded? <i class="sort-icon fas fa-sort ms-1"></i>
                                    </th>
                                    
                                    <th class="text-center bg-purple bg-opacity-10 sortable" data-sort="inspection_date">
                                        Insp Date <i class="sort-icon fas fa-sort ms-1"></i>
                                    </th>
                                    <th class="text-center bg-purple bg-opacity-10 sortable text-nowrap" data-sort="inspection_status" style="min-width: 90px;">
                                        Pass? <i class="sort-icon fas fa-sort ms-1"></i>
                                    </th>
                                    
                                    <th class="sortable" data-sort="ticket_number">Ticket <i class="sort-icon fas fa-sort ms-1"></i></th>
                                    <th class="text-end sortable" data-sort="price">Price (THB) <i class="sort-icon fas fa-sort ms-1"></i></th>
                                    <th class="sortable" data-sort="remark">Remark <i class="sort-icon fas fa-sort ms-1"></i></th>
                                </tr>
                            </thead>
                            <tbody id="tableBody" class="bg-white"></tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div class="modal fade" id="importResultModal" tabindex="-1">
         <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content border-0 shadow">
                <div class="modal-header bg-body-tertiary">
                    <h5 class="modal-title fw-bold"><i class="fas fa-file-import me-2"></i>Import Results</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <div class="text-center mb-3">
                        <h3 class="text-success fw-bold mb-0" id="importSuccessCount">0</h3>
                        <small class="text-muted">รายการที่นำเข้าสำเร็จ</small>
                    </div>
                    <div id="importErrorSection" class="d-none">
                        <div class="alert alert-warning d-flex align-items-center mb-2">
                            <i class="fas fa-exclamation-triangle me-2"></i>
                            <div>พบปัญหา <strong id="importSkipCount">0</strong> รายการ (ถูกข้าม)</div>
                        </div>
                        <textarea id="importErrorLog" class="form-control form-control-sm font-monospace bg-body-secondary text-danger border-0" rows="5" readonly style="font-size: 0.8rem;"></textarea>
                    </div>
                    <div id="importAllSuccess" class="text-center text-success py-2 d-none">
                        <i class="fas fa-check-circle fa-2x mb-2"></i><br>นำเข้าข้อมูลครบถ้วนสมบูรณ์
                    </div>
                </div>
                <div class="modal-footer bg-body-tertiary border-0">
                    <button type="button" class="btn btn-primary w-100" data-bs-dismiss="modal">ตกลง (OK)</button>
                </div>
            </div>
        </div>
    </div>

    <?php
        include('components/createOrderModal.php');
        include 'components/helpModal.php';
    ?>

    <script src="../../utils/libs/xlsx.full.min.js"></script>
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="script/salesDashboard.js?v=<?php echo time(); ?>"></script>
</body>
</html>