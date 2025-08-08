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

<body class="bg-dark text-white p-4">
    <?php include('../components/spinner.php'); ?>
    <?php include('../components/nav_dropdown.php'); ?>

    <div class="container-fluid">
        <div class="d-flex justify-content-between align-items-center mb-3">
            <h2 class="mb-0">Production & WIP Management</h2>
        </div>

        <ul class="nav nav-tabs" id="mainTab" role="tablist">
            <li class="nav-item" role="presentation">
                <button class="nav-link active" id="wip-report-tab" data-bs-toggle="tab" data-bs-target="#wip-report-pane" type="button" role="tab">WIP/Variance</button>
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
            <div class="tab-pane fade" id="entry-history-pane" role="tabpanel">
                <div class="table-responsive">
                    <table class="table table-dark table-hover table-striped">
                          <thead>
                            <tr>
                                <th>Date & Time</th>
                                <th>SAP No.</th>
                                <th>Part No.</th>
                                <th>Part Description</th>
                                <th class="text-end">Quantity</th>
                                <th>To Location</th>
                                <th>Lot No./Ref.</th>
                                <th>Created By</th>
                            </tr>
                        </thead>
                        <tbody id="entryHistoryTableBody"></tbody>
                        </table>
                </div>
                <nav class="sticky-bottom"><ul class="pagination justify-content-center" id="entryHistoryPagination"></ul></nav>
            </div>

            <div class="tab-pane fade" id="production-history-pane" role="tabpanel">
                <div class="table-responsive">
                    <table id="partTable" class="table table-dark table-striped table-hover">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Time</th>
                                <th>Location</th>
                                <th>SAP No.</th>
                                <th>Part No.</th>
                                <th>Lot No.</th>
                                <th class="text-end">Quantity</th>
                                <th class="text-center">Type</th>
                                <th>Notes</th>
                                <th>Created By</th>
                            </tr>
                        </thead>
                        <tbody id="partTableBody"></tbody>
                    </table>
                </div>
                <nav class="sticky-bottom"><ul class="pagination justify-content-center" id="paginationControls"></ul></nav>
            </div>

            <div class="tab-pane fade show active" id="wip-report-pane" role="tabpanel">
                <div class="table-responsive mb-4">
                    <table class="table table-dark table-striped">
                        <thead>
                            <tr>
                                <th>Location</th>
                                <th>SAP No.</th>
                                <th>Part Number</th>
                                <th>Part Description</th>
                                <th class="text-end">On-Hand Quantity (WIP)</th>
                            </tr>
                        </thead>
                        <tbody id="wipReportTableBody"></tbody>
                    </table>
                </div>
                <nav class="sticky-bottom"><ul class="pagination justify-content-center" id="wipReportPagination"></ul></nav>
            </div>

            <div class="tab-pane fade" id="stock-count-pane" role="tabpanel">
                <div class="table-responsive mt-3">
                    <table class="table table-dark table-striped table-hover">
                        <thead>
                            <tr>
                                <th style="width: 15%;">SAP No.</th>
                                <th style="width: 15%;">Part No.</th>
                                <th>Part Description</th>
                                <th class="text-end" style="width: 15%;">Total On-Hand</th>
                                <th class="text-center" style="width: 10%;">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="stockCountTableBody"></tbody>
                    </table>
                </div>
                <nav class="sticky-bottom"><ul class="pagination justify-content-center" id="stockCountPagination"></ul></nav>
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
        }
        include('../components/autoLogoutUI.php');
    ?>
    
    <script>
        const canManage = <?php echo json_encode($canManage); ?>;
        const canAdd = <?php echo json_encode($canAdd); ?>;
        const currentUser = <?php echo json_encode($currentUserForJS); ?>;
    </script>
    
    <script src="../components/spinner.js?v=<?php echo filemtime('../components/spinner.js'); ?>"></script>
    <script src="../components/toast.js?v=<?php echo filemtime('../components/toast.js'); ?>"></script>
    <script src="../components/auto_logout.js?v=<?php echo filemtime('../components/auto_logout.js'); ?>"></script>
    <script src="../components/pagination.js?v=<?php echo filemtime('../components/pagination.js'); ?>"></script>
    
    <script src="script/inventory.js?v=<?php echo filemtime('script/inventory.js'); ?>"></script>
    <script src="script/export_data.js?v=<?php echo filemtime('script/export_data.js'); ?>" defer></script> 

    <script defer>
        document.addEventListener('DOMContentLoaded', () => {
            const now = new Date();
            const dateStr = now.toISOString().split('T')[0];
            document.getElementById("filterStartDate").value = dateStr;
            document.getElementById("filterEndDate").value = dateStr;
            
            const buttonGroup = document.getElementById('dynamic-button-group');
            const summaryContainer = document.getElementById('dynamic-summary-container');
            const mainTabs = document.querySelectorAll('#mainTab .nav-link');
    
            // -- เพิ่มฟังก์ชันนี้เข้าไป --
            function updateFilterVisibility(activeTabId) {
                // แสดงทุกฟิลเตอร์เป็นค่าเริ่มต้น
                document.getElementById('filterPartNo').style.display = 'block';
                document.getElementById('filterLotNo').style.display = 'block';
                document.getElementById('filterLine').style.display = 'block';
                document.getElementById('filterModel').style.display = 'block';
                document.getElementById('filterCountType').style.display = 'block';
                document.getElementById('filterStartDate').style.display = 'block';
                document.getElementById('filterEndDate').style.display = 'block';
                document.querySelector('#main-filters span').style.display = 'inline';

                // ถ้า Tab ที่เลือกคือ Stock/Inventory
                if (activeTabId === 'stock-count-tab') {
                    document.getElementById('filterPartNo').placeholder = 'Search SAP, Part No, Description';
                    // ซ่อนฟิลเตอร์ที่ไม่เกี่ยวข้อง
                    document.getElementById('filterLotNo').style.display = 'none';
                    document.getElementById('filterLine').style.display = 'none';
                    document.getElementById('filterModel').style.display = 'none';
                    document.getElementById('filterCountType').style.display = 'none';
                    document.getElementById('filterStartDate').style.display = 'none';
                    document.getElementById('filterEndDate').style.display = 'none';
                    document.querySelector('#main-filters span').style.display = 'none'; // ซ่อนขีด "-"
                } else {
                    document.getElementById('filterPartNo').placeholder = 'Part No.';
                }
            }

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
                }
            }

            mainTabs.forEach(tab => {
                tab.addEventListener('shown.bs.tab', (event) => {
                    updateControls(event.target.id);
                    updateFilterVisibility(event.target.id);
                    if (event.target.id === 'production-history-tab' && typeof renderSummary === 'function') {
                        renderSummary(window.cachedSummary, window.cachedGrand);
                    }
                });
            });

            const activeTab = document.querySelector('#mainTab .nav-link.active');
            if (activeTab) {
                updateControls(activeTab.id);
                updateFilterVisibility(activeTab.id);
                if (activeTab.id === 'wip-report-tab' && typeof fetchWipReport === 'function') {
                    fetchWipReport();
                }
            }
        });
    </script>
</body>
</html>