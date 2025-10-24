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
                        <button class="nav-link active" id="shipment-confirm-tab" data-bs-toggle="tab" data-bs-target="#shipment-confirm-pane" type="button" role="tab" aria-controls="shipment-confirm-pane" aria-selected="true">
                            Shipment Confirmation
                        </button>
                    </li>
                    <li class="nav-item" role="presentation">
                        <button class="nav-link" id="shipment-history-tab" data-bs-toggle="tab" data-bs-target="#shipment-history-pane" type="button" role="tab" aria-controls="shipment-history-pane" aria-selected="false">
                            Shipment History
                        </button>
                    </li>
                    </ul>
            </div>

            <div class="content-wrapper">
                <div class="tab-content" id="managementTabContent">

                    <div class="tab-pane fade show active" id="shipment-confirm-pane" role="tabpanel" aria-labelledby="shipment-confirm-tab" tabindex="0">
                        <div class="sticky-bar">
                             <div class="container-fluid">
                                <div class="row my-3 align-items-center">
                                    <div class="col-md-8">
                                        <div class="filter-controls-wrapper" id="shipment-filters">
                                            <input type="search" id="shipmentSearch" class="form-control me-2" placeholder="Search Item, Location, User...">
                                            <input type="date" id="shipmentStartDate" class="form-control me-1">
                                            <span>-</span>
                                            <input type="date" id="shipmentEndDate" class="form-control ms-1">
                                        </div>
                                    </div>
                                    <div class="col-md-4">
                                        <div class="d-flex justify-content-end gap-2">
                                            <button class="btn btn-primary" id="confirmSelectedBtn" disabled><i class="fas fa-check-double"></i> Confirm Selected</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="table-responsive">
                            <table class="table table-striped table-hover">
                                <thead>
                                    <tr>
                                        <th style="width: 3%;" class="text-center"><input class="form-check-input" type="checkbox" id="selectAllCheckbox"></th>
                                        <th style="width: 15%;" class="text-start">Request Date</th>
                                        <th style="width: 25%;" class="text-center">Item (SAP / Part No)</th>
                                        <!--<th class="text-center">Description</th>-->
                                        <th style="width: 10%;" class="text-center">Quantity</th>
                                        <th class="text-center">Notes</th>
                                        <th style="width: 15%;" class="text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody id="pendingShipmentsTableBody">
                                    <tr><td colspan="7" class="text-center">Loading pending shipments...</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div><div class="tab-pane fade" id="shipment-history-pane" role="tabpanel" aria-labelledby="shipment-history-tab" tabindex="0">
                        <div class="sticky-bar">
                             <div class="container-fluid">
                                <div class="row my-3 align-items-center">
                                    <div class="col-md-8">
                                        <div class="filter-controls-wrapper" id="history-filters">
                                            <input type="search" id="historySearch" class="form-control me-2" placeholder="Search Item, Location, User...">
                                            <input type="date" id="historyStartDate" class="form-control me-1">
                                            <span>-</span>
                                            <input type="date" id="historyEndDate" class="form-control ms-1">
                                        </div>
                                    </div>
                                    <div class="col-md-4">
                                        <div class="d-flex justify-content-end">
                                             <button class="btn btn-outline-success" id="exportHistoryBtn"><i class="fas fa-file-excel"></i> Export</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="summary-bar" id="historySummaryBar">
                            Total Shipped Quantity: <span id="totalShippedQty">0</span>
                        </div>
                        <div class="table-responsive">
                            <table class="table table-striped table-hover">
                                <thead>
                                    <tr>
                                        <th style="width: 10%;" class="text-start">Shipped Date</th>
                                        <th style="width: 25%;" class="text-center">Item (SAP / Part No)</th>
                                        <!--<th class="text-center">Description</th>-->
                                        <th style="width: 15%;" class="text-center">From</th>
                                        <th style="width: 15%;" class="text-center">To</th>
                                        <th style="width: 10%;" class="text-center">Quantity</th>
                                        <th class="text-center">Notes</th>
                                    </tr>
                                </thead>
                                <tbody id="shipmentHistoryTableBody">
                                    <tr><td colspan="8" class="text-center">Loading shipment history...</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div></div> </div> <nav class="pagination-footer" data-tab-target="#shipment-confirm-pane" style="display: block;"> <ul class="pagination justify-content-center" id="shipmentPagination"></ul>
            </nav>
            <nav class="pagination-footer" data-tab-target="#shipment-history-pane" style="display: none;"> <ul class="pagination justify-content-center" id="historyPagination"></ul>
            </nav>

            <div id="toast"></div>
            <?php
                include_once('../components/php/command_center.php');
                include_once('../components/php/docking_sidebar.php');
            ?>
        </main>
    </div>

    <script>
        const currentUser = <?php echo json_encode($currentUserForJS); ?>;
        const SHIPMENT_API = 'api/shipment.php';
    </script>
    <script src="../components/js/pagination.js?v=<?php echo filemtime('../components/js/pagination.js'); ?>"></script>
    <script src="../../utils/libs/xlsx.full.min.js"></script>
    <script src="script/managementDashboard.js?v=<?php echo filemtime('script/managementDashboard.js'); ?>"></script>

</body>
</html>