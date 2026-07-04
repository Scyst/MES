<div class="d-flex justify-content-between align-items-center mb-4">
    <div>
        <h3 class="mb-0 fw-bold"><i class="fas fa-chart-pie text-primary me-2"></i>IIoT OEE Dashboard</h3>
        <p class="text-muted mb-0">Real-time Overall Equipment Effectiveness based on IIoT sensors</p>
    </div>
    
    <div class="d-flex gap-2 align-items-center">
        <!-- Date Selector -->
        <div class="input-group input-group-sm shadow-sm" style="width: auto;">
            <span class="input-group-text bg-white"><i class="fas fa-calendar-alt text-muted"></i></span>
            <input type="date" id="iiotOeeDateFilter" class="form-control fw-bold" style="max-width: 150px;">
        </div>
        
        <!-- Machine Selector -->
        <div class="input-group input-group-sm shadow-sm" style="width: auto;">
            <span class="input-group-text bg-white"><i class="fas fa-microchip text-muted"></i></span>
            <select id="iiotOeeMachineFilter" class="form-select fw-bold" style="min-width: 150px;">
                <option value="">-- Loading --</option>
            </select>
        </div>
        
        <button class="btn btn-primary btn-sm shadow-sm" onclick="IIoTOeeModule.fetchData()">
            <i class="fas fa-sync-alt me-1"></i> Update
        </button>
    </div>
</div>

<div class="row g-4 mb-4">
    <div class="col-12 col-md-3">
        <div class="card shadow-sm border-0 h-100" style="border-radius: 12px; overflow: hidden;">
            <div class="card-header bg-white border-bottom-0 pt-3 pb-0 text-center">
                <h6 class="text-uppercase text-primary fw-bold mb-0"><i class="fas fa-tachometer-alt me-1"></i> OVERALL OEE</h6>
            </div>
            <div class="card-body p-3 text-center d-flex flex-column justify-content-center">
                <div style="height: 150px; position: relative;" class="d-flex justify-content-center align-items-center">
                    <canvas id="iiotOeePieChart"></canvas>
                </div>
            </div>
        </div>
    </div>
    <div class="col-12 col-md-3">
        <div class="card shadow-sm border-0 h-100" style="border-radius: 12px; overflow: hidden;">
            <div class="card-header bg-white border-bottom-0 pt-3 pb-0 text-center">
                <h6 class="text-uppercase text-info fw-bold mb-0"><i class="fas fa-clock me-1"></i> AVAILABILITY</h6>
            </div>
            <div class="card-body p-3 text-center d-flex flex-column justify-content-center">
                <div style="height: 150px; position: relative;" class="d-flex justify-content-center align-items-center">
                    <canvas id="iiotAvailPieChart"></canvas>
                </div>
            </div>
        </div>
    </div>
    <div class="col-12 col-md-3">
        <div class="card shadow-sm border-0 h-100" style="border-radius: 12px; overflow: hidden;">
            <div class="card-header bg-white border-bottom-0 pt-3 pb-0 text-center">
                <h6 class="text-uppercase text-warning fw-bold mb-0"><i class="fas fa-bolt me-1"></i> PERFORMANCE</h6>
            </div>
            <div class="card-body p-3 text-center d-flex flex-column justify-content-center">
                <div style="height: 150px; position: relative;" class="d-flex justify-content-center align-items-center">
                    <canvas id="iiotPerfPieChart"></canvas>
                </div>
            </div>
        </div>
    </div>
    <div class="col-12 col-md-3">
        <div class="card shadow-sm border-0 h-100" style="border-radius: 12px; overflow: hidden;">
            <div class="card-header bg-white border-bottom-0 pt-3 pb-0 text-center">
                <h6 class="text-uppercase text-success fw-bold mb-0"><i class="fas fa-check-circle me-1"></i> QUALITY</h6>
            </div>
            <div class="card-body p-3 text-center d-flex flex-column justify-content-center">
                <div style="height: 150px; position: relative;" class="d-flex justify-content-center align-items-center">
                    <canvas id="iiotQualPieChart"></canvas>
                </div>
            </div>
        </div>
    </div>
</div>

<div class="row g-4 mb-4">
    <div class="col-12 col-xl-12">
        <div class="card shadow-sm border-0" style="border-radius: 12px;">
            <div class="card-body p-4">
                <div class="row g-4 text-center">
                    <div class="col-6 col-md-3">
                        <div class="p-3 bg-light rounded">
                            <div class="text-muted small text-uppercase fw-bold mb-1">Production (Live)</div>
                            <h3 class="mb-0 text-dark fw-bold" id="iiotMetricProduction">0</h3>
                            <div class="small text-muted mt-1">Total pieces produced</div>
                        </div>
                    </div>
                    <div class="col-6 col-md-3">
                        <div class="p-3 bg-light rounded">
                            <div class="text-muted small text-uppercase fw-bold mb-1">Expected Output</div>
                            <h3 class="mb-0 text-primary fw-bold" id="iiotMetricExpected">0</h3>
                            <div class="small text-muted mt-1">Based on ideal cycle time</div>
                        </div>
                    </div>
                    <div class="col-6 col-md-3">
                        <div class="p-3 bg-light rounded">
                            <div class="text-muted small text-uppercase fw-bold mb-1">Defects</div>
                            <h3 class="mb-0 text-danger fw-bold" id="iiotMetricDefects">0</h3>
                            <div class="small text-muted mt-1">From ERP/MES transactions</div>
                        </div>
                    </div>
                    <div class="col-6 col-md-3">
                        <div class="p-3 bg-light rounded">
                            <div class="text-muted small text-uppercase fw-bold mb-1">Online Time</div>
                            <h3 class="mb-0 text-info fw-bold" id="iiotMetricOnline">0h 0m</h3>
                            <div class="small text-muted mt-1">Total operating time</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<!-- Per-Machine OEE Breakdown Table -->
<div class="row g-4 mb-4">
    <div class="col-12">
        <div class="card shadow-sm border-0" style="border-radius: 12px;">
            <div class="card-header bg-white border-bottom-0 pt-3 pb-2 pe-d-flex pe-justify-between pe-align-center">
                <h6 class="fw-bold mb-0"><i class="fas fa-list text-muted me-2"></i> Per-Machine OEE Breakdown</h6>
            </div>
            <div class="card-body p-0">
                <div class="table-responsive" style="max-height: 400px; overflow-y: auto;">
                    <table class="table table-hover align-middle mb-0 pe-table">
                        <thead class="table-light sticky-top">
                            <tr>
                                <th style="width: 25%">Machine</th>
                                <th class="text-center" style="width: 15%">Availability</th>
                                <th class="text-center" style="width: 15%">Performance</th>
                                <th class="text-center" style="width: 15%">Quality</th>
                                <th class="text-center" style="width: 15%">OEE</th>
                                <th class="text-end" style="width: 15%">Production / Defects</th>
                            </tr>
                        </thead>
                        <tbody id="iiotOeeTableBody">
                            <tr>
                                <td colspan="6" class="text-center text-muted p-4">Loading machine breakdown...</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
</div>
