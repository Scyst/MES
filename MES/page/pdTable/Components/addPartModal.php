<div class="modal" id="addPartModal" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content bg-dark text-white">
            <div class="modal-header">
                <h5 class="modal-title">Data Entry (OUT)</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <form id="addPartForm">
                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <label for="addPartLogDate" class="form-label">Log Date</label>
                            <input type="date" id="addPartLogDate" name="log_date" class="form-control" required>
                        </div>
                        <div class="col-md-6 mb-3">
                            <label for="addPartLogTime" class="form-label">Log Time</label>
                            <input type="time" id="addPartLogTime" name="log_time" step="1" class="form-control" required>
                        </div>
                    </div>
                    
                    <div class="mb-3">
                        <label for="addPartLine" class="form-label">Line</label>
                        <input list="lineList" id="addPartLine" name="line" class="form-control text-uppercase" placeholder="Select or type Line" required>
                    </div>
                    
                    <div class="mb-3">
                        <label for="addPartModel" class="form-label">Model</label>
                        <input list="modelList" id="addPartModel" name="model" class="form-control text-uppercase" placeholder="Select or type Model" required>
                    </div>
                    
                    <div class="mb-3">
                        <label for="addPartPartNo" class="form-label">Part No.</label>
                        <input list="partList" id="addPartPartNo" name="part_no" class="form-control text-uppercase" placeholder="Select or type Part No." required>
                    </div>
                    
                    <div class="mb-3">
                        <label for="add_lot_no" class="form-label">Lot No.</label>
                        <input type="text" name="lot_no" id="add_lot_no" class="form-control text-uppercase" placeholder="Scan or type Lot No. to record output">
                    </div>
                    
                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <label for="addPartCountValue" class="form-label">Count Value</label>
                            <input type="number" id="addPartCountValue" name="count_value" class="form-control" placeholder="Enter value" required>
                        </div>
                        <div class="col-md-6 mb-3">
                            <label for="addPartCountType" class="form-label">Count Type</label>
                            <select id="addPartCountType" name="count_type" class="form-select" required>
                                <option value="FG">FG</option>
                                <option value="NG">NG</option>
                                <option value="HOLD">HOLD</option>
                                <option value="REWORK">REWORK</option>
                                <option value="SCRAP">SCRAP</option>
                                <option value="ETC.">ETC.</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="mb-3">
                        <label for="addPartNote" class="form-label">Note</label>
                        <input type="text" id="addPartNote" name="note" class="form-control" placeholder="Optional note">
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                <button type="submit" form="addPartForm" class="btn btn-primary">Submit Production</button>
            </div>
        </div>
    </div>
</div>