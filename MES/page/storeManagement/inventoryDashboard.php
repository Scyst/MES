<?php
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
    <style>
        .kpi-card { transition: transform 0.2s; border-left: 4px solid; }
        .kpi-card:hover { transform: translateY(-3px); }
        .table-responsive-custom { max-height: calc(100vh - 300px); overflow-y: auto; }
        
        /* ไฮไลท์แถวที่สต็อกเป็น 0 หรือติดลบ */
        .row-out-of-stock { background-color: #fff5f5 !important; }
        .row-out-of-stock td { color: #dc3545 !important; }

        /* 🖨️ รูปแบบสำหรับเครื่องปริ้นท์สติ๊กเกอร์บาร์โค้ด */
        @media print {
            body * { visibility: hidden !important; }
            #printArea, #printArea * { visibility: visible !important; }
            #printArea { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 0; }
            
            .tag-print-card { 
                width: 80mm; height: 50mm; 
                border: 2px solid #000; padding: 4mm; margin-bottom: 5mm; 
                page-break-after: always; font-family: Arial, sans-serif;
                display: flex; flex-direction: column; justify-content: space-between;
                box-sizing: border-box;
            }
            .tag-print-header { font-size: 16px; font-weight: bold; border-bottom: 2px solid #000; padding-bottom: 3px; text-align: center; }
            .tag-print-body { display: flex; justify-content: space-between; align-items: center; flex-grow: 1; margin-top: 5px;}
            .tag-print-info { font-size: 13px; line-height: 1.5; width: 60%; }
            .tag-print-qr { width: 40%; text-align: right; display: flex; flex-direction: column; align-items: flex-end;}
        }
    </style>
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

    <div class="modal fade" id="detailsModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-lg modal-dialog-centered">
            <div class="modal-content border-0 shadow-lg">
                <div class="modal-header bg-dark text-white">
                    <h5 class="modal-title fw-bold"><i class="fas fa-search-location me-2"></i> พิกัดวัตถุดิบ (Locations)</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body p-0">
                    <div class="p-3 bg-light border-bottom">
                        <h4 class="fw-bold text-primary mb-0" id="modalItemNo">-</h4>
                        <div class="text-muted small" id="modalItemDesc">-</div>
                    </div>
                    
                    <div class="row g-0">
                        <div class="col-md-6 p-3 border-end">
                            <h6 class="fw-bold text-success mb-3"><i class="fas fa-check-circle me-1"></i> พร้อมใช้งาน (Available)</h6>
                            <table class="table table-sm table-bordered text-nowrap">
                                <thead class="table-light"><tr><th>Location</th><th class="text-end">QTY</th></tr></thead>
                                <tbody id="modalAvailTbody"></tbody>
                            </table>
                        </div>
                        <div class="col-md-6 p-3">
                            <h6 class="fw-bold text-warning mb-3"><i class="fas fa-truck me-1"></i> รอรับเข้า (Pending)</h6>
                            <table class="table table-sm table-bordered text-nowrap">
                                <thead class="table-light"><tr><th>Pallet / CTN</th><th class="text-end">QTY</th></tr></thead>
                                <tbody id="modalPendTbody"></tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div id="printArea" class="d-none"></div>

    <div class="modal fade" id="issueModal" tabindex="-1" aria-hidden="true" data-bs-backdrop="static">
        <div class="modal-dialog modal-lg modal-dialog-centered">
            <div class="modal-content border-0 shadow-lg">
                <div class="modal-header bg-dark text-white">
                    <h5 class="modal-title fw-bold"><i class="fas fa-dolly me-2"></i> เบิกจ่ายวัตถุดิบ (Smart Issue)</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body p-4 bg-light">
                    
                    <div class="row g-2 mb-3 align-items-end">
                        <div class="col-md-8">
                            <label class="form-label fw-bold text-secondary">1. สแกนพาเลทแม่ / CTN / Serial</label>
                            <div class="input-group input-group-lg shadow-sm border border-primary rounded">
                                <span class="input-group-text bg-white text-primary border-0"><i class="fas fa-barcode"></i></span>
                                <input type="text" id="issueBarcode" class="form-control border-0 fw-bold text-primary" placeholder="สแกนหรือพิมพ์รหัส..." autocomplete="off">
                            </div>
                        </div>
                        <div class="col-md-4">
                            <button class="btn btn-primary btn-lg w-100 fw-bold shadow-sm" onclick="fetchPalletTags()">
                                <i class="fas fa-search me-2"></i> ดึงข้อมูล
                            </button>
                        </div>
                    </div>

                    <div class="card border-0 shadow-sm mb-3">
                        <div class="card-header bg-white py-2 d-flex justify-content-between align-items-center">
                            <span class="fw-bold text-dark"><i class="fas fa-list-check me-2"></i> 2. เลือก Tag ที่ต้องการเบิกจริง</span>
                            <span class="badge bg-primary rounded-pill" id="selectedTagsCount">เลือก 0 รายการ</span>
                        </div>
                        <div class="table-responsive" style="max-height: 250px; overflow-y: auto;">
                            <table class="table table-sm table-hover table-striped align-middle mb-0 text-nowrap">
                                <thead class="table-light sticky-top">
                                    <tr>
                                        <th class="text-center" style="width: 50px;">
                                            <input class="form-check-input" type="checkbox" id="checkAllTags" onchange="toggleAllTags(this)">
                                        </th>
                                        <th>Serial No. (ป้ายย่อย)</th>
                                        <th>Part No.</th>
                                        <th class="text-end pe-3">QTY</th>
                                    </tr>
                                </thead>
                                <tbody id="issueTagsTbody">
                                    <tr><td colspan="4" class="text-center py-4 text-muted">กรุณาสแกนบาร์โค้ดเพื่อดึงรายการ</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div class="mb-4">
                        <label class="form-label fw-bold text-secondary">3. โลเคชั่นปลายทาง (ส่งเข้าไลน์ไหน)</label>
                        <select id="issueToLocation" class="form-select form-select-lg fw-bold shadow-sm"></select>
                    </div>

                    <button class="btn btn-success btn-lg w-100 fw-bold shadow-sm" id="btnSubmitIssue" onclick="submitSpecificIssue()" disabled>
                        <i class="fas fa-print me-2"></i> ยืนยันเบิก & พิมพ์สติ๊กเกอร์ (Issue & Print)
                    </button>
                    
                </div>
            </div>
        </div>
    </div>

    <div class="modal fade" id="cycleCountModal" tabindex="-1" aria-hidden="true" data-bs-backdrop="static">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content border-0 shadow-lg">
                <div class="modal-header bg-dark text-white">
                    <h5 class="modal-title fw-bold"><i class="fas fa-clipboard-list me-2"></i> ปรับปรุง/นับสต็อก (Cycle Count)</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                </div>
                <form id="cycleCountForm" onsubmit="submitCycleCount(event)">
                    <div class="modal-body p-4 bg-light">
                        <div class="mb-3">
                            <h5 class="fw-bold text-primary mb-1" id="ccItemNo">-</h5>
                            <div class="text-muted small" id="ccItemDesc">-</div>
                        </div>
                        <input type="hidden" id="ccItemId">
                        
                        <div class="mb-3">
                            <label class="form-label fw-bold text-secondary">นับของที่คลังไหน? (Location)</label>
                            <select id="ccLocation" class="form-select border-secondary-subtle shadow-sm" required></select>
                        </div>

                        <div class="mb-3">
                            <label class="form-label fw-bold text-secondary">ยอดที่นับได้จริง (Actual QTY)</label>
                            <input type="number" id="ccActualQty" class="form-control form-control-lg fw-bold text-danger border-secondary-subtle shadow-sm" min="0" step="0.01" required>
                        </div>

                        <div class="mb-1">
                            <label class="form-label fw-bold text-secondary">หมายเหตุ / สาเหตุ (ถ้ามี)</label>
                            <input type="text" id="ccRemark" class="form-control border-secondary-subtle shadow-sm" placeholder="เช่น นับสต็อกประจำเดือน, พบของเสียหาย...">
                        </div>
                    </div>
                    <div class="modal-footer bg-white border-top">
                        <button type="button" class="btn btn-secondary fw-bold" data-bs-dismiss="modal">ยกเลิก</button>
                        <button type="submit" class="btn btn-primary fw-bold px-4" id="btnSubmitCC"><i class="fas fa-paper-plane me-1"></i> ส่งคำขอปรับยอด</button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <div class="modal fade" id="approvalModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
            <div class="modal-content border-0 shadow-lg bg-body-tertiary">
                <div class="modal-header bg-warning">
                    <h5 class="modal-title fw-bold text-dark"><i class="fas fa-clipboard-check me-2"></i> รายการรออนุมัติปรับยอดสต็อก</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body p-0">
                    <div class="table-responsive">
                        <table class="table table-hover align-middle mb-0 text-nowrap">
                            <thead class="table-light sticky-top shadow-sm">
                                <tr>
                                    <th>Date</th>
                                    <th>Item No.</th>
                                    <th>Location</th>
                                    <th class="text-end">System QTY</th>
                                    <th class="text-end text-primary">Actual QTY</th>
                                    <th class="text-end">Diff</th>
                                    <th>Remark</th>
                                    <th>Counter</th>
                                    <th class="text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody id="approvalTbody">
                                </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div class="modal fade" id="ccHistoryModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
            <div class="modal-content border-0 shadow-lg bg-body-tertiary">
                <div class="modal-header bg-info text-white">
                    <h5 class="modal-title fw-bold"><i class="fas fa-history me-2"></i> ประวัติการปรับปรุงสต็อกย้อนหลัง</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body p-0">
                    <div class="table-responsive">
                        <table class="table table-hover align-middle mb-0 text-nowrap" style="font-size: 0.9rem;">
                            <thead class="table-light sticky-top shadow-sm">
                                <tr>
                                    <th>เวลาที่อนุมัติ</th>
                                    <th>Item No.</th>
                                    <th>Location</th>
                                    <th class="text-end">System</th>
                                    <th class="text-end">Actual</th>
                                    <th class="text-end">Diff</th>
                                    <th class="text-center">Status</th>
                                    <th>คนนับ / คนอนุมัติ</th>
                                </tr>
                            </thead>
                            <tbody id="ccHistoryTbody"></tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script src="../../utils/libs/qrcode.min.js"></script>
    <script>
        const currentUser = <?php echo json_encode($_SESSION['user'] ?? null); ?>;
        const CAN_MANAGE_WH = <?php echo json_encode(hasPermission('manage_warehouse')); ?>;
        const CAN_MANAGE_RM = <?php echo json_encode(hasPermission('manage_rm_receiving')); ?>;
    </script>
    <script src="script/inventoryDashboard.js?v=<?php echo time(); ?>"></script>
</body>
</html>