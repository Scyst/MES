<div class="modal fade" id="editParamModal" tabindex="-1" aria-labelledby="editParamModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content bg-dark text-white">
            <div class="modal-header">
                <h5 class="modal-title" id="editParamModalLabel">Edit Parameter</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <form id="editParamForm">
                    <input type="hidden" id="edit_id" name="id">
                    <div class="mb-3">
                        <label for="edit_line" class="form-label">Line</label>
                        <input type="text" class="form-control" id="edit_line" name="line" required>
                    </div>
                    <div class="mb-3">
                        <label for="edit_model" class="form-label">Model</label>
                        <input type="text" class="form-control" id="edit_model" name="model" required>
                    </div>
                    <div class="mb-3">
                        <label for="edit_part_no" class="form-label">Part No.</label>
                        <input type="text" class="form-control" id="edit_part_no" name="part_no" required>
                    </div>
                    <div class="mb-3">
                        <label for="edit_sap_no" class="form-label">SAP No. (Optional)</label>
                        <input type="text" class="form-control" id="edit_sap_no" name="sap_no">
                    </div>
                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <label for="edit_planned_output" class="form-label">Planned Output (UPH)</label>
                            <input type="number" class="form-control" id="edit_planned_output" name="planned_output" required min="0">
                        </div>
                        <div class="col-md-6 mb-3">
                            <label for="edit_part_value" class="form-label">Part Value</label>
                            <input type="number" class="form-control" id="edit_part_value" name="part_value" min="0" step="0.01" placeholder="0.00">
                        </div>
                    </div>

                    <div class="mb-3">
                        <label for="edit_part_description" class="form-label">Part Description (Optional)</label>
                        <textarea class="form-control" id="edit_part_description" name="part_description" rows="2"></textarea>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                <button type="submit" form="editParamForm" class="btn btn-primary">Save Changes</button>
            </div>
        </div>
    </div>
</div>
