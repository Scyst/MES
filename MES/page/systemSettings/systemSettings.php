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
        .table-scrollable {
            overflow-x: auto;
            max-height: calc(100vh - 240px);
        }
        .table-scrollable::-webkit-scrollbar { height: 8px; width: 8px; }
        .table-scrollable::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 4px; }
        .table-scrollable::-webkit-scrollbar-thumb { background: #c1c1c1; border-radius: 4px; }
        .table-scrollable::-webkit-scrollbar-thumb:hover { background: #a8a8a8; }

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
        
        .module-pane { display: none; }
        .module-pane.active { display: block; }
    </style>
</head>

<body class="layout-top-header bg-body-tertiary">
    <?php include_once('../components/php/top_header.php'); ?>

    <div class="page-container">
        <main id="main-content" class="px-3 pt-3">
            <?php include_once('../components/php/spinner.php'); ?>
            
            <div class="bg-white border rounded-3 shadow-sm p-3 mb-3">
                
                <div class="toolbar-group sap-valuation-pane d-none w-100 mb-3">
                    <div class="row g-3 row-cols-1 row-cols-md-3 row-cols-xl-5">
                        <div class="col">
                            <div class="card shadow-sm border-0 h-100 rounded-3" style="border-left: 4px solid #0d6efd !important; background: linear-gradient(135deg, #f8f9fa 0%, #f0f6ff 100%);">
                                <div class="card-body py-3 px-3">
                                    <h6 class="text-secondary fw-bold text-uppercase mb-3" style="font-size: 0.75rem; letter-spacing: 0.5px;"><i class="fas fa-box text-primary me-2"></i> RM (10-xx)</h6>
                                    
                                    <div class="d-flex flex-column gap-2" style="font-size: 0.8rem;">
                                        <div class="d-flex justify-content-between border-bottom pb-1">
                                            <span class="text-muted fw-bold">SAP Value (THB):</span>
                                            <span class="fw-bold fs-6" style="color: #0d6efd;" id="sapValRmThb">0.00</span>
                                        </div>
                                        <div class="d-flex justify-content-between border-bottom pb-1">
                                            <span class="text-muted">MES Value (THB):</span>
                                            <span class="fw-bold text-dark" id="sapValRmThbMes">0.00</span>
                                        </div>
                                        <div class="d-flex justify-content-between border-bottom pb-1">
                                            <span class="text-muted">Variance:</span>
                                            <span id="sapValRmDiff" class="fw-bold">-</span>
                                        </div>
                                        <div class="d-flex justify-content-between pb-0">
                                            <span class="text-muted">Quantity (pcs):</span>
                                            <span class="fw-bold text-dark" id="sapValRmQty">0</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="col">
                            <div class="card shadow-sm border-0 h-100 rounded-3" style="border-left: 4px solid #0dcaf0 !important; background: linear-gradient(135deg, #f8f9fa 0%, #ebfaff 100%);">
                                <div class="card-body py-3 px-3">
                                    <h6 class="text-secondary fw-bold text-uppercase mb-3" style="font-size: 0.75rem; letter-spacing: 0.5px;"><i class="fas fa-box-open text-info me-2"></i> PKG (20-xx)</h6>
                                    
                                    <div class="d-flex flex-column gap-2" style="font-size: 0.8rem;">
                                        <div class="d-flex justify-content-between border-bottom pb-1">
                                            <span class="text-muted fw-bold">SAP Value (THB):</span>
                                            <span class="fw-bold fs-6" style="color: #0dcaf0;" id="sapValPkgThb">0.00</span>
                                        </div>
                                        <div class="d-flex justify-content-between border-bottom pb-1">
                                            <span class="text-muted">MES Value (THB):</span>
                                            <span class="fw-bold text-dark" id="sapValPkgThbMes">0.00</span>
                                        </div>
                                        <div class="d-flex justify-content-between border-bottom pb-1">
                                            <span class="text-muted">Variance:</span>
                                            <span id="sapValPkgDiff" class="fw-bold">-</span>
                                        </div>
                                        <div class="d-flex justify-content-between pb-0">
                                            <span class="text-muted">Quantity (pcs):</span>
                                            <span class="fw-bold text-dark" id="sapValPkgQty">0</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="col">
                            <div class="card shadow-sm border-0 h-100 rounded-3" style="border-left: 4px solid #6610f2 !important; background: linear-gradient(135deg, #f8f9fa 0%, #f3ebff 100%);">
                                <div class="card-body py-3 px-3">
                                    <h6 class="text-secondary fw-bold text-uppercase mb-3" style="font-size: 0.75rem; letter-spacing: 0.5px;"><i class="fas fa-boxes text-purple me-2" style="color: #6610f2;"></i> RM + PKG</h6>
                                    
                                    <div class="d-flex flex-column gap-2" style="font-size: 0.8rem;">
                                        <div class="d-flex justify-content-between border-bottom pb-1" style="border-color: rgba(102, 16, 242, 0.1) !important;">
                                            <span class="text-muted fw-bold">SAP Value (THB):</span>
                                            <span class="fw-bold fs-6" style="color: #6610f2;" id="sapValRmPkgThb">0.00</span>
                                        </div>
                                        <div class="d-flex justify-content-between border-bottom pb-1" style="border-color: rgba(102, 16, 242, 0.1) !important;">
                                            <span class="text-muted">MES Value (THB):</span>
                                            <span class="fw-bold text-dark" id="sapValRmPkgThbMes">0.00</span>
                                        </div>
                                        <div class="d-flex justify-content-between border-bottom pb-1" style="border-color: rgba(102, 16, 242, 0.1) !important;">
                                            <span class="text-muted">Variance:</span>
                                            <span id="sapValRmPkgDiff" class="fw-bold">-</span>
                                        </div>
                                        <div class="d-flex justify-content-between pb-0">
                                            <span class="text-muted">Quantity (pcs):</span>
                                            <span class="fw-bold text-dark" id="sapValRmPkgQty">0</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="col">
                            <div class="card shadow-sm border-0 h-100 rounded-3" style="border-left: 4px solid #fd7e14 !important; background: linear-gradient(135deg, #f8f9fa 0%, #fff6ec 100%);">
                                <div class="card-body py-3 px-3">
                                    <h6 class="text-secondary fw-bold text-uppercase mb-3" style="font-size: 0.75rem; letter-spacing: 0.5px;"><i class="fas fa-cogs text-warning me-2"></i> WIP (30-xx)</h6>
                                    
                                    <div class="d-flex flex-column gap-2" style="font-size: 0.8rem;">
                                        <div class="d-flex justify-content-between border-bottom pb-1">
                                            <span class="text-muted fw-bold">SAP Value (THB):</span>
                                            <span class="fw-bold fs-6" style="color: #fd7e14;" id="sapValWipThb">0.00</span>
                                        </div>
                                        <div class="d-flex justify-content-between border-bottom pb-1">
                                            <span class="text-muted">MES Value (THB):</span>
                                            <span class="fw-bold text-dark" id="sapValWipThbMes">0.00</span>
                                        </div>
                                        <div class="d-flex justify-content-between border-bottom pb-1">
                                            <span class="text-muted">Variance:</span>
                                            <span id="sapValWipDiff" class="fw-bold">-</span>
                                        </div>
                                        <div class="d-flex justify-content-between pb-0">
                                            <span class="text-muted">Quantity (pcs):</span>
                                            <span class="fw-bold text-dark" id="sapValWipQty">0</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="col">
                            <div class="card shadow-sm border-0 h-100 rounded-3" style="border-left: 4px solid #198754 !important; background: linear-gradient(135deg, #f8f9fa 0%, #edf7f1 100%);">
                                <div class="card-body py-3 px-3">
                                    <h6 class="text-secondary fw-bold text-uppercase mb-3" style="font-size: 0.75rem; letter-spacing: 0.5px;"><i class="fas fa-check-circle text-success me-2"></i> FG (40-xx)</h6>
                                    
                                    <div class="d-flex flex-column gap-2" style="font-size: 0.8rem;">
                                        <div class="d-flex justify-content-between border-bottom pb-1">
                                            <span class="text-muted fw-bold">SAP Value (THB):</span>
                                            <span class="fw-bold fs-6" style="color: #198754;" id="sapValFgThb">0.00</span>
                                        </div>
                                        <div class="d-flex justify-content-between border-bottom pb-1">
                                            <span class="text-muted">MES Value (THB):</span>
                                            <span class="fw-bold text-dark" id="sapValFgThbMes">0.00</span>
                                        </div>
                                        <div class="d-flex justify-content-between border-bottom pb-1">
                                            <span class="text-muted">Variance:</span>
                                            <span id="sapValFgDiff" class="fw-bold">-</span>
                                        </div>
                                        <div class="d-flex justify-content-between pb-0">
                                            <span class="text-muted">Quantity (pcs):</span>
                                            <span class="fw-bold text-dark" id="sapValFgQty">0</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="row g-2 align-items-center mb-3 pb-2 border-bottom">
                    
                    <div class="col-12 col-md-5 d-flex align-items-center gap-2">
                        
                        <div class="toolbar-group item-master-pane w-100 d-flex gap-2">
                            <div class="input-group input-group-sm flex-grow-1" style="max-width: 300px; min-width: 150px;">
                                <span class="input-group-text bg-white"><i class="fas fa-search text-muted"></i></span>
                                <input type="text" class="form-control border-start-0" id="itemMasterSearch" placeholder="ค้นหา..." autocomplete="off">
                            </div>
                            
                            <select id="materialTypeFilter" class="form-select form-select-sm w-auto shadow-sm">
                                <option value="">-- All Types --</option>
                                <option value="FG">FG (Finished Good)</option>
                                <option value="SEMI">SEMI (Semi-Finished)</option>
                                <option value="WIP">WIP (Work in Process)</option>
                                <option value="RM">RM (Raw Material)</option>
                                <option value="PKG">PKG (Packaging)</option>
                                <option value="CON">CON (Consumable)</option>
                                <option value="SP">SP (Spare Part)</option>
                                <option value="TOOL">TOOL (Tools)</option>
                                <option value="OTHER">OTHER (อื่นๆ)</option>
                                <option value="UNCLASSIFIED" class="text-danger fw-bold">UNCLASSIFIED (รอจัดหมวดหมู่)</option>
                            </select>

                            <select id="materialSubTypeFilter" class="form-select form-select-sm w-auto shadow-sm">
                                <option value="">-- All Sub-Types --</option>
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

                        <div class="toolbar-group sap-valuation-pane w-100 d-flex gap-2 d-none">
                            <div class="input-group input-group-sm flex-grow-1" style="max-width: 300px; min-width: 150px;">
                                <span class="input-group-text bg-white"><i class="fas fa-search text-muted"></i></span>
                                <input type="text" class="form-control border-start-0" id="sapValSearch" placeholder="Search Material..." autocomplete="off">
                            </div>
                            <button class="btn btn-sm btn-outline-secondary shadow-sm position-relative" onclick="openModal('sapValFilterModal')" title="Filter Data">
                                <i class="fas fa-filter"></i>
                                <span id="sapValFilterBadge" class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger d-none">
                                    0
                                </span>
                            </button>
                            <button class="btn btn-sm btn-outline-secondary shadow-sm" onclick="loadSapValuation()" title="Refresh Data">
                                <i class="fas fa-sync-alt"></i>
                            </button>
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

                        <div class="toolbar-group sap-valuation-pane d-flex gap-2 d-none align-items-center">
                            <div class="d-flex gap-2 align-items-center bg-light border rounded-pill px-2 py-1 me-1 shadow-sm" style="font-size: 0.95rem;">
                                <span class="text-secondary fw-bold"><i class="fas fa-heartbeat"></i> Health:</span>
                                <span class="badge bg-white text-dark border rounded-pill fs-6"><i class="fas fa-sync-alt text-warning me-1"></i> <span id="sapValSyncRequiredCount" class="fw-bold text-warning">0</span></span>
                                <span class="badge bg-white text-dark border rounded-pill fs-6"><i class="fas fa-exclamation-triangle text-danger me-1"></i> <span id="sapValMissingCostCount" class="fw-bold text-danger">0</span></span>
                                <span class="badge bg-white text-dark border rounded-pill fs-6"><i class="fas fa-question-circle text-secondary me-1"></i> <span id="sapValUnregisteredCount" class="fw-bold text-secondary">0</span></span>
                            </div>
                            <button class="btn btn-sm btn-outline-success shadow-sm" onclick="bulkSyncSapCosts()" title="Sync Costs to MES">
                                <i class="fas fa-sync me-1"></i> Sync Costs
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
                                <li><a class="dropdown-item module-switch" href="#" data-target="sap-valuation-pane"><i class="fas fa-chart-line me-2 w-15px text-muted"></i> SAP Valuation</a></li>
                                <?php endif; ?>
                                
                                <li><hr class="dropdown-divider"></li>
                                <li class="dropdown-header text-success fw-bold"><i class="fas fa-database me-1"></i> Data Actions</li>
                                
                                <li class="toolbar-group item-master-pane"><a class="dropdown-item" href="#" id="syncSapItemsBtn"><i class="fas fa-sync me-2 w-15px text-primary"></i> Sync from SAP</a></li>
                                <li class="toolbar-group item-master-pane"><a class="dropdown-item" href="#" id="importItemsBtn"><i class="fas fa-file-import me-2 w-15px text-info"></i> Import Excel</a></li>
                                <li class="toolbar-group item-master-pane"><a class="dropdown-item" href="#" id="exportItemsBtn"><i class="fas fa-file-export me-2 w-15px text-primary"></i> Export Excel</a></li>
                                
                                <li><hr class="dropdown-divider toolbar-group item-master-pane"></li>
                                <li class="toolbar-group item-master-pane"><a class="dropdown-item" href="#" onclick="showMaterialDict()"><i class="fas fa-book me-2 w-15px text-secondary"></i> คู่มือประเภทสินค้า (Data Dict.)</a></li>
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
                                    <th rowspan="2" class="py-2">Barcode / SKU</th>
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

                <div class="module-pane" id="sap-valuation-pane">

                    <div class="table-responsive bg-white border rounded-3 shadow-sm hide-scrollbar" style="max-height: calc(100vh - 250px);">
                        <table class="table table-sm table-hover align-middle mb-0 text-nowrap table-settings" id="sapValuationTable">
                            <thead class="table-light text-secondary" style="position: sticky; top: 0; z-index: 2;">
                                <tr>
                                    <th class="py-2 px-3 sortable-header" data-sort="Mat_No" style="cursor: pointer;">SAP No. <i class="fas fa-sort text-muted ms-1"></i></th>
                                    <th class="py-2 sortable-header" data-sort="MatDesc" style="cursor: pointer;">Description <i class="fas fa-sort text-muted ms-1"></i></th>
                                    <th class="py-2 text-center sortable-header" data-sort="MES_Category" style="cursor: pointer;">Type (MES) <i class="fas fa-sort text-muted ms-1"></i></th>
                                    <th class="py-2 text-center sortable-header" data-sort="Category" style="cursor: pointer;">Group (SAP) <i class="fas fa-sort text-muted ms-1"></i></th>
                                    <th class="py-2 text-center sortable-header" data-sort="Storage_Location" style="cursor: pointer;">Loc <i class="fas fa-sort text-muted ms-1"></i></th>
                                    <th class="py-2 text-end sortable-header" data-sort="Quantity" style="cursor: pointer;">Quantity <i class="fas fa-sort text-muted ms-1"></i></th>
                                    <th class="py-2 text-center">Unit</th>
                                    <th class="py-2 text-end sortable-header" data-sort="SAP_Cost" style="cursor: pointer;">SAP Cost (THB) <i class="fas fa-sort text-muted ms-1"></i></th>
                                    <th class="py-2 text-end sortable-header" data-sort="MES_Cost" style="cursor: pointer;">MES Cost (THB) <i class="fas fa-sort text-muted ms-1"></i></th>
                                    <th class="py-2 text-end sortable-header" data-sort="SAP_Value" style="cursor: pointer;">SAP Value (THB) <i class="fas fa-sort text-muted ms-1"></i></th>
                                    <th class="py-2 text-end px-3 sortable-header" data-sort="MES_Value" style="cursor: pointer;">MES Value (THB) <i class="fas fa-sort text-muted ms-1"></i></th>
                                </tr>
                            </thead>
                            <tbody id="sapValuationTableBody">
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>

            <!-- SAP Valuation Filter Modal -->
            <div class="modal fade" id="sapValFilterModal" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content shadow-lg border-0">
                        <div class="modal-header bg-light py-3">
                            <h5 class="modal-title fw-bold">
                                <i class="fas fa-filter text-muted me-2"></i>Filter Valuation Data
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body bg-white p-4">
                            <div class="mb-4">
                                <label class="form-label fw-bold text-secondary text-uppercase" style="font-size: 0.8rem;">Category</label>
                                <div class="row g-2" id="sapFilterCategories" style="max-height: 150px; overflow-y: auto;">
                                    <!-- Populated dynamically via JS -->
                                </div>
                            </div>
                            
                            <div class="mb-4">
                                <label class="form-label fw-bold text-secondary text-uppercase" style="font-size: 0.8rem;">Pricing Status</label>
                                <div class="d-flex flex-column gap-2" id="sapFilterPricing">
                                    <div class="form-check">
                                        <input class="form-check-input" type="checkbox" id="price_no_sap" value="no_sap">
                                        <label class="form-check-label" for="price_no_sap">Missing SAP Cost (0 THB)</label>
                                    </div>
                                    <div class="form-check">
                                        <input class="form-check-input" type="checkbox" id="price_no_mes" value="no_mes">
                                        <label class="form-check-label" for="price_no_mes">Missing MES Cost (0 THB)</label>
                                    </div>
                                    <div class="form-check">
                                        <input class="form-check-input" type="checkbox" id="price_mismatch" value="mismatch">
                                        <label class="form-check-label" for="price_mismatch">Cost Mismatch (Needs Sync)</label>
                                    </div>
                                </div>
                            </div>

                            <div class="mb-2">
                                <label class="form-label fw-bold text-secondary text-uppercase" style="font-size: 0.8rem;">Storage Location</label>
                                <div class="row g-2" id="sapFilterLocations" style="max-height: 150px; overflow-y: auto;">
                                    <!-- Populated dynamically via JS -->
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer bg-light py-2">
                            <button type="button" class="btn btn-light btn-sm fw-bold border shadow-sm px-4 me-auto" onclick="clearSapValFilters()">Clear</button>
                            <button type="button" class="btn btn-secondary btn-sm fw-bold shadow-sm px-4" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-primary btn-sm fw-bold shadow-sm px-4" onclick="applySapValFiltersBtn()">
                                <i class="fas fa-check me-1"></i> Apply
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- SAP Sync Result Modal -->
            <div class="modal fade" id="sapSyncResultModal" tabindex="-1" aria-hidden="true" data-bs-backdrop="static">
                <div class="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
                    <div class="modal-content shadow-lg border-0">
                        <div class="modal-header bg-success text-white py-3" id="sapSyncResultModalHeader">
                            <h5 class="modal-title fw-bold" id="sapSyncResultModalTitle">
                                <i class="fas fa-check-circle me-2"></i>SAP Sync Results
                            </h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body bg-light p-3">
                            <div class="alert alert-info py-2 mb-3 shadow-sm border-0" id="sapSyncResultModalAlert">
                                <i class="fas fa-info-circle me-1"></i> 
                                รายการต่อไปนี้คือข้อมูลที่อัปเดตจาก SAP กรุณาคลิก <b>Setup</b> เพื่อเข้าไปตั้งค่า Material Type, Min/Max Stock และข้อมูลอื่นๆ ให้ครบถ้วน
                            </div>
                            <div class="table-responsive bg-white border rounded-3 shadow-sm hide-scrollbar" style="max-height: 50vh;">
                                <table class="table table-hover align-middle mb-0 text-nowrap">
                                    <thead class="table-light sticky-top shadow-sm">
                                        <tr class="text-secondary text-uppercase" style="font-size: 0.8rem;">
                                            <th class="py-3 px-3">Status</th>
                                            <th class="py-3">SAP No</th>
                                            <th class="py-3">Description</th>
                                            <th class="py-3 text-center">Current Type</th>
                                            <th class="py-3 text-center">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody id="sapSyncResultTableBody"></tbody>
                                </table>
                            </div>
                        </div>
                        <div class="modal-footer bg-light py-2 border-top-0">
                            <button type="button" class="btn btn-secondary btn-sm fw-bold shadow-sm px-4" data-bs-dismiss="modal">Close</button>
                            <button type="button" id="confirmSyncDataBtn" class="btn btn-primary btn-sm fw-bold shadow-sm px-4 d-none">
                                <i class="fas fa-cloud-download-alt me-1"></i> Confirm & Sync Data
                            </button>
                        </div>
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
                                    <option value="CON">CON (สิ้นเปลือง)</option>
                                    <option value="SP">SP (อะไหล่)</option>
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
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            const syncBtn = document.getElementById('syncSapItemsBtn');
            function escapeHtml(text) {
                if (text === null || text === undefined) return '';
                const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
                return String(text).replace(/[&<>"']/g, m => map[m]);
            }

            if (syncBtn) {
                syncBtn.addEventListener('click', function(e) {
                    e.preventDefault();
                    Swal.fire({
                        title: 'Preview Sync Items from SAP?',
                        text: 'ระบบจะดึงข้อมูลจาก SAP มาแสดงให้ดูก่อนว่ามีรายการใดบ้างที่จะถูกเพิ่มหรือแก้ไข โดยยังไม่มีการบันทึกลงระบบจริง',
                        icon: 'question',
                        showCancelButton: true,
                        confirmButtonText: 'Preview',
                        cancelButtonText: 'Cancel'
                    }).then((result) => {
                        if (result.isConfirmed) {
                            Swal.fire({
                                title: 'Checking SAP Data...',
                                html: 'กำลังตรวจสอบข้อมูล...',
                                allowOutsideClick: false,
                                didOpen: () => { Swal.showLoading(); }
                            });
                            
                            fetch('api/sync_sap_items.php?dry_run=1&t=' + Date.now(), { method: 'POST', cache: 'no-store' })
                                .then(response => response.json())
                                .then(res => {
                                    if(res.success) {
                                        Swal.close();
                                        if (res.affected_items && res.affected_items.length > 0) {
                                            const tbody = document.getElementById('sapSyncResultTableBody');
                                            tbody.innerHTML = '';
                                            res.affected_items.forEach(item => {
                                                const badgeClass = item.action === 'NEW' ? 'bg-success' : 'bg-info text-dark';
                                                
                                                const tr = document.createElement('tr');
                                                tr.innerHTML = `
                                                    <td class="px-3"><span class="badge ${badgeClass}">${item.action}</span></td>
                                                    <td class="fw-bold text-primary">${escapeHtml(item.sap_no)}</td>
                                                    <td class="text-truncate" style="max-width: 300px;" title="${escapeHtml(item.part_description)}">
                                                        <span id="sync-desc-${escapeHtml(item.sap_no)}">${escapeHtml(item.part_description)}</span>
                                                    </td>
                                                    <td class="text-center">
                                                        <span id="sync-select-${escapeHtml(item.sap_no)}" class="badge bg-warning text-dark shadow-sm">UNCLASSIFIED</span>
                                                    </td>
                                                    <td class="text-center">
                                                        <span class="text-muted small"><i class="fas fa-clock"></i> Pending...</span>
                                                    </td>
                                                `;
                                                tbody.appendChild(tr);
                                            });

                                            // Set modal to Preview Mode
                                            document.getElementById('sapSyncResultModalHeader').className = 'modal-header bg-warning text-dark py-3';
                                            document.getElementById('sapSyncResultModalTitle').innerHTML = '<i class="fas fa-eye me-2"></i>Preview Pending SAP Sync';
                                            document.getElementById('sapSyncResultModalAlert').innerHTML = '<i class="fas fa-exclamation-triangle me-1"></i> รายการต่อไปนี้คือข้อมูลที่จะถูกเพิ่มหรือแก้ไข กรุณากดปุ่ม <b>Confirm & Sync Data</b> เพื่อยืนยันการบันทึกจริง';
                                            document.getElementById('sapSyncResultModalAlert').className = 'alert alert-warning py-2 mb-3 shadow-sm border-0';
                                            document.getElementById('confirmSyncDataBtn').classList.remove('d-none');

                                            const modal = new bootstrap.Modal(document.getElementById('sapSyncResultModal'));
                                            modal.show();
                                        } else {
                                            Swal.fire('Up to date!', 'ไม่มีรายการใหม่หรือรายการที่ต้องอัปเดตจาก SAP', 'info');
                                        }
                                    } else {
                                        Swal.fire('Error', res.message, 'error');
                                    }
                                })
                                .catch(err => {
                                    Swal.fire('Error', err.message, 'error');
                                });

                        }
                    });
                });
            }

            const confirmBtn = document.getElementById('confirmSyncDataBtn');
            if (confirmBtn) {
                confirmBtn.addEventListener('click', function(e) {
                    Swal.fire({
                        title: 'Syncing Data...',
                        html: 'กำลังบันทึกข้อมูลลงฐานข้อมูลจริง...',
                        allowOutsideClick: false,
                        didOpen: () => { Swal.showLoading(); }
                    });

                    fetch('api/sync_sap_items.php?t=' + Date.now(), { method: 'POST', cache: 'no-store' })
                        .then(response => response.json())
                        .then(res => {
                            if(res.success) {
                                Swal.close();
                                document.getElementById('confirmSyncDataBtn').classList.add('d-none');
                                document.getElementById('sapSyncResultModalHeader').className = 'modal-header bg-success text-white py-3';
                                document.getElementById('sapSyncResultModalTitle').innerHTML = '<i class="fas fa-check-circle me-2"></i>SAP Sync Results';
                                document.getElementById('sapSyncResultModalAlert').innerHTML = '<i class="fas fa-info-circle me-1"></i> ข้อมูลถูกบันทึกสำเร็จแล้ว กรุณาคลิก <b>Setup</b> เพื่อตั้งค่ารายการ';
                                document.getElementById('sapSyncResultModalAlert').className = 'alert alert-info py-2 mb-3 shadow-sm border-0';
                                
                                // Re-render table with Setup buttons
                                const tbody = document.getElementById('sapSyncResultTableBody');
                                tbody.innerHTML = '';
                                res.affected_items.forEach(item => {
                                    const badgeClass = item.action === 'NEW' ? 'bg-success' : 'bg-info text-dark';
                                    const tr = document.createElement('tr');
                                    tr.style.cursor = 'pointer';
                                    tr.onclick = function(e) {
                                        if(!e.target.closest('button')) {
                                            openItemBySapNo(item.sap_no);
                                        }
                                    };
                                    tr.innerHTML = `
                                        <td class="px-3"><span class="badge ${badgeClass}">${item.action}</span></td>
                                        <td class="fw-bold text-primary">${escapeHtml(item.sap_no)}</td>
                                        <td class="text-truncate" style="max-width: 300px;" title="${escapeHtml(item.part_description)}">
                                            <span id="sync-desc-${escapeHtml(item.sap_no)}">${escapeHtml(item.part_description)}</span>
                                        </td>
                                        <td class="text-center">
                                            <span id="sync-select-${escapeHtml(item.sap_no)}" class="badge bg-warning text-dark shadow-sm">UNCLASSIFIED</span>
                                        </td>
                                        <td class="text-center">
                                            <button class="btn btn-sm btn-outline-primary rounded-pill px-3 shadow-sm" onclick="openItemBySapNo('${escapeHtml(item.sap_no)}')">
                                                <i class="fas fa-cog"></i> Setup
                                            </button>
                                        </td>
                                    `;
                                    tbody.appendChild(tr);
                                });

                                if(typeof fetchItems === 'function') fetchItems(1);
                                Swal.fire('Success!', res.message, 'success');
                            } else {
                                Swal.fire('Error', res.message, 'error');
                            }
                        })
                        .catch(err => Swal.fire('Error', err.message, 'error'));
                });
            }
        });
        
        // Handler for "Save All Changes" button in Sync Result Modal
        document.getElementById('saveAllSyncBtn')?.addEventListener('click', function() {
            Swal.fire({
                icon: 'success',
                title: 'Saved Successfully',
                text: 'All classifications have been saved.',
                timer: 1500,
                showConfirmButton: false
            }).then(() => {
                const modal = bootstrap.Modal.getInstance(document.getElementById('sapSyncResultModal'));
                if (modal) modal.hide();
                if (typeof fetchItems === 'function') fetchItems(1);
            });
        });

        // Function to open full item settings modal by SAP No
        async function openItemBySapNo(sapNo) {
            try {
                Swal.fire({ title: 'Loading details...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
                // Fix: use 'search' instead of 'search_query'
                const req = await fetch(`api/itemMasterManage.php?action=get_items&search=${encodeURIComponent(sapNo)}&page=1&limit=1`);
                const res = await req.json();
                Swal.close();
                if (res.success && res.data && res.data.length > 0) {
                    const item = res.data.find(i => i.sap_no === sapNo) || res.data[0];
                    if (window.openItemModal) {
                        // Do NOT hide sapSyncResultModal so it stays underneath
                        window.openItemModal(item);
                    }
                } else {
                    Swal.fire('Not Found', 'Could not find full details for this item.', 'warning');
                }
            } catch (e) {
                Swal.fire('Error', 'Failed to fetch item details.', 'error');
            }
        }
    </script>
</body>
</html>
