<div class="modal fade" id="createBomModal" tabindex="-1" aria-labelledby="createBomModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content ">
            <div class="modal-header">
                <h5 class="modal-title" id="createBomModalLabel">Create New BOM - Step 1: Select Finished Good</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <form id="createBomForm">
                    <p class="text-muted">Search for a Finished Good (FG) item that does not have a BOM yet to start creating one.</p>
                    <div class="mb-3">
                        <label for="fg_item_search" class="form-label">Search for FG Item (SAP No. or Part No.)</label>
                        <div class="position-relative">
                            <input type="text" id="fg_item_search" class="form-control" autocomplete="off" placeholder="Type at least 2 characters...">
                            </div>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
            </div>
        </div>
    </div>
</div>