<?php 
    require_once __DIR__ . '/../../auth/check_auth.php';
    // กำหนดสิทธิ์การเข้าถึงหน้านี้
    if (!hasRole(['admin', 'creator', 'supervisor', 'operator'])) {
        header("Location: ../OEE_Dashboard/OEE_Dashboard.php");
        exit;
    }
    // กำหนดตัวแปรสำหรับใช้ซ่อน/แสดงปุ่มต่างๆ
    $canManage = hasRole(['admin', 'creator', 'supervisor']); // สิทธิ์ในการจัดการข้อมูลหลัก
    $canTransact = hasRole(['admin', 'creator', 'supervisor', 'operator']); // สิทธิ์ในการทำรายการเบิกจ่าย
    $currentUser = $_SESSION['user'];
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <title>Maintenance Stock</title>
    <?php include_once '../components/common_head.php'; ?>
</head>

<body class="page-with-table">
    <div class="page-container">
        <?php include_once('../components/php/nav_dropdown.php'); ?>

        <main id="main-content">
            <?php include_once('../components/php/spinner.php'); ?>
    
            <div class="container-fluid pt-3">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h2 class="mb-0">Maintenance Spare Parts</h2>
                </div>

                <ul class="nav nav-tabs" id="mtStockTab" role="tablist">
                    <li class="nav-item" role="presentation">
                        <button class="nav-link active" id="onhand-tab" data-bs-toggle="tab" data-bs-target="#onhand-pane" type="button" role="tab"><i class="fas fa-warehouse"></i> Stock On-Hand</button>
                    </li>
                    <li class="nav-item" role="presentation">
                        <button class="nav-link" id="transactions-tab" data-bs-toggle="tab" data-bs-target="#transactions-pane" type="button" role="tab"><i class="fas fa-history"></i> Transaction Log</button>
                    </li>
                    <?php if ($canManage): ?>
                    <li class="nav-item" role="presentation">
                        <button class="nav-link" id="items-tab" data-bs-toggle="tab" data-bs-target="#items-pane" type="button" role="tab"><i class="fas fa-cogs"></i> Item Master</button>
                    </li>
                    <li class="nav-item" role="presentation">
                        <button class="nav-link" id="locations-tab" data-bs-toggle="tab" data-bs-target="#locations-pane" type="button" role="tab"><i class="fas fa-map-marker-alt"></i> Location Master</button>
                    </li>
                    <?php endif; ?>
                </ul>
            </div>

            <div class="sticky-bar">
                <div class="container-fluid">
                    <div class="row my-3 align-items-center">
                        <div class="col-md-6">
                            <input type="search" id="mtSearchInput" class="form-control" placeholder="Search by Item Code, Name, or Location...">
                        </div>
                        <div class="col-md-6">
                            <div class="d-flex justify-content-end gap-2">
                                <button class="btn btn-outline-secondary" id="mt_toggleInactiveBtn" title="Show/Hide Inactive Items" style="display: none;">
                                    <i class="fas fa-eye"></i>
                                </button>
                                <div id="mt-button-group"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="content-wrapper">
                <div class="tab-content" id="mtStockTabContent">
                    
                    <div class="tab-pane fade show active" id="onhand-pane" role="tabpanel">
                        <div class="table-responsive">
                            <table class="table table-striped table-hover">
                                <thead>
                                    <tr>
                                        <th>Item Code</th>
                                        <th>Item Name</th>
                                        <th>Location</th>
                                        <th class="text-center">Min Stock</th>
                                        <th class="text-center">Max Stock</th>
                                        <th class="text-end">On-Hand Qty</th>
                                    </tr>
                                </thead>
                                <tbody id="mtOnHandTableBody"></tbody>
                            </table>
                        </div>
                    </div>

                    <div class="tab-pane fade" id="transactions-pane" role="tabpanel">
                        <div class="table-responsive">
                            <table class="table table-striped">
                                <thead>
                                    <tr>
                                        <th>Timestamp</th>
                                        <th>Item Code</th>
                                        <th>Item Name</th>
                                        <th class="text-center">Type</th>
                                        <th class="text-end">Quantity</th>
                                        <th>User</th>
                                        <th>Notes</th>
                                    </tr>
                                </thead>
                                <tbody id="mtTransactionTableBody"></tbody>
                            </table>
                        </div>
                    </div>

                    <?php if ($canManage): ?>
                    <div class="tab-pane fade" id="items-pane" role="tabpanel">
                        <div class="table-responsive">
                            <table class="table table-striped table-hover">
                            <thead>
                                <tr>
                                    <th style="width: 15%;">Item Code</th>
                                    <th style="width: 20%;">Item Name</th>
                                    <th style="width: 30%;">Description</th>
                                    <th style="width: 15%;">Supplier</th>
                                    <th class="text-center" style="width: 5%;">Min</th>
                                    <th class="text-center" style="width: 5%;">Max</th>
                                    <th class="text-center" style="width: 10%;">Status</th>
                                </tr>
                            </thead>
                                <tbody id="mtItemMasterTableBody"></tbody>
                            </table>
                        </div>
                    </div>

                    <div class="tab-pane fade" id="locations-pane" role="tabpanel">
                        <div class="table-responsive">
                            <table class="table table-striped table-hover">
                                <thead>
                                    <tr>
                                        <th>Location Name</th>
                                        <th>Description</th>
                                    </tr>
                                </thead>
                                <tbody id="mtLocationMasterTableBody"></tbody>
                            </table>
                        </div>
                    </div>
                    <?php endif; ?>
                </div>
            </div>
            
            <div id="toast"></div>
            
            <nav class="pagination-footer" data-tab-target="#onhand-pane"><ul class="pagination justify-content-center" id="mtOnHandPagination"></ul></nav>
            <nav class="pagination-footer" data-tab-target="#transactions-pane" style="display: none;"><ul class="pagination justify-content-center" id="mtTransactionPagination"></ul></nav>
            <?php if ($canManage): ?>
            <nav class="pagination-footer" data-tab-target="#items-pane" style="display: none;"><ul class="pagination justify-content-center" id="mtItemMasterPagination"></ul></nav>
            <nav class="pagination-footer" data-tab-target="#locations-pane" style="display: none;"><ul class="pagination justify-content-center" id="mtLocationMasterPagination"></ul></nav>
            <?php endif; ?>

            <?php
                include('components/mt_itemModal.php'); 
                include('components/mt_locationModal.php');
                include('components/mt_receiveModal.php');
                include('components/mt_issueModal.php');
            ?>
        </main>
    </div>
    
    <?php include_once('../components/php/command_center.php'); ?>
    <?php include_once('../components/php/docking_sidebar.php'); ?>

    <script>
        const canManage = <?php echo json_encode($canManage); ?>;
        const canTransact = <?php echo json_encode($canTransact); ?>;
        const currentUser = <?php echo json_encode($currentUser); ?>;
    </script>
    
    <script src="../components/js/pagination.js?v=<?php echo filemtime('../components/js/pagination.js'); ?>"></script>
    <script src="../../utils/libs/xlsx.full.min.js"></script>
    <script src="script/maintenance.js?v=<?php echo time();?>"></script>
</body>
</html>