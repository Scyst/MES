<div class="modal fade" id="addMaintenanceModal" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content border-0 shadow-lg">
            <div class="modal-header border-bottom-0 pb-0">
                <h5 class="modal-title fw-bold text-dark">
                    <i class="fas fa-tools text-warning me-2"></i>New Request
                </h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body pt-3">
                <form id="addMaintenanceForm" enctype="multipart/form-data">
                    <div class="row g-3">
                        <div class="col-6">
                            <label class="form-label small fw-bold text-muted">Line</label>
                            <input list="lineListFilter" name="line" class="form-control" placeholder="Line..." required style="text-transform: uppercase;">
                        </div>
                        <div class="col-6">
                            <label class="form-label small fw-bold text-muted">Machine</label>
                            <input list="machineListFilter" name="machine" class="form-control" placeholder="Machine..." required>
                        </div>
                        <div class="col-12">
                            <label class="form-label small fw-bold text-muted">Priority</label>
                            <div class="d-flex gap-3">
                                <div class="form-check">
                                    <input class="form-check-input" type="radio" name="priority" id="prioNormal" value="Normal" checked>
                                    <label class="form-check-label" for="prioNormal">Normal</label>
                                </div>
                                <div class="form-check">
                                    <input class="form-check-input" type="radio" name="priority" id="prioUrgent" value="Urgent">
                                    <label class="form-check-label text-warning fw-bold" for="prioUrgent">Urgent</label>
                                </div>
                                <div class="form-check">
                                    <input class="form-check-input" type="radio" name="priority" id="prioCritical" value="Critical">
                                    <label class="form-check-label text-danger fw-bold" for="prioCritical">Critical</label>
                                </div>
                            </div>
                        </div>
                        <div class="col-12">
                            <label class="form-label small fw-bold text-muted">Issue Description</label>
                            <textarea name="issue_description" class="form-control" rows="3" required placeholder="Describe the problem..."></textarea>
                        </div>
                        
                        <div class="col-12">
                            <label class="form-label small fw-bold text-muted">Photo (ถ่ายให้เห็นปัญหา))</label>
                            <input type="file" name="photo_before" class="form-control form-control-sm" accept="image/*" required>
                        </div>
                    </div>
                </form>
            </div>
            <div class="modal-footer border-top-0 pt-0">
                <button type="button" class="btn btn-light btn-sm" data-bs-dismiss="modal">Cancel</button>
                <button type="submit" form="addMaintenanceForm" class="btn btn-primary btn-sm fw-bold px-4">Submit</button>
            </div>
        </div>
    </div>
</div>