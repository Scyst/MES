<!-- modal_machine.php — Add/Edit Machine -->
<div class="modal fade pe-modal" id="machineModal" tabindex="-1">
    <div class="modal-dialog modal-lg modal-dialog-centered">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title"><i class="fas fa-industry" style="color:var(--pe-primary);"></i> <span id="machineModalTitle">Add Machine</span></h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <input type="hidden" id="machineEditId">
                <input type="hidden" id="machineFrmMapX">
                <input type="hidden" id="machineFrmMapY">
                <input type="hidden" id="machineFrmAreaId">
                
                <div class="row g-3">
                    <div class="col-md-4">
                        <div class="pe-form-group">
                            <label class="pe-form-label">Machine Code <span class="required">*</span></label>
                            <input type="text" class="pe-form-input" id="machineFrmCode" placeholder="e.g. PRESS-001" style="text-transform:uppercase;">
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="pe-form-group">
                            <label class="pe-form-label">Machine Name <span class="required">*</span></label>
                            <input type="text" class="pe-form-input" id="machineFrmName" placeholder="e.g. Hydraulic Press 200T">
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="pe-form-group">
                            <label class="pe-form-label">Asset No.</label>
                            <input type="text" class="pe-form-input" id="machineFrmAssetNo" placeholder="e.g. AST-1001">
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="pe-form-group">
                            <label class="pe-form-label">Line</label>
                            <input list="machineLineList" class="pe-form-input" id="machineFrmLine" placeholder="e.g. L1">
                            <datalist id="machineLineList"></datalist>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="pe-form-group">
                            <label class="pe-form-label">Area</label>
                            <input type="text" class="pe-form-input" id="machineFrmArea" placeholder="e.g. Stamping, Assembly">
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="pe-form-group">
                            <label class="pe-form-label">Machine Type</label>
                            <select class="pe-form-select" id="machineFrmType">
                                <option value="">-- Select --</option>
                                <option value="Press">Press</option>
                                <option value="Spot Weld">Spot Weld</option>
                                <option value="Laser Cut">Laser Cut</option>
                                <option value="CNC">CNC</option>
                                <option value="Bending">Bending</option>
                                <option value="Paint">Paint</option>
                                <option value="Assembly">Assembly</option>
                                <option value="Conveyor">Conveyor</option>
                                <option value="Robot">Robot</option>
                                <option value="Compressor">Compressor</option>
                                <option value="Chiller">Chiller</option>
                                <option value="Oven">Oven</option>
                                <option value="Testing">Testing</option>
                                <option value="Utility">Utility / Facility</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="pe-form-group">
                            <label class="pe-form-label">Manufacturer</label>
                            <input type="text" class="pe-form-input" id="machineFrmManufacturer" placeholder="e.g. AIDA, Fanuc">
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="pe-form-group">
                            <label class="pe-form-label">Model</label>
                            <input type="text" class="pe-form-input" id="machineFrmModel">
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="pe-form-group">
                            <label class="pe-form-label">Serial Number</label>
                            <input type="text" class="pe-form-input" id="machineFrmSerial">
                        </div>
                    </div>
                    <!-- (MQTT was here, removed) -->
                    <div class="col-md-4">
                        <div class="pe-form-group">
                            <label class="pe-form-label">Install Date</label>
                            <input type="date" class="pe-form-input" id="machineFrmInstallDate">
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="pe-form-group">
                            <label class="pe-form-label">Status</label>
                            <select class="pe-form-select" id="machineFrmStatus">
                                <option value="Active">Active</option>
                                <option value="Inactive">Inactive</option>
                                <option value="Under Repair">Under Repair</option>
                            </select>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="pe-form-group">
                            <label class="pe-form-label">Criticality</label>
                            <select class="pe-form-select" id="machineFrmCriticality">
                                <option value="Low">Low</option>
                                <option value="Medium" selected>Medium</option>
                                <option value="High">High</option>
                                <option value="Critical">Critical</option>
                            </select>
                        </div>
                    </div>
                    <div class="col-12 mt-4">
                        <h6 class="text-muted fw-bold mb-3" style="border-bottom: 1px solid var(--pe-border); padding-bottom: 8px;">
                            <i class="fas fa-network-wired me-2"></i> Integration & Advanced Settings
                        </h6>
                    </div>
                    <div class="col-md-12">
                        <div class="pe-form-group">
                            <label class="pe-form-label">MQTT Topic / Node Name</label>
                            <input type="text" class="pe-form-input" id="machineFrmMqttTopic" placeholder="e.g. DB_HM_1003_4">
                        </div>
                    </div>
                    <div class="col-md-12">
                        <div class="pe-form-group">
                            <label class="pe-form-label">Machine Image</label>
                            <div class="pe-image-upload-wrapper" style="border: 2px dashed var(--pe-border); border-radius: 8px; padding: 20px; text-align: center; cursor: pointer; position: relative; background: var(--pe-bg-light); transition: all 0.2s;" onclick="document.getElementById('machineFrmImage').click();" ondragover="event.preventDefault(); this.style.borderColor='var(--pe-primary)';" ondragleave="event.preventDefault(); this.style.borderColor='var(--pe-border)';" ondrop="event.preventDefault(); this.style.borderColor='var(--pe-border)'; document.getElementById('machineFrmImage').files = event.dataTransfer.files; document.getElementById('machineFrmImage').dispatchEvent(new Event('change'));">
                                <input type="file" id="machineFrmImage" accept="image/jpeg, image/png, image/webp" style="display: none;" onchange="if(this.files && this.files[0]) { const r = new FileReader(); r.onload = e => { const img = document.querySelector('#machineImagePreview img'); if(img) img.src = e.target.result; document.getElementById('machineImagePreview').style.display='block'; document.getElementById('machineImagePlaceholder').style.display='none'; }; r.readAsDataURL(this.files[0]); }">
                                <div id="machineImagePlaceholder">
                                    <i class="fas fa-cloud-upload-alt fa-3x mb-2" style="color: var(--pe-text-muted);"></i>
                                    <p class="mb-0 text-muted">Click or drag image to upload</p>
                                    <small class="text-muted">Supports JPG, PNG, WEBP</small>
                                </div>
                                <div id="machineImagePreview" style="display:none; position: relative;">
                                    <img src="" alt="Preview" style="max-height: 200px; max-width: 100%; object-fit: contain; border-radius: 4px;">
                                    <button type="button" class="btn btn-sm btn-danger position-absolute top-0 end-0 m-2" onclick="event.stopPropagation(); document.getElementById('machineFrmImage').value=''; document.getElementById('machineImagePreview').style.display='none'; document.getElementById('machineImagePlaceholder').style.display='block';"><i class="fas fa-times"></i></button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-12">
                        <div class="pe-form-group">
                            <label class="pe-form-label">Notes</label>
                            <textarea class="pe-form-textarea" id="machineFrmNotes" rows="3" placeholder="รายละเอียดเพิ่มเติม..."></textarea>
                        </div>
                    </div>
                </div>
            </div>
            <div class="modal-footer pe-d-flex pe-justify-between">
                <div class="pe-d-flex pe-gap-8">
                    <button type="button" class="pe-btn pe-btn-danger" id="machineDeleteBtn" onclick="MachineModule.deleteItem()" style="display:none;">
                        <i class="fas fa-trash-alt me-1"></i> Delete
                    </button>
                    <button type="button" class="pe-btn pe-btn-secondary" id="machineViewWOBtn" onclick="MachineModule.viewWorkOrders()" style="display:none;">
                        <i class="fas fa-tools me-1"></i> View Work Orders
                    </button>
                </div>
                <div class="pe-d-flex pe-gap-8">
                    <button type="button" class="pe-btn pe-btn-ghost" data-bs-dismiss="modal">Cancel</button>
                    <button type="button" class="pe-btn pe-btn-primary" id="machineSaveBtn" onclick="MachineModule.save()">
                        <i class="fas fa-save me-1"></i> Save Machine
                    </button>
                </div>
            </div>
        </div>
    </div>
</div>
