<style>
    /* Premium Safety Dashboard UI */
    .safety-kpi-card {
        background: #fff;
        border-radius: 16px;
        padding: 24px;
        border: 1px solid #f1f5f9;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.02);
        display: flex;
        align-items: center;
        justify-content: space-between;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    .safety-kpi-card:hover {
        transform: translateY(-3px);
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05);
    }
    .safety-kpi-info h6 {
        color: #64748b;
        font-size: 0.9rem;
        font-weight: 600;
        margin-bottom: 8px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }
    .safety-kpi-info h2 {
        color: #0f172a;
        font-size: 2.2rem;
        font-weight: 800;
        margin: 0;
        line-height: 1;
    }
    .safety-kpi-icon {
        width: 60px;
        height: 60px;
        border-radius: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.8rem;
    }
    .kpi-blue .safety-kpi-icon { background: #eff6ff; color: #3b82f6; }
    .kpi-green .safety-kpi-icon { background: #f0fdf4; color: #22c55e; }
    .kpi-red .safety-kpi-icon { background: #fef2f2; color: #ef4444; }
    .kpi-orange .safety-kpi-icon { background: #fff7ed; color: #f97316; }
    
    .safety-panel {
        background: #fff;
        border-radius: 16px;
        border: 1px solid #e2e8f0;
        box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02);
        height: 100%;
        display: flex;
        flex-direction: column;
        overflow: hidden;
    }
    .safety-panel-header {
        padding: 20px 24px;
        border-bottom: 1px solid #f1f5f9;
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: #fafaf9;
    }
    .safety-panel-title {
        font-size: 1.15rem;
        font-weight: 700;
        color: #1e293b;
        margin: 0;
        display: flex;
        align-items: center;
        gap: 10px;
    }
    .safety-panel-body {
        padding: 24px;
        flex: 1;
        overflow-y: auto;
    }
    
    /* Elegant Tabs */
    .safety-tabs {
        background: #f1f5f9;
        padding: 5px;
        border-radius: 12px;
        display: inline-flex;
        gap: 5px;
    }
    .safety-tabs .nav-link {
        border-radius: 8px;
        color: #64748b;
        font-weight: 600;
        padding: 8px 20px;
        border: none;
        transition: all 0.2s;
    }
    .safety-tabs .nav-link:hover {
        color: #334155;
    }
    .safety-tabs .nav-link.active {
        background: #fff;
        color: #0f172a;
        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }
</style>

<!-- Modern KPIs -->
<div class="row g-4 mb-4" id="safetyKpiRow">
    <div class="col-md-6 col-xl-3 pe-animate-in" style="--delay: 0.1s">
        <div class="safety-kpi-card kpi-blue">
            <div class="safety-kpi-info">
                <h6>Pre-Op Audits (Today)</h6>
                <h2 id="kpiPreOpTotal">0</h2>
            </div>
            <div class="safety-kpi-icon"><i class="fas fa-clipboard-check"></i></div>
        </div>
    </div>
    <div class="col-md-6 col-xl-3 pe-animate-in" style="--delay: 0.2s">
        <div class="safety-kpi-card kpi-green">
            <div class="safety-kpi-info">
                <h6>Compliance Rate</h6>
                <h2><span id="kpiPreOpCompliance">0</span><span style="font-size:1.2rem">%</span></h2>
            </div>
            <div class="safety-kpi-icon"><i class="fas fa-shield-alt"></i></div>
        </div>
    </div>
    <div class="col-md-6 col-xl-3 pe-animate-in" style="--delay: 0.3s">
        <div class="safety-kpi-card kpi-red">
            <div class="safety-kpi-info">
                <h6>Active Hazards</h6>
                <h2 id="kpiActiveHazards">0</h2>
            </div>
            <div class="safety-kpi-icon"><i class="fas fa-exclamation-triangle"></i></div>
        </div>
    </div>
    <div class="col-md-6 col-xl-3 pe-animate-in" style="--delay: 0.4s">
        <div class="safety-kpi-card kpi-orange">
            <div class="safety-kpi-info">
                <h6>Avg Response Time</h6>
                <h2><span id="kpiResponseTime">--</span><span style="font-size:1.2rem">m</span></h2>
            </div>
            <div class="safety-kpi-icon"><i class="fas fa-stopwatch"></i></div>
        </div>
    </div>
</div>

<!-- Main Panels -->
<div class="row g-4 h-100 pb-4">
    <!-- Data Table Column -->
    <div class="col-lg-8 pe-animate-in" style="--delay: 0.5s">
        <div class="safety-panel">
            <div class="safety-panel-header">
                <ul class="nav nav-pills safety-tabs" id="safetyTabs" role="tablist">
                    <li class="nav-item" role="presentation">
                        <button class="nav-link active" id="hazard-tab" data-bs-toggle="pill" data-bs-target="#hazard-panel" type="button" role="tab">
                            <i class="fas fa-exclamation-triangle me-1 text-danger"></i> Hazard Reports
                        </button>
                    </li>
                    <li class="nav-item" role="presentation">
                        <button class="nav-link" id="preop-tab" data-bs-toggle="pill" data-bs-target="#preop-panel" type="button" role="tab" onclick="SafetyModule.loadPreOpData()">
                            <i class="fas fa-clipboard-list me-1 text-primary"></i> Pre-Op Audits
                        </button>
                    </li>
                </ul>
                <div class="d-flex align-items-center gap-2">
                    <button class="btn btn-sm btn-outline-secondary rounded-pill px-3 fw-bold" onclick="SafetyModule.openChecklistConfig()" title="Manage Checklists">
                        <i class="fas fa-cog me-1"></i> Config
                    </button>
                    <button class="btn btn-sm btn-light rounded-circle" style="width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;" onclick="SafetyModule.loadData()" title="Refresh">
                        <i class="fas fa-sync-alt"></i>
                    </button>
                </div>
            </div>
            <div class="safety-panel-body p-0">
                <div class="tab-content h-100" id="safetyTabsContent">
                    
                    <!-- Hazard Reports Panel -->
                    <div class="tab-pane fade show active h-100 d-flex flex-column" id="hazard-panel" role="tabpanel">
                        <div class="p-3 bg-white border-bottom d-flex justify-content-between align-items-center">
                            <div class="input-group input-group-sm" style="max-width: 250px;">
                                <span class="input-group-text bg-white border-end-0 text-muted"><i class="fas fa-search"></i></span>
                                <input type="text" class="form-control border-start-0 ps-0" id="safetySearchInput" placeholder="ค้นหา Machine, Issue..." oninput="SafetyModule.filterTable()">
                            </div>
                            <select class="form-select form-select-sm w-auto fw-bold text-secondary border-0 bg-light rounded-pill px-3" id="safetyStatusFilter" onchange="SafetyModule.loadData()">
                                <option value="all">All Status</option>
                                <option value="Pending" selected>🚨 Pending</option>
                                <option value="In Progress">⏳ In Progress</option>
                                <option value="Completed">✅ Resolved</option>
                            </select>
                        </div>
                        <div class="table-responsive flex-grow-1">
                            <table class="table table-hover align-middle mb-0" id="safetyTable">
                                <thead class="table-light text-secondary" style="position: sticky; top: 0; z-index: 1;">
                                    <tr>
                                        <th class="ps-4">Issue</th>
                                        <th>Machine</th>
                                        <th>Priority</th>
                                        <th>Status</th>
                                        <th>Reported</th>
                                        <th class="text-end pe-4">Action</th>
                                    </tr>
                                </thead>
                                <tbody id="safetyTableBody">
                                    <!-- Dynamic Data -->
                                </tbody>
                            </table>
                        </div>
                    </div>
                    
                    <!-- Pre-Op Audits Panel -->
                    <div class="tab-pane fade h-100 d-flex flex-column" id="preop-panel" role="tabpanel">
                        <div class="table-responsive flex-grow-1">
                            <table class="table table-hover align-middle mb-0" id="preopTable">
                                <thead class="table-light text-secondary" style="position: sticky; top: 0; z-index: 1;">
                                    <tr>
                                        <th class="ps-4">Audit ID</th>
                                        <th>Machine</th>
                                        <th>Shift</th>
                                        <th>Auditor</th>
                                        <th>Result</th>
                                        <th class="text-end pe-4">Timestamp</th>
                                    </tr>
                                </thead>
                                <tbody id="preopTableBody">
                                    <!-- Dynamic Data -->
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Charts Column -->
    <div class="col-lg-4 pe-animate-in" style="--delay: 0.6s">
        <!-- Compliance Chart -->
        <div class="safety-panel mb-4" style="height: calc(50% - 12px);">
            <div class="safety-panel-header">
                <h3 class="safety-panel-title"><i class="fas fa-chart-pie text-primary"></i> Pre-Op Compliance</h3>
            </div>
            <div class="safety-panel-body d-flex align-items-center justify-content-center">
                <canvas id="preopComplianceChart" style="max-height: 100%;"></canvas>
            </div>
        </div>
        
        <!-- Hazard Trend Chart -->
        <div class="safety-panel" style="height: calc(50% - 12px);">
            <div class="safety-panel-header">
                <h3 class="safety-panel-title"><i class="fas fa-chart-line text-warning"></i> Hazard Trend (30 Days)</h3>
            </div>
            <div class="safety-panel-body d-flex align-items-center justify-content-center">
                <canvas id="hazardTrendChart" style="max-height: 100%;"></canvas>
            </div>
        </div>
    </div>
</div>

<!-- Includes -->
<?php include 'modals/safety_modals.php'; ?>
