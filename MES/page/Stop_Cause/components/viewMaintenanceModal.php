<div class="modal fade" id="viewMaintenanceModal" tabindex="-1">
    <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content">
            <div class="modal-header bg-info text-white">
                <h5 class="modal-title"><i class="fas fa-file-alt me-2"></i>Maintenance Job Detail</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <div class="row mb-3">
                    <div class="col-md-6">
                        <label class="fw-bold text-muted">Machine / Line</label>
                        <div id="view_machine_line" class="fs-5"></div>
                    </div>
                    <div class="col-md-6 text-end">
                        <span id="view_status_badge" class="badge bg-secondary fs-6"></span>
                    </div>
                </div>

                <div class="card mb-3">
                    <div class="card-header bg-light fw-bold">Issue (อาการที่แจ้ง)</div>
                    <div class="card-body">
                        <p id="view_issue" class="mb-0"></p>
                        <small class="text-muted">Requested by: <span id="view_requested_by"></span> on <span id="view_request_date"></span></small>
                    </div>
                </div>

                <div id="view_completion_section" class="d-none">
                    <div class="card mb-3 border-success">
                        <div class="card-header bg-success text-white fw-bold">Resolution (การแก้ไข)</div>
                        <div class="card-body">
                            <div class="row mb-2">
                                <div class="col-6"><small class="text-muted">Started:</small> <br><span id="view_started_at" class="fw-bold"></span></div>
                                <div class="col-6"><small class="text-muted">Finished:</small> <br><span id="view_resolved_at" class="fw-bold"></span></div>
                            </div>
                            <hr>
                            <label class="fw-bold">Technician Note:</label>
                            <p id="view_tech_note" class="mb-2"></p>
                            
                            <label class="fw-bold">Spare Parts:</label>
                            <p id="view_spare_parts" class="mb-0 text-primary"></p>

                            <div class="mt-2 text-end">
                                <small class="text-muted">Resolved by: <span id="view_resolved_by"></span></small>
                            </div>
                        </div>
                    </div>

                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <label class="fw-bold mb-2">Before Repair</label>
                            <div class="border rounded p-1 text-center bg-light" style="min-height: 200px; display: flex; align-items: center; justify-content: center;">
                                <img id="view_photo_before" src="" class="img-fluid rounded" style="max-height: 300px; display: none;">
                                <span id="no_photo_before" class="text-muted">No Image</span>
                            </div>
                        </div>
                        <div class="col-md-6 mb-3">
                            <label class="fw-bold mb-2">After Repair</label>
                            <div class="border rounded p-1 text-center bg-light" style="min-height: 200px; display: flex; align-items: center; justify-content: center;">
                                <img id="view_photo_after" src="" class="img-fluid rounded" style="max-height: 300px; display: none;">
                                <span id="no_photo_after" class="text-muted">No Image</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="modal-footer">
                <button id="btn_resend_email" type="button" class="btn btn-outline-dark d-none" onclick="">
                    <i class="fas fa-envelope me-1"></i> Resend Email
                </button>

                <a id="btn_print_job" href="#" target="_blank" class="btn btn-primary">
                    <i class="fas fa-print me-1"></i> Print Job Order
                </a>
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
            </div>
        </div>
    </div>
</div>