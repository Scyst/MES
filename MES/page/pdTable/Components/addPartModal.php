<div class="modal fade" id="addPartModal" tabindex="-1" aria-labelledby="addPartModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content bg-dark text-white">
            <form id="addPartForm" data-action="addPart">
                <div class="modal-header">
                    <h5 class="modal-title" id="addPartModalLabel">Add New Production (OUT)</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    
                    <div class="mb-3 position-relative">
                        <label for="out_item_search" class="form-label">Search Item Produced (SAP No. / Part No. / Description)</label>
                        <input type="text" class="form-control" id="out_item_search" name="item_search" autocomplete="off" required>
                        <input type="hidden" id="out_item_id" name="item_id">
                    </div>

                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <label for="out_location_id" class="form-label">Production Location</label>
                            <select class="form-select" id="out_location_id" name="location_id" required></select>
                        </div>
                        <div class="col-md-6 mb-3">
                            <label for="out_lot_no" class="form-label">Lot No. (Optional)</label>
                            <input type="text" class="form-control" id="out_lot_no" name="lot_no">
                        </div>
                    </div>

                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <label for="out_quantity" class="form-label">Quantity</label>
                            <input type="number" class="form-control" id="out_quantity" name="quantity" min="0.0001" step="any" required>
                        </div>
                        <div class="col-md-6 mb-3">
                            <label for="out_count_type" class="form-label">Count Type</label>
                            <select id="out_count_type" name="count_type" class="form-select" required>
                                <option value="FG">FG (Finished Good)</option>
                                <option value="NG">NG</option>
                                <option value="SCRAP">SCRAP</option>
                                <option value="REWORK">REWORK</option>
                            </select>
                        </div>
                    </div>

                     <div class="row">
                        <div class="col-md-6 mb-3">
                            <label for="out_start_time" class="form-label">Start Time</label>
                            <input type="time" id="out_start_time" name="start_time" step="1" class="form-control">
                        </div>
                        <div class="col-md-6 mb-3">
                            <label for="out_end_time" class="form-label">End Time</label>
                            <input type="time" id="out_end_time" name="end_time" step="1" class="form-control">
                        </div>
                    </div>

                    <div class="mb-3">
                        <label for="out_notes" class="form-label">Notes (Optional)</label>
                        <textarea class="form-control" id="out_notes" name="notes" rows="2"></textarea>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="submit" class="btn btn-primary">Submit Production</button>
                </div>
            </form>
        </div>
    </div>
</div>