<!-- tab_safety.php — Safety & Hazard Management -->

<!-- KPI Row -->
<div class="pe-kpi-row" id="safetyKpiRow">
    <div class="pe-kpi-card kpi-danger pe-animate-in">
        <div>
            <div class="pe-kpi-label">Total Hazards (30d)</div>
            <div class="pe-kpi-value" id="kpiTotalHazards">0</div>
        </div>
        <div class="pe-kpi-icon"><i class="fas fa-exclamation-triangle"></i></div>
    </div>
    <div class="pe-kpi-card kpi-warning pe-animate-in">
        <div>
            <div class="pe-kpi-label">Pending Review</div>
            <div class="pe-kpi-value" id="kpiPendingHazards">0</div>
        </div>
        <div class="pe-kpi-icon"><i class="fas fa-hourglass-start"></i></div>
    </div>
    <div class="pe-kpi-card kpi-info pe-animate-in">
        <div>
            <div class="pe-kpi-label">In Progress</div>
            <div class="pe-kpi-value" id="kpiInProgressHazards">0</div>
        </div>
        <div class="pe-kpi-icon"><i class="fas fa-tools"></i></div>
    </div>
    <div class="pe-kpi-card kpi-success pe-animate-in">
        <div>
            <div class="pe-kpi-label">Resolved</div>
            <div class="pe-kpi-value" id="kpiResolvedHazards">0</div>
        </div>
        <div class="pe-kpi-icon"><i class="fas fa-check-circle"></i></div>
    </div>
</div>

<!-- Filter Bar -->
<div class="pe-filter-bar" id="safetyFilterBar">
    <div class="pe-filter-header-mobile">
        <div class="pe-search">
            <i class="fas fa-search"></i>
            <input type="text" id="safetySearchInput" placeholder="ค้นหา Machine, Issue..." oninput="SafetyModule.filterTable()">
        </div>
    </div>

    <div class="pe-filter-spacer"></div>

    <div class="pe-filter-actions">
        <select class="form-select form-select-sm d-inline-block w-auto" id="safetyStatusFilter" onchange="SafetyModule.loadData()">
            <option value="all">All Status</option>
            <option value="Pending" selected>Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Resolved</option>
        </select>
        
        <button class="pe-btn pe-btn-ghost d-inline-flex align-items-center ms-2" onclick="SafetyModule.loadData()" title="Refresh">
            <i class="fas fa-sync-alt"></i>
        </button>
    </div>
</div>

<!-- Main Content Area -->
<div class="pe-table-container">
    <table class="pe-table" id="safetyTable">
        <thead>
            <tr>
                <th style="width: 100px;">WO Number</th>
                <th style="width: 140px;">Reported At</th>
                <th>Issue Title</th>
                <th style="width: 150px;">Machine / Line</th>
                <th style="width: 120px;">Reported By</th>
                <th style="width: 100px;">Status</th>
                <th style="width: 80px;" class="text-center">Action</th>
            </tr>
        </thead>
        <tbody id="safetyTableBody">
            <!-- Loaded via JS -->
            <tr><td colspan="7" class="text-center py-4 text-muted"><i class="fas fa-spinner fa-spin me-2"></i>Loading data...</td></tr>
        </tbody>
    </table>
</div>

<!-- Hazard Details Modal -->
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
                                <div class="fw-medium" id="hazModalMachine">--</div>
                            </div>
                        </div>
                        <div class="mb-3">
                            <label class="pe-text-muted small fw-bold text-uppercase mb-1">Details</label>
                            <div class="p-2 bg-light rounded border" id="hazModalDetail" style="min-height: 80px; white-space: pre-wrap;">--</div>
                        </div>
                        <div class="row mb-3">
                            <div class="col-6">
                                <label class="pe-text-muted small fw-bold text-uppercase mb-1">Reported By</label>
                                <div id="hazModalReporter">--</div>
                            </div>
                            <div class="col-6">
                                <label class="pe-text-muted small fw-bold text-uppercase mb-1">Reported At</label>
                                <div id="hazModalTime">--</div>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-5">
                        <label class="pe-text-muted small fw-bold text-uppercase mb-1">Attached Image</label>
                        <div class="border rounded bg-light d-flex align-items-center justify-content-center overflow-hidden" style="height: 250px;">
                            <img id="hazModalImage" src="" alt="Hazard Image" style="max-width: 100%; max-height: 100%; object-fit: contain; display: none; cursor: pointer;" onclick="window.open(this.src, '_blank')">
                            <div id="hazModalNoImage" class="text-muted"><i class="fas fa-image fa-2x mb-2 d-block text-center"></i>No Image</div>
                        </div>
                        
                        <?php if($canManage): ?>
                        <div class="mt-4 border-top pt-3">
                            <label class="pe-text-muted small fw-bold text-uppercase mb-2">Update Status</label>
                            <input type="hidden" id="hazUpdateWoId">
                            <select class="form-select mb-2" id="hazUpdateStatus">
                                <option value="Pending">Pending</option>
                                <option value="In Progress">In Progress</option>
                                <option value="Completed">Resolved</option>
                                <option value="Cancelled">Cancelled</option>
                            </select>
                            <textarea class="form-control mb-2" id="hazUpdateNotes" rows="2" placeholder="Action taken / Notes..."></textarea>
                            <button class="btn btn-primary w-100" onclick="SafetyModule.updateStatus()">Save Update</button>
                        </div>
                        <?php endif; ?>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
