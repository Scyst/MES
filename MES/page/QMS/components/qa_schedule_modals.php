<!-- Modal Add PO to Schedule -->
<div class="modal fade" id="addScheduleModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-lg">
        <div class="modal-content border-0 shadow">
            <div class="modal-header bg-primary text-white">
                <h5 class="modal-title fw-bold"><i class="fas fa-calendar-plus me-2"></i>Add PO to Schedule</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body bg-light">
                <div class="mb-3">
                    <label class="form-label fw-bold">Search PO Number</label>
                    <div class="input-group">
                        <input type="text" id="searchPoInput" class="form-control" placeholder="Enter PO Number...">
                        <button class="btn btn-primary" onclick="searchPO()"><i class="fas fa-search"></i> Search</button>
                    </div>
                </div>
                <div class="list-group" id="poSearchResult">
                    <!-- Results go here -->
                </div>
            </div>
        </div>
    </div>
</div>

<!-- Modal Edit PO Details -->
<div class="modal fade" id="editPoModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content shadow border-0">
            <div class="modal-header bg-warning text-dark border-bottom">
                <h5 class="modal-title fw-bold"><i class="fas fa-edit me-2"></i>Edit PO Details</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body bg-light">
                <form id="formEditPo">
                    <input type="hidden" id="edit_po_id" name="po_id">
                    
                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <label class="form-label fw-bold small text-muted">PO Number <span class="text-danger">*</span></label>
                            <input type="text" name="po_number" id="edit_po_number" class="form-control" required>
                        </div>
                        <div class="col-md-6 mb-3">
                            <label class="form-label fw-bold small text-muted">SKU</label>
                            <input type="text" name="sku" id="edit_sku" class="form-control">
                        </div>
                    </div>
                    
                    <div class="mb-3">
                        <label class="form-label fw-bold small text-muted">Description</label>
                        <input type="text" name="description" id="edit_description" class="form-control">
                    </div>
                    
                    <div class="row">
                        <div class="col-md-4 mb-3">
                            <label class="form-label fw-bold small text-muted">Color</label>
                            <input type="text" name="color" id="edit_color" class="form-control">
                        </div>
                        <div class="col-md-4 mb-3">
                            <label class="form-label fw-bold small text-muted">Quantity</label>
                            <input type="number" name="quantity" id="edit_quantity" class="form-control">
                        </div>
                        <div class="col-md-4 mb-3">
                            <label class="form-label fw-bold small text-muted">DC Location</label>
                            <input type="text" name="dc_location" id="edit_dc_location" class="form-control">
                        </div>
                    </div>
                    
                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <label class="form-label fw-bold small text-muted">Loading Date</label>
                            <input type="date" name="loading_date" id="edit_loading_date" class="form-control">
                        </div>
                        <div class="col-md-6 mb-3">
                            <label class="form-label fw-bold small text-muted">Loading Week</label>
                            <input type="text" name="loading_week" id="edit_loading_week" class="form-control" placeholder="e.g. WK32">
                        </div>
                    </div>
                </form>
            </div>
            <div class="modal-footer bg-white border-top">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-warning fw-bold px-4 text-dark" onclick="savePoDetails()">
                    <i class="fas fa-save me-1"></i> Save Changes
                </button>
            </div>
        </div>
    </div>
</div>

<!-- Modal Update Inspection Result -->
<div class="modal fade" id="updateInspectionModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
        <div class="modal-content shadow border-0">
            <div class="modal-header bg-white border-bottom flex-wrap gap-2">
                <div class="d-flex align-items-center gap-2 flex-wrap">
                    <h5 class="modal-title fw-bold text-dark mb-0"><i class="fas fa-edit me-2 text-primary"></i>Update Inspection Result</h5>
                    <span id="inspectRoundBadge" class="badge bg-primary-subtle text-primary border border-primary-subtle">Round 1</span>
                </div>
                <div class="d-flex align-items-center gap-2 ms-auto">
                    <button type="button" id="btnShowReopenSection" class="btn btn-sm btn-outline-warning fw-bold d-none" onclick="toggleReopenRoundPanel()">
                        <i class="fas fa-redo me-1"></i> เปิดตรวจรอบใหม่
                    </button>
                    <button type="button" class="btn btn-sm btn-outline-secondary fw-bold" onclick="openEditPoModal()"><i class="fas fa-pencil-alt me-1"></i> Edit PO Data</button>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
            </div>
            <div class="modal-body bg-light">
                <div id="inspectHistoryReadonlyBanner" class="alert alert-warning py-2 small d-none mb-3">
                    <i class="fas fa-history me-1"></i> กำลังดูประวัติการตรวจ <strong>รอบที่ <span id="inspectBannerRoundNo">1</span></strong> (Read-Only) หากต้องการตรวจใหม่กรุณากดปุ่ม <strong>"เปิดตรวจรอบใหม่"</strong> ด้านบน
                </div>

                <div id="reopenRoundPanel" class="card border-warning shadow-sm mb-3 d-none">
                    <div class="card-header bg-warning-subtle text-dark py-2 fw-bold small d-flex justify-content-between align-items-center">
                        <span><i class="fas fa-redo me-1"></i> เปิดตรวจ PO นี้รอบใหม่ (ประวัติรอบเดิมจะถูกเก็บไว้ครบถ้วน)</span>
                        <button type="button" class="btn-close btn-sm" onclick="toggleReopenRoundPanel(false)"></button>
                    </div>
                    <div class="card-body bg-white p-3">
                        <div class="row g-2">
                            <div class="col-12 col-md-4">
                                <label class="form-label fw-bold small text-muted mb-1">วันที่กำหนดตรวจรอบใหม่ <span class="text-danger">*</span></label>
                                <input type="date" id="reopen_schedule_date" class="form-control form-control-sm">
                            </div>
                            <div class="col-12 col-md-4">
                                <label class="form-label fw-bold small text-muted mb-1">Ticket Number ใหม่</label>
                                <input type="text" id="reopen_ticket_number" class="form-control form-control-sm" placeholder="INSP-...">
                            </div>
                            <div class="col-12 col-md-4">
                                <label class="form-label fw-bold small text-muted mb-1">ผู้ตรวจ (Inspector)</label>
                                <input type="text" id="reopen_qa_inspector" class="form-control form-control-sm" list="qc-users-list" placeholder="- Optional -">
                            </div>
                            <div class="col-12 col-md-6">
                                <label class="form-label fw-bold small text-muted mb-1">รูปแบบการตรวจ</label>
                                <select id="reopen_inspect_type" class="form-select form-select-sm">
                                    <option value="">- คงตามเดิม / ไม่ระบุ -</option>
                                    <option value="Remote">Remote</option>
                                    <option value="On-site">On-site</option>
                                </select>
                            </div>
                            <div class="col-12 col-md-6">
                                <label class="form-label fw-bold small text-muted mb-1">หมายเหตุการเปิดรอบใหม่</label>
                                <input type="text" id="reopen_remark" class="form-control form-control-sm" placeholder="เช่น Re-inspection หลังแก้ไขงาน FAIL">
                            </div>
                        </div>
                        <div class="d-flex justify-content-end gap-2 mt-3">
                            <button type="button" class="btn btn-sm btn-light border" onclick="toggleReopenRoundPanel(false)">ยกเลิก</button>
                            <button type="button" id="btnConfirmReopenRound" class="btn btn-sm btn-warning fw-bold px-3" onclick="submitReopenRound()">
                                <i class="fas fa-check me-1"></i> ยืนยันเปิดรอบใหม่
                            </button>
                        </div>
                    </div>
                </div>

                <form id="formUpdateInspection">
                    <input type="hidden" id="inspect_po_id" name="id">
                    <input type="hidden" id="inspect_history_id" name="history_id">
                    
                    <div class="mb-3">
                        <label class="form-label fw-bold small text-muted">PO Number</label>
                        <input type="text" id="inspect_po_number" class="form-control fw-bold bg-white" readonly>
                    </div>
                    
                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <label class="form-label fw-bold small text-muted">Ticket Number (เลขตั๋ว)</label>
                            <input type="text" name="ticket_number" id="inspect_ticket_number" class="form-control" placeholder="Ticket No...">
                        </div>
                        <div class="col-md-6 mb-3">
                            <label class="form-label fw-bold small text-muted">Inspector (คนตรวจ)</label>
                            <input type="text" name="qa_inspector" id="inspect_qa_inspector" class="form-control" list="qc-users-list" placeholder="- Type or Select -">
                        </div>
                    </div>

                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <label class="form-label fw-bold small text-muted">Actual Inspection Date (วันที่ตรวจจริง)</label>
                            <input type="date" name="actual_inspection_date" id="inspect_actual_date" class="form-control">
                        </div>
                        <div class="col-md-6 mb-3">
                            <label class="form-label fw-bold small text-muted text-uppercase mb-2">Inspection Type</label>
                            <div class="custom-segmented w-100">
                                <input type="radio" class="btn-check" name="inspect_type" id="type_remote" value="Remote">
                                <label class="btn flex-fill" for="type_remote">Remote</label>

                                <input type="radio" class="btn-check" name="inspect_type" id="type_onsite" value="On-site">
                                <label class="btn flex-fill" for="type_onsite">On-site</label>
                            </div>
                        </div>
                    </div>

                    <style>
                    .custom-segmented {
                        background: #f1f3f5;
                        padding: 4px;
                        border-radius: 8px;
                        display: flex;
                        gap: 2px;
                    }
                    .custom-segmented .btn {
                        border: none !important;
                        border-radius: 6px !important;
                        color: #adb5bd;
                        font-weight: 600;
                        transition: all 0.2s;
                        background: transparent;
                        box-shadow: none !important;
                    }
                    .custom-segmented .btn:hover {
                        color: #6c757d;
                    }
                    .custom-segmented .btn-check:checked + .btn {
                        background: #fff;
                        box-shadow: 0 2px 5px rgba(0,0,0,0.1) !important;
                    }
                    .custom-segmented .btn-check[value="WAITING"]:checked + .btn { color: #495057; }
                    .custom-segmented .btn-check[value="IN_PROGRESS"]:checked + .btn { color: #fd7e14; }
                    .custom-segmented .btn-check[value="DONE"]:checked + .btn { color: #198754; }
                    .custom-segmented .btn-check[value="PASS"]:checked + .btn { color: #198754; }
                    .custom-segmented .btn-check[value="FAIL"]:checked + .btn { color: #dc3545; }
                    </style>

                    <div class="mb-4">
                        <label class="form-label fw-bold small text-muted text-uppercase mb-2">Inspection Status <span class="text-danger">*</span></label>
                        <div class="custom-segmented w-100">
                            <input type="radio" class="btn-check" name="inspection_status" id="status_waiting" value="WAITING" onchange="onQaInspectionStatusChange('WAITING')" required>
                            <label class="btn flex-fill" for="status_waiting">WAITING</label>

                            <input type="radio" class="btn-check" name="inspection_status" id="status_in_progress" value="IN_PROGRESS" onchange="onQaInspectionStatusChange('IN_PROGRESS')">
                            <label class="btn flex-fill" for="status_in_progress">IN PROGRESS</label>

                            <input type="radio" class="btn-check" name="inspection_status" id="status_done" value="DONE" onchange="onQaInspectionStatusChange('DONE')">
                            <label class="btn flex-fill" for="status_done">DONE</label>
                        </div>
                    </div>

                    <div class="mb-3 mt-4">
                        <label class="form-label fw-bold small text-muted text-uppercase mb-2">Final Result</label>
                        <div class="custom-segmented w-100">
                            <input type="radio" class="btn-check" name="inspection_result" id="res_pending" value="PENDING" onchange="onQaInspectionResultChange('PENDING')">
                            <label class="btn flex-fill text-secondary border-secondary" for="res_pending">PENDING</label>

                            <input type="radio" class="btn-check" name="inspection_result" id="res_pass" value="PASS" onchange="onQaInspectionResultChange('PASS')">
                            <label class="btn flex-fill text-success border-success" for="res_pass"><i class="fas fa-check-circle me-1"></i> PASS</label>

                            <input type="radio" class="btn-check" name="inspection_result" id="result_fail" value="FAIL" onchange="onQaInspectionResultChange('FAIL')">
                            <label class="btn flex-fill" for="result_fail"><i class="fas fa-times-circle me-1"></i> FAIL</label>
                        </div>
                    </div>

                    <div class="mb-3">
                        <label class="form-label fw-bold small text-muted">Remark</label>
                        <textarea class="form-control" name="remark" id="inspect_remark" rows="3" placeholder="Notes..."></textarea>
                    </div>
                </form>

                <div class="mt-3 pt-3 border-top">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <span class="small fw-bold text-muted text-uppercase"><i class="fas fa-history me-1"></i> Inspection Round History</span>
                        <span id="poHistoryCountBadge" class="badge bg-white text-dark border">0</span>
                    </div>
                    <div id="poHistoryTimeline" class="d-flex flex-column gap-2" style="max-height: 190px; overflow-y: auto;">
                        <div class="text-muted small py-2">Loading history...</div>
                    </div>
                </div>
            </div>
            <div class="modal-footer bg-white d-flex justify-content-between border-top">
                <button type="button" class="btn btn-outline-danger" id="btnRemoveScheduleModal">
                    <i class="fas fa-trash-alt me-1"></i> Remove
                </button>
                <div>
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                    <button type="button" class="btn btn-primary fw-bold px-4" id="btnSaveInspectionResult" onclick="saveInspectionResult()">
                        <i class="fas fa-save me-1"></i> Save Result
                    </button>
                </div>
            </div>
        </div>
    </div>
</div>

<!-- Bulk Update Modal -->
<div class="modal fade" id="bulkUpdateModal" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content border-0 shadow-lg" style="border-radius: 16px;">
            <div class="modal-header bg-light border-bottom-0 rounded-top" style="border-radius: 16px 16px 0 0;">
                <h5 class="modal-title fw-bold text-dark"><i class="fas fa-layer-group text-primary me-2"></i>Bulk Assign Ticket</h5>
                <button type="button" class="btn-close shadow-none" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body p-4">
                <div class="alert alert-info py-2 small fw-bold mb-3">
                    <i class="fas fa-info-circle me-1"></i> Updating <span id="bulkUpdateCount" class="badge bg-primary">0</span> POs
                </div>
                <div class="mb-3">
                    <label class="form-label fw-bold small text-muted">Ticket Number (เลขตั๋ว)</label>
                    <input type="text" id="bulk_ticket_number" class="form-control" placeholder="Ticket No...">
                </div>
                <div class="mb-3">
                    <label class="form-label fw-bold small text-muted">Inspector (คนตรวจ)</label>
                    <input type="text" id="bulk_qa_inspector" class="form-control" list="qc-users-list" placeholder="- Type or Select -">
                </div>
                <div class="mb-3">
                    <label class="form-label fw-bold small text-muted text-uppercase mb-2">Inspection Type</label>
                    <div class="custom-segmented w-100">
                        <input type="radio" class="btn-check" name="bulk_inspect_type" id="bulk_type_remote" value="Remote">
                        <label class="btn flex-fill" for="bulk_type_remote">Remote</label>
                        <input type="radio" class="btn-check" name="bulk_inspect_type" id="bulk_type_onsite" value="On-site">
                        <label class="btn flex-fill" for="bulk_type_onsite">On-site</label>
                    </div>
                </div>
            </div>
            <div class="modal-footer bg-light border-top-0 rounded-bottom" style="border-radius: 0 0 16px 16px;">
                <button type="button" class="btn btn-light fw-bold" data-bs-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-primary fw-bold px-4" id="btnSaveBulk" onclick="saveBulkUpdate()">
                    <i class="fas fa-save me-1"></i> Update Selected
                </button>
            </div>
        </div>
    </div>
</div>

<!-- Create Ticket Modal -->
<div class="modal fade" id="createTicketModal" tabindex="-1" data-bs-backdrop="static">
    <div class="modal-dialog modal-dialog-centered modal-lg">
        <div class="modal-content border-0 shadow-lg" style="border-radius: 16px;">
            <div class="modal-header bg-success text-white border-bottom-0 rounded-top" style="border-radius: 16px 16px 0 0;">
                <h5 class="modal-title fw-bold"><i class="fas fa-ticket-alt me-2"></i>Create New Ticket</h5>
                <button type="button" class="btn-close btn-close-white shadow-none" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body p-4 bg-light">
                <div class="row bg-white p-3 rounded shadow-sm mb-3">
                    <div class="col-md-4 mb-3">
                        <label class="form-label fw-bold small text-muted">Ticket Number *</label>
                        <input type="text" id="create_ticket_number" class="form-control" placeholder="Ticket No...">
                    </div>
                    <div class="col-md-4 mb-3">
                        <label class="form-label fw-bold small text-muted">Plan Date</label>
                        <input type="date" id="create_inspection_date" class="form-control">
                    </div>
                    <div class="col-md-4 mb-3">
                        <label class="form-label fw-bold small text-muted">Inspector</label>
                        <input type="text" id="create_qa_inspector" class="form-control" list="qc-users-list" placeholder="- Select -">
                    </div>
                    <div class="col-md-12 mb-3">
                        <label class="form-label fw-bold small text-muted">Inspection Type</label>
                        <div class="custom-segmented w-100">
                            <input type="radio" class="btn-check" name="create_inspect_type" id="create_type_remote" value="Remote">
                            <label class="btn flex-fill" for="create_type_remote">Remote</label>
                            <input type="radio" class="btn-check" name="create_inspect_type" id="create_type_onsite" value="On-site">
                            <label class="btn flex-fill" for="create_type_onsite">On-site</label>
                        </div>
                    </div>
                </div>

                <!-- Add PO section -->
                <div class="bg-white p-3 rounded shadow-sm">
                    <h6 class="fw-bold mb-3"><i class="fas fa-list-ul text-primary me-2"></i>Add POs to Ticket</h6>
                    
                    <div class="input-group mb-3 position-relative">
                        <span class="input-group-text bg-white border-end-0 text-muted"><i class="fas fa-search"></i></span>
                        <input type="text" id="createTicketSearchPo" class="form-control border-start-0" placeholder="Type PO number (min 3 chars)..." autocomplete="off" onkeyup="searchPoForTicket(event)">
                        <button class="btn btn-outline-secondary" type="button" onclick="searchPoForTicket(new Event('keyup', {key:'Enter'}))">Search</button>
                        
                        <!-- Suggestion box -->
                        <div id="createTicketSuggestBox" class="list-group position-absolute w-100 shadow-sm" style="display:none; z-index: 1050; top: 100%; max-height: 250px; overflow-y: auto;">
                        </div>
                    </div>
                    
                    <div class="table-responsive" style="max-height: 200px;">
                        <table class="table table-sm table-bordered table-hover mb-0" id="createTicketPoTable">
                            <thead class="bg-light text-muted small text-uppercase sticky-top">
                                <tr>
                                    <th>PO Number</th>
                                    <th>SKU</th>
                                    <th class="text-center" style="width: 50px;">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr id="createTicketEmptyRow">
                                    <td colspan="3" class="text-center text-muted py-3 small">No PO added yet. Search above to add.</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            <div class="modal-footer bg-white border-top-0 rounded-bottom" style="border-radius: 0 0 16px 16px;">
                <button type="button" class="btn btn-light fw-bold" data-bs-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-success fw-bold px-4" id="btnSaveCreateTicket" onclick="saveNewTicket()">
                    <i class="fas fa-save me-1"></i> Create & Link
                </button>
            </div>
        </div>
    </div>
</div>

<datalist id="qc-users-list"></datalist>

<!-- View Day Jobs Modal -->
<div class="modal fade" id="viewDayJobsModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
        <div class="modal-content border-0 shadow">
            <div class="modal-header bg-primary text-white border-bottom-0">
                <h5 class="modal-title fw-bold" id="viewDayJobsTitle"><i class="fas fa-list-ul me-2"></i>Jobs for <span id="viewDayJobsDate"></span></h5>
                <button type="button" class="btn-close btn-close-white shadow-none" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body bg-light p-3">
                <div id="viewDayJobsToolbar" class="d-flex justify-content-between align-items-center mb-3 bg-white p-2 rounded shadow-sm d-none">
                    <div class="form-check mb-0 ms-2">
                        <input class="form-check-input" type="checkbox" id="selectAllDayPo" style="transform: scale(1.2); cursor:pointer;" onclick="toggleSelectAllDayPo(this)">
                        <label class="form-check-label fw-bold ms-1" for="selectAllDayPo" style="cursor:pointer;">Select All</label>
                    </div>
                    <div>
                        <span class="text-muted small me-3"><span id="dayBulkCount" class="fw-bold text-primary">0</span> selected</span>
                        <button class="btn btn-sm btn-primary fw-bold d-none shadow-sm" id="btnDayBulkUpdate" onclick="openBulkUpdateModalFromDayView()">
                            <i class="fas fa-layer-group me-1"></i> Bulk Update
                        </button>
                    </div>
                </div>
                
                <div class="row" id="viewDayJobsContainer">
                    <!-- Cards will be injected here -->
                </div>
                <div id="viewDayJobsEmpty" class="text-center py-5 d-none">
                    <i class="fas fa-calendar-times fa-3x text-muted mb-3"></i>
                    <h5 class="text-muted fw-bold">No jobs scheduled for this date.</h5>
                </div>
            </div>
            <div class="modal-footer bg-white border-top-0">
                <button type="button" class="btn btn-secondary fw-bold px-4" data-bs-dismiss="modal">Close</button>
            </div>
        </div>
    </div>
</div>
