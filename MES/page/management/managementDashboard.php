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
$pageHeaderTitle = "Production Planning";
$pageHeaderSubtitle = "Manage Production Plans & Budget";
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
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2"></script> <link rel="stylesheet" href="css/managementDashboard.css?v=<?php echo time(); ?>">
</head>
<body class="layout-top-header">
    
    <?php include('../components/php/top_header.php'); ?>
    <?php include('../components/php/mobile_menu.php'); ?>
    <?php include('../components/php/docking_sidebar.php'); ?>

    <div class="page-container">
        <main id="main-content">
            <?php include_once('../components/php/spinner.php'); ?>
            
            <div class="content-wrapper">
                <div class="planning-view">
                    <div class="planning-section-content">
                        
                        <div class="row g-3 planning-top-row">
                            
                            <div class="col-lg-8 h-100">
                                <div class="card shadow-sm chart-card-plan h-100 border-0">
                                    <div class="card-header bg-white py-2 border-bottom">
                                        <div class="d-flex flex-wrap justify-content-between align-items-center gap-2">
                                            <h6 class="fw-bold text-dark mb-0">
                                                <i class="fas fa-chart-bar me-2 text-primary"></i>Plan vs Actual
                                            </h6>
                                            
                                            <div class="d-flex flex-wrap gap-2 align-items-center">
                                                <div class="input-group input-group-sm" style="width: auto;">
                                                    <input type="date" id="startDateFilter" class="form-control">
                                                    <span class="input-group-text bg-light text-muted">-</span>
                                                    <input type="date" id="endDateFilter" class="form-control">
                                                </div>
                                                <select id="planLineFilter" class="form-select form-select-sm" style="width: auto; min-width: 120px;"> 
                                                    <option value="">All Lines</option> 
                                                </select>
                                                <select id="planShiftFilter" class="form-select form-select-sm" style="width: auto;"> 
                                                    <option value="">All Shifts</option> 
                                                    <option value="DAY">Day</option> 
                                                    <option value="NIGHT">Night</option> 
                                                </select>
                                                <button class="btn btn-sm btn-light text-primary border" id="btn-refresh-plan" title="Refresh">
                                                    <i class="fas fa-sync-alt"></i>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="card-body p-2 position-relative"> 
                                        <div style="position: relative; height: 100%; width: 100%;">
                                            <div id="planVsActualChartInnerWrapper" style="position: relative; height: 100%; width: 100%;">
                                                <canvas id="planVsActualChart"></canvas>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="col-lg-4 h-100">
                                <div class="card shadow-sm calendar-card h-100 border-0">
                                    <div class="card-header bg-white py-2 border-bottom" style="display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 10px;"> 
                                        <div class="d-flex gap-1">
                                            <button id="calendar-prev-button" class="btn btn-sm btn-light border"><i class="bi bi-chevron-left"></i></button>
                                            <button id="calendar-next-button" class="btn btn-sm btn-light border"><i class="bi bi-chevron-right"></i></button>
                                            <button id="calendar-today-button" class="btn btn-sm btn-light border ms-1">Today</button>
                                        </div>
                                        
                                        <div class="text-center fw-bold text-dark text-truncate" id="calendar-title" style="font-size: 0.95rem;">
                                            Calendar
                                        </div>

                                        <div class="d-flex gap-1">
                                            <div class="btn-group btn-group-sm">
                                                <button id="calendar-month-view-button" class="btn btn-outline-secondary active">M</button>
                                                <button id="calendar-week-view-button" class="btn btn-outline-secondary">W</button>
                                            </div>
                                            <button id="backToCalendarBtn" class="btn btn-sm btn-outline-secondary ms-1" style="display: none;">Back</button>
                                        </div>
                                    </div>
                                    
                                    <div class="card-body p-0 position-relative">
                                        <div id="planningCalendarContainer" class="h-100"></div>
                                        
                                        </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="card border-0 shadow-sm d-flex flex-column flex-grow-1" style="min-height: 0;"> 
                            <div class="card-header bg-white py-2 border-bottom">
                                <div class="d-flex justify-content-between align-items-center flex-wrap gap-2">
                                    <h6 class="fw-bold text-dark mb-0"><i class="fas fa-table me-2 text-primary"></i>Production Plans</h6>
                                    
                                    <div class="d-flex gap-2">
                                        <div class="btn-group">
                                            <button class="btn btn-sm btn-outline-success" onclick="exportToExcel()"><i class="fas fa-file-excel me-1"></i> Export</button>
                                            <button class="btn btn-sm btn-outline-primary" onclick="document.getElementById('importExcelInput').click()"><i class="fas fa-file-import me-1"></i> Import</button>
                                        </div>
                                        <input type="file" id="importExcelInput" hidden accept=".xlsx, .xls" onchange="importFromExcel(this)">
                                        
                                        <div class="vr mx-1 opacity-25"></div>
                                        
                                        <button class="btn btn-sm btn-outline-info fw-bold" onclick="syncLaborCost()">
                                            <i class="fas fa-users-cog me-1"></i> Sync Labor
                                        </button>

                                        <button class="btn btn-sm btn-warning text-dark fw-bold" id="btnCalculateCarryOver"><i class="fas fa-calculator me-1"></i> C/O</button>
                                        <button class="btn btn-sm btn-success fw-bold px-3 shadow-sm" id="btnAddPlan"><i class="fas fa-plus me-1"></i> New Plan</button>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="planning-table-wrapper"> 
                                <table class="table table-hover table-sm mb-0 align-middle" id="productionPlanTable">
                                    <thead class="table-light">
                                        <tr>
                                            <th style="width: 100px;">Date</th> 
                                            <th style="width: 80px;">Line</th> 
                                            <th style="width: 50px;">Shift</th> 
                                            <th>Item / Description</th> 
                                            <th class="text-end" style="width: 80px;">Plan</th> 
                                            <th class="text-end" style="width: 80px;">C/O</th> 
                                            <th class="text-end bg-primary bg-opacity-10" style="width: 90px;">Target</th>
                                            <th class="text-end" style="width: 90px; background-color: var(--bs-primary-bg-subtle);">Actual</th>
                                            <th class="text-end text-danger" style="width: 110px;">Budget (Cost)</th>
                                            <th class="text-end text-success" style="width: 110px;">Est. Sales</th>
                                            <th class="text-start" style="width: 150px;">Note</th> 
                                        </tr>
                                    </thead>
                                    <tbody id="productionPlanTableBody" class="bg-white"></tbody>
                                </table>
                            </div>
                            
                            <div class="planning-footer">
                                <div class="pagination-wrapper">
                                    <ul class="pagination pagination-sm mb-0" id="planningPagination"></ul>
                                </div>

                                <div class="summary-wrapper d-flex gap-4">
                                    <div class="footer-item">
                                        <span class="footer-label">Total Plan Qty</span>
                                        <span class="footer-value text-primary" id="footer-total-qty">0</span>
                                    </div>
                                    <div class="footer-item border-start ps-3">
                                        <span class="footer-label">Total Cost Budget</span>
                                        <span class="footer-value text-danger" id="footer-total-cost">฿0.00</span>
                                    </div>
                                    <div class="footer-item border-start ps-3">
                                        <span class="footer-label">Est. Sales Value</span>
                                        <span class="footer-value text-success" id="footer-total-sale">฿0.00</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            <div id="toast"></div>
            <?php
                include_once('components/planModal.php');
                include_once('components/helpModal.php');
            ?>
            
        </main>
    </div>
    
    <div class="modal fade" id="syncLaborModal" tabindex="-1">
        <div class="modal-dialog modal-sm modal-dialog-centered">
            <div class="modal-content">
                <div class="modal-header bg-info text-white py-2">
                    <h6 class="modal-title fw-bold"><i class="fas fa-sync-alt me-2"></i>Sync Labor Cost</h6>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <div class="mb-3">
                        <label class="form-label small fw-bold">Select Date Range</label>
                        <input type="date" id="syncStartDate" class="form-control form-control-sm mb-2">
                        <input type="date" id="syncEndDate" class="form-control form-control-sm">
                    </div>
                    <div class="alert alert-light border small mb-0">
                        <i class="fas fa-info-circle me-1 text-info"></i>
                        System will calculate DL/OT from Manpower Logs and save to database.
                    </div>
                </div>
                <div class="modal-footer p-2">
                    <button type="button" class="btn btn-sm btn-secondary" data-bs-dismiss="modal">Close</button>
                    <button type="button" class="btn btn-sm btn-info text-white fw-bold" onclick="executeSyncLabor()">Start Sync</button>
                </div>
            </div>
        </div>
    </div>

    <script>
        const currentUser = <?php echo json_encode($currentUserForJS); ?>;
        const DLOT_API = 'api/dlot_manual_manage.php'; // เก็บไว้เฉพาะถ้าปุ่ม Sync Labor ยังต้องใช้ API นี้อยู่
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