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
                        <div class="col-md-4">
                            <label for="sap_no" class="form-label">SAP No.</label>
                            <input type="text" class="form-control fw-bold" id="sap_no" name="sap_no" required>
                        </div>
                        
                        <div class="col-md-4">
                            <label for="part_no" class="form-label">Part No.</label>
                            <input type="text" class="form-control" id="part_no" name="part_no" required>
                        </div>
                        
                        <div class="col-md-4">
                            <label for="itemSku" class="form-label">Customer SKU</label>
                            <input type="text" class="form-control" id="itemSku" name="sku" placeholder="Optional">
                        </div>

                        <div class="col-12">
                            <label for="part_description" class="form-label">Part Description</label>
                            <textarea class="form-control" id="part_description" name="part_description" rows="2"></textarea>
                        </div>
                        
                        <div class="col-md-4"> 
                            <label for="min_stock" class="form-label">Min Stock</label>
                            <input type="number" step="any" class="form-control" id="min_stock" name="min_stock" placeholder="0.00">
                        </div>
                        <div class="col-md-4"> 
                            <label for="max_stock" class="form-label">Max Stock</label>
                            <input type="number" step="any" class="form-control" id="max_stock" name="max_stock" placeholder="0.00">
                        </div>
                        <div class="col-md-4">
                            <label for="ctn" class="form-label fw-bold text-primary">
                                <i class="fas fa-truck-loading me-1"></i> CTN (Qty/Container)
                            </label>
                            <div class="input-group">
                                <input type="number" class="form-control border-primary" id="ctn" name="ctn" placeholder="e.g. 52">
                                <span class="input-group-text bg-primary text-white">PCS</span>
                            </div>
                            <div class="form-text small text-muted mt-0">
                                ใช้คำนวณต้นทุนค่าขนส่ง (Logistics Cost)
                            </div>
                        </div>
                    </div>

                    <h6 class="mt-4"><i class="fas fa-dollar-sign"></i> Standard Costing Details (Per Unit)</h6>
                    <hr class="mt-1">
                    
                    <label class="form-label text-primary fw-bold mb-1">Component Costs</label>
                    <div class="row g-3 mb-3">
                        <div class="col-md-3">
                            <label for="Cost_RM" class="form-label">Raw Material</label>
                            <input type="number" step="any" class="form-control" id="Cost_RM" name="Cost_RM" placeholder="0.000000">
                        </div>
                        <div class="col-md-3">
                            <label for="Cost_PKG" class="form-label">Packaging</label>
                            <input type="number" step="any" class="form-control" id="Cost_PKG" name="Cost_PKG" placeholder="0.000000">
                        </div>
                        <div class="col-md-3">
                            <label for="Cost_SUB" class="form-label">Sub Contract</label>
                            <input type="number" step="any" class="form-control" id="Cost_SUB" name="Cost_SUB" placeholder="0.000000">
                        </div>
                        <div class="col-md-3">
                            <label for="Cost_DL" class="form-label">Direct Labor</label>
                            <input type="number" step="any" class="form-control" id="Cost_DL" name="Cost_DL" placeholder="0.000000">
                        </div>
                    </div>

                    <label class="form-label text-primary fw-bold mb-1">Overhead Costs</label>
                    <div class="row g-3 mb-3">
                        <div class="col-md-2">
                            <label for="Cost_OH_Machine" class="form-label">Machine</label>
                            <input type="number" step="any" class="form-control" id="Cost_OH_Machine" name="Cost_OH_Machine" placeholder="0.000000">
                        </div>
                        <div class="col-md-2">
                            <label for="Cost_OH_Utilities" class="form-label">Utilities</label>
                            <input type="number" step="any" class="form-control" id="Cost_OH_Utilities" name="Cost_OH_Utilities" placeholder="0.000000">
                        </div>
                        <div class="col-md-2">
                            <label for="Cost_OH_Indirect" class="form-label">Indirect</label>
                            <input type="number" step="any" class="form-control" id="Cost_OH_Indirect" name="Cost_OH_Indirect" placeholder="0.000000">
                        </div>
                        <div class="col-md-2">
                            <label for="Cost_OH_Staff" class="form-label">Staff</label>
                            <input type="number" step="any" class="form-control" id="Cost_OH_Staff" name="Cost_OH_Staff" placeholder="0.000000">
                        </div>
                        <div class="col-md-2">
                            <label for="Cost_OH_Accessory" class="form-label">Accessory</label>
                            <input type="number" step="any" class="form-control" id="Cost_OH_Accessory" name="Cost_OH_Accessory" placeholder="0.000000">
                        </div>
                        <div class="col-md-2">
                            <label for="Cost_OH_Others" class="form-label">Others</label>
                            <input type="number" step="any" class="form-control" id="Cost_OH_Others" name="Cost_OH_Others" placeholder="0.000000">
                        </div>
                    </div>

                    <label class="form-label text-primary fw-bold mb-1">Summary & Price</label>
                    <div class="row g-3">
                        <div class="col-md-3">
                            <label for="Cost_Total" class="form-label">Total Cost</label>
                            <input type="number" step="any" class="form-control bg-light" id="Cost_Total" name="Cost_Total" placeholder="0.000000" readonly>
                        </div>
                        <div class="col-md-3">
                            <label for="StandardPrice" class="form-label">Standard Price</label>
                            <input type="number" step="any" class="form-control" id="StandardPrice" name="StandardPrice" placeholder="0.000000">
                        </div>
                        <div class="col-md-3">
                            <label for="StandardGP" class="form-label">Standard GP</label>
                            <input type="number" step="any" class="form-control bg-light" id="StandardGP" name="StandardGP" placeholder="0.000000" readonly>
                        </div>
                        <div class="col-md-3">
                            <label for="Price_USD" class="form-label">Price (USD)</label>
                            <input type="number" step="any" class="form-control" id="Price_USD" name="Price_USD" placeholder="0.000000">
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