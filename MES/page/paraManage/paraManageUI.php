<?php 
    require_once __DIR__ . '/../../auth/check_auth.php'; 
    if (!hasRole(['supervisor', 'admin', 'creator'])) {
        header("Location: ../OEE_Dashboard/OEE_Dashboard.php");
        exit;
    }
    $canManage = hasRole(['admin', 'creator']);
    $currentUser = $_SESSION['user'];
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <title>System Parameters</title>
    <?php include_once '../components/common_head.php'; ?>
</head>

<body class="page-with-table">
    <div class="page-container">
        <?php include_once('../components/php/nav_dropdown.php'); ?>

        <main id="main-content">
            <?php include_once('../components/php/spinner.php'); ?>
    
            <div class="container-fluid pt-3">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h2 class="mb-0">System Parameters</h2>
                </div>

                <ul class="nav nav-tabs" id="paramTab" role="tablist">
                    <li class="nav-item" role="presentation">
                        <button class="nav-link active" id="standard-params-tab" data-bs-toggle="tab" data-bs-target="#standardParamsPane" type="button" role="tab">
                            <i class="fas fa-cogs"></i> Standard Parameters
                        </button>
                    </li>
                    <?php if ($canManage): ?>
                    <li class="nav-item" role="presentation">
                        <button class="nav-link" id="schedules-tab" data-bs-toggle="tab" data-bs-target="#lineSchedulesPane" type="button" role="tab">
                            <i class="fas fa-calendar-alt"></i> Line Schedules
                        </button>
                    </li>
                    <li class="nav-item" role="presentation">
                        <button class="nav-link text-warning" id="health-check-tab" data-bs-toggle="tab" data-bs-target="#healthCheckPane" type="button" role="tab">
                            <i class="fas fa-heartbeat"></i> Data Health Check
                        </button>
                    </li>
                    <?php endif; ?>
                    <li class="nav-item" role="presentation">
                        <button class="nav-link" id="bom-manager-tab" data-bs-toggle="tab" data-bs-target="#bomManagerPane" type="button" role="tab">
                            <i class="fas fa-sitemap"></i> BOM Manager
                        </button>
                    </li>
                </ul>
            </div>
            
            <div class="content-wrapper">
                <div class="tab-content pt-3" id="paramTabContent">

                    <div class="tab-pane fade show active" id="standardParamsPane" role="tabpanel">
                        <div class="sticky-bar">
                            <div class="container-fluid">
                                <div class="row my-3 align-items-center">
                                    <div class="col-md-6">
                                        <div class="filter-controls-wrapper">
                                            <input type="text" class="form-control" id="filterLine" placeholder="Filter by Line...">
                                            <input type="text" class="form-control" id="filterModel" placeholder="Filter by Model...">
                                            <input type="text" class="form-control" id="searchInput" placeholder="Search Part/SAP No...">
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="d-flex justify-content-end gap-2">
                                            <button class="btn btn-info" onclick="triggerImport()"><i class="fas fa-file-import"></i> Import</button>
                                            <button class="btn btn-primary" onclick="exportToExcel()"><i class="fas fa-file-export"></i> Export</button>
                                            <button class="btn btn-success" onclick="openModal('addParamModal')"><i class="fas fa-plus"></i> Add</button>
                                        </div>
                                    </div>
                                </div>
                            
                                <div id="bulk-actions-container" class="d-none row align-items-center mb-2">
                                    <div class="col-12">
                                        <div class="d-flex justify-content-end gap-2">
                                            <div class="btn-group d-flex justify-content-end gap-2" role="group">
                                                <button class="btn btn-info" id="bulkCreateVariantsBtn">
                                                    <i class="fas fa-plus-square"></i> Create Variants
                                                </button>
                                                <button class="btn btn-danger" id="deleteSelectedBtn">
                                                    <i class="fas fa-trash-alt"></i> Delete Selected
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <input type="file" id="importFile" accept=".csv, .xlsx, .xls" class="d-none">
                        <div class="table-responsive">
                            <table class="table table-striped table-hover">
                                <thead>
                                    <tr>
                                        <th style="width: 50px;" class="text-center">
                                            <input class="form-check-input" type="checkbox" id="selectAllCheckbox">
                                        </th>
                                        <th>Line</th>
                                        <th>Model</th>
                                        <th>Part No.</th>
                                        <th>SAP No.</th>
                                        <th>Part Description</th> 
                                        <th>Planned Output</th>
                                        <th>Part Value</th>
                                        <th class="text-end">Updated At</th>
                                    </tr>
                                </thead>
                                <tbody id="paramTableBody"></tbody>
                            </table>
                        </div>
                    </div>

                    <?php if ($canManage): ?>
                    <div class="tab-pane fade" id="lineSchedulesPane" role="tabpanel">
                        <div class="row my-3 align-items-center">
                            <div class="col-md-9"></div>
                            <div class="col-md-3">
                                <div class="d-flex justify-content-end">
                                    <?php if ($canManage): ?>
                                        <button class="btn btn-success" onclick="openModal('addScheduleModal')">Add New Schedule</button>
                                    <?php endif; ?>
                                </div>
                            </div>
                        </div>
                        <div class="table-responsive">
                            <table class="table table-striped table-hover">
                                <thead>
                                    <tr>
                                        <th>Line</th><th>Shift Name</th><th>Start Time</th><th>End Time</th>
                                        <th>Break (min)</th><th>Status</th>
                                        <?php if ($canManage): ?><th style="width: 150px; text-align: center;">Actions</th><?php endif; ?>
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
                    
                    <div class="tab-pane fade" id="bomManagerPane" role="tabpanel">
                        <div class="sticky-bar pb-1">
                            <div class="row mb-2 align-items-center">
                                <div class="col-md-6">
                                    <input type="text" class="form-control" id="bomSearchInput" placeholder="Search by FG Part Number, Line, Model...">
                                </div>
                                <div class="col-md-6">
                                    <div class="d-flex justify-content-end gap-2">
                                        <button class="btn btn-info" id="importBomBtn"><i class="fas fa-file-import"></i> Import</button>
                                        <button class="btn btn-primary" id="exportBomBtn"><i class="fas fa-file-export"></i> Export</button>
                                        <input type="file" id="bomImportFile" accept=".csv, .xlsx, .xls" class="d-none">
                                        <button class="btn btn-success" id="createNewBomBtn"><i class="fas fa-plus"></i> Create New BOM</button>
                                    </div>
                                </div>
                            </div>
                            <div id="bom-bulk-actions-container" class="d-none row align-items-center mb-2">
                                <div class="col-12">
                                    <div class="d-flex justify-content-end gap-2">
                                        <button class="btn btn-danger" id="deleteSelectedBomBtn">
                                            <i class="fas fa-trash-alt"></i> Delete Selected
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="table-responsive">
                            <table class="table table-striped table-hover">
                                <thead>
                                    <tr>
                                        <th style="width: 50px;" class="text-center">
                                            <input class="form-check-input" type="checkbox" id="selectAllBomCheckbox">
                                        </th>
                                        <th>SAP No.</th>
                                        <th>Part No.</th>
                                        <th>Line</th>
                                        <th>Model</th>
                                        <th>Updated By</th>
                                        <th class="text-end">Updated At</th>
                                    </tr>
                                </thead>
                                <tbody id="bomFgListTableBody"></tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
            
            <nav class="sticky-bottom" data-tab-target="#standardParamsPane">
                <ul class="pagination justify-content-center" id="paginationControls"></ul>
            </nav>
            <?php if ($canManage): ?>
            <nav class="sticky-bottom" data-tab-target="#healthCheckPane" style="display: none;">
                <ul class="pagination justify-content-center" id="healthCheckPaginationControls"></ul>
            </nav>
            <?php endif; ?>
            
            <nav class="sticky-bottom" data-tab-target="#bomManagerPane" style="display: none;">
                <ul class="pagination justify-content-center" id="bomPaginationControls"></ul>
            </nav>
            <div id="toast"></div>

            <?php 
                if (hasRole(['supervisor', 'admin', 'creator'])) {
                    include('components/addParamModal.php');
                    include('components/editParamModal.php');
                    include('components/manageBomModal.php'); 
                    include('components/createBomModal.php');
                    include('components/createVariantsModal.php');
                    include('components/bulkCreateVariantsModal.php');
                    include('components/copyBomModal.php');
                }
                if ($canManage) {
                    include('components/addScheduleModal.php');
                    include('components/editScheduleModal.php');
                } 
                include('../components/php/autoLogoutUI.php');
            ?>

            <script>
                const canManage = <?php echo json_encode($canManage); ?>;
                const currentUser = <?php echo json_encode($currentUser); ?>;
            </script>
            
            <script src="../components/js/auto_logout.js?v=<?php echo filemtime('../components/js/auto_logout.js'); ?>"></script>
            <script src="../components/js/pagination.js?v=<?php echo filemtime('../components/js/pagination.js'); ?>"></script>
            <script src="../../utils/libs/xlsx.full.min.js"></script>
            <script src="script/paraManage.js?v=<?php echo filemtime('script/paraManage.js'); ?>"></script>
            <script src="script/modal_handler.js?v=<?php echo filemtime('script/modal_handler.js'); ?>"></script>
        </main>
    </div>
</body>
</html>