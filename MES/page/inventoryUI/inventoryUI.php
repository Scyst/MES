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
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <meta name="csrf-token" content="<?php echo htmlspecialchars($_SESSION['csrf_token'] ?? '', ENT_QUOTES, 'UTF-8'); ?>">
    <title>Production & WIP</title>

    <script src="../../utils/libs/xlsx.full.min.js"></script>
    <script src="../../utils/libs/bootstrap.bundle.min.js"></script>
    
    <link rel="stylesheet" href="../../utils/libs/bootstrap.min.css">
    <link rel="stylesheet" href="../../style/style.css?v=<?php echo filemtime('../../style/style.css'); ?>">
    <style>
        .text-center-col {
            text-align: center;
        }
    </style>
</head>

<body class=" p-4">
    <?php include('../components/spinner.php'); ?>
    <?php include('../components/nav_dropdown.php'); ?>

    <div class="container-fluid">
        <div class="d-flex justify-content-between align-items-center mb-3">
            <h2 class="mb-0">Production & WIP Management</h2>
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
        
        <div class="row my-3 align-items-center sticky-bar py-3">
            <div class="col-md-8">
                <div class="filter-controls-wrapper" id="main-filters">
                    <input list="partNoList" id="filterPartNo" class="form-control" placeholder="Part No.">
                    <datalist id="partNoList"></datalist>

                    <input list="lotList" id="filterLotNo" class="form-control" placeholder="Lot No.">
                    <datalist id="lotList"></datalist>

                    <input list="lineList" id="filterLine" class="form-control" placeholder="Line">
                    <datalist id="lineList"></datalist>

                    <input list="modelList" id="filterModel" class="form-control" placeholder="Model">
                    <datalist id="modelList"></datalist>
                    
                    <select id="filterCountType" class="form-select">
                        <option value="">All Types</option>
                        <option value="FG">FG</option><option value="NG">NG</option><option value="HOLD">HOLD</option>
                        <option value="REWORK">REWORK</option><option value="SCRAP">SCRAP</option><option value="ETC.">ETC.</option>
                    </select>

                    <input type="date" id="filterStartDate" class="form-control">
                    <span>-</span>
                    <input type="date" id="filterEndDate" class="form-control">
                </div>
            </div>

            <div class="col-md-4">
                <div id="dynamic-button-group" class="d-flex justify-content-end gap-2"></div>
            </div>
            
            <div class="col-12 mt-3">
                <div id="dynamic-summary-container" class="summary-grand-total"></div>
            </div>
        </div>

        <div class="tab-content" id="mainTabContent">
            <div class="tab-pane fade show active" id="production-variance-pane" role="tabpanel">
                <div class="table-responsive">
                    <table class="table  table-striped">
                        <thead>
                            <tr>
                                <th>Location</th>
                                <th>SAP No.</th>
                                <th>Part Number</th>
                                <th>Part Description</th>
                                <th class="text-end">Total IN</th>
                                <th class="text-end">Total OUT</th>
                                <th class="text-end">Variance (OUT - IN)</th>
                            </tr>
                        </thead>
                        <tbody id="productionVarianceTableBody"></tbody>
                    </table>
                </div>
                <nav class="sticky-bottom"><ul class="pagination justify-content-center" id="productionVariancePagination"></ul></nav>
            </div>

            <div class="tab-pane fade" id="wip-by-lot-pane" role="tabpanel">
                 <div class="table-responsive">
                    <table class="table  table-striped">
                        <thead>
                            <tr>
                                <th>SAP No.</th>
                                <th>Part Number</th>
                                <th>Part Description</th>
                                <th>Lot Number</th>
                                <th class="text-end">Total IN</th>
                                <th class="text-end">Total OUT</th>
                                <th class="text-end">Variance (OUT - IN)</th>
                            </tr>
                        </thead>
                        <tbody id="wipByLotTableBody"></tbody>
                    </table>
                </div>
                <nav class="sticky-bottom"><ul class="pagination justify-content-center" id="wipByLotPagination"></ul></nav>
            </div>

            <div class="tab-pane fade" id="entry-history-pane" role="tabpanel">
                <div class="table-responsive">
                    <table class="table  table-hover table-striped">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Time</th>
                                <th>จาก (Source)</th>
                                <th>ไปยัง (Destination)</th>
                                <th>SAP No.</th>
                                <th>Part No.</th>
                                <th>ล็อต / อ้างอิง</th>
                                <th class="text-end">จำนวน</th>
                                <th>หมายเหตุ</th>
                            </tr>
                        </thead>
                        <tbody id="entryHistoryTableBody"></tbody>
                    </table>
                </div>
                <nav class="sticky-bottom"><ul class="pagination justify-content-center" id="entryHistoryPagination"></ul></nav>
            </div>

            <div class="tab-pane fade" id="production-history-pane" role="tabpanel">
                <div class="table-responsive">
                    <table id="partTable" class="table  table-striped table-hover">
                        <thead>
                            <tr>
                                <th style="width: 10%;">Date</th>
                                <th style="width: 15%;">Time (Start-End)</th>
                                <th style="width: 8%;" class="text-center">Duration (m)</th>
                                <th style="width: 10%;">Location</th>
                                <th style="width: 12%;">Part No.</th>
                                <th style="width: 10%;">Lot / Ref.</th>
                                <th style="width: 8%;" class="text-end">Quantity</th>
                                <th style="width: 8%;" class="text-center">Type</th>
                                <th>Notes</th> </tr>
                        </thead>
                        <tbody id="partTableBody"></tbody>
                    </table>
                </div>
                <nav class="sticky-bottom"><ul class="pagination justify-content-center" id="paginationControls"></ul></nav>
            </div>

            <div class="tab-pane fade" id="wip-onhand-pane" role="tabpanel">
                <div class="table-responsive">
                    <table class="table  table-striped">
                        <thead>
                            <tr>
                                <th>Location</th>
                                <th>SAP No.</th>
                                <th>Part Number</th>
                                <th>Part Description</th>
                                <th class="text-end">On-Hand Quantity (WIP)</th>
                            </tr>
                        </thead>
                        <tbody id="wipOnHandTableBody"></tbody>
                    </table>
                </div>
                <nav class="sticky-bottom"><ul class="pagination justify-content-center" id="wipOnHandPagination"></ul></nav>
            </div>

            <div class="tab-pane fade" id="stock-count-pane" role="tabpanel">
                <div class="table-responsive mt-3">
                    <table class="table  table-striped table-hover">
                        <thead>
                            <tr>
                                <th style="width: 15%;">SAP No.</th>
                                <th style="width: 15%;">Part No.</th>
                                <th>Used in Models</th>
                                <th>Part Description</th>
                                <th class="text-end" style="width: 15%;">Total On-Hand</th>
                            </tr>
                        </thead>
                        <tbody id="stockCountTableBody"></tbody>
                    </table>
                </div>
                <nav class="sticky-bottom"><ul class="pagination justify-content-center" id="stockCountPagination"></ul></nav>
            </div>

            <div class="tab-pane fade" id="transaction-log-pane" role="tabpanel">
                <div class="table-responsive">
                    <table class="table  table-striped table-hover">
                        <thead>
                            <tr>
                                <th>Date & Time</th>
                                <th>Type</th>
                                <th>Part No.</th>
                                <th>Source</th>
                                <th>Destination</th>
                                <th class="text-end">Change</th>
                                <th>Lot / Ref.</th>
                                <th>User</th>
                                <th>Notes</th>
                            </tr>
                        </thead>
                        <tbody id="transactionLogTableBody"></tbody>
                    </table>
                </div>
                <nav class="sticky-bottom"><ul class="pagination justify-content-center" id="transactionLogPagination"></ul></nav>
            </div>
        </div>
    </div>
    
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
        include('../components/autoLogoutUI.php');
    ?>
    
    <script>
        const canManage = <?php echo json_encode($canManage); ?>;
        const canAdd = <?php echo json_encode($canAdd); ?>;
        const currentUser = <?php echo json_encode($currentUserForJS); ?>;
    </script>
    
    <script src="../components/theme-switcher.js?v=<?php echo filemtime('../components/inventorySettings.js'); ?>" defer></script>
    <script src="../components/spinner.js?v=<?php echo filemtime('../components/spinner.js'); ?>"></script>
    <script src="../components/toast.js?v=<?php echo filemtime('../components/toast.js'); ?>"></script>
    <script src="../components/auto_logout.js?v=<?php echo filemtime('../components/auto_logout.js'); ?>"></script>
    <script src="../components/pagination.js?v=<?php echo filemtime('../components/pagination.js'); ?>"></script>
    <script src="script/inventory.js?v=<?php echo filemtime('script/inventory.js'); ?>"></script>
    <script src="script/export_data.js?v=<?php echo filemtime('script/export_data.js'); ?>" defer></script>
</body>
</html>