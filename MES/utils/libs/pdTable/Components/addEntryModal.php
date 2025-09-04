<div class="modal" id="addEntryModal" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content ">
            <div class="modal-header">
                <h5 class="modal-title">Add New (IN)</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <form id="wipEntryForm">
                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <label for="wipLine" class="form-label">Line</label>
                            <input list="lineList" id="wipLine" name="line" class="form-control text-uppercase" required placeholder="Select or type line...">
                        </div>
                        <div class="col-md-6 mb-3">
                            <label for="wipModel" class="form-label">Model</label>
                            <input list="modelList" id="wipModel" name="model" class="form-control text-uppercase" required placeholder="Select or type model...">
                        </div>
                    </div>

                    <div class="mb-3">
                       <label for="wipPartNo" class="form-label">Part No.</label>
                       <input list="partNoList" id="wipPartNo" name="part_no" class="form-control text-uppercase" required placeholder="Select or type part no...">
                    </div>

                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <label for="wipLotNo" class="form-label">Lot No. (ถ้ามี)</label>
                            <input list="lotList" type="text" id="wipLotNo" name="lot_no" class="form-control text-uppercase" placeholder="Scan or type lot no...">
                        </div>
                        <div class="col-md-6 mb-3">
                            <label for="wipQuantityIn" class="form-label">Quantity In</label>
                            <input type="number" id="wipQuantityIn" name="quantity_in" class="form-control" required>
                        </div>
                    </div>
                    
                    <div class="mb-3">
                        <label for="wipRemark" class="form-label">Remark</label>
                        <textarea id="wipRemark" name="remark" class="form-control" rows="2"></textarea>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                <button type="submit" form="wipEntryForm" class="btn btn-success">Submit WIP Entry</button>
            </div>
        </div>
    </div>
</div>