<div class="modal" id="addPartModal" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content ">
            <div class="modal-header">
                <h5 class="modal-title">ADD New (OUT)</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <form id="addPartForm">
                    <div class="mb-3">
                        <label for="addPartLogDate" class="form-label">Log Date</label>
                        <input type="date" id="addPartLogDate" name="log_date" class="form-control" required>
                    </div>

                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <label for="addPartStartTime" class="form-label">Start Time</label>
                            <input type="time" id="addPartStartTime" name="start_time" step="1" class="form-control" required>
                        </div>
                        <div class="col-md-6 mb-3">
                            <label for="addPartEndTime" class="form-label">End Time</label>
                            <input type="time" id="addPartEndTime" name="end_time" step="1" class="form-control" required>
                        </div>
                    </div>
                    
                    <div class="row">
                        <div class="col-md-6 mb-3">
                           <label for="addPartLine" class="form-label">Line</label>
                           <input list="lineList" id="addPartLine" name="line" class="form-control text-uppercase" placeholder="Select or type Line" required>
                        </div>
                        <div class="col-md-6 mb-3">
                            <label for="addPartModel" class="form-label">Model</label>
                            <input list="addModelList" id="addPartModel" name="model" class="form-control text-uppercase" placeholder="Select or type Model" required>
                            <datalist id="addModelList"></datalist>
                        </div>
                    </div>

                    <div class="mb-3">
                        <label for="addPartPartNo" class="form-label">Part No.</label>
                        <div class="input-group">
                            <input list="addPartNoList" id="addPartPartNo" name="part_no" class="form-control text-uppercase" placeholder="Select or type part no..." required>
                            <span class="input-group-text" id="addPartNoValidationIcon"></span>
                        </div>
                        <datalist id="addPartNoList"></datalist>
                        <div id="addPartNoHelp" class="form-text"></div>
                    </div>

                    <div class="mb-3">
                        <label for="addPartLotNo" class="form-label">Base Lot No. (ค้นหาจาก Lot ที่ยังค้างใน WIP)</label>
                        <input list="activeLotList" id="addPartLotNo" name="lot_no" class="form-control text-uppercase" placeholder="ค้นหา Lot No. ที่ยังผลิตไม่เสร็จ..." required>
                        <datalist id="activeLotList"></datalist>
                    </div>

                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <label for="addPartCountValue" class="form-label">Quantity</label>
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
                <button type="submit" form="addPartForm" class="btn btn-primary">Submit Production</button>
            </div>
        </div>
    </div>
</div>