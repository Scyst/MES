<!-- page/QMS/components/qa_schedule.php -->
<!-- KPI Summary Cards -->
<div class="mobile-swipe-row mb-3 d-print-none d-flex w-100">
    <div class="swipe-card-wrapper flex-fill">
        <div class="kpi-card p-3 h-100 bg-white w-100" style="border-left: 4px solid var(--bs-primary);">
            <div class="text-secondary fw-bold small text-uppercase mb-1"><i class="fas fa-boxes me-1"></i> Total</div>
            <h3 class="mb-0 fw-bold text-dark" id="stat-total">0</h3>
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

        <!-- Custom Date Picker -->
        <div class="d-flex align-items-center ps-2 pe-1">
            <button class="btn btn-sm text-muted border-0 date-nav-btn p-0" onclick="changeScheduleDate(-1)" title="Previous Day">
                <i class="fas fa-chevron-left"></i>
            </button>
            <input type="date" id="scheduleDateFilter" class="form-control form-control-sm border-0 bg-transparent text-center fw-bold text-dark px-1 mx-1" value="<?php echo date('Y-m-d'); ?>" onchange="loadQASchedule('date')" style="font-size: 0.95rem; width: 135px; cursor: pointer; box-shadow: none;">
            <button class="btn btn-sm text-muted border-0 date-nav-btn p-0" onclick="changeScheduleDate(1)" title="Next Day">
                <i class="fas fa-chevron-right"></i>
            </button>
        </div>
    </div>
    
    <div class="d-flex gap-2 ms-auto">
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
                        <th class="px-3 py-2 text-start" style="width: 180px;">PO Number</th>
                        <th class="py-2 text-start">Item Details</th>
                        <th class="py-2 text-center" style="width: 90px;">Qty</th>
                        <th class="py-2 text-center" style="width: 120px;">DC Location</th>
                        <th class="py-2 text-center" style="width: 120px;">Inspection Date</th>
                        <th class="py-2 text-center" style="width: 120px;">Loading Date</th>
                        <th class="py-2 text-center" style="width: 140px;">Inspector</th>
                        <th class="py-2 text-center" style="width: 160px;">Inspection Status</th>
                    </tr>
                </thead>
                <tbody id="qaScheduleBody">
                    <tr><td colspan="8" class="text-center py-4 text-muted">Loading schedule...</td></tr>
                </tbody>
                <tfoot id="qaScheduleInlineAdd" class="border-top-0 d-print-none">
                    <tr id="qaScheduleAddBtnRow" class="bg-light" style="cursor: pointer;" onclick="showInlineSearch()">
                        <td colspan="8" class="text-center py-2 text-primary fw-bold" style="transition: all 0.2s;">
                            <div class="d-inline-block px-4 py-1 rounded" style="background-color: rgba(13, 110, 253, 0.1);">
                                <i class="fas fa-plus me-1"></i> Add PO to Schedule
                            </div>
                        </td>
                    </tr>
                    <tr id="qaScheduleSearchRow" class="bg-light d-none">
                        <td colspan="8" class="p-2 text-center" style="position: relative;">
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

<!-- Modal Update Inspection Result -->
<div class="modal fade" id="updateInspectionModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content shadow border-0">
            <div class="modal-header bg-white border-bottom">
                <h5 class="modal-title fw-bold text-dark"><i class="fas fa-edit me-2 text-primary"></i>Update Inspection Result</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body bg-light">
                <form id="formUpdateInspection">
                    <input type="hidden" id="inspect_po_id" name="id">
                    
                    <div class="mb-3">
                        <label class="form-label fw-bold small text-muted">PO Number</label>
                        <input type="text" id="inspect_po_number" class="form-control fw-bold bg-white" readonly>
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

                    <div class="mb-4">
                        <label class="form-label fw-bold small text-muted text-uppercase mb-2">Final Result</label>
                        <div class="custom-segmented w-100">
                            <input type="radio" class="btn-check" name="inspection_result" id="result_pass" value="PASS">
                            <label class="btn flex-fill" for="result_pass"><i class="fas fa-check-circle me-1"></i> PASS</label>

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
