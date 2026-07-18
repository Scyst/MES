<div class="modal fade" id="reviseDocModal" tabindex="-1" aria-labelledby="reviseDocModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content border-0 shadow-lg" style="border-radius: 16px; overflow: hidden;">
            <div class="modal-header border-bottom-0 pt-4 px-4 pb-0">
                <h5 class="modal-title fw-bold" id="reviseDocModalLabel" style="color: var(--text-primary); font-size: 1.25rem;">
                    <i class="fas fa-sync-alt text-primary me-2"></i>Revise Document
                </h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <form id="reviseDocForm">
                <div class="modal-body px-4 py-4">
                    <input type="hidden" id="reviseDocId" name="document_id">
                    
                    <div class="bg-light rounded-3 p-3 mb-4 border" style="border-color: #CBD5E1;">
                        <span class="text-secondary small fw-semibold text-uppercase letter-spacing-1">Updating File:</span>
                        <h6 class="fw-bold mb-0 text-dark mt-1" id="reviseDocName" style="word-break: break-all;">FileName.pdf</h6>
                    </div>

                    <div class="mb-2">
                        <label for="reviseDocFile" class="form-label fw-semibold text-dark" style="font-size: 0.9rem;">Select New File</label>
                        <input class="form-control shadow-sm" type="file" id="reviseDocFile" name="doc_file" required accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg" style="border-radius: 8px; border-color: #CBD5E1;">
                        <div class="form-text text-secondary mt-2"><i class="fas fa-exclamation-circle text-warning me-1"></i>This will replace the existing file. Max size 20MB.</div>
                    </div>
                </div>
                <div class="modal-footer border-top-0 px-4 pb-4 pt-0 bg-white">
                    <button type="button" class="btn btn-light border px-4 py-2 shadow-sm" data-bs-dismiss="modal" style="border-radius: 8px;">Cancel</button>
                    <button type="submit" class="btn btn-primary fw-bold px-4 py-2 shadow-sm" id="reviseDocSubmitBtn" style="border-radius: 8px; background-color: var(--primary-color); border: none;">
                        <i class="fas fa-upload me-1"></i> Upload & Replace
                    </button>
                </div>
            </form>
        </div>
    </div>
</div>
