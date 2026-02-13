<div class="modal fade" id="maintenanceAnalysisModal" tabindex="-1" aria-modal="true" role="dialog">
    <div class="modal-dialog modal-xl modal-dialog-scrollable">
        <div class="modal-content border-0 shadow-lg">
            
            <div class="modal-header bg-dark text-white py-2 border-bottom-0">
                <h5 class="modal-title small text-uppercase fw-bold">
                    <i class="fas fa-cogs me-2 text-warning"></i>Maintenance Executive Dashboard
                </h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>

            <div class="bg-light border-bottom p-3">
                <div class="row g-2 align-items-end">
                    <div class="col-md-3">
                        <label class="small fw-bold text-muted text-uppercase" style="font-size: 0.7rem;">Range Start</label>
                        <div class="input-group input-group-sm">
                            <span class="input-group-text bg-white border-end-0"><i class="fas fa-calendar-alt text-primary"></i></span>
                            <input type="date" id="dash_startDate" class="form-control border-start-0 ps-0">
                        </div>
                    </div>
                    <div class="col-md-3">
                        <label class="small fw-bold text-muted text-uppercase" style="font-size: 0.7rem;">Range End</label>
                        <div class="input-group input-group-sm">
                            <span class="input-group-text bg-white border-end-0"><i class="fas fa-calendar-check text-primary"></i></span>
                            <input type="date" id="dash_endDate" class="form-control border-start-0 ps-0">
                        </div>
                    </div>
                    <div class="col-md-3">
                        <label class="small fw-bold text-muted text-uppercase" style="font-size: 0.7rem;">Focus Line</label>
                        <div class="input-group input-group-sm">
                            <input type="text" id="dash_filterLine" class="form-control border-end-0" placeholder="All Lines" list="lineListFilter">
                            <button class="btn btn-outline-secondary border-start-0" type="button" onclick="MtDashboard.loadData()" title="Refresh Data">
                                <i class="fas fa-sync-alt"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div class="modal-body p-0 bg-white">
                
                <ul class="nav nav-tabs nav-tabs-bordered px-3 pt-3" id="mtTabs" role="tablist">
                    <li class="nav-item" role="presentation">
                        <button class="nav-link active fw-bold" id="tab-overview-btn" data-bs-toggle="tab" data-bs-target="#tab-overview" type="button" role="tab">
                            <i class="fas fa-chart-line me-2 text-success"></i>Performance & Trends
                        </button>
                    </li>
                    <li class="nav-item" role="presentation">
                        <button class="nav-link fw-bold" id="tab-reliability-btn" data-bs-toggle="tab" data-bs-target="#tab-reliability" type="button" role="tab">
                            <i class="fas fa-tools me-2 text-warning"></i>Machine Reliability
                        </button>
                    </li>
                </ul>

                <div class="tab-content p-3" id="mtTabContent">
                    
                    <div class="tab-pane fade show active" id="tab-overview" role="tabpanel">
                        
                        <div class="row g-2 mb-3">
                    
                            <div class="col-md-3">
                                <div class="p-2 bg-white border rounded shadow-sm h-100">
                                    <div class="text-uppercase fw-bold small text-secondary mb-1">Total Requests</div>
                                    <h3 id="kpi_total" class="mb-2 fw-bold text-primary text-center">0</h3>
                                    
                                    <table class="table table-bordered table-sm mb-0 small text-center" style="font-size: 0.7rem;">
                                        <thead class="bg-light text-muted">
                                            <tr><th>Critical</th><th>Urgent</th><th>Normal</th></tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td id="kpi_vol_crit" class="fw-bold text-danger">-</td>
                                                <td id="kpi_vol_high" class="text-warning">-</td>
                                                <td id="kpi_vol_norm" class="text-success">-</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div class="col-md-3">
                                <div class="p-2 bg-white border rounded shadow-sm h-100">
                                    <div class="text-uppercase fw-bold small text-secondary mb-1">Work Status</div>
                                    <h3 id="kpi_completed_main" class="mb-2 fw-bold text-success text-center">0</h3>
                                    
                                    <table class="table table-bordered table-sm mb-0 small text-center" style="font-size: 0.7rem;">
                                        <thead class="bg-light text-muted">
                                            <tr><th>Done</th><th>WIP</th><th>Pending</th></tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td id="kpi_stat_done" class="fw-bold text-success">-</td>
                                                <td id="kpi_stat_wip" class="text-primary">-</td>
                                                <td id="kpi_stat_pend" class="text-warning">-</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div class="col-md-3">
                                <div class="p-2 bg-white border rounded shadow-sm h-100">
                                    <div class="text-uppercase fw-bold small text-secondary mb-1">Repair Time (Min)</div>
                                    <h3 id="kpi_time_avg" class="mb-2 fw-bold text-info text-center">0</h3>
                                    
                                    <table class="table table-bordered table-sm mb-0 small text-center" style="font-size: 0.7rem;">
                                        <thead class="bg-light text-muted">
                                            <tr><th>Max</th><th>Min</th><th>Avg</th></tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td id="kpi_time_max" class="fw-bold text-danger">-</td>
                                                <td id="kpi_time_min" class="text-success">-</td>
                                                <td id="kpi_time_avg_small">-</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div class="col-md-3">
                                <div class="p-2 bg-white border rounded shadow-sm h-100">
                                    <div class="text-uppercase fw-bold small text-secondary mb-1">Pending Backlog</div>
                                    <h3 id="kpi_backlog_total" class="mb-2 fw-bold text-danger text-center">0</h3>
                                    
                                    <table class="table table-bordered table-sm mb-0 small text-center" style="font-size: 0.7rem;">
                                        <thead class="bg-light text-muted">
                                            <tr><th>Critical</th><th>High</th><th>Normal</th></tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td id="kpi_blog_crit" class="fw-bold text-danger">-</td>
                                                <td id="kpi_blog_high" class="text-warning">-</td>
                                                <td id="kpi_blog_norm" class="text-secondary">-</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                        </div>

                        <div class="row g-2 mb-3">
                            <div class="col-lg-8">
                                <div class="card border shadow-sm h-100">
                                    <div class="card-header bg-white py-1 fw-bold small text-uppercase text-secondary">
                                        <i class="fas fa-chart-line me-2 text-primary"></i>Weekly Workload Trend
                                    </div>
                                    <div class="card-body p-2">
                                        <div style="height: 220px; width: 100%;">
                                            <canvas id="chartTrend"></canvas>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="col-lg-4">
                                <div class="card border shadow-sm h-100">
                                    <div class="card-header bg-white py-1 fw-bold small text-uppercase text-secondary">
                                        <i class="fas fa-chart-pie me-2 text-dark"></i>Status Breakdown
                                    </div>
                                    <div class="card-body p-2 d-flex align-items-center justify-content-center">
                                        <div style="height: 220px; width: 100%;">
                                            <canvas id="chartStatus"></canvas>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="row g-2">
                            <div class="col-lg-8">
                                <div class="card border shadow-sm h-100">
                                    <div class="card-header bg-white py-1 fw-bold small text-uppercase text-secondary d-flex justify-content-between align-items-center">
                                        <span><i class="fas fa-medal me-2 text-warning"></i>Top 5 Lines (Frequency)</span>
                                    </div>
                                    <div class="card-body p-2">
                                        <div style="height: 250px; width: 100%;">
                                            <canvas id="chartTopMachine"></canvas>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="col-lg-4">
                                <div class="card border shadow-sm h-100">
                                    <div class="card-header bg-white py-1 fw-bold small text-uppercase text-secondary">
                                        <i class="fas fa-flag me-2 text-danger"></i>Priority Ratio
                                    </div>
                                    <div class="card-body p-2 d-flex align-items-center justify-content-center">
                                        <div style="height: 250px; width: 100%;">
                                            <canvas id="chartPrio"></canvas>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="tab-pane fade" id="tab-reliability" role="tabpanel">
                        <div class="row">
                            <div class="col-lg-12">
                                <div class="card shadow-sm mb-3">
                                    <div class="card-header py-2 bg-light d-flex justify-content-between align-items-center">
                                        <h6 class="m-0 font-weight-bold text-dark small">
                                            <i class="fas fa-table me-1"></i> Breakdown Detail Analysis
                                        </h6>
                                        <button class="btn btn-sm btn-success shadow-sm" onclick="MtDashboard.exportTable()">
                                            <i class="fas fa-file-excel me-1"></i> Export Excel
                                        </button>
                                    </div>
                                    <div class="card-body p-0">
                                        <div class="table-responsive" style="max-height: 500px;">
                                            <table class="table table-sm table-hover mb-0 align-middle" id="analysisTable" style="font-size: 0.85rem;">
                                                <thead class="bg-light text-secondary sticky-top" style="z-index: 5;">
                                                    <tr>
                                                        <th class="ps-3 py-2" width="20%">Line</th>
                                                        <th class="py-2" width="30%">Machine</th>
                                                        <th class="text-center py-2" width="15%">Total Jobs</th>
                                                        <th class="text-center py-2" width="15%">Completed</th>
                                                        <th class="text-end pe-3 py-2" width="20%">MTTR (min)</th>
                                                    </tr>
                                                </thead>
                                                <tbody class="border-top-0"></tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            <div class="modal-footer bg-light py-2">
                <div class="me-auto small text-muted">
                    <i class="fas fa-info-circle me-1"></i> Data updated real-time based on maintenance requests.
                </div>
                <button type="button" class="btn btn-outline-secondary btn-sm" data-bs-dismiss="modal">Close</button>
            </div>
        </div>
    </div>
</div>