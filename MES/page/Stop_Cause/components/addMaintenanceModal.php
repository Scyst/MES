<div class="modal fade" id="addMaintenanceModal" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
            <div class="modal-header bg-warning text-dark">
                <h5 class="modal-title"><i class="fas fa-tools me-2"></i>Request Maintenance (แจ้งซ่อม)</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <form id="addMaintenanceForm">
                    <div class="mb-3">
                        <label class="form-label">Line</label>
                        <input list="lineListFilter" name="line" class="form-control" placeholder="Select Line" required style="text-transform: uppercase;" oninput="this.value = this.value.toUpperCase()">
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Machine / Station</label>
                        <input list="machineListFilter" name="machine" class="form-control" placeholder="Select Machine" required>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Priority (ความเร่งด่วน)</label>
                        <select name="priority" class="form-select">
                            <option value="Normal" selected>Normal (ปกติ)</option>
                            <option value="Urgent">Urgent (ด่วน)</option>
                            <option value="Critical">Critical (เครื่องหยุด/อันตราย)</option>
                        </select>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Issue Description (อาการเสีย)</label>
                        <textarea name="issue_description" class="form-control" rows="3" required placeholder="Explain the problem..."></textarea>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                <button type="submit" form="addMaintenanceForm" class="btn btn-warning text-dark">Submit Request</button>
            </div>
        </div>
    </div>
</div>