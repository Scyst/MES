<div class="modal fade" id="manageBomModal" tabindex="-1" aria-labelledby="manageBomModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-lg modal-dialog-centered">
        <div class="modal-content bg-dark text-white">
            <div class="modal-header">
                <h5 class="modal-title" id="bomModalTitle">Manage Bill of Materials</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <h6>Components</h6>
                <div class="table-responsive mb-3" style="max-height: 300px;">
                    <table class="table table-dark table-striped table-sm">
                        <thead>
                            <tr>
                                <th>Component Part No.</th>
                                <th>Quantity Required</th>
                                <th class="text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="modalBomTableBody"></tbody>
                    </table>
                </div>

                <hr>
                <h6>Add New Component</h6>
                <form id="modalAddComponentForm" class="row g-2 align-items-end">
                    <input type="hidden" id="modalSelectedFgPartNo" name="fg_part_no">
                    <input type="hidden" id="modalSelectedFgLine" name="line">
                    <input type="hidden" id="modalSelectedFgModel" name="model">
                    <div class="col-md-6">
                        <label for="modalComponentPartNo" class="form-label">Component Part No.</label>
                        <input list="bomModalPartDatalist" class="form-control" id="modalComponentPartNo" name="component_part_no" required>
                        <datalist id="bomModalPartDatalist"></datalist>
                        </div>
                    <div class="col-md-4">
                        <label for="modalQuantityRequired" class="form-label">Quantity</label>
                        <input type="number" class="form-control" id="modalQuantityRequired" name="quantity_required" required>
                    </div>
                    <div class="col-md-2">
                        <button type="submit" class="btn btn-success w-100">Add</button>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                 <button type="button" class="btn btn-danger me-auto" id="deleteBomFromModalBtn">
                    <i class="fas fa-trash-alt"></i> Delete BOM
                </button>
                <button type="button" class="btn btn-primary" id="copyBomFromModalBtn">
                    <i class="fas fa-copy"></i> Copy BOM
                </button>
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
            </div>
        </div>
    </div>
</div>