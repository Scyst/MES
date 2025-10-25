<?php
// ไฟล์: MES/page/management/components/planModal.php
// Modal นี้จะถูก include เข้าไปใน managementDashboard.php
?>

<div class="modal fade" id="planModal" tabindex="-1" aria-labelledby="planModalLabel" aria-hidden="true" data-bs-backdrop="static" data-bs-keyboard="false">
    <div class="modal-dialog modal-lg">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="planModalLabel">Add/Edit Production Plan</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body" id="planModalBody">
                <form id="planForm">
                    <input type="hidden" id="planModalPlanId" value="0">

                    <div class="row g-3">
                        <div class="col-md-4">
                            <label for="planModalDate" class="form-label">Plan Date <span class="text-danger">*</span></label>
                            <input type="date" class="form-control" id="planModalDate" required>
                        </div>

                        <div class="col-md-4">
                            <label for="planModalLine" class="form-label">Production Line <span class="text-danger">*</span></label>
                            <select id="planModalLine" class="form-select" required>
                                <option value="" disabled selected>Select Line...</option>
                            </select>
                        </div>

                        <div class="col-md-4">
                            <label for="planModalShift" class="form-label">Shift <span class="text-danger">*</span></label>
                            <select id="planModalShift" class="form-select" required>
                                <option value="" disabled selected>Select Shift...</option>
                                <option value="DAY">DAY</option>
                                <option value="NIGHT">NIGHT</option>
                            </select>
                        </div>

                        <div class="col-12">
                            <label for="planModalItemSearch" class="form-label">Item (Search SAP/Part No) <span class="text-danger">*</span></label>
                            <div class="input-group">
                                <input type="text" class="form-control" id="planModalItemSearch" placeholder="Start typing SAP or Part No..." required autocomplete="off">
                                <span class="input-group-text" id="planModalSelectedItem" style="min-width: 150px; display: inline-block; text-align: left; background-color: var(--bs-tertiary-bg);">No Item Selected</span>
                            </div>
                            <input type="hidden" id="planModalItemId" value="">
                            <div id="planModalItemResultsContainer" style="position: relative;">
                                <div class="autocomplete-results" id="planModalItemResults" style="display: none; top: 100%; left: 0; right: 0;"></div>
                            </div>
                             <div id="item-search-error" class="text-danger small mt-1" style="display: none;">Please select a valid item from the list.</div>
                        </div>

                        <div class="col-md-6">
                            <label for="planModalQuantity" class="form-label">Planned Quantity <span class="text-danger">*</span></label>
                            <input type="number" class="form-control" id="planModalQuantity" placeholder="0.00" min="0" step="0.01" required>
                        </div>

                        <div class="col-md-6">
                            <label for="planModalNote" class="form-label">Note</label>
                            <input type="text" class="form-control" id="planModalNote" maxlength="255">
                        </div>

                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                <button type="button" class="btn btn-primary" id="savePlanButton">Save Plan</button>
                <button type="button" class="btn btn-danger" id="deletePlanButton" style="display: none;">Delete Plan</button>
            </div>
        </div>
    </div>
</div>