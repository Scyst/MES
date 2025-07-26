<div class="modal fade" id="addParamModal" tabindex="-1" aria-labelledby="addParamModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content bg-dark text-white">
            <div class="modal-header">
                <h5 class="modal-title" id="addParamModalLabel">Add New Parameter</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <form id="addParamForm">
                    <div class="mb-3">
                        <label for="addParamLine" class="form-label">Line</label>
                        <input type="text" class="form-control" id="addParamLine" name="line" required>
                    </div>
                    <div class="mb-3">
                        <label for="addParamModel" class="form-label">Model</label>
                        <input type="text" class="form-control" id="addParamModel" name="model" required>
                    </div>
                    <div class="mb-3">
                        <label for="addParamPartNo" class="form-label">Part No.</label>
                        <input type="text" class="form-control" id="addParamPartNo" name="part_no" required>
                    </div>
                     <div class="mb-3">
                        <label for="addParamSapNo" class="form-label">SAP No. (Optional)</label>
                        <input type="text" class="form-control" id="addParamSapNo" name="sap_no">
                    </div>
                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <label for="addParamPlannedOutput" class="form-label">Planned Output (UPH)</label>
                            <input type="number" class="form-control" id="addParamPlannedOutput" name="planned_output" required min="0">
                        </div>
                        <div class="col-md-6 mb-3">
                            <label for="addParamPartValue" class="form-label">Part Value</label>
                            <input type="number" class="form-control" id="addParamPartValue" name="part_value" min="0" step="0.01" placeholder="0.00">
                        </div>
                    </div>
                    
                    <div class="mb-3">
                        <label for="addParamPartDesc" class="form-label">Part Description (Optional)</label>
                        <textarea class="form-control" id="addParamPartDesc" name="part_description" rows="2" placeholder="Enter a short description..."></textarea>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                <button type="submit" form="addParamForm" class="btn btn-success">Save</button>
            </div>
        </div>
    </div>
</div>