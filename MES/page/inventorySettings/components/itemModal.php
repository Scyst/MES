<div class="modal fade" id="itemModal" tabindex="-1" aria-labelledby="itemModalLabel" aria-hidden="true" data-bs-backdrop="static">
    <div class="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="itemModalLabel">Edit Item and Routes</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <form id="itemAndRoutesForm">
                    <input type="hidden" id="item_id" name="item_id">

                    <h6><i class="fas fa-cube"></i> Item Details</h6>
                    <hr class="mt-1">
                    <div class="row g-3">
                        <div class="col-md-6">
                            <label for="sap_no" class="form-label">SAP No.</label>
                            <input type="text" class="form-control" id="sap_no" name="sap_no" required>
                        </div>
                        <div class="col-md-6">
                            <label for="part_no" class="form-label">Part No.</label>
                            <input type="text" class="form-control" id="part_no" name="part_no" required>
                        </div>
                        <div class="col-12">
                            <label for="part_description" class="form-label">Part Description</label>
                            <textarea class="form-control" id="part_description" name="part_description" rows="2"></textarea>
                        </div>
                        <div class="col-md-4">
                            <label for="planned_output" class="form-label">Default Planned Output</label>
                            <input type="number" class="form-control" id="planned_output" name="planned_output" required min="0">
                        </div>

                        <div class="col-md-4">
                            <label for="min_stock" class="form-label">Min Stock</label>
                            <input type="number" step="any" class="form-control" id="min_stock" name="min_stock" placeholder="0.00">
                        </div>
                        <div class="col-md-4">
                            <label for="max_stock" class="form-label">Max Stock</label>
                            <input type="number" step="any" class="form-control" id="max_stock" name="max_stock" placeholder="0.00">
                        </div>
                    </div>

                    <div class="d-flex justify-content-between align-items-center mt-4">
                        <h6 class="mb-0"><i class="fas fa-route"></i> Manufacturing Routes</h6>
                        <button type="button" class="btn btn-outline-primary btn-sm" id="modalAddNewRouteBtn">
                            <i class="fas fa-plus"></i> Add New Route
                        </button>
                    </div>
                    <hr class="mt-1">
                    <div class="table-responsive">
                        <table class="table table-sm table-bordered">
                            <thead class="table-light">
                                <tr>
                                    <th style="width: 35%;">Line</th>
                                    <th style="width: 35%;">Model</th>
                                    <th class="text-center">Planned Output</th>
                                    <th class="text-center" style="width: 100px;">Action</th>
                                </tr>
                            </thead>
                            <tbody id="modalRoutesTableBody">
                                </tbody>
                        </table>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-danger me-auto" id="deleteItemBtn"><i class="fas fa-trash-alt"></i> Delete Item</button>
                
                <button type="submit" class="btn btn-primary" form="itemAndRoutesForm"><i class="fas fa-save"></i> Save All Changes</button>
            </div>
        </div>
    </div>
</div>