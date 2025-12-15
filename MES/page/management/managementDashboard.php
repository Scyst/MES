<?php
// MES/page/management/managementDashboard.php
include_once("../../auth/check_auth.php");

if (!hasRole(['admin', 'creator', 'planner'])) {
    header("Location: ../OEE_Dashboard/OEE_Dashboard.php");
    exit;
}

$currentUserForJS = $_SESSION['user'] ?? null;

// --- Config Header ---
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
    
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link href='https://cdn.jsdelivr.net/npm/bootstrap-icons@1.8.1/font/bootstrap-icons.css' rel='stylesheet'>
    
    <script src='https://cdn.jsdelivr.net/npm/fullcalendar@6.1.11/index.global.min.js'></script>
    
    <link rel="stylesheet" href="css/managementDashboard.css?v=<?php echo time(); ?>">
</head>
<body class="layout-top-header">
    
    <?php include('../components/php/top_header.php'); ?>
    <?php include('../components/php/mobile_menu.php'); ?>
    <?php include('../components/php/docking_sidebar.php'); ?>

    <div class="page-container">
        <main id="main-content">
            <?php include_once('../components/php/spinner.php'); ?>
            
            <div class="content-wrapper">
                <div class="planning-section-content">
    
                    <div class="row g-2 mb-2">
                        <div class="col-lg-2 col-md-4 col-6">
                            <div class="kpi-card border-success border-opacity-10 h-100">
                                <div class="text-center">
                                    <div class="kpi-title text-success">Sale</div>
                                    <h4 class="fw-bold mb-0" id="kpi-sale-value">฿0.00</h4>
                                    <small class="text-muted" style="font-size: 0.7em;">USD x Rate</small>
                                </div>
                            </div>
                        </div>
                        <div class="col-lg-2 col-md-4 col-6">
                            <div class="kpi-card border-secondary border-opacity-10 h-100">
                                <div class="text-center">
                                    <div class="kpi-title text-secondary">Cost</div>
                                    <h4 class="fw-bold mb-0" id="kpi-cost-value">฿0.00</h4>
                                    <small class="text-muted" style="font-size: 0.7em;">Total Std Cost</small>
                                </div>
                            </div>
                        </div>
                        <div class="col-lg-2 col-md-4 col-6">
                            <div class="kpi-card border-primary border-opacity-10 h-100">
                                <div class="text-center">
                                    <div class="kpi-title text-primary">Gross Profit</div>
                                    <h4 class="fw-bold mb-0" id="kpi-profit-value">฿0.00</h4>
                                    <small class="text-muted" style="font-size: 0.7em;">Margin Gap</small>
                                </div>
                            </div>
                        </div>
                        <div class="col-lg-2 col-md-4 col-6">
                            <div class="kpi-card border-0 bg-light h-100">
                                <div class="text-center">
                                    <div class="kpi-title text-muted">RM</div>
                                    <h5 class="fw-bold mb-0 text-dark" id="kpi-rm-value">฿0.00</h5>
                                </div>
                            </div>
                        </div>
                        <div class="col-lg-2 col-md-4 col-6">
                            <div class="kpi-card border-0 bg-light h-100">
                                <div class="text-center">
                                    <div class="kpi-title text-primary fw-bold">Actual Labor Cost</div>
                                    <h5 class="fw-bold mb-0 text-primary" id="kpi-dl-value">฿0.00</h5>
                                    <small class="text-muted" style="font-size: 0.65em;">From Manpower</small>
                                </div>
                            </div>
                        </div>
                        <div class="col-lg-2 col-md-4 col-6">
                            <div class="kpi-card border-0 bg-light h-100">
                                <div class="text-center">
                                    <div class="kpi-title text-muted">OH</div>
                                    <h5 class="fw-bold mb-0 text-dark" id="kpi-oh-value">฿0.00</h5>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="row g-3 planning-top-row">
                        <div class="col-lg-8 h-100">
                            <div class="card shadow-sm chart-card-plan h-100 border-0">
                                <div class="card-header bg-white py-3 border-bottom">
                                    <div class="d-flex flex-wrap justify-content-between align-items-center gap-2">
                                        <h6 class="fw-bold text-dark mb-0"><i class="fas fa-chart-bar me-2 text-primary"></i>Plan vs Actual Analysis</h6>
                                        <div class="d-flex flex-wrap gap-2 align-items-center">
                                            <div class="input-group input-group-sm" style="width: auto;">
                                                <input type="date" id="startDateFilter" class="form-control">
                                                <span class="input-group-text bg-light text-muted">-</span>
                                                <input type="date" id="endDateFilter" class="form-control">
                                            </div>
                                            <select id="planLineFilter" class="form-select form-select-sm" style="width: auto; min-width: 120px;"> <option value="">All Lines</option> </select>
                                            <select id="planShiftFilter" class="form-select form-select-sm" style="width: auto;"> <option value="">All Shifts</option> <option value="DAY">Day</option> <option value="NIGHT">Night</option> </select>
                                        </div>
                                    </div>
                                </div>
                                <div class="card-body p-3"> 
                                    <div class="chart-scroll-container">
                                        <div id="planVsActualChartInnerWrapper" style="position: relative; height: 100%; width: 100%;">
                                            <canvas id="planVsActualChart"></canvas>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="col-lg-4 h-100">
                            <div class="card shadow-sm calendar-card h-100 border-0">
                                <div class="card-header bg-white py-3 border-bottom" style="display: grid; grid-template-columns: 1fr auto 1fr; align-items: center;"> 
                                    <div class="d-flex gap-1">
                                        <button id="calendar-prev-button" class="btn btn-sm btn-light border" title="Prev"><i class="bi bi-chevron-left"></i></button>
                                        <button id="calendar-next-button" class="btn btn-sm btn-light border" title="Next"><i class="bi bi-chevron-right"></i></button>
                                    </div>
                                    <h6 id="calendar-title" class="fw-bold text-dark mb-0">Calendar</h6>
                                    <div class="d-flex gap-2 justify-content-end">
                                        <button id="calendar-today-button" class="btn btn-sm btn-light border me-1">Today</button>
                                        <div class="btn-group btn-group-sm">
                                            <button id="calendar-month-view-button" type="button" class="btn btn-outline-secondary active">M</button>
                                            <button id="calendar-week-view-button" type="button" class="btn btn-outline-secondary">W</button>
                                        </div>
                                        <button id="backToCalendarBtn" class="btn btn-sm btn-outline-secondary" style="display: none;">Back</button>
                                    </div>
                                </div>
                                <div class="card-body p-0">
                                    <div id="planningCalendarContainer" class="h-100"></div>
                                    <div id="dlotViewContainer" class="dlot-view-container h-100 p-3" style="display: none;">
                                        <?php include 'components/dlot_form_inner.php'; ?> 
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="card border-0 shadow-sm"> 
                        <div class="card-header bg-white py-3 border-bottom">
                            <div class="d-flex justify-content-between align-items-center flex-wrap gap-2">
                                <h6 class="fw-bold text-dark mb-0"><i class="fas fa-table me-2 text-primary"></i>Production Plans</h6>
                                
                                <div class="d-flex gap-2">
                                    <div class="btn-group">
                                        <button class="btn btn-sm btn-outline-success" onclick="exportToExcel()"><i class="fas fa-file-excel me-1"></i> Export</button>
                                        <button class="btn btn-sm btn-outline-primary" onclick="document.getElementById('importExcelInput').click()"><i class="fas fa-file-import me-1"></i> Import</button>
                                    </div>
                                    <input type="file" id="importExcelInput" hidden accept=".xlsx, .xls" onchange="importFromExcel(this)">
                                    <div class="vr mx-1"></div>
                                    <button class="btn btn-sm btn-light text-primary border" id="btn-refresh-plan" title="Refresh"><i class="fas fa-sync-alt"></i></button>
                                    <button class="btn btn-sm btn-warning text-dark fw-bold" id="btnCalculateCarryOver"><i class="fas fa-calculator me-1"></i> Calc C/O</button>
                                    <button class="btn btn-sm btn-success fw-bold px-3" id="btnAddPlan"><i class="fas fa-plus me-1"></i> New Plan</button>
                                </div>
                            </div>
                        </div>
                        <div class="planning-table-wrapper"> 
                            <table class="table table-hover table-sm mb-0 align-middle" id="productionPlanTable">
                                <thead class="table-light sticky-top">
                                    <tr>
                                        <th style="width: 10%;">Date</th> 
                                        <th style="width: 8%;">Line</th> 
                                        <th style="width: 8%;">Shift</th> 
                                        <th style="width: 25%;">Item / Description</th> 
                                        <th class="text-end" style="width: 10%;">Plan</th> 
                                        <th class="text-end" style="width: 10%;">Actual</th> 
                                        <th class="text-end" style="width: 8%;">C/O</th> 
                                        <th class="text-end bg-primary bg-opacity-10" style="width: 10%;">Adj. Plan</th>
                                        <th class="text-start">Note</th> 
                                    </tr>
                                </thead>
                                <tbody id="productionPlanTableBody" class="bg-white"></tbody>
                            </table>
                        </div>
                    </div>

                </div>
            </div>

            <div id="toast"></div>
            <?php include_once('../components/php/command_center.php'); ?>
            <?php include_once('components/planModal.php'); ?>
            
            <nav class="pagination-footer px-3 py-2 bg-white border-top shadow-sm">
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
    <script src="https://cdn.sheetjs.com/xlsx-0.20.0/package/dist/xlsx.full.min.js"></script>
    <script src="script/managementDashboard.js?v=<?php echo filemtime('script/managementDashboard.js'); ?>"></script>
</body>
</html>