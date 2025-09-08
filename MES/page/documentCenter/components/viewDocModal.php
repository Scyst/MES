<div class="modal fade" id="viewDocModal" tabindex="-1" aria-labelledby="viewDocModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-lg">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="viewDocModalLabel">Document Details</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <div id="document-details-content">
                    </div>

                <form id="editDocForm" style="display:none;">
                    <input type="hidden" id="editDocId">
                    <div class="mb-3">
                        <label for="editDocDescription" class="form-label">Description</label>
                        <input type="text" class="form-control" id="editDocDescription" required>
                    </div>
                    <div class="mb-3">
                        <label for="editDocCategory" class="form-label">Category</label>
                        <input type="text" class="form-control" id="editDocCategory" placeholder="e.g., Drawing/MachineA">
                    </div>
                    <button type="submit" class="btn btn-primary" id="saveEditDocBtn">Save Changes</button>
                    <button type="button" class="btn btn-secondary" id="cancelEditDocBtn">Cancel</button>
                </form>

            </div>
            <div class="modal-footer d-flex justify-content-between">
                <div>
                    <?php if ($canManage) : // $canManage มาจาก documentCenterUI.php ?>
                        <button type="button" class="btn btn-warning me-2" id="editDocBtn">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button type="button" class="btn btn-danger" id="deleteDocBtn">
                            <i class="fas fa-trash-alt"></i> Delete
                        </button>
                    <?php endif; ?>
                </div>
                <button type="button" class="btn btn-primary" id="viewDocBtn">
                    <i class="fas fa-external-link-alt"></i> View Document
                </button>
            </div>
        </div>
    </div>
</div>