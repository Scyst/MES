<div class="modal fade" id="adjustStockModal" tabindex="-1" aria-labelledby="adjustStockModalLabel" aria-hidden="true">
    <div class="modal-dialog">
        <div class="modal-content ">
            <form id="adjustStockForm">
                <div class="modal-header">
                    <h5 class="modal-title" id="adjustStockModalLabel">Quick Stock Adjustment</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <input type="hidden" id="adjust_item_id" name="item_id">
                    <input type="hidden" id="adjust_location_id" name="location_id">

                    <div class="mb-3">
                        <label class="form-label">Item</label>
                        <input type="text" id="adjust_item_display" class="form-control" disabled>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Location</label>
                        <input type="text" id="adjust_location_display" class="form-control" disabled>
                    </div>
                    <div class="row">
                        <div class="col-6">
                            <label class="form-label">Current On-Hand</label>
                            <input type="text" id="adjust_current_onhand" class="form-control" disabled>
                        </div>
                        <div class="col-6">
                            <label for="adjust_physical_count" class="form-label">New Physical Count</label>
                            <input type="number" class="form-control" id="adjust_physical_count" name="physical_count" required>
                        </div>
                    </div>
                     <div class="mb-3 mt-3">
                        <label for="adjust_notes" class="form-label">Reason / Notes</label>
                        <textarea class="form-control" id="adjust_notes" name="notes" rows="2"></textarea>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    <button type="submit" class="btn btn-warning">Save Adjustment</button>
                </div>
            </form>
        </div>
    </div>
</div>