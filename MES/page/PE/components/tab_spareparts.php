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

<!-- Filter Bar -->
<div class="pe-filter-bar">
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

<!-- Stock Table -->
<div class="pe-card">
    <div class="pe-card-header">
        <h6><i class="fas fa-list-alt"></i> Stock On-Hand</h6>
        <span class="pe-text-xs pe-text-muted">Last update: <span id="spLastSync">-</span></span>
    </div>
    <div class="pe-card-body p-0">
        <div style="overflow-x:auto; max-height:550px;">
            <table class="pe-table" id="spTable">
                <thead>
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
</div>
