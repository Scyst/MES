<div class="modal" id="addParamModal" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content bg-dark text-white">
            <div class="modal-header">
                <h5 class="modal-title">Add Parameter</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <form id="addParamForm">
                    <div class="mb-3">
                        <label for="addParamLine" class="form-label">Line:</label>
                        <input type="text" id="addParamLine" name="line" class="form-control" placeholder="Enter Line" required>
                    </div>
                    <div class="mb-3">
                        <label for="addParamModel" class="form-label">Model:</label>
                        <input type="text" id="addParamModel" name="model" class="form-control" placeholder="Enter Model" required>
                    </div>
                    <div class="mb-3">
                        <label for="addParamPartNo" class="form-label">Part No.:</label>
                        <input type="text" id="addParamPartNo" name="part_no" class="form-control" placeholder="Enter Part No." required>
                    </div>
                    <div class="mb-3">
                        <label for="addParamSapNo" class="form-label">SAP No.:</label>
                        <input type="text" id="addParamSapNo" name="sap_no" class="form-control" placeholder="Enter SAP No. (optional)">
                    </div>
                    <div class="mb-3">
                        <label for="addParamPlannedOutput" class="form-label">Planned Output:</label>
                        <input type="number" id="addParamPlannedOutput" name="planned_output" class="form-control" placeholder="Enter Planned Output" required>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                <button type="submit" form="addParamForm" class="btn btn-primary">Add Parameter</button>
            </div>
        </div>
    </div>
</div>