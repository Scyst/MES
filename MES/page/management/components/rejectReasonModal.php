<?php
// ไฟล์: MES/page/management/components/rejectReasonModal.php
?>
<div class="modal fade" id="rejectReasonModal" tabindex="-1" aria-labelledby="rejectReasonModalLabel" aria-hidden="true" data-bs-backdrop="static">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="rejectReasonModalLabel">Reject Shipment</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <form id="rejectReasonForm">
                    <p>You are about to reject <strong id="rejectCountDisplay">0</strong> selected item(s). Please provide a reason:</p>
                    <div class="mb-3">
                        <label for="rejectReasonInput" class="form-label">Reason</label>
                        <input type="text" class="form-control" id="rejectReasonInput" placeholder="e.g., Wrong quantity, Wrong item" required>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                <button type="submit" class="btn btn-danger" id="confirmRejectBtn" form="rejectReasonForm">Confirm Rejection</button>
            </div>
        </div>
    </div>
</div>