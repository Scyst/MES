<!-- tab_analytics.php — Analytics Dashboard -->

<!-- Date Filter -->
<div class="pe-filter-bar pe-mb-24">
    <div class="pe-d-flex pe-align-center pe-gap-8">
        <i class="fas fa-chart-line" style="color:var(--pe-primary);font-size:16px;"></i>
        <span class="pe-fw-bold" style="font-size:14px;">Maintenance Analytics</span>
    </div>

    <select class="pe-filter-select" id="analyticsFilterLine" onchange="AnalyticsModule.loadAll()">
        <option value="">ทุก Line</option>
    </select>

    <div class="pe-filter-date">
        <input type="date" id="analyticsStartDate" onchange="AnalyticsModule.loadAll()">
        <span class="separator">—</span>
        <input type="date" id="analyticsEndDate" onchange="AnalyticsModule.loadAll()">
    </div>

    <div class="pe-filter-spacer"></div>

    <!-- Quick Period Chips -->
    <div class="pe-d-flex pe-gap-8 pe-flex-wrap">
        <button class="pe-chip" onclick="AnalyticsModule.setPeriod('today')">Today</button>
        <button class="pe-chip" onclick="AnalyticsModule.setPeriod('week')">This Week</button>
        <button class="pe-chip active" onclick="AnalyticsModule.setPeriod('month')">This Month</button>
        <button class="pe-chip" onclick="AnalyticsModule.setPeriod('quarter')">This Quarter</button>
    </div>
</div>

<!-- KPI Row -->
<div class="pe-kpi-row" id="analyticsKpiRow">
    <div class="pe-kpi-card kpi-primary pe-animate-in">
        <div>
            <div class="pe-kpi-label">MTBF</div>
            <div class="pe-kpi-value" id="kpiMTBF">- <span class="unit">hrs</span></div>
            <div class="pe-kpi-sub">Mean Time Between Failures</div>
        </div>
        <div class="pe-kpi-icon"><i class="fas fa-heartbeat"></i></div>
    </div>
    <div class="pe-kpi-card kpi-warning pe-animate-in">
        <div>
            <div class="pe-kpi-label">MTTR</div>
            <div class="pe-kpi-value" id="kpiMTTR">- <span class="unit">min</span></div>
            <div class="pe-kpi-sub">Mean Time To Repair</div>
        </div>
        <div class="pe-kpi-icon"><i class="fas fa-tools"></i></div>
    </div>
    <div class="pe-kpi-card kpi-success pe-animate-in">
        <div>
            <div class="pe-kpi-label">Availability</div>
            <div class="pe-kpi-value" id="kpiAvailability">- <span class="unit">%</span></div>
            <div class="pe-kpi-sub">Machine Uptime Rate</div>
        </div>
        <div class="pe-kpi-icon"><i class="fas fa-tachometer-alt"></i></div>
    </div>
    <div class="pe-kpi-card kpi-danger pe-animate-in">
        <div>
            <div class="pe-kpi-label">Total Downtime</div>
            <div class="pe-kpi-value" id="kpiAnalyticsDT">- <span class="unit">hrs</span></div>
            <div class="pe-kpi-sub">Period Total</div>
        </div>
        <div class="pe-kpi-icon"><i class="fas fa-clock"></i></div>
    </div>
    <div class="pe-kpi-card kpi-info pe-animate-in">
        <div>
            <div class="pe-kpi-label">Maintenance Cost</div>
            <div class="pe-kpi-value" id="kpiMtCost">฿0</div>
            <div class="pe-kpi-sub">Parts + Labor</div>
        </div>
        <div class="pe-kpi-icon"><i class="fas fa-coins"></i></div>
    </div>
</div>

<!-- Charts Row 1 -->
<div class="pe-analytics-grid-row-1">
    
    <!-- Downtime Trend -->
    <div class="pe-card">
        <div class="pe-card-header">
            <h6><i class="fas fa-chart-area"></i> Downtime Trend</h6>
        </div>
        <div class="pe-card-body">
            <canvas id="chartDowntimeTrend" height="260"></canvas>
        </div>
    </div>

    <!-- Downtime Pareto -->
    <div class="pe-card">
        <div class="pe-card-header">
            <h6><i class="fas fa-chart-bar"></i> Cause Pareto Analysis</h6>
        </div>
        <div class="pe-card-body">
            <canvas id="chartPareto" height="260"></canvas>
        </div>
    </div>
</div>

<!-- Charts Row 2 -->
<div class="pe-analytics-grid-row-2">
    
    <!-- Top Problematic Machines -->
    <div class="pe-card">
        <div class="pe-card-header">
            <h6><i class="fas fa-exclamation-triangle"></i> Top Problematic Machines</h6>
        </div>
        <div class="pe-card-body p-0">
            <div style="overflow-x:auto; max-height:320px;">
                <table class="pe-table" id="topMachineTable">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Machine</th>
                            <th>Line</th>
                            <th class="pe-text-center">Events</th>
                            <th class="pe-text-end">Total (min)</th>
                            <th class="pe-text-end">Avg (min)</th>
                            <th style="width:20%;">Distribution</th>
                        </tr>
                    </thead>
                    <tbody id="topMachineBody">
                        <tr><td colspan="7" class="pe-text-center pe-text-muted" style="padding:40px;">Loading...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>

    <!-- WO Status Distribution -->
    <div class="pe-card">
        <div class="pe-card-header">
            <h6><i class="fas fa-chart-pie"></i> WO Status Distribution</h6>
        </div>
        <div class="pe-card-body pe-d-flex pe-align-center" style="justify-content:center;">
            <canvas id="chartWOStatus" height="250" style="max-width:280px;"></canvas>
        </div>
    </div>
</div>

<!-- Responsive fix for analytics charts -->
<style>
    .pe-analytics-grid-row-1 {
        display: grid; 
        grid-template-columns: 1fr 1fr; 
        gap: 16px; 
        margin-bottom: 16px;
    }
    .pe-analytics-grid-row-2 {
        display: grid; 
        grid-template-columns: 2fr 1fr; 
        gap: 16px; 
        margin-bottom: 16px;
    }
    @media (max-width: 991px) {
        .pe-analytics-grid-row-1, .pe-analytics-grid-row-2 {
            grid-template-columns: 1fr;
        }
    }
</style>
