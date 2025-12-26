<?php
// MES/page/management/managementDashboard.php
require_once __DIR__ . '/../components/init.php';

// ตรวจสอบสิทธิ์ (Admin, Creator, Planner)
if (!hasRole(['admin', 'creator', 'planner'])) {
    header("Location: ../OEE_Dashboard/OEE_Dashboard.php");
    exit;
}

// ข้อมูล User ปัจจุบันสำหรับส่งให้ JS
$currentUserForJS = $_SESSION['user'] ?? null;

// Config Header ของ Template
$pageTitle = "Production Planning";
$pageHeaderTitle = "Production Planning";
$pageHeaderSubtitle = "Manage Production Plans & Budget";
$pageHelpId = "helpModal"; // ID ของ Modal ช่วยเหลือ
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
    <script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2"></script>
    
    <script src="https://cdn.sheetjs.com/xlsx-0.20.0/package/dist/xlsx.full.min.js"></script>

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
                
                <div class="planning-view">
                    <div class="planning-section-content">
                        
                        <div class="row g-3 planning-top-row">
                            
                            <div class="col-lg-8 h-100">
                                <div class="card shadow-sm chart-card-plan h-100 border-0">
                                    <div class="card-header bg-white py-2 border-bottom">
                                        <div class="d-flex flex-wrap justify-content-between align-items-center gap-2">
                                            <h6 class="fw-bold text-dark mb-0">
                                                <i class="fas fa-chart-bar me-2 text-primary"></i>Plan vs Actual
                                                <small class="text-muted ms-2 fw-normal" id="chartDateDisplay"></small>
                                            </h6>
                                            
                                            <div class="d-flex flex-wrap gap-2 align-items-center">
                                                
                                                <div class="input-group input-group-sm" style="width: auto;">
                                                    <input type="date" id="startDateFilter" class="form-control">
                                                    <span class="input-group-text bg-light text-muted border-start-0 border-end-0">-</span>
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

                                                <div class="vr mx-1 opacity-25"></div>

                                                <div class="btn-group btn-group-sm" role="group">
                                                    <input type="radio" class="btn-check" name="chartViewMode" id="viewByDate" value="date" checked>
                                                    <label class="btn btn-outline-secondary" for="viewByDate" title="View by Date (Qty)">
                                                        <i class="fas fa-calendar-alt"></i>
                                                    </label>

                                                    <input type="radio" class="btn-check" name="chartViewMode" id="viewByMoney" value="money">
                                                    <label class="btn btn-outline-secondary" for="viewByMoney" title="View by Revenue (THB)">
                                                        <i class="fas fa-coins"></i>
                                                    </label>
                                                    
                                                    <input type="radio" class="btn-check" name="chartViewMode" id="viewByItem" value="item">
                                                    <label class="btn btn-outline-secondary" for="viewByItem" title="View by Item">
                                                        <i class="fas fa-cubes"></i>
                                                    </label>

                                                </div>
                                                
                                                <div class="vr mx-1 opacity-25"></div>
                                                <a href="executiveDashboard.php" class="btn btn-sm btn-light border text-dark fw-bold" title="Go to Executive Dashboard" style="font-size: 0.8rem;">
                                                <i class="bi bi-speedometer2 me-1" style="font-size: 1rem;"></i>
                                                </a>

                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div class="card-body p-0 position-relative">
                                        <div class="chart-scroll-container">
                                            <div id="planVsActualChartInnerWrapper">
                                                <canvas id="planVsActualChart"></canvas>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="col-lg-4 h-100">
                                <div class="card shadow-sm calendar-card h-100 border-0">
                                    <div class="card-header bg-white py-2 border-bottom d-flex align-items-center justify-content-between"> 
                                        <div class="d-flex gap-1">
                                            <button id="calendar-prev-button" class="btn btn-sm btn-light border text-muted" title="Previous">
                                                <i class="bi bi-chevron-left"></i>
                                            </button>
                                            <button id="calendar-today-button" class="btn btn-sm btn-light border text-dark fw-bold px-3">
                                                Today
                                            </button>
                                        </div>
                                        
                                        <div class="fw-bold text-dark text-truncate" id="calendar-title" style="font-size: 0.95rem; letter-spacing: 0.5px;">
                                            Calendar
                                        </div>

                                        <div class="d-flex align-items-center gap-1">
                                            <div class="btn-group btn-group-sm me-1" role="group">
                                                <button id="calendar-month-view-button" class="btn btn-outline-secondary active" title="Month View">M</button>
                                                <button id="calendar-week-view-button" class="btn btn-outline-secondary" title="Week View">W</button>
                                            </div>
                                            
                                            <button id="calendar-next-button" class="btn btn-sm btn-light border text-muted" title="Next">
                                                <i class="bi bi-chevron-right"></i>
                                            </button>
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
                                    <h6 class="fw-bold text-dark mb-0">
                                        <i class="fas fa-table me-2 text-primary"></i>Production Plans
                                    </h6>
                                    
                                    <div class="d-flex gap-2">
                                        <div class="btn-group">
                                            <button class="btn btn-sm btn-outline-success" onclick="exportToExcel()">
                                                <i class="fas fa-file-excel me-1"></i> Export
                                            </button>
                                            
                                            <button class="btn btn-sm btn-outline-primary" id="btnImportPlan">
                                                <i class="fas fa-file-import me-1"></i> Import
                                            </button>
                                        </div>

                                        <input type="file" id="importPlanInput" hidden accept=".xlsx, .xls, .csv">
                                        
                                        <div class="vr mx-1 opacity-25"></div>
                                        
                                        <button class="btn btn-sm btn-warning text-dark fw-bold" id="btnCalculateCarryOver" title="Auto Calculate C/O from history">
                                            <i class="fas fa-calculator me-1"></i> Calc C/O
                                        </button>
                                        
                                        <button class="btn btn-sm btn-success fw-bold px-3 shadow-sm" id="btnAddPlan">
                                            <i class="fas fa-plus me-1"></i> New Plan
                                        </button>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="planning-table-wrapper"> 
                                <table class="table table-hover table-sm mb-0 align-middle" id="productionPlanTable">
                                    <thead class="table-light">
                                        <tr>
                                            <th style="width: 100px;">Date</th> 
                                            <th class="text-center" style="width: 100px;">Line</th> 
                                            <th class="text-center" style="width: 100px;">Shift</th> 
                                            <th>Item / Description</th> 
                                            <th class="text-end" style="width: 100px;">Plan</th> 
                                            <th class="text-end" style="width: 100px;">C/O</th> 
                                            <th class="text-end" style="width: 100px;">Target</th>
                                            <th class="text-end" style="width: 100px;">Actual</th>
                                            <th class="text-end text-danger" style="width: 120px;">Cost Budget</th>
                                            <th class="text-end text-success" style="width: 120px;">Est. Sales</th>
                                            <th class="text-center" style="width: 250px;">Note</th> 
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
                                        <span class="footer-label">Total Actual Qty</span>
                                        <span class="footer-value text-dark fw-bold" id="footer-total-actual" style="padding: 0 5px; border-radius: 4px;">0</span>
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
                        
                    </div> </div> </div>

            <div id="toast"></div> <?php
                // Include Modals (แยกไฟล์เพื่อความสะอาด)
                include_once('components/planModal.php');
                include_once('components/dlotModal.php');
                include_once('components/helpModal.php');
            ?>
            
        </main>
    </div>

    <script>
        // Pass PHP Variables to JS
        const currentUser = <?php echo json_encode($currentUserForJS); ?>;
        
        // API Endpoints Configuration
        const FILTERS_API = '../OEE_Dashboard/api/get_dashboard_filters.php';
        const PLAN_API = 'api/planManage.php';
        const ITEM_SEARCH_API = '../inventorySettings/api/itemMasterManage.php';
    </script>
    
    <script src="../components/js/pagination.js?v=<?php echo filemtime('../components/js/pagination.js'); ?>"></script>
    <script src="../components/js/sendRequest.js?v=<?php echo filemtime('../components/js/sendRequest.js'); ?>"></script>
    <script src="script/managementDashboard.js?v=<?php echo filemtime('script/managementDashboard.js'); ?>"></script>

</body>
</html>