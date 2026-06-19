<div class="modal fade" id="deleteConfirmationModal" tabindex="-1" aria-labelledby="deleteConfirmationModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content border-0 shadow-lg" style="border-radius: 16px; overflow: hidden;">
            <div class="modal-header border-bottom-0 pt-4 px-4 pb-0">
                <h5 class="modal-title fw-bold text-danger" id="deleteConfirmationModalLabel" style="font-size: 1.25rem;">
                    <i class="fas fa-exclamation-triangle me-2"></i>Confirm Deletion
                </h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body px-4 py-4">
                <div class="alert alert-danger mb-4" style="border-radius: 12px; border: none; background-color: #FEF2F2; color: #991B1B;">
                    <i class="fas fa-info-circle me-2"></i><span id="deleteMessage">Are you sure you want to delete this document? This action cannot be undone.</span>
                </div>
                
                <p class="text-dark fw-bold mb-2">Please re-enter your password to confirm:</p>
                <div class="mb-2">
                    <label for="deletePassword" class="form-label visually-hidden">Password</label>
                    <div class="input-group shadow-sm" style="border-radius: 8px;">
                        <span class="input-group-text bg-light text-secondary border-end-0" style="border-color: #CBD5E1;"><i class="fas fa-lock"></i></span>
                        <input type="password" class="form-control border-start-0 ps-0" id="deletePassword" placeholder="Enter your password" required autocomplete="new-password" style="border-color: #CBD5E1;">
                    </div>
                    <div class="invalid-feedback mt-2">
                        Password is required.
                    </div>
                </div>
            </div>
            <div class="modal-footer border-top-0 px-4 pb-4 pt-0 bg-white">
                <button type="button" class="btn btn-light border px-4 py-2 shadow-sm" data-bs-dismiss="modal" style="border-radius: 8px;">Cancel</button>
                <button type="button" class="btn btn-danger px-4 py-2 shadow-sm" id="confirmDeleteBtn" style="border-radius: 8px; border: none;">
                    <i class="fas fa-trash-alt me-1"></i> Delete Forever
                </button>
            </div>
        </div>
    </div>
</div>