<!-- tab_iiot_traditional.php — Traditional KPI Dashboard -->

<div class="pe-d-flex pe-justify-between pe-align-center pe-mb-16">
    <div class="pe-d-flex pe-align-center pe-gap-8">
        <i class="fas fa-chart-line" style="color:var(--pe-primary);font-size:20px;"></i>
        <h4 class="pe-m-0">Production OEE Overview (Traditional)</h4>
    </div>
    <div class="pe-d-flex pe-gap-8">
        <span class="pe-badge pe-badge-success pe-d-flex pe-align-center pe-gap-4">
            <span class="status-indicator blinking" style="background-color: #fff;"></span> LIVE
        </span>
        <button class="pe-btn pe-btn-primary pe-btn-sm" onclick="iiotTraditionalModule.refreshData()">
            <i class="fas fa-sync-alt me-1"></i> Refresh
        </button>
    </div>
</div>

<!-- KPI Row -->
<div class="pe-kpi-row" id="iiotTraditionalKpiRow" style="grid-template-columns: repeat(6, 1fr);">
    <div class="pe-kpi-card kpi-success pe-animate-in">
        <div>
            <div class="pe-kpi-label">Avg OEE</div>
            <div class="pe-kpi-value" id="kpiTradOEE">- <span class="unit">%</span></div>
            <div class="pe-kpi-sub">Overall Equipment Effectiveness</div>
        </div>
        <div class="pe-kpi-icon"><i class="fas fa-chart-pie"></i></div>
    </div>
    <div class="pe-kpi-card kpi-info pe-animate-in">
        <div>
            <div class="pe-kpi-label">Availability</div>
            <div class="pe-kpi-value" id="kpiTradAvail">- <span class="unit">%</span></div>
            <div class="pe-kpi-sub">Uptime vs Planned</div>
        </div>
        <div class="pe-kpi-icon"><i class="fas fa-power-off"></i></div>
    </div>
    <div class="pe-kpi-card kpi-warning pe-animate-in">
        <div>
            <div class="pe-kpi-label">Performance</div>
            <div class="pe-kpi-value" id="kpiTradPerf">- <span class="unit">%</span></div>
            <div class="pe-kpi-sub">Speed vs Standard</div>
        </div>
        <div class="pe-kpi-icon"><i class="fas fa-tachometer-alt"></i></div>
    </div>
    <div class="pe-kpi-card kpi-primary pe-animate-in">
        <div>
            <div class="pe-kpi-label">Quality</div>
            <div class="pe-kpi-value" id="kpiTradQual">- <span class="unit">%</span></div>
            <div class="pe-kpi-sub">Good vs Total Parts</div>
        </div>
        <div class="pe-kpi-icon"><i class="fas fa-check-circle"></i></div>
    </div>
    <div class="pe-kpi-card kpi-success pe-animate-in">
        <div>
            <div class="pe-kpi-label">Total Output</div>
            <div class="pe-kpi-value" id="kpiTradOutput">- <span class="unit">pcs</span></div>
            <div class="pe-kpi-sub">Total Good Parts</div>
        </div>
        <div class="pe-kpi-icon"><i class="fas fa-boxes"></i></div>
    </div>
    <div class="pe-kpi-card kpi-danger pe-animate-in">
        <div>
            <div class="pe-kpi-label">Total Defects</div>
            <div class="pe-kpi-value" id="kpiTradDefects">- <span class="unit">pcs</span></div>
            <div class="pe-kpi-sub">Total NG Parts</div>
        </div>
        <div class="pe-kpi-icon"><i class="fas fa-times-circle"></i></div>
    </div>
</div>

<!-- Charts Row 1 -->
<div class="pe-analytics-grid-row-2" style="margin-top: 16px;">
    <!-- Hourly Production Trend -->
    <div class="pe-card">
        <div class="pe-card-header">
            <h6><i class="fas fa-chart-bar"></i> Hourly Production (Output vs Target)</h6>
        </div>
        <div class="pe-card-body">
            <canvas id="chartTradHourlyProduction" height="280"></canvas>
        </div>
    </div>

    <!-- Machine Status Distribution -->
    <div class="pe-card">
        <div class="pe-card-header">
            <h6><i class="fas fa-chart-pie"></i> Machine Status</h6>
        </div>
        <div class="pe-card-body pe-d-flex pe-align-center" style="justify-content:center;">
            <canvas id="chartTradMachineStatus" height="250" style="max-width:280px;"></canvas>
        </div>
    </div>
</div>

<!-- Table Row 2 -->
<div class="pe-card" style="margin-top: 16px;">
    <div class="pe-card-header pe-d-flex pe-justify-between pe-align-center">
        <h6><i class="fas fa-list"></i> Real-time Machine Analytics</h6>
        <div class="pe-d-flex pe-gap-8">
            <input type="text" id="tradMachineSearch" class="pe-form-control pe-form-control-sm" placeholder="Search machine..." onkeyup="iiotTraditionalModule.filterTable()">
        </div>
    </div>
    <div class="pe-card-body p-0">
        <div style="overflow-x:auto; max-height:400px;">
            <table class="pe-table" id="tradMachineTable">
                <thead>
                    <tr>
                        <th>Machine Code</th>
                        <th>Machine Name</th>
                        <th class="pe-text-center">Status</th>
                        <th class="pe-text-end">OEE (%)</th>
                        <th class="pe-text-end">Good (pcs)</th>
                        <th class="pe-text-end">NG (pcs)</th>
                        <th class="pe-text-end">Temp (°C)</th>
                    </tr>
                </thead>
                <tbody id="tradMachineBody">
                    <tr><td colspan="7" class="pe-text-center pe-text-muted" style="padding:40px;">Loading data...</td></tr>
                </tbody>
            </table>
        </div>
    </div>
</div>
