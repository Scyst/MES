<?php 
    include_once("../../auth/check_auth.php"); 
    
    if (!hasRole(['operator', 'supervisor', 'admin', 'creator'])) {
        header("Location: ../OEE_Dashboard/OEE_Dashboard.php");
        exit;
    }

    $canManage = hasRole(['supervisor', 'admin', 'creator']);
    $canAdd = hasRole(['operator', 'supervisor', 'admin', 'creator']);
    $currentUserForJS = $_SESSION['user'] ?? null;
    
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <title>Production & inventory</title>
    <?php include_once '../components/common_head.php'; ?>
</head>

<body class="page-with-table">
    <div class="page-container">
        <?php include_once('../components/php/nav_dropdown.php'); ?>

        <main id="main-content">
            <?php include_once('../components/php/spinner.php'); ?>

            <div class="container-fluid pt-3">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h2 class="mb-0">Production & inventory</h2>
                </div>

                <ul class="nav nav-tabs" id="mainTab" role="tablist">
                    <li class="nav-item" role="presentation">
                        <button class="nav-link active" id="production-variance-tab" data-bs-toggle="tab" data-bs-target="#production-variance-pane" type="button" role="tab">ผลต่าง (Variance)</button>
                    </li>
                    <li class="nav-item" role="presentation">
                        <button class="nav-link" id="wip-by-lot-tab" data-bs-toggle="tab" data-bs-target="#wip-by-lot-pane" type="button" role="tab">ผลต่าง (ตามล็อต)</button>
                    </li>
                    <li class="nav-item" role="presentation">
                        <button class="nav-link" id="entry-history-tab" data-bs-toggle="tab" data-bs-target="#entry-history-pane" type="button" role="tab">ประวัติของเข้า (IN)</button>
                    </li>
                    <li class="nav-item" role="presentation">
                        <button class="nav-link" id="production-history-tab" data-bs-toggle="tab" data-bs-target="#production-history-pane" type="button" role="tab">ประวัติของออก (OUT)</button>
                    </li>
                    <li class="nav-item" role="presentation">
                        <button class="nav-link" id="wip-onhand-tab" data-bs-toggle="tab" data-bs-target="#wip-onhand-pane" type="button" role="tab">สต็อก (ในไลน์ผลิต)</button>
                    </li>
                    <li class="nav-item" role="presentation">
                        <button class="nav-link" id="stock-count-tab" data-bs-toggle="tab" data-bs-target="#stock-count-pane" type="button" role="tab">สต็อก (ทั้งหมด)</button>
                    </li>
                    <li class="nav-item" role="presentation">
                        <button class="nav-link" id="transaction-log-tab" data-bs-toggle="tab" data-bs-target="#transaction-log-pane" type="button" role="tab">Transaction Log</button>
                    </li>
                </ul>
            </div>
            
            <div class="sticky-bar">
                <div class="container-fluid">
                    <div class="row my-3 align-items-center">
                        <div class="col-md-6">
                            <div class="filter-controls-wrapper" id="main-filters">
                                
                                <input type="search" id="filterSearch" class="form-control" placeholder="Search...">

                                <select id="filterCountType" class="form-select" style="display: none;">
                                    <option value="">All Types</option>
                                    <option value="FG">FG</option>
                                    <option value="HOLD">HOLD</option>
                                    <option value="SCRAP">SCRAP</option>
                                </select>

                                <div id="date-range-filter" style="display: none; contents: inherit;">
                                    <input type="date" id="filterStartDate" class="form-control">
                                    <span>-</span>
                                    <input type="date" id="filterEndDate" class="form-control">
                                </div>
                            </div>
                            </div>
                        <div class="col-md-6">
                            <div id="dynamic-button-group" class="d-flex justify-content-end gap-2"></div>
                        </div>
                        <div class="col-12 mt-3" style="display: none;" id="summaryRow">
                            <div id="dynamic-summary-container" class="summary-grand-total"></div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="content-wrapper">
                <div class="tab-content" id="mainTabContent">
                    <div class="tab-pane fade show active" id="production-variance-pane" role="tabpanel">
                            <div class="table-responsive mt-2">
                            <table class="table table-striped">
                                <thead>
                                    <tr>
                                        <th class="text-start" style="width: 10%;">Location</th>
                                        <th class="text-start" style="width: 10%;">SAP No.</th>
                                        <th class="text-start" style="width: 10%;">Part Number</th>
                                        <th class="text-start" style="width: 10%;">Model</th>
                                        <th class="text-start" style="width: 25%;">Part Description</th>
                                        <th class="text-end" style="width: 10%;">Total IN</th>
                                        <th class="text-end" style="width: 10%;">Total OUT</th>
                                        <th class="text-end" style="width: 15%;">Variance (OUT - IN)</th>
                                    </tr>
                                </thead>
                                <tbody id="productionVarianceTableBody"></tbody>
                            </table>
                        </div>
                    </div>

                    <div class="tab-pane fade" id="wip-by-lot-pane" role="tabpanel">
                            <div class="table-responsive mt-2">
                            <table class="table table-striped">
                                <thead>
                                    <tr>
                                        <th class="text-start" style="width: 10%;">SAP No.</th>
                                        <th class="text-start" style="width: 10%;">Part Number</th>
                                        <th class="text-start" style="width: 10%;">Model</th>
                                        <th class="text-start" style="width: 25%;">Part Description</th>
                                        <th class="text-center" style="width: 10%;">Lot Number</th>
                                        <th class="text-end" style="width: 10%;">Total IN</th>
                                        <th class="text-end" style="width: 10%;">Total OUT</th>
                                        <th class="text-end" style="width: 15%;">Variance (OUT - IN)</th>
                                    </tr>
                                </thead>
                                <tbody id="wipByLotTableBody"></tbody>
                            </table>
                        </div>
                    </div>
                    
                    <div class="tab-pane fade" id="entry-history-pane" role="tabpanel">
                            <div class="table-responsive mt-2">
                            <table class="table table-hover table-striped">
                                <thead>
                                    <tr>
                                        <th class="text-start" style="width: 8%;">Date</th>
                                        <th class="text-start" style="width: 12%;">Time</th>
                                        <th class="text-center" style="width: 10%;">From</th>
                                        <th class="text-center" style="width: 10%;">To</th>
                                        <th class="text-center" style="width: 10%;">SAP No.</th>
                                        <th class="text-center" style="width: 10%;">Part No.</th>
                                        <th class="text-center" style="width: 10%;">Model</th>
                                        <th class="text-center" style="width: 10%;">Lot. / Ref.</th>
                                        <th class="text-center" style="width: 10%;">Quantity</th>
                                        <th class="text-center" style="width: 10%;">Notes</th>
                                    </tr>
                                </thead>
                                <tbody id="entryHistoryTableBody"></tbody>
                            </table>
                        </div>
                    </div>

                    <div class="tab-pane fade" id="production-history-pane" role="tabpanel">
                            <div class="table-responsive mt-2">
                            <table id="partTable" class="table table-striped table-hover">
                                <thead>
                                    <tr>
                                        <th class="text-start" style="width: 8%;">Date</th>
                                        <th class="text-start" style="width: 12%;">Time (Start-End)</th>
                                        <th class="text-center" style="width: 8%;">Duration (m)</th>
                                        <th class="text-center" style="width: 10%;">Location</th>
                                        <th class="text-center" style="width: 10%;">Part No.</th>
                                        <th class="text-center" style="width: 8%;">Model</th>
                                        <th class="text-center" style="width: 10%;">Lot / Ref.</th>
                                        <th class="text-center" style="width: 8%;">Quantity</th>
                                        <th class="text-center" style="width: 8%;">Type</th>
                                        <th class="text-center" style="width: 16%;">Notes</th>
                                    </tr>
                                </thead>
                                <tbody id="partTableBody"></tbody>
                            </table>
                        </div>
                    </div>

                    <div class="tab-pane fade" id="wip-onhand-pane" role="tabpanel">
                            <div class="table-responsive mt-2">
                            <table class="table table-striped">
                                <thead>
                                    <tr>
                                        <th class="text-start" style="width: 10%;">Location</th>
                                        <th class="text-start" style="width: 10%;">SAP No.</th>
                                        <th class="text-start" style="width: 10%;">Part Number</th>
                                        <th class="text-start" style="width: 10%;">Model</th>
                                        <th class="text-start" style="width: 45%;">Part Description</th>
                                        <th class="text-end" style="width: 15%;">On-Hand Quantity (WIP)</th>
                                    </tr>
                                </thead>
                                <tbody id="wipOnHandTableBody"></tbody>
                            </table>
                        </div>
                    </div>

                    <div class="tab-pane fade" id="stock-count-pane" role="tabpanel">
                            <div class="table-responsive mt-2">
                            <table class="table table-striped table-hover">
                                <thead>
                                    <tr>
                                        <th class="text-start" style="width: 10%;">SAP No.</th>
                                        <th class="text-start" style="width: 10%;">Part No.</th>
                                        <th class="text-start" style="width: 10%;">Models</th>
                                        <th class="text-start" style="width: 55%;">Part Description</th>
                                        <th class="text-end" style="width: 15%;">Total On-Hand</th>
                                    </tr>
                                </thead>
                                <tbody id="stockCountTableBody"></tbody>
                            </table>
                        </div>
                    </div>
                    
                    <div class="tab-pane fade" id="transaction-log-pane" role="tabpanel">
                            <div class="table-responsive mt-2">
                            <table class="table table-striped table-hover">
                                <thead>
                                    <tr>
                                        <th class="text-start" style="width: 12%;">Date & Time</th>
                                        <th class="text-start" style="width: 10%;">From</th>
                                        <th class="text-start" style="width: 10%;">To</th>
                                        <th class="text-start" style="width: 8%;">Part No.</th>
                                        <th class="text-start" style="width: 8%;">Model</th>
                                        <th class="text-center" style="width: 12%;">Lot / Ref.</th>
                                        <th class="text-center" style="width: 8%;">Change</th>
                                        <th class="text-center" style="width: 10%;">Type</th>
                                        <th class="text-center" style="width: 10%;">User</th>
                                        <th class="text-center" style="width: 12%;">Notes</th>
                                    </tr>
                                </thead>
                                <tbody id="transactionLogTableBody"></tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <nav class="sticky-bottom" data-tab-target="#production-variance-pane">
                <ul class="pagination justify-content-center" id="productionVariancePagination"></ul>
            </nav>
            <nav class="sticky-bottom" data-tab-target="#wip-by-lot-pane" style="display: none;">
                <ul class="pagination justify-content-center" id="wipByLotPagination"></ul>
            </nav>
            <nav class="sticky-bottom" data-tab-target="#entry-history-pane" style="display: none;">
                <ul class="pagination justify-content-center" id="entryHistoryPagination"></ul>
            </nav>
            <nav class="sticky-bottom" data-tab-target="#production-history-pane" style="display: none;">
                <ul class="pagination justify-content-center" id="paginationControls"></ul>
            </nav>
            <nav class="sticky-bottom" data-tab-target="#wip-onhand-pane" style="display: none;">
                <ul class="pagination justify-content-center" id="wipOnHandPagination"></ul>
            </nav>
            <nav class="sticky-bottom" data-tab-target="#stock-count-pane" style="display: none;">
                <ul class="pagination justify-content-center" id="stockCountPagination"></ul>
            </nav>
            <nav class="sticky-bottom" data-tab-target="#transaction-log-pane" style="display: none;">
                <ul class="pagination justify-content-center" id="transactionLogPagination"></ul>
            </nav>
            
            <div id="toast"></div>

            <?php
                if ($canAdd) { 
                    include('components/addPartModal.php'); 
                    include('components/addEntryModal.php');
                }
                if ($canManage) {
                    include('components/editEntryModal.php');
                    include('components/editProductionModal.php');
                    include('components/adjustStockModal.php');
                }
                include('components/stockDetailModal.php');
                include('components/varianceDetailModal.php');
                include('components/summaryModal.php');
                include('components/historySummaryModal.php');
                include('../components/php/autoLogoutUI.php');
            ?>
        </main>    
    </div>

    <?php include_once('../components/php/command_center.php'); ?>
    <?php include_once('../components/php/docking_sidebar.php'); ?>

    <script>
        const canManage = <?php echo json_encode($canManage); ?>;
        const canAdd = <?php echo json_encode($canAdd); ?>;
        const currentUser = <?php echo json_encode($currentUserForJS); ?>;
    </script>
    <script src="../components/js/pagination.js?v=<?php echo filemtime('../components/js/pagination.js'); ?>"></script>
    <script src="../../utils/libs/xlsx.full.min.js"></script>
    <script src="script/inventory.js?v=<?php echo filemtime('script/inventory.js'); ?>"></script>
    <script src="script/export_data.js?v=<?php echo filemtime('script/export_data.js'); ?>" defer></script>
</body>
</html>