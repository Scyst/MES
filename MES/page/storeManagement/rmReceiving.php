<?php
// MES/page/storeManagement/rmReceiving.php
require_once __DIR__ . '/../components/init.php';
requirePermission('view_warehouse');

$currentUserForJS = $_SESSION['user'] ?? null;
$canManageRM = hasPermission('manage_rm_receiving');

$pageTitle = "RM Receiving & Tagging";
$pageIcon = "fas fa-pallet"; 
$pageHeaderTitle = "Raw Material Receiving";
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
                        <div class="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 w-100">
                            
                            <div class="d-flex flex-column flex-md-row align-items-md-center gap-2 flex-grow-1">
                                
                                <div class="d-flex align-items-center gap-2 w-100 w-md-auto" style="max-width: 400px;">
                                    <div class="input-group input-group-sm flex-grow-1">
                                        <span class="input-group-text bg-body border-secondary-subtle text-secondary"><i class="fas fa-search"></i></span>
                                        <input type="text" id="searchInput" class="form-control border-secondary-subtle ps-2" placeholder="Search Serial, Item, PO...">
                                    </div>
                                    <button class="btn btn-outline-secondary btn-sm shadow-sm flex-shrink-0" onclick="loadHistory()" title="Refresh Data" style="width: 32px; height: 32px;"> 
                                        <i class="fas fa-sync-alt"></i>
                                    </button>
                                    <button class="btn btn-outline-primary btn-sm shadow-sm flex-shrink-0 d-md-none" id="btnToggleCards" onclick="toggleMobileCards()" title="ซ่อน/แสดงรายการ" style="width: 32px; height: 32px;"> 
                                        <i class="fas fa-eye-slash"></i>
                                    </button>
                                </div>
                                
                                <div class="input-group input-group-sm shadow-sm w-100 w-md-auto" style="max-width: 350px;">
                                    <span class="input-group-text bg-white border-secondary-subtle text-secondary small">วันที่:</span>
                                    <input type="date" id="filterStartDate" class="form-control border-secondary-subtle" value="<?php echo date('Y-m-01'); ?>">
                                    <span class="input-group-text bg-white border-secondary-subtle border-start-0 border-end-0">-</span>
                                    <input type="date" id="filterEndDate" class="form-control border-secondary-subtle" value="<?php echo date('Y-m-d'); ?>">
                                </div>

                                <div class="input-group input-group-sm d-none d-md-flex" style="width: 90px;">
                                    <select id="rowsPerPage" class="form-select border-secondary-subtle" onchange="changeRowsPerPage()">
                                        <option value="50">50</option>
                                        <option value="100" selected>100</option>
                                        <option value="500">500</option>
                                    </select>
                                </div>
                            </div>

                            <div id="actionWrapper" class="d-none d-md-flex flex-wrap align-items-center gap-2 justify-content-start justify-content-md-end">
                                <div class="dropdown d-none" id="btnBatchPrintDropdown">
                                    <button class="btn btn-dark btn-sm shadow-sm dropdown-toggle fw-bold" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                                        <i class="fas fa-layer-group me-1"></i> จัดการ (<span id="selectedCount">0</span>)
                                    </button>
                                    <ul class="dropdown-menu shadow-lg border-0" style="font-size: 0.95rem;">
                                        <li><a class="dropdown-item py-2 fw-bold" href="#" onclick="printSelectedTags()"><i class="fas fa-print text-dark fa-fw me-2"></i> พิมพ์แยกใบ</a></li>
                                        <li><hr class="dropdown-divider"></li>
                                        <li><a class="dropdown-item py-2 fw-bold text-primary bg-primary bg-opacity-10" href="#" onclick="groupToMasterPallet()"><i class="fas fa-boxes fa-fw me-2"></i> จัดพาเลทรวม</a></li>
                                    </ul>
                                </div>
                                <button class="btn btn-danger btn-sm shadow-sm d-none fw-bold" id="btnBatchDelete" onclick="deleteSelectedTags()">
                                    <i class="fas fa-trash me-1"></i> ลบ (<span id="selectedDeleteCount">0</span>)
                                </button>
                                
                                <button class="btn btn-info btn-sm fw-bold px-3 shadow-sm text-white d-none d-md-inline-block" onclick="openTraceModal()">
                                    <i class="fas fa-qrcode me-1"></i> ตรวจสอบ Tag
                                </button>
                                <button class="btn btn-success btn-sm fw-bold px-3 shadow-sm d-none d-md-inline-block" id="btnExportExcel" onclick="exportToExcel()">
                                    <i class="fas fa-file-excel me-1"></i> Export
                                </button>
                                <?php if($canManageRM): ?>
                                <button class="btn btn-primary btn-sm fw-bold px-3 shadow-sm d-none d-md-inline-block" onclick="openImportModal()">
                                    <i class="fas fa-file-import me-1"></i> Import
                                </button>
                                <?php endif; ?>
                            </div>
                        </div>
                    </div>
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
        <button class="btn btn-info text-white rounded-circle shadow-lg d-flex align-items-center justify-content-center" 
                onclick="openTraceModal()" title="สแกนรับ / เบิก" 
                style="width: 60px; height: 60px; font-size: 24px;">
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
    
    <?php include_once __DIR__ . '/components/storeScanner.php'; ?>
    
    <script>
        const currentUser = <?php echo json_encode($_SESSION['user'] ?? null); ?>;
        const CAN_MANAGE_WH = <?php echo json_encode(hasPermission('manage_warehouse')); ?>;
        const CAN_MANAGE_RM = <?php echo json_encode(hasPermission('manage_rm_receiving')); ?>;
    </script>

    <script src="../../utils/libs/xlsx.full.min.js"></script>
    <script src="script/storeCommon.js?v=<?php echo filemtime(__DIR__ . '/script/storeCommon.js'); ?>" defer></script>
    <script src="script/rmReceiving.js?v=<?php echo filemtime(__DIR__ . '/script/rmReceiving.js'); ?>" defer></script>
</body>
</html>