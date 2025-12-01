<div class="modal fade" id="editEmployeeModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header bg-primary text-white">
                <h5 class="modal-title">
                    <i class="fas fa-user-cog me-2"></i>Edit Employee Info
                </h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <form id="editEmployeeForm">
                    <input type="hidden" id="empEditId">
                    
                    <div class="mb-3">
                        <label class="form-label text-muted small">Employee Name</label>
                        <input type="text" class="form-control form-control-plaintext fw-bold" id="empEditName" readonly>
                    </div>

                    <div class="row g-3">
                        <div class="col-md-12">
                            <label class="form-label">Line / Section</label>
                            <select class="form-select" id="empEditLine">
                                <option value="">-- Select Line --</option>
                                </select>
                        </div>

                        <div class="col-md-6">
                            <label class="form-label">Main Shift</label>
                            <select class="form-select" id="empEditShift">
                                </select>
                        </div>

                        <div class="col-md-6">
                            <label class="form-label">Team Group</label>
                            <select class="form-select" id="empEditTeam">
                                <option value="">-</option>
                                <option value="A">Team A</option>
                                <option value="B">Team B</option>
                                <option value="C">Team C</option>
                                <option value="D">Team D</option>
                            </select>
                        </div>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                <button type="button" class="btn btn-primary" onclick="saveEmployeeInfo()">
                    <i class="fas fa-save me-1"></i> Save Changes
                </button>
            </div>
        </div>
    </div>
</div>