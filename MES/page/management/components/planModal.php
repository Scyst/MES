<div class="modal fade" id="planModal" tabindex="-1" aria-labelledby="planModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content shadow-lg border-0">
            <div class="modal-header bg-primary text-white">
                <h6 class="modal-title fw-bold" id="planModalLabel">
                    <i class="fas fa-calendar-plus me-2"></i> Production Plan
                </h6>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body p-4">
                <form id="planForm">
                    <input type="hidden" id="planId" name="plan_id" value="0">
                    
                    <div class="row g-3 mb-3">
                        <div class="col-6">
                            <label for="planDate" class="form-label small text-muted fw-bold">Plan Date</label>
                            <input type="date" class="form-control form-control-sm" id="planDate" name="plan_date" required>
                        </div>
                        <div class="col-6">
                            <label for="planLine" class="form-label small text-muted fw-bold">Line</label>
                            <select class="form-select form-select-sm" id="planLine" name="line" required>
                                <option value="" disabled selected>Select Line...</option>
                                </select>
                        </div>
                    </div>

                    <div class="row g-3 mb-3">
                        <div class="col-4">
                            <label for="planShift" class="form-label small text-muted fw-bold">Shift</label>
                            <select class="form-select form-select-sm" id="planShift" name="shift" required>
                                <option value="DAY">DAY</option>
                                <option value="NIGHT">NIGHT</option>
                            </select>
                        </div>
                        <div class="col-8">
                            <label for="planItemSearch" class="form-label small text-muted fw-bold">Item (SAP / Part No)</label>
                            <div class="position-relative">
                                <input type="text" class="form-control form-control-sm" id="planItemSearch" placeholder="Type to search..." autocomplete="off" required>
                                <input type="hidden" id="planItemId" name="item_id">
                                <div id="planItemDropdown" class="list-group position-absolute w-100 shadow-sm" style="z-index: 1050; display: none; max-height: 200px; overflow-y: auto;"></div>
                            </div>
                        </div>
                    </div>

                    <div class="mb-3">
                        <label for="planQty" class="form-label small text-muted fw-bold">Planned Quantity</label>
                        <input type="number" class="form-control form-control-lg font-monospace text-end border-primary" id="planQty" name="original_planned_quantity" placeholder="0" min="0" required>
                    </div>

                    <div class="mb-3">
                        <label for="planNote" class="form-label small text-muted fw-bold">Note (Optional)</label>
                        <textarea class="form-control form-control-sm" id="planNote" name="note" rows="2" placeholder="Remark..."></textarea>
                    </div>

                    <div class="d-flex justify-content-between align-items-center mt-4">
                        <button type="button" class="btn btn-link text-danger text-decoration-none p-0" id="btnDeletePlan" style="display: none;">
                            <i class="fas fa-trash-alt me-1"></i> Delete
                        </button>
                        <div class="d-flex gap-2">
                            <button type="button" class="btn btn-light btn-sm" data-bs-dismiss="modal">Cancel</button>
                            <button type="submit" class="btn btn-primary btn-sm px-4 fw-bold" id="btnSavePlan">Save Plan</button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    </div>
</div>