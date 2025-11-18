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
                    <h2 class="mb-0">Stops & Causes History</h2>
                </div>

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
                                <button class="btn btn-success flex-fill" onclick="openAddStopModal()">Add</button>
                            <?php endif; ?>
                        </div>
                    </div>
                    <div class="d-flex justify-content-between align-items-center my-3">
                        <div id="causeSummary" class="summary-grand-total">
                        </div>
                    </div>
                </div>
                

                <div class="table-responsive">
                    <table id="stopTable" class="table  table-striped table-hover">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Start</th>
                                <th>End</th>
                                <th>Duration (m)</th>
                                <th>Line</th>
                                <th>Machine</th>
                                <th>Cause</th>
                                <th>Recoverer</th>
                                <th style="min-width: 200px;">Note</th>
                                <?php if ($canManage): ?>
                                    <th style="width: 150px; text-align: center;">Actions</th>
                                <?php endif; ?>
                            </tr>
                        </thead>
                        <tbody id="stopTableBody"></tbody>
                    </table>
                </div>

                <nav class="pagination-footer">
                    <ul class="pagination justify-content-center" id="paginationControls"></ul>
                </nav>
            </div>
            <div id="toast"></div>

            <?php 
                if ($canManage) {
                    include('components/addStopModal.php');
                    include('components/editStopModal.php');
                }
                include('../components/php/autoLogoutUI.php');
            ?>
            
            <script>
                const canManage = <?php echo json_encode($canManage); ?>;
                
                document.addEventListener('DOMContentLoaded', () => {
                    const now = new Date();
                    const dateStr = now.toISOString().split('T')[0];
                    document.getElementById("filterStartDate").value = dateStr;
                    document.getElementById("filterEndDate").value = dateStr;
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
    <script src="../components/js/mobile_init.js?v=<?php echo filemtime('../components/js/mobile_init.js'); ?>" defer></script>
</body>
</html>