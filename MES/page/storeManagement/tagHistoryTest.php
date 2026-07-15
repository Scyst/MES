<?php
require_once __DIR__ . '/../components/init.php';
requirePermission('view_warehouse');

$pageTitle = "ประวัติแท็ก (Trace Tag)";
$pageIcon = "fas fa-search-location";
$pageHeaderTitle = "Trace Tag History";
$pageHeaderSubtitle = "ค้นหาประวัติการเคลื่อนไหวของแท็ก / บาร์โค้ด";
?>
<!DOCTYPE html>
<html lang="th">
<head>
    <title><?php echo $pageTitle; ?></title>
    <?php include_once '../components/common_head.php'; ?>
    <style>
        .dashboard-header-sticky {
            position: sticky;
            top: 60px;
            z-index: 1040;
            background-color: var(--bs-body-bg);
            padding-bottom: 0.5rem;
            margin-bottom: 1rem;
        }
        @media (max-width: 991.98px) {
            .dashboard-header-sticky { top: 56px; }
        }
        .kpi-card { transition: transform 0.2s; border-top: none !important; border-right: none !important; border-bottom: none !important; border-left: 4px solid !important; }
        /* Modal Tag Info */
        .tag-label { font-size: 0.72rem; color: #6b7280; font-weight: 600; margin-bottom: 4px; }
        .tag-value { font-size: 0.95rem; font-weight: 700; color: #111827; line-height: 1.3; }
        .tag-sub   { font-size: 0.82rem; font-weight: 600; color: #6b7280; }
    </style>
</head>
<body class="layout-top-header bg-body-tertiary">

    <?php include '../components/php/top_header.php'; ?>
    
    <div class="page-container">
        <div id="main-content">
            
            <!-- Daily KPI Cards (Dashboard) -->
            <div class="px-3 pt-3" id="kpiContainer">
                <div class="row g-2 mb-1 flex-nowrap overflow-x-auto pb-1" style="-webkit-overflow-scrolling: touch;">
                    
                    <!-- Total -->
                    <div class="col" style="min-width: 200px;">
                        <div class="card shadow-sm kpi-card border-primary h-100">
                            <div class="card-body p-3">
                                <div class="d-flex justify-content-between align-items-center">
                                    <div>
                                        <div class="text-uppercase text-primary small fw-bold mb-1">รายการเคลื่อนไหวทั้งหมด</div>
                                        <h3 class="text-dark fw-bold mb-0" id="kpiTotal">-</h3>
                                        <div class="small text-muted mt-1">ประจำวันนี้</div>
                                    </div>
                                    <div class="bg-primary bg-opacity-10 text-primary p-2 rounded-circle d-none d-sm-block">
                                        <i class="fas fa-chart-line fa-lg"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Receive -->
                    <div class="col" style="min-width: 200px;">
                        <div class="card shadow-sm kpi-card border-success h-100">
                            <div class="card-body p-3">
                                <div class="d-flex justify-content-between align-items-center">
                                    <div>
                                        <div class="text-uppercase text-success small fw-bold mb-1">รับเข้า / สร้างแท็ก</div>
                                        <h3 class="text-success fw-bold mb-0" id="kpiReceive">-</h3>
                                        <div class="small text-muted mt-1">ประจำวันนี้</div>
                                    </div>
                                    <div class="bg-success bg-opacity-10 text-success p-2 rounded-circle d-none d-sm-block">
                                        <i class="fas fa-box-open fa-lg"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Issue -->
                    <div class="col" style="min-width: 200px;">
                        <div class="card shadow-sm kpi-card border-warning h-100">
                            <div class="card-body p-3">
                                <div class="d-flex justify-content-between align-items-center">
                                    <div>
                                        <div class="text-uppercase text-warning small fw-bold mb-1">เบิกจ่าย (Issue)</div>
                                        <h3 class="text-warning fw-bold mb-0" id="kpiIssue">-</h3>
                                        <div class="small text-muted mt-1">ประจำวันนี้</div>
                                    </div>
                                    <div class="bg-warning bg-opacity-10 text-warning p-2 rounded-circle d-none d-sm-block">
                                        <i class="fas fa-truck-loading fa-lg"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- WIP Transfer -->
                    <div class="col" style="min-width: 200px;">
                        <div class="card shadow-sm kpi-card border-info h-100">
                            <div class="card-body p-3">
                                <div class="d-flex justify-content-between align-items-center">
                                    <div>
                                        <div class="text-uppercase text-info small fw-bold mb-1">โอนย้ายเข้า WIP</div>
                                        <h3 class="text-info fw-bold mb-0" id="kpiWip">-</h3>
                                        <div class="small text-muted mt-1">ประจำวันนี้</div>
                                    </div>
                                    <div class="bg-info bg-opacity-10 text-info p-2 rounded-circle d-none d-sm-block">
                                        <i class="fas fa-people-carry fa-lg"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Return/Adjust -->
                    <div class="col" style="min-width: 200px;">
                        <div class="card shadow-sm kpi-card border-secondary h-100">
                            <div class="card-body p-3">
                                <div class="d-flex justify-content-between align-items-center">
                                    <div>
                                        <div class="text-uppercase text-secondary small fw-bold mb-1">ปรับปรุง / คืน</div>
                                        <h3 class="text-secondary fw-bold mb-0" id="kpiReturn">-</h3>
                                        <div class="small text-muted mt-1">ประจำวันนี้</div>
                                    </div>
                                    <div class="bg-secondary bg-opacity-10 text-secondary p-2 rounded-circle d-none d-sm-block">
                                        <i class="fas fa-undo-alt fa-lg"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            <!-- Sticky Header with Search Box -->
            <div class="dashboard-header-sticky px-3 pt-0">
                <div class="card border-0 shadow-sm mb-0">
                    <div class="card-body p-2 bg-body-tertiary rounded">
                        <form id="traceForm" class="m-0">
                            <div class="d-flex flex-column flex-lg-row align-items-lg-center justify-content-between gap-3 w-100">
                                  <div class="d-flex flex-wrap align-items-center gap-2 flex-grow-1">
                                      <div class="input-group input-group-sm shadow-sm flex-grow-1" style="min-width: 250px; max-width: 500px;">
                                          <span class="input-group-text bg-white border-secondary-subtle text-secondary"><i class="fas fa-barcode"></i></span>
                                          <input type="text" id="serialNoInput" class="form-control border-secondary-subtle border-start-0 ps-0" placeholder="สแกน หรือ พิมพ์บาร์โค้ดที่นี่..." required autocomplete="off">
                                          <button class="btn btn-outline-secondary border-secondary-subtle" type="submit" id="btnSearch" title="Search">
                                              <i class="fas fa-search"></i>
                                          </button>
                                      </div>
                                      <button id="btnClear" class="btn btn-outline-danger btn-sm shadow-sm fw-bold px-3 d-flex align-items-center justify-content-center flex-shrink-0" type="button" style="height: 32px;" title="Clear">
                                          <i class="fas fa-eraser"></i> <small class="d-none d-sm-inline ms-1">Clear</small>
                                      </button>
                                  </div>
                                  
                                  <!-- Action Wrapper & Kebab Menu -->
                                  <div id="actionWrapper" class="d-none d-md-flex flex-wrap align-items-center gap-2 justify-content-start justify-content-lg-end mt-2 mt-lg-0">
                                      <div class="dropdown ms-1">
                                          <button class="btn btn-outline-secondary btn-sm fw-bold px-2 py-1 rounded shadow-sm" type="button" data-bs-toggle="dropdown" title="เมนูเพิ่มเติม" aria-expanded="false">
                                              <i class="fas fa-ellipsis-v fa-fw"></i>
                                          </button>
                                          <ul class="dropdown-menu dropdown-menu-end shadow-sm border-0 mt-1" style="font-size: 0.85rem;">
                                              <li><h6 class="dropdown-header text-dark fw-bold"><i class="fas fa-compass me-1"></i> เมนูนำทาง (Navigation)</h6></li>
                                              <li><a class="dropdown-item py-2 fw-bold" href="inventoryDashboard.php"><i class="fas fa-boxes text-secondary fa-fw me-2"></i> Stock Inventory (ยอดคงคลัง)</a></li>
                                              <li><a class="dropdown-item py-2 fw-bold" href="rmReceiving.php"><i class="fas fa-pallet text-secondary fa-fw me-2"></i> Stock Receiving (รับเข้า/สร้าง Tag)</a></li>
                                              <li><a class="dropdown-item py-2 fw-bold" href="stockTransaction.php"><i class="fas fa-history text-secondary fa-fw me-2"></i> Stock Transaction (ประวัติความเคลื่อนไหว)</a></li>
                                              <li><a class="dropdown-item py-2 fw-bold bg-success bg-opacity-10 text-success" href="tagHistoryTest.php"><i class="fas fa-search-location fa-fw me-2"></i> Trace Tag (ตามประวัติ)</a></li>
                                          </ul>
                                      </div>
                                  </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            <!-- Main Content Area -->
            <div class="content-wrapper px-3 pb-3 pt-2">
                <!-- Error Message -->
                <div id="errorAlert" class="alert alert-danger d-none mt-2 rounded-3 shadow-sm" role="alert">
                    <i class="fas fa-exclamation-triangle me-2"></i><span id="errorMessage">ไม่พบข้อมูล</span>
                </div>

                <!-- Recent Tags Container -->
                <div id="recentTagsContainer" class="mt-2 h-100 d-flex flex-column">
                    <div class="card shadow-sm border-0 h-100 d-flex flex-column">
                        <div class="table-responsive flex-grow-1">
                            <table class="table table-hover align-middle mb-0 text-nowrap" style="font-size: 0.85rem;">
                                <thead class="table-light sticky-top shadow-sm">
                                    <tr class="text-secondary small text-uppercase align-middle">
                                        <th style="min-width: 140px;">เวลาล่าสุด</th>
                                        <th style="min-width: 160px;">หมายเลขแท็ก (Serial No)</th>
                                        <th style="min-width: 150px;">ไอเท็ม (Item)</th>
                                        <th class="text-center" style="min-width: 120px;">ประเภท (Type)</th>
                                        <th class="text-end" style="width: 100px;">จำนวน (Qty)</th>
                                        <th class="text-center" style="min-width: 100px;">สถานะ</th>
                                        <th style="min-width: 120px;">ผู้ทำรายการ</th>
                                    </tr>
                                </thead>
                                <tbody id="recentTagsTableBody">
                                    <tr><td colspan="7" class="text-center py-4 text-muted">กำลังโหลดข้อมูล...</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <!-- Result Container / Timeline Table removed from main page, moved to Modal -->
            </div>

        </div>
    </div>

    <!-- Modal for Trace Tag Details -->
    <div class="modal fade" id="traceTagModal" tabindex="-1" aria-labelledby="traceTagModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
            <div class="modal-content shadow">
                <div class="modal-header bg-primary text-white py-2">
                    <h5 class="modal-title fs-6 fw-bold" id="traceTagModalLabel"><i class="fas fa-search-location me-2"></i>รายละเอียดแท็ก (Tag Details)</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body bg-body-tertiary p-3">

                    <!-- Tag Info Summary -->
                    <div class="bg-white border rounded p-3 mb-3">
                        <div class="row g-0">
                            <div class="col-md-3 pe-3 border-end">
                                <div class="tag-label">หมายเลขแท็ก (Serial No.)</div>
                                <div class="tag-value text-primary" id="lblSerialNo">-</div>
                                <div class="tag-sub" id="lblItemNo">-</div>
                            </div>
                            <div class="col-md-4 px-3 border-end">
                                <div class="tag-label">รายละเอียด (Description)</div>
                                <div class="tag-value" id="lblPartDesc">-</div>
                            </div>
                            <div class="col-md-2 px-3 border-end">
                                <div class="tag-label">จำนวน / สถานะ</div>
                                <div class="tag-value text-success" id="lblQty">-</div>
                                <div class="tag-sub mt-1" id="lblStatus">-</div>
                            </div>
                            <div class="col-md-3 ps-3">
                                <div class="tag-label">PO / REF NO.</div>
                                <div class="tag-value" id="lblPo">-</div>
                                <div class="tag-sub mt-1"><i class="fas fa-map-marker-alt text-danger me-1"></i><span id="lblLocation">-</span></div>
                            </div>
                        </div>
                    </div>

                    <!-- Timeline Table -->
                    <div class="card shadow-sm border-0 flex-grow-1" style="min-height: 300px;">
                        <div class="table-responsive h-100">
                            <table class="table table-striped table-hover align-middle mb-0 text-nowrap" style="font-size: 0.85rem;">
                                <thead class="table-light sticky-top shadow-sm">
                                    <tr class="text-secondary small text-uppercase align-middle">
                                        <th class="text-center" style="width: 50px;">#</th>
                                        <th style="min-width: 140px;">วันที่-เวลา</th>
                                        <th class="text-center" style="min-width: 150px;">ประเภท (Type)</th>
                                        <th class="text-end" style="width: 100px;">ยอดเข้า (IN)</th>
                                        <th class="text-end" style="width: 100px;">ยอดออก (OUT)</th>
                                        <th style="min-width: 150px;">Location / Ref No.</th>
                                        <th style="min-width: 250px;">หมายเหตุ (Notes)</th>
                                        <th style="width: 150px;">ผู้ทำรายการ</th>
                                    </tr>
                                </thead>
                                <tbody id="historyTableBody">
                                    <!-- Data will be populated here -->
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Core Scripts -->
    <?php include_once '../components/common_scripts.php'; ?>

    <!-- Page Script -->
    <script src="script/storeCommon.js?v=<?php echo filemtime(__DIR__ . '/script/storeCommon.js'); ?>"></script>
    <script src="script/tagHistoryTest.js?v=<?php echo time(); ?>"></script>
</body>
</html>
