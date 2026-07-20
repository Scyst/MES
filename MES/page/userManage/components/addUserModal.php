<div class="modal fade" id="addUserModal" tabindex="-1">
    <div class="modal-dialog modal-xl modal-dialog-centered">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title"><i class="fas fa-user-plus me-2 text-primary"></i>Add User</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <form id="addUserForm">
                    <div class="row g-4">
                        
                        <!-- Left Column: User Info -->
                        <div class="col-lg-4 border-end pe-lg-4">
                            <h6 class="border-bottom pb-2 mb-3"><i class="fas fa-id-card text-secondary me-2"></i> User Information</h6>
                            <div class="row g-3">
                                <div class="col-md-6">
                                    <label class="form-label small fw-bold text-muted mb-1">Employee ID</label>
                                    <div class="input-group input-group-sm">
                                        <span class="input-group-text bg-white border-end-0 text-muted"><i class="fas fa-id-badge"></i></span>
                                        <input type="text" name="emp_id" id="add_emp_id" class="form-control border-start-0 ps-0 text-uppercase" placeholder="e.g. 1096...">
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label small fw-bold text-muted mb-1">Username <span class="text-danger">*</span></label>
                                    <div class="input-group input-group-sm">
                                        <span class="input-group-text bg-white border-end-0 text-muted"><i class="fas fa-user"></i></span>
                                        <input type="text" name="username" id="add_username" class="form-control border-start-0 ps-0" required>
                                    </div>
                                </div>
                                <div class="col-12">
                                    <label class="form-label small fw-bold text-muted mb-1">Full Name</label>
                                    <div class="input-group input-group-sm">
                                        <span class="input-group-text bg-white border-end-0 text-muted"><i class="fas fa-font"></i></span>
                                        <input type="text" name="fullname" id="add_fullname" class="form-control border-start-0 ps-0" placeholder="Name - Surname">
                                    </div>
                                </div>
                                <div class="col-12">
                                    <label class="form-label small fw-bold text-muted mb-1">Password <span class="text-danger">*</span></label>
                                    <div class="input-group input-group-sm">
                                        <span class="input-group-text bg-white border-end-0 text-muted"><i class="fas fa-key"></i></span>
                                        <input type="password" name="password" class="form-control border-start-0 ps-0" required>
                                    </div>
                                </div>
                                
                                <div class="col-12 mt-4 pt-2 border-top">
                                    <h6 class="mb-3 text-dark" style="font-size: 0.85rem;"><i class="fas fa-sitemap text-secondary me-2"></i> Role & Assignment</h6>
                                </div>
                                
                                <div class="col-12">
                                    <label class="form-label small fw-bold text-muted mb-1">Role <span class="text-danger">*</span></label>
                                    <div class="input-group input-group-sm">
                                        <span class="input-group-text bg-white border-end-0 text-muted"><i class="fas fa-user-tag"></i></span>
                                        <select class="form-select border-start-0 ps-0" name="role" id="add_role" required>
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
                                    <div class="input-group input-group-sm">
                                        <span class="input-group-text bg-white border-end-0 text-muted"><i class="fas fa-users"></i></span>
                                        <input type="text" name="team_group" id="add_team" class="form-control border-start-0 ps-0 text-uppercase" placeholder="e.g. A, B">
                                    </div>
                                </div>
                                <div class="col-md-6 d-none" id="addUserLineWrapper">
                                    <label class="form-label small fw-bold text-muted mb-1">Line / Area</label>
                                    <div class="input-group input-group-sm">
                                        <span class="input-group-text bg-white border-end-0 text-muted"><i class="fas fa-industry"></i></span>
                                        <input type="text" name="line" id="add_line" class="form-control border-start-0 ps-0 text-uppercase" placeholder="e.g. PRESS, ALL">
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Right Column: Permissions -->
                        <div class="col-lg-8">
                            <h6 class="border-bottom pb-2 mb-3"><i class="fas fa-shield-alt text-primary me-2"></i> Individual Permissions</h6>
                            <div id="addPermissionsContainer" class="row g-2" style="max-height: 65vh; overflow-y: auto; overflow-x: hidden;">
                                <!-- Permissions will be loaded here via JS -->
                                <div class="col-12 text-muted small"><i class="fas fa-spinner fa-spin me-1"></i> Loading permissions...</div>
                            </div>
                        </div>

                    </div>
                </form>
            </div>
            <div class="modal-footer bg-light">
                <button type="submit" form="addUserForm" class="btn btn-primary px-5 fw-bold">Save User</button>
            </div>
        </div>
    </div>
</div>