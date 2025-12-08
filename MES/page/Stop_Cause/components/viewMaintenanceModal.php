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
                    <button id="btn_start_job" class="btn btn-sm btn-primary rounded-pill px-4 shadow-sm d-none" onclick="">Start Repair</button>
                    <button id="btn_complete_job" class="btn btn-sm btn-success rounded-pill px-4 shadow-sm d-none" onclick="">Complete Job</button>
                </div>
            </div>
        </div>
    </div>
</div>