<style>
    #panel-safety.active {
        display: flex;
        flex-direction: column;
        height: calc(100vh - var(--pe-header-height) - 50px);
    }
    #panel-safety > .row {
        flex: 1;
        min-height: 0;
    }
</style>
<!-- tab_safety.php — Safety & Hazard Management -->

<!-- KPIs -->
<div class="pe-kpi-row" id="safetyKpiRow">
    <div class="pe-kpi-card kpi-primary pe-animate-in" style="--delay: 0.1s">
        <div>
            <div class="pe-kpi-label">Pre-Op Audits (Today)</div>
            <div class="pe-kpi-value" id="kpiPreOpTotal">0</div>
        </div>
        <div class="pe-kpi-icon"><i class="fas fa-clipboard-check"></i></div>
    </div>
    <div class="pe-kpi-card kpi-success pe-animate-in" style="--delay: 0.2s">
        <div>
            <div class="pe-kpi-label">Compliance Rate</div>
            <div class="pe-kpi-value"><span id="kpiPreOpCompliance">0</span><span class="unit">%</span></div>
        </div>
        <div class="pe-kpi-icon"><i class="fas fa-shield-alt"></i></div>
    </div>
    <div class="pe-kpi-card kpi-danger pe-animate-in" style="--delay: 0.3s">
        <div>
            <div class="pe-kpi-label">Active Hazards</div>
            <div class="pe-kpi-value" id="kpiActiveHazards">0</div>
        </div>
        <div class="pe-kpi-icon"><i class="fas fa-exclamation-triangle"></i></div>
    </div>
    <div class="pe-kpi-card kpi-warning pe-animate-in" style="--delay: 0.4s">
        <div>
            <div class="pe-kpi-label">Avg Response Time</div>
            <div class="pe-kpi-value"><span id="kpiResponseTime">--</span><span class="unit">m</span></div>
        </div>
        <div class="pe-kpi-icon"><i class="fas fa-stopwatch"></i></div>
    </div>
</div>

<!-- Main Grid Layout -->
<div class="row g-4">
    <!-- Left Column (Tabs & Data) -->
    <div class="col-lg-8 pe-animate-in" style="--delay: 0.5s">
        <div class="pe-card h-100">
            <div class="pe-card-header d-flex justify-content-between align-items-center">
                <ul class="nav nav-pills pe-nav-pills" id="safetyTabs" role="tablist">
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
                <div class="d-flex align-items-center">
                    <button class="pe-btn pe-btn-ghost pe-btn-sm me-2" onclick="SafetyModule.openChecklistConfig()" title="Manage Checklists">
                        <i class="fas fa-cog"></i>
                    </button>
                    <button class="pe-btn pe-btn-ghost pe-btn-sm" onclick="SafetyModule.loadData()" title="Refresh">
                        <i class="fas fa-sync-alt"></i>
                    </button>
                </div>
            </div>
            <div class="pe-card-body p-0">
                <div class="tab-content h-100" id="safetyTabsContent">
                    
                    <!-- Hazard Reports Panel -->
                    <div class="tab-pane fade show active h-100 d-flex flex-column" id="hazard-panel" role="tabpanel">
                        <div class="pe-filter-bar d-flex justify-content-between align-items-center p-3 border-bottom">
                            <div class="pe-search" style="max-width: 250px;">
                                <i class="fas fa-search"></i>
                                <input type="text" id="safetySearchInput" placeholder="ค้นหา Machine, Issue..." oninput="SafetyModule.filterTable()" autocomplete="off">
                            </div>
                            <select class="form-select form-select-sm w-auto" id="safetyStatusFilter" onchange="SafetyModule.loadData()">
                                <option value="all">All Status</option>
                                <option value="Pending" selected>Pending</option>
                                <option value="In Progress">In Progress</option>
                                <option value="Completed">Resolved</option>
                            </select>
                        </div>
                        <div class="table-responsive flex-grow-1" style="max-height: 400px; overflow-y: auto;">
                            <table class="pe-table mb-0" id="safetyTable">
                                <thead style="position: sticky; top: 0; z-index: 1; background: #f8fafc;">
                                    <tr>
                                        <th>Issue</th>
                                        <th>Machine</th>
                                        <th>Priority</th>
                                        <th>Status</th>
                                        <th>Reported</th>
                                        <th class="text-end">Action</th>
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
                        <div class="table-responsive flex-grow-1" style="max-height: 450px; overflow-y: auto;">
                            <table class="pe-table mb-0" id="preopTable">
                                <thead style="position: sticky; top: 0; z-index: 1; background: #f8fafc;">
                                    <tr>
                                        <th>Audit ID</th>
                                        <th>Machine</th>
                                        <th>Shift</th>
                                        <th>Auditor</th>
                                        <th>Result</th>
                                        <th class="text-end">Timestamp</th>
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
    <div class="col-lg-4 pe-animate-in d-flex flex-column" style="--delay: 0.6s">
        <!-- Compliance Chart -->
        <div class="pe-card mb-3" style="flex: 1; display: flex; flex-direction: column;">
            <div class="pe-card-header">
                <h6><i class="fas fa-chart-pie me-2 text-primary"></i>Pre-Op Compliance</h6>
            </div>
            <div class="pe-card-body d-flex align-items-center justify-content-center" style="flex: 1; min-height: 0;">
                <canvas id="preopComplianceChart"></canvas>
            </div>
        </div>
        
        <!-- Hazard Trend Chart -->
        <div class="pe-card" style="flex: 1; display: flex; flex-direction: column;">
            <div class="pe-card-header">
                <h6><i class="fas fa-chart-line me-2 text-warning"></i>Hazard Trend (30 Days)</h6>
            </div>
            <div class="pe-card-body d-flex align-items-center justify-content-center" style="flex: 1; min-height: 0;">
                <canvas id="hazardTrendChart"></canvas>
            </div>
        </div>
    </div>
</div>

<!-- Includes -->
<?php 
// Modals are already included in peDashboard.php
?>




