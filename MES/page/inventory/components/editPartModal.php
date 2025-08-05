<div class="modal" id="editPartModal" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content bg-dark text-white">
            <div class="modal-header">
                <h5 class="modal-title">Edit Data</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <form id="editPartForm">
                    <input type="hidden" name="id" id="edit_id">

                    <div class="row">
                        <div class="mb-3">
                            <label for="edit_log_date" class="form-label">Log Date</label>
                            <input type="date" name="log_date" id="edit_log_date" class="form-control" required>
                        </div>
                        <div class="col-md-6 mb-3">
                            <label for="edit_start_time" class="form-label">Start Time</label>
                            <input type="time" name="start_time" id="edit_start_time" step="1" class="form-control" required>
                        </div>
                        <div class="col-md-6 mb-3">
                            <label for="edit_end_time" class="form-label">End Time</label>
                            <input type="time" name="end_time" id="edit_end_time" step="1" class="form-control" required>
                        </div>
                    </div>
                    
                    <div class="row">
                        <div class="col-md-6 mb-3">
                           <label for="edit_line" class="form-label">Line</label>
                           <input list="editLineList" name="line" id="edit_line" class="form-control" placeholder="Select or type Line" required>
                           <datalist id="editLineList"></datalist>
                        </div>
                        <div class="col-md-6 mb-3">
                            <label for="edit_model" class="form-label">Model</label>
                            <input list="editModelList" name="model" id="edit_model" class="form-control" placeholder="Select or type Model" required>
                            <datalist id="editModelList"></datalist>
                        </div>
                    </div>
                    
                    <div class="mb-3">
                        <label for="edit_part_no" class="form-label">Part No.</label>
                        <div class="input-group">
                            <input list="editPartNoList" name="part_no" id="edit_part_no" class="form-control" placeholder="Select or type Part No." required>
                            <span class="input-group-text" id="editPartNoValidationIcon"></span>
                        </div>
                        <datalist id="editPartNoList"></datalist>
                        <div id="editPartNoHelp" class="form-text"></div>
                    </div>
                    
                    <div class="mb-3">
                        <label for="edit_lot_no" class="form-label">Lot No.</label>
                        <input type="text" name="lot_no" id="edit_lot_no" class="form-control" placeholder="Lot No." readonly>
                    </div>

                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <label for="edit_count_value" class="form-label">Count Value</label>
                            <input type="number" name="count_value" id="edit_count_value" class="form-control" placeholder="Enter value" required>
                        </div>
                        <div class="col-md-6 mb-3">
                            <label for="edit_count_type" class="form-label">Count Type</label>
                            <select name="count_type" id="edit_count_type" class="form-select" required>
                                <option value="">-- Select Type --</option>
                                <option value="FG">FG</option>
                                <option value="NG">NG</option>
                                <option value="HOLD">HOLD</option>
                                <option value="REWORK">REWORK</option>
                                <option value="SCRAP">SCRAP</option>
                                <option value="BOM-ISSUE">BOM-ISSUE</option>
                                <option value="ETC.">ETC.</option>
                            </select>
                        </div>
                    </div>

                    <div class="mb-3">
                        <label for="edit_note" class="form-label">Note</label>
                        <input type="text" placeholder="Optional note" name="note" id="edit_note" class="form-control">
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                <button type="submit" form="editPartForm" class="btn btn-primary">Update</button>
            </div>
        </div>
    </div>
</div>