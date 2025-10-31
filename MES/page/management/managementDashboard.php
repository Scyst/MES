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
            height: calc(100vh - 120px - 3rem);
        }

        /* 2. ให้ content-wrapper ยืดเต็ม "โลกใหม่" ของเรา */
        .planning-section-content {
            flex-grow: 1; /* <-- ยืดให้เต็ม #planning-view */
            display: flex;
            flex-direction: column;
            min-height: 0; /* <-- สำคัญมาก! อนุญาตให้หดตัวได้ */
            gap: 2rem;
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
        
        #planningCalendarContainer { 
            position: absolute;
            top: 0;
            left: 0;
            width: 100%; 
            height: 100%; 
        }

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

        .dlot-entered .fc-daygrid-day-number {
            color: var(--bs-success) !important;
            font-weight: 700;
            text-decoration: none !important; /* ลบขีดฆ่า ถ้าบังเอิญเป็นอดีต */
        }

        /* 2. วันที่ผ่านมาแล้ว แต่ "ยังไม่กรอก" DLOT (สีแดง + ขีดฆ่า) */
        .dlot-missing-past .fc-daygrid-day-number {
            color: var(--bs-danger) !important;
            font-weight: 400;
            text-decoration: line-through;
            opacity: 0.7;
        }

        /* 3. วันนี้ หรือ อนาคต ที่ยังไม่กรอก (สีเทา Default) */
        .dlot-pending .fc-daygrid-day-number {
            opacity: 0.8; 
            /* (ใช้สี default ของปฏิทิน) */
        }
        
        .fc-event.dlot-marker-bg {
            /* ⭐️ ใช้ display: background !important */
            display: background !important; 
            background-color: var(--bs-success) !important;
            opacity: 0.15; /* ⭐️ ทำให้สีจางๆ */
            z-index: -1; /* ⭐️ ให้อยู่หลังสุด */
        }

        /* ⭐️ (Optional) ทำให้คลิกทะลุ Background Event ไปยัง "วันที่" ได้ */
        .fc-bg-event {
            pointer-events: none;
        }

        #cost-summary-card-dlot .stat-card-body h4 {
            font-size: 1rem; /* ลดขนาดตัวเลขลงเล็กน้อย */
        }
        #cost-summary-card-dlot .stat-card-header {
            font-size: 0.75rem; /* ลดขนาดหัวข้อลงเล็กน้อย */
        }
        hr {
            border-color: var(--bs-border-color);
            opacity: 0.25;
        }

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
                            <label for="startDateFilter" class="form-label mb-0 small">Start:</label>
                            <input type="date" id="startDateFilter" class="form-control form-control-sm" style="width: auto;">
                            <label for="endDateFilter" class="form-label mb-0 small ms-lg-2">End:</label>
                            <input type="date" id="endDateFilter" class="form-control form-control-sm" style="width: auto;">
                            <label for="planLineFilter" class="form-label mb-0 small ms-lg-2">Line:</label>
                            <select id="planLineFilter" class="form-select form-select-sm" style="width: auto; min-width: 120px;"> <option value="">All Lines</option> </select>
                            <label for="planShiftFilter" class="form-label mb-0 small ms-lg-2">Shift:</label>
                            <select id="planShiftFilter" class="form-select form-select-sm" style="width: auto;"> <option value="">All Shifts</option> <option value="DAY">DAY</option> <option value="NIGHT">NIGHT</option> </select>
                            <span class="vr mx-1 d-none d-md-inline"></span>
                            <button class="btn btn-sm btn-outline-secondary" id="btn-refresh-plan" title="Refresh Plans"> <i class="fas fa-sync-alt"></i> </button>
                        </div>
                    </div>
                </div>
            </header>

            <div class="dashboard-container">
                <section class="dashboard-section" id="planning-section">
                    <div id="planning-view">
                        <div class="planning-section-content">
                            <div class="row g-3 planning-top-row">
                                <div class="col-lg-8 h-100">
                                    <div class="card shadow-sm chart-card-plan h-100">
                                        <div class="card-header fw-bold text-truncate"> Plan vs Actual (<span id="chartDateDisplay"></span>) </div>
                                        <div class="card-body"> <canvas id="planVsActualChart"></canvas> </div>
                                    </div>
                                </div>
                                <div class="col-lg-4 h-100">
                                    <div class="card shadow-sm calendar-card h-100">
                                        <div class="card-header d-flex justify-content-between align-items-center">
                                            <div class="d-flex align-items-center gap-1">
                                                <button id="calendar-prev-button" class="btn btn-sm btn-outline-secondary" title="Previous month/week">
                                                    <i class="bi bi-chevron-left"></i>
                                                </button>
                                                <button id="calendar-next-button" class="btn btn-sm btn-outline-secondary" title="Next month/week">
                                                    <i class="bi bi-chevron-right"></i>
                                                </button>
                                                <button id="calendar-today-button" class="btn btn-sm btn-outline-secondary ms-1">Today</button>
                                            </div>

                                            <span id="calendar-title" class="fw-bold mx-2 text-truncate" style="font-size: 1rem;">Planning Calendar</span> <div class="d-flex align-items-center gap-1">
                                                <div class="btn-group btn-group-sm" role="group" aria-label="Calendar View">
                                                    <button id="calendar-month-view-button" type="button" class="btn btn-outline-primary active">Month</button>
                                                    <button id="calendar-week-view-button" type="button" class="btn btn-outline-primary">Week</button>
                                                </div>
                                                <button id="backToCalendarBtn" class="btn btn-sm btn-outline-secondary ms-2" style="display: none;"> <i class="fas fa-arrow-left me-1"></i> Back </button>
                                            </div>
                                        </div>
                                        <div class="card-body p-0">
                                            <div id="planningCalendarContainer"> Loading Calendar... </div>
                                            <div id="dlotViewContainer" class="dlot-view-container">
                                                <div class="card shadow-sm flex-grow-1" id="dlot-entry-card">                                 
                                                    <div class="card-body p-2 d-flex flex-column">
                                                        <div class="mb-2">
                                                            <div class="row g-2">
                                                                <div class="col-4">
                                                                    <div class="card text-center text-bg-secondary text-white h-100"> <div class="stat-card-header py-0 px-2 small">Direct Labor (DL)</div>
                                                                        <div class="card-body stat-card-body py-1"><h4 class="card-title mb-0" id="dl-cost-summary-display" style="font-size: 1rem;">0.00</h4></div>
                                                                    </div>
                                                                </div>
                                                                <div class="col-4">
                                                                    <div class="card text-center text-bg-secondary text-white h-100"> <div class="stat-card-header py-0 px-2 small">Overtime (OT)</div>
                                                                        <div class="card-body stat-card-body py-1"><h4 class="card-title mb-0" id="ot-cost-summary-display" style="font-size: 1rem;">0.00</h4></div>
                                                                    </div>
                                                                </div>
                                                                <div class="col-4">
                                                                    <div class="card text-center text-bg-primary h-100" id="total-dlot-summary-card"> <div class="stat-card-header py-0 px-2 small">Total DLOT</div>
                                                                        <div class="card-body stat-card-body py-1"><h4 class="card-title mb-0" id="total-dlot-summary-display" style="font-size: 1rem;">0.00</h4></div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <!--<hr class="my-3">-->

                                                        <form id="dlot-entry-form" class="flex-grow-1 d-flex flex-column">
                                                            <span id="dlotDateDisplayEntry" class="visually-hidden"></span>
                                                            <input type="hidden" id="dlot-entry-date">
                                                            <div class="row g-2 mb-2">
                                                                <div class="col-md-4">
                                                                    <label for="dlot-headcount" class="form-label small mb-0">Headcount:</label>
                                                                    <input type="number" class="form-control form-control-sm" id="dlot-headcount" placeholder="0" min="0" step="1">
                                                                </div>
                                                                <div class="col-md-4">
                                                                    <label for="dlot-dl-cost" class="form-label small mb-0">Direct Labor (DL):</label>
                                                                    <input type="number" class="form-control form-control-sm" id="dlot-dl-cost" placeholder="0.00" min="0" step="0.01">
                                                                </div>
                                                                <div class="col-md-4">
                                                                    <label for="dlot-ot-cost" class="form-label small mb-0">Overtime (OT):</label>
                                                                    <input type="number" class="form-control form-control-sm" id="dlot-ot-cost" placeholder="0.00" min="0" step="0.01">
                                                                </div>
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
                            <div class="card border-1 shadow-sm d-flex flex-column flex-grow-1" style="min-height: 0;">
                                <div class="card-header d-flex justify-content-between align-items-center">
                                    <span class="fw-bold mx-2 text-truncate">Production Plan Details</span> 
                                    <div class="d-flex gap-2">
                                        <button class="btn btn-sm btn-warning py-1 px-2" id="btnCalculateCarryOver" title="Calculate missing carry-over values up to today"> <i class="fas fa-calculator me-1"></i> Calc C/O </button>
                                        <button class="btn btn-sm btn-success" id="btnAddPlan"> <i class="fas fa-plus me-1"></i> Add Plan </button>
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
                            </div>
                        </div>
                    </div>
                </section>
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