<div class="modal fade" id="adjustStockModal" tabindex="-1" aria-labelledby="adjustStockModalLabel" aria-hidden="true">
    <div class="modal-dialog">
        <div class="modal-content ">
            <form id="adjustStockForm">
                <div class="modal-header">
                    <h5 class="modal-title" id="adjustStockModalLabel">Stock Adjustment</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <input type="hidden" id="adjust_part_no" name="part_no">
                    <input type="hidden" id="adjust_line" name="line">
                    <input type="hidden" id="adjust_model" name="model">

                    <div class="mb-3">
                        <label class="form-label">Part Number</label>
                        <input type="text" class="form-control" id="display_part_no" disabled>
                    </div>
                    
                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <label class="form-label">System Count</label>
                            <input type="number" class="form-control" id="adjust_system_count" name="system_count" readonly>
                        </div>
                        <div class="col-md-6 mb-3">
                            <label for="adjust_physical_count" class="form-label">Physical Count (ยอดนับจริง)</label>
                            <input type="number" class="form-control" id="adjust_physical_count" name="physical_count" required>
                        </div>
                    </div>

                    <div class="mb-3">
                        <label for="adjust_note" class="form-label">Note (หมายเหตุ)</label>
                        <textarea class="form-control" id="adjust_note" name="note" rows="2" placeholder="e.g., Monthly stock count difference"></textarea>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="submit" class="btn btn-warning">Save Adjustment</button>
                </div>
            </form>
        </div>
    </div>
</div>