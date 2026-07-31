<!-- page/QMS/components/qa_schedule.php -->
<div class="d-flex justify-content-between align-items-center mb-3 gap-2 flex-wrap">
    <div class="d-flex align-items-center gap-2">
        <div class="input-group shadow-sm" style="width: auto; border-radius: 6px; overflow: hidden;">
            <button class="btn btn-light border-0 text-primary px-3" onclick="changeScheduleDate(-1)" title="Previous Day"><i class="fas fa-chevron-left"></i></button>
            <input type="date" id="scheduleDateFilter" class="form-control border-0 bg-white text-center fw-bold text-dark px-1" value="<?php echo date('Y-m-d'); ?>" onchange="loadQASchedule()" style="font-size: 0.95rem; width: 140px; cursor: pointer;">
            <button class="btn btn-light border-0 text-primary px-3" onclick="changeScheduleDate(1)" title="Next Day"><i class="fas fa-chevron-right"></i></button>
        </div>
        <button class="btn btn-sm btn-outline-secondary fw-bold shadow-sm" onclick="setScheduleDateToday()">Today</button>
    </div>
    <button class="btn btn-sm btn-primary fw-bold shadow-sm" onclick="openAddScheduleModal()">
        <i class="fas fa-plus-circle me-1"></i> Add PO to Schedule
    </button>
</div>

<div class="card table-card shadow-sm border-0 desktop-view h-100 d-flex flex-column">
    <div class="table-responsive-custom h-100">
        <table class="table table-hover align-middle mb-0" id="qaScheduleTable">
                <thead class="table-light text-secondary small">
                    <tr>
                        <th class="px-3">PO Number</th>
                        <th>Item Details</th>
                        <th>Qty</th>
                        <th>DC Location</th>
                        <th>Loading Date</th>
                        <th>Inspection Status</th>
                        <th class="text-center">Action</th>
                    </tr>
                </thead>
                <tbody id="qaScheduleBody">
                    <tr><td colspan="7" class="text-center py-4 text-muted">Loading schedule...</td></tr>
                </tbody>
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
    <div class="modal-dialog">
        <div class="modal-content border-0 shadow">
            <div class="modal-header bg-warning">
                <h5 class="modal-title fw-bold text-dark"><i class="fas fa-clipboard-check me-2"></i>Update Inspection Result</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <form id="formUpdateInspection">
                    <input type="hidden" id="inspect_po_id" name="id">
                    
                    <div class="mb-3">
                        <label class="form-label fw-bold">PO Number</label>
                        <input type="text" id="inspect_po_number" class="form-control bg-light fw-bold" readonly>
                    </div>

                    <div class="mb-3">
                        <label class="form-label fw-bold">Status <span class="text-danger">*</span></label>
                        <select class="form-select" name="inspection_status" id="inspect_status" required>
                            <option value="">-- Select Status --</option>
                            <option value="WAITING">WAITING</option>
                            <option value="IN_PROGRESS">IN_PROGRESS</option>
                            <option value="DONE">DONE</option>
                        </select>
                    </div>

                    <div class="mb-3">
                        <label class="form-label fw-bold">Result</label>
                        <select class="form-select" name="inspection_result" id="inspect_result">
                            <option value="">-- Select Result --</option>
                            <option value="PASS" class="text-success fw-bold">PASS</option>
                            <option value="FAIL" class="text-danger fw-bold">FAIL</option>
                        </select>
                    </div>

                    <div class="mb-3">
                        <label class="form-label fw-bold">Remark</label>
                        <textarea class="form-control" name="remark" id="inspect_remark" rows="2" placeholder="Notes..."></textarea>
                    </div>
                </form>
            </div>
            <div class="modal-footer bg-light">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-warning fw-bold text-dark" onclick="saveInspectionResult()">
                    <i class="fas fa-save me-1"></i> Save Result
                </button>
            </div>
        </div>
    </div>
</div>
