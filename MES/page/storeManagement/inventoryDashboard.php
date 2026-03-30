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
                <style>
                    .hide-scrollbar::-webkit-scrollbar { display: none; }
                    .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

                    @media (max-width: 767.98px) {
                        .mobile-fixed-footer {
                            position: fixed !important;
                            bottom: 0;
                            left: 0;
                            right: 0;
                            z-index: 1040;
                            border-radius: 0 !important;
                            padding-bottom: calc(0.5rem + env(safe-area-inset-bottom)) !important; 
                            box-shadow: 0 -4px 15px rgba(0,0,0,0.08) !important;
                        }
                        .fab-container {
                            bottom: calc(70px + env(safe-area-inset-bottom)) !important; 
                        }
                        #dashboardCardContainer {
                            padding-bottom: calc(80px + env(safe-area-inset-bottom)) !important; 
                        }
                    }
                </style>
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
                        <div class="d-flex flex-column flex-lg-row align-items-lg-center justify-content-between gap-2 w-100">
                            
                            <div class="d-flex flex-wrap align-items-center gap-2 flex-grow-1">
                                
                                <div class="d-flex align-items-center gap-1 w-100 w-md-auto flex-nowrap" style="flex: 1 1 250px; max-width: 450px;">
                                    
                                    <div class="input-group input-group-sm shadow-sm flex-grow-1">
                                        <span class="input-group-text bg-white border-secondary-subtle text-secondary"><i class="fas fa-search"></i></span>
                                        <input type="text" id="filterSearch" class="form-control border-secondary-subtle border-start-0 ps-0" placeholder="ค้นหา Item No. หรือชื่อ...">
                                    </div>
                                    
                                    <button class="btn btn-outline-secondary btn-sm shadow-sm flex-shrink-0" onclick="loadDashboardData()" title="Refresh Data" style="width: 32px; height: 32px; padding: 0;">
                                        <i class="fas fa-sync-alt"></i>
                                    </button>
                                    
                                    <button class="btn btn-outline-primary btn-sm shadow-sm flex-shrink-0 d-md-none" id="btnToggleCards" onclick="toggleMobileCards()" title="ซ่อน/แสดงยอดรวม" style="width: 32px; height: 32px; padding: 0;">
                                        <i class="fas fa-eye-slash"></i>
                                    </button>

                                    <input type="checkbox" class="btn-check" id="hideZeroStock" autocomplete="off" onchange="loadDashboardData()">
                                    <label class="btn btn-outline-secondary btn-sm shadow-sm fw-bold d-flex align-items-center justify-content-center px-2 flex-shrink-0" for="hideZeroStock" title="ซ่อนยอด 0" style="height: 32px;">
                                        <i class="fas fa-eye-slash"></i> <small class="d-none d-sm-inline ms-1">ซ่อน 0</small>
                                    </label>
                                    
                                </div>
                                
                                <div class="d-flex align-items-center gap-2 w-100 w-md-auto flex-nowrap" style="flex: 1 1 200px; max-width: 350px;">
                                    
                                    <div class="input-group input-group-sm shadow-sm flex-grow-1">
                                        <span class="input-group-text bg-white border-secondary-subtle text-secondary px-2"><i class="fas fa-map-marker-alt"></i></span>
                                        <select id="locationFilter" class="form-select border-secondary-subtle fw-bold text-dark px-1">
                                            <option value="ALL">All Locations</option>
                                        </select>
                                    </div>
                                    
                                    <div class="input-group input-group-sm shadow-sm flex-shrink-0" style="width: 120px;">
                                        <select id="materialFilter" class="form-select border-secondary-subtle fw-bold text-dark px-1">
                                            <option value="ALL" selected>All</option>
                                            <option value="RM">RM</option>
                                            <option value="SEMI">SEMI</option>
                                            <option value="FG">FG</option>
                                        </select>
                                    </div>
                                    
                                </div>

                                <div class="input-group input-group-sm shadow-sm d-none d-md-flex flex-shrink-0" style="width: 70px;">
                                    <select id="rowsPerPage" class="form-select border-secondary-subtle px-1" onchange="changeRowsPerPage()">
                                        <option value="50">50</option>
                                        <option value="100" selected>100</option>
                                        <option value="500">500</option>
                                    </select>
                                </div>
                                
                            </div>

                            <div id="actionWrapper" class="d-none d-md-flex flex-wrap align-items-center gap-2 justify-content-start justify-content-lg-end mt-2 mt-lg-0">

                                <button class="btn btn-sm fw-bold px-3 py-1 rounded shadow transition-btn text-white border-0" style="background: linear-gradient(135deg, #0dcaf0, #0b5ed7);" onclick="if(typeof traceModalInstance !== 'undefined') traceModalInstance.show();">
                                    <i class="fas fa-qrcode me-1"></i> สแกน
                                </button>

                                <div class="dropdown ms-1">
                                    <button class="btn btn-outline-secondary btn-sm fw-bold px-2 py-1 rounded shadow-sm position-relative" type="button" data-bs-toggle="dropdown" title="เมนูเพิ่มเติม" aria-expanded="false">
                                        <i class="fas fa-ellipsis-v fa-fw"></i>
                                        <span class="position-absolute top-0 start-100 translate-middle p-1 bg-danger border border-light rounded-circle d-none" id="badgeTotalAlert" style="width: 12px; height: 12px;"></span>
                                    </button>
                                    <ul class="dropdown-menu dropdown-menu-end shadow-sm border-0 mt-1" style="font-size: 0.85rem; min-width: 250px;">
                                        <li><h6 class="dropdown-header text-dark fw-bold"><i class="fas fa-tasks me-1"></i> จัดการระบบคลัง</h6></li>
                                        <li><a class="dropdown-item py-2 fw-bold" href="#" onclick="openCcHistoryModal()"><i class="fas fa-history text-secondary fa-fw me-2"></i> ประวัติปรับยอดสต็อก</a></li>
                                        <li>
                                            <a class="dropdown-item py-2 d-flex justify-content-between align-items-center fw-bold" href="#" onclick="openApprovalModal()">
                                                <span><i class="fas fa-clipboard-check text-warning fa-fw me-2"></i> อนุมัติปรับยอด</span>
                                                <span class="badge bg-danger rounded-pill d-none" id="badgePendingCount">0</span>
                                            </a>
                                        </li>
                                        <li>
                                            <a class="dropdown-item py-2 d-flex justify-content-between align-items-center fw-bold" href="#" onclick="openConfirmTransferModal()">
                                                <span><i class="fas fa-truck-loading text-info fa-fw me-2"></i> รอส่ง Shipping</span>
                                                <span class="badge bg-danger rounded-pill d-none" id="badgeTransferCount">0</span>
                                            </a>
                                        </li>
                                        
                                        <li><hr class="dropdown-divider"></li>
                                        
                                        <li><h6 class="dropdown-header text-dark fw-bold"><i class="fas fa-compass me-1"></i> เมนูนำทาง (Navigation)</h6></li>
                                        <li><a class="dropdown-item py-2 fw-bold bg-primary bg-opacity-10 text-primary" href="inventoryDashboard.php"><i class="fas fa-boxes fa-fw me-2"></i> RM Inventory (หน้าหลัก)</a></li>
                                        <li><a class="dropdown-item py-2 fw-bold" href="rmReceiving.php"><i class="fas fa-pallet text-secondary fa-fw me-2"></i> RM Receiving (รับเข้า/สร้าง Tag)</a></li>
                                        <li><a class="dropdown-item py-2 fw-bold" href="stockLedger.php"><i class="fas fa-history text-secondary fa-fw me-2"></i> Stock Ledger (ประวัติฯ)</a></li>
                                    </ul>
                                </div>

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
                                <tr class="text-secondary small text-uppercase align-middle">
                                    <th class="text-center" style="width: 50px;">#</th>
                                    <th style="min-width: 150px;">Part No.</th>
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
        <button class="btn text-white rounded-circle shadow-lg d-flex align-items-center justify-content-center border-0 transition-btn" 
                onclick="if(typeof traceModalInstance !== 'undefined') traceModalInstance.show();" title="สแกนรับ / เบิก" 
                style="width: 60px; height: 60px; font-size: 24px; background: linear-gradient(135deg, #0dcaf0, #0b5ed7);">
            <i class="fas fa-qrcode"></i> 
        </button>
    </div>

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