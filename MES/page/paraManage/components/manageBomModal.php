<div class="modal fade" id="manageBomModal" tabindex="-1" aria-labelledby="manageBomModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-lg modal-dialog-centered">
        <div class="modal-content ">
            <div class="modal-header">
                <h5 class="modal-title" id="bomModalTitle">Manage Bill of Materials</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <h6>Components</h6>
                <div class="table-responsive mb-3" style="max-height: 300px;">
                    <table class="table  table-striped table-sm">
                        <thead>
                            <tr>
                                <th style="width: 30%;">Component Part No.</th>
                                <th style="width: 30%;">Part Description</th>
                                <th class="text-center" style="width: 20%;">Quantity Required</th>
                                <th class="text-center" style="width: 20%;">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="modalBomTableBody"></tbody>
                    </table>
                </div>

                <hr>
                <h6>Add New Component</h6>
                <form id="modalAddComponentForm" class="mt-3 border-top pt-3">
                    <h6 class="text-info">Add New Component</h6>
                    <input type="hidden" id="modalSelectedFgItemId" name="fg_item_id">
                    <input type="hidden" id="modalSelectedFgLine" name="line">
                    <input type="hidden" id="modalSelectedFgModel" name="model">

                    <div class="row align-items-end">
                        <div class="col-md-7 mb-3 position-relative">
                            <label for="modalComponentSearch" class="form-label">Search Component (SAP/Part No.)</label>
                            <input type="text" id="modalComponentSearch" class="form-control" autocomplete="off" required>
                            <input type="hidden" id="modalComponentItemId" name="component_item_id">
                        </div>

                        <div class="col-md-3 mb-3">
                            <label for="modalQuantityRequired" class="form-label">Quantity</label>
                            <input type="number" id="modalQuantityRequired" name="quantity_required" class="form-control" min="1" required>
                        </div>
                        
                        <div class="col-md-2 mb-3">
                            <button type="submit" class="btn btn-success w-100">Add</button>
                        </div>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                 <button type="button" class="btn btn-danger me-auto" id="deleteBomFromModalBtn">
                    <i class="fas fa-trash-alt"></i> Delete BOM
                </button>
                <button type="button" class="btn btn-info me-auto" id="exportComponentsBtn">
                    <i class="fas fa-file-excel"></i> Export Components
                </button>
                <button type="button" class="btn btn-primary" id="copyBomFromModalBtn">
                    <i class="fas fa-copy"></i> Copy BOM
                </button>
            </div>
        </div>
    </div>
</div>