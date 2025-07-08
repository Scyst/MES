<div class="modal" id="editEntryModal" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content bg-dark text-white">
            <div class="modal-header">
                <h5 class="modal-title">Edit Entry</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <form id="editWipEntryForm">
                    <input type="hidden" name="entry_id" id="edit_entry_id">
                    
                    <div class="mb-3">
                        <label for="edit_entry_time" class="form-label">Entry Timestamp</label>
                        <input type="datetime-local" id="edit_entry_time" name="entry_time" class="form-control" required>
                    </div>
                    <div class="mb-3">
                        <label for="edit_wipLine" class="form-label">Line</label>
                        <input list="lineList" id="edit_wipLine" name="line" class="form-control text-uppercase" required>
                    </div>
                    <div class="mb-3">
                        <label for="edit_wipPartNo" class="form-label">Part No.</label>
                        <input list="partNoList" id="edit_wipPartNo" name="part_no" class="form-control text-uppercase" required>
                    </div>
                    <div class="mb-3">
                        <label for="edit_wipLotNo" class="form-label">Lot No.</label>
                        <input list="lotList" type="text" id="edit_wipLotNo" name="lot_no" class="form-control text-uppercase">
                    </div>
                    <div class="mb-3">
                        <label for="edit_wipQuantityIn" class="form-label">Quantity In</label>
                        <input type="number" id="edit_wipQuantityIn" name="quantity_in" class="form-control" required>
                    </div>
                    <div class="mb-3">
                        <label for="edit_wipRemark" class="form-label">Remark</label>
                        <textarea id="edit_wipRemark" name="remark" class="form-control" rows="2"></textarea>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                <button type="submit" form="editWipEntryForm" class="btn btn-primary">Update Entry</button>
            </div>
        </div>
    </div>
</div>