<div class="modal fade" id="viewDocModal" tabindex="-1" aria-labelledby="viewDocModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-lg">
        <div class="modal-content border-0 shadow-lg" style="border-radius: 16px; overflow: hidden;">
            <div class="modal-header border-bottom-0 pt-4 px-4 pb-0">
                <h5 class="modal-title fw-bold" id="viewDocModalLabel" style="color: var(--text-primary); font-size: 1.25rem;">
                    <i class="fas fa-file-alt text-primary me-2"></i>Document Details
                </h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <form id="editDocForm">
                <div class="modal-body px-4 py-4">
                    <!-- File Info Card -->
                    <div class="bg-light rounded-3 p-3 mb-4 border" style="border-color: #CBD5E1;">
                        <div class="row align-items-center">
                            <div class="col-auto">
                                <div class="bg-white rounded p-3 d-inline-block border shadow-sm text-primary">
                                    <i class="fas fa-file-invoice fa-2x"></i>
                                </div>
                            </div>
                            <div class="col">
                                <h6 class="fw-bold mb-1 text-dark" id="viewDocFileName" style="word-break: break-all;">FileName.pdf</h6>
                                <div class="d-flex flex-wrap gap-3 text-muted mt-2" style="font-size: 0.85rem;">
                                    <span><i class="fas fa-user-circle me-1"></i><span id="viewDocUploadedBy">User</span></span>
                                    <span><i class="far fa-clock me-1"></i><span id="viewDocUploadedAt">Time</span></span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <input type="hidden" id="editDocId">

                    <!-- Editable Fields -->
                    <div class="row g-3">
                        <div class="col-12">
                            <label for="editDocDescription" class="form-label fw-semibold text-dark" style="font-size: 0.9rem;">Description</label>
                            <textarea class="form-control bg-white" id="editDocDescription" rows="2" placeholder="Add a description for this document..." style="border-radius: 8px; border-color: #CBD5E1;"></textarea>
                        </div>
                        <div class="col-12">
                            <label for="editDocCategory" class="form-label fw-semibold text-dark" style="font-size: 0.9rem;">Category Path</label>
                            <div class="input-group shadow-sm" style="border-radius: 8px;">
                                <span class="input-group-text bg-light text-secondary border-end-0" style="border-color: #CBD5E1;"><i class="fas fa-folder"></i></span>
                                <input type="text" class="form-control border-start-0 ps-0" id="editDocCategory" placeholder="e.g., Drawing/MachineA" style="border-color: #CBD5E1;">
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer border-top-0 px-4 pb-4 pt-0 d-flex flex-wrap justify-content-between gap-3 bg-white">
                    <div>
                        <?php if ($canManage) : ?>
                            <button type="button" class="btn btn-outline-danger px-3 py-2 shadow-sm" id="deleteDocBtn" style="border-radius: 8px;"> 
                                <i class="fas fa-trash-alt me-1"></i>Delete File
                            </button>
                        <?php endif; ?>
                    </div>
                    <div class="d-flex flex-wrap gap-2">
                        <button type="button" class="btn btn-light border px-3 py-2 shadow-sm" id="viewDocBtn" style="border-radius: 8px;">
                            <i class="fas fa-external-link-alt me-1"></i> View
                        </button>
                        <button type="button" class="btn btn-info text-white px-3 py-2 shadow-sm" id="downloadDocBtn" style="border-radius: 8px; background-color: #0ea5e9; border: none;">
                            <i class="fas fa-download me-1"></i> Download
                        </button>
                        <?php if ($canManage) : ?>
                            <button type="submit" class="btn btn-primary px-4 py-2 shadow-sm" id="saveEditDocBtn" style="border-radius: 8px; background-color: var(--primary-color); border: none;">
                                <i class="fas fa-save me-1"></i>Save Changes
                            </button>
                        <?php endif; ?>
                    </div>
                </div>
            </form>
        </div>
    </div>
</div>