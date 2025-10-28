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
    <style>
        /* ใช้ CSS หลักจาก style.css เป็นส่วนใหญ่ */
        /* CSS เฉพาะกิจเล็กน้อย */
        .planning-section-content {
            flex-grow: 1;
            display: flex;
            flex-direction: column;
            min-height: 0; /* Important for flex scrolling */
            gap: 1rem; /* Spacing between rows */
        }

        .planning-top-row {
            flex-shrink: 0; /* Prevent top row from shrinking */
            height: calc(50vh - 70px);
        }

        .planning-table-wrapper {
            flex-grow: 1; /* Allow table wrapper to take remaining height */
            overflow-y: auto;
            min-height: 0;
            position: relative;
            border: 1px solid var(--bs-border-color); /* Add border for clarity */
            border-radius: var(--bs-card-border-radius);
        }
        .planning-table-wrapper thead {
            position: sticky; top: 0; z-index: 1;
            background-color: var(--bs-tertiary-bg);
        }
        [data-bs-theme="dark"] .planning-table-wrapper thead {
            background-color: var(--bs-secondary-bg);
        }

        .chart-card-plan, .calendar-card-placeholder {
            height: 450px; /* Adjust height for top row cards */
            display: flex; flex-direction: column;
         }
        .chart-card-plan .card-body, .calendar-card-placeholder .card-body {
            position: relative; flex-grow: 1; padding: 0.5rem; min-height: 0;
         }
         .calendar-card-placeholder .card-body {
            display: flex; align-items: center; justify-content: center;
            font-style: italic; color: var(--bs-secondary-color);
         }


        /* Adjustments for editable fields and column widths from style.css */
        .editable-note, .editable-plan { cursor: pointer; min-width: 80px; display: inline-block; padding: 0.25rem 0.5rem; }
        .editable-note:hover, .editable-plan:hover { background-color: var(--bs-tertiary-bg); outline: 1px dashed var(--bs-secondary); }
        .editable-note:focus, .editable-plan:focus { background-color: var(--bs-light); outline: 1px solid var(--bs-primary); cursor: text; }
        [data-bs-theme="dark"] .editable-note:focus, [data-bs-theme="dark"] .editable-plan:focus { background-color: var(--bs-gray-700); }
        .editable-plan { text-align: right; }
        #productionPlanTable th:nth-child(4), #productionPlanTable td:nth-child(4) { min-width: 200px; }
        #productionPlanTable th:nth-child(9), #productionPlanTable td:nth-child(9) { min-width: 150px; }
        #productionPlanTable th:last-child, #productionPlanTable td:last-child { width: 120px; text-align: center; }

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
                    <div class="text-end">
                        <p id="date" class="mb-0"></p>
                        <p id="time" class="mb-0"></p>
                    </div>
                </div>
                <div class="row">
                    <div class="col-12">
                         <div class="d-flex flex-wrap justify-content-center align-items-center gap-2" id="planning-global-filters">
                             <label for="planDateFilter" class="form-label mb-0 small">Date:</label>
                             <input type="date" id="planDateFilter" class="form-control form-control-sm" style="width: auto;">

                             <label for="planLineFilter" class="form-label mb-0 small ms-lg-2">Line:</label>
                             <select id="planLineFilter" class="form-select form-select-sm" style="width: auto; min-width: 120px;">
                                 <option value="">All Lines</option>
                             </select>

                             <label for="planShiftFilter" class="form-label mb-0 small ms-lg-2">Shift:</label>
                             <select id="planShiftFilter" class="form-select form-select-sm" style="width: auto;">
                                 <option value="">All Shifts</option>
                                 <option value="DAY">DAY</option>
                                 <option value="NIGHT">NIGHT</option>
                             </select>
                            <span class="vr mx-1 d-none d-md-inline"></span>
                             <button class="btn btn-sm btn-outline-secondary" id="btn-refresh-plan" title="Refresh Plans">
                                 <i class="fas fa-sync-alt"></i>
                             </button>
                             <button class="btn btn-sm btn-outline-warning py-1 px-2" id="btnCalculateCarryOver" title="Calculate missing carry-over values up to today">
                                 <i class="fas fa-calculator me-1"></i> Calc C/O
                             </button>
                             <button class="btn btn-sm btn-success" id="btnAddPlan">
                                <i class="fas fa-plus me-1"></i> Add Plan
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <div class="dashboard-container">

                <section class="dashboard-section" id="planning-section">
                    <div class="planning-section-content">
                        <div class="row g-3 planning-top-row">
                             <div class="col-lg-8">
                                  <div class="card shadow-sm chart-card-plan h-100">
                                       <div class="card-header">
                                            Plan vs Actual (<span id="chartDateDisplay"></span>)
                                       </div>
                                       <div class="card-body">
                                            <canvas id="planVsActualChart"></canvas>
                                       </div>
                                  </div>
                             </div>
                             <div class="col-lg-4">
                                  <div class="card shadow-sm calendar-card-placeholder h-100">
                                       <div class="card-header">
                                            Planning Calendar
                                       </div>
                                       <div class="card-body">
                                            <div id="planningCalendarContainer" style="width:100%; height: 100%;">
                                                Calendar View Placeholder
                                            </div>
                                       </div>
                                  </div>
                             </div>
                        </div>

                         <div class="planning-table-wrapper">
                              <table class="table table-striped table-hover table-sm" id="productionPlanTable">
                                   <thead class="table-light">
                                        <tr>
                                            <th style="width: 10%;">Date</th>
                                            <th style="width: 10%;">Line</th>
                                            <th style="width: 8%;">Shift</th>
                                            <th>Item (SAP / Part No)</th>
                                            <th style="width: 10%;" class="text-center">Plan Qty</th>
                                            <th style="width: 10%;" class="text-center">Actual Qty</th>
                                            <th style="width: 10%;" class="text-center">Carry Over</th>
                                            <th style="width: 10%;" class="text-center">Adjusted Plan</th>
                                            <th class="text-center">Note</th>
                                            <th class="text-center">Actions</th>
                                        </tr>
                                   </thead>
                                   <tbody id="productionPlanTableBody">
                                        <tr><td colspan="10" class="text-center">Loading plans...</td></tr>
                                   </tbody>
                              </table>
                         </div>
                    </div>
                </section>

            </div>

            <div id="toast"></div>
            <?php
                 include_once('../components/php/command_center.php');
                 include_once('../components/php/docking_sidebar.php');
                 include_once('components/planModal.php');
            ?>

        </main>
    </div>

     <div class="modal fade" id="rejectReasonModal" tabindex="-1" aria-labelledby="rejectReasonModalLabel" aria-hidden="true">
         <div class="modal-dialog modal-sm modal-dialog-centered">
         <div class="modal-content">
           <div class="modal-header">
             <h5 class="modal-title" id="rejectReasonModalLabel">Rejection Reason</h5>
             <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
           </div>
           <div class="modal-body">
             <input type="hidden" id="rejectTransactionIds">
             <div class="mb-3">
               <label for="rejectReasonText" class="form-label">Reason (optional):</label>
               <textarea class="form-control" id="rejectReasonText" rows="3"></textarea>
             </div>
           </div>
           <div class="modal-footer">
             <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
             <button type="button" class="btn btn-danger" id="confirmRejectBtn">Confirm Reject</button>
           </div>
         </div>
       </div>
     </div>
     <div class="modal fade" id="planModal" tabindex="-1" aria-labelledby="planModalLabel" aria-hidden="true">
         <div class="modal-dialog modal-lg">
             <div class="modal-content">
                 <div class="modal-header">
                     <h5 class="modal-title" id="planModalLabel">Add/Edit Production Plan</h5>
                     <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                 </div>
                 <div class="modal-body" id="planModalBody">
                      <form id="planForm">
                          <input type="hidden" id="planModalPlanId" value="0">
                          <div class="row g-3">
                              <div class="col-md-4">
                                  <label for="planModalDate" class="form-label">Date</label>
                                  <input type="date" class="form-control" id="planModalDate" required>
                              </div>
                              <div class="col-md-4">
                                  <label for="planModalLine" class="form-label">Line</label>
                                  <select id="planModalLine" class="form-select" required>
                                      <option value="" disabled selected>Select Line...</option>
                                  </select>
                              </div>
                              <div class="col-md-4">
                                  <label for="planModalShift" class="form-label">Shift</label>
                                  <select id="planModalShift" class="form-select" required>
                                      <option value="" disabled selected>Select Shift...</option>
                                      <option value="DAY">DAY</option>
                                      <option value="NIGHT">NIGHT</option>
                                  </select>
                              </div>
                              <div class="col-12">
                                  <label for="planModalItemSearch" class="form-label">Search Item (SAP/Part No./Desc)</label>
                                  <div class="position-relative">
                                      <input type="text" class="form-control" id="planModalItemSearch" autocomplete="off" placeholder="Type min 2 chars...">
                                      <div class="autocomplete-results dropdown-menu" id="planModalItemResults" style="display: none; width: 100%; max-height: 200px; overflow-y: auto;"></div>
                                  </div>
                                  <input type="hidden" id="planModalItemId">
                                  <div class="form-text mt-1" id="planModalSelectedItem">No Item Selected</div>
                                  <div class="invalid-feedback" id="item-search-error" style="display: none;">Please select a valid item from the list.</div>
                              </div>
                              <div class="col-md-6">
                                  <label for="planModalQuantity" class="form-label">Planned Quantity</label>
                                  <input type="number" class="form-control" id="planModalQuantity" min="0" step="any" required>
                              </div>
                              <div class="col-md-6">
                                  <label for="planModalNote" class="form-label">Note</label>
                                  <input type="text" class="form-control" id="planModalNote">
                              </div>
                          </div>
                      </form>
                 </div>
                 <div class="modal-footer">
                     <button type="button" class="btn btn-danger me-auto" id="deletePlanButton" style="display: none;">Delete Plan</button>
                     <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                     <button type="button" class="btn btn-primary" id="savePlanButton">Save Plan</button>
                 </div>
             </div>
         </div>
     </div>


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