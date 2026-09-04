<div class="modal fade" id="editUserModal" tabindex="-1">
    <div class="modal-dialog modal-xl modal-dialog-centered">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title"><i class="fas fa-edit me-2 text-warning"></i><?php _e('userManage.edit_user_title'); ?></h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <form id="editUserForm">
                    <input type="hidden" name="id" id="edit_id">
                    <div class="row g-4">
                        
                        <!-- Left Column: User Info -->
                        <div class="col-lg-4 border-end pe-lg-4">
                            <h6 class="border-bottom pb-2 mb-3"><i class="fas fa-id-card text-secondary me-2"></i> <?php _e('userManage.user_info_title'); ?></h6>
                            <div class="row g-3">
                                <div class="col-md-6">
                                    <label class="form-label small fw-bold text-muted mb-1"><?php _e('userManage.lbl_emp_id'); ?></label>
                                    <div class="input-group input-group-sm">
                                        <span class="input-group-text bg-white border-end-0 text-muted"><i class="fas fa-id-badge"></i></span>
                                        <input type="text" name="emp_id" id="edit_emp_id" class="form-control border-start-0 ps-0 text-uppercase" autocomplete="off">
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label small fw-bold text-muted mb-1"><?php _e('userManage.lbl_username'); ?></label>
                                    <div class="input-group input-group-sm">
                                        <span class="input-group-text bg-white border-end-0 text-muted"><i class="fas fa-user"></i></span>
                                        <input type="text" name="username" id="edit_username" class="form-control border-start-0 ps-0 bg-light" readonly>
                                    </div>
                                </div>
                                <div class="col-12">
                                    <label class="form-label small fw-bold text-muted mb-1"><?php _e('userManage.lbl_fullname'); ?></label>
                                    <div class="input-group input-group-sm">
                                        <span class="input-group-text bg-white border-end-0 text-muted"><i class="fas fa-font"></i></span>
                                        <input type="text" name="fullname" id="edit_fullname" class="form-control border-start-0 ps-0">
                                    </div>
                                </div>
                                <div class="col-12">
                                    <label class="form-label small fw-bold text-muted mb-1"><?php _e('userManage.lbl_password'); ?> <span class="fw-normal" style="font-size: 0.7rem;">(<?php _e('userManage.leave_blank_pwd'); ?>)</span></label>
                                    <div class="input-group input-group-sm">
                                        <span class="input-group-text bg-white border-end-0 text-muted"><i class="fas fa-key"></i></span>
                                        <input type="password" name="password" id="edit_password" class="form-control border-start-0 ps-0" autocomplete="new-password">
                                    </div>
                                </div>
                                
                                <div class="col-12 mt-4 pt-2 border-top">
                                    <h6 class="mb-3 text-dark" style="font-size: 0.85rem;"><i class="fas fa-sitemap text-secondary me-2"></i> <?php _e('userManage.role_assign_title'); ?></h6>
                                </div>
                                
                                <div class="col-12">
                                    <label class="form-label small fw-bold text-muted mb-1"><?php _e('userManage.lbl_role'); ?> <span class="text-danger">*</span></label>
                                    <div class="input-group input-group-sm">
                                        <span class="input-group-text bg-white border-end-0 text-muted"><i class="fas fa-user-tag"></i></span>
                                        <select class="form-select border-start-0 ps-0" name="role" id="edit_role" required>
                                            <option value=""><?php _e('userManage.select_default'); ?></option>
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
                                    <label class="form-label small fw-bold text-muted mb-1"><?php _e('userManage.lbl_team'); ?></label>
                                    <div class="input-group input-group-sm">
                                        <span class="input-group-text bg-white border-end-0 text-muted"><i class="fas fa-users"></i></span>
                                        <input type="text" name="team_group" id="edit_team" class="form-control border-start-0 ps-0 text-uppercase">
                                    </div>
                                </div>
                                <div class="col-md-6" id="editUserLineWrapper">
                                    <label class="form-label small fw-bold text-muted mb-1"><?php _e('userManage.lbl_line'); ?></label>
                                    <div class="input-group input-group-sm">
                                        <span class="input-group-text bg-white border-end-0 text-muted"><i class="fas fa-industry"></i></span>
                                        <input type="text" name="line" id="edit_line" class="form-control border-start-0 ps-0 text-uppercase">
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Right Column: Permissions -->
                        <div class="col-lg-8">
                            <h6 class="border-bottom pb-2 mb-3"><i class="fas fa-shield-alt text-primary me-2"></i> <?php _e('userManage.indiv_perm_title'); ?></h6>
                            <div id="permissionsContainer" class="row g-2" style="max-height: 65vh; overflow-y: auto; overflow-x: hidden;">
                                <!-- Permissions will be loaded here via JS -->
                                <div class="col-12 text-muted small"><i class="fas fa-spinner fa-spin me-1"></i> <?php _e('userManage.loading_perm'); ?></div>
                            </div>
                        </div>

                    </div>
                </form>
            </div>
            <div class="modal-footer bg-light">
                <button type="submit" form="editUserForm" class="btn btn-warning px-5 text-dark fw-bold"><?php _e('userManage.btn_update_user'); ?></button>
            </div>
        </div>
    </div>
</div>