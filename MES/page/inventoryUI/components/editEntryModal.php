<div class="modal fade" id="editEntryModal" tabindex="-1" aria-labelledby="editEntryModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content bg-dark text-white">
            <form id="editEntryForm" data-action="editEntry">
                <div class="modal-header">
                    <h5 class="modal-title" id="editEntryModalLabel">Edit Entry (IN) / Receipt</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <input type="hidden" id="edit_entry_transaction_id" name="transaction_id">
                    
                    <div class="mb-3">
                        <label class="form-label">Item</label>
                        <input type="text" class="form-control form-control-readonly" id="edit_entry_item_display" readonly>
                    </div>

                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <label for="edit_entry_location_id" class="form-label">Receive To Location</label>
                            <select class="form-select" id="edit_entry_location_id" name="location_id" required></select>
                        </div>
                        <div class="col-md-6 mb-3">
                             <label for="edit_entry_quantity" class="form-label">Quantity (IN)</label>
                            <input type="number" class="form-control" id="edit_entry_quantity" name="quantity" min="0.0001" step="any" required>
                        </div>
                    </div>
                    
                    <div class="mb-3">
                        <label for="edit_entry_lot_no" class="form-label">Lot No. / Reference ID</label>
                        <input type="text" class="form-control" id="edit_entry_lot_no" name="lot_no">
                    </div>

                    <div class="mb-3">
                        <label for="edit_entry_notes" class="form-label">Remark / Notes</label>
                        <textarea class="form-control" id="edit_entry_notes" name="notes" rows="2"></textarea>
                    </div>

                </div>
                <div class="modal-footer">
                    <button type="submit" class="btn btn-primary">Save Changes</button>
                </div>
            </form>
        </div>
    </div>
</div>