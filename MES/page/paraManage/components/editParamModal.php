<div class="modal fade" id="editParamModal" tabindex="-1" aria-labelledby="editParamModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-lg modal-dialog-centered"> 
    <div class="modal-content bg-dark text-white">
            <form id="editParamForm">
                <div class="modal-header">
                    <h5 class="modal-title" id="editParamModalLabel">Edit Parameter</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <input type="hidden" id="edit_id" name="id">
                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <label for="edit_line" class="form-label">Line</label>
                            <input type="text" class="form-control" id="edit_line" name="line" required>
                        </div>
                        <div class="col-md-6 mb-3">
                            <label for="edit_model" class="form-label">Model</label>
                            <input type="text" class="form-control" id="edit_model" name="model" required>
                        </div>
                        <div class="col-md-6 mb-3">
                            <label for="edit_part_no" class="form-label">Part No.</label>
                            <input type="text" class="form-control" id="edit_part_no" name="part_no" required>
                        </div>
                        <div class="col-md-6 mb-3">
                            <label for="edit_sap_no" class="form-label">SAP No.</label>
                            <input type="text" class="form-control" id="edit_sap_no" name="sap_no">
                        </div>
                        <div class="col-md-12 mb-3">
                            <label for="edit_part_description" class="form-label">Part Description</label>
                            <input type="text" class="form-control" id="edit_part_description" name="part_description">
                        </div>
                        <div class="col-md-6 mb-3">
                            <label for="edit_planned_output" class="form-label">Planned Output (pcs/hr)</label>
                            <input type="number" class="form-control" id="edit_planned_output" name="planned_output" required>
                        </div>
                        <div class="col-md-6 mb-3">
                            <label for="edit_part_value" class="form-label">Part Value</label>
                            <input type="number" step="0.01" class="form-control" id="edit_part_value" name="part_value">
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-danger me-auto" id="deleteFromModalBtn">
                        <i class="fas fa-trash-alt"></i> Delete
                    </button>
                    <button type="button" class="btn btn-info" id="variantsFromModalBtn">
                        <i class="fas fa-plus-square"></i> Create Variants
                    </button>
                    
                    <button type="submit" class="btn btn-primary">Save Changes</button>
                </div>
            </form>
        </div>
    </div>
</div>