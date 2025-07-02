<div class="modal" id="addPartModal" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content bg-dark text-white">
            <div class="modal-header">
                <h5 class="modal-title">Data Entry</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">

                <ul class="nav nav-tabs nav-fill" id="entryTab" role="tablist">
                    <li class="nav-item" role="presentation">
                        <button class="nav-link active" id="out-entry-tab" data-bs-toggle="tab" data-bs-target="#out-entry-pane" type="button" role="tab">OUT (บันทึกยอดผลิต)</button>
                    </li>
                    <li class="nav-item" role="presentation">
                        <button class="nav-link" id="in-entry-tab" data-bs-toggle="tab" data-bs-target="#in-entry-pane" type="button" role="tab">IN (บันทึกงานเข้าไลน์)</button>
                    </li>
                </ul>

                <div class="tab-content pt-3" id="entryTabContent">

                    <div class="tab-pane fade show active" id="out-entry-pane" role="tabpanel">
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
                             <div class="modal-footer pb-0 px-0">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                                <button type="submit" class="btn btn-primary">Submit Production</button>
                            </div>
                        </form>
                    </div>

                    <div class="tab-pane fade" id="in-entry-pane" role="tabpanel">
                       <form id="wipEntryForm">
                            <div class="mb-3">
                                <label for="wipLine" class="form-label">Line</label>
                                <input list="lineList" id="wipLine" name="line" class="form-control text-uppercase" required placeholder="Select or type line...">
                            </div>
                             <div class="mb-3">
                                <label for="wipPartNo" class="form-label">Part No.</label>
                                <input list="partList" id="wipPartNo" name="part_no" class="form-control text-uppercase" required placeholder="Select or type part no...">
                            </div>
                            <div class="mb-3">
                                <label for="wipLotNo" class="form-label">Lot No. (ถ้ามี)</label>
                                <input type="text" id="wipLotNo" name="lot_no" class="form-control text-uppercase" placeholder="Scan or type lot no...">
                            </div>
                            <div class="mb-3">
                                <label for="wipQuantityIn" class="form-label">จำนวนที่นำเข้า (Quantity In)</label>
                                <input type="number" id="wipQuantityIn" name="quantity_in" class="form-control" required>
                            </div>
                             <div class="mb-3">
                                <label for="wipRemark" class="form-label">หมายเหตุ (กรณีไม่มี Lot No.)</label>
                                <textarea id="wipRemark" name="remark" class="form-control" rows="3"></textarea>
                            </div>
                             <div class="modal-footer pb-0 px-0">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                                <button type="submit" class="btn btn-success">Submit WIP Entry</button>
                            </div>
                        </form>
                    </div>

                </div>
            </div>
            </div>
    </div>
</div>