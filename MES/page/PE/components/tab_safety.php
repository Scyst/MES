<!-- tab_safety.php — Safety & Hazard Management -->

<!-- KPIs -->
<div class="pe-kpi-row" id="safetyKpiRow">
    <div class="pe-kpi-card kpi-primary pe-animate-in">
        <div>
            <div class="pe-kpi-label">Pre-Op Audits (Today)</div>
            <div class="pe-kpi-value" id="kpiPreOpTotal">0</div>
        </div>
        <div class="pe-kpi-icon"><i class="fas fa-clipboard-check"></i></div>
    </div>
    <div class="pe-kpi-card kpi-success pe-animate-in">
        <div>
            <div class="pe-kpi-label">Compliance Rate</div>
            <div class="pe-kpi-value"><span id="kpiPreOpCompliance">0</span>%</div>
        </div>
        <div class="pe-kpi-icon"><i class="fas fa-shield-alt"></i></div>
    </div>
    <div class="pe-kpi-card kpi-danger pe-animate-in">
        <div>
            <div class="pe-kpi-label">Active Hazards</div>
            <div class="pe-kpi-value" id="kpiActiveHazards">0</div>
        </div>
        <div class="pe-kpi-icon"><i class="fas fa-exclamation-triangle"></i></div>
    </div>
    <div class="pe-kpi-card kpi-warning pe-animate-in">
        <div>
            <div class="pe-kpi-label">Avg Response Time</div>
            <div class="pe-kpi-value"><span id="kpiResponseTime">--</span>m</div>
        </div>
        <div class="pe-kpi-icon"><i class="fas fa-stopwatch"></i></div>
    </div>
</div>

<!-- Main Grid Layout -->
<div class="row g-3 mt-1">
    <!-- Left Column (Tabs & Data) -->
    <div class="col-lg-8">
        <div class="pe-card h-100">
            <div class="pe-card-header d-flex justify-content-between align-items-center">
                <ul class="nav nav-pills pe-nav-pills" id="safetyTabs" role="tablist">
                    <li class="nav-item" role="presentation">
                        <button class="nav-link active" id="hazard-tab" data-bs-toggle="pill" data-bs-target="#hazard-panel" type="button" role="tab">
                            <i class="fas fa-exclamation-triangle me-1"></i> Hazard Reports
                        </button>
                    </li>
                    <li class="nav-item" role="presentation">
                        <button class="nav-link" id="preop-tab" data-bs-toggle="pill" data-bs-target="#preop-panel" type="button" role="tab" onclick="SafetyModule.loadPreOpData()">
                            <i class="fas fa-clipboard-list me-1"></i> Pre-Op Audits
                        </button>
                    </li>
                </ul>
                <div class="d-flex align-items-center">
                    <button class="pe-btn pe-btn-primary me-2" onclick="SafetyModule.openChecklistConfig()" title="Manage Checklists">
                        <i class="fas fa-tasks"></i> Checklist Config
                    </button>
                    <button class="pe-btn pe-btn-ghost me-2" onclick="SafetyModule.loadData()" title="Refresh">
                        <i class="fas fa-sync-alt"></i>
                    </button>
                </div>
            </div>
            <div class="pe-card-body p-0">
                <div class="tab-content" id="safetyTabsContent">
                    
                    <!-- Hazard Reports Panel -->
                    <div class="tab-pane fade show active" id="hazard-panel" role="tabpanel">
                        <div class="p-3 bg-light border-bottom d-flex justify-content-between align-items-center">
                            <div class="pe-search" style="max-width: 250px;">
                                <i class="fas fa-search"></i>
                                <input type="text" id="safetySearchInput" placeholder="ค้นหา Machine, Issue..." oninput="SafetyModule.filterTable()">
                            </div>
                            <select class="form-select form-select-sm w-auto" id="safetyStatusFilter" onchange="SafetyModule.loadData()">
                                <option value="all">All Status</option>
                                <option value="Pending" selected>Pending</option>
                                <option value="In Progress">In Progress</option>
                                <option value="Completed">Resolved</option>
                            </select>
                        </div>
                        <div class="table-responsive" style="max-height: 400px;">
                            <table class="pe-table mb-0" id="safetyTable">
                                <thead>
                                    <tr>
                                        <th style="width: 100px;">WO Number</th>
                                        <th style="width: 130px;">Reported At</th>
                                        <th>Issue Title</th>
                                        <th style="width: 130px;">Machine</th>
                                        <th style="width: 90px;">Status</th>
                                        <th style="width: 60px;" class="text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody id="safetyTableBody">
                                    <tr><td colspan="6" class="text-center py-4 text-muted"><i class="fas fa-spinner fa-spin me-2"></i>Loading data...</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- Pre-Op Audits Panel -->
                    <div class="tab-pane fade" id="preop-panel" role="tabpanel">
                        <div class="table-responsive" style="max-height: 450px;">
                            <table class="pe-table mb-0" id="preopTable">
                                <thead>
                                    <tr>
                                        <th style="width: 140px;">Audited At</th>
                                        <th>Machine / Line</th>
                                        <th style="width: 100px;">Shift</th>
                                        <th>Audited By</th>
                                        <th style="width: 100px;">Status</th>
                                        <th style="width: 80px;" class="text-center">WO Link</th>
                                    </tr>
                                </thead>
                                <tbody id="preopTableBody">
                                    <tr><td colspan="6" class="text-center py-4 text-muted"><i class="fas fa-info-circle me-2"></i>Select tab to load data</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    </div>

    <!-- Right Column (Charts) -->
    <div class="col-lg-4">
        <div class="pe-card mb-3">
            <div class="pe-card-header">
                <h6 class="mb-0 fw-bold"><i class="fas fa-chart-pie me-2 text-primary"></i>Pre-Op Compliance (Today)</h6>
            </div>
            <div class="pe-card-body d-flex justify-content-center align-items-center" style="height: 200px;">
                <canvas id="preopComplianceChart"></canvas>
            </div>
        </div>

        <div class="pe-card">
            <div class="pe-card-header">
                <h6 class="mb-0 fw-bold"><i class="fas fa-chart-line me-2 text-danger"></i>Hazard Incidents (7 Days)</h6>
            </div>
            <div class="pe-card-body" style="height: 200px;">
                <canvas id="hazardTrendChart"></canvas>
            </div>
        </div>
    </div>
</div>

<!-- Hazard Details Modal (Existing logic) -->
<div class="modal fade pe-modal" id="hazardModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-lg">
        <div class="modal-content">
            <div class="modal-header border-0 pb-0">
                <h5 class="modal-title fw-bold text-danger"><i class="fas fa-exclamation-triangle me-2"></i>Hazard Report Details</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <div class="row g-3">
                    <div class="col-md-7">
                        <div class="mb-3">
                            <label class="pe-text-muted small fw-bold text-uppercase mb-1">Issue Title</label>
                            <div class="fs-5 fw-bold" id="hazModalTitle">--</div>
                        </div>
                        <div class="row mb-3">
                            <div class="col-6">
                                <label class="pe-text-muted small fw-bold text-uppercase mb-1">WO Number</label>
                                <div class="fw-medium" id="hazModalWo">--</div>
                            </div>
                            <div class="col-6">
                                <label class="pe-text-muted small fw-bold text-uppercase mb-1">Machine</label>
                                <div class="fw-medium text-primary" id="hazModalMachine">--</div>
                            </div>
                        </div>
                        <div class="row mb-3">
                            <div class="col-6">
                                <label class="pe-text-muted small fw-bold text-uppercase mb-1">Reported By</label>
                                <div class="fw-medium" id="hazModalReporter">--</div>
                            </div>
                            <div class="col-6">
                                <label class="pe-text-muted small fw-bold text-uppercase mb-1">Reported At</label>
                                <div class="fw-medium" id="hazModalTime">--</div>
                            </div>
                        </div>
                        <div class="mb-3">
                            <label class="pe-text-muted small fw-bold text-uppercase mb-1">Detail / Remarks</label>
                            <div class="p-3 bg-light rounded border" id="hazModalDetail" style="min-height: 80px;">--</div>
                        </div>
                    </div>
                    <div class="col-md-5">
                        <label class="pe-text-muted small fw-bold text-uppercase mb-1">Evidence Photo</label>
                        <div class="border rounded bg-light d-flex align-items-center justify-content-center overflow-hidden" style="height: 250px;">
                            <img id="hazModalImage" src="" alt="Evidence" style="max-width: 100%; max-height: 100%; display: none;">
                            <div id="hazModalNoImage" class="text-muted"><i class="fas fa-image fa-3x mb-2 d-block text-center"></i> No Image</div>
                        </div>
                    </div>
                </div>

                <hr class="my-4">
                <h6 class="fw-bold mb-3">Update Status</h6>
                <div class="row g-3 align-items-end">
                    <div class="col-md-4">
                        <label class="form-label small">Status</label>
                        <select class="form-select" id="hazUpdateStatus">
                            <option value="Pending">Pending</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Completed">Completed (Resolved)</option>
                            <option value="Cancelled">Cancelled</option>
                        </select>
                    </div>
                    <div class="col-md-6">
                        <label class="form-label small">Action Notes</label>
                        <input type="text" class="form-control" id="hazUpdateNotes" placeholder="What was done?">
                    </div>
                    <div class="col-md-2">
                        <input type="hidden" id="hazUpdateWoId">
                        <button class="btn btn-primary w-100" onclick="SafetyModule.updateStatus()">Update</button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<!-- Checklist Config Modal -->
<div class="modal fade pe-modal" id="checklistModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-lg">
        <div class="modal-content">
            <div class="modal-header border-0 pb-0">
                <h5 class="modal-title fw-bold text-primary"><i class="fas fa-tasks me-2"></i>Checklist Configuration</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <div class="row mb-3 align-items-end">
                    <div class="col-md-8">
                        <label class="form-label small fw-bold">Machine Type / Form Name</label>
                        <select class="form-select" id="configMachineType" onchange="SafetyModule.loadChecklistConfig()">
                            <option value="">-- Default Checklist (All Machines) --</option>
                            <!-- Dynamically loaded -->
                        </select>
                    </div>
                    <div class="col-md-4 text-end">
                        <button class="btn btn-outline-primary w-100" onclick="SafetyModule.addChecklistRow()">
                            <i class="fas fa-plus me-1"></i> Add Question
                        </button>
                    </div>
                </div>
                
                <div class="table-responsive">
                    <table class="table table-bordered align-middle">
                        <thead class="table-light">
                            <tr>
                                <th style="width: 60px;" class="text-center">Order</th>
                                <th>Checklist Question</th>
                                <th style="width: 100px;" class="text-center">Critical</th>
                                <th style="width: 70px;" class="text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody id="checklistConfigBody">
                            <!-- Rows loaded here -->
                        </tbody>
                    </table>
                </div>
                
                <div class="text-end mt-3">
                    <button class="btn btn-primary" onclick="SafetyModule.saveChecklistConfig()">
                        <i class="fas fa-save me-1"></i> Save Changes
                    </button>
                </div>
            </div>
        </div>
    </div>
</div>
