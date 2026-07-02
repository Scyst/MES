<!-- tab_iiot_traditional.php — Traditional KPI Dashboard -->

<div class="pe-d-flex pe-justify-between pe-align-center pe-mb-16">
    <div class="pe-d-flex pe-align-center pe-gap-8">
        <i class="fas fa-industry" style="color:var(--pe-primary);font-size:20px;"></i>
        <h4 class="pe-m-0">Machine Assets Overview</h4>
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
    <div class="pe-kpi-card kpi-primary pe-animate-in">
        <div>
            <div class="pe-kpi-label">Total Machines</div>
            <div class="pe-kpi-value" id="kpiTradTotal">- <span class="unit">units</span></div>
            <div class="pe-kpi-sub">All registered assets</div>
        </div>
        <div class="pe-kpi-icon"><i class="fas fa-server"></i></div>
    </div>
    <div class="pe-kpi-card kpi-success pe-animate-in">
        <div>
            <div class="pe-kpi-label">Active Machines</div>
            <div class="pe-kpi-value" id="kpiTradActive">- <span class="unit">units</span></div>
            <div class="pe-kpi-sub">Currently running</div>
        </div>
        <div class="pe-kpi-icon"><i class="fas fa-check-circle"></i></div>
    </div>
    <div class="pe-kpi-card kpi-danger pe-animate-in">
        <div>
            <div class="pe-kpi-label">Under Repair</div>
            <div class="pe-kpi-value" id="kpiTradRepair">- <span class="unit">units</span></div>
            <div class="pe-kpi-sub">Requires maintenance</div>
        </div>
        <div class="pe-kpi-icon"><i class="fas fa-tools"></i></div>
    </div>
    <div class="pe-kpi-card kpi-info pe-animate-in">
        <div>
            <div class="pe-kpi-label">IIoT Connected</div>
            <div class="pe-kpi-value" id="kpiTradConnected">- <span class="unit">units</span></div>
            <div class="pe-kpi-sub">With active MQTT topics</div>
        </div>
        <div class="pe-kpi-icon"><i class="fas fa-wifi"></i></div>
    </div>
    <div class="pe-kpi-card kpi-warning pe-animate-in">
        <div>
            <div class="pe-kpi-label">Total Lines</div>
            <div class="pe-kpi-value" id="kpiTradLines">- <span class="unit">lines</span></div>
            <div class="pe-kpi-sub">Unique production lines</div>
        </div>
        <div class="pe-kpi-icon"><i class="fas fa-stream"></i></div>
    </div>
    <div class="pe-kpi-card kpi-secondary pe-animate-in">
        <div>
            <div class="pe-kpi-label">Total Areas</div>
            <div class="pe-kpi-value" id="kpiTradAreas">- <span class="unit">areas</span></div>
            <div class="pe-kpi-sub">Unique factory zones</div>
        </div>
        <div class="pe-kpi-icon"><i class="fas fa-map-marked-alt"></i></div>
    </div>
</div>

<!-- Charts Row 1 -->
<div class="pe-analytics-grid-row-2 pe-d-flex" style="margin-top: 16px; flex-wrap: wrap; gap: 16px;">
    <!-- Asset Health by Line Chart -->
    <div class="pe-card pe-animate-in" style="flex: 2; min-width: 300px;">
        <div class="pe-card-header" style="padding-bottom: 5px;">
            <h5 class="pe-m-0"><i class="fas fa-heartbeat pe-text-muted pe-me-2"></i> Asset Health by Line</h5>
        </div>
        <div class="pe-card-body" style="padding-top: 0;">
            <div style="height: 390px;">
                <canvas id="chartTradHourlyProduction"></canvas>
            </div>
        </div>
    </div>

    <!-- Machine Status Distribution -->
    <div class="pe-card pe-animate-in" style="flex: 1; min-width: 300px;">
        <div class="pe-card-header" style="padding-bottom: 5px;">
            <h5 class="pe-m-0"><i class="fas fa-chart-pie pe-text-muted pe-me-2"></i> Machine Status</h5>
        </div>
        <div class="pe-card-body pe-d-flex pe-flex-column pe-align-center pe-justify-center" style="padding-top: 0;">
            <div style="width: 100%; height: 390px; position: relative;">
                <canvas id="chartTradMachineStatus"></canvas>
            </div>
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
                        <th style="width:15%">MACHINE CODE</th>
                        <th style="width:20%">MACHINE NAME</th>
                        <th style="width:10%">LINE</th>
                        <th style="width:15%">TYPE</th>
                        <th style="width:15%">MANUFACTURER</th>
                        <th class="pe-text-center" style="width:10%">STATUS</th>
                        <th class="pe-text-center" style="width:15%">IIoT TOPIC</th>
                    </tr>
                </thead>
                <tbody id="tradMachineBody">
                    <tr><td colspan="7" class="pe-text-center pe-text-muted" style="padding:40px;">Loading data...</td></tr>
                </tbody>
            </table>
        </div>
    </div>
</div>
