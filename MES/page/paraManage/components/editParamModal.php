<div class="modal fade" id="editParamModal" tabindex="-1" aria-labelledby="editParamModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content bg-dark text-white">
            <form id="editParamForm">
                <div class="modal-header">
                    <h5 class="modal-title" id="editParamModalLabel">Edit Production Parameter</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <input type="hidden" id="edit_id" name="id">
                    <input type="hidden" id="edit_item_id" name="item_id">

                    <h6 class="text-info">1. Linked Item Master</h6>
                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <label class="form-label">SAP No.</label>
                            <input type="text" class="form-control form-control-readonly" id="edit_sap_no" name="sap_no" readonly>
                        </div>
                        <div class="col-md-6 mb-3">
                            <label class="form-label">Part No.</label>
                            <input type="text" class="form-control form-control-readonly" id="edit_part_no" name="part_no" readonly>
                        </div>
                    </div>

                    <div class="mb-3">
                        <label class="form-label">Part Description</label>
                        <textarea class="form-control form-control-readonly" id="edit_part_description_display" rows="2" readonly></textarea>
                    </div>
                    
                    <hr>

                    <h6 class="text-info">2. Production Parameters</h6>
                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <label for="edit_line" class="form-label">Line</label>
                            <input list="lineDatalist" class="form-control" id="edit_line" name="line" required>
                        </div>
                        <div class="col-md-6 mb-3">
                            <label for="edit_model" class="form-label">Model</label>
                            <input list="modelDatalist" class="form-control" id="edit_model" name="model" required>
                        </div>
                    </div>

                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <label for="edit_planned_output" class="form-label">Planned Output (pcs/hr)</label>
                            <input type="number" class="form-control" id="edit_planned_output" name="planned_output" min="0" step="1" required>
                        </div>
                        <div class="col-md-6 mb-3">
                             <label for="edit_part_value" class="form-label">Part Value (Optional)</label>
                            <input type="number" class="form-control" id="edit_part_value" name="part_value" min="0" step="any" placeholder="0.00">
                        </div>
                    </div>
                    
                    <div class="mb-3">
                        <label for="edit_part_description" class="form-label">Part Description (Override)</label>
                        <textarea class="form-control" id="edit_part_description" name="part_description" rows="2" placeholder="Leave blank to use default from Item Master"></textarea>
                    </div>

                </div>
                <div class="modal-footer">
                    <div class="me-auto">
                        <button type="button" class="btn btn-danger" id="deleteFromModalBtn">Delete</button>
                        <button type="button" class="btn btn-info" id="variantsFromModalBtn">Create Variants</button>
                    </div>
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    <button type="submit" class="btn btn-primary">Save Changes</button>
                </div>
            </form>
        </div>
    </div>
</div>