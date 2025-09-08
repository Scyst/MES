<div class="modal fade" id="viewDocModal" tabindex="-1" aria-labelledby="viewDocModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-lg">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="viewDocModalLabel">
                    <i class="fas fa-file-alt"></i> Document Details
                </h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <div id="document-details-content">
                    <p class="text-center">Loading details...</p>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                
                <?php if ($canManage): ?>
                <button type="button" class="btn btn-danger" id="deleteDocBtn">
                    <i class="fas fa-trash-alt"></i> Delete Document
                </button>
                <?php endif; ?>
                
                <button type="button" class="btn btn-primary" id="viewDocBtn">
                    <i class="fas fa-eye"></i> View / Download
                </button>
            </div>
        </div>
    </div>
</div>