<?php
// page/sales/salesDashboard.php
require_once("../../auth/check_auth.php");

// 1. ตั้งค่า Header Variable
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
</head>
<body class="layout-top-header">

    <div id="loadingOverlay" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(255,255,255,0.8); z-index: 9999; flex-direction: column; align-items: center; justify-content: center;">
        <div class="spinner-border text-primary mb-3" role="status"></div>
        <h5 class="fw-bold text-muted">Processing...</h5>
    </div>

    <?php include('../components/php/top_header.php'); ?>
    <?php include('../components/php/mobile_menu.php'); ?>
    <?php include('../components/php/docking_sidebar.php'); ?>

    <div class="page-container">
        <div id="main-content">
            
            <div class="dashboard-header-sticky">
                <div class="row g-2 mb-3">
                    <div class="col-6 col-md-4 col-lg-20-percent">
                        <div class="card shadow-sm kpi-card active" onclick="filterData('ALL')" id="card-all">
                            <div class="card-body p-3">
                                <div class="d-flex justify-content-between align-items-center">
                                    <div><div class="text-uppercase text-muted small fw-bold mb-1">Total Orders</div><h2 class="text-dark fw-bold mb-0" id="kpi-total">0</h2></div>
                                    <div class="bg-secondary bg-opacity-10 text-secondary p-3 rounded-circle"><i class="fas fa-list fa-lg"></i></div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-6 col-md-4 col-lg-20-percent">
                        <div class="card shadow-sm kpi-card" onclick="filterData('WAIT_PROD')" id="card-wait-prod">
                            <div class="card-body p-3">
                                <div class="d-flex justify-content-between align-items-center">
                                    <div><div class="text-uppercase text-muted small fw-bold mb-1">Wait Production</div><h2 class="text-warning fw-bold mb-0" id="kpi-wait-prod">0</h2></div>
                                    <div class="bg-warning bg-opacity-10 text-warning p-3 rounded-circle"><i class="fas fa-industry fa-lg"></i></div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-6 col-md-4 col-lg-20-percent">
                        <div class="card shadow-sm kpi-card" onclick="filterData('PROD_DONE')" id="card-prod-done">
                            <div class="card-body p-3">
                                <div class="d-flex justify-content-between align-items-center">
                                    <div><div class="text-uppercase text-muted small fw-bold mb-1">Production Done</div><h2 class="text-primary fw-bold mb-0" id="kpi-prod-done">0</h2></div>
                                    <div class="bg-primary bg-opacity-10 text-primary p-3 rounded-circle"><i class="fas fa-check-circle fa-lg"></i></div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-6 col-md-4 col-lg-20-percent">
                        <div class="card shadow-sm kpi-card" onclick="filterData('WAIT_LOAD')" id="card-wait-load">
                            <div class="card-body p-3">
                                <div class="d-flex justify-content-between align-items-center">
                                    <div><div class="text-uppercase text-muted small fw-bold mb-1">Ready to Load</div><h2 class="text-info fw-bold mb-0" id="kpi-wait-load">0</h2></div>
                                    <div class="bg-info bg-opacity-10 text-info p-3 rounded-circle"><i class="fas fa-dolly fa-lg"></i></div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-6 col-md-4 col-lg-20-percent">
                        <div class="card shadow-sm kpi-card" onclick="filterData('LOADED')" id="card-loaded">
                            <div class="card-body p-3">
                                <div class="d-flex justify-content-between align-items-center">
                                    <div><div class="text-uppercase text-muted small fw-bold mb-1">Loaded / Shipped</div><h2 class="text-success fw-bold mb-0" id="kpi-loaded">0</h2></div>
                                    <div class="bg-success bg-opacity-10 text-success p-3 rounded-circle"><i class="fas fa-ship fa-lg"></i></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="card border-0 shadow-sm mb-3">
                    <div class="card-body p-2">
                        <div class="d-flex flex-wrap align-items-center justify-content-between gap-2">

                            <div class="d-flex align-items-center gap-2 flex-grow-1">
                                
                                <div class="input-group input-group-sm" style="max-width: 280px;">
                                    <span class="input-group-text bg-white border-end-0 text-muted"><i class="fas fa-search"></i></span>
                                    <input type="text" id="universalSearch" class="form-control border-start-0 ps-0" placeholder="Search PO, SKU...">
                                </div>

                                <div class="vr mx-1 text-muted opacity-25"></div>

                                <div class="input-group input-group-sm" style="width: 150px;" title="Exchange Rate">
                                    <span class="input-group-text bg-light border-end-0 text-muted small">1$ =</span>
                                    <input type="number" id="exchangeRate" class="form-control border-start-0 border-end-0 text-end fw-bold text-primary px-1" value="32" step="0.01">
                                    <button class="btn btn-outline-secondary border-start-0" type="button" onclick="fetchExchangeRate()">
                                        <i class="fas fa-sync-alt small"></i>
                                    </button>
                                </div>
                            </div>

                            <div class="d-flex align-items-center gap-2">
    
                                <div class="d-none d-xl-flex align-items-center bg-light  px-3 py-1 me-2 border">
                                    <span class="badge bg-dark " id="sum-containers">0</span>
                                    <span class="small text-muted fw-bold ms-1 me-2">Orders</span>
                                    
                                    <span class="badge bg-info text-dark " id="sum-qty">0</span>
                                    <span class="small text-muted fw-bold ms-1 me-2">Pcs</span>

                                    <span class="vr mx-2"></span>
                                    <span class="fw-bold text-success font-monospace" id="sum-amount">฿0.00</span>
                                </div>

                                <div class="btn-group">
                                    <button class="btn btn-light border text-secondary" onclick="document.getElementById('fileInput').click()" data-bs-toggle="tooltip" title="Import Excel">
                                        <i class="fas fa-file-import"></i>
                                    </button>
                                    <button class="btn btn-light border text-secondary" onclick="exportData()" data-bs-toggle="tooltip" title="Export Excel">
                                        <i class="fas fa-file-excel"></i>
                                    </button>
                                </div>

                                <button class="btn btn-primary btn-sm fw-bold px-3  shadow-sm" onclick="openCreateModal()">
                                    <i class="fas fa-plus me-1"></i> New Order
                                </button>
                                
                                <input type="file" id="fileInput" hidden accept=".csv, .xlsx, .xls">
                            </div>

                        </div>
                    </div>
                </div>
            </div>

            <div class="content-wrapper p-3">

                <div class="card shadow-sm border-0">
                    <div class="table-responsive-custom">
                        <table class="table table-bordered table-hover align-middle mb-0 text-nowrap">
                            <thead class="bg-light text-secondary sticky-top">
                                <tr class="text-center">
                                    <th class="sticky-col shadow-sm sortable" data-sort="po_number" style="min-width: 120px;">PO Number <i class="sort-icon fas fa-sort"></i></th>
                                    <th class="ps-3 bg-white border-start sortable" data-sort="is_confirmed" style="width: 50px; position: sticky; right: 0; z-index: 15;">Conf. <i class="sort-icon fas fa-sort"></i></th>
                                    <th class="sortable" data-sort="order_date">Order Date <i class="sort-icon fas fa-sort"></i></th>
                                    <th class="sortable" data-sort="sku">SKU <i class="sort-icon fas fa-sort"></i></th>
                                    <th class="sortable" data-sort="description">Description <i class="sort-icon fas fa-sort"></i></th>
                                    <th class="sortable" data-sort="color">Color <i class="sort-icon fas fa-sort"></i></th>
                                    <th class="text-center sortable" data-sort="quantity">Qty <i class="sort-icon fas fa-sort"></i></th>
                                    
                                    <th class="sortable" data-sort="dc_location">DC <i class="sort-icon fas fa-sort"></i></th>
                                    <th class="sortable" data-sort="loading_week">Load Wk <i class="sort-icon fas fa-sort"></i></th>
                                    <th class="sortable" data-sort="shipping_week">Ship Wk <i class="sort-icon fas fa-sort"></i></th>
                                    
                                    <th class="text-center bg-warning bg-opacity-10 border-start border-warning sortable" data-sort="production_date">Prod Date <i class="sort-icon fas fa-sort"></i></th>
                                    <th class="text-center bg-warning bg-opacity-10 sortable" data-sort="is_production_done" style="width: 60px;">Done? <i class="sort-icon fas fa-sort"></i></th>
                                    
                                    <th class="text-center bg-info bg-opacity-10 border-start border-info sortable" data-sort="loading_date">Load Date <i class="sort-icon fas fa-sort"></i></th>
                                    <th class="text-center bg-info bg-opacity-10 sortable" data-sort="is_loading_done" style="width: 60px;">Loaded? <i class="sort-icon fas fa-sort"></i></th>
                                    
                                    <th class="text-center bg-purple bg-opacity-10 border-start border-purple sortable" data-sort="inspection_date">Insp Date <i class="sort-icon fas fa-sort"></i></th>
                                    <th class="text-center bg-purple bg-opacity-10 sortable" data-sort="inspection_status" style="width: 60px;">Pass? <i class="sort-icon fas fa-sort"></i></th>
                                    
                                    <th class="text-end sortable" data-sort="price">Price (THB) <i class="sort-icon fas fa-sort"></i></th>
                                    <th class="sortable" data-sort="ticket_number">Ticket <i class="sort-icon fas fa-sort"></i></th>
                                    <th class="sortable" data-sort="remark">Remark <i class="sort-icon fas fa-sort"></i></th>
                                </tr>
                            </thead>
                            <tbody id="tableBody"></tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    </div>

    <div class="modal fade" id="importResultModal" tabindex="-1">
         <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content border-0 shadow">
                <div class="modal-header bg-light">
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
                        <textarea id="importErrorLog" class="form-control form-control-sm font-monospace bg-light text-danger border-0" rows="5" readonly style="font-size: 0.8rem;"></textarea>
                    </div>
                    <div id="importAllSuccess" class="text-center text-success py-2 d-none">
                        <i class="fas fa-check-circle fa-2x mb-2"></i><br>นำเข้าข้อมูลครบถ้วนสมบูรณ์
                    </div>
                </div>
                <div class="modal-footer bg-light border-0">
                    <button type="button" class="btn btn-primary w-100" data-bs-dismiss="modal">ตกลง (OK)</button>
                </div>
            </div>
        </div>
    </div>

    <?php
        include('components/createOrderModal.php');
        include 'components/helpModal.php';
    ?>

    <script src="https://cdn.sheetjs.com/xlsx-latest/package/dist/xlsx.full.min.js"></script>
    <script src="script/salesDashboard.js?v=<?php echo time(); ?>"></script>
    
</body>
</html>