<?php
// MES/page/management/managementDashboard.php
include_once("../../auth/check_auth.php");

if (!hasRole(['admin', 'creator', 'planner'])) {
    header("Location: ../OEE_Dashboard/OEE_Dashboard.php");
    exit;
}

$currentUserForJS = $_SESSION['user'] ?? null;

// --- 1. ปรับ Header ให้เหลือแค่ Planning ---
$pageTitle = "Production Planning";
$pageIcon = "fas fa-calendar-alt"; 
$pageHeaderTitle = "Production Planning";
$pageHeaderSubtitle = "Manage Plans, Actuals & DLOT Cost";
$pageHelpId = "helpModal"; 
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <title><?php echo $pageTitle; ?></title>
    <?php include_once '../components/common_head.php'; ?>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tarekraafat/autocomplete.js@10.2.7/dist/css/autoComplete.02.min.css">
    <script src='https://cdn.jsdelivr.net/npm/fullcalendar@6.1.11/index.global.min.js'></script>
    <link href='https://cdn.jsdelivr.net/npm/bootstrap-icons@1.8.1/font/bootstrap-icons.css' rel='stylesheet'>
    <link rel="stylesheet" href="css/managementDashboard.css?v=<?php echo time(); ?>">
</head>
<body class="layout-top-header">
    
    <div id="loadingOverlay" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 9999; flex-direction: column; align-items: center; justify-content: center; backdrop-filter: blur(2px);">
        <div class="spinner-border text-light mb-3" role="status"></div>
        <h5 class="fw-bold text-white">Processing...</h5>
    </div>

    <?php include('../components/php/top_header.php'); ?>
    <?php include('../components/php/mobile_menu.php'); ?>
    <?php include('../components/php/docking_sidebar.php'); ?>

    <div class="page-container">
        
        <main id="main-content">
            <?php include_once('../components/php/spinner.php'); ?>

            <div class="content-wrapper">
                <div class="planning-view h-100">
                    <div class="planning-section-content h-100 d-flex flex-column gap-4"> 
                        
                        <div class="row g-3 planning-top-row">
                            <div class="col-lg-8 h-100">
                                <div class="card shadow-sm chart-card-plan h-100 border-0">
                                    <div class="card-header bg-body-tertiary bg-opacity-50">
                                        <div class="d-flex flex-wrap justify-content-between align-items-center">
                                            <h6 class="fw-bold text-primary mb-0">
                                                <i class="fas fa-chart-bar me-2"></i>Plan vs Actual
                                            </h6>
                                            <div class="d-flex flex-wrap gap-2 align-items-center">
                                                <input type="date" id="startDateFilter" class="form-control form-control-sm" style="width: auto;">
                                                <span class="text-muted">-</span>
                                                <input type="date" id="endDateFilter" class="form-control form-control-sm" style="width: auto;">
                                                <div class="vr mx-1"></div>
                                                <select id="planLineFilter" class="form-select form-select-sm" style="width: auto; min-width: 100px;"> <option value="">All Lines</option> </select>
                                                <select id="planShiftFilter" class="form-select form-select-sm" style="width: auto;"> <option value="">All Shifts</option> <option value="DAY">Day</option> <option value="NIGHT">Night</option> </select>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="card-body p-2 position-relative"> 
                                        <div class="chart-scroll-container" style="overflow-x: auto; height: 100%; width: 100%;">
                                            <div id="planVsActualChartInnerWrapper" style="position: relative; height: 100%; width: 100%;">
                                                <canvas id="planVsActualChart"></canvas>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="col-lg-4 h-100">
                                <div class="card shadow-sm calendar-card h-100 border-0">
                                    <div class="card-header bg-body-tertiary bg-opacity-50" style="display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; padding: 0.75rem 1rem;"> 
                                        
                                        <div class="d-flex align-items-center gap-1">
                                            <button id="calendar-prev-button" class="btn btn-sm btn-light border shadow-sm" title="Previous"><i class="bi bi-chevron-left"></i></button>
                                            <button id="calendar-next-button" class="btn btn-sm btn-light border shadow-sm" title="Next"><i class="bi bi-chevron-right"></i></button>
                                            <button id="calendar-today-button" class="btn btn-sm btn-light border shadow-sm ms-1">Today</button>
                                        </div>

                                        <h6 id="calendar-title" class="fw-bold text-primary mb-0" style="justify-self: center; white-space: nowrap;">Calendar</h6>

                                        <div class="d-flex align-items-center gap-2" style="justify-self: end;">
                                            <div class="btn-group btn-group-sm shadow-sm" role="group">
                                                <button id="calendar-month-view-button" type="button" class="btn btn-outline-secondary active">M</button>
                                                <button id="calendar-week-view-button" type="button" class="btn btn-outline-secondary">W</button>
                                            </div>
                                            <button id="backToCalendarBtn" class="btn btn-sm btn-outline-secondary shadow-sm" style="display: none;">Back</button>
                                        </div>
                                    </div>
                                    
                                    <div class="card-body p-0 position-relative">
                                        <div id="planningCalendarContainer" class="h-100"></div>
                                        
                                        <div id="dlotViewContainer" class="dlot-view-container h-100 p-2" style="display: none;">
                                            <div class="card shadow-none h-100 border-0" id="dlot-entry-card">
                                                <div class="card-body p-0 d-flex flex-column">
                                                    <div class="mb-3">
                                                        <div class="row g-2">
                                                            <div class="col-4"><div class="p-2 border rounded text-center bg-light"><small class="d-block text-muted">DL</small><strong id="dl-cost-summary-display" class="text-primary">0</strong></div></div>
                                                            <div class="col-4"><div class="p-2 border rounded text-center bg-light"><small class="d-block text-muted">OT</small><strong id="ot-cost-summary-display" class="text-danger">0</strong></div></div>
                                                            <div class="col-4"><div class="p-2 border rounded text-center bg-primary text-white"><small class="d-block text-white-50">Total</small><strong id="total-dlot-summary-display">0</strong></div></div>
                                                        </div>
                                                    </div>
                                                    <form id="dlot-entry-form" class="flex-grow-1 d-flex flex-column gap-2">
                                                        <div class="d-flex justify-content-between align-items-center mb-2">
                                                            <strong id="dlotDateDisplayEntry"></strong>
                                                        </div>
                                                        <input type="hidden" id="dlot-entry-date">
                                                        <div><label class="small">Headcount</label><input type="number" class="form-control form-control-sm" id="dlot-headcount"></div>
                                                        <div><label class="small">Direct Labor</label><input type="number" class="form-control form-control-sm" id="dlot-dl-cost"></div>
                                                        <div><label class="small">Overtime</label><input type="number" class="form-control form-control-sm" id="dlot-ot-cost"></div>
                                                        <button type="submit" class="btn btn-success btn-sm w-100 mt-auto">Save</button>
                                                    </form>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="card border-0 shadow-sm flex-grow-1" style="min-height: 0;">
                            <div class="card-header bg-white border-bottom-0 py-2">
                                <div class="d-flex justify-content-between align-items-center">
                                    <h6 class="fw-bold text-secondary mb-0"><i class="fas fa-list me-2"></i>Production Plans</h6>
                                    <div class="d-flex gap-2">
                                        <button class="btn btn-sm btn-light text-primary" id="btn-refresh-plan"><i class="fas fa-sync-alt"></i></button>
                                        <button class="btn btn-sm btn-warning text-dark" id="btnCalculateCarryOver"><i class="fas fa-calculator me-1"></i> Calc C/O</button>
                                        <button class="btn btn-sm btn-success" id="btnAddPlan"><i class="fas fa-plus me-1"></i> Plan</button>
                                    </div>
                                </div>
                            </div>
                            <div class="planning-table-wrapper flex-grow-1">
                                <table class="table table-hover table-sm mb-0 align-middle" id="productionPlanTable">
                                    <thead class="table-light sticky-top">
                                        <tr>
                                            <th style="width: 10%;">Date</th> 
                                            <th style="width: 8%;">Line</th> 
                                            <th style="width: 8%;">Shift</th> 
                                            <th style="width: 25%;">Item / Description</th> 
                                            <th class="text-center" style="width: 10%;">Plan</th> 
                                            <th class="text-center" style="width: 10%;">Actual</th> 
                                            <th class="text-center" style="width: 8%;">C/O</th> 
                                            <th class="text-center bg-primary bg-opacity-10" style="width: 10%;">Adj. Plan</th>
                                            <th class="text-start">Note</th> 
                                        </tr>
                                    </thead>
                                    <tbody id="productionPlanTableBody" class="bg-white"></tbody>
                                </table>
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            <div id="toast"></div>
            <?php include_once('../components/php/command_center.php'); ?>
            <?php include_once('components/planModal.php'); ?>
            <nav class="pagination-footer px-3 py-2 bg-white border-top">
                <ul class="pagination justify-content-end mb-0" id="planningPagination"></ul>
            </nav>

        </main>
    </div>
    
    <script>
        const currentUser = <?php echo json_encode($currentUserForJS); ?>;
        const DLOT_API = 'api/dlot_manual_manage.php';
        const FILTERS_API = '../OEE_Dashboard/api/get_dashboard_filters.php';
        const PLAN_API = 'api/planManage.php';
        const ITEM_SEARCH_API = '../inventorySettings/api/itemMasterManage.php';
    </script>
    <script src="../components/js/pagination.js?v=<?php echo filemtime('../components/js/pagination.js'); ?>"></script>
    <script src="../components/js/sendRequest.js?v=<?php echo filemtime('../components/js/sendRequest.js'); ?>"></script>
    <script src="../../utils/libs/xlsx.full.min.js"></script>
    <script src="script/managementDashboard.js?v=<?php echo filemtime('script/managementDashboard.js'); ?>"></script>
</body>
</html>