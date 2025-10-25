<?php
    // Include ไฟล์ check_auth.php
    include_once("../../auth/check_auth.php");

    // --- กำหนดสิทธิ์ ---
    if (!hasRole(['admin', 'creator', 'planner'])) { // <--- เพิ่ม Role 'planner' ถ้าจำเป็น
        header("Location: ../OEE_Dashboard/OEE_Dashboard.php");
        exit;
    }

    $currentUserForJS = $_SESSION['user'] ?? null;
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <title>Management Dashboard</title>
    <?php include_once '../components/common_head.php'; ?>
    <style>
        /* --- Base Styles --- */
        .table th:first-child, .table td:first-child { width: 3%; text-align: center; } /* Shipment Checkbox */
        .summary-bar { /* ... เหมือนเดิม ... */ }

        /* --- Stat Cards --- */
        .stat-card-header { font-size: 0.8rem; font-weight: 500; padding: 0.5rem 1rem; opacity: 0.9; }
        .stat-card-body h4 { font-size: 1.75rem; font-weight: 700; }
        .stat-card-body small { font-size: 0.9rem; font-weight: 500; }

        /* --- Editable Fields --- */
        .editable-note, .editable-plan { cursor: pointer; min-width: 80px; display: inline-block; padding: 0.25rem 0.5rem; }
        .editable-note:hover, .editable-plan:hover { background-color: var(--bs-tertiary-bg); outline: 1px dashed var(--bs-secondary); }
        .editable-note:focus, .editable-plan:focus { background-color: var(--bs-light); outline: 1px solid var(--bs-primary); cursor: text; }
        [data-bs-theme="dark"] .editable-note:focus,
        [data-bs-theme="dark"] .editable-plan:focus { background-color: var(--bs-gray-700); }
        .editable-plan { text-align: right; }

        /* --- Tab & Layout --- */
        #main-content { display: flex; flex-direction: column; height: 100vh; overflow: hidden; }
        .dashboard-container { flex-grow: 1; display: flex; flex-direction: column; min-height: 0; padding-top: 1rem; }
        .tab-content { flex-grow: 1; display: flex; min-height: 0; overflow-y: auto; padding-bottom: 70px; /* Space for footer */ }
        .tab-pane { width: 100%; }
        .tab-pane.active { display: flex !important; flex-direction: column; } /* Ensure active tab pane is flex */

        /* --- Layout for Specific Tabs --- */
        #cost-planning-tab-pane > .container-fluid > .row {
            flex-grow: 1; /* Make the row fill the tab pane */
            min-height: 0;
        }
        #cost-planning-tab-pane .left-column,
        #cost-planning-tab-pane .right-column {
            display: flex;
            flex-direction: column;
            min-height: 0; /* Important for nested flex scrolling */
        }
        #cost-planning-tab-pane .planning-table-wrapper {
             flex-grow: 1; /* Make table wrapper fill remaining space */
             overflow-y: auto; /* Enable scrolling for the table */
             min-height: 0;
        }
        #cost-planning-tab-pane #dlot-entry-card {
             flex-grow: 1; /* Allow DLOT card to grow if needed */
             min-height: 0;
             overflow-y: auto; /* Allow DLOT form to scroll if content is long */
        }


        #shipment-tab-pane .content-wrapper { flex-grow: 1; display: flex; flex-direction: column; min-height: 0; overflow: hidden; }
        #shipment-tab-pane .table-responsive { flex-grow: 1; overflow-y: auto; min-height: 0; }

        /* --- Planning Table Specific Widths --- */
        #productionPlanTable th:nth-child(4), #productionPlanTable td:nth-child(4) { min-width: 200px; } /* Item */
        #productionPlanTable th:nth-child(8), #productionPlanTable td:nth-child(8) { min-width: 150px; } /* Note */
        #productionPlanTable th:last-child, #productionPlanTable td:last-child { width: 120px; text-align: center; } /* Actions */

    </style>
</head>

<body class="page-with-table">
    <div class="page-container">
        <?php include_once('../components/php/nav_dropdown.php'); ?>

        <main id="main-content">
            <?php include_once('../components/php/spinner.php'); ?>

             <div class="container-fluid pt-3">
                 <div class="d-flex justify-content-between align-items-center mb-3">
                     <h2 class="mb-0">Management Dashboard</h2>
                 </div>

                 <ul class="nav nav-tabs" id="managementTab" role="tablist">
                    <li class="nav-item" role="presentation">
                        <button class="nav-link active" id="cost-planning-tab" data-bs-toggle="tab" data-bs-target="#cost-planning-tab-pane" type="button" role="tab" aria-controls="cost-planning-tab-pane" aria-selected="true">
                            <i class="fas fa-chart-bar me-1"></i> Costing & Planning
                        </button>
                    </li>
                    <li class="nav-item" role="presentation">
                        <button class="nav-link" id="shipment-tab" data-bs-toggle="tab" data-bs-target="#shipment-tab-pane" type="button" role="tab" aria-controls="shipment-tab-pane" aria-selected="false">
                            <i class="fas fa-truck me-1"></i> Shipment Confirmation
                        </button>
                    </li>
                </ul>
             </div>

             <div class="tab-content dashboard-container" id="managementTabContent">

                <div class="tab-pane fade show active" id="cost-planning-tab-pane" role="tabpanel" aria-labelledby="cost-planning-tab">
                    <div class="container-fluid pt-3 h-100"> <div class="row h-100"> <div class="col-lg-8 left-column">
                                <div class="sticky-bar bg-light p-2 rounded mb-3 shadow-sm">
                                    <div class="d-flex flex-wrap justify-content-between align-items-center gap-2" id="plan-filters">
                                        <div class="d-flex flex-wrap gap-2 align-items-center">
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

                                            <button class="btn btn-sm btn-outline-secondary ms-2" id="btn-refresh-plan" title="Refresh Plans">
                                                <i class="fas fa-sync-alt"></i>
                                            </button>
                                            <button class="btn btn-sm btn-outline-warning ms-2 py-1 px-2" id="btnCalculateCarryOver" title="Calculate missing carry-over values up to today">
                                                <i class="fas fa-calculator me-1"></i> Calculate Carry Over
                                            </button>
                                        </div>
                                        <button class="btn btn-success btn-sm" id="btnAddPlan">
                                            <i class="fas fa-plus me-1"></i> Add New Plan
                                        </button>
                                    </div>
                                </div>

                                <div class="planning-table-wrapper table-responsive">
                                    <table class="table table-striped table-hover table-sm" id="productionPlanTable">
                                        <thead class="table-light" style="position: sticky; top: 0; z-index: 1;">
                                            <tr>
                                                <th style="width: 10%;">Date</th>
                                                <th style="width: 10%;">Line</th>
                                                <th style="width: 8%;">Shift</th>
                                                <th>Item (SAP / Part No)</th>
                                                <th style="width: 10%;" class="text-end">Plan Qty</th>
                                                <th style="width: 10%;" class="text-end">Carry Over</th>
                                                <th style="width: 10%;" class="text-end">Adjusted Plan</th>
                                                <th>Note</th>
                                                <th class="text-center">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody id="productionPlanTableBody">
                                            <tr><td colspan="9" class="text-center">Loading plans...</td></tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div> <div class="col-lg-4 right-column">
                                <div class="card mb-3 shadow-sm" id="cost-summary-card">
                                    <div class="card-header d-flex flex-wrap justify-content-between align-items-center gap-2 p-3">
                                        <h6 class="mb-0 card-title fw-bold">
                                            <i class="fas fa-chart-line me-2 text-primary"></i>Cost Summary (Std vs. Actual)
                                        </h6>
                                        <div class="d-flex flex-wrap gap-2 align-items-center">
                                            <input type="date" id="cost-summary-start-date" class="form-control form-control-sm" style="width: auto;" title="Start Date">
                                            <span class="text-muted">-</span>
                                            <input type="date" id="cost-summary-end-date" class="form-control form-control-sm" style="width: auto;" title="End Date">
                                            <select id="cost-summary-line" class="form-select form-select-sm" style="width: auto;" title="Select Line">
                                                <option value="ALL">All Lines</option>
                                            </select>
                                            <button class="btn btn-sm btn-outline-primary py-1 px-2" id="btn-refresh-cost-summary" title="Refresh Summary">
                                                <i class="fas fa-sync-alt"></i>
                                            </button>
                                        </div>
                                    </div>
                                    <div class="card-body p-3">
                                        <div class="row g-2">
                                            <div class="col-12">
                                                <div class="card text-center text-bg-secondary mb-2">
                                                    <div class="stat-card-header py-1">Standard DL Cost</div>
                                                    <div class="card-body stat-card-body py-2">
                                                        <h4 class="card-title mb-0" id="std-dl-cost-display">0.00</h4>
                                                        <small class="text-white-50">THB</small>
                                                    </div>
                                                </div>
                                            </div>
                                            <div class="col-12">
                                                <div class="card text-center text-bg-primary mb-2">
                                                    <div class="stat-card-header py-1">Actual DLOT Cost</div>
                                                    <div class="card-body stat-card-body py-2">
                                                        <h4 class="card-title mb-0" id="actual-dlot-cost-display">0.00</h4>
                                                        <small class="text-white-50">THB</small>
                                                    </div>
                                                </div>
                                            </div>
                                            <div class="col-12">
                                                <div class="card text-center" id="variance-card">
                                                    <div class="stat-card-header py-1">Variance</div>
                                                    <div class="card-body stat-card-body py-2">
                                                        <h4 class="card-title mb-0" id="dl-variance-display">0.00</h4>
                                                        <small class="text-muted">THB</small>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div class="card shadow-sm flex-grow-1" id="dlot-entry-card">
                                    <div class="card-header p-3">
                                        <h6 class="mb-0 card-title fw-bold">
                                            <i class="fas fa-edit me-2 text-success"></i>บันทึกต้นทุนจริงรายวัน
                                        </h6>
                                    </div>
                                    <div class="card-body p-3 d-flex flex-column">
                                        <form id="dlot-entry-form" class="flex-grow-1 d-flex flex-column">
                                             <div class="row g-2 mb-2">
                                                <div class="col-sm-6">
                                                    <label for="dlot-entry-date" class="form-label small mb-1">วันที่:</label>
                                                    <input type="date" class="form-control form-control-sm" id="dlot-entry-date" required>
                                                </div>
                                                <div class="col-sm-6">
                                                    <label for="dlot-entry-line" class="form-label small mb-1">Line:</label>
                                                    <select id="dlot-entry-line" class="form-select form-select-sm">
                                                        <option value="ALL" selected>All Lines</option>
                                                        {/* JS Lines */}
                                                    </select>
                                                </div>
                                            </div>
                                            <div class="mb-2">
                                                <label for="dlot-headcount" class="form-label small mb-1">จำนวนคน:</label>
                                                <input type="number" class="form-control form-control-sm" id="dlot-headcount" placeholder="0" min="0" step="1">
                                            </div>
                                            <div class="mb-2">
                                                <label for="dlot-dl-cost" class="form-label small mb-1">ค่าแรง (DL):</label>
                                                <input type="number" class="form-control form-control-sm" id="dlot-dl-cost" placeholder="0.00" min="0" step="0.01">
                                            </div>
                                            <div class="mb-3">
                                                <label for="dlot-ot-cost" class="form-label small mb-1">ค่าล่วงเวลา (OT):</label>
                                                <input type="number" class="form-control form-control-sm" id="dlot-ot-cost" placeholder="0.00" min="0" step="0.01">
                                            </div>
                                            <div class="mt-auto pt-2"> 
                                                <button type="submit" class="btn btn-success w-100" id="btn-save-dlot">
                                                    <i class="fas fa-save me-1"></i> บันทึกข้อมูล
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                </div>
                            </div> </div> </div> </div> <div class="tab-pane fade" id="shipment-tab-pane" role="tabpanel" aria-labelledby="shipment-tab">
                     <div class="content-wrapper">
                        <div class="sticky-bar">
                            <div class="container-fluid">
                                <div class="row my-3 align-items-center">
                                    <div class="col-lg-9">
                                        <div class="filter-controls-wrapper d-flex flex-wrap gap-2" id="shipment-filters">
                                            <div class="btn-group d-flex" role="group" aria-label="Shipment Status Filter">
                                                <input type="radio" class="btn-check" name="shipmentStatus" id="statusAll" value="all" autocomplete="off" checked>
                                                <label class="btn btn-outline-secondary btn-sm flex-fill" for="statusAll">All</label>
                                                <input type="radio" class="btn-check" name="shipmentStatus" id="statusPending" value="pending" autocomplete="off">
                                                <label class="btn btn-outline-primary btn-sm flex-fill" for="statusPending">Pending</label>
                                                <input type="radio" class="btn-check" name="shipmentStatus" id="statusShipped" value="shipped" autocomplete="off">
                                                <label class="btn btn-outline-success btn-sm flex-fill" for="statusShipped">Shipped</label>
                                                <input type="radio" class="btn-check" name="shipmentStatus" id="statusRejected" value="rejected" autocomplete="off">
                                                <label class="btn btn-outline-danger btn-sm flex-fill" for="statusRejected">Rejected</label>
                                            </div>
                                            <input type="search" id="shipmentSearch" class="form-control form-control-sm flex-grow-1" style="min-width: 200px;" placeholder="Search...">
                                            <input type="date" id="shipmentStartDate" class="form-control form-control-sm" style="width: auto;">
                                            <span>-</span>
                                            <input type="date" id="shipmentEndDate" class="form-control form-control-sm" style="width: auto;">
                                        </div>
                                    </div>
                                    <div class="col-lg-3">
                                        <div class="d-flex justify-content-end gap-2">
                                            <button class="btn btn-outline-success btn-sm" id="exportHistoryBtn"><i class="fas fa-file-excel"></i> Export</button>
                                            <button class="btn btn-danger btn-sm" id="rejectSelectedBtn" disabled><i class="fas fa-ban"></i> Reject</button>
                                            <button class="btn btn-primary btn-sm" id="confirmSelectedBtn" disabled><i class="fas fa-check-double"></i> Confirm</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="summary-bar" id="shipmentSummaryBar" style="display: none;">
                             <div class="container-fluid">Total Selected Qty: <span id="totalSelectedQty">0</span></div>
                        </div>
                        <div class="table-responsive">
                            <table class="table table-striped table-hover table-sm">
                                <thead>
                                    <tr>
                                        <th style="width: 3%;" class="text-center"><input class="form-check-input" type="checkbox" id="selectAllCheckbox"></th>
                                        <th style="width: 12%;">Time</th>
                                        <th style="width: 15%;">Item (SAP / Part No)</th>
                                        <th style="width: 15%;">Transfer Path</th>
                                        <th style="width: 10%;" class="text-center">Quantity</th>
                                        <th>Notes</th>
                                        <th style="width: 8%;" class="text-center">Status</th>
                                        <th style="width: 10%;" class="text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody id="shipmentsTableBody">
                                    <tr><td colspan="8" class="text-center">Loading shipments...</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div> </div> <nav class="pagination-footer">
                 <ul class="pagination justify-content-center" id="shipmentPagination"></ul>
                 <ul class="pagination justify-content-center" id="planPagination" style="display: none;"></ul>
            </nav>

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
                    <p>Loading form...</p>
                </div>
                <div class="modal-footer">
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
    <script src="https://cdn.jsdelivr.net/npm/@tarekraafat/autocomplete.js@10.2.7/dist/autoComplete.min.js"></script>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tarekraafat/autocomplete.js@10.2.7/dist/css/autoComplete.02.min.css">
    <script src="script/managementDashboard.js?v=<?php echo filemtime('script/managementDashboard.js'); ?>"></script>

</body>
</html> 