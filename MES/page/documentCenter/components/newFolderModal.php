<div class="modal fade" id="newFolderModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content border-0 shadow-lg" style="border-radius: 16px; overflow: hidden;">
            <form id="newFolderForm">
                <div class="modal-header border-bottom-0 pt-4 px-4 pb-0">
                    <h5 class="modal-title fw-bold" style="color: var(--text-primary); font-size: 1.25rem;">
                        <i class="fas fa-folder-plus text-primary me-2"></i>Create New Folder
                    </h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body px-4 py-4">
                    <div class="mb-2">
                        <label for="newFolderName" class="form-label fw-semibold text-dark" style="font-size: 0.9rem;">Folder Name <span class="text-danger">*</span></label>
                        <div class="input-group shadow-sm" style="border-radius: 8px;">
                            <span class="input-group-text bg-light text-secondary border-end-0" style="border-color: #CBD5E1;"><i class="fas fa-folder"></i></span>
                            <input type="text" class="form-control border-start-0 ps-0" id="newFolderName" required placeholder="e.g. Invoices" style="border-color: #CBD5E1;">
                        </div>
                    </div>
                </div>
                <div class="modal-footer border-top-0 px-4 pb-4 pt-0 bg-white">
                    <button type="button" class="btn btn-light border px-4 py-2 shadow-sm" data-bs-dismiss="modal" style="border-radius: 8px;">Cancel</button>
                    <button type="submit" class="btn btn-primary px-4 py-2 shadow-sm" style="border-radius: 8px; background-color: var(--primary-color); border: none;">
                        <i class="fas fa-plus me-1"></i> Create Folder
                    </button>
                </div>
            </form>
        </div>
    </div>
</div>
