<div class="modal fade" id="planModal" tabindex="-1" aria-labelledby="planModalLabel" aria-hidden="true" data-bs-backdrop="static" data-bs-keyboard="false">
    <div class="modal-dialog modal-lg modal-dialog-centered">
        <div class="modal-content border-0 shadow">
            <div class="modal-header bg-primary text-white">
                <h5 class="modal-title fw-bold" id="planModalLabel"><i class="fas fa-edit me-2"></i>Manage Plan</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body bg-light">
                <form id="planForm">
                    <input type="hidden" id="planModalPlanId" value="0">

                    <div class="row g-3">
                        <div class="col-md-4">
                            <label for="planModalDate" class="form-label small fw-bold text-secondary">Plan Date <span class="text-danger">*</span></label>
                            <div class="input-group input-group-sm">
                                <span class="input-group-text bg-white"><i class="fas fa-calendar-day text-primary"></i></span>
                                <input type="date" class="form-control" id="planModalDate" required>
                            </div>
                        </div>

                        <div class="col-md-4">
                            <label for="planModalLine" class="form-label small fw-bold text-secondary">Line <span class="text-danger">*</span></label>
                            <select id="planModalLine" class="form-select form-select-sm" required>
                                <option value="" disabled selected>Select Line...</option>
                                </select>
                        </div>

                        <div class="col-md-4">
                            <label for="planModalShift" class="form-label small fw-bold text-secondary">Shift <span class="text-danger">*</span></label>
                            <select id="planModalShift" class="form-select form-select-sm" required>
                                <option value="" disabled selected>Select Shift...</option>
                                <option value="DAY">DAY</option>
                                <option value="NIGHT">NIGHT</option>
                            </select>
                        </div>

                        <div class="col-12">
                            <label for="planModalItemSearch" class="form-label small fw-bold text-secondary">Item (SAP / Part No) <span class="text-danger">*</span></label>
                            <div class="input-group input-group-sm">
                                <span class="input-group-text bg-white"><i class="fas fa-search text-muted"></i></span>
                                <input type="text" class="form-control" id="planModalItemSearch" placeholder="Type SAP No. or Part No. to search..." autocomplete="off" required>
                                <span class="input-group-text bg-white text-primary fw-bold" id="planModalSelectedItem" style="min-width: 150px; max-width: 250px; font-size: 0.8rem;">
                                    No Item Selected
                                </span>
                            </div>
                            <input type="hidden" id="planModalItemId" value="">
                            
                            <div id="planModalItemResultsContainer" style="position: relative;">
                                <div class="dropdown-menu w-100 shadow-sm border-0 mt-1" id="planModalItemResults" style="display: none; max-height: 200px; overflow-y: auto;"></div>
                            </div>
                            <div id="item-search-error" class="text-danger small mt-1" style="display: none;">
                                <i class="fas fa-exclamation-circle me-1"></i>Please select a valid item from the list.
                            </div>
                        </div>

                        <div class="col-md-6">
                            <label for="planModalQuantity" class="form-label small fw-bold text-secondary">Plan Qty <span class="text-danger">*</span></label>
                            <input type="number" class="form-control form-control-sm font-monospace fw-bold text-primary" id="planModalQuantity" placeholder="0" min="0" required>
                        </div>

                        <div class="col-md-6">
                            <label for="planModalNote" class="form-label small fw-bold text-secondary">Note</label>
                            <input type="text" class="form-control form-control-sm" id="planModalNote" placeholder="Optional remark...">
                        </div>
                    </div>
                </form>
            </div>
            <div class="modal-footer bg-white border-top-0 py-2">
                <button type="button" class="btn btn-sm btn-outline-danger me-auto" id="deletePlanButton" style="display: none;">
                    <i class="fas fa-trash-alt me-1"></i> Delete
                </button>
                <button type="button" class="btn btn-sm btn-light text-secondary border" data-bs-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-sm btn-primary fw-bold px-4" id="savePlanButton">
                    <i class="fas fa-save me-1"></i> Save Plan
                </button>
            </div>
        </div>
    </div>
</div>