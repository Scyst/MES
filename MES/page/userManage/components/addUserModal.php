<div class="modal fade" id="addUserModal" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title"><i class="fas fa-user-plus me-2 text-primary"></i>Add User</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <form id="addUserForm">
                    <div class="row g-3">
                        <div class="col-md-6">
                            <label class="form-label">Employee ID</label>
                            <input type="text" name="emp_id" id="add_emp_id" class="form-control text-uppercase" placeholder="e.g. 1096...">
                        </div>
                        <div class="col-md-6">
                            <label class="form-label">Username <span class="text-danger">*</span></label>
                            <input type="text" name="username" id="add_username" class="form-control" required>
                        </div>
                        <div class="col-12">
                            <label class="form-label">Full Name</label>
                            <input type="text" name="fullname" id="add_fullname" class="form-control" placeholder="Name - Surname">
                        </div>
                        <div class="col-md-6">
                            <label class="form-label">Password <span class="text-danger">*</span></label>
                            <input type="password" name="password" class="form-control" required>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label">Role <span class="text-danger">*</span></label>
                            <select class="form-select" name="role" required>
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
                            <input type="text" name="team_group" id="add_team" class="form-control text-uppercase" placeholder="e.g. A, B">
                        </div>
                        <div class="col-md-6">
                            <label class="form-label">Line / Area</label>
                            <input type="text" name="line" id="add_line" class="form-control text-uppercase" placeholder="e.g. PRESS, ALL">
                        </div>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="submit" form="addUserForm" class="btn btn-primary w-100">Save User</button>
            </div>
        </div>
    </div>
</div>