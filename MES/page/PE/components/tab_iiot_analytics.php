<!-- tab_iiot_analytics.php — IIoT Historical Analytics -->

<!-- Date Filter -->
<div class="pe-filter-bar pe-mb-24">
    <div class="pe-d-flex pe-align-center pe-gap-8">
        <i class="fas fa-history" style="color:var(--pe-primary);font-size:16px;"></i>
        <span class="pe-fw-bold" style="font-size:14px;">IIoT Historical Analytics</span>
    </div>

    <select class="pe-filter-select" id="iiotAnalyticsFilterLine" onchange="IIoTAnalyticsModule.onLineChange()">
        <option value="">All Lines</option>
    </select>

    <select class="pe-filter-select" id="iiotAnalyticsFilterMachine" onchange="IIoTAnalyticsModule.fetchData()">
        <option value="">All Machines</option>
    </select>

    <div class="pe-filter-date">
        <input type="date" id="iiotAnalyticsStartDate" onchange="IIoTAnalyticsModule.fetchData()">
        <span class="separator">—</span>
        <input type="date" id="iiotAnalyticsEndDate" onchange="IIoTAnalyticsModule.fetchData()">
    </div>

    <div class="pe-filter-spacer"></div>

    <!-- Quick Period Chips -->
    <div class="pe-d-flex pe-gap-8 pe-flex-wrap">
        <button class="pe-chip" onclick="IIoTAnalyticsModule.setPeriod('yesterday')">Yesterday</button>
        <button class="pe-chip active" onclick="IIoTAnalyticsModule.setPeriod('week')">Last 7 Days</button>
        <button class="pe-chip" onclick="IIoTAnalyticsModule.setPeriod('month')">This Month</button>
        <button class="pe-chip" onclick="IIoTAnalyticsModule.setPeriod('last_month')">Last Month</button>
        <button class="pe-btn pe-btn-ghost pe-btn-sm ms-2" onclick="window.print()" title="Export PDF / Print" style="border-color:var(--pe-text-muted); color:var(--pe-text-primary);">
            <i class="fas fa-print me-1"></i> Report
        </button>
    </div>
</div>

<!-- KPI Row -->
<div class="pe-kpi-row" id="iiotAnalyticsKpiRow">
    <div class="pe-kpi-card kpi-primary pe-animate-in">
        <div>
            <div class="pe-kpi-label">Average OEE</div>
            <div class="pe-kpi-value" id="kpiAvgOee">- <span class="unit">%</span></div>
            <div class="pe-kpi-sub">Overall Equipment Effectiveness</div>
        </div>
        <div class="pe-kpi-icon"><i class="fas fa-industry"></i></div>
    </div>
    <div class="pe-kpi-card kpi-success pe-animate-in">
        <div>
            <div class="pe-kpi-label">Availability</div>
            <div class="pe-kpi-value" id="kpiAvgAvailability">- <span class="unit">%</span></div>
            <div class="pe-kpi-sub">Operating Time / Planned Time</div>
        </div>
        <div class="pe-kpi-icon"><i class="fas fa-play-circle"></i></div>
    </div>
    <div class="pe-kpi-card kpi-warning pe-animate-in">
        <div>
            <div class="pe-kpi-label">Performance</div>
            <div class="pe-kpi-value" id="kpiAvgPerformance">- <span class="unit">%</span></div>
            <div class="pe-kpi-sub">Actual Speed / Design Speed</div>
        </div>
        <div class="pe-kpi-icon"><i class="fas fa-tachometer-alt"></i></div>
    </div>
    <div class="pe-kpi-card kpi-info pe-animate-in">
        <div>
            <div class="pe-kpi-label">Quality</div>
            <div class="pe-kpi-value" id="kpiAvgQuality">- <span class="unit">%</span></div>
            <div class="pe-kpi-sub">Good Strokes / Total Strokes</div>
        </div>
        <div class="pe-kpi-icon"><i class="fas fa-check-circle"></i></div>
    </div>
    <div class="pe-kpi-card kpi-primary pe-animate-in">
        <div>
            <div class="pe-kpi-label">Total Machine Strokes</div>
            <div class="pe-kpi-value" id="kpiTotalOutput">- <span class="unit">strokes</span></div>
            <div class="pe-kpi-sub" id="kpiDefectsSub">0 Defects</div>
        </div>
        <div class="pe-kpi-icon"><i class="fas fa-boxes"></i></div>
    </div>
</div>

<!-- Charts Row 1 -->
<div class="pe-analytics-grid-row-1">
    <!-- OEE Trend -->
    <div class="pe-card">
        <div class="pe-card-header">
            <h6><i class="fas fa-chart-line"></i> Historical OEE Trend</h6>
        </div>
        <div class="pe-card-body">
            <canvas id="chartOeeTrend" height="260"></canvas>
        </div>
    </div>

    <!-- Output Trend -->
    <div class="pe-card">
        <div class="pe-card-header">
            <h6><i class="fas fa-chart-bar"></i> Machine Strokes vs Defects</h6>
        </div>
        <div class="pe-card-body">
            <canvas id="chartOutputTrend" height="260"></canvas>
        </div>
    </div>
</div>

<!-- Row 2: Summary Table -->
<div class="pe-analytics-grid-row-3">
    <!-- Machine Performance -->
    <div class="pe-card">
        <div class="pe-card-header">
            <h6><i class="fas fa-server"></i> Machine Performance Summary</h6>
        </div>
        <div class="pe-card-body p-0">
            <div style="overflow-x:auto; max-height:400px;">
                <table class="pe-table" id="iiotMachineSummaryTable">
                    <thead>
                        <tr>
                            <th>Machine</th>
                            <th class="pe-text-end">Online Time (hrs)</th>
                            <th class="pe-text-end">Offline Time (hrs)</th>
                            <th class="pe-text-end">Total Output</th>
                            <th class="pe-text-end">Defects</th>
                            <th class="pe-text-end">Availability</th>
                            <th class="pe-text-end">Performance</th>
                            <th class="pe-text-end">Quality</th>
                            <th class="pe-text-end">OEE</th>
                        </tr>
                    </thead>
                    <tbody id="iiotMachineSummaryBody">
                        <tr><td colspan="9" class="pe-text-center pe-text-muted" style="padding:40px;">Loading...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</div>
