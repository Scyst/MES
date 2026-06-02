<!-- tab_downtime.php — Downtime Tracker -->

<!-- KPI Row -->
<div class="pe-kpi-row" id="dtKpiRow">
    <div class="pe-kpi-card kpi-danger pe-animate-in">
        <div>
            <div class="pe-kpi-label">Total Downtime</div>
            <div class="pe-kpi-value" id="kpiTotalDowntime">0 <span class="unit">min</span></div>
        </div>
        <div class="pe-kpi-icon"><i class="fas fa-clock"></i></div>
    </div>
    <div class="pe-kpi-card kpi-primary pe-animate-in">
        <div>
            <div class="pe-kpi-label">Events</div>
            <div class="pe-kpi-value" id="kpiDtEvents">0</div>
        </div>
        <div class="pe-kpi-icon"><i class="fas fa-exclamation-triangle"></i></div>
    </div>
    <div class="pe-kpi-card kpi-warning pe-animate-in">
        <div>
            <div class="pe-kpi-label">Avg Duration</div>
            <div class="pe-kpi-value" id="kpiAvgDuration">0 <span class="unit">min</span></div>
        </div>
        <div class="pe-kpi-icon"><i class="fas fa-hourglass-half"></i></div>
    </div>
    <div class="pe-kpi-card kpi-info pe-animate-in">
        <div>
            <div class="pe-kpi-label">Top Cause</div>
            <div class="pe-kpi-value pe-text-sm pe-fw-bold" id="kpiTopCause" style="font-size:16px;">-</div>
        </div>
        <div class="pe-kpi-icon"><i class="fas fa-chart-bar"></i></div>
    </div>
</div>

<!-- Filter Bar -->
<div class="pe-filter-bar">
    <div class="pe-search">
        <i class="fas fa-search"></i>
        <input type="text" id="dtSearchInput" placeholder="ค้นหา Machine, Cause, Note..." oninput="DowntimeModule.filterTable()">
    </div>
    <select class="pe-filter-select" id="dtFilterLine" onchange="DowntimeModule.loadData()">
        <option value="">ทุก Line</option>
    </select>
    <select class="pe-filter-select" id="dtFilterCause" onchange="DowntimeModule.loadData()">
        <option value="">ทุกสาเหตุ</option>
        <option value="Mechanical">Mechanical</option>
        <option value="Electrical">Electrical</option>
        <option value="Tooling">Tooling</option>
        <option value="Quality">Quality</option>
        <option value="Material">Material</option>
        <option value="Operator">Operator</option>
        <option value="Other">Other</option>
    </select>
    <div class="pe-filter-date">
        <input type="date" id="dtStartDate" onchange="DowntimeModule.loadData()">
        <span class="separator">—</span>
        <input type="date" id="dtEndDate" onchange="DowntimeModule.loadData()">
    </div>

    <div class="pe-filter-spacer"></div>

    <button class="pe-btn pe-btn-ghost pe-btn-sm" onclick="DowntimeModule.exportExcel()" title="Export Excel">
        <i class="fas fa-file-excel"></i>
    </button>

    <button class="pe-btn pe-btn-primary" onclick="DowntimeModule.openModal()">
        <i class="fas fa-plus"></i> Record Downtime
    </button>
</div>

<!-- Summary by Line -->
<div class="pe-card pe-mb-16" id="dtSummaryCard">
    <div class="pe-card-body" style="padding:12px 20px;">
        <div id="dtLineSummary" class="pe-text-sm pe-text-muted">Loading summary...</div>
    </div>
</div>

<!-- Table -->
<div class="pe-card">
    <div class="pe-card-header">
        <h6><i class="fas fa-history"></i> Downtime History</h6>
        <span class="pe-text-xs pe-text-muted">Showing <span id="dtShowing">0</span> records</span>
    </div>
    <div class="pe-card-body p-0">
        <div style="overflow-x:auto; max-height:500px;">
            <table class="pe-table" id="dtTable">
                <thead>
                    <tr>
                        <th style="width:10%;">Date</th>
                        <th style="width:8%;">Start</th>
                        <th style="width:8%;">End</th>
                        <th style="width:8%;">Duration</th>
                        <th style="width:7%;">Line</th>
                        <th style="width:14%;">Machine</th>
                        <th style="width:10%;">Category</th>
                        <th style="width:15%;">Cause Detail</th>
                        <th style="width:10%;">Recovered By</th>
                        <th style="width:7%;" class="pe-text-center">Actions</th>
                    </tr>
                </thead>
                <tbody id="dtTableBody">
                    <tr><td colspan="10" class="pe-text-center pe-text-muted" style="padding:60px;">Loading...</td></tr>
                </tbody>
            </table>
        </div>
    </div>
    <div class="pe-card-footer pe-d-flex pe-justify-between pe-align-center">
        <div class="pe-text-xs pe-text-muted" id="dtPaginationInfo"></div>
        <div id="dtPagination"></div>
    </div>
</div>
