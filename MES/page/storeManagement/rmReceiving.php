<?php
// MES/page/storeManagement/rmReceiving.php
require_once __DIR__ . '/../components/init.php';
requirePermission('view_warehouse');

$currentUserForJS = $_SESSION['user'] ?? null;
$canManageRM = hasPermission('manage_rm_receiving');

$pageTitle = "Stock Receiving & Tagging";
$pageIcon = "fas fa-pallet"; 
$pageHeaderTitle = "Stock Receiving";
$pageHeaderSubtitle = "รับสินค้าเข้าสต็อก และสร้าง Tag สำหรับ FIFO";
$pageHelpId = ""; 
?>
<!DOCTYPE html>
<html lang="th">
<head>
    <title><?php echo $pageTitle; ?></title>
    <?php include_once '../components/common_head.php'; ?>
    <link rel="stylesheet" href="css/rmReceiving.css?v=<?php echo filemtime(__DIR__ . '/css/rmReceiving.css'); ?>">
</head>

<body class="layout-top-header bg-body-tertiary">

    <?php include '../components/php/top_header.php'; ?>
    
    <div class="page-container">
        <div id="main-content">
            
            <div class="px-3 pt-3" id="kpiContainer">
                <style>
                    .hide-scrollbar::-webkit-scrollbar { display: none; }
                    .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

                    .toolbar-scroll-container {
                        overflow-x: auto;
                        overflow-y: hidden;
                        white-space: nowrap;
                        -webkit-overflow-scrolling: touch;
                        scrollbar-width: thin;
                    }
                    .toolbar-scroll-container::-webkit-scrollbar {
                        height: 3px;
                    }
                    .toolbar-scroll-container::-webkit-scrollbar-thumb {
                        background-color: rgba(0, 0, 0, 0.2);
                        border-radius: 4px;
                    }

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
                        #historyCardContainer {
                            padding-bottom: calc(80px + env(safe-area-inset-bottom)) !important; 
                        }
                    }
                </style>
                <div class="row g-2 mb-1 flex-nowrap overflow-x-auto pb-1 hide-scrollbar" style="-webkit-overflow-scrolling: touch;">
                    
                    <div class="col-8 col-sm-6 col-md-3" style="min-width: 180px;">
                        <div class="card shadow-sm kpi-card border-primary h-100">
                            <div class="card-body p-3">
                                <div class="d-flex justify-content-between align-items-center">
                                    <div>
                                        <div class="text-uppercase text-primary small fw-bold mb-1">รวมทั้งหมด</div>
                                        <h3 class="text-primary fw-bold mb-0" id="kpi-total-tags">0</h3>
                                        <div class="small text-muted mt-1" style="font-size: 0.7rem;">Tags</div>
                                    </div>
                                    <div class="bg-primary bg-opacity-10 text-primary p-2 rounded-circle d-none d-sm-block">
                                        <i class="fas fa-boxes fa-lg"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="col-8 col-sm-6 col-md-3" style="min-width: 180px;">
                        <div class="card shadow-sm kpi-card border-info h-100">
                            <div class="card-body p-3">
                                <div class="d-flex justify-content-between align-items-center">
                                    <div>
                                        <div class="text-uppercase text-info small fw-bold mb-1">ปริมาณรวม</div>
                                        <h3 class="text-info fw-bold mb-0" id="kpi-total-qty">0</h3>
                                        <div class="small text-muted mt-1" style="font-size: 0.7rem;">PCS</div>
                                    </div>
                                    <div class="bg-info bg-opacity-10 text-info p-2 rounded-circle d-none d-sm-block">
                                        <i class="fas fa-cubes fa-lg"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="col-8 col-sm-6 col-md-3" style="min-width: 180px;">
                        <div class="card shadow-sm kpi-card border-success h-100">
                            <div class="card-body p-3">
                                <div class="d-flex justify-content-between align-items-center">
                                    <div>
                                        <div class="text-uppercase text-success small fw-bold mb-1">พิมพ์แล้ว</div>
                                        <h3 class="text-success fw-bold mb-0" id="kpi-printed">0</h3>
                                        <div class="small text-muted mt-1" style="font-size: 0.7rem;">Printed</div>
                                    </div>
                                    <div class="bg-success bg-opacity-10 text-success p-2 rounded-circle d-none d-sm-block">
                                        <i class="fas fa-print fa-lg"></i>
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
                                        <div class="text-uppercase text-warning small fw-bold mb-1">รอพิมพ์</div>
                                        <h3 class="text-warning fw-bold mb-0" id="kpi-pending">0</h3>
                                        <div class="small text-muted mt-1" style="font-size: 0.7rem;">Pending</div>
                                    </div>
                                    <div class="bg-warning bg-opacity-10 text-warning p-2 rounded-circle d-none d-sm-block">
                                        <i class="fas fa-exclamation-triangle fa-lg"></i>
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
                        
                        <div class="d-flex align-items-center gap-2 w-100">
                            
                            <!-- Scrollable Region: Search, Filter, Batch Action & Primary Buttons -->
                            <div class="toolbar-scroll-container d-flex flex-nowrap align-items-center flex-grow-1 gap-2 py-1">
                                
                                <div class="d-flex align-items-center gap-2 flex-shrink-0">
                                    <div class="input-group input-group-sm shadow-sm flex-shrink-0" style="width: 170px;">
                                        <span class="input-group-text bg-white border-secondary-subtle text-secondary"><i class="fas fa-search"></i></span>
                                        <input type="text" id="searchInput" class="form-control border-secondary-subtle border-start-0 ps-0" placeholder="Search Serial, Item, PO...">
                                    </div>
                                    <button class="btn btn-outline-secondary btn-sm shadow-sm flex-shrink-0" onclick="loadHistory()" title="Refresh Data" style="width: 32px; height: 32px; padding: 0;"> 
                                        <i class="fas fa-sync-alt"></i>
                                    </button>
                                    <button class="btn btn-outline-primary btn-sm shadow-sm flex-shrink-0 d-md-none" id="btnToggleCards" onclick="toggleMobileCards()" title="ซ่อน/แสดงรายการ" style="width: 32px; height: 32px; padding: 0;"> 
                                        <i class="fas fa-eye-slash"></i>
                                    </button>

                                    <span id="offlineSyncBadge" class="badge rounded-pill bg-danger-subtle text-danger border border-danger-subtle px-2 py-1.5 fw-semibold d-none flex-shrink-0" style="font-size: 0.72rem; cursor: pointer; height: 32px; display: inline-flex; align-items: center;" onclick="StoreOffline.triggerManualSync('rm_receiving')" title="คลิกเพื่อส่งข้อมูลที่บันทึกไว้ในเครื่องขึ้นเซิร์ฟเวอร์">
                                        <i class="fas fa-wifi-slash me-1"></i><span id="offlineSyncCount">0</span> ค้างซิงค์
                                    </span>

                                    <div class="input-group input-group-sm shadow-sm flex-shrink-0" style="width: 230px;">
                                        <span class="input-group-text bg-white border-secondary-subtle text-secondary px-2"><i class="fas fa-calendar-alt"></i></span>
                                        <input type="date" id="filterStartDate" class="form-control border-secondary-subtle px-1" value="<?php echo date('Y-m-01'); ?>">
                                        <span class="input-group-text bg-white border-secondary-subtle border-start-0 border-end-0 px-1">-</span>
                                        <input type="date" id="filterEndDate" class="form-control border-secondary-subtle px-1" value="<?php echo date('Y-m-d'); ?>">
                                    </div>
                                    <div class="input-group input-group-sm shadow-sm flex-shrink-0" style="width: 110px;">
                                        <span class="input-group-text bg-white border-secondary-subtle text-secondary px-2"><i class="fas fa-tasks"></i></span>
                                        <select id="statusFilter" class="form-select border-secondary-subtle fw-bold text-dark px-1" onchange="loadHistory()">
                                            <option value="ALL">ทุกสถานะ</option>
                                            <option value="PENDING" class="text-warning" selected>รอรับเข้า</option>
                                            <option value="AVAILABLE" class="text-success">อยู่ในคลัง</option>
                                            <option value="ISSUED" class="text-secondary">เบิกจ่ายแล้ว</option>
                                        </select>
                                    </div>
                                    <div class="input-group input-group-sm shadow-sm d-none d-xl-flex flex-shrink-0" style="width: 70px;">
                                        <select id="rowsPerPage" class="form-select border-secondary-subtle px-1" onchange="changeRowsPerPage()">
                                            <option value="50">50</option>
                                            <option value="100" selected>100</option>
                                            <option value="500">500</option>
                                        </select>
                                    </div>
                                </div>

                                <button class="btn btn-sm fw-bold px-3 py-1 rounded shadow transition-btn text-white border-0 d-none d-md-flex align-items-center flex-shrink-0 ms-auto" style="background: linear-gradient(135deg, #0dcaf0, #0b5ed7); height: 32px;" onclick="openTraceModal()" title="สแกน">
                                    <i class="fas fa-qrcode me-1"></i> สแกน
                                </button>

                            </div> <!-- END toolbar-scroll-container -->

                            <!-- Pinned Batch Actions Menu Outside Scroll Container to Prevent Overflow Clipping -->
                            <div class="dropdown d-none flex-shrink-0" id="btnBatchPrintDropdown">
                                <button class="btn btn-dark btn-sm shadow-sm dropdown-toggle fw-bold px-2 px-sm-3 d-flex align-items-center" 
                                        type="button" 
                                        id="btnBatchDropdownToggle"
                                        data-bs-toggle="dropdown" 
                                        data-bs-popper-config='{"strategy":"fixed"}' 
                                        aria-expanded="false" 
                                        style="height: 32px;"
                                        title="จัดการรายการที่เลือก">
                                    <i class="fas fa-check-square me-1"></i><span class="d-none d-sm-inline me-1">จัดการที่เลือก</span>(<span id="selectedCount">0</span>)
                                </button>
                                <ul class="dropdown-menu dropdown-menu-end shadow-lg border-0 mt-1" aria-labelledby="btnBatchDropdownToggle" style="font-size: 0.9rem; min-width: 210px; z-index: 1060;">
                                    <li><a class="dropdown-item py-2 fw-bold text-success" href="#" onclick="bulkReceiveTags(); return false;"><i class="fas fa-download fa-fw me-2"></i> ยืนยันรับเข้าสต็อก</a></li>
                                    <li><hr class="dropdown-divider"></li>
                                    <li><a class="dropdown-item py-2 fw-bold" href="#" onclick="printSelectedTags(); return false;"><i class="fas fa-print text-dark fa-fw me-2"></i> พิมพ์แยกใบ</a></li>
                                    <li><a class="dropdown-item py-2 fw-bold text-primary" href="#" onclick="groupToMasterPallet(); return false;"><i class="fas fa-boxes fa-fw me-2"></i> จัดพาเลทรวม</a></li>
                                    <li><hr class="dropdown-divider"></li>
                                    <li><a class="dropdown-item py-2 fw-bold text-danger" href="#" id="btnBatchDelete" onclick="deleteSelectedTags(); return false;"><i class="fas fa-trash fa-fw me-2"></i> ลบรายการ (<span id="selectedDeleteCount">0</span>)</a></li>
                                </ul>
                            </div>


                            <!-- Pinned Action Menu (3 Dots / Kebab Menu) Outside Scroll Container to Prevent Overflow Clipping -->
                            <div class="dropdown flex-shrink-0">
                                <button class="btn btn-outline-secondary btn-sm fw-bold px-2 py-1 rounded shadow-sm position-relative d-flex align-items-center justify-content-center" 
                                        type="button" 
                                        id="btnReceivingMoreMenu"
                                        data-bs-toggle="dropdown" 
                                        data-bs-popper-config='{"strategy":"fixed"}' 
                                        title="เมนูเพิ่มเติม" 
                                        aria-expanded="false" 
                                        style="height: 32px; min-width: 36px;">
                                    <i class="fas fa-ellipsis-v fa-fw"></i>
                                </button>
                                <ul class="dropdown-menu dropdown-menu-end shadow-lg border-0 mt-1" aria-labelledby="btnReceivingMoreMenu" style="font-size: 0.85rem; min-width: 250px; z-index: 1060;">
                                    <li><h6 class="dropdown-header text-muted fw-bold"><i class="fas fa-check-square me-1"></i> เลือกรายการ (Selection)</h6></li>
                                    <li><a class="dropdown-item py-2 fw-bold text-primary" href="#" onclick="toggleSelectAllOption(true); return false;"><i class="fas fa-check-double fa-fw me-2"></i> เลือกทั้งหมดในหน้านี้</a></li>
                                    <li><a class="dropdown-item py-2 fw-bold text-secondary" href="#" onclick="toggleSelectAllOption(false); return false;"><i class="fas fa-times fa-fw me-2"></i> ยกเลิกการเลือกทั้งหมด</a></li>
                                    <li><hr class="dropdown-divider"></li>
                                    <li><h6 class="dropdown-header text-success fw-bold"><i class="fas fa-database me-1"></i> จัดการข้อมูล (Data)</h6></li>
                                    <li><a class="dropdown-item py-2 fw-bold text-success" href="#" onclick="openThermalPrinterModal(); return false;"><i class="fas fa-bolt fa-fw me-2"></i> โหมดพิมพ์ด่วน (ZPL / Kiosk)</a></li>
                                    <li><a class="dropdown-item py-2 fw-bold text-success" href="#" onclick="exportToExcel(); return false;"><i class="fas fa-file-export fa-fw me-2 text-success"></i> Export to Excel</a></li>
                                    <?php if($canManageRM): ?>
                                    <li><a class="dropdown-item py-2 fw-bold text-primary" href="#" onclick="openImportModal(); return false;"><i class="fas fa-file-import fa-fw me-2 text-primary"></i> Import Excel (สร้าง Tag)</a></li>
                                    <li><a class="dropdown-item py-2 fw-bold text-info" href="#" onclick="openManualAddModal(); return false;"><i class="fas fa-keyboard fa-fw me-2 text-info"></i> เพิ่มข้อมูล (Manual)</a></li>
                                    <?php endif; ?>
                                    <li><hr class="dropdown-divider"></li>
                                    <li><h6 class="dropdown-header text-primary fw-bold"><i class="fas fa-compass me-1"></i> เมนูนำทาง (Navigation)</h6></li>
                                    <li><a class="dropdown-item py-2 fw-bold" href="inventoryDashboard.php"><i class="fas fa-boxes text-secondary fa-fw me-2"></i> Stock Inventory (ยอดคงคลัง)</a></li>
                                    <li><a class="dropdown-item py-2 fw-bold bg-primary bg-opacity-10 text-primary" href="rmReceiving.php"><i class="fas fa-pallet fa-fw me-2"></i> Stock Receiving (รับเข้า/สร้าง Tag)</a></li>
                                    <li><a class="dropdown-item py-2 fw-bold" href="stockTransaction.php"><i class="fas fa-history text-secondary fa-fw me-2"></i> Stock Transaction (ประวัติฯ)</a></li>
                                    <li><a class="dropdown-item py-2 fw-bold" href="tagHistory.php"><i class="fas fa-search-location text-secondary fa-fw me-2"></i> Trace Tag (ค้นหาประวัติแท็ก)</a></li>
                                </ul>
                            </div>

                        </div>

                    </div>
                </div>
            </div>

            <div class="px-3 pt-2">
                <div id="offlineStatusBanner" class="alert alert-warning d-none align-items-center justify-content-between p-2 mb-0 rounded-3 border-warning shadow-xs" style="background-color: #fffbeb; border-color: #fde68a;">
                    <div class="d-flex align-items-center gap-2">
                        <i class="fas fa-wifi-slash text-warning fa-lg"></i>
                        <div class="d-flex flex-column">
                            <span class="fw-bold text-dark" style="font-size: 0.85rem;">กำลังทำงานในโหมดออฟไลน์ (Offline Mode)</span>
                            <span class="text-secondary" style="font-size: 0.72rem;">อยู่ในมุมอับสัญญาณ บันทึกข้อมูลในเครื่องชั่วคราว (<span id="offlinePendingCountText">0</span> รายการ)</span>
                        </div>
                    </div>
                    <button type="button" class="btn btn-warning btn-sm text-dark fw-bold px-2 py-1 shadow-xs" onclick="StoreOffline.triggerManualSync('rm_receiving')" style="font-size: 0.75rem;">
                        <i class="fas fa-sync-alt me-1"></i>ซิงค์เดี๋ยวนี้
                    </button>
                </div>
            </div>

            <div class="content-wrapper px-3 pb-3 pt-2">
                <div class="card shadow-sm border-0 h-100 d-flex flex-column">
                    
                    <div class="table-responsive-custom flex-grow-1 d-none d-md-block">
                        <table class="table table-striped table-hover align-middle mb-0 text-nowrap" style="font-size: 0.9rem;">
                            <thead class="sticky-top table-light shadow-sm">
                                <tr class="text-secondary small text-uppercase align-middle">
                                    <th class="text-center" style="width: 40px;">
                                        <input class="form-check-input" type="checkbox" id="selectAllCheckbox" onchange="toggleSelectAll(this)">
                                    </th>
                                    <th style="min-width: 110px;">เพิ่มเข้าระบบ</th>
                                    <th style="min-width: 90px;">วันที่รับจริง</th>
                                    <th class="text-center" style="min-width: 130px;">Serial No.</th>
                                    <th class="text-center" style="min-width: 100px;">Part No.</th>
                                    <th class="text-center" style="width:300px; max-width: 350px;">PO Number</th>
                                    <th class="text-center" style="width: 120px; max-width: 120px;">Invoice No.</th>
                                    <th class="text-center" style="min-width: 100px;">Pallet / CTN</th>
                                    <th class="text-center" style="min-width: 80px;">Week</th>
                                    <th class="text-center" style="min-width: 80px;">QTY</th>
                                    <th class="text-center" style="width: 200px; max-width: 250px;">Remark</th>
                                    <th class="text-center" style="min-width: 80px;">พิมพ์</th>
                                    <th class="text-center" style="min-width: 90px;">Status</th>
                                    <th class="text-center" style="width: 50px;"><i class="fas fa-cog"></i></th>
                                </tr>
                            </thead>
                            <tbody id="historyTbody">
                                <tr><td colspan="14" class="text-center text-muted py-4">กำลังโหลดข้อมูล...</td></tr>
                            </tbody>
                        </table>
                    </div>

                    <!-- Mobile Selection & Counter Bar (Visible only on mobile < 768px) -->
                    <div class="d-md-none d-flex justify-content-between align-items-center px-3 py-2 bg-body-tertiary border-bottom" id="mobileSelectAllBar" style="font-size: 0.85rem;">
                        <div class="form-check mb-0 d-flex align-items-center gap-2">
                            <input class="form-check-input mt-0" type="checkbox" id="mobileSelectAllCheckbox" onchange="toggleSelectAll(this)" style="transform: scale(1.15); cursor: pointer;">
                            <label class="form-check-label fw-bold text-dark user-select-none" for="mobileSelectAllCheckbox" style="cursor: pointer;">
                                เลือกทั้งหมด
                            </label>
                        </div>
                        <span class="badge bg-secondary-subtle text-secondary border border-secondary-subtle px-2 py-1" id="mobileTotalItemsBadge">
                            <span id="mobileTotalCount">0</span> รายการ (เลือก <span id="mobileSelectedCountText">0</span>)
                        </span>
                    </div>

                    <div class="d-md-none flex-grow-1 overflow-auto p-2" id="historyCardContainer" style="background-color: var(--bs-body-bg);">
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
                onclick="openTraceModal()" title="สแกนรับ / เบิก" 
                style="width: 60px; height: 60px; font-size: 24px; background: linear-gradient(135deg, #0dcaf0, #0b5ed7);">
            <i class="fas fa-qrcode"></i>
        </button>
    </div>

    <div class="modal fade" id="importModal" tabindex="-1" aria-labelledby="importModalLabel" aria-hidden="true" data-bs-backdrop="static">
        <div class="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
            <div class="modal-content shadow">
                
                <div class="modal-header bg-light py-2 px-3 border-bottom">
                    <h6 class="modal-title fw-bold text-dark" id="importModalLabel" style="font-size: 1rem;">
                        <i class="fas fa-file-import text-success me-2"></i>นำเข้าข้อมูล Shipping
                    </h6>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close" style="font-size: 0.8rem;"></button>
                </div>

                <div class="modal-body p-2 d-flex flex-column gap-2">
                    
                    <div class="bg-body-tertiary border rounded p-2 d-flex flex-wrap align-items-center justify-content-between gap-2 shadow-sm">
                        <div class="d-flex align-items-center gap-2 flex-grow-1" style="max-width: 400px;">
                            <input type="file" id="excelFile" class="form-control form-control-sm border-secondary-subtle" accept=".xlsx, .xls, .csv" onchange="processExcel()">
                        </div>
                        <div class="d-flex align-items-center gap-3">
                            <span class="text-primary fw-bold small" id="previewCount">พบข้อมูล: 0 พาเลท</span>
                            <button type="button" class="btn btn-outline-success btn-sm fw-bold shadow-sm" onclick="downloadTemplate()">
                                <i class="fas fa-download me-1"></i> Template
                            </button>
                        </div>
                    </div>

                    <div class="table-responsive border rounded flex-fill hide-scrollbar" style="min-height: 350px;">
                        <table class="table table-sm table-striped table-hover align-middle mb-0 text-nowrap" id="previewTable" style="font-size: 0.875rem;">
                            <thead class="table-secondary sticky-top shadow-sm" style="z-index: 10;">
                                <tr class="text-secondary">
                                    <th class="px-3 py-2">Part No.</th>
                                    <th class="py-2">Category</th>
                                    <th class="py-2">Description</th>
                                    <th class="py-2">PO Number</th>
                                    <th class="py-2 text-end">Qty/Pallet</th>
                                    <th class="py-2 text-end">Package</th>
                                    <th class="px-2 py-2">Invoice No.</th>
                                    <th class="px-3 py-2">Remark</th> 
                                </tr>
                            </thead>
                            <tbody id="previewTbody">
                                <tr>
                                    <td colspan="8" class="text-center text-muted align-middle" style="height: 280px;">
                                        <i class="fas fa-file-excel fa-3x mb-3 opacity-25"></i><br>
                                        <span class="fw-bold">กรุณาเลือกไฟล์ Excel เพื่อดูตัวอย่างข้อมูล</span>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                </div>

                <div class="modal-footer bg-light py-2 px-3 border-top">
                    <button type="button" class="btn btn-secondary btn-sm fw-bold px-3 shadow-sm" data-bs-dismiss="modal">ยกเลิก</button>
                    <button type="button" class="btn btn-success btn-sm d-none fw-bold px-4 shadow-sm" id="btnSave" onclick="submitToDatabase()">
                        <i class="fas fa-save me-1"></i> บันทึกรับเข้าสต็อก
                    </button>
                </div>

            </div>
        </div>
    </div>

    <div class="modal fade" id="manualAddModal" data-bs-backdrop="static" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered modal-lg">
            <div class="modal-content shadow border-0">
                
                <div class="modal-header bg-light py-2 px-3 border-bottom">
                    <h6 class="modal-title fw-bold text-dark" style="font-size: 1rem;">
                        <i class="fas fa-keyboard text-primary me-2"></i>เพิ่มข้อมูลรับเข้า (Manual Entry)
                    </h6>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close" style="font-size: 0.8rem;"></button>
                </div>

                <form id="manualAddForm" onsubmit="submitManualAdd(event)">
                    <div class="modal-body p-3">
                        <div class="row g-2">
                            
                            <div class="col-md-6">
                                <label class="form-label fw-bold text-secondary small mb-1">Item No. <span class="text-danger">*</span></label>
                                <input type="text" class="form-control form-control-sm shadow-sm border-info" id="man_item_no" required>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label fw-bold text-secondary small mb-1">Purchase Order <span class="text-danger">*</span></label>
                                <input type="text" class="form-control form-control-sm shadow-sm border-info" id="man_po" required>
                            </div>
                            
                            <div class="col-md-6">
                                <label class="form-label fw-bold text-secondary small mb-1">Carton/Package (Qty/ป้าย) <span class="text-danger">*</span></label>
                                <input type="number" class="form-control form-control-sm shadow-sm text-danger fw-bold border-info" id="man_qty" min="0.01" step="0.01" required>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label fw-bold text-secondary small mb-1">Package QTY (จำนวนป้าย) <span class="text-danger">*</span></label>
                                <input type="number" class="form-control form-control-sm shadow-sm text-primary fw-bold border-info" id="man_pack" min="1" step="1" value="1" required>
                            </div>

                            <div class="col-md-6">
                                <label class="form-label fw-bold text-secondary small mb-1">Invoice No. <span class="text-danger">*</span></label>
                                <input type="text" class="form-control form-control-sm shadow-sm border-info" id="man_inv" required>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label fw-bold text-secondary small mb-1">Date (วันที่รับเข้า) <span class="text-danger">*</span></label>
                                <input type="date" class="form-control form-control-sm shadow-sm border-info" id="man_date" value="<?= date('Y-m-d') ?>" required>
                            </div>

                            <div class="col-md-6">
                                <label class="form-label fw-bold text-secondary small mb-1">英文名称 (Category)</label>
                                <input type="text" class="form-control form-control-sm shadow-sm" id="man_category" placeholder="เช่น USER MANUAL">
                            </div>
                            <div class="col-md-6">
                                <label class="form-label fw-bold text-secondary small mb-1">Des. (Description)</label>
                                <input type="text" class="form-control form-control-sm shadow-sm" id="man_desc" placeholder="เช่น PM090142 TC-5608TSR English manual">
                            </div>

                            <div class="col-md-4">
                                <label class="form-label fw-bold text-secondary small mb-1">Pallet/Carton</label>
                                <input type="text" class="form-control form-control-sm shadow-sm" id="man_pallet">
                            </div>
                            <div class="col-md-4">
                                <label class="form-label fw-bold text-secondary small mb-1">CTN Number</label>
                                <input type="text" class="form-control form-control-sm shadow-sm" id="man_ctn">
                            </div>
                            <div class="col-md-4">
                                <label class="form-label fw-bold text-secondary small mb-1">Week</label>
                                <input type="text" class="form-control form-control-sm shadow-sm" id="man_week" placeholder="เช่น 12.26">
                            </div>

                            <div class="col-12">
                                <label class="form-label fw-bold text-secondary small mb-1">Remark</label>
                                <input type="text" class="form-control form-control-sm shadow-sm text-danger" id="man_remark" placeholder="หมายเหตุเพิ่มเติม...">
                            </div>
                        </div>
                    </div>
                    
                    <div class="modal-footer bg-light py-2 px-3 border-top">
                        <button type="button" class="btn btn-secondary btn-sm fw-bold px-3 shadow-sm" data-bs-dismiss="modal">ยกเลิก</button>
                        <button type="submit" class="btn btn-success btn-sm fw-bold px-4 shadow-sm" id="btnSubmitManual">
                            <i class="fas fa-save me-1"></i> บันทึกข้อมูล
                        </button>
                    </div>
                </form>

            </div>
        </div>
    </div>
    
    <!-- 🖨️ MODAL: โหมดพิมพ์ด่วน ZPL / Chrome Kiosk -->
    <div class="modal fade" id="thermalPrinterModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-lg modal-dialog-centered">
            <div class="modal-content shadow-lg border-0 rounded-3">
                <div class="modal-header bg-dark text-white py-2 px-3">
                    <h5 class="modal-title fw-bold" style="font-size: 1rem;">
                        <i class="fas fa-bolt text-warning me-2"></i> โหมดพิมพ์ด่วน (ZPL / Kiosk) - คลังสินค้า RM
                    </h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body bg-light p-3">
                    <ul class="nav nav-pills nav-fill mb-3 bg-white p-1 rounded border shadow-sm" id="printerTab" role="tablist">
                        <li class="nav-item" role="presentation">
                            <button class="nav-link active fw-bold py-2" id="kiosk-tab" data-bs-toggle="pill" data-bs-target="#kiosk-content" type="button" role="tab">
                                <i class="fab fa-chrome me-1 text-primary"></i> Chrome Kiosk
                            </button>
                        </li>
                        <li class="nav-item" role="presentation">
                            <button class="nav-link fw-bold py-2" id="zpl-tab" data-bs-toggle="pill" data-bs-target="#zpl-content" type="button" role="tab">
                                <i class="fas fa-usb me-1 text-success"></i> Direct ZPL
                            </button>
                        </li>
                        <li class="nav-item" role="presentation">
                            <button class="nav-link fw-bold py-2" id="preview-tab" data-bs-toggle="pill" data-bs-target="#preview-content" type="button" role="tab">
                                <i class="fas fa-eye me-1 text-info"></i> ตัวอย่างฉลาก
                            </button>
                        </li>
                    </ul>

                    <div class="tab-content" id="printerTabContent">
                        <!-- TAB 1: KIOSK SILENT PRINT -->
                        <div class="tab-pane fade show active" id="kiosk-content" role="tabpanel">
                            <div class="card border-0 shadow-sm mb-3">
                                <div class="card-body">
                                    <div class="d-flex align-items-center mb-2">
                                        <span class="badge bg-success me-2 px-2 py-1"><i class="fas fa-check-circle me-1"></i>พร้อมใช้ 100%</span>
                                        <h6 class="fw-bold mb-0 text-dark">พิมพ์เงียบอัตโนมัติ ไม่ต้องคลิกหน้าต่าง Print (&lt; 0.5 วินาที)</h6>
                                    </div>
                                    <p class="text-secondary small mb-3">
                                        วิธีนี้ใช้กับสาย USB และไดรเวอร์ Windows ปัจจุบันได้ทันที <b>ไม่ต้องให้ IT มาตั้งค่า IP หรือลงโปรแกรม PrintSet ใดๆ</b> เพียงแค่เปิด Chrome ด้วยโหมด Kiosk
                                    </p>

                                    <div class="bg-light p-3 rounded border mb-3">
                                        <h6 class="fw-bold text-primary small text-uppercase mb-2"><i class="fas fa-list-ol me-1"></i> ขั้นตอนเปิดใช้งานใน 3 สเต็ป:</h6>
                                        <ol class="small text-secondary mb-0 ps-3">
                                            <li class="mb-1">ตั้งค่าเครื่องพิมพ์ <b>Honeywell PC42E-T</b> ให้เป็น <b>Default Printer</b> ใน Windows</li>
                                            <li class="mb-1">คลิกขวาที่ไอคอน <b>Google Chrome บนหน้าจอ Desktop</b> -&gt; เลือก <b>Properties</b></li>
                                            <li class="mb-1">ในช่อง <b>Target</b> ให้เคาะวรรค 1 ครั้งที่ท้ายสุด แล้วเติม:
                                                <div class="input-group input-group-sm mt-1 mb-1" style="max-width: 380px;">
                                                    <input type="text" class="form-control font-monospace bg-white text-danger fw-bold" value=" --kiosk-printing" id="kioskParamInput" readonly>
                                                    <button class="btn btn-outline-secondary" type="button" onclick="navigator.clipboard.writeText(' --kiosk-printing'); Swal.fire('คัดลอกแล้ว', 'นำไปวางต่อท้ายในช่อง Target ได้เลย', 'success');">
                                                        <i class="fas fa-copy me-1"></i> คัดลอก
                                                    </button>
                                                </div>
                                            </li>
                                            <li>กด <b>OK</b> แล้วเปิดเบราว์เซอร์จากไอคอนนั้นเข้าใช้งาน MES</li>
                                        </ol>
                                    </div>

                                    <div class="d-flex justify-content-between align-items-center">
                                        <span class="small text-muted"><i class="fas fa-info-circle me-1"></i> ฉลากจะพ่นออกทันทีหลังจากกดปุ่มพิมพ์</span>
                                        <button type="button" class="btn btn-primary fw-bold px-3 shadow-sm" onclick="testSilentPrintAction('rm')">
                                            <i class="fas fa-print me-1"></i> ทดสอบพิมพ์ฉลากตัวอย่าง (4" × 2")
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- TAB 2: DIRECT USB ZPL -->
                        <div class="tab-pane fade" id="zpl-content" role="tabpanel">
                            <div class="card border-0 shadow-sm mb-3">
                                <div class="card-body">
                                    <div class="d-flex justify-content-between align-items-center mb-2">
                                        <h6 class="fw-bold mb-0 text-dark"><i class="fas fa-usb text-success me-1"></i> Web Serial API (Direct ZPL over USB)</h6>
                                        <span id="usbConnectionBadge" class="badge bg-secondary">ยังไม่ได้เชื่อมต่อ USB</span>
                                    </div>
                                    <p class="text-secondary small mb-3">
                                        ส่งคำสั่ง ZPL-II ดิบตรงเข้าหัวพิมพ์ Honeywell PC42E-T ผ่านพอร์ต USB โดยไม่ผ่านระบบพิมพ์ของ Windows
                                    </p>

                                    <div class="d-flex gap-2 mb-3">
                                        <button type="button" class="btn btn-success fw-bold btn-sm" id="btnConnectUsb" onclick="connectUsbPrinterAction()">
                                            <i class="fas fa-plug me-1"></i> เชื่อมต่อเครื่องพิมพ์ USB
                                        </button>
                                        <button type="button" class="btn btn-outline-danger fw-bold btn-sm d-none" id="btnDisconnectUsb" onclick="disconnectUsbPrinterAction()">
                                            <i class="fas fa-unlink me-1"></i> ตัดการเชื่อมต่อ
                                        </button>
                                        <button type="button" class="btn btn-outline-primary fw-bold btn-sm" onclick="sendTestZplAction()">
                                            <i class="fas fa-paper-plane me-1"></i> ส่งคำสั่ง ZPL ทดสอบ
                                        </button>
                                    </div>

                                    <label class="form-label small fw-bold text-secondary mb-1">รหัสคำสั่ง ZPL ที่สร้างขึ้น (4.00" x 2.00" @ 203 DPI):</label>
                                    <textarea id="zplPreviewBox" class="form-control font-monospace text-dark bg-white small" rows="8" readonly style="font-size: 0.75rem;"></textarea>
                                </div>
                            </div>
                        </div>

                        <!-- TAB 3: LIVE PREVIEW -->
                        <div class="tab-pane fade" id="preview-content" role="tabpanel">
                            <style>
                                /* 🖨️ Thermal Modal - 1:1 Live Preview of Store RM Tag (Screen rendering) */
                                .store-tag-preview-card {
                                    width: 4in;
                                    height: 2in;
                                    max-width: 100%;
                                    box-sizing: border-box;
                                    padding: 2mm 2mm 2mm 6mm;
                                    font-family: 'Arial', sans-serif;
                                    color: #000;
                                    background-color: #fff;
                                    display: flex;
                                    flex-direction: row;
                                    align-items: center;
                                    position: relative;
                                    border: 1px dashed #777;
                                    border-radius: 4px;
                                    box-shadow: 0 4px 15px rgba(0,0,0,0.1);
                                    margin: 0 auto;
                                    text-align: left;
                                }
                                .store-tag-preview-card .micro-text {
                                    position: absolute;
                                    font-size: 7px;
                                    color: #888;
                                    letter-spacing: 0.5px;
                                    white-space: nowrap;
                                    user-select: none;
                                }
                                .store-tag-preview-card .micro-top { top: 2px; left: 50%; transform: translateX(-50%); }
                                .store-tag-preview-card .micro-bottom { bottom: 2px; left: 50%; transform: translateX(-50%); }
                                .store-tag-preview-card .micro-left { left: 8px; top: 50%; transform: translate(-50%, -50%) rotate(-90deg); transform-origin: center; }
                                .store-tag-preview-card .micro-right { right: -2px; top: 50%; transform: translate(50%, -50%) rotate(90deg); transform-origin: center; }

                                .store-tag-preview-card .tag-details {
                                    width: 74%;
                                    padding-right: 6px;
                                    display: flex;
                                    flex-direction: column;
                                    justify-content: center;
                                    height: 100%;
                                    box-sizing: border-box;
                                }
                                .store-tag-preview-card .t-title { font-size: 17px; font-weight: bold; line-height: 1.2; margin-bottom: 2px; color: #000; }
                                .store-tag-preview-card .t-sub { font-size: 11px; font-weight: bold; line-height: 1.2; margin-bottom: 2px; color: #333; }
                                .store-tag-preview-card .t-desc {
                                    font-size: 10px;
                                    line-height: 1.2;
                                    margin-bottom: 4px;
                                    border-bottom: 1px solid #000;
                                    padding-bottom: 3px;
                                    display: -webkit-box;
                                    -webkit-line-clamp: 2;
                                    line-clamp: 2;
                                    -webkit-box-orient: vertical;
                                    overflow: hidden;
                                    white-space: normal;
                                }
                                .store-tag-preview-card .t-table { width: 100%; font-size: 10px; line-height: 1.2; }
                                .store-tag-preview-card .t-table td { padding: 1.5px 0; vertical-align: middle; }
                                .store-tag-preview-card .t-hl { font-size: 15px; font-weight: bold; line-height: 1; display: inline-block; color: #000; }

                                .store-tag-preview-card .tag-qr {
                                    width: 26%;
                                    display: flex;
                                    flex-direction: column;
                                    align-items: center;
                                    justify-content: center;
                                }
                                .store-tag-preview-card .tag-qr canvas, 
                                .store-tag-preview-card .tag-qr img {
                                    width: 80px !important;
                                    height: 80px !important;
                                }
                                .store-tag-preview-card .t-serial {
                                    font-size: 10px;
                                    font-weight: bold;
                                    margin-top: 4px;
                                    text-align: center;
                                    word-break: break-all;
                                    font-family: Arial, sans-serif;
                                }
                            </style>

                            <div class="card border-0 shadow-sm text-center p-3">
                                <div class="d-flex justify-content-between align-items-center mb-2 px-1">
                                    <h6 class="fw-bold text-secondary mb-0">พิกัดและขนาดฉลากจริง (4.00" x 2.00" / 812 x 406 Dots)</h6>
                                    <span class="badge bg-light text-dark border"><i class="fas fa-tag me-1 text-primary"></i>Store RM Tag Standard</span>
                                </div>

                                <div class="d-flex justify-content-center my-2 overflow-auto py-1">
                                    <div class="store-tag-preview-card" id="rmPreviewTagCard">
                                        <div class="micro-text micro-top">RM-261020-0001</div>
                                        <div class="micro-text micro-bottom">RM-261020-0001</div>
                                        <div class="micro-text micro-left">RM-261020-0001</div>
                                        <div class="micro-text micro-right">RM-261020-0001</div>
                                        <div class="tag-details">
                                            <div class="t-title">RAW-ALUM-001</div>
                                            <div class="t-sub">ALUMINUM RAW MATERIAL</div>
                                            <div class="t-desc" title="Aluminum Sheet Alloy 6061-T6 2.0mm x 1200mm">Aluminum Sheet Alloy 6061-T6 2.0mm x 1200mm</div>
                                            
                                            <table class="t-table">
                                                <tr>
                                                    <td style="width: 55%;"><b>QTY:</b> <span class="t-hl">1,500</span></td>
                                                    <td style="width: 45%;"><b>Inv:</b> <span style="display:inline-block; max-width:100px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; vertical-align:middle;">WH-RM01</span></td>
                                                </tr>
                                                <tr>
                                                    <td style="padding-right: 5px;"><b>PO:</b> <span style="display:inline-block; max-width:105px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; vertical-align:middle;">PO2610-0988</span></td>
                                                    <td><b>Pallet:</b> <span style="display:inline-block; max-width:90px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; vertical-align:middle;">PL-01</span></td>
                                                </tr>
                                                <tr>
                                                    <td style="padding-right: 5px;"><b>CTN:</b> <span style="display:inline-block; max-width:100px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; vertical-align:middle;">1/10</span></td>
                                                    <td><b>Week:</b> <span style="display:inline-block; max-width:90px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; vertical-align:middle;">W42</span></td>
                                                </tr>
                                                <tr>
                                                    <td style="padding-right: 5px;"><b>Date:</b> <?php echo date('Y-m-d'); ?></td>
                                                    <td><b>Remark:</b> <span style="display:inline-block; max-width:90px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; vertical-align:middle;">PASS</span></td>
                                                </tr>
                                            </table>
                                        </div>
                                        <div class="tag-qr">
                                            <div id="modalPreviewQr"></div>
                                            <div class="t-serial">RM-261020-0001</div>
                                        </div>
                                    </div>
                                </div>

                                <div class="mt-2 small text-muted">
                                    <i class="fas fa-check-circle text-success me-1"></i> โครงสร้างการ์ดและฟอนต์ 1:1 กับสติ๊กเกอร์สโตร์จริง พร้อม Micro-Text 4 ด้าน และ QR Code สำหรับเครื่องยิงสแกนเนอร์
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer bg-white py-2">
                    <button type="button" class="btn btn-secondary px-4 btn-sm" data-bs-dismiss="modal">ปิดหน้าต่าง</button>
                </div>
            </div>
        </div>
    </div>
    
    <?php include_once __DIR__ . '/components/storeScanner.php'; ?>
    
    <script>
        const currentUser = <?php echo json_encode($_SESSION['user'] ?? null); ?>;
        const CAN_MANAGE_WH = <?php echo json_encode(hasPermission('manage_warehouse')); ?>;
        const CAN_MANAGE_RM = <?php echo json_encode(hasPermission('manage_rm_receiving')); ?>;
    </script>

    <script src="../../utils/libs/xlsx.full.min.js"></script>
    <script src="../production/script/thermalPrinter.js?v=<?php echo filemtime(__DIR__ . '/../production/script/thermalPrinter.js'); ?>"></script>
    <script src="script/storeCommon.js?v=<?php echo filemtime(__DIR__ . '/script/storeCommon.js'); ?>" defer></script>
    <script src="script/storeOffline.js?v=<?php echo filemtime(__DIR__ . '/script/storeOffline.js'); ?>" defer></script>
    <script src="script/rmReceiving.js?v=<?php echo filemtime(__DIR__ . '/script/rmReceiving.js'); ?>" defer></script>
</body>
</html>