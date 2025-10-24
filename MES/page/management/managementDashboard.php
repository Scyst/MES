<?php
    // Include ไฟล์ check_auth.php เพื่อตรวจสอบสิทธิ์การเข้าถึง
    include_once("../../auth/check_auth.php");

    // --- กำหนดสิทธิ์การเข้าถึงหน้านี้ ---
    // ตัวอย่าง: อนุญาตเฉพาะ admin และ creator (ปรับแก้ตาม Role ที่ต้องการ)
    if (!hasRole(['admin', 'creator'])) {
        // ถ้าไม่มีสิทธิ์ ให้ Redirect ไปหน้าอื่น หรือแสดงข้อความ Error
        header("Location: ../OEE_Dashboard/OEE_Dashboard.php"); // Redirect ไปหน้า Dashboard หลัก
        exit;
    }

    // (Optional) ส่งข้อมูล User ปัจจุบันไปให้ JavaScript ถ้าต้องการ
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
        .summary-bar { /* ... เหมือนเดิม ... */ }

        /* ⭐️ เพิ่ม: ทำให้ Note แก้ไขได้ */
        .editable-note {
            cursor: pointer;
            min-width: 100px; /* กำหนดความกว้างขั้นต่ำ */
            display: inline-block; /* ทำให้ min-width ทำงาน */
        }
        .editable-note:hover {
            background-color: var(--bs-tertiary-bg); /* Highlight ตอน Hover */
            outline: 1px dashed var(--bs-secondary);
        }
        .editable-note:focus {
            background-color: var(--bs-light); /* สีพื้นหลังตอนแก้ไข */
            outline: 1px solid var(--bs-primary);
            cursor: text;
        }
        [data-bs-theme="dark"] .editable-note:focus {
             background-color: var(--bs-gray-700);
        }
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
            </div>

            <div class="content-wrapper">
                <div class="sticky-bar">
                     <div class="container-fluid">
                        <div class="row my-3 align-items-center">
                            <div class="col-md-9">
                                <div class="filter-controls-wrapper d-flex flex-wrap gap-2" id="shipment-filters">
                                    <div class="btn-group" role="group" aria-label="Shipment Status Filter">
                                        <input type="radio" class="btn-check" name="shipmentStatus" id="statusPending" value="pending" autocomplete="off" checked>
                                        <label class="btn btn-outline-primary btn-sm" for="statusPending">Pending</label>
                                        <input type="radio" class="btn-check" name="shipmentStatus" id="statusShipped" value="shipped" autocomplete="off">
                                        <label class="btn btn-outline-primary btn-sm" for="statusShipped">Shipped</label>
                                        <input type="radio" class="btn-check" name="shipmentStatus" id="statusRejected" value="rejected" autocomplete="off">
                                         <label class="btn btn-outline-danger btn-sm" for="statusRejected">Rejected</label>
                                        <input type="radio" class="btn-check" name="shipmentStatus" id="statusAll" value="all" autocomplete="off">
                                        <label class="btn btn-outline-secondary btn-sm" for="statusAll">All</label>
                                    </div>
                                    <input type="search" id="shipmentSearch" class="form-control form-control-sm flex-grow-1" style="min-width: 200px;" placeholder="Search...">
                                    <input type="date" id="shipmentStartDate" class="form-control form-control-sm" style="width: auto;">
                                    <span>-</span>
                                    <input type="date" id="shipmentEndDate" class="form-control form-control-sm" style="width: auto;">
                                </div>
                            </div>
                            <div class="col-md-3">
                                <div class="d-flex justify-content-end gap-2">
                                     <button class="btn btn-outline-success btn-sm" id="exportHistoryBtn"><i class="fas fa-file-excel"></i> Export</button>
                                     <button class="btn btn-danger btn-sm" id="rejectSelectedBtn" disabled><i class="fas fa-ban"></i> Reject Selected</button>
                                    <button class="btn btn-primary btn-sm" id="confirmSelectedBtn" disabled><i class="fas fa-check-double"></i> Confirm Selected</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="summary-bar" id="shipmentSummaryBar" style="display: none;"> /*...*/ </div>

                <div class="table-responsive">
                    <table class="table table-striped table-hover">
                        <thead>
                            <tr>
                                <th style="width: 3%;" class="text-center"><input class="form-check-input" type="checkbox" id="selectAllCheckbox"></th>
                                <th style="width: 10%;">Status</th>
                                <th style="width: 12%;">Date</th>
                                <th style="width: 20%;">Item (SAP / Part No)</th>
                                <th style="width: 10%;" class="text-end">Quantity</th>
                                <th style="width: 15%;">Transfer Path</th>
                                <th>Notes</th>
                                <th style="width: 15%;" class="text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="shipmentsTableBody">
                            <tr><td colspan="8" class="text-center">Loading shipments...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <nav class="pagination-footer">
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
    </script>
    <script src="../components/js/pagination.js?v=<?php echo filemtime('../components/js/pagination.js'); ?>"></script>
    <script src="../components/js/sendRequest.js?v=<?php echo filemtime('../components/js/sendRequest.js'); ?>"></script>
    <script src="../../utils/libs/xlsx.full.min.js"></script>
    <script src="script/managementDashboard.js?v=<?php echo filemtime('script/managementDashboard.js'); ?>"></script>

</body>
</html>