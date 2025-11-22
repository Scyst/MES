<?php 
    include_once("../../auth/check_auth.php"); 
    
    if (!hasRole(['supervisor', 'admin', 'creator'])) {
        header("Location: ../OEE_Dashboard/OEE_Dashboard.php");
        exit;
    }

    $canManage = hasRole(['supervisor', 'admin', 'creator']);
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <title>OEE - STOP CAUSE HISTORY</title>
    <?php include_once '../components/common_head.php'; ?>
</head>

<body class="page-with-table">
    <button class="btn btn-outline-secondary mobile-hamburger-btn" type="button" 
            data-bs-toggle="offcanvas" 
            data-bs-target="#globalMobileMenu" 
            aria-controls="globalMobileMenu">
        <i class="fas fa-bars"></i>
    </button>
    
    <div class="page-container">
        <?php include_once('../components/php/nav_dropdown.php'); ?>

        <main id="main-content">
            <?php include_once('../components/php/spinner.php'); ?>

            <div class="container-fluid pt-3">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <h2 class="mb-0">Production Events & Maintenance</h2>
                </div>

                <ul class="nav nav-tabs mb-3" id="myTab" role="tablist">
                    <li class="nav-item" role="presentation">
                        <button class="nav-link active" id="stop-tab" data-bs-toggle="tab" data-bs-target="#stop-tab-pane" type="button" role="tab">
                            <i class="fas fa-ban text-danger me-2"></i>Stop Causes
                        </button>
                    </li>
                    <li class="nav-item" role="presentation">
                        <button class="nav-link" id="maintenance-tab" data-bs-toggle="tab" data-bs-target="#maintenance-tab-pane" type="button" role="tab">
                            <i class="fas fa-tools text-warning me-2"></i>Maintenance Requests
                        </button>
                    </li>
                </ul>

                <div class="tab-content" id="myTabContent">
        
                    <div class="tab-pane fade show active" id="stop-tab-pane" role="tabpanel">
                        
                        <div class="row mb-3 align-items-center sticky-bar">
                            <div class="col-md-8">
                                <div class="filter-controls-wrapper">
                                    <input list="causeListFilter" id="filterCause" class="form-control" placeholder="Search Stop Cause" />
                                    <datalist id="causeListFilter"></datalist>
                                    
                                    <input list="lineListFilter" id="filterLine" class="form-control" placeholder="Line">
                                    <datalist id="lineListFilter"></datalist>
                                    
                                    <input list="machineListFilter" id="filterMachine" class="form-control" placeholder="Machine/Station">
                                    <datalist id="machineListFilter"></datalist>
                                    
                                    <div class="filter-controls-wrapper">
                                        <input type="date" id="filterStartDate" class="form-control">
                                        <span>-</span>
                                        <input type="date" id="filterEndDate" class="form-control">
                                    </div>
                                </div>
                            </div>

                            <div class="col-md-2"></div>

                            <div class="col-md-2">
                                <div class="d-flex justify-content-end gap-2 btn-group-equal">
                                    <button class="btn btn-primary flex-fill" onclick="exportToExcel()">Export</button>
                                    <?php if ($canManage): ?>
                                        <button class="btn btn-success flex-fill" onclick="openAddStopModal()">Add Stop</button>
                                    <?php endif; ?>
                                </div>
                            </div>
                        </div>
                        
                        <div id="causeSummary" class="summary-grand-total mb-2"></div>

                        <div class="table-responsive">
                            <table id="stopTable" class="table table-striped table-hover">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Start</th>
                                        <th>End</th>
                                        <th>Duration</th>
                                        <th>Line</th>
                                        <th>Machine</th>
                                        <th>Cause</th>
                                        <th>Recoverer</th>
                                        <th>Note</th>
                                        <?php if ($canManage): ?><th>Actions</th><?php endif; ?>
                                    </tr>
                                </thead>
                                <tbody id="stopTableBody"></tbody>
                            </table>
                        </div>
                        <nav class="pagination-footer">
                            <ul class="pagination justify-content-center" id="paginationControls"></ul>
                        </nav>
                    </div>

                    <div class="tab-pane fade" id="maintenance-tab-pane" role="tabpanel">
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <div class="d-flex gap-2">
                                <select id="mtFilterStatus" class="form-select" onchange="fetchMaintenanceData()">
                                    <option value="">All Status</option>
                                    <option value="Pending" selected>Pending</option>
                                    <option value="In Progress">In Progress</option>
                                    <option value="Completed">Completed</option>
                                </select>
                                <button class="btn btn-outline-secondary" onclick="fetchMaintenanceData()"><i class="fas fa-sync-alt"></i> Refresh</button>
                            </div>
                            <button class="btn btn-warning text-dark" onclick="showBootstrapModal('addMaintenanceModal')">
                                <i class="fas fa-plus-circle me-1"></i> Request Maintenance
                            </button>
                        </div>

                        <div class="table-responsive">
                            <table class="table table-hover align-middle">
                                <thead class="table-light">
                                    <tr>
                                        <th>Status</th>
                                        <th>Date</th>
                                        <th>Line/Machine</th>
                                        <th>Issue</th>
                                        <th>Priority</th>
                                        <th>Requested By</th>
                                        <th>Tech Note</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody id="maintenanceTableBody"></tbody>
                            </table>
                        </div>
                    </div>

                </div>

            <?php 
                if ($canManage) {
                    include('components/addStopModal.php');
                    include('components/editStopModal.php');
                }
                // Include Maintenance Modal
                include('components/addMaintenanceModal.php');
                include('components/completeMaintenanceModal.php');
                include('components/viewMaintenanceModal.php');
                include('../components/php/autoLogoutUI.php');
            ?>

            <script>
                const canManage = <?php echo json_encode($canManage); ?>;
                
                document.addEventListener('DOMContentLoaded', () => {
                    // 1. ตรวจสอบ Element ก่อนตั้งค่า
                    const startDateEl = document.getElementById("filterStartDate");
                    const endDateEl = document.getElementById("filterEndDate");
                    
                    const now = new Date();
                    const dateStr = now.toISOString().split('T')[0];

                    if (startDateEl) startDateEl.value = dateStr;
                    if (endDateEl) endDateEl.value = dateStr;

                    // 2. เรียกโหลดข้อมูล (ถ้า script paginationTable โหลดเสร็จแล้ว)
                    if (typeof fetchStopData === 'function') {
                        fetchStopData(1);
                    }
                });
            </script>
        </main>
    </div>
    
    <?php include_once('../components/php/command_center.php'); ?>
    <?php include_once('../components/php/docking_sidebar.php'); ?>
    <?php include_once('../components/php/mobile_menu.php'); ?>
    

    <script src="script/paginationTable.js?v=<?php echo filemtime('script/paginationTable.js'); ?>"></script>
    <script src="script/export_data.js?v=<?php echo filemtime('script/export_data.js'); ?>"></script>
    <script src="script/modal_handler.js?v=<?php echo filemtime('script/modal_handler.js'); ?>"></script>
    <script src="script/maintenance_handler.js?v=<?php echo time(); ?>"></script>
    
</body>
</html>