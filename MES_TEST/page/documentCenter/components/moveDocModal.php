<div class="modal fade" id="moveDocModal" tabindex="-1" aria-labelledby="moveDocModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content border-0 shadow-lg" style="border-radius: 16px; overflow: hidden;">
            <div class="modal-header border-bottom-0 pt-4 px-4 pb-0">
                <h5 class="modal-title fw-bold" id="moveDocModalLabel" style="color: var(--text-primary); font-size: 1.25rem;">
                    <i class="fas fa-folder-open text-primary me-2"></i>Move Document
                </h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <form id="moveDocForm">
                <div class="modal-body px-4 py-4">
                    <input type="hidden" id="moveDocId" name="document_id">
                    
                    <div class="bg-light rounded-3 p-3 mb-4 border" style="border-color: #CBD5E1;">
                        <span class="text-secondary small fw-semibold text-uppercase letter-spacing-1">Moving File:</span>
                        <h6 class="fw-bold mb-0 text-dark mt-1" id="moveDocName" style="word-break: break-all;">FileName.pdf</h6>
                    </div>

                    <div class="mb-2">
                        <label for="moveDocCategory" class="form-label fw-semibold text-dark" style="font-size: 0.9rem;">New Category Path</label>
                        <div class="input-group shadow-sm" style="border-radius: 8px;">
                            <span class="input-group-text bg-light text-secondary border-end-0" style="border-color: #CBD5E1;"><i class="fas fa-sitemap"></i></span>
                            <input type="text" class="form-control border-start-0 ps-0" id="moveDocCategory" name="category" placeholder="e.g. HR/Policies" style="border-color: #CBD5E1;">
                        </div>
                        <div class="form-text text-secondary mt-2"><i class="fas fa-info-circle text-primary me-1"></i>Use slash (/) for sub-categories (e.g. Dept/Project)</div>
                    </div>
                </div>
                <div class="modal-footer border-top-0 px-4 pb-4 pt-0 bg-white">
                    <button type="button" class="btn btn-light border px-4 py-2 shadow-sm" data-bs-dismiss="modal" style="border-radius: 8px;">Cancel</button>
                    <button type="submit" class="btn btn-primary fw-bold px-4 py-2 shadow-sm" id="moveDocSubmitBtn" style="border-radius: 8px; background-color: var(--primary-color); border: none;">
                        <i class="fas fa-arrow-right me-1"></i> Move
                    </button>
                </div>
            </form>
        </div>
    </div>
</div>
