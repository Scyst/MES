<div class="modal fade" id="addEntryModal" tabindex="-1" aria-labelledby="addEntryModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content bg-dark text-white">
            <form id="addEntryForm" data-action="addEntry">
                <div class="modal-header">
                    <h5 class="modal-title" id="addEntryModalLabel">Add New Entry (IN) / Receipt</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    
                    <div class="mb-3 position-relative">
                        <label for="entry_item_search" class="form-label">Search Item (SAP No. / Part No. / Description)</label>
                        <input type="text" class="form-control" id="entry_item_search" name="item_search" autocomplete="off" required>
                        <input type="hidden" id="entry_item_id" name="item_id">
                    </div>

                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <label for="entry_location_id" class="form-label">Receive To Location</label>
                            <select class="form-select" id="entry_location_id" name="location_id" required></select>
                        </div>
                        <div class="col-md-6 mb-3">
                             <label for="entry_quantity_in" class="form-label">Quantity (IN)</label>
                            <input type="number" class="form-control" id="entry_quantity_in" name="quantity" min="0.0001" step="any" required>
                        </div>
                    </div>
                    
                    <div class="mb-3">
                        <label for="entry_lot_no" class="form-label">Lot No. / Reference ID (Optional)</label>
                        <input type="text" class="form-control" id="entry_lot_no" name="lot_no">
                    </div>

                    <div class="mb-3">
                        <label for="entry_remark" class="form-label">Remark / Notes (Optional)</label>
                        <textarea class="form-control" id="entry_remark" name="notes" rows="2"></textarea>
                    </div>

                </div>
                <div class="modal-footer">
                    <button type="submit" class="btn btn-primary">Add Entry</button>
                </div>
            </form>
        </div>
    </div>
</div>