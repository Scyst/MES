<?php
// MES/page/storeManagement/inventoryDashboard.php
require_once __DIR__ . '/../components/init.php';
requirePermission('view_warehouse');

$pageTitle = "Inventory Stock (RM)";
$pageIcon = "fas fa-boxes"; 
$pageHeaderTitle = "Inventory Stock Dashboard";
$pageHeaderSubtitle = "สรุปยอดวัตถุดิบคงคลังและยอดรอรับเข้า (Real-time)";
?>
<!DOCTYPE html>
<html lang="th">
<head>
    <title><?php echo $pageTitle; ?></title>
    <?php include_once '../components/common_head.php'; ?>
    <link rel="stylesheet" href="css/inventoryDashboard.css?v=<?php echo filemtime(__DIR__ . '/css/inventoryDashboard.css'); ?>">
</head>

<body class="layout-top-header bg-body-tertiary">
    <?php include '../components/php/top_header.php'; ?>
    
    <div class="page-container">
        <div id="main-content">
            <div class="px-3 pt-3">
                
                <div class="row g-2 mb-3">
                    <div class="col-6 col-md-3">
                        <div class="card shadow-sm kpi-card border-secondary h-100">
                            <div class="card-body p-3">
                                <div class="d-flex justify-content-between align-items-center">
                                    <div>
                                        <div class="text-uppercase text-secondary small fw-bold mb-1">รายการ (Total SKUs)</div>
                                        <h2 class="text-secondary fw-bold mb-0" id="totalSkus">0</h2>
                                        <div class="small text-muted mt-1" style="font-size: 0.75rem;">ชนิดวัตถุดิบในระบบ</div>
                                    </div>
                                    <div class="bg-secondary bg-opacity-10 text-secondary p-3 rounded-circle">
                                        <i class="fas fa-cubes fa-lg"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="col-6 col-md-3">
                        <div class="card shadow-sm kpi-card border-danger h-100">
                            <div class="card-body p-3">
                                <div class="d-flex justify-content-between align-items-center">
                                    <div>
                                        <div class="text-uppercase text-danger small fw-bold mb-1">สินค้าหมด (Out of Stock)</div>
                                        <h2 class="text-danger fw-bold mb-0" id="outOfStock">0</h2>
                                        <div class="small text-muted mt-1" style="font-size: 0.75rem;">รายการที่ยอด 0 หรือติดลบ</div>
                                    </div>
                                    <div class="bg-danger bg-opacity-10 text-danger p-3 rounded-circle">
                                        <i class="fas fa-exclamation-triangle fa-lg"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="col-6 col-md-3">
                        <div class="card shadow-sm kpi-card border-warning h-100">
                            <div class="card-body p-3">
                                <div class="d-flex justify-content-between align-items-center">
                                    <div>
                                        <div class="text-uppercase text-warning small fw-bold mb-1">รอรับเข้า (Pending)</div>
                                        <h2 class="text-warning fw-bold mb-0" id="totalPending">0</h2>
                                        <div class="small text-muted mt-1" style="font-size: 0.75rem;">ปริมาณกำลังเดินทางมา</div>
                                    </div>
                                    <div class="bg-warning bg-opacity-10 text-warning p-3 rounded-circle">
                                        <i class="fas fa-truck fa-lg"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="col-6 col-md-3">
                        <div class="card shadow-sm kpi-card border-primary h-100">
                            <div class="card-body p-3">
                                <div class="d-flex justify-content-between align-items-center">
                                    <div>
                                        <div class="text-uppercase text-primary small fw-bold mb-1">มูลค่ารวม (Est. Value)</div>
                                        <h2 class="text-primary fw-bold mb-0">฿<span id="totalValue">0</span></h2>
                                        <div class="small text-muted mt-1" style="font-size: 0.75rem;">มูลค่าตาม Standard Price</div>
                                    </div>
                                    <div class="bg-primary bg-opacity-10 text-primary p-3 rounded-circle">
                                        <i class="fas fa-coins fa-lg"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="dashboard-header-sticky px-3 pt-0">
                <div class="card border-0 shadow-sm mb-0">
                    <div class="card-body p-2 bg-body-tertiary rounded d-flex justify-content-between align-items-center flex-wrap gap-2">
                        
                        <div class="d-flex align-items-center gap-2 flex-grow-1 flex-wrap">
                            <div class="input-group input-group-sm" style="max-width: 200px;">
                                <span class="input-group-text bg-body border-secondary-subtle text-secondary"><i class="fas fa-search"></i></span>
                                <input type="text" id="filterSearch" class="form-control border-secondary-subtle ps-2" placeholder="ค้นหา Item...">
                            </div>
                            
                            <div class="input-group input-group-sm shadow-sm" style="max-width: 200px;">
                                <span class="input-group-text bg-white border-secondary-subtle text-secondary small"><i class="fas fa-map-marker-alt"></i></span>
                                <select id="locationFilter" class="form-select border-secondary-subtle fw-bold text-primary">
                                    <option value="ALL">All Location</option>
                                </select>
                            </div>

                            <div class="input-group input-group-sm shadow-sm" style="max-width: 120px;">
                                <span class="input-group-text bg-white border-secondary-subtle text-secondary small"><i class="fas fa-filter"></i></span>
                                <select id="materialFilter" class="form-select border-secondary-subtle fw-bold text-dark">
                                    <option value="ALL" selected>All</option>
                                    <option value="RM">RM</option>
                                    <option value="SEMI">SEMI</option>
                                    <option value="FG">FG</option>
                                </select>
                            </div>

                            <div class="form-check form-switch ms-1 d-flex align-items-center">
                                <input class="form-check-input mt-0 shadow-sm" type="checkbox" id="hideZeroStock" style="transform: scale(1.2); cursor: pointer;">
                                <label class="form-check-label ms-2 small fw-bold text-secondary cursor-pointer" for="hideZeroStock">ซ่อนยอด 0</label>
                            </div>
                        </div>

                        <div class="d-flex align-items-center gap-2">
                            <div class="input-group input-group-sm d-none d-md-flex" style="max-width: 150px;">
                                <span class="input-group-text bg-white border-secondary-subtle text-secondary small">Rows:</span>
                                <select id="rowsPerPage" class="form-select border-secondary-subtle" onchange="rowsPerPage = parseInt(this.value); currentPage = 1; loadDashboardData();">
                                    <option value="50">50</option>
                                    <option value="100" selected>100</option>
                                    <option value="500">500</option>
                                </select>
                            </div>
                            <button class="btn btn-outline-secondary btn-sm" onclick="loadDashboardData()" title="Refresh Data">
                                <i class="fas fa-sync-alt"></i>
                            </button>

                            <button class="btn btn-outline-info btn-sm fw-bold px-3 shadow-sm" onclick="openCcHistoryModal()">
                                <i class="fas fa-history me-1"></i> ประวัติปรับยอด
                            </button>

                            <button id="btnApprovalModal" class="btn btn-warning btn-sm fw-bold px-3 shadow-sm position-relative d-none" onclick="openApprovalModal()">
                                <i class="fas fa-clipboard-check text-dark me-1"></i> อนุมัติปรับยอด
                                <span class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" id="badgePendingCount" style="display:none;">0</span>
                            </button>
                            
                            <button class="btn btn-primary btn-sm fw-bold px-3 shadow-sm" onclick="issueModal.show()">
                                <i class="fas fa-dolly me-1"></i> เบิกจ่าย (Issue)
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div class="content-wrapper px-3 pb-3 pt-2">
                <div class="card shadow-sm border-0 h-100 d-flex flex-column">
                    <div class="table-responsive-custom flex-grow-1">
                        <table class="table table-hover align-middle mb-0 text-nowrap" style="font-size: 0.9rem;">
                            <thead class="table-light sticky-top shadow-sm">
                                <tr>
                                    <th style="width: 50px;">#</th>
                                    <th style="min-width: 150px;">Item No.</th>
                                    <th style="min-width: 250px;">Description</th>
                                    <th>Type</th>
                                    <th class="text-end">รอรับเข้า (Pending)</th>
                                    <th class="text-end">พร้อมใช้ (Available)</th>
                                    <th class="text-end">รวม (Total)</th>
                                    <th class="text-end">Cost/Unit</th>
                                    <th class="text-end">มูลค่ารวม (Value)</th>
                                    <th class="text-center" style="width: 80px;"><i class="fas fa-cog"></i></th>
                                </tr>
                            </thead>
                            <tbody id="dashboardTbody">
                                <tr><td colspan="10" class="text-center py-4 text-muted"><i class="fas fa-spinner fa-spin me-2"></i>กำลังโหลดข้อมูล...</td></tr>
                            </tbody>
                        </table>
                    </div>
                    
                    <div class="card-footer bg-white border-top d-flex justify-content-between align-items-center pt-2 pb-2 rounded-bottom">
                        <button class="btn btn-outline-secondary btn-sm" id="btnPrevPage" onclick="changePage(-1)">
                            <i class="fas fa-chevron-left"></i> ก่อนหน้า
                        </button>
                        <span id="pageInfo" class="fw-bold text-muted small">Page 1 of 1</span>
                        <button class="btn btn-outline-secondary btn-sm" id="btnNextPage" onclick="changePage(1)">
                            ถัดไป <i class="fas fa-chevron-right"></i>
                        </button>
                    </div>
                </div>
            </div>

        </div>
    </div>

    <div id="printArea" class="d-none"></div>

    <?php include_once __DIR__ . '/components/InventoryModal.php'; ?>
    <?php include_once __DIR__ . '/components/store_scanner.php'; ?>

    <script>
        const currentUser = <?php echo json_encode($_SESSION['user'] ?? null); ?>;
        const CAN_MANAGE_WH = <?php echo json_encode(hasPermission('manage_warehouse')); ?>;
        const CAN_MANAGE_RM = <?php echo json_encode(hasPermission('manage_rm_receiving')); ?>;
    </script>
    <script src="../../utils/libs/qrcode.min.js"></script>
    <script src="script/inventoryDashboard.js?v=<?php echo filemtime(__DIR__ . '/script/inventoryDashboard.js'); ?>" defer></script>
</body>
</html>