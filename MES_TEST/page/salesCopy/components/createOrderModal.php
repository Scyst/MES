<div class="modal fade" id="createOrderModal" tabindex="-1" aria-hidden="true" data-bs-backdrop="static">
    <div class="modal-dialog modal-lg modal-dialog-centered">
        <div class="modal-content border-0 shadow-lg">
            
            <div class="modal-header bg-primary text-white">
                <h5 class="modal-title fw-bold"><i class="fas fa-plus-circle me-2"></i>Create New Sales Order</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            
            <div class="modal-body bg-body-tertiary">
                <form id="createOrderForm" class="needs-validation" novalidate onsubmit="event.preventDefault(); submitCreateOrder();">
                    <div class="card border-0 shadow-sm mb-3">
                        <div class="card-body">
                            <h6 class="card-subtitle mb-3 text-muted border-bottom pb-2">Core Information</h6>
                            <div class="row g-3">
                                <div class="col-md-4">
                                    <label class="form-label fw-bold small text-secondary">PO Number <span class="text-danger">*</span></label>
                                    <input type="text" class="form-control form-control-sm fw-bold text-primary" name="po_number" required placeholder="Ex. 38001-xxxxxxx">
                                    <div class="invalid-feedback">Please enter PO Number.</div>
                                </div>
                                <div class="col-md-4">
                                    <label class="form-label fw-bold small text-secondary">SKU <span class="text-danger">*</span></label>
                                    <input type="text" class="form-control form-control-sm fw-bold" name="sku" required placeholder="Ex. 70368">
                                    <div class="invalid-feedback">Please enter SKU.</div>
                                </div>
                                <div class="col-md-4">
                                    <label class="form-label fw-bold small text-secondary">Order Date</label>
                                    <input type="date" class="form-control form-control-sm" name="order_date" value="<?php echo date('Y-m-d'); ?>">
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="card border-0 shadow-sm mb-3">
                        <div class="card-body">
                            <h6 class="card-subtitle mb-3 text-muted border-bottom pb-2">Product Details</h6>
                            <div class="row g-3">
                                <div class="col-md-6">
                                    <label class="form-label small text-secondary">Description</label>
                                    <input type="text" class="form-control form-control-sm" name="description" placeholder="Product Name / Model">
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label small text-secondary">Color</label>
                                    <input type="text" class="form-control form-control-sm" name="color" placeholder="Ex. BLUE">
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label fw-bold small text-secondary">Quantity <span class="text-danger">*</span></label>
                                    <input type="number" class="form-control form-control-sm text-center fw-bold bg-warning bg-opacity-10" name="quantity" required min="1" value="1">
                                    <div class="invalid-feedback">Qty must be at least 1.</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="card border-0 shadow-sm">
                        <div class="card-body">
                            <h6 class="card-subtitle mb-3 text-muted border-bottom pb-2">Logistics & Remark</h6>
                            <div class="row g-3">
                                <div class="col-md-4">
                                    <label class="form-label small text-secondary">DC Location</label>
                                    <input type="text" class="form-control form-control-sm" name="dc_location" placeholder="Ex. DILLON">
                                </div>
                                <div class="col-md-4">
                                    <label class="form-label small text-secondary">Loading Week</label>
                                    <input type="text" class="form-control form-control-sm" name="loading_week" placeholder="Ex. 50.25">
                                </div>
                                <div class="col-md-4">
                                    <label class="form-label small text-secondary">Shipping Week</label>
                                    <input type="text" class="form-control form-control-sm" name="shipping_week" placeholder="Ex. 51.25">
                                </div>
                                
                                <div class="col-12">
                                    <label class="form-label small text-secondary">Remark</label>
                                    <textarea class="form-control form-control-sm" name="remark" rows="2" placeholder="Additional notes..."></textarea>
                                </div>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
            
            <div class="modal-footer bg-white border-top-0">
                <button type="button" class="btn btn-light text-secondary border" data-bs-dismiss="modal">Close</button>
                <button type="button" class="btn btn-primary fw-bold px-4 shadow-sm" onclick="submitCreateOrder()">
                    <i class="fas fa-save me-2"></i>Save Order
                </button>
            </div>
        </div>
    </div>
</div>