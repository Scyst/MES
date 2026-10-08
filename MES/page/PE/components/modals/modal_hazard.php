<!-- Hazard Detail Modal -->
<div class="modal fade" id="hazardModal" tabindex="-1" aria-labelledby="hazardModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="hazardModalLabel">
                    <i class="fas fa-exclamation-circle me-2 text-danger"></i><?php _e('pe.title_hazard_detail'); ?>
                </h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body p-0">
                <div class="p-3 border-bottom bg-light">
                    <h5 class="fw-bold text-danger mb-1" id="hazModalTitle">--</h5>
                    <div class="d-flex justify-content-between align-items-center">
                        <span class="badge bg-secondary" id="hazModalWo">--</span>
                        <small class="text-muted" id="hazModalTime">--</small>
                    </div>
                </div>
                
                <div class="p-3">
                    <div class="mb-3">
                        <div class="small text-muted fw-bold mb-1"><?php _e('pe.lbl_machine'); ?></div>
                        <div class="pe-kpi-value fs-5" id="hazModalMachine">--</div>
                    </div>
                    <div class="mb-3">
                        <div class="small text-muted fw-bold mb-1"><?php _e('pe.lbl_reported_by'); ?></div>
                        <div><i class="fas fa-user-circle me-1"></i> <span id="hazModalReporter">--</span></div>
                    </div>
                    <div class="mb-3">
                        <div class="small text-muted fw-bold mb-1"><?php _e('pe.lbl_additional_details'); ?></div>
                        <div class="p-2 bg-light rounded border" id="hazModalDetail" style="min-height: 60px;">--</div>
                    </div>
                    <div id="hazModalImageContainer">
                        <div class="small text-muted fw-bold mb-2"><?php _e('pe.lbl_attached_image'); ?></div>
                        <img id="hazModalImage" src="" alt="Hazard Image" class="img-fluid rounded border" style="display: none; width: 100%; max-height: 250px; object-fit: contain;">
                        <div id="hazModalNoImage" class="bg-light rounded border d-flex flex-column align-items-center justify-content-center text-muted" style="height: 150px;">
                            <i class="fas fa-image fa-2x mb-2 opacity-50"></i>
                            <small><?php _e('pe.txt_no_image'); ?></small>
                        </div>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal"><?php _e('pe.btn_close'); ?></button>
            </div>
        </div>
    </div>
</div>
