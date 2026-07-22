<!-- Modal: Item Master (Add/Edit) -->
<div class="modal fade" id="modalMtItem" data-bs-backdrop="static" tabindex="-1">
    <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <form id="formMtItem" class="modal-content pe-modal border-primary">
            <div class="modal-header">
                <h5 class="modal-title text-primary"><i class="fas fa-cog me-2"></i> Manage Item Master</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body p-4">
                <input type="hidden" name="item_id" id="mt_item_id">
                <div class="row g-3">
                    <div class="col-12 text-center mb-3">
                        <label class="form-label pe-text-xs fw-bold text-muted mb-2">Item Image</label>
                        <div class="d-flex justify-content-center">
                            <div id="mt_image_dropzone" class="border rounded position-relative overflow-hidden" style="width: 100%; max-width: 250px; border: 2px dashed var(--pe-primary) !important; background: #f8f9fa; cursor: pointer; transition: all 0.3s ease;">
                                <input type="file" id="mt_image" name="image" class="position-absolute w-100 h-100 top-0 start-0 opacity-0" accept="image/*" onchange="SparePartsModule.previewImage(this)" style="cursor: pointer; z-index: 2;">
                                
                                <div class="d-flex flex-column align-items-center justify-content-center p-2" style="min-height: 250px;">
                                    <div id="mt_image_placeholder" class="text-muted flex-column align-items-center" style="display: flex;">
                                        <div class="bg-white p-3 rounded-circle shadow-sm mb-3">
                                            <i class="fas fa-cloud-upload-alt fa-2x text-primary"></i>
                                        </div>
                                        <span class="fw-bold pe-text-sm text-dark">Drag & Drop Image</span>
                                        <span class="pe-text-xs text-muted mt-1">or click to browse</span>
                                    </div>
                                    <div id="mt_image_preview_container" style="display: none; position: relative; z-index: 3; width: 100%; height: 100%;">
                                        <img id="mt_image_preview" src="" alt="Item Image" class="rounded shadow-sm w-100" style="max-height: 250px; object-fit: contain;">
                                        <button type="button" class="btn btn-sm btn-danger position-absolute top-0 end-0 m-2 rounded-circle shadow" onclick="SparePartsModule.removeImage(event)" style="width:30px; height:30px; padding:0; display:flex; align-items:center; justify-content:center;">
                                            <i class="fas fa-times"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <label class="form-label pe-text-xs fw-bold">Item Code <span class="text-danger">*</span></label>
                        <input type="text" name="item_code" id="mt_item_code" class="form-control form-control-sm pe-input fw-bold" required>
                    </div>
                    <div class="col-md-8">
                        <label class="form-label pe-text-xs fw-bold">Item Name <span class="text-danger">*</span></label>
                        <input type="text" name="item_name" id="mt_item_name" class="form-control form-control-sm pe-input" required>
                    </div>
                    <div class="col-12">
                        <label class="form-label pe-text-xs fw-bold">Description / Spec</label>
                        <input type="text" name="description" id="mt_description" class="form-control form-control-sm pe-input">
                    </div>
                    <div class="col-md-6">
                        <label class="form-label pe-text-xs fw-bold">Supplier</label>
                        <input type="text" name="supplier" id="mt_supplier" class="form-control form-control-sm pe-input">
                    </div>
                    <div class="col-md-3">
                        <label class="form-label pe-text-xs fw-bold">Unit Price (฿)</label>
                        <input type="number" name="unit_price" id="mt_unit_price" class="form-control form-control-sm pe-input" step="0.01">
                    </div>
                    <div class="col-md-3">
                        <label class="form-label pe-text-xs fw-bold">UoM <span class="text-danger">*</span></label>
                        <select name="uom" id="mt_uom" class="form-select form-select-sm pe-input fw-bold" required>
                            <option value="PCS">PCS</option>
                            <option value="SET">SET</option>
                            <option value="M">Meters</option>
                            <option value="KG">KG</option>
                        </select>
                    </div>
                    <div class="col-md-6">
                        <label class="form-label pe-text-xs fw-bold">Min Stock (Alert)</label>
                        <input type="number" name="min_stock" id="mt_min_stock" class="form-control form-control-sm pe-input text-danger fw-bold" step="0.01">
                    </div>
                    <div class="col-md-6">
                        <label class="form-label pe-text-xs fw-bold">Max Stock</label>
                        <input type="number" name="max_stock" id="mt_max_stock" class="form-control form-control-sm pe-input text-success fw-bold" step="0.01">
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="pe-btn pe-btn-secondary" data-bs-dismiss="modal">Cancel</button>
                <button type="submit" class="pe-btn pe-btn-primary"><i class="fas fa-save"></i> Save Item</button>
            </div>
        </form>
    </div>
</div>
