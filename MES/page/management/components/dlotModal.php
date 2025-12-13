<div class="modal fade" id="dlotModal" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
            <div class="modal-header bg-warning bg-opacity-25">
                <h5 class="modal-title fw-bold"><i class="fas fa-calculator me-2"></i>Calculate DLOT (Manpower)</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <form id="dlotCalcForm">
                    <div class="row g-3">
                        <div class="col-6">
                            <label class="form-label small">Date</label>
                            <input type="date" class="form-control" id="dlotCalcDate" required>
                        </div>
                        <div class="col-6">
                            <label class="form-label small">Line</label>
                            <select class="form-select" id="dlotCalcLine" required>
                                </select>
                        </div>
                        <div class="col-6">
                            <label class="form-label small">Shift</label>
                            <select class="form-select" id="dlotCalcShift">
                                <option value="DAY">Day (08:00-20:00)</option>
                                <option value="NIGHT">Night (20:00-08:00)</option>
                            </select>
                        </div>
                        <div class="col-6">
                            <label class="form-label small fw-bold text-primary">Avg Hourly Rate (THB)</label>
                            <input type="number" class="form-control fw-bold border-primary" id="dlotHourlyRate" value="50" required>
                        </div>
                    </div>

                    <div class="d-grid mt-4">
                        <button type="button" class="btn btn-warning fw-bold" onclick="calculateDLOTFromManpower()">
                            <i class="fas fa-magic me-2"></i> Auto Calculate from Scan Time
                        </button>
                    </div>

                    <hr>

                    <div id="dlotResultArea" class="d-none">
                        <h6 class="text-muted small fw-bold">Calculation Result:</h6>
                        <div class="row g-2 text-center">
                            <div class="col-4">
                                <div class="bg-light p-2 rounded border">
                                    <small class="d-block text-muted">Headcount</small>
                                    <strong class="text-dark h5" id="resHeadcount">0</strong>
                                </div>
                            </div>
                            <div class="col-4">
                                <div class="bg-light p-2 rounded border">
                                    <small class="d-block text-muted">DL Cost</small>
                                    <strong class="text-primary h5" id="resDLCost">0</strong>
                                </div>
                            </div>
                            <div class="col-4">
                                <div class="bg-light p-2 rounded border">
                                    <small class="d-block text-muted">OT Cost</small>
                                    <strong class="text-danger h5" id="resOTCost">0</strong>
                                </div>
                            </div>
                        </div>
                        <div class="mt-3 text-end">
                            <button type="button" class="btn btn-success btn-sm" onclick="saveCalculatedDLOT()">
                                <i class="fas fa-save me-1"></i> Apply & Save
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    </div>
</div>