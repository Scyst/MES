<div class="modal fade" id="editUserModal" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title"><i class="fas fa-edit me-2 text-warning"></i>Edit User</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <form id="editUserForm">
                    <input type="hidden" name="id" id="edit_id">
                    <div class="row g-3">
                        <div class="col-md-6">
                            <label class="form-label">Employee ID</label>
                            <input type="text" name="emp_id" id="edit_emp_id" class="form-control text-uppercase" autocomplete="off">
                        </div>
                        <div class="col-md-6">
                            <label class="form-label">Username</label>
                            <input type="text" name="username" id="edit_username" class="form-control bg-light" readonly>
                        </div>
                        <div class="col-12">
                            <label class="form-label">Full Name</label>
                            <input type="text" name="fullname" id="edit_fullname" class="form-control">
                        </div>
                        <div class="col-12">
                            <label class="form-label">Reset Password <small class="text-muted">(Leave blank if no change)</small></label>
                            <input type="password" name="password" id="edit_password" class="form-control" autocomplete="new-password">
                        </div>
                        <div class="col-md-12">
                            <label class="form-label">Role <span class="text-danger">*</span></label>
                            <select class="form-select" name="role" id="edit_role" required>
                                <option value="">Select...</option>
                                <option value="admin" <?= (!hasRole('creator')) ? 'disabled' : '' ?>>Admin</option>
                                <option value="manager">Manager</option>
                                <option value="planner">Planner</option>
                                <option value="supervisor">Supervisor</option>
                                <option value="qc">QA / QC</option>
                                <option value="maintenance">Maintenance</option>
                                <option value="operator">Operator</option>
                            </select>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label">Team / Group</label>
                            <input type="text" name="team_group" id="edit_team" class="form-control text-uppercase">
                        </div>
                        <div class="col-md-6">
                            <label class="form-label">Line / Area</label>
                            <input type="text" name="line" id="edit_line" class="form-control text-uppercase">
                        </div>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="submit" form="editUserForm" class="btn btn-warning w-100 text-dark fw-bold">Update User</button>
            </div>
        </div>
    </div>
</div>