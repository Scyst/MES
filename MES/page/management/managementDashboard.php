<?php
    // Include ไฟล์ check_auth.php เพื่อตรวจสอบสิทธิ์การเข้าถึง
    include_once("../../auth/check_auth.php");

    // --- กำหนดสิทธิ์การเข้าถึงหน้านี้ ---
    if (!hasRole(['admin', 'creator'])) {
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
        /* CSS เดิม */
        .table th:first-child, .table td:first-child { width: 3%; text-align: center; }
        .table th:last-child, .table td:last-child { width: 10%; text-align: center; }

        /* Stat Cards */
        .stat-card-header { font-size: 0.8rem; font-weight: 500; padding: 0.5rem 1rem; opacity: 0.9; }
        .stat-card-body h4 { font-size: 1.75rem; font-weight: 700; }
        .stat-card-body small { font-size: 0.9rem; font-weight: 500; }
        #dlot-entry-card, #cost-summary-card { height: 100%; }

        /* Editable Note */
        .editable-note { cursor: pointer; min-width: 100px; display: inline-block; }
        .editable-note:hover { background-color: var(--bs-tertiary-bg); outline: 1px dashed var(--bs-secondary); }
        .editable-note:focus { background-color: var(--bs-light); outline: 1px solid var(--bs-primary); cursor: text; }
        [data-bs-theme="dark"] .editable-note:focus { background-color: var(--bs-gray-700); }

        /* ⭐️ เพิ่ม: ทำให้ Tab Content ยืดเต็มพื้นที่ที่เหลือ ⭐️ */
        #main-content {
            display: flex;
            flex-direction: column;
            height: 100vh; /* ให้ main content สูงเต็ม viewport */
            overflow: hidden; /* ป้องกัน scrollbar ซ้อน */
        }
         /* ปรับ Container หลัก */
        .dashboard-container {
            flex-grow: 1; /* ให้ container นี้ยืดเต็มพื้นที่ */
            display: flex;
            flex-direction: column;
            min-height: 0; /* สำหรับ Flexbox bug */
            padding-top: 1rem; /* เพิ่มระยะห่างด้านบนเล็กน้อย */
        }
        .tab-content {
            flex-grow: 1; /* ให้ tab content ยืดเต็มพื้นที่ */
            display: flex; /* ทำให้ tab-pane ที่ active ยืดได้ */
            min-height: 0;
            overflow-y: auto; /* เพิ่ม Scrollbar ให้ Tab Content ถ้าจำเป็น */
            padding-bottom: 70px; /* กันพื้นที่ให้ Pagination Footer */
        }
        .tab-pane {
            width: 100%;
            /* เราจะใช้ d-flex ใน .tab-pane.active เพื่อควบคุมการยืด */
        }
        .tab-pane.active {
             display: flex !important; /* บังคับให้แสดงเป็น flex */
             flex-direction: column;
        }
        /* ปรับ content-wrapper ของ Shipment ให้ยืดหยุ่น */
        #shipment-tab-pane .content-wrapper {
             flex-grow: 1;
             display: flex;
             flex-direction: column;
             min-height: 0;
             overflow: hidden; /* ให้ Scrollbar อยู่ที่ .tab-content */
        }
         #shipment-tab-pane .table-responsive {
            flex-grow: 1;
            overflow-y: auto; /* Scrollbar ของตาราง */
            min-height: 0;
        }

    </style>
</head>

<body class="page-with-table"> <div class="page-container">
        <?php include_once('../components/php/nav_dropdown.php'); ?>

        <main id="main-content">
            <?php include_once('../components/php/spinner.php'); ?>

             <div class="container-fluid pt-3"> <div class="d-flex justify-content-between align-items-center mb-3">
                     <h2 class="mb-0">Management Dashboard</h2>
                 </div>

                 <ul class="nav nav-tabs" id="managementTab" role="tablist">
                    <li class="nav-item" role="presentation">
                        <button class="nav-link active" id="cost-dlot-tab" data-bs-toggle="tab" data-bs-target="#cost-dlot-tab-pane" type="button" role="tab" aria-controls="cost-dlot-tab-pane" aria-selected="true">
                            <i class="fas fa-dollar-sign me-1"></i> Cost & DLOT Entry
                        </button>
                    </li>
                    <li class="nav-item" role="presentation">
                        <button class="nav-link" id="shipment-tab" data-bs-toggle="tab" data-bs-target="#shipment-tab-pane" type="button" role="tab" aria-controls="shipment-tab-pane" aria-selected="false">
                            <i class="fas fa-truck me-1"></i> Shipment Confirmation
                        </button>
                    </li>
                </ul>
             </div> <div class="tab-content dashboard-container" id="managementTabContent">

                <div class="tab-pane fade show active" id="cost-dlot-tab-pane" role="tabpanel" aria-labelledby="cost-dlot-tab">
                    <div class="container-fluid pt-3"> <div class="row mb-4" id="dlot-section">
                            <div class="col-lg-8 mb-3 mb-lg-0">
                                <div class="card h-100" id="cost-summary-card">
                                    <div class="card-header d-flex flex-wrap justify-content-between align-items-center gap-2 p-3">
                                        <h5 class="mb-0 card-title">
                                            <i class="fas fa-chart-line me-2 text-primary"></i>Cost Summary (Std vs. Actual)
                                        </h5>
                                        <div class="d-flex flex-wrap gap-2 align-items-center">
                                            <input type="date" id="cost-summary-start-date" class="form-control form-control-sm" style="width: auto;" title="Start Date">
                                            <span class="text-muted">-</span>
                                            <input type="date" id="cost-summary-end-date" class="form-control form-control-sm" style="width: auto;" title="End Date">
                                            <select id="cost-summary-line" class="form-select form-select-sm" style="width: auto;" title="Select Line">
                                                <option value="ALL">All Lines</option>
                                                </select>
                                            <button class="btn btn-sm btn-outline-primary" id="btn-refresh-cost-summary" title="Refresh Summary">
                                                <i class="fas fa-sync-alt"></i>
                                            </button>
                                        </div>
                                    </div>
                                    <div class="card-body p-3">
                                        <div class="row g-3">
                                            <div class="col-md-4">
                                                <div class="card text-center text-bg-secondary h-100">
                                                    <div class="stat-card-header">Standard DL Cost</div>
                                                    <div class="card-body stat-card-body py-3 d-flex flex-column justify-content-center">
                                                        <h4 class="card-title mb-1" id="std-dl-cost-display">0.00</h4>
                                                        <small class="text-white-80">THB</small>
                                                    </div>
                                                </div>
                                            </div>
                                            <div class="col-md-4">
                                                <div class="card text-center text-bg-primary h-100">
                                                    <div class="stat-card-header">Actual DLOT Cost</div>
                                                    <div class="card-body stat-card-body py-3 d-flex flex-column justify-content-center">
                                                        <h4 class="card-title mb-1" id="actual-dlot-cost-display">0.00</h4>
                                                        <small class="text-white-80">THB</small>
                                                    </div>
                                                </div>
                                            </div>
                                            <div class="col-md-4">
                                                <div class="card text-center h-100" id="variance-card">
                                                    <div class="stat-card-header">Variance</div>
                                                    <div class="card-body stat-card-body py-3 d-flex flex-column justify-content-center">
                                                        <h4 class="card-title mb-1" id="dl-variance-display">0.00</h4>
                                                        <small class="text-white-80">THB</small>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="col-lg-4">
                                <div class="card h-100" id="dlot-entry-card">
                                    <div class="card-header p-3">
                                        <h5 class="mb-0 card-title">
                                            <i class="fas fa-edit me-2 text-success"></i>บันทึกต้นทุนจริงรายวัน
                                        </h5>
                                    </div>
                                    <div class="card-body p-3 d-flex flex-column">
                                        <form id="dlot-entry-form" class="flex-grow-1 d-flex flex-column">
                                            <div class="row g-3 mb-3">
                                                <div class="col-sm-6">
                                                    <label for="dlot-entry-date" class="form-label small mb-1">วันที่:</label>
                                                    <input type="date" class="form-control form-control-sm" id="dlot-entry-date" required>
                                                </div>
                                                <div class="col-sm-6">
                                                    <label for="dlot-entry-line" class="form-label small mb-1">Line:</label>
                                                    <select id="dlot-entry-line" class="form-select form-select-sm">
                                                        <option value="ALL" selected>All Lines (ยอดรวม)</option>
                                                        </select>
                                                </div>
                                            </div>
                                            <div class="mb-2">
                                                <label for="dlot-headcount" class="form-label small mb-1">จำนวนคน (คน):</label>
                                                <input type="number" class="form-control form-control-sm" id="dlot-headcount" placeholder="0" min="0" step="1">
                                            </div>
                                            <div class="mb-2">
                                                <label for="dlot-dl-cost" class="form-label small mb-1">ค่าแรง (DL) (THB):</label>
                                                <input type="number" class="form-control form-control-sm" id="dlot-dl-cost" placeholder="0.00" min="0" step="0.01">
                                            </div>
                                            <div class="mb-3">
                                                <label for="dlot-ot-cost" class="form-label small mb-1">ค่าล่วงเวลา (OT) (THB):</label>
                                                <input type="number" class="form-control form-control-sm" id="dlot-ot-cost" placeholder="0.00" min="0" step="0.01">
                                            </div>
                                            <div class="mt-auto">
                                                <button type="submit" class="btn btn-success w-100" id="btn-save-dlot">
                                                    <i class="fas fa-save me-1"></i> บันทึกข้อมูล
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                </div>
                            </div>
                        </div></div> </div> <div class="tab-pane fade" id="shipment-tab-pane" role="tabpanel" aria-labelledby="shipment-tab">
                     <div class="content-wrapper"> <div class="sticky-bar">
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
                            <table class="table table-striped table-hover table-sm"> <thead>
                                    <tr>
                                        <th style="width: 3%;" class="text-center"><input class="form-check-input" type="checkbox" id="selectAllCheckbox"></th>
                                        <th style="width: 12%;">Time</th>
                                        <th style="width: 15%;">Item (SAP / Part No)</th>
                                        <th style="width: 15%;">Transfer Path</th>
                                        <th style="width: 10%;" class="text-center">Quantity</th>
                                        <th>Notes</th> <th style="width: 8%;" class="text-center">Status</th>
                                        <th style="width: 10%;" class="text-center">Actions</th> </tr>
                                </thead>
                                <tbody id="shipmentsTableBody">
                                    <tr><td colspan="8" class="text-center">Loading shipments...</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div> </div> </div> <nav class="pagination-footer">
                 <ul class="pagination justify-content-center" id="shipmentPagination"></ul>
                 </nav>

            <div id="toast"></div>
            <?php
                include_once('../components/php/command_center.php');
                include_once('../components/php/docking_sidebar.php');
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

    <script>
        const currentUser = <?php echo json_encode($currentUserForJS); ?>;
        const SHIPMENT_API = 'api/shipment.php';
        const DLOT_API = 'api/dlot_manual_manage.php';
        const FILTERS_API = '../OEE_Dashboard/api/get_dashboard_filters.php';
    </script>

    <script src="../components/js/pagination.js?v=<?php echo filemtime('../components/js/pagination.js'); ?>"></script>
    <script src="../components/js/sendRequest.js?v=<?php echo filemtime('../components/js/sendRequest.js'); ?>"></script>
    <script src="../../utils/libs/xlsx.full.min.js"></script>
    <script src="script/managementDashboard.js?v=<?php echo filemtime('script/managementDashboard.js'); ?>"></script>

</body>
</html>