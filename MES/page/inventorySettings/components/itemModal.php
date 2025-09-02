<div class="modal fade" id="itemModal" tabindex="-1" aria-labelledby="itemModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-lg">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="itemModalLabel">Edit Item</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <form id="itemForm">
                    <input type="hidden" id="item_id" name="item_id">
                    <div class="row">
                        <div class="col-md-6">
                            <div class="mb-3">
                                <label for="sap_no" class="form-label">SAP No.</label>
                                <input type="text" class="form-control" id="sap_no" name="sap_no" required>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="mb-3">
                                <label for="part_no" class="form-label">Part No.</label>
                                <input type="text" class="form-control" id="part_no" name="part_no" required>
                            </div>
                        </div>
                    </div>
                    <div class="mb-3">
                        <label for="part_description" class="form-label">Part Description</label>
                        <textarea class="form-control" id="part_description" name="part_description" rows="2"></textarea>
                    </div>

                    <hr>
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <h6 class="mb-0">Manufacturing Routes</h6>
                        <button type="button" class="btn btn-sm btn-success" id="modalAddNewRouteBtn">
                            <i class="fas fa-plus"></i> Add New Route
                        </button>
                    </div>
                    <div class="table-responsive" style="max-height: 200px;">
                        <table class="table table-sm table-hover">
                            <thead>
                                <tr>
                                    <th>Line</th>
                                    <th>Model</th>
                                    <th>Planned Output</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody id="modalRoutesTableBody">
                                </tbody>
                        </table>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-danger me-auto" id="deleteItemBtn">Delete Item</button>
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                <button type="submit" class="btn btn-primary" form="itemForm">Save Item</button>
            </div>
        </div>
    </div>
</div>