<?php
    // --- ส่วนที่เพิ่มเพื่อ Debug ---
    ini_set('display_errors', 1);
    ini_set('display_startup_errors', 1);
    error_reporting(E_ALL);
    // ---------------------------

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
    <title>Production & WIP</title>
    <?php include_once '../components/common_head.php'; ?>
    <style>
        .text-center-col {
            text-align: center;
        }
    </style>
</head>

<body class="page-with-table">
    <div class="page-container">
        <?php include_once('../components/php/nav_dropdown.php'); ?>

        <main id="main-content">
            <?php include_once('../components/php/spinner.php'); ?>

            <div class="container-fluid pt-3">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h2 class="mb-0">Production & WIP Management</h2>
                </div>

                <ul class="nav nav-tabs" id="mainTab" role="tablist">
                    <li class="nav-item" role="presentation">
                        <button class="nav-link active" id="wip-report-tab" data-bs-toggle="tab" data-bs-target="#wip-report-pane" type="button" role="tab">WIP/Variance</button>
                    </li>
                    <li class="nav-item" role="presentation">
                        <button class="nav-link" id="wip-report-by-lot-tab" data-bs-toggle="tab" data-bs-target="#wip-report-by-lot-pane" type="button" role="tab">WIP/Variance (Lot No.)</button>
                    </li>
                    <li class="nav-item" role="presentation">
                        <button class="nav-link" id="entry-history-tab" data-bs-toggle="tab" data-bs-target="#entry-history-pane" type="button" role="tab">Entry History (IN)</button>
                    </li>
                    <li class="nav-item" role="presentation">
                        <button class="nav-link" id="production-history-tab" data-bs-toggle="tab" data-bs-target="#production-history-pane" type="button" role="tab">Production History (OUT)</button>
                    </li>
                    <li class="nav-item" role="presentation">
                        <button class="nav-link" id="stock-count-tab" data-bs-toggle="tab" data-bs-target="#stock-count-pane" type="button" role="tab">Stock/Inventory</button>
                    </li>
                </ul>
                
                <div class="sticky-bar">
                    <div class="container-fluid">
                        <div class="row my-3 align-items-center">
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
                            
                            <div class="col-12 mt-3" style="display:none;">
                                <div id="dynamic-summary-container" class="summary-grand-total"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="tab-content" id="mainTabContent">
                    <div class="tab-pane fade" id="entry-history-pane" role="tabpanel">
                        <div class="table-responsive">
                            <table class="table  table-hover table-striped">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Time</th>
                                        <th>Line</th>
                                        <th>Model</th>
                                        <th>Part No.</th>
                                        <th>Lot No.</th>
                                        <th style="text-align: center;">Qty</th>
                                        <th style="min-width: 200px; text-align: center;">Note</th>
                                        <?php if ($canManage): ?>
                                            <th style="width: 150px; text-align: center;">Actions</th>
                                        <?php endif; ?>
                                    </tr>
                                </thead>
                                <tbody id="wipHistoryTableBody"></tbody>
                            </table>
                        </div>
                        <nav class="pagination-footer pb-1"><ul class="pagination justify-content-center" id="entryHistoryPagination"></ul></nav>
                    </div>

                    <div class="tab-pane fade" id="production-history-pane" role="tabpanel">
                        <div class="table-responsive">
                            <table id="partTable" class="table  table-striped table-hover">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Start</th>
                                        <th>End</th>
                                        <th>Line</th>
                                        <th>Model</th>
                                        <th>Part No.</th>
                                        <th>Lot No.</th>
                                        <th style="text-align: center;">Qty</th>
                                        <th style="text-align: center;">Type</th>
                                        <th style="min-width: 200px; text-align: center;">Note</th>
                                        <?php if ($canManage): ?>
                                            <th style="width: 150px; text-align: center;">Actions</th>
                                        <?php endif; ?>
                                    </tr>
                                </thead>
                                <tbody id="partTableBody"></tbody>
                            </table>
                        </div>
                        <nav class="pagination-footer pb-1"><ul class="pagination justify-content-center" id="paginationControls"></ul></nav>
                    </div>

                    <div class="tab-pane fade show active" id="wip-report-pane" role="tabpanel">
                        <div class="table-responsive mb-4">
                            <table class="table  table-striped">
                                <thead>
                                    <tr>
                                        <th>Line</th>
                                        <th>Model</th>
                                        <th>Part Number</th>
                                        <th>Part Description</th>
                                        <th style="text-align: center;">Total In</th>
                                        <th style="text-align: center;">Total Out</th>
                                        <th style="text-align: center;">WIP/Variance</th>
                                    </tr>
                                </thead>
                                <tbody id="wipReportTableBody"></tbody>
                            </table>
                        </div>
                        <nav class="pagination-footer pb-1"><ul class="pagination justify-content-center" id="wipReportPagination"></ul></nav>
                    </div>

                    <div class="tab-pane fade" id="wip-report-by-lot-pane" role="tabpanel">
                        <div class="table-responsive mb-4">
                            <table class="table  table-striped">
                                <thead>
                                    <tr>
                                        <th>Line</th>
                                        <th>Model</th>
                                        <th>Part Number</th>
                                        <th>Part Description</th>
                                        <th>Lot Number</th>
                                        <th style="text-align: center;">Total In</th>
                                        <th style="text-align: center;">Total Out</th>
                                        <th style="text-align: center;">WIP/Variance</th>
                                    </tr>
                                </thead>
                                <tbody id="wipReportByLotTableBody"></tbody>
                            </table>
                        </div>
                        <nav class="pagination-footer pb-1"><ul class="pagination justify-content-center" id="wipReportByLotPagination"></ul></nav>
                    </div>

                    <div class="tab-pane fade" id="stock-count-pane" role="tabpanel">
                        <div class="table-responsive mt-3">
                            <table class="table  table-striped table-hover">
                                <thead>
                                    <tr>
                                        <th>Line</th>
                                        <th>Model</th>
                                        <th>Part No.</th>
                                        <th>Part Description</th>
                                        <th class="text-end">Total IN</th>
                                        <th class="text-end">Total OUT</th>
                                        <th class="text-end">On Hand</th>
                                        <?php if ($canManage): ?>
                                            <th class="text-center">Actions</th>
                                        <?php endif; ?>
                                    </tr>
                                </thead>
                                <tbody id="stockCountTableBody"></tbody>
                            </table>
                        </div>
                        <nav class="pagination-footer pb-1"><ul class="pagination justify-content-center" id="stockCountPagination"></ul></nav>
                    </div>
                </div>
            </div>
            
            <div id="toast"></div>

            <?php
                if ($canAdd) { 
                    include('components/addPartModal.php'); 
                    include('components/editPartModal.php');
                    include('components/addEntryModal.php');
                    include('components/editEntryModal.php');
                }
                if ($canManage) {
                    include('components/adjustStockModal.php');
                }
                include('components/summaryModal.php');
                include('components/wipDetailModal.php');
                include('../components/php/autoLogoutUI.php');
            ?>
            
            <script>
                const canManage = <?php echo json_encode($canManage); ?>;
                const canAdd = <?php echo json_encode($canAdd); ?>;
                const currentUser = <?php echo json_encode($currentUserForJS); ?>;
            </script>
            
            <script src="../components/js/auto_logout.js?v=<?php echo filemtime('../components/js/auto_logout.js'); ?>" defer></script>
            <script src="script/paginationTable.js?v=<?php echo filemtime('script/paginationTable.js'); ?>" defer></script>
            <script src="script/export_data.js?v=<?php echo filemtime('script/export_data.js'); ?>" defer></script>
            <script src="script/modal_handler.js?v=<?php echo filemtime('script/modal_handler.js'); ?>" defer></script> 
            <script src="script/wip_handler.js?v=<?php echo filemtime('script/wip_handler.js'); ?>" defer></script> 

            <script defer>
                // โค้ดที่เคยอยู่ใน DOMContentLoaded สามารถวางตรงนี้ได้เลยเมื่อใช้ defer
                document.addEventListener('DOMContentLoaded', () => {
                    const now = new Date();
                    const dateStr = now.toISOString().split('T')[0];
                    document.getElementById("filterStartDate").value = dateStr;
                    document.getElementById("filterEndDate").value = dateStr;
                    
                    const buttonGroup = document.getElementById('dynamic-button-group');
                    const summaryContainer = document.getElementById('dynamic-summary-container');
                    const mainTabs = document.querySelectorAll('#mainTab .nav-link');
                    const canManage = <?php echo json_encode($canManage); ?>;

                    function updateControls(activeTabId) {
                        buttonGroup.innerHTML = '';
                        summaryContainer.innerHTML = '';

                        switch (activeTabId) {
                            case 'production-history-tab':
                                buttonGroup.innerHTML = `
                                    <button class="btn btn-info" onclick="openSummaryModal(this)">Summary</button>
                                    <button class="btn btn-primary" onclick="exportToExcel()">Export</button>
                                    ${canAdd ? '<button class="btn btn-success" onclick="openAddPartModal(this)">Add (OUT)</button>' : ''}
                                `;
                                summaryContainer.innerHTML = '<div id="grandSummary" class="summary-grand-total"></div>';
                                break;
                            case 'entry-history-tab':
                                buttonGroup.innerHTML = `
                                    <button class="btn btn-info" onclick="openHistorySummaryModal()">Summary</button>
                                    <button class="btn btn-primary" onclick="exportHistoryToExcel()">Export</button>
                                    ${canAdd ? '<button class="btn btn-success" onclick="openAddEntryModal(this)">Add (IN)</button>' : ''}
                                `;
                                break;
                            case 'wip-report-tab':
                                buttonGroup.innerHTML = `<button class="btn btn-primary" onclick="exportWipReportToExcel()">Export</button>`;
                                break;
                            case 'wip-report-by-lot-tab':
                                buttonGroup.innerHTML = `<button class="btn btn-primary" onclick="exportWipReportByLotToExcel()">Export</button>`;
                                break;
                        }
                    }

                    mainTabs.forEach(tab => {
                        tab.addEventListener('shown.bs.tab', (event) => {
                            updateControls(event.target.id);
                            if (event.target.id === 'production-history-tab' && typeof renderSummary === 'function') {
                                renderSummary(window.cachedSummary, window.cachedGrand);
                            }
                        });
                    });

                    const activeTab = document.querySelector('#mainTab .nav-link.active');
                    if (activeTab) {
                        updateControls(activeTab.id);
                        if (activeTab.id === 'wip-report-tab' && typeof fetchWipReport === 'function') {
                            fetchWipReport();
                        }
                    }
                });
            </script>
        </main>
    </div>
</body>
</html>