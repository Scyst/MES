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
            
            <div class="px-3 pt-3" id="kpiContainer">
                <div class="row g-2 mb-1 flex-nowrap overflow-x-auto pb-1 hide-scrollbar" style="-webkit-overflow-scrolling: touch;">
                    <div class="col-8 col-sm-6 col-md-3" style="min-width: 180px;">
                        <div class="card shadow-sm kpi-card border-secondary h-100">
                            <div class="card-body p-3">
                                <div class="d-flex justify-content-between align-items-center">
                                    <div>
                                        <div class="text-uppercase text-secondary small fw-bold mb-1">รายการ (Total SKUs)</div>
                                        <h3 class="text-secondary fw-bold mb-0" id="totalSkus">0</h3>
                                        <div class="small text-muted mt-1" style="font-size: 0.7rem;">ชนิดวัตถุดิบในระบบ</div>
                                    </div>
                                    <div class="bg-secondary bg-opacity-10 text-secondary p-2 rounded-circle d-none d-sm-block">
                                        <i class="fas fa-cubes fa-lg"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="col-8 col-sm-6 col-md-3" style="min-width: 180px;">
                        <div class="card shadow-sm kpi-card border-danger h-100">
                            <div class="card-body p-3">
                                <div class="d-flex justify-content-between align-items-center">
                                    <div>
                                        <div class="text-uppercase text-danger small fw-bold mb-1">สินค้าหมด (Out of Stock)</div>
                                        <h3 class="text-danger fw-bold mb-0" id="outOfStock">0</h3>
                                        <div class="small text-muted mt-1" style="font-size: 0.7rem;">รายการที่ยอด 0 หรือติดลบ</div>
                                    </div>
                                    <div class="bg-danger bg-opacity-10 text-danger p-2 rounded-circle d-none d-sm-block">
                                        <i class="fas fa-exclamation-triangle fa-lg"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="col-8 col-sm-6 col-md-3" style="min-width: 180px;">
                        <div class="card shadow-sm kpi-card border-warning h-100">
                            <div class="card-body p-3">
                                <div class="d-flex justify-content-between align-items-center">
                                    <div>
                                        <div class="text-uppercase text-warning small fw-bold mb-1">รอรับเข้า (Pending)</div>
                                        <h3 class="text-warning fw-bold mb-0" id="totalPending">0</h3>
                                        <div class="small text-muted mt-1" style="font-size: 0.7rem;">ปริมาณกำลังเดินทางมา</div>
                                    </div>
                                    <div class="bg-warning bg-opacity-10 text-warning p-2 rounded-circle d-none d-sm-block">
                                        <i class="fas fa-truck fa-lg"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="col-8 col-sm-6 col-md-3" style="min-width: 180px;">
                        <div class="card shadow-sm kpi-card border-primary h-100">
                            <div class="card-body p-3">
                                <div class="d-flex justify-content-between align-items-center">
                                    <div>
                                        <div class="text-uppercase text-primary small fw-bold mb-1">มูลค่ารวม (Est. Value)</div>
                                        <h3 class="text-primary fw-bold mb-0">฿<span id="totalValue">0</span></h3>
                                        <div class="small text-muted mt-1" style="font-size: 0.7rem;">มูลค่าตาม Standard Price</div>
                                    </div>
                                    <div class="bg-primary bg-opacity-10 text-primary p-2 rounded-circle d-none d-sm-block">
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
                    <div class="card-body p-2 bg-body-tertiary rounded">
                        <div class="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 w-100">
                            
                            <div class="d-flex flex-column flex-md-row align-items-md-center gap-2 flex-grow-1">
                                <div class="d-flex align-items-center gap-2 w-100 w-md-auto" style="max-width: 350px;">
                                    <div class="input-group input-group-sm flex-grow-1">
                                        <span class="input-group-text bg-body border-secondary-subtle text-secondary"><i class="fas fa-search"></i></span>
                                        <input type="text" id="filterSearch" class="form-control border-secondary-subtle ps-2" placeholder="ค้นหา Item No. หรือชื่อ...">
                                    </div>
                                    <button class="btn btn-outline-secondary btn-sm shadow-sm flex-shrink-0" onclick="loadDashboardData()" title="Refresh Data" style="width: 32px; height: 32px;">
                                        <i class="fas fa-sync-alt"></i>
                                    </button>
                                    <button class="btn btn-outline-primary btn-sm shadow-sm flex-shrink-0 d-md-none" id="btnToggleCards" onclick="toggleMobileCards()" title="ซ่อน/แสดงยอดรวม" style="width: 32px; height: 32px;">
                                        <i class="fas fa-eye-slash"></i>
                                    </button>
                                </div>
                                
                                <div class="input-group input-group-sm shadow-sm w-100 w-md-auto" style="max-width: 200px;">
                                    <span class="input-group-text bg-white border-secondary-subtle text-secondary small"><i class="fas fa-map-marker-alt"></i></span>
                                    <select id="locationFilter" class="form-select border-secondary-subtle fw-bold text-primary">
                                        <option value="ALL">All Location</option>
                                    </select>
                                </div>

                                <div class="input-group input-group-sm shadow-sm w-100 w-md-auto" style="max-width: 150px;">
                                    <span class="input-group-text bg-white border-secondary-subtle text-secondary small"><i class="fas fa-filter"></i></span>
                                    <select id="materialFilter" class="form-select border-secondary-subtle fw-bold text-dark">
                                        <option value="ALL" selected>All</option>
                                        <option value="RM">RM</option>
                                        <option value="SEMI">SEMI</option>
                                        <option value="FG">FG</option>
                                    </select>
                                </div>

                                <div class="form-check form-switch ms-1 d-flex align-items-center w-100 w-md-auto">
                                    <input class="form-check-input mt-0 shadow-sm" type="checkbox" id="hideZeroStock" style="transform: scale(1.2); cursor: pointer;">
                                    <label class="form-check-label ms-2 small fw-bold text-secondary cursor-pointer" for="hideZeroStock">ซ่อนยอด 0</label>
                                </div>

                                <div class="input-group input-group-sm d-none d-md-flex ms-md-2" style="width: 90px;">
                                    <select id="rowsPerPage" class="form-select border-secondary-subtle" onchange="changeRowsPerPage()">
                                        <option value="50">50</option>
                                        <option value="100" selected>100</option>
                                        <option value="500">500</option>
                                    </select>
                                </div>
                            </div>

                            <div class="d-none d-md-flex flex-wrap align-items-center gap-2 justify-content-start justify-content-md-end">
                                <button class="btn btn-outline-info btn-sm fw-bold px-3 shadow-sm" onclick="openCcHistoryModal()">
                                    <i class="fas fa-history me-1"></i> ประวัติปรับยอด
                                </button>
                                <button id="btnApprovalModal" class="btn btn-warning btn-sm fw-bold px-3 shadow-sm position-relative d-none" onclick="openApprovalModal()">
                                    <i class="fas fa-clipboard-check text-dark me-1"></i> อนุมัติปรับยอด
                                    <span class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" id="badgePendingCount" style="display:none;">0</span>
                                </button>
                                <button class="btn btn-primary btn-sm fw-bold px-3 shadow-sm" onclick="if(typeof traceModalInstance !== 'undefined') traceModalInstance.show();">
                                    <i class="fas fa-qrcode me-1"></i> สแกนเบิก/ตรวจสอบ
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="content-wrapper px-3 pb-3 pt-2">
                <div class="card shadow-sm border-0 h-100 d-flex flex-column">
                    
                    <div class="table-responsive-custom flex-grow-1 d-none d-md-block">
                        <table class="table table-striped table-hover align-middle mb-0 text-nowrap" style="font-size: 0.9rem;">
                            <thead class="table-light sticky-top shadow-sm">
                                <tr class="text-secondary small text-uppercase">
                                    <th class="text-center" style="width: 50px;">#</th>
                                    <th style="min-width: 150px;">Item No.</th>
                                    <th style="min-width: 250px;">Description</th>
                                    <th class="text-center">Type</th>
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

                    <div class="d-md-none flex-grow-1 overflow-auto p-2" id="dashboardCardContainer" style="background-color: var(--bs-body-bg);">
                        <div class="text-center text-muted py-4">กำลังโหลดข้อมูล...</div>
                    </div>
                    
                    <div class="card-footer bg-white border-top d-flex justify-content-center justify-content-md-between align-items-center px-3 rounded-bottom mobile-fixed-footer w-100" style="min-height: 54px;">
                        <div class="d-flex align-items-center h-100">
                            <small class="text-muted fw-bold text-nowrap d-none d-md-block m-0 mt-1" id="paginationInfo">แสดง 0 ถึง 0 จาก 0 รายการ</small>
                        </div>
                        <nav class="overflow-auto hide-scrollbar d-flex align-items-center h-100 m-0" style="-webkit-overflow-scrolling: touch; max-width: 100%;">
                            <ul class="pagination pagination-sm mb-0 justify-content-center justify-content-md-end mt-1" id="paginationControls"></ul>
                        </nav>
                    </div>

                </div>
            </div>

        </div>
    </div>

    <div class="fab-container d-md-none" style="position: fixed; bottom: 20px; right: 20px; z-index: 1050;">
        <button class="btn btn-primary text-white rounded-circle shadow-lg d-flex align-items-center justify-content-center" 
                onclick="if(typeof traceModalInstance !== 'undefined') traceModalInstance.show();" title="สแกนเบิกจ่าย" 
                style="width: 60px; height: 60px; font-size: 24px;">
            <i class="fas fa-qrcode"></i> </button>
    </div>

    <div id="printArea" class="d-none"></div>

    <?php include_once __DIR__ . '/components/InventoryModal.php'; ?>
    <?php include_once __DIR__ . '/components/storeScanner.php'; ?>

    <script>
        const currentUser = <?php echo json_encode($_SESSION['user'] ?? null); ?>;
        const CAN_MANAGE_WH = <?php echo json_encode(hasPermission('manage_warehouse')); ?>;
        const CAN_MANAGE_RM = <?php echo json_encode(hasPermission('manage_rm_receiving')); ?>;
    </script>
    <script src="script/storeCommon.js?v=<?php echo filemtime(__DIR__ . '/script/storeCommon.js'); ?>"></script>
    <script src="script/inventoryDashboard.js?v=<?php echo filemtime(__DIR__ . '/script/inventoryDashboard.js'); ?>" defer></script>
</body>
</html>