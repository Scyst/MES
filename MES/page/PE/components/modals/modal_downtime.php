<!-- modal_downtime.php — Record/Edit Downtime -->
<div class="modal fade pe-modal" id="downtimeModal" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title"><i class="fas fa-clock" style="color:var(--pe-warning);"></i> <span id="dtModalTitle">Record Downtime</span></h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <input type="hidden" id="dtEditId">
                
                <div class="row g-3">
                    <div class="col-md-6">
                        <div class="pe-form-group">
                            <label class="pe-form-label">Machine <span class="required">*</span></label>
                            <select class="pe-form-select" id="dtFrmMachine" onchange="DowntimeModule.onMachineChange()">
                                <option value="">-- Select Machine --</option>
                            </select>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="pe-form-group">
                            <label class="pe-form-label">Line</label>
                            <input list="woLineList" class="pe-form-input" id="dtFrmLine" placeholder="Auto-fill from machine or select">
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="pe-form-group">
                            <label class="pe-form-label">Date <span class="required">*</span></label>
                            <input type="date" class="pe-form-input" id="dtFrmDate">
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="pe-form-group">
                            <label class="pe-form-label">Start Time <span class="required">*</span></label>
                            <input type="time" class="pe-form-input" id="dtFrmStartTime" onchange="DowntimeModule.calcDuration()">
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="pe-form-group">
                            <label class="pe-form-label">End Time <span class="required">*</span></label>
                            <input type="time" class="pe-form-input" id="dtFrmEndTime" onchange="DowntimeModule.calcDuration()">
                        </div>
                    </div>
                    <div class="col-12">
                        <div class="pe-d-flex pe-align-center pe-gap-8 pe-mb-16" style="padding:8px 12px;background:var(--pe-bg-hover);border-radius:var(--pe-radius-sm);">
                            <i class="fas fa-clock" style="color:var(--pe-warning);"></i>
                            <span class="pe-text-sm pe-fw-bold">Duration: <span id="dtCalcDuration">0 min</span></span>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="pe-form-group">
                            <label class="pe-form-label">Cause Category <span class="required">*</span></label>
                            <select class="pe-form-select" id="dtFrmCauseCategory" onchange="DowntimeModule.onCauseChange()">
                                <option value="">-- Select --</option>
                                <option value="Mechanical">Mechanical</option>
                                <option value="Electrical">Electrical</option>
                                <option value="Tooling">Tooling</option>
                                <option value="Setup">Setup / Changeover</option>
                                <option value="Quality">Quality</option>
                                <option value="Material">Material</option>
                                <option value="Operator">Operator</option>
                                <option value="Planned">Planned Maintenance</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="pe-form-group">
                            <label class="pe-form-label">Recovered By</label>
                            <input list="woTechList" class="pe-form-input" id="dtFrmRecoveredBy" placeholder="ชื่อผู้แก้ไข">
                        </div>
                    </div>
                    <div class="col-12">
                        <div class="pe-form-group">
                            <label class="pe-form-label">Cause Detail <span class="required">*</span></label>
                            <input type="text" class="pe-form-input" id="dtFrmCauseDetail" placeholder="อธิบายสาเหตุ...">
                        </div>
                    </div>
                    <div class="col-12">
                        <div class="pe-form-group">
                            <label class="pe-form-label">Notes</label>
                            <textarea class="pe-form-textarea" id="dtFrmNotes" rows="2" placeholder="หมายเหตุเพิ่มเติม..."></textarea>
                        </div>
                    </div>
                    <div class="col-12">
                        <div class="form-check">
                            <input class="form-check-input" type="checkbox" id="dtFrmCreateWO">
                            <label class="form-check-label pe-text-sm" for="dtFrmCreateWO">
                                <i class="fas fa-clipboard-list me-1" style="color:var(--pe-primary);"></i> Create Work Order from this downtime event
                            </label>
                        </div>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="pe-btn pe-btn-ghost" data-bs-dismiss="modal">Cancel</button>
                <button type="button" class="pe-btn pe-btn-primary" id="dtSaveBtn" onclick="DowntimeModule.save()">
                    <i class="fas fa-save me-1"></i> Save Downtime
                </button>
            </div>
        </div>
    </div>
</div>
