<div class="modal fade" id="viewDocModal" tabindex="-1" aria-labelledby="viewDocModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-lg">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="viewDocModalLabel">Document Details</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <form id="editDocForm">
                <div class="modal-body">
                    <div class="mb-3">
                        <label class="form-label">File Name</label>
                        <p class="form-control-plaintext" id="viewDocFileName"></p>
                    </div>

                    <input type="hidden" id="editDocId">

                    <div class="mb-3">
                        <label for="editDocDescription" class="form-label">Description</label>
                        <input type="text" class="form-control" id="editDocDescription">
                    </div>

                    <div class="mb-3">
                        <label for="editDocCategory" class="form-label">Category</label>
                        <input type="text" class="form-control" id="editDocCategory" placeholder="e.g., Drawing/MachineA">
                    </div>

                     <dl class="row mt-4 fs-sm text-muted">
                        <dt class="col-sm-3">Uploaded By</dt>
                        <dd class="col-sm-9" id="viewDocUploadedBy"></dd>
                        <dt class="col-sm-3">Uploaded At</dt>
                        <dd class="col-sm-9" id="viewDocUploadedAt"></dd>
                    </dl>
                </div>
                <div class="modal-footer d-flex flex-column flex-sm-row justify-content-between gap-2 w-100">
                    <div class="w-100" style="flex: 1;">
                        <?php if ($canManage) : ?>
                            <button type="button" class="btn btn-outline-danger w-100 w-sm-auto" id="deleteDocBtn"> 
                                <i class="fas fa-trash-alt me-1"></i>Delete
                            </button>
                        <?php endif; ?>
                    </div>
                    <div class="d-flex flex-column flex-sm-row gap-2 w-100 justify-content-end" style="flex: 2;">
                        <div class="d-flex gap-2 w-100 w-sm-auto">
                            <button type="button" class="btn btn-primary flex-fill" id="viewDocBtn">
                                <i class="fas fa-external-link-alt me-1"></i> View
                            </button>
                            <button type="button" class="btn btn-info text-white flex-fill" id="downloadDocBtn">
                                <i class="fas fa-download me-1"></i> Download
                            </button>
                        </div>
                        <?php if ($canManage) : ?>
                            <button type="submit" class="btn btn-success w-100 w-sm-auto" id="saveEditDocBtn">
                                <i class="fas fa-save me-1"></i>Save
                            </button>
                        <?php endif; ?>
                    </div>
                </div>
            </form>
        </div>
    </div>
</div>