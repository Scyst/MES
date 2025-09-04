<div class="modal fade" id="mt_itemModal" tabindex="-1" aria-labelledby="mt_itemModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-lg modal-dialog-centered">
        <div class="modal-content">
            <form id="mt_itemForm" autocomplete="off">
                <div class="modal-header">
                    <h5 class="modal-title" id="mt_itemModalLabel">Add New Spare Part</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <input type="hidden" id="mt_item_id" name="item_id" value="0">

                    <div class="row g-3">
                        <div class="col-md-6">
                            <label for="mt_item_code" class="form-label">Item Code <span class="text-danger">*</span></label>
                            <input type="text" class="form-control" id="mt_item_code" name="item_code" required>
                        </div>
                        <div class="col-md-6">
                            <label for="mt_item_name" class="form-label">Item Name <span class="text-danger">*</span></label>
                            <input type="text" class="form-control" id="mt_item_name" name="item_name" required>
                        </div>
                        <div class="col-12">
                            <label for="mt_description" class="form-label">Description</label>
                            <textarea class="form-control" id="mt_description" name="description" rows="2"></textarea>
                        </div>
                        <div class="col-md-6">
                            <label for="mt_supplier" class="form-label">Supplier</label>
                            <input type="text" class="form-control" id="mt_supplier" name="supplier">
                        </div>
                        <div class="col-md-3">
                            <label for="mt_min_stock" class="form-label">Min Stock</label>
                            <input type="number" class="form-control" id="mt_min_stock" name="min_stock" value="0" min="0" step="any">
                        </div>
                        <div class="col-md-3">
                            <label for="mt_max_stock" class="form-label">Max Stock</label>
                            <input type="number" class="form-control" id="mt_max_stock" name="max_stock" value="0" min="0" step="any">
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-danger me-auto" id="mt_deleteItemBtn" style="display: none;">Deactivate Item</button>
                    <button type="button" class="btn btn-success me-auto" id="mt_restoreItemBtn" style="display: none;">Restore Item</button>
                    
                    <button type="submit" class="btn btn-primary">Save Changes</button>
                </div>
            </form>
        </div>
    </div>
</div>