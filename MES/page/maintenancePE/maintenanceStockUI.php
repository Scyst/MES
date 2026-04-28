<?php 
// MES/page/maintenancePE/maintenanceStockUI.php
require_once __DIR__ . '/../components/init.php';

requirePermission(['view_maintenance', 'manage_maintenance']);

$pageTitle = "Spare Parts Management";
$pageIcon = "fas fa-tools"; 
$pageHeaderTitle = "Maintenance Spare Parts";
$pageHeaderSubtitle = "ระบบจัดการสต๊อกอะไหล่และอุปกรณ์ซ่อมบำรุง";
$currentUser = $_SESSION['user'];
?>
<!DOCTYPE html>
<html lang="th">
<head>
    <title><?php echo $pageTitle; ?></title>
    <?php include_once '../components/common_head.php'; ?>
    <link rel="stylesheet" href="css/maintenanceStock.css?v=<?php echo filemtime('css/maintenanceStock.css'); ?>">
</head>

<body class="dashboard-page layout-top-header">
    
    <?php include '../components/php/top_header.php'; ?>

    <main id="main-content">
        <div class="container-fluid p-3">

            <ul class="nav nav-tabs mb-3" id="myTab" role="tablist">
                <li class="nav-item" role="presentation">
                    <button class="nav-link active" id="onhand-tab" data-bs-toggle="tab" data-bs-target="#onhand-tab-pane" type="button" role="tab">
                        <i class="fas fa-boxes me-2"></i>Stock On-Hand
                    </button>
                </li>
                <li class="nav-item" role="presentation">
                    <button class="nav-link" id="master-tab" data-bs-toggle="tab" data-bs-target="#master-tab-pane" type="button" role="tab">
                        <i class="fas fa-database me-2"></i>Item Master
                    </button>
                </li>
                <li class="nav-item" role="presentation">
                    <button class="nav-link" id="history-tab" data-bs-toggle="tab" data-bs-target="#history-pane" type="button" role="tab">
                        <i class="fas fa-history me-2"></i>History Log
                    </button>
                </li>
            </ul>

            <div class="tab-content" id="myTabContent">
                
                <div class="tab-pane fade active show" id="onhand-tab-pane" role="tabpanel">
                    
                    <div class="card border border-secondary-subtle rounded-1 mb-3 bg-white shadow-none">
                        <div class="card-body py-2 px-3">
                            <div class="row align-items-center g-2">
                                <div class="col-lg-5 d-flex flex-wrap align-items-center gap-2">
                                    <div class="input-group input-group-sm flex-grow-1" style="max-width: 250px;">
                                        <span class="input-group-text bg-light text-muted border-end-0 px-2"><i class="fas fa-search"></i></span>
                                        <input type="text" id="onhandSearch" class="form-control border-start-0 ps-0" placeholder="ค้นหา รหัส, ชื่อ...">
                                    </div>
                                    <select id="onhandLocationFilter" class="form-select form-select-sm border-secondary-subtle" style="max-width: 180px;">
                                        <option value="">-- ทุกคลังเก็บ --</option>
                                    </select>
                                    <button class="btn btn-sm btn-light border shadow-none" onclick="MtApp.refreshData()" title="Refresh"><i class="fas fa-sync-alt text-secondary"></i></button>
                                </div>

                                <div class="col-lg-7 d-flex align-items-center justify-content-end gap-2 flex-wrap">
                                    <div class="d-none d-xl-flex align-items-center border border-secondary-subtle rounded-1 px-3 py-1 bg-light shadow-none h-100 me-1">
                                        <span class="badge bg-primary me-2 rounded-1" id="stat_total_items">0</span> 
                                        <span class="small text-muted fw-bold me-3 text-uppercase" style="font-size: 0.7rem;">Total SKU</span>
                                        
                                        <div class="vr me-3 opacity-25"></div>
                                        
                                        <span class="badge bg-danger me-2 badge-min-alert rounded-1" id="stat_low_stock">0</span> 
                                        <span class="small text-danger fw-bold text-uppercase me-3" style="font-size: 0.7rem;">Low Stock</span>

                                        <div class="vr me-3 opacity-25"></div>
                                        
                                        <span class="badge bg-success me-2 rounded-1" id="stat_total_value">฿0.00</span> 
                                        <span class="small text-success fw-bold text-uppercase" style="font-size: 0.7rem;">Total Value</span>
                                    </div>
                                    
                                    <div class="d-none d-lg-flex gap-2 ms-1">
                                        <div class="btn-group shadow-none">
                                            <button class="btn btn-outline-secondary btn-sm fw-bold px-3" onclick="MtStockTakeCtrl.exportCountSheet()" title="โหลดฟอร์มนับสต๊อก"><i class="fas fa-file-excel text-success me-1"></i> นับสต๊อก</button>
                                            <button class="btn btn-outline-secondary btn-sm fw-bold px-3" onclick="MtStockTakeCtrl.openModal()" title="อัปโหลดผลการนับ"><i class="fas fa-file-import text-warning me-1"></i> อัปเดตยอด</button>
                                        </div>
                                        <div class="btn-group shadow-none">
                                            <button class="btn btn-sm btn-success fw-bold px-3" onclick="window.StockManager.openReceiveModal()"><i class="fas fa-arrow-down me-1"></i> Receive</button>
                                            <button class="btn btn-sm btn-dark fw-bold px-3" onclick="window.StockManager.openIssueModal()"><i class="fas fa-arrow-up me-1"></i> Issue</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="card border border-secondary-subtle rounded-1 shadow-none">
                        <div class="card-header bg-transparent border-bottom-0 pt-3 pb-2 d-flex justify-content-between align-items-center">
                            <h6 class="fw-bold mb-0 text-dark"><i class="fas fa-list-alt text-secondary me-2"></i>Stock On-Hand List</h6>
                            <span class="text-muted small" style="font-size: 0.75rem;">Last update: <span id="lastSyncTime">Just now</span></span>
                        </div>
                        <div class="card-body p-0">
                            <div class="table-responsive" style="max-height: 500px; overflow-y: auto;">
                                <table id="onhandTable" class="table table-hover align-middle mb-0 table-enterprise">
                                    <thead class="sticky-top">
                                        <tr>
                                            <th class="ps-3" style="width: 12%;">Item Code</th>
                                            <th style="width: 20%;">Item Name</th>
                                            <th style="width: 18%;">Description</th>
                                            <th style="width: 12%;">Location</th>
                                            <th class="text-center" style="width: 12%;">Min / Max</th>
                                            <th class="text-end" style="width: 10%;">On-Hand</th>
                                            <th class="text-center" style="width: 8%;">Unit</th>
                                            <th class="text-center pe-3" style="width: 8%;"><i class="fas fa-cog"></i></th>
                                        </tr>
                                    </thead>
                                    <tbody id="onhandTableBody" class="border-top-0">
                                        <tr><td colspan="8" class="text-center text-muted py-5"><i class="fas fa-spinner fa-spin me-2"></i>Loading data...</td></tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                </div>

                <div class="tab-pane fade" id="master-tab-pane" role="tabpanel">
                    
                    <div class="card border border-secondary-subtle rounded-1 mb-3 bg-white shadow-none">
                        <div class="card-body py-2 px-3">
                            <div class="row align-items-center g-2">
                                <div class="col-lg-6 d-flex flex-wrap align-items-center gap-2">
                                    <div class="input-group input-group-sm flex-grow-1" style="max-width: 350px;">
                                        <span class="input-group-text bg-light text-muted border-end-0 px-2"><i class="fas fa-search"></i></span>
                                        <input type="text" id="masterSearch" class="form-control border-start-0 ps-0" placeholder="ค้นหา Master Data...">
                                    </div>
                                </div>
                                <div class="col-lg-6 d-flex justify-content-lg-end justify-content-start gap-2">
                                    <div class="btn-group shadow-none">
                                        <button class="btn btn-outline-secondary btn-sm fw-bold px-3" onclick="MtMasterCtrl.exportData()" title="Export ข้อมูลทั้งหมด">
                                            <i class="fas fa-file-excel text-success me-1"></i> Export Data
                                        </button>
                                        <button class="btn btn-outline-secondary btn-sm fw-bold px-3" onclick="MtImportCtrl.openModal()" title="นำเข้าข้อมูลใหม่">
                                            <i class="fas fa-file-import text-primary me-1"></i> Import
                                        </button>
                                    </div>
                                    <button class="btn btn-sm btn-primary fw-bold px-3 shadow-none rounded-1" onclick="window.MtMasterCtrl.openModal()">
                                        <i class="fas fa-plus me-1"></i> Add Item
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="card border border-secondary-subtle rounded-1 shadow-none">
                        <div class="card-header bg-transparent border-bottom-0 pt-3 pb-2">
                            <h6 class="fw-bold mb-0 text-dark"><i class="fas fa-database text-secondary me-2"></i>Item Master List</h6>
                        </div>
                        <div class="card-body p-0">
                            <div class="table-responsive" style="max-height: 500px; overflow-y: auto;">
                                <table id="masterTable" class="table table-hover align-middle mb-0 table-enterprise">
                                    <thead class="sticky-top">
                                        <tr>
                                            <th class="ps-3" style="width: 12%;">Item Code</th>
                                            <th style="width: 20%;">Item Name</th>
                                            <th style="width: 20%;">Description</th>
                                            <th style="width: 12%;">Supplier</th>
                                            <th class="text-end" style="width: 10%;">Price (฿)</th>
                                            <th class="text-center" style="width: 10%;">Min / Max</th>
                                            <th class="text-center" style="width: 8%;">Status</th>
                                            <th class="text-center pe-3" style="width: 8%;">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody class="border-top-0">
                                        <tr><td colspan="7" class="text-center text-muted py-5"><i class="fas fa-spinner fa-spin me-2"></i>Loading data...</td></tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                </div>

                <div class="tab-pane fade" id="history-pane" role="tabpanel">
                    
                    <div class="card border border-secondary-subtle rounded-1 mb-3 bg-white shadow-none">
                        <div class="card-body py-2 px-3">
                            <div class="row align-items-center g-2">
                                <div class="col-lg-8 d-flex flex-wrap align-items-center gap-2">
                                    <div class="input-group input-group-sm flex-grow-1" style="max-width: 350px;">
                                        <span class="input-group-text bg-light text-muted border-end-0 px-2"><i class="fas fa-search"></i></span>
                                        <input type="text" id="historySearch" class="form-control border-start-0 ps-0" placeholder="ค้นหา รหัส, ชื่อ, ผู้ทำรายการ...">
                                    </div>
                                    <button class="btn btn-sm btn-light border shadow-none" onclick="window.MtHistoryCtrl.loadData()" title="Refresh">
                                        <i class="fas fa-sync-alt text-secondary"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="card border border-secondary-subtle rounded-1 shadow-none">
                        <div class="card-header bg-transparent border-bottom-0 pt-3 pb-2">
                            <h6 class="fw-bold mb-0 text-dark"><i class="fas fa-history text-secondary me-2"></i>Transaction Log</h6>
                        </div>
                        <div class="card-body p-0">
                            <div class="table-responsive" style="max-height: 500px; overflow-y: auto;">
                                <table id="historyTable" class="table table-hover align-middle mb-0 text-nowrap table-enterprise">
                                    <thead class="sticky-top">
                                        <tr>
                                            <th class="ps-3" style="width: 15%;">Date / Time</th>
                                            <th style="width: 10%;">Type</th>
                                            <th style="width: 25%;">Item</th>
                                            <th class="text-end" style="width: 10%;">Qty</th>
                                            <th style="width: 15%;">User</th>
                                            <th class="pe-3" style="width: 25%;">Reference Job / Note</th>
                                        </tr>
                                    </thead>
                                    <tbody class="border-top-0">
                                        <tr><td colspan="6" class="text-center text-muted py-5"><i class="fas fa-spinner fa-spin me-2"></i>Loading History...</td></tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                </div>

            </div>
        </div>
    </main>

    <?php include 'components/allMtModal.php'; ?>

    <script src="../../utils/libs/xlsx.full.min.js"></script>
    <script src="script/maintenanceStock.js?v=<?php echo filemtime('script/maintenanceStock.js'); ?>"></script>
    <script>
        setInterval(() => {
            const timeEl = document.getElementById('lastSyncTime');
            if(timeEl && timeEl.textContent === 'Just now') {
                timeEl.textContent = new Date().toLocaleTimeString('th-TH');
            }
        }, 60000);
    </script>
</body>
</html>