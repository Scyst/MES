<div class="modal fade" id="itemModal" tabindex="-1" aria-labelledby="itemModalLabel" aria-hidden="true" data-bs-backdrop="static">
    <div class="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content shadow-lg border-0">
            <div class="modal-header bg-dark text-white py-3">
                <h5 class="modal-title fw-bold" id="itemModalLabel">
                    <i class="fas fa-cube text-info me-2"></i>Item Master Configuration
                </h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            
            <div class="modal-body bg-body-tertiary p-0">
                <form id="itemAndRoutesForm" novalidate>
                    <input type="hidden" id="item_id" name="item_id">

                    <div class="bg-white px-3 pt-3 border-bottom sticky-top" style="z-index: 10;">
                        <ul class="nav nav-tabs" id="itemFormTabs" role="tablist">
                            <li class="nav-item" role="presentation">
                                <button class="nav-link active fw-bold" id="basic-tab" data-bs-toggle="tab" data-bs-target="#basic-pane" type="button" role="tab">
                                    <i class="fas fa-info-circle text-primary me-1"></i> Basic Info
                                </button>
                            </li>
                            <li class="nav-item" role="presentation">
                                <button class="nav-link fw-bold" id="costing-tab" data-bs-toggle="tab" data-bs-target="#costing-pane" type="button" role="tab">
                                    <i class="fas fa-dollar-sign text-success me-1"></i> Logistics & Costing
                                </button>
                            </li>
                            <li class="nav-item" role="presentation">
                                <button class="nav-link fw-bold" id="routes-tab" data-bs-toggle="tab" data-bs-target="#routes-pane" type="button" role="tab">
                                    <i class="fas fa-route text-warning me-1"></i> Manufacturing Routes
                                </button>
                            </li>
                        </ul>
                    </div>

                    <div class="tab-content p-4">
                        
                        <div class="tab-pane fade show active" id="basic-pane" role="tabpanel">
                            <div class="row g-3">
                                <div class="col-md-3">
                                    <label class="form-label fw-bold small text-muted mb-1">SAP No. <span class="text-danger">*</span></label>
                                    <input type="text" class="form-control form-control-sm fw-bold text-primary" id="sap_no" required>
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label fw-bold small text-muted mb-1">Part No.</label>
                                    <input type="text" class="form-control form-control-sm" id="part_no">
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label fw-bold small text-muted mb-1">Customer SKU</label>
                                    <input type="text" class="form-control form-control-sm" id="sku">
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label fw-bold small text-muted mb-1">Material Type</label>
                                    <select class="form-select form-select-sm" id="material_type">
                                        <option value="FG">FG (Finished Good)</option>
                                        <option value="RM">RM (Raw Material)</option>
                                        <option value="WIP">WIP (Work in Process)</option>
                                        <option value="PKG">PKG (Packaging)</option>
                                    </select>
                                </div>
                                <div class="col-12">
                                    <label class="form-label fw-bold small text-muted mb-1">Description</label>
                                    <textarea class="form-control form-control-sm" id="part_description" rows="2"></textarea>
                                </div>
                                <div class="col-md-4">
                                    <label class="form-label fw-bold small text-muted mb-1">Standard UPH (Default)</label>
                                    <input type="number" class="form-control form-control-sm bg-light" id="planned_output" min="0" step="1">
                                    <div class="form-text" style="font-size: 0.7rem;">กำลังผลิตมาตรฐาน (ใช้เมื่อไม่ระบุ Route)</div>
                                </div>
                                <div class="col-md-4">
                                    <label class="form-label fw-bold small text-muted mb-1">Min Stock</label>
                                    <input type="number" class="form-control form-control-sm" id="min_stock" min="0" step="0.01">
                                </div>
                                <div class="col-md-4">
                                    <label class="form-label fw-bold small text-muted mb-1">Max Stock</label>
                                    <input type="number" class="form-control form-control-sm" id="max_stock" min="0" step="0.01">
                                </div>
                                <div class="col-12 mt-4">
                                    <div class="form-check form-switch">
                                        <input class="form-check-input" type="checkbox" id="is_active" checked>
                                        <label class="form-check-label fw-bold" for="is_active">Active (เปิดใช้งานข้อมูลนี้)</label>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="tab-pane fade" id="costing-pane" role="tabpanel">
                            <h6 class="fw-bold text-info border-bottom pb-2 mb-3"><i class="fas fa-truck-loading me-2"></i>Logistics & Invoice Details</h6>
                            <div class="row g-3 mb-4">
                                <div class="col-md-3">
                                    <label class="form-label fw-bold small text-muted mb-1">CTN (Pack Size)</label>
                                    <input type="number" class="form-control form-control-sm" id="CTN" min="0" step="1">
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label fw-bold small text-muted mb-1">Net Weight (NW)</label>
                                    <input type="number" class="form-control form-control-sm" id="net_weight" min="0" step="0.0001">
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label fw-bold small text-muted mb-1">Gross Weight (GW)</label>
                                    <input type="number" class="form-control form-control-sm" id="gross_weight" min="0" step="0.0001">
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label fw-bold small text-muted mb-1">CBM</label>
                                    <input type="number" class="form-control form-control-sm" id="cbm" min="0" step="0.0001">
                                </div>
                                <div class="col-md-4">
                                    <label class="form-label fw-bold small text-muted mb-1">Invoice Product Type</label>
                                    <input type="text" class="form-control form-control-sm" id="invoice_product_type">
                                </div>
                                <div class="col-md-8">
                                    <label class="form-label fw-bold small text-muted mb-1">Invoice Description</label>
                                    <input type="text" class="form-control form-control-sm" id="invoice_description">
                                </div>
                            </div>

                            <h6 class="fw-bold text-danger border-bottom pb-2 mb-3"><i class="fas fa-coins me-2"></i>Financials & Standard Costs</h6>
                            <div class="row g-3">
                                <div class="col-md-6">
                                    <label class="form-label fw-bold small text-success mb-1">Standard Price (THB)</label>
                                    <input type="number" class="form-control form-control-sm fw-bold text-success" id="StandardPrice" min="0" step="0.000001">
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label fw-bold small text-success mb-1">Price (USD)</label>
                                    <input type="number" class="form-control form-control-sm fw-bold text-success" id="Price_USD" min="0" step="0.000001">
                                </div>
                                
                                <div class="col-md-3"><label class="form-label small text-muted mb-1">Cost: RM</label><input type="number" class="form-control form-control-sm" id="Cost_RM" min="0" step="0.000001"></div>
                                <div class="col-md-3"><label class="form-label small text-muted mb-1">Cost: PKG</label><input type="number" class="form-control form-control-sm" id="Cost_PKG" min="0" step="0.000001"></div>
                                <div class="col-md-3"><label class="form-label small text-muted mb-1">Cost: SUB</label><input type="number" class="form-control form-control-sm" id="Cost_SUB" min="0" step="0.000001"></div>
                                <div class="col-md-3"><label class="form-label small text-muted mb-1 fw-bold">Cost: DL</label><input type="number" class="form-control form-control-sm" id="Cost_DL" min="0" step="0.000001"></div>
                                
                                <div class="col-md-4"><label class="form-label small text-muted mb-1">OH: Machine</label><input type="number" class="form-control form-control-sm" id="Cost_OH_Machine" min="0" step="0.000001"></div>
                                <div class="col-md-4"><label class="form-label small text-muted mb-1">OH: Utilities</label><input type="number" class="form-control form-control-sm" id="Cost_OH_Utilities" min="0" step="0.000001"></div>
                                <div class="col-md-4"><label class="form-label small text-muted mb-1">OH: Indirect</label><input type="number" class="form-control form-control-sm" id="Cost_OH_Indirect" min="0" step="0.000001"></div>
                                <div class="col-md-4"><label class="form-label small text-muted mb-1">OH: Staff</label><input type="number" class="form-control form-control-sm" id="Cost_OH_Staff" min="0" step="0.000001"></div>
                                <div class="col-md-4"><label class="form-label small text-muted mb-1">OH: Accessory</label><input type="number" class="form-control form-control-sm" id="Cost_OH_Accessory" min="0" step="0.000001"></div>
                                <div class="col-md-4"><label class="form-label small text-muted mb-1">OH: Others</label><input type="number" class="form-control form-control-sm" id="Cost_OH_Others" min="0" step="0.000001"></div>
                            </div>
                        </div>

                        <div class="tab-pane fade" id="routes-pane" role="tabpanel">
                            <div class="d-flex justify-content-between align-items-end mb-3 border-bottom pb-2">
                                <div>
                                    <h6 class="fw-bold text-warning mb-0"><i class="fas fa-route me-2"></i>Routing & Capacity</h6>
                                    <small class="text-muted" style="font-size: 0.75rem;">กำหนดกำลังการผลิต (UPH) แยกตามไลน์และโมเดล</small>
                                </div>
                                <button type="button" class="btn btn-sm btn-outline-primary fw-bold" id="modalAddNewRouteBtn">
                                    <i class="fas fa-plus me-1"></i> Add Route
                                </button>
                            </div>
                            
                            <div class="table-responsive border rounded-3 bg-white">
                                <table class="table table-sm table-hover align-middle mb-0">
                                    <thead class="table-light text-secondary" style="font-size: 0.8rem;">
                                        <tr>
                                            <th>Production Line <span class="text-danger">*</span></th>
                                            <th>Model <span class="text-danger">*</span></th>
                                            <th class="text-center" style="width: 150px;">UPH (Target/Hr) <span class="text-danger">*</span></th>
                                            <th class="text-center" style="width: 80px;">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody id="modalRoutesTableBody">
                                        <tr><td colspan="4" class="text-center text-muted">Loading routes...</td></tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                    </div>
                </form>
            </div>
            
            <div class="modal-footer bg-white border-top d-flex justify-content-between">
                <button type="button" class="btn btn-sm btn-info fw-bold px-3 shadow-sm" id="btnWhereUsed" style="display: none;">
                    <i class="fas fa-search-location me-1"></i> Where-Used
                </button>
                
                <div>
                    <button type="button" class="btn btn-sm btn-danger fw-bold px-3 me-2" id="deleteItemBtn" style="display:none;"><i class="fas fa-trash-alt"></i> Deactivate</button>
                    <button type="button" class="btn btn-sm btn-secondary fw-bold px-3" data-bs-dismiss="modal">Cancel</button>
                    <button type="submit" form="itemAndRoutesForm" class="btn btn-sm btn-primary fw-bold px-4 shadow-sm" id="btnSaveItem">
                        <i class="fas fa-save me-1"></i> Save Item
                    </button>
                </div>
            </div>
        </div>
    </div>
</div>

<div class="modal fade" id="locationModal" tabindex="-1" aria-hidden="true" data-bs-backdrop="static">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content shadow-lg border-0">
            <div class="modal-header bg-dark text-white py-3">
                <h5 class="modal-title fw-bold" id="locationModalLabel">
                    <i class="fas fa-map-marker-alt me-2 text-warning"></i> Add/Edit Location
                </h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <form id="locationForm">
                <div class="modal-body bg-light p-4">
                    <input type="hidden" id="location_id" name="location_id" value="0">
                    <div class="row g-3">
                        <div class="col-md-6">
                            <label class="form-label fw-bold small text-muted mb-1">Location Name <span class="text-danger">*</span></label>
                            <input type="text" class="form-control fw-bold border-primary" id="location_name" name="location_name" required placeholder="เช่น WAREHOUSE-A">
                        </div>
                        <div class="col-md-6">
                            <label class="form-label fw-bold small text-muted mb-1">Location Type</label>
                            <select class="form-select" id="location_type" name="location_type">
                                <option value="RM">RM (Raw Material)</option>
                                <option value="SEMI">SEMI (Semi-Finished)</option>
                                <option value="FG">FG (Finished Goods)</option>
                                <option value="STORE">STORE (คลังอะไหล่)</option>
                            </select>
                        </div>
                        <div class="col-12">
                            <label class="form-label fw-bold small text-muted mb-1">Production Line (Optional)</label>
                            <select class="form-select" id="location_production_line" name="production_line">
                                <option value="">-- Loading Lines... --</option>
                            </select>
                            <div class="form-text" style="font-size: 0.7rem;">ผูกจุดจัดเก็บนี้เข้ากับไลน์ผลิต (ใช้เป็นคลังย่อยริมไลน์)</div>
                        </div>
                        <div class="col-12">
                            <label class="form-label fw-bold small text-muted mb-1">Description</label>
                            <textarea class="form-control" id="location_description" name="location_description" rows="2" placeholder="รายละเอียดเพิ่มเติม..."></textarea>
                        </div>
                        <div class="col-12 mt-3">
                            <div class="form-check form-switch">
                                <input class="form-check-input" type="checkbox" id="location_is_active" checked>
                                <label class="form-check-label fw-bold text-success" for="location_is_active">Active (เปิดใช้งาน)</label>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer bg-white border-top">
                    <button type="button" class="btn btn-sm btn-secondary fw-bold px-3" data-bs-dismiss="modal">Cancel</button>
                    <button type="submit" class="btn btn-sm btn-success fw-bold px-4 shadow-sm"><i class="fas fa-save me-1"></i> Save Location</button>
                </div>
            </form>
        </div>
    </div>
</div>

<div class="modal fade" id="addScheduleModal" tabindex="-1" aria-hidden="true" data-bs-backdrop="static">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content shadow-lg border-0">
            <div class="modal-header bg-success text-white py-3">
                <h5 class="modal-title fw-bold"><i class="fas fa-clock me-2"></i> Add New Schedule</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <form id="addScheduleForm">
                <div class="modal-body bg-light p-4">
                    <input type="hidden" name="id" value="0">
                    <div class="row g-3">
                        <div class="col-md-6">
                            <label class="form-label fw-bold small text-muted mb-1">Production Line <span class="text-danger">*</span></label>
                            <input type="text" class="form-control fw-bold" name="line" required placeholder="เช่น ASSY-01">
                        </div>
                        <div class="col-md-6">
                            <label class="form-label fw-bold small text-muted mb-1">Shift Name <span class="text-danger">*</span></label>
                            <input type="text" class="form-control" name="shift_name" required placeholder="เช่น Day Shift">
                        </div>
                        <div class="col-md-6">
                            <label class="form-label fw-bold small text-muted mb-1">Start Time <span class="text-danger">*</span></label>
                            <input type="time" class="form-control" name="start_time" required>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label fw-bold small text-muted mb-1">End Time <span class="text-danger">*</span></label>
                            <input type="time" class="form-control" name="end_time" required>
                        </div>
                        <div class="col-12">
                            <label class="form-label fw-bold small text-muted mb-1">Planned Break (Minutes)</label>
                            <div class="input-group input-group-sm">
                                <input type="number" class="form-control" name="planned_break_minutes" value="60" min="0" required>
                                <span class="input-group-text bg-white">นาที</span>
                            </div>
                            <div class="form-text" style="font-size: 0.7rem;">เวลาพักเบรกที่จะถูกนำไปหักออกจากเวลาทำงานจริงในการคิด OEE</div>
                        </div>
                        <div class="col-12 mt-3">
                            <div class="form-check form-switch">
                                <input class="form-check-input" type="checkbox" name="is_active" checked>
                                <label class="form-check-label fw-bold text-success">Active (เปิดใช้งานกะนี้)</label>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer bg-white border-top">
                    <button type="button" class="btn btn-sm btn-secondary fw-bold px-3" data-bs-dismiss="modal">Cancel</button>
                    <button type="submit" class="btn btn-sm btn-success fw-bold px-4 shadow-sm"><i class="fas fa-save me-1"></i> Create Schedule</button>
                </div>
            </form>
        </div>
    </div>
</div>

<div class="modal fade" id="editScheduleModal" tabindex="-1" aria-hidden="true" data-bs-backdrop="static">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content shadow-lg border-0">
            <div class="modal-header bg-warning text-dark py-3">
                <h5 class="modal-title fw-bold"><i class="fas fa-edit me-2"></i> Edit Schedule</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <form id="editScheduleForm">
                <div class="modal-body bg-light p-4">
                    <input type="hidden" name="id">
                    <div class="row g-3">
                        <div class="col-md-6">
                            <label class="form-label fw-bold small text-muted mb-1">Production Line <span class="text-danger">*</span></label>
                            <input type="text" class="form-control fw-bold bg-white" name="line" required>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label fw-bold small text-muted mb-1">Shift Name <span class="text-danger">*</span></label>
                            <input type="text" class="form-control" name="shift_name" required>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label fw-bold small text-muted mb-1">Start Time <span class="text-danger">*</span></label>
                            <input type="time" class="form-control" name="start_time" required>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label fw-bold small text-muted mb-1">End Time <span class="text-danger">*</span></label>
                            <input type="time" class="form-control" name="end_time" required>
                        </div>
                        <div class="col-12">
                            <label class="form-label fw-bold small text-muted mb-1">Planned Break (Minutes)</label>
                            <div class="input-group input-group-sm">
                                <input type="number" class="form-control" name="planned_break_minutes" min="0" required>
                                <span class="input-group-text bg-white">นาที</span>
                            </div>
                        </div>
                        <div class="col-12 mt-3">
                            <div class="form-check form-switch">
                                <input class="form-check-input" type="checkbox" name="is_active">
                                <label class="form-check-label fw-bold">Active (เปิดใช้งานกะนี้)</label>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer bg-white border-top">
                    <button type="button" class="btn btn-sm btn-secondary fw-bold px-3" data-bs-dismiss="modal">Cancel</button>
                    <button type="submit" class="btn btn-sm btn-warning fw-bold px-4 shadow-sm"><i class="fas fa-save me-1"></i> Update Schedule</button>
                </div>
            </form>
        </div>
    </div>
</div>

<div class="modal fade" id="whereUsedModal" tabindex="-1" aria-hidden="true" style="z-index: 1060;">
    <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content shadow-lg border-0">
            <div class="modal-header bg-info text-dark py-3">
                <h5 class="modal-title fw-bold">
                    <i class="fas fa-search-location me-2"></i> Where-Used Analysis
                    <span class="badge bg-white text-info ms-2 border" id="wuTargetSap"></span>
                </h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body bg-light p-0">
                <div class="table-responsive bg-white m-3 border rounded shadow-sm">
                    <table class="table table-sm table-hover align-middle mb-0 text-nowrap table-settings">
                        <thead class="table-light sticky-top">
                            <tr class="text-secondary">
                                <th class="px-3 py-2">นำไปใช้ใน (Parent SAP No.)</th>
                                <th class="py-2">Description</th>
                                <th class="py-2 text-center">Type</th>
                                <th class="py-2 text-end px-3" style="width: 120px;">ปริมาณที่ใช้ (Qty)</th>
                            </tr>
                        </thead>
                        <tbody id="wuTableBody">
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
</div>

<div class="modal fade" id="auditTrailModal" tabindex="-1" aria-hidden="true" style="z-index: 1060;">
    <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content shadow-lg border-0">
            <div class="modal-header bg-secondary text-white py-3">
                <h5 class="modal-title fw-bold">
                    <i class="fas fa-history me-2"></i> Audit Trail (ประวัติการแก้ไข)
                    <span class="badge bg-light text-secondary ms-2 border" id="auditTargetName"></span>
                </h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body bg-light p-0">
                <div class="table-responsive bg-white m-3 border rounded shadow-sm hide-scrollbar" style="max-height: 400px;">
                    <table class="table table-sm table-hover align-middle mb-0 text-nowrap table-settings">
                        <thead class="table-light sticky-top">
                            <tr class="text-secondary">
                                <th class="px-3 py-2" style="width: 140px;">วัน-เวลา (Date/Time)</th>
                                <th class="py-2" style="width: 120px;">ผู้ใช้งาน (User)</th>
                                <th class="py-2">การกระทำ (Action)</th>
                                <th class="py-2 px-3">รายละเอียด (Details)</th>
                            </tr>
                        </thead>
                        <tbody id="auditTrailTbody">
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
</div>

<div class="modal fade" id="importPreviewModal" tabindex="-1" aria-hidden="true" data-bs-backdrop="static" style="z-index: 1060;">
    <div class="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content shadow-lg border-0">
            <div class="modal-header bg-primary text-white py-3">
                <h5 class="modal-title fw-bold">
                    <i class="fas fa-file-excel me-2"></i> Preview Import Data
                    <span class="badge bg-light text-primary ms-2" id="importRowCount">0 Rows</span>
                </h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body bg-light p-3">
                <div class="alert alert-info border-info small mb-3 shadow-sm">
                    <i class="fas fa-info-circle me-1"></i> ระบบจะทำการ <b>Smart Update</b>: ข้อมูลที่มีอยู่แล้วจะถูกอัปเดต และข้อมูลใหม่จะถูกสร้างขึ้น <u class="fw-bold">โดยช่องที่เว้นว่างใน Excel จะไม่ไปลบข้อมูลเดิมในระบบ</u>
                </div>
                
                <div class="d-flex flex-wrap gap-2 mb-3" id="importStatsSummary">
                </div>

                <div class="table-responsive bg-white border rounded shadow-sm hide-scrollbar">
                    <table class="table table-sm table-hover align-middle mb-0 text-nowrap table-settings">
                        <thead class="table-light sticky-top" id="importPreviewThead">
                        </thead>
                        <tbody id="importPreviewTbody">
                        </tbody>
                    </table>
                </div>
            </div>
            <div class="modal-footer bg-white border-top">
                <button type="button" class="btn btn-sm btn-secondary fw-bold px-3" data-bs-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-sm btn-success fw-bold px-4 shadow-sm" id="btnConfirmImport">
                    <i class="fas fa-cloud-upload-alt me-1"></i> Confirm Import
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

<div class="modal fade" id="ecnModal" tabindex="-1" aria-hidden="true" style="z-index: 1060;">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content border-0 shadow-lg">
            <div class="modal-header bg-warning text-dark py-3">
                <h5 class="modal-title fw-bold"><i class="fas fa-code-branch me-2"></i>Create New Revision (ECN)</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <form id="ecnForm">
                <div class="modal-body bg-light p-4">
                    <div class="alert alert-warning small mb-4 border-warning">
                        <i class="fas fa-info-circle me-1"></i> ระบบจะทำการ <b>คัดลอกสูตรปัจจุบัน</b> ไปสร้างเป็นเวอร์ชันใหม่ (สถานะ <b>DRAFT</b>) เพื่อให้คุณแก้ไขได้อย่างปลอดภัย โดยไม่กระทบการผลิตจริง
                    </div>
                    <div class="mb-3">
                        <label class="form-label fw-bold">ECN Number <span class="text-danger">*</span></label>
                        <input type="text" class="form-control border-warning" name="ecn_number" required placeholder="ระบุเลขที่เอกสารแจ้งเปลี่ยนแปลง (เช่น ECN-2026-001)">
                        <div class="form-text">ใช้สำหรับอ้างอิงเอกสาร Engineering Change Notice</div>
                    </div>
                </div>
                <div class="modal-footer bg-white border-top">
                    <button type="button" class="btn btn-sm btn-secondary fw-bold px-3" data-bs-dismiss="modal">Cancel</button>
                    <button type="submit" class="btn btn-sm btn-warning fw-bold px-4 shadow-sm"><i class="fas fa-save me-1"></i> Create Draft</button>
                </div>
            </form>
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