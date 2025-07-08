<div class="modal fade" id="createBomModal" tabindex="-1" aria-labelledby="createBomModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content bg-dark text-white">
            <div class="modal-header">
                <h5 class="modal-title" id="createBomModalLabel">Create New BOM - Step 1: Select FG</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                
                <form id="createBomForm">
                    <div class="mb-3">
                        <label for="createBomLine" class="form-label">Line</label>
                        <input list="lineDatalist" class="form-control" id="createBomLine" name="line" placeholder="Select or type Line...">
                    </div>
                    <div class="mb-3">
                        <label for="createBomModel" class="form-label">Model</label>
                        <input list="modelDatalist" class="form-control" id="createBomModel" name="model" placeholder="Select or type Model...">
                    </div>
                     <div class="mb-3">
                        <label for="createBomPartNo" class="form-label">Part No.</label>
                        <input list="partNoDatalist" class="form-control" id="createBomPartNo" name="part_no" placeholder="Select or type Part No...">
                    </div>

                    <div class="d-flex align-items-center my-3">
                        <hr class="flex-grow-1">
                        <span class="px-2 text-muted">OR</span>
                        <hr class="flex-grow-1">
                    </div>

                    <div class="mb-3">
                        <label for="createBomSapNo" class="form-label">SAP No.</label>
                        <input class="form-control" id="createBomSapNo" name="sap_no" placeholder="Enter SAP No...">
                    </div>

                    <datalist id="lineDatalist"></datalist>
                    <datalist id="modelDatalist"></datalist>
                    <datalist id="partNoDatalist"></datalist>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                <button type="submit" form="createBomForm" class="btn btn-primary">Next Step</button>
            </div>
        </div>
    </div>
</div>