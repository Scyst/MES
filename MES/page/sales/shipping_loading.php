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

    <div id="loadingOverlay" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 9999; flex-direction: column; align-items: center; justify-content: center;">
        <div class="spinner-border text-light mb-3" role="status"></div>
        <h5 class="text-white">Updating...</h5>
    </div>

    <?php include('../components/php/top_header.php'); ?>
    <?php include('../components/php/mobile_menu.php'); ?>
    <?php include('../components/php/docking_sidebar.php'); ?>

    <div class="page-container">
        <div id="main-content">
            <div class="content-wrapper pt-3">
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
                                    <th>Week</th><th>Status</th><th>Inspect Type</th><th>Inspect Res</th><th>SNC Load Day</th><th style="background-color: rgb(255 249 230)">ETD</th><th>DC</th><th>SKU</th><th>Booking No.</th><th>Invoice</th><th>Description</th><th>Q'ty (Pcs)</th><th>CTN Size</th><th>Container No.</th><th>Seal No.</th><th>Tare</th><th>N.W.</th><th>G.W.</th><th>CBM</th><th>Feeder Vsl</th><th>Mother Vsl</th><th>SNC CI No.</th><th>SI/VGM Cut</th><th>Pickup Date</th><th>Return Date</th><th>Remark</th>
                                    <th class="sticky-col-right-2 text-danger">Cutoff Date</th>
                                    <th class="sticky-col-right-1 text-danger">Cutoff Time</th>
                                </tr>
                            </thead>
                            <tbody id="tableBody" class="bg-white"></tbody>
                        </table>
                    </div>
                </div>
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