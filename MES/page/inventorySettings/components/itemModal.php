<div class="modal fade" id="itemModal" tabindex="-1" aria-labelledby="itemModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content bg-dark text-white">
            <form id="itemForm">
                <div class="modal-header">
                    <h5 class="modal-title" id="itemModalLabel">Add New Item</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <input type="hidden" id="item_id" name="item_id" value="0">
                    
                    <div class="mb-3">
                        <label for="sap_no" class="form-label">SAP No.</label>
                        <input type="text" class="form-control" id="sap_no" name="sap_no" required>
                    </div>

                    <div class="mb-3">
                        <label for="part_no" class="form-label">Part No.</label>
                        <input type="text" class="form-control" id="part_no" name="part_no" required>
                    </div>

                    <div class="mb-3">
                        <label for="part_description" class="form-label">Part Description</label>
                        <textarea class="form-control" id="part_description" name="part_description" rows="3"></textarea>
                    </div>

                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <label for="part_value" class="form-label">Part Value (Optional)</label>
                            <input type="number" class="form-control" id="part_value" name="part_value" min="0" step="any" placeholder="0.00">
                        </div>
                        
                        </div>

                </div>
                <div class="modal-footer">
                    <div class="me-auto">
                        <button type="button" class="btn btn-danger d-none" id="deleteItemBtn">Delete</button>
                        <button type="button" class="btn btn-info d-none" id="manageBomBtn">Manage BOM</button>
                    </div>
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    <button type="submit" class="btn btn-primary" id="saveItemBtn">Save Changes</button>
                </div>
            </form>
        </div>
    </div>
</div>