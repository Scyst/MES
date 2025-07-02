<div class="modal" id="editParamModal" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content bg-dark text-white">
            <div class="modal-header">
                <h5 class="modal-title">Edit Parameter</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <form id="editParamForm">
                    <input type="hidden" name="id" id="edit_id">
                    <div class="mb-3">
                        <label for="edit_line" class="form-label">Line:</label>
                        <input type="text" id="edit_line" name="line" class="form-control" required>
                    </div>
                    <div class="mb-3">
                        <label for="edit_model" class="form-label">Model:</label>
                        <input type="text" id="edit_model" name="model" class="form-control" required>
                    </div>
                    <div class="mb-3">
                        <label for="edit_part_no" class="form-label">Part No.:</label>
                        <input type="text" id="edit_part_no" name="part_no" class="form-control" required>
                    </div>
                    <div class="mb-3">
                        <label for="edit_sap_no" class="form-label">SAP No.:</label>
                        <input type="text" id="edit_sap_no" name="sap_no" class="form-control">
                    </div>
                    <div class="mb-3">
                        <label for="edit_planned_output" class="form-label">Planned Output:</label>
                        <input type="number" id="edit_planned_output" name="planned_output" class="form-control" required>
                    </div>
                    <div class="mb-3">
                        <label for="edit_updated_at" class="form-label">Updated At:</label>
                        <input type="text" id="edit_updated_at" name="updated_at" class="form-control" readonly>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                <button type="submit" form="editParamForm" class="btn btn-primary">Update Parameter</button>
            </div>
        </div>
    </div>
</div>