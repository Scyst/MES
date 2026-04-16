<?php 
// MES/page/systemSettings/systemSettings.php
require_once __DIR__ . '/../components/init.php';

if (!hasRole(['admin', 'creator', 'supervisor'])) {
    header("Location: ../dailyLog/dailyLogUI.php");
    exit;
}

$canManage = hasRole(['admin', 'creator', 'supervisor']);
$currentUser = $_SESSION['user'];

$pageTitle = "System Settings | TOOLBOX OS";
$pageIcon = "fas fa-cogs";
$pageHeaderTitle = "System Settings";
$pageHeaderSubtitle = "ตั้งค่า Master Data และ Configurations";
?>
<!DOCTYPE html>
<html lang="th">
<head>
    <title><?php echo $pageTitle; ?></title>
    <?php include_once '../components/common_head.php'; ?>
    <style>
        /* Custom Scrollbar เล็กๆ สำหรับแนวนอน */
        .table-scrollable {
            overflow-x: auto;
            max-height: calc(100vh - 240px);
        }
        .table-scrollable::-webkit-scrollbar { height: 8px; width: 8px; }
        .table-scrollable::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 4px; }
        .table-scrollable::-webkit-scrollbar-thumb { background: #c1c1c1; border-radius: 4px; }
        .table-scrollable::-webkit-scrollbar-thumb:hover { background: #a8a8a8; }

        /* ตรึงคอลัมน์แรกซ้ายสุด */
        .sticky-col-left {
            position: sticky;
            left: 0;
            background-color: #fff;
            z-index: 1;
            border-right: 2px solid var(--bs-border-color) !important;
        }
        thead .sticky-col-left {
            z-index: 3;
            background-color: var(--bs-light);
        }

        .table-settings th {
            font-size: 0.75rem;
            letter-spacing: 0.5px;
            vertical-align: middle;
        }
        .table-settings td {
            font-size: 0.8rem;
            vertical-align: middle;
        }
        
        /* ซ่อน Pane ที่ไม่ได้ Active */
        .module-pane { display: none; }
        .module-pane.active { display: block; }
    </style>
</head>

<body class="layout-top-header bg-body-tertiary">
    <?php include_once('../components/php/top_header.php'); ?>
    <?php include_once('../components/php/nav_dropdown.php'); ?>

    <div class="page-container">
        <main id="main-content" class="px-3 pt-3">
            <?php include_once('../components/php/spinner.php'); ?>
            
            <div class="bg-white border rounded-3 shadow-sm p-3 mb-3">
                
                <div class="row g-2 align-items-center mb-3 pb-2 border-bottom">
                    
                    <div class="col-12 col-md-5 d-flex align-items-center gap-2">
                        
                        <div class="toolbar-group item-master-pane w-100 d-flex gap-2">
                            <div class="input-group input-group-sm w-100 shadow-sm">
                                <span class="input-group-text bg-white"><i class="fas fa-search text-muted"></i></span>
                                <input type="text" class="form-control border-start-0" id="itemMasterSearch" placeholder="ค้นหา SAP No., Part No..." autocomplete="off">
                            </div>
                            
                            <select id="materialTypeFilter" class="form-select form-select-sm w-auto shadow-sm fw-bold text-primary border-primary">
                                <option value="">-- ทุกประเภท (All Types) --</option>
                                <option value="FG">FG (Finished Good)</option>
                                <option value="SEMI">SEMI (Semi-Finished)</option>
                                <option value="WIP">WIP (Work in Process)</option>
                                <option value="RM">RM (Raw Material)</option>
                                <option value="PKG">PKG (Packaging)</option>
                                <option value="CON">CON (Consumable)</option>
                                <option value="SP">SP (Spare Part)</option>
                                <option value="TOOL">TOOL (Tools)</option>
                                <option value="OTHER">OTHER (อื่นๆ)</option>
                            </select>

                            <select id="modelFilterValue" class="form-select form-select-sm w-auto shadow-sm d-none">
                                <option value="">-- All Models --</option>
                            </select>
                        </div>

                        <div class="toolbar-group bom-manager-pane w-100 align-items-center d-none">
                            <h6 class="fw-bold text-secondary mb-0 m-0"><i class="fas fa-sitemap me-2"></i> BOM Manager (สูตรการผลิต)</h6>
                        </div>

                        <div class="toolbar-group lineSchedulesPane w-100 align-items-center d-none">
                            <h6 class="fw-bold text-secondary mb-0 m-0"><i class="fas fa-clock me-2"></i> Line Schedules (ตารางเวลา)</h6>
                        </div>

                        <div class="toolbar-group locations-pane w-100 align-items-center d-none">
                            <h6 class="fw-bold text-secondary mb-0 m-0"><i class="fas fa-map-marker-alt me-2"></i> Locations (จุดจัดเก็บ)</h6>
                        </div>

                    </div>

                    <div class="col-12 col-md-7 text-md-end d-flex justify-content-end align-items-center gap-2">
                        <div class="toolbar-group item-master-pane d-flex gap-2">
                            <button class="btn btn-sm btn-outline-secondary shadow-sm" id="toggleInactiveBtn" title="ซ่อน/แสดง รายการที่ปิดใช้งาน">
                                <i class="fas fa-eye-slash"></i>
                            </button>
                            <button class="btn btn-sm btn-success fw-bold shadow-sm" id="addNewItemBtn">
                                <i class="fas fa-plus me-1"></i> Add Item
                            </button>
                        </div>

                        <div class="toolbar-group bom-manager-pane d-flex gap-2 d-none">
                        </div>

                        <div class="toolbar-group lineSchedulesPane d-flex gap-2 d-none">
                            <button class="btn btn-sm btn-success fw-bold shadow-sm" onclick="openScheduleModal()">
                                <i class="fas fa-plus me-1"></i> Add Schedule
                            </button>
                        </div>

                        <div class="toolbar-group locations-pane d-flex gap-2 d-none">
                            <button class="btn btn-sm btn-success fw-bold shadow-sm" id="addLocationBtn">
                                <i class="fas fa-plus me-1"></i> Add Location
                            </button>
                        </div>

                        <div class="dropdown ms-1">
                            <button class="btn btn-sm btn-light border shadow-sm px-2" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                                <i class="fas fa-ellipsis-v fa-fw text-secondary"></i>
                            </button>
                            <ul class="dropdown-menu dropdown-menu-end shadow-sm" style="font-size: 0.85rem; min-width: 220px;">
                                <li class="dropdown-header text-primary fw-bold"><i class="fas fa-exchange-alt me-1"></i> Switch Module</li>
                                <li><a class="dropdown-item module-switch active" href="#" data-target="item-master-pane"><i class="fas fa-cube me-2 w-15px text-muted"></i> Item Master</a></li>
                                <li><a class="dropdown-item module-switch" href="#" data-target="bom-manager-pane"><i class="fas fa-sitemap me-2 w-15px text-muted"></i> BOM Manager</a></li>
                                <li><a class="dropdown-item module-switch" href="#" data-target="lineSchedulesPane"><i class="fas fa-clock me-2 w-15px text-muted"></i> Line Schedules</a></li>
                                <?php if($canManage): ?>
                                <li><a class="dropdown-item module-switch" href="#" data-target="locations-pane"><i class="fas fa-map-marker-alt me-2 w-15px text-muted"></i> Locations</a></li>
                                <?php endif; ?>
                                
                                <li><hr class="dropdown-divider"></li>
                                <li class="dropdown-header text-success fw-bold"><i class="fas fa-database me-1"></i> Data Actions</li>
                                
                                <li class="toolbar-group item-master-pane"><a class="dropdown-item" href="#" id="importItemsBtn"><i class="fas fa-file-import me-2 w-15px text-info"></i> Import Excel</a></li>
                                <li class="toolbar-group item-master-pane"><a class="dropdown-item" href="#" id="exportItemsBtn"><i class="fas fa-file-export me-2 w-15px text-primary"></i> Export Excel</a></li>
                                
                                <li class="toolbar-group bom-manager-pane d-none"><a class="dropdown-item" href="#" id="importCreateBomsBtn"><i class="fas fa-file-import me-2 w-15px text-success"></i> Import BOM (New)</a></li>
                                <li class="toolbar-group bom-manager-pane d-none"><a class="dropdown-item" href="#" id="importUpdateBomsBtn"><i class="fas fa-edit me-2 w-15px text-warning"></i> Import BOM (Update)</a></li>
                                <li class="toolbar-group bom-manager-pane d-none"><a class="dropdown-item" href="#" id="exportAllConsolidatedBtn"><i class="fas fa-file-export me-2 w-15px text-primary"></i> Export All BOMs</a></li>
                            </ul>
                        </div>
                    </div>
                </div>

                <input type="file" id="itemImportFile" class="d-none" accept=".xlsx, .xls">
                <input type="file" id="initialCreateImportFile" class="d-none" accept=".xlsx, .xls">
                <input type="file" id="bulkUpdateImportFile" class="d-none" accept=".xlsx, .xls">

                <div class="module-pane active" id="item-master-pane">
                    <div class="table-scrollable border rounded-3">
                        <table class="table table-sm table-hover table-bordered mb-0 text-nowrap table-settings">
                            <thead class="table-light text-center" style="position: sticky; top: 0; z-index: 2;">
                                <tr class="text-secondary bg-light">
                                    <th rowspan="2" class="sticky-col-left px-3 py-2">Item Identity</th>
                                    <th rowspan="2" class="py-2">Description</th>
                                    <th rowspan="2" class="py-2 text-center bg-secondary bg-opacity-10" style="min-width: 80px;">Plan<br><small>(UPH)</small></th>
                                    <th colspan="2" class="py-1 bg-warning bg-opacity-10">Stock Policy</th>
                                    <th colspan="4" class="py-1 bg-info bg-opacity-10">Logistics</th>
                                    <th colspan="2" class="py-1 bg-success bg-opacity-10">Pricing</th>
                                    <th colspan="4" class="py-1 bg-danger bg-opacity-10">Direct Costs</th>
                                    <th colspan="6" class="py-1 bg-primary bg-opacity-10">Overheads (OH)</th>
                                    <th rowspan="2" class="py-2">Status</th>
                                </tr>
                                <tr class="text-secondary bg-light" style="font-size: 0.7rem;">
                                    <th class="bg-warning bg-opacity-10">Min</th><th class="bg-warning bg-opacity-10">Max</th>
                                    <th class="bg-info bg-opacity-10">CTN</th><th class="bg-info bg-opacity-10">NW</th><th class="bg-info bg-opacity-10">GW</th><th class="bg-info bg-opacity-10">CBM</th>
                                    <th class="bg-success bg-opacity-10">THB</th><th class="bg-success bg-opacity-10">USD</th>
                                    <th class="bg-danger bg-opacity-10">RM</th><th class="bg-danger bg-opacity-10">PKG</th><th class="bg-danger bg-opacity-10">SUB</th><th class="bg-danger bg-opacity-10">DL</th>
                                    <th class="bg-primary bg-opacity-10">Mach</th><th class="bg-primary bg-opacity-10">Util</th><th class="bg-primary bg-opacity-10">Ind.</th><th class="bg-primary bg-opacity-10">Staff</th><th class="bg-primary bg-opacity-10">Acc.</th><th class="bg-primary bg-opacity-10">Other</th>
                                </tr>
                            </thead>    
                            <tbody id="itemsTableBody"></tbody>
                        </table>
                    </div>
                    <div class="mt-3">
                        <ul class="pagination pagination-sm justify-content-end mb-0" id="itemMasterPagination"></ul>
                    </div>
                </div>
                
                <div class="module-pane" id="bom-manager-pane">
                    <div class="row g-3" style="height: calc(100vh - 180px);">
                        
                        <div class="col-12 col-md-4 col-lg-3 d-flex flex-column h-100">
                            <div class="input-group input-group-sm mb-2 shadow-sm">
                                <span class="input-group-text bg-white"><i class="fas fa-search text-muted"></i></span>
                                <input type="text" class="form-control border-start-0" id="bomMasterSearch" placeholder="ค้นหา FG SAP No...">
                            </div>
                            <div class="list-group list-group-flush border rounded-3 shadow-sm flex-grow-1 overflow-auto hide-scrollbar bg-white" id="bomMasterList">
                                </div>
                        </div>

                        <div class="col-12 col-md-8 col-lg-9 d-flex flex-column h-100">
                            <div class="bg-white border rounded-3 shadow-sm flex-grow-1 d-flex flex-column overflow-hidden">
                                
                                <div class="p-3 border-bottom bg-light d-flex justify-content-between align-items-center" id="bomDetailHeader">
                                    <div>
                                        <h6 class="mb-0 fw-bold text-primary" id="bomDetailTitle">
                                            <i class="fas fa-hand-point-left me-2"></i>เลือก FG จากเมนูด้านซ้าย
                                        </h6>
                                        <div class="d-flex align-items-center gap-2 mt-1">
                                            <small class="text-muted" id="bomDetailSubtitle">เพื่อจัดการสูตรการผลิต (BOM)</small>
                                            
                                            <select class="form-select form-select-sm d-none fw-bold border-primary text-primary" id="bomVersionSelect" style="width: auto;"></select>
                                            <span class="badge d-none" id="bomStatusBadge" style="font-size: 0.75rem;"></span>
                                            <small class="text-secondary fw-bold d-none" id="bomEcnLabel"><i class="fas fa-file-signature me-1"></i><span id="bomEcnText"></span></small>
                                        </div>
                                    </div>
                                    <div class="d-flex gap-2 d-none flex-wrap justify-content-end" id="bomDetailActions">
                                        <button class="btn btn-sm btn-warning fw-bold shadow-sm d-none" id="btnCreateRevision" title="สร้างสูตรเวอร์ชันใหม่ (ECN)">
                                            <i class="fas fa-code-branch me-1"></i> สร้าง Revision ใหม่
                                        </button>
                                        <button class="btn btn-sm btn-success fw-bold shadow-sm d-none" id="btnApproveRevision" title="อนุมัติสูตรร่างนี้เพื่อใช้งานจริง">
                                            <i class="fas fa-check-circle me-1"></i> Approve & Release
                                        </button>

                                        <button class="btn btn-sm btn-outline-danger fw-bold shadow-sm" id="btnDeleteFullBom" title="ล้างสูตรทั้งหมด">
                                            <i class="fas fa-trash-alt me-1"></i> ล้างสูตร
                                        </button>
                                        <button class="btn btn-sm btn-outline-success fw-bold shadow-sm" id="btnRollupCost" title="อัปเดตต้นทุนรวมกลับไปที่ Item Master">
                                            <i class="fas fa-calculator me-1"></i> Update Cost
                                        </button>
                                        <button class="btn btn-sm btn-outline-info fw-bold shadow-sm" id="btnCloneBom" title="คัดลอกสูตรไปยัง FG อื่น">
                                            <i class="fas fa-copy me-1"></i> Clone
                                        </button>
                                        <button class="btn btn-sm btn-outline-secondary fw-bold shadow-sm" id="btnViewHistory" title="ดูประวัติการแก้ไข">
                                            <i class="fas fa-history me-1"></i> History
                                        </button>
                                        <button class="btn btn-sm btn-primary fw-bold shadow-sm" id="btnOpenCatalog">
                                            <i class="fas fa-list-ul me-1"></i> เลือกวัตถุดิบ (Catalog)
                                        </button>
                                    </div>
                                </div>

                                <div class="flex-grow-1 overflow-auto hide-scrollbar position-relative">
                                    <table class="table table-sm table-hover align-middle mb-0 text-nowrap table-settings">
                                        <thead class="table-light sticky-top" style="z-index: 2;">
                                            <tr class="text-secondary">
                                                <th class="py-2 px-3">Component SAP No.</th>
                                                <th class="py-2">Description</th>
                                                <th class="py-2 text-center bg-warning bg-opacity-10" style="width: 150px;">Quantity (Req)</th>
                                                <th class="py-2 text-end px-3">Est. Cost (THB)</th>
                                                <th class="py-2 text-center" style="width: 60px;">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody id="bomDetailTbody">
                                            <tr>
                                                <td colspan="5" class="text-center py-5 text-muted">
                                                    <i class="fas fa-sitemap fa-3x mb-3 text-light d-block"></i>
                                                    ข้อมูลจะแสดงเมื่อเลือกรายการ
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>

                                <div class="bg-light border-top p-3 d-flex justify-content-end align-items-center d-none" id="bomDetailFooter" style="z-index: 3;">
                                    <span class="text-secondary fw-bold me-3" style="font-size: 0.9rem;">Total Estimated Material Cost:</span>
                                    <span class="text-danger fw-bold" id="bomTotalCost" style="font-size: 1rem;">฿0.0000</span>
                                </div>

                            </div>
                        </div>
                    </div>
                </div>

                <div class="module-pane" id="lineSchedulesPane">
                    <div class="table-responsive bg-white border rounded-3 shadow-sm hide-scrollbar" style="max-height: calc(100vh - 250px);">
                        <table class="table table-sm table-hover align-middle mb-0 text-nowrap table-settings">
                            <thead class="table-light sticky-top" style="z-index: 2;">
                                <tr class="text-secondary">
                                    <th class="py-2 px-3">Line Name</th>
                                    <th class="py-2">Shift</th>
                                    <th class="py-2 text-center">Start Time</th>
                                    <th class="py-2 text-center">End Time</th>
                                    <th class="py-2 text-center">Planned Break (Mins)</th>
                                    <th class="py-2 text-center">Status</th>
                                    <th class="py-2 text-center px-3">Actions</th>
                                </tr>
                            </thead>
                            <tbody id="schedulesTableBody"></tbody>
                        </table>
                    </div>
                </div>

                <div class="module-pane" id="locations-pane">
                    <div class="table-responsive bg-white border rounded-3 shadow-sm hide-scrollbar" style="max-height: calc(100vh - 250px);">
                        <table class="table table-sm table-hover align-middle mb-0 text-nowrap table-settings">
                            <thead class="table-light sticky-top" style="z-index: 2;">
                                <tr class="text-secondary">
                                    <th class="py-2 px-3">Location Name</th>
                                    <th class="py-2">Description</th>
                                    <th class="py-2 text-center">Production Line</th>
                                    <th class="py-2 text-center">Location Type</th>
                                    <th class="py-2 text-center px-3">Status</th>
                                </tr>
                            </thead>
                            <tbody id="locationsTableBody"></tbody>
                        </table>
                    </div>
                </div>

            </div>

            <div class="modal fade" id="catalogModal" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
                    <div class="modal-content shadow-lg border-0">
                        <div class="modal-header bg-primary text-white py-3">
                            <h5 class="modal-title fw-bold">
                                <i class="fas fa-list-ul me-2"></i>Material Catalog 
                                <span class="badge bg-light text-primary ms-2" id="catalogTargetFg"></span>
                            </h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body bg-light p-3">
                            <div class="input-group input-group-sm mb-3 shadow-sm">
                                <span class="input-group-text bg-white"><i class="fas fa-search text-muted"></i></span>
                                <input type="text" class="form-control border-start-0" id="catalogSearch" placeholder="ค้นหา RM, PKG, WIP ที่ต้องการ...">
                                <select class="form-select" id="catalogTypeFilter" style="max-width: 150px;">
                                    <option value="">ทุกประเภท</option>
                                    <option value="RM" selected>RM (วัตถุดิบ)</option>
                                    <option value="PKG">PKG (แพ็คเกจ)</option>
                                    <option value="SEMI">SEMI (กึ่งสำเร็จรูป)</option> 
                                </select>
                            </div>
                            <div class="table-responsive bg-white border rounded shadow-sm">
                                <table class="table table-sm table-hover align-middle mb-0 text-nowrap table-settings">
                                    <thead class="table-light sticky-top">
                                        <tr class="text-secondary">
                                            <th class="px-3">SAP No.</th>
                                            <th>Description</th>
                                            <th class="text-center">Type</th>
                                            <th class="text-center" style="width: 150px;">ใส่จำนวน (Qty)</th>
                                            <th class="text-center px-3" style="width: 80px;">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody id="catalogTbody">
                                        </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    </div>
    
    <?php include('components/allSettingModal.php'); ?>

    <script>
        const canManage = <?php echo json_encode($canManage); ?>;
        const currentUser = <?php echo json_encode($_SESSION['user']); ?>;
    </script>
    <script src="../components/js/pagination.js"></script>
    <script src="../../utils/libs/xlsx.full.min.js"></script>
    <script src="script/systemSettings.js?v=<?php echo filemtime(__DIR__ . '/script/systemSettings.js'); ?>"></script>
</body>
</html>