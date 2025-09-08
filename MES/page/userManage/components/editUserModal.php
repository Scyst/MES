<div class="modal" id="editUserModal" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content ">
            <div class="modal-header">
                <h5 class="modal-title">Edit User</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <form id="editUserForm">
                    <input type="hidden" name="id" id="edit_id">
                    <div class="mb-3">
                        <label for="edit_username" class="form-label">Username</label>
                        <input type="text" name="username" class="form-control" id="edit_username" required>
                    </div>
                    <div class="mb-3">
                        <label for="edit_password" class="form-label">New Password</label>
                        <input type="password" name="password" class="form-control" id="edit_password" placeholder="Leave blank to keep unchanged" autocomplete="new-password">
                    </div>
                    <div class="mb-3">
                        <label for="edit_role" class="form-label">Role</label>
                        <select class="form-select" name="role" id="edit_role" required>
                            <option value="" selected>Select Role...</option>
                            <option value="admin" <?php if (!hasRole('creator')) echo 'disabled'; ?>>Admin</option>
                            <option value="supervisor">Supervisor</option>
                            <option value="operator">Operator</option>
                        </select>
                    </div>
                     <div id="editUserLineWrapper" class="mb-3 d-none">
                        <label for="editLine" class="form-label">Assigned Line</label>
                        <input type="text" name="line" class="form-control text-uppercase" id="editLine" placeholder="Enter line for supervisor">
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="submit" form="editUserForm" class="btn btn-primary">Update User</button>
            </div>
        </div>
    </div>
</div>