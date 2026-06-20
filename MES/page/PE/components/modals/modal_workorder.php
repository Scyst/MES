<!-- modal_workorder.php — Create/Edit Work Order -->
<style>
    @media (min-width: 992px) {
        .wo-divider-col { border-right: 1px dashed var(--pe-border); padding-right: 1.5rem; }
        .wo-tech-col { padding-left: 1.5rem; }
    }
    @media (max-width: 991px) {
        .wo-tech-col { border-top: 1px dashed var(--pe-border); padding-top: 1.5rem; margin-top: 0.5rem; }
    }
</style>
<div class="modal fade pe-modal" id="workOrderModal" tabindex="-1">
    <div class="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title"><i class="fas fa-clipboard-list" style="color:var(--pe-primary);"></i> <span id="woModalTitle">New Work Order</span></h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <input type="hidden" id="woEditId">
                
                <div class="row g-0">
                    <!-- Left Column: Requester Info -->
                    <div class="col-lg-6 wo-divider-col d-flex flex-column">
                        <div class="pe-text-xs pe-fw-bold pe-text-muted mb-3" style="letter-spacing:1px;text-transform:uppercase;">
                            <i class="fas fa-info-circle me-1"></i> Request Details
                        </div>
                        <div class="row g-2">
                            <!-- Basic Information -->
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

                            </div>

                        <!-- Full-width fields extracted from row for flex stretching -->
                        <div class="pe-form-group mt-2 mb-2">
                            <label class="pe-form-label">Issue Title <span class="required">*</span></label>
                            <input type="text" class="pe-form-input" id="woFrmTitle" placeholder="สรุปปัญหาสั้นๆ...">
                        </div>
                        <div class="pe-form-group d-flex flex-column flex-grow-1 mb-0">
                            <label class="pe-form-label">Issue Detail</label>
                            <textarea class="pe-form-textarea flex-grow-1" id="woFrmDetail" placeholder="อธิบายรายละเอียดปัญหา..." style="min-height: 100px; resize: none;"></textarea>
                        </div>
                        <div class="mt-auto pt-3">
                            <div class="pe-form-group mb-0">
                                <label class="pe-form-label">Attached Image (Before) (optional)</label>
                                <input type="file" id="woFrmImage" accept="image/jpeg, image/png, image/webp" style="display:none;">
                                <div class="pe-dropzone" id="woDropzoneBefore" style="aspect-ratio: 4/3; width: 100%; height: auto;">
                                    <div class="pe-dropzone-content">
                                        <i class="fas fa-cloud-upload-alt"></i>
                                        <p>Click or drag image here</p>
                                        <div class="pe-dropzone-hint">JPEG, PNG, WEBP</div>
                                    </div>
                                    <div id="woImagePreview" style="display:none; position:absolute; top:0; left:0; right:0; bottom:0; z-index:2; align-items:center; justify-content:center;">
                                        <img src="" alt="Preview" style="max-width:100%; border-radius:var(--pe-radius-sm); object-fit:contain; cursor:pointer; width:100%; height:100%; display:block;" onclick="event.stopPropagation(); window.open(this.src, '_blank')">
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Right Column: Technician Info -->
                    <div class="col-lg-6 wo-tech-col d-flex flex-column" id="woTechSection" style="display:none;">
                        <div class="pe-text-xs pe-fw-bold pe-text-muted mb-3" style="letter-spacing:1px;text-transform:uppercase;">
                            <i class="fas fa-user-cog me-1"></i> Technician Details
                        </div>
                        <div class="row g-2">
                            <div class="col-md-6" id="woAssignedToGroup" style="display:none;">
                                <div class="pe-form-group">
                                    <label class="pe-form-label">Assigned To</label>
                                    <input list="woTechList" class="pe-form-input" id="woFrmAssignedTo" placeholder="ชื่อช่าง">
                                    <datalist id="woTechList"></datalist>
                                </div>
                            </div>
                            <div class="col-md-6" id="woStatusGroup" style="display:none;">
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
                            <div class="col-md-6" id="woStartedAtGroup" style="display:none;">
                                <div class="pe-form-group">
                                    <label class="pe-form-label">Started At</label>
                                    <input type="datetime-local" class="pe-form-input" id="woFrmStartedAt">
                                </div>
                            </div>
                            <div class="col-md-6" id="woCompletedAtGroup" style="display:none;">
                                <div class="pe-form-group">
                                    <label class="pe-form-label">Completed At</label>
                                    <input type="datetime-local" class="pe-form-input" id="woFrmCompletedAt">
                                </div>
                            </div>
                            <div class="col-12" id="woRepairMinGroup" style="display:none;">
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
                            
                            <!-- Spare Parts Section -->
                            <div class="col-12" id="woSparePartsGroup" style="display:none;">
                                <div class="pe-form-group">
                                    <div class="d-flex justify-content-between align-items-center mb-2">
                                        <label class="pe-form-label mb-0">Spare Parts Used</label>
                                        <button type="button" class="pe-btn pe-btn-sm" style="background-color: var(--pe-primary-light); color: var(--pe-primary); border: 1px solid var(--pe-primary);" onclick="WorkOrderModule.openSparePartsModal()">
                                            <i class="fas fa-plus"></i> เบิกอะไหล่
                                        </button>
                                    </div>
                                    <div class="table-responsive" style="max-height: 150px; overflow-y: auto; border: 1px solid var(--pe-border); border-radius: var(--pe-radius-sm);">
                                        <table class="pe-table mb-0 pe-text-sm">
                                            <thead>
                                                <tr>
                                                    <th>Item</th>
                                                    <th class="pe-text-end">Qty</th>
                                                    <th class="pe-text-end">Cost</th>
                                                </tr>
                                            </thead>
                                            <tbody id="woSparePartsTableBody">
                                                <tr><td colspan="3" class="pe-text-center pe-text-muted">No parts issued</td></tr>
                                            </tbody>
                                            <tfoot>
                                                <tr style="background-color: var(--pe-bg-hover); font-weight: bold;">
                                                    <td colspan="2" class="pe-text-end">Total Cost</td>
                                                    <td class="pe-text-end text-danger" id="woSparePartsTotalCost">0.00</td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="mt-auto pt-3" id="woImageAfterGroup" style="display:none;">
                            <div class="pe-form-group mb-0">
                                <label class="pe-form-label">Attached Image (After) (optional)</label>
                                <input type="file" id="woFrmImageAfter" accept="image/jpeg, image/png, image/webp" style="display:none;">
                                <div class="pe-dropzone" id="woDropzoneAfter" style="aspect-ratio: 4/3; width: 100%; height: auto;">
                                    <div class="pe-dropzone-content">
                                        <i class="fas fa-cloud-upload-alt"></i>
                                        <p>Click or drag image here</p>
                                        <div class="pe-dropzone-hint">JPEG, PNG, WEBP</div>
                                    </div>
                                    <div id="woImageAfterPreview" style="display:none; position:absolute; top:0; left:0; right:0; bottom:0; z-index:2; align-items:center; justify-content:center;">
                                        <img src="" alt="Preview After" style="max-width:100%; border-radius:var(--pe-radius-sm); object-fit:contain; cursor:pointer; width:100%; height:100%; display:block;" onclick="event.stopPropagation(); window.open(this.src, '_blank')">
                                    </div>
                                </div>
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
