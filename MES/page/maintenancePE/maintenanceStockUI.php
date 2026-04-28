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
    <style>
        .badge-min-alert { animation: pulse-red 2s infinite; }
        @keyframes pulse-red { 
            0% { box-shadow: 0 0 0 0 rgba(220, 53, 69, 0.4); }
            70% { box-shadow: 0 0 0 6px rgba(220, 53, 69, 0); }
            100% { box-shadow: 0 0 0 0 rgba(220, 53, 69, 0); }
        }
        .table > :not(caption) > * > * { border-bottom-color: var(--bs-border-color); }
        .nav-tabs .nav-link { color: var(--bs-secondary-color); font-weight: 600; }
        .nav-tabs .nav-link.active { color: var(--bs-primary); border-bottom: 3px solid var(--bs-primary); }
    </style>
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
                    
                    <div class="card border-0 shadow-sm mb-3 flex-shrink-0" style="background-color: var(--bs-secondary-bg);">
                        <div class="card-body py-3">
                            <div class="row align-items-center g-2">
                                <div class="col-lg-4 d-flex flex-wrap align-items-center gap-2">
                                    <div class="input-group input-group-sm flex-grow-1" style="max-width: 350px;">
                                        <span class="input-group-text bg-white text-muted border-end-0 px-2"><i class="fas fa-search"></i></span>
                                        <input type="text" id="onhandSearch" class="form-control border-start-0 ps-0" placeholder="Search Item Code, Name, Location...">
                                    </div>
                                    <button class="btn btn-sm btn-light border shadow-sm" onclick="MtApp.refreshData()" title="Refresh"><i class="fas fa-sync-alt text-secondary"></i></button>
                                </div>

                                <div class="col-lg-8 d-flex align-items-center justify-content-end gap-2 flex-wrap">
                                    <div class="d-none d-xl-flex align-items-center border border-secondary-subtle rounded px-3 py-1 bg-body shadow-sm h-100 me-1">
                                        <span class="badge bg-primary me-2" id="stat_total_items">0</span> 
                                        <span class="small text-muted fw-bold me-3 text-uppercase" style="font-size: 0.7rem;">Total SKU</span>
                                        <div class="vr me-3 opacity-25"></div>
                                        <span class="badge bg-danger me-2 badge-min-alert" id="stat_low_stock">0</span> 
                                        <span class="small text-danger fw-bold text-uppercase" style="font-size: 0.7rem;">Low Stock</span>
                                    </div>
                                    <div class="d-none d-lg-flex gap-2 ms-1">
                                        <div class="btn-group shadow-sm">
                                            <button class="btn btn-light btn-sm border-secondary-subtle fw-bold text-success px-3" onclick="MtStockTakeCtrl.exportCountSheet()" title="โหลดฟอร์มนับสต๊อก">
                                                <i class="fas fa-file-excel me-1"></i> นับสต๊อก
                                            </button>
                                            <button class="btn btn-light btn-sm border-secondary-subtle fw-bold text-warning px-3" onclick="MtStockTakeCtrl.openModal()" title="อัปโหลดผลการนับ">
                                                <i class="fas fa-file-import me-1"></i> อัปเดตยอด
                                            </button>
                                        </div>
                                        <div class="btn-group shadow-sm">
                                            <button class="btn btn-sm btn-outline-success fw-bold px-3" onclick="window.StockManager.openReceiveModal()"><i class="fas fa-arrow-down me-1"></i> Receive</button>
                                            <button class="btn btn-sm btn-outline-warning text-dark fw-bold px-3" onclick="window.StockManager.openAdjustModal()"><i class="fas fa-sliders-h me-1"></i> Adjust</button>
                                            <button class="btn btn-sm btn-dark fw-bold px-3" onclick="window.StockManager.openIssueModal()"><i class="fas fa-arrow-up me-1"></i> Issue</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="card border-0 shadow-sm">
                        <div class="card-header bg-transparent border-0 pt-3 pb-2 d-flex justify-content-between align-items-center">
                            <h6 class="fw-bold mb-0"><i class="fas fa-list-alt me-2"></i>Stock On-Hand List</h6>
                            <span class="text-muted small" style="font-size: 0.75rem;">Last update: <span id="lastSyncTime">Just now</span></span>
                        </div>
                        <div class="card-body p-0">
                            <div class="table-responsive" style="max-height: 500px; overflow-y: auto;">
                                <table id="onhandTable" class="table table-hover align-middle mb-0">
                                    <thead class="bg-light sticky-top" style="top: 0; z-index: 5;">
                                        <tr class="text-muted small text-uppercase">
                                            <th class="ps-3" style="width: 15%;">Item Code</th>
                                            <th style="width: 30%;">Description</th>
                                            <th style="width: 15%;">Location</th>
                                            <th class="text-center" style="width: 15%;">Min / Max</th>
                                            <th class="text-end" style="width: 15%;">On-Hand</th>
                                            <th class="text-center pe-3" style="width: 10%;">Unit</th>
                                        </tr>
                                    </thead>
                                    <tbody id="onhandTableBody" class="border-top-0">
                                        <tr><td colspan="6" class="text-center text-muted py-5"><i class="fas fa-spinner fa-spin me-2"></i>Loading data...</td></tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                </div>

                <div class="tab-pane fade" id="master-tab-pane" role="tabpanel">
                    
                    <div class="card border-0 shadow-sm mb-3 flex-shrink-0" style="background-color: var(--bs-secondary-bg);">
                        <div class="card-body py-3">
                            <div class="row align-items-center g-2">
                                <div class="col-lg-6 d-flex flex-wrap align-items-center gap-2">
                                    <div class="input-group input-group-sm flex-grow-1" style="max-width: 350px;">
                                        <span class="input-group-text bg-white text-muted border-end-0 px-2"><i class="fas fa-search"></i></span>
                                        <input type="text" id="masterSearch" class="form-control border-start-0 ps-0" placeholder="Search Master Data...">
                                    </div>
                                </div>
                                <div class="col-lg-6 d-flex justify-content-lg-end justify-content-start gap-2">
                                    <div class="btn-group shadow-sm">
                                        <button class="btn btn-light btn-sm border-secondary-subtle fw-bold text-success px-3" onclick="MtMasterCtrl.exportData()" title="Export Excel">
                                            <i class="fas fa-file-excel me-1"></i> Export
                                        </button>
                                        <button class="btn btn-light btn-sm border-secondary-subtle fw-bold text-primary px-3" onclick="MtImportCtrl.openModal()" title="Import Excel">
                                            <i class="fas fa-file-import me-1"></i> Import
                                        </button>
                                    </div>
                                    <button class="btn btn-sm btn-primary fw-bold shadow-sm px-3" onclick="window.MtMasterCtrl.openModal()">
                                        <i class="fas fa-plus me-1"></i> Add Item
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="card border-0 shadow-sm">
                        <div class="card-header bg-transparent border-0 pt-3 pb-2">
                            <h6 class="fw-bold mb-0"><i class="fas fa-database me-2"></i>Item Master List</h6>
                        </div>
                        <div class="card-body p-0">
                            <div class="table-responsive" style="max-height: 500px; overflow-y: auto;">
                                <table id="masterTable" class="table table-hover align-middle mb-0">
                                    <thead class="bg-light sticky-top" style="top: 0; z-index: 5;">
                                        <tr class="text-muted small text-uppercase">
                                            <th class="ps-3" style="width: 15%;">Item Code</th>
                                            <th style="width: 25%;">Item Name / Description</th>
                                            <th style="width: 15%;">Supplier</th>
                                            <th class="text-end" style="width: 10%;">Price (฿)</th>
                                            <th class="text-center" style="width: 15%;">Min / Max</th>
                                            <th class="text-center" style="width: 10%;">Status</th>
                                            <th class="text-center pe-3" style="width: 10%;">Actions</th>
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
                    
                    <div class="card border-0 shadow-sm mb-3 flex-shrink-0" style="background-color: var(--bs-secondary-bg);">
                        <div class="card-body py-3">
                            <div class="row align-items-center g-2">
                                <div class="col-lg-8 d-flex flex-wrap align-items-center gap-2">
                                    <div class="input-group input-group-sm flex-grow-1" style="max-width: 350px;">
                                        <span class="input-group-text bg-white text-muted border-end-0 px-2"><i class="fas fa-search"></i></span>
                                        <input type="text" id="historySearch" class="form-control border-start-0 ps-0" placeholder="ค้นหา รหัส, ชื่อ, ผู้ทำรายการ...">
                                    </div>
                                    <button class="btn btn-sm btn-light border shadow-sm" onclick="window.MtHistoryCtrl.loadData()" title="Refresh">
                                        <i class="fas fa-sync-alt text-secondary"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="card border-0 shadow-sm">
                        <div class="card-header bg-transparent border-0 pt-3 pb-2">
                            <h6 class="fw-bold mb-0"><i class="fas fa-history me-2"></i>Transaction Log</h6>
                        </div>
                        <div class="card-body p-0">
                            <div class="table-responsive" style="max-height: 500px; overflow-y: auto;">
                                <table id="historyTable" class="table table-hover align-middle mb-0 text-nowrap">
                                    <thead class="bg-light sticky-top" style="top: 0; z-index: 5;">
                                        <tr class="text-muted small text-uppercase">
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

    <div class="modal fade" id="importMtItemModal" tabindex="-1" data-bs-backdrop="static">
        <div class="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
            <div class="modal-content shadow">
                <div class="modal-header bg-light py-2 px-3 border-bottom">
                    <h6 class="modal-title fw-bold text-dark"><i class="fas fa-file-import text-success me-2"></i>นำเข้าข้อมูล Item Master</h6>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" style="font-size: 0.8rem;"></button>
                </div>
                <div class="modal-body p-2 d-flex flex-column gap-2">
                    <div class="bg-body-tertiary border rounded p-2 d-flex flex-wrap align-items-center justify-content-between gap-2 shadow-sm">
                        <div class="d-flex align-items-center gap-2 flex-grow-1" style="max-width: 400px;">
                            <input type="file" id="mtExcelFile" class="form-control form-control-sm border-secondary-subtle" accept=".xlsx, .xls, .csv" onchange="MtImportCtrl.processExcel()">
                        </div>
                        <div class="d-flex align-items-center gap-3">
                            <span class="text-primary fw-bold small" id="mtPreviewCount">พบข้อมูล: 0 รายการ</span>
                            <button type="button" class="btn btn-outline-success btn-sm fw-bold shadow-sm" onclick="MtImportCtrl.downloadTemplate()">
                                <i class="fas fa-download me-1"></i> Template
                            </button>
                        </div>
                    </div>

                    <div class="alert alert-info border-info small mb-0 shadow-sm py-2">
                        <i class="fas fa-info-circle me-1"></i> <b>Smart Update:</b> ระบบจะหาคอลัมน์ให้อัตโนมัติ (Item Code, Item Name, Price, UOM, Min, Max) หาก Item Code มีอยู่แล้ว ระบบจะ <b>อัปเดตข้อมูล</b> หากไม่มีจะ <b>สร้างใหม่</b>
                    </div>

                    <div class="table-responsive border rounded flex-fill hide-scrollbar" style="min-height: 350px;">
                        <table class="table table-sm table-striped table-hover align-middle mb-0 text-nowrap" style="font-size: 0.875rem;">
                            <thead class="table-secondary sticky-top shadow-sm">
                                <tr class="text-secondary">
                                    <th>Item Code</th>
                                    <th>Item Name</th>
                                    <th>Description</th>
                                    <th>Supplier</th>
                                    <th class="text-end">Price</th>
                                    <th class="text-center">UOM</th>
                                    <th class="text-center">Min / Max</th>
                                </tr>
                            </thead>
                            <tbody id="mtPreviewTbody">
                                <tr>
                                    <td colspan="7" class="text-center text-muted align-middle" style="height: 250px;">
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
                    <button type="button" class="btn btn-success btn-sm d-none fw-bold px-4 shadow-sm" id="btnSaveMtImport" onclick="MtImportCtrl.submitToDatabase()">
                        <i class="fas fa-save me-1"></i> บันทึกข้อมูล
                    </button>
                </div>
            </div>
        </div>
    </div>

    <div class="modal fade" id="importStockTakeModal" tabindex="-1" data-bs-backdrop="static">
        <div class="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
            <div class="modal-content shadow border-start border-5 border-warning">
                <div class="modal-header bg-light py-2 px-3 border-bottom">
                    <h6 class="modal-title fw-bold text-dark"><i class="fas fa-clipboard-check text-warning me-2"></i>อัปเดตยอดนับสต๊อก (Stock Take)</h6>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" style="font-size: 0.8rem;"></button>
                </div>
                <div class="modal-body p-2 d-flex flex-column gap-2">
                    <div class="bg-body-tertiary border rounded p-2 d-flex flex-wrap align-items-center justify-content-between gap-2 shadow-sm">
                        <div class="d-flex align-items-center gap-2 flex-grow-1" style="max-width: 400px;">
                            <input type="file" id="stExcelFile" class="form-control form-control-sm border-secondary-subtle" accept=".xlsx, .xls, .csv" onchange="MtStockTakeCtrl.processExcel()">
                        </div>
                        <div class="d-flex align-items-center gap-3">
                            <span class="text-primary fw-bold small" id="stPreviewCount">พบข้อมูลปรับยอด: 0 รายการ</span>
                        </div>
                    </div>

                    <div class="table-responsive border rounded flex-fill hide-scrollbar" style="min-height: 350px;">
                        <table class="table table-sm table-striped table-hover align-middle mb-0 text-nowrap" style="font-size: 0.875rem;">
                            <thead class="table-secondary sticky-top shadow-sm">
                                <tr class="text-secondary text-center">
                                    <th class="text-start">Item Code</th>
                                    <th class="text-start">Location ID (คลัง)</th>
                                    <th>ยอดเดิม (System)</th>
                                    <th>ยอดนับจริง (Actual)</th>
                                    <th>ส่วนต่าง (Diff)</th>
                                    <th class="text-start">หมายเหตุ</th>
                                </tr>
                            </thead>
                            <tbody id="stPreviewTbody">
                                <tr>
                                    <td colspan="6" class="text-center text-muted align-middle" style="height: 250px;">
                                        <i class="fas fa-file-excel fa-3x mb-3 opacity-25"></i><br>
                                        <span class="fw-bold">อัปโหลดไฟล์นับสต๊อกที่ได้จากปุ่ม "นับสต๊อก"</span>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
                <div class="modal-footer bg-light py-2 px-3 border-top">
                    <button type="button" class="btn btn-secondary btn-sm fw-bold px-3 shadow-sm" data-bs-dismiss="modal">ยกเลิก</button>
                    <button type="button" class="btn btn-warning btn-sm d-none fw-bold px-4 shadow-sm" id="btnSaveStockTake" onclick="MtStockTakeCtrl.submitToDatabase()">
                        <i class="fas fa-save me-1"></i> ยืนยันการปรับยอดสต๊อก
                    </button>
                </div>
            </div>
        </div>
    </div>

    <?php include 'components/modalReceive.php'; ?>
    <?php include 'components/modalIssue.php'; ?>
    <?php include 'components/modalMtItem.php'; ?>
    <?php include 'components/modalMtAdjust.php'; ?>

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