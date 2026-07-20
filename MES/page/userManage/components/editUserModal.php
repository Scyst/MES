<div class="modal fade" id="editUserModal" tabindex="-1">
    <div class="modal-dialog modal-xl modal-dialog-centered">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title"><i class="fas fa-edit me-2 text-warning"></i>Edit User</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <form id="editUserForm">
                    <input type="hidden" name="id" id="edit_id">
                    <div class="row g-4">
                        
                        <!-- Left Column: User Info -->
                        <div class="col-lg-4 border-end pe-lg-4">
                            <h6 class="border-bottom pb-2 mb-3"><i class="fas fa-id-card text-secondary me-2"></i> User Information</h6>
                            <div class="row g-3">
                                <div class="col-md-6">
                                    <label class="form-label small fw-bold text-muted mb-1">Employee ID</label>
                                    <div class="input-group input-group-sm shadow-sm">
                                        <span class="input-group-text bg-light text-secondary"><i class="fas fa-id-badge"></i></span>
                                        <input type="text" name="emp_id" id="edit_emp_id" class="form-control text-uppercase" autocomplete="off">
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label small fw-bold text-muted mb-1">Username</label>
                                    <div class="input-group input-group-sm shadow-sm">
                                        <span class="input-group-text bg-light text-secondary"><i class="fas fa-user"></i></span>
                                        <input type="text" name="username" id="edit_username" class="form-control bg-light" readonly>
                                    </div>
                                </div>
                                <div class="col-12">
                                    <label class="form-label small fw-bold text-muted mb-1">Full Name</label>
                                    <div class="input-group input-group-sm shadow-sm">
                                        <span class="input-group-text bg-light text-secondary"><i class="fas fa-font"></i></span>
                                        <input type="text" name="fullname" id="edit_fullname" class="form-control">
                                    </div>
                                </div>
                                <div class="col-12">
                                    <label class="form-label small fw-bold text-muted mb-1">Reset Password <span class="fw-normal" style="font-size: 0.7rem;">(Leave blank to keep)</span></label>
                                    <div class="input-group input-group-sm shadow-sm">
                                        <span class="input-group-text bg-light text-secondary"><i class="fas fa-key"></i></span>
                                        <input type="password" name="password" id="edit_password" class="form-control" autocomplete="new-password">
                                    </div>
                                </div>
                                
                                <div class="col-12 mt-4 pt-2 border-top">
                                    <h6 class="mb-3 text-dark" style="font-size: 0.85rem;"><i class="fas fa-sitemap text-secondary me-2"></i> Role & Assignment</h6>
                                </div>
                                
                                <div class="col-12">
                                    <label class="form-label small fw-bold text-muted mb-1">Role <span class="text-danger">*</span></label>
                                    <div class="input-group input-group-sm shadow-sm">
                                        <span class="input-group-text bg-light text-secondary"><i class="fas fa-user-tag"></i></span>
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
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label small fw-bold text-muted mb-1">Team / Group</label>
                                    <div class="input-group input-group-sm shadow-sm">
                                        <span class="input-group-text bg-light text-secondary"><i class="fas fa-users"></i></span>
                                        <input type="text" name="team_group" id="edit_team" class="form-control text-uppercase">
                                    </div>
                                </div>
                                <div class="col-md-6" id="editUserLineWrapper">
                                    <label class="form-label small fw-bold text-muted mb-1">Line / Area</label>
                                    <div class="input-group input-group-sm shadow-sm">
                                        <span class="input-group-text bg-light text-secondary"><i class="fas fa-industry"></i></span>
                                        <input type="text" name="line" id="edit_line" class="form-control text-uppercase">
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Right Column: Permissions -->
                        <div class="col-lg-8">
                            <h6 class="border-bottom pb-2 mb-3"><i class="fas fa-shield-alt text-primary me-2"></i> Individual Permissions</h6>
                            <div id="permissionsContainer" class="row g-2" style="max-height: 65vh; overflow-y: auto; overflow-x: hidden;">
                                <!-- Permissions will be loaded here via JS -->
                                <div class="col-12 text-muted small"><i class="fas fa-spinner fa-spin me-1"></i> Loading permissions...</div>
                            </div>
                        </div>

                    </div>
                </form>
            </div>
            <div class="modal-footer bg-light">
                <button type="submit" form="editUserForm" class="btn btn-warning px-5 text-dark fw-bold">Update User</button>
            </div>
        </div>
    </div>
</div>