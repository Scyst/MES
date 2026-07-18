<!-- tab_spareparts.php — Spare Parts & Inventory -->

<!-- tab_spareparts.php — Spare Parts & Inventory -->

<!-- KPI Row -->
<div class="pe-kpi-row" id="spKpiRow">
    <div class="pe-kpi-card kpi-primary pe-animate-in">
        <div>
            <div class="pe-kpi-label">Total SKU</div>
            <div class="pe-kpi-value" id="kpiTotalSKU">0</div>
        </div>
        <div class="pe-kpi-icon"><i class="fas fa-boxes-stacked"></i></div>
    </div>
    <div class="pe-kpi-card kpi-danger pe-animate-in">
        <div>
            <div class="pe-kpi-label">Low Stock Alert</div>
            <div class="pe-kpi-value" id="kpiLowStock">0</div>
        </div>
        <div class="pe-kpi-icon"><i class="fas fa-exclamation-circle"></i></div>
    </div>
    <div class="pe-kpi-card kpi-success pe-animate-in">
        <div>
            <div class="pe-kpi-label">Total Value</div>
            <div class="pe-kpi-value" id="kpiTotalValue">฿0</div>
        </div>
        <div class="pe-kpi-icon"><i class="fas fa-coins"></i></div>
    </div>
    <div class="pe-kpi-card kpi-info pe-animate-in">
        <div>
            <div class="pe-kpi-label">This Month Issues</div>
            <div class="pe-kpi-value" id="kpiMonthIssues">0</div>
        </div>
        <div class="pe-kpi-icon"><i class="fas fa-arrow-up"></i></div>
    </div>
</div>

<style>
.pe-header-nav {
    margin-bottom: -1px;
}
.pe-header-nav .nav-link {
    background: transparent !important;
    color: var(--pe-text-muted);
    border: none;
    border-bottom: 2px solid transparent;
    border-radius: 0;
    padding: 0 10px 12px 10px;
    display: flex;
    align-items: center;
}
.pe-header-nav .nav-link h6 {
    margin: 0;
    font-weight: 600;
}
.pe-header-nav .nav-link:hover {
    color: var(--pe-text-primary);
}
.pe-header-nav .nav-link.active {
    color: var(--pe-primary) !important;
    border-bottom: 2px solid var(--pe-primary);
}
</style>

<div class="pe-card">
    <!-- Header with Tabs -->
    <div class="pe-card-header d-flex justify-content-between align-items-center flex-wrap gap-2" style="border-bottom: 1px solid var(--pe-border-color); padding-bottom: 0;">
        <ul class="nav pe-header-nav" id="spNavTabs" role="tablist">
            <li class="nav-item" role="presentation">
                <button class="nav-link active" id="sp-onhand-tab" data-bs-toggle="pill" data-bs-target="#sp-onhand-pane" type="button" role="tab" onclick="SparePartsModule.switchTab('onhand')">
                    <h6><i class="fas fa-boxes me-2"></i>Stock On-Hand</h6>
                </button>
            </li>
            <li class="nav-item" role="presentation">
                <button class="nav-link" id="sp-master-tab" data-bs-toggle="pill" data-bs-target="#sp-master-pane" type="button" role="tab" onclick="SparePartsModule.switchTab('master')">
                    <h6><i class="fas fa-database me-2"></i>Item Master</h6>
                </button>
            </li>
            <li class="nav-item" role="presentation">
                <button class="nav-link" id="sp-history-tab" data-bs-toggle="pill" data-bs-target="#sp-history-pane" type="button" role="tab" onclick="SparePartsModule.switchTab('history')">
                    <h6><i class="fas fa-history me-2"></i>History Log</h6>
                </button>
            </li>
        </ul>
        <span class="pe-text-xs pe-text-muted pb-2">Last update: <span id="spLastSync">-</span></span>
    </div>

    <!-- Body with Tab Contents -->
    <div class="pe-card-body p-0">
        <div class="tab-content" id="spTabContent">

            <!-- STOCK ON-HAND PANE -->
            <div class="tab-pane fade show active" id="sp-onhand-pane" role="tabpanel">
                <div class="pe-filter-bar" style="border-bottom: 1px solid var(--pe-border-color); border-radius: 0;">
                    <div class="pe-search">
                        <i class="fas fa-search"></i>
                        <input type="text" id="spSearchInput" placeholder="ค้นหา Item Code, ชื่อ, รายละเอียด..." oninput="SparePartsModule.filterTable()">
                    </div>
                    <select class="pe-filter-select" id="spFilterLocation" onchange="SparePartsModule.loadData()">
                        <option value="">ทุกคลัง</option>
                    </select>
                    <div class="pe-filter-spacer"></div>
                    <div class="d-flex gap-2 flex-wrap">
                        <button class="pe-btn pe-btn-success pe-btn-sm" onclick="SparePartsModule.openReceiveModal()">
                            <i class="fas fa-arrow-down"></i> Receive
                        </button>
                        <button class="pe-btn pe-btn-ghost pe-btn-sm" style="border-color:var(--pe-text-primary);color:var(--pe-text-primary);" onclick="SparePartsModule.openIssueModal()">
                            <i class="fas fa-arrow-up"></i> Issue
                        </button>
                        <button class="pe-btn pe-btn-ghost pe-btn-sm" onclick="SparePartsModule.exportExcel()" title="Export">
                            <i class="fas fa-file-excel" style="color:var(--pe-success);"></i> Export
                        </button>
                    </div>
                </div>
                <div style="overflow-x:auto; max-height:550px;">
                    <table class="pe-table" id="spTable">
                        <thead style="position: sticky; top: 0; z-index: 1; background: var(--pe-bg-secondary);">
                            <tr>
                                <th style="width:12%;">Item Code</th>
                                <th style="width:20%;">Item Name</th>
                                <th style="width:18%;">Description</th>
                                <th style="width:12%;">Location</th>
                                <th style="width:10%;" class="pe-text-center">Min / Max</th>
                                <th style="width:10%;" class="pe-text-end">On-Hand</th>
                                <th style="width:8%;" class="pe-text-center">Unit</th>
                                <th style="width:10%;" class="pe-text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="spTableBody">
                            <tr><td colspan="8" class="pe-text-center pe-text-muted" style="padding:60px;">Loading...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- ITEM MASTER PANE -->
            <div class="tab-pane fade" id="sp-master-pane" role="tabpanel">
                <div class="pe-filter-bar" style="border-bottom: 1px solid var(--pe-border-color); border-radius: 0;">
                    <div class="pe-search">
                        <i class="fas fa-search"></i>
                        <input type="text" id="spMasterSearchInput" placeholder="ค้นหา Item Code, ชื่อ, Supplier..." oninput="SparePartsModule.filterMasterTable()">
                    </div>
                    <div class="pe-filter-spacer"></div>
                    <div class="d-flex gap-2 flex-wrap">
                        <button class="pe-btn pe-btn-primary pe-btn-sm" onclick="SparePartsModule.openItemModal()">
                            <i class="fas fa-plus"></i> Add Item
                        </button>
                        <input type="file" id="spImportFileInput" accept=".xlsx, .xls, .csv" style="display: none;" onchange="SparePartsModule.importMasterExcel(event)">
                        <button class="pe-btn pe-btn-ghost pe-btn-sm" onclick="document.getElementById('spImportFileInput').click()" title="Import Master Data">
                            <i class="fas fa-file-import" style="color:var(--pe-primary);"></i> Import
                        </button>
                        <button class="pe-btn pe-btn-ghost pe-btn-sm" onclick="SparePartsModule.exportMasterExcel()" title="Export Master Data">
                            <i class="fas fa-file-excel" style="color:var(--pe-success);"></i> Export
                        </button>
                    </div>
                </div>
                <div style="overflow-x:auto; max-height:550px;">
                    <table class="pe-table" id="spMasterTable">
                        <thead style="position: sticky; top: 0; z-index: 1; background: var(--pe-bg-secondary);">
                            <tr>
                                <th style="width:12%;">Item Code</th>
                                <th style="width:20%;">Item Name</th>
                                <th style="width:20%;">Description</th>
                                <th style="width:12%;">Supplier</th>
                                <th style="width:10%;" class="pe-text-end">Price (฿)</th>
                                <th style="width:10%;" class="pe-text-center">Min / Max</th>
                                <th style="width:8%;" class="pe-text-center">Status</th>
                                <th style="width:8%;" class="pe-text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="spMasterTableBody">
                            <tr><td colspan="8" class="pe-text-center pe-text-muted" style="padding:60px;">Loading...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- HISTORY LOG PANE -->
            <div class="tab-pane fade" id="sp-history-pane" role="tabpanel">
                <div class="pe-filter-bar" style="border-bottom: 1px solid var(--pe-border-color); border-radius: 0;">
                    <div class="pe-search">
                        <i class="fas fa-search"></i>
                        <input type="text" id="spHistorySearchInput" placeholder="ค้นหา รหัส, ชื่อ, ผู้ทำรายการ..." oninput="SparePartsModule.filterHistoryTable()">
                    </div>
                    <div class="pe-filter-spacer"></div>
                    <div class="d-flex gap-2 flex-wrap">
                        <button class="pe-btn pe-btn-ghost pe-btn-sm" onclick="SparePartsModule.loadHistory()" title="Refresh">
                            <i class="fas fa-sync-alt"></i> Refresh
                        </button>
                    </div>
                </div>
                <div style="overflow-x:auto; max-height:550px;">
                    <table class="pe-table" id="spHistoryTable">
                        <thead style="position: sticky; top: 0; z-index: 1; background: var(--pe-bg-secondary);">
                            <tr>
                                <th style="width: 15%;">Date / Time</th>
                                <th style="width: 10%;">Type</th>
                                <th style="width: 25%;">Item</th>
                                <th style="width: 15%;">Location</th>
                                <th class="pe-text-end" style="width: 10%;">Qty</th>
                                <th style="width: 15%;">User</th>
                                <th style="width: 10%;">Job / Note</th>
                            </tr>
                        </thead>
                        <tbody id="spHistoryTableBody">
                            <tr><td colspan="7" class="pe-text-center pe-text-muted" style="padding:60px;">Loading...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>

        </div> <!-- END TAB CONTENT -->
    </div> <!-- END CARD BODY -->
</div> <!-- END CARD -->

