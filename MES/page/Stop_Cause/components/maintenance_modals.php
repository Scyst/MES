<div class="modal fade" id="addMaintenanceModal" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content border-0 shadow-lg">
            <div class="modal-header border-bottom-0 pb-0">
                <h5 class="modal-title fw-bold text-dark">
                    <i class="fas fa-tools text-warning me-2"></i>New Request
                </h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body pt-3">
                <form id="addMaintenanceForm" enctype="multipart/form-data">
                    <div class="row g-3">
                        <div class="col-6">
                            <label class="form-label small fw-bold text-muted">Line</label>
                            <input list="lineListFilter" name="line" class="form-control" placeholder="Line..." required style="text-transform: uppercase;">
                        </div>
                        <div class="col-6">
                            <label class="form-label small fw-bold text-muted">Machine</label>
                            <input list="machineListFilter" name="machine" class="form-control" placeholder="Machine..." required>
                        </div>

                        <div class="col-6">
                            <label class="form-label small fw-bold text-muted">ผู้แจ้งซ่อม (Requester)</label>
                            <input type="text" name="request_by" class="form-control" placeholder="ชื่อผู้แจ้ง...">
                        </div>
                        <div class="col-6">
                            <label class="form-label small fw-bold text-muted">ผู้ปิดงาน (Resolver)</label>
                            <input type="text" name="resolved_by" class="form-control" placeholder="ชื่อช่าง/ผู้รับผิดชอบ...">
                        </div>
                        
                        <div class="col-12">
                            <label class="form-label small fw-bold text-muted">Job Type (ประเภทงาน)</label>
                            <select name="job_type" class="form-select form-select-sm" required>
                                <option value="Repair" selected>ซ่อมแซม (Repair)</option>
                                <option value="Development">พัฒนางาน (Development)</option>
                                <option value="Setup">ตั้งเครื่อง (Setup)</option>
                                <option value="PM">บำรุงรักษา (PM)</option>
                                <option value="Other">อื่นๆ (Other)</option>
                            </select>
                        </div>

                        <div class="col-12">
                            <label class="form-label small fw-bold text-muted">Priority</label>
                            <div class="d-flex flex-wrap justify-content-between bg-light p-2 rounded mt-1 px-3">
                                <div class="form-check mb-0">
                                    <input class="form-check-input" type="radio" name="priority" id="prioNormal" value="Normal" checked>
                                    <label class="form-check-label text-success fw-bold" for="prioNormal">Normal</label>
                                </div>
                                <div class="form-check mb-0">
                                    <input class="form-check-input" type="radio" name="priority" id="prioUrgent" value="Urgent">
                                    <label class="form-check-label text-warning fw-bold" for="prioUrgent">Urgent</label>
                                </div>
                                <div class="form-check mb-0">
                                    <input class="form-check-input" type="radio" name="priority" id="prioCritical" value="Critical">
                                    <label class="form-check-label text-danger fw-bold" for="prioCritical">Critical</label>
                                </div>
                            </div>
                        </div>

                        <div class="col-12">
                            <label class="form-label small fw-bold text-muted">Issue Description</label>
                            <textarea name="issue_description" class="form-control" rows="3" required placeholder="Describe the problem..."></textarea>
                        </div>
                        
                        <div class="col-12">
                            <label class="form-label small fw-bold text-muted">Photo (ถ่ายให้เห็นปัญหา)</label>
                            <input type="file" name="photo_before" class="form-control form-control-sm" accept="image/*" required>
                        </div>
                    </div>
                </form>
            </div>
            <div class="modal-footer border-top-0 pt-0">
                <button type="button" class="btn btn-light btn-sm" data-bs-dismiss="modal">Cancel</button>
                <button type="submit" form="addMaintenanceForm" class="btn btn-primary btn-sm fw-bold px-4">Submit</button>
            </div>
        </div>
    </div>
</div>

<div class="modal fade" id="viewMaintenanceModal" tabindex="-1">
    <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content border shadow rounded-3 bg-body">
            
            <div class="modal-header border-bottom py-3 align-items-start">
                <div class="flex-grow-1">
                    <h5 class="modal-title fw-semibold text-body font-monospace mb-1">Maintenance Job Detail</h5>
                    <span class="text-secondary small">Job No: <span id="view_job_id" class="text-body font-monospace" style="font-size: 1rem;">-</span></span>
                </div>
                
                <div class="me-3 pt-1">
                    <span id="view_status_badge" class="badge rounded-pill fw-normal text-uppercase px-3 py-2">-</span>
                </div>

                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>

            <div class="modal-body p-4">
                
                <div class="card border shadow-sm rounded-3 mb-4 bg-body">
                    <div class="card-header bg-body-tertiary fw-bold text-primary border-bottom pt-2 pb-2">
                        <i class="far fa-file-alt me-2"></i>ข้อมูลการแจ้งซ่อม (Request)
                    </div>
                    <div class="card-body">
                        
                        <div class="row g-4">
                            <div class="col-md-7">
                                <div class="mb-2 border-bottom pb-3">
                                    <h4 class="text-body mb-0 font-monospace" id="view_machine_title">-</h4>
                                    <div class="mt-2" style="font-size: 0.9rem;">
                                        <span class="text-secondary fw-bold">Line:</span> 
                                        <span id="view_line_subtitle" class="text-body me-3">-</span>

                                        <span class="text-secondary fw-bold">Priority:</span> 
                                        <span id="view_priority_text" class="text-body">-</span>
                                    </div>
                                    
                                    <div class="mt-2" style="font-size: 0.9rem;">
                                        <span class="text-secondary fw-bold">Job Type:</span> 
                                        <span id="view_job_type" class="text-info fw-bold">-</span>
                                    </div>
                                </div>

                                <label class="small text-secondary fw-bold mb-1">Issue Description:</label>
                                <div class="bg-body p-2 rounded mb-3">
                                    <p id="view_issue" class="mb-0 text-body" style="white-space: pre-wrap;">-</p>
                                </div>
                                
                                <div class="mt-auto" style="font-size: 0.85rem;">
                                    <div class="mb-1">
                                        <span class="text-secondary fw-bold">By:</span> 
                                        <span id="view_requested_by" class="text-body">-</span>
                                    </div>
                                    <div>
                                        <span class="text-secondary fw-bold">Time:</span> 
                                        <span id="view_request_date" class="text-body">-</span>
                                    </div>
                                </div>
                            </div>

                            <div class="col-md-5">
                                <div class="border rounded bg-body-tertiary d-flex align-items-center justify-content-center overflow-hidden position-relative h-100" style="min-height: 180px;">
                                    <img id="view_photo_before" src="" class="d-none w-100 h-100" style="object-fit: cover;">
                                    <div id="no_photo_before" class="text-center text-secondary small">
                                        <i class="fas fa-image fa-2x mb-1 opacity-25"></i><br>No Image
                                    </div>
                                    <span class="position-absolute top-0 end-0 badge bg-dark m-1 opacity-50 small">Before</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div id="view_completion_section" class="card border shadow-sm rounded-3 d-none bg-body">
                    <div class="card-header bg-body-tertiary fw-bold text-success pt-2 pb-2 border-bottom">
                        ผลการซ่อม (Resolution)
                    </div>
                    <div class="card-body pt-2">
                        
                        <div class="row g-4">
                            <div class="col-md-7">
                                <label class="small text-secondary fw-bold mb-1">Technician Note:</label>
                                <div class="bg-body p-2 rounded mb-3">
                                    <p id="view_tech_note" class="mb-0 text-body small" style="white-space: pre-wrap;">-</p>
                                </div>

                                <div class="mb-3">
                                    <label class="small text-secondary fw-bold mb-0">Spare Parts:</label>
                                    <div id="view_spare_parts" class="text-body font-monospace small ps-2">-</div>
                                </div>

                                <div class="pt-2 mt-2 border-top">
                                    <div class="row g-2" style="font-size: 0.85rem;">
                                        <div class="col-6">
                                            <span class="text-secondary fw-bold">Start:</span> 
                                            <span id="view_started_at" class="text-body">-</span>
                                        </div>
                                        <div class="col-6">
                                            <span class="text-secondary fw-bold">Finish:</span> 
                                            <span id="view_resolved_at" class="text-body">-</span>
                                        </div>
                                        <div class="col-12 mt-1">
                                            <span class="text-secondary fw-bold">Tech:</span> 
                                            <span id="view_resolved_by" class="text-body">-</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="col-md-5">
                                <div class="border rounded bg-body-tertiary d-flex align-items-center justify-content-center overflow-hidden position-relative h-100" style="min-height: 180px;">
                                    
                                    <img id="view_photo_after" src="" class="w-100 h-100" style="object-fit: cover; display: none;">
                                    
                                    <div id="no_photo_after" class="text-center text-secondary small">
                                        <i class="fas fa-image fa-2x mb-1 opacity-25"></i><br>Wait for Result
                                    </div>
                                    
                                    <span class="position-absolute top-0 end-0 badge bg-success m-1 opacity-75 small">After</span>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

            </div>
            
            <div class="modal-footer bg-body border-top pt-3 pb-4 px-4 justify-content-between">
                 <div id="action_buttons_completed" class="d-none d-flex gap-2">
                    <a id="btn_print_job" href="#" target="_blank" class="btn btn-sm btn-outline-secondary rounded-pill px-3 text-body border-secondary">
                        <i class="fas fa-print me-1"></i> Print
                    </a>
                    <button id="btn_resend_email" class="btn btn-sm btn-outline-secondary rounded-pill px-3 text-body border-secondary" title="Resend Email">
                        <i class="fas fa-envelope"></i>
                    </button>
                </div>
                
                <div class="d-flex gap-2 ms-auto">
                    <button type="button" class="btn btn-sm btn-secondary rounded-pill px-4" data-bs-dismiss="modal">Close</button>
                    <button id="btn_edit_job" class="btn btn-sm btn-warning rounded-pill px-4 shadow-sm d-none" onclick="">
                        <i class="fas fa-edit me-1"></i> Edit
                    </button>
                    <button id="btn_start_job" class="btn btn-sm btn-primary rounded-pill px-4 shadow-sm d-none" onclick="">Start Repair</button>
                    <button id="btn_complete_job" class="btn btn-sm btn-success rounded-pill px-4 shadow-sm d-none" onclick="">Complete Job</button>
                </div>
            </div>
        </div>
    </div>
</div>

<div class="modal fade" id="completeMaintenanceModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-lg modal-dialog-centered"> <div class="modal-content">
            <div class="modal-header bg-success text-white">
                <h5 class="modal-title"><i class="fas fa-check-circle me-2"></i>Complete Job (ปิดงานซ่อม)</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <form id="completeMaintenanceForm" enctype="multipart/form-data">
                    <input type="hidden" name="id" id="complete_req_id">
                    
                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <label class="form-label fw-bold">วันที่/เวลา เริ่มซ่อม</label>
                            <input type="datetime-local" name="started_at" class="form-control" required>
                        </div>
                        <div class="col-md-6 mb-3">
                            <label class="form-label fw-bold">วันที่/เวลา เสร็จสิ้น</label>
                            <input type="datetime-local" name="resolved_at" class="form-control" required>
                        </div>
                    </div>

                    <div class="mb-3">
                        <label class="form-label fw-bold">Work Detail (รายละเอียดการซ่อม)</label>
                        <textarea name="technician_note" class="form-control" rows="3" placeholder="อธิบายสิ่งที่ทำไป..." required></textarea>
                    </div>

                    <div class="mb-3">
                        <label class="form-label fw-bold">Spare Parts (รายการอะไหล่ที่ใช้)</label>
                        <textarea name="spare_parts_list" class="form-control" rows="2" placeholder="- สายไฟ 2 เมตร&#10;- เบรคเกอร์ 1 ตัว"></textarea>
                    </div>

                    <div class="row">
                        <div class="col-12 mb-3">
                            <label class="form-label fw-bold text-success">
                                <i class="fas fa-camera me-1"></i>หลังซ่อม (After)
                            </label>
                            <input type="file" name="photo_after" class="form-control" accept="image/*" required>
                            <div class="form-text">ถ่ายให้เห็นผลลัพธ์การซ่อม</div>
                        </div>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                <button type="submit" form="completeMaintenanceForm" class="btn btn-success">
                    <i class="fas fa-save me-1"></i> Save & Close Job
                </button>
            </div>
        </div>
    </div>
</div>

<div class="modal fade" id="editMaintenanceModal" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content border-0 shadow-lg">
            <div class="modal-header bg-warning border-bottom-0 pb-2">
                <h5 class="modal-title fw-bold text-dark">
                    <i class="fas fa-edit me-2"></i>Edit Request (แก้ไขข้อมูล)
                </h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body pt-3">
                <form id="editMaintenanceForm">
                    <input type="hidden" name="id" id="edit_req_id">
                    <div class="row g-3">
                        <div class="col-6">
                            <label class="form-label small fw-bold text-muted">Line</label>
                            <input list="lineListFilter" name="line" class="form-control" placeholder="Line..." required style="text-transform: uppercase;">
                        </div>
                        <div class="col-6">
                            <label class="form-label small fw-bold text-muted">Machine</label>
                            <input list="machineListFilter" name="machine" class="form-control" placeholder="Machine..." required>
                        </div>
                        
                        <div class="col-12">
                            <label class="form-label small fw-bold text-muted">Job Type (ประเภทงาน)</label>
                            <select name="job_type" class="form-select form-select-sm" required>
                                <option value="Repair">ซ่อมแซม (Repair)</option>
                                <option value="Development">พัฒนางาน (Development)</option>
                                <option value="Setup">ตั้งเครื่อง (Setup)</option>
                                <option value="PM">บำรุงรักษา (PM)</option>
                                <option value="Other">อื่นๆ (Other)</option>
                            </select>
                        </div>

                        <div class="col-12">
                            <label class="form-label small fw-bold text-muted">Priority</label>
                            <div class="d-flex flex-wrap justify-content-between bg-light p-2 rounded border mt-1 px-3">
                                <div class="form-check mb-0">
                                    <input class="form-check-input" type="radio" name="priority" id="editPrioNormal" value="Normal">
                                    <label class="form-check-label text-success fw-bold" for="editPrioNormal">Normal</label>
                                </div>
                                <div class="form-check mb-0">
                                    <input class="form-check-input" type="radio" name="priority" id="editPrioUrgent" value="Urgent">
                                    <label class="form-check-label text-warning fw-bold" for="editPrioUrgent">Urgent</label>
                                </div>
                                <div class="form-check mb-0">
                                    <input class="form-check-input" type="radio" name="priority" id="editPrioCritical" value="Critical">
                                    <label class="form-check-label text-danger fw-bold" for="editPrioCritical">Critical</label>
                                </div>
                            </div>
                        </div>

                        <div class="col-12">
                            <label class="form-label small fw-bold text-muted">Issue Description</label>
                            <textarea name="issue_description" class="form-control" rows="3" required placeholder="Describe the problem..."></textarea>
                        </div>
                    </div>
                </form>
            </div>
            <div class="modal-footer border-top-0 pt-0">
                <button type="button" class="btn btn-light btn-sm" data-bs-dismiss="modal">Cancel</button>
                <button type="submit" form="editMaintenanceForm" class="btn btn-warning btn-sm fw-bold px-4 text-dark">Save Changes</button>
            </div>
        </div>
    </div>
</div>