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

<div class="modal" id="addScheduleModal" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content ">
            <div class="modal-header">
                <h5 class="modal-title">Add New Schedule</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <form id="addScheduleForm">
                    <div class="mb-3">
                        <label for="addScheduleLine" class="form-label">Line:</label>
                        <input type="text" id="addScheduleLine" name="line" class="form-control text-uppercase" placeholder="Enter Line" required list="lineDatalist">
                        <datalist id="lineDatalist"></datalist>
                    </div>
                    <div class="mb-3">
                        <label for="addScheduleShiftName" class="form-label">Shift Name:</label>
                        <select id="addScheduleShiftName" name="shift_name" class="form-select" required>
                            <option value="DAY">DAY</option>
                            <option value="NIGHT">NIGHT</option>
                        </select>
                    </div>
                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <label for="addScheduleStartTime" class="form-label">Start Time:</label>
                            <input type="time" id="addScheduleStartTime" name="start_time" class="form-control" required>
                        </div>
                        <div class="col-md-6 mb-3">
                            <label for="addScheduleEndTime" class="form-label">End Time:</label>
                            <input type="time" id="addScheduleEndTime" name="end_time" class="form-control" required>
                        </div>
                    </div>
                    <div class="mb-3">
                        <label for="addScheduleBreakMinutes" class="form-label">Planned Break (minutes):</label>
                        <input type="number" id="addScheduleBreakMinutes" name="planned_break_minutes" class="form-control" placeholder="e.g., 60" required>
                    </div>
                    <div class="form-check mb-3">
                        <input class="form-check-input" type="checkbox" id="addScheduleIsActive" name="is_active" value="1" checked>
                        <label class="form-check-label" for="addScheduleIsActive">
                            Is Active
                        </label>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="submit" form="addScheduleForm" class="btn btn-success">Add Schedule</button>
            </div>
        </div>
    </div>
</div>

<div class="modal" id="editScheduleModal" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content ">
            <div class="modal-header">
                <h5 class="modal-title">Edit Schedule</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <form id="editScheduleForm">
                    <input type="hidden" id="editScheduleId" name="id">
                    <div class="mb-3">
                        <label for="editScheduleLine" class="form-label">Line:</label>
                        <input type="text" id="editScheduleLine" name="line" class="form-control text-uppercase" required list="lineDatalist">
                    </div>
                    <div class="mb-3">
                        <label for="editScheduleShiftName" class="form-label">Shift Name:</label>
                        <select id="editScheduleShiftName" name="shift_name" class="form-select" required>
                            <option value="DAY">DAY</option>
                            <option value="NIGHT">NIGHT</option>
                        </select>
                    </div>
                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <label for="editScheduleStartTime" class="form-label">Start Time:</label>
                            <input type="time" id="editScheduleStartTime" name="start_time" class="form-control" required>
                        </div>
                        <div class="col-md-6 mb-3">
                            <label for="editScheduleEndTime" class="form-label">End Time:</label>
                            <input type="time" id="editScheduleEndTime" name="end_time" class="form-control" required>
                        </div>
                    </div>
                    <div class="mb-3">
                        <label for="editScheduleBreakMinutes" class="form-label">Planned Break (minutes):</label>
                        <input type="number" id="editScheduleBreakMinutes" name="planned_break_minutes" class="form-control" placeholder="e.g., 60" required>
                    </div>
                    <div class="form-check mb-3">
                        <input class="form-check-input" type="checkbox" id="editScheduleIsActive" name="is_active" value="1">
                        <label class="form-check-label" for="editScheduleIsActive">
                            Is Active
                        </label>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="submit" form="editScheduleForm" class="btn btn-warning">Save Changes</button>
            </div>
        </div>
    </div>
</div>

<div class="modal fade" id="createBomModal" tabindex="-1" aria-labelledby="createBomModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content ">
            <div class="modal-header">
                <h5 class="modal-title" id="createBomModalLabel">Create New BOM - Step 1: Select Finished Good</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <form id="createBomForm">
                    <p class="text-muted">Search for a Finished Good (FG) item that does not have a BOM yet to start creating one.</p>
                    <div class="mb-3">
                        <label for="fg_item_search" class="form-label">Search for FG Item (SAP No. or Part No.)</label>
                        <div class="position-relative">
                            <input type="text" id="fg_item_search" class="form-control" autocomplete="off" placeholder="Type at least 2 characters...">
                            </div>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
            </div>
        </div>
    </div>
</div>

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
                    <table class="table table-striped table-sm">
                        <thead>
                            <tr>
                                <th style="width: 30%;">Component SAP No.</th>
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
                <button type="button" class="btn btn-danger me-auto" id="deleteBomFromModalBtn"><i class="fas fa-trash-alt"></i> Delete Full BOM</button>
            </div>
        </div>
    </div>
</div>

<div class="modal fade" id="copyBomModal" tabindex="-1" aria-labelledby="copyBomModalLabel" aria-hidden="true">
    <div class="modal-dialog">
        <div class="modal-content ">
            <form id="copyBomForm">
                <div class="modal-header">
                    <h5 class="modal-title" id="copyBomModalLabel">Copy Bill of Materials</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <p>This will overwrite any existing BOM for the target part.</p>
                    
                    <div class="mb-3">
                        <label class="form-label">Source BOM</label>
                        <input type="text" id="copySourceBomDisplay" class="form-control" readonly />
                        <input type="hidden" id="copy_source_fg_item_id" name="source_fg_item_id">
                        <input type="hidden" name="source_line" id="copy_source_line">
                        <input type="hidden" name="source_model" id="copy_source_model">
                    </div>

                    <div class="mb-3">
                        <label for="target_fg_item_id" class="form-label">Target Finished Good (Search by SAP/Part No.)</label>
                        <input type="text" class="form-control" id="target_fg_search" name="target_fg_search" required>
                        <input type="hidden" id="target_fg_item_id" name="target_fg_item_id">
                        <div class="form-text">Select the Part No. (from the same Line/Model) to copy the components to.</div>
                    </div>

                </div>
                <div class="modal-footer">
                    <button type="submit" class="btn btn-primary">Copy BOM</button>
                </div>
            </form>
        </div>
    </div>
</div>

<div class="modal fade" id="bomImportPreviewModal" tabindex="-1" aria-labelledby="bomImportPreviewModalLabel" aria-hidden="true" data-bs-backdrop="static">
    <div class="modal-dialog modal-xl modal-dialog-scrollable">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="bomImportPreviewModalLabel"><i class="fas fa-file-import"></i> BOM Import Preview</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <div id="import-summary-container" class="mb-3">
                    <p>Please review the changes below. Rows with errors will be ignored.</p>
                    <div class="d-flex justify-content-around text-center">
                        <div>
                            <h4 class="text-success mb-0" id="summary-add-count">0</h4>
                            <small class="text-muted">TO ADD</small>
                        </div>
                        <div>
                            <h4 class="text-warning mb-0" id="summary-update-count">0</h4>
                            <small class="text-muted">TO UPDATE</small>
                        </div>
                        <div>
                            <h4 class="text-info mb-0" id="summary-delete-count">0</h4>
                            <small class="text-muted">TO DELETE</small>
                        </div>
                        <div>
                            <h4 class="text-danger mb-0" id="summary-error-count">0</h4>
                            <small class="text-muted">ERRORS</small>
                        </div>
                    </div>
                </div>
                <hr>

                <ul class="nav nav-tabs" id="importPreviewTabs" role="tablist">
                    <li class="nav-item" role="presentation">
                        <button class="nav-link active text-success" id="add-tab" data-bs-toggle="tab" data-bs-target="#add-pane" type="button" role="tab">
                            Add (<span id="add-tab-count">0</span>)
                        </button>
                    </li>
                    <li class="nav-item" role="presentation">
                        <button class="nav-link text-warning" id="update-tab" data-bs-toggle="tab" data-bs-target="#update-pane" type="button" role="tab">
                            Update (<span id="update-tab-count">0</span>)
                        </button>
                    </li>
                    <li class="nav-item" role="presentation">
                        <button class="nav-link text-info" id="delete-tab" data-bs-toggle="tab" data-bs-target="#delete-pane" type="button" role="tab">
                            Delete (<span id="delete-tab-count">0</span>)
                        </button>
                    </li>
                    <li class="nav-item" role="presentation">
                        <button class="nav-link text-danger" id="error-tab" data-bs-toggle="tab" data-bs-target="#error-pane" type="button" role="tab">
                            Errors (<span id="error-tab-count">0</span>)
                        </button>
                    </li>
                </ul>

                <div class="tab-content" id="importPreviewTabContent">
                    <div class="tab-pane fade show active" id="add-pane" role="tabpanel">
                        <div class="table-responsive mt-2">
                            <table class="table table-sm table-bordered">
                                <thead>
                                    <tr><th>Line</th><th>Model</th><th>Component SAP</th><th>Quantity</th></tr>
                                </thead>
                                <tbody id="add-preview-body"></tbody>
                            </table>
                        </div>
                    </div>
                    <div class="tab-pane fade" id="update-pane" role="tabpanel">
                        <div class="table-responsive mt-2">
                            <table class="table table-sm table-bordered">
                                <thead>
                                    <tr><th>Line</th><th>Model</th><th>Component SAP</th><th>Quantity</th></tr>
                                </thead>
                                <tbody id="update-preview-body"></tbody>
                            </table>
                        </div>
                    </div>
                    <div class="tab-pane fade" id="delete-pane" role="tabpanel">
                         <div class="table-responsive mt-2">
                            <table class="table table-sm table-bordered">
                                <thead>
                                    <tr><th>Line</th><th>Model</th><th>Component SAP</th></tr>
                                </thead>
                                <tbody id="delete-preview-body"></tbody>
                            </table>
                        </div>
                    </div>
                    <div class="tab-pane fade" id="error-pane" role="tabpanel">
                        <div class="table-responsive mt-2">
                            <table class="table table-sm table-bordered">
                                <thead>
                                    <tr><th>Row</th><th>Component SAP</th><th>Reason</th></tr>
                                </thead>
                                <tbody id="error-preview-body"></tbody>
                            </table>
                        </div>
                    </div>
                </div>

            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-primary" id="confirmImportBtn" disabled>
                    <i class="fas fa-check-circle"></i> Confirm Import
                </button>
            </div>
        </div>
    </div>
</div>

<div class="modal fade" id="bomBulkImportPreviewModal" tabindex="-1" aria-hidden="true" data-bs-backdrop="static">
    <div class="modal-dialog modal-xl modal-dialog-scrollable">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title"><i class="fas fa-file-import"></i> Bulk BOM Import Preview</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <p>Please review the summary of changes from the imported file. Skipped sheets will be ignored.</p>
                <div class="d-flex justify-content-around text-center border rounded p-3 mb-3">
                    <div>
                        <h4 class="text-success mb-0" id="bulk-summary-create-count">0</h4>
                        <small class="text-muted">NEW BOMs TO CREATE</small>
                    </div>
                    <div>
                        <h4 class="text-warning mb-0" id="bulk-summary-overwrite-count">0</h4>
                        <small class="text-muted">BOMs TO OVERWRITE</small>
                    </div>
                    <div>
                        <h4 class="text-danger mb-0" id="bulk-summary-skipped-count">0</h4>
                        <small class="text-muted">SKIPPED SHEETS (Errors)</small>
                    </div>
                </div>

                <ul class="nav nav-tabs" role="tablist">
                    <li class="nav-item" role="presentation">
                        <button class="nav-link active text-success" data-bs-toggle="tab" data-bs-target="#create-pane" type="button" role="tab">Create (<span id="create-tab-count">0</span>)</button>
                    </li>
                    <li class="nav-item" role="presentation">
                        <button class="nav-link text-warning" data-bs-toggle="tab" data-bs-target="#overwrite-pane" type="button" role="tab">Overwrite (<span id="overwrite-tab-count">0</span>)</button>
                    </li>
                    <li class="nav-item" role="presentation">
                        <button class="nav-link text-danger" data-bs-toggle="tab" data-bs-target="#skipped-pane" type="button" role="tab">Skipped (<span id="skipped-tab-count">0</span>)</button>
                    </li>
                </ul>

                <div class="tab-content pt-2">
                    <div class="tab-pane fade show active" id="create-pane" role="tabpanel">
                        <ul id="create-preview-list" class="list-group"></ul>
                    </div>
                    <div class="tab-pane fade" id="overwrite-pane" role="tabpanel">
                        <ul id="overwrite-preview-list" class="list-group"></ul>
                    </div>
                    <div class="tab-pane fade" id="skipped-pane" role="tabpanel">
                        <div id="skipped-preview-accordion" class="accordion"></div>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-primary" id="confirmBulkImportBtn" disabled>
                    <i class="fas fa-check-circle"></i> Confirm and Process Import
                </button>
            </div>
        </div>
    </div>
</div>

<div class="modal fade" id="locationModal" tabindex="-1" aria-labelledby="locationModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="locationModalLabel">จัดการสถานที่</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <form id="locationForm">
                <div class="modal-body">
                    <input type="hidden" id="location_id" name="location_id" value="0">
                    
                    <div class="mb-3">
                        <label for="location_name" class="form-label">ชื่อสถานที่</label>
                        <input type="text" class="form-control" id="location_name" name="location_name" required>
                    </div>

                    <div class="mb-3">
                        <label for="location_production_line" class="form-label">ไลน์ผลิต (Production Line)</label>
                        <select class="form-select" id="location_production_line" name="production_line">
                            <option value="">-- ไม่ใช่พื้นที่การผลิต --</option>
                            </select>
                        <div class="form-text">
                            เลือกไลน์ผลิตที่สถานที่นี้สังกัดอยู่ (หากเป็นพื้นที่การผลิต)
                        </div>
                    </div>

                    <div class="mb-3">
                        <label for="location_type" class="form-label">ประเภทสถานที่ (Location Type)</label>
                        <select class="form-select" id="location_type" name="location_type" required>
                            <option value="WIP">WIP (Work-in-Progress / ไลน์ผลิต)</option>
                            <option value="STORE">STORE (คลังวัตถุดิบ)</option>
                            <option value="WAREHOUSE">WAREHOUSE (คลังสินค้าสำเร็จรูป)</option>
                            <option value="SHIPPING">SHIPPING (พื้นที่เตรียมจัดส่ง)</option>
                        </select>
                        <div class="form-text">
                            เลือกประเภทของสถานที่เพื่อการจัดกลุ่มสต็อก
                        </div>
                    </div>
                    <div class="mb-3">
                        <label for="location_description" class="form-label">คำอธิบาย</label>
                        <textarea class="form-control" id="location_description" name="location_description" rows="2"></textarea>
                    </div>

                    <div class="form-check">
                        <input class="form-check-input" type="checkbox" id="location_is_active" name="is_active" checked>
                        <label class="form-check-label" for="location_is_active">
                            เปิดใช้งาน
                        </label>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="submit" class="btn btn-primary">บันทึก</button>
                </div>
            </form>
        </div>
    </div>
</div>

<div class="modal fade" id="routeModal" tabindex="-1" aria-labelledby="routeModalLabel" aria-hidden="true">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="routeModalLabel">Add New Route</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <form id="routeForm">
                    <input type="hidden" id="route_id" name="route_id" value="0">
                    <input type="hidden" id="route_item_id" name="route_item_id" value="">

                    <div class="mb-3">
                        <label for="route_line" class="form-label">Production Line</label>
                        <input type="text" class="form-control" id="route_line" name="route_line" required>
                    </div>
                    <div class="mb-3">
                        <label for="route_model" class="form-label">Model</label>
                        <input type="text" class="form-control" id="route_model" name="route_model" required>
                    </div>
                    <div class="mb-3">
                        <label for="route_planned_output" class="form-label">Planned Output (UPH)</label>
                        <input type="number" class="form-control" id="route_planned_output" name="route_planned_output" min="0" required>
                    </div>
                    
                    <div class="modal-footer">
                        <button type="submit" class="btn btn-primary">Save Changes</button>
                    </div>
                </form>
            </div>
        </div>
    </div>
</div>

<div class="modal fade" id="transferModal" tabindex="-1" aria-labelledby="transferModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content ">
            <form id="transferForm">
                <div class="modal-header">
                    <h5 class="modal-title" id="transferModalLabel">New Stock Transfer</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <div class="mb-3 position-relative">
                        <label for="transfer_part_no" class="form-label">Search Item (SAP No. / Part No. / Description)</label>
                        <input type="text" class="form-control" id="transfer_part_no" name="item_search" autocomplete="off" required>
                        </div>
                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <label for="from_location_id" class="form-label">From Location</label>
                            <select class="form-select" id="from_location_id" name="from_location_id" required></select>
                            <div class="form-text">Current Stock: <span id="fromStock" class="fw-bold">--</span></div>
                        </div>
                        <div class="col-md-6 mb-3">
                            <label for="to_location_id" class="form-label">To Location</label>
                            <select class="form-select" id="to_location_id" name="to_location_id" required></select>
                             <div class="form-text">Current Stock: <span id="toStock" class="fw-bold">--</span></div>
                        </div>
                    </div>

                    <div class="mb-3">
                        <label for="quantity" class="form-label">Quantity to Transfer</label>
                        <input type="number" class="form-control" id="quantity" name="quantity" min="1" step="1" required>
                    </div>

                    <div class="mb-3">
                        <label for="notes" class="form-label">Notes (Optional)</label>
                        <textarea class="form-control" id="notes" name="notes" rows="2"></textarea>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="submit" class="btn btn-primary">Execute Transfer</button>
                </div>
            </form>
        </div>
    </div>
</div>