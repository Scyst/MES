<div class="modal fade" id="createOrderModal" tabindex="-1">
    <div class="modal-dialog modal-lg" style="margin-top: 15vh; transition: margin-top 0.3s;">
        <div class="modal-content border-0 shadow-lg">
            <div class="modal-header">
                <h5 class="modal-title fw-bold"><i class="fas fa-plus-circle me-2"></i>Create New Order</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <form id="createOrderForm">
                    <div class="row g-3">
                        <div class="col-md-4">
                            <label class="form-label fw-bold small text-muted">PO Number <span class="text-danger">*</span></label>
                            <input type="text" class="form-control fw-bold text-primary" name="po_number" required>
                        </div>
                        <div class="col-md-4">
                            <label class="form-label fw-bold small text-muted">SKU <span class="text-danger">*</span></label>
                            <input type="text" class="form-control fw-bold" name="sku" required>
                        </div>
                        <div class="col-md-4">
                            <label class="form-label small text-muted">Order Date</label>
                            <input type="date" class="form-control" name="order_date" value="<?php echo date('Y-m-d'); ?>">
                        </div>

                        <div class="col-md-6">
                            <label class="form-label small text-muted">Description</label>
                            <input type="text" class="form-control" name="description">
                        </div>
                        <div class="col-md-3">
                            <label class="form-label small text-muted">Color</label>
                            <input type="text" class="form-control" name="color">
                        </div>
                        <div class="col-md-3">
                            <label class="form-label fw-bold small text-muted">Quantity</label>
                            <input type="number" class="form-control text-center fw-bold" name="quantity" value="0">
                        </div>

                        <div class="col-md-4">
                            <label class="form-label small text-muted">DC Location</label>
                            <input type="text" class="form-control" name="dc_location">
                        </div>
                        <div class="col-md-4">
                            <label class="form-label small text-muted">Loading Week</label>
                            <input type="text" class="form-control" name="loading_week" placeholder="e.g. 50.25">
                        </div>
                        <div class="col-md-4">
                            <label class="form-label small text-muted">Shipping Week</label>
                            <input type="text" class="form-control" name="shipping_week">
                        </div>
                        
                        <div class="col-12">
                            <label class="form-label small text-muted">Remark</label>
                            <textarea class="form-control" name="remark" rows="2"></textarea>
                        </div>
                    </div>
                </form>
            </div>
            <div class="modal-footer bg-light">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-primary fw-bold px-4" onclick="submitCreateOrder()">
                    <i class="fas fa-save me-2"></i> Save Order
                </button>
            </div>
        </div>
    </div>
</div>