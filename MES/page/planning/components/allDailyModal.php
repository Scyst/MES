<div class="modal fade" id="addJobModal" tabindex="-1">
    <div class="modal-dialog modal-sm">
        <div class="modal-content">
            <div class="modal-header py-2">
                <h6 class="modal-title">Add Feeder Job</h6>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <input type="hidden" id="targetRowId">
                <div class="mb-2">
                    <label class="small fw-bold">Job Name / Part</label>
                    <input type="text" id="newJobName" class="form-control form-control-sm">
                </div>
                <div class="mb-2">
                    <label class="small fw-bold">Status</label>
                    <select id="newJobStatus" class="form-select form-select-sm">
                        <option value="normal">Normal</option>
                        <option value="urgent">Urgent</option>
                        <option value="done">Done</option>
                    </select>
                </div>
                <button class="btn btn-primary btn-sm w-100" onclick="confirmAddJob()">Add Job</button>
            </div>
        </div>
    </div>
</div>

<div class="modal fade" id="addPlanModal" tabindex="-1">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header py-2 bg-light">
                <h5 class="modal-title fw-bold"><i class="fas fa-plus-circle text-primary me-2"></i>เพิ่มแผนการผลิต</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <form id="formAddPlan" autocomplete="off">
                    
                    <div class="mb-3">
                        <label class="fw-bold small">Line</label>
                        <select id="planModalLine" class="form-select">
                            <option value="">-- Loading... --</option>
                        </select>
                    </div>

                    <div class="row">
                        <div class="col-6 mb-3">
                            <label class="fw-bold small">Shift</label>
                            <div class="btn-group w-100" role="group">
                                <input type="radio" class="btn-check" name="planModalShift" id="shiftDay" value="DAY" checked>
                                <label class="btn btn-outline-secondary btn-sm" for="shiftDay"><i class="fas fa-sun"></i> DAY</label>

                                <input type="radio" class="btn-check" name="planModalShift" id="shiftNight" value="NIGHT">
                                <label class="btn btn-outline-secondary btn-sm" for="shiftNight"><i class="fas fa-moon"></i> NIGHT</label>
                            </div>
                        </div>
                        <div class="col-6 mb-3">
                            <label class="fw-bold small">Qty</label>
                            <input type="number" id="planModalQty" class="form-control" placeholder="0" min="1">
                        </div>
                    </div>

                    <div class="mb-3 position-relative">
                        <label class="fw-bold small">Item (Search SAP / Part No)</label>
                        <input type="text" id="planModalItemSearch" class="form-control" placeholder="พิมพ์เพื่อค้นหา...">
                        
                        <div id="planModalItemResults" class="list-group shadow position-absolute w-100" 
                                style="display:none; z-index: 1050; max-height: 200px; overflow-y: auto;">
                        </div>

                        <div id="selectedItemDisplay" class="d-none mt-2 p-2 bg-success bg-opacity-10 border border-success rounded small text-success">
                            <i class="fas fa-check-circle me-1"></i> <span id="selectedItemText"></span>
                        </div>
                        <input type="hidden" id="planModalItemId">
                    </div>

                </form>
            </div>
            <div class="modal-footer py-2">
                <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-primary btn-sm px-4" id="btnSavePlan">บันทึกแผน</button>
            </div>
        </div>
    </div>
</div>