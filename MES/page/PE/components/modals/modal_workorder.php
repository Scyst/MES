<!-- modal_workorder.php — Create/Edit Work Order -->
<div class="modal fade pe-modal" id="workOrderModal" tabindex="-1">
    <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title"><i class="fas fa-clipboard-list" style="color:var(--pe-primary);"></i> <span id="woModalTitle">New Work Order</span></h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <input type="hidden" id="woEditId">
                
                <div class="row g-3">
                    <!-- Request Info -->
                    <div class="col-12">
                        <div class="pe-text-xs pe-fw-bold pe-text-muted" style="letter-spacing:1px;text-transform:uppercase;margin-bottom:8px;">
                            <i class="fas fa-info-circle me-1"></i> Request Information
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="pe-form-group">
                            <label class="pe-form-label">WO Type <span class="required">*</span></label>
                            <select class="pe-form-select" id="woFrmType">
                                <option value="Corrective">Corrective (แก้ไข)</option>
                                <option value="Preventive">Preventive (ป้องกัน)</option>
                                <option value="Inspection">Inspection (ตรวจสอบ)</option>
                            </select>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="pe-form-group">
                            <label class="pe-form-label">Priority <span class="required">*</span></label>
                            <select class="pe-form-select" id="woFrmPriority">
                                <option value="Low">Low</option>
                                <option value="Normal" selected>Normal</option>
                                <option value="High">High</option>
                                <option value="Critical">Critical</option>
                            </select>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="pe-form-group">
                            <label class="pe-form-label">Machine <span class="required">*</span></label>
                            <select class="pe-form-select" id="woFrmMachine" onchange="WorkOrderModule.onMachineChange()">
                                <option value="">-- Select Machine --</option>
                            </select>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="pe-form-group">
                            <label class="pe-form-label">Line</label>
                            <input list="woLineList" class="pe-form-input" id="woFrmLine" placeholder="Line">
                            <datalist id="woLineList"></datalist>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="pe-form-group">
                            <label class="pe-form-label">Request Date</label>
                            <input type="datetime-local" class="pe-form-input" id="woFrmRequestDate">
                        </div>
                    </div>
                    <div class="col-12">
                        <div class="pe-form-group">
                            <label class="pe-form-label">Issue Title <span class="required">*</span></label>
                            <input type="text" class="pe-form-input" id="woFrmTitle" placeholder="สรุปปัญหาสั้นๆ...">
                        </div>
                    </div>
                    <div class="col-12">
                        <div class="pe-form-group">
                            <label class="pe-form-label">Issue Detail</label>
                            <textarea class="pe-form-textarea" id="woFrmDetail" rows="3" placeholder="อธิบายรายละเอียดปัญหา..."></textarea>
                        </div>
                    </div>
                    <div class="col-12">
                        <div class="pe-form-group">
                            <label class="pe-form-label">Attached Image (optional)</label>
                            <input type="file" class="pe-form-input" id="woFrmImage" accept="image/jpeg, image/png, image/webp">
                            <div id="woImagePreview" style="margin-top:10px; max-width: 250px; display:none;">
                                <img src="" alt="Preview" style="width:100%; border-radius:4px; border:1px solid var(--pe-border); cursor:pointer;" onclick="window.open(this.src, '_blank')">
                            </div>
                        </div>
                    </div>

                    <!-- Technician Info (for editing) -->
                    <div class="col-12" id="woTechSection" style="display:none;">
                        <hr style="border-color:var(--pe-border);">
                        <div class="pe-text-xs pe-fw-bold pe-text-muted" style="letter-spacing:1px;text-transform:uppercase;margin-bottom:8px;">
                            <i class="fas fa-user-cog me-1"></i> Technician Section
                        </div>
                    </div>
                    <div class="col-md-4" id="woAssignedToGroup" style="display:none;">
                        <div class="pe-form-group">
                            <label class="pe-form-label">Assigned To</label>
                            <input type="text" class="pe-form-input" id="woFrmAssignedTo" placeholder="ชื่อช่าง">
                        </div>
                    </div>
                    <div class="col-md-4" id="woStartedAtGroup" style="display:none;">
                        <div class="pe-form-group">
                            <label class="pe-form-label">Started At</label>
                            <input type="datetime-local" class="pe-form-input" id="woFrmStartedAt">
                        </div>
                    </div>
                    <div class="col-md-4" id="woCompletedAtGroup" style="display:none;">
                        <div class="pe-form-group">
                            <label class="pe-form-label">Completed At</label>
                            <input type="datetime-local" class="pe-form-input" id="woFrmCompletedAt">
                        </div>
                    </div>
                    <div class="col-md-4" id="woStatusGroup" style="display:none;">
                        <div class="pe-form-group">
                            <label class="pe-form-label">Status</label>
                            <select class="pe-form-select" id="woFrmStatus">
                                <option value="Open">Open</option>
                                <option value="Assigned">Assigned</option>
                                <option value="In Progress">In Progress</option>
                                <option value="Completed">Completed</option>
                                <option value="Cancelled">Cancelled</option>
                            </select>
                        </div>
                    </div>
                    <div class="col-md-4" id="woRepairMinGroup" style="display:none;">
                        <div class="pe-form-group">
                            <label class="pe-form-label">Repair Minutes</label>
                            <input type="number" class="pe-form-input" id="woFrmRepairMin" min="0">
                        </div>
                    </div>
                    <div class="col-12" id="woRootCauseGroup" style="display:none;">
                        <div class="pe-form-group">
                            <label class="pe-form-label">Root Cause</label>
                            <textarea class="pe-form-textarea" id="woFrmRootCause" rows="2" placeholder="สาเหตุหลัก..."></textarea>
                        </div>
                    </div>
                    <div class="col-12" id="woActionGroup" style="display:none;">
                        <div class="pe-form-group">
                            <label class="pe-form-label">Action Taken</label>
                            <textarea class="pe-form-textarea" id="woFrmAction" rows="2" placeholder="สิ่งที่ทำ..."></textarea>
                        </div>
                    </div>
                    <div class="col-12" id="woImageAfterGroup" style="display:none;">
                        <div class="pe-form-group">
                            <label class="pe-form-label">Attached Image (After) (optional)</label>
                            <input type="file" class="pe-form-input" id="woFrmImageAfter" accept="image/jpeg, image/png, image/webp">
                            <div id="woImageAfterPreview" style="margin-top:10px; max-width: 250px; display:none;">
                                <img src="" alt="Preview After" style="width:100%; border-radius:4px; border:1px solid var(--pe-border); cursor:pointer;" onclick="window.open(this.src, '_blank')">
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="modal-footer pe-d-flex pe-justify-between">
                <div class="pe-d-flex pe-gap-8">
                    <button type="button" class="pe-btn pe-btn-danger" id="woDeleteBtn" onclick="WorkOrderModule.deleteItem()" style="display:none;">
                        <i class="fas fa-trash-alt me-1"></i> Delete
                    </button>
                    <button type="button" class="pe-btn" id="woPrintBtn" onclick="WorkOrderModule.printPDF()" style="display:none; background-color: var(--pe-primary-light); color: var(--pe-primary); border: 1px solid var(--pe-primary);">
                        <i class="fas fa-print me-1"></i> Print PDF
                    </button>
                </div>
                <div class="pe-d-flex pe-gap-8">
                    <button type="button" class="pe-btn pe-btn-ghost" data-bs-dismiss="modal">Cancel</button>
                    <button type="button" class="pe-btn pe-btn-primary" id="woSaveBtn" onclick="WorkOrderModule.save()">
                        <i class="fas fa-save me-1"></i> Create Work Order
                    </button>
                </div>
            </div>
        </div>
    </div>
</div>
