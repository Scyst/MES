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
    <div class="pe-kpi-card kpi-success pe-animate-in" style="--delay: 0.2s" style="cursor:pointer;" onclick="SafetyModule.openStatsModal()" title="ดูกราฟ Compliance">
        <div>
            <div class="pe-kpi-label">Compliance Rate</div>
            <div class="pe-kpi-value"><span id="kpiPreOpCompliance">0</span><span class="unit">%</span></div>
        </div>
        <div class="pe-kpi-icon"><i class="fas fa-chart-pie"></i></div>
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

<!-- Main Content Card -->
<div class="pe-card pe-card-fill pe-animate-in" style="--delay: 0.5s">
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
        <div class="d-flex align-items-center gap-2">
            <button class="pe-btn pe-btn-ghost pe-btn-sm" onclick="SafetyModule.openStatsModal()" title="ดูสถิติ/กราฟ">
                <i class="fas fa-chart-bar"></i>
            </button>
            <button class="pe-btn pe-btn-ghost pe-btn-sm" onclick="SafetyModule.openChecklistConfig()" title="จัดการ Checklist">
                <i class="fas fa-cog"></i>
            </button>
            <button class="pe-btn pe-btn-ghost pe-btn-sm" onclick="SafetyModule.loadData()" title="Refresh">
                <i class="fas fa-sync-alt"></i>
            </button>
        </div>
    </div>

    <div class="pe-card-body p-0">
        <div class="tab-content d-flex flex-column flex-fill" id="safetyTabsContent">

            <!-- Hazard Reports Panel -->
            <div class="tab-pane fade show active pe-tab-pane-fill" id="hazard-panel" role="tabpanel">
                <div class="pe-filter-bar">
                    <div class="pe-search" style="max-width: 260px;">
                        <i class="fas fa-search"></i>
                        <input type="search" id="safetySearchInput" placeholder="ค้นหา Machine, Issue..." oninput="SafetyModule.filterTable()" autocomplete="new-password">
                    </div>
                    <select class="pe-filter-select" id="safetyStatusFilter" onchange="SafetyModule.loadData()">
                        <option value="all">All Status</option>
                        <option value="Pending" selected>Pending</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Completed">Resolved</option>
                    </select>
                </div>
                <div class="pe-table-scroll-y">
                    <table class="pe-table mb-0" id="safetyTable">
                        <thead style="position: sticky; top: 0; z-index: 1; background: var(--pe-bg-table-header);">
                            <tr>
                                <th>WO</th>
                                <th>วันที่</th>
                                <th>ปัญหา</th>
                                <th>เครื่องจักร</th>
                                <th>Status</th>
                                <th class="text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody id="safetyTableBody"></tbody>
                    </table>
                </div>
            </div>

            <!-- Pre-Op Audits Panel -->
            <div class="tab-pane fade pe-tab-pane-fill" id="preop-panel" role="tabpanel">
                <div class="pe-table-scroll-y">
                    <table class="pe-table mb-0" id="preopTable">
                        <thead style="position: sticky; top: 0; z-index: 1; background: var(--pe-bg-table-header);">
                            <tr>
                                <th>วันที่</th>
                                <th>เครื่องจักร</th>
                                <th>Shift</th>
                                <th>ผู้ตรวจ</th>
                                <th>ผลลัพธ์</th>
                                <th class="text-center">WO</th>
                            </tr>
                        </thead>
                        <tbody id="preopTableBody"></tbody>
                    </table>
                </div>
            </div>

        </div>
    </div>
</div>

<!-- Stats Modal (Charts) -->
<div class="modal fade" id="safetyStatsModal" tabindex="-1" aria-labelledby="safetyStatsModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-lg modal-dialog-centered">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="safetyStatsModalLabel">
                    <i class="fas fa-chart-bar me-2 text-primary"></i>Safety Statistics
                </h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <div class="row g-3">
                    <div class="col-md-5">
                        <div class="text-center mb-2 fw-bold text-muted" style="font-size:12px; text-transform:uppercase;">Pre-Op Compliance</div>
                        <div style="height: 240px; position: relative;">
                            <canvas id="preopComplianceChart"></canvas>
                        </div>
                    </div>
                    <div class="col-md-7">
                        <div class="text-center mb-2 fw-bold text-muted" style="font-size:12px; text-transform:uppercase;">Hazard Trend (7 Days)</div>
                        <div style="height: 240px; position: relative;">
                            <canvas id="hazardTrendChart"></canvas>
                        </div>
                    </div>
</div>
            </div>
        </div>
    </div>
</div>

<!-- Hazard Detail Modal -->
<div class="modal fade" id="hazardModal" tabindex="-1" aria-labelledby="hazardModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="hazardModalLabel">
                    <i class="fas fa-exclamation-circle me-2 text-danger"></i>รายละเอียดปัญหา
                </h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body p-0">
                <div class="p-3 border-bottom bg-light">
                    <h5 class="fw-bold text-danger mb-1" id="hazModalTitle">--</h5>
                    <div class="d-flex justify-content-between align-items-center">
                        <span class="badge bg-secondary" id="hazModalWo">--</span>
                        <small class="text-muted" id="hazModalTime">--</small>
                    </div>
                </div>
                
                <div class="p-3">
                    <div class="mb-3">
                        <div class="small text-muted fw-bold mb-1">เครื่องจักร (Machine)</div>
                        <div class="pe-kpi-value fs-5" id="hazModalMachine">--</div>
                    </div>
                    <div class="mb-3">
                        <div class="small text-muted fw-bold mb-1">ผู้แจ้ง (Reported By)</div>
                        <div><i class="fas fa-user-circle me-1"></i> <span id="hazModalReporter">--</span></div>
                    </div>
                    <div class="mb-3">
                        <div class="small text-muted fw-bold mb-1">รายละเอียดเพิ่มเติม</div>
                        <div class="p-2 bg-light rounded border" id="hazModalDetail" style="min-height: 60px;">--</div>
                    </div>
                    <div id="hazModalImageContainer">
                        <div class="small text-muted fw-bold mb-2">รูปภาพประกอบ</div>
                        <img id="hazModalImage" src="" alt="Hazard Image" class="img-fluid rounded border" style="display: none; width: 100%; max-height: 250px; object-fit: contain;">
                        <div id="hazModalNoImage" class="bg-light rounded border d-flex flex-column align-items-center justify-content-center text-muted" style="height: 150px;">
                            <i class="fas fa-image fa-2x mb-2 opacity-50"></i>
                            <small>ไม่มีรูปภาพประกอบ</small>
                        </div>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">ปิด (Close)</button>
            </div>
        </div>
    </div>
</div>
