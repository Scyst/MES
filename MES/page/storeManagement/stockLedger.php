<?php
// MES/page/storeManagement/stockLedger.php
require_once __DIR__ . '/../components/init.php';
requirePermission('view_warehouse');

$pageTitle = "Stock Ledger (RM)";
$pageIcon = "fas fa-exchange-alt"; 
$pageHeaderTitle = "Stock Transaction Ledger";
$pageHeaderSubtitle = "ตรวจสอบประวัติความเคลื่อนไหวของวัตถุดิบ (IN / OUT / ADJUST)";
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
                    
                    /* สร้างคลาสสำหรับสีตัวเลข IN / OUT */
                    .text-in { color: var(--bs-success); font-weight: bold; }
                    .text-out { color: var(--bs-danger); font-weight: bold; }
                </style>
                <div class="row g-2 mb-1 flex-nowrap overflow-x-auto pb-1 hide-scrollbar" style="-webkit-overflow-scrolling: touch;">
                    <div class="col-8 col-sm-6 col-md-4" style="min-width: 200px;">
                        <div class="card shadow-sm kpi-card border-secondary h-100">
                            <div class="card-body p-3">
                                <div class="d-flex justify-content-between align-items-center">
                                    <div>
                                        <div class="text-uppercase text-secondary small fw-bold mb-1">รายการเคลื่อนไหว</div>
                                        <h3 class="text-secondary fw-bold mb-0" id="kpiTotalTrans">0</h3>
                                        <div class="small text-muted mt-1" style="font-size: 0.7rem;">Transactions</div>
                                    </div>
                                    <div class="bg-secondary bg-opacity-10 text-secondary p-2 rounded-circle d-none d-sm-block">
                                        <i class="fas fa-list-ul fa-lg"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="col-8 col-sm-6 col-md-4" style="min-width: 200px;">
                        <div class="card shadow-sm kpi-card border-success h-100">
                            <div class="card-body p-3">
                                <div class="d-flex justify-content-between align-items-center">
                                    <div>
                                        <div class="text-uppercase text-success small fw-bold mb-1">ยอดรับเข้า (TOTAL IN)</div>
                                        <h3 class="text-success fw-bold mb-0" id="kpiTotalIn">0</h3>
                                        <div class="small text-muted mt-1" style="font-size: 0.7rem;">PCS</div>
                                    </div>
                                    <div class="bg-success bg-opacity-10 text-success p-2 rounded-circle d-none d-sm-block">
                                        <i class="fas fa-arrow-down fa-lg"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="col-8 col-sm-6 col-md-4" style="min-width: 200px;">
                        <div class="card shadow-sm kpi-card border-danger h-100">
                            <div class="card-body p-3">
                                <div class="d-flex justify-content-between align-items-center">
                                    <div>
                                        <div class="text-uppercase text-danger small fw-bold mb-1">ยอดเบิกออก (TOTAL OUT)</div>
                                        <h3 class="text-danger fw-bold mb-0" id="kpiTotalOut">0</h3>
                                        <div class="small text-muted mt-1" style="font-size: 0.7rem;">PCS</div>
                                    </div>
                                    <div class="bg-danger bg-opacity-10 text-danger p-2 rounded-circle d-none d-sm-block">
                                        <i class="fas fa-arrow-up fa-lg"></i>
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
                        <div class="d-flex flex-column flex-lg-row align-items-lg-center justify-content-between gap-3 w-100">
                            
                            <div class="d-flex flex-wrap align-items-center gap-2 flex-grow-1">
                                
                                <div class="input-group input-group-sm shadow-sm" style="flex: 1 1 200px; max-width: 350px;">
                                    <span class="input-group-text bg-white border-secondary-subtle text-secondary"><i class="fas fa-search"></i></span>
                                    <input type="text" id="filterSearch" class="form-control border-secondary-subtle border-start-0 ps-0" placeholder="ค้นหา Item No., Lot, Ref...">
                                </div>
                                
                                <div class="input-group input-group-sm shadow-sm" style="width: auto; flex: 1 1 250px; max-width: 350px;">
                                    <span class="input-group-text bg-white border-secondary-subtle text-secondary small"><i class="fas fa-calendar-alt me-1"></i> วันที่:</span>
                                    <input type="date" id="filterStartDate" class="form-control border-secondary-subtle px-1" value="<?php echo date('Y-m-d', strtotime('-7 days')); ?>">
                                    <span class="input-group-text bg-white border-secondary-subtle border-start-0 border-end-0 px-1">-</span>
                                    <input type="date" id="filterEndDate" class="form-control border-secondary-subtle px-1" value="<?php echo date('Y-m-d'); ?>">
                                </div>

                                <div class="input-group input-group-sm shadow-sm" style="width: auto; flex: 1 1 140px; max-width: 180px;">
                                    <span class="input-group-text bg-white border-secondary-subtle text-secondary small"><i class="fas fa-map-marker-alt"></i></span>
                                    <select id="locationFilter" class="form-select border-secondary-subtle fw-bold text-primary">
                                        <option value="ALL">All Locations</option>
                                    </select>
                                </div>

                                <div class="input-group input-group-sm shadow-sm" style="width: auto; flex: 1 1 140px; max-width: 180px;">
                                    <span class="input-group-text bg-white border-secondary-subtle text-secondary small"><i class="fas fa-filter"></i></span>
                                    <select id="typeFilter" class="form-select border-secondary-subtle fw-bold text-dark">
                                        <option value="ALL" selected>All Types</option>
                                        <option value="RECEIPT">RECEIPT (รับเข้า)</option>
                                        <option value="INTERNAL_TRANSFER">TRANSFER (โอนย้าย)</option>
                                        <option value="CONSUMPTION">CONSUMPTION (เบิกจ่าย)</option>
                                        <option value="ADJUSTMENT">ADJUSTMENT (ปรับยอด)</option>
                                    </select>
                                </div>

                                <div class="input-group input-group-sm shadow-sm d-none d-md-flex" style="width: 75px;">
                                    <select id="rowsPerPage" class="form-select border-secondary-subtle px-2" onchange="changeRowsPerPage()">
                                        <option value="50">50</option>
                                        <option value="100" selected>100</option>
                                        <option value="500">500</option>
                                    </select>
                                </div>
                                
                                <button class="btn btn-outline-secondary btn-sm shadow-sm flex-shrink-0" onclick="loadLedgerData()" title="Refresh Data" style="width: 32px; height: 32px;">
                                    <i class="fas fa-sync-alt"></i>
                                </button>
                                
                            </div>

                            <div id="actionWrapper" class="d-none d-md-flex flex-wrap align-items-center gap-2 justify-content-start justify-content-lg-end">
                                
                                <div class="dropdown ms-1">
                                    <button class="btn btn-outline-secondary btn-sm fw-bold px-2 py-1 rounded shadow-sm" type="button" data-bs-toggle="dropdown" title="เมนูเพิ่มเติม" aria-expanded="false">
                                        <i class="fas fa-ellipsis-v fa-fw"></i>
                                    </button>
                                    <ul class="dropdown-menu dropdown-menu-end shadow-sm border-0 mt-1" style="font-size: 0.85rem;">
                                        <li><h6 class="dropdown-header text-dark fw-bold">จัดการข้อมูล</h6></li>
                                        <li><a class="dropdown-item py-2 fw-bold" href="#" onclick="exportLedgerToExcel()"><i class="fas fa-file-excel text-success fa-fw me-2"></i> Export to Excel</a></li>
                                        
                                        <li><hr class="dropdown-divider"></li>
                                        
                                        <li><h6 class="dropdown-header text-dark fw-bold">เมนูนำทาง (Navigation)</h6></li>
                                        <li><a class="dropdown-item py-2 fw-bold" href="inventoryDashboard.php"><i class="fas fa-boxes text-secondary fa-fw me-2"></i> RM Inventory (หน้าหลัก)</a></li>
                                        <li><a class="dropdown-item py-2 fw-bold" href="rmReceiving.php"><i class="fas fa-pallet text-secondary fa-fw me-2"></i> RM Receiving (รับเข้า/สร้าง Tag)</a></li>
                                        <li><a class="dropdown-item py-2 fw-bold bg-primary bg-opacity-10" href="stockLedger.php"><i class="fas fa-history text-primary fa-fw me-2"></i> Stock Ledger (ประวัติความเคลื่อนไหว)</a></li>
                                    </ul>
                                </div>

                            </div>
                            
                        </div>
                    </div>
                </div>
            </div>

            <div class="content-wrapper px-3 pb-3 pt-2">
                <div class="card shadow-sm border-0 h-100 d-flex flex-column">
                    
                    <div class="table-responsive flex-grow-1">
                        <table class="table table-striped table-hover align-middle mb-0 text-nowrap" style="font-size: 0.85rem;">
                            <thead class="table-light sticky-top shadow-sm">
                                <tr class="text-secondary small text-uppercase align-middle">
                                    <th class="text-center" style="width: 50px;">#</th>
                                    <th style="min-width: 140px;">วันที่-เวลา</th>
                                    <th style="min-width: 220px;">Part No. / Description</th>
                                    <th style="min-width: 150px;">Location</th>
                                    <th class="text-center" style="min-width: 100px;">Type</th>
                                    <th class="text-end" style="width: 100px;">ยอดเข้า (IN)</th>
                                    <th class="text-end" style="width: 100px;">ยอดออก (OUT)</th>
                                    <th style="min-width: 150px;">Ref / Lot No.</th>
                                    <th style="min-width: 120px;">ผู้บันทึก</th>
                                    <th style="min-width: 200px;">หมายเหตุ</th>
                                </tr>
                            </thead>
                            <tbody id="ledgerTbody">
                                <tr><td colspan="10" class="text-center py-4 text-muted"><i class="fas fa-spinner fa-spin me-2"></i>กำลังโหลดข้อมูล...</td></tr>
                            </tbody>
                        </table>
                    </div>
                    
                    <div class="card-footer bg-white border-top d-flex justify-content-center justify-content-md-between align-items-center px-3 rounded-bottom w-100" style="min-height: 54px;">
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

    <script src="script/storeCommon.js?v=<?php echo filemtime(__DIR__ . '/script/storeCommon.js'); ?>"></script>
    <script src="script/stockLedger.js?v=<?php echo time(); ?>" defer></script>
</body>
</html>