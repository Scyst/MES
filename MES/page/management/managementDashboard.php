<?php
include_once("../../auth/check_auth.php");

if (!hasRole(['admin', 'creator', 'planner'])) {
    header("Location: ../OEE_Dashboard/OEE_Dashboard.php");
    exit;
}

$currentUserForJS = $_SESSION['user'] ?? null;
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <title>Management Dashboard - Planning</title>
    <?php include_once '../components/common_head.php'; ?>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tarekraafat/autocomplete.js@10.2.7/dist/css/autoComplete.02.min.css">
    <script src='https://cdn.jsdelivr.net/npm/fullcalendar@6.1.11/index.global.min.js'></script>
    <link href='https://cdn.jsdelivr.net/npm/bootstrap-icons@1.8.1/font/bootstrap-icons.css' rel='stylesheet'>
    <style>
        /* ============================================== */
        /* ▼▼▼ CSS แก้ไข Layout (ชุดใหม่) ▼▼▼ */
        /* ============================================== */

        /* 1. สร้าง "โลกใหม่" ที่มีความสูงคงที่ อิงจากหน้าจอ (vh) */
        #planning-view {
            display: flex;
            flex-direction: column;
            
            /* * คำนวณความสูง: 100vh (เต็มจอ)
             * - 130px (ความสูงโดยประมาณของ Header + Filter bar ด้านบน)
             * - 3rem   (padding ของ .dashboard-section บน 1.5rem + ล่าง 1.5rem)
             *
             * *** คุณอาจต้องปรับค่า 130px นี้เล็กน้อย (เช่น 120px, 140px) ***
             * *** เพื่อให้มันพอดีกับหน้าจอของคุณที่สุด ***
             */
            height: calc(100vh - 130px - 3rem);
        }

        /* 2. ให้ content-wrapper ยืดเต็ม "โลกใหม่" ของเรา */
        .planning-section-content {
            flex-grow: 1; /* <-- ยืดให้เต็ม #planning-view */
            display: flex;
            flex-direction: column;
            min-height: 0; /* <-- สำคัญมาก! อนุญาตให้หดตัวได้ */
            gap: 1rem;
        }

        /* 3. แถวบน (กราฟ/ปฏิทิน) - 50% ของพื้นที่ */
        .planning-top-row {
            flex-basis: 50%;  /* <-- สัดส่วน 50% */
            height: 50%;      /* <-- กำหนดความสูง 50% */
            flex-shrink: 0;   /* <-- ห้ามหด */
            min-height: 350px;/* <-- ความสูงขั้นต่ำ กันมันแบน */
        }

        /* 4. แถวล่าง (ตาราง) - ยืดเติมส่วนที่เหลือ */
        .planning-table-wrapper {
            flex-grow: 1;     /* <-- เติมพื้นที่ที่เหลือ (อีก 50%) */
            min-height: 0;    /* <-- สำคัญมาก! ทำให้ overflow-y ทำงาน */
            overflow-y: auto; /* <-- ทำให้ "เฉพาะตาราง" scroll ได้ */
            position: relative;
            border: 1px solid var(--bs-border-color);
            border-radius: var(--bs-card-border-radius, .375rem);
        }

        /* ============================================== */
        /* ▼▼▼ สไตล์เดิมของคุณ (ที่จำเป็น) ▼▼▼ */
        /* ============================================== */

        .planning-table-wrapper thead { position: sticky; top: 0; z-index: 1; background-color: var(--bs-tertiary-bg); }
        [data-bs-theme="dark"] .planning-table-wrapper thead { background-color: var(--bs-secondary-bg); }
        
        /* ทำให้ Card ในแถวบนยืดเต็ม 100% ของ .planning-top-row */
        .chart-card-plan, .calendar-card { 
            height: 100%; 
            display: flex; 
            flex-direction: column; 
        }
        .chart-card-plan .card-body, .calendar-card .card-body { 
            position: relative; 
            flex-grow: 1; 
            padding: 0.5rem; 
            min-height: 0; 
        }
        
        #planningCalendarContainer { width:100%; height: 100%; }
        #planningCalendarContainer .fc-daygrid-day-number { font-weight: bold; text-decoration: none; }
        #planningCalendarContainer .fc-event { padding: 2px 4px; font-size: 0.75em; cursor: pointer; }
        
        /* สไตล์สำหรับ DLOT View ภายในปฏิทิน */
        .dlot-view-container { 
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            overflow-y: auto; 
            flex-direction: column; 
            gap: 1rem;
            padding: 0.5rem;
            display: none;
        }
        .dlot-view-container .card { flex-shrink: 0; }
        .dlot-view-container #dlot-entry-card { flex-grow: 1; min-height: 0; display: flex; flex-direction: column;}
        .dlot-view-container #dlot-entry-card .card-body { flex-grow: 1; overflow-y: auto; min-height: 0; }

        /* สไตล์สำหรับช่องที่แก้ไขได้ และความกว้างตาราง */
        .editable-note, .editable-plan { cursor: pointer; min-width: 80px; display: inline-block; padding: 0.25rem 0.5rem; text-align: right;}
        .editable-note:hover, .editable-plan:hover { background-color: var(--bs-tertiary-bg); outline: 1px dashed var(--bs-secondary); }
        .editable-note:focus, .editable-plan:focus { background-color: var(--bs-light); outline: 1px solid var(--bs-primary); cursor: text; }
        [data-bs-theme="dark"] .editable-note:focus, [data-bs-theme="dark"] .editable-plan:focus { background-color: var(--bs-gray-700); }
        #productionPlanTable th:nth-child(4), #productionPlanTable td:nth-child(4) { min-width: 200px; }
        #productionPlanTable th:nth-child(9), #productionPlanTable td:nth-child(9) { min-width: 150px; }
        #productionPlanTable th:last-child, #productionPlanTable td:last-child { width: 120px; text-align: center; }
        
        /* สไตล์ Stat Card ใน DLOT View */
        .stat-card-header { font-size: 0.8rem; font-weight: 500; padding: 0.5rem 1rem; opacity: 0.9; }
        .stat-card-body h4 { font-size: 1.75rem; font-weight: 700; }
        .stat-card-body small { font-size: 0.9rem; font-weight: 500; }
    </style>
</head>
<body class="dashboard-page">
    <div class="page-container">
        <?php include_once('../components/php/nav_dropdown.php'); ?>
        <main id="main-content">
            <?php include_once('../components/php/spinner.php'); ?>
            <header class="dashboard-header-sticky">
                <div class="d-flex justify-content-between align-items-center mb-1">
                    <h2 class="mb-0">Production Planning</h2>
                    <div class="text-end"> <p id="date" class="mb-0"></p> <p id="time" class="mb-0"></p> </div>
                </div>
                <div class="row">
                    <div class="col-12">
                          <div class="d-flex flex-wrap justify-content-center align-items-center gap-2" id="planning-global-filters">
                            <label for="planDateFilter" class="form-label mb-0 small">Date:</label>
                            <input type="date" id="planDateFilter" class="form-control form-control-sm" style="width: auto;">
                            <label for="planLineFilter" class="form-label mb-0 small ms-lg-2">Line:</label>
                            <select id="planLineFilter" class="form-select form-select-sm" style="width: auto; min-width: 120px;"> <option value="">All Lines</option> </select>
                            <label for="planShiftFilter" class="form-label mb-0 small ms-lg-2">Shift:</label>
                            <select id="planShiftFilter" class="form-select form-select-sm" style="width: auto;"> <option value="">All Shifts</option> <option value="DAY">DAY</option> <option value="NIGHT">NIGHT</option> </select>
                            <span class="vr mx-1 d-none d-md-inline"></span>
                            <button class="btn btn-sm btn-outline-secondary" id="btn-refresh-plan" title="Refresh Plans"> <i class="fas fa-sync-alt"></i> </button>
                            <button class="btn btn-sm btn-outline-warning py-1 px-2" id="btnCalculateCarryOver" title="Calculate missing carry-over values up to today"> <i class="fas fa-calculator me-1"></i> Calc C/O </button>
                            <button class="btn btn-sm btn-success" id="btnAddPlan"> <i class="fas fa-plus me-1"></i> Add Plan </button>
                        </div>
                    </div>
                </div>
            </header>

            <div class="dashboard-container">
                <section class="dashboard-section" id="planning-section">
                    <div id="planning-view">
                        <div class="planning-section-content">
                            <div class="row g-3 planning-top-row">
                                <div class="col-lg-7 h-100">
                                    <div class="card shadow-sm chart-card-plan h-100">
                                        <div class="card-header"> Plan vs Actual (<span id="chartDateDisplay"></span>) </div>
                                        <div class="card-body"> <canvas id="planVsActualChart"></canvas> </div>
                                    </div>
                                </div>
                                <div class="col-lg-5 h-100">
                                    <div class="card shadow-sm calendar-card h-100">
                                        <div class="card-header d-flex justify-content-between align-items-center">
                                            <span id="calendar-title">Planning Calendar</span>
                                            <button id="backToCalendarBtn" class="btn btn-sm btn-outline-secondary" style="display: none;"> <i class="fas fa-arrow-left me-1"></i> Back </button>
                                        </div>
                                        <div class="card-body">
                                            <div id="planningCalendarContainer" style="width:100%; height: 100%;"> Loading Calendar... </div>
                                            <div id="dlotViewContainer" class="dlot-view-container">
                                                <div class="card shadow-sm" id="cost-summary-card-dlot">
                                                    <div class="card-header d-flex justify-content-between align-items-center gap-2 p-2">
                                                        <h6 class="mb-0 card-title fw-bold small"><i class="fas fa-chart-line me-1 text-primary"></i>Cost Summary (<span id="dlotDateDisplayCost"></span>)</h6>
                                                        <div class="d-flex gap-1 align-items-center">
                                                            <select id="cost-summary-line-dlot" class="form-select form-select-sm" style="width: auto;" title="Select Line"><option value="ALL">All</option></select>
                                                            <button class="btn btn-sm btn-outline-primary py-1 px-2" id="btn-refresh-cost-summary-dlot" title="Refresh Summary"><i class="fas fa-sync-alt fa-xs"></i></button>
                                                        </div>
                                                    </div>
                                                    <div class="card-body p-2">
                                                        <div class="row g-2">
                                                            <div class="col-12"><div class="card text-center text-bg-secondary mb-1"><div class="stat-card-header py-0 px-2 small">Std DL Cost</div><div class="card-body stat-card-body py-1"><h4 class="card-title mb-0" id="std-dl-cost-display-dlot" style="font-size: 1.1rem;">0.00</h4></div></div></div>
                                                            <div class="col-12"><div class="card text-center text-bg-primary mb-1"><div class="stat-card-header py-0 px-2 small">Actual DLOT Cost</div><div class="card-body stat-card-body py-1"><h4 class="card-title mb-0" id="actual-dlot-cost-display-dlot" style="font-size: 1.1rem;">0.00</h4></div></div></div>
                                                            <div class="col-12"><div class="card text-center" id="variance-card-dlot"><div class="stat-card-header py-0 px-2 small">Variance</div><div class="card-body stat-card-body py-1"><h4 class="card-title mb-0" id="dl-variance-display-dlot" style="font-size: 1.1rem;">0.00</h4></div></div></div>
                                                        </div>
                                                    </div>
                                                </div> 
                                                <div class="card shadow-sm flex-grow-1" id="dlot-entry-card">
                                                    <div class="card-header p-2"><h6 class="mb-0 card-title fw-bold small"><i class="fas fa-edit me-1 text-success"></i>Daily Cost Entry (<span id="dlotDateDisplayEntry"></span>)</h6></div>
                                                    <div class="card-body p-2 d-flex flex-column">
                                                        <form id="dlot-entry-form" class="flex-grow-1 d-flex flex-column">
                                                            <input type="hidden" id="dlot-entry-date">
                                                            <div class="mb-1">
                                                                <label for="dlot-entry-line" class="form-label small mb-0">Line:</label>
                                                                <select id="dlot-entry-line" class="form-select form-select-sm"><option value="ALL" selected>All Lines</option></select>
                                                            </div>
                                                            <div class="mb-1">
                                                                <label for="dlot-headcount" class="form-label small mb-0">Headcount:</label>
                                                                <input type="number" class="form-control form-control-sm" id="dlot-headcount" placeholder="0" min="0" step="1">
                                                            </div>
                                                            <div class="mb-1">
                                                                <label for="dlot-dl-cost" class="form-label small mb-0">Direct Labor (DL):</label>
                                                                <input type="number" class="form-control form-control-sm" id="dlot-dl-cost" placeholder="0.00" min="0" step="0.01">
                                                            </div>
                                                            <div class="mb-2">
                                                                <label for="dlot-ot-cost" class="form-label small mb-0">Overtime (OT):</label>
                                                                <input type="number" class="form-control form-control-sm" id="dlot-ot-cost" placeholder="0.00" min="0" step="0.01">
                                                            </div>
                                                            <div class="mt-auto pt-1">
                                                                <button type="submit" class="btn btn-success btn-sm w-100" id="btn-save-dlot"><i class="fas fa-save me-1"></i> Save</button>
                                                            </div>
                                                        </form>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="planning-table-wrapper">
                                <table class="table table-striped table-hover table-sm" id="productionPlanTable">
                                    <thead class="table-light">
                                        <tr>
                                            <th style="width: 10%;">Date</th> <th style="width: 10%;">Line</th> <th style="width: 8%;">Shift</th> <th>Item (SAP / Part No)</th>
                                            <th style="width: 10%;" class="text-center">Plan Qty</th> <th style="width: 10%;" class="text-center">Actual Qty</th> <th style="width: 10%;" class="text-center">Carry Over</th> <th style="width: 10%;" class="text-center">Adjusted Plan</th>
                                            <th class="text-center">Note</th> <th class="text-center">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody id="productionPlanTableBody"> <tr><td colspan="10" class="text-center">Loading plans...</td></tr> </tbody>
                                </table>
                            </div>
                        </div> </div> </section>
            </div>

            <div id="toast"></div>
            <?php include_once('../components/php/command_center.php'); ?>
            <?php include_once('../components/php/docking_sidebar.php'); ?>
            <?php include_once('components/planModal.php'); ?>
        </main>
    </div>

    <div class="modal fade" id="rejectReasonModal" tabindex="-1">...</div>
    <div class="modal fade" id="planModal" tabindex="-1">...</div>

    <script>
        const currentUser = <?php echo json_encode($currentUserForJS); ?>;
        const SHIPMENT_API = 'api/shipment.php';
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