<?php
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
    
    <style>
        .table-responsive-custom { max-height: calc(100vh - 350px); overflow-y: auto; }
        .row-checkbox { transform: scale(1.2); cursor: pointer; }
        /* หมายเหตุ: CSS สำหรับ Print ถูกย้ายไปที่ components/store_scanner.php แล้ว */
    </style>
</head>

<body class="layout-top-header bg-body-tertiary">

    <?php include '../components/php/top_header.php'; ?>
    
    <div class="page-container">
        <div id="main-content">
            
            <div class="px-3 pt-3">
                <div class="row g-2 mb-3">
                    <div class="col-6 col-md-3">
                        <div class="card shadow-sm kpi-card border-primary h-100">
                            <div class="card-body p-3">
                                <div class="d-flex justify-content-between align-items-center">
                                    <div>
                                        <div class="text-uppercase text-primary small fw-bold mb-1">รวมทั้งหมด (Tags)</div>
                                        <h2 class="text-primary fw-bold mb-0" id="kpi-total-tags">0</h2>
                                        <div class="small text-muted mt-1" style="font-size: 0.75rem;">จำนวนพาเลท/กล่อง</div>
                                    </div>
                                    <div class="bg-primary bg-opacity-10 text-primary p-3 rounded-circle">
                                        <i class="fas fa-boxes fa-lg"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="col-6 col-md-3">
                        <div class="card shadow-sm kpi-card border-info h-100">
                            <div class="card-body p-3">
                                <div class="d-flex justify-content-between align-items-center">
                                    <div>
                                        <div class="text-uppercase text-info small fw-bold mb-1">ปริมาณรวม (PCS)</div>
                                        <h2 class="text-info fw-bold mb-0" id="kpi-total-qty">0</h2>
                                        <div class="small text-muted mt-1" style="font-size: 0.75rem;">จำนวนชิ้นรับเข้า</div>
                                    </div>
                                    <div class="bg-info bg-opacity-10 text-info p-3 rounded-circle">
                                        <i class="fas fa-cubes fa-lg"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="col-6 col-md-3">
                        <div class="card shadow-sm kpi-card border-success h-100">
                            <div class="card-body p-3">
                                <div class="d-flex justify-content-between align-items-center">
                                    <div>
                                        <div class="text-uppercase text-success small fw-bold mb-1">พิมพ์แล้ว (Printed)</div>
                                        <h2 class="text-success fw-bold mb-0" id="kpi-printed">0</h2>
                                        <div class="small text-muted mt-1" style="font-size: 0.75rem;">พิมพ์สติ๊กเกอร์แล้ว</div>
                                    </div>
                                    <div class="bg-success bg-opacity-10 text-success p-3 rounded-circle">
                                        <i class="fas fa-print fa-lg"></i>
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
                                        <div class="text-uppercase text-warning small fw-bold mb-1">รอพิมพ์ (Pending)</div>
                                        <h2 class="text-warning fw-bold mb-0" id="kpi-pending">0</h2>
                                        <div class="small text-muted mt-1" style="font-size: 0.75rem;">ยังไม่ได้พิมพ์ Tag</div>
                                    </div>
                                    <div class="bg-warning bg-opacity-10 text-warning p-3 rounded-circle">
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
                        <div class="d-flex flex-wrap align-items-center justify-content-between gap-2">
                            
                            <div class="d-flex align-items-center gap-2 flex-grow-1 flex-wrap">
                                <div class="input-group input-group-sm" style="max-width: 250px;">
                                    <span class="input-group-text bg-body border-secondary-subtle text-secondary"><i class="fas fa-search"></i></span>
                                    <input type="text" id="searchInput" class="form-control border-secondary-subtle ps-2" placeholder="Search Serial, Item, PO...">
                                </div>
                                
                                <div class="input-group input-group-sm shadow-sm" style="width: auto;">
                                    <span class="input-group-text bg-white border-secondary-subtle text-secondary small">วันที่:</span>
                                    <input type="date" id="filterStartDate" class="form-control border-secondary-subtle" value="<?php echo date('Y-m-01'); ?>">
                                    <span class="input-group-text bg-white border-secondary-subtle border-start-0 border-end-0">-</span>
                                    <input type="date" id="filterEndDate" class="form-control border-secondary-subtle" value="<?php echo date('Y-m-d'); ?>">
                                </div>

                                <div class="input-group input-group-sm d-none d-md-flex" style="max-width: 150px;">
                                    <span class="input-group-text bg-white border-secondary-subtle text-secondary small">Rows:</span>
                                    <select id="rowsPerPage" class="form-select border-secondary-subtle" onchange="changeRowsPerPage()">
                                        <option value="50">50</option>
                                        <option value="100" selected>100</option>
                                        <option value="500">500</option>
                                    </select>
                                </div>

                                <button class="btn btn-outline-secondary btn-sm d-flex align-items-center justify-content-center" 
                                        onclick="loadHistory()" title="Refresh Data" style="width: 32px; height: 32px;"> 
                                    <i class="fas fa-sync-alt"></i>
                                </button>
                            </div>

                            <div class="d-flex align-items-center gap-2 flex-wrap justify-content-end">
                                <div class="dropdown d-none" id="btnBatchPrintDropdown">
                                    <button class="btn btn-dark btn-sm shadow-sm dropdown-toggle fw-bold" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                                        <i class="fas fa-layer-group me-1"></i> จัดการรายการ (<span id="selectedCount">0</span>)
                                    </button>
                                    <ul class="dropdown-menu shadow-lg border-0" style="font-size: 0.95rem;">
                                        <li>
                                            <a class="dropdown-item py-2 fw-bold" href="#" onclick="printSelectedTags()">
                                                <i class="fas fa-print text-dark fa-fw me-2"></i> พิมพ์แยกใบ (Individual)
                                            </a>
                                        </li>
                                        <li><hr class="dropdown-divider"></li>
                                        <li>
                                            <a class="dropdown-item py-2 fw-bold text-primary bg-primary bg-opacity-10" href="#" onclick="groupToMasterPallet()">
                                                <i class="fas fa-boxes fa-fw me-2"></i> จัดพาเลทรวม (Master Pallet)
                                            </a>
                                        </li>
                                    </ul>
                                </div>
                                
                                <button class="btn btn-danger btn-sm shadow-sm d-none fw-bold" id="btnBatchDelete" onclick="deleteSelectedTags()">
                                    <i class="fas fa-trash me-1"></i> ลบ (<span id="selectedDeleteCount">0</span>)
                                </button>

                                <button class="btn btn-info btn-sm fw-bold px-3 shadow-sm text-white" onclick="openTraceModal()">
                                    <i class="fas fa-barcode me-1"></i> ตรวจสอบ Tag
                                </button>

                                <button class="btn btn-success btn-sm fw-bold px-3 shadow-sm" id="btnExportExcel" onclick="exportToExcel()">
                                    <i class="fas fa-file-excel me-1"></i> Export
                                </button>
                                
                                <?php if($canManageRM): ?>
                                <button class="btn btn-primary btn-sm fw-bold px-3 shadow-sm" onclick="openImportModal()">
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
                    <div class="table-responsive-custom flex-grow-1">
                        <table class="table table-striped table-hover align-middle mb-0 text-nowrap" style="font-size: 0.9rem;">
                            <thead class="sticky-top table-light shadow-sm">
                                <tr class="text-secondary small text-uppercase align-middle">
                                    <th class="text-center" style="width: 40px;">
                                        <input class="form-check-input" type="checkbox" id="selectAllCheckbox" onchange="toggleSelectAll(this)">
                                    </th>
                                    <th style="min-width: 110px;">เพิ่มเข้าระบบ</th>
                                    <th style="min-width: 90px;">วันที่รับจริง</th>
                                    <th class="text-center" style="min-width: 130px;">Serial No.</th>
                                    <th class="text-center" style="min-width: 100px;">Item No.</th>
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
                    
                    <div class="card-footer bg-white border-top d-flex justify-content-between align-items-center pt-2 pb-2 rounded-bottom">
                        <small class="text-muted fw-bold" id="paginationInfo">แสดง 0 ถึง 0 จาก 0 รายการ</small>
                        <nav>
                            <ul class="pagination pagination-sm mb-0" id="paginationControls"></ul>
                        </nav>
                    </div>
                </div>
            </div>

        </div>
    </div>

    <div class="modal fade" id="importModal" tabindex="-1" aria-labelledby="importModalLabel" aria-hidden="true" data-bs-backdrop="static">
        <div class="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
            <div class="modal-content h-100">
                <div class="modal-header bg-light">
                    <h5 class="modal-title fw-bold" id="importModalLabel"><i class="fas fa-file-excel text-success me-2"></i> นำเข้าข้อมูล Shipping</h5>
                    <button type="button" class="btn btn-sm btn-outline-success ms-3 fw-bold" onclick="downloadTemplate()">
                        <i class="fas fa-file-download me-1"></i> โหลด Template
                    </button>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body d-flex flex-column p-3">
                    <div class="row g-3 mb-3 align-items-center">
                        <div class="col-md-8 d-flex gap-2">
                            <input type="file" id="excelFile" class="form-control" accept=".xlsx, .xls, .csv">
                            <button class="btn btn-dark text-nowrap" onclick="processExcel()">
                                <i class="fas fa-search"></i> แสดงตัวอย่าง
                            </button>
                        </div>
                        <div class="col-md-4 text-end">
                            <span class="text-primary fw-bold" id="previewCount">พบข้อมูล: 0 พาเลท</span>
                        </div>
                    </div>

                    <div class="table-responsive border rounded flex-fill" style="min-height: 300px;">
                        <table class="table table-sm table-hover table-bordered mb-0 text-nowrap" id="previewTable">
                            <thead class="table-secondary sticky-top">
                                <tr>
                                    <th>Item No.</th>
                                    <th>Category</th>
                                    <th>Description</th>
                                    <th>PO Number</th>
                                    <th class="text-end">Qty/Pallet</th>
                                    <th class="text-end">Package QTY</th>
                                    <th>Invoice No.</th>
                                    <th>Remark</th> 
                                </tr>
                            </thead>
                            <tbody id="previewTbody">
                                <tr><td colspan="8" class="text-center text-muted py-5">กรุณาเลือกไฟล์และกดแสดงตัวอย่าง</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
                <div class="modal-footer bg-light">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">ยกเลิก</button>
                    <button type="button" class="btn btn-success d-none" id="btnSave" onclick="submitToDatabase()">
                        <i class="fas fa-save me-1"></i> บันทึกรับเข้าสต็อก
                    </button>
                </div>
            </div>
        </div>
    </div>

    <?php include_once __DIR__ . '/components/store_scanner.php'; ?>
    
    <script>
        const currentUser = <?php echo json_encode($_SESSION['user'] ?? null); ?>;
        const CAN_MANAGE_WH = <?php echo json_encode(hasPermission('manage_warehouse')); ?>;
        const CAN_MANAGE_RM = <?php echo json_encode(hasPermission('manage_rm_receiving')); ?>;
    </script>

    <script src="../../utils/libs/xlsx.full.min.js"></script>
    <script src="script/rmReceiving.js?v=<?php echo filemtime(__DIR__ . '/script/rmReceiving.js'); ?>" defer></script>
</body>
</html>