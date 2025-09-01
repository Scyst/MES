<div class="modal fade" id="addParamModal" tabindex="-1" aria-labelledby="addParamModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content ">
            <form id="addParamForm">
                <div class="modal-header">
                    <h5 class="modal-title" id="addParamModalLabel">Add New Production Parameter</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    
                    <div class="mb-3 position-relative">
                        <label for="param_item_search" class="form-label">1. Search Item from Master</label>
                        <input type="text" class="form-control" id="param_item_search" name="item_search" placeholder="Search by SAP No. or Part No." autocomplete="off" required>
                        <input type="hidden" id="param_item_id" name="item_id">
                    </div>

                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <label class="form-label">Selected SAP No.</label>
                            <input type="text" class="form-control form-control-readonly" id="param_sap_no" name="sap_no" readonly>
                        </div>
                        <div class="col-md-6 mb-3">
                            <label class="form-label">Selected Part No.</label>
                            <input type="text" class="form-control form-control-readonly" id="param_part_no" name="part_no" readonly>
                        </div>
                    </div>
                    
                    <div class="mb-3">
                        <label class="form-label">Part Description</label>
                        <textarea class="form-control form-control-readonly" id="param_part_description" rows="2" readonly></textarea>
                    </div>
                    
                    <hr>

                    <h6 class="text-info">2. Define Production Parameters</h6>
                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <label for="addParamLine" class="form-label">Line</label>
                            <input list="lineDatalist" class="form-control" id="addParamLine" name="line" required>
                        </div>
                        <div class="col-md-6 mb-3">
                            <label for="addParamModel" class="form-label">Model</label>
                            <input list="modelDatalist" class="form-control" id="addParamModel" name="model" required>
                        </div>
                    </div>

                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <label for="addParamPlannedOutput" class="form-label">Planned Output (pcs/hr)</label>
                            <input type="number" class="form-control" id="addParamPlannedOutput" name="planned_output" min="0" step="1" required>
                        </div>
                        <div class="col-md-6 mb-3">
                             <label for="addParamPartValue" class="form-label">Part Value (Optional)</label>
                            <input type="number" class="form-control" id="addParamPartValue" name="part_value" min="0" step="any" placeholder="0.00">
                        </div>
                    </div>
                    
                    <div class="mb-3">
                        <label for="addParamPartDescription" class="form-label">Part Description (Override)</label>
                        <textarea class="form-control" id="addParamPartDescription" name="part_description" rows="2" placeholder="Leave blank to use default from Item Master"></textarea>
                    </div>

                </div>
                <div class="modal-footer">
                    <button type="submit" class="btn btn-primary">Save Parameter</button>
                </div>
            </form>
        </div>
    </div>
</div>