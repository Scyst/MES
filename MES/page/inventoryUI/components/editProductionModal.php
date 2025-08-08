<div class="modal fade" id="editProductionModal" tabindex="-1" aria-labelledby="editProductionModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content bg-dark text-white">
            <form id="editProductionForm" data-action="editProduction">
                <div class="modal-header">
                    <h5 class="modal-title" id="editProductionModalLabel">Edit Production (OUT)</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <input type="hidden" id="edit_production_transaction_id" name="transaction_id">

                    <div class="mb-3">
                        <label class="form-label">Item Produced</label>
                        <input type="text" class="form-control form-control-readonly" id="edit_production_item_display" readonly>
                    </div>

                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <label for="edit_production_location_id" class="form-label">Production Location</label>
                            <select class="form-select" id="edit_production_location_id" name="location_id" required></select>
                        </div>
                        <div class="col-md-6 mb-3">
                            <label for="edit_production_lot_no" class="form-label">Lot No.</label>
                            <input type="text" class="form-control" id="edit_production_lot_no" name="lot_no">
                        </div>
                    </div>

                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <label for="edit_production_quantity" class="form-label">Quantity</label>
                            <input type="number" class="form-control" id="edit_production_quantity" name="quantity" min="0.0001" step="any" required>
                        </div>
                        <div class="col-md-6 mb-3">
                            <label for="edit_production_count_type" class="form-label">Count Type</label>
                            <select id="edit_production_count_type" name="count_type" class="form-select" required>
                                <option value="FG">FG (Finished Good)</option>
                                <option value="NG">NG</option>
                                <option value="SCRAP">SCRAP</option>
                                <option value="REWORK">REWORK</option>
                            </select>
                        </div>
                    </div>

                    <div class="mb-3">
                        <label for="edit_production_notes" class="form-label">Notes</label>
                        <textarea class="form-control" id="edit_production_notes" name="notes" rows="2"></textarea>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="submit" class="btn btn-primary">Save Changes</button>
                </div>
            </form>
        </div>
    </div>
</div>