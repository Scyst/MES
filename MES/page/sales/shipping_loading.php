<?php
// page/sales/shipping_loading.php
require_once __DIR__ . '/../components/init.php';

$pageTitle = "Shipping Schedule Control";
$pageIcon = "fas fa-truck-loading"; 
$pageHeaderTitle = "Shipping Schedule";
$pageHeaderSubtitle = "ตารางแผนการโหลดตู้และสถานะขนส่ง";

$isCustomer = (isset($_SESSION['user']['role']) && $_SESSION['user']['role'] === 'CUSTOMER');
?>
<!DOCTYPE html>
<html lang="th">
<head>
    <title><?php echo $pageTitle; ?></title>
    <?php include_once '../components/common_head.php'; ?> 
    <link rel="stylesheet" href="css/salesDashboard.css?v=<?php echo time(); ?>">
    
    <style>
        /* สไตล์ CSS ของคุณ (คงเดิม) */
        .table-responsive-custom { height: calc(100vh - 200px); overflow: auto; position: relative; }
        .editable-input { border: 1px solid transparent; width: 100%; background: transparent; text-align: center; font-size: 0.85rem; padding: 2px; border-radius: 4px; }
        .editable-input:not([readonly]):hover { border: 1px solid #ced4da; background: #fff; }
        .editable-input:not([readonly]):focus { border: 1px solid #86b7fe; background: #fff; outline: none; box-shadow: 0 0 0 2px rgba(13,110,253,.25); }
        .status-badge { font-size: 0.7rem; width: 100%; padding: 4px; border-radius: 12px; border:none; font-weight: bold; text-transform: uppercase; cursor: pointer; }
        .bg-pending { background-color: #eee; color: #555; border: 1px solid #ccc; }
        .bg-success-custom { background-color: #198754; color: #fff; }
        th.sticky-col-left-1, td.sticky-col-left-1 { left: 0; z-index: 10; position: sticky; background-color: inherit; }
        th.sticky-col-left-2, td.sticky-col-left-2 { left: 60px; z-index: 10; position: sticky; background-color: inherit; }
        th.sticky-col-left-3, td.sticky-col-left-3 { left: 120px; z-index: 10; position: sticky; background-color: inherit; border-right: 2px solid #dee2e6; }
        th.sticky-col-right-2, td.sticky-col-right-2 { right: 80px; z-index: 10; position: sticky; background-color: inherit; border-left: 2px solid #dee2e6; }
        th.sticky-col-right-1, td.sticky-col-right-1 { right: 0; z-index: 10; position: sticky; background-color: inherit; }
        thead th { position: sticky; top: 0; z-index: 20; background-color: #f8f9fa; }
        thead th.sticky-col-left-1, thead th.sticky-col-left-2, thead th.sticky-col-left-3,
        thead th.sticky-col-right-1, thead th.sticky-col-right-2 { z-index: 30; }
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
                        <div class="card shadow-sm kpi-card active" onclick="filterByStatus('ACTIVE')" id="card-active" style="cursor:pointer;">
                            <div class="card-body p-3">
                                <div class="d-flex justify-content-between align-items-center">
                                    <div>
                                        <div class="text-uppercase text-body-secondary small fw-bold mb-1">Active (Wait Load)</div>
                                        <h2 class="text-primary fw-bold mb-0" id="kpi-active">0</h2>
                                    </div>
                                    <div class="bg-primary bg-opacity-10 text-primary p-3 rounded-circle">
                                        <i class="fas fa-clipboard-list fa-lg"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="col-6 col-md-4 col-lg-20-percent">
                        <div class="card shadow-sm kpi-card" onclick="filterByStatus('WAIT_PROD')" id="card-wait-prod" style="cursor:pointer;">
                            <div class="card-body p-3">
                                <div class="d-flex justify-content-between align-items-center">
                                    <div>
                                        <div class="text-uppercase text-body-secondary small fw-bold mb-1">Wait Production</div>
                                        <h2 class="text-warning fw-bold mb-0" id="kpi-wait-prod">0</h2>
                                    </div>
                                    <div class="bg-warning bg-opacity-10 text-warning p-3 rounded-circle">
                                        <i class="fas fa-industry fa-lg"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="col-6 col-md-4 col-lg-20-percent">
                        <div class="card shadow-sm kpi-card" onclick="filterByStatus('PROD_DONE')" id="card-prod-done" style="cursor:pointer;">
                            <div class="card-body p-3">
                                <div class="d-flex justify-content-between align-items-center">
                                    <div>
                                        <div class="text-uppercase text-body-secondary small fw-bold mb-1">Production Done</div>
                                        <h2 class="fw-bold mb-0" style="color: #6610f2;" id="kpi-prod-done">0</h2>
                                    </div>
                                    <div class="p-3 rounded-circle" style="background-color: rgba(102, 16, 242, 0.1); color: #6610f2;">
                                        <i class="fas fa-check-circle fa-lg"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="col-6 col-md-4 col-lg-20-percent">
                        <div class="card shadow-sm kpi-card" onclick="filterByStatus('LOAD_DONE')" id="card-load-done" style="cursor:pointer;">
                            <div class="card-body p-3">
                                <div class="d-flex justify-content-between align-items-center">
                                    <div>
                                        <div class="text-uppercase text-body-secondary small fw-bold mb-1">Loading Done</div>
                                        <h2 class="text-success fw-bold mb-0" id="kpi-load-done">0</h2>
                                    </div>
                                    <div class="bg-success bg-opacity-10 text-success p-3 rounded-circle">
                                        <i class="fas fa-truck-loading fa-lg"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="col-6 col-md-4 col-lg-20-percent">
                        <div class="card shadow-sm kpi-card" onclick="filterByStatus('ALL')" id="card-all" style="cursor:pointer;">
                            <div class="card-body p-3">
                                <div class="d-flex justify-content-between align-items-center">
                                    <div>
                                        <div class="text-uppercase text-body-secondary small fw-bold mb-1">All Orders</div>
                                        <h2 class="text-secondary fw-bold mb-0" id="kpi-total-all">0</h2>
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
                                <div class="input-group input-group-sm" style="max-width: 400px;">
                                    <span class="input-group-text bg-body border-secondary-subtle text-secondary"><i class="fas fa-search"></i></span>
                                    <input type="text" id="universalSearch" class="form-control border-secondary-subtle ps-2" placeholder="Search PO, SKU, Container...">
                                </div>
                                <button class="btn btn-outline-secondary btn-sm" onclick="loadData()"><i class="fas fa-sync-alt"></i></button>
                            </div>
                            <div class="d-flex align-items-center gap-2">
                                <?php if (!$isCustomer): ?>
                                <input type="file" id="csv_file" style="display:none;" onchange="uploadFile()">
                                <button class="btn btn-light btn-sm shadow-sm" onclick="document.getElementById('csv_file').click()">Import</button>
                                <?php endif; ?>
                                <button class="btn btn-success btn-sm shadow-sm" onclick="exportToCSV()">Export</button>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="card shadow-sm border-0 table-card h-100">
                    <div class="table-responsive-custom">
                        <table class="table table-bordered table-hover mb-0 text-nowrap align-middle">
                            <thead class="bg-light sticky-top">
                                <tr class="text-center">
                                    <th class="sticky-col-left-1">Load</th>
                                    <th class="sticky-col-left-2">Prod</th>
                                    <th class="sticky-col-left-3">PO Number</th>
                                    <th>Week</th>
                                    <th>Status</th>
                                    <th>Inspect Type</th>
                                    <th>Inspect Res</th>
                                    <th>SNC Load Day</th>
                                    <th>DC</th>
                                    <th>SKU</th>
                                    <th>Booking No.</th>
                                    <th>Invoice</th>
                                    <th>Description</th>
                                    <th>Q'ty (Pcs)</th>
                                    <th>CTN Size</th>
                                    <th>Container No.</th>
                                    <th>Seal No.</th>
                                    <th>Tare</th>
                                    <th>N.W.</th>
                                    <th>G.W.</th>
                                    <th>CBM</th>
                                    <th>Feeder Vsl</th>
                                    <th>Mother Vsl</th>
                                    <th>SNC CI No.</th>
                                    <th>SI/VGM Cut</th>
                                    <th>Pickup Date</th>
                                    <th>Return Date</th>
                                    <th style="background-color: rgb(255 249 230)">ETD</th>
                                    <th>Remark</th>
                                    <th class="sticky-col-right-2 text-danger">Cutoff Date</th>
                                    <th class="sticky-col-right-1 text-danger">Cutoff Time</th>
                                </tr>
                            </thead>
                            <tbody id="tableBody" class="bg-white"></tbody>
                        </table>
                    </div>
                    <div id="paginationContainer" class="py-2 px-3 border-top bg-light"></div>
                </div>
            </div>
        </div>
    </div>

    <div class="modal fade" id="importResultModal" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content shadow border-0">
                <div class="modal-header bg-light">
                    <h5 class="modal-title fw-bold">สรุปการนำเข้าข้อมูล</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body text-center">
                    <div class="mb-3">
                        <h1 class="display-4 fw-bold text-primary" id="importSuccessCount">0</h1>
                        <p class="text-muted">รายการอัปเดตสำเร็จ</p>
                    </div>
                    <div id="importErrorSection" class="text-start d-none">
                        <div class="alert alert-warning py-2">พบปัญหา <span id="importSkipCount">0</span> รายการ:</div>
                        <textarea id="importErrorLog" class="form-control text-danger bg-light" rows="5" readonly style="font-size:0.8rem"></textarea>
                    </div>
                    <div id="importAllSuccess" class="text-success d-none">
                        <i class="fas fa-check-circle fa-3x mb-2"></i><br>นำเข้าสำเร็จครบถ้วน
                    </div>
                </div>
                <div class="modal-footer"><button class="btn btn-primary w-100" data-bs-dismiss="modal">ตกลง</button></div>
            </div>
        </div>
    </div>

    <script>
        const isCustomer = <?php echo json_encode($isCustomer); ?>;
    </script>
    
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="../../utils/libs/xlsx.full.min.js"></script>
    <script src="script/shipping_loading.js?v=<?php echo time(); ?>"></script>
</body>
</html>