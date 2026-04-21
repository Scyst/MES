<?php 
// MES/page/production/productionUI.php
require_once __DIR__ . '/../components/init.php';

if (!hasPermission('view_production') && !hasPermission('manage_production')) {
    header("Location: ../dailyLog/dailyLogUI.php");
    exit;
}

$canManage = hasPermission('manage_production');
$canAdd = hasPermission('add_production') || hasPermission('manage_production');
$currentUserForJS = $_SESSION['user'] ?? null;

$pageTitle = "Shop Floor & Inventory | MES TOOLBOX";
$pageIcon = "fas fa-industry";
$pageHeaderTitle = "Shop Floor & Inventory";
$pageHeaderSubtitle = "ระบบจัดการหน้าไลน์ผลิตและคลังสินค้า";
?>

<!DOCTYPE html>
<html lang="th">
<head>
    <title><?php echo $pageTitle; ?></title>
    <?php include_once '../components/common_head.php'; ?>
    <style>
        /* 🌟 Custom Scrollbar & Table Settings (Enterprise Theme) */
        .table-scrollable {
            overflow-x: auto;
            max-height: calc(100vh - 280px);
        }
        .table-scrollable::-webkit-scrollbar { height: 8px; width: 8px; }
        .table-scrollable::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 4px; }
        .table-scrollable::-webkit-scrollbar-thumb { background: #c1c1c1; border-radius: 4px; }
        .table-scrollable::-webkit-scrollbar-thumb:hover { background: #a8a8a8; }

        .sticky-col-left {
            position: sticky; left: 0; background-color: #fff; z-index: 1;
            border-right: 2px solid var(--bs-border-color) !important;
        }
        thead .sticky-col-left { z-index: 3; background-color: var(--bs-light); }

        .table-settings th { font-size: 0.75rem; letter-spacing: 0.5px; vertical-align: middle; text-transform: uppercase; }
        .table-settings td { font-size: 0.8rem; vertical-align: middle; }
        
        /* 🚀 1. ปรับแต่ง Nav Pills ให้เลื่อนซ้าย-ขวาได้บนมือถือ */
        .nav-pills.custom-pills {
            flex-wrap: nowrap; /* ห้ามตกบรรทัด */
            overflow-x: auto; /* เลื่อนซ้ายขวาได้ */
            overflow-y: hidden;
            -webkit-overflow-scrolling: touch; /* ปัดลื่นๆ บนมือถือ */
            border-bottom: 1px solid var(--bs-border-color);
            padding-bottom: 0.5rem;
            -ms-overflow-style: none; /* ซ่อน scrollbar IE/Edge */
            scrollbar-width: none; /* ซ่อน scrollbar Firefox */
        }
        .nav-pills.custom-pills::-webkit-scrollbar {
            display: none; /* ซ่อน scrollbar Chrome/Safari */
        }
        .nav-pills.custom-pills .nav-item {
            flex: 0 0 auto; /* ป้องกันแท็บหดตัว */
        }
        .nav-pills.custom-pills .nav-link {
            color: #6c757d; font-weight: 600; font-size: 0.85rem; border-radius: 50rem; padding: 0.4rem 1rem; margin-right: 0.5rem;
            white-space: nowrap; /* ห้ามข้อความในแท็บตกบรรทัด */
        }
        .nav-pills.custom-pills .nav-link.active {
            background-color: rgba(13, 110, 253, 0.1); color: #0d6efd; border: 1px solid #0d6efd;
        }

        /* 🚀 ซ่อน Scrollbar แนวนอนของปุ่ม Toolbar บนมือถือ */
        .custom-scrollbar-hide {
            -ms-overflow-style: none; /* IE/Edge */
            scrollbar-width: none; /* Firefox */
        }
        .custom-scrollbar-hide::-webkit-scrollbar {
            display: none; /* Chrome/Safari */
        }

        /* FAB Button (Mobile Only) */
        @media (max-width: 991.98px) {
            .fab-container { position: fixed; bottom: 80px; right: 25px; z-index: 1060; }
            .fab-btn {
                width: 60px; height: 60px; font-size: 1.5rem; border: none; border-radius: 50%;
                box-shadow: 0 4px 10px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;
                color: white; cursor: pointer; transition: transform 0.2s;
            }
            .fab-btn:active { transform: scale(0.95); }
        }

        /* 🚀 ซ่อนข้อความปุ่มใน Toolbar บนมือถือ และขยายให้เต็มพื้นที่ (รองรับปุ่ม Dropdown) */
        @media (max-width: 767.98px) {
            #dynamic-button-group {
                width: 100%;
            }
            
            /* 🚀 บังคับให้ปุ่มธรรมดา หรือ กล่อง Dropdown ขยายตัวแบ่งพื้นที่เท่าๆ กัน */
            #dynamic-button-group > .btn,
            #dynamic-button-group > .dropdown {
                flex: 1;
                display: flex;
            }
            
            #dynamic-button-group .btn {
                width: 100%; /* ให้ปุ่มกางเต็มกล่องครอบ */
                font-size: 0 !important; 
                padding: 0.45rem 0 !important; 
                min-width: 36px; 
                text-align: center;
                justify-content: center;
                display: flex;
                align-items: center;
            }
            
            #dynamic-button-group .btn i,
            #dynamic-button-group .btn svg {
                font-size: 1.1rem !important; 
                margin: 0 !important; 
            }

            /* ซ่อนลูกศร Dropdown (Caret) เพราะเราโชว์แค่ไอคอนแล้ว */
            #dynamic-button-group .dropdown-toggle::after {
                display: none !important;
            }

            /* 🚀 ป้องกัน Dropdown Menu โดนบัง */
            #dynamic-button-group .dropdown-menu {
                z-index: 1060 !important;
                position: absolute !important;
            }
        }

        @media (min-width: 992px) { .fab-container { display: none !important; } }
    </style>
</head>

<body class="layout-top-header bg-body-tertiary">
    <?php include_once('../components/php/top_header.php'); ?>

    <div class="page-container">
        <main id="main-content" class="px-3 pt-3">
            <?php include_once('../components/php/spinner.php'); ?>
            
            <div class="bg-white border rounded-3 shadow-sm p-3 mb-3">
                
                <ul class="nav nav-pills custom-pills mb-3" id="mainTab" role="tablist">
                    <li class="nav-item" role="presentation">
                        <button class="nav-link active" id="production-history-tab" data-bs-toggle="tab" data-bs-target="#production-history-pane" type="button" role="tab"><i class="fas fa-industry me-1"></i> Production (OUT)</button>
                    </li>
                    <li class="nav-item" role="presentation">
                        <button class="nav-link" id="entry-history-tab" data-bs-toggle="tab" data-bs-target="#entry-history-pane" type="button" role="tab"><i class="fas fa-box-open me-1"></i> Receipts (IN)</button>
                    </li>
                    <li class="nav-item" role="presentation">
                        <button class="nav-link" id="wip-onhand-tab" data-bs-toggle="tab" data-bs-target="#wip-onhand-pane" type="button" role="tab"><i class="fas fa-pallet me-1"></i> WIP On-Hand</button>
                    </li>
                    <li class="nav-item" role="presentation">
                        <button class="nav-link" id="wip-by-lot-tab" data-bs-toggle="tab" data-bs-target="#wip-by-lot-pane" type="button" role="tab"><i class="fas fa-layer-group me-1"></i> WIP by Lot</button>
                    </li>
                    <li class="nav-item" role="presentation">
                        <button class="nav-link" id="production-variance-tab" data-bs-toggle="tab" data-bs-target="#production-variance-pane" type="button" role="tab"><i class="fas fa-balance-scale me-1"></i> Variance</button>
                    </li>
                    <li class="nav-item" role="presentation">
                        <button class="nav-link" id="stock-count-tab" data-bs-toggle="tab" data-bs-target="#stock-count-pane" type="button" role="tab"><i class="fas fa-boxes me-1"></i> All Stock</button>
                    </li>
                    <li class="nav-item" role="presentation">
                        <button class="nav-link" id="transaction-log-tab" data-bs-toggle="tab" data-bs-target="#transaction-log-pane" type="button" role="tab"><i class="fas fa-history me-1"></i> All Txn Log</button>
                    </li>
                </ul>

                <div class="row g-2 align-items-center mb-3">
                    
                    <div class="col-12 col-md-6 col-lg-5 d-flex gap-2">
                        <div class="input-group input-group-sm shadow-sm flex-grow-1">
                            <span class="input-group-text bg-white"><i class="fas fa-search text-muted"></i></span>
                            <input type="text" class="form-control border-start-0" id="filterSearch" placeholder="Search SAP, Part No..." autocomplete="off">
                        </div>
                        
                        <button class="btn btn-sm btn-outline-primary shadow-sm text-nowrap" type="button" data-bs-toggle="collapse" data-bs-target="#advancedFilters" aria-expanded="false">
                            <i class="fas fa-filter"></i> <span class="d-none d-sm-inline">ตัวกรอง</span>
                        </button>
                    </div>

                    <div class="col-12 col-md-6 col-lg-7 d-flex justify-content-start justify-content-md-end gap-2" id="dynamic-button-group">
                        </div>
                </div>

                <div class="collapse mb-3" id="advancedFilters">
                    <div class="card card-body bg-light border-0 p-3 shadow-sm">
                        <div class="row g-2 align-items-start">
                            <div class="col-12 col-md-auto">
                                <label class="form-label small text-muted mb-1">ประเภทรายการ</label>
                                <select class="form-select form-select-sm shadow-sm fw-bold text-primary border-primary" id="filterCountType">
                                    <option value="">All Types</option>
                                    <option value="FG">FG (ดี)</option>
                                    <option value="HOLD">HOLD (รอตรวจสอบ)</option>
                                    <option value="SCRAP">SCRAP (ของเสีย)</option>
                                </select>
                            </div>
                            
                            <div class="col-12 col-md-auto" id="date-range-filter">
                                <label class="form-label small text-muted mb-1">ช่วงวันที่</label>
                                <div class="input-group input-group-sm shadow-sm">
                                    <span class="input-group-text bg-white"><i class="fas fa-calendar-alt text-muted"></i></span>
                                    <input type="date" class="form-control fw-bold" id="filterStartDate">
                                    <span class="input-group-text bg-light text-muted">to</span>
                                    <input type="date" class="form-control fw-bold" id="filterEndDate">
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div id="dynamic-summary-container" class="mb-3"></div>

                <div class="tab-content" id="mainTabContent">
                    
                    <div class="tab-pane fade show active" id="production-history-pane" role="tabpanel">
                        <div class="table-scrollable border rounded-3">
                            <table class="table table-sm table-hover table-bordered mb-0 text-nowrap table-settings">
                                <thead class="table-light text-center sticky-top" style="z-index: 2;">
                                    <tr class="text-secondary bg-light">
                                        <th class="py-2">Date</th>
                                        <th class="py-2">Time</th>
                                        <th class="py-2">SAP No.</th>
                                        <th class="py-2">Part No.</th>
                                        <th class="py-2">Model</th>
                                        <th class="py-2">Lot / Ref.</th>
                                        <th class="py-2">Location</th>
                                        <th class="py-2 text-end px-3">Quantity</th>
                                        <th class="py-2">Type</th>
                                        <th class="py-2">Notes</th>
                                    </tr>
                                </thead>
                                <tbody id="partTableBody"></tbody>
                            </table>
                        </div>
                        <ul class="pagination pagination-sm justify-content-end mt-3 mb-0" id="paginationControls"></ul>
                    </div>

                    <div class="tab-pane fade" id="entry-history-pane" role="tabpanel">
                        <div class="table-scrollable border rounded-3">
                            <table class="table table-sm table-hover table-bordered mb-0 text-nowrap table-settings">
                                <thead class="table-light text-center sticky-top" style="z-index: 2;">
                                    <tr class="text-secondary bg-light">
                                        <th class="py-2">Date</th>
                                        <th class="py-2">Time</th>
                                        <th class="py-2">From (Source)</th>
                                        <th class="py-2">To (Dest)</th>
                                        <th class="py-2">SAP No.</th>
                                        <th class="py-2">Part No.</th>
                                        <th class="py-2">Lot / Ref.</th>
                                        <th class="py-2 text-end px-3">Quantity</th>
                                        <th class="py-2">Notes</th>
                                    </tr>
                                </thead>
                                <tbody id="entryHistoryTableBody"></tbody>
                            </table>
                        </div>
                        <ul class="pagination pagination-sm justify-content-end mt-3 mb-0" id="entryHistoryPagination"></ul>
                    </div>

                    <div class="tab-pane fade" id="wip-onhand-pane" role="tabpanel">
                        <div class="table-scrollable border rounded-3">
                            <table class="table table-sm table-hover table-bordered mb-0 text-nowrap table-settings">
                                <thead class="table-light text-center sticky-top" style="z-index: 2;">
                                    <tr class="text-secondary bg-light">
                                        <th class="py-2">Location</th>
                                        <th class="py-2">SAP No.</th>
                                        <th class="py-2">Part No.</th>
                                        <th class="py-2">Model</th>
                                        <th class="py-2">Part Description</th>
                                        <th class="py-2 text-end px-3 bg-info bg-opacity-10 text-dark">On-Hand Quantity (WIP)</th>
                                    </tr>
                                </thead>
                                <tbody id="wipOnHandTableBody"></tbody>
                            </table>
                        </div>
                        <ul class="pagination pagination-sm justify-content-end mt-3 mb-0" id="wipOnHandPagination"></ul>
                    </div>

                    <div class="tab-pane fade" id="wip-by-lot-pane" role="tabpanel">
                        <div class="table-scrollable border rounded-3">
                            <table class="table table-sm table-hover table-bordered mb-0 text-nowrap table-settings">
                                <thead class="table-light text-center sticky-top" style="z-index: 2;">
                                    <tr class="text-secondary bg-light">
                                        <th class="py-2">SAP No.</th>
                                        <th class="py-2">Part No.</th>
                                        <th class="py-2">Model</th>
                                        <th class="py-2">Part Description</th>
                                        <th class="py-2">Lot Number</th>
                                        <th class="py-2 text-end px-3 bg-success bg-opacity-10 text-success">Total IN</th>
                                        <th class="py-2 text-end px-3 bg-danger bg-opacity-10 text-danger">Total OUT</th>
                                        <th class="py-2 text-end px-3 bg-warning bg-opacity-10 text-dark">Variance (On-Hand)</th>
                                    </tr>
                                </thead>
                                <tbody id="wipByLotTableBody"></tbody>
                            </table>
                        </div>
                        <ul class="pagination pagination-sm justify-content-end mt-3 mb-0" id="wipByLotPagination"></ul>
                    </div>

                    <div class="tab-pane fade" id="production-variance-pane" role="tabpanel">
                        <div class="table-scrollable border rounded-3">
                            <table class="table table-sm table-hover table-bordered mb-0 text-nowrap table-settings">
                                <thead class="table-light text-center sticky-top" style="z-index: 2;">
                                    <tr class="text-secondary bg-light">
                                        <th class="py-2">Location</th>
                                        <th class="py-2">SAP No.</th>
                                        <th class="py-2">Part No.</th>
                                        <th class="py-2">Model</th>
                                        <th class="py-2">Part Description</th>
                                        <th class="py-2 text-end px-3 bg-success bg-opacity-10 text-success">Total IN</th>
                                        <th class="py-2 text-end px-3 bg-danger bg-opacity-10 text-danger">Total OUT</th>
                                        <th class="py-2 text-end px-3 bg-warning bg-opacity-10 text-dark">Variance</th>
                                    </tr>
                                </thead>
                                <tbody id="productionVarianceTableBody"></tbody>
                            </table>
                        </div>
                        <ul class="pagination pagination-sm justify-content-end mt-3 mb-0" id="productionVariancePagination"></ul>
                    </div>

                    <div class="tab-pane fade" id="stock-count-pane" role="tabpanel">
                        <div class="table-scrollable border rounded-3">
                            <table class="table table-sm table-hover table-bordered mb-0 text-nowrap table-settings">
                                <thead class="table-light text-center sticky-top" style="z-index: 2;">
                                    <tr class="text-secondary bg-light">
                                        <th class="py-2">SAP No.</th>
                                        <th class="py-2">Part No.</th>
                                        <th class="py-2">Models</th>
                                        <th class="py-2">Description</th>
                                        <th class="py-2 text-end px-3 bg-primary bg-opacity-10 text-dark">Total On-Hand (All Loc)</th>
                                    </tr>
                                </thead>
                                <tbody id="stockCountTableBody"></tbody>
                            </table>
                        </div>
                        <ul class="pagination pagination-sm justify-content-end mt-3 mb-0" id="stockCountPagination"></ul>
                    </div>

                    <div class="tab-pane fade" id="transaction-log-pane" role="tabpanel">
                        <div class="table-scrollable border rounded-3">
                            <table class="table table-sm table-hover table-bordered mb-0 text-nowrap table-settings">
                                <thead class="table-light text-center sticky-top" style="z-index: 2;">
                                    <tr class="text-secondary bg-light">
                                        <th class="py-2">Date & Time</th>
                                        <th class="py-2">From</th>
                                        <th class="py-2">To</th>
                                        <th class="py-2">Part No.</th>
                                        <th class="py-2">Model</th>
                                        <th class="py-2">Lot / Ref.</th>
                                        <th class="py-2 text-end px-3">Change (Qty)</th>
                                        <th class="py-2">Type</th>
                                        <th class="py-2">User</th>
                                        <th class="py-2">Notes</th>
                                    </tr>
                                </thead>
                                <tbody id="transactionLogTableBody"></tbody>
                            </table>
                        </div>
                        <ul class="pagination pagination-sm justify-content-end mt-3 mb-0" id="transactionLogPagination"></ul>
                    </div>

                </div> </div>

            <div class="fab-container" id="mobileFabContainer" style="display: none;">
                <button class="bg-success fab-btn" id="mobileFabBtn" aria-label="Add New Entry">
                    <i class="fas fa-plus"></i>
                </button>
            </div>

            <?php include('components/allProductionModals.php'); ?>
        </main>    
    </div>

    <script>
        const canManage = <?php echo json_encode($canManage); ?>;
        const canAdd = <?php echo json_encode($canAdd); ?>;
        const currentUser = <?php echo json_encode($currentUserForJS); ?>;
    </script>
    <script src="../components/js/pagination.js?v=<?php echo filemtime('../components/js/pagination.js'); ?>"></script>
    <script src="../../utils/libs/xlsx.full.min.js"></script>
    <script src="script/inventory.js?v=<?php echo filemtime('script/inventory.js'); ?>"></script>
    <script src="script/export_data.js?v=<?php echo filemtime('script/export_data.js'); ?>"></script>
</body>
</html>