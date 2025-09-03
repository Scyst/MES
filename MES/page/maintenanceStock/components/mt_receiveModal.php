<div class="modal fade" id="mt_receiveModal" tabindex="-1" aria-labelledby="mt_receiveModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
            <form id="mt_receiveForm" autocomplete="off">
                <div class="modal-header">
                    <h5 class="modal-title" id="mt_receiveModalLabel">Receive Spare Part (IN)</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <input type="hidden" name="transaction_type" value="RECEIPT">
                    <input type="hidden" id="receive_item_id" name="item_id">

                    <div class="mb-3 position-relative">
                        <label for="receive_item_search" class="form-label">Search Item (Code/Name) <span class="text-danger">*</span></label>
                        <input type="text" class="form-control" id="receive_item_search" required>
                    </div>
                    <div class="mb-3">
                        <label for="receive_location_id" class="form-label">To Location <span class="text-danger">*</span></label>
                        <select class="form-select" id="receive_location_id" name="location_id" required></select>
                    </div>
                    <div class="mb-3">
                        <label for="receive_quantity" class="form-label">Quantity <span class="text-danger">*</span></label>
                        <input type="number" class="form-control" id="receive_quantity" name="quantity" min="0.0001" step="any" required>
                    </div>
                    <div class="mb-3">
                        <label for="receive_notes" class="form-label">Notes / Reference</label>
                        <input type="text" class="form-control" id="receive_notes" name="notes">
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                    <button type="submit" class="btn btn-success">Receive Stock</button>
                </div>
            </form>
        </div>
    </div>
</div>