<!-- page/QMS/components/qa_schedule.php -->
<!-- KPI Summary Cards -->
<div class="mobile-swipe-row mb-3 d-print-none d-flex w-100">
    <div class="swipe-card-wrapper flex-fill">
        <div class="kpi-card p-3 h-100 bg-white w-100" style="border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.03);">
            <div class="text-secondary fw-bold small text-uppercase mb-1"><i class="fas fa-boxes me-1"></i> Total</div>
            <h3 class="mb-0 fw-bold text-dark" id="stat-qa-total">0</h3>
        </div>
    </div>
    <div class="swipe-card-wrapper flex-fill">
        <div class="kpi-card p-3 h-100 bg-white w-100" style="border-left: 4px solid #6c757d;">
            <div class="text-secondary fw-bold small text-uppercase mb-1"><i class="fas fa-clock me-1"></i> Waiting</div>
            <h3 class="mb-0 fw-bold text-dark" id="stat-waiting">0</h3>
        </div>
    </div>
    <div class="swipe-card-wrapper flex-fill">
        <div class="kpi-card p-3 h-100 bg-white w-100" style="border-left: 4px solid var(--bs-warning);">
            <div class="text-warning text-dark fw-bold small text-uppercase mb-1"><i class="fas fa-spinner fa-spin me-1"></i> In Progress</div>
            <h3 class="mb-0 fw-bold text-dark" id="stat-inprogress">0</h3>
        </div>
    </div>
    <div class="swipe-card-wrapper flex-fill">
        <div class="kpi-card p-3 h-100 bg-white w-100" style="border-left: 4px solid var(--bs-success);">
            <div class="text-success fw-bold small text-uppercase mb-1"><i class="fas fa-check-circle me-1"></i> Passed</div>
            <h3 class="mb-0 fw-bold text-dark" id="stat-passed">0</h3>
        </div>
    </div>
    <div class="swipe-card-wrapper flex-fill">
        <div class="kpi-card p-3 h-100 bg-white w-100" style="border-left: 4px solid var(--bs-danger);">
            <div class="text-danger fw-bold small text-uppercase mb-1"><i class="fas fa-times-circle me-1"></i> Failed</div>
            <h3 class="mb-0 fw-bold text-dark" id="stat-failed">0</h3>
        </div>
    </div>
</div>

<style>
.date-filter-bar {
    background: #ffffff;
    padding: 6px;
    border-radius: 50px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.05);
    border: 1px solid #e9ecef;
}
.date-filter-btn {
    border-radius: 40px !important;
    transition: all 0.3s ease;
}
.date-filter-label {
    border-radius: 40px !important;
    cursor: pointer;
    font-size: 0.85rem;
    padding: 6px 16px;
    transition: all 0.2s ease;
    border: none;
    color: #6c757d;
    background: transparent;
    font-weight: 600;
}
.btn-check:checked + .date-filter-label {
    background-color: #0d6efd;
    color: white;
    box-shadow: 0 2px 8px rgba(13,110,253,0.3);
}
.date-filter-label:hover:not(.active) {
    background-color: #f8f9fa;
    color: #495057;
}

.table-overdue td {
    background-color: #ffe6e6 !important;
}
.table-overdue td:first-child {
    border-left: 4px solid #dc3545;
}
.table-approaching td {
    background-color: #fff5cc !important;
}
.table-approaching td:first-child {
    border-left: 4px solid #ffc107;
}

.date-nav-btn {
    transition: all 0.2s;
    border-radius: 50%;
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
}
.date-nav-btn:hover {
    color: #0d6efd !important;
    background-color: rgba(13,110,253,0.1);
}
</style>

<div class="d-flex flex-wrap mb-2 d-print-none align-items-center justify-content-between gap-3">
    <!-- Modern Filter Bar -->
    <div class="d-flex align-items-center date-filter-bar">
        
        <!-- Quick Filters -->
        <div class="d-flex gap-1 pe-2 border-end">
            <input type="radio" class="btn-check date-filter-check" name="dateFilterGroup" id="btnDate_today" autocomplete="off" onchange="setScheduleDateToday()" checked>
            <label class="btn btn-sm rounded-pill fw-bold px-3 date-filter-label" for="btnDate_today">Today</label>

            <input type="radio" class="btn-check date-filter-check" name="dateFilterGroup" id="btnDate_this_week" autocomplete="off" onchange="loadQASchedule('this_week')">
            <label class="btn btn-sm rounded-pill fw-bold px-3 date-filter-label" for="btnDate_this_week">This Wk</label>

            <input type="radio" class="btn-check date-filter-check" name="dateFilterGroup" id="btnDate_this_month" autocomplete="off" onchange="loadQASchedule('this_month')">
            <label class="btn btn-sm rounded-pill fw-bold px-3 date-filter-label" for="btnDate_this_month">This Mo</label>

            <input type="radio" class="btn-check date-filter-check" name="dateFilterGroup" id="btnDate_last_month" autocomplete="off" onchange="loadQASchedule('last_month')">
            <label class="btn btn-sm rounded-pill fw-bold px-3 date-filter-label" for="btnDate_last_month">Last Mo</label>
        </div>

        <!-- Custom Date Picker (Range) -->
        <div class="d-flex align-items-center ps-2 pe-1">
            <button class="btn btn-sm btn-light border px-2 shadow-sm rounded-start-pill" onclick="changeDate(-1)" title="Previous Day"><i class="fas fa-chevron-left"></i></button>
            <input type="date" id="scheduleStartDate" class="form-control form-control-sm border bg-white text-center fw-bold text-dark px-1" value="<?php echo date('Y-m-d'); ?>" onchange="loadQASchedule('custom_range')" style="font-size: 0.95rem; width: 130px; cursor: pointer; box-shadow: none;" title="Start Date">
            <span class="text-muted small px-1 bg-light border-top border-bottom py-1" style="height:31px">to</span>
            <input type="date" id="scheduleEndDate" class="form-control form-control-sm border bg-white text-center fw-bold text-dark px-1" value="<?php echo date('Y-m-d'); ?>" onchange="loadQASchedule('custom_range')" style="font-size: 0.95rem; width: 130px; cursor: pointer; box-shadow: none;" title="End Date">
            <button class="btn btn-sm btn-light border px-2 shadow-sm rounded-end-pill" onclick="changeDate(1)" title="Next Day"><i class="fas fa-chevron-right"></i></button>
        </div>
    </div>
    
    <div class="d-flex gap-2 ms-auto">
        <button class="btn btn-sm btn-primary fw-bold px-3 shadow-sm d-none rounded-pill" id="btnBulkUpdate" onclick="openBulkUpdateModal()">
            <i class="fas fa-layer-group me-1"></i> Bulk Update (<span id="bulkCount">0</span>)
        </button>
        <button class="btn btn-sm btn-success fw-bold px-3 shadow-sm rounded-pill" onclick="openCreateTicketModal()">
            <i class="fas fa-ticket-alt me-1"></i> Create Ticket
        </button>
        <button class="btn btn-sm btn-outline-secondary rounded-pill fw-bold shadow-sm px-3" onclick="window.print()">
            <i class="fas fa-print me-1"></i> Print
        </button>
        <button class="btn btn-sm btn-primary rounded-pill fw-bold shadow-sm px-3 d-none" onclick="openAddScheduleModal()">
            <i class="fas fa-plus-circle me-1"></i> Add PO
        </button>
    </div>
</div>

<div class="card table-card shadow-sm border-0 desktop-view h-100 d-flex flex-column">
    <div class="table-responsive-custom h-100">
        <table class="table table-hover align-middle mb-0" id="qaScheduleTable">
                <thead class="bg-primary text-white small text-uppercase">
                    <tr>
                        <th class="px-3 py-2 text-center" style="width: 40px;"><input type="checkbox" class="form-check-input" id="selectAllPo" onchange="toggleSelectAllPo(this)"></th>
                        <th class="px-3 py-2 text-center" style="width: 130px;">Ticket No.</th>
                        <th class="px-3 py-2 text-center" style="width: 180px;">PO Number</th>
                        <th class="py-2 text-start">Item Details</th>
                        <th class="py-2 text-center" style="width: 80px;">Qty</th>
                        <th class="py-2 text-center" style="width: 80px;">Sampling</th>
                        <th class="py-2 text-center" style="width: 120px;">DC Location</th>
                        <th class="py-2 text-center" style="width: 120px;">Plan Date</th>
                        <th class="py-2 text-center" style="width: 120px;">Actual Date</th>
                        <th class="py-2 text-center" style="width: 120px;">Loading Date</th>
                        <th class="py-2 text-center" style="width: 110px;">Loading Week</th>
                        <th class="py-2 text-center" style="width: 140px;">Inspector</th>
                        <th class="py-2 text-center" style="width: 160px;">Inspection Status</th>
                    </tr>
                </thead>
                <tbody id="qaScheduleBody">
                    <tr><td colspan="13" class="text-center py-4 text-muted">Loading schedule...</td></tr>
                </tbody>
                <tfoot id="qaScheduleInlineAdd" class="border-top-0 d-print-none">
                    <tr id="qaScheduleAddBtnRow" class="bg-light" style="cursor: pointer;" onclick="showInlineSearch()">
                        <td colspan="13" class="text-center py-2 text-primary fw-bold" style="transition: all 0.2s;">
                            <div class="d-inline-block px-4 py-1 rounded" style="background-color: rgba(13, 110, 253, 0.1);">
                                <i class="fas fa-plus me-1"></i> Add PO to Schedule
                            </div>
                        </td>
                    </tr>
                    <tr id="qaScheduleSearchRow" class="bg-light d-none">
                        <td colspan="13" class="p-2 text-center" style="position: relative;">
                            <div class="mx-auto position-relative" style="max-width: 500px;">
                                <div class="input-group input-group-sm shadow-sm">
                                    <span class="input-group-text bg-white border-end-0"><i class="fas fa-search text-muted"></i></span>
                                    <input type="text" class="form-control border-start-0 fw-bold text-primary" id="inlineSearchPo" placeholder="Type PO Number..." autocomplete="off" onkeyup="debounceInlineSearch(event)">
                                    <button class="btn btn-primary fw-bold px-4" onclick="triggerInlineSearch()">Add</button>
                                </div>
                                <div id="inlineSuggestBox" class="list-group position-absolute w-100 shadow mt-1 z-3 text-start" style="display:none; max-height: 250px; overflow-y: auto;"></div>
                            </div>
                        </td>
                    </tr>
                </tfoot>
            </table>
        </div>
    </div>

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
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content shadow border-0">
            <div class="modal-header bg-white border-bottom">
                <h5 class="modal-title fw-bold text-dark"><i class="fas fa-edit me-2 text-primary"></i>Update Inspection Result</h5>
                <button type="button" class="btn btn-sm btn-outline-warning ms-3 fw-bold" onclick="openEditPoModal()"><i class="fas fa-pencil-alt me-1"></i> Edit PO Data</button>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body bg-light">
                <form id="formUpdateInspection">
                    <input type="hidden" id="inspect_po_id" name="id">
                    
                    <div class="mb-3">
                        <label class="form-label fw-bold small text-muted">PO Number</label>
                        <input type="text" id="inspect_po_number" class="form-control fw-bold bg-white" readonly>
                    </div>
                    
                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <label class="form-label fw-bold small text-muted">Inspection Status</label>
                            <select name="inspection_status" id="inspect_status" class="form-select" onchange="toggleResultFields()">
                                <option value="WAITING">WAITING</option>
                                <option value="IN_PROGRESS">IN PROGRESS</option>
                                <option value="DONE">DONE</option>
                            </select>
                        </div>
                        <div class="col-md-6 mb-3">
                            <label class="form-label fw-bold small text-muted">Actual Inspection Date</label>
                            <input type="date" name="actual_inspection_date" id="inspect_actual_date" class="form-control">
                        </div>
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

                    <div class="mb-3">
                        <label class="form-label fw-bold small text-muted text-uppercase mb-2">Inspection Type</label>
                        <div class="custom-segmented w-100">
                            <input type="radio" class="btn-check" name="inspect_type" id="type_remote" value="Remote">
                            <label class="btn flex-fill" for="type_remote">Remote</label>

                            <input type="radio" class="btn-check" name="inspect_type" id="type_onsite" value="On-site">
                            <label class="btn flex-fill" for="type_onsite">On-site</label>
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
                            <input type="radio" class="btn-check" name="inspection_status" id="status_waiting" value="WAITING" required>
                            <label class="btn flex-fill" for="status_waiting">WAITING</label>

                            <input type="radio" class="btn-check" name="inspection_status" id="status_in_progress" value="IN_PROGRESS">
                            <label class="btn flex-fill" for="status_in_progress">IN PROGRESS</label>

                            <input type="radio" class="btn-check" name="inspection_status" id="status_done" value="DONE">
                            <label class="btn flex-fill" for="status_done">DONE</label>
                        </div>
                    </div>

                    <div class="mb-3 mt-4">
                        <label class="form-label fw-bold small text-muted text-uppercase mb-2">Final Result</label>
                        <div class="custom-segmented w-100">
                            <input type="radio" class="btn-check" name="inspection_result" id="res_pending" value="PENDING">
                            <label class="btn flex-fill text-secondary border-secondary" for="res_pending">PENDING</label>

                            <input type="radio" class="btn-check" name="inspection_result" id="res_pass" value="PASS">
                            <label class="btn flex-fill text-success border-success" for="res_pass"><i class="fas fa-check-circle me-1"></i> PASS</label>

                            <input type="radio" class="btn-check" name="inspection_result" id="result_fail" value="FAIL">
                            <label class="btn flex-fill" for="result_fail"><i class="fas fa-times-circle me-1"></i> FAIL</label>
                        </div>
                    </div>

                    <div class="mb-3">
                        <label class="form-label fw-bold small text-muted">Remark</label>
                        <textarea class="form-control" name="remark" id="inspect_remark" rows="3" placeholder="Notes..."></textarea>
                    </div>
                </form>
            </div>
            <div class="modal-footer bg-white d-flex justify-content-between border-top">
                <button type="button" class="btn btn-outline-danger" id="btnRemoveScheduleModal">
                    <i class="fas fa-trash-alt me-1"></i> Remove
                </button>
                <div>
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                    <button type="button" class="btn btn-primary fw-bold px-4" onclick="saveInspectionResult()">
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
