<?php 
    require_once __DIR__ . '/../../auth/check_auth.php';
    if (!hasRole(['admin', 'creator', 'supervisor'])) {
        header("Location: ../OEE_Dashboard/OEE_Dashboard.php");
        exit;
    }
    $canManage = hasRole(['admin', 'creator', 'supervisor']);
    $currentUser = $_SESSION['user'];
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <title>System Settings</title>
    <?php include_once '../components/common_head.php'; ?>
    <style>
        #item-master-pane .master-detail-container { display: flex; gap: 1rem; }
        #item-master-pane .master-list { flex: 0 0 45%; }
        #item-master-pane .detail-view { flex: 1 1 auto; }
    </style>
</head>

<body class="page-with-table">
    <div class="page-container">
        <?php include_once('../components/php/nav_dropdown.php'); ?>

        <main id="main-content">
            <?php include_once('../components/php/spinner.php'); ?>
    
            <div class="container-fluid pt-3">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h2 class="mb-0">System Settings</h2>
                </div>

                <ul class="nav nav-tabs" id="settingsTab" role="tablist">
                    <li class="nav-item" role="presentation">
                        <button class="nav-link active" id="item-master-tab" data-bs-toggle="tab" data-bs-target="#item-master-pane" type="button" role="tab">Item Master & Routes</button>
                    </li>
                    <li class="nav-item" role="presentation">
                        <button class="nav-link" id="bom-manager-tab" data-bs-toggle="tab" data-bs-target="#bom-manager-pane" type="button" role="tab">
                            <i class="fas fa-sitemap"></i> BOM Manager
                        </button>
                    </li>
                    <li class="nav-item" role="presentation">
                        <button class="nav-link" id="schedules-tab" data-bs-toggle="tab" data-bs-target="#lineSchedulesPane" type="button" role="tab">
                            <i class="fas fa-calendar-alt"></i> Line Schedules
                        </button>
                    </li>

                    <?php if (hasRole(['admin', 'creator'])): ?>
                        <li class="nav-item" role="presentation">
                            <button class="nav-link" id="locations-tab" data-bs-toggle="tab" data-bs-target="#locations-pane" type="button" role="tab">Location Manager</button>
                        </li>
                        <li class="nav-item" role="presentation">
                            <button class="nav-link" id="transfer-tab" data-bs-toggle="tab" data-bs-target="#transfer-pane" type="button" role="tab">Stock Transfer</button>
                        </li>
                        <li class="nav-item" role="presentation">
                            <button class="nav-link" id="opening-balance-tab" data-bs-toggle="tab" data-bs-target="#opening-balance-pane" type="button" role="tab">Opening Balance</button>
                        </li>
                    <?php endif; ?>
                    <?php if ($canManage):?>
                    <li class="nav-item" role="presentation">
                        <button class="nav-link text-warning" id="health-check-tab" data-bs-toggle="tab" data-bs-target="#healthCheckPane" type="button" role="tab">
                            <i class="fas fa-heartbeat"></i> Data Health Check
                        </button>
                    </li>
                    <?php endif; ?>
                </ul>
            </div>

            <div class="content-wrapper">
                <div class="tab-content" id="settingsTabContent">
                    <div class="tab-pane fade" id="locations-pane" role="tabpanel">
                        <?php include('components/locationsUI.php'); ?>
                    </div>
                    <div class="tab-pane fade" id="transfer-pane" role="tabpanel">
                        <?php include('components/stockTransferUI.php'); ?>
                    </div>
                    <div class="tab-pane fade" id="opening-balance-pane" role="tabpanel">
                        <?php include('components/openingBalanceUI.php'); ?>
                    </div>
                    <div class="tab-pane fade show active" id="item-master-pane" role="tabpanel">
                        <?php include('components/itemMasterUI.php'); ?>
                    </div>
                    <div class="tab-pane fade" id="bom-manager-pane" role="tabpanel">
                        <div class="sticky-bar">
                            <div class="row my-3 align-items-center">
                                <div class="col-md-6">
                                    <input type="text" class="form-control" id="bomSearchInput" placeholder="SAP No. / Part No. / Part Description">
                                </div>
                                <div class="col-md-6">
                                    <div class="d-flex justify-content-end gap-2">
                                        <button class="btn btn-info dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                                            <i class="fas fa-file-import"></i> Import
                                        </button>
                                        <ul class="dropdown-menu dropdown-menu-end">
                                            <li><a class="dropdown-item" href="#" id="importUpdateBomsBtn">For Update (Multi-Sheet)</a></li>
                                            <li><a class="dropdown-item" href="#" id="importCreateBomsBtn">For Initial Create (Single-Sheet)</a></li>
                                        </ul>
                                        <button class="btn btn-primary dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                                            <i class="fas fa-file-export"></i> Export
                                        </button>
                                        <ul class="dropdown-menu dropdown-menu-end">
                                            <li><a class="dropdown-item" href="#" id="exportAllConsolidatedBtn">All BOMs (Consolidated)</a></li>
                                            <li><a class="dropdown-item disabled" href="#" id="exportSelectedDetailedBtn">Selected BOMs (Detailed)</a></li>
                                        </ul>
                                        <input type="file" id="bulkUpdateImportFile" accept=".csv, .xlsx, .xls" class="d-none">
                                        <input type="file" id="initialCreateImportFile" accept=".csv, .xlsx, .xls" class="d-none">
                                        <button class="btn btn-danger d-none" id="deleteSelectedBomBtn">
                                            <i class="fas fa-trash-alt"></i> Delete Selected
                                        </button>
                                        <button class="btn btn-success" id="createNewBomBtn"><i class="fas fa-plus"></i> Create New BOM</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="table-responsive">
                            <table class="table table-striped table-hover">
                                <thead>
                                    <tr>
                                        <th style="width: 50px;" class="text-center"><input class="form-check-input" type="checkbox" id="selectAllBomCheckbox"></th>
                                        <th>SAP No.</th>
                                        <th>Part No.</th>
                                        <th>Part Description</th>
                                        <th>Updated By</th>
                                        <th class="text-end">Updated At</th>
                                    </tr>
                                </thead>
                                <tbody id="bomFgListTableBody"></tbody>
                            </table>
                        </div>
                    </div>

                    <?php if ($canManage): ?>
                        <div class="tab-pane fade" id="lineSchedulesPane" role="tabpanel">
                            <div class="row my-3 align-items-center">
                                <div class="col-md-9"></div>
                                <div class="col-md-3">
                                    <div class="d-flex justify-content-end">
                                        <button class="btn btn-success" onclick="openModal('addScheduleModal')">Add New Schedule</button>
                                    </div>
                                </div>
                            </div>
                            <div class="table-responsive">
                                <table class="table table-striped table-hover">
                                    <thead>
                                        <tr>
                                            <th>Line</th><th>Shift Name</th><th>Start Time</th><th>End Time</th>
                                            <th>Break (min)</th><th>Status</th>
                                            <th style="width: 150px; text-align: center;">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody id="schedulesTableBody"></tbody>
                                </table>
                            </div>
                        </div>
                        <div class="tab-pane fade" id="healthCheckPane" role="tabpanel">
                            <div class="alert alert-info mt-3">
                                <h4><i class="fas fa-info-circle"></i> Parts Requiring Attention</h4>
                                <p class="mb-0">The following parts have been produced but are missing standard time data (Planned Output). Please add them in the 'Standard Parameters' tab to ensure accurate OEE Performance calculation.</p>
                            </div>
                            <div class="table-responsive">
                                <table class="table table-striped">
                                    <thead>
                                        <tr>
                                            <th>Line</th>
                                            <th>Model</th>
                                            <th>Part No.</th>
                                            <th style="width: 180px;" class="text-center">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody id="missingParamsList"></tbody>
                                </table>
                            </div>
                        </div>
                    <?php endif; ?>
                </div>
            </div>
            
            <div id="toast"></div>

            <?php 
                include('components/locationModal.php'); 
                include('components/transferModal.php');
                include('components/itemModal.php');
                include('components/routeModal.php'); 
                include('components/addScheduleModal.php');
                include('components/editScheduleModal.php');
                include('components/manageBomModal.php'); 
                include('components/createBomModal.php');
                include('components/copyBomModal.php');
                include('components/bomImportPreviewModal.php');
                include('components/bomBulkImportPreviewModal.php');
                include('../components/php/autoLogoutUI.php'); 
            ?>
            
            <?php if ($canManage): ?>
            <nav class="sticky-bottom" data-tab-target="#healthCheckPane" style="display: none;">
                <ul class="pagination justify-content-center" id="healthCheckPaginationControls"></ul>
            </nav>
            <?php endif; ?>
            <nav class="sticky-bottom" data-tab-target="#bom-manager-pane" style="display: none;">
                <ul class="pagination justify-content-center" id="bomPaginationControls"></ul>
            </nav>

            <script>
                const canManage = <?php echo json_encode($canManage); ?>;
                const currentUser = <?php echo json_encode($_SESSION['user']); ?>;
            </script>
            
            <script src="../components/js/auto_logout.js?v=<?php echo filemtime('../components/js/auto_logout.js'); ?>"></script>
            <script src="../components/js/pagination.js?v=<?php echo filemtime('../components/js/pagination.js'); ?>"></script>
            <script src="../../utils/libs/xlsx.full.min.js"></script>
            
            <script src="script/inventorySettings.js?v=<?php echo filemtime('script/inventorySettings.js'); ?>"></script>
        </main>
    </div>
</body>
</html>